/*
 * HYVR — AEM Edge Delivery Services runtime (aem.js)
 * A faithful, functional port of the AEM boilerplate runtime library.
 * Provides block decoration, section handling, lazy/eager/delayed orchestration,
 * responsive image optimization, RUM sampling hooks, and the Web SDK / data-layer
 * event helpers HYVR blocks rely on. Kept dependency-free and framework-neutral so
 * the same code runs on aem.live in production and under a local static server for preview.
 */

/* eslint-disable no-use-before-define */

/**
 * Sampled Real User Monitoring (RUM). In production aem.live wires this to the
 * collection endpoint; locally it is a no-op that still exposes the API surface so
 * blocks can call sampleRUM('event', {...}) without guards.
 */
const RUM = { weight: 100, id: 'local', queue: [] };
export function sampleRUM(checkpoint, data = {}) {
  try {
    RUM.queue.push({ checkpoint, ...data, t: performance.now() });
    // Surface a custom event so the demo/observability layer can listen.
    window.dispatchEvent(new CustomEvent('hyvr:rum', { detail: { checkpoint, data } }));
  } catch (e) { /* never let telemetry break the page */ }
}

/**
 * Push an entry onto the Adobe Client Data Layer (ACDL) if present, else a stub.
 * This is the seam that AEP Web SDK / Tags consume — see docs/integrations.
 */
export function pushToDataLayer(event) {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push(event);
}

export function toClassName(name) {
  return typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}

export function toCamelCase(name) {
  return toClassName(name).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/** Read key/value config from a block's rows (two-column table pattern). */
export function readBlockConfig(block) {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    if (row.children) {
      const cols = [...row.children];
      if (cols[1]) {
        const col = cols[1];
        const name = toClassName(cols[0].textContent);
        let value = '';
        if (col.querySelector('a')) {
          const as = [...col.querySelectorAll('a')];
          value = as.length === 1 ? as[0].href : as.map((a) => a.href);
        } else if (col.querySelector('img')) {
          const imgs = [...col.querySelectorAll('img')];
          value = imgs.length === 1 ? imgs[0].src : imgs.map((i) => i.src);
        } else if (col.querySelector('p')) {
          const ps = [...col.querySelectorAll('p')];
          value = ps.length === 1 ? ps[0].textContent : ps.map((p) => p.textContent);
        } else value = row.children[1].textContent;
        config[name] = value;
      }
    }
  });
  return config;
}

export function loadCSS(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`head > link[href="${href}"]`)) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.append(link);
  });
}

export async function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`head > script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

/** Placeholders: localized string dictionary fetched from /<prefix>/placeholders.json */
const placeholders = {};
export async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  if (!window.placeholders[prefix]) {
    window.placeholders[prefix] = (async () => {
      try {
        const resp = await fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`);
        const json = await resp.json();
        const out = {};
        json.data.filter((p) => p.Key).forEach((p) => { out[toCamelCase(p.Key)] = p.Text; });
        placeholders[prefix] = out;
        return out;
      } catch (e) { return {}; }
    })();
  }
  return window.placeholders[prefix];
}

/**
 * Responsive, art-directed <picture> with WebP + fallback and lazy/eager control.
 * This is why EDS hits its image performance targets out of the box.
 */
export function createOptimizedPicture(src, alt = '', eager = false, breakpoints = [
  { media: '(min-width: 900px)', width: '2000' },
  { width: '750' },
]) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
    }
  });
  return picture;
}

/** Rewrite absolute-URL images that point at this origin into optimized pictures. */
export function decorateImages(main) {
  main.querySelectorAll('img').forEach((img) => {
    if (img.closest('picture')) return;
    const pic = createOptimizedPicture(img.src, img.alt, false);
    img.replaceWith(pic);
  });
}

export function decorateButtons(element) {
  element.querySelectorAll('a').forEach((a) => {
    a.title = a.title || a.textContent;
    if (a.href === a.textContent) return;
    const up = a.parentElement;
    const twoup = a.parentElement.parentElement;
    if (a.querySelector('img')) return;
    if (up.childNodes.length === 1 && (up.tagName === 'P' || up.tagName === 'DIV')) {
      a.className = 'button';
      up.classList.add('button-container');
    }
    if (up.childNodes.length === 1 && up.tagName === 'STRONG'
      && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
      a.className = 'button primary';
      twoup.classList.add('button-container');
    }
    if (up.childNodes.length === 1 && up.tagName === 'EM'
      && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
      a.className = 'button secondary';
      twoup.classList.add('button-container');
    }
  });
}

export function decorateIcons(element) {
  element.querySelectorAll('span.icon').forEach((span) => {
    const name = Array.from(span.classList).find((c) => c.startsWith('icon-'))?.slice(5);
    if (!name) return;
    const img = document.createElement('img');
    img.dataset.iconName = name;
    img.src = `/icons/${name}.svg`;
    img.alt = '';
    img.loading = 'lazy';
    span.append(img);
  });
}

export function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = null;
    [...section.children].forEach((e) => {
      if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });
    wrappers.forEach((w) => section.append(w));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    // section metadata table -> classes / styles
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          toClassName(meta.style).split(' ').forEach((s) => section.classList.add(s));
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      sectionMeta.parentNode.remove();
    }
  });
}

export function updateSectionsStatus(main) {
  const sections = [...main.querySelectorAll(':scope > div.section')];
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const status = section.dataset.sectionStatus;
    if (status !== 'loaded') {
      const loadingBlock = section.querySelector('.block[data-block-status="initialized"], .block[data-block-status="loading"]');
      if (loadingBlock) { section.dataset.sectionStatus = 'loading'; break; }
      section.dataset.sectionStatus = 'loaded';
      section.style.display = null;
    }
  }
}

export function buildBlock(blockName, content) {
  const table = Array.isArray(content) ? content : [[content]];
  const blockEl = document.createElement('div');
  blockEl.classList.add(blockName);
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((col) => {
      const colEl = document.createElement('div');
      const vals = col.elems ? col.elems : [col];
      vals.forEach((val) => {
        if (val) colEl.append(val instanceof HTMLElement ? val : document.createTextNode(val));
      });
      rowEl.append(colEl);
    });
    blockEl.append(rowEl);
  });
  return blockEl;
}

/**
 * Move Universal Editor / crosswalk instrumentation attributes from one element to another.
 * Blocks that rebuild their DOM (e.g. cards, columns) must carry the `data-aue-*` /
 * `data-richtext-*` attributes onto the new nodes, or in-context UE editing breaks. Blocks
 * that decorate in place don't need this. No-op outside the editor (attributes absent).
 */
export function moveInstrumentation(from, to) {
  if (!from || !to) return;
  const attrs = [...from.attributes]
    .map(({ nodeName }) => nodeName)
    .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-'));
  attrs.forEach((attr) => {
    const v = from.getAttribute(attr);
    if (v) { to.setAttribute(attr, v); from.removeAttribute(attr); }
  });
}

export function decorateBlock(block) {
  const shortBlockName = block.classList[0];
  if (shortBlockName) {
    block.classList.add('block');
    block.dataset.blockName = shortBlockName;
    block.dataset.blockStatus = 'initialized';
    const blockWrapper = block.parentElement;
    if (blockWrapper) blockWrapper.classList.add(`${shortBlockName}-wrapper`);
    const section = block.closest('.section');
    if (section) section.classList.add(`${shortBlockName}-container`);
  }
}

export function decorateBlocks(main) {
  main.querySelectorAll('div.section > div > div').forEach(decorateBlock);
}

export async function loadBlock(block) {
  const status = block.dataset.blockStatus;
  if (status !== 'loading' && status !== 'loaded') {
    block.dataset.blockStatus = 'loading';
    const { blockName } = block.dataset;
    try {
      const cssLoaded = loadCSS(`/blocks/${blockName}/${blockName}.css`);
      const decorationComplete = new Promise((resolve) => {
        (async () => {
          try {
            const mod = await import(`/blocks/${blockName}/${blockName}.js`);
            if (mod.default) await mod.default(block);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`failed to load module for ${blockName}`, err);
          }
          resolve();
        })();
      });
      await Promise.all([cssLoaded, decorationComplete]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`failed to load block ${blockName}`, err);
    }
    block.dataset.blockStatus = 'loaded';
  }
  return block;
}

export async function loadSection(section, loadCallback) {
  const status = section.dataset.sectionStatus;
  if (!status || status === 'initialized') {
    section.dataset.sectionStatus = 'loading';
    const blocks = [...section.querySelectorAll('div.block')];
    for (let i = 0; i < blocks.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await loadBlock(blocks[i]);
    }
    if (loadCallback) await loadCallback(section);
    section.dataset.sectionStatus = 'loaded';
    section.style.display = null;
  }
  return section;
}

export async function loadSections(element) {
  const sections = [...element.querySelectorAll('div.section')];
  for (let i = 0; i < sections.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await loadSection(sections[i]);
    if (i === 0 && sampleRUM) sampleRUM('lcp');
  }
}

export function decorateTemplateAndTheme() {
  const addClasses = (el, classes) => {
    classes.split(',').forEach((c) => { if (c.trim()) el.classList.add(toClassName(c.trim())); });
  };
  const template = getMetadata('template');
  if (template) addClasses(document.body, template);
  const theme = getMetadata('theme');
  if (theme) addClasses(document.body, theme);
}

export function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  return [...doc.head.querySelectorAll(`meta[${attr}="${name}"]`)].map((m) => m.content).join(', ');
}

export function waitForFirstImage(section) {
  const lcpCandidate = section.querySelector('img');
  return new Promise((resolve) => {
    if (lcpCandidate && !lcpCandidate.complete) {
      lcpCandidate.addEventListener('load', resolve);
      lcpCandidate.addEventListener('error', resolve);
    } else resolve();
  });
}

export function loadHeader(header) {
  const block = buildBlock('header', '');
  header.append(block);
  decorateBlock(block);
  return loadBlock(block);
}

export function loadFooter(footer) {
  const block = buildBlock('footer', '');
  footer.append(block);
  decorateBlock(block);
  return loadBlock(block);
}

export function decorateMain(main) {
  decorateButtons(main);
  decorateIcons(main);
  decorateSections(main);
  decorateBlocks(main);
}

export function setup() {
  window.hlx = window.hlx || {};
  window.hlx.RUM_MASK_URL = 'full';
  window.hlx.codeBasePath = '';
  window.hlx.lighthouse = new URLSearchParams(window.location.search).get('lighthouse') === 'on';
}

setup();
