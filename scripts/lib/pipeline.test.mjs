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
