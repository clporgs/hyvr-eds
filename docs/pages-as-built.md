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
| `/getting-started-for-authors` | default | Author guide — folder structure, block Library, drafting, preview/publish | hero, product-specs, cards, community-cta | ✅ |

## Product detail pages (9 — complete PLP→PDP journey)
| Path | Source | Blocks | Status |
|---|---|---|---|
| `/product/aurora-x1` | **hand-authored showcase** | breadcrumb, product-hero, product-gallery, product-specs, comparison, community-cta | ✅ richest example |
| `/product/spectra-ar-glasses` · `/rift-runner-controllers` · `/nova-handheld` · `/photon-basestation` · `/echo-spatial-audio` · `/vertex-creator-kit` · `/pulse-treadmill` · `/glyph-smart-ring` | generated from `query-index.json` via `tools/gen-pages.mjs` | breadcrumb, product-hero, product-specs, community-cta | ✅ all 200 |

> Regenerate/extend PDPs: `node tools/gen-pages.mjs` (skips hand-authored pages). Add a product
> to `query-index.json` → run → a new PDP + PLP card appear. This is the demo-factory pattern
> applied within a vertical.

## Block library pages (15 — author instrumentation, both surfaces; seeded as real DA docs)
`/block-library/{hero,cards,columns,stats,quote,community-cta,drop-badge,breadcrumb,product-grid,product-filter,product-hero,product-specs,product-gallery,comparison,contact-form}` — one labelled, insertable example each; listed in `tools/sidekick/library.json`. **Not code-served** — `fstab.yaml` mounts the whole root to DA, so these must exist (and are seeded) as real DA documents, same as any site page; see the onboarding design note's "Incident record #3".

## Author enablement (drafts + guide — 3 pages, excluded from search/sitemap where noted)
| Path | Purpose | In indices/sitemap? |
|---|---|---|
| `/getting-started-for-authors` | Author guide — first page to open | ✅ yes |
| `/drafts` | Drafts-folder landing page, explains the convention | ❌ excluded |
| `/drafts/starter-page` | Duplicable minimal template (hero + content + cards + CTA) | ❌ excluded |

## Fragments & config (not pages)
`head.html`, `nav.plain.html`, `footer.plain.html`, `placeholders.json`, `component-{definition,models,filters}.json` (UE root models), `blocks/*/_*.json` (federated model fragments), `helix-query.yaml` (products + pages indices), `helix-sitemap.yaml` (default + pages sitemaps), `fstab.yaml`, `robots.txt`, `tools/sidekick/*`, `tools/da/config.json`.

## Coverage snapshot
- **15** experience pages · **9** PDPs · **15** block-library pages (seeded) · **3** author-enablement pages (drafts + guide) · **19** blocks · **2** authoring surfaces instrumented (DA.live + AEMaaCS/UE) · **dark + light** themes · **43 docs seed to DA** (`node tools/seed-da.mjs`) · 27/27 unit tests pass.
