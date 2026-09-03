/*
 * HYVR hero block — brand-discovery centerpiece with layered parallax depth.
 * Author pattern: first cell = background picture, second cell = heading + copy + CTAs.
 * Depth (design principle #1) is achieved with pointer-driven parallax that is fully
 * disabled under prefers-reduced-motion.
 */
export default function decorate(block) {
  block.classList.add('hero');
  const rows = [...block.children];
  const media = rows[0]?.querySelector('picture');
  const content = rows[1] || rows[0];

  block.innerHTML = '';
  const layerMedia = document.createElement('div');
  layerMedia.className = 'hero-media';
  if (media) layerMedia.append(media);

  const layerContent = document.createElement('div');
  layerContent.className = 'hero-content';
  layerContent.append(...content.children);

  const scrim = document.createElement('div');
  scrim.className = 'hero-scrim';

  block.append(layerMedia, scrim, layerContent);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduce.matches && media) {
    block.addEventListener('pointermove', (e) => {
      const r = block.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      layerMedia.style.transform = `scale(1.08) translate3d(${dx * -18}px, ${dy * -18}px, 0)`;
    });
    block.addEventListener('pointerleave', () => { layerMedia.style.transform = ''; });
  }
}
