/**
 * Server-only persistence.
 *
 * Two backends, selected automatically:
 *   • Postgres (pg) when DATABASE_URL is set — the production path on Whop
 *     hosting, where the filesystem is not durable.
 *   • A JSON file under DATA_DIR when DATABASE_URL is absent — development and
 *     automated tests only. It is single-process; it exists so the endpoints can
 *     be exercised without credentials, never as a production store.
 *
 * Tables are created idempotently on first use, so no migration step is needed.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { databaseUrl } from "./env";
import { isProductionRuntime, isWorkersRuntime } from "./runtime";

export type LeadStatus = "new" | "contacted" | "scheduled" | "won" | "lost";

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  zip: string;
  service_type: string;
  description: string;
  idempotency_key: string;
  status: LeadStatus;
  source: string;
}

export interface TrackEvent {
  id: string;
  created_at: string;
  event: string;
  event_id: string | null;
  path: string | null;
  pixel_present: boolean;
  params: Record<string, unknown>;
}

export type OrderKind = "inspection" | "deposit" | "gutter" | "balance";

export interface Order {
  id: string;
  created_at: string;
  kind: OrderKind;
  plan_id: string | null;
  setup_intent_id: string | null;
  payment_id: string | null;
  invoice_id: string | null;
  member_id: string | null;
  payment_method_id: string | null;
  status: string;
  amount: number | null;
  currency: string;
  meta: Record<string, unknown>;
}

export interface Store {
  readonly backend: "postgres" | "file";
  insertLead(input: Omit<Lead, "id" | "created_at" | "status">): Promise<{ lead: Lead; duplicate: boolean }>;
  listLeads(limit: number): Promise<Lead[]>;
  setLeadStatus(id: string, status: LeadStatus): Promise<boolean>;
  insertEvent(e: Omit<TrackEvent, "id" | "created_at">): Promise<void>;
  listEvents(limit: number, event?: string): Promise<TrackEvent[]>;
  insertOrder(o: Omit<Order, "id" | "created_at">): Promise<{ order: Order; created: boolean }>;
  findOrderBySetupIntent(setupIntentId: string): Promise<Order | null>;
  updateOrder(id: string, patch: Partial<Order>): Promise<Order | null>;
  updateOrderByPaymentId(paymentId: string, status: string): Promise<Order | null>;
  recordWebhook(webhookId: string, eventType: string, payload: unknown): Promise<boolean>;
  stats(): Promise<{ leads: number; events: number; orders: number; webhooks: number }>;
}

const now = () => new Date().toISOString();

/* ────────────────────────────── Postgres ────────────────────────────── */

class PgStore implements Store {
  readonly backend = "postgres" as const;
  private url: string;
  private poolPromise: Promise<import("pg").Pool> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Lazily and asynchronously imported so the client bundle never sees `pg`
   * and an install without a database still boots.
   */
  private async conn(): Promise<import("pg").Pool> {
    if (!this.poolPromise) {
      this.poolPromise = (async () => {
        const { Pool } = await import("pg");
        const pool = new Pool({
          connectionString: this.url,
          max: 5,
          ssl: this.url.includes("localhost") ? undefined : { rejectUnauthorized: false },
        });
        await pool.query(`
          CREATE TABLE IF NOT EXISTS leads (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            zip TEXT NOT NULL,
            service_type TEXT NOT NULL,
            description TEXT NOT NULL,
            idempotency_key TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'new',
            source TEXT NOT NULL DEFAULT 'website'
          );
          CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
          CREATE TABLE IF NOT EXISTS track_events (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            event TEXT NOT NULL,
            event_id TEXT,
            path TEXT,
            pixel_present BOOLEAN NOT NULL DEFAULT false,
            params JSONB NOT NULL DEFAULT '{}'::jsonb
          );
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            kind TEXT NOT NULL,
            plan_id TEXT,
            setup_intent_id TEXT UNIQUE,
            payment_id TEXT UNIQUE,
            invoice_id TEXT,
            member_id TEXT,
            payment_method_id TEXT,
            status TEXT NOT NULL,
            amount INTEGER,
            currency TEXT NOT NULL DEFAULT 'usd',
            meta JSONB NOT NULL DEFAULT '{}'::jsonb
          );
          CREATE TABLE IF NOT EXISTS webhook_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            payload JSONB NOT NULL DEFAULT '{}'::jsonb
          );
        `);
        return pool;
      })();
    }
    return this.poolPromise;
  }
  async insertLead(input: Omit<Lead, "id" | "created_at" | "status">) {
    const pool = await this.conn();
    const id = randomUUID();
    try {
      const { rows } = await pool.query(
        `INSERT INTO leads (id, name, email, phone, zip, service_type, description, idempotency_key, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, input.name, input.email, input.phone, input.zip, input.service_type, input.description, input.idempotency_key, input.source],
      );
      return { lead: rows[0] as Lead, duplicate: false };
    } catch (err) {
      // 23505 = unique_violation on idempotency_key → the same submission again.
      if ((err as { code?: string }).code === "23505") {
        const { rows } = await pool.query(`SELECT * FROM leads WHERE idempotency_key = $1`, [input.idempotency_key]);
        return { lead: rows[0] as Lead, duplicate: true };
      }
      throw err;
    }
  }

  async listLeads(limit: number) {
    const pool = await this.conn();
    const { rows } = await pool.query(`SELECT * FROM leads ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows as Lead[];
  }

  async setLeadStatus(id: string, status: LeadStatus) {
    const pool = await this.conn();
    const { rowCount } = await pool.query(`UPDATE leads SET status = $2 WHERE id = $1`, [id, status]);
    return (rowCount ?? 0) > 0;
  }

  async insertEvent(e: Omit<TrackEvent, "id" | "created_at">) {
    const pool = await this.conn();
    await pool.query(
      `INSERT INTO track_events (id, event, event_id, path, pixel_present, params) VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), e.event, e.event_id, e.path, e.pixel_present, JSON.stringify(e.params)],
    );
  }

  async listEvents(limit: number, event?: string) {
    const pool = await this.conn();
    const { rows } = event
      ? await pool.query(`SELECT * FROM track_events WHERE event = $2 ORDER BY created_at DESC LIMIT $1`, [limit, event])
      : await pool.query(`SELECT * FROM track_events ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows as TrackEvent[];
  }

  async insertOrder(o: Omit<Order, "id" | "created_at">) {
    const pool = await this.conn();
    const id = randomUUID();
    try {
      const { rows } = await pool.query(
        `INSERT INTO orders (id, kind, plan_id, setup_intent_id, payment_id, invoice_id, member_id, payment_method_id, status, amount, currency, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [id, o.kind, o.plan_id, o.setup_intent_id, o.payment_id, o.invoice_id, o.member_id, o.payment_method_id, o.status, o.amount, o.currency, JSON.stringify(o.meta)],
      );
      return { order: rows[0] as Order, created: true };
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        const { rows } = o.setup_intent_id
          ? await pool.query(`SELECT * FROM orders WHERE setup_intent_id = $1`, [o.setup_intent_id])
          : await pool.query(`SELECT * FROM orders WHERE payment_id = $1`, [o.payment_id]);
        if (rows[0]) return { order: rows[0] as Order, created: false };
      }
      throw err;
    }
  }

  async findOrderBySetupIntent(setupIntentId: string) {
    const pool = await this.conn();
    const { rows } = await pool.query(`SELECT * FROM orders WHERE setup_intent_id = $1`, [setupIntentId]);
    return (rows[0] as Order | undefined) ?? null;
  }

  async updateOrder(id: string, patch: Partial<Order>) {
    const pool = await this.conn();
    const keys = Object.keys(patch).filter((k) => k !== "id" && k !== "created_at");
    if (keys.length === 0) {
      const { rows } = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
      return (rows[0] as Order | undefined) ?? null;
    }
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    const values = keys.map((k) => (k === "meta" ? JSON.stringify(patch.meta) : (patch as Record<string, unknown>)[k]));
    const { rows } = await pool.query(`UPDATE orders SET ${sets} WHERE id = $1 RETURNING *`, [id, ...values]);
    return (rows[0] as Order | undefined) ?? null;
  }

  async updateOrderByPaymentId(paymentId: string, status: string) {
    const pool = await this.conn();
    const { rows } = await pool.query(
      `UPDATE orders SET status = $2 WHERE payment_id = $1 RETURNING *`,
      [paymentId, status],
    );
    return (rows[0] as Order | undefined) ?? null;
  }

  async recordWebhook(webhookId: string, eventType: string, payload: unknown) {
    const pool = await this.conn();
    try {
      await pool.query(
        `INSERT INTO webhook_events (id, event_type, payload) VALUES ($1,$2,$3)`,
        [webhookId, eventType, JSON.stringify(payload)],
      );
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === "23505") return false;
      throw err;
    }
  }

  async stats() {
    const pool = await this.conn();
    const q = async (t: string) => Number((await pool.query(`SELECT count(*)::int AS c FROM ${t}`)).rows[0].c);
    return { leads: await q("leads"), events: await q("track_events"), orders: await q("orders"), webhooks: await q("webhook_events") };
  }
}

/* ─────────────────────────── File (dev/test) ─────────────────────────── */

interface FileShape {
  leads: Lead[];
  events: TrackEvent[];
  orders: Order[];
  webhooks: { id: string; event_type: string; received_at: string; payload: unknown }[];
}

class FileStore implements Store {
  readonly backend = "file" as const;
  private dir: string;
  private file: string;
  private lock: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.dir = dir;
    this.file = join(dir, "store.json");
  }

  private async read(): Promise<FileShape> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as FileShape;
    } catch {
      return { leads: [], events: [], orders: [], webhooks: [] };
    }
  }

  private async write(data: FileShape): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.file, JSON.stringify(data, null, 2), "utf8");
  }

  /** Serialise read-modify-write cycles within this process. */
  private mutate<T>(fn: (d: FileShape) => Promise<T> | T): Promise<T> {
    const run = this.lock.then(async () => {
      const d = await this.read();
      const out = await fn(d);
      await this.write(d);
      return out;
    });
    this.lock = run.catch(() => undefined);
    return run;
  }

  insertLead(input: Omit<Lead, "id" | "created_at" | "status">) {
    return this.mutate((d) => {
      const existing = d.leads.find((l) => l.idempotency_key === input.idempotency_key);
      if (existing) return { lead: existing, duplicate: true };
      const lead: Lead = { id: randomUUID(), created_at: now(), status: "new", ...input };
      d.leads.unshift(lead);
      return { lead, duplicate: false };
    });
  }

  async listLeads(limit: number) {
    return (await this.read()).leads.slice(0, limit);
  }

  setLeadStatus(id: string, status: LeadStatus) {
    return this.mutate((d) => {
      const lead = d.leads.find((l) => l.id === id);
      if (!lead) return false;
      lead.status = status;
      return true;
    });
  }

  insertEvent(e: Omit<TrackEvent, "id" | "created_at">) {
    return this.mutate((d) => {
      d.events.unshift({ id: randomUUID(), created_at: now(), ...e });
    });
  }

  async listEvents(limit: number, event?: string) {
    const all = (await this.read()).events;
    return (event ? all.filter((e) => e.event === event) : all).slice(0, limit);
  }

  insertOrder(o: Omit<Order, "id" | "created_at">) {
    return this.mutate((d) => {
      const existing = o.setup_intent_id
        ? d.orders.find((x) => x.setup_intent_id === o.setup_intent_id)
        : d.orders.find((x) => x.payment_id && x.payment_id === o.payment_id);
      if (existing) return { order: existing, created: false };
      const order: Order = { id: randomUUID(), created_at: now(), ...o };
      d.orders.unshift(order);
      return { order, created: true };
    });
  }

  async findOrderBySetupIntent(setupIntentId: string) {
    return (await this.read()).orders.find((o) => o.setup_intent_id === setupIntentId) ?? null;
  }

  updateOrder(id: string, patch: Partial<Order>) {
    return this.mutate((d) => {
      const idx = d.orders.findIndex((o) => o.id === id);
      if (idx === -1) return null;
      d.orders[idx] = { ...d.orders[idx], ...patch, id: d.orders[idx].id, created_at: d.orders[idx].created_at };
      return d.orders[idx];
    });
  }

  updateOrderByPaymentId(paymentId: string, status: string) {
    return this.mutate((d) => {
      const idx = d.orders.findIndex((o) => o.payment_id === paymentId);
      if (idx === -1) return null;
      d.orders[idx] = { ...d.orders[idx], status };
      return d.orders[idx];
    });
  }

  recordWebhook(webhookId: string, eventType: string, payload: unknown) {
    return this.mutate((d) => {
      if (d.webhooks.some((w) => w.id === webhookId)) return false;
      d.webhooks.unshift({ id: webhookId, event_type: eventType, received_at: now(), payload });
      return true;
    });
  }

  async stats() {
    const d = await this.read();
    return { leads: d.leads.length, events: d.events.length, orders: d.orders.length, webhooks: d.webhooks.length };
  }
}

/* ────────────────────────────── Factory ────────────────────────────── */

let store: Store | null = null;

/** Thrown when no durable store is available in a production runtime. */
export class StorageUnavailableError extends Error {
  readonly code = "STORAGE_NOT_CONFIGURED";
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`No durable store is configured. Missing: ${missing.join(", ")}`);
    this.missing = missing;
  }
}

export function getStore(): Store {
  if (store) return store;

  const url = databaseUrl();
  if (url) {
    store = new PgStore(url);
    return store;
  }

  // No DATABASE_URL. In production the file store is not an option: Whop runs
  // these apps on Cloudflare Workers, whose filesystem is not durable, and a
  // silently-ephemeral lead store would lose every enquiry. Refuse loudly.
  if (isProductionRuntime()) {
    throw new StorageUnavailableError(["DATABASE_URL"]);
  }

  store = new FileStore(process.env.DATA_DIR ?? ".data");
  return store;
}

export { isWorkersRuntime };

export function storeBackend(): "postgres" | "file" {
  return databaseUrl() ? "postgres" : "file";
}
