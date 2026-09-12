#!/usr/bin/env node
/*
 * Generates the DA.live / Sidekick BLOCK LIBRARY: one example page per author-facing block
 * under /block-library/, plus tools/sidekick/library.json (blocks + icons sheets) that the
 * Sidekick "Library" plugin reads. This is what gives DA.live authors a browsable, insertable
 * block palette — the DA-side equivalent of the Universal Editor component-*.json models.
 * Run: node tools/gen-block-library.mjs
 */
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'block-library');
mkdirSync(outDir, { recursive: true });

// name → { desc, markup } — markup is the block in its authored (delivered) shape.
const BLOCKS = {
  hero: { desc: 'Full-bleed hero with heading, copy and CTAs.', markup:
    '<div class="hero"><div><div><h1>Hero heading</h1><p>One or two lines of supporting copy.</p><p><strong><a href="/products">Primary CTA</a></strong></p><p><em><a href="/about">Secondary CTA</a></em></p></div></div></div>' },
  cards: { desc: 'Grid of content cards (features, value props).', markup:
    '<div class="cards"><div><div><h3>Card one</h3><p>Short description.</p></div></div><div><div><h3>Card two</h3><p>Short description.</p></div></div><div><div><h3>Card three</h3><p>Short description.</p></div></div></div>' },
  columns: { desc: 'Two-column text + media layout.', markup:
    '<div class="columns"><div><div><h2>Column heading</h2><p>Body copy for the left column.</p></div><div><img src="/icons/ph-vertex.svg" alt="Descriptive alt text"></div></div></div>' },
  stats: { desc: 'Animated KPI counters (value | label per row).', markup:
    '<div class="stats"><div><div>250K+</div><div>community members</div></div><div><div>1,200</div><div>products</div></div><div><div>4.8</div><div>avg rating</div></div></div>' },
  quote: { desc: 'Pull-quote / testimonial (quote row, attribution row).', markup:
    '<div class="quote"><div><div>A short, quotable sentence from a customer.</div></div><div><div>Name — role</div></div></div>' },
  'community-cta': { desc: 'Brand-connect call-to-action band.', markup:
    '<div class="community-cta"><div><div><h2>Call to action</h2><p>Supporting sentence.</p><p><strong><a href="/community">Primary</a></strong></p><p><em><a href="/partners">Secondary</a></em></p></div></div></div>' },
  'drop-badge': { desc: 'Limited-drop countdown (headline, ISO end datetime, CTA).', markup:
    '<div class="drop-badge"><div><div>Limited drop headline</div></div><div><div>2026-12-01T17:00:00Z</div></div><div><div><a href="/products">Get notified</a></div></div></div>' },
  breadcrumb: { desc: 'Breadcrumb trail (auto-derives from the URL if left empty).', markup:
    '<div class="breadcrumb"></div>' },
  'product-grid': { desc: 'Product listing grid from the query index (optional config rows: category, tag, limit).', markup:
    '<div class="product-grid"><div><div>limit</div><div>3</div></div></div>' },
  'product-filter': { desc: 'Faceted filter rail; pair with product-grid in a section styled "shop".', markup:
    '<div class="product-filter"></div>' },
  'product-hero': { desc: 'PDP buy box (label | value rows).', markup:
    '<div class="product-hero"><div><div>image</div><div><img src="/icons/ph-aurora.svg" alt="Product"></div></div><div><div>category</div><div>Category · Brand</div></div><div><div>title</div><div>Product name</div></div><div><div>price</div><div>1299</div></div><div><div>currency</div><div>USD</div></div><div><div>availability</div><div>InStock</div></div><div><div>rating</div><div>4.8</div></div><div><div>summary</div><div>One-sentence product summary.</div></div><div><div>specs</div><div><ul><li>Key spec one</li><li>Key spec two</li></ul></div></div></div>' },
  'product-specs': { desc: 'Structured spec table (single-cell row = group heading; two-cell row = name | value).', markup:
    '<div class="product-specs"><div><div>Group</div></div><div><div>Spec name</div><div>Spec value</div></div><div><div>Another spec</div><div>Value</div></div></div>' },
  'product-gallery': { desc: 'Keyboard-accessible image gallery (one image per row).', markup:
    '<div class="product-gallery"><div><div><img src="/icons/ph-aurora.svg" alt="View 1"></div></div><div><div><img src="/icons/ph-photon.svg" alt="View 2"></div></div></div>' },
  comparison: { desc: 'Side-by-side spec comparison (one product link per row).', markup:
    '<div class="comparison"><div><div><a href="/product/aurora-x1">Aurora X1</a></div></div><div><div><a href="/product/vertex-creator-kit">Vertex Kit</a></div></div></div>' },
  'contact-form': { desc: 'Contact / lead form (config rows: kind, heading, cta) → shared Resend service.', markup:
    '<div class="contact-form"><div><div>kind</div><div>contact</div></div><div><div>heading</div><div>Get in touch</div></div><div><div>cta</div><div>Send message</div></div></div>' },
};

const page = (name, spec) => `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${name} — Block Library | HYVR</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${spec.desc}">
  <meta name="template" content="default">
  <meta name="library-metadata-name" content="${name}">
  <meta name="library-metadata-description" content="${spec.desc}">
  <link rel="icon" href="/icons/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles/fonts.css">
  <link rel="stylesheet" href="/styles/styles.css">
  <script src="/scripts/scripts.js" type="module"></script>
</head>
<body>
  <header></header>
  <main id="main">
    <div>
      <h2>${name}</h2>
      <p>${spec.desc}</p>
    </div>
    <div>
      ${spec.markup}
    </div>
  </main>
  <footer></footer>
</body>
</html>
`;

const names = Object.keys(BLOCKS);
for (const name of names) writeFileSync(join(outDir, `${name}.html`), page(name, BLOCKS[name]));

// Build the multi-sheet library.json the Sidekick Library plugin reads.
const icons = readdirSync(join(root, 'icons')).filter((f) => f.endsWith('.svg')).map((f) => ({ name: f.replace('.svg', ''), path: `/icons/${f}` }));
const library = {
  ':names': ['blocks', 'icons'],
  ':type': 'multi-sheet',
  ':version': 3,
  blocks: { total: names.length, offset: 0, limit: names.length,
    data: names.map((n) => ({ name: n.replace(/(^|-)([a-z])/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase()), path: `/block-library/${n}`, description: BLOCKS[n].desc })) },
  icons: { total: icons.length, offset: 0, limit: icons.length, data: icons },
};
writeFileSync(join(root, 'tools', 'sidekick', 'library.json'), JSON.stringify(library, null, 2));

console.log(`✓ block library: ${names.length} example pages → /block-library/ + tools/sidekick/library.json (${icons.length} icons)`);
