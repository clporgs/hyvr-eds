import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken } from '../../shared/services/ims-auth/ims-auth.mjs';

test('explicit token wins (source=explicit)', async () => {
  const r = await getAccessToken({ token: 'explicit-abc' });
  assert.deepEqual(r, { token: 'explicit-abc', source: 'explicit' });
});

test('OAuth S2S: POSTs client_credentials to /ims/token/v3 and returns the token', async () => {
  let seen = null;
  const fetchImpl = async (url, opts) => {
    seen = { url, body: opts.body.toString(), ct: opts.headers['Content-Type'] };
    return { ok: true, json: async () => ({ access_token: 's2s-token', expires_in: 3600 }) };
  };
  const r = await getAccessToken({ clientId: 'cid', clientSecret: 'csecret', scopes: 'openid,AdobeID', fetchImpl });
  assert.equal(r.source, 's2s');
  assert.equal(r.token, 's2s-token');
  assert.match(seen.url, /\/ims\/token\/v3$/);
  assert.match(seen.ct, /application\/x-www-form-urlencoded/);
  assert.match(seen.body, /grant_type=client_credentials/);
  assert.match(seen.body, /client_id=cid/);
  assert.match(seen.body, /scope=openid/);
});

test('S2S token is cached within its TTL (a second call adds no re-fetch)', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: true, json: async () => ({ access_token: `t${calls}`, expires_in: 3600 }) }; };
  await getAccessToken({ clientId: 'c', clientSecret: 's', fetchImpl });
  const afterFirst = calls;
  await getAccessToken({ clientId: 'c', clientSecret: 's', fetchImpl });
  // Order-independent: whatever the process-wide cache state, the second call must not re-fetch.
  assert.equal(calls, afterFirst, 'second call should be served from the in-process cache');
});
