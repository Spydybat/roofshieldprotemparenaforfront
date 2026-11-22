/**
 * Runtime detection.
 *
 * Whop hosts these apps on Cloudflare Workers (`whop apps --help`: "Vite apps on
 * Cloudflare Workers"; the app archive's entry is a Workers module exporting
 * `default { fetch }`). That matters for two reasons:
 *
 *   1. The Workers filesystem is not durable, so the JSON file store must never
 *      be selected there.
 *   2. Only a real database behind DATABASE_URL is acceptable in production.
 */

/** Cloudflare documents this exact UA check for the Workers runtime. */
export function isWorkersRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  );
}

/**
 * True when the process should be treated as production: an explicit NODE_ENV,
 * or any Worker deployment (which has no meaningful NODE_ENV of its own).
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || isWorkersRuntime();
}
