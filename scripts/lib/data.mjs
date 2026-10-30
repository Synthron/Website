// Loading and validation of wwwroot/data/*.json. Structure is validated with
// the JSON Schemas in scripts/schemas/ (ajv); file-system and cross-entry
// checks stay here.

import path from 'node:path';
import Ajv from 'ajv';
import { ROOT, SRC, exists, fail, readJson, safeExternalUrl, walk, warn } from './util.mjs';

const SCHEMA_DIR = path.join(ROOT, 'scripts', 'schemas');
const ajv = new Ajv({ allErrors: true, verbose: true });
const schemas = {};
for (const name of ['site', 'strings', 'nav', 'projects', 'ham', 'pages', 'folders']) {
  schemas[name] = ajv.compile(await readJson(path.join(SCHEMA_DIR, `${name}.schema.json`)));
}

// Content collections: entries in data/<file>, one page per entry and language
// at <lang>/<folder>/{id}.html. `folder` is the key; the folder name per
// language comes from data/folders.json. `noun` is used in messages.
export const COLLECTIONS = {
  projects: { file: 'projects.json', schema: 'projects', folder: 'proj', noun: 'project' },
  ham: { file: 'ham.json', schema: 'ham', folder: 'ham', noun: 'ham page' },
};
const FOLDERS = Object.values(COLLECTIONS).map(({ folder }) => folder);

// Allowed status values, defined once in projects.schema.json. Values
// contain spaces and capitals; slugify one before using it as a CSS class hook.
export const STATUS_VALUES = schemas.projects.schema.items.properties.status.enum;

// Allowed tags per language, defined once in the collection's schema.
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
// A title starting with "DRAFT" (any language) marks a draft: built, but not listed.
export const isDraftTitle = (value) => typeof value === 'string' && /^\s*DRAFT\b/.test(value);

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

// Collection folder names per language from data/folders.json (optional; a
// missing file or language uses the key). Returns (key, code) => folder name.
export async function loadFolders(site, { pageDir = langDir, src = SRC } = {}) {
  const rel = 'data/folders.json';
  const file = path.join(src, rel);
  const data = await exists(file) ? await readJson(file) : {};
  if (!isObject(data)) throw new Error(`${rel}: expected an object`);
  const invalid = validate('folders', rel, data);
  const codes = codesOf(site);
  const names = {}; // key -> code -> folder name
  for (const key of FOLDERS) {
    const mapping = isObject(data[key]) && !invalid.has(key) ? data[key] : {};
    checkLangKeys(`${rel}.${key}`, mapping, codes, []);
    names[key] = Object.fromEntries(codes.map((code) => [code, typeof mapping[code] === 'string' ? mapping[code] : key]));
  }
  for (const code of codes) {
    const owner = new Map(); // folder name -> key
    for (const key of FOLDERS) {
      const name = names[key][code];
      if (name !== key && FOLDERS.includes(name)) {
        fail(`${rel}.${key}.${code}: "${name}" is the folder key of another collection`);
      } else if (owner.has(name)) {
        fail(`${rel}.${key}.${code}: "${name}" is already the folder of "${owner.get(name)}"`);
      }
      owner.set(name, key);
      // Pages left in the key folder after it was mapped away would not belong to the collection.
      const leftover = path.join(src, pageDir(code), key);
      if (name !== key && await exists(leftover) && (await walk(leftover)).some((page) => page.endsWith('.html'))) {
        fail(`wwwroot/${pageDir(code)}/${key}/: "${key}" pages of "${code}" live in ${pageDir(code)}/${name}/ (${rel}); move them`);
      }
    }
  }
  return (key, code) => names[key]?.[code];
}

// Index of the language pages: which files exist per language, which pages
// are the same page under different names (data/pages.json) and which pages
// pair by identical path (collection folders translated per language).
// Paths are relative to the language folder.
export async function loadPages(site, { pageDir = langDir, langBase = (code) => `${code}/`, src = SRC, folders } = {}) {
  const rel = 'data/pages.json';
  const data = await readJson(path.join(src, rel));
  if (!Array.isArray(data)) throw new Error(`${rel}: expected an array`);
  const invalid = validate('pages', rel, data);
  const codes = codesOf(site);
  const { defaultLang } = site;
  const folderOf = folders ?? await loadFolders(site, { pageDir, src });
  // Collection folder key of a page path in a language, or undefined.
  const keyOf = (code, file) => (codes.includes(code) && typeof file === 'string'
    ? FOLDERS.find((key) => file.startsWith(`${folderOf(key, code)}/`)) : undefined);
  // The same path in another language (collection folder translated).
  const translate = (code, file, other) => {
    const key = keyOf(code, file);
    return key === undefined ? file : `${folderOf(key, other)}/${file.slice(folderOf(key, code).length + 1)}`;
  };
  // "ham/" without a mapping, else "ham (de: afu/, en: ham/)".
  const describe = (key) => (codes.every((code) => folderOf(key, code) === key)
    ? `${key}/` : `${key} (${codes.map((code) => `${code}: ${folderOf(key, code)}/`).join(', ')})`);

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
    const entries = Object.entries(paths).filter(([code]) => codes.includes(code));
    // The folder of the default-language page decides; else the first one found.
    const key = keyOf(defaultLang, paths[defaultLang])
      ?? entries.map(([code, file]) => keyOf(code, file)).find((found) => found !== undefined);
    if (key !== undefined) {
      const folder = folderOf(key, defaultLang);
      if (!entries.every(([code, file]) => keyOf(code, file) === key)) {
        fail(`${label}: a group with ${describe(key)} pages may only contain ${describe(key)} pages`);
        valid = false;
      } else if (!new RegExp(`^${folder}/[a-z0-9]+(-[a-z0-9]+)*\\.html$`).test(paths[defaultLang] ?? '')) {
        fail(`${label}: a ${describe(key)} group needs "${defaultLang}": "${folder}/{id}.html"`);
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
    // Folder name of a collection folder key (proj, ham) in a language; undefined for unknown keys.
    folder: folderOf,
    // Collection name (projects, ham) of a page path in a language, or undefined.
    collectionOf(code, file) {
      const key = keyOf(code, file);
      return Object.keys(COLLECTIONS).find((name) => COLLECTIONS[name].folder === key);
    },
    // Map language -> page path for every language that has this page (incl. itself).
    counterparts(code, file) {
      const group = groupOf.get(`${code}:${file}`);
      const found = new Map();
      for (const other of codes) {
        const target = group ? group.paths[other] : translate(code, file, other);
        if (target === undefined || !files.get(other).has(target)) continue;
        if (!group && groupOf.has(`${other}:${target}`)) continue;
        found.set(other, target);
      }
      return found;
    },
    // Page path of a collection entry (folder key, default: project) in a language, or null when the page does not exist.
    projectPage(code, id, key = 'proj') {
      const group = groupOf.get(`${defaultLang}:${folderOf(key, defaultLang)}/${id}.html`);
      const file = group?.paths[code] ?? `${folderOf(key, code)}/${id}.html`;
      return files.get(code)?.has(file) ? file : null;
    },
    // Project id of a project page path in a language.
    projectId(code, file) {
      const source = groupOf.get(`${code}:${file}`)?.paths[defaultLang] ?? file;
      return path.posix.basename(source, '.html');
    },
    // File name of the page that is `file` in the default language: the mapped
    // name in `code` from data/pages.json, else `file` itself (identical path).
    pageName(file, code) {
      return groupOf.get(`${defaultLang}:${file}`)?.paths[code] ?? file;
    },
  };
}

// Loads data/projects.json. `title`, `summary` and `tags` of the result are
// objects holding only the languages in which the project is available (data
// complete, no TODO, page exists); use localize() for a flat per-language view.
export const loadProjects = (site, pages, options) => loadCollection('projects', site, pages, options);

// Loads data/ham.json; same rules as projects, fewer required fields.
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

    const entry = { ...project, title: {}, summary: {}, tags: {}, draft: Object.values(project.title).some(isDraftTitle) };
    if (entry.draft) warn(`${label} (${project.id}): draft (title starts with DRAFT); page built but not listed`);
    for (const code of codes) {
      const hasPage = pages.projectPage(code, project.id, folder) !== null;
      const pageRel = `wwwroot/${pages.dir(code)}/${pages.folder(folder, code)}/${project.id}.html`;
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
  const groupRe = new RegExp(`^${pages.folder(folder, defaultLang)}/(.+)\\.html$`);
  for (const group of pages.groups) {
    const id = groupRe.exec(group.paths[defaultLang] ?? '')?.[1];
    if (id !== undefined && !ids.has(id)) fail(`data/pages.json[${group.index}]: no ${noun} with id "${id}"`);
  }
  for (const code of codes.filter((known) => known !== defaultLang)) {
    for (const page of pages.files(code).filter((name) => name.startsWith(`${pages.folder(folder, code)}/`))) {
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
