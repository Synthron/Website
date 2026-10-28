// Tests for the HTML renderers (render.mjs): renderNav aria-current handling
// and sitemap generation (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { ogImageRel, renderCard, renderEntryList, renderLangSwitch, renderLinks, renderMeta, renderNav, renderOpenGraph, renderSitemap } from './render.mjs';

// --- renderNav --------------------------------------------------------------

const NAV = [
  { label: 'Start', href: 'index.html', external: false },
  { label: 'Über mich', href: 'html/about.html', external: false },
  { label: 'Beispiel', href: 'https://example.com', external: true },
];

// Transitional layout: nav hrefs of the default language are rooted at the web root.
const pageIndex = { base: (code) => (code === 'de' ? '' : `${code}/`), dir: (code) => (code === 'de' ? 'html' : code), projectPage: (code, id) => `proj/${id}.html` };
const ctxFor = (rel, root, extra = {}) => ({ rel, root, lang: 'de', pages: pageIndex, ...extra });

test('renderNav prefixes the web root and marks the current page', () => {
  const html = renderNav(NAV, ctxFor('html/about.html', '../'));
  assert.match(html, /href="\.\.\/index\.html"/);
  assert.match(html, /href="\.\.\/html\/about\.html" aria-current="page"/);
  assert.match(html, /href="\.\.\/html\/about\.html"[^>]*aria-current="page"/);
});

test('renderNav does not mark a non-current page', () => {
  const html = renderNav(NAV, ctxFor('index.html', ''));
  assert.doesNotMatch(html, /href="\.\.\/html\/about\.html"/);
  assert.match(html, /href="html\/about\.html"/);
});

test('renderNav renders external links with rel=noopener noreferrer', () => {
  const html = renderNav(NAV, ctxFor('index.html', ''));
  assert.match(html, /href="https:\/\/example\.com" rel="noopener noreferrer"/);
});

test('renderNav handles the footer variant classes', () => {
  const html = renderNav(NAV, ctxFor('index.html', ''), { list: 'site-footer__list', link: 'site-footer__link' });
  assert.match(html, /class="site-footer__list"/);
  assert.match(html, /class="site-footer__link"/);
});

test('renderNav prefixes the language folder and marks cross-language entries', () => {
  const items = [{ label: 'About', href: 'about.html', external: false }, { label: 'Impressum (German)', href: 'impressum.html', external: false, lang: 'de' }];
  const html = renderNav(items, ctxFor('en/about.html', '../', { lang: 'en' }));
  assert.match(html, /href="\.\.\/en\/about\.html" aria-current="page"/);
  assert.match(html, /href="\.\.\/impressum\.html" lang="de" hreflang="de"/);
});

// --- renderLangSwitch --------------------------------------------------------

const MULTI = {
  languages: [
    { code: 'de', name: 'Deutsch', flag: 'assets/icons/flag-de.svg' },
    { code: 'en', name: 'English', flag: 'assets/icons/flag-gb.svg' },
  ],
};
const UI = { languageLabel: 'Sprache' };

test('renderLangSwitch renders nothing for a single language', () => {
  assert.equal(renderLangSwitch(ctxFor('index.html', ''), { languages: MULTI.languages.slice(0, 1) }, UI), '');
});

test('renderLangSwitch links the paired page, falls back to the home and marks the current language', () => {
  const versions = [{ lang: 'de', rel: 'html/ueber-mich.html' }];
  const html = renderLangSwitch(ctxFor('html/ueber-mich.html', '../', { versions }), MULTI, UI);
  assert.match(html, /<nav class="lang-switch" aria-label="Sprache">/);
  assert.match(html, /href="\.\.\/html\/ueber-mich\.html" lang="de" hreflang="de" aria-label="Deutsch" aria-current="true"/);
  assert.match(html, /href="\.\.\/en\/index\.html" lang="en" hreflang="en" aria-label="English"><img[^>]+src="\.\.\/assets\/icons\/flag-gb\.svg" alt=""/);
  assert.equal(html.match(/aria-current/g).length, 1);
});

test('renderLangSwitch marks no current language on common pages', () => {
  const html = renderLangSwitch(ctxFor('index.html', '', { isCommon: true }), MULTI, UI);
  assert.doesNotMatch(html, /aria-current/);
  assert.match(html, /href="index\.html" lang="de"/);
});

// --- project renderers -------------------------------------------------------

const PROJECT = { id: 'sy317', title: 'A <b>', summary: 'S', tags: ['hardware'], status: 'fertig', date: '2026-05', image: 'assets/img/x.svg', links: { repo: 'https://example.com/r', demo: null } };
const STRINGS = { lang: 'en', status: { fertig: 'done' }, projectLinkFor: 'for', tagsLabel: 'Tags', repo: 'Source', demo: 'Demo' };

test('renderMeta shows the translated status label and keeps the German key as hook', () => {
  const html = renderMeta(PROJECT, STRINGS);
  assert.match(html, /<span class="status" data-status="fertig">done<\/span>/);
  assert.match(html, /May 2026/);
});

test('renderLinks uses the translated connector word', () => {
  assert.match(renderLinks(PROJECT, '', STRINGS), /<span class="visually-hidden"> for A &lt;b&gt;<\/span>/);
});

test('renderMeta omits the status of entries without one', () => {
  const html = renderMeta({ date: '2026-05' }, STRINGS);
  assert.doesNotMatch(html, /class="status"/);
  assert.match(html, /<time datetime="2026-05">/);
});

test('renderEntryList renders tagged list items, skips drafts and shows a message when empty', () => {
  const entry = { id: 't2lt', title: 'T2LT', summary: 'S', tags: ['antenne'], date: '2026-10' };
  const ctx = ctxFor('html/hamradio.html', '../', { pages: { ...pageIndex, projectPage: (code, id, folder) => `${folder}/${id}.html` } });
  const html = renderEntryList([entry, { ...entry, id: 'draft', draft: true }], ['level=2', 'id=ham-list'], ctx, STRINGS);
  assert.match(html, /^<ul class="entry-list" id="ham-list">/);
  assert.match(html, /<li class="entry-list__item" data-tags="\[&quot;antenne&quot;\]">/);
  assert.match(html, /<h2 class="entry-list__title"><a class="entry-list__link" href="\.\.\/html\/ham\/t2lt\.html">T2LT<\/a><\/h2>/);
  assert.doesNotMatch(html, /draft/);
  assert.equal(renderEntryList([], ['id=ham-list'], ctx, { ...STRINGS, noHamPages: 'Leer' }), '<p class="message" id="ham-list">Leer</p>');
});

test('renderCard links the project page of the page language', () => {
  const html = renderCard(PROJECT, ctxFor('html/projects.html', '../'), 3, STRINGS);
  assert.match(html, /href="\.\.\/html\/proj\/sy317\.html"/);
  assert.match(html, /data-tags="\[&quot;hardware&quot;\]"/);
  const english = renderCard(PROJECT, ctxFor('en/projects.html', '../', { lang: 'en', pages: { ...pageIndex, projectPage: () => 'proj/sy317-regulator.html' } }), 3, STRINGS);
  assert.match(english, /href="\.\.\/en\/proj\/sy317-regulator\.html"/);
});

// --- renderSitemap -----------------------------------------------------------

const projectByRel = new Map([
  ['html/proj/sy317.html', { id: 'sy317', date: '2026-05' }],
  ['html/proj/draft-proj.html', { id: 'draft-proj', date: '2026-06', draft: true }],
]);

const pages = [
  ['index.html', '<html>'],
  ['html/projects.html', '<html>'],
  ['html/proj/sy317.html', '<html>'],
  ['html/proj/draft-proj.html', '<html>'],
  ['404.html', '<html>'],
];

test('renderSitemap maps pages, lastmod for projects and git pages, skips 404 and drafts', () => {
  const lastmodByRel = new Map([['html/projects.html', '2026-09-01'], ['index.html', '2026-09-02']]);
  const xml = renderSitemap(pages, 'https://dm7wb.de', projectByRel, lastmodByRel);
  assert.match(xml, /<loc>https:\/\/dm7wb.de\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/dm7wb.de\/html\/projects\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/dm7wb.de\/html\/proj\/sy317\.html<\/loc>/);
  assert.match(xml, /<lastmod>2026-05-01<\/lastmod>/); // project pages from their date
  assert.match(xml, /<lastmod>2026-09-01<\/lastmod>/); // non-project pages from git
  assert.match(xml, /<lastmod>2026-09-02<\/lastmod>/); // index.html from git
  assert.doesNotMatch(xml, /draft-proj/);
  assert.doesNotMatch(xml, /404\.html/);
});

// --- Open Graph / canonical --------------------------------------------------

const SITE = {
  url: 'https://dm7wb.de',
  name: 'DM7WB',
  defaultLang: 'de',
  languages: [{ code: 'de', locale: 'de_DE' }, { code: 'en', locale: 'en_GB' }],
};

test('ogImageRel picks raster project images and falls back to the default PNG', () => {
  assert.equal(ogImageRel({ image: 'assets/img/sy317_pic.webp' }), 'assets/img/sy317_pic.webp');
  assert.equal(ogImageRel({ image: 'assets/img/placeholder.svg' }), 'assets/img/og-default.png');
  assert.equal(ogImageRel(undefined), 'assets/img/og-default.png');
});

test('renderOpenGraph emits canonical + og tags with a versioned image URL', () => {
  const html = '<title>Über mich — DM7WB</title><meta name="description" content="Über DM7WB und Kontakt.">';
  const og = renderOpenGraph('html/about.html', html, SITE, 'https://dm7wb.de/assets/img/og-default.png?v=abc12345');
  assert.match(og, /<link rel="canonical" href="https:\/\/dm7wb\.de\/html\/about\.html">/);
  assert.match(og, /<meta property="og:type" content="website">/);
  assert.match(og, /<meta property="og:locale" content="de_DE">/);
  assert.match(og, /<meta property="og:site_name" content="DM7WB">/);
  assert.match(og, /<meta property="og:title" content="Über mich — DM7WB">/);
  assert.match(og, /<meta property="og:description" content="Über DM7WB und Kontakt\.">/);
  assert.match(og, /<meta property="og:url" content="https:\/\/dm7wb\.de\/html\/about\.html">/);
  assert.match(og, /<meta property="og:image" content="https:\/\/dm7wb\.de\/assets\/img\/og-default\.png\?v=abc12345">/);
});

test('renderOpenGraph falls back to the site name and omits og:image when empty', () => {
  const og = renderOpenGraph('index.html', '<title></title>', SITE, '');
  assert.match(og, /<meta property="og:title" content="DM7WB">/);
  assert.match(og, /<link rel="canonical" href="https:\/\/dm7wb\.de\/">/);
  assert.doesNotMatch(og, /og:image/);
});

test('renderOpenGraph emits no alternates for a single language version', () => {
  const og = renderOpenGraph('de/about.html', '<title>A</title>', SITE, '', { lang: 'de', versions: [{ lang: 'de', rel: 'de/about.html' }] });
  assert.doesNotMatch(og, /hreflang|og:locale:alternate/);
});

test('renderOpenGraph emits hreflang alternates, x-default and the page locale', () => {
  const versions = [{ lang: 'de', rel: 'de/ueber-mich.html' }, { lang: 'en', rel: 'en/about.html' }];
  const og = renderOpenGraph('en/about.html', '<title>A</title>', SITE, '', { lang: 'en', versions });
  assert.match(og, /<link rel="alternate" hreflang="de" href="https:\/\/dm7wb\.de\/de\/ueber-mich\.html">/);
  assert.match(og, /<link rel="alternate" hreflang="en" href="https:\/\/dm7wb\.de\/en\/about\.html">/);
  assert.match(og, /<link rel="alternate" hreflang="x-default" href="https:\/\/dm7wb\.de\/">/);
  assert.match(og, /<meta property="og:locale" content="en_GB">/);
  assert.match(og, /<meta property="og:locale:alternate" content="de_DE">/);
});

// --- multi-language renderers ------------------------------------------------

test('renderLangSwitch links differently named pages via ctx.versions and keeps the other languages at their home', () => {
  const versions = [{ lang: 'de', rel: 'de/ueber-mich.html' }, { lang: 'en', rel: 'en/about.html' }];
  const html = renderLangSwitch({ ...ctxFor('en/about.html', '../', { lang: 'en', versions }), pages: { base: (code) => `${code}/` } }, MULTI, UI);
  assert.match(html, /href="\.\.\/de\/ueber-mich\.html" lang="de"/);
  assert.match(html, /href="\.\.\/en\/about\.html" lang="en" hreflang="en" aria-label="English" aria-current="true"/);
  const hidden = renderLangSwitch({ ...ctxFor('de/proj/a.html', '../../', { versions: [{ lang: 'de', rel: 'de/proj/a.html' }] }), pages: { base: (code) => `${code}/` } }, MULTI, UI);
  assert.match(hidden, /href="\.\.\/\.\.\/en\/index\.html" lang="en"/);
});

test('renderLangSwitch escapes language names and the label', () => {
  const site = { languages: [{ code: 'de', name: 'D"<b>', flag: 'a.svg' }, { code: 'en', name: 'E', flag: 'b.svg' }] };
  const html = renderLangSwitch(ctxFor('index.html', '', { isCommon: true }), site, { languageLabel: '<x>' });
  assert.match(html, /aria-label="D\x26quot;\x26lt;b\x26gt;"/);
  assert.match(html, /aria-label="\x26lt;x\x26gt;"/);
  assert.doesNotMatch(html, /<b>/);
});

test('renderSitemap lists every language folder, skips drafts and uses project dates in any language', () => {
  const map = new Map([
    ['de/proj/a.html', { id: 'a', date: '2026-05' }],
    ['en/proj/a.html', { id: 'a', date: '2026-05' }],
    ['en/proj/draft.html', { id: 'draft', date: '2026-06', draft: true }],
  ]);
  const built = ['index.html', '404.html', 'de/index.html', 'en/index.html', 'de/proj/a.html', 'en/proj/a.html', 'en/proj/draft.html'].map((rel) => [rel, '<html>']);
  const xml = renderSitemap(built, 'https://dm7wb.de', map, new Map([['en/index.html', '2026-10-01']]));
  for (const loc of ['/', '/de/index.html', '/en/index.html', '/de/proj/a.html', '/en/proj/a.html']) {
    assert.ok(xml.includes(`<loc>https://dm7wb.de${loc}</loc>`), loc);
  }
  assert.doesNotMatch(xml, /draft|404/);
  assert.equal(xml.match(/<lastmod>2026-05-01<\/lastmod>/g).length, 2);
  assert.match(xml, /<lastmod>2026-10-01<\/lastmod>/);
});
