// Tests for the HTML renderers (render.mjs): renderNav aria-current handling
// and sitemap generation (node --test built-in runner).

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderNav, renderSitemap } from './render.mjs';

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

const byId = new Map([
  ['sy317', { id: 'sy317', date: '2026-05' }],
  ['draft-proj', { id: 'draft-proj', date: '2026-06', draft: true }],
]);

const pages = [
  ['index.html', '<html>'],
  ['html/projects.html', '<html>'],
  ['html/proj/sy317.html', '<html>'],
  ['html/proj/draft-proj.html', '<html>'],
  ['404.html', '<html>'],
];

test('renderSitemap maps pages, lastmod for projects, skips 404 and drafts', () => {
  const xml = renderSitemap(pages, 'https://dm7wb.de', byId);
  assert.match(xml, /<loc>https:\/\/dm7wb.de\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/dm7wb.de\/html\/projects\.html<\/loc>/);
  assert.match(xml, /<loc>https:\/\/dm7wb.de\/html\/proj\/sy317\.html<\/loc>/);
  assert.match(xml, /<lastmod>2026-05-01<\/lastmod>/);
  assert.doesNotMatch(xml, /draft-proj/);
  assert.doesNotMatch(xml, /404\.html/);
});
