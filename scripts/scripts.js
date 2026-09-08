/*
 * HYVR — project entry (scripts.js)
 * Orchestrates the EDS three-phase load (eager → lazy → delayed), auto-blocks the
 * hero and PDP, injects JSON-LD for AI/answer-engine discoverability, and initializes
 * the Adobe Experience Platform Web SDK / consent / data-layer seam.
 */
import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  getMetadata,
  sampleRUM,
  pushToDataLayer,
} from './aem.js';

/**
 * Theme (dark default / light) — bootstrapped before the page is revealed so there is
 * no flash. Persists the user's explicit choice; otherwise the token layer follows the
 * OS `prefers-color-scheme`. window.hyvrToggleTheme() is called by the header toggle.
 */
function initTheme() {
  try {
    const stored = localStorage.getItem('hyvr-theme');
    if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored;
  } catch (e) { /* storage blocked — fall back to OS preference */ }
}
window.hyvrCurrentTheme = () => document.documentElement.dataset.theme
  || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
window.hyvrToggleTheme = () => {
  const next = window.hyvrCurrentTheme() === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('hyvr-theme', next); } catch (e) { /* ignore */ }
  window.dispatchEvent(new CustomEvent('hyvr:theme', { detail: next }));
  pushToDataLayer({ event: 'theme-change', theme: next });
  return next;
};
initTheme();

/**
 * Auto-block a hero from a leading H1 + picture, so authors get a hero without
 * needing to know block syntax (marketer autonomy — a core EDS benefit).
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // Skip if the H1 is already inside an authored block (e.g. an explicit hero).
  if (h1 && picture && !h1.closest('.block, [class]:not(.section)')
    && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture.closest('p') || picture, h1] }));
    main.prepend(section);
  }
}

/** On PDP templates, auto-assemble the product-hero from the frontmatter-style intro. */
function buildAutoBlocks(main) {
  try {
    if (getMetadata('template') === 'product') {
      // product pages carry their structured hero as the first section already
      return;
    }
    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('auto-blocking failed', error);
  }
}

/**
 * Emit JSON-LD structured data (Organization on brand pages, Product on PDPs).
 * This is the machine-consumable / answer-engine-optimization seam (Req 4 & 6).
 */
function injectJsonLd() {
  const template = getMetadata('template');
  let data;
  if (template === 'product') {
    data = {
      '@context': 'https://schema.org', '@type': 'Product',
      name: getMetadata('product-name') || document.title,
      brand: { '@type': 'Brand', name: 'HYVR' },
      sku: getMetadata('sku') || undefined,
      category: getMetadata('category') || undefined,
      description: getMetadata('description') || undefined,
      offers: getMetadata('price') ? {
        '@type': 'Offer', priceCurrency: getMetadata('currency') || 'USD',
        price: getMetadata('price'), availability: `https://schema.org/${getMetadata('availability') || 'InStock'}`,
      } : undefined,
    };
  } else {
    data = {
      '@context': 'https://schema.org', '@type': 'Organization', name: 'HYVR',
      slogan: 'Enter the Hyvr.', url: window.location.origin,
      description: 'A curated D2C marketplace for high-technology AR, VR, and gaming products.',
    };
  }
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data, (k, v) => (v === undefined ? undefined : v));
  document.head.append(script);
}

/**
 * Consent-gated Adobe Experience Platform Web SDK (alloy) initialization.
 * Loads Adobe Tags (Launch), which manages the Web SDK, Analytics, Target and
 * identity (ECID). Deferred to the delayed phase so it never blocks Core Web Vitals.
 * In production the datastreamId/orgId come from env; here they are placeholders and
 * the loader is a no-op unless a real Tags URL is configured (documented gap G-BP1-3).
 */
function initExperienceCloud() {
  window.alloy = window.alloy || function alloyQueue(...args) {
    (window.__alloyNS = window.__alloyNS || []).push(args);
  };
  pushToDataLayer({ event: 'web-sdk-ready', page: { name: document.title, template: getMetadata('template') || 'default' } });
  const tagsUrl = getMetadata('adobe-tags-url'); // set per-env; empty locally
  if (tagsUrl) {
    loadCSS('/styles/lazy-styles.css');
    import('./delayed.js').then((m) => m.default && m.default(tagsUrl));
  }
}

function loadEager(doc) {
  document.documentElement.lang = document.documentElement.lang || 'en';
  decorateTemplateAndTheme();
  injectJsonLd();
  const main = doc.querySelector('main');
  if (main) {
    buildAutoBlocks(main);
    decorateButtons(main);
    decorateIcons(main);
    decorateSections(main);
    decorateBlocks(main);
    document.body.classList.add('appear');
    const firstSection = main.querySelector('.section');
    if (firstSection) return loadSection(firstSection, waitForFirstImage).then(() => firstSection);
  }
  return Promise.resolve();
}

async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);
  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS('/styles/lazy-styles.css');
  sampleRUM('lazy');
  pushToDataLayer({ event: 'page-view', page: { name: document.title, path: window.location.pathname, template: getMetadata('template') || 'default' } });
}

function loadDelayed() {
  window.setTimeout(() => {
    initExperienceCloud();
    sampleRUM('delayed');
  }, 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

/**
 * Universal Editor: load in-context editing support ONLY when a UE connection meta is present
 * (injected by the content source — AEM crosswalk or DA.live). Zero cost on the delivered page.
 * This makes UE editing available on BOTH surfaces; the author picks surface AND editor freely.
 */
if (getMetadata('urn:adobe:aue:system:aemconnection')
  || getMetadata('urn:adobe:aue:system:daconnection')
  || getMetadata('urn:adobe:aue:system:connection')) {
  import('./editor-support.js');
}

loadPage();
