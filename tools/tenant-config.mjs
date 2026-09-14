#!/usr/bin/env node
/**
 * HYVR — standard tenant CONFIG writer (DA + EDS surface).
 * Writes DA site configuration (Library pointer, AEM Assets pointer, preview/live hosts) via
 * the DA **Config API** — NOT the Source API (an earlier version of this script mistakenly
 * used PUT /source/.../.da/config.json; that write silently failed / had no effect on DA's
 * actual config). Confirmed against https://docs.da.live/developers/api/config and empirically
 * verified against the live tenant (2026-09-14):
 *
 *   POST https://admin.da.live/config/{org}                → organization-wide config
 *   POST https://admin.da.live/config/{org}/{repo}          → site/repo-wide config (default here)
 *   POST https://admin.da.live/config/{org}/{repo}/{path}   → path-specific config
 *
 * Transport: multipart/form-data with a single field named `config` whose value is the
 * JSON-stringified sheet (a plain string field, NOT a Blob/file attachment, and NOT `data` —
 * both of those were tried first and rejected with 400 "No config or form data").
 *
 * Config bodies use the same DA "sheet" JSON shape as any other DA JSON resource (single-sheet
 * or multi-sheet — see docs.da.live). Our settings are flat key/value pairs, so we emit a
 * single-sheet payload: { total, offset, limit, data: [{ key, value }, ...] } — the same
 * convention this repo already uses for placeholders.json / query-index.json.
 *
 * Org-level safety: GET https://admin.da.live/config/clporgs already returns REAL production
 * data (the org's actual `aem.repositoryId`, plus `permissions`/`admin.role.*` rows that
 * authorize config writes at all). A blind overwrite at org scope would destroy that. So org
 * scope is opt-in (via CONFIG_SCOPE) and always GET-then-merges into the existing `data` sheet,
 * leaving `permissions` and any other existing rows untouched. Site and path scope are safe to
 * write outright — both are currently empty (404) for this tenant.
 *
 * Config-first: this runs BEFORE content seeding because config is what kick-starts the
 * authoring phase (Library palette, Assets pointer). Dependency-free; DRY-RUN by default.
 *
 * Env: DA_ORG (clporgs) · DA_SITE (hyvr-eds) · DA_ENV (dev) · CONFIG_SCOPE (comma-separated
 *      subset of site|path|org, default "site,path" — org is opt-in, see safety note above) ·
 *      CONFIG_PATH (path-specific scope segment, default "drafts") · ASSETS_DELIVERY_HOST
 *      (override; else read from the real org-level aem.repositoryId, else a guessed fallback)
 *      · DRY_RUN ("false" to actually write) · auth resolved via shared/services/ims-auth
 *      (IMS_ACCESS_TOKEN/DA_TOKEN | IMS_CLIENT_ID+IMS_CLIENT_SECRET | aio session)
 */
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

const ORG = process.env.DA_ORG || 'clporgs';
const SITE = process.env.DA_SITE || 'hyvr-eds';
const ENV = process.env.DA_ENV || 'dev';
const SCOPES = (process.env.CONFIG_SCOPE || 'site,path').split(',').map((s) => s.trim()).filter(Boolean);
const CONFIG_PATH = process.env.CONFIG_PATH || 'drafts';
const DRY = process.env.DRY_RUN !== 'false';

const DA_CONFIG_BASE = 'https://admin.da.live/config'; // per DA Config API spec (POST, not PUT/source)

function toSingleSheet(rows) {
  return { total: rows.length, offset: 0, limit: rows.length, data: rows };
}

/** Read-only GET — used both to fetch the real org repositoryId and to merge-safe org writes. */
async function getConfig(url, token) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`GET ${resp.status} ${url}`);
  return resp.json();
}

async function postConfig(url, sheet, token) {
  const form = new FormData();
  form.append('config', JSON.stringify(sheet));
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }, // let fetch set the multipart boundary
    body: form,
  });
  if (!resp.ok) throw new Error(`POST ${resp.status} ${url}: ${(await resp.text()).slice(0, 300)}`);
}

/** site-level settings: Library pointer, AEM Assets pointer, preview/live/DA-preview hosts */
function buildSiteSheet(assetsHost) {
  const settings = {
    library: '/tools/sidekick/library.json',
    'assets.repositoryId': assetsHost,
    'assets.aemTierType': 'delivery',
    'assets.imageUrlPattern': `https://${assetsHost}/adobe/assets/urn:aaid:aem:{asset-id}/original/as/{name}?width={width}&format=webply&optimize=medium`,
    'hosts.preview': `https://main--${SITE}--${ORG}.aem.page`,
    'hosts.live': `https://main--${SITE}--${ORG}.aem.live`,
    'hosts.daPreview': `https://main--${SITE}--${ORG}.preview.da.live`,
  };
  return toSingleSheet(Object.entries(settings).map(([key, value]) => ({ key, value })));
}

/** path-specific settings for /drafts — matches the helix-query.yaml/helix-sitemap.yaml exclusion. */
function buildPathSheet() {
  return toSingleSheet([
    { key: 'robots', value: 'noindex' },
    { key: 'comment', value: 'Author drafts/scratch space — excluded from search indices and sitemap.' },
  ]);
}

async function writeScope(name, url, sheet, token) {
  if (DRY) {
    console.log(`[tenant-config:DRY] would POST → ${url}`);
    console.log(JSON.stringify(sheet, null, 2));
    return;
  }
  await postConfig(url, sheet, token);
  console.log(`✓ tenant config written (${name} scope) → ${url}`);
}

async function run() {
  console.log(`Config scopes: ${SCOPES.join(', ')}${DRY ? '  [DRY-RUN]' : ''}`);
  let token = '';
  if (!DRY) {
    const auth = await getAccessToken(); // Adobe IMS: explicit token | S2S | aio session
    token = auth.token;
    console.log(`IMS auth resolved via: ${auth.source}`);
  }

  // resolve the real AEM Assets repositoryId from the existing org config rather than guessing
  let assetsHost = process.env.ASSETS_DELIVERY_HOST;
  if (!assetsHost && token) {
    try {
      const orgConfig = await getConfig(`${DA_CONFIG_BASE}/${ORG}`, token);
      assetsHost = orgConfig?.data?.data?.find((r) => r.key === 'aem.repositoryId')?.value;
      if (assetsHost) console.log(`Using real org aem.repositoryId: ${assetsHost}`);
    } catch (err) { console.error(`  (could not read org config for repositoryId: ${err.message})`); }
  }
  assetsHost ||= `delivery-${ORG}-${ENV}.adobeaemcloud.com`; // best-effort fallback, DRY-RUN or no org read access

  if (SCOPES.includes('site')) {
    await writeScope('site', `${DA_CONFIG_BASE}/${ORG}/${SITE}`, buildSiteSheet(assetsHost), token);
  }
  if (SCOPES.includes('path')) {
    await writeScope('path', `${DA_CONFIG_BASE}/${ORG}/${SITE}/${CONFIG_PATH}`, buildPathSheet(), token);
  }
  if (SCOPES.includes('org')) {
    const url = `${DA_CONFIG_BASE}/${ORG}`;
    const existing = DRY ? null : await getConfig(url, token);
    if (existing && !DRY) {
      console.log('  org config exists — merging (preserving `permissions` + existing `data` rows)');
    }
    // No new org-wide keys needed today (repositoryId/permissions are already real & correct) —
    // this re-posts the existing sheet unchanged, proving the merge-safe path without altering it.
    const merged = existing || toSingleSheet([]);
    await writeScope('org', url, merged, token);
  }
}

await run();
