import { createFileRoute } from "@tanstack/react-router";
import { WHOP_ENVIRONMENT, missingFor, planId, whopAccountId } from "@/server/env";
import { getWhop, pickString } from "@/server/whop";
import { getStore } from "@/server/store";
import { clientIp, fail, json, rateLimit, readJson, withStorage } from "@/server/http";
import { isPlanKey } from "@/server/validate";

/**
 * POST /api/checkout-sessions
 *
 * Resolves a pricing card to its real Whop plan and tells the browser how to
 * mount Whop Elements:
 *   • inspection / gutter → `flow: "payment"`, the card is charged once.
 *   • deposit             → `flow: "setup"`, a setup-mode checkout configuration
 *     saves the card without charging. The $500 is then charged server-side by
 *     /api/deposit/complete once the client reports the setup succeeded.
 *
 * Never returns a plan id it did not read from the environment, and never
 * invents one. Missing configuration is reported by variable NAME only.
 */
const setupConfigCache = new Map<string, { id: string; at: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export const Route = createFileRoute("/api/checkout-sessions")({
  server: {
    handlers: {
      POST: withStorage(async ({ request }: { request: Request }) => {
        if (!rateLimit(`checkout:${clientIp(request)}`, 30, 60 * 1000)) {
          return fail(429, "RATE_LIMITED", "Too many checkout attempts. Please try again shortly.");
        }

        const body = (await readJson(request)) as Record<string, unknown> | null;
        const planKey = body?.plan;
        if (!isPlanKey(planKey)) {
          return fail(400, "INVALID_PLAN", "Unknown pricing plan.");
        }

        const missing = missingFor(["apiKey", "accountId", planKey]);
        if (missing.length > 0) {
          // The frontend renders the same "not configured" panel for either code;
          // the distinction only tells the merchant which variable is at fault.
          const planMissing = missing.some((m) => m.startsWith("WHOP_PLAN_ID_"));
          return json(
            {
              ok: false,
              code: planMissing ? "PLAN_NOT_CONFIGURED" : "WHOP_NOT_CONFIGURED",
              message:
                "Whop checkout is not configured yet. The merchant must set the missing environment variables.",
              missing,
            },
            503,
          );
        }

        const resolvedPlanId = planId(planKey)!;
        const accountId = whopAccountId()!;

        // Resolve the store before touching Whop. Without a durable database the
        // order below could never be recorded, so fail fast with 503 instead of
        // creating a checkout configuration (or setup intent) we cannot account for.
        const store = getStore();

        try {
          if (planKey === "deposit") {
            const now = Date.now();
            const cached = setupConfigCache.get(planKey);
            let configurationId = cached && now - cached.at < CACHE_TTL_MS ? cached.id : undefined;

            if (!configurationId) {
              const whop = getWhop();
              const created = await whop.checkoutConfigurations.create({
                account_id: accountId,
                mode: "setup",
                currency: "usd",
                metadata: { source: "roofshield_site", purpose: "deposit_card_on_file" },
              });
              const id = pickString(created, "id");
              if (!id) {
                return fail(502, "WHOP_ERROR", "Whop did not return a checkout configuration id.");
              }
              configurationId = id;
              setupConfigCache.set(planKey, { id, at: now });
            }

            await store
              .insertOrder({
                kind: "deposit",
                plan_id: resolvedPlanId,
                setup_intent_id: null,
                payment_id: null,
                invoice_id: null,
                member_id: null,
                payment_method_id: null,
                status: "awaiting_setup",
                amount: 50000,
                currency: "usd",
                meta: { checkout_configuration_id: configurationId },
              })
              .catch(() => undefined);

            return json({
              ok: true,
              flow: "setup",
              planId: resolvedPlanId,
              accountId,
              checkoutConfigurationId: configurationId,
              environment: WHOP_ENVIRONMENT,
            });
          }

          await store
            .insertOrder({
              kind: planKey,
              plan_id: resolvedPlanId,
              setup_intent_id: null,
              payment_id: null,
              invoice_id: null,
              member_id: null,
              payment_method_id: null,
              status: "checkout_opened",
              amount: planKey === "inspection" ? 14900 : 29900,
              currency: "usd",
              meta: {},
            })
            .catch(() => undefined);

          return json({
            ok: true,
            flow: "payment",
            planId: resolvedPlanId,
            accountId,
            environment: WHOP_ENVIRONMENT,
          });
        } catch (err) {
          // A missing database is a deployment fault, not a Whop fault: rethrow it
          // so withStorage() answers 503 STORAGE_NOT_CONFIGURED instead of blaming
          // checkout. Otherwise the merchant gets a misleading "try again".
          if ((err as { code?: string })?.code === "STORAGE_NOT_CONFIGURED") throw err;
          const message = (err as Error)?.message ?? "";
          console.error("[checkout-sessions] whop error:", (err as Error)?.name ?? "unknown");
          return fail(
            502,
            "WHOP_ERROR",
            message.includes("401") || message.toLowerCase().includes("unauthor")
              ? "Whop rejected the API credentials. Check WHOP_API_KEY."
              : "Whop could not start the checkout. Please try again.",
          );
        }
      }),
    },
  },
});
