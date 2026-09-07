# Blueprint 1 — HYVR on AEM Edge Delivery Services + DA.live

> A **runnable** reference implementation. The blocks, runtime, styles, tokens, content
> index, tests and CI here are real and portable. Live Adobe cloud services are stubbed
> at documented seams (see [`docs/gap-log.md`](docs/gap-log.md)).

HYVR is a fictional D2C marketplace for AR/VR/gaming. This blueprint delivers its first
digital property on **AEM Edge Delivery Services** (aem.live / Project Helix) with
**DA.live** document authoring — the fastest path to a best-in-class-performance,
marketer-authorable, AI-discoverable D2C site.

## Why this stack
- **Time-to-market & performance:** static-first HTML at the edge, three-phase JS loading, and out-of-the-box image optimization target 100/100 Lighthouse.
- **Marketer autonomy:** authors work in documents (DA.live); engineers ship blocks in git. The two decouple cleanly.
- **AI/answer-engine ready:** semantic HTML, JSON-LD (Organization/Product/BreadcrumbList), a machine-consumable `/query-index.json`, and a `robots.txt` that welcomes answer engines.
- **Governed design system:** consumes the shared `--hyvr-*` tokens from [`../design-system`](../design-system) — brand changes propagate without editing this repo's CSS by hand.

## Run it locally
```bash
cd blueprint-1-eds-dalive
node tools/generate-placeholders.mjs   # on-brand SVG placeholders (first run only)
node ../design-system/scripts/build-tokens.mjs --out styles   # refresh tokens.css
node tools/server.mjs                  # http://localhost:3001
```
Then open:
- `http://localhost:3001/` — home / brand discovery
- `http://localhost:3001/products` — PLP with live faceted filtering
- `http://localhost:3001/product/aurora-x1` — PDP
- `http://localhost:3001/about` — brand story

Run the checks:
```bash
npm test           # 9 node unit tests (tokens + product-index integrity)
npm run lint       # eslint + stylelint
```
In production the same code runs on aem.live; content comes from DA.live instead of the
local `*.html` fixtures. `aem up` (AEM CLI, already a devDependency) serves against a
connected repo + DA.live mount.

## What's here
```
blueprint-1-eds-dalive/
├─ scripts/         aem.js (EDS runtime) · scripts.js (eager/lazy/delayed) · delayed.js (consent-gated martech)
├─ styles/          styles.css · tokens.css (generated) · fonts.css · lazy-styles.css
├─ blocks/          17 vanilla-JS blocks (see below)
├─ models/          component-definition/models/filters.json (DA.live / Universal Editor authoring model)
├─ icons/           generated on-brand SVGs (logo, UI, product placeholders)
├─ content/         sample authored content + query-index source
├─ tools/           server.mjs (local preview) · generate-placeholders.mjs · sidekick config
├─ test/            node unit tests + Playwright e2e spec + RESULTS.md
├─ .github/workflows/ ci.yaml (quality gates)
├─ *.html           runnable demo pages (home, products, product/aurora-x1, about, 404)
├─ fstab.yaml · helix-query.yaml · helix-sitemap.yaml · paths.json · head.html · robots.txt
└─ docs/            architecture · integrations · content-model · nfr · security-privacy
                    · observability · cicd · test-strategy · roadmap · gap-log
```

### Blocks (federated component catalogue — 19)
`header` · `footer` · `hero` · `product-card` · `product-grid` · `product-filter` ·
`product-hero` · `product-specs` · `product-gallery` · `comparison` · `community-cta` ·
`breadcrumb` · `drop-badge` · `stats` · `quote` · `cards` · `columns` · `fragment` ·
`contact-form`

### Capabilities added in review round 1
- **Dark / light theme** — governed through the token pipeline (dark default, light via `[data-theme]` + OS preference), header toggle, persisted; both blueprints inherit it.
- **No broken links** — 10 content pages (drops, creators, community, partners, support, privacy, contact, search, account, cart).
- **Contact / lead form with email** — `contact-form` block → `POST /api/contact` → the **shared** `shared/services/lead-capture` service → **Resend**. Reused by Blueprint 2. See [integrations.md §9](docs/integrations.md).

## Documentation
| Doc | Covers |
|---|---|
| [architecture.md](docs/architecture.md) | Logical & deployment views, runtime flow, boundaries, scaling/resilience |
| [integrations.md](docs/integrations.md) | AEP Web SDK/Tags/Analytics/Target/consent/identity/Assets contracts & event schema |
| [content-model.md](docs/content-model.md) | Channel-neutral content strategy, product model, localization, AI-discoverability |
| [nfr.md](docs/nfr.md) | Performance, a11y (WCAG 2.2 AA), SEO/GEO/AEO, browser support, availability targets |
| [security-privacy.md](docs/security-privacy.md) | Trust zones, CSP/headers, consent, identity, compliance readiness |
| [observability.md](docs/observability.md) | RUM, SLOs, dashboards, support/incident model |
| [cicd.md](docs/cicd.md) | Environments, pipelines, portable CI, rollback |
| [test-strategy.md](docs/test-strategy.md) | Test pyramid, quality gates, sample results |
| [roadmap.md](docs/roadmap.md) | Phased plan + Definition of Done |
| [gap-log.md](docs/gap-log.md) | Cost, risk, dependency, assumption & gap register (what needs Adobe provisioning) |

See the program root for the [brand identity](../docs/00-brand/brand-identity.md),
[when to choose which blueprint](../docs/01-blueprint-comparison/when-to-select.md),
and the [requirements-traceability matrix](../docs/requirements-traceability-matrix.md).