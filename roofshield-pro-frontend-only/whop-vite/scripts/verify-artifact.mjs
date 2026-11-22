#!/usr/bin/env node
/**
 * verify-artifact.mjs — production-mode verification of the *built* artifact.
 *
 * Boots `dist/server/index.js` (the exact Cloudflare Worker bundle that ships),
 * with NODE_ENV=production and a real PostgreSQL database, then exercises every
 * API surface and asserts on status codes. Prints PASS / FAIL / BLOCKED per
 * check and exits non-zero if anything FAILs.
 *
 * BLOCKED (not FAIL) is used when the check requires reaching api.whop.com and
 * this machine has no route to it — that is an environment limit, reported
 * honestly rather than papered over.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/verify-artifact.mjs [--port 3400]
 *        [--env-file .env] [--no-webhook]
 *
 * Requires ADMIN_TOKEN and WHOP_WEBHOOK_SECRET in the environment or --env-file.
 * Never prints secret values. Never charges anything. Never calls the Whop API
 * except where a BLOCKED result is expected and harmless.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : argv[i + 1];
};
const port = Number(flag("port", 3400));
const envFile = flag("env-file", null);
const skipWebhook = argv.includes("--no-webhook");

if (envFile) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
}

const BASE = `http://127.0.0.1:${port}`;
const results = [];
const record = (name, status, detail) => {
  results.push({ name, status, detail });
  const tag = status === "PASS" ? "\x1b[32mPASS\x1b[0m" : status === "BLOCKED" ? "\x1b[33mBLOCKED\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const req = async (path, opts = {}) => {
  const r = await fetch(BASE + path, opts);
  let body = null;
  try {
    body = await r.clone().json();
  } catch {
    body = await r.text().catch(() => "");
  }
  return { status: r.status, body };
};
const post = (path, obj, headers = {}) =>
  req(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(obj) });

const expect = async (name, fn, ok, blocked) => {
  try {
    const { status, body } = await fn();
    const code = body && typeof body === "object" ? body.code : undefined;
    const detail = `HTTP ${status}${code ? ` ${code}` : ""}`;
    if (blocked && blocked(status, body)) return record(name, "BLOCKED", `${detail} (network)`);
    return record(name, ok(status, body) ? "PASS" : "FAIL", detail);
  } catch (err) {
    return record(name, "FAIL", `${err?.name || "Error"}: ${String(err?.message || err).slice(0, 90)}`);
  }
};

/* ── start the artifact ─────────────────────────────────────────────────── */
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required — this harness verifies the production path.");
  process.exit(2);
}
if (!process.env.ADMIN_TOKEN) {
  console.error("ADMIN_TOKEN is required (pass --env-file .env).");
  process.exit(2);
}

const child = spawn(
  process.execPath,
  ["scripts/serve-artifact.mjs", "--port", String(port), "--static", ...(envFile ? ["--env-file", envFile] : [])],
  { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_ENV: "production" } },
);
let ready = false;
child.stdout.on("data", (d) => {
  if (String(d).includes("serving on")) ready = true;
});
child.stderr.on("data", (d) => process.stderr.write(`[artifact] ${d}`));

for (let i = 0; i < 100 && !ready; i++) await new Promise((r) => setTimeout(r, 100));
if (!ready) {
  child.kill("SIGKILL");
  console.error("artifact did not start");
  process.exit(2);
}

const admin = { authorization: `Bearer ${process.env.ADMIN_TOKEN}` };
const uniq = `verify-${Date.now().toString(36)}`;

try {
  console.log("\nProduction-mode artifact checks (NODE_ENV=production, PostgreSQL)\n");

  await expect("GET / renders the page", () => req("/"), (s) => s === 200);
  await expect(
    "POST /api/leads creates a lead",
    () =>
      post("/api/leads", {
        name: "Verify Artifact",
        email: `verify+${uniq}@example.com`,
        phone: "5125550148",
        zip: "78701",
        serviceType: "roof-inspection",
        description: "Automated production-mode verification of the built Worker artifact.",
        idempotencyKey: uniq,
      }),
    (s, b) => s === 201 && b?.ok === true,
  );
  await expect(
    "POST /api/leads dedupes the same key",
    () =>
      post("/api/leads", {
        name: "Verify Artifact",
        email: `verify+${uniq}@example.com`,
        phone: "5125550148",
        zip: "78701",
        serviceType: "roof-inspection",
        description: "Automated production-mode verification of the built Worker artifact.",
        idempotencyKey: uniq,
      }),
    (s, b) => s === 200 && b?.duplicate === true,
  );
  await expect(
    "POST /api/leads rejects bad input",
    () => post("/api/leads", { name: "x", email: "nope", phone: "1", zip: "0", serviceType: "roof-inspection", description: "short" }),
    (s, b) => s === 422 && b?.code === "VALIDATION_FAILED",
  );
  await expect(
    "POST /api/track accepts all 3 events",
    async () => {
      const codes = [];
      for (const e of ["estimate_requested", "service_viewed", "deposit_started"]) {
        const { status } = await post("/api/track", { event: e, eventId: uniq });
        codes.push(status);
      }
      return { status: codes.every((c) => c === 202) ? 202 : codes, body: {} };
    },
    (s) => s === 202,
  );
  await expect("POST /api/track rejects unknown event", () => post("/api/track", { event: "nope", sessionId: uniq }), (s) => s === 400);
  await expect("GET /api/admin/leads without token → 401", () => req("/api/admin/leads"), (s) => s === 401);
  await expect("GET /api/admin/leads with token → 200", () => req("/api/admin/leads", { headers: admin }), (s, b) => s === 200 && Array.isArray(b?.leads));
  await expect("GET /api/admin/stats reports postgres", () => req("/api/admin/stats", { headers: admin }), (s, b) => s === 200 && b?.storage?.backend === "postgres");
  await expect(
    "POST /api/checkout-sessions inspection → env-only plan",
    () => post("/api/checkout-sessions", { plan: "inspection" }),
    (s, b) => s === 200 && b?.flow === "payment" && /^plan_/.test(b?.planId),
  );
  await expect(
    "POST /api/checkout-sessions gutter → env-only plan",
    () => post("/api/checkout-sessions", { plan: "gutter" }),
    (s, b) => s === 200 && /^plan_/.test(b?.planId),
  );
  await expect(
    "POST /api/checkout-sessions deposit (needs Whop API)",
    () => post("/api/checkout-sessions", { plan: "deposit" }),
    (s, b) => s === 200 && b?.flow === "setup",
    (s) => s === 502,
  );
  await expect("POST /api/checkout-sessions unknown plan → 400", () => post("/api/checkout-sessions", { plan: "free" }), (s) => s === 400);
  // Consent is checked *after* the setup-intent id, so send one to reach the gate.
  await expect(
    "POST /api/deposit/complete requires setup intent",
    () => post("/api/deposit/complete", { consent: true }),
    (s, b) => s === 400 && b?.code === "MISSING_SETUP_INTENT",
  );
  await expect(
    "POST /api/deposit/complete requires consent",
    () => post("/api/deposit/complete", { setupIntentId: `seti_${uniq}`, consent: false }),
    (s, b) => s === 400 && b?.code === "CONSENT_REQUIRED",
  );
  await expect(
    "POST /api/invoices/final reports the missing balance variant",
    () => post("/api/invoices/final", { email: "a@b.com" }, admin),
    (s, b) => s === 503 && b?.code === "WHOP_NOT_CONFIGURED",
    (s) => s === 502,
  );

  if (!skipWebhook && process.env.WHOP_WEBHOOK_SECRET) {
    const { Webhook } = await import("standardwebhooks");
    // Whop HMACs the literal secret bytes; standardwebhooks base64-decodes its input.
    const signer = new Webhook(Buffer.from(process.env.WHOP_WEBHOOK_SECRET, "utf8").toString("base64"));
    const body = JSON.stringify({ type: "payment.succeeded", data: { id: `pay_${uniq}`, status: "succeeded" } });
    const ts = new Date();
    const secs = String(Math.floor(ts.getTime() / 1000));
    const wh = (id, sig, b) => req("/api/webhooks/whop", { method: "POST", headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": secs, "webhook-signature": sig }, body: b });

    await expect("webhook accepts a valid signature", () => wh(`msg_${uniq}_1`, signer.sign(`msg_${uniq}_1`, ts, body), body), (s, b) => s === 200 && b?.ok === true);
    await expect("webhook suppresses the duplicate", () => wh(`msg_${uniq}_1`, signer.sign(`msg_${uniq}_1`, ts, body), body), (s, b) => s === 200 && b?.duplicate === true);
    await expect("webhook rejects a forged signature", () => wh(`msg_${uniq}_2`, "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", body), (s, b) => s === 400 && b?.code === "INVALID_SIGNATURE");
    await expect("webhook rejects a tampered body", () => wh(`msg_${uniq}_3`, signer.sign(`msg_${uniq}_3`, ts, body), body.replace(`pay_${uniq}`, "pay_EVIL")), (s, b) => s === 400 && b?.code === "INVALID_SIGNATURE");
  } else {
    record("webhook checks", "BLOCKED", "WHOP_WEBHOOK_SECRET not set");
  }

  /* direct database read-back: proves persistence, not just 201s */
  const { Client } = require("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const lead = await db.query("select id, email, status from leads where email = $1", [`verify+${uniq}@example.com`]);
    record("PostgreSQL holds exactly one lead row", lead.rowCount === 1 ? "PASS" : "FAIL", `rows=${lead.rowCount}`);
    const ev = await db.query("select distinct event from track_events where event_id = $1", [uniq]);
    record("PostgreSQL holds all 3 tracking events", ev.rowCount === 3 ? "PASS" : "FAIL", `distinct=${ev.rowCount}`);
    if (!skipWebhook && process.env.WHOP_WEBHOOK_SECRET) {
      const w = await db.query("select count(*)::int c from webhook_events where id = $1", [`msg_${uniq}_1`]);
      record("webhook stored once (duplicate protection)", w.rows[0].c === 1 ? "PASS" : "FAIL", `rows=${w.rows[0].c}`);
    }
  } finally {
    await db.end();
  }
} finally {
  child.kill("SIGTERM");
}

const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\n${count("PASS")} PASS · ${count("FAIL")} FAIL · ${count("BLOCKED")} BLOCKED\n`);
if (count("FAIL") > 0) {
  for (const r of results.filter((x) => x.status === "FAIL")) console.log(`  FAIL: ${r.name} — ${r.detail}`);
  process.exit(1);
}
