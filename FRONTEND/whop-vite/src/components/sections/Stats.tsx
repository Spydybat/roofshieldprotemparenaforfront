"use client";

import { useEffect, useState } from "react";
import { stats } from "@/config/site";
import { useInView } from "@/hooks/use-in-view";

function Counter({ target, active, suffix }: { target: number; active: boolean; suffix: string }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  return (
    <span className="font-display text-[clamp(3.4rem,7vw,6rem)] leading-none tracking-wide text-white">
      {value}
      <span className="text-copper">{suffix}</span>
    </span>
  );
}

export default function Stats() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);

  return (
    <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div ref={ref} className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {stats.items.map((item) => (
            <div key={item.label} className="border-l border-white/15 pl-6">
              <Counter target={item.value} active={inView} suffix={item.suffix} />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/55">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-14 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.2em] text-white/35">
          * {stats.disclaimer}
        </p>
      </div>
    </section>
  );
}
