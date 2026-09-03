/*
 * HYVR fragment — includes a reusable content fragment authored elsewhere in DA.live
 * (the EDS equivalent of an experience fragment: shared promo bands, legal, CTAs).
 * Fetches <path>.plain.html, decorates it as main content, and inlines it.
 */
import { decorateMain, loadSections } from '../../scripts/aem.js';

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? new URL(link.href).pathname : block.textContent.trim();
  if (!path) return;
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) { block.remove(); return; }
    const html = await resp.text();
    const container = document.createElement('div');
    container.innerHTML = html;
    decorateMain(container);
    await loadSections(container);
    block.closest('.fragment-wrapper')?.replaceWith(...container.childNodes);
  } catch (e) {
    block.remove();
  }
}
