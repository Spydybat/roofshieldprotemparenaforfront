"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Clock,
} from "lucide-react";
import { brand, estimate } from "@/config/site";
import { whopTrack } from "@/lib/track";
import { onEstimatePrefill } from "@/lib/prefill";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";

type Fields = {
  name: string;
  email: string;
  phone: string;
  zip: string;
  serviceType: string;
  description: string;
};

const empty: Fields = { name: "", email: "", phone: "", zip: "", serviceType: "", description: "" };

type Status = "idle" | "submitting" | "success" | "error";

export default function EstimateForm() {
  const [fields, setFields] = useState<Fields>(empty);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [wasDuplicate, setWasDuplicate] = useState(false);
  // In-flight guard: prevents double-submit clicks/Enter repeats.
  const submitting = useRef(false);
  // One idempotency key per filled-in form, so a retried request cannot
  // create a second Whop lead.
  const idempotencyKey = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(
    () =>
      onEstimatePrefill((data) => {
        setFields((f) => ({
          ...f,
          serviceType: data.serviceType ?? f.serviceType,
          zip: data.zip ?? f.zip,
        }));
      }),
    [],
  );

  const set = (key: keyof Fields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const blur = (key: keyof Fields) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return; // hard guard against duplicate submissions

    setTouched({ name: true, email: true, phone: true, zip: true, serviceType: true, description: true });
    setServerMessage("");
    setLeadId(null);
    setWasDuplicate(false);

    submitting.current = true;
    setStatus("submitting");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, idempotencyKey: idempotencyKey.current }),
      });
      const data = await res.json();

      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        setStatus("error");
        setServerMessage("Please fix the highlighted fields and try again.");
        return;
      }
      // `ok` is only true when a Whop lead id was actually returned (or the
      // identical request was already recorded — a genuine duplicate).
      if (!res.ok || !data.ok) {
        setStatus("error");
        setServerMessage(data.message ?? "Submission failed. Please try again or call us.");
        return;
      }

      setStatus("success");
      setLeadId(data.leadId ?? null);
      setWasDuplicate(!!data.duplicate);
      // Fire the conversion event ONLY after confirmed lead creation.
      whopTrack("estimate_requested", {
        service_type: fields.serviceType,
        zip: fields.zip,
        email: fields.email,
        name: fields.name,
        phone: fields.phone,
        postal_code: fields.zip,
      });
      setFields(empty);
      setTouched({});
      // New form fill → new idempotency key for the next genuine enquiry.
      idempotencyKey.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      setStatus("error");
      setServerMessage("Network error — please try again or call us directly.");
    } finally {
      submitting.current = false;
    }
  }

  const contactItems = [
    { icon: Phone, label: "Call or text", value: brand.phone, href: `tel:${brand.phone.replace(/[^+\d]/g, "")}` },
    { icon: Mail, label: "Email", value: brand.email, href: `mailto:${brand.email}` },
    { icon: MapPin, label: "Visit", value: brand.address },
    { icon: Clock, label: "Hours", value: brand.hours },
  ];

  return (
    <section id="estimate" className="relative overflow-hidden bg-paper py-24 sm:py-32">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-6 bottom-8 select-none text-[20vw] leading-none text-outline"
      >
        ESTIMATE
      </span>

      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        {/* Left: copy + contact */}
        <div>
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
              {estimate.kicker}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display mt-4 text-[clamp(2.6rem,6vw,5rem)] uppercase leading-[0.95]">
              {estimate.heading1}
              <br />
              <span className="text-copper">{estimate.heading2}</span>
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-mute">{estimate.body}</p>
          </Reveal>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {contactItems.map((item, i) => (
              <Reveal key={item.label} delay={i * 60}>
                <a
                  href={item.href ?? "#estimate"}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 card-lift"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white">
                    <item.icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-mute">
                      {item.label}
                    </span>
                    <span className="block text-sm font-medium leading-tight text-ink">
                      {item.value}
                    </span>
                  </span>
                </a>
              </Reveal>
            ))}
          </div>

          <Reveal delay={220}>
            <p className="mt-8 text-xs leading-relaxed text-mute">
              Submissions are delivered to our team through Whop&apos;s secure lead system. We
              respond within one business day — usually much faster.
            </p>
          </Reveal>
        </div>

        {/* Right: form card */}
        <Reveal delay={120}>
          <form
            onSubmit={submit}
            noValidate
            className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_40px_90px_-40px_rgba(8,8,8,0.3)] sm:p-9"
          >
            {status === "success" ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <h3 className="font-display mt-6 text-4xl uppercase tracking-wide">
                  Request received
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-mute">
                  {wasDuplicate
                    ? "We already have your recent request for this service — no need to resubmit. A project lead will contact you within one business day."
                    : "Your estimate request was recorded as a lead in our Whop system. A project lead will contact you within one business day."}
                </p>
                {leadId && (
                  <p className="mt-4 rounded-full bg-paper px-4 py-2 font-mono text-xs text-ink/60">
                    Whop lead: {leadId}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="btn-lux mt-8 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white"
                  style={{ ["--btn-sweep" as string]: "#b77a4b" }}
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/60">
                      Full name
                    </span>
                    <input
                      className={cn("field", touched.name && errors.name && "field-error")}
                      placeholder="Jordan Miller"
                      value={fields.name}
                      onChange={set("name")}
                      onBlur={blur("name")}
                      autoComplete="name"
                    />
                    {touched.name && errors.name && (
                      <span className="mt-1 block text-xs text-red-600">{errors.name}</span>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/60">
                      Email
                    </span>
                    <input
                      className={cn("field", touched.email && errors.email && "field-error")}
                      placeholder="jordan@example.com"
                      type="email"
                      value={fields.email}
                      onChange={set("email")}
                      onBlur={blur("email")}
                      autoComplete="email"
                    />
                    {touched.email && errors.email && (
                      <span className="mt-1 block text-xs text-red-600">{errors.email}</span>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/60">
                      Phone
                    </span>
                    <input
                      className={cn("field", touched.phone && errors.phone && "field-error")}
                      placeholder="(512) 555-0199"
                      type="tel"
                      value={fields.phone}
                      onChange={set("phone")}
                      onBlur={blur("phone")}
                      autoComplete="tel"
                    />
                    {touched.phone && errors.phone && (
                      <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/60">
                      Property ZIP code
                    </span>
                    <input
                      className={cn("field", touched.zip && errors.zip && "field-error")}
                      placeholder="78701"
                      inputMode="numeric"
                      value={fields.zip}
                      onChange={(e) => {
                        setFields((f) => ({ ...f, zip: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) }));
                        setErrors((er) => ({ ...er, zip: "" }));
                      }}
                      onBlur={blur("zip")}
                      autoComplete="postal-code"
                    />
                    {touched.zip && errors.zip && (
                      <span className="mt-1 block text-xs text-red-600">{errors.zip}</span>
                    )}
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/60">
                    Service type
                  </span>
                  <select
                    className={cn("field", touched.serviceType && errors.serviceType && "field-error")}
                    value={fields.serviceType}
                    onChange={set("serviceType")}
                    onBlur={blur("serviceType")}
                  >
                    <option value="" disabled>
                      Select a service…
                    </option>
                    {estimate.serviceOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {touched.serviceType && errors.serviceType && (
                    <span className="mt-1 block text-xs text-red-600">{errors.serviceType}</span>
                  )}
                </label>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/60">
                    Project description
                  </span>
                  <textarea
                    className={cn("field min-h-28 resize-y", touched.description && errors.description && "field-error")}
                    placeholder="Tell us about your roof — age, issues you've noticed, recent storms…"
                    value={fields.description}
                    onChange={set("description")}
                    onBlur={blur("description")}
                  />
                  {touched.description && errors.description && (
                    <span className="mt-1 block text-xs text-red-600">{errors.description}</span>
                  )}
                </label>

                {status === "error" && serverMessage && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                    <span>{serverMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  aria-busy={status === "submitting"}
                  className="btn-lux mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-copper py-4 text-sm font-semibold tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ ["--btn-sweep" as string]: "#080808" }}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending securely…
                    </>
                  ) : (
                    <>
                      Request My Estimate <ArrowUpRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="mt-4 text-center text-[11px] text-mute">
                  By submitting, you agree to be contacted about your roofing project. Delivered via
                  the official Whop Leads API.
                </p>
              </>
            )}
          </form>
        </Reveal>
      </div>
    </section>
  );
}
