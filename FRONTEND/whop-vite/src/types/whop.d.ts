/**
 * Global shape of the Whop tracking pixel.
 * On Whop-hosted sites (whop.app / whop.site) the pixel is injected before app
 * code runs; on self-hosted installs it is loaded through the snippet URL in
 * NEXT_PUBLIC_WHOP_PIXEL_SRC.
 */
export {};

declare global {
  interface Window {
    whop?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      setScope?: (...accountIds: string[]) => void;
    };
  }
}
