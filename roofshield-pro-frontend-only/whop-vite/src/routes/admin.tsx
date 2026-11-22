import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  LogOut,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Database,
} from "lucide-react";

/**
 * /admin — secure operations dashboard.
 *
 * Client-rendered on purpose: no lead data is ever serialised into the SSR HTML,
 * so an unauthenticated visitor receives nothing but the token prompt. The token
 * lives in sessionStorage (cleared when the tab closes) and is sent as a bearer
 * header. It is never placed in a URL, a cookie, or the bundle.
 */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "RoofShield Pro — Operations" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

const SESSION_KEY = "rs_admin_token";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  zip: string;
  service_type: string;
  description: string;
  status: string;
}

interface TrackEvent {
  id: string;
  created_at: string;
  event: string;
  path: string | null;
  pixel_present: boolean;
  params: Record<string, unknown>;
}

interface Stats {
  ok: boolean;
  storage: { backend: string; databaseUrlConfigured: boolean };
  config: {
    whopApiKey: boolean;
    whopAccountId: boolean;
    webhookSecret: boolean;
    adminToken: boolean;
    plans: Record<string, boolean>;
  };
  counts: { leads: number; events: number; orders: number; webhooks: number };
  recentEvents: TrackEvent[];
}

const STATUSES = ["new", "contacted", "scheduled", "won", "lost"] as const;

type Phase = "locked" | "loading" | "ready" | "error";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<Phase>("locked");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null;
    if (saved) {
      setToken(saved);
      void load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeaders = (t: string) => ({
    authorization: `Bearer ${t}`,
    "content-type": "application/json",
  });

  const load = useCallback(async (t: string) => {
    setPhase("loading");
    setMessage("");
    try {
      const [sRes, lRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: authHeaders(t) }),
        fetch("/api/admin/leads?limit=50", { headers: authHeaders(t) }),
      ]);

      if (sRes.status === 401 || lRes.status === 401) {
        setPhase("locked");
        setMessage("That token was not accepted.");
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }

      const sJson = await sRes.json();
      if (!sRes.ok) {
        setPhase("error");
        setMessage(sJson?.message ?? "The dashboard could not be loaded.");
        return;
      }

      const lJson = await lRes.json();
      setStats(sJson as Stats);
      setLeads((lJson?.leads ?? []) as Lead[]);
      setPhase("ready");
    } catch {
      setPhase("error");
      setMessage("Network error — the admin API could not be reached.");
    }
  }, []);

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;
    sessionStorage.setItem(SESSION_KEY, t);
    void load(t);
  };

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken("");
    setLeads([]);
    setStats(null);
    setPhase("locked");
    setMessage("");
  };

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      } else if (res.status === 401) {
        lock();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (phase === "locked") {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-ink px-5 py-16">
        <form
          onSubmit={unlock}
          className="w-full max-w-md rounded-[1.75rem] border border-white/12 bg-white/[0.04] p-8"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-copper/20 text-copper-2">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="font-display mt-5 text-4xl uppercase leading-none tracking-wide text-white">
            Operations
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Enter the admin token to view leads and configuration status. The token is held in this
            tab only and is never stored in the site, a URL, or a cookie.
          </p>

          <label className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
            Admin token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="ADMIN_TOKEN"
            className="mt-2 w-full rounded-full border border-white/15 bg-ink px-5 py-3 text-sm text-white placeholder:text-white/30 focus:border-copper focus:outline-none"
          />

          {message && (
            <p className="mt-3 flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle className="h-3.5 w-3.5" /> {message}
            </p>
          )}

          <button
            type="submit"
            className="btn-lux mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-semibold text-ink"
            style={{ ["--btn-sweep" as string]: "#b77a4b" }}
          >
            <ShieldCheck className="h-4 w-4" /> Unlock dashboard
          </button>

          <a
            href="/"
            className="mt-4 block text-center text-[11px] uppercase tracking-[0.2em] text-white/40 hover:text-white/70"
          >
            Back to website
          </a>
        </form>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-ink text-white/60">
        <Loader2 className="h-8 w-8 animate-spin text-copper" />
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-ink px-5">
        <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-300" />
          <p className="mt-3 text-sm text-red-200">{message}</p>
          <button
            onClick={lock}
            className="mt-5 rounded-full bg-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-paper px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-copper">
              RoofShield Pro
            </p>
            <h1 className="font-display mt-1 text-4xl uppercase leading-none tracking-wide text-ink sm:text-5xl">
              Operations
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load(token)}
              className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink hover:border-copper"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={lock}
              className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
            >
              <LogOut className="h-3.5 w-3.5" /> Lock
            </button>
          </div>
        </header>

        {/* Counts */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Leads", value: stats?.counts.leads ?? 0, icon: Users },
            { label: "Events", value: stats?.counts.events ?? 0, icon: Activity },
            { label: "Orders", value: stats?.counts.orders ?? 0, icon: CheckCircle2 },
            {
              label: "Webhooks",
              value: stats?.counts.webhooks ?? 0,
              icon: Database,
            },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-white p-5">
              <c.icon className="h-4 w-4 text-copper" />
              <p className="font-display mt-3 text-4xl leading-none text-ink">{c.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-mute">{c.label}</p>
            </div>
          ))}
        </section>

        {/* Config readiness */}
        <section className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-mute">
            Production configuration
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Whop API key", stats?.config.whopApiKey],
              ["Whop account id", stats?.config.whopAccountId],
              ["Webhook secret", stats?.config.webhookSecret],
              ["Database (DATABASE_URL)", stats?.storage.databaseUrlConfigured],
              ["Plan · inspection", stats?.config.plans.inspection],
              ["Plan · deposit", stats?.config.plans.deposit],
              ["Plan · gutter", stats?.config.plans.gutter],
              ["Plan · final balance", stats?.config.plans.balance],
            ].map(([label, ok]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-2.5"
              >
                <span className="text-xs text-ink/70">{label}</span>
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-mute/60" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-mute">
            Storage backend: <strong className="text-ink">{stats?.storage.backend}</strong>
            {stats?.storage.backend === "file" && (
              <> — non-durable, development only. Set DATABASE_URL before production.</>
            )}
          </p>
        </section>

        {/* Leads */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-mute">
              Estimate requests
            </h2>
            <span className="text-[11px] text-mute">{leads.length} shown</span>
          </div>

          {leads.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-mute">
              No estimate requests yet. Submissions from the website appear here.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {leads.map((l) => (
                <article key={l.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.4fr_1fr_auto]">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {l.name}{" "}
                      <span className="ml-1 rounded-full bg-paper px-2 py-0.5 text-[10px] uppercase tracking-wider text-mute">
                        {l.service_type.replace("roof-", "")}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      {l.email} · {l.phone} · ZIP {l.zip}
                    </p>
                    <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/70">
                      {l.description}
                    </p>
                  </div>
                  <div className="text-xs text-mute">
                    {new Date(l.created_at).toLocaleString()}
                  </div>
                  <div className="flex items-start justify-end">
                    <select
                      value={l.status}
                      disabled={busyId === l.id}
                      onChange={(e) => void setStatus(l.id, e.target.value)}
                      className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink focus:border-copper focus:outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Events */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-mute">
              Recent tracking events
            </h2>
          </div>
          {stats && stats.recentEvents.length > 0 ? (
            <ul className="divide-y divide-line">
              {stats.recentEvents.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span className="font-mono text-xs text-ink">{e.event}</span>
                  <span className="text-[11px] text-mute">
                    {new Date(e.created_at).toLocaleString()} · pixel{" "}
                    {e.pixel_present ? "present" : "absent"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-mute">No events recorded yet.</p>
          )}
        </section>

        <p className="mt-8 text-center text-[11px] text-mute">
          Admin data is served only to an authenticated request. This page is excluded from search
          engines.
        </p>
      </div>
    </main>
  );
}
