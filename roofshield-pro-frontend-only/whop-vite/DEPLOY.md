# ROOFSHIELD PRO — Deploy Runbook

**App:** `app_S6fj7hfqepepH7` · **Target:** Whop production hosting (Cloudflare Workers) · **No** Vercel/Netlify.

---

## Why this cannot be completed from the Arena sandbox

Two independent, verified blockers:

1. **No credentials** — `whop auth status` → `loggedIn: false`, `hasSecret: false`; no
   `WHOP_API_KEY` / `WHOP_ACCOUNT_ID` in the environment, no `.env`, no secret mount.
2. **No network route to Whop** — `api.whop.com`, `whop.com`, `whop.site` and
   `cdn.whop.com` all return **HTTP 000** from the sandbox, while `github.com` and
   `registry.npmjs.org` return 200. The Whop CLI surfaces this as
   `{"code":"UNKNOWN","message":"fetch failed"}`.

So `whop apps deploy` — and any post-deploy check of a `*.whop.site` URL — cannot
run here **even with perfect credentials**. This is a platform egress limit, not a
code defect. Run the steps below on any machine with internet access.

## One command

```bash
cd roofshield-pro-frontend-only/whop-vite

export WHOP_API_KEY=...          # your EXISTING company key — do not create a new one
export WHOP_ACCOUNT_ID=biz_...
export DATABASE_URL=postgres://...        # Supabase; mandatory on Workers (no durable FS)
export ADMIN_TOKEN=...                    # >=24 random chars
export WHOP_WEBHOOK_SECRET=ws_...         # from the webhook endpoint you register
export WHOP_PLAN_ID_INSPECTION=plan_1NofJFeDJT8Gk
export WHOP_PLAN_ID_DEPOSIT=plan_8TyOecSfZ12wC
export WHOP_PLAN_ID_GUTTER=plan_ca358aTAVQPVM

node scripts/deploy-and-verify.mjs --sync-secrets
```

If you would rather not export secrets, put them in `.env` (gitignored) — the
script loads it and explicit environment variables still win.

The script then, in order: checks egress → probes the API → verifies each plan id
against the account with `whop variants get` (fails if a `prod_` id is used or the
price does not match) → reports the balance variant → pushes secrets to the app
runtime → runs `tsc` → deploys → reads `hosted_url` → exercises the live site.

It stops at the first thing it cannot prove and never prints a secret.

## What it verifies live

Homepage (hero headline), `/admin`, `/robots.txt`, `/api/admin/stats`
(which reports **boolean** readiness for every secret plus the storage backend —
this is how you confirm the Workers runtime actually received `process.env`),
unsigned webhook rejection, and checkout initialisation for each plan.

Optional flags:

| Flag | Effect |
|---|---|
| `--sync-secrets` | push the exported variables into the app runtime |
| `--create-test-lead` | write one real test lead (production data — off by default) |
| `--skip-deploy` | verify what is already live (`npm run verify:live`) |
| `VERIFY_BASE_URL=` | verify a specific URL |

**Never run with payments enabled unattended:** no payment, invoice or saved card
is touched by this script. Checkout is only initialised, never completed.

## Manual equivalent

```bash
npx whop auth status                                   # or rely on WHOP_API_KEY
npx whop apps get app_S6fj7hfqepepH7                   # account + domains
npx whop variants get plan_1NofJFeDJT8Gk               # $149 inspection
npx whop variants get plan_8TyOecSfZ12wC               # $500 deposit
npx whop variants get plan_ca358aTAVQPVM               # $299 gutter
npx whop apps secrets set --app app_S6fj7hfqepepH7 --secret KEY=VALUE
npx whop apps deploy --app app_S6fj7hfqepepH7
npx whop apps get app_S6fj7hfqepepH7 --format json     # -> hosted_url
npx whop apps logs app_S6fj7hfqepepH7 --level error    # after first traffic
```

## Expected first-deploy failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `NOT_AUTHENTICATED` | no key / no session | export `WHOP_API_KEY` or `whop auth login` |
| `fetch failed` | no egress to `api.whop.com` | run on a networked machine |
| `DOMAIN_REQUIRED` | app has no domain | `npx whop domains create <name> --website '{"app_id":"app_S6fj7hfqepepH7"}'` |
| `NO_BUILD_ARCHIVE` | `whop()` vite plugin missing | already wired in `vite.config.ts` — do not remove |
| `/api/leads` → `503 STORAGE_NOT_CONFIGURED` | `DATABASE_URL` not set | set it, redeploy |
| `/api/admin/*` → `503 ADMIN_TOKEN_INSECURE` | token is a dev value or <24 chars | set a strong `ADMIN_TOKEN` |
| admin stats show every flag `false` | Workers did not expose `process.env` | see below |

### If every config flag is false in production

Whop injects secrets as Worker bindings. TanStack Start on Workers normally gets
them through `process.env` under `nodejs_compat`. If `GET /api/admin/stats`
returns all-false while the secrets are set, that assumption is wrong for this
runtime and `src/server/env.ts` needs to read the Worker `env` object instead.
`/api/admin/stats` exists precisely so you learn this in one request rather than
by losing leads.

## Balance variant — still open

Whop prices every charge from a variant; there is no arbitrary-amount charge. The
final-balance invoice therefore needs its own plan id in
`WHOP_PLAN_ID_BALANCE`. It has **not** been invented. Until you provide a real
`plan_...` id, `POST /api/invoices/final` returns
`503 WHOP_NOT_CONFIGURED` with `missing: ["WHOP_PLAN_ID_BALANCE"]` — by design.

## Register the webhook

After deploy, point a Whop webhook at:

```
https://<your-domain>/api/webhooks/whop
```

Subscribe at minimum to payment events. Copy the signing secret (`ws_...`) into
`WHOP_WEBHOOK_SECRET`. Signature verification, replay dedupe and tampered-payload
rejection are already implemented and tested locally.

---

## Verified against the built artifact (production mode)

`scripts/serve-artifact.mjs` boots `dist/server/index.js` — a Cloudflare-Workers-style
`{ fetch }` module, which `vite preview` cannot serve (it looks for
`dist/server/server.js`). With that harness the *shipping bundle* can be exercised
locally with `NODE_ENV=production` and a real PostgreSQL database:

```bash
# terminal 1 — serve the built Worker bundle
npm run build
npm run artifact:serve          # http://0.0.0.0:3310, serves dist/client too

# or, fully automated, assert every API surface:
DATABASE_URL="postgres://user:pass@127.0.0.1:5432/db" npm run verify:artifact
```

`verify:artifact` prints PASS / FAIL / BLOCKED per check and exits non-zero on any
FAIL. It never charges, invoices, or prints a secret. `BLOCKED` means the check
needs `api.whop.com` and this host has no route to it.

Latest run (real credentials, PostgreSQL 18.7): **22 PASS · 0 FAIL · 1 BLOCKED**
(the blocked one is `POST /api/checkout-sessions` with `plan=deposit`, which creates
a setup-mode checkout configuration at Whop and therefore needs the network).

## Missing-database behaviour (regression-tested)

With `NODE_ENV=production` and `DATABASE_URL` empty, the artifact still boots and
the marketing page returns 200, while every route that needs storage answers:

```
POST /api/leads                      503 STORAGE_NOT_CONFIGURED
POST /api/track                      503 STORAGE_NOT_CONFIGURED
POST /api/checkout-sessions          503 STORAGE_NOT_CONFIGURED
GET  /api/admin/leads                503 STORAGE_NOT_CONFIGURED
GET  /api/admin/stats                503 STORAGE_NOT_CONFIGURED
```

`checkout-sessions` used to answer `502 WHOP_ERROR` ("Whop could not start the
checkout") in this case, because the store was resolved *inside* the Whop
try/catch and a missing database looked like an API failure. It now resolves the
store before contacting Whop and rethrows `StorageUnavailableError`, so the
merchant is told to set `DATABASE_URL` — and no orphaned checkout configuration
is created at Whop.
