/**
 * Server-only configuration.
 *
 * Nothing in this module may be imported by client code: every value here is a
 * secret or an identifier that must not reach the browser bundle. Only the
 * variable NAMES are ever surfaced to clients (as `missing[]`), never values.
 */

export type PlanKey = "inspection" | "deposit" | "gutter" | "balance";

export const PLAN_ENV: Record<PlanKey, string> = {
  inspection: "WHOP_PLAN_ID_INSPECTION",
  deposit: "WHOP_PLAN_ID_DEPOSIT",
  gutter: "WHOP_PLAN_ID_GUTTER",
  balance: "WHOP_PLAN_ID_BALANCE",
};

function read(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function whopApiKey(): string | undefined {
  return read("WHOP_API_KEY");
}

export function whopAccountId(): string | undefined {
  return read("WHOP_ACCOUNT_ID");
}

export function planId(key: PlanKey): string | undefined {
  return read(PLAN_ENV[key]);
}

export function adminToken(): string | undefined {
  return read("ADMIN_TOKEN");
}

export function databaseUrl(): string | undefined {
  return read("DATABASE_URL");
}

export function webhookSecret(): string | undefined {
  return read("WHOP_WEBHOOK_SECRET");
}

export function siteUrl(): string | undefined {
  return read("SITE_URL") ?? read("NEXT_PUBLIC_SITE_URL");
}

/** True only when the server can talk to the Whop API. */
export function whopConfigured(): boolean {
  return Boolean(whopApiKey() && whopAccountId());
}

/**
 * Returns the NAMES of the variables needed for a given operation that are not
 * set. Never returns values.
 */
export function missingFor(keys: Array<"apiKey" | "accountId" | PlanKey>): string[] {
  const missing: string[] = [];
  for (const k of keys) {
    if (k === "apiKey" && !whopApiKey()) missing.push("WHOP_API_KEY");
    else if (k === "accountId" && !whopAccountId()) missing.push("WHOP_ACCOUNT_ID");
    else if (k !== "apiKey" && k !== "accountId" && !planId(k)) missing.push(PLAN_ENV[k]);
  }
  return missing;
}

/** Production only — this project never targets the Whop sandbox. */
export const WHOP_ENVIRONMENT = "production" as const;
