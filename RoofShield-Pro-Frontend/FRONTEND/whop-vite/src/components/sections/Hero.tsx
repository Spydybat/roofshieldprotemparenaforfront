"use client";

import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { hero } from "@/config/site";
import { scrollToId } from "@/lib/utils";

export default function Hero() {
  return (
    <section id="home" className="grain relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white">
      {/* Cinematic backdrop */}
      <img
        src={hero.image}
        alt="Luxury Austin home with a new architectural shingle roof at golden hour"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/45 to-ink/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-transparent to-ink/80" />

      {/* Oversized background typography */}
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -right-6 bottom-[16%] select-none text-[26vw] leading-none text-outline-light"
      >
        {hero.backgroundWord}
      </span>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pb-24 pt-32 sm:px-8 lg:pb-28">
        <div className="max-w-3xl">
          <p
            className="mask-line mb-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70 sm:text-xs"
            style={{ ["--reveal-delay" as string]: "150ms" }}
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-copper" /> {hero.eyebrow}
            </span>
          </p>
          <h1 className="font-display text-[clamp(3.4rem,9.5vw,8.5rem)] uppercase leading-[0.92] tracking-wide">
            <span className="mask-line" style={{ ["--reveal-delay" as string]: "250ms" }}>
              <span>{hero.line1}</span>
            </span>
            <span className="mask-line text-copper-2" style={{ ["--reveal-delay" as string]: "380ms" }}>
              <span>{hero.line2}</span>
            </span>
            <span className="mask-line" style={{ ["--reveal-delay" as string]: "510ms" }}>
              <span>{hero.line3}</span>
            </span>
          </h1>
          <p
            className="mask-line mt-6 max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-base"
            style={{ ["--reveal-delay" as string]: "650ms" }}
          >
            <span>{hero.description}</span>
          </p>
          <div
            className="mask-line mt-8 flex flex-wrap items-center gap-3"
            style={{ ["--reveal-delay" as string]: "780ms" }}
          >
            <span className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => scrollToId("services")}
                className="btn-lux flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink"
                style={{ ["--btn-sweep" as string]: "#b77a4b" }}
              >
                {hero.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-5 z-10 flex items-center gap-3 sm:left-8">
        <button
          onClick={() => scrollToId("about")}
          className="arrow-chip grid h-12 w-12 place-items-center rounded-full border border-white/30 text-white"
          aria-label="Scroll to about"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
