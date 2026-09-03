/*
 * HYVR contact-form / lead-capture block.
 * Accessible form (name, email, optional company, message, consent) that POSTs JSON to
 * /api/contact, which is backed by the SHARED lead-capture service (Resend email).
 * Author config rows (label | value): kind (contact|lead|partner|support), heading, cta.
 * Progressive enhancement: validates client-side, announces errors, and never blocks on JS
 * for the label/markup (the <form> action is set so it degrades to a normal POST).
 */
import { readBlockConfig, pushToDataLayer, fetchPlaceholders } from '../../scripts/aem.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const ph = await fetchPlaceholders();
  const kind = (cfg.kind || 'contact').toLowerCase();
  const heading = cfg.heading || 'Get in touch';
  const cta = cfg.cta || 'Send message';
  const wantsCompany = kind === 'partner' || kind === 'lead';

  block.innerHTML = '';
  const form = document.createElement('form');
  form.className = 'contact-form-el';
  form.setAttribute('action', '/api/contact');
  form.setAttribute('method', 'post');
  form.setAttribute('novalidate', '');
  form.setAttribute('aria-describedby', 'cf-status');
  form.innerHTML = `
    <h2 class="contact-form-heading">${heading}</h2>
    <div class="cf-field">
      <label for="cf-name">Name</label>
      <input id="cf-name" name="name" type="text" autocomplete="name" required aria-required="true">
      <p class="cf-error" data-for="name" hidden></p>
    </div>
    <div class="cf-field">
      <label for="cf-email">Email</label>
      <input id="cf-email" name="email" type="email" autocomplete="email" required aria-required="true">
      <p class="cf-error" data-for="email" hidden></p>
    </div>
    ${wantsCompany ? `<div class="cf-field">
      <label for="cf-company">Company${kind === 'partner' ? '' : ' (optional)'}</label>
      <input id="cf-company" name="company" type="text" autocomplete="organization">
    </div>` : ''}
    <div class="cf-field">
      <label for="cf-message">Message</label>
      <textarea id="cf-message" name="message" rows="4" required aria-required="true"></textarea>
      <p class="cf-error" data-for="message" hidden></p>
    </div>
    <div class="cf-field cf-consent">
      <label><input id="cf-consent" name="consent" type="checkbox" required> I agree to be contacted about my enquiry and accept the <a href="/privacy">privacy policy</a>.</label>
      <p class="cf-error" data-for="consent" hidden></p>
    </div>
    <input type="text" name="hp" class="cf-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <input type="hidden" name="kind" value="${kind}">
    <button type="submit" class="button primary cf-submit">${cta}</button>
    <p id="cf-status" class="cf-status" role="status" aria-live="polite"></p>`;

  const showError = (name, msg) => {
    const el = form.querySelector(`.cf-error[data-for="${name}"]`);
    const input = form.querySelector(`[name="${name}"]`);
    if (el) { el.textContent = msg || ''; el.hidden = !msg; }
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  };

  const validate = () => {
    const data = Object.fromEntries(new FormData(form));
    const errors = {};
    if (!data.name || data.name.trim().length < 2) errors.name = 'Please enter your name.';
    if (!EMAIL_RE.test(data.email || '')) errors.email = 'Please enter a valid email.';
    if (!data.message || data.message.trim().length < 5) errors.message = 'Please add a short message.';
    if (!form.querySelector('#cf-consent').checked) errors.consent = 'Please accept to continue.';
    ['name', 'email', 'message', 'consent'].forEach((f) => showError(f, errors[f]));
    return { data, ok: Object.keys(errors).length === 0, errors };
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('#cf-status');
    const { data, ok, errors } = validate();
    if (!ok) {
      status.textContent = 'Please fix the highlighted fields.';
      form.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus();
      return;
    }
    const submit = form.querySelector('.cf-submit');
    submit.disabled = true; submit.textContent = 'Sending…';
    status.textContent = '';
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, consent: true, sourceUrl: window.location.pathname }),
      });
      const result = await resp.json();
      if (result.ok) {
        pushToDataLayer({ event: 'lead-submit', lead: { kind, email: data.email } });
        form.innerHTML = `<div class="cf-success" role="status"><h2>Thanks, ${data.name.split(' ')[0]}!${ph.leadEmoji ? ` ${ph.leadEmoji}` : ''}</h2><p>Your ${kind === 'partner' ? 'partnership enquiry' : 'message'} is on its way. We reply within one business day.</p></div>`;
      } else {
        status.textContent = 'Something went wrong sending your message. Please try again or email hello@hyvr.example.';
        submit.disabled = false; submit.textContent = cta;
      }
    } catch (err) {
      status.textContent = 'Network error — please try again.';
      submit.disabled = false; submit.textContent = cta;
    }
  });

  block.append(form);
}
