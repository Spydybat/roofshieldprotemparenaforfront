import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import whop from "@whop/cli/vite";

/**
 * ROOFSHIELD PRO — Vite + TanStack Start config for Whop hosting.
 *
 * The `whop()` plugin (@whop/cli/vite) is mandatory: `whop apps deploy`
 * fails with NO_BUILD_ARCHIVE without it. TanStack Start emits the SSR
 * bundle to `dist/server` and the static assets to `dist/client`.
 */
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    // Allow proxied preview hosts (e.g. *.e2b.app) as well as whop.dev tunnels.
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  environments: {
    // Whop's packer (@whop/cli/vite) requires the SSR entry module to be
    // dist/server/index.js; TanStack Start defaults to dist/server/server.js.
    ssr: {
      build: {
        rollupOptions: {
          output: { entryFileNames: "index.js" },
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    whop({ disableTanstackDevtools: true }),
  ],
});
