"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUpRight, MoveHorizontal } from "lucide-react";
import { projects } from "@/config/site";
import Reveal from "@/components/Reveal";
import { scrollToId } from "@/lib/utils";

/**
 * Before/after comparison. "Before" is an aged, weathered rendering of the same
 * photo (CSS treatment) — clearly labeled illustrative, per the demo-content
 * policy, while the interaction itself is fully functional.
 */
function BeforeAfter({ image, title }: { image: string; title: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback((clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.min(96, Math.max(4, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  return (
    <div
      ref={ref}
      className="relative h-full min-h-[320px] w-full cursor-ew-resize select-none overflow-hidden"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && update(e.clientX)}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(4, p - 4));
        if (e.key === "ArrowRight") setPos((p) => Math.min(96, p + 4));
      }}
    >
      {/* After */}
      <img src={image} alt={`${title} — after`} className="absolute inset-0 h-full w-full object-cover" />
      {/* Before: artificially weathered treatment of the same illustrative image,
          clipped so both layers always align */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img
          src={image}
          alt={`${title} — before (illustrative treatment)`}
          className="absolute inset-0 h-full w-full object-cover grayscale-[0.7] sepia-[0.35] brightness-[0.62] contrast-[0.85]"
        />
      </div>
      {/* Divider */}
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -left-px w-0.5 bg-white/90" />
        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-xl">
          <MoveHorizontal className="h-5 w-5" />
        </span>
      </div>
      <span className="absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
        Before
      </span>
      <span className="absolute right-4 top-4 rounded-full bg-copper px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
        After
      </span>
    </div>
  );
}

export default function Projects() {
  const featured = projects.items[0];
  const rest = projects.items.slice(1);

  return (
    <section id="projects" className="relative overflow-hidden bg-paper py-24 sm:py-32">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-6 top-8 select-none text-[18vw] leading-none text-outline"
      >
        PROJECTS
      </span>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
                {projects.kicker}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="font-display mt-4 text-[clamp(2.6rem,6vw,5.5rem)] uppercase leading-[0.95]">
                {projects.heading1}
                <br />
                <span className="text-copper">{projects.heading2}</span>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <p className="max-w-sm text-[13px] leading-relaxed text-mute">{projects.disclaimer}</p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Featured before/after */}
          <Reveal>
            <article className="group card-lift overflow-hidden rounded-[2rem] border border-line bg-white">
              <BeforeAfter image={featured.image} title={featured.title} />
              <div className="flex items-start justify-between gap-4 p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-2xl uppercase tracking-wide">{featured.title}</h3>
                    <span className="rounded-full bg-copper/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-copper">
                      Illustrative
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">
                    {featured.location} · {featured.service} · {featured.year}
                  </p>
                  <p className="mt-2 text-sm text-ink/70">{featured.material} — drag to compare</p>
                </div>
              </div>
            </article>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {rest.map((project, i) => (
              <Reveal key={project.title} delay={i * 90} className={i === 2 ? "sm:col-span-2 xl:col-span-2" : ""}>
                <article className="group card-lift relative h-full min-h-[260px] overflow-hidden rounded-[1.75rem]">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="img-zoom absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                    Illustrative · {project.year}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
                    <div>
                      <h3 className="font-display text-2xl uppercase leading-none tracking-wide">
                        {project.title}
                      </h3>
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/65">
                        {project.location} · {project.service}
                      </p>
                      <p className="mt-1 text-xs text-white/50">{project.material}</p>
                    </div>
                    <span className="arrow-chip grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={120}>
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => scrollToId("estimate")}
              className="btn-lux flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white"
              style={{ ["--btn-sweep" as string]: "#b77a4b" }}
            >
              Start Your Project <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
