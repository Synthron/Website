// Tests for the language-aware parts of the page pipeline (pipeline.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPage, applyDirectives, applyTokens } from './pipeline.mjs';
import { errors } from './util.mjs';

const site = {
  defaultLang: 'de',
  languages: [{ code: 'de' }, { code: 'en' }],
  name: 'DM7WB',
  year: 2026,
  footerNote: { de: 'Keine Cookies.', en: 'No cookies.' },
};
const pageDir = (code) => (code === 'de' ? 'html' : code);

test('classifyPage reads the language from the folder', () => {
  assert.deepEqual(classifyPage('html/proj/sy317.html', '', '../../', site, pageDir),
    { lang: 'de', isCommon: false, langRoot: '../', pagePath: 'proj/sy317.html' });
  assert.deepEqual(classifyPage('en/about.html', '', '../', site, pageDir),
    { lang: 'en', isCommon: false, langRoot: '', pagePath: 'about.html' });
});

test('classifyPage reads the language of common pages from <html lang>', () => {
  const page = classifyPage('404.html', '<html lang="en">', '/', site, pageDir);
  assert.deepEqual(page, { lang: 'en', isCommon: true, langRoot: '/', pagePath: undefined });
});

test('classifyPage treats root pages with {{lang}} as default-language pages', () => {
  const page = classifyPage('index.html', '<html lang="{{lang}}">', '', site, pageDir);
  assert.deepEqual(page, { lang: 'de', isCommon: false, langRoot: '', pagePath: undefined });
});

test('classifyPage rejects an unconfigured literal language', () => {
  errors.length = 0;
  const page = classifyPage('index.html', '<html lang="fr">', '', site, pageDir);
  assert.equal(page.lang, 'de');
  assert.equal(errors.length, 1);
  errors.length = 0;
});

test('applyTokens resolves lang, langRoot, footerNote and {{t:key}} per page language', () => {
  const ctx = { rel: 'en/a.html', site, lang: 'en', langRoot: '../', root: '../', strings: { menu: 'Menu <1>', status: {} } };
  assert.equal(applyTokens('{{lang}}|{{langRoot}}|{{footerNote}}|{{t:menu}}', ctx), 'en|../|No cookies.|Menu &lt;1&gt;');
});

test('applyTokens fails on an unknown or non-text UI string', () => {
  errors.length = 0;
  const ctx = { rel: 'en/a.html', site, lang: 'en', langRoot: '', root: '', strings: { status: {} } };
  assert.equal(applyTokens('{{t:missing}}{{t:status}}', ctx), '');
  assert.equal(errors.length, 2);
  errors.length = 0;
});

test('applyTokens resolves {{projectsPage}} and {{hamPage}} per page language via pages.json', () => {
  const pages = { pageName: (file, code) => ({ 'projekte.html': { de: 'projekte.html', en: 'projects.html' }, 'amateurfunk.html': { de: 'amateurfunk.html', en: 'hamradio.html' } }[file]?.[code] ?? file) };
  const ctx = { rel: 'de/proj/a.html', site, lang: 'de', langRoot: '../', root: '../', strings: {}, pages };
  assert.equal(applyTokens('{{projectsPage}}|{{hamPage}}', ctx), 'projekte.html|amateurfunk.html');
  assert.equal(applyTokens('{{projectsPage}}|{{hamPage}}', { ...ctx, rel: 'en/proj/a.html', lang: 'en' }), 'projects.html|hamradio.html');
});

test('applyTokens resolves {{folder:<key>}} to the folder of the page language and fails on unknown keys', () => {
  errors.length = 0;
  const names = { ham: { de: 'afu', en: 'ham' }, proj: { de: 'proj', en: 'proj' } };
  const pages = { folder: (key, code) => names[key]?.[code] };
  const ctx = { rel: 'de/a.html', site, lang: 'de', langRoot: '', root: '../', strings: {}, pages };
  assert.equal(applyTokens('{{langRoot}}{{folder:ham}}x.html|{{ folder:proj }}', ctx), 'afu/x.html|proj/');
  assert.equal(applyTokens('{{folder:ham}}', { ...ctx, rel: 'en/a.html', lang: 'en' }), 'ham/');
  assert.equal(applyTokens('{{folder:blog}}', ctx), '');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown collection folder \{\{folder:blog\}\}/);
  errors.length = 0;
});

test('applyDirectives renders no @nav on common pages', () => {
  const ctx = { rel: 'index.html', lang: 'de', root: '', isCommon: true, site, pages: { base: () => '' } };
  const nav = [{ label: 'Start', href: 'index.html', external: false }];
  assert.equal(applyDirectives('<!-- @nav -->', ctx, {}, nav, nav, {}), '');
  assert.match(applyDirectives('<!-- @nav -->', { ...ctx, isCommon: false }, {}, nav, nav, {}), /<ul class="site-nav__list">/);
});

test('applyDirectives @tag-filter uses the list and count words of from=', () => {
  errors.length = 0;
  const ctx = { rel: 'de/hamradio.html', lang: 'de', root: '../', site };
  const lists = { projects: [], ham: [{ id: 'a', tags: ['antenne'] }, { id: 'b', tags: ['contest'] }] };
  const strings = { all: 'Alle', countSingular: 'Projekt', countPlural: 'Projekte', hamCountSingular: 'Seite', hamCountPlural: 'Seiten' };
  const html = applyDirectives('<!-- @tag-filter ham-list from=ham -->', ctx, lists, [], [], strings);
  assert.match(html, /data-tag-filter="ham-list"/);
  assert.match(html, /data-tag="contest"/);
  assert.match(html, />2 Seiten<\/p>/);
  assert.equal(applyDirectives('<!-- @tag-filter x from=nope -->', ctx, lists, [], [], strings), '');
  assert.equal(errors.length, 1);
  errors.length = 0;
});
