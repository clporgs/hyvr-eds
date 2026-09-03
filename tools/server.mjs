#!/usr/bin/env node
/**
 * HYVR local preview server (dependency-free).
 * Serves the Blueprint 1 EDS project so the PRODUCTION block JS/CSS run against
 * EDS-shaped content in a real browser. This stands in for the aem.live edge in local
 * dev; in production the same code is served by Edge Delivery Services (gap G-BP1-1).
 *
 * Routing:
 *   /                      -> index.html
 *   /foo                   -> foo.html (extensionless pretty URLs)
 *   /product/x             -> product/x.html
 *   /*.plain.html          -> served as-is (nav/footer/fragments)
 *   everything else        -> static file with correct MIME
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { sendLead } from '../../shared/services/lead-capture/lead-capture.mjs';

const ROOT = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

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

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Lead-capture API — mirrors the production App Builder action; uses the SHARED service.
  if (req.method === 'POST' && url.pathname === '/api/contact') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      let lead = {};
      try { lead = JSON.parse(body || '{}'); } catch { /* invalid json */ }
      lead.sourceUrl = req.headers.referer || '';
      const result = await sendLead(lead);
      res.writeHead(result.ok ? 200 : 400, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(result));
    });
    return;
  }

  const file = await tryFiles(url.pathname);
  if (!file) {
    const nf = join(ROOT, '404.html');
    try { const body = await readFile(nf); res.writeHead(404, { 'content-type': MIME['.html'] }); res.end(body); return; }
    catch { res.writeHead(404); res.end('Not found'); return; }
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end('Server error'); }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HYVR EDS preview → http://localhost:${PORT}  (root: ${ROOT})`);
});
