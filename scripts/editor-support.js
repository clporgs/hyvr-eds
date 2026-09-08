/*
 * HYVR — Universal Editor in-context editing support.
 * Loaded by scripts.js ONLY when a UE connection meta is present (see head.html), so it adds
 * zero weight to the delivered page. It listens for the Universal Editor's aue:content-*
 * events and re-decorates the affected block/section in place, so authored edits render with
 * the real block code without a full reload. Works identically whether the content source is
 * AEM as a Cloud Service (crosswalk) OR DA.live — UE is source-agnostic; this is the front-end
 * half of the contract, paired with the root component-*.json models.
 */
import {
  decorateButtons, decorateIcons, decorateBlock, loadBlock, decorateSections, decorateBlocks, loadSections,
} from './aem.js';

async function reloadFallback() { window.location.reload(); }

/** Re-run the standard decoration pipeline on a freshly-inserted subtree. */
async function redecorate(container) {
  decorateButtons(container);
  decorateIcons(container);
  decorateSections(container);
  decorateBlocks(container);
  await loadSections(container);
}

async function applyChanges(event) {
  const { detail } = event;
  const resource = detail?.request?.target?.resource
    || detail?.request?.target?.container?.resource
    || detail?.request?.to?.container?.resource;
  if (!resource) return false;

  const updates = detail?.response?.updates || [];
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  const target = document.querySelector(`[data-aue-resource="${resource}"]`);
  if (!target) return false;

  const parsed = new DOMParser().parseFromString(content, 'text/html');
  const incoming = parsed.querySelector(`[data-aue-resource="${resource}"]`) || parsed.body.firstElementChild;
  if (!incoming) return false;

  // Block edit → replace the block element and re-run block decoration.
  const block = target.closest('.block');
  if (block) {
    const newBlock = incoming.classList?.contains('block') ? incoming : incoming.querySelector('.block') || incoming;
    block.replaceWith(newBlock);
    newBlock.dataset.blockStatus = 'initialized';
    decorateButtons(newBlock);
    decorateIcons(newBlock);
    decorateBlock(newBlock);
    await loadBlock(newBlock);
    return true;
  }

  // Section / default content edit → swap and re-decorate the container.
  const section = target.closest('.section') || target;
  section.replaceWith(incoming);
  await redecorate(incoming.closest('main') || incoming.parentElement || document.querySelector('main'));
  return true;
}

function attachEventListeners(main) {
  if (!main) return;
  ['aue:content-patch', 'aue:content-update', 'aue:content-add', 'aue:content-move', 'aue:content-remove', 'aue:content-copy']
    .forEach((type) => main.addEventListener(type, async (event) => {
      event.stopPropagation();
      const applied = await applyChanges(event).catch(() => false);
      if (!applied) reloadFallback();
    }));
}

attachEventListeners(document.querySelector('main'));
// eslint-disable-next-line no-console
console.debug('[hyvr] Universal Editor support active');
