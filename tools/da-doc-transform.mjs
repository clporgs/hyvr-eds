/*
 * HYVR — HTML (delivery-shape) → DA document-source transform.
 *
 * ROOT CAUSE this fixes: DA (and EDS generally) authors a "block" in the source document as a
 * **table** — the block name in the first row, then one <tr> per row / <td> per cell — which the
 * delivery pipeline converts into the familiar <div class="blockname"><div><div>...</div></div>
 * </div> markup. Confirmed against Adobe's own docs (aem.live/developer/markup-sections-blocks):
 * "Authors can add blocks to their pages ... by simply adding a table with the block name in the
 * first row ... A block's content is rendered into the markup as nested <div> tags."
 *
 * Our earlier seed script fed DA the ALREADY-CONVERTED delivery-shape divs as if they were the
 * source — DA's document model doesn't recognize that as block authoring (its rich-text schema
 * has no concept of an arbitrary classed <div>), so nothing rendered as a block. This module
 * converts our delivery-shape HTML back into the table-based source shape DA actually expects.
 *
 * No DOM dependency: our own generated HTML is well-formed and structurally predictable (at most
 * section > block > row > cell nesting), so a small tag-depth scanner is sufent and dependency-free.
 */

const VOID = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);

/** Split an HTML fragment into its top-level child elements (direct children only). */
export function parseChildren(html) {
  const tagRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)(\/?)>/g;
  const children = [];
  let depth = 0;
  let start = -1;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    const [, closing, tag, , selfClose] = m;
    const isVoid = VOID.has(tag.toLowerCase()) || selfClose === '/';
    if (closing) {
      depth -= 1;
      if (depth === 0 && start > -1) {
        children.push(html.slice(start, tagRe.lastIndex));
        start = -1;
      }
    } else {
      if (depth === 0) start = m.index;
      if (!isVoid) depth += 1;
      else if (depth === 0) {
        children.push(html.slice(m.index, tagRe.lastIndex));
        start = -1;
      }
    }
  }
  return children.map((c) => c.trim()).filter(Boolean);
}

/** Parse one element string into { tag, className, inner, outer }. Non-tag text passes through. */
export function parseElement(outer) {
  const m = outer.match(/^<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*?)?)\/?>/);
  if (!m) return { tag: null, className: '', inner: outer, outer };
  const tag = m[1].toLowerCase();
  const classMatch = (m[2] || '').match(/class=["']([^"']*)["']/);
  const className = classMatch ? classMatch[1].trim() : '';
  if (VOID.has(tag)) return { tag, className, inner: '', outer };
  const closeTag = `</${tag}>`;
  const inner = outer.slice(m[0].length, outer.length - closeTag.length);
  return { tag, className, inner, outer };
}

export const titleCase = (name) => name.replace(/(^|-)([a-z])/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());

/** Build a DA source <table> for a block: header row (block name) + one <tr> per row-div, one <td> per cell-div. */
function blockToTable(className, blockInnerHtml) {
  const rows = parseChildren(blockInnerHtml).map(parseElement);
  const trs = rows.map((row) => {
    const cells = parseChildren(row.inner).map(parseElement);
    const tds = cells.length
      ? cells.map((cell) => `<td>${cell.inner}</td>`).join('')
      : `<td>${row.inner}</td>`; // row had no cell-divs (e.g. a single-cell config row) — keep its content
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<table><tr><td>${titleCase(className)}</td></tr>${trs}</table>`;
}

/** Transform one SECTION's inner HTML: block-classed children -> tables, everything else passes through. */
function transformSection(sectionInnerHtml, sectionOwnClassName) {
  const children = parseChildren(sectionInnerHtml).map(parseElement);
  let sawSectionMetadata = false;
  const parts = [];
  for (const child of children) {
    if (child.tag === 'div' && child.className && child.className !== 'default-content-wrapper') {
      if (child.className === 'section-metadata') sawSectionMetadata = true;
      parts.push(blockToTable(child.className, child.inner));
    } else if (child.tag === 'div') {
      // unnamed / default-content-wrapper div — unwrap, pass its content through verbatim
      parts.push(child.inner);
    } else {
      // a plain element (h1, p, ul, etc.) sitting directly in the section — pass through verbatim
      parts.push(child.outer);
    }
  }
  // A hardcoded section class (e.g. "dark"/"center"/"shop") that ISN'T backed by an authored
  // section-metadata block — synthesize one so the style survives the round trip to DA.
  if (sectionOwnClassName && !sawSectionMetadata) {
    parts.push(`<table><tr><td>Section Metadata</td></tr><tr><td>style</td><td>${sectionOwnClassName}</td></tr></table>`);
  }
  return parts.join('\n');
}

/**
 * Convert one page's delivered HTML into DA document-source HTML.
 * @param {string} html   full page HTML (or a .plain.html fragment)
 * @param {boolean} isFragment  true for nav.plain.html/footer.plain.html (no <main> wrapper)
 */
export function toDaSource(html, isFragment) {
  let bodyHtml;
  if (isFragment) {
    bodyHtml = html.trim();
  } else {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    bodyHtml = (mainMatch ? mainMatch[1] : html).trim();
  }

  const sections = parseChildren(bodyHtml).map(parseElement);
  const sectionHtml = sections
    .map((s) => transformSection(s.inner, s.className))
    .join('\n<hr>\n');

  // Page metadata -> a "Metadata" table (the standard EDS convention: Title, Description, then
  // whatever else the page declared) — same table-based authoring model as any other block.
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaPairs = [];
  if (titleMatch) metaPairs.push(['Title', titleMatch[1].trim()]);
  const metaTags = [...html.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/gi)]
    .filter(([, k]) => /^(description|template|og:|product-|sku|price|currency|availability|category)/i.test(k));
  for (const [, k, v] of metaTags) metaPairs.push([k, v]);
  const metaTable = metaPairs.length
    ? `\n<hr>\n<table><tr><td>Metadata</td></tr>${metaPairs.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`
    : '';

  return `<body>\n${sectionHtml}${metaTable}\n</body>\n`;
}

export default toDaSource;
