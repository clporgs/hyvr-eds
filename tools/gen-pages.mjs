#!/usr/bin/env node
/*
 * Stamps a PDP for every product in query-index.json that doesn't already have one, using the
 * unchanged product-hero / product-specs / comparison / community-cta blocks. Content-driven
 * (spec rows derive from the index fields) so the demo has a complete PLP→PDP journey for all
 * products. Existing hand-authored pages (e.g. product/aurora-x1.html) are preserved.
 * Run: node tools/gen-pages.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const items = JSON.parse(readFileSync(join(root, 'query-index.json'), 'utf8')).data;
mkdirSync(join(root, 'product'), { recursive: true });

const specRows = (p) => {
  const rows = [['Overview', null]];
  rows.push(['Brand', p.brand]);
  rows.push(['Platform', p.platform]);
  if (p.fov) rows.push(['Field of view', `${p.fov}°`]);
  if (p.refresh) rows.push(['Refresh rate', `${p.refresh}Hz`]);
  if (p.resolution) rows.push(['Resolution', p.resolution]);
  rows.push(['Category', p.category]);
  return rows.map(([n, v]) => (v === null
    ? `        <div><div>${n}</div></div>`
    : `        <div><div>${n}</div><div>${v}</div></div>`)).join('\n');
};

const keyspecs = (p) => [p.fov && `${p.fov}° field of view`, p.refresh && `${p.refresh}Hz refresh`, p.resolution, `${p.platform}`]
  .filter(Boolean).map((s) => `<li>${s}</li>`).join('');

const page = (p) => {
  const slug = p.path.split('/').pop();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${p.title} | HYVR</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${p.summary}">
  <meta name="template" content="product">
  <meta name="theme-color" content="#0A0A0F">
  <meta name="product-name" content="${p.title}">
  <meta name="category" content="${p.category}">
  <meta name="price" content="${p.price}">
  <meta name="currency" content="${p.currency}">
  <meta name="availability" content="${p.availability}">
  <meta property="og:type" content="product">
  <link rel="icon" href="/icons/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles/fonts.css">
  <link rel="stylesheet" href="/styles/styles.css">
  <script src="/scripts/scripts.js" type="module"></script>
</head>
<body>
  <a href="#main" class="skip-to-main">Skip to content</a>
  <header></header>
  <main id="main">
    <div><div class="breadcrumb"></div></div>
    <div>
      <div class="product-hero">
        <div><div>image</div><div><img src="${p.image}" alt="${p.title}"></div></div>
        <div><div>category</div><div>${p.category} · ${p.brand}</div></div>
        <div><div>title</div><div>${p.title}</div></div>
        <div><div>price</div><div>${p.price}</div></div>
        <div><div>currency</div><div>${p.currency}</div></div>
        <div><div>availability</div><div>${p.availability}</div></div>
        <div><div>rating</div><div>${p.rating}</div></div>
        <div><div>summary</div><div>${p.summary}</div></div>
        <div><div>specs</div><div><ul>${keyspecs(p)}</ul></div></div>
      </div>
    </div>
    <div>
      <div class="product-specs">
${specRows(p)}
      </div>
    </div>
    <div>
      <div class="community-cta">
        <div><div>
          <h2>Questions before you gear up?</h2>
          <p>Ask the HYVR community or talk to a specialist — real answers, no sales script.</p>
          <p><strong><a href="/community">Ask the community</a></strong></p>
          <p><em><a href="/support">Contact support</a></em></p>
        </div></div>
      </div>
    </div>
  </main>
  <footer></footer>
</body>
</html>
`;
};

let created = 0;
for (const p of items) {
  const slug = p.path.split('/').pop();
  const file = join(root, 'product', `${slug}.html`);
  if (existsSync(file)) continue; // preserve hand-authored showcase pages
  writeFileSync(file, page(p));
  created += 1;
}
console.log(`✓ generated ${created} PDP(s); ${items.length - created} preserved. Total products: ${items.length}`);
