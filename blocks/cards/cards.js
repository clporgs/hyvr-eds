/*
 * HYVR cards — generic content cards (features, editorial, "why HYVR"). Each row is a
 * card; first image (if any) is the media, remaining cells are body. Semantic <ul>/<li>.
 */
import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => {
    const pic = img.closest('picture');
    if (pic) pic.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '600' }]));
  });
  block.replaceChildren(ul);
}
