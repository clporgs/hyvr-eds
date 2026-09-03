/*
 * HYVR product-card. Exports renderCard() reused by product-grid & comparison, plus a
 * default decorator for standalone authored cards. Emits a semantic <article> with
 * microdata-friendly structure so cards are machine-consumable (Req 4).
 */
import { createOptimizedPicture, pushToDataLayer } from '../../scripts/aem.js';

const fmtPrice = (p, c = 'USD') => (p ? new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(Number(p)) : '');

const AVAIL_LABEL = { InStock: 'In stock', PreOrder: 'Pre-order', OutOfStock: 'Sold out' };

export function renderCard(p) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.dataset.category = p.category || '';
  article.dataset.platform = p.platform || '';
  article.dataset.availability = p.availability || '';
  article.dataset.price = p.price || '';
  article.setAttribute('itemscope', '');
  article.setAttribute('itemtype', 'https://schema.org/Product');

  const isDrop = (p.tags || '').includes('drop');
  const isNew = (p.tags || '').includes('new');

  const media = document.createElement('a');
  media.className = 'product-card-media'; media.href = p.path;
  const pic = p.image && p.image.endsWith('.svg')
    ? (() => { const i = document.createElement('img'); i.src = p.image; i.alt = ''; i.loading = 'lazy'; return i; })()
    : createOptimizedPicture(p.image || '/icons/ph-generic.svg', '', false, [{ width: '600' }]);
  media.append(pic);
  if (isDrop) media.insertAdjacentHTML('beforeend', '<span class="badge drop">Limited drop</span>');
  else if (isNew) media.insertAdjacentHTML('beforeend', '<span class="badge new">New</span>');

  const body = document.createElement('div');
  body.className = 'product-card-body';
  body.innerHTML = `
    <p class="product-card-cat">${p.category || ''}</p>
    <h3 class="product-card-title"><a href="${p.path}" itemprop="url"><span itemprop="name">${p.title}</span></a></h3>
    <p class="product-card-summary">${p.summary || ''}</p>
    <div class="product-card-meta">
      <span class="product-card-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
        <span itemprop="price" content="${p.price || ''}">${fmtPrice(p.price, p.currency)}</span>
      </span>
      ${p.rating ? `<span class="product-card-rating" aria-label="Rated ${p.rating} out of 5">★ ${p.rating}</span>` : ''}
      <span class="badge ${p.availability === 'InStock' ? 'new' : ''}">${AVAIL_LABEL[p.availability] || p.availability || ''}</span>
    </div>`;

  const cta = document.createElement('a');
  cta.className = 'button primary product-card-cta';
  cta.href = p.path;
  cta.textContent = p.availability === 'PreOrder' ? 'Pre-order' : 'View details';
  cta.addEventListener('click', () => pushToDataLayer({ event: 'product-click', product: { sku: p.path, name: p.title, price: p.price, category: p.category } }));
  body.append(cta);

  article.append(media, body);
  return article;
}

export default function decorate(block) {
  // Standalone authored card: rows are label/value pairs -> object
  const p = {};
  [...block.children].forEach((row) => {
    const k = row.children[0]?.textContent?.trim().toLowerCase();
    const v = row.children[1];
    if (!k || !v) return;
    if (k === 'image') p.image = v.querySelector('img')?.src || v.textContent.trim();
    else if (k === 'link' || k === 'path') p.path = v.querySelector('a')?.href || v.textContent.trim();
    else p[k] = v.textContent.trim();
  });
  block.replaceChildren(renderCard(p));
}
