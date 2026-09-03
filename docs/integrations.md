# HYVR — Blueprint 1 Integration Contracts

**Blueprint:** AEM Edge Delivery Services (EDS) + DA.live
**Scope:** the concrete contracts between the HYVR EDS storefront and every external / cross-cutting system it integrates with.

All martech integrations load in the **delayed phase** and are **consent-gated** via `window.__hyvrConsent`. Nothing in this document runs on the Core Web Vitals critical path.

---

## 1. Integration Inventory

| System | Purpose | Mechanism | Phase | Consent-gated? | Gap ID |
|---|---|---|---|---|---|
| **DA.live** | Content + product master data authoring | Document authoring at `da.live/#/hyvr/hyvr-eds`; AEM Sidekick preview/publish | Author-time | n/a | G-BP1-1 |
| **aem.live pipeline** | Render docs → HTML; build indexes | `helix-query.yaml`, `helix-sitemap.yaml` | Build/edge | n/a | G-BP1-1 |
| **AEM Assets (DAM)** | Optimized responsive imagery | `createOptimizedPicture` WebP pipeline; URL rendition params | Eager/Lazy | No | G-BP1-2 |
| **Adobe Tags (Launch)** | Bootstrap Web SDK; map events → XDM | Tag container script loaded by `delayed.js` | Delayed | Yes | G-BP1-3 |
| **AEP Web SDK (alloy)** | Single edge transport to AEP | `alloy` command queue; `sendEvent` | Delayed | Yes | G-BP1-3 |
| **Adobe Analytics** | Measurement | Via alloy datastream forwarding | Delayed | Yes (analytics) | G-BP1-3 |
| **Adobe Target** | Personalization / experimentation | Via alloy `personalization` scope | Delayed | Yes (personalization) | G-BP1-3 |
| **ECID identity** | Cross-visit identity | Managed by alloy (ECID/FPID) | Delayed | Yes | G-BP1-3 |
| **Adobe Client Data Layer** | Event bus | `window.adobeDataLayer.push()` | All | Producer runs always; send gated | — |
| **CMP (Adobe / OneTrust)** | Consent state | `window.__hyvrConsent` | Eager→Delayed | n/a | — |
| **Commerce (cart/checkout)** | Fulfilment | Not yet integrated; `add-to-cart` event only | — | — | G-BP1-4 |

---

## 2. AEP Web SDK / Tags Integration

### 2.1 Load sequence

1. `scripts.js` runs `loadDelayed` (~3s after load / on idle) → calls `initExperienceCloud()`.
2. `initExperienceCloud()` reads `window.__hyvrConsent`. If neither `analytics` nor `personalization` is granted, it stops — no Adobe script loads.
3. If consent permits, `delayed.js` injects the **Adobe Tags (Launch)** container `<script>`.
4. Tags bootstraps the **Web SDK (alloy)** and configures it. `alloy` is a global command queue, so `push()`-style calls made before load are flushed once ready.
5. Tags replays `window.adobeDataLayer` history, mapping each event to XDM, and alloy emits `web-sdk-ready`.

### 2.2 alloy configuration (via Tags data elements)

alloy is configured by Tags — the storefront code never hard-codes IDs. Required configuration keys (supplied by **G-BP1-3**):

```js
// Configured inside the Tags container, not in repo code.
alloy("configure", {
  datastreamId: "<AEP_DATASTREAM_ID>",   // Tags data element
  orgId: "<IMS_ORG_ID>@AdobeOrg",         // Tags data element
  defaultConsent: "pending",              // hold events until __hyvrConsent resolves
  edgeDomain: "<edge-domain>"
});
```

### 2.3 The seam

- **`scripts.js → initExperienceCloud()`** is the single entry point. It is the only place the render pipeline references martech, keeping Zones 2 and 3 (see `architecture.md §7`) cleanly separated.
- **`delayed.js`** owns the actual container/alloy injection and the consent read. Swapping CMPs or tag containers is a `delayed.js`-local change.

---

## 3. Adobe Client Data Layer — Event Contract

All events are pushed to `window.adobeDataLayer` by `aem.js` (`pushToDataLayer`) or by blocks. Tags maps them to XDM. Every event carries a common envelope:

```jsonc
{
  "event": "<event-name>",
  "eventInfo": { "path": "/product/aurora-x1", "ts": 1756684800000 }
}
```

### 3.1 Event table

| Event | Trigger | Payload fields (type) | XDM mapping intent |
|---|---|---|---|
| `web-sdk-ready` | alloy finished bootstrapping | `sdkVersion` (string) | Diagnostic; not a commerce event |
| `page-view` | `loadLazy` | `page.path` (string), `page.title` (string), `page.type` (string: home\|plp\|pdp\|about\|404) | `web.webPageDetails.pageViews.value = 1` |
| `product-view` | PDP render / product-hero | `product.sku` (string), `product.name` (string), `product.category` (string), `product.platform` (string), `product.price` (number), `product.currency` (string) | `commerce.productViews.value = 1` + `productListItems[]` |
| `product-click` | product-card click on PLP | `product.sku` (string), `product.name` (string), `list.name` (string), `list.position` (number) | `commerce.productListOpens` + `productListItems[]` |
| `add-to-cart` | Add-to-cart control (event only; G-BP1-4) | `product.sku` (string), `product.name` (string), `product.price` (number), `product.currency` (string), `quantity` (number) | `commerce.productListAdds.value = 1` + `productListItems[]` |
| `community-connect` | `community-cta` interaction | `channel` (string: discord\|twitch\|newsletter), `source` (string) | `_hyvr.community.connect` (custom XDM field group) |

### 3.2 Concrete JSON examples

```json
// web-sdk-ready
{ "event": "web-sdk-ready", "sdkVersion": "2.x" }
```

```json
// page-view
{
  "event": "page-view",
  "page": { "path": "/product/aurora-x1", "title": "HYVR Aurora X1", "type": "pdp" }
}
```

```json
// product-view
{
  "event": "product-view",
  "product": {
    "sku": "aurora-x1",
    "name": "HYVR Aurora X1",
    "category": "headset",
    "platform": "standalone",
    "price": 499.00,
    "currency": "USD"
  }
}
```

```json
// product-click
{
  "event": "product-click",
  "product": { "sku": "aurora-x1", "name": "HYVR Aurora X1" },
  "list": { "name": "plp-grid", "position": 3 }
}
```

```json
// add-to-cart
{
  "event": "add-to-cart",
  "product": { "sku": "aurora-x1", "name": "HYVR Aurora X1", "price": 499.00, "currency": "USD" },
  "quantity": 1
}
```

```json
// community-connect
{ "event": "community-connect", "channel": "discord", "source": "community-cta" }
```

XDM `productListItems[]` entries derive from the `product` object, e.g. `{ "SKU": "aurora-x1", "name": "HYVR Aurora X1", "priceTotal": 499.00, "quantity": 1 }`.

---

## 4. Consent & Identity Contract

### 4.1 Consent shape

```js
window.__hyvrConsent = {
  analytics: true,        // gates Analytics + measurement events
  personalization: false  // gates Target personalization/experimentation
};
```

- Both keys are booleans set by the CMP (Adobe / OneTrust).
- Until the CMP resolves, `__hyvrConsent` is absent/pending and alloy's `defaultConsent` is `"pending"` — events queue but do not send.
- On grant, consent transitions **`pending → in`**; alloy flushes queued events. On decline, `defaultConsent` stays effectively `"out"` and nothing is sent.

### 4.2 Identity

- **ECID** is the Adobe cross-visit identifier, minted and managed by alloy once consent is `in`.
- Before ECID resolves (or if declined), alloy uses a first-party **FPID** as the seed; no third-party cookies are involved.
- No PII is placed in the data layer or in URLs; identity resolution is entirely alloy/AEP-side.

### 4.3 Gate logic

```
loadDelayed()
  -> initExperienceCloud()
     -> read window.__hyvrConsent
        analytics === true        -> allow page-view / product-* / add-to-cart send
        personalization === true  -> allow Target activity fetch
        neither                    -> do not load Tags/alloy at all
```

Consent is checked **before** any Adobe script loads and is re-honoured by alloy's `defaultConsent` for every subsequent `sendEvent`.

---

## 5. Analytics & Target

### 5.1 Adobe Analytics (measurement)

Measured via the data-layer events above, forwarded by the AEP datastream to Analytics:
- Page views by `page.type` (home / plp / pdp / about / 404).
- Product engagement funnel: `product-view` → `product-click` → `add-to-cart`.
- Community engagement: `community-connect` by `channel`.

### 5.2 Adobe Target (personalization / experimentation)

Because HYVR is static/edge-rendered with no framework hydration, Target runs **async and flicker-free**:

- Target activities are fetched by alloy in the **delayed phase**, so there is no synchronous, render-blocking Target library and therefore **no pre-hidden `<body>` and no flicker penalty on LCP**.
- Personalization is applied by blocks reacting to the alloy `personalization` decision *after* the eager LCP paint — the base (control) experience is what the CDN already served, so worst case a visitor sees the perfectly valid default.
- Experimentation (A/B) is expressed as Target activities keyed on ECID; allocation is server-side at the AEP edge, keeping the client payload minimal.

This trades a small post-load personalization swap for a guaranteed 100/100 LCP — a deliberate blueprint choice.

---

## 6. AEM Assets Contract

Imagery is delivered as optimized, responsive WebP through `createOptimizedPicture` (in `aem.js`), which emits a `<picture>` with multiple `<source>` breakpoints.

### 6.1 Rendition URL parameters

```
<asset-url>?width=750&format=webply&optimize=medium
```

| Param | Values | Meaning |
|---|---|---|
| `width` | integer px | Rendition width; one per responsive breakpoint |
| `format` | `webply` (WebP) | Output format |
| `optimize` | `low` \| `medium` \| `high` | Compression aggressiveness |

### 6.2 Responsive breakpoints

`createOptimizedPicture` generates sources at standard EDS breakpoints, e.g. widths `[750, 1024, 2000]`, with a `media="(min-width: 600px)"`-style split between the small (mobile) source and the larger desktop sources, and an `<img>` fallback carrying intrinsic `width`/`height` to protect CLS. Above-the-fold (LCP) images are eager with `fetchpriority="high"`; below-the-fold images are `loading="lazy"`.

DAM tenant provisioning is **G-BP1-2**.

---

## 7. Product Data Contract — `/query-index.json`

`helix-query.yaml` indexes product pages into `/query-index.json`, a machine-consumable feed read by the PLP (`/products`) and by answer engines.

### 7.1 Schema (columns)

| Column | Type | Description |
|---|---|---|
| `path` | string | Page path, e.g. `/product/aurora-x1` |
| `title` | string | Product display name |
| `image` | string | Primary optimized image URL |
| `category` | string | e.g. `headset`, `controller`, `accessory` |
| `platform` | string | e.g. `standalone`, `pc-vr`, `console` |
| `brand` | string | Brand / sub-brand |
| `price` | number | Numeric price |
| `currency` | string | ISO 4217, e.g. `USD` |
| `availability` | string | e.g. `in-stock`, `preorder`, `sold-out` |
| `rating` | number | Aggregate rating (0–5) |
| `fov` | string | Field of view spec |
| `refresh` | string | Refresh rate spec |
| `resolution` | string | Panel resolution spec |
| `tags` | string | Space/comma-delimited tags |
| `summary` | string | Short description (used by GEO/AEO + cards) |

### 7.2 How it is produced

`helix-query.yaml` defines an index whose `include` path scopes to `/product/**`, and whose `properties` map each column above to a source: a page **metadata** field (authored in DA.live front matter / metadata table) or an extracted DOM selector. On publish, the pipeline emits `/query-index.json` as an array of row objects plus offset/total for pagination.

### 7.3 Consumption

- **PLP** (`/products`): `product-filter` + `product-grid` fetch `/query-index.json`, build facets from `category` / `platform` / `availability`, and re-render on the live **`hyvr:filter`** `CustomEvent`.
- **AI / answer engines**: read the same feed for structured product knowledge.

Example row:

```json
{
  "path": "/product/aurora-x1",
  "title": "HYVR Aurora X1",
  "image": "/product/aurora-x1/hero.png?width=750&format=webply&optimize=medium",
  "category": "headset",
  "platform": "standalone",
  "brand": "HYVR",
  "price": 499.00,
  "currency": "USD",
  "availability": "in-stock",
  "rating": 4.6,
  "fov": "110°",
  "refresh": "120Hz",
  "resolution": "2160x2160 per eye",
  "tags": "vr flagship standalone",
  "summary": "HYVR's flagship standalone headset with pancake optics."
}
```

---

## 8. SEO / GEO / AEO Contract

### 8.1 JSON-LD (structured data)

Injected in the eager phase by `scripts.js` so it is present in the initial HTML:

| Type | Where | Purpose |
|---|---|---|
| `Organization` | All pages | Brand identity (HYVR) for search + answer engines |
| `Product` | PDP (`/product/*`) | Product schema (name, image, offers from `price`/`currency`/`availability`, `aggregateRating` from `rating`) |
| `BreadcrumbList` | PDP / deep pages | Mirrors the `breadcrumb` block for navigational context |

### 8.2 Sitemap

`helix-sitemap.yaml` generates `/sitemap.xml` from published pages, giving crawlers and answer engines a complete, current URL set.

### 8.3 Answer-engine allowlist (`robots.txt`)

`robots.txt` explicitly **allows** answer-engine crawlers for GEO/AEO reach:

```
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /
```

Combined with semantic HTML, JSON-LD, `/query-index.json`, and `sitemap.xml`, this makes HYVR content directly consumable by AI answer engines.

Live provisioning for the pipeline that emits these artefacts is **G-BP1-1**.

## 9. Lead capture & transactional email (Resend) — SHARED service

The `contact-form` block captures contact / lead / partner / support enquiries and posts
them to a serverless endpoint that sends email via **[Resend](https://resend.com)**. The
send logic lives in the framework-neutral module `shared/services/lead-capture/lead-capture.mjs`
and is **shared across both blueprints**:

| Environment | Endpoint host | Notes |
|---|---|---|
| Local preview | `POST /api/contact` in `tools/server.mjs` | Wraps the shared module; mocks send when `RESEND_API_KEY` is unset |
| Blueprint 1 (prod) | Edge/serverless function **or** an Adobe App Builder action at `/api/contact` | EDS is static, so forms POST to a function; reuse the same shared module |
| Blueprint 2 (prod) | Adobe App Builder action behind API Mesh | Same shared module — one implementation, two surfaces |

### 9.1 Request contract — `POST /api/contact`
```json
{
  "name": "Rae Ortega",
  "email": "rae@example.com",
  "company": "Studio Nova",          // optional (partner/lead)
  "message": "Interested in the Aurora X1 dev kit.",
  "consent": true,                    // required — explicit opt-in
  "kind": "lead",                     // contact | lead | partner | support
  "hp": "",                           // honeypot — must be empty
  "sourceUrl": "/creators"
}
```
### 9.2 Response contract
```json
{ "ok": true, "id": "re_..." }            // sent via Resend
{ "ok": true, "mocked": true }            // no API key configured (local/dev)
{ "ok": true, "spam": true }              // honeypot tripped — silently dropped
{ "ok": false, "error": "validation", "errors": { "email": "…" } }
{ "ok": false, "error": "resend_401", "detail": "…" }
```
### 9.3 Configuration (secrets — never in code)
`RESEND_API_KEY`, `HYVR_LEAD_TO`, `HYVR_LEAD_FROM`. Sender domain must be verified in
Resend (SPF/DKIM). Deploying the production action + secrets is gap **G-BP1-7**.

### 9.4 Security & privacy
Server-side validation mirrors the client; a honeypot field drops bots; consent is required;
no PII is placed in URLs; the enquiry email sets `reply_to` to the submitter. Leads may also
be forwarded to AEP as an XDM event for audience building (consent-gated).

## 10. Additional Client Data Layer events (theme & lead)

These extend the event table in §3:

| Event | When | Payload | XDM / analytics intent |
|---|---|---|---|
| `theme-change` | User toggles dark/light | `{ event, theme: "dark"｜"light" }` | Custom prop — UI preference; personalization signal |
| `lead-submit` | Contact/lead form succeeds | `{ event, lead: { kind, email } }` | `commerce`/lead conversion event; audience membership |

```json
{ "event": "theme-change", "theme": "light" }
{ "event": "lead-submit", "lead": { "kind": "partner", "email": "rae@example.com" } }
```

## 11. Theme system (dark / light)

A single governed token source drives both themes (Requirement 7). The build
(`design-system/scripts/build-tokens.mjs`) emits dark as the default in `:root`, a
`[data-theme="light"]` block, and a `@media (prefers-color-scheme: light)` block so the site
follows the OS preference until the visitor makes an explicit choice. The header toggle
(`window.hyvrToggleTheme()`) sets `data-theme` on `<html>`, persists to `localStorage`
(`hyvr-theme`), and emits `theme-change`. All light-mode foreground/background pairs are
verified ≥ WCAG 2.2 AA (primary `#0A6E52` 6.2:1, links `#0A5FB8` 6.3:1). Because the swap
is entirely token-level, **both blueprints inherit theming for free** by consuming the same
`tokens.css` / `tokens.js`.
