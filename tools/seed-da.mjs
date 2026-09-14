#!/usr/bin/env node
/**
 * HYVR — DA content seeder (DA + EDS surface).
 * Transforms each page's delivery-shape HTML into DA's TABLE-based document source (see
 * da-doc-transform.mjs — blocks are authored as tables, not pre-converted divs; confirmed
 * against Adobe's own docs) and PUTs it via the DA Source API, then triggers aem.live preview
 * (and optional publish). Server-to-server — no CORS/mixed-content. Dependency-free; DRY-RUN by
 * default; idempotent. Seeds any tenant/vertical.
 *
 * Also seeds a small, explicit allowlist of JSON content docs (JSON_CONTENT below). These are
 * resources the delivery runtime fetches at request time (placeholders.json — see
 * scripts/aem.js) or that DA's own Library feature reads (library/*.json — see
 * tenant-config.mjs's site-level Library registry). Deliberately NOT a blanket "seed every .json
 * file" — most JSON in this repo is code/tooling (component-*.json for the UE surface,
 * query-index.json which the delivery pipeline generates itself from helix-query.yaml,
 * paths.json, package.json, etc.) and must stay code-served, not duplicated as DA content.
 *
 * DA reflects JSON docs as "sheets", same as the Config API — confirmed against
 * https://docs.da.live/developers/api/source: POST (not PUT), multipart/form-data with a field
 * named `data` holding the file content, and the payload needs `:type: "sheet"` metadata (an
 * earlier version PUT raw JSON text with no sheet metadata at all — DA stored the bytes
 * faithfully, as a GET round-trip confirmed, but its own Library-reading logic never recognized
 * it as a sheet). See "Incident record #6".
 *
 * Env: DA_ORG (clporgs) · DA_SITE (hyvr-eds) · AEM_REF (dev) · SRC_DIR (default the blueprint
 *      root) · AEM_ADMIN_AUTH (optional) · PUBLISH ("true") · DRY_RUN ("false" to actually write)
 *      auth resolved via shared/services/ims-auth (IMS_ACCESS_TOKEN/DA_TOKEN |
 *      IMS_CLIENT_ID+IMS_CLIENT_SECRET | aio session)
 *
 * CONFIRM against the tenant: the aem.live admin base (admin.hlx.page vs admin.aem.live) + its
 * auth header (see the "live run" incident record for the confirmed DA Source/Config API forms).
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';
import { toDaSource } from './da-doc-transform.mjs';

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

/** explicit allowlist — real content JSON docs seeded verbatim (see header comment) */
const JSON_CONTENT = ['placeholders.json', 'library/blocks.json', 'library/templates.json', 'library/icons.json'];

/** repo file path (no extension) -> DA doc path */
function docPath(rel, ext) {
  const p = rel.replace(/\\/g, '/');
  if (ext === 'json') return `/${p.replace(/\.json$/, '')}`;              // library/blocks.json -> /library/blocks
  if (p.endsWith('.plain.html')) return `/${p.replace('.plain.html', '')}`; // nav.plain.html -> /nav
  return `/${p.replace(/\.html$/, '')}`;                                    // product/x.html -> /product/x
}

/** Delivery-shape HTML -> DA document source (tables for blocks — see da-doc-transform.mjs). */
function toDaDoc(html, isFragment) { return toDaSource(html, isFragment); }

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    // skip only genuinely code-only dirs (JS/CSS/SVG/fonts/workflows/internal docs). NOTE:
    // block-library and drafts are NOT excluded — fstab.yaml mounts the whole root to DA, so
    // any content-shaped .html path (including /block-library/* and /drafts/*) must exist as a
    // real DA document to resolve at all in the deployed site (an earlier version of this
    // script wrongly assumed block-library was code-served; it is not — see the design note's
    // "Incident record #3").
    if (['node_modules', '.git', 'tools', 'test', 'styles', 'scripts', 'icons', 'models', 'fonts', '.github', 'docs'].includes(name)) continue;
    if (name === 'head.html') continue; // <head> fragment, not a page/doc
    const abs = join(dir, name);
    const s = await stat(abs);
    if (s.isDirectory()) out.push(...await walk(abs));
    else if (name.endsWith('.html')) out.push(abs);
  }
  return out;
}

/** HTML docs: PUT with a raw text/html body (confirmed working — Incident #2). */
async function putHtml(path, doc) {
  const url = `${DA_SOURCE_BASE}/${ORG}/${SITE}${path}.html`;
  if (DRY) { console.log(`[seed:DRY] PUT ${String(doc.length).padStart(6)}B → ${url}`); return true; }
  const resp = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'text/html' }, body: doc });
  if (!resp.ok) { console.error(`  PUT ${resp.status} ${path}: ${(await resp.text()).slice(0, 200)}`); return false; }
  return true;
}

/** JSON "sheet" docs: POST multipart/form-data, field `data`, :type:"sheet" metadata (Incident #6). */
async function putJson(path, sheet) {
  const body = JSON.stringify({ ...sheet, ':type': sheet[':type'] || 'sheet' });
  const url = `${DA_SOURCE_BASE}/${ORG}/${SITE}${path}.json`;
  if (DRY) { console.log(`[seed:DRY] POST ${String(body.length).padStart(6)}B → ${url}`); return true; }
  const form = new FormData();
  form.append('data', new Blob([body], { type: 'application/json' }), path.split('/').pop());
  const resp = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: form });
  if (!resp.ok) { console.error(`  POST ${resp.status} ${path}: ${(await resp.text()).slice(0, 200)}`); return false; }
  return true;
}

async function aem(action, path) {
  const url = `${AEM_ADMIN_BASE}/${action}/${ORG}/${SITE}/${REF}${path}`;
  if (DRY) { console.log(`[seed:DRY] POST ${action} → ${url}`); return true; }
  // The same Adobe IMS identity that authorizes DA writes also authorizes the AEM admin API
  // (confirmed empirically 2026-09-14) — fall back to TOKEN unless a distinct admin credential
  // is explicitly provided.
  const headers = { Authorization: `Bearer ${ADMIN_AUTH || TOKEN}` };
  const resp = await fetch(url, { method: 'POST', headers });
  if (!resp.ok) { console.error(`  ${action} ${resp.status} ${path}`); return false; }
  return true;
}

const htmlFiles = (await walk(SRC)).map((abs) => ({ abs, rel: relative(SRC, abs), ext: 'html' }));
const jsonFiles = [];
for (const rel of JSON_CONTENT) {
  const abs = join(SRC, rel);
  try { await stat(abs); jsonFiles.push({ abs, rel, ext: 'json' }); }
  catch { console.error(`  (skipping missing JSON content doc: ${rel})`); }
}
const files = [...htmlFiles, ...jsonFiles];
console.log(`Seeding ${files.length} docs → DA ${ORG}/${SITE} (ref ${REF})${DRY ? '  [DRY-RUN]' : ''}${PUBLISH ? '  +publish' : ''}`);
if (!DRY) {
  const auth = await getAccessToken();            // Adobe IMS: explicit token | S2S | aio session
  TOKEN = auth.token;
  console.log(`IMS auth resolved via: ${auth.source}`);
}
if (!DRY && !TOKEN) { console.error('DA_TOKEN required to write (or leave DRY_RUN unset for a dry run)'); process.exit(1); }

const seeded = [];
const toPreview = [];
for (const { abs, rel, ext } of files) {
  const raw = await readFile(abs, 'utf8');
  const path = docPath(rel, ext);
  // library/*.json is read directly from content.da.live by DA's own Library panel — it never
  // goes through the aem.page/aem.live delivery pipeline, and that pipeline's preview/publish
  // actions don't support hand-authored JSON docs outside its query-index/page model anyway
  // (confirmed via admin.hlx.page/status: "code" lookup 400s for these). placeholders.json DOES
  // need the delivery domain (client JS fetches it — see scripts/aem.js) so it stays previewed.
  const needsPreview = !(ext === 'json' && rel.startsWith('library/'));
  const ok = ext === 'json' ? await putJson(path, JSON.parse(raw)) : await putHtml(path, toDaDoc(raw, rel.endsWith('.plain.html')));
  if (ok) {
    seeded.push(path);
    if (needsPreview) toPreview.push(path);
  }
}
for (const path of toPreview) { await aem('preview', path); if (PUBLISH) await aem('live', path); }

console.log(`✓ ${seeded.length}/${files.length} docs seeded${DRY ? ' (dry-run — nothing written)' : ''}; previewed${PUBLISH ? ' + published' : ''} (${toPreview.length} of ${seeded.length} — see library/*.json note).`);
