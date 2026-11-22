import { ArrowUpRight, MapPin } from "lucide-react";
import { serviceArea } from "@/config/site";
import Reveal from "@/components/Reveal";

export default function ServiceArea() {
  return (
    <section className="relative overflow-hidden bg-ink py-24 text-white sm:py-32">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-6 bottom-4 select-none text-[22vw] leading-none text-outline-light"
      >
        {serviceArea.backgroundWord}
      </span>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Reveal>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
                {serviceArea.kicker}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="font-display mt-4 text-[clamp(2.6rem,6vw,5rem)] uppercase leading-[0.95]">
                {serviceArea.heading1}
                <br />
                <span className="text-copper-2">{serviceArea.heading2}</span>
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/65">
                From downtown Austin to the suburbs north and south, our crews cover the greater
                Central Texas metro with the same certified standard of work.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-8 border-t border-white/10 pt-5 text-[11px] uppercase tracking-[0.2em] text-white/35">
                * {serviceArea.note}
              </p>
            </Reveal>
          </div>

          <ul className="grid content-start sm:grid-cols-2">
            {serviceArea.areas.map((area, i) => (
              <Reveal as="li" key={area.name} delay={i * 60}>
                <div className="group flex items-center justify-between border-b border-white/12 py-5 pr-2 transition-colors hover:border-copper">
                  <div className="flex items-center gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-copper transition-all duration-500 group-hover:bg-copper group-hover:text-white">
                      <MapPin className="h-4.5 w-4.5" strokeWidth={1.8} />
                    </span>
                    <div>
                      <p className="font-display text-2xl uppercase tracking-wide">{area.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{area.tag}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-white/25 transition-all duration-500 group-hover:rotate-45 group-hover:text-copper" />
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
