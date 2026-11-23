import { ShieldCheck, FileText, Users, ArrowUpRight } from "lucide-react";
import { about } from "@/config/site";
import Reveal from "@/components/Reveal";

const icons = { shield: ShieldCheck, file: FileText, users: Users } as const;

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-paper py-24 sm:py-32 lg:py-40">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-8 top-10 select-none text-[24vw] leading-none text-outline"
      >
        {about.backgroundWord}
      </span>

      <div className="relative mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        {/* Copy */}
        <div>
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
              {about.kicker}
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h2 className="font-display mt-4 text-[clamp(2.6rem,6vw,5.5rem)] uppercase leading-[0.95]">
              {about.heading1}
              <br />
              <span className="text-copper">{about.heading2}</span>
            </h2>
          </Reveal>
          {about.paragraphs.map((p, i) => (
            <Reveal key={i} delay={160 + i * 80}>
              <p className={`mt-6 leading-relaxed text-ink/70 ${i === 0 ? "text-base sm:text-lg" : "text-[15px]"}`}>
                {p}
              </p>
            </Reveal>
          ))}

          <div className="mt-12 space-y-6">
            {about.pillars.map((pillar, i) => {
              const Icon = icons[pillar.icon as keyof typeof icons];
              return (
                <Reveal key={pillar.title} delay={i * 90}>
                  <div className="group flex gap-5 rounded-2xl border border-line bg-white p-5 card-lift">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white transition-colors duration-500 group-hover:bg-copper">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="font-display text-xl uppercase tracking-wide">{pillar.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-mute">{pillar.text}</p>
                    </div>
                    <ArrowUpRight className="ml-auto h-5 w-5 shrink-0 text-ink/20 transition-all duration-500 group-hover:text-copper" />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Editorial image composition */}
        <div className="relative">
          <Reveal className="relative h-full" delay={150}>
            <figure className="hover-zoom relative h-[420px] overflow-hidden rounded-[2rem] sm:h-[540px] lg:h-full lg:min-h-[640px]">
              <img
                src="/images/about.jpg"
                alt="RoofShield Pro craftsman installing premium shingles"
                className="img-zoom absolute inset-0 h-full w-full object-cover"
              />
            </figure>
            <figcaption className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl bg-white/90 px-5 py-4 backdrop-blur-xl">
              <div>
                <p className="font-display text-lg uppercase tracking-wide text-ink">Certified crews</p>
                <p className="text-xs text-mute">Manufacturer-grade installation, every project</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              </span>
            </figcaption>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
