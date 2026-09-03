/*
 * HYVR header/navigation block.
 * Renders audience-appropriate navigation (NOT generic executive nav):
 *   - Brand lockup (logo)
 *   - Primary nav: Shop by category (AR / VR / Gaming), Drops, Creators, Community
 *   - Utility nav: Search, Account, Cart, Consent
 *   - Contextual mega-menu for "Shop" driven from authored nav content
 * Mobile-first: collapses to an accessible hamburger with focus trapping.
 * Content is authored in DA.live at /nav and served as /nav.plain.html.
 */
import { getMetadata, decorateIcons } from '../../scripts/aem.js';

const MQ = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const expanded = nav.querySelector('[aria-expanded="true"]');
    if (expanded) {
      expanded.setAttribute('aria-expanded', 'false');
      expanded.focus();
    } else {
      toggleMenu(nav, false);
      nav.querySelector('.nav-hamburger button').focus();
    }
  }
}

function toggleMenu(nav, forceExpanded = null) {
  const button = nav.querySelector('.nav-hamburger button');
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  document.body.style.overflowY = (expanded || MQ.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  if (!expanded) window.addEventListener('keydown', closeOnEscape);
  else window.removeEventListener('keydown', closeOnEscape);
}

export default async function decorate(block) {
  const navPath = getMetadata('nav') || '/nav';
  let html = '';
  try {
    const resp = await fetch(`${navPath}.plain.html`);
    if (resp.ok) html = await resp.text();
  } catch (e) { /* fall through to minimal nav */ }

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = html || '<div>HYVR</div><div><ul><li><a href="/products">Shop</a></li></ul></div><div></div>';

  const sections = ['brand', 'primary', 'tools'];
  [...nav.children].forEach((section, i) => { if (sections[i]) section.classList.add(`nav-${sections[i]}`); });

  // brand lockup -> link home
  const brand = nav.querySelector('.nav-brand');
  if (brand && !brand.querySelector('a')) {
    const a = document.createElement('a');
    a.href = '/'; a.setAttribute('aria-label', 'HYVR home');
    a.innerHTML = brand.innerHTML; brand.innerHTML = ''; brand.append(a);
  }

  // primary nav: turn top-level <li> with nested <ul> into disclosure mega-menus
  const primary = nav.querySelector('.nav-primary');
  if (primary) {
    primary.querySelectorAll(':scope ul > li').forEach((li) => {
      if (li.querySelector('ul')) {
        li.classList.add('nav-drop');
        const label = li.childNodes[0];
        const btn = document.createElement('button');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-haspopup', 'true');
        btn.textContent = (label.textContent || '').trim();
        label.replaceWith(btn);
        btn.addEventListener('click', () => {
          const open = btn.getAttribute('aria-expanded') === 'true';
          primary.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
          btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        });
      }
    });
  }

  // tools: mark search/account/cart for icon styling + wire consent link
  const tools = nav.querySelector('.nav-tools');
  if (tools) {
    tools.querySelectorAll('a').forEach((a) => {
      const t = a.textContent.toLowerCase();
      if (t.includes('search')) a.classList.add('tool-search');
      if (t.includes('account') || t.includes('sign')) a.classList.add('tool-account');
      if (t.includes('cart')) { a.classList.add('tool-cart'); a.dataset.count = '0'; }
      if (t.includes('consent') || t.includes('privacy')) {
        a.classList.add('tool-consent');
        a.addEventListener('click', (e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('hyvr:open-consent')); });
      }
    });
  }

  // theme toggle (added into the utility nav)
  if (tools) {
    const themeBtn = document.createElement('button');
    themeBtn.type = 'button';
    themeBtn.className = 'nav-theme-toggle';
    const sync = () => {
      const light = (window.hyvrCurrentTheme && window.hyvrCurrentTheme()) === 'light';
      themeBtn.setAttribute('aria-pressed', String(light));
      themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
      themeBtn.textContent = light ? '☾' : '☀';
    };
    themeBtn.addEventListener('click', () => { if (window.hyvrToggleTheme) window.hyvrToggleTheme(); sync(); });
    window.addEventListener('hyvr:theme', sync);
    sync();
    const toolsList = tools.querySelector('ul') || tools;
    const li = document.createElement('li');
    li.className = 'nav-theme-item';
    li.append(themeBtn);
    toolsList.append(li);
  }

  // hamburger
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span></button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  const onMedia = () => toggleMenu(nav, MQ.matches);
  MQ.addEventListener('change', onMedia);

  decorateIcons(nav);
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}
