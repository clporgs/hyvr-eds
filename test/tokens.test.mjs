import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(dir, '..', 'styles', 'tokens.css'), 'utf8');

test('tokens.css exists and has HYVR custom properties', () => {
  assert.match(css, /--hyvr-color-semantic-bg:/);
  assert.match(css, /--hyvr-font-family-display:/);
});

test('semantic aliases are fully resolved (no leftover DTCG {refs})', () => {
  // DTCG aliases look like {color.core.volt}; the CSS ":root {" brace is legitimate.
  assert.ok(!/\{[a-z][\w.-]*\}/i.test(css), 'tokens.css must not contain unresolved {alias} references');
});

test('brand primary resolves to the volt hex', () => {
  assert.match(css, /--hyvr-color-semantic-primary:\s*#00E5A8;/i);
});

test('dark-first background resolves to voidblack', () => {
  assert.match(css, /--hyvr-color-semantic-bg:\s*#0A0A0F;/i);
});
