#!/usr/bin/env node
/**
 * HYVR local preview server (dependency-free).
 * Serves the Blueprint 1 EDS project so the PRODUCTION block JS/CSS run against EDS-shaped
 * content in a real browser (stands in for the aem.live edge in local dev — gap G-BP1-1).
 *
 * Enablement (see docs/onboarding/da-content-onboarding-and-cors.md):
 *   - CORS allowlist for Adobe origins incl. DA Live Preview (main--<site>--<org>.preview.da.live),
 *     so the AEM Importer / DA preview may fetch local resources. Tenant-parameterized via env.
 *   - Optional HTTPS (mixed-content requires https for the browser importer): set HTTPS_CERT +
 *     HTTPS_KEY (e.g. from `mkcert localhost`).
 *
 * Env: PORT (3001) · DA_SITE (hyvr-eds) · DA_ORG (clporgs) · HTTPS_CERT · HTTPS_KEY
 */
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { sendLead } from '../../shared/services/lead-capture/lead-capture.mjs';

const ROOT = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3001;
const SITE = process.env.DA_SITE || 'hyvr-eds';
const ORG = process.env.DA_ORG || 'clporgs';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

// --- CORS allowlist (tenant-parameterized; never '*') ---
const STATIC_ORIGINS = new Set([
  'https://da.live', 'https://admin.da.live', 'https://content.da.live',
  'https://tools.aem.live', 'https://labs.aem.live',
  'https://admin.hlx.page', 'https://admin.aem.live',
]);
// e.g. https://main--hyvr-eds--clporgs.preview.da.live | .aem.page | .aem.live
const DYNAMIC_ORIGIN = new RegExp(`^https://[a-z0-9-]+--${SITE}--${ORG}\\.(preview\\.da\\.live|aem\\.page|aem\\.live)$`);
const isAllowedOrigin = (o) => !!o && (STATIC_ORIGINS.has(o) || DYNAMIC_ORIGIN.test(o));

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    vary: 'Origin',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, x-content-source-location',
    'access-control-max-age': '600',
  };
}

async function tryFiles(pathname) {
  const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidates = [];
  if (clean === '/' || clean === '') candidates.push('index.html');
  else if (clean.endsWith('.plain.html')) candidates.push(clean.slice(1));
  else if (extname(clean)) candidates.push(clean.slice(1));
  else { candidates.push(`${clean.slice(1)}.html`); candidates.push(join(clean.slice(1), 'index.html')); }
  for (const c of candidates) {
    const abs = join(ROOT, c);
    try { const s = await stat(abs); if (s.isFile()) return abs; } catch { /* next */ }
  }
  return null;
}

async function handler(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cors = corsHeaders(req);

  // CORS preflight
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }

  // Lead-capture API — mirrors the production App Builder action; uses the SHARED service.
  if (req.method === 'POST' && url.pathname === '/api/contact') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      let lead = {};
      try { lead = JSON.parse(body || '{}'); } catch { /* invalid json */ }
      lead.sourceUrl = req.headers.referer || '';
      const result = await sendLead(lead);
      res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors });
      res.end(JSON.stringify(result));
    });
    return;
  }

  const file = await tryFiles(url.pathname);
  if (!file) {
    const nf = join(ROOT, '404.html');
    try { const body = await readFile(nf); res.writeHead(404, { 'content-type': MIME['.html'], ...cors }); res.end(body); return; }
    catch { res.writeHead(404, cors); res.end('Not found'); return; }
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache', ...cors });
    res.end(body);
  } catch (e) { res.writeHead(500, cors); res.end('Server error'); }
}

const useHttps = process.env.HTTPS_CERT && process.env.HTTPS_KEY;
const server = useHttps
  ? createHttps({ cert: readFileSync(process.env.HTTPS_CERT), key: readFileSync(process.env.HTTPS_KEY) }, handler)
  : createHttp(handler);

server.listen(PORT, () => {
  const scheme = useHttps ? 'https' : 'http';
  // eslint-disable-next-line no-console
  console.log(`HYVR EDS preview → ${scheme}://localhost:${PORT}  (root: ${ROOT}; CORS tenant ${SITE}/${ORG})`);
});
