/*
 * HYVR breadcrumb — accessible breadcrumb trail with BreadcrumbList JSON-LD.
 * If authored empty, it derives the trail from the URL path; authors may override
 * by providing rows of label | link.
 */
export default function decorate(block) {
  let crumbs = [...block.children].map((row) => {
    const label = row.children[0]?.textContent?.trim();
    const href = row.querySelector('a')?.getAttribute('href') || row.children[1]?.textContent?.trim();
    return label ? { label, href } : null;
  }).filter(Boolean);

  if (!crumbs.length) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    crumbs = [{ label: 'Home', href: '/' }];
    let acc = '';
    parts.forEach((part, i) => {
      acc += `/${part}`;
      crumbs.push({ label: part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), href: i < parts.length - 1 ? acc : null });
    });
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');
  crumbs.forEach((c, i) => {
    const li = document.createElement('li');
    if (c.href && i < crumbs.length - 1) li.innerHTML = `<a href="${c.href}">${c.label}</a>`;
    else { li.textContent = c.label; li.setAttribute('aria-current', 'page'); }
    ol.append(li);
  });
  nav.append(ol);
  block.replaceChildren(nav);

  const ld = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: c.href ? new URL(c.href, window.location.origin).href : undefined })),
  };
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld);
  document.head.append(s);
}
