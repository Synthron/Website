// Tests for the HTML renderers (render.mjs): renderNav aria-current handling
// and sitemap generation (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { ogImageRel, renderNav, renderOpenGraph, renderSitemap } from './render.mjs';

// --- renderNav --------------------------------------------------------------

const NAV = [
  { label: 'Start', href: 'index.html', external: false },
  { label: 'Über mich', href: 'html/about.html', external: false },
  { label: 'Beispiel', href: 'https://example.com', external: true },
];

test('renderNav prefixes the web root and marks the current page', () => {
  const html = renderNav(NAV, { rel: 'html/about.html', root: '../' });
  assert.match(html, /href="\.\.\/index\.html"/);
  assert.match(html, /href="\.\.\/html\/about\.html" aria-current="page"/);
  assert.match(html, /href="\.\.\/html\/about\.html"[^>]*aria-current="page"/);
});

test('renderNav does not mark a non-current page', () => {
  const html = renderNav(NAV, { rel: 'index.html', root: '' });
  assert.doesNotMatch(html, /href="\.\.\/html\/about\.html"/);
  assert.match(html, /href="html\/about\.html"/);
});

test('renderNav renders external links with rel=noopener noreferrer', () => {
  const html = renderNav(NAV, { rel: 'index.html', root: '' });
  assert.match(html, /href="https:\/\/example\.com" rel="noopener noreferrer"/);
});

test('renderNav handles the footer variant classes', () => {
  const html = renderNav(NAV, { rel: 'index.html', root: '' }, { list: 'site-footer__list', link: 'site-footer__link' });
  assert.match(html, /class="site-footer__list"/);
  assert.match(html, /class="site-footer__link"/);
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

// --- Open Graph / canonical (S64) --------------------------------------------

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
