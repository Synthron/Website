import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectionOf, isTodo, loadHam, loadNav, loadPages, loadProjects, loadSite, loadStrings, localize } from './data.mjs';
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

test('collectionOf maps page folders to collections', () => {
  assert.equal(collectionOf('proj/a.html'), 'projects');
  assert.equal(collectionOf('ham/a.html'), 'ham');
  assert.equal(collectionOf('hamradio.html'), undefined);
  assert.equal(collectionOf(undefined), undefined);
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
