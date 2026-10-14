// Bootstrap: initialises modules based on what the current page contains.

import { initNav } from './nav.js';
import { initSite } from './site.js';
import { initProjectList, initProjectDetail } from './projects.js';

async function init() {
  initNav();
  // Await the site config so the brand name is set before the detail view
  // reads it to build the page title.
  await initSite();

  document.querySelectorAll('[data-projects]').forEach((container) => {
    initProjectList(container);
  });

  const detail = document.querySelector('[data-project-detail]');
  if (detail) initProjectDetail(detail);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
