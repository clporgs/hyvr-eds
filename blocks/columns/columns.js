/*
 * HYVR columns — flexible multi-column layout (brand "what/why" sections). Adds a
 * modifier class based on the column count and flags image-only columns.
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);
  block.querySelectorAll(':scope > div > div').forEach((col) => {
    const pic = col.querySelector('picture');
    if (pic && pic.parentElement.childElementCount === 1) col.classList.add('columns-img-col');
  });
}
