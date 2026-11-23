"use client";

/** Tiny cross-component prefill channel (Hero inquiry panel → Estimate form). */
export interface EstimatePrefill {
  serviceType?: string;
  zip?: string;
}

const EVENT = "roofshield:estimate-prefill";

export function dispatchEstimatePrefill(data: EstimatePrefill) {
  window.dispatchEvent(new CustomEvent<EstimatePrefill>(EVENT, { detail: data }));
}

export function onEstimatePrefill(handler: (data: EstimatePrefill) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<EstimatePrefill>).detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
