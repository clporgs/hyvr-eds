import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const idx = JSON.parse(readFileSync(join(dir, '..', 'query-index.json'), 'utf8'));

const REQUIRED = ['path', 'title', 'category', 'price', 'availability'];
const AVAIL = new Set(['InStock', 'PreOrder', 'OutOfStock']);

test('product index has data', () => {
  assert.ok(Array.isArray(idx.data) && idx.data.length > 0);
});

test('every product has required machine-readable fields', () => {
  for (const p of idx.data) {
    for (const f of REQUIRED) assert.ok(p[f] !== undefined && p[f] !== '', `${p.path} missing ${f}`);
  }
});

test('availability values are valid schema.org states', () => {
  for (const p of idx.data) assert.ok(AVAIL.has(p.availability), `${p.path} invalid availability ${p.availability}`);
});

test('prices are numeric strings', () => {
  for (const p of idx.data) assert.match(String(p.price), /^\d+$/, `${p.path} price not numeric`);
});

test('paths are unique', () => {
  const paths = idx.data.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length, 'duplicate product paths');
});
