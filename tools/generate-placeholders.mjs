#!/usr/bin/env node
/**
 * Generates on-brand placeholder SVGs (logo, UI icons, product art) into /icons.
 * Placeholder art stands in for AEM Assets-delivered imagery (documented gap G-BP1-2);
 * the geometry + palette are token-derived so the demo is visually coherent.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

const VOID = '#0A0A0F'; const VOLT = '#00E5A8'; const PULSE = '#B14BFF'; const SKY = '#4BB4FF'; const MIST = '#D6D6E4';
const w = (name, svg) => writeFileSync(join(iconsDir, `${name}.svg`), svg.trim() + '\n');

/* ---- logo: fractured hexagon prism ---- */
w('logo', `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="HYVR">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${PULSE}"/><stop offset=".5" stop-color="${SKY}"/><stop offset="1" stop-color="${VOLT}"/>
  </linearGradient></defs>
  <path d="M24 3 42 13.5v21L24 45 6 34.5v-21z" fill="none" stroke="url(#g)" stroke-width="2"/>
  <path d="M24 3 42 13.5 24 24 6 13.5z" fill="${PULSE}" opacity=".85"/>
  <path d="M42 13.5v21L24 24z" fill="${SKY}" opacity=".85"/>
  <path d="M6 13.5v21L24 24z" fill="${VOLT}" opacity=".85"/>
</svg>`);

/* ---- simple stroke UI icons ---- */
const ui = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${MIST}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
w('search', ui('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'));
w('cart', ui('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.3a2 2 0 0 0 2 1.7h8.2a2 2 0 0 0 2-1.6L23 7H6"/>'));
w('account', ui('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'));
w('discord', ui('<path d="M8 12h.01M16 12h.01M7 18c-2-1-3-4-3-8s2-6 5-7l1 2h4l1-2c3 1 5 3 5 7s-1 7-3 8"/>'));

/* ---- product placeholders: distinct geometric marks ---- */
const prod = (bg, shape) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img">
  <rect width="240" height="180" rx="14" fill="${VOID}"/>
  <rect width="240" height="180" rx="14" fill="${bg}" opacity=".14"/>
  ${shape}
</svg>`;
w('ph-aurora',  prod(PULSE, `<rect x="60" y="66" width="120" height="52" rx="26" fill="none" stroke="${VOLT}" stroke-width="3"/><circle cx="92" cy="92" r="14" fill="${VOLT}" opacity=".9"/><circle cx="148" cy="92" r="14" fill="${SKY}" opacity=".9"/>`));
w('ph-spectra', prod(SKY, `<rect x="52" y="80" width="60" height="30" rx="15" fill="none" stroke="${SKY}" stroke-width="3"/><rect x="128" y="80" width="60" height="30" rx="15" fill="none" stroke="${SKY}" stroke-width="3"/><line x1="112" y1="92" x2="128" y2="92" stroke="${MIST}" stroke-width="3"/>`));
w('ph-rift',    prod(VOLT, `<rect x="86" y="60" width="30" height="60" rx="15" fill="${VOLT}" opacity=".85"/><rect x="124" y="60" width="30" height="60" rx="15" fill="${PULSE}" opacity=".85"/>`));
w('ph-nova',    prod(VOLT, `<rect x="60" y="56" width="120" height="68" rx="12" fill="none" stroke="${VOLT}" stroke-width="3"/><circle cx="80" cy="90" r="8" fill="${PULSE}"/><circle cx="160" cy="90" r="8" fill="${SKY}"/>`));
w('ph-photon',  prod(SKY, `<circle cx="120" cy="90" r="34" fill="none" stroke="${SKY}" stroke-width="3"/><circle cx="120" cy="90" r="10" fill="${VOLT}"/>`));
w('ph-echo',    prod(PULSE, `<path d="M92 90a28 28 0 0 1 56 0" fill="none" stroke="${PULSE}" stroke-width="3"/><rect x="86" y="88" width="14" height="26" rx="7" fill="${VOLT}"/><rect x="140" y="88" width="14" height="26" rx="7" fill="${VOLT}"/>`));
w('ph-vertex',  prod(VOLT, `<path d="M120 56 156 118H84z" fill="none" stroke="${VOLT}" stroke-width="3"/><circle cx="120" cy="98" r="8" fill="${SKY}"/>`));
w('ph-pulse',   prod(SKY, `<ellipse cx="120" cy="96" rx="46" ry="20" fill="none" stroke="${SKY}" stroke-width="3"/><circle cx="120" cy="96" r="8" fill="${PULSE}"/>`));
w('ph-glyph',   prod(PULSE, `<circle cx="120" cy="90" r="24" fill="none" stroke="${PULSE}" stroke-width="6"/>`));
w('ph-generic', prod(VOLT, `<rect x="80" y="60" width="80" height="60" rx="10" fill="none" stroke="${VOLT}" stroke-width="3"/>`));

console.log('✓ placeholder SVGs generated →', iconsDir);
