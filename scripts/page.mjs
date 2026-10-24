// Secondary page scaffold (D21): creates a minimal page in wwwroot/html/
// with the shared head, header and footer, and optionally adds a nav entry.
// Node built-ins only.
//
// Usage: npm run page -- "Title" [--nav|--footer] [--description "…"] [--dry-run]

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_DIR = path.join(ROOT, 'wwwroot', 'html');
const NAV_FILE = path.join(ROOT, 'wwwroot', 'data', 'nav.json');
const FOOTER_NAV_FILE = path.join(ROOT, 'wwwroot', 'data', 'footer-nav.json');

const URL_RE = /^https?:\/\//i;
const exists = (file) => access(file).then(() => true, () => false);

// "Über uns!" -> "ueber-uns" (transliterated, lowercase, hyphenated).
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// D21 minimal template: shared head (CSP, title/description with {{name}},
// stylesheets, main.js), header, one h1, one prose section, footer.
function template(title, description) {
  return [
    '<!doctype html>',
    '<html lang="{{lang}}">',
    '<head>',
    '  <!-- @include head -->',
    `  <meta name="description" content="${description}">`,
    `  <title>${title} — {{name}}</title>`,
    '</head>',
    '<body>',
    '  <!-- @include header -->',
    '',
    '  <main class="site-main" id="main">',
    '    <div class="container">',
    '      <header class="page-header">',
    `        <h1>${title}</h1>`,
    '      </header>',
    '      <div class="prose">',
    `        <p>Platzhaltertext. Beschreibung für „${title}“ hier einfügen.</p>`,
    '      </div>',
    '    </div>',
    '  </main>',
    '',
    '  <!-- @include footer -->',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const title = argv.find((arg) => !arg.startsWith('--'));
  const wantsNav = argv.includes('--nav');
  const wantsFooter = argv.includes('--footer');
  const dryRun = argv.includes('--dry-run');
  const descIndex = argv.indexOf('--description');
  const description = descIndex !== -1 ? argv[descIndex + 1] : `Informationen zur Seite „${title}“ von {{name}}.`;

  if (!title) {
    console.error('Usage: npm run page -- "Title" [--nav|--footer] [--description "…"] [--dry-run]');
    process.exit(1);
  }

  const slug = slugify(title);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error(`Could not derive a valid slug from "${title}" (got "${slug}").`);
    process.exit(1);
  }

  const file = path.join(HTML_DIR, `${slug}.html`);
  if (await exists(file)) {
    console.error(`A page already exists at wwwroot/html/${slug}.html.`);
    process.exit(1);
  }

  // Keep the caller's spelling for the visible title/label; the slug only
  // determines the filename and URL.
  const display = title.trim();
  const entry = { label: display, href: `html/${slug}.html` };

  if (dryRun) {
    console.log(`Dry run: would create wwwroot/html/${slug}.html` + (wantsNav || wantsFooter ? ` and add ${entry.label} to: ${[wantsNav && 'nav.json', wantsFooter && 'footer-nav.json'].filter(Boolean).join(', ')}` : '') + '.');
    return;
  }

  await writeFile(file, template(display, description));
  console.log(`Created wwwroot/html/${slug}.html`);

  if (wantsNav) await appendEntry(NAV_FILE, entry, 'nav.json');
  if (wantsFooter) await appendEntry(FOOTER_NAV_FILE, entry, 'footer-nav.json');
  console.log('Next: add the page to the README outline, then run npm run build.');
}

async function appendEntry(file, entry, label) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${label}: expected an array`);
  if (data.some((item) => item.href === entry.href || (item.label ?? '') === entry.label)) {
    console.log(`Skipped ${label}: "${entry.label}" is already listed.`);
    return;
  }
  data.push(entry);
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Added "${entry.label}" to ${label}.`);
}

main().catch((error) => {
  console.error(`page failed: ${error.message}`);
  process.exit(1);
});
