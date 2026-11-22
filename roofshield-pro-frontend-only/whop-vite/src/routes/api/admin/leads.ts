import { createFileRoute } from "@tanstack/react-router";
import { getStore, type LeadStatus } from "@/server/store";
import { fail, json, readJson, requireAdmin, withStorage } from "@/server/http";

const STATUSES: LeadStatus[] = ["new", "contacted", "scheduled", "won", "lost"];

/**
 * GET  /api/admin/leads   — list captured leads (admin token required).
 * PATCH /api/admin/leads  — advance a lead's pipeline status.
 *
 * Unauthenticated callers get 401; a missing ADMIN_TOKEN gets 503 so an
 * unconfigured deployment can never be mistaken for an open endpoint.
 */
export const Route = createFileRoute("/api/admin/leads")({
  server: {
    handlers: {
      GET: withStorage(async ({ request }: { request: Request }) => {
        const denied = requireAdmin(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);
        const leads = await getStore().listLeads(limit);
        return json({ ok: true, count: leads.length, leads });
      }),

      PATCH: withStorage(async ({ request }: { request: Request }) => {
        const denied = requireAdmin(request);
        if (denied) return denied;

        const body = (await readJson(request)) as Record<string, unknown> | null;
        const id = typeof body?.id === "string" ? body.id : "";
        const status = body?.status as LeadStatus;

        if (!id) return fail(400, "MISSING_ID", "Provide the lead id.");
        if (!STATUSES.includes(status)) {
          return fail(400, "INVALID_STATUS", `Status must be one of: ${STATUSES.join(", ")}.`);
        }

        const updated = await getStore().setLeadStatus(id, status);
        if (!updated) return fail(404, "NOT_FOUND", "No lead with that id.");
        return json({ ok: true, id, status });
      }),
    },
  },
});
