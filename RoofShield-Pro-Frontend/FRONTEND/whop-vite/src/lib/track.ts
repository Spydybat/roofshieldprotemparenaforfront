"use client";

/**
 * whop.track wrapper.
 *
 * On Whop-hosted pages (`whop.app` / `whop.site`) the pixel is injected before
 * app code runs and `window.whop.track` forwards events to the business
 * dashboard. When self-hosting, the pixel loads via NEXT_PUBLIC_WHOP_PIXEL_SRC.
 *
 * Every call is also POSTed to /api/track, which durably logs the event so
 * firing is independently verifiable even when the pixel is not installed yet.
 */
export function whopTrack(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const pixelPresent = typeof window.whop?.track === "function";
  if (pixelPresent) {
    try {
      window.whop!.track(event, { ...params, event_id: eventId });
    } catch {
      // never let analytics break the UX
    }
  } else {
    // eslint-disable-next-line no-console
    console.info(`[whop] pixel not installed — "${event}" logged server-side instead.`);
  }

  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, params, eventId, pixelPresent, path: window.location.pathname }),
    keepalive: true,
  }).catch(() => {});
}
