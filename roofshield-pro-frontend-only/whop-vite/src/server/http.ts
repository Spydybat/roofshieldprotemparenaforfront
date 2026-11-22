/**
 * Small helpers shared by the server routes. Server-only.
 */
import { adminToken } from "./env";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function fail(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return json({ ok: false, code, message, ...extra }, status);
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Constant-time comparison of the admin bearer token.
 *
 * Returns a Response on rejection, or null when the caller is authorised.
 * A missing ADMIN_TOKEN is reported as 503 — never as anonymous access.
 */
/**
 * Values used during local development. They are refused whenever the server
 * runs in production, so a dev token copied into a deployment cannot grant
 * admin access — the endpoint returns 503 instead of authenticating.
 */
const DEV_ONLY_TOKENS = new Set([
  "local-test-token-1234",
  "test",
  "test-token",
  "changeme",
  "admin",
  "password",
]);

const MIN_PROD_TOKEN_LENGTH = 24;

export function requireAdmin(request: Request): Response | null {
  const expected = adminToken();
  if (!expected) {
    return fail(
      503,
      "ADMIN_NOT_CONFIGURED",
      "Admin access is not configured. Set ADMIN_TOKEN to enable these endpoints.",
      { missing: ["ADMIN_TOKEN"] },
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (DEV_ONLY_TOKENS.has(expected.toLowerCase()) || expected.length < MIN_PROD_TOKEN_LENGTH) {
      return fail(
        503,
        "ADMIN_TOKEN_INSECURE",
        `Admin access is disabled in production because ADMIN_TOKEN is a development value or shorter than ${MIN_PROD_TOKEN_LENGTH} characters. Set a long random ADMIN_TOKEN.`,
      );
    }
  }

  const header = request.headers.get("authorization") ?? "";
  const provided = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : (request.headers.get("x-admin-token") ?? "").trim();

  if (!provided) return fail(401, "UNAUTHORIZED", "Missing admin token.");
  if (!timingSafeEqual(provided, expected)) return fail(401, "UNAUTHORIZED", "Invalid admin token.");
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Cheap in-memory rate limiter — per instance, best-effort abuse control. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Wraps a route handler so that a missing durable store becomes an explicit
 * 503 with the missing variable NAME, rather than a 500 that looks like a bug.
 * On Whop hosting (Cloudflare Workers) the filesystem is not durable, so
 * DATABASE_URL is mandatory in production.
 */
export function withStorage<Ctx>(
  fn: (ctx: Ctx) => Response | Promise<Response>,
): (ctx: Ctx) => Promise<Response> {
  return async (ctx: Ctx) => {
    try {
      return await fn(ctx);
    } catch (err) {
      if ((err as { code?: string })?.code === "STORAGE_NOT_CONFIGURED") {
        return fail(
          503,
          "STORAGE_NOT_CONFIGURED",
          "A durable database is not configured, so this request was not processed. Set DATABASE_URL.",
          { missing: (err as { missing?: string[] }).missing ?? ["DATABASE_URL"] },
        );
      }
      throw err;
    }
  };
}
