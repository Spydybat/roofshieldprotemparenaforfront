"use client";

import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { pricing } from "@/config/site";
import { useCheckout } from "@/components/checkout/CheckoutProvider";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";

/**
 * Three one-time Whop plans. Each card opens Whop Elements for the plan id the
 * server resolved from the environment — the plan id is never hardcoded here and
 * never shown to the customer.
 */
export default function Pricing() {
  const { openCheckout } = useCheckout();

  return (
    <section id="pricing" className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -right-6 top-8 select-none text-[18vw] leading-none text-outline-light"
      >
        PRICING
      </span>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
              Transparent One-Time Pricing
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display mx-auto mt-4 max-w-3xl text-[clamp(2.6rem,6vw,5rem)] uppercase leading-[0.95]">
              NO SURPRISES.
              <br />
              <span className="text-copper-2">JUST HONEST NUMBERS.</span>
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/60">
              Book and pay securely through Whop. The price you see is the price you pay — every
              deposit is credited toward your project.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {pricing.map((plan, i) => {
            return (
              <Reveal key={plan.key} delay={i * 100} className="h-full">
                <article
                  className={cn(
                    "card-lift relative flex h-full flex-col rounded-[1.75rem] border p-7 sm:p-8",
                    plan.featured
                      ? "border-copper bg-gradient-to-b from-[#1a130d] to-ink shadow-[0_30px_80px_-30px_rgba(183,122,75,0.45)]"
                      : "border-white/12 bg-white/[0.04]",
                  )}
                >
                  {plan.featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-copper px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      Most Popular
                    </span>
                  )}
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
                    {plan.name}
                  </p>

                  <div className="mt-6 flex items-end gap-1">
                    <span className="font-display text-7xl leading-none tracking-wide">
                      {plan.priceLabel}
                    </span>
                    <span className="pb-1.5 text-xs uppercase tracking-wider text-white/45">
                      one-time
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/65">{plan.blurb}</p>

                  <ul className="mt-6 flex-1 space-y-3 border-t border-white/10 pt-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[13px] text-white/75">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-copper/20 text-copper-2">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => openCheckout(plan.key)}
                    className={cn(
                      "btn-lux mt-4 flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold tracking-wide",
                      plan.key === "deposit"
                        ? "bg-copper text-white"
                        : "bg-white text-ink hover:text-white",
                    )}
                    style={{ ["--btn-sweep" as string]: plan.key === "deposit" ? "#080808" : "#b77a4b" }}
                  >
                    {plan.key === "deposit" ? "Pay Deposit" : "Book Now"}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  {plan.note && (
                    <p className="mt-3 text-center text-[10px] uppercase tracking-[0.18em] text-white/40">
                      {plan.note}
                    </p>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={140}>
          <p className="mx-auto mt-12 flex max-w-xl items-center justify-center gap-2 text-center text-xs text-white/40">
            <ShieldCheck className="h-4 w-4 shrink-0 text-copper" />
            All payments are processed by Whop. Card details never touch this website.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
