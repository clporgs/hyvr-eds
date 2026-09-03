# HYVR Blueprint 1 — Sample Test Results

Captured on the reference implementation running locally (Node v22.17.0, Windows).

## Unit tests — `npm test` (node:test)

```
$ npm test   # node --test tokens + content + lead
ok 1  - product index has data
ok 2  - every product has required machine-readable fields
ok 3  - availability values are valid schema.org states
ok 4  - prices are numeric strings
ok 5  - paths are unique
ok 6  - valid lead passes validation
ok 7  - invalid lead returns per-field errors
ok 8  - sendLead mocks when no API key is configured
ok 9  - honeypot submissions are silently dropped
ok 10 - sendLead calls Resend when a key is provided (injected fetch)
ok 11 - tokens.css exists and has HYVR custom properties
ok 12 - semantic aliases are fully resolved (no leftover DTCG {refs})
ok 13 - brand primary resolves to the volt hex
ok 14 - dark-first background resolves to voidblack
# tests 14
# pass 14
# fail 0
```

## Live DOM verification (in-browser, against `node tools/server.mjs`)

Verified via the browser automation harness against `http://localhost:3001`:

| Page | Check | Result |
|---|---|---|
| `/` (home) | All 6 sections `data-section-status="loaded"`; blocks: hero, drop-badge, stats, product-grid, cards, community-cta | ✅ |
| `/` | Featured grid renders 4 product cards from `/query-index.json` | ✅ (4 cards) |
| `/products` (PLP) | Filter form + 9 cards + 10 category chips; live count "9 products" | ✅ |
| `/products` | Search "handheld" → 1 result; category "AR Glasses" → Spectra; availability "PreOrder" → 2 results | ✅ |
| `/product/aurora-x1` (PDP) | product-hero price `$1,299`, availability badge, 4 key specs, 15 spec rows, 4 gallery thumbs, comparison 4×8 | ✅ |
| `/product/aurora-x1` | JSON-LD emitted: `Product` + `BreadcrumbList` | ✅ |
| `/about` (brand) | hero, columns (2-col), stats, cards (4), quote, community-cta all loaded; `Organization` JSON-LD | ✅ |
| stats counters | Parse/format verified for `250K+`, `1,200`, `40+`, `4.8` (thousands + decimals) | ✅ |
| **Theme (dark/light)** | Toggle flips `data-theme`; tokens swap (dark primary `#00E5A8` ↔ light `#0A6E52`); persists to localStorage; follows OS preference by default | ✅ |
| **Contact/lead form** | Partner form submit → `/api/contact` → shared Resend service → success UI "Thanks, Rae!"; invalid → per-field errors; honeypot dropped | ✅ |
| **Content pages** | All 10 previously-broken links now return 200: drops, creators, community, partners, support, privacy, contact, search, account, cart | ✅ |
| **Light-theme contrast** | primary 6.2:1, links 6.3:1, ink 15.8:1, muted 8.8:1, danger 5.6:1 — all ≥ WCAG 2.2 AA | ✅ |

## Quality gates (defined in `.github/workflows/ci.yaml`, run in CI)

| Gate | Tool | Threshold |
|---|---|---|
| Token drift | `git diff --exit-code styles/tokens.css` | must match generated source |
| JS lint | eslint | 0 errors |
| CSS lint | stylelint | 0 errors |
| Performance / SEO / best-practices | Lighthouse CI | `lighthouse:recommended` |
| Accessibility | pa11y-ci / axe | WCAG 2.2 AA, 0 violations |
| E2E smoke | Playwright (`test/e2e.spec.mjs`) | all pass |

> Lighthouse and pa11y run in CI against the preview; Playwright requires `@playwright/test`
> (documented gap G-BP1-5). The node unit tests and live DOM checks above are reproducible now.
