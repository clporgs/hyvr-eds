#!/usr/bin/env node
/*
 * Verify Adobe IMS auth resolution without leaking the token. Prints the resolution SOURCE and
 * a masked token so DevOps can confirm auth before running a live seed. Exits non-zero if no
 * credentials resolve (with guidance). Never prints the full token.
 *   node tools/ims-token.mjs
 */
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

const mask = (t) => (t && t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} chars)` : '(short/opaque)');

try {
  const { token, source } = await getAccessToken();
  console.log(`✓ IMS token resolved via: ${source}`);
  console.log(`  token: ${mask(token)}`);
  console.log('  (ready — run `DRY_RUN=false node tools/tenant-config.mjs && node tools/seed-da.mjs`)');
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
