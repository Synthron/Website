// Bootstrap: initialises modules based on what the current page contains.

import { initNav } from './nav.js';
import { initTagFilter } from './projects.js';

function init() {
  initNav();
  document.querySelectorAll('[data-tag-filter]').forEach(initTagFilter);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
