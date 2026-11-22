/**
 * Server-side validation. The browser validates for UX; this is the boundary
 * that actually decides what enters the database.
 */

export const SERVICE_TYPES = ["roof-repair", "roof-replacement", "roof-inspection"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  zip: string;
  serviceType: ServiceType;
  description: string;
  idempotencyKey: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

/** Digits only, so formatting like "(512) 555-0148" is accepted. */
const digits = (s: string) => s.replace(/\D/g, "");

export function validateLead(body: unknown): { ok: true; value: LeadInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof b[k] === "string" ? (b[k] as string).trim() : "");

  const name = str("name");
  const email = str("email");
  const phone = str("phone");
  const zip = str("zip");
  const serviceType = str("serviceType");
  const description = str("description");
  const idempotencyKey = str("idempotencyKey");

  if (name.length < 2) errors.name = "Please enter your full name.";
  else if (name.length > 120) errors.name = "Name is too long.";

  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  else if (email.length > 254) errors.email = "Email is too long.";

  const phoneDigits = digits(phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 15) errors.phone = "Enter a valid phone number.";

  if (!ZIP_RE.test(zip)) errors.zip = "Enter a 5-digit ZIP code.";

  if (!SERVICE_TYPES.includes(serviceType as ServiceType)) {
    errors.serviceType = "Choose a service type.";
  }

  if (description.length < 10) errors.description = "Tell us a little more about the project (10+ characters).";
  else if (description.length > 4000) errors.description = "Description is too long (max 4000 characters).";

  if (!/^[A-Za-z0-9-]{8,64}$/.test(idempotencyKey)) {
    errors.idempotencyKey = "Missing submission idempotency key.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      email: email.toLowerCase(),
      phone,
      zip,
      serviceType: serviceType as ServiceType,
      description,
      idempotencyKey,
    },
  };
}

export const TRACK_EVENTS = ["estimate_requested", "service_viewed", "deposit_started"] as const;
export type TrackEventName = (typeof TRACK_EVENTS)[number];

export function isTrackEvent(v: unknown): v is TrackEventName {
  return typeof v === "string" && (TRACK_EVENTS as readonly string[]).includes(v);
}

/** Shallow, size-capped sanitisation of arbitrary tracking params. */
export function sanitizeParams(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, 25)) {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) continue;
    if (typeof v === "string" && v.length <= 300) out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (v === null) out[k] = null;
  }
  return out;
}

export const PLAN_KEYS = ["inspection", "deposit", "gutter"] as const;
export type CheckoutPlanKey = (typeof PLAN_KEYS)[number];

export function isPlanKey(v: unknown): v is CheckoutPlanKey {
  return typeof v === "string" && (PLAN_KEYS as readonly string[]).includes(v);
}
