"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, X, CalendarCheck } from "lucide-react";
import { services, type ServiceKey } from "@/config/site";
import { whopTrack } from "@/lib/track";
import { dispatchEstimatePrefill } from "@/lib/prefill";
import { scrollToId, cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";
import { useCheckout } from "@/components/checkout/CheckoutProvider";

export default function Services() {
  const [openKey, setOpenKey] = useState<ServiceKey | null>(null);
  const { openCheckout } = useCheckout();
  const open = services.find((s) => s.key === openKey) ?? null;

  const explore = (key: ServiceKey) => {
    setOpenKey(key);
    const svc = services.find((s) => s.key === key)!;
    whopTrack("service_viewed", { service: svc.key, title: svc.title });
  };

  useEffect(() => {
    if (openKey) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenKey(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openKey]);

  const requestEstimate = () => {
    if (open) dispatchEstimatePrefill({ serviceType: `${open.key === "repair" ? "roof-repair" : open.key === "replacement" ? "roof-replacement" : "roof-inspection"}` });
    setOpenKey(null);
    scrollToId("estimate");
  };

  return (
    <section id="services" className="relative overflow-hidden bg-paper py-24 sm:py-32">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -right-4 top-6 select-none text-[18vw] leading-none text-outline"
      >
        SERVICES
      </span>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
                Our Services
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="font-display mt-4 text-[clamp(2.6rem,6vw,5.5rem)] uppercase leading-[0.95]">
                WHAT WE DO,
                <br />
                <span className="text-copper">DONE PROPERLY.</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={160}>
            <p className="max-w-sm text-[15px] leading-relaxed text-mute">
              Three core services, one standard: certified workmanship documented in writing,
              every time.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {services.map((service, i) => (
            <Reveal key={service.key} delay={i * 110}>
              <article className="group card-lift overflow-hidden rounded-[1.75rem] border border-line bg-white">
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="img-zoom absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="font-display absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1 text-sm tracking-[0.2em] text-white backdrop-blur">
                    {service.index}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-3xl uppercase tracking-wide">{service.title}</h3>
                  <p className="mt-2 min-h-[3.4rem] text-sm leading-relaxed text-mute">
                    {service.short}
                  </p>
                  <button
                    onClick={() => explore(service.key)}
                    className="mt-5 flex w-full items-center justify-between rounded-full border border-ink/15 px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.15em] transition-all duration-500 hover:border-ink hover:bg-ink hover:text-white"
                  >
                    Explore Service
                    <span className="arrow-chip grid h-8 w-8 place-items-center rounded-full bg-copper text-white">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Service modal */}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setOpenKey(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
        >
          <div
            className={cn(
              "max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white sm:rounded-[2rem]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 sm:h-80">
              <img src={open.image} alt={open.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <button
                onClick={() => setOpenKey(null)}
                className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink transition-transform hover:scale-105"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute bottom-5 left-6 sm:left-8">
                <p className="font-display text-sm tracking-[0.3em] text-white/70">{open.index}</p>
                <h3 className="font-display text-4xl uppercase tracking-wide text-white sm:text-5xl">
                  {open.title}
                </h3>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <p className="leading-relaxed text-ink/75">{open.detail}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {open.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-ink/80">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-copper/15 text-copper">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={requestEstimate}
                  className="btn-lux flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white"
                >
                  Request Estimate <ArrowUpRight className="h-4 w-4" />
                </button>
                {open.key === "inspection" && (
                  <button
                    onClick={() => {
                      setOpenKey(null);
                      openCheckout("inspection");
                    }}
                    className="btn-lux flex flex-1 items-center justify-center gap-2 rounded-full border border-copper px-6 py-3.5 text-sm font-semibold text-copper hover:text-white"
                  >
                    <CalendarCheck className="h-4 w-4" /> Book $149 Inspection
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
