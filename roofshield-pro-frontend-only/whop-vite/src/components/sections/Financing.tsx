import { ArrowUpRight, BadgeDollarSign, CalendarClock, ReceiptText } from "lucide-react";
import { financing } from "@/config/site";
import Reveal from "@/components/Reveal";

const icons = [BadgeDollarSign, CalendarClock, ReceiptText] as const;

export default function Financing() {
  return (
    <section id="financing" className="relative overflow-hidden bg-paper py-24 sm:py-32">
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -right-8 bottom-6 select-none text-[20vw] leading-none text-outline"
      >
        FINANCE
      </span>

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        {/* Image side */}
        <Reveal className="order-2 lg:order-1">
          <div className="relative">
            <figure className="hover-zoom relative h-[420px] overflow-hidden rounded-[2rem] sm:h-[560px]">
              <img
                src="/images/craftsman.jpg"
                alt="RoofShield Pro project lead on site"
                className="img-zoom absolute inset-0 h-full w-full object-cover"
              />
            </figure>
            <div className="absolute -bottom-6 left-6 right-6 rounded-2xl border border-line bg-white p-5 shadow-[0_24px_60px_-30px_rgba(8,8,8,0.4)] sm:left-8 sm:right-auto sm:w-72">
              <p className="font-display text-lg uppercase tracking-wide">Deposit-first structure</p>
              <p className="mt-1 text-xs leading-relaxed text-mute">
                Book with a deposit. Pay the final balance after the work passes your walkthrough.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-copper">
              {financing.kicker}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display mt-4 text-[clamp(2.6rem,5.5vw,5rem)] uppercase leading-[0.95]">
              {financing.heading1}
              <br />
              <span className="text-copper">{financing.heading2}</span>
            </h2>
          </Reveal>
          {financing.body.map((p, i) => (
            <Reveal key={i} delay={150 + i * 70}>
              <p className="mt-6 text-[15px] leading-relaxed text-ink/70">{p}</p>
            </Reveal>
          ))}

          <div className="mt-10 space-y-5">
            {financing.points.map((point, i) => {
              const Icon = icons[i];
              return (
                <Reveal key={point.title} delay={i * 80}>
                  <div className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="font-display text-xl uppercase tracking-wide">{point.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-mute">{point.text}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={200}>
            <p className="mt-8 border-l-2 border-copper pl-4 text-xs italic leading-relaxed text-mute">
              Financing offers are provided by third-party payment providers, are subject to
              merchant approval and provider availability, and are never guaranteed. Terms are
              shown inside the secure checkout before you commit.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <a
              href="#pricing"
              className="btn-lux mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white"
              style={{ ["--btn-sweep" as string]: "#b77a4b" }}
            >
              See Transparent Pricing <ArrowUpRight className="h-4 w-4" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
