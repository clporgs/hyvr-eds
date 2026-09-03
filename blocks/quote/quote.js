/*
 * HYVR quote — testimonial / pull-quote with attribution and Review JSON-LD.
 * Author pattern: row 1 = quote text, row 2 = attribution (name, role).
 */
export default function decorate(block) {
  const rows = [...block.children];
  const text = rows[0]?.textContent?.trim() || '';
  const attribution = rows[1]?.textContent?.trim() || '';
  block.innerHTML = `
    <figure>
      <blockquote>${text}</blockquote>
      ${attribution ? `<figcaption>— ${attribution}</figcaption>` : ''}
    </figure>`;
}
