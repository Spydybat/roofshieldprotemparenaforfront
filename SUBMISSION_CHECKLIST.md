# ROOFSHIELD PRO — Final Submission Checklist

**Commit:** continuing from `41c02b5` · **Whop app:** `app_S6fj7hfqepepH7`
**Project:** `roofshield-pro-frontend-only/whop-vite/` · **Target:** Whop production hosting only

---

## 1. Frontend → backend wiring (every call site)

| UI control | Calls | Endpoint exists |
|---|---|---|
| Estimate form submit (`EstimateForm`) | `POST /api/leads` | **Yes** |
| `traceEstimateRequested` after confirmed submit | `POST /api/track` (`estimate_requested`) | **Yes** |
| Service card "Explore" (`Services`) | `POST /api/track` (`service_viewed`) | **Yes** |
| Pricing card button (`Pricing` → `openCheckout`) | `POST /api/checkout-sessions` | **Yes** |
| Deposit checkout completion | `POST /api/deposit/complete` | **Yes** |
| Deposit open | `POST /api/track` (`deposit_started`) | **Yes** |
| Nav / hero / footer / project CTAs | in-page anchors (`#services`, `#estimate`, `tel:`, `mailto:`) | n/a — no backend |

**Two dead controls were found and removed this pass** (both were developer
leftovers on the customer-facing pricing section, one pointed at a route that
does not exist):

- `href="/checkout/test"` — "Open the sandbox checkout self-test →" (404, and the
  project is production-only).
- the "Whop plan: `WHOP_PLAN_ID_*`" row printed on each pricing card — exposed
  internal config wiring to customers.

No remaining `fetch()` targets a route that does not exist. Verified by
grep + live requests.

## 2. API surface — eight paths, executed against a running server

| Method | Path | Guard | Result |
|---|---|---|---|
| GET | `/` | — | **200** |
| POST | `/api/leads` | validation + rate limit | **422 / 201 / 200 duplicate** |
| POST | `/api/track` | 3-event whitelist | **202 / 400 unknown event** |
| POST | `/api/checkout-sessions` | plan whitelist | **400 invalid / 503 unconfigured** |
| POST | `/api/deposit/complete` | consent gate | **400 no consent / 503 unconfigured** |
| POST | `/api/invoices/final` | admin token | **401 / 503 no balance plan** |
| POST | `/api/webhooks/whop` | signature | **200 signed / 400 unsigned·tampered·forged / 503 no secret** |
| GET·PATCH | `/api/admin/leads` | admin token | **401 no token / 401 wrong / 200 / 404 unknown id** |
| GET | `/api/admin/stats` | admin token | **200** |

Regression suite after all edits: **13/14 pass, 1 intentional** (the webhook
"unsigned" case returns **503** when the server has no webhook secret, and **400**
when it does — both verified; my first assertion assumed the wrong env).

## 3. Database persistence + migrations — verified against real PostgreSQL

This pass removed the last unknown. A real **PostgreSQL 18.7** server was started
locally (binaries shipped in the `@embedded-postgres/linux-x64` npm package — no
external download) and the **production bundle** (`dist/server/index.js`) was
driven against it:

| Check | Result |
|---|---|
| Auto-migrations on first request | **PASS** — all four tables created |
| `POST /api/leads` | **PASS** — 201, row in Postgres |
| Duplicate idempotency key | **PASS** — 200 `duplicate:true`, same `leadId`, still 1 row |
| `POST /api/track` | **PASS** — 202, event stored |
| `GET /api/admin/stats` | **PASS** — `backend=postgres`, counts correct |
| `GET /api/admin/leads` | **PASS** — returns the row |
| `PATCH` lead status → `scheduled` | **PASS** — 200, persisted |
| **Durability across a fresh process** | **PASS** — new process reads the same lead and status |
| Duplicate guards (`23505`) | **PASS** — `idempotency_key`, `setup_intent_id`, `webhook_events.id` |

**Bug found and fixed by this test:** TLS was being force-enabled for any host
other than the literal string `localhost`, so a Postgres URL on `127.0.0.1` — or
any provider using `?sslmode=disable` — failed with *"The server does not support
SSL connections"*. `sslFor()` now honours `sslmode` (`disable` / `require` /
`verify-ca` / `verify-full`), an explicit `DATABASE_SSL` override, and treats all
loopback hosts as no-TLS. Supabase (`sslmode=require`) is the default for any
non-loopback host.

Also verified: the **production artifact itself boots** — `dist/server/index.js`
exports `default.fetch`, serves SSR for `/` (hero headline present) and `/admin`,
routes every API path, and returns 401 for unauthenticated admin calls. In the
built bundle `process.env.NODE_ENV` is baked to `production`, and the storage
guard correctly refuses to run without `DATABASE_URL`.

### Runtime caveat you must know before submission

`whop apps --help` states hosting is **"Vite apps on Cloudflare Workers"**, and
the app archive entry is a Workers module (`default { fetch }`). Consequences:

1. **The filesystem is not durable** in production. The file store is therefore
   **refused** in production: with no `DATABASE_URL` the server now returns
   `503 STORAGE_NOT_CONFIGURED` instead of silently losing leads. **Verified.**
2. `pg` on Workers relies on `pg-cloudflare` (present in `node_modules`, and it
   is what Whop's own scaffold ships). Expect it to work with `DATABASE_URL`,
   but **confirm after deploy**: submit one test lead and check
   `npx whop apps logs app_S6fj7hfqepepH7 --level error`.
3. If Whop injects secrets as Worker bindings rather than `process.env`, every
   server-side config read would be empty. Mitigation: `GET /api/admin/stats`
   reports booleans for each variable, so one authenticated request confirms
   the whole configuration surface post-deploy.

## 4. Whop SDK call verification — and its limit

**Verified against the installed package** (`@whop/sdk` 2.8.1, `@whop/cli` 0.34.1):

| Call | Correct usage | Evidence |
|---|---|---|
| client auth | `new WhopClient({ token })` — **not** `apiKey` | `BearerAuthProvider.d.mts` (`TOKEN_PARAM = "token"`) |
| payment success | `status === "paid"` — not `"succeeded"` | `ListPaymentsRequestStatus` enum |
| deposit card-on-file | `checkoutConfigurations.create({ mode: "setup", … })` | `CreateCheckoutConfigurationsRequest.Mode` |
| save method | `setupIntents.retrieve({ id })` | `RetrieveSetupIntentsRequest` |
| charge deposit | `payments.create({ account_id, member_id, payment_method_id, off_session, line_items:[{variant_id}] })` | `CreatePaymentsRequest` |
| final invoice | `invoices.create({...})` → `charge()` or `send()` | `CreateInvoicesRequest`, `ChargeInvoicesRequest` |
| webhook verify | `unwrapWebhook(rawBody, { headers, key })` | `@whop/sdk/helpers` |

Every argument object is **statically checked by `tsc` against the SDK's declared
request types** — `tsc --noEmit` passes.

**Limit, stated plainly:** `docs.whop.com` and `whop.com` are **unreachable from
this sandbox** (`HTTP 000`; outbound access is limited to npm/GitHub). I could
not read the live documentation. Verification here is against the SDK/CLI
artefacts Whop publishes on npm, not against the website. If you want the live
docs cross-checked, that needs a networked review pass.

## 5. Whop Leads API — database storage vs Whop-side creation

- `@whop/sdk` 2.8.1 has **no `leads` resource** — no `leads` client, no `lead_`
  ids, nothing in the CLI reference docs shipped in the package.
- The nearest resources are **`waitlistEntries`** (create/approve/deny/cancel
  entries for a product's waitlist) and **`people`** (read-only list/retrieve of
  members). Neither is a CRM lead object.
- Therefore `/api/leads` **stores the lead in your database** and returns
  `whopSynced: false`. It does not claim a Whop-side object exists.
- **If a bounty judge requires a Whop-side lead object, that requirement cannot
  be met with the current public API** — it is not a code gap. The honest
  options are (a) accept database-backed leads with admin retrieval, or
  (b) ask the bounty for the exact API endpoint they expect.

## 6. Admin auth + dev-token isolation

- `ADMIN_TOKEN` unset → **503** (never anonymous access).
- Missing token → **401**; wrong token → **401** (constant-time compare); correct
  token → **200/404** as appropriate.
- `local-test-token-1234` appears **only** in local shell commands. Verified:
  never in git history (`git log -S`), never in the tracked tree, and refused
  whenever `NODE_ENV=production` → **503 `ADMIN_TOKEN_INSECURE`** (also applies
  to any token shorter than 24 characters). **Verified by running a
  production-mode server.**

## 7. Credential exposure audit

`dist/client` scan for `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`, `ADMIN_TOKEN`,
`DATABASE_URL`, `local-test-token`, `plan_1Nof`, `standardwebhooks`,
`unwrapWebhook`, `PgStore`, `readFile` → **0 matches each**.
`node:` builtin references in the client bundle → **0**.
`.env` never tracked (only `.env.example`); `.data/` gitignored.
No secret value was printed in any command or report — only variable **names**.

## 7b. Admin dashboard (`/admin`) — new this pass

The API existed; the **dashboard did not**. Journey "open the secure admin
dashboard" had no page to open. Added `src/routes/admin.tsx`:

- Token prompt (`ADMIN_TOKEN`), held in **sessionStorage only** — never in a URL,
  cookie, or the bundle; cleared when the tab closes, plus an explicit Lock button.
- Counts (leads / events / orders / webhooks), **per-variable config readiness**
  booleans (Whop key, account id, webhook secret, `DATABASE_URL`, all four plans),
  storage backend with a warning when it is the non-durable dev store.
- Estimate requests with inline pipeline status updates (`new → contacted →
  scheduled → won → lost`) via `PATCH /api/admin/leads`.
- Recent tracking events.
- `noindex, nofollow` + `/admin` disallowed in `public/robots.txt`.

**Verified:** `/admin` → 200; renders the prompt; SSR HTML contains **no lead
data** (nothing to leak before auth); noindex present; `robots.txt` served;
`/api/admin/leads` without a token still 401. Data path exercised with the exact
requests the page makes (stats + leads + PATCH). *Not browser-automated* — no
Chromium can be downloaded in this sandbox, so the rendering is verified by SSR
output and code review, not by a clicking test.

## 7c. Link + asset integrity

- Every internal anchor used on the homepage — `#home #about #services
  #projects #pricing #financing #estimate #contact` — has a matching section
  `id`. **Missing targets: none.**
- All 10 referenced images exist in `public/images/` (812 KB–1.1 MB).
- Contact links resolve to `tel:5125550148` and `mailto:hello@roofshield.pro`.
- No dead app routes linked from the storefront.

## 7d. Customer journeys executed (live server)

| # | Journey | Result |
|---|---|---|
| 1 | Open homepage | **PASS** (200) |
| 2 | Navigate all sections | **PASS** (8/8 anchors resolve) |
| 3 | Submit estimate request | **PASS** (201) |
| 4 | Lead persisted + retrievable | **PASS** (3 leads via admin API) |
| 5 | Pricing plans render | **PASS** ($149/$500/$299 in HTML) |
| 6 | Initialize Whop checkout | **BLOCKED** (needs plan ids + API key) |
| 7 | Payment success/failure | **BLOCKED** (no credentials; no simulation) |
| 8 | Deposit consent + setup intent | **PASS** (consent gate 400) / **BLOCKED** (live setup) |
| 9 | Final invoice flow | **PASS** (guard 503) / **BLOCKED** (live invoice) |
| 10 | Webhook events | **PASS** (signed 200, replay dedupe, tamper 400) |
| 11 | Open secure admin dashboard | **PASS** (`/admin` 200, auth-gated data) |
| 12 | Mobile + desktop | **PARTIAL** — responsive markup/breakpoints verified statically; no browser rendering available |

## 8. Exact variables to configure

Set as Whop app secrets so they reach the hosted runtime:

```bash
cd roofshield-pro-frontend-only/whop-vite
npx whop apps secrets set --secret WHOP_API_KEY=...          # existing key, do not create a new one
npx whop apps secrets set --secret WHOP_ACCOUNT_ID=biz_...   # your business id
npx whop apps secrets set --secret WHOP_PLAN_ID_INSPECTION=plan_...
npx whop apps secrets set --secret WHOP_PLAN_ID_DEPOSIT=plan_...
npx whop apps secrets set --secret WHOP_PLAN_ID_GUTTER=plan_...
npx whop apps secrets set --secret WHOP_PLAN_ID_BALANCE=plan_...   # final-balance variant — you must create/choose this; I will not invent it
npx whop apps secrets set --secret DATABASE_URL=postgres://...     # mandatory: Workers FS is not durable
npx whop apps secrets set --secret ADMIN_TOKEN=...                  # ≥24 random chars
npx whop apps secrets set --secret WHOP_WEBHOOK_SECRET=ws_...       # from the webhook endpoint you create
```

| Variable | Required | Blocking what |
|---|---|---|
| `WHOP_API_KEY` | yes | deploy, checkout, deposit, invoice |
| `WHOP_ACCOUNT_ID` | yes | same |
| `WHOP_PLAN_ID_INSPECTION` / `_DEPOSIT` / `_GUTTER` | yes | each pricing card |
| `WHOP_PLAN_ID_BALANCE` | for final invoice | `/api/invoices/final` |
| `DATABASE_URL` | yes in production | leads/events — 503 without it |
| `ADMIN_TOKEN` | yes | `/api/admin/*` |
| `WHOP_WEBHOOK_SECRET` | yes | `/api/webhooks/whop` |
| `SITE_URL` | optional | absolute return URLs |

## 9. Plan IDs — verify, do not trust

The brief's three ids (`plan_1NofJFeDJT8Gk`, `plan_8TyOecSfZ12wC`,
`plan_ca358aTAVQPVM`) are **not hardcoded anywhere** and were **never verified
against your account** (no credentials here). Confirm each one, and confirm it is
a *variant* (`plan_`) not a product (`prod_`):

```bash
npx whop variants get plan_1NofJFeDJT8Gk   # $149 Roof Inspection
npx whop variants get plan_8TyOecSfZ12wC   # $500 Project Deposit
npx whop variants get plan_ca358aTAVQPVM   # $299 Gutter Cleaning
```

> **Correction to something I said earlier:** I claimed your brief contained a
> conflicting inspection plan id. Re-reading it, the three ids were stated
> consistently and there was no conflict. That note was wrong; disregard it.

## 10. Build + checks

`npx tsc --noEmit` → **PASS** · `npx vite build` → **PASS** ·
`dist/client` + `dist/server/index.js` + `dist/whop-build.zip` (entry `index.js`,
6 server / 13 client files) → **PASS**.

## 11. Bounty checklist

| # | Requirement | Status | Basis |
|---|---|---|---|
| 1 | Existing project preserved, nothing rebuilt | **PASS** | Only additive + 2 dead-control removals |
| 2 | Every frontend control wired to a real endpoint | **PASS** | grep + live requests |
| 3 | All eight API paths implemented | **PASS** | 8 route files, 14 live assertions |
| 4 | Server-side validation | **PASS** | 422 matrix |
| 5 | Lead persisted + retrievable | **PASS** | survived restart |
| 6 | Duplicate submission prevention | **PASS** | unique key, verified |
| 7 | Migrations valid | **PASS** | executed on PostgreSQL 18.7 via the production bundle |
| 8 | Admin auth 401/401/200 | **PASS** | executed |
| 9 | Dev token unusable in production | **PASS** | 503 in prod mode |
| 10 | Webhook signature verification | **PASS** | signed 200; tampered/forged 400 |
| 11 | Duplicate webhook protection | **PASS** | replay → duplicate |
| 12 | Duplicate payment protection | **PASS** (logic) / **BLOCKED** (live) | unique constraints + reserve-before-charge |
| 13 | Secrets absent from client bundle / git | **PASS** | 0 matches |
| 14 | Whop SDK usage verified | **PASS** (installed SDK) / **BLOCKED** (live docs unreachable) | §4 |
| 15 | Whop Leads API | **FAIL** | No such API exists in SDK 2.8.1 |
| 16 | Three required tracking events | **PASS** (server-side) / **BLOCKED** (dashboard) | 5 events stored |
| 17 | Checkout Elements mounted | **PASS** (code) / **BLOCKED** (render) | needs plan ids |
| 18 | Deposit setup-intent + consent | **PASS** (consent gate) / **BLOCKED** (live setup) | 400 without consent |
| 19 | Final balance invoice | **PASS** (code) / **BLOCKED** (execution) | needs balance variant |
| 20 | Database configuration | **PASS** (code, real Postgres) / **BLOCKED** (your URL) | verified locally; your `DATABASE_URL` still required |
| 21 | Desktop + tablet + mobile layout | **PARTIAL** | responsive breakpoints + `svh` verified statically; no browser render here |
| 22 | Secure admin dashboard (`/admin`) | **PASS** | 200, auth-gated, noindex, no SSR data leak |
| 22b | Production build + TypeScript | **PASS** | executed (20-file archive) |
| 23 | GitHub source | **PASS** | pushed |
| 24 | **Whop production deployment** | **BLOCKED** | `NOT_AUTHENTICATED` |
| 25 | **Live whop.app URL** | **BLOCKED** | no deploy ⇒ not invented |

**Deployment is not PASS and I will not mark it so until `whop apps deploy`
actually returns a build and `whop apps get app_S6fj7hfqepepH7` returns a
`hosted_url`.**

## 12. Bounty demo script (3–5 min)

1. Live URL → hero: eyebrow, three headline lines, single "Explore Our Services".
2. Services → open a card → `service_viewed` fires (server log + `/api/admin/stats?event=service_viewed`).
3. Pricing → three one-time plans ($149 / $500 / $299).
4. Click a card → Whop Elements mounts (card + express tabs, Branding element).
5. Estimate form → submit → confirmation only after a stored lead; then
   `GET /api/admin/leads` to show the row and `estimate_requested` recorded.
6. Deposit → consent checkbox → setup-mode checkout → `deposit_started` logged.
7. Invoice → `POST /api/invoices/final` with the balance variant (approval
   required before any real charge).
8. Close with `GET /api/admin/stats` — storage backend, config booleans, counts.

**Do not claim a completed payment in the demo** unless a real Whop payment was
made and confirmed.
