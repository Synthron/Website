// Tests for the output checks (checks.mjs): broken-link detection with a
// temporary directory (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { errors, SRC, warnings } from './util.mjs';
import {
  checkAnchors, checkFirmwareManifests, checkFlasherHtaccess, checkHtmlLang, checkLanguageLinks, checkLinks, checkModuleLinks, checkOrphanPages,
  checkPlaceholderText, checkTranslationCoverage, isPlaceholderImg,
} from './checks.mjs';

let base;

test.before(async () => {
  base = await mkdtemp(path.join(tmpdir(), 'site-check-'));
  await mkdir(path.join(base, 'css'), { recursive: true });
  await mkdir(path.join(base, 'assets', 'img'), { recursive: true });
  await writeFile(path.join(base, 'css', 'base.css'), '');
  await writeFile(path.join(base, 'assets', 'img', 'pic.webp'), '');
});

test.after(async () => {
  await rm(base, { recursive: true, force: true });
});

test('checkLinks accepts files that exist and strips ?v= before resolving', async () => {
  errors.length = 0;
  const html = '<link href="../css/base.css?v=abc123" rel="stylesheet">';
  await checkLinks('html/projects.html', html, base);
  assert.deepEqual(errors, []);
});

test('checkLinks rejects a missing target with a file:line reference', async () => {
  errors.length = 0;
  const html = '<img src="../assets/img/nope.webp" alt="">';
  await checkLinks('html/projects.html', html, base);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /wwwroot\/html\/projects\.html:\d+:\d+: broken link "\.\.\/assets\/img\/nope\.webp"/);
});

test('checkLinks checks every srcset candidate independently', async () => {
  errors.length = 0;
  const html = '<img srcset="assets/img/pic.webp 640w, assets/img/missing.webp 960w" alt="">';
  await checkLinks('index.html', html, base);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /broken link "assets\/img\/missing\.webp"/);
});

test('checkLinks ignores external and same-page schemes', async () => {
  errors.length = 0;
  const html = '<a href="https://example.com/x">x</a><a href="#section">s</a>';
  await checkLinks('index.html', html, base);
  assert.deepEqual(errors, []);
});

// --- language-aware checks ---------------------------------------------------

const site = { defaultLang: 'de', languages: [{ code: 'de' }, { code: 'en' }] };
const pageDir = (code) => code;
const reset = () => { errors.length = 0; warnings.length = 0; };

// Page index stub: pages pair by identical path; `folders` maps folder keys per language ({ ham: { de: 'afu' } }).
const COLLECTION_OF_KEY = { proj: 'projects', ham: 'ham' };
const indexOf = (files, folders = {}) => ({
  dir: pageDir,
  files: (code) => files[code] ?? [],
  counterparts: (code, file) => new Map(Object.keys(files).filter((other) => files[other].includes(file)).map((other) => [other, file])),
  projectId: (code, file) => path.posix.basename(file, '.html'),
  collectionOf: (code, file) => COLLECTION_OF_KEY[Object.keys(COLLECTION_OF_KEY).find((key) => file.startsWith(`${folders[key]?.[code] ?? key}/`))],
  isModulePage: (code, file) => file.split('/').length === 3,
});

test('checkLinks and checkAnchors work across language folders', async () => {
  reset();
  await checkLinks('en/proj/a.html', '<link href="../../css/base.css"><a href="../about.html">x</a>', base);
  assert.equal(errors.length, 1); // en/about.html does not exist in the temp tree
  reset();
  checkAnchors([
    ['en/a.html', '<a href="b.html#top">x</a><h2 id="x">'],
    ['en/b.html', '<h2 id="top">'],
    ['de/c.html', '<a href="../en/b.html#top">x</a><a href="../en/b.html#nope">y</a>'],
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /nope/);
  reset();
});

test('checkOrphanPages warns about project and ham pages without data in their language', () => {
  reset();
  const byId = new Map([['a', { id: 'a', title: { de: 'A' } }]]);
  const info = new Map([
    ['de/proj/a.html', { lang: 'de', pagePath: 'proj/a.html' }],
    ['en/proj/a.html', { lang: 'en', pagePath: 'proj/a.html' }],
    ['de/proj/b.html', { lang: 'de', pagePath: 'proj/b.html' }],
    ['de/ham/a.html', { lang: 'de', pagePath: 'ham/a.html' }],
    ['de/about.html', { lang: 'de', pagePath: 'about.html' }],
    ['de/other/x.html', { lang: 'de', pagePath: 'other/x.html' }],
    ['de/proj/a/modul.html', { lang: 'de', pagePath: 'proj/a/modul.html' }],
    ['de/proj/b/modul.html', { lang: 'de', pagePath: 'proj/b/modul.html' }],
  ]);
  checkOrphanPages(info, indexOf({}), { projects: byId, ham: new Map() });
  assert.equal(warnings.length, 3);
  assert.match(warnings[0], /en\/proj\/a\.html: entry "a" has no "en" data/);
  assert.match(warnings[1], /de\/proj\/b\.html: proj\/ page without a data entry/);
  assert.match(warnings[2], /de\/ham\/a\.html: ham\/ page without a data entry/);
  reset();
});

test('checkOrphanPages and checkTranslationCoverage use the mapped folder of each language', () => {
  reset();
  const folders = { ham: { de: 'afu' } };
  const info = new Map([
    ['de/afu/a.html', { lang: 'de', pagePath: 'afu/a.html' }],
    ['de/ham/b.html', { lang: 'de', pagePath: 'ham/b.html' }],
    ['en/ham/c.html', { lang: 'en', pagePath: 'ham/c.html' }],
  ]);
  checkOrphanPages(info, indexOf({}, folders), { projects: new Map(), ham: new Map([['c', { id: 'c', title: { de: 'C', en: 'C' } }]]) });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /de\/afu\/a\.html: afu\/ page without a data entry/);
  reset();
  checkTranslationCoverage(site, indexOf({ de: ['afu/h.html', 'ham/x.html'], en: [] }, folders));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /de\/ham\/x\.html: no counterpart in "en"/);
  reset();
});

test('checkModuleLinks warns when an overview page does not link a module page', () => {
  reset();
  checkModuleLinks([
    ['de/proj/a.html', '<a href="a/eins.html">1</a><a href="../proj/a/zwei.html?x#top">2</a><a href="https://example.com/a/drei.html">3</a>'],
    ['de/proj/a/eins.html', '<a href="../a.html">back</a>'],
  ], [
    ['de/proj/a.html', 'de/proj/a/eins.html'],
    ['de/proj/a.html', 'de/proj/a/zwei.html'],
    ['de/proj/a.html', 'de/proj/a/drei.html'],
    ['de/proj/missing.html', 'de/proj/missing/x.html'],
  ]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^wwwroot\/de\/proj\/a\.html: no link to its module page de\/proj\/a\/drei\.html/);
  reset();
});

test('checkHtmlLang requires the folder language on language pages', () => {
  reset();
  checkHtmlLang('en/a.html', '<html lang="en">', { lang: 'en', isCommon: false });
  checkHtmlLang('en/b.html', '<html lang="de">', { lang: 'en', isCommon: false });
  checkHtmlLang('404.html', '<html lang="de">', { lang: 'en', isCommon: true });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /en\/b\.html: <html lang="de"> must be "en"/);
  reset();
});

test('checkTranslationCoverage fails without a default counterpart and warns about missing translations', () => {
  reset();
  checkTranslationCoverage(site, indexOf({ de: ['a.html', 'b.html', 'proj/p.html', 'proj/p/m.html', 'ham/h.html'], en: ['a.html', 'only-en.html'] }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /en\/only-en\.html: page has no "de" counterpart/);
  assert.equal(warnings.length, 1); // b.html; proj/ and ham/ pages (module pages included) are covered by the data warnings
  assert.match(warnings[0], /de\/b\.html: no counterpart in "en"/);
  reset();
  checkTranslationCoverage({ ...site, languages: [{ code: 'de' }] }, indexOf({ de: ['a.html'] }));
  assert.deepEqual([errors, warnings], [[], []]);
});

test('checkLanguageLinks warns about links into other language folders and fails on html/', () => {
  reset();
  const pages = [
    ['de/a.html', '<a href="../en/a.html">x</a><a href="../en/a.html" hreflang="en">y</a><a href="b.html">z</a><a href="../html/old.html">o</a>'],
    ['index.html', '<a href="en/a.html">x</a>'],
  ];
  const info = new Map([['de/a.html', { lang: 'de', isCommon: false }], ['index.html', { lang: 'de', isCommon: true }]]);
  checkLanguageLinks(pages, info, site, pageDir);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /de\/a\.html:1:1: link into the "en" folder/);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /removed html\/ folder/);
  reset();
});

test('checkLanguageLinks leaves html/ alone while a language still lives there', () => {
  reset();
  const info = new Map([['index.html', { lang: 'de', isCommon: false }]]);
  checkLanguageLinks([['index.html', '<a href="html/about.html">x</a>']], info, site, (code) => (code === 'de' ? 'html' : code));
  assert.deepEqual([errors, warnings], [[], []]);
});

test('checkFlasherHtaccess warns when a flasher page is not covered by the CSP exception', () => {
  reset();
  const htaccess = '<Files "nixie-clock.html">\nHeader always set Content-Security-Policy "style-src \'self\' \'unsafe-inline\'"\n</Files>\n<Files "other.html">\nHeader set X-Test 1\n</Files>';
  const button = '<esp-web-install-button manifest="m.json">';
  checkFlasherHtaccess([['de/proj/nixie-clock.html', button], ['en/proj/nixie-clock.html', button], ['en/proj/clock-en.html', button], ['de/about.html', '<p>']], htaccess);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /en\/proj\/clock-en\.html: flasher page "clock-en\.html"/);
  reset();
  checkFlasherHtaccess([['en/proj/clock-en.html', button]], '<FilesMatch "^(nixie-clock|clock-en)\\.html$">\nHeader set CSP "unsafe-inline"\n</FilesMatch>');
  assert.deepEqual(warnings, []);
});

test('the real .htaccess covers the flasher page in every language folder', async () => {
  reset();
  const htaccess = await readFile(path.join(SRC, '.htaccess'), 'utf8');
  const button = '<esp-web-install-button manifest="m.json">';
  checkFlasherHtaccess([['de/proj/nixie-clock.html', button], ['en/proj/nixie-clock.html', button]], htaccess);
  assert.deepEqual(warnings, []);
  checkFlasherHtaccess([['en/proj/renamed.html', button]], htaccess);
  assert.equal(warnings.length, 1);
  reset();
});

test('checkAnchors fails on aria-labelledby/aria-describedby references to unknown ids', () => {
  reset();
  checkAnchors([['de/a.html', '<section aria-labelledby="t"><h2 id="t">T</h2></section><div aria-describedby="t  gone"></div><section aria-labelledby="x"></section>']]);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /de\/a\.html:1:\d+: aria-describedby references unknown id "gone"/);
  assert.match(errors[1], /aria-labelledby references unknown id "x"/);
  reset();
});

test('checkPlaceholderText warns about TODO markers outside comments, once per page', () => {
  reset();
  checkPlaceholderText([
    ['en/a.html', '<!-- TODO: not counted -->\n<title>TODO_Start</title>\n<p>TODO: text</p><h2>TODO</h2>'],
    ['de/b.html', '<p>TODOS, todo and MYTODO are fine</p><!-- TODO -->'],
  ]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /^wwwroot\/en\/a\.html: 3 leftover TODO marker\(s\)/);
  reset();
});

test('checkFirmwareManifests rejects part paths outside the suite folder', async () => {
  reset();
  const suite = path.join(base, 'assets', 'firmware', 'demo');
  await mkdir(suite, { recursive: true });
  await writeFile(path.join(suite, 'firmware.bin'), '');
  await writeFile(path.join(base, 'assets', 'outside.bin'), '');
  const paths = ['firmware.bin', '../../outside.bin', '/abs.bin', 'C:/x.bin', 'https://example.com/f.bin', 'sub\\f.bin'];
  const manifest = { builds: [{ chipFamily: 'ESP32', parts: paths.map((file) => ({ path: file, offset: 0x10000 })) }] };
  await writeFile(path.join(suite, 'manifest.json'), JSON.stringify(manifest));
  await checkFirmwareManifests(base);
  assert.equal(errors.length, 5);
  for (const error of errors) assert.match(error, /must be a relative path inside the suite folder/);
  reset();
});

test('isPlaceholderImg matches the reserved placeholder SVGs only', () => {
  assert.equal(isPlaceholderImg('assets/img/placeholder.svg'), true);
  assert.equal(isPlaceholderImg('assets/img/placeholder-square.svg'), true);
  assert.equal(isPlaceholderImg('assets/img/placeholder-portrait.svg'), true);
  assert.equal(isPlaceholderImg('assets/img/sy317_pic.webp'), false);
  assert.equal(isPlaceholderImg('assets/img/photo-placeholder.svg'), false);
});

