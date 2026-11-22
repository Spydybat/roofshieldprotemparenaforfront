import { createFileRoute } from "@tanstack/react-router";
import { getStore, storeBackend } from "@/server/store";
import { adminToken, whopApiKey, whopAccountId, webhookSecret, databaseUrl, planId } from "@/server/env";
import { json, requireAdmin } from "@/server/http";
import { isTrackEvent } from "@/server/validate";

/**
 * GET /api/admin/stats — configuration readiness plus record counts.
 *
 * Booleans only for secrets: this endpoint never returns a key, a token, or a
 * fragment of one. It is the supported way to check deployment configuration
 * without exposing credentials.
 */
export const Route = createFileRoute("/api/admin/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = requireAdmin(request);
        if (denied) return denied;

        const store = getStore();
        const counts = await store.stats();

        const url = new URL(request.url);
        const eventParam = url.searchParams.get("event");
        const events = isTrackEvent(eventParam)
          ? await store.listEvents(20, eventParam)
          : await store.listEvents(20);

        return json({
          ok: true,
          storage: { backend: storeBackend(), databaseUrlConfigured: Boolean(databaseUrl()) },
          config: {
            whopApiKey: Boolean(whopApiKey()),
            whopAccountId: Boolean(whopAccountId()),
            webhookSecret: Boolean(webhookSecret()),
            adminToken: Boolean(adminToken()),
            plans: {
              inspection: Boolean(planId("inspection")),
              deposit: Boolean(planId("deposit")),
              gutter: Boolean(planId("gutter")),
              balance: Boolean(planId("balance")),
            },
          },
          counts,
          recentEvents: events,
        });
      },
    },
  },
});
