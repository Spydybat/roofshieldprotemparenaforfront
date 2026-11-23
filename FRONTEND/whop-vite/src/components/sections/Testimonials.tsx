"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { testimonials } from "@/config/site";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = testimonials.items.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => go(1), 6500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, go]);

  const active = testimonials.items[index];

  return (
    <section
      className="relative overflow-hidden bg-ink py-24 text-white sm:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-8 top-6 select-none text-[20vw] leading-none text-outline-light"
      >
        REVIEWS
      </span>

      <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
            {testimonials.kicker}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="font-display mt-4 text-[clamp(2.4rem,5vw,4.5rem)] uppercase leading-[0.95]">
            {testimonials.heading1} <span className="text-copper-2">{testimonials.heading2}</span>
          </h2>
        </Reveal>

        <Reveal delay={140}>
          <div className="relative mt-14 min-h-[300px] sm:min-h-[260px]" aria-live="polite">
            <Quote className="mx-auto h-10 w-10 text-copper" strokeWidth={1.2} />
            <div key={index} className="animate-[fadeSlide_0.7s_var(--ease-lux)_both]">
              <blockquote className="mx-auto mt-6 max-w-3xl text-xl font-light leading-relaxed text-white/90 sm:text-2xl">
                “{active.quote}”
              </blockquote>
              <p className="font-display mt-8 text-2xl uppercase tracking-wide text-copper-2">
                {active.name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-white/45">{active.meta}</p>
              <p className="mt-3 inline-block rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
                Illustrative testimonial
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            onClick={() => go(-1)}
            className="arrow-chip flip grid h-12 w-12 place-items-center rounded-full border border-white/25 text-white hover:bg-white hover:text-ink"
            aria-label="Previous testimonial"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {testimonials.items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === index ? "w-8 bg-copper" : "w-1.5 bg-white/30 hover:bg-white/60",
                )}
              />
            ))}
          </div>
          <button
            onClick={() => go(1)}
            className="arrow-chip grid h-12 w-12 place-items-center rounded-full border border-white/25 text-white hover:bg-white hover:text-ink"
            aria-label="Next testimonial"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-10 text-[11px] uppercase tracking-[0.2em] text-white/30">
          * {testimonials.disclaimer}
        </p>
      </div>
    </section>
  );
}
