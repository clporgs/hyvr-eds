# Blueprint 1 — Gap, Risk, Cost, Dependency & Assumption Log

> Per the engagement mandate: where a fully executable implementation cannot be produced
> in this environment, the exact **gap, reason, owner, prerequisite, and next action** are
> named here rather than silently substituted with generic guidance.

## 1. Gap register (what needs Adobe entitlements / provisioning to go live)

| ID | Gap | Why it can't be executed here | Owner | Prerequisite | Next action |
|---|---|---|---|---|---|
| **G-BP1-1** | Live content pipeline: DA.live org + aem.live (Helix) code sync + `*.aem.page`/`*.aem.live` hosts | Requires an Adobe IMS org, DA.live tenant, and the aem.live GitHub App connected to the code repo — none available in a local sandbox | Platform/Adobe admin | Adobe org + DA.live entitlement; connect GitHub repo to aem.live; configure `fstab.yaml` mountpoint | Raise Adobe provisioning request; install aem.live GitHub App; verify `aem up` against the live mount |
| **G-BP1-2** | AEM Assets (DAM) delivery of production imagery | No DAM tenant; placeholder SVGs generated locally instead | DAM/Content ops | AEM Assets as a Cloud Service (or Assets Essentials) tenant + delivery domain | Provision Assets; replace `/icons/ph-*.svg` with DAM URLs; keep the `?width=&format=webply` rendition contract |
| **G-BP1-3** | Adobe Tags (Launch) container + AEP datastream/org IDs for Web SDK | No Adobe Data Collection tenant; `initExperienceCloud()`/`delayed.js` are wired but load nothing until a real Tags URL is set | Martech/AEP admin | AEP sandbox, datastream, Tags property, ECID | Create datastream + Tags property; inject `adobe-tags-url` + datastream/org IDs via env/metadata; validate events in Assurance |
| **G-BP1-4** | Commerce: cart, checkout, payment, inventory, order | Out of scope for the static delivery tier; PDP buy actions are stubbed and push data-layer events only | Commerce eng | Adobe Commerce (or a headless commerce API) + PCI-compliant checkout | Integrate a commerce backend or drop-in cart; wire `add-to-cart`/checkout to real APIs; **never** handle card data in the client |
| **G-BP1-5** | Playwright e2e execution | `@playwright/test` not vendored to keep the repo lean; spec is provided | QA eng | `npm i -D @playwright/test && npx playwright install` | Add Playwright to CI job; run `test/e2e.spec.mjs` against the preview |
| **G-BP1-6** | Self-hosted webfonts (Space Grotesk / Inter / Space Mono WOFF2) | Font binaries not shipped; system-stack fallback is active | Design/eng | Licensed WOFF2 files | Add to `/fonts`, uncomment `@font-face` in `fonts.css`, verify no CLS |
| **G-BP1-7** | Production lead-capture endpoint + Resend delivery | Local `/api/contact` runs the shared service in mock mode; prod needs a deployed function + verified sender domain | Platform/martech | Deploy the edge/App Builder action; set `RESEND_API_KEY`/`HYVR_LEAD_TO`/`HYVR_LEAD_FROM`; verify SPF/DKIM in Resend | Deploy action, add secrets, send a live test, wire lead → AEP |

**Everything else is real and runs now:** the 19 blocks (incl. `contact-form`), the EDS
runtime, three-phase loading, **dark/light theming via the token pipeline**, the
**shared Resend lead-capture service** (validated end-to-end in mock mode), the design-token
pipeline, `/query-index.json` + faceted PLP, JSON-LD, the local preview server, the 9 passing
unit tests, and the CI gate definitions.

## 2. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Neon-on-dark palette fails contrast in some states | Med | High (a11y/legal) | Contrast baked into tokens; pa11y gate in CI blocks regressions |
| R2 | Third-party martech regresses Core Web Vitals | Med | High | All martech is consent-gated and loaded in the delayed phase; Lighthouse budget gate |
| R3 | Author error breaks a block's expected document structure | Med | Med | Blocks fail gracefully (try/catch in `loadBlock`); component-models constrain authoring; preview before publish |
| R4 | EDS is a poor fit for highly transactional app UIs | Med | Med | Keep commerce/app surfaces in Blueprint 2 (headless); EDS for brand/discovery — see comparison doc |
| R5 | Trademark/name clash for "HYVR" | Unknown | High | Fictional; clear before real use (A-BRAND-1) |
| R6 | Consent misconfiguration leaks pre-consent tracking | Low | High | Default consent `pending`; events send only after explicit `analytics` consent; verify in Assurance |
| R7 | Vendor lock-in to Adobe pipeline | Low | Med | Content is portable Markdown/HTML; code is framework-neutral vanilla JS; CI expressed for GitHub/GitLab/Azure |

## 3. Dependency log

| Dependency | Type | Needed for | Status |
|---|---|---|---|
| Adobe IMS org + entitlements (AEM EDS, Assets, AEP, Target, Tags) | External | G-BP1-1/2/3 | Not provisioned |
| DA.live tenant | External | Authoring | Not provisioned |
| GitHub repo + aem.live GitHub App | External | Code delivery | Repo local only |
| CDN (Adobe-managed; optional Fastly/Akamai/CloudFront) | External | Prod delivery, CSP/headers | N/A locally |
| Consent Management Platform (Adobe/OneTrust) | External | Privacy | Seam only (`window.__hyvrConsent`) |
| Node 22 + npm | Tooling | Build/test/serve | ✅ present |
| Design-system token package (`../design-system`) | Internal | Styling | ✅ consumed |

## 4. Assumption log

| ID | Assumption | Rationale | If wrong |
|---|---|---|---|
| A-BRAND-1 | HYVR name/logo are original & must be trademark-cleared | No brand supplied | Rebrand; tokens/logo are swappable |
| A-BP1-1 | English-first launch, locale routing added in Phase 5 | Startup MVP scope | Bring localization earlier |
| A-BP1-2 | Adobe-managed CDN is acceptable for launch | EDS default | Front with customer CDN for custom CSP/WAF |
| A-BP1-3 | Commerce arrives post-launch (Phase 4) | Buzz/D2C-presence launch goal first | Sequence commerce earlier via Blueprint 2 |
| A-BP1-4 | Analytics = Adobe Analytics via Web SDK (not GA) | Adobe-first mandate | Add GA/other via Tags |
| A-BP1-5 | Product data volume is catalogue-scale (thousands), not millions | Curated marketplace positioning | Introduce a search service (e.g. Algolia/AEM) beyond query-index scale |

## 5. Indicative cost model (annualized, order-of-magnitude — validate with Adobe)

| Item | Basis | Indicative range |
|---|---|---|
| AEM Edge Delivery Services | Adobe licensing (often bundled with AEM Sites CS) | License-dependent |
| AEM Assets (DAM) | Tenant | License-dependent |
| AEP + Web SDK + Target + Analytics | Data collection / audience volume | Usage/seat-based |
| CDN egress | Traffic | Low for static-first EDS (edge-cached HTML) |
| Engineering build (Phases 0–3) | ~2–4 engineers × ~8–12 weeks | Project-based |
| Run/operate | 1 platform + shared marketer/author time | Ongoing |

> EDS's static-first model keeps **run** cost low relative to a bespoke headless stack;
> the trade-off is Adobe platform licensing. See [../docs/01-blueprint-comparison/when-to-select.md](../../docs/01-blueprint-comparison/when-to-select.md).
