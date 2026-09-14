import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDaSource, parseChildren, titleCase } from '../tools/da-doc-transform.mjs';

test('titleCase converts kebab-case block names to Word-doc heading form', () => {
  assert.equal(titleCase('hero'), 'Hero');
  assert.equal(titleCase('product-hero'), 'Product Hero');
  assert.equal(titleCase('section-metadata'), 'Section Metadata');
});

test('parseChildren splits top-level siblings only, ignoring nested depth', () => {
  const html = '<div><div>nested</div></div><p>text</p><img src="x.png">';
  const kids = parseChildren(html);
  assert.equal(kids.length, 3);
  assert.match(kids[0], /^<div><div>nested<\/div><\/div>$/);
  assert.match(kids[2], /^<img/);
});

test('a delivery-shape block div becomes a table with the block name as the header row', () => {
  const html = '<main><div><div class="hero"><div><div><h1>Hi</h1></div></div></div></div></main>';
  const out = toDaSource(html, false);
  assert.match(out, /<table><tr><td>Hero<\/td><\/tr>/);
  assert.match(out, /<h1>Hi<\/h1>/);
  assert.ok(!out.includes('class="hero"'), 'the delivery-shape class must not leak into the source');
});

test('a two-cell config row (e.g. product-grid "limit: 4") becomes a two-<td> table row', () => {
  const html = '<main><div><div class="product-grid"><div><div>limit</div><div>4</div></div></div></div></main>';
  const out = toDaSource(html, false);
  assert.match(out, /<tr><td>limit<\/td><td>4<\/td><\/tr>/);
});

test('a single-cell group-heading row (product-specs) keeps exactly one <td>', () => {
  const html = '<main><div><div class="product-specs"><div><div>Display</div></div></div></div></main>';
  const out = toDaSource(html, false);
  assert.match(out, /<tr><td>Display<\/td><\/tr>/);
  assert.ok(!/<tr><td>Display<\/td><td><\/td><\/tr>/.test(out), 'must not synthesize an empty second cell');
});

test('default content (no block class) passes through verbatim, unwrapped', () => {
  const html = '<main><div><h2>Plain</h2><p>Body copy.</p></div></main>';
  const out = toDaSource(html, false);
  assert.match(out, /<h2>Plain<\/h2>\s*<p>Body copy\.<\/p>/);
  assert.ok(!out.includes('<table>'), 'no block classes present -> no table should be emitted');
});

test('a hardcoded section class with no authored section-metadata synthesizes one', () => {
  const html = '<main><div class="dark"><h2>X</h2></div></main>';
  const out = toDaSource(html, false);
  assert.match(out, /<table><tr><td>Section Metadata<\/td><\/tr><tr><td>style<\/td><td>dark<\/td><\/tr><\/table>/);
});

test('an authored section-metadata block is NOT duplicated by synthesis', () => {
  const html = '<main><div><div class="section-metadata"><div><div>style</div><div>shop</div></div></div></div></main>';
  const out = toDaSource(html, false);
  const count = (out.match(/Section Metadata/g) || []).length;
  assert.equal(count, 1, 'exactly one Section Metadata table, not a duplicate synthesized one');
});

test('sections are separated by <hr>, and page metadata becomes a trailing Metadata table', () => {
  const html = '<html><head><title>My Page</title><meta name="description" content="D"></head>'
    + '<main><div><h1>A</h1></div><div><h1>B</h1></div></main></html>';
  const out = toDaSource(html, false);
  assert.match(out, /<h1>A<\/h1>\s*<hr>\s*<h1>B<\/h1>/);
  assert.match(out, /<table><tr><td>Metadata<\/td><\/tr><tr><td>Title<\/td><td>My Page<\/td><\/tr><tr><td>description<\/td><td>D<\/td><\/tr><\/table>/);
});

test('fragment documents (.plain.html, no <main>) are transformed the same way', () => {
  const html = '<div><p>Brand</p></div><div><ul><li><a href="/x">X</a></li></ul></div>';
  const out = toDaSource(html, true);
  assert.match(out, /<p>Brand<\/p>\s*<hr>\s*<ul>/);
});
