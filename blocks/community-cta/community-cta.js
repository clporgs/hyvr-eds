/*
 * HYVR community-cta — brand-connect band ("how customers, partners & communities
 * connect"). Author pattern: heading + copy + one or more CTA links. Adds channel
 * icons and pushes engagement events to the data layer.
 */
import { decorateIcons, pushToDataLayer } from '../../scripts/aem.js';

export default function decorate(block) {
  block.classList.add('community-cta');
  decorateIcons(block);
  block.querySelectorAll('a.button').forEach((a) => {
    a.addEventListener('click', () => pushToDataLayer({ event: 'community-connect', channel: a.textContent.trim() }));
  });
}
