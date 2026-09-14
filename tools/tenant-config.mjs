#!/usr/bin/env node
/**
 * HYVR — standard tenant CONFIG writer (DA + EDS surface).
 * Writes DA site configuration via the DA **Config API**. Confirmed against
 * https://docs.da.live/developers/api/config, https://docs.da.live/administrators/guides/setup-library,
 * and empirically against the live tenant + the `clporgs/eds-da-template` reference (2026-09-14):
 *
 *   POST https://admin.da.live/config/{org}                → organization-wide config
 *   POST https://admin.da.live/config/{org}/{repo}          → site/repo-wide config (default here)
 *   POST https://admin.da.live/config/{org}/{repo}/{path}   → path-specific config
 *
 * Transport: multipart/form-data with a single field named `config` whose value is the
 * JSON-stringified sheet (a plain string field, NOT a Blob/file attachment, and NOT `data` —
 * both of those were tried first and rejected with 400 "No config or form data").
 *
 * Site-level schema — CORRECTED (see "Incident record #5"): the real DA Library feature is
 * driven by a **Library registry table**, not flat key/value settings. Checking the reference
 * template's live config confirmed the exact shape: a single sheet with columns
 * `title | path | format | ref | icon | experience`, where each row points at a real content
 * JSON doc under this same site (`blocks.json`/`templates.json`/`icons.json`/`placeholders.json`
 * — see `library/*.json` and the repo-root `placeholders.json`, all HYVR's own content, none
 * copied from the reference tenant). Two things the earlier flat-settings version got wrong:
 *   - `assets.*` does NOT belong at site scope — AEM Assets connection (`aem.repositoryId` etc.)
 *     is an ORG-level setting, and `clporgs`'s org config already has the real one. No per-site
 *     duplicate needed.
 *   - `hosts.*` isn't a DA config concept at all — Sidekick computes preview/live URLs itself by
 *     convention from org/repo/ref; nothing to store.
 *
 * Media/icon upload: per https://docs.da.live/authors/guides/adding-media there is no REST
 * upload API — DA only accepts media via the editor itself (drag-and-drop into a doc, a
 * top-level `media` folder + copy/paste, or an AEM Assets connection). `library/icons.json`
 * therefore references HYVR's existing code-served `/icons/*.svg` files rather than uploading
 * new binaries — that's the only scriptable option available.
 *
 * Org-level safety: GET https://admin.da.live/config/clporgs already returns REAL production
 * data (the org's actual `aem.repositoryId`, plus `permissions`/`admin.role.*` rows that
 * authorize config writes at all). A blind overwrite at org scope would destroy that. So org
 * scope is opt-in (via CONFIG_SCOPE) and always GET-then-merges into the existing `data` sheet,
 * leaving `permissions` and any other existing rows untouched. Site and path scope are safe to
 * write outright — both were empty (404) for this tenant before this script ran.
 *
 * Config-first: this runs BEFORE content seeding because config is what kick-starts the
 * authoring phase (Library palette). Dependency-free; DRY-RUN by default.
 *
 * Env: DA_ORG (clporgs) · DA_SITE (hyvr-eds) · CONFIG_SCOPE (comma-separated subset of
 *      site|path|org, default "site,path" — org is opt-in, see safety note above) ·
 *      CONFIG_PATH (path-specific scope segment, default "drafts") · DRY_RUN ("false" to
 *      actually write) · auth resolved via shared/services/ims-auth
 *      (IMS_ACCESS_TOKEN/DA_TOKEN | IMS_CLIENT_ID+IMS_CLIENT_SECRET | aio session)
 */
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

const ORG = process.env.DA_ORG || 'clporgs';
const SITE = process.env.DA_SITE || 'hyvr-eds';
const SCOPES = (process.env.CONFIG_SCOPE || 'site,path').split(',').map((s) => s.trim()).filter(Boolean);
const CONFIG_PATH = process.env.CONFIG_PATH || 'drafts';
const DRY = process.env.DRY_RUN !== 'false';

const DA_CONFIG_BASE = 'https://admin.da.live/config'; // per DA Config API spec (POST, not PUT/source)
const CONTENT_BASE = `https://content.da.live/${ORG}/${SITE}`; // published content-doc host, not the editor host

function toSingleSheet(rows) {
  return { total: rows.length, offset: 0, limit: rows.length, data: rows };
}

/** Read-only GET — used for the merge-safe org write. */
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

/** site-level: the Library registry table DA's Sidekick/editor Library panel reads. */
function buildSiteSheet() {
  const rows = [
    { title: 'Blocks', path: `${CONTENT_BASE}/library/blocks.json`, format: '', ref: '', icon: '', experience: '' },
    { title: 'Templates', path: `${CONTENT_BASE}/library/templates.json`, format: '', ref: '', icon: '', experience: '' },
    { title: 'Icons', path: `${CONTENT_BASE}/library/icons.json`, format: ':<content>:', ref: '', icon: '', experience: '' },
    { title: 'Placeholders', path: `${CONTENT_BASE}/placeholders.json`, format: '{{<content>}}', ref: '', icon: '', experience: '' },
  ];
  return toSingleSheet(rows);
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

  if (SCOPES.includes('site')) {
    await writeScope('site', `${DA_CONFIG_BASE}/${ORG}/${SITE}`, buildSiteSheet(), token);
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
