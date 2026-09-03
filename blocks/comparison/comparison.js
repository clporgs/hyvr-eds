/*
 * HYVR comparison — side-by-side spec comparison across products.
 * Author pattern: each row is a single cell containing a link to a product path.
 * The block resolves those against /query-index.json and renders a comparison table
 * of the shared, machine-readable spec columns.
 */
const COLS = [
  ['category', 'Category'], ['price', 'Price'], ['platform', 'Platform'],
  ['fov', 'Field of view'], ['refresh', 'Refresh rate'], ['resolution', 'Resolution'],
  ['rating', 'Rating'], ['availability', 'Availability'],
];

async function getProducts() {
  if (window.hyvrProducts) return window.hyvrProducts;
  const resp = await fetch('/query-index.json');
  const json = await resp.json();
  window.hyvrProducts = json.data || [];
  return window.hyvrProducts;
}

const val = (p, k) => {
  if (!p[k]) return '—';
  if (k === 'price') return `$${p[k]}`;
  if (k === 'fov' && p[k]) return `${p[k]}°`;
  if (k === 'refresh' && p[k]) return `${p[k]}Hz`;
  return p[k];
};

export default async function decorate(block) {
  const paths = [...block.querySelectorAll('a')].map((a) => new URL(a.href).pathname);
  const all = await getProducts();
  const items = paths.length
    ? paths.map((path) => all.find((p) => p.path === path)).filter(Boolean)
    : all.slice(0, 3);

  block.innerHTML = '';
  if (!items.length) return;
  const table = document.createElement('table');
  table.className = 'comparison-table';
  table.innerHTML = `
    <caption>Compare ${items.length} products</caption>
    <thead><tr><th scope="col">Spec</th>${items.map((p) => `<th scope="col"><a href="${p.path}">${p.title}</a></th>`).join('')}</tr></thead>
    <tbody>${COLS.map(([k, label]) => `<tr><th scope="row">${label}</th>${items.map((p) => `<td>${val(p, k)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  block.append(table);
}
