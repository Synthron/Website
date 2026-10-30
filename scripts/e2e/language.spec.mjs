// Language checks against the built site (AGENTS.md -> Verification): <html lang>,
// canonical/hreflang/og:locale, language selector targets, hidden projects,
// sitemap, root redirect and keyboard use of the selector.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const readData = (name) => JSON.parse(readFileSync(path.join(ROOT, 'wwwroot', 'data', name), 'utf8'));

const site = readData('site.json');
const projects = readData('projects.json');
const groups = readData('pages.json');
const codes = site.languages.map((language) => language.code);
const { defaultLang, url } = site;

const pages = readdirSync(DIST, { recursive: true })
  .map((file) => String(file).split(path.sep).join('/'))
  .filter((file) => file.endsWith('.html'))
  .sort();
const html = new Map(pages.map((rel) => [rel, readFileSync(path.join(DIST, rel), 'utf8')]));
const langOf = (rel) => codes.find((code) => rel.startsWith(`${code}/`));
const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
const htmlLang = (rel) => attr(/<html\b[^>]*>/.exec(html.get(rel))[0], 'lang');
const resolve = (rel, href) => path.posix.normalize(path.posix.join(path.posix.dirname(rel), href.split(/[?#]/)[0]));
const isTodo = (value) => typeof value !== 'string' || value.trim() === '' || /^\s*TODO\b/.test(value);
const isDraft = (entry) => Object.values(entry.title).some((title) => /^\s*DRAFT\b/.test(title));
const draftPages = [...projects.map((entry) => ['proj', entry]), ...readData('ham.json').map((entry) => ['ham', entry])]
  .filter(([, entry]) => isDraft(entry))
  .flatMap(([folder, entry]) => codes.map((code) => `${code}/${folder}/${entry.id}.html`));

// Language -> page path (relative to the language folder) of every version of a page.
function versions(rel) {
  const lang = langOf(rel);
  const file = rel.slice(lang.length + 1);
  const group = groups.find((entry) => entry[lang] === file);
  const found = new Map();
  for (const code of codes) {
    const target = group ? group[code] : file;
    if (target !== undefined && html.has(`${code}/${target}`) && (group || !groups.some((entry) => entry[code] === target))) {
      found.set(code, `${code}/${target}`);
    }
  }
  return found;
}

const languagePages = pages.filter((rel) => langOf(rel));
const selector = (rel) => /<nav class="lang-switch"[\s\S]*?<\/nav>/.exec(html.get(rel))?.[0] ?? '';
const selectorLinks = (rel) => [...selector(rel).matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);

test('dist/ contains pages of every configured language', () => {
  for (const code of codes) expect(languagePages.some((rel) => langOf(rel) === code), `pages in ${code}/`).toBe(true);
});

for (const rel of languagePages) {
  test.describe(rel, () => {
    const lang = langOf(rel);
    const locale = site.languages.find((language) => language.code === lang).locale;

    test('declares its language, canonical URL and og:locale', () => {
      expect(htmlLang(rel)).toBe(lang);
      expect(html.get(rel)).toContain(`<link rel="canonical" href="${url}/${rel}">`);
      expect(html.get(rel)).toContain(`<meta property="og:locale" content="${locale}">`);
    });

    test('language selector: current language marked, targets exist in the right language', () => {
      const links = selectorLinks(rel);
      expect(links.map((link) => attr(link, 'lang'))).toEqual(codes);
      const expected = versions(rel);
      for (const link of links) {
        const code = attr(link, 'lang');
        const target = resolve(rel, attr(link, 'href'));
        expect(html.has(target), `${code} link target ${target} exists`).toBe(true);
        expect(htmlLang(target), `language of ${target}`).toBe(code);
        expect(target, `${code} link target`).toBe(expected.get(code) ?? `${code}/index.html`);
        expect(link.includes('aria-current="true"'), `aria-current on the ${code} link`).toBe(code === lang);
      }
    });

    test('hreflang alternates exist exactly when the page has several language versions', () => {
      const expected = versions(rel);
      const alternates = [...html.get(rel).matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((match) => [match[1], match[2]]);
      if (expected.size < 2) {
        expect(alternates).toEqual([]);
        return;
      }
      expect(alternates).toEqual([...[...expected].map(([code, target]) => [code, `${url}/${target}`]), ['x-default', `${url}/`]]);
    });
  });
}

test('common pages: landing page in the default language, 404 in English, selector without current language', () => {
  expect(htmlLang('index.html')).toBe(defaultLang);
  expect(htmlLang('404.html')).toBe('en');
  for (const rel of ['index.html', '404.html']) {
    const links = selectorLinks(rel);
    expect(links.map((link) => attr(link, 'lang'))).toEqual(codes);
    expect(links.some((link) => link.includes('aria-current')), `${rel} marks no language`).toBe(false);
    for (const link of links) expect(html.has(resolve(rel === '404.html' ? 'index.html' : rel, attr(link, 'href').replace(/^\//, ''))), `${rel}: ${attr(link, 'href')}`).toBe(true);
  }
  expect(html.get('404.html')).not.toContain('rel="canonical"');
});

test('projects with TODO or missing texts are hidden in that language, the others listed and built', () => {
  for (const code of codes) {
    const visible = projects.filter((project) => !isTodo(project.title[code]) && !isTodo(project.summary[code]));
    for (const project of projects) {
      const built = html.has(`${code}/proj/${project.id}.html`);
      expect(built, `${code}/proj/${project.id}.html built`).toBe(visible.includes(project));
    }
    const listing = `${code}/${groups.find((entry) => Object.values(entry).includes('projects.html'))?.[code] ?? 'projects.html'}`;
    const cards = (html.get(listing)?.match(/class="project-card"/g) ?? []).length;
    expect(cards, `project cards on ${listing}`).toBe(visible.filter((project) => !isDraft(project)).length);
  }
});

test('sitemap.xml lists every page except 404.html and drafts, nothing else', () => {
  const xml = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
  const expected = pages.filter((rel) => rel !== '404.html' && !draftPages.includes(rel)).map((rel) => (rel === 'index.html' ? `${url}/` : `${url}/${rel}`)).sort();
  expect(listed).toEqual(expected);
});

test('root redirect follows Accept-Language; other languages get the landing page', async ({ request }) => {
  for (const [header, location] of [['de-AT,de;q=0.9,en;q=0.8', '/de/'], ['en-GB', '/en/']]) {
    const res = await request.get('/', { headers: { 'Accept-Language': header }, maxRedirects: 0 });
    expect(res.status(), header).toBe(302);
    expect(res.headers().location).toBe(location);
    expect(res.headers().vary).toContain('Accept-Language');
  }
  for (const header of ['fr-FR', '*', '']) {
    const res = await request.get('/', { headers: { 'Accept-Language': header }, maxRedirects: 0 });
    expect(res.status(), `Accept-Language "${header}"`).toBe(200);
    expect(await res.text()).toContain('<html lang="de">');
  }
  const home = await request.get('/de/');
  expect(home.status()).toBe(200);
  expect((await request.get('/de', { maxRedirects: 0 })).headers().location).toBe('/de/');
  expect((await request.get('/en/does-not-exist')).status()).toBe(404);
});

for (const width of [320, 1280]) {
  test(`${width}px: the selector is visible next to the brand and switches the language by keyboard`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/de/index.html');
    const links = page.locator('.lang-switch__link');
    await expect(links).toHaveCount(codes.length);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box.x + box.width, 'selector inside the viewport').toBeLessThanOrEqual(width);
    }
    const en = page.locator('.lang-switch__link[lang="en"]');
    for (let step = 0; step < 8; step += 1) {
      if (await en.evaluate((element) => element === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(en).toBeFocused();
    const ring = await en.evaluate((element) => {
      const style = getComputedStyle(element);
      return (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
    });
    expect(ring, 'visible focus ring on the selector').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/index\.html$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.lang-switch__link[aria-current="true"]')).toHaveAttribute('lang', 'en');
  });
}
