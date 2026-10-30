// Secondary page scaffold: creates a minimal page in every language
// folder with the shared head, header and footer, and optionally adds nav
// entries. Languages other than the default get TODO_<title> placeholders.
// Node built-ins only.
//
// Usage: npm run page -- "Title" [--title-<lang> "…"] [--nav|--footer] [--description "…"] [--dry-run]
//   --title-<lang>  title in another language (its file name follows the title;
//                   differing names are paired in data/pages.json)

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectionFolders, DATA_DIR, loadSetup, PAGES_FILE, readFolders, readPages, writeJson } from './lib/scaffold.mjs';
import { esc, slugify } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_FILE = path.join(DATA_DIR, 'nav.json');
const FOOTER_NAV_FILE = path.join(DATA_DIR, 'footer-nav.json');

const exists = (file) => access(file).then(() => true, () => false);

// Minimal template: shared head (CSP, title/description with {{name}},
// stylesheets, main.js), header, one h1, one prose section, footer.
function template(title, description, text) {
  return [
    '<!doctype html>',
    '<html lang="{{lang}}">',
    '<head>',
    '  <!-- @include head -->',
    `  <meta name="description" content="${esc(description)}">`,
    `  <title>${esc(title)} — {{name}}</title>`,
    '</head>',
    '<body>',
    '  <!-- @include header -->',
    '',
    '  <main class="site-main" id="main">',
    '    <div class="container">',
    '      <header class="page-header">',
    `        <h1>${esc(title)}</h1>`,
    '      </header>',
    '      <div class="prose">',
    `        <p>${esc(text)}</p>`,
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

// Positional title plus value flags (`--description`, `--title-<lang>`).
function parseArgs(argv, languages) {
  const valueFlags = new Set(['--description', ...languages.map((code) => `--title-${code}`)]);
  const values = {};
  let title;
  for (let i = 0; i < argv.length; i += 1) {
    if (valueFlags.has(argv[i])) values[argv[i]] = argv[++i];
    else if (!argv[i].startsWith('--') && title === undefined) title = argv[i];
  }
  return { title, values };
}

async function main() {
  const argv = process.argv.slice(2);
  const { languages, defaultLang } = await loadSetup();
  const { title, values } = parseArgs(argv, languages);
  const wantsNav = argv.includes('--nav');
  const wantsFooter = argv.includes('--footer');
  const dryRun = argv.includes('--dry-run');

  if (!title) {
    console.error('Usage: npm run page -- "Title" [--title-<lang> "…"] [--nav|--footer] [--description "…"] [--dry-run]');
    process.exit(1);
  }

  // Keep the caller's spelling for the visible title/label; the slug only
  // determines the filename and URL. A language without its own title reuses
  // the default slug and shows TODO_<title>.
  const display = title.trim();
  const description = values['--description'] ?? `Informationen zur Seite „${display}“ von {{name}}.`;
  const slugDefault = slugify(display);
  const perLang = {};
  for (const code of languages) {
    const own = code === defaultLang ? display : values[`--title-${code}`]?.trim();
    const label = own || `TODO_${display}`;
    perLang[code] = { label, slug: own ? slugify(own) : slugDefault, own: Boolean(own) };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(perLang[code].slug)) {
      console.error(`Could not derive a valid slug from "${label}" (got "${perLang[code].slug}").`);
      process.exit(1);
    }
  }

  const folders = await readFolders();
  for (const code of languages) {
    if (collectionFolders(folders, code).includes(perLang[code].slug)) {
      console.error(`"${perLang[code].slug}" is a collection folder in wwwroot/${code}/ (data/folders.json); choose another title.`);
      process.exit(1);
    }
    if (await exists(path.join(ROOT, 'wwwroot', code, `${perLang[code].slug}.html`))) {
      console.error(`A page already exists at wwwroot/${code}/${perLang[code].slug}.html.`);
      process.exit(1);
    }
  }
  const names = new Set(languages.map((code) => perLang[code].slug));
  const group = names.size > 1 ? Object.fromEntries(languages.map((code) => [code, `${perLang[code].slug}.html`])) : null;
  const lists = [wantsNav && 'nav.json', wantsFooter && 'footer-nav.json'].filter(Boolean);

  if (dryRun) {
    console.log(`Dry run: would create ${languages.map((code) => `wwwroot/${code}/${perLang[code].slug}.html`).join(', ')}`
      + (group ? ' and pair them in pages.json' : '')
      + (lists.length > 0 ? ` and add the entries to: ${lists.join(', ')}` : '') + '.');
    return;
  }

  for (const code of languages) {
    const isDefault = code === defaultLang;
    const text = isDefault
      ? `Platzhaltertext. Beschreibung für „${display}“ hier einfügen.`
      : `TODO: translate wwwroot/${defaultLang}/${perLang[defaultLang].slug}.html.`;
    const file = path.join(ROOT, 'wwwroot', code, `${perLang[code].slug}.html`);
    await writeFile(file, template(perLang[code].label, isDefault ? description : `TODO_${description}`, text));
    console.log(`Created wwwroot/${code}/${perLang[code].slug}.html`);
  }

  if (group) await appendGroup(group);
  const entries = Object.fromEntries(languages.map((code) => [code, { label: perLang[code].label, href: `${perLang[code].slug}.html` }]));
  if (wantsNav) await appendEntries(NAV_FILE, entries, 'nav.json');
  if (wantsFooter) await appendEntries(FOOTER_NAV_FILE, entries, 'footer-nav.json');
  console.log('Next: add the page to the README outline, then run npm run build.');
}

async function appendGroup(group) {
  const pages = await readPages();
  pages.push(group);
  await writeJson(PAGES_FILE, pages);
  console.log('Paired the pages in data/pages.json.');
}

// `entries`: language -> { label, href }; nav files hold one array per language.
async function appendEntries(file, entries, label) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  for (const [code, entry] of Object.entries(entries)) {
    if (!Array.isArray(data[code])) throw new Error(`${label}: expected an array for "${code}"`);
    if (data[code].some((item) => item.href === entry.href || (item.label ?? '') === entry.label)) {
      console.log(`Skipped ${label} (${code}): "${entry.label}" is already listed.`);
      continue;
    }
    data[code].push(entry);
    console.log(`Added "${entry.label}" to ${label} (${code}).`);
  }
  await writeJson(file, data);
}

main().catch((error) => {
  console.error(`page failed: ${error.message}`);
  process.exit(1);
});
