import { createFileRoute } from "@tanstack/react-router";
import { clientIp, fail, json, rateLimit, readJson } from "@/server/http";
import { getStore } from "@/server/store";
import { validateLead } from "@/server/validate";

/**
 * POST /api/leads — estimate request.
 *
 * Persists the lead in the application database, then answers. A 2xx response
 * is only ever returned after the row is actually committed; `duplicate: true`
 * means an identical idempotency key was already stored (a genuine repeat
 * submission, not a second lead).
 *
 * NOTE ON WHOP: @whop/sdk 2.8.1 exposes no Leads resource (verified against the
 * installed package: no `leads` client, and no mention in the Whop CLI docs).
 * The application database is therefore the system of record for leads. The
 * response states `whopSynced: false` rather than implying a Whop-side object
 * was created.
 */
export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!rateLimit(`leads:${clientIp(request)}`, 8, 60 * 60 * 1000)) {
          return fail(429, "RATE_LIMITED", "Too many submissions. Please call us instead.");
        }

        const body = await readJson(request);
        const parsed = validateLead(body);
        if (!parsed.ok) {
          return json(
            { ok: false, code: "VALIDATION_FAILED", message: "Please fix the highlighted fields.", errors: parsed.errors },
            422,
          );
        }

        const v = parsed.value;
        try {
          const store = getStore();
          const { lead, duplicate } = await store.insertLead({
            name: v.name,
            email: v.email,
            phone: v.phone,
            zip: v.zip,
            service_type: v.serviceType,
            description: v.description,
            idempotency_key: v.idempotencyKey,
            source: "website",
          });

          return json(
            {
              ok: true,
              leadId: lead.id,
              duplicate,
              status: lead.status,
              whopSynced: false,
              message: duplicate
                ? "We already have this request — a project lead will be in touch."
                : "Request received. A project lead will reach out within one business day.",
            },
            duplicate ? 200 : 201,
          );
        } catch (err) {
          // Log the failure without any customer PII.
          console.error("[leads] store failure:", (err as Error)?.name ?? "unknown");
          return fail(500, "STORE_ERROR", "We could not save your request. Please call us instead.");
        }
      },

      // Lead listing lives behind admin auth; this keeps the collection closed.
      GET: async () => fail(405, "METHOD_NOT_ALLOWED", "Use /api/admin/leads with an admin token."),
    },
  },
});
