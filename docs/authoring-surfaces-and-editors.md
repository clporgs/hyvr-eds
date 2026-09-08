# Blueprint 1 — Authoring Surfaces × Editors (author's free choice)

**Confirmed:** Blueprint 1 is instrumented so an author freely chooses **both** the content
**surface** and the **editor**. The same blocks, models, styles, tokens and delivery underlie
every combination — nothing forks.

## The choice matrix
| Content source (surface) | Editor A | Editor B | Same blocks & delivery? |
|---|---|---|---|
| **DA.live** | **DA document authoring** (grid/doc UI) | **Universal Editor** (in-context visual) | ✅ identical |
| **AEM as a Cloud Service** | **Universal Editor** (in-context visual) | *(AEM classic authoring if ever needed)* | ✅ identical |

So a DA.live author can work in the **DA authoring context** *and* open the **same page in
Universal Editor** — their call, per task or preference.

## What makes each combination work (all shipped in this repo)
| Capability | Artefact |
|---|---|
| Block palette in **DA** | Sidekick block **Library** — `tools/sidekick/library.json` + `/block-library/*` |
| Block palette + field forms in **UE** | Root `component-definition.json` / `component-models.json` / `component-filters.json` (built from federated `blocks/*/_*.json` by `tools/gen-models.mjs`) |
| **UE in-context editing** (both surfaces) | `scripts/editor-support.js` (re-decorates on `aue:content-*` events) — loaded by `scripts.js` **only** when a UE connection meta is present |
| UE edits survive block decoration | `moveInstrumentation()` in `scripts/aem.js` (carries `data-aue-*` across DOM rebuilds) |
| Asset picking | DA: Sidekick **Assets** (`tools/da/config.json`) · UE/AEM: native AEM Assets |
| Same look on all | shared `--hyvr-*` tokens + `styles/*` + `blocks/*` |

## How UE attaches (the connection meta)
Universal Editor is **source-agnostic**: it loads the delivered page, reads a connection meta
from `<head>`, and persists edits back to whatever source that meta points at — AEM **or** DA.

- The meta is **injected by the content source per environment** (not hardcoded in the repo):
  - AEMaaCS: `urn:adobe:aue:system:aemconnection` → `aem:https://author-p…-e….adobeaemcloud.com`
  - DA.live: the same meta pointing at the DA source (`admin.da.live/source/<org>/<repo>` — confirm current DA scheme).
- When present, `scripts.js` lazy-loads `editor-support.js`. When absent, the page is pure
  delivery and DA authors simply use the DA document UI. See `head.html` for the exact block.

## Author journeys
- **DA doc author:** DA.live → edit the document/grid → Sidekick **Library** to insert blocks → **Preview/Publish**.
- **UE on DA content:** open the page in Universal Editor (via the DA/UE connection) → click a block → edit fields from the model → changes re-render in place via `editor-support.js`.
- **UE on AEMaaCS:** same UE experience; content persists to AEM Content Fragments/pages (crosswalk).

## Honest status / gap
The **code** for all combinations is in place and verified locally (models serve at root;
`editor-support.js` loads conditionally; `moveInstrumentation` applied). **Live UE editing
cannot be validated headless here** — it needs the provisioned Universal Editor service + a
connected source injecting the connection meta (gap **G-BP1-1**, and its AEMaaCS variant).
Once the source injects the meta, UE lights up on that surface with no code change.

## Verify (once provisioned)
1. DA.live: edit a doc in DA → publish → renders. ✅ DA context.
2. Open the same page in Universal Editor → edit a block inline → persists to DA. ✅ UE-over-DA.
3. AEMaaCS: author a page → Universal Editor → same blocks/fields. ✅ UE-over-AEM.
