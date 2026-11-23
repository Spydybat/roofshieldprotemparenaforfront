"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { loadWhop } from "@whop/elements";
import {
  WhopElements,
  Checkout,
  CheckoutElement,
  ExpressCheckoutElement,
  Payments,
  BrandingElement,
  type CheckoutPaymentCompletion,
  type CheckoutSetupCompletion,
  type CheckoutWaitlistCompletion,
} from "@whop/elements-react";
import {
  X,
  Loader2,
  ShieldCheck,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
} from "lucide-react";
import { pricing, type PlanKey } from "@/config/site";
import { whopTrack } from "@/lib/track";
import { cn } from "@/lib/utils";

/* ── Lazy singleton for the hosted SDK (browser-only) ─────────────────── */
let elementsPromise: ReturnType<typeof loadWhop> | null = null;
function getElements() {
  if (!elementsPromise) elementsPromise = loadWhop();
  return elementsPromise;
}

type Phase =
  | "idle"
  | "loading"
  | "ready"
  | "unconfigured"
  | "charging"
  | "success"
  | "error";

interface SessionInfo {
  flow: "payment" | "setup";
  planId: string;
  accountId: string;
  checkoutConfigurationId?: string | null;
  environment?: "production" | "sandbox";
}

type CompletionPayload =
  | CheckoutPaymentCompletion
  | CheckoutWaitlistCompletion
  | CheckoutSetupCompletion;

interface CheckoutContextValue {
  openCheckout: (plan: PlanKey) => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside <CheckoutProvider />");
  return ctx;
}

export default function CheckoutProvider({ children }: { children: ReactNode }) {
  const [planKey, setPlanKey] = useState<PlanKey | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [message, setMessage] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  const [tab, setTab] = useState<"card" | "express">("card");
  const [consent, setConsent] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const plan = planKey ? pricing.find((p) => p.key === planKey)! : null;
  const isDeposit = planKey === "deposit";
  const isOpen = planKey !== null;

  const close = useCallback(() => {
    setPlanKey(null);
    setPhase("idle");
    setSession(null);
    setMessage("");
    setMissing([]);
    setTab("card");
    setConsent(false);
    setPaymentId(null);
    setPaymentStatus(null);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  const openCheckout = useCallback(async (key: PlanKey) => {
    setPlanKey(key);
    setPhase("loading");
    setSession(null);
    setMessage("");

    if (key === "deposit") {
      whopTrack("deposit_started", { plan: "roofing_project_deposit", value: 500, currency: "USD" });
    }

    try {
      const res = await fetch("/api/checkout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: key }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.code === "WHOP_NOT_CONFIGURED" || data.code === "PLAN_NOT_CONFIGURED") {
          setMissing(data.missing ?? []);
          setPhase("unconfigured");
        } else {
          setMessage(data.message ?? "Checkout could not be started.");
          setPhase("error");
        }
        return;
      }
      setSession(data as SessionInfo);
      setPhase("ready");
    } catch {
      setMessage("Network error starting checkout. Please try again.");
      setPhase("error");
    }
  }, []);

  /* Deposit: setup-mode checkout saved the card → charge the $500 deposit. */
  const completeDeposit = useCallback(
    async (setupIntentId: string) => {
      setPhase("charging");
      try {
        const res = await fetch("/api/deposit/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setupIntentId, consent: true }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setMessage(data.message ?? "The deposit charge could not be completed.");
          setPaymentStatus(data.status ?? null);
          setPhase("error");
          return;
        }
        setPaymentId(data.paymentId ?? null);
        setPaymentStatus(data.status ?? "unknown");
        // Only a Whop-confirmed "succeeded" status is treated as a completed
        // deposit; anything else (requires_action / processing / failed) is
        // surfaced honestly as an error rather than a success screen.
        if (data.succeeded) {
          setPhase("success");
        } else {
          setMessage(
            data.message ??
              `The deposit was not confirmed as paid (status: ${data.status ?? "unknown"}).`,
          );
          setPhase("error");
        }
      } catch {
        setMessage("Network error completing the deposit. No charge may have completed — contact us before retrying.");
        setPhase("error");
      }
    },
    [],
  );

  const onComplete = useCallback(
    (payload: CompletionPayload) => {
      if (payload.result === "payment") {
        setPaymentId(payload.paymentId);
        setPaymentStatus("succeeded");
        setPhase("success");
      } else if (payload.result === "setup") {
        void completeDeposit(payload.setupIntentId);
      }
      // waitlist_entry is not applicable to these one-time plans
    },
    [completeDeposit],
  );

  return (
    <CheckoutContext.Provider value={{ openCheckout }}>
      {children}

      {isOpen && plan && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`${plan.name} checkout`}
        >
          <div
            className="flex max-h-[92svh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-copper">
                  Secure checkout · Whop
                </p>
                <h3 className="font-display mt-1 text-3xl uppercase leading-none tracking-wide text-ink">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-mute">
                  {plan.priceLabel} · one-time · processed by Whop
                </p>
              </div>
              <button
                onClick={close}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-ink hover:text-white"
                aria-label="Close checkout"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              {phase === "loading" && (
                <div className="flex flex-col items-center gap-4 py-16 text-mute">
                  <Loader2 className="h-8 w-8 animate-spin text-copper" />
                  <p className="text-sm">Preparing secure checkout…</p>
                </div>
              )}

              {phase === "unconfigured" && (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5">
                  <div className="flex items-center gap-2 font-semibold text-amber-900">
                    <AlertTriangle className="h-4.5 w-4.5" /> Whop configuration required
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
                    This checkout is fully wired to Whop Payment Elements and goes live as soon
                    as the merchant sets these environment variables:
                  </p>
                  <ul className="mt-3 space-y-1 font-mono text-xs text-amber-900">
                    {missing.map((m) => (
                      <li key={m} className="rounded bg-amber-100 px-2 py-1">{m}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-amber-900/70">
                    No simulated checkout is shown — payments only run through Whop.
                  </p>
                </div>
              )}

              {phase === "error" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-center gap-2 font-semibold text-red-800">
                    <AlertTriangle className="h-4.5 w-4.5" /> Something needs attention
                  </div>
                  <p className="mt-2 text-sm text-red-800/80">{message}</p>
                  {paymentStatus && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-red-800/60">
                      Last status: {paymentStatus}
                    </p>
                  )}
                </div>
              )}

              {phase === "charging" && (
                <div className="flex flex-col items-center gap-4 py-16 text-mute">
                  <Loader2 className="h-8 w-8 animate-spin text-copper" />
                  <p className="text-sm">Card saved — charging the $500 deposit…</p>
                </div>
              )}

              {phase === "success" && (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </span>
                  <h4 className="font-display mt-5 text-3xl uppercase tracking-wide text-ink">
                    {paymentStatus === "succeeded" ? "Payment complete" : "Submitted"}
                  </h4>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-mute">
                    {isDeposit
                      ? "Your project deposit was recorded and your card is on file for the final balance. A Whop receipt is on its way to your inbox."
                      : "Your booking is confirmed. A Whop receipt is on its way to your inbox."}
                  </p>
                  {paymentId && (
                    <p className="mt-4 rounded-full bg-paper px-4 py-2 font-mono text-xs text-ink/60">
                      Payment: {paymentId}
                      {paymentStatus ? ` · ${paymentStatus}` : ""}
                    </p>
                  )}
                  <button
                    onClick={close}
                    className="btn-lux mt-7 rounded-full bg-ink px-8 py-3 text-sm font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              )}

              {phase === "ready" && session && (
                <WhopElements
                  elements={getElements()}
                  environment={session.environment ?? "production"}
                  onLoadError={() => {
                    setMessage("Whop's secure checkout could not be loaded. Check your connection and try again.");
                    setPhase("error");
                  }}
                >
                  {isDeposit && (
                    <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper p-4">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4.5 w-4.5 accent-[#b77a4b]"
                      />
                      <span className="text-[13px] leading-relaxed text-ink/75">
                        <strong className="text-ink">Card-on-file consent.</strong> I authorize
                        RoofShield Pro to save my payment method, charge the $500 deposit now, and
                        charge the remaining project balance to the same method when the work is
                        complete. Card details are collected and stored by Whop — never by this
                        website.
                      </span>
                    </label>
                  )}

                  {(!isDeposit || consent) ? (
                    <>
                      {/* Card / Express tabs */}
                      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-paper p-1">
                        <button
                          onClick={() => setTab("card")}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-all",
                            tab === "card" ? "bg-ink text-white" : "text-ink/60 hover:text-ink",
                          )}
                        >
                          <CreditCard className="h-4 w-4" /> Card
                        </button>
                        <button
                          onClick={() => setTab("express")}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold uppercase tracking-[0.15em] transition-all",
                            tab === "express" ? "bg-ink text-white" : "text-ink/60 hover:text-ink",
                          )}
                        >
                          <Zap className="h-4 w-4" /> Express
                        </button>
                      </div>

                      <Checkout
                        {...(session.flow === "setup"
                          ? { checkoutConfiguration: session.checkoutConfigurationId ?? undefined }
                          : { plan: session.planId })}
                        metadata={{ source: "roofshield_site", plan: planKey ?? "" }}
                        returnUrl={
                          typeof window !== "undefined"
                            ? `${window.location.origin}/checkout/complete`
                            : undefined
                        }
                        onComplete={onComplete}
                      >
                        {tab === "card" ? (
                          <CheckoutElement />
                        ) : (
                          <ExpressCheckoutElement />
                        )}
                      </Checkout>

                      {/* Required Whop branding */}
                      <div className="mt-4 flex justify-center">
                        <Payments accountId={session.accountId} plan={session.planId}>
                          <BrandingElement />
                        </Payments>
                      </div>
                    </>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mute">
                      Tick the consent box above to continue to the secure Whop checkout.
                    </p>
                  )}
                </WhopElements>
              )}
            </div>

            {(phase === "ready" || phase === "unconfigured") && (
              <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4 sm:px-8">
                <span className="flex items-center gap-2 text-[11px] text-mute">
                  <Lock className="h-3.5 w-3.5 text-copper" />
                  PCI-secure frames hosted by Whop — no card data touches this site
                </span>
                <a
                  href="https://docs.whop.com/elements"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-ink/60 hover:text-copper"
                >
                  Whop Elements <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {phase === "ready" && !isDeposit && (
              <div className="border-t border-line bg-paper px-6 py-3 text-center sm:px-8">
                <span className="flex items-center justify-center gap-2 text-[11px] text-mute">
                  <ShieldCheck className="h-3.5 w-3.5 text-copper" />
                  Financing options may appear at checkout for eligible customers, subject to
                  merchant approval & provider availability
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </CheckoutContext.Provider>
  );
}
