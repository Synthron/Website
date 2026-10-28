// Loading and validation of wwwroot/data/*.json. Structure is validated with
// the JSON Schemas in scripts/schemas/ (ajv); file-system and cross-entry
// checks stay here.

import path from 'node:path';
import Ajv from 'ajv';
import { ROOT, SRC, exists, fail, readJson, safeExternalUrl, walk, warn } from './util.mjs';

const SCHEMA_DIR = path.join(ROOT, 'scripts', 'schemas');
const ajv = new Ajv({ allErrors: true, verbose: true });
const schemas = {};
for (const name of ['site', 'strings', 'nav', 'projects', 'ham', 'pages']) {
  schemas[name] = ajv.compile(await readJson(path.join(SCHEMA_DIR, `${name}.schema.json`)));
}

// Content collections: entries in data/<file>, one page per entry and language
// at <lang>/<folder>/{id}.html (R1). `noun` is used in messages.
export const COLLECTIONS = {
  projects: { file: 'projects.json', schema: 'projects', folder: 'proj', noun: 'project' },
  ham: { file: 'ham.json', schema: 'ham', folder: 'ham', noun: 'ham page' },
};
const FOLDERS = Object.values(COLLECTIONS).map(({ folder }) => folder);

// Collection name of a page path inside a language folder, or undefined.
export const collectionOf = (pagePath) => Object.keys(COLLECTIONS)
  .find((name) => pagePath?.startsWith(`${COLLECTIONS[name].folder}/`));

// D10: allowed status values, defined once in projects.schema.json. Values
// contain spaces and capitals; slugify one before using it as a CSS class hook.
export const STATUS_VALUES = schemas.projects.schema.items.properties.status.enum;

// R9: allowed tags per language, defined once in the collection's schema.
const tagVocabulary = (name) => Object.fromEntries(Object.entries(schemas[name].schema.items.properties.tags.properties)
  .map(([code, list]) => [code, list.items.enum]));
export const PROJECT_TAGS = tagVocabulary('projects');
export const HAM_TAGS = tagVocabulary('ham');

// "/0/links/repo" -> "[0].links.repo"
const pointer = (instancePath) => instancePath.split('/').slice(1)
  .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join('');

// Folder of a language's pages below wwwroot/. Callers can override it while
// pages still live elsewhere (build.mjs until the move to <lang>/).
export const langDir = (code) => code;

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// "TODO" (or "TODO: ...") marks a translation that is not written yet.
export const isTodo = (value) => typeof value === 'string' && /^\s*TODO\b/.test(value);
const isFilled = (value) => typeof value === 'string' && value.trim() !== '' && !isTodo(value);

// Language keys of a per-language object: unknown codes and missing required
// codes are errors.
function checkLangKeys(label, object, codes, required = codes) {
  for (const key of Object.keys(object)) {
    if (key !== '$schema' && !codes.includes(key)) fail(`${label}: unknown language "${key}"`);
  }
  for (const code of required) {
    if (!(code in object)) fail(`${label}: missing language "${code}"`);
  }
}

// Validates `data` against a schema; reports every error via fail() and returns
// the set of entries with errors, keyed by their first `depth` path segments
// ("3" for projects, "de/0" for nav).
function validate(name, rel, data, depth = 1) {
  const invalid = new Set();
  if (schemas[name](data)) return invalid;
  for (const error of schemas[name].errors) {
    // oneOf/anyOf report every failing branch; the summary error is enough.
    if (/\/(oneOf|anyOf)\//.test(error.schemaPath)) continue;
    let detail = error.message;
    if (error.keyword === 'enum') detail += `: ${error.params.allowedValues.join(', ')}`;
    if (error.keyword === 'additionalProperties') detail += ` "${error.params.additionalProperty}"`;
    if (['oneOf', 'anyOf', 'pattern'].includes(error.keyword) && error.parentSchema?.description) {
      detail += ` (${error.parentSchema.description})`;
    }
    fail(`${rel}${pointer(error.instancePath)}: ${detail}`);
    const parts = error.instancePath.split('/').slice(1);
    if (parts.length >= depth) invalid.add(parts.slice(0, depth).join('/'));
  }
  return invalid;
}

// Loaders read from `src` (default: wwwroot/); tests pass a temporary tree.
export async function loadSite({ src = SRC } = {}) {
  const rel = 'data/site.json';
  const site = await readJson(path.join(src, rel));
  validate('site', rel, site);

  // Canonical base URL for sitemap.xml and the robots.txt Sitemap line.
  let url = '';
  if (typeof site.url === 'string') {
    try {
      url = new URL(site.url).href.replace(/\/+$/, '');
    } catch {
      fail(`${rel}: "url" must be a valid absolute URL`);
    }
  }

  const languages = [];
  for (const [index, language] of (Array.isArray(site.languages) ? site.languages : []).entries()) {
    const label = `${rel}.languages[${index}]`;
    if (typeof language?.code !== 'string') continue;
    if (languages.some((known) => known.code === language.code)) {
      fail(`${label}: duplicate language code "${language.code}"`);
      continue;
    }
    if (typeof language.flag === 'string' && !await exists(path.join(src, language.flag))) {
      fail(`${label}.flag: file not found: ${language.flag}`);
    }
    languages.push({ code: language.code, name: language.name, locale: language.locale, flag: language.flag });
  }
  const codes = languages.map((language) => language.code);
  if (typeof site.defaultLang === 'string' && !codes.includes(site.defaultLang)) {
    fail(`${rel}.defaultLang: "${site.defaultLang}" is not a configured language`);
  }
  const footerNote = isObject(site.footerNote) ? site.footerNote : {};
  checkLangKeys(`${rel}.footerNote`, footerNote, codes);

  return {
    languages,
    defaultLang: site.defaultLang ?? '',
    name: site.name ?? '',
    footerNote,
    email: site.email ?? '',
    year: site.copyrightYear ?? new Date().getFullYear(),
    url,
    sitemapUrl: url ? `${url}/sitemap.xml` : '',
  };
}

const codesOf = (site) => site.languages.map((language) => language.code);

// Returns { <code>: { ...UI strings } } for every configured language.
export async function loadStrings(site, { src = SRC } = {}) {
  const rel = 'data/strings.json';
  const data = await readJson(path.join(src, rel));
  if (!isObject(data)) throw new Error(`${rel}: expected an object with one block per language`);
  validate('strings', rel, data);
  const codes = codesOf(site);
  checkLangKeys(rel, data, codes);

  const strings = {};
  for (const code of codes) {
    if (!isObject(data[code])) continue;
    const { status } = data[code];
    if (isObject(status)) {
      for (const value of STATUS_VALUES) {
        if (!(value in status)) fail(`${rel}.${code}.status: missing label for "${value}"`);
      }
      for (const key of Object.keys(status)) {
        if (!STATUS_VALUES.includes(key)) fail(`${rel}.${code}.status: unknown status "${key}"`);
      }
    }
    strings[code] = data[code];
  }
  return strings;
}

// Returns { <code>: [{ label, href, external, lang? }] } for every configured
// language. `lang` is set when the target page is in another language.
export async function loadNav(file, site, { src = SRC } = {}) {
  const rel = `data/${file}`;
  const data = await readJson(path.join(src, rel));
  if (!isObject(data)) throw new Error(`${rel}: expected an object with one array per language`);
  const invalid = validate('nav', rel, data, 2);
  const codes = codesOf(site);
  checkLangKeys(rel, data, codes);

  const nav = {};
  for (const code of codes) {
    nav[code] = [];
    if (!Array.isArray(data[code])) continue;
    for (const [index, item] of data[code].entries()) {
      if (invalid.has(`${code}/${index}`)) continue;
      if (item.lang !== undefined && !codes.includes(item.lang)) {
        fail(`${rel}.${code}[${index}].lang: "${item.lang}" is not a configured language`);
        continue;
      }
      nav[code].push({
        label: item.label,
        href: item.href,
        external: /^https?:\/\//i.test(item.href),
        ...(item.lang ? { lang: item.lang } : {}),
      });
    }
  }
  return nav;
}

// Index of the language pages: which files exist per language, which pages
// are the same page under different names (data/pages.json) and which pages
// pair by identical path. Paths are relative to the language folder.
export async function loadPages(site, { pageDir = langDir, langBase = (code) => `${code}/`, src = SRC } = {}) {
  const rel = 'data/pages.json';
  const data = await readJson(path.join(src, rel));
  if (!Array.isArray(data)) throw new Error(`${rel}: expected an array`);
  const invalid = validate('pages', rel, data);
  const codes = codesOf(site);
  const { defaultLang } = site;

  const files = new Map();
  for (const code of codes) {
    const dir = path.join(src, pageDir(code));
    files.set(code, new Set(await exists(dir) ? (await walk(dir)).filter((file) => file.endsWith('.html')) : []));
  }

  const groups = [];
  const groupOf = new Map(); // "<code>:<path>" -> group
  for (const [index, paths] of data.entries()) {
    if (invalid.has(String(index))) continue;
    const label = `${rel}[${index}]`;
    const group = { index, paths };
    let valid = true;
    for (const [code, file] of Object.entries(paths)) {
      const key = `${code}:${file}`;
      if (!codes.includes(code)) {
        fail(`${label}: unknown language "${code}"`);
        valid = false;
      } else if (!files.get(code).has(file)) {
        fail(`${label}.${code}: page not found: wwwroot/${pageDir(code)}/${file}`);
        valid = false;
      } else if (groupOf.has(key)) {
        fail(`${label}.${code}: "${file}" is already in ${rel}[${groupOf.get(key).index}]`);
        valid = false;
      } else {
        groupOf.set(key, group);
      }
    }
    const values = Object.values(paths);
    const inFolder = (name) => (file) => file.startsWith(`${name}/`);
    // The folder of the default-language page decides; else the first one found.
    const folder = FOLDERS.find((name) => inFolder(name)(paths[defaultLang] ?? ''))
      ?? FOLDERS.find((name) => values.some(inFolder(name)));
    if (folder !== undefined) {
      if (!values.every(inFolder(folder))) {
        fail(`${label}: a group with ${folder}/ pages may only contain ${folder}/ pages`);
        valid = false;
      } else if (!new RegExp(`^${folder}/[a-z0-9]+(-[a-z0-9]+)*\\.html$`).test(paths[defaultLang] ?? '')) {
        fail(`${label}: a ${folder}/ group needs "${defaultLang}": "${folder}/{id}.html"`);
        valid = false;
      }
    }
    if (valid) groups.push(group);
  }

  return {
    groups,
    dir: pageDir,
    // Web-root-relative folder (with trailing slash) that nav hrefs and the home page of a language are relative to.
    base: langBase,
    // Sorted page paths of a language (relative to its folder).
    files: (code) => [...files.get(code) ?? []].sort(),
    // Map language -> page path for every language that has this page (incl. itself).
    counterparts(code, file) {
      const group = groupOf.get(`${code}:${file}`);
      const found = new Map();
      for (const other of codes) {
        const target = group ? group.paths[other] : file;
        if (target === undefined || !files.get(other).has(target)) continue;
        if (!group && groupOf.has(`${other}:${target}`)) continue;
        found.set(other, target);
      }
      return found;
    },
    // Page path of a collection entry (default: project) in a language, or null when the page does not exist.
    projectPage(code, id, folder = 'proj') {
      const standard = `${folder}/${id}.html`;
      const group = groupOf.get(`${defaultLang}:${standard}`);
      const file = group?.paths[code] ?? standard;
      return files.get(code)?.has(file) ? file : null;
    },
    // Project id of a project page path in a language.
    projectId(code, file) {
      const source = groupOf.get(`${code}:${file}`)?.paths[defaultLang] ?? file;
      return path.posix.basename(source, '.html');
    },
  };
}

// Loads data/projects.json. `title`, `summary` and `tags` of the result are
// objects holding only the languages in which the project is available (data
// complete, no TODO, page exists); use localize() for a flat per-language view.
export const loadProjects = (site, pages, options) => loadCollection('projects', site, pages, options);

// Loads data/ham.json (R1); same rules as projects, fewer required fields.
export const loadHam = (site, pages, options) => loadCollection('ham', site, pages, options);

async function loadCollection(name, site, pages, { src = SRC } = {}) {
  const { file, schema, folder, noun } = COLLECTIONS[name];
  const rel = `data/${file}`;
  const data = await readJson(path.join(src, rel));
  if (!Array.isArray(data)) throw new Error(`${rel}: expected an array`);
  const invalid = validate(schema, rel, data);
  const codes = codesOf(site);
  const { defaultLang } = site;
  const seen = new Set();
  const projects = [];

  for (const [index, project] of data.entries()) {
    if (invalid.has(String(index))) continue;
    const label = `${rel}[${index}]`;
    if (seen.has(project.id)) fail(`${label}: duplicate id "${project.id}"`);
    seen.add(project.id);
    for (const key of ['repo', 'demo']) {
      const value = project.links?.[key];
      if (value !== null && value !== undefined && !safeExternalUrl(value)) {
        fail(`${label}.links.${key}: must be null or a valid http(s) URL`);
      }
    }
    if (project.image !== undefined && !await exists(path.join(src, project.image))) fail(`${label}: image not found: ${project.image}`);
    checkLangKeys(`${label}.title`, project.title, codes, [defaultLang]);
    checkLangKeys(`${label}.summary`, project.summary, codes, [defaultLang]);
    checkLangKeys(`${label}.tags`, project.tags, codes, [defaultLang]);

    const entry = { ...project, title: {}, summary: {}, tags: {} };
    for (const code of codes) {
      const hasPage = pages.projectPage(code, project.id, folder) !== null;
      const pageRel = `wwwroot/${pages.dir(code)}/${folder}/${project.id}.html`;
      const complete = isFilled(project.title[code]) && isFilled(project.summary[code]);
      if (code === defaultLang) {
        if (!hasPage) fail(`${label}: missing page ${pageRel}`);
        if (!complete) fail(`${label}: "${code}" title and summary are required and must not be TODO`);
      } else if (!complete) {
        warn(`${label} (${project.id}): "${code}" title/summary missing or TODO; ${noun} hidden in "${code}"`);
        continue;
      } else if (!hasPage) {
        warn(`${label} (${project.id}): no "${code}" page (${pageRel}); ${noun} hidden in "${code}"`);
        continue;
      }
      if (!complete) continue;
      entry.title[code] = project.title[code];
      entry.summary[code] = project.summary[code];
      entry.tags[code] = project.tags[code] ?? [];
    }
    projects.push(entry);
  }

  const ids = new Set(projects.map((project) => project.id));
  const groupRe = new RegExp(`^${folder}/(.+)\\.html$`);
  for (const group of pages.groups) {
    const id = groupRe.exec(group.paths[defaultLang] ?? '')?.[1];
    if (id !== undefined && !ids.has(id)) fail(`data/pages.json[${group.index}]: no ${noun} with id "${id}"`);
  }
  for (const code of codes.filter((known) => known !== defaultLang)) {
    for (const page of pages.files(code).filter((name) => name.startsWith(`${folder}/`))) {
      if (!ids.has(pages.projectId(code, page))) {
        warn(`wwwroot/${pages.dir(code)}/${page}: page without a ${rel} entry`);
      }
    }
  }
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}

// Flat view of a project in one language (`title`, `summary`, `tags` are plain
// values); null when the project is not available in that language.
export function localize(project, lang) {
  if (!Object.hasOwn(project.title, lang)) return null;
  return { ...project, title: project.title[lang], summary: project.summary[lang], tags: project.tags[lang] ?? [] };
}
