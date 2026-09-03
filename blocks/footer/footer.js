/*
 * HYVR footer block. Content authored in DA.live at /footer, served as /footer.plain.html.
 * Provides brand-connect (who/what/why/how-to-connect), partner CTA, social, legal,
 * newsletter opt-in, and locale switcher.
 */
import { getMetadata, decorateIcons, fetchPlaceholders } from '../../scripts/aem.js';

export default async function decorate(block) {
  const footerPath = getMetadata('footer') || '/footer';
  let html = '';
  try {
    const resp = await fetch(`${footerPath}.plain.html`);
    if (resp.ok) html = await resp.text();
  } catch (e) { /* minimal fallback */ }

  const footer = document.createElement('div');
  footer.innerHTML = html || '<div><p>HYVR — Enter the Hyvr.</p></div>';
  footer.className = 'footer-inner';

  // newsletter form (progressive enhancement over an authored link/section)
  const news = footer.querySelector('.newsletter, [data-newsletter]') || footer;
  if (footer.querySelector('.newsletter')) {
    // Newsletter microcopy is placeholder-driven so the footer carries no hardcoded brand voice.
    const ph = await fetchPlaceholders();
    const form = document.createElement('form');
    form.className = 'newsletter-form';
    form.setAttribute('novalidate', '');
    form.innerHTML = `
      <label for="hyvr-news-email">${ph.newsletterHeading || 'Get updates in your inbox'}</label>
      <div class="newsletter-row">
        <input id="hyvr-news-email" name="email" type="email" required autocomplete="email"
               placeholder="you@domain.com" aria-describedby="hyvr-news-help" />
        <button class="button primary" type="submit">${ph.newsletterCta || 'Subscribe'}</button>
      </div>
      <p id="hyvr-news-help" class="newsletter-help">${ph.newsletterHelp || 'No spam. Unsubscribe anytime. We honour your consent choices.'}</p>`;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (!input.checkValidity()) { input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      // In production: POST to a consent-aware endpoint / AEP; here we confirm inline.
      form.innerHTML = `<p role="status" class="newsletter-ok">${ph.newsletterSuccess || "You're in. Thanks for subscribing."}</p>`;
    });
    news.append(form);
  }

  decorateIcons(footer);
  block.append(footer);
}
