// Project scaffold: creates a new project page from the master template in
// every language folder and registers the project in data/projects.json.
// Languages other than the default get "TODO" texts (the project stays hidden
// there until they are filled in). Node built-ins only.
//
// Usage: npm run create -- "Project Name" "One-sentence brief" [flags]
//   --tags a,b        comma-separated tags of the default language (lowercase, hyphenated)
//   --featured        mark the project as featured
//   --status <value>  one of the D10 enum values (default "in Arbeit")
//   --repo <url>      http(s) source repository URL
//   --dry-run         validate only, write nothing

import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATUS_VALUES } from './lib/data.mjs';
import { loadSetup, readPages, projectPagePath, writeJson } from './lib/scaffold.mjs';
import { slugify } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'wwwroot', 'templates', 'project-template.html');
const PROJECTS_FILE = path.join(ROOT, 'wwwroot', 'data', 'projects.json');

// Same id/tag rule the build enforces in scripts/build.mjs.
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_RE = /^https?:\/\//i;

const exists = (file) => access(file).then(() => true, () => false);

function currentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

// The master template opens with an instructional comment block that only
// belongs on the reference page; drop it from generated project pages.
const MASTER_COMMENT = /<!--\s*={10,}\s*MASTER PROJECT TEMPLATE[\s\S]*?-->\s*/;

// Minimal flag parser: `--name value` and boolean `--flag`. Unknown flags
// fail loudly so typos do not silently change the scaffold.
function parseArgs(argv) {
  const [name, brief] = argv;
  const options = { tags: [], featured: false, status: 'in Arbeit', repo: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tags') options.tags = (argv[++i] ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
    else if (arg === '--featured') options.featured = true;
    else if (arg === '--status') options.status = argv[++i] ?? '';
    else if (arg === '--repo') options.repo = argv[++i] ?? '';
    else if (arg === '--dry-run') options.dryRun = true;
  }
  return { name, brief, options };
}

async function main() {
  const { name, brief, options } = parseArgs(process.argv.slice(2));
  if (!name || !brief) {
    console.error('Usage: npm run create -- "Project Name" "One-sentence brief" [--tags a,b] [--featured] [--status <value>] [--repo <url>] [--dry-run]');
    process.exit(1);
  }
  if (!STATUS_VALUES.includes(options.status)) {
    console.error(`--status must be one of: ${STATUS_VALUES.join(', ')} (got "${options.status}")`);
    process.exit(1);
  }
  for (const tag of options.tags) {
    if (!ID_RE.test(tag)) {
      console.error(`Invalid tag "${tag}" (lowercase, hyphenated, no duplicates).`);
      process.exit(1);
    }
  }
  if (new Set(options.tags).size !== options.tags.length) {
    console.error('Duplicate tags are not allowed.');
    process.exit(1);
  }
  if (options.repo !== null && !URL_RE.test(options.repo)) {
    console.error(`--repo must be an http(s) URL (got "${options.repo}")`);
    process.exit(1);
  }

  const id = slugify(name);
  if (!ID_RE.test(id)) {
    console.error(`Could not derive a valid project id from "${name}" (got "${id}").`);
    process.exit(1);
  }

  const { languages, defaultLang } = await loadSetup();
  const pages = await readPages();
  const projects = JSON.parse(await readFile(PROJECTS_FILE, 'utf8'));
  if (projects.some((project) => project.id === id)) {
    console.error(`A project with id "${id}" already exists in data/projects.json.`);
    process.exit(1);
  }

  const pageFiles = new Map(); // language -> absolute page file
  for (const code of languages) {
    pageFiles.set(code, path.join(ROOT, 'wwwroot', code, projectPagePath(pages, defaultLang, code, id)));
  }
  for (const [code, file] of pageFiles) {
    if (await exists(file)) {
      console.error(`A page already exists at wwwroot/${code}/proj/${path.basename(file)}.`);
      process.exit(1);
    }
  }

  // Default language from the arguments, every other language starts as TODO.
  const perLang = (value, placeholder) => Object.fromEntries(languages.map((code) => [code, code === defaultLang ? value : placeholder]));
  const entry = {
    id,
    title: perLang(name, 'TODO'),
    summary: perLang(brief, 'TODO'),
    tags: perLang(options.tags, []),
    status: options.status,
    date: currentMonth(),
    links: { repo: options.repo, demo: null },
    image: 'assets/img/placeholder.svg',
    featured: options.featured,
  };

  if (options.dryRun) {
    console.log(`Dry run: would create ${[...pageFiles.keys()].map((code) => `wwwroot/${code}/proj/${id}.html`).join(', ')} and register:`);
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  const template = (await readFile(TEMPLATE, 'utf8')).replace(MASTER_COMMENT, '');
  for (const file of pageFiles.values()) await writeFile(file, template);

  projects.push(entry);
  await writeJson(PROJECTS_FILE, projects);

  for (const code of pageFiles.keys()) console.log(`Created wwwroot/${code}/proj/${id}.html from project-template.html`);
  console.log(`Registered "${name}" in wwwroot/data/projects.json`);
  const others = languages.filter((code) => code !== defaultLang);
  if (others.length > 0) console.log(`Hidden in ${others.join(', ')} until title, summary (TODO) and the page text are translated.`);
  console.log('Next: replace the placeholder body, set tags/links/image, then run npm run build.');
}

main().catch((error) => {
  console.error(`create failed: ${error.message}`);
  process.exit(1);
});
