#!/usr/bin/env node
/**
 * serve-artifact.mjs — boot the *built* Worker artifact locally.
 *
 * `dist/server/index.js` is a Cloudflare-Workers-style module that default-exports
 * `{ fetch(request, env, ctx) }`. `vite preview` does not understand that shape
 * (it looks for `dist/server/server.js`), so this tiny adapter wraps the real
 * artifact in a Node HTTP server. That lets us exercise the exact bytes we ship,
 * in NODE_ENV=production, against a real database — not a dev-only code path.
 *
 * Usage:
 *   node scripts/serve-artifact.mjs [--port 3310] [--static]
 *
 * Environment (--env-file loads a dotenv-style file, real env always wins):
 *   node scripts/serve-artifact.mjs --env-file .env --port 3310
 *
 * `--static` also serves files from `dist/client` for non-API routes, so full
 * SSR pages render (CSS/JS chunks resolve). Without it only the server routes
 * run, which is all the API verification needs.
 *
 * This is a local harness only. Production runs on Whop's Cloudflare Worker.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const port = Number(flag("port", process.env.PORT || 3310));
const envFile = flag("env-file", null);
const serveStatic = argv.includes("--static");
const root = resolve(import.meta.dirname, "..");

if (envFile && existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined && process.env[key] !== "") continue; // real env wins
    process.env[key] = m[2].trim().replace(/^["'](.*)["']$/, "$1");
  }
}

const entryPath = join(root, "dist/server/index.js");
if (!existsSync(entryPath)) {
  console.error("No build found at dist/server/index.js — run `npm run build` first.");
  process.exit(2);
}
const mod = await import(entryPath);
const handler = mod.default;
if (!handler || typeof handler.fetch !== "function") {
  console.error("dist/server/index.js does not export { fetch } — unexpected build shape.");
  process.exit(2);
}

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

async function tryStatic(pathname) {
  if (!serveStatic) return null;
  const safe = pathname.replace(/\.\./g, "");
  let file = join(root, "dist/client", safe === "/" ? "index.html" : safe);
  try {
    const s = await stat(file);
    if (!s.isFile()) return null;
  } catch {
    return null;
  }
  return { body: await readFile(file), type: MIME[extname(file)] || "application/octet-stream" };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`);

  if (!url.pathname.startsWith("/api/")) {
    const hit = await tryStatic(url.pathname);
    if (hit) {
      res.writeHead(200, { "content-type": hit.type, "content-length": hit.body.length });
      return res.end(hit.body);
    }
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) headers.append(k, one);
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });

  const ctx = { waitUntil() {}, passThroughOnException() {} };
  try {
    const response = await handler.fetch(request, process.env, ctx);
    const outHeaders = {};
    response.headers.forEach((v, k) => (outHeaders[k] = v));
    const buf = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, outHeaders);
    res.end(buf);
  } catch (err) {
    console.error("artifact error:", err?.stack || err);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, code: "ARTIFACT_ERROR" }));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Built artifact serving on http://0.0.0.0:${port}  (NODE_ENV=${process.env.NODE_ENV || "unset"}, static=${serveStatic})`);
});
