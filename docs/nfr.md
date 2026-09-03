# HYVR Non-Functional Requirements (NFR)

**Blueprint 1 — AEM Edge Delivery Services (EDS) + DA.live** · Covers Req 6.

Non-functional requirements expressed as **testable targets**. Each row states a target/threshold, how it is measured, and the CI/release gate that enforces it. "Status" notes what the reference implementation delivers today versus what needs provisioning (gap IDs `G-BP1-*`).

HYVR (pronounced "HIGH-ver") delivers over the aem.live edge with a **100/100 Lighthouse target** and a dark-first, token-governed UI.

---

## How EDS earns Core Web Vitals by default

EDS is fast because the architecture removes the usual causes of slow pages, not because of after-the-fact tuning:

- **Static, edge-served HTML/CSS/JS** from aem.live — no server render on the request path, cached at CDN edge close to users.
- **No framework/bundler tax.** 17 vanilla-JS blocks, no hydration, minimal JS shipped.
- **Three-phase loading** — `eager` (above-the-fold LCP content only), `lazy` (below-the-fold blocks/images), `delayed` (everything non-essential). This keeps the critical path tiny.
- **Consent-gated, delayed martech.** AEP Web SDK, Analytics, Target, Tags, and ECID load only in the delayed phase and only after consent, so third-party JS never competes with LCP/INP.
- **Governed design tokens** (`../../design-system`) ship as CSS custom properties — no runtime theming cost.
- **Reserved layout / typed images** keep CLS near zero.

Net effect: good CWV is the default state, and the gates below exist to prevent regressions rather than to chase a score.

---

## NFR matrix

| Dimension | Target / threshold | How measured | Gate | Status in reference impl |
|---|---|---|---|---|
| **Responsive web** | Fluid across breakpoints **600 / 900 / 1200 / 1600 px**; no horizontal scroll; touch targets intact at all sizes | Playwright viewport checks; manual/visual review | Playwright e2e | Implemented — blocks are responsive at all four breakpoints |
| **Performance — LCP** | **< 2.0 s** (lab, mobile) | Lighthouse CI | Lighthouse CI (`lighthouse:recommended`) | Met locally; enforced in CI against preview |
| **Performance — CLS** | **< 0.1** | Lighthouse CI | Lighthouse CI | Met (reserved layout, typed images) |
| **Performance — INP** | **< 200 ms** | Lighthouse CI / field where available | Lighthouse CI | Met (minimal, deferred JS) |
| **Performance — Lighthouse perf** | **≥ 95** (100/100 target) | Lighthouse CI | Lighthouse CI | Met locally; CI enforces |
| **Availability** | Edge/CDN delivery, target **99.95 %** uptime | aem.live edge SLA + synthetic monitoring | Post-publish synthetic (ops) | Inherited from aem.live edge; provisioning tracked **G-BP1-1** |
| **Security** | Security headers + CSP, no mixed content, HTTPS-only — see `security.md` | Header scan / Lighthouse best-practices | Lighthouse best-practices + security review | Baseline via edge; full headers/CSP per `security.md` |
| **Privacy** | Consent-gated martech; no tracking pre-consent; independent of accessibility | Load-sequence inspection; network trace before/after consent | PR review + e2e (no martech pre-consent) | Implemented — martech delayed & consent-gated; datastream provisioning **G-BP1-3** |
| **Accessibility (WCAG 2.2 AA)** | Contrast ≥ 4.5:1 (text) / 3:1 (large & UI); focus visible; **≥ 24×24 px** targets; full keyboard operability; `prefers-reduced-motion` honoured; landmarks present; `alt` on images; labels on controls; skip link | pa11y-ci + axe; keyboard walkthrough (Playwright) | **pa11y-ci WCAG 2.2 AA — 0 violations** | Implemented and gated |
| **SEO** | Semantic HTML; XML sitemap; canonical URLs; complete metadata; clean headings | Lighthouse SEO; sitemap validation | Lighthouse SEO (`lighthouse:recommended`) | Implemented (`helix-sitemap.yaml`, metadata, canonical) |
| **GEO** (generative engine optimization) | Structured, channel-neutral content; clean semantic HTML; `robots.txt` allowlist for GPTBot / PerplexityBot / ClaudeBot | Manual review; robots.txt assertion | PR review | Implemented — robots allowlist + structured content |
| **AEO** (answer engine optimization) | JSON-LD (Organization / Product / BreadcrumbList); Q&A-friendly structure; factual, typed product data in `/query-index.json` | JSON-LD validation; unit tests on index integrity | Unit tests + PR review | Implemented — JSON-LD emitted; index validated by unit tests |
| **Browser compatibility** | Evergreen browsers, **last 2 versions**; graceful degradation of parallax/animation on older engines | Playwright cross-browser; manual spot-check | Playwright e2e | Implemented — progressive enhancement; parallax/animation degrade gracefully |
| **Localization (i18n readiness)** | Locale folder routing (`/en`, `/de`, …); `placeholders.json` dictionary; `hreflang` alternates | Review; e2e for placeholder resolution | PR review | Ready — single default locale shipped; framework in place (see `content-model.md` §6) |
| **Analytics** | Event coverage for key journeys (page view, PLP filter, PDP view, add-to-cart/pre-order, newsletter) | Datastream inspection; event map review | PR review | Instrumentation designed; AEP datastream/Tags provisioning **G-BP1-3** |
| **Operational support** | Logging, synthetic monitoring, alerting, runbook — see `observability.md` | Ops tooling | Post-publish synthetic (ops) | Design documented in `observability.md`; live monitoring pending **G-BP1-1** |

---

## Status legend & open gaps

- **Implemented / Met** — present and verifiable in the reference implementation today.
- **Ready / Framework in place** — code supports it; content or config still to be added.
- **Pending provisioning** — depends on an external environment or account.

| Gap | Description | NFR dimensions affected |
|---|---|---|
| **G-BP1-1** | DA.live / aem.live provisioning | Availability, operational support |
| **G-BP1-2** | AEM Assets | Performance (managed images), SEO (image assets) |
| **G-BP1-3** | Tags / AEP datastream | Privacy, analytics, personalization |
| **G-BP1-4** | Commerce backend | Availability of live pricing/stock; analytics (transactions) |
| **G-BP1-5** | Playwright not vendored (`@playwright/test`) | Browser compatibility, responsive, e2e gates |

> Lighthouse CI and pa11y-ci run in CI **against the aem.live preview**. Node unit tests and the live DOM checks (see `test-strategy.md`) are reproducible locally today.
