import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, sendLead } from '../../shared/services/lead-capture/lead-capture.mjs';

test('valid lead passes validation', () => {
  const { valid } = validateLead({ name: 'Rae', email: 'rae@example.com', message: 'Hello there', consent: true });
  assert.equal(valid, true);
});

test('invalid lead returns per-field errors', () => {
  const { valid, errors } = validateLead({ name: '', email: 'nope', message: '', consent: false });
  assert.equal(valid, false);
  assert.ok(errors.name && errors.email && errors.message && errors.consent);
});

test('sendLead mocks when no API key is configured', async () => {
  const prev = process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY;
  const res = await sendLead({ name: 'Rae', email: 'rae@example.com', message: 'Interested', consent: true });
  assert.deepEqual(res, { ok: true, mocked: true });
  if (prev) process.env.RESEND_API_KEY = prev;
});

test('honeypot submissions are silently dropped', async () => {
  const res = await sendLead({ name: 'Bot', email: 'b@x.com', message: 'spammy message', consent: true, hp: 'x' });
  assert.deepEqual(res, { ok: true, spam: true });
});

test('sendLead calls Resend when a key is provided (injected fetch)', async () => {
  let called = null;
  const fetchImpl = async (url, opts) => { called = { url, opts }; return { ok: true, json: async () => ({ id: 're_test123' }) }; };
  const res = await sendLead(
    { name: 'Rae', email: 'rae@example.com', message: 'Interested', consent: true, kind: 'lead' },
    { resendApiKey: 'test', to: 'hello@hyvr.example', from: 'HYVR <n@hyvr.example>', fetchImpl },
  );
  assert.equal(res.ok, true);
  assert.equal(res.id, 're_test123');
  assert.match(called.url, /api\.resend\.com/);
  assert.match(called.opts.headers.Authorization, /Bearer test/);
});
