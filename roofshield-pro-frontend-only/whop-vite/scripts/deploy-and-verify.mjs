#!/usr/bin/env node
/**
 * ROOFSHIELD PRO — one-command deploy + production verification.
 *
 *   node scripts/deploy-and-verify.mjs [--sync-secrets] [--create-test-lead]
 *
 * It refuses to guess anything. If a credential or plan id is missing it stops
 * and names the variable. Nothing is charged, no invoice is issued, and no test
 * lead is created unless you pass --create-test-lead.
 *
 * Requires @whop/cli to be authenticated (WHOP_API_KEY in the environment, or
 * `whop auth login`), because every step below is a real API call.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "app_S6fj7hfqepepH7";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = new Set(process.argv.slice(2));
const SYNC_SECRETS = argv.has("--sync-secrets");
const CREATE_TEST_LEAD = argv.has("--create-test-lead");
const SKIP_DEPLOY = argv.has("--skip-deploy");

/* ── tiny .env loader (no dependency), existing env always wins ─────────── */
function loadEnvFile() {
  const p = resolve(ROOT, ".env");
  if (!existsSync(p)) return false;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key]) continue; // explicit env wins
    let v = rawValue.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v) process.env[key] = v;
  }
  return true;
}

const results = [];
const record = (step, status, detail) => {
  results.push({ step, status, detail });
  const icon = status === "PASS" ? "✔" : status === "BLOCKED" ? "■" : "✖";
  console.log(`${icon} ${status.padEnd(7)} ${step}${detail ? ` — ${detail}` : ""}`);
};

const sh = (args, opts = {}) => {
  try {
    const out = execFileSync("npx", ["whop", ...args], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });
    return { ok: true, out: out.trim() };
  } catch (err) {
    return {
      ok: false,
      out: String(err.stdout ?? "").trim(),
      err: String(err.stderr ?? "").trim() || err.message,
    };
  }
};

/** Pull the CLI's structured { code, message } out of a failure. */
const cliReason = (r) => {
  const j = parseJsonSafe(r.out) ?? parseJsonSafe(r.err);
  if (j?.message) return `${j.code ?? "ERROR"}: ${j.message}`;
  return (r.out || r.err || "unknown failure").split("\n")[0];
};

function parseJsonSafe(text) {
  if (!text) return null;
  const start = String(text).indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(String(text).slice(start));
  } catch {
    return null;
  }
}

const parseJson = (text) => {
  const start = text.indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
};

function finish() {
  const failed = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  console.log("\n─────────────────────────────────────────────");
  console.log(`PASS ${results.filter((r) => r.status === "PASS").length} · BLOCKED ${blocked} · FAIL ${failed}`);
  if (blocked || failed) {
    console.log("\nNothing was fabricated: blocked steps did not run.");
    process.exitCode = failed ? 1 : 2;
  }
}

/* ── 0. environment ─────────────────────────────────────────────────────── */
console.log("ROOFSHIELD PRO → Whop production\n");
const envLoaded = loadEnvFile();
record("Environment", "PASS", envLoaded ? ".env loaded (existing env wins)" : "no .env file; using process env");

const NEEDED = ["WHOP_API_KEY", "WHOP_ACCOUNT_ID"];
const missing = NEEDED.filter((k) => !process.env[k]);
if (missing.length) {
  record("Credentials", "BLOCKED", `missing ${missing.join(", ")}`);
  console.log(
    "\nSet these in the project environment (or put them in " +
      ".env — it is gitignored), then re-run this script:\n" +
      "  WHOP_API_KEY   your existing company API key (do not create a new one)\n" +
      "  WHOP_ACCOUNT_ID the business id, prefixed biz_\n",
  );
  finish();
  process.exit();
}
record("Credentials", "PASS", "WHOP_API_KEY + WHOP_ACCOUNT_ID present");

/* ── 0b. network egress to the Whop API ─────────────────────────────────── */
let apiReachable = true;
try {
  const res = await fetch("https://api.whop.com/", { signal: AbortSignal.timeout(8000) });
  apiReachable = res.status > 0;
} catch {
  apiReachable = false;
}
if (!apiReachable) {
  record(
    "Network → api.whop.com",
    "BLOCKED",
    "unreachable from this machine; the deploy cannot run here",
  );
  console.log(
    "\nThis environment has no route to Whop's API (only package registries and GitHub).\n" +
      "Run the same script on a machine with internet access:\n" +
      "  node scripts/deploy-and-verify.mjs --sync-secrets\n",
  );
  finish();
  process.exit();
}
record("Network → api.whop.com", "PASS", "reachable");

/* ── 1. authentication + account access ─────────────────────────────────── */
// `auth status` only reports a stored browser session, so it says loggedIn:false
// even when a valid WHOP_API_KEY is exported. Probe the real API instead.
const probe = sh(["apps", "get", APP_ID, "--format", "json"]);
if (!probe.ok) {
  const reason = cliReason(probe);
  const authProblem = /NOT_AUTHENTICATED|Not logged in|401|unauthor/i.test(probe.err + probe.out);
  const networkProblem = /fetch failed|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED/i.test(reason);
  record(
    "Whop authentication",
    "BLOCKED",
    networkProblem
      ? `no network route to the Whop API from this machine (${reason}) — run this on a networked host`
      : authProblem
        ? "API rejected the credentials (NOT_AUTHENTICATED)"
        : reason,
  );
  console.log(
    "\nThe CLI needs a working credential. Export the existing key so API calls can use it:\n" +
      "  export WHOP_API_KEY=<your existing company API key>\n" +
      "  export WHOP_ACCOUNT_ID=<biz_...>\n" +
      "or run `whop auth login`.\n",
  );
  finish();
  process.exit();
}
record("Whop authentication", "PASS", `API reachable · ${APP_ID} retrieved`);

const accounts = sh(["auth", "accounts", "--format", "json"]);
record(
  "Account access",
  accounts.ok ? "PASS" : "BLOCKED",
  accounts.ok ? "account list retrieved" : "could not list accounts (app access still confirmed above)",
);

/* ── 2. plan ids ────────────────────────────────────────────────────────── */
const PLAN_KEYS = [
  ["WHOP_PLAN_ID_INSPECTION", 149, "Roof Inspection"],
  ["WHOP_PLAN_ID_DEPOSIT", 500, "Roofing Project Deposit"],
  ["WHOP_PLAN_ID_GUTTER", 299, "Gutter Cleaning"],
];

const verifiedPlans = {};
for (const [envVar, expectedPrice, label] of PLAN_KEYS) {
  const id = process.env[envVar];
  if (!id) {
    record(`Plan · ${label}`, "BLOCKED", `${envVar} not set`);
    continue;
  }
  if (!id.startsWith("plan_")) {
    record(`Plan · ${label}`, "FAIL", `${envVar} is not a plan_ variant id (product ids are prod_)`);
    continue;
  }
  const got = sh(["variants", "get", id, "--format", "json"]);
  if (!got.ok) {
    record(`Plan · ${label}`, "BLOCKED", `could not retrieve ${id}`);
    continue;
  }
  const v = parseJson(got.out) ?? {};
  const price = v.initial_price ?? v.price ?? v.renewal_price ?? null;
  const numeric = typeof price === "number" ? (price > 1000 ? price / 100 : price) : null;
  const priceOk = numeric === null ? null : Math.round(numeric) === expectedPrice;
  record(
    `Plan · ${label}`,
    priceOk === false ? "FAIL" : "PASS",
    `${id} · price ${numeric ?? "unknown"}${priceOk === false ? ` (expected $${expectedPrice})` : ""}`,
  );
  verifiedPlans[envVar] = { id, numeric };
}

/* ── 3. balance variant (never invented) ────────────────────────────────── */
if (process.env.WHOP_PLAN_ID_BALANCE) {
  const b = sh(["variants", "get", process.env.WHOP_PLAN_ID_BALANCE, "--format", "json"]);
  record("Balance variant", b.ok ? "PASS" : "BLOCKED", `${process.env.WHOP_PLAN_ID_BALANCE}`);
} else {
  record(
    "Balance variant",
    "BLOCKED",
    "WHOP_PLAN_ID_BALANCE not set — final-invoice flow stays disabled until you provide a real plan id",
  );
}

/* ── 4. persist secrets into the hosted runtime ─────────────────────────── */
const SECRET_KEYS = [
  "WHOP_API_KEY",
  "WHOP_ACCOUNT_ID",
  "WHOP_PLAN_ID_INSPECTION",
  "WHOP_PLAN_ID_DEPOSIT",
  "WHOP_PLAN_ID_GUTTER",
  "WHOP_PLAN_ID_BALANCE",
  "DATABASE_URL",
  "ADMIN_TOKEN",
  "WHOP_WEBHOOK_SECRET",
];
const presentSecrets = SECRET_KEYS.filter((k) => process.env[k]);
const absentSecrets = SECRET_KEYS.filter((k) => !process.env[k]);

if (!SYNC_SECRETS) {
  record("App secrets", "BLOCKED", "not synced (pass --sync-secrets to push them to app runtime)");
} else {
  let synced = 0;
  for (const key of presentSecrets) {
    const set = sh(["apps", "secrets", "set", "--app", APP_ID, "--secret", `${key}=${process.env[key]}`]);
    if (set.ok) synced += 1;
    else record(`Secret ${key}`, "FAIL", "could not be set");
  }
  record("App secrets", synced === presentSecrets.length ? "PASS" : "FAIL", `${synced}/${presentSecrets.length} synced`);
}
if (absentSecrets.length) record("Secrets still missing", "BLOCKED", absentSecrets.join(", "));

if (!process.env.DATABASE_URL) {
  record("Database", "BLOCKED", "DATABASE_URL absent — Workers filesystem is not durable, so leads will 503");
} else {
  record("Database", "PASS", "DATABASE_URL present (ssl mode derived from URL)");
}

/* ── 5. build gate before uploading ─────────────────────────────────────── */
try {
  execFileSync("npx", ["tsc", "--noEmit"], { cwd: ROOT, stdio: "ignore" });
  record("TypeScript", "PASS", "tsc --noEmit clean");
} catch {
  record("TypeScript", "FAIL", "tsc reported errors — deployment aborted");
  finish();
  process.exit();
}

/* ── 6. deploy ──────────────────────────────────────────────────────────── */
if (SKIP_DEPLOY) {
  record("Deploy", "BLOCKED", "skipped (--skip-deploy); verifying what is already live");
} else {
  const deploy = sh(["apps", "deploy", "--app", APP_ID], { stdio: ["ignore", "pipe", "pipe"] });
  if (!deploy.ok) {
    const reason = cliReason(deploy);
    // A deploy also needs a domain on the app; the CLI prints the exact fix.
    record("Deploy", "FAIL", reason);
    if (/DOMAIN/i.test(reason)) {
      console.log("\nThe app has no domain to serve on. Create one, then re-run:");
      console.log(`  npx whop domains create <name> --website '{"app_id":"${APP_ID}"}'\n`);
    }
    finish();
    process.exit();
  }
  record("Deploy", "PASS", deploy.out.split("\n").filter(Boolean).slice(-1)[0] ?? "uploaded");
}

/* ── 7. hosted url ──────────────────────────────────────────────────────── */
const app = sh(["apps", "get", APP_ID, "--format", "json"]);
const appJson = app.ok ? parseJson(app.out) ?? {} : {};
const hostedUrl =
  appJson.hosted_url ??
  appJson.base_url ??
  (Array.isArray(appJson.domains) ? appJson.domains.find((d) => d?.status === "active")?.hostname : null);

if (!hostedUrl) {
  record("Hosted URL", "BLOCKED", "deploy accepted but no hosted_url returned yet");
  finish();
  process.exit();
}
const base = String(process.env.VERIFY_BASE_URL || hostedUrl).startsWith("http")
  ? String(process.env.VERIFY_BASE_URL || hostedUrl)
  : `https://${process.env.VERIFY_BASE_URL || hostedUrl}`;
record("Hosted URL", "PASS", base);

/* ── 8. live verification ──────────────────────────────────────────────── */
const hit = async (path, init) => {
  const res = await fetch(base + path, init);
  return { status: res.status, text: await res.text() };
};

const home = await hit("/");
record("Live · homepage", home.status === 200 && home.text.includes("PROTECTING") ? "PASS" : "FAIL", `HTTP ${home.status}`);

const admin = await hit("/admin");
record("Live · admin page", admin.status === 200 ? "PASS" : "FAIL", `HTTP ${admin.status}`);

const robots = await hit("/robots.txt");
record("Live · robots.txt", robots.status === 200 && robots.text.includes("/admin") ? "PASS" : "FAIL", `HTTP ${robots.status}`);

if (process.env.ADMIN_TOKEN) {
  const auth = { authorization: `Bearer ${process.env.ADMIN_TOKEN}` };
  const stats = await hit("/api/admin/stats", { headers: auth });
  let summary = `HTTP ${stats.status}`;
  try {
    const s = JSON.parse(stats.text);
    summary += ` · backend=${s.storage?.backend} · whopKey=${s.config?.whopApiKey} · plans=${
      Object.values(s.config?.plans ?? {}).filter(Boolean).length
    }/4`;
  } catch {}
  record("Live · admin API + runtime secrets", stats.status === 200 ? "PASS" : "FAIL", summary);
} else {
  record("Live · admin API", "BLOCKED", "ADMIN_TOKEN not available to the runner");
}

if (CREATE_TEST_LEAD) {
  const lead = await hit("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Deploy Verification",
      email: `deploy-check-${Date.now()}@example.com`,
      phone: "5125550100",
      zip: "78701",
      serviceType: "roof-inspection",
      description: "Automated production verification lead created by deploy-and-verify.",
      idempotencyKey: `deploy-${Date.now()}`,
    }),
  });
  record("Live · lead submission", lead.status === 201 ? "PASS" : "FAIL", `HTTP ${lead.status}`);
} else {
  record("Live · lead submission", "BLOCKED", "not run (pass --create-test-lead to write a test row)");
}

// Checkout initialisation only — no payment is created or charged.
for (const [envVar] of PLAN_KEYS) {
  if (!process.env[envVar]) continue;
  const key = envVar.replace("WHOP_PLAN_ID_", "").toLowerCase();
  const cs = await hit("/api/checkout-sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: key }),
  });
  let detail = `HTTP ${cs.status}`;
  try {
    const j = JSON.parse(cs.text);
    detail += j.ok ? ` · flow=${j.flow} · plan=${j.planId}` : ` · ${j.code}`;
  } catch {}
  record(`Live · checkout ${key}`, cs.status === 200 ? "PASS" : "FAIL", detail);
}

const hook = await hit("/api/webhooks/whop", { method: "POST", body: "{}" });
record(
  "Live · webhook rejects unsigned",
  hook.status === 400 || hook.status === 503 ? "PASS" : "FAIL",
  `HTTP ${hook.status}`,
);

console.log("\nNo payment was created, no invoice issued, no saved card charged.");
finish();
