import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkSharedIds, isTodo, loadFolders, loadHam, loadModules, loadNav, loadPages, loadProjects, loadSite, loadStrings, localize } from './data.mjs';
import { SRC, errors, warnings } from './util.mjs';

const reset = () => { errors.length = 0; warnings.length = 0; };
const dirs = [];

test.after(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

// Writes a temporary source tree: objects become JSON, strings are written as-is.
async function fixture(files) {
  const dir = await mkdtemp(path.join(tmpdir(), 'site-data-'));
  dirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

const LANGS = [{ code: 'de', name: 'Deutsch', locale: 'de_DE', flag: 'assets/icons/de.svg' }, { code: 'en', name: 'English', locale: 'en_GB', flag: 'assets/icons/en.svg' }];
const SITE = { languages: LANGS, defaultLang: 'de' };
const BASE_FILES = { 'assets/icons/de.svg': '', 'assets/icons/en.svg': '', 'assets/img/p.svg': '' };
const PROJECT = {
  id: 'a', title: { de: 'Titel', en: 'Title' }, summary: { de: 'Text', en: 'Text' }, tags: { de: ['elektronik'], en: ['electronics'] },
  status: 'fertig', date: '2026-05', links: { repo: null, demo: null }, image: 'assets/img/p.svg', featured: false,
};
const PAGES = { 'de/proj/a.html': '', 'en/proj/a.html': '', 'de/about.html': '', 'en/about.html': '' };
const withProjects = async (projects, pagesJson = [], extra = {}) => {
  const src = await fixture({ ...BASE_FILES, ...PAGES, ...extra, 'data/projects.json': projects, 'data/pages.json': pagesJson });
  return { src, pages: await loadPages(SITE, { src }) };
};

const project = {
  id: 'demo',
  title: { de: 'Titel' },
  summary: { de: 'Text' },
  tags: { de: ['hardware'] },
};

test('isTodo detects TODO placeholders only', () => {
  assert.equal(isTodo('TODO'), true);
  assert.equal(isTodo('TODO: translate'), true);
  assert.equal(isTodo('Todos are fine'), false);
  assert.equal(isTodo(undefined), false);
});

test('localize returns a flat view or null', () => {
  assert.deepEqual(localize(project, 'de'), { ...project, title: 'Titel', summary: 'Text', tags: ['hardware'] });
  assert.equal(localize(project, 'en'), null);
});

// --- loadSite ----------------------------------------------------------------

const siteJson = (patch = {}) => ({
  languages: LANGS, defaultLang: 'de', name: 'N', url: 'https://example.com', footerNote: { de: 'a', en: 'b' }, email: 'a@b.de', ...patch,
});

test('loadSite accepts a valid multi-language config', async () => {
  reset();
  const src = await fixture({ ...BASE_FILES, 'data/site.json': siteJson() });
  const site = await loadSite({ src });
  assert.deepEqual(site.languages.map((language) => language.code), ['de', 'en']);
  assert.equal(site.defaultLang, 'de');
  assert.deepEqual(errors, []);
});

test('loadSite reports an unknown default language, duplicates, missing flags and footer notes', async () => {
  reset();
  const src = await fixture({
    'assets/icons/de.svg': '',
    'data/site.json': siteJson({ languages: [LANGS[0], LANGS[0], LANGS[1]], defaultLang: 'fr', footerNote: { de: 'a', fr: 'x' } }),
  });
  await loadSite({ src });
  const text = errors.join('\n');
  assert.match(text, /duplicate language code "de"/);
  assert.match(text, /defaultLang: "fr" is not a configured language/);
  assert.match(text, /languages\[2\]\.flag: file not found/);
  assert.match(text, /footerNote: unknown language "fr"/);
  assert.match(text, /footerNote: missing language "en"/);
  reset();
});

// --- loadStrings -------------------------------------------------------------

test('loadStrings validates keys, status labels and language blocks', async () => {
  reset();
  const real = JSON.parse(await readFile(path.join(SRC, 'data/strings.json'), 'utf8'));
  const incomplete = { ...real.de, status: { fertig: 'x', unbekannt: 'y' } };
  delete incomplete.menu;
  const src = await fixture({ 'data/strings.json': { de: real.de, en: incomplete, fr: real.de } });
  const strings = await loadStrings(SITE, { src });
  assert.deepEqual(Object.keys(strings), ['de', 'en']);
  const text = errors.join('\n');
  assert.match(text, /data\/strings\.json: unknown language "fr"/);
  assert.match(text, /en: must have required property 'menu'/);
  assert.match(text, /en\.status: missing label for "in Arbeit"/);
  assert.match(text, /en\.status: unknown status "unbekannt"/);
  reset();
});

// --- loadNav -----------------------------------------------------------------

test('loadNav returns one list per language and checks the lang of cross-language entries', async () => {
  reset();
  const src = await fixture({
    'data/nav.json': {
      de: [{ label: 'Impressum', href: 'impressum.html' }],
      en: [{ label: 'Imprint', href: 'impressum.html', lang: 'de' }, { label: 'X', href: 'x.html', lang: 'fr' }, { label: 'Ext', href: 'https://example.com' }],
    },
  });
  const nav = await loadNav('nav.json', SITE, { src });
  assert.deepEqual(nav.de, [{ label: 'Impressum', href: 'impressum.html', external: false }]);
  assert.deepEqual(nav.en.map((item) => [item.href, item.lang, item.external]), [['impressum.html', 'de', false], ['https://example.com', undefined, true]]);
  assert.match(errors.join('\n'), /en\[1\]\.lang: "fr" is not a configured language/);
  reset();
  const missing = await fixture({ 'data/nav.json': { de: [{ label: 'A', href: 'a.html' }] } });
  await loadNav('nav.json', SITE, { src: missing });
  assert.match(errors.join('\n'), /missing language "en"/);
  reset();
});

// --- loadPages ---------------------------------------------------------------

test('loadPages pairs identical paths and mapped names and hides claimed paths from identical pairing', async () => {
  reset();
  const src = await fixture({
    'de/ueber-mich.html': '', 'en/about.html': '', 'de/about.html': '', 'de/proj/a.html': '', 'en/proj/a-en.html': '',
    'data/pages.json': [{ de: 'ueber-mich.html', en: 'about.html' }, { de: 'proj/a.html', en: 'proj/a-en.html' }],
  });
  const pages = await loadPages(SITE, { src });
  assert.deepEqual(errors, []);
  assert.deepEqual([...pages.counterparts('de', 'ueber-mich.html')], [['de', 'ueber-mich.html'], ['en', 'about.html']]);
  // en/about.html is claimed by a group, so the unlisted de/about.html does not pair with it.
  assert.deepEqual([...pages.counterparts('de', 'about.html')], [['de', 'about.html']]);
  assert.equal(pages.projectPage('en', 'a'), 'proj/a-en.html');
  assert.equal(pages.projectPage('de', 'a'), 'proj/a.html');
  assert.equal(pages.projectPage('en', 'b'), null);
  assert.equal(pages.projectId('en', 'proj/a-en.html'), 'a');
  // pageName resolves the mapped name per language; identical paths unmapped.
  assert.equal(pages.pageName('ueber-mich.html', 'en'), 'about.html');
  assert.equal(pages.pageName('ueber-mich.html', 'de'), 'ueber-mich.html');
  assert.equal(pages.pageName('about.html', 'en'), 'about.html');
});

test('loadPages reports unknown languages, missing files, duplicates and proj/ group mistakes', async () => {
  reset();
  const src = await fixture({
    'de/a.html': '', 'en/a.html': '', 'de/proj/p.html': '', 'en/proj/p.html': '', 'de/b.html': '',
    'data/pages.json': [
      { de: 'a.html', fr: 'a.html' },
      { de: 'a.html', en: 'missing.html' },
      { de: 'b.html', en: 'a.html' },
      { de: 'a.html', en: 'a.html' },
      { de: 'proj/p.html', en: 'a.html' },
      { en: 'proj/p.html', de: 'b.html' },
    ],
  });
  await loadPages(SITE, { src });
  const text = errors.join('\n');
  assert.match(text, /\[0\]: unknown language "fr"/);
  assert.match(text, /\[1\]\.en: page not found: wwwroot\/en\/missing\.html/);
  assert.match(text, /\[3\]\.de: "a\.html" is already in/);
  assert.match(text, /\[4\]: a group with proj\/ pages may only contain proj\/ pages/);
  assert.match(text, /\[5\]: a group with proj\/ pages may only contain proj\/ pages/);
  reset();
});

// --- loadProjects ------------------------------------------------------------

test('loadProjects keeps complete languages and localizes them', async () => {
  reset();
  const { src, pages } = await withProjects([PROJECT]);
  const projects = await loadProjects(SITE, pages, { src });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(localize(projects[0], 'en').tags, ['electronics']);
  assert.equal(localize(projects[0], 'de').title, 'Titel');
  assert.equal(projects[0].draft, false);
});

test('loadProjects marks a project as draft when a title starts with DRAFT and warns', async () => {
  reset();
  const { src, pages } = await withProjects([{ ...PROJECT, title: { de: 'Titel', en: 'DRAFT Yagi Antenna' } }, { ...PROJECT, id: 'b', title: { de: 'Drafting', en: 'DRAFTS' } }], [], { 'de/proj/b.html': '', 'en/proj/b.html': '' });
  const projects = await loadProjects(SITE, pages, { src });
  assert.deepEqual(errors, []);
  assert.equal(projects.find((entry) => entry.id === 'a').draft, true);
  assert.equal(projects.find((entry) => entry.id === 'b').draft, false);
  assert.equal(localize(projects.find((entry) => entry.id === 'a'), 'de').draft, true);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\(a\): draft \(title starts with DRAFT\)/);
  reset();
});

test('loadProjects hides a project with TODO or missing texts in another language and warns', async () => {
  reset();
  const todo = { ...PROJECT, title: { de: 'Titel', en: 'TODO' } };
  const missingEn = { ...PROJECT, id: 'b', title: { de: 'T' }, summary: { de: 'S' }, tags: { de: [] } };
  const { src, pages } = await withProjects([todo, missingEn], [], { 'de/proj/b.html': '' });
  const projects = await loadProjects(SITE, pages, { src });
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /\(a\): "en" title\/summary missing or TODO; project hidden in "en"/);
  assert.match(warnings[1], /\(b\): "en" title\/summary missing or TODO/);
  assert.equal(localize(projects.find((entry) => entry.id === 'a'), 'en'), null);
  assert.notEqual(localize(projects.find((entry) => entry.id === 'a'), 'de'), null);
  reset();
});

test('loadProjects fails without default-language texts, with TODO there and with unknown language keys', async () => {
  reset();
  const noDefault = { ...PROJECT, id: 'x', title: { en: 'T' }, summary: { en: 'S' }, tags: { en: [] } };
  const todoDefault = { ...PROJECT, id: 'y', title: { de: 'TODO: Titel', en: 'T' } };
  const unknown = { ...PROJECT, id: 'z', title: { de: 'T', fr: 'T' } };
  const { src, pages } = await withProjects([noDefault, todoDefault, unknown], [], { 'de/proj/x.html': '', 'de/proj/y.html': '', 'de/proj/z.html': '' });
  await loadProjects(SITE, pages, { src });
  const text = errors.join('\n');
  assert.match(text, /\[0\]\.title: missing language "de"/);
  assert.match(text, /\[1\]: "de" title and summary are required and must not be TODO/);
  assert.match(text, /\[2\]\.title: unknown language "fr"/);
  reset();
});

test('loadProjects applies the tag rules per language', async () => {
  reset();
  const upper = { ...PROJECT, tags: { de: ['elektronik', 'Hardware'], en: ['esp32', 'esp32'] } };
  const { src, pages } = await withProjects([upper]);
  await loadProjects(SITE, pages, { src });
  const text = errors.join('\n');
  assert.match(text, /tags\.de\[1\]: must be equal to one of the allowed values: elektronik, /);
  assert.doesNotMatch(text, /tags\.de\[0\]/);
  assert.match(text, /tags\.en: must NOT have duplicate items/);
  reset();
});

test('loadProjects needs the default page, hides projects without another page and warns about orphans', async () => {
  reset();
  const { src, pages } = await withProjects([PROJECT, { ...PROJECT, id: 'nodepage' }], [], { 'en/proj/orphan.html': '' });
  const projects = await loadProjects(SITE, pages, { src });
  assert.match(errors.join('\n'), /\[1\]: missing page wwwroot\/de\/proj\/nodepage\.html/);
  const text = warnings.join('\n');
  assert.match(text, /\(nodepage\): no "en" page \(wwwroot\/en\/proj\/nodepage\.html\); project hidden in "en"/);
  assert.match(text, /en\/proj\/orphan\.html: page without a data\/projects\.json entry/);
  assert.equal(projects.length, 2);
  reset();
});

test('loadProjects checks pages.json groups against the project ids', async () => {
  reset();
  const { src, pages } = await withProjects([PROJECT], [{ de: 'proj/ghost.html', en: 'proj/ghost-en.html' }], { 'de/proj/ghost.html': '', 'en/proj/ghost-en.html': '' });
  await loadProjects(SITE, pages, { src });
  assert.match(errors.join('\n'), /data\/pages\.json\[0\]: no project with id "ghost"/);
  reset();
});

// --- loadHam -----------------------------------------------------------------

test('pages.collectionOf maps page folders to collections', async () => {
  reset();
  const src = await fixture({ 'data/pages.json': [] });
  const pages = await loadPages(SITE, { src });
  assert.equal(pages.collectionOf('de', 'proj/a.html'), 'projects');
  assert.equal(pages.collectionOf('en', 'ham/a.html'), 'ham');
  assert.equal(pages.collectionOf('de', 'hamradio.html'), undefined);
  assert.equal(pages.collectionOf('de', undefined), undefined);
  assert.equal(pages.folder('ham', 'de'), 'ham');
  assert.equal(pages.folder('nope', 'de'), undefined);
  assert.deepEqual(errors, []);
});

test('loadHam accepts slim entries, uses ham/ pages and mapped names', async () => {
  reset();
  const entry = { id: 'h', title: { de: 'H', en: 'H' }, summary: { de: 'S', en: 'S' }, tags: { de: ['antenne'], en: ['antenna'] }, date: '2026-10' };
  const src = await fixture({
    ...BASE_FILES, 'de/ham/h.html': '', 'en/ham/h-en.html': '', 'en/ham/orphan.html': '', 'de/ham/x.html': '', 'en/proj/x.html': '',
    'data/ham.json': [entry, { ...entry, id: 'nopage', status: 'unbekannt', image: 'x.svg', tags: { de: ['antenne', 'kurzwelle'] } }],
    'data/pages.json': [{ de: 'ham/h.html', en: 'ham/h-en.html' }, { de: 'ham/x.html', en: 'proj/x.html' }],
  });
  const pages = await loadPages(SITE, { src });
  assert.equal(pages.projectPage('en', 'h', 'ham'), 'ham/h-en.html');
  const ham = await loadHam(SITE, pages, { src });
  assert.equal(localize(ham.find((item) => item.id === 'h'), 'en').title, 'H');
  const text = errors.join('\n');
  assert.match(text, /\[1\]: a group with ham\/ pages may only contain ham\/ pages/);
  assert.match(text, /ham\.json\[1\]\.status: must be equal to one of the allowed values/);
  assert.match(text, /ham\.json\[1\]: must NOT have additional properties "image"/);
  assert.match(text, /ham\.json\[1\]\.tags\.de\[1\]: must be equal to one of the allowed values: antenne, /);
  assert.doesNotMatch(text, /tags\.de\[0\]/);
  assert.match(warnings.join('\n'), /en\/ham\/orphan\.html: page without a data\/ham\.json entry/);
  reset();
});

// --- Folder mapping (data/folders.json) ----------------------------------------

const HAM_ENTRY = { id: 'h', title: { de: 'H', en: 'H' }, summary: { de: 'S', en: 'S' }, tags: { de: ['antenne'], en: ['antenna'] }, date: '2026-10' };

test('loadFolders maps folder keys per language and defaults to the key', async () => {
  reset();
  const folderOf = await loadFolders(SITE, { src: await fixture({ 'data/folders.json': { ham: { de: 'afu' } } }) });
  assert.equal(folderOf('ham', 'de'), 'afu');
  assert.equal(folderOf('ham', 'en'), 'ham');
  assert.equal(folderOf('proj', 'de'), 'proj');
  assert.equal(folderOf('nope', 'de'), undefined);
  const missing = await loadFolders(SITE, { src: await fixture({}) });
  assert.equal(missing('ham', 'de'), 'ham');
  assert.deepEqual(errors, []);
});

test('loadFolders reports unknown keys and languages, bad names, clashes and leftover pages', async () => {
  reset();
  await loadFolders(SITE, { src: await fixture({ 'data/folders.json': { blog: { de: 'x' }, ham: { fr: 'afu', en: 'Ham Radio' } } }) });
  let text = errors.join('\n');
  assert.match(text, /folders\.json: must NOT have additional properties "blog"/);
  assert.match(text, /folders\.json\.ham\.en: must match pattern/);
  reset();
  await loadFolders(SITE, { src: await fixture({ 'data/folders.json': { ham: { fr: 'afu' } } }) });
  assert.match(errors.join('\n'), /folders\.json\.ham: unknown language "fr"/);
  reset();
  await loadFolders(SITE, { src: await fixture({ 'data/folders.json': { ham: { de: 'proj' }, proj: { en: 'x' } } }) });
  text = errors.join('\n');
  assert.match(text, /folders\.json\.ham\.de: "proj" is the folder key of another collection/);
  reset();
  await loadFolders(SITE, { src: await fixture({ 'data/folders.json': { proj: { de: 'seiten' }, ham: { de: 'seiten' } } }) });
  assert.match(errors.join('\n'), /folders\.json\.ham\.de: "seiten" is already the folder of "proj"/);
  reset();
  await loadFolders(SITE, { src: await fixture({ 'data/folders.json': { ham: { de: 'afu' } }, 'de/ham/old.html': '' }) });
  assert.match(errors.join('\n'), /wwwroot\/de\/ham\/: "ham" pages of "de" live in de\/afu\//);
  reset();
});

test('loadPages pairs mapped collection folders by key and file name', async () => {
  reset();
  const src = await fixture({
    'data/folders.json': { ham: { de: 'afu' } },
    'data/pages.json': [{ de: 'afu/h.html', en: 'ham/h-en.html' }],
    'de/afu/x.html': '', 'en/ham/x.html': '', 'de/afu/h.html': '', 'en/ham/h-en.html': '', 'de/proj/p.html': '', 'en/proj/p.html': '',
  });
  const pages = await loadPages(SITE, { src });
  assert.deepEqual(errors, []);
  assert.deepEqual([...pages.counterparts('de', 'afu/x.html')], [['de', 'afu/x.html'], ['en', 'ham/x.html']]);
  assert.deepEqual([...pages.counterparts('en', 'ham/x.html')], [['de', 'afu/x.html'], ['en', 'ham/x.html']]);
  assert.deepEqual([...pages.counterparts('de', 'proj/p.html')], [['de', 'proj/p.html'], ['en', 'proj/p.html']]);
  assert.equal(pages.projectPage('de', 'x', 'ham'), 'afu/x.html');
  assert.equal(pages.projectPage('en', 'x', 'ham'), 'ham/x.html');
  assert.equal(pages.projectPage('en', 'h', 'ham'), 'ham/h-en.html');
  assert.equal(pages.projectId('en', 'ham/h-en.html'), 'h');
  assert.equal(pages.collectionOf('de', 'afu/x.html'), 'ham');
  assert.equal(pages.collectionOf('en', 'afu/x.html'), undefined);
  assert.equal(pages.collectionOf('de', 'ham/x.html'), undefined);
});

test('loadPages applies the group folder rules with the folder of each language', async () => {
  reset();
  const src = await fixture({
    'data/folders.json': { ham: { de: 'afu' } },
    'data/pages.json': [{ de: 'afu/a.html', en: 'afu/a.html' }, { de: 'afu/b.html', en: 'proj/b.html' }, { de: 'afu/sub/c.html', en: 'ham/c.html' }],
    'de/afu/a.html': '', 'en/afu/a.html': '', 'de/afu/b.html': '', 'en/proj/b.html': '', 'de/afu/sub/c.html': '', 'en/ham/c.html': '',
  });
  await loadPages(SITE, { src });
  const text = errors.join('\n');
  assert.match(text, /\[0\]: a group with ham \(de: afu\/, en: ham\/\) pages may only contain ham \(de: afu\/, en: ham\/\) pages/);
  assert.match(text, /\[1\]: a group with ham \(de: afu\/, en: ham\/\) pages/);
  assert.match(text, /\[2\]: entry pages and module pages cannot be mixed in one group/);
  assert.match(text, /wwwroot\/de\/afu\/sub\/: module folder without its overview page wwwroot\/de\/afu\/sub\.html/);
  reset();
});

test('loadHam finds pages in mapped folders and reports them with the mapped name', async () => {
  reset();
  const src = await fixture({
    ...BASE_FILES, 'data/folders.json': { ham: { de: 'afu' } }, 'data/pages.json': [],
    'data/ham.json': [HAM_ENTRY, { ...HAM_ENTRY, id: 'nopage' }],
    'de/afu/h.html': '', 'en/ham/h.html': '', 'en/ham/orphan.html': '',
  });
  const pages = await loadPages(SITE, { src });
  const ham = await loadHam(SITE, pages, { src });
  assert.equal(localize(ham.find((item) => item.id === 'h'), 'en').title, 'H');
  assert.match(errors.join('\n'), /ham\.json\[1\]: missing page wwwroot\/de\/afu\/nopage\.html/);
  const text = warnings.join('\n');
  assert.match(text, /\(nopage\): no "en" page \(wwwroot\/en\/ham\/nopage\.html\)/);
  assert.match(text, /en\/ham\/orphan\.html: page without a data\/ham\.json entry/);
  reset();
});

// --- Shared ids and module pages ----------------------------------------------

test('checkSharedIds fails on an id used by a project and a ham entry', () => {
  reset();
  checkSharedIds({ projects: [{ id: 'a' }, { id: 'b' }], ham: [{ id: 'c' }, { id: 'a' }] });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /data\/ham\.json: id "a" is also used in data\/projects\.json/);
  reset();
  checkSharedIds({ projects: [{ id: 'a' }, { id: 'a' }], ham: [] });
  assert.deepEqual(errors, []); // duplicates inside one file are reported by its loader
});

const MODULE_FILES = {
  'data/folders.json': { ham: { de: 'afu' } },
  'data/pages.json': [{ de: 'proj/synsps.html', en: 'proj/synplc.html' }, { de: 'proj/synsps/netzteil.html', en: 'proj/synplc/power-supply.html' }],
  'de/proj/synsps.html': '', 'en/proj/synplc.html': '',
  'de/proj/synsps/netzteil.html': '', 'en/proj/synplc/power-supply.html': '',
  'de/proj/synsps/cpu.html': '', 'en/proj/synplc/cpu.html': '',
  'de/afu/h.html': '', 'en/ham/h.html': '',
};
const HAM_MODULE_FILES = { 'de/afu/h/teil.html': '', 'en/ham/h/teil.html': '' };

test('loadPages recognises module pages and pairs them through their overview page', async () => {
  reset();
  const pages = await loadPages(SITE, { src: await fixture({ ...MODULE_FILES, ...HAM_MODULE_FILES }) });
  assert.deepEqual(errors, []);
  assert.equal(pages.isModulePage('de', 'proj/synsps/cpu.html'), true);
  assert.equal(pages.isModulePage('de', 'proj/synsps.html'), false);
  assert.equal(pages.isModulePage('de', 'about.html'), false);
  assert.equal(pages.parentPage('en', 'proj/synplc/cpu.html'), 'proj/synplc.html');
  assert.equal(pages.parentPage('en', 'proj/synplc.html'), undefined);
  assert.equal(pages.projectId('en', 'proj/synplc/cpu.html'), 'synsps');
  assert.equal(pages.projectId('de', 'afu/h/teil.html'), 'h');
  assert.equal(pages.moduleId('en', 'proj/synplc/power-supply.html'), 'netzteil');
  assert.equal(pages.moduleId('en', 'proj/synplc/cpu.html'), 'cpu');
  assert.equal(pages.collectionOf('en', 'ham/h/teil.html'), 'ham');
  assert.equal(pages.modulePage('en', 'synsps', 'cpu'), 'proj/synplc/cpu.html');
  assert.equal(pages.modulePage('en', 'synsps', 'netzteil'), 'proj/synplc/power-supply.html');
  assert.equal(pages.modulePage('de', 'h', 'teil', 'ham'), 'afu/h/teil.html');
  assert.equal(pages.modulePage('en', 'h', 'teil', 'ham'), 'ham/h/teil.html');
  assert.equal(pages.modulePage('de', 'synsps', 'nope'), null);
  assert.equal(pages.modulePage('de', 'nope', 'cpu'), null);
  assert.deepEqual([...pages.counterparts('de', 'proj/synsps/cpu.html')], [['de', 'proj/synsps/cpu.html'], ['en', 'proj/synplc/cpu.html']]);
  assert.deepEqual([...pages.counterparts('en', 'proj/synplc/power-supply.html')], [['de', 'proj/synsps/netzteil.html'], ['en', 'proj/synplc/power-supply.html']]);
  assert.deepEqual([...pages.counterparts('de', 'afu/h/teil.html')], [['de', 'afu/h/teil.html'], ['en', 'ham/h/teil.html']]);
});

test('loadPages fails on deeper nesting and module folders without an overview page (renamed parent hint)', async () => {
  reset();
  await loadPages(SITE, {
    src: await fixture({
      'data/pages.json': [{ de: 'proj/synsps.html', en: 'proj/synplc.html' }],
      'de/proj/synsps.html': '', 'en/proj/synplc.html': '', 'en/proj/synsps/cpu.html': '', 'en/proj/synsps/io.html': '',
      'de/proj/synsps/a/b.html': '', 'de/proj/ghost/x.html': '',
    }),
  });
  const text = errors.join('\n');
  assert.match(text, /wwwroot\/de\/proj\/synsps\/a\/b\.html: nested too deeply/);
  assert.match(text, /wwwroot\/de\/proj\/ghost\/: module folder without its overview page wwwroot\/de\/proj\/ghost\.html$/m);
  assert.match(text, /wwwroot\/en\/proj\/synsps\/: module folder without its overview page wwwroot\/en\/proj\/synsps\.html; the "en" page of "synsps" is proj\/synplc\.html, rename the folder to wwwroot\/en\/proj\/synplc\//);
  assert.equal(errors.filter((message) => message.includes('en/proj/synsps/:')).length, 1);
  reset();
});

test('loadPages checks module groups in data/pages.json', async () => {
  reset();
  await loadPages(SITE, {
    src: await fixture({
      ...MODULE_FILES,
      'data/pages.json': [
        { de: 'proj/synsps.html', en: 'proj/synplc.html' },
        { de: 'proj/synsps/cpu.html', en: 'proj/synplc.html' },
        { de: 'proj/synsps/netzteil.html', en: 'proj/synsps-x/power-supply.html' },
        { de: 'proj/synsps/x/y.html', en: 'proj/synplc/cpu.html' },
      ],
      'de/proj/synsps/x/y.html': '', 'en/proj/synsps-x.html': '', 'en/proj/synsps-x/power-supply.html': '',
    }),
  });
  const text = errors.join('\n');
  assert.match(text, /\[1\]: entry pages and module pages cannot be mixed in one group/);
  assert.match(text, /\[2\]\.en: "proj\/synsps-x\/power-supply\.html" must lie in the module folder of "synsps" \(proj\/synplc\/\)/);
  assert.match(text, /\[3\]: entry pages and module pages cannot be mixed|\[3\]: a proj\/ module group needs/);
  reset();
});

const SYN = { ...PROJECT, id: 'synsps', title: { de: 'SynSPS', en: 'SynPLC' } };
const MODULE = { parent: 'synsps', id: 'cpu', title: { de: 'CPU', en: 'CPU' }, summary: { de: 'S', en: 'S' }, status: 'fertig', date: '2026-09', image: 'assets/img/p.svg' };
async function withModules(modules, extra = {}, projects = [SYN]) {
  const src = await fixture({ ...BASE_FILES, ...MODULE_FILES, ...extra, 'data/projects.json': projects, 'data/ham.json': [HAM_ENTRY], 'data/modules.json': modules });
  const pages = await loadPages(SITE, { src });
  const collections = { projects: await loadProjects(SITE, pages, { src }), ham: await loadHam(SITE, pages, { src }) };
  reset();
  return { modules: await loadModules(SITE, pages, collections, { src }), pages };
}

test('loadModules keeps the file order, localizes and resolves parents in both collections', async () => {
  reset();
  const netzteil = { ...MODULE, id: 'netzteil', title: { de: 'Netzteil', en: 'Power supply' } };
  const teil = { ...MODULE, parent: 'h', id: 'teil' };
  const { modules } = await withModules([MODULE, netzteil, teil], HAM_MODULE_FILES);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(modules.map((module) => [module.parent, module.id, module.collection]), [['synsps', 'cpu', 'projects'], ['synsps', 'netzteil', 'projects'], ['h', 'teil', 'ham']]);
  assert.equal(localize(modules[1], 'en').title, 'Power supply');
  assert.deepEqual(localize(modules[1], 'en').tags, []);
  assert.equal(modules[0].draft, false);
});

test('loadModules hides modules without translation, page or visible parent and marks drafts', async () => {
  reset();
  const todo = { ...MODULE, title: { de: 'CPU', en: 'TODO' } };
  const draft = { ...MODULE, id: 'netzteil', title: { de: 'DRAFT Netzteil', en: 'Power supply' } };
  const nopage = { ...MODULE, id: 'io' };
  const { modules } = await withModules([todo, draft, nopage], { 'de/proj/synsps/io.html': '' });
  assert.deepEqual(errors, []);
  const text = warnings.join('\n');
  assert.match(text, /modules\.json\[0\] \(synsps\/cpu\): "en" title\/summary missing or TODO; module hidden in "en"/);
  assert.match(text, /modules\.json\[1\] \(synsps\/netzteil\): draft/);
  assert.match(text, /modules\.json\[2\] \(synsps\/io\): no "en" page \(wwwroot\/en\/proj\/synplc\/io\.html\); module hidden in "en"/);
  assert.equal(localize(modules[0], 'en'), null);
  assert.equal(modules[1].draft, true);
  assert.equal(localize(modules[2], 'en'), null);
  reset();
  const hidden = await withModules([MODULE, { ...MODULE, id: 'netzteil' }], {}, [{ ...SYN, title: { de: 'SynSPS', en: 'TODO' } }]);
  assert.deepEqual([errors, warnings], [[], []]);
  assert.equal(localize(hidden.modules[0], 'en'), null);
  reset();
});

test('loadModules fails on unknown parents, duplicates, missing default pages and module pages without entry', async () => {
  reset();
  await withModules([
    MODULE, { ...MODULE }, { ...MODULE, parent: 'nope' }, { ...MODULE, id: 'missing' }, { ...MODULE, id: 'netzteil', title: { en: 'X' } },
    { ...MODULE, id: 'img', image: 'assets/img/none.svg' }, { ...MODULE, id: 'bad', status: 'neu' },
  ], { 'de/proj/synsps/img.html': '', 'de/proj/synsps/bad.html': '', 'de/proj/synsps/extra.html': '', 'de/proj/orphan.html': '', 'de/proj/orphan/m.html': '' });
  const text = errors.join('\n');
  assert.match(text, /modules\.json\[1\]: duplicate id "cpu" below "synsps"/);
  assert.match(text, /modules\.json\[2\]: parent "nope" is not in data\/projects\.json or data\/ham\.json/);
  assert.match(text, /modules\.json\[3\]: missing page wwwroot\/de\/proj\/synsps\/missing\.html/);
  assert.match(text, /modules\.json\[4\]\.title: missing language "de"/);
  assert.match(text, /modules\.json\[5\]: image not found: assets\/img\/none\.svg/);
  assert.match(text, /modules\.json\[6\]\.status: must be equal to one of the allowed values/);
  assert.match(text, /wwwroot\/de\/proj\/synsps\/extra\.html: module page without a data\/modules\.json entry/);
  assert.match(text, /wwwroot\/de\/proj\/orphan\/m\.html: module page of an unknown parent "orphan"/);
  reset();
});
