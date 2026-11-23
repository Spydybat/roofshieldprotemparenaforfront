"use client";

import { useEffect, useState } from "react";
import { Menu, X, ShieldCheck, ArrowUpRight } from "lucide-react";
import { brand, nav } from "@/config/site";
import { cn, scrollToId } from "@/lib/utils";

export default function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    scrollToId(href.replace("#", ""));
  };

  return (
    <>
      <header className="absolute inset-x-0 top-3 z-50 px-3 sm:top-5 sm:px-6">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-white/20 bg-white/10 py-2.5 pl-5 pr-2.5 text-white backdrop-blur-xl transition-all duration-500"
          aria-label="Primary"
        >
          <button
            onClick={() => go("#home")}
            className="flex items-center gap-2.5"
            aria-label="RoofShield Pro home"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-copper text-white">
              <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-xl tracking-[0.08em] sm:text-2xl">
              {brand.name}
            </span>
          </button>

          <ul className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <li key={item.href}>
                <button
                  onClick={() => go(item.href)}
                  className="rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors hover:bg-white/15"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              onClick={() => go("#estimate")}
              className="btn-lux hidden items-center gap-2 rounded-full bg-copper px-5 py-2.5 text-[13px] font-semibold tracking-wide text-white sm:flex"
              style={{ ["--btn-sweep" as string]: "#080808" }}
            >
              Request Estimate
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/25 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay menu */}
      <div
        className={cn(
          "fixed inset-0 z-[60] flex flex-col bg-ink text-white transition-all duration-500",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="font-display text-2xl tracking-[0.08em]">{brand.name}</span>
          <button
            onClick={() => setOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/25"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-1 px-8">
          {[...nav, { label: "Pricing", href: "#pricing" }].map((item, i) => (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className={cn(
                "border-b border-white/10 py-4 text-left font-display text-5xl uppercase tracking-wide transition-all duration-500 hover:text-copper",
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              )}
              style={{ transitionDelay: `${120 + i * 70}ms` }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-8 pb-10">
          <button
            onClick={() => go("#estimate")}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-copper py-4 text-sm font-semibold tracking-wide"
          >
            Request Estimate <ArrowUpRight className="h-4 w-4" />
          </button>
          <p className="mt-5 text-center text-xs text-white/50">
            {brand.phone} · {brand.city}, {brand.state}
          </p>
        </div>
      </div>
    </>
  );
}
