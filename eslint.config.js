// Flat ESLint config (v9). Airbnb-ish base kept dependency-light for portability.
export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', fetch: 'readonly', performance: 'readonly', IntersectionObserver: 'readonly', CustomEvent: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', FormData: 'readonly', Node: 'readonly', HTMLElement: 'readonly', matchMedia: 'readonly', requestAnimationFrame: 'readonly', Intl: 'readonly', console: 'readonly', process: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  { ignores: ['scripts/aem.js', 'styles/tokens.*', 'icons/**', 'node_modules/**'] },
];
