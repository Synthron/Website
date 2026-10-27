// ESLint flat config (npm run lint:js).

import js from '@eslint/js';
import globals from 'globals';

const shared = {
  'no-var': 'error',
  'prefer-const': 'error',
  eqeqeq: ['error', 'always'],
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
};

export default [
  {
    ignores: ['wwwroot/js/vendor/', 'wwwroot/assets/firmware/', 'node_modules/', 'dist/', 'test-results/', 'playwright-report/', '.lighthouseci/'],
  },
  js.configs.recommended,
  {
    files: ['wwwroot/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      ...shared,
      // AGENTS.md: no storage/cookies for tracking, no runtime fetch, no innerHTML.
      'no-restricted-globals': ['error',
        { name: 'localStorage', message: 'No storage APIs (AGENTS.md).' },
        { name: 'sessionStorage', message: 'No storage APIs (AGENTS.md).' },
        { name: 'indexedDB', message: 'No storage APIs (AGENTS.md).' },
        { name: 'fetch', message: 'Content is pre-rendered; browser scripts must not fetch.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'document', property: 'cookie', message: 'No cookies (AGENTS.md).' },
        { property: 'innerHTML', message: 'Use createElement/textContent instead.' },
        { property: 'outerHTML', message: 'Use createElement/textContent instead.' },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.js', '*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: shared,
  },
  {
    // Playwright callbacks passed to page.evaluate() run in the browser.
    files: ['scripts/e2e/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
