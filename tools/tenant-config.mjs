#!/usr/bin/env node
/**
 * HYVR — standard tenant CONFIG writer (DA + EDS surface).
 * Writes DA site configuration (Library pointer, AEM Assets pointer, preview/live hosts) via
 * the DA **Config API** — NOT the Source API (an earlier version of this script mistakenly
 * used PUT /source/.../.da/config.json; that write silently failed / had no effect on DA's
 * actual config). Confirmed correct usage:
 *
 *   POST https://admin.da.live/config/{org}                → organization-wide config
 *   POST https://admin.da.live/config/{org}/{repo}          → site/repo-wide config (default here)
 *   POST https://admin.da.live/config/{org}/{repo}/{path}   → path-specific config
 *
 * Config bodies use the same DA "sheet" JSON shape as any other DA JSON resource (single-sheet
 * or multi-sheet — see docs.da.live). Our settings are flat key/value pairs, so we emit a
 * single-sheet payload: { total, offset, limit, data: [{ key, value }, ...] } — the same
 * convention this repo already uses for placeholders.json / query-index.json.
 *
 * Config-first: this runs BEFORE content seeding because config is what kick-starts the
 * authoring phase (Library palette, Assets pointer). Dependency-free; DRY-RUN by default.
 *
 * Env: DA_ORG (clporgs) · DA_SITE (hyvr-eds) · DA_ENV (dev) · CONFIG_SCOPE (site|org, default
 *      site) · CONFIG_PATH (optional path-specific scope, appended after repo) ·
 *      ASSETS_DELIVERY_HOST (optional) · DRY_RUN ("false" to actually write) · auth resolved
 *      via shared/services/ims-auth (IMS_ACCESS_TOKEN/DA_TOKEN | IMS_CLIENT_ID+IMS_CLIENT_SECRET
 *      | aio session)
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORG = process.env.DA_ORG || 'clporgs';
const SITE = process.env.DA_SITE || 'hyvr-eds';
const ENV = process.env.DA_ENV || 'dev';
const SCOPE = process.env.CONFIG_SCOPE || 'site'; // 'org' | 'site'
const EXTRA_PATH = process.env.CONFIG_PATH || '';  // optional path-specific scope
const DRY = process.env.DRY_RUN !== 'false';

const DA_CONFIG_BASE = 'https://admin.da.live/config'; // per DA Config API spec (POST, not PUT/source)

// --- build the settings as flat key/value rows (DA single-sheet convention) ---
const assetsHost = process.env.ASSETS_DELIVERY_HOST || `delivery-${ORG}-${ENV}.adobeaemcloud.com`;
const settings = {
  library: '/tools/sidekick/library.json',
  'assets.repositoryId': assetsHost,
  'assets.aemTierType': 'delivery',
  'assets.imageUrlPattern': `https://${assetsHost}/adobe/assets/urn:aaid:aem:{asset-id}/original/as/{name}?width={width}&format=webply&optimize=medium`,
  'hosts.preview': `https://main--${SITE}--${ORG}.aem.page`,
  'hosts.live': `https://main--${SITE}--${ORG}.aem.live`,
  'hosts.daPreview': `https://main--${SITE}--${ORG}.preview.da.live`,
};

const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
const sheet = { total: rows.length, offset: 0, limit: rows.length, data: rows };
const body = JSON.stringify(sheet, null, 2);

// --- resolve the URL for the chosen scope ---
const scopePath = SCOPE === 'org' ? `${ORG}` : `${ORG}/${SITE}${EXTRA_PATH ? `/${EXTRA_PATH}` : ''}`;
const url = `${DA_CONFIG_BASE}/${scopePath}`;

async function post() {
  if (DRY) {
    console.log(`[tenant-config:DRY] would POST ${body.length} bytes → ${url}`);
    console.log(body);
    console.log('  (set DRY_RUN=false + IMS auth (see shared/services/ims-auth) to write)');
    return;
  }
  const auth = await getAccessToken();            // Adobe IMS: explicit token | S2S | aio session
  console.log(`IMS auth resolved via: ${auth.source}`);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body,
  });
  if (!resp.ok) { console.error(`config POST ${resp.status}: ${(await resp.text()).slice(0, 300)}`); process.exit(1); }
  console.log(`✓ tenant config written (${SCOPE} scope) → ${url}`);
}

await post();
