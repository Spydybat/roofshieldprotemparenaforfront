import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { webhookSecret } from "@/server/env";
import { getStore } from "@/server/store";
import { fail, json, withStorage } from "@/server/http";
import { pickString } from "@/server/whop";

/**
 * POST /api/webhooks/whop
 *
 * Signature verification uses the official Standard Webhooks verifier shipped
 * with the SDK (`unwrapWebhook`). The raw body is required — the signature
 * covers the exact bytes, so the body is read as text and never re-serialized.
 *
 * Deliveries are deduplicated by the `webhook-id` header, so a Whop retry
 * cannot double-process an event.
 */
export const Route = createFileRoute("/api/webhooks/whop")({
  server: {
    handlers: {
      POST: withStorage(async ({ request }: { request: Request }) => {
        const secret = webhookSecret();
        if (!secret) {
          return json(
            {
              ok: false,
              code: "WEBHOOK_NOT_CONFIGURED",
              message: "Whop webhooks are not configured.",
              missing: ["WHOP_WEBHOOK_SECRET"],
            },
            503,
          );
        }

        const payload = await request.text();
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });

        let event: unknown;
        try {
          event = unwrapWebhook(payload, { headers, key: secret });
        } catch (err) {
          // WebhookVerificationError: bad/missing signature, stale timestamp, or
          // a missing secret. Never process an unverified payload.
          console.warn("[webhooks] signature rejected:", (err as Error)?.name ?? "unknown");
          return fail(400, "INVALID_SIGNATURE", "Webhook signature verification failed.");
        }

        const webhookId =
          headers["webhook-id"] ?? createHash("sha256").update(payload).digest("hex");
        const eventType =
          pickString(event, "type", "event", "action") ?? "unknown";

        const store = getStore();
        const fresh = await store.recordWebhook(webhookId, eventType, event).catch(() => true);
        if (!fresh) {
          // Already processed — acknowledge so Whop stops retrying.
          return json({ ok: true, duplicate: true, id: webhookId }, 200);
        }

        // Reflect Whop's own payment state onto the matching local order.
        // Nothing is ever marked paid on our side unless Whop reported it.
        try {
          const record = event as Record<string, unknown>;
          const resource = (record?.data ?? record?.payload) as unknown;
          const paymentId = pickString(resource, "payment_id", "id");
          const status = pickString(resource, "status");

          if (paymentId && status && eventType.startsWith("payment")) {
            const updated = await store.updateOrderByPaymentId(paymentId, status);
            console.info(
              updated
                ? "[webhooks] order payment status synced"
                : "[webhooks] no local order for this payment (audit only)",
            );
          }
        } catch (err) {
          console.error("[webhooks] reconciliation failed:", (err as Error)?.name ?? "unknown");
        }

        return json({ ok: true, received: true, type: eventType }, 200);
      }),
    },
  },
});
