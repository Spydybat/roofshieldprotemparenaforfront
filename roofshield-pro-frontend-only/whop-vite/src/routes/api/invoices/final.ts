import { createFileRoute } from "@tanstack/react-router";
import { missingFor, planId, whopAccountId } from "@/server/env";
import { getWhop, pickString } from "@/server/whop";
import { getStore } from "@/server/store";
import { fail, json, readJson, requireAdmin } from "@/server/http";

/**
 * POST /api/invoices/final — admin only.
 *
 * Creates the final-balance invoice for a completed project against the card
 * saved during the deposit flow.
 *
 * Whop prices invoices from variants (there is no arbitrary-amount charge in the
 * SDK), so a dedicated final-balance variant is required: env
 * WHOP_PLAN_ID_BALANCE. When it is absent the endpoint says so instead of
 * guessing a plan.
 *
 * Two collection modes:
 *   • mode=auto   → charge the invoice against the saved payment method.
 *   • mode=manual → send the invoice and let the customer pay the hosted link.
 *
 * An invoice is only reported as paid when Whop returns status `paid`.
 */
export const Route = createFileRoute("/api/invoices/final")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireAdmin(request);
        if (denied) return denied;

        const body = (await readJson(request)) as Record<string, unknown> | null;
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const memberId = typeof body?.memberId === "string" ? body.memberId.trim() : undefined;
        const paymentMethodId = typeof body?.paymentMethodId === "string" ? body.paymentMethodId.trim() : undefined;
        const mode = body?.mode === "auto" ? "auto" : "manual";
        const dueAt = typeof body?.dueAt === "string" ? body.dueAt : null;
        const memo = typeof body?.memo === "string" ? body.memo.slice(0, 500) : "Final balance — RoofShield Pro";

        if (!email && !memberId) return fail(400, "MISSING_CUSTOMER", "Provide the customer email or member id.");

        const missing = missingFor(["apiKey", "accountId", "balance"]);
        if (missing.length > 0) {
          return json(
            {
              ok: false,
              code: "WHOP_NOT_CONFIGURED",
              message:
                "Final-balance invoicing needs a Whop variant for the balance amount. Whop charges are variant-priced only, so set WHOP_PLAN_ID_BALANCE to that plan's id.",
              missing,
            },
            503,
          );
        }

        if (mode === "auto" && !paymentMethodId) {
          return fail(
            400,
            "MISSING_PAYMENT_METHOD",
            "Automatic collection needs the saved payment method id (payt_…) from the deposit flow.",
          );
        }

        try {
          const whop = getWhop();
          const invoice = (await whop.invoices.create({
            account_id: whopAccountId()!,
            email_address: email || null,
            member_id: memberId ?? null,
            items: [{ variant_id: planId("balance")! }],
            payment_method_id: mode === "auto" ? paymentMethodId! : null,
            due_at: dueAt,
            memo,
            metadata: { source: "roofshield_site", kind: "final_balance", mode },
          })) as unknown;

          const invoiceId = pickString(invoice, "id");
          if (!invoiceId) return fail(502, "WHOP_ERROR", "Whop did not return an invoice id.");

          let finalStatus = pickString(invoice, "status") ?? "draft";
          let hostedUrl =
            pickString(invoice, "hosted_invoice_url", "hosted_url", "payment_url", "url") ?? null;

          if (mode === "auto") {
            // Charges the saved method; the returned object is the authority.
            const charged = (await whop.invoices.charge({ id: invoiceId })) as unknown;
            finalStatus = pickString(charged, "status") ?? finalStatus;
            hostedUrl =
              pickString(charged, "hosted_invoice_url", "hosted_url", "payment_url", "url") ?? hostedUrl;
          } else {
            const sent = (await whop.invoices.send({ id: invoiceId })) as unknown;
            finalStatus = pickString(sent, "status") ?? finalStatus;
            hostedUrl =
              pickString(sent, "hosted_invoice_url", "hosted_url", "payment_url", "url") ?? hostedUrl;
          }

          const paid = finalStatus === "paid";

          await getStore()
            .insertOrder({
              kind: "balance",
              plan_id: planId("balance")!,
              setup_intent_id: null,
              payment_id: null,
              invoice_id: invoiceId,
              member_id: memberId ?? null,
              payment_method_id: paymentMethodId ?? null,
              status: finalStatus,
              amount: null,
              currency: "usd",
              meta: { mode, email },
            })
            .catch(() => undefined);

          return json(
            {
              ok: true,
              invoiceId,
              status: finalStatus,
              paid,
              hostedUrl,
              mode,
              message: paid
                ? "Invoice paid in full."
                : mode === "manual"
                  ? "Invoice sent — the customer pays through the Whop hosted link."
                  : `Invoice created but not confirmed paid (status: ${finalStatus}).`,
            },
            paid ? 200 : 202,
          );
        } catch (err) {
          console.error("[invoices/final] whop error:", (err as Error)?.name ?? "unknown");
          return fail(502, "WHOP_ERROR", "Whop could not create the invoice. No payment was taken.");
        }
      },
    },
  },
});
