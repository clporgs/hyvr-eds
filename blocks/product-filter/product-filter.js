/*
 * HYVR product-filter — accessible faceted search/filtering for product discovery.
 * Builds facets from the product index and broadcasts 'hyvr:filter' events consumed
 * by product-grid. Keyboard-operable, labelled, and announces result changes.
 */
async function getProducts() {
  if (window.hyvrProducts) return window.hyvrProducts;
  const resp = await fetch('/query-index.json');
  const json = await resp.json();
  window.hyvrProducts = json.data || [];
  return window.hyvrProducts;
}

const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();

export default async function decorate(block) {
  const products = await getProducts();
  const categories = uniq(products.map((p) => p.category));
  const platforms = ['All', ...uniq(products.map((p) => p.platform))];
  const avail = ['All', 'InStock', 'PreOrder'];
  const maxPrice = Math.max(...products.map((p) => Number(p.price || 0)));

  block.innerHTML = '';
  const form = document.createElement('form');
  form.className = 'product-filter-form';
  form.setAttribute('aria-label', 'Filter products');
  form.innerHTML = `
    <div class="pf-field pf-search">
      <label for="pf-q">Search gear</label>
      <input id="pf-q" name="q" type="search" placeholder="Search headsets, controllers…" autocomplete="off" />
    </div>
    <fieldset class="pf-field">
      <legend>Category</legend>
      <div class="pf-chips" role="group">
        <label class="pf-chip"><input type="radio" name="category" value="" checked /> All</label>
        ${categories.map((c) => `<label class="pf-chip"><input type="radio" name="category" value="${c}" /> ${c}</label>`).join('')}
      </div>
    </fieldset>
    <div class="pf-field">
      <label for="pf-platform">Platform</label>
      <select id="pf-platform" name="platform">${platforms.map((p) => `<option value="${p}">${p}</option>`).join('')}</select>
    </div>
    <div class="pf-field">
      <label for="pf-avail">Availability</label>
      <select id="pf-avail" name="availability">${avail.map((a) => `<option value="${a}">${a === 'All' ? 'All' : (a === 'InStock' ? 'In stock' : 'Pre-order')}</option>`).join('')}</select>
    </div>
    <div class="pf-field">
      <label for="pf-price">Max price: <output id="pf-price-out">$${maxPrice}</output></label>
      <input id="pf-price" name="maxPrice" type="range" min="0" max="${maxPrice}" step="50" value="${maxPrice}" />
    </div>
    <button type="reset" class="button secondary pf-reset">Reset filters</button>`;

  const emit = () => {
    const data = new FormData(form);
    window.dispatchEvent(new CustomEvent('hyvr:filter', {
      detail: {
        q: data.get('q') || '',
        category: data.get('category') || '',
        platform: data.get('platform') || 'All',
        availability: data.get('availability') || 'All',
        maxPrice: data.get('maxPrice') || maxPrice,
      },
    }));
  };

  form.addEventListener('input', (e) => {
    if (e.target.id === 'pf-price') form.querySelector('#pf-price-out').textContent = `$${e.target.value}`;
    emit();
  });
  form.addEventListener('change', emit);
  form.addEventListener('reset', () => { setTimeout(() => { form.querySelector('#pf-price-out').textContent = `$${maxPrice}`; emit(); }); });

  block.append(form);
}
