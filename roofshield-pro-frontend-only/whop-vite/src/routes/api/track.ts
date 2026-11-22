import { createFileRoute } from "@tanstack/react-router";
import { clientIp, fail, json, rateLimit, readJson, withStorage } from "@/server/http";
import { getStore } from "@/server/store";
import { isTrackEvent, sanitizeParams } from "@/server/validate";

/**
 * POST /api/track — durable log of the three required conversion events.
 *
 * The browser also calls window.whop.track when the Whop pixel is present. This
 * endpoint is the server-side record that firing actually happened, which is
 * what makes the event verifiable without the dashboard.
 */
export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: withStorage(async ({ request }: { request: Request }) => {
        if (!rateLimit(`track:${clientIp(request)}`, 120, 60 * 1000)) {
          return fail(429, "RATE_LIMITED", "Too many events.");
        }

        const body = (await readJson(request)) as Record<string, unknown> | null;
        const event = body?.event;
        if (!isTrackEvent(event)) {
          return fail(400, "UNKNOWN_EVENT", "Only estimate_requested, service_viewed and deposit_started are accepted.");
        }

        const eventId = typeof body?.eventId === "string" ? body.eventId.slice(0, 64) : null;
        const path = typeof body?.path === "string" ? body.path.slice(0, 300) : null;
        const pixelPresent = body?.pixelPresent === true;

        try {
          await getStore().insertEvent({
            event,
            event_id: eventId,
            path,
            pixel_present: pixelPresent,
            params: sanitizeParams(body?.params),
          });
          return json({ ok: true, event, pixelPresent }, 202);
        } catch (err) {
          if ((err as { code?: string })?.code === "STORAGE_NOT_CONFIGURED") throw err;
          console.error("[track] store failure:", (err as Error)?.name ?? "unknown");
          return fail(500, "STORE_ERROR", "Event could not be recorded.");
        }
      }),
    },
  },
});
