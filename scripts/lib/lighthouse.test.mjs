// Unit tests for scripts/lib/lighthouse.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { minScores, renderLighthouseOverview, scoreClass } from './lighthouse.mjs';

const entry = (url, file, summary, isRepresentativeRun = true) => ({ url, isRepresentativeRun, htmlPath: file, jsonPath: '', summary });

test('scoreClass follows the Lighthouse colour bands', () => {
  assert.equal(scoreClass(1), 'pass');
  assert.equal(scoreClass(0.9), 'pass');
  assert.equal(scoreClass(0.89), 'average');
  assert.equal(scoreClass(0.5), 'average');
  assert.equal(scoreClass(0.49), 'fail');
  assert.equal(scoreClass(null), 'none');
});

test('minScores reads the category assertions', () => {
  assert.deepEqual(minScores({
    'categories:performance': ['error', { minScore: 0.95 }],
    'categories:seo': 'off',
    'uses-http2': ['warn', { minScore: 1 }],
  }), { performance: 0.95 });
  assert.deepEqual(minScores(undefined), {});
});

test('renderLighthouseOverview links every representative report by file name', () => {
  const html = renderLighthouseOverview([
    entry('http://127.0.0.1:8020/de/index.html', 'C:\\x\\.lighthouseci\\reports\\127_0_0_1-_de_index_html-2026_10_29.report.html', { seo: 1, performance: 0.42, accessibility: 0.95 }),
    entry('http://127.0.0.1:8020/en/index.html', '/x/.lighthouseci/reports/en.report.html', { performance: 0.7, accessibility: null, seo: 0.9 }),
    entry('http://127.0.0.1:8020/en/index.html', '/x/.lighthouseci/reports/en-other.report.html', { performance: 0.1 }, false),
  ], { generated: new Date('2026-10-29T12:34:56Z') });
  assert.match(html, /<a href="127_0_0_1-_de_index_html-2026_10_29\.report\.html">\/de\/index\.html<\/a>/);
  assert.match(html, /<a href="en\.report\.html">\/en\/index\.html<\/a>/);
  assert.doesNotMatch(html, /en-other/);
  assert.match(html, /<th scope="col">Performance<\/th><th scope="col">Accessibility<\/th><th scope="col">SEO<\/th>/);
  assert.match(html, /<td class="fail">42<\/td><td class="pass">95<\/td><td class="pass">100<\/td>/);
  assert.match(html, /<td class="average">70<\/td><td class="none">–<\/td>/);
  assert.match(html, /2 pages, generated 2026-10-29 12:34 UTC\. 0 scores below/);
});

test('renderLighthouseOverview frames scores below the asserted minimum', () => {
  const html = renderLighthouseOverview([entry('http://h/a.html', 'a.html', { performance: 0.9, accessibility: 0.95 })], { minScores: { performance: 0.95, accessibility: 0.95 } });
  assert.match(html, /<th scope="col">Performance \(≥ 95\)<\/th>/);
  assert.match(html, /<td class="pass below">90<\/td><td class="pass">95<\/td>/);
  assert.match(html, /1 scores below/);
});

test('renderLighthouseOverview escapes URLs and encodes file names', () => {
  const html = renderLighthouseOverview([entry('<x>', 'a b"c.html', {})]);
  assert.match(html, /<a href="a%20b%22c\.html">&lt;x&gt;<\/a>/);
});
