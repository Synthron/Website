// Loads data/site.json and fills in shared header/footer content
// (brand name, copyright, footer note, contact email) plus the {name}
// token in the page title and meta description. Runs on every page.
// Paths resolve from this module, so it works from any page depth.

const SITE_ROOT = new URL('../', import.meta.url);
const DATA_URL = new URL('data/site.json', SITE_ROOT);

function setText(nodes, value) {
  if (typeof value !== 'string' || value === '') return;
  nodes.forEach((node) => {
    node.textContent = value;
  });
}

function replaceToken(nodes, token, value) {
  if (typeof value !== 'string' || value === '') return;
  nodes.forEach((node) => {
    const current = node.textContent;
    if (current && current.includes(token)) {
      node.textContent = current.split(token).join(value);
    }
  });
}

export async function initSite() {
  let config;
  try {
    const response = await fetch(DATA_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    config = await response.json();
  } catch (error) {
    console.warn('Site config could not be loaded:', error);
    return;
  }

  const name = typeof config.name === 'string' ? config.name : '';

  // Brand name in the header.
  setText(document.querySelectorAll('[data-site-brand]'), name);

  // Footer copyright: "© {year} {name}".
  const year = typeof config.copyrightYear === 'number'
    ? config.copyrightYear
    : new Date().getFullYear();
  setText(document.querySelectorAll('[data-site-copyright]'), `© ${year}${name ? ` ${name}` : ''}`);

  // Footer note.
  setText(document.querySelectorAll('[data-site-note]'), config.footerNote);

  // Contact email (mailto link).
  if (typeof config.email === 'string' && config.email !== '') {
    document.querySelectorAll('[data-site-email]').forEach((node) => {
      node.href = `mailto:${config.email}`;
      node.textContent = config.email;
    });
  }

  // Page title and meta description use a {name} token.
  replaceToken(document.querySelectorAll('title'), '{name}', name);
  document.querySelectorAll('meta[name="description"]').forEach((meta) => {
    const content = meta.getAttribute('content');
    if (content && content.includes('{name}')) {
      meta.setAttribute('content', content.split('{name}').join(name));
    }
  });
}
