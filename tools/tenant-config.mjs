#!/usr/bin/env node
/**
 * HYVR — standard tenant CONFIG writer (DA + EDS surface).
 * Writes the DA site configuration (Library pointer, AEM Assets pointer, preview/edit/live
 * hosts) to DA via the Source API. Config-first: this runs BEFORE content seeding because the
 * config is what kick-starts the authoring phase. Config docs use the .json content type
 * (extension = content type, per DA). Dependency-free; DRY-RUN by default.
 *
 * Env: DA_TOKEN (required to write) · DA_ORG (clporgs) · DA_SITE (hyvr-eds) · DA_ENV (dev)
 *      ASSETS_DELIVERY_HOST (optional) · DRY_RUN ("false" to actually write)
 *
 * CONFIRM against the tenant before live use (DA is evolving):
 *   - CONFIRM_DA_CONFIG_PATH: where DA reads site config (Settings UI vs a config doc path).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORG = process.env.DA_ORG || 'clporgs';
const SITE = process.env.DA_SITE || 'hyvr-eds';
const ENV = process.env.DA_ENV || 'dev';
const DRY = process.env.DRY_RUN !== 'false';

const DA_SOURCE_BASE = 'https://admin.da.live/source';        // confirmed path form
const CONFIRM_DA_CONFIG_PATH = process.env.DA_CONFIG_PATH || '/.da/config'; // CONFIRM per tenant

// Build the tenant config from the repo template, substituting tenant params.
const template = JSON.parse(readFileSync(join(ROOT, 'tools', 'da', 'config.json'), 'utf8'));
const assetsHost = process.env.ASSETS_DELIVERY_HOST || `delivery-${ORG}-${ENV}.adobeaemcloud.com`;
const config = {
  ...template,
  $comment: undefined,
  library: { blocks: '/tools/sidekick/library.json' },
  hosts: {
    preview: `https://main--${SITE}--${ORG}.aem.page`,
    live: `https://main--${SITE}--${ORG}.aem.live`,
    daPreview: `https://main--${SITE}--${ORG}.preview.da.live`,
  },
  assets: {
    repositoryId: assetsHost,
    aemTierType: 'delivery',
    imageUrlPattern: `https://${assetsHost}/adobe/assets/urn:aaid:aem:{asset-id}/original/as/{name}?width={width}&format=webply&optimize=medium`,
  },
};
delete config.$comment;

const body = JSON.stringify(config, null, 2);
const url = `${DA_SOURCE_BASE}/${ORG}/${SITE}${CONFIRM_DA_CONFIG_PATH}.json`;

async function put() {
  if (DRY) {
    console.log(`[tenant-config:DRY] would PUT ${body.length} bytes → ${url}`);
    console.log(body);
    console.log('  (set DRY_RUN=false + DA_TOKEN to write; confirm DA_CONFIG_PATH first)');
    return;
  }
  const auth = await getAccessToken();            // Adobe IMS: explicit token | S2S | aio session
  console.log(`IMS auth resolved via: ${auth.source}`);
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body,
  });
  if (!resp.ok) { console.error(`config PUT ${resp.status}: ${(await resp.text()).slice(0, 300)}`); process.exit(1); }
  console.log(`✓ tenant config written → ${url}`);
}

await put();
