import { Asterisk } from "lucide-react";

const items = [
  "ROOF REPAIR",
  "ROOF REPLACEMENT",
  "ROOF INSPECTION",
  "GUTTER CLEANING",
  "STORM DAMAGE",
  "AUSTIN, TEXAS",
];

export default function Marquee() {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-ink py-4 text-white">
      <div className="marquee-track flex w-max items-center gap-6 whitespace-nowrap">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-6" aria-hidden={half === 1}>
            {row.map((item, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-6">
                <span className="font-display text-xl tracking-[0.12em] text-white/90">{item}</span>
                <Asterisk className="h-5 w-5 text-copper" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
