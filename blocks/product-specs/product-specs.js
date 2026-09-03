/*
 * HYVR product-specs — structured technical specifications.
 * Author pattern: rows of spec-name | spec-value (optionally grouped by a full-width
 * row acting as a group heading). Renders a semantic <dl>-style table in monospace
 * ("spec is content"), with each value carrying a data-spec attribute for machine parse.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const table = document.createElement('table');
  table.className = 'product-specs-table';
  const caption = document.createElement('caption');
  caption.textContent = 'Technical specifications';
  table.append(caption);
  const tbody = document.createElement('tbody');

  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 1) {
      const tr = document.createElement('tr');
      tr.className = 'product-specs-group';
      const th = document.createElement('th');
      th.setAttribute('colspan', '2'); th.setAttribute('scope', 'colgroup');
      th.textContent = cells[0].textContent.trim();
      tr.append(th); tbody.append(tr);
    } else if (cells.length >= 2) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.setAttribute('scope', 'row'); th.textContent = cells[0].textContent.trim();
      const td = document.createElement('td');
      td.textContent = cells[1].textContent.trim();
      td.dataset.spec = cells[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
      tr.append(th, td); tbody.append(tr);
    }
  });

  table.append(tbody);
  block.replaceChildren(table);
}
