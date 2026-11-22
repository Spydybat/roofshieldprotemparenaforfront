import { createFileRoute } from "@tanstack/react-router";
import { missingFor, planId, whopAccountId } from "@/server/env";
import { getWhop, pickString } from "@/server/whop";
import { getStore } from "@/server/store";
import { clientIp, fail, json, rateLimit, readJson } from "@/server/http";

/**
 * POST /api/deposit/complete
 *
 * The browser finished the setup-mode checkout and sent the setup intent id.
 * Server-side we:
 *   1. Require explicit card-on-file consent (no consent → 400, nothing charged).
 *   2. Refuse if this setup intent was already charged (idempotency by
 *      `setup_intent_id`, enforced by a UNIQUE constraint).
 *   3. Retrieve the setup intent from Whop and require a succeeded status.
 *   4. Charge the verified $500 deposit plan against the saved payment method.
 *   5. Report the real Whop payment status — `succeeded` only when Whop says
 *      the payment is `paid`.
 *
 * Card data never reaches this server: only Whop-side ids are handled.
 */
export const Route = createFileRoute("/api/deposit/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!rateLimit(`deposit:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
          return fail(429, "RATE_LIMITED", "Too many attempts. Please contact us before retrying.");
        }

        const body = (await readJson(request)) as Record<string, unknown> | null;
        const setupIntentId = typeof body?.setupIntentId === "string" ? body.setupIntentId.trim() : "";
        const consent = body?.consent === true;

        if (!setupIntentId) return fail(400, "MISSING_SETUP_INTENT", "No setup intent was provided.");
        if (!consent) {
          return fail(
            400,
            "CONSENT_REQUIRED",
            "Card-on-file consent is required before the deposit can be charged.",
          );
        }

        const missing = missingFor(["apiKey", "accountId", "deposit"]);
        if (missing.length > 0) {
          return json(
            { ok: false, code: "WHOP_NOT_CONFIGURED", message: "Whop is not configured.", missing },
            503,
          );
        }

        const store = getStore();

        // ── Duplicate protection (also enforced by the DB constraint) ──────
        const existing = await store.findOrderBySetupIntent(setupIntentId).catch(() => null);
        if (existing && (existing.status === "paid" || existing.payment_id)) {
          return json({
            ok: true,
            duplicate: true,
            paymentId: existing.payment_id,
            status: existing.status,
            succeeded: existing.status === "paid",
            message: "This deposit was already processed — you have not been charged twice.",
          });
        }

        try {
          const whop = getWhop();
          const setupIntent = (await whop.setupIntents.retrieve({ id: setupIntentId })) as unknown;

          const setupStatus = pickString(setupIntent, "status") ?? "unknown";
          if (setupStatus !== "succeeded") {
            return json(
              {
                ok: false,
                code: "SETUP_NOT_SUCCEEDED",
                status: setupStatus,
                succeeded: false,
                message: `The saved payment method is not ready (setup status: ${setupStatus}).`,
              },
              409,
            );
          }

          const paymentMethodId = pickString(setupIntent, "payment_method_id", "paymentMethodId");
          const memberId = pickString(setupIntent, "member_id", "memberId");
          if (!paymentMethodId || !memberId) {
            return json(
              {
                ok: false,
                code: "SETUP_INCOMPLETE",
                status: setupStatus,
                succeeded: false,
                message:
                  "Whop did not return a saved payment method for this setup. Nothing was charged — please contact us.",
              },
              409,
            );
          }

          // Reserve the setup intent so a concurrent retry cannot charge twice.
          const reservation = await store.insertOrder({
            kind: "deposit",
            plan_id: planId("deposit")!,
            setup_intent_id: setupIntentId,
            payment_id: null,
            invoice_id: null,
            member_id: memberId,
            payment_method_id: paymentMethodId,
            status: "charging",
            amount: 50000,
            currency: "usd",
            meta: {},
          });

          if (!reservation.created && reservation.order.payment_id) {
            return json({
              ok: true,
              duplicate: true,
              paymentId: reservation.order.payment_id,
              status: reservation.order.status,
              succeeded: reservation.order.status === "paid",
            });
          }

          const payment = (await whop.payments.create({
            account_id: whopAccountId()!,
            member_id: memberId,
            payment_method_id: paymentMethodId,
            off_session: true,
            line_items: [{ variant_id: planId("deposit")! }],
            metadata: { source: "roofshield_site", kind: "roofing_project_deposit" },
          })) as unknown;

          const paymentId = pickString(payment, "id") ?? null;
          const status = pickString(payment, "status") ?? "unknown";
          // Whop's payment lifecycle settles as "paid"; anything else is not a
          // completed deposit and must not be presented as one.
          const succeeded = status === "paid";

          await store
            .updateOrder(reservation.order.id, {
              payment_id: paymentId,
              status,
              meta: { ...reservation.order.meta, payment_status: status },
            })
            .catch(() => undefined);

          return json(
            {
              ok: succeeded,
              paymentId,
              status,
              succeeded,
              message: succeeded
                ? "Deposit received. Your card is on file for the final balance."
                : `The deposit is not confirmed as paid (status: ${status}).`,
            },
            succeeded ? 200 : 402,
          );
        } catch (err) {
          console.error("[deposit] whop error:", (err as Error)?.name ?? "unknown");
          const message = (err as Error)?.message ?? "";
          return json(
            {
              ok: false,
              code: "WHOP_ERROR",
              status: null,
              succeeded: false,
              message: message.includes("401")
                ? "Whop rejected the API credentials. Check WHOP_API_KEY."
                : "The deposit charge could not be completed. You have not been charged twice — contact us before retrying.",
            },
            502,
          );
        }
      },
    },
  },
});
