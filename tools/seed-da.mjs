#!/usr/bin/env node
/**
 * HYVR — DA content seeder (DA + EDS surface).
 * Transforms each repo page's <main> block markup into a DA document and PUTs it via the DA
 * Source API, then triggers aem.live preview (and optional publish). Server-to-server — no
 * CORS/mixed-content. Dependency-free; DRY-RUN by default; idempotent. Seeds any tenant/vertical.
 *
 * Env: DA_ORG (clporgs) · DA_SITE (hyvr-eds) · AEM_REF (dev) · SRC_DIR (default the blueprint
 *      root) · AEM_ADMIN_AUTH (optional) · PUBLISH ("true") · DRY_RUN ("false" to actually write)
 *      auth resolved via shared/services/ims-auth (IMS_ACCESS_TOKEN/DA_TOKEN |
 *      IMS_CLIENT_ID+IMS_CLIENT_SECRET | aio session)
 *
 * CONFIRM against the tenant: DA source doc wrapper shape, and the aem.live admin base
 * (admin.hlx.page vs admin.aem.live) + its auth header.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.SRC_DIR ? join(process.cwd(), process.env.SRC_DIR) : ROOT;
const ORG = process.env.DA_ORG || 'clporgs';
const SITE = process.env.DA_SITE || 'hyvr-eds';
const REF = process.env.AEM_REF || 'dev';
let TOKEN = ''; // resolved via Adobe IMS (getAccessToken) unless dry-run
const ADMIN_AUTH = process.env.AEM_ADMIN_AUTH || '';
const PUBLISH = process.env.PUBLISH === 'true';
const DRY = process.env.DRY_RUN !== 'false';

const DA_SOURCE_BASE = 'https://admin.da.live/source';                 // confirmed path form
const AEM_ADMIN_BASE = process.env.AEM_ADMIN_BASE || 'https://admin.hlx.page'; // CONFIRM alt admin.aem.live

/** repo file path -> DA doc path (no extension) */
function docPath(rel) {
  const p = rel.replace(/\\/g, '/');
  if (p.endsWith('.plain.html')) return `/${p.replace('.plain.html', '')}`; // nav.plain.html -> /nav
  return `/${p.replace(/\.html$/, '')}`;                                    // product/x.html -> /product/x
}

/** extract <main> inner; fall back to full-body fragments (.plain.html) */
function toDaDoc(html, isFragment) {
  let inner;
  if (isFragment) inner = html.trim();
  else {
    const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    inner = (m ? m[1] : html).trim();
  }
  // carry key metadata as an EDS Metadata block so template/SEO survive round-trip
  const meta = [...html.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/gi)]
    .filter(([, k]) => /^(description|template|og:|product-|sku|price|currency|availability|category)/i.test(k))
    .map(([, k, v]) => `<div><div>${k}</div><div>${v}</div></div>`).join('');
  const metaBlock = meta ? `\n<div class="metadata">${meta}</div>` : '';
  // CONFIRM: DA doc wrapper — content in <body>; pipeline wraps sections into <main>.
  return `<body>\n${inner}${metaBlock}\n</body>\n`;
}

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    // skip code/tooling dirs and block-library (code-served via aem.live, not DA-authored)
    if (['node_modules', '.git', 'tools', 'test', 'styles', 'scripts', 'icons', 'models', 'fonts', '.github', 'docs', 'block-library'].includes(name)) continue;
    if (name === 'head.html') continue; // <head> fragment, not a page/doc
    const abs = join(dir, name);
    const s = await stat(abs);
    if (s.isDirectory()) out.push(...await walk(abs));
    else if (name.endsWith('.html')) out.push(abs);
  }
  return out;
}

async function put(path, doc) {
  const url = `${DA_SOURCE_BASE}/${ORG}/${SITE}${path}.html`;
  if (DRY) { console.log(`[seed:DRY] PUT ${String(doc.length).padStart(6)}B → ${url}`); return true; }
  const resp = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'text/html' }, body: doc });
  if (!resp.ok) { console.error(`  PUT ${resp.status} ${path}: ${(await resp.text()).slice(0, 200)}`); return false; }
  return true;
}

async function aem(action, path) {
  const url = `${AEM_ADMIN_BASE}/${action}/${ORG}/${SITE}/${REF}${path}`;
  if (DRY) { console.log(`[seed:DRY] POST ${action} → ${url}`); return true; }
  const headers = ADMIN_AUTH ? { Authorization: `Bearer ${ADMIN_AUTH}` } : {};
  const resp = await fetch(url, { method: 'POST', headers });
  if (!resp.ok) { console.error(`  ${action} ${resp.status} ${path}`); return false; }
  return true;
}

const files = await walk(SRC);
console.log(`Seeding ${files.length} docs → DA ${ORG}/${SITE} (ref ${REF})${DRY ? '  [DRY-RUN]' : ''}${PUBLISH ? '  +publish' : ''}`);
if (!DRY) {
  const auth = await getAccessToken();            // Adobe IMS: explicit token | S2S | aio session
  TOKEN = auth.token;
  console.log(`IMS auth resolved via: ${auth.source}`);
}
if (!DRY && !TOKEN) { console.error('DA_TOKEN required to write (or leave DRY_RUN unset for a dry run)'); process.exit(1); }

const seeded = [];
for (const abs of files) {
  const rel = relative(SRC, abs);
  const html = await readFile(abs, 'utf8');
  const path = docPath(rel);
  const doc = toDaDoc(html, rel.endsWith('.plain.html'));
  if (await put(path, doc)) seeded.push(path);
}
for (const path of seeded) { await aem('preview', path); if (PUBLISH) await aem('live', path); }

console.log(`✓ ${seeded.length}/${files.length} docs seeded${DRY ? ' (dry-run — nothing written)' : ''}; previewed${PUBLISH ? ' + published' : ''}.`);
