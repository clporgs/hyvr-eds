# Blueprint 1 — Pages As Built

Every page shipped in the reference site, its template, the blocks it uses, and status. A team
can open any of these, see the journey, and start authoring/extending immediately. All render
locally (`node tools/server.mjs` → http://localhost:3001) and in-browser verification passed.

## Experience pages (14)
| Path | Template | Journey | Key blocks | Status |
|---|---|---|---|---|
| `/` | default | Brand discovery (home) | hero, drop-badge, stats, product-grid, cards, community-cta | ✅ |
| `/products` | products | Product discovery (PLP) | breadcrumb, product-filter, product-grid | ✅ live faceting |
| `/search` | products | Faceted search | product-filter, product-grid | ✅ |
| `/drops` | default | Last drops | hero, drop-badge, product-grid, community-cta | ✅ |
| `/creators` | default | Creator programme | hero, columns, cards, community-cta | ✅ |
| `/about` | default | Brand connect (who/what/why) | hero, columns, stats, cards, quote, community-cta | ✅ |
| `/community` | default | Community | hero, cards, community-cta | ✅ |
| `/partners` | default | Sell with HYVR | hero, columns, cards, contact-form, community-cta | ✅ |
| `/support` | default | Help & support | hero, cards, contact-form | ✅ |
| `/contact` | default | Contact / lead | hero, contact-form | ✅ Resend loop |
| `/privacy` | default | Privacy & consent | hero, default content | ✅ |
| `/account` | default | Account (commerce placeholder) | hero | ✅ (G-BP1-4 note) |
| `/cart` | default | Cart (commerce placeholder) | hero | ✅ (G-BP1-4 note) |
| `/404` | default | Not found | default content | ✅ |

## Product detail pages (9 — complete PLP→PDP journey)
| Path | Source | Blocks | Status |
|---|---|---|---|
| `/product/aurora-x1` | **hand-authored showcase** | breadcrumb, product-hero, product-gallery, product-specs, comparison, community-cta | ✅ richest example |
| `/product/spectra-ar-glasses` · `/rift-runner-controllers` · `/nova-handheld` · `/photon-basestation` · `/echo-spatial-audio` · `/vertex-creator-kit` · `/pulse-treadmill` · `/glyph-smart-ring` | generated from `query-index.json` via `tools/gen-pages.mjs` | breadcrumb, product-hero, product-specs, community-cta | ✅ all 200 |

> Regenerate/extend PDPs: `node tools/gen-pages.mjs` (skips hand-authored pages). Add a product
> to `query-index.json` → run → a new PDP + PLP card appear. This is the demo-factory pattern
> applied within a vertical.

## Block library pages (15 — author instrumentation, both surfaces)
`/block-library/{hero,cards,columns,stats,quote,community-cta,drop-badge,breadcrumb,product-grid,product-filter,product-hero,product-specs,product-gallery,comparison,contact-form}` — one labelled, insertable example each; listed in `tools/sidekick/library.json`. Double as living block docs.

## Fragments & config (not pages)
`head.html`, `nav.plain.html`, `footer.plain.html`, `placeholders.json`, `component-{definition,models,filters}.json` (UE root models), `blocks/*/_*.json` (federated model fragments), `helix-query.yaml`, `helix-sitemap.yaml`, `fstab.yaml`, `robots.txt`, `tools/sidekick/*`, `tools/da/config.json`.

## Coverage snapshot
- **14** experience pages · **9** PDPs · **15** block-library pages · **19** blocks · **2** authoring surfaces instrumented (DA.live + AEMaaCS/UE) · **dark + light** themes · 14/14 unit tests pass.
