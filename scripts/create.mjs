// Scaffold for project and ham radio pages: creates the page from the master
// template in every language folder and registers the entry in
// data/projects.json (create:project) or data/ham.json (create:afu, --ham).
// Languages other than the default get "TODO" texts (the entry stays hidden
// there until they are filled in). Node built-ins only.
//
// Usage: npm run create:project -- "Project Name" "One-sentence brief" [flags]
//        npm run create:afu -- "Page Name" "One-sentence brief" [flags]
//        npm run create:project -- --module <parent-id> "Module Name" "Brief" [--status <value>] [--dry-run]
//   --tags a,b        comma-separated tags of the default language (from the schema vocabulary)
//   --featured        mark the project as featured (projects only)
//   --status <value>  one of the schema status values (projects, modules: default "in Arbeit"; ham: optional)
//   --repo <url>      http(s) source repository URL
//   --module <id>     create a module page below the project / ham entry <id> (data/modules.json)
//   --dry-run         validate only, write nothing

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HAM_TAGS, PROJECT_TAGS, STATUS_VALUES } from './lib/data.mjs';
import { loadSetup, MODULES_FILE, modulePagePath, readFolders, readModules, readPages, projectPagePath, writeJson } from './lib/scaffold.mjs';
import { slugify } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'wwwroot', 'templates', 'project-template.html');
const MODULE_TEMPLATE = path.join(ROOT, 'wwwroot', 'templates', 'module-template.html');
const KINDS = {
  project: { script: 'create:project', noun: 'project', folder: 'proj', file: path.join(ROOT, 'wwwroot', 'data', 'projects.json'), schema: 'projects.schema.json', tags: PROJECT_TAGS },
  ham: { script: 'create:afu', noun: 'ham page', folder: 'ham', file: path.join(ROOT, 'wwwroot', 'data', 'ham.json'), schema: 'ham.schema.json', tags: HAM_TAGS },
};
// The listing page name is language-dependent (de: projekte.html /
// amateurfunk.html, en: projects.html / hamradio.html), so the back link
// resolves it per language at build time via data/pages.json.
const PROJECT_BACK_LINK = '<a href="{{langRoot}}{{projectsPage}}">{{t:backToProjects}}</a>';
const HAM_BACK_LINK = '<a href="{{langRoot}}{{hamPage}}">{{t:backToHam}}</a>';

// Same id/tag rule the build enforces in scripts/build.mjs.
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_RE = /^https?:\/\//i;

const exists = (file) => access(file).then(() => true, () => false);

function currentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

// The master templates open with an instructional comment block that only
// belongs on the reference page; drop it from generated pages.
const MASTER_COMMENT = /<!--\s*={10,}\s*(?:MASTER PROJECT|MODULE PAGE) TEMPLATE[\s\S]*?-->\s*/;

// Minimal flag parser: `--name value` and boolean `--flag`. Unknown flags
// fail loudly so typos do not silently change the scaffold.
function parseArgs(argv) {
  const positional = [];
  const options = { tags: [], featured: false, status: null, repo: null, dryRun: false, ham: false, module: null, given: new Set() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) options.given.add(arg);
    if (arg === '--tags') options.tags = (argv[++i] ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
    else if (arg === '--featured') options.featured = true;
    else if (arg === '--status') options.status = argv[++i] ?? '';
    else if (arg === '--repo') options.repo = argv[++i] ?? '';
    else if (arg === '--module') options.module = argv[++i] ?? '';
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--ham') options.ham = true;
    else if (arg.startsWith('--')) throw new Error(`unknown flag "${arg}"`);
    else positional.push(arg);
  }
  // create:afu passes --ham before the user arguments, so names are collected positionally.
  const [name, brief] = positional;
  return { name, brief, options };
}

async function main() {
  const { name, brief, options } = parseArgs(process.argv.slice(2));
  const kind = KINDS[options.ham ? 'ham' : 'project'];
  if (options.module !== null) {
    await createModule(name, brief, options, kind);
    return;
  }
  if (!name || !brief) {
    const featured = options.ham ? '' : ' [--featured]';
    console.error(`Usage: npm run ${kind.script} -- "Name" "One-sentence brief" [--tags a,b]${featured} [--status <value>] [--repo <url>] [--dry-run]`);
    process.exit(1);
  }
  if (options.ham && options.featured) {
    console.error('--featured is only available for projects (npm run create:project).');
    process.exit(1);
  }
  if (!options.ham && options.status === null) options.status = 'in Arbeit';
  if (options.status !== null && !STATUS_VALUES.includes(options.status)) {
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
    console.error(`Could not derive a valid id from "${name}" (got "${id}").`);
    process.exit(1);
  }

  const { languages, defaultLang } = await loadSetup();
  const allowed = kind.tags[defaultLang] ?? [];
  const unknown = options.tags.filter((tag) => !allowed.includes(tag));
  if (unknown.length > 0) {
    console.error(`Unknown ${kind.noun} tag(s) ${unknown.join(', ')}; allowed (${kind.schema}): ${allowed.join(', ')}`);
    process.exit(1);
  }
  const pages = await readPages();
  const folders = await readFolders();
  const dataRel = `data/${path.basename(kind.file)}`;
  const entries = JSON.parse(await readFile(kind.file, 'utf8'));
  if (entries.some((entry) => entry.id === id)) {
    console.error(`A ${kind.noun} with id "${id}" already exists in ${dataRel}.`);
    process.exit(1);
  }
  // Ids are unique across projects.json and ham.json (module parents are looked up in both).
  const other = KINDS[options.ham ? 'project' : 'ham'];
  if (JSON.parse(await readFile(other.file, 'utf8')).some((entry) => entry.id === id)) {
    console.error(`The id "${id}" is already used by a ${other.noun} in data/${path.basename(other.file)}; ids are unique across both files.`);
    process.exit(1);
  }

  const pageFiles = new Map(); // language -> page path inside the language folder
  for (const code of languages) {
    pageFiles.set(code, projectPagePath(pages, defaultLang, code, id, kind.folder, folders));
  }
  for (const [code, page] of pageFiles) {
    if (await exists(path.join(ROOT, 'wwwroot', code, page))) {
      console.error(`A page already exists at wwwroot/${code}/${page}.`);
      process.exit(1);
    }
  }

  // Default language from the arguments, every other language starts as TODO.
  const perLang = (value, placeholder) => Object.fromEntries(languages.map((code) => [code, code === defaultLang ? value : placeholder]));
  const texts = { id, title: perLang(name, 'TODO'), summary: perLang(brief, 'TODO'), tags: perLang(options.tags, []) };
  const entry = options.ham
    ? {
      ...texts,
      date: currentMonth(),
      ...(options.status !== null ? { status: options.status } : {}),
      ...(options.repo !== null ? { links: { repo: options.repo, demo: null } } : {}),
    }
    : {
      ...texts,
      status: options.status,
      date: currentMonth(),
      links: { repo: options.repo, demo: null },
      image: 'assets/img/placeholder.svg',
      featured: options.featured,
    };

  if (options.dryRun) {
    console.log(`Dry run: would create ${[...pageFiles].map(([code, page]) => `wwwroot/${code}/${page}`).join(', ')} and register in ${dataRel}:`);
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  let template = (await readFile(TEMPLATE, 'utf8')).replace(MASTER_COMMENT, '');
  if (options.ham) {
    if (!template.includes(PROJECT_BACK_LINK)) throw new Error('project-template.html: project back link not found');
    template = template.replace(PROJECT_BACK_LINK, HAM_BACK_LINK);
  }
  for (const [code, page] of pageFiles) {
    const file = path.join(ROOT, 'wwwroot', code, page);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, template);
  }

  entries.push(entry);
  await writeJson(kind.file, entries);

  for (const [code, page] of pageFiles) console.log(`Created wwwroot/${code}/${page} from project-template.html`);
  console.log(`Registered "${name}" in wwwroot/${dataRel}`);
  const others = languages.filter((code) => code !== defaultLang);
  if (others.length > 0) console.log(`Hidden in ${others.join(', ')} until title, summary (TODO) and the page text are translated.`);
  console.log(options.ham
    ? 'Next: replace the placeholder body, set tags (and optionally status/links), then run npm run build.'
    : 'Next: replace the placeholder body, set tags/links/image, then run npm run build.');
}

// --module <parent-id>: module page below a project (create:project) or ham
// entry (create:afu) in the module folder of every language, plus an entry in
// data/modules.json.
async function createModule(name, brief, options, kind) {
  const script = `npm run ${kind.script} -- --module <parent-id> "Name" "One-sentence brief" [--status <value>] [--dry-run]`;
  if (!options.module || !name || !brief) {
    console.error(`Usage: ${script}`);
    process.exit(1);
  }
  const rejected = ['--tags', '--featured', '--repo'].filter((flag) => options.given.has(flag));
  if (rejected.length > 0) {
    console.error(`${rejected.join(', ')} not available for modules. Usage: ${script}`);
    process.exit(1);
  }
  if (options.status === null) options.status = 'in Arbeit';
  if (!STATUS_VALUES.includes(options.status)) {
    console.error(`--status must be one of: ${STATUS_VALUES.join(', ')} (got "${options.status}")`);
    process.exit(1);
  }
  const parent = options.module;
  const dataRel = `data/${path.basename(kind.file)}`;
  if (!JSON.parse(await readFile(kind.file, 'utf8')).some((entry) => entry.id === parent)) {
    const other = KINDS[options.ham ? 'project' : 'ham'];
    const hint = JSON.parse(await readFile(other.file, 'utf8')).some((entry) => entry.id === parent) ? ` It is a ${other.noun}: use npm run ${other.script}.` : '';
    console.error(`No ${kind.noun} with id "${parent}" in ${dataRel}.${hint}`);
    process.exit(1);
  }
  const id = slugify(name);
  if (!ID_RE.test(id)) {
    console.error(`Could not derive a valid id from "${name}" (got "${id}").`);
    process.exit(1);
  }
  const modules = await readModules();
  if (modules.some((module) => module.parent === parent && module.id === id)) {
    console.error(`A module "${id}" of "${parent}" already exists in data/modules.json.`);
    process.exit(1);
  }

  const { languages, defaultLang } = await loadSetup();
  const pages = await readPages();
  const folders = await readFolders();
  const pageFiles = new Map(); // language -> module page path inside the language folder
  for (const code of languages) {
    const parentPage = projectPagePath(pages, defaultLang, code, parent, kind.folder, folders);
    if (!await exists(path.join(ROOT, 'wwwroot', code, parentPage))) {
      if (code === defaultLang) {
        console.error(`The overview page wwwroot/${code}/${parentPage} of "${parent}" is missing.`);
        process.exit(1);
      }
      console.log(`Skipping "${code}": no overview page wwwroot/${code}/${parentPage}.`);
      continue;
    }
    pageFiles.set(code, modulePagePath(pages, defaultLang, code, parent, id, kind.folder, folders));
  }
  for (const [code, page] of pageFiles) {
    if (await exists(path.join(ROOT, 'wwwroot', code, page))) {
      console.error(`A page already exists at wwwroot/${code}/${page}.`);
      process.exit(1);
    }
  }

  const perLang = (value) => Object.fromEntries(languages.map((code) => [code, code === defaultLang ? value : 'TODO']));
  const entry = { parent, id, title: perLang(name), summary: perLang(brief), status: options.status, date: currentMonth(), image: 'assets/img/placeholder.svg' };
  if (options.dryRun) {
    console.log(`Dry run: would create ${[...pageFiles].map(([code, page]) => `wwwroot/${code}/${page}`).join(', ')} and register in data/modules.json:`);
    console.log(JSON.stringify(entry, null, 2));
    return;
  }

  const template = (await readFile(MODULE_TEMPLATE, 'utf8')).replace(MASTER_COMMENT, '');
  for (const [code, page] of pageFiles) {
    const file = path.join(ROOT, 'wwwroot', code, page);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, template);
  }
  modules.push(entry);
  await writeJson(MODULES_FILE, modules);

  for (const [code, page] of pageFiles) console.log(`Created wwwroot/${code}/${page} from module-template.html`);
  console.log(`Registered "${name}" below "${parent}" in wwwroot/data/modules.json`);
  const others = languages.filter((code) => code !== defaultLang);
  if (others.length > 0) console.log(`Hidden in ${others.join(', ')} until title, summary (TODO) and the page text are translated.`);
  console.log('Next: link the module from its overview page in every language:');
  for (const [code, page] of pageFiles) console.log(`  wwwroot/${code}/${path.posix.dirname(page)}.html: <a href="${path.posix.basename(path.posix.dirname(page))}/${path.posix.basename(page)}">…</a>`);
  console.log('Then replace the placeholder body, set the image and run npm run build.');
}

main().catch((error) => {
  console.error(`create failed: ${error.message}`);
  process.exit(1);
});
