#!/usr/bin/env node
/*
 * Universal Editor / crosswalk model pipeline (federated artefact model).
 * Single source of truth (SPEC below) → emits:
 *   - a per-block fragment  blocks/<b>/_<b>.json  (federated: the block's model lives with it)
 *   - aggregated ROOT files  component-definition.json / component-models.json / component-filters.json
 * UE (AEMaaCS crosswalk) AND UE-over-DA both read the ROOT files, so the same governed block
 * library instruments BOTH authoring surfaces. Run: node tools/gen-models.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rt = (name, value = '') => ({ component: 'text', name, label: name.replace(/(^|-)([a-z])/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase()), value });
const opt = (arr) => arr.map((v) => ({ name: v, value: v }));

// group | fields (UE model) | filters (allowed children for container blocks)
const SPEC = {
  // --- Brand & Content ---
  hero: { group: 'brand', fields: [
    { component: 'reference', name: 'image', label: 'Background image', multi: false },
    { component: 'text', name: 'imageAlt', label: 'Image alt text' },
    { component: 'richtext', name: 'text', label: 'Heading, copy & CTAs', valueType: 'string' }] },
  cards: { group: 'brand', container: true, fields: [
    { component: 'text', name: 'note', label: 'Add one card per row (image + heading + text)', readonly: true }], filters: ['text', 'image', 'button'] },
  columns: { group: 'brand', container: true, fields: [
    { component: 'text', name: 'note', label: 'One row; each cell becomes a column', readonly: true }], filters: ['text', 'image', 'button', 'hero', 'stats', 'quote'] },
  stats: { group: 'brand', container: true, fields: [
    { component: 'text', name: 'note', label: 'One row per stat: value | label', readonly: true }], filters: ['text'] },
  quote: { group: 'brand', fields: [
    { component: 'richtext', name: 'quote', label: 'Quote', required: true },
    { component: 'text', name: 'attribution', label: 'Attribution' }] },
  'community-cta': { group: 'brand', fields: [
    { component: 'richtext', name: 'text', label: 'Heading, copy & CTAs' }] },
  'contact-form': { group: 'brand', fields: [
    { component: 'select', name: 'kind', label: 'Form kind', value: 'contact', options: opt(['contact', 'lead', 'partner', 'support']) },
    { component: 'text', name: 'heading', label: 'Heading', value: 'Get in touch' },
    { component: 'text', name: 'cta', label: 'Button label', value: 'Send message' }] },
  breadcrumb: { group: 'brand', fields: [
    { component: 'text', name: 'note', label: 'Auto-derives from the URL if left empty', readonly: true }] },
  // --- Commerce ---
  'product-hero': { group: 'commerce', fields: [
    { component: 'reference', name: 'image', label: 'Product image' },
    { component: 'text', name: 'title', label: 'Product name', required: true },
    { component: 'text', name: 'category', label: 'Category · brand' },
    { component: 'number', name: 'price', label: 'Price' },
    { component: 'select', name: 'currency', label: 'Currency', value: 'USD', options: opt(['USD', 'EUR', 'GBP']) },
    { component: 'select', name: 'availability', label: 'Availability', value: 'InStock', options: [{ name: 'In stock', value: 'InStock' }, { name: 'Pre-order', value: 'PreOrder' }, { name: 'Sold out', value: 'OutOfStock' }] },
    { component: 'number', name: 'rating', label: 'Rating (0–5)' },
    { component: 'richtext', name: 'summary', label: 'Summary' }] },
  'product-specs': { group: 'commerce', container: true, fields: [
    { component: 'text', name: 'note', label: 'Single-cell row = group heading; two-cell row = name | value', readonly: true }], filters: ['text'] },
  'product-gallery': { group: 'commerce', container: true, fields: [
    { component: 'text', name: 'note', label: 'One image per row', readonly: true }], filters: ['image'] },
  'product-grid': { group: 'commerce', fields: [
    { component: 'text', name: 'category', label: 'Filter by category (optional)' },
    { component: 'text', name: 'tag', label: 'Filter by tag (optional)' },
    { component: 'number', name: 'limit', label: 'Max products (0 = all)', value: 0 }] },
  'product-filter': { group: 'commerce', fields: [
    { component: 'text', name: 'note', label: 'Facets generate from the product index', readonly: true }] },
  comparison: { group: 'commerce', container: true, fields: [
    { component: 'text', name: 'note', label: 'One product link per row', readonly: true }], filters: ['text'] },
  'drop-badge': { group: 'commerce', fields: [
    { component: 'text', name: 'headline', label: 'Drop headline' },
    { component: 'text', name: 'endsAt', label: 'Ends at (ISO 8601)' }] },
};

const GROUPS = { brand: 'HYVR — Brand & Content', commerce: 'HYVR — Commerce' };
const titleCase = (s) => s.replace(/(^|-)([a-z])/g, (_, sp, c) => (sp ? ' ' : '') + c.toUpperCase());

const definitionsByGroup = { brand: [], commerce: [] };
const models = [];
const filters = [];
const sectionChildren = [];

for (const [id, spec] of Object.entries(SPEC)) {
  const title = titleCase(id);
  const definition = {
    title,
    id,
    plugins: { xwalk: { page: { resourceType: 'core/franklin/components/block/v1/block', template: { name: title, model: id, ...(spec.container ? { filter: id } : {}) } } } },
  };
  const model = { id, fields: spec.fields || [] };
  const fragment = { group: GROUPS[spec.group], definitions: [definition], models: [model], filters: spec.filters ? [{ id, components: spec.filters }] : [] };

  // federated: write the block's own model fragment next to the block
  mkdirSync(join(root, 'blocks', id), { recursive: true });
  writeFileSync(join(root, 'blocks', id, `_${id}.json`), JSON.stringify(fragment, null, 2));

  definitionsByGroup[spec.group].push(definition);
  models.push(model);
  if (spec.filters) filters.push({ id, components: spec.filters });
  sectionChildren.push(id);
}

// aggregate → ROOT files (what Universal Editor / crosswalk reads)
const componentDefinition = { groups: Object.entries(definitionsByGroup).map(([g, comps]) => ({ title: GROUPS[g], id: `hyvr-${g}`, components: comps })) };
filters.unshift({ id: 'section', components: sectionChildren });

writeFileSync(join(root, 'component-definition.json'), JSON.stringify(componentDefinition, null, 2));
writeFileSync(join(root, 'component-models.json'), JSON.stringify(models, null, 2));
writeFileSync(join(root, 'component-filters.json'), JSON.stringify(filters, null, 2));

console.log(`✓ UE models built: ${models.length} blocks → root component-{definition,models,filters}.json + per-block _*.json fragments`);
