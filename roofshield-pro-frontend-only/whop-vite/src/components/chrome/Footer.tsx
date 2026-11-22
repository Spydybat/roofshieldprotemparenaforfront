import type { SVGProps } from "react";
import { ShieldCheck, Phone, Mail, MapPin } from "lucide-react";
import { brand, footer, nav, serviceArea, social } from "@/config/site";

/* Brand icons (lucide no longer ships social logos) */
function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

const socialIcons = { facebook: FacebookIcon, instagram: InstagramIcon, linkedin: LinkedinIcon, youtube: YoutubeIcon } as const;

export default function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-ink text-white">
      {/* Columns */}
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-copper text-white">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="font-display text-2xl tracking-[0.08em]">{brand.name}</span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">{footer.blurb}</p>
          <div className="mt-6 flex gap-3">
            {social.map((s) => {
              const Icon = socialIcons[s.icon as keyof typeof socialIcons];
              return (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white/70 transition-all duration-400 hover:border-copper hover:bg-copper hover:text-white"
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">Company</h3>
          <ul className="mt-5 space-y-3">
            {[...nav, { label: "Pricing", href: "#pricing" }, { label: "Financing", href: "#financing" }].map((item) => (
              <li key={item.label}>
                <a href={item.href} className="text-sm text-white/65 transition-colors hover:text-copper-2">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">Services</h3>
          <ul className="mt-5 space-y-3">
            <li><a href="#services" className="text-sm text-white/65 hover:text-copper-2">Roof Repair</a></li>
            <li><a href="#services" className="text-sm text-white/65 hover:text-copper-2">Roof Replacement</a></li>
            <li><a href="#services" className="text-sm text-white/65 hover:text-copper-2">Roof Inspection</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">Service Areas</h3>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            {serviceArea.areas.map((a) => (
              <li key={a.name} className="text-sm text-white/65">{a.name}, TX</li>
            ))}
          </ul>
          <div className="mt-8 space-y-3">
            <a href={`tel:${brand.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-3 text-sm text-white/65 hover:text-copper-2">
              <Phone className="h-4 w-4 text-copper" /> {brand.phone}
            </a>
            <a href={`mailto:${brand.email}`} className="flex items-center gap-3 text-sm text-white/65 hover:text-copper-2">
              <Mail className="h-4 w-4 text-copper" /> {brand.email}
            </a>
            <p className="flex items-start gap-3 text-sm text-white/65">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-copper" /> {brand.address}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-[11px] text-white/40 sm:px-8 lg:flex-row">
          <p>© 2026 {brand.name}. All rights reserved. · {footer.demoNote}</p>
          <div className="flex items-center gap-6">
            <a href="#home" className="hover:text-white/70">Privacy</a>
            <a href="#home" className="hover:text-white/70">Terms</a>
          </div>
        </div>
      </div>

      {/* Oversized decorative wordmark */}
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="font-display -mb-[5vw] text-center text-[18.5vw] leading-none text-outline-light">
          {footer.backgroundWord}
        </p>
      </div>
    </footer>
  );
}
