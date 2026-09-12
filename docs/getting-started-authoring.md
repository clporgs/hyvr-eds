# Blueprint 1 — Getting Started (team rollout, demo & resume)

Everything a delivery team needs to run, demo, author, and extend the HYVR EDS reference on
**both** authoring surfaces. Pairs with [`information-architecture.md`](./information-architecture.md),
[`pages-as-built.md`](./pages-as-built.md), and the onboarding docs under `../../docs/onboarding/`.

## 1. Run it locally (2 minutes)
```bash
cd blueprint-1-eds-dalive
node tools/generate-placeholders.mjs      # brand SVGs (first run)
node ../design-system/scripts/build-tokens.mjs --out styles   # tokens
node tools/gen-models.mjs                  # UE component-*.json (root) + per-block fragments
node tools/gen-block-library.mjs           # Sidekick block Library + example pages
node tools/gen-pages.mjs                   # PDPs for every product in the index
node tools/server.mjs                      # http://localhost:3001
npm test                                   # 14/14
```
Or `aem up` once the repo is connected to Code Sync.

## 2. Demo script (~5 min, tells the whole story)
1. **Home** (`/`) — brand discovery; toggle **dark/light** (one governed token source).
2. **PLP** (`/products`) — type in search, pick a category chip, drag price → grid + count update live.
3. **PDP** (`/product/aurora-x1`) — buy box, gallery, spec table, comparison; note **Product JSON-LD** (AEO).
4. **Brand connect** (`/about`, `/partners`) — submit the **contact form** → shared Resend service.
5. **Reskin** — `node ../tools/demo-server.mjs terra` (:3003): the *same blocks* as a totally
   different brand (TERRA travel) — the multi-vertical demo-factory proof.
6. **Authoring** — open the Sidekick **Library**; insert a block; preview.

## 3. Author on both surfaces (same blocks, same delivery)
Blueprint 1 is instrumented for **both** EDS authoring models; pick per team/engagement.

### A. DA.live (document authoring)
- Content mounts via `fstab.yaml` (`content.da.live/<org>/hyvr-eds`).
- **Block Library**: Sidekick → **Library** lists the 15 blocks (from `tools/sidekick/library.json` → `/block-library/*`). Insert → fill → preview → publish.
- **Assets**: Sidekick → **Assets** (once `tools/da/config.json` → AEM Assets is wired; else DA uploads).
- Setup: [`../../docs/onboarding/da-live-library-and-assets.md`](../../docs/onboarding/da-live-library-and-assets.md).

### B. AEM as a Cloud Service + Universal Editor (crosswalk)
- Blocks are instrumented via the **root** `component-definition.json` / `component-models.json` /
  `component-filters.json` (aggregated from per-block `blocks/*/_*.json` by `tools/gen-models.mjs`).
- In UE, authors get the same block palette + per-block field forms; `moveInstrumentation`
  keeps in-context editing working through block decoration.
- Content models/templates deploy via Cloud Manager (see `../../docs/onboarding/runtime-onboarding-checklist.md` §B and the AEMaaCS notes).
- **Portability:** identical blocks/scripts/styles/tokens on both — switching surface is an
  `fstab`/content-source change, no front-end rewrite (runbook §3).

## 4. Extend it (common tasks)
| Task | How |
|---|---|
| Add a product | Add a row to `query-index.json` → `node tools/gen-pages.mjs` → PDP + PLP card appear |
| Add a block | Scaffold `blocks/<name>/<name>.{js,css}`; add its spec to `tools/gen-models.mjs` + example to `tools/gen-block-library.mjs`; rerun both |
| Rebrand / new vertical | New token pack + content under `demos/<vertical>/` → `node ../tools/make-demo.mjs <v>` (see demo factory) |
| Change microcopy voice | Edit `placeholders.json` (brand voice is data, not code) |
| Change brand look | Edit `design-system/tokens/tokens.json` → rebuild tokens (propagates to both blueprints) |

## 5. Resume / Definition of Done
- **Code-side [R]:** blocks, runtime, tokens, UE models (both surfaces), DA Library, pages,
  tests, CI, subtree-publish — all present and green (14/14).
- **To reach a live demo [A]:** finish the DA-side + Adobe steps in
  [`../../docs/onboarding/runtime-onboarding-checklist.md`](../../docs/onboarding/runtime-onboarding-checklist.md)
  §B (DA.live org + Library/Assets config + Tags + optional Assets tenant).
- **DoD for "demo-ready live":** `dev` mirror → Code Sync green → aem.live preview renders all
  journeys; Library + (optionally) Assets visible in DA; contact form sends; CWV/a11y gates green.
- Branch discipline: work on `dev`, promote `dev → stage → main` (never commit to `stage`/`main`).
