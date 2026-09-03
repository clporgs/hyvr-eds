/*
 * HYVR — delayed phase (delayed.js)
 * Loads third-party / martech that must never affect Core Web Vitals:
 * Adobe Tags (Launch) which in turn bootstraps the AEP Web SDK (alloy), Adobe
 * Analytics, Adobe Target and the ECID identity service, gated on consent.
 */
import { loadScript, sampleRUM } from './aem.js';

/**
 * @param {string} tagsUrl Adobe Tags (Launch) embed script URL for the environment.
 * Consent is checked first; if the visitor has not granted analytics/personalization
 * consent, only the strictly-necessary datastream config is initialized.
 */
export default async function loadDelayed(tagsUrl) {
  try {
    const consent = window.__hyvrConsent || { analytics: false, personalization: false };
    if (!tagsUrl) return;
    await loadScript(tagsUrl, { async: 'true' });
    window.alloy('configure', {
      // datastreamId + orgId are injected per environment by Tags data elements.
      defaultConsent: consent.analytics ? 'in' : 'pending',
      clickCollectionEnabled: true,
    });
    if (consent.analytics) window.alloy('sendEvent', { xdm: { eventType: 'web.webpagedetails.pageViews' } });
    sampleRUM('martech-loaded');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('delayed martech load failed (non-blocking)', e);
  }
}
