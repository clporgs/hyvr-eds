/*
 * HYVR product-gallery — accessible media gallery for PDPs.
 * Each row's first image becomes a thumbnail; selecting it swaps the main view.
 * Fully keyboard-operable (arrow keys + roving tabindex) with a live region.
 */
export default function decorate(block) {
  const imgs = [...block.querySelectorAll('img')];
  block.innerHTML = '';
  if (!imgs.length) return;

  const main = document.createElement('div');
  main.className = 'gallery-main';
  const live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
  const mainImg = document.createElement('img');
  mainImg.src = imgs[0].src; mainImg.alt = imgs[0].alt || 'Product image 1';
  main.append(mainImg, live);

  const thumbs = document.createElement('div');
  thumbs.className = 'gallery-thumbs'; thumbs.setAttribute('role', 'tablist'); thumbs.setAttribute('aria-label', 'Product images');

  imgs.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.className = 'gallery-thumb'; btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.tabIndex = i === 0 ? 0 : -1;
    btn.innerHTML = `<img src="${img.src}" alt="" loading="lazy" />`;
    btn.addEventListener('click', () => select(i));
    thumbs.append(btn);
  });

  const buttons = [...thumbs.children];
  function select(i) {
    mainImg.src = imgs[i].src; mainImg.alt = imgs[i].alt || `Product image ${i + 1}`;
    buttons.forEach((b, j) => { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
    buttons[i].focus();
    live.textContent = `Image ${i + 1} of ${imgs.length}`;
  }
  thumbs.addEventListener('keydown', (e) => {
    const cur = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight') { e.preventDefault(); select((cur + 1) % buttons.length); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); select((cur - 1 + buttons.length) % buttons.length); }
  });

  block.append(main, thumbs);
}
