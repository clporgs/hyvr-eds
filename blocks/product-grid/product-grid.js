/*
 * HYVR product-grid — product discovery / PLP grid.
 * Loads the machine-consumable /query-index.json, renders cards via the shared
 * renderCard(), and re-renders in response to 'hyvr:filter' events from product-filter.
 * Block config (optional): category, limit, tag — to scope a curated/featured grid.
 */
import { readBlockConfig, sampleRUM } from '../../scripts/aem.js';
import { renderCard } from '../product-card/product-card.js';

let CACHE = null;
async function loadProducts() {
  if (CACHE) return CACHE;
  const resp = await fetch('/query-index.json');
  const json = await resp.json();
  CACHE = json.data || [];
  // expose for filter + comparison + search
  window.hyvrProducts = CACHE;
  window.dispatchEvent(new CustomEvent('hyvr:products-loaded', { detail: CACHE }));
  return CACHE;
}

function applyCriteria(items, c) {
  return items.filter((p) => {
    if (c.category && !(p.category || '').toLowerCase().includes(c.category.toLowerCase())) return false;
    if (c.tag && !(p.tags || '').includes(c.tag)) return false;
    if (c.platform && c.platform !== 'All' && p.platform !== c.platform) return false;
    if (c.availability && c.availability !== 'All' && p.availability !== c.availability) return false;
    if (c.maxPrice && Number(p.price || 0) > Number(c.maxPrice)) return false;
    if (c.q) {
      const hay = `${p.title} ${p.summary} ${p.tags} ${p.brand} ${p.category}`.toLowerCase();
      if (!hay.includes(c.q.toLowerCase())) return false;
    }
    return true;
  });
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.innerHTML = '';
  const status = document.createElement('p');
  status.className = 'product-grid-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const grid = document.createElement('div');
  grid.className = 'product-grid-items';
  block.append(status, grid);

  const base = { category: cfg.category, tag: cfg.tag, limit: Number(cfg.limit || 0) };
  const items = await loadProducts();

  const render = (criteria) => {
    let list = applyCriteria(items, { ...base, ...criteria });
    if (base.limit) list = list.slice(0, base.limit);
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<p class="product-grid-empty">No gear matches those filters yet. Try widening your search.</p>';
    } else {
      const frag = document.createDocumentFragment();
      list.forEach((p) => frag.append(renderCard(p)));
      grid.append(frag);
    }
    status.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    sampleRUM('product-grid-render', { count: list.length });
  };

  render({});
  window.addEventListener('hyvr:filter', (e) => render(e.detail || {}));
}
