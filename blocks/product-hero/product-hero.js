/*
 * HYVR product-hero (PDP). Author pattern: rows of label|value (image, title, price,
 * availability, rating, key specs, cta). Renders a two-column buy experience with a
 * media panel and an accessible buy box. Buy actions are stubbed (commerce integration
 * is documented gap G-BP1-4) but wired to the data layer for analytics.
 */
import { pushToDataLayer, getMetadata } from '../../scripts/aem.js';

const fmt = (p, c = 'USD') => (p ? new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(Number(p)) : '');

export default function decorate(block) {
  const data = {};
  [...block.children].forEach((row) => {
    const k = row.children[0]?.textContent?.trim().toLowerCase().replace(/\s+/g, '-');
    const cell = row.children[1];
    if (!k || !cell) return;
    if (k === 'image') data.image = cell.querySelector('img')?.src || cell.textContent.trim();
    else if (k === 'specs') data.specs = [...cell.querySelectorAll('li')].map((li) => li.textContent.trim());
    else data[k] = cell.textContent.trim();
  });
  // fall back to page metadata
  data.title = data.title || getMetadata('product-name') || document.title;
  data.price = data.price || getMetadata('price');
  data.availability = data.availability || getMetadata('availability') || 'InStock';

  block.innerHTML = '';
  const media = document.createElement('div');
  media.className = 'product-hero-media';
  media.innerHTML = `<img src="${data.image || '/icons/ph-generic.svg'}" alt="${data.title}" width="640" height="480" />`;

  const buy = document.createElement('div');
  buy.className = 'product-hero-buy';
  const inStock = (data.availability || '').toLowerCase().includes('instock') || data.availability === 'InStock';
  buy.innerHTML = `
    ${data.category ? `<p class="product-hero-cat">${data.category}</p>` : ''}
    <h1 class="product-hero-title">${data.title}</h1>
    ${data.rating ? `<p class="product-hero-rating"><span aria-hidden="true">★</span> ${data.rating} <span class="product-hero-reviews">(${data.reviews || '0'} reviews)</span></p>` : ''}
    <p class="product-hero-price">${fmt(data.price, data.currency)}</p>
    <p class="product-hero-avail badge ${inStock ? 'new' : 'drop'}">${inStock ? 'In stock — ships in 48h' : (data.availability === 'PreOrder' ? 'Pre-order' : 'Sold out')}</p>
    ${data.summary ? `<p class="product-hero-summary">${data.summary}</p>` : ''}
    ${Array.isArray(data.specs) && data.specs.length ? `<ul class="product-hero-keyspecs">${data.specs.slice(0, 4).map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
    <div class="product-hero-actions">
      <button class="button primary product-hero-add" ${inStock || data.availability === 'PreOrder' ? '' : 'disabled'}>
        ${data.availability === 'PreOrder' ? 'Pre-order now' : 'Add to cart'}
      </button>
      <button class="button secondary product-hero-wish" aria-label="Save ${data.title} to wishlist">♡ Save</button>
    </div>
    <p class="product-hero-reassure">Free 30-day returns · 2-year HYVR warranty · Carbon-neutral shipping</p>`;

  buy.querySelector('.product-hero-add').addEventListener('click', (e) => {
    pushToDataLayer({ event: 'add-to-cart', product: { name: data.title, price: data.price, category: data.category } });
    const b = e.currentTarget; const t = b.textContent; b.textContent = 'Added ✓'; b.disabled = true;
    setTimeout(() => { b.textContent = t; b.disabled = false; }, 1600);
  });

  block.append(media, buy);
  pushToDataLayer({ event: 'product-view', product: { name: data.title, price: data.price, category: data.category, availability: data.availability } });
}
