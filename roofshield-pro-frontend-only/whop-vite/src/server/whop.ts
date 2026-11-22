/**
 * Server-only Whop client.
 *
 * The SDK is imported lazily so a missing API key never crashes the SSR build
 * or the storefront: only the endpoints that genuinely need Whop fail, and they
 * fail with an explicit "not configured" code.
 */
import { WhopClient } from "@whop/sdk";
import { whopApiKey } from "./env";

let client: WhopClient | null = null;

export class WhopNotConfiguredError extends Error {
  readonly code = "WHOP_NOT_CONFIGURED";
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Whop API is not configured. Missing: ${missing.join(", ")}`);
    this.missing = missing;
  }
}

/** Returns the shared client, or throws WhopNotConfiguredError. */
export function getWhop(): WhopClient {
  const key = whopApiKey();
  if (!key) throw new WhopNotConfiguredError(["WHOP_API_KEY"]);
  // The SDK authenticates with a bearer `token` (BearerAuthProvider), not `apiKey`.
  if (!client) client = new WhopClient({ token: key });
  return client;
}

export function isWhopConfigured(): boolean {
  return Boolean(whopApiKey());
}

/** Narrow the SDK's loosely-typed records without pretending to validate them. */
export function pickString(obj: unknown, ...keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

export type { WhopClient };
