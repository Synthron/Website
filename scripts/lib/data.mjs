// Loading and validation of wwwroot/data/*.json. Structure is validated with
// the JSON Schemas in scripts/schemas/ (ajv); file-system and cross-entry
// checks stay here.

import path from 'node:path';
import Ajv from 'ajv';
import { ROOT, SRC, exists, fail, readJson, safeExternalUrl, walk, warn } from './util.mjs';

const SCHEMA_DIR = path.join(ROOT, 'scripts', 'schemas');
const ajv = new Ajv({ allErrors: true, verbose: true });
const schemas = {};
for (const name of ['site', 'strings', 'nav', 'projects', 'ham', 'pages', 'folders', 'modules']) {
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
  // Path segments below the collection folder: 1 = entry page, 2 = module page; 0 outside collections.
  const depthOf = (code, file) => {
    const key = keyOf(code, file);
    return key === undefined ? 0 : file.slice(folderOf(key, code).length + 1).split('/').length;
  };
  const isModule = (code, file) => depthOf(code, file) === 2;
  // Overview page of a module page: <folder>/<parent>/<module>.html -> <folder>/<parent>.html.
  const parentOf = (file) => `${path.posix.dirname(file)}.html`;
  // The same path in another language (collection folder translated; module
  // pages follow the counterpart of their overview page). Undefined when the
  // overview page has no counterpart there.
  const translate = (code, file, other) => {
    const key = keyOf(code, file);
    if (key === undefined) return file;
    if (isModule(code, file)) {
      const parent = counterparts(code, parentOf(file)).get(other);
      return parent === undefined ? undefined : `${parent.slice(0, -5)}/${path.posix.basename(file)}`;
    }
    return `${folderOf(key, other)}/${file.slice(folderOf(key, code).length + 1)}`;
  };
  // "ham/" without a mapping, else "ham (de: afu/, en: ham/)".
  const describe = (key) => (codes.every((code) => folderOf(key, code) === key)
    ? `${key}/` : `${key} (${codes.map((code) => `${code}: ${folderOf(key, code)}/`).join(', ')})`);
  const ID = '[a-z0-9]+(?:-[a-z0-9]+)*';

  const files = new Map();
  for (const code of codes) {
    const dir = path.join(src, pageDir(code));
    files.set(code, new Set(await exists(dir) ? (await walk(dir)).filter((file) => file.endsWith('.html')) : []));
  }

  const groups = [];
  const groupOf = new Map(); // "<code>:<path>" -> group
  const moduleGroups = []; // checked once all groups are known
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
      const modules = entries.filter(([code, file]) => isModule(code, file)).length;
      if (!entries.every(([code, file]) => keyOf(code, file) === key)) {
        fail(`${label}: a group with ${describe(key)} pages may only contain ${describe(key)} pages`);
        valid = false;
      } else if (modules > 0 && modules < entries.length) {
        fail(`${label}: entry pages and module pages cannot be mixed in one group`);
        valid = false;
      } else if (modules === 0 && !new RegExp(`^${folder}/${ID}\\.html$`).test(paths[defaultLang] ?? '')) {
        fail(`${label}: a ${describe(key)} group needs "${defaultLang}": "${folder}/{id}.html"`);
        valid = false;
      } else if (modules > 0) {
        const match = new RegExp(`^${folder}/(${ID})/${ID}\\.html$`).exec(paths[defaultLang] ?? '');
        if (match) {
          moduleGroups.push({ label, key, parent: match[1], entries });
        } else {
          fail(`${label}: a ${describe(key)} module group needs "${defaultLang}": "${folder}/{parent id}/{module id}.html"`);
          valid = false;
        }
      }
    }
    if (valid) groups.push(group);
  }

  // Page path of a collection entry in a language, or null when the page does not exist.
  function projectPage(code, id, key = 'proj') {
    const group = groupOf.get(`${defaultLang}:${folderOf(key, defaultLang)}/${id}.html`);
    const file = group?.paths[code] ?? `${folderOf(key, code)}/${id}.html`;
    return files.get(code)?.has(file) ? file : null;
  }

  function projectId(code, file) {
    const source = isModule(code, file) ? parentOf(file) : file;
    return path.posix.basename(groupOf.get(`${code}:${source}`)?.paths[defaultLang] ?? source, '.html');
  }

  function counterparts(code, file) {
    const group = groupOf.get(`${code}:${file}`);
    const found = new Map();
    for (const other of codes) {
      const target = group ? group.paths[other] : translate(code, file, other);
      if (target === undefined || !files.get(other).has(target)) continue;
      if (!group && groupOf.has(`${other}:${target}`)) continue;
      found.set(other, target);
    }
    return found;
  }

  // Every path of a module group lies in the module folder of the parent in its language.
  for (const { label, key, parent, entries } of moduleGroups) {
    for (const [code, file] of entries) {
      const page = projectPage(code, parent, key);
      if (page === null) {
        fail(`${label}.${code}: "${parent}" has no "${code}" page, so "${file}" has no module folder`);
      } else if (parentOf(file) !== page) {
        fail(`${label}.${code}: "${file}" must lie in the module folder of "${parent}" (${page.slice(0, -5)}/)`);
      }
    }
  }

  // Module pages need their overview page next to the module folder; nothing deeper.
  for (const code of codes) {
    const reported = new Set();
    for (const file of files.get(code)) {
      const depth = depthOf(code, file);
      const folder = path.posix.dirname(file);
      if (depth > 2) {
        fail(`wwwroot/${pageDir(code)}/${file}: nested too deeply (module pages live at <folder>/<parent page>/<module>.html)`);
      } else if (depth === 2 && !files.get(code).has(parentOf(file)) && !reported.has(folder)) {
        reported.add(folder);
        // A renamed overview page (data/pages.json) moves its module folder.
        const key = keyOf(code, file);
        const name = path.posix.basename(folder);
        const page = projectPage(code, name, key);
        const hint = page !== null && page !== parentOf(file) ? `; the "${code}" page of "${name}" is ${page}, rename the folder to wwwroot/${pageDir(code)}/${page.slice(0, -5)}/` : '';
        fail(`wwwroot/${pageDir(code)}/${folder}/: module folder without its overview page wwwroot/${pageDir(code)}/${parentOf(file)}${hint}`);
      }
    }
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
    // Collection name (projects, ham) of a page path in a language (module pages included), or undefined.
    collectionOf(code, file) {
      const key = keyOf(code, file);
      return Object.keys(COLLECTIONS).find((name) => COLLECTIONS[name].folder === key);
    },
    // Map language -> page path for every language that has this page (incl. itself).
    counterparts,
    // Page path of a collection entry (folder key, default: project) in a language, or null when the page does not exist.
    projectPage,
    // Entry id of an entry page path in a language; the parent id for module pages.
    projectId,
    // Whether a page path is a module page (<folder>/<parent page>/<module>.html).
    isModulePage: isModule,
    // Overview page path of a module page, or undefined for other pages.
    parentPage: (code, file) => (isModule(code, file) ? parentOf(file) : undefined),
    // Module id of a module page path in a language (the default-language file name).
    moduleId(code, file) {
      const source = groupOf.get(`${code}:${file}`)?.paths[defaultLang] ?? file;
      return path.posix.basename(source, '.html');
    },
    // Page path of a module (parent id, module id, parent folder key) in a language, or null when the page does not exist.
    modulePage(code, parent, id, key = 'proj') {
      const group = groupOf.get(`${defaultLang}:${folderOf(key, defaultLang)}/${parent}/${id}.html`);
      let file = group?.paths[code];
      if (file === undefined) {
        const page = projectPage(code, parent, key);
        if (page === null) return null;
        file = `${page.slice(0, -5)}/${id}.html`;
      }
      return files.get(code)?.has(file) ? file : null;
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
  const groupRe = new RegExp(`^${pages.folder(folder, defaultLang)}/([^/]+)\\.html$`);
  for (const group of pages.groups) {
    const id = groupRe.exec(group.paths[defaultLang] ?? '')?.[1];
    if (id !== undefined && !ids.has(id)) fail(`data/pages.json[${group.index}]: no ${noun} with id "${id}"`);
  }
  for (const code of codes.filter((known) => known !== defaultLang)) {
    for (const page of pages.files(code).filter((name) => name.startsWith(`${pages.folder(folder, code)}/`) && !pages.isModulePage(code, name))) {
      if (!ids.has(pages.projectId(code, page))) {
        warn(`wwwroot/${pages.dir(code)}/${page}: page without a ${rel} entry`);
      }
    }
  }
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}

// Project and ham ids share one namespace, so a module's parent is unambiguous.
// `collections` holds the loaded entries ({ projects, ham }).
export function checkSharedIds(collections) {
  const owner = new Map(); // id -> collection name
  for (const [name, entries] of Object.entries(collections)) {
    for (const { id } of entries) {
      const other = owner.get(id);
      if (other !== undefined && other !== name) {
        fail(`data/${COLLECTIONS[name].file}: id "${id}" is also used in data/${COLLECTIONS[other].file} (ids are unique across both files)`);
      }
      if (other === undefined) owner.set(id, name);
    }
  }
}

// Loads data/modules.json (optional): module pages at
// <lang>/<folder>/<parent page>/<module>.html below a project or ham entry
// (`collections`: the loaded entries, { projects, ham }). Same language rules
// as the collections; a module is also hidden where its parent is. Each entry
// gets `collection` and `folder` (key) of its parent; file order is kept.
export async function loadModules(site, pages, collections, { src = SRC } = {}) {
  const rel = 'data/modules.json';
  const file = path.join(src, rel);
  const data = await exists(file) ? await readJson(file) : [];
  if (!Array.isArray(data)) throw new Error(`${rel}: expected an array`);
  const invalid = validate('modules', rel, data);
  const codes = codesOf(site);
  const { defaultLang } = site;
  const parents = new Map(); // id -> { entry, name }
  for (const [name, entries] of Object.entries(collections)) {
    for (const entry of entries) if (!parents.has(entry.id)) parents.set(entry.id, { entry, name });
  }
  const modules = [];
  const seen = new Set();

  for (const [index, module] of data.entries()) {
    if (invalid.has(String(index))) continue;
    const label = `${rel}[${index}]`;
    const parent = parents.get(module.parent);
    if (!parent) {
      fail(`${label}: parent "${module.parent}" is not in data/projects.json or data/ham.json`);
      continue;
    }
    const key = `${module.parent}/${module.id}`;
    if (seen.has(key)) fail(`${label}: duplicate id "${module.id}" below "${module.parent}"`);
    seen.add(key);
    if (!await exists(path.join(src, module.image))) fail(`${label}: image not found: ${module.image}`);
    checkLangKeys(`${label}.title`, module.title, codes, [defaultLang]);
    checkLangKeys(`${label}.summary`, module.summary, codes, [defaultLang]);

    const { folder } = COLLECTIONS[parent.name];
    const entry = { ...module, collection: parent.name, folder, title: {}, summary: {}, draft: Object.values(module.title).some(isDraftTitle) };
    if (entry.draft) warn(`${label} (${key}): draft (title starts with DRAFT); page built but not linked`);
    for (const code of codes) {
      const hasPage = pages.modulePage(code, module.parent, module.id, folder) !== null;
      const parentPage = pages.projectPage(code, module.parent, folder);
      const pageRel = parentPage === null ? `in the module folder of "${module.parent}"` : `wwwroot/${pages.dir(code)}/${parentPage.slice(0, -5)}/${module.id}.html`;
      const complete = isFilled(module.title[code]) && isFilled(module.summary[code]);
      if (code === defaultLang) {
        if (!hasPage) fail(`${label}: missing page ${pageRel}`);
        if (!complete) fail(`${label}: "${code}" title and summary are required and must not be TODO`);
      } else if (!Object.hasOwn(parent.entry.title, code)) {
        continue; // parent hidden there (the parent warning covers it)
      } else if (!complete) {
        warn(`${label} (${key}): "${code}" title/summary missing or TODO; module hidden in "${code}"`);
        continue;
      } else if (!hasPage) {
        warn(`${label} (${key}): no "${code}" page (${pageRel}); module hidden in "${code}"`);
        continue;
      }
      if (!complete) continue;
      entry.title[code] = module.title[code];
      entry.summary[code] = module.summary[code];
    }
    modules.push(entry);
  }

  const known = new Set(modules.map((module) => `${module.parent}/${module.id}`));
  for (const code of codes) {
    for (const page of pages.files(code).filter((name) => pages.isModulePage(code, name))) {
      const parentId = pages.projectId(code, page);
      const where = `wwwroot/${pages.dir(code)}/${page}`;
      if (parents.get(parentId)?.name !== pages.collectionOf(code, page)) {
        fail(`${where}: module page of an unknown parent "${parentId}"`);
      } else if (!known.has(`${parentId}/${pages.moduleId(code, page)}`)) {
        fail(`${where}: module page without a ${rel} entry`);
      }
    }
  }
  for (const group of pages.groups) {
    const page = group.paths[defaultLang];
    if (page === undefined || !pages.isModulePage(defaultLang, page)) continue;
    const key = `${pages.projectId(defaultLang, page)}/${pages.moduleId(defaultLang, page)}`;
    if (!known.has(key)) fail(`data/pages.json[${group.index}]: no module "${key}" in ${rel}`);
  }
  return modules;
}

// Flat view of a project (or ham entry, module) in one language (`title`,
// `summary`, `tags` are plain values); null when it is not available there.
export function localize(project, lang) {
  if (!Object.hasOwn(project.title, lang)) return null;
  return { ...project, title: project.title[lang], summary: project.summary[lang], tags: project.tags?.[lang] ?? [] };
}
