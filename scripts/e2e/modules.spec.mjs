// Module pages of the built site (README -> Module Pages): header, back link and
// previous/next at the top and the bottom (drafts skipped, no link at the
// ends), language selector pairs (mapped module and folder names), modules
// without translation not built. Layout, console errors and external requests
// of every page (module pages included) are checked by pages.spec.mjs.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'wwwroot');
const dataFile = (name) => path.join(SRC, 'data', name);
const readData = (name) => JSON.parse(readFileSync(dataFile(name), 'utf8'));

const site = readData('site.json');
const codes = site.languages.map((language) => language.code);
const { defaultLang } = site;
const groups = readData('pages.json');
const folders = existsSync(dataFile('folders.json')) ? readData('folders.json') : {};
const modules = existsSync(dataFile('modules.json')) ? readData('modules.json') : [];
const parents = new Map([
  ...readData('projects.json').map((entry) => [entry.id, { entry, key: 'proj' }]),
  ...readData('ham.json').map((entry) => [entry.id, { entry, key: 'ham' }]),
]);

const folderOf = (key, code) => folders[key]?.[code] ?? key;
const mapped = (defaultPath, code) => groups.find((group) => group[defaultLang] === defaultPath)?.[code];
const parentPage = (key, id, code) => mapped(`${folderOf(key, defaultLang)}/${id}.html`, code) ?? `${folderOf(key, code)}/${id}.html`;
const modulePage = (module, code) => {
  const { key } = parents.get(module.parent);
  return mapped(`${folderOf(key, defaultLang)}/${module.parent}/${module.id}.html`, code)
    ?? `${parentPage(key, module.parent, code).slice(0, -5)}/${module.id}.html`;
};
const isTodo = (value) => typeof value !== 'string' || value.trim() === '' || /^\s*TODO\b/.test(value);
const isDraft = (entry) => Object.values(entry.title).some((title) => /^\s*DRAFT\b/.test(title));
const available = (entry, code, page) => !isTodo(entry.title[code]) && !isTodo(entry.summary[code]) && existsSync(path.join(SRC, code, page));
// A module is shown in a language when it and its parent are available there.
const shown = (module, code) => {
  const { entry, key } = parents.get(module.parent);
  return available(entry, code, parentPage(key, module.parent, code)) && available(module, code, modulePage(module, code));
};

const read = (rel) => readFileSync(path.join(DIST, rel), 'utf8');
const decode = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const resolve = (rel, href) => path.posix.normalize(path.posix.join(path.posix.dirname(rel), href.split(/[?#]/)[0]));
const hrefOf = (html, cls) => new RegExp(`<a class="${cls}" href="([^"]*)"`).exec(html)?.[1];

test('module pages are built exactly where the module and its parent are shown', () => {
  test.skip(modules.length === 0, 'no entries in data/modules.json');
  for (const module of modules) {
    for (const code of codes) {
      const rel = `${code}/${modulePage(module, code)}`;
      expect(existsSync(path.join(DIST, rel)), `${rel} built`).toBe(shown(module, code));
    }
  }
});

for (const module of modules) {
  for (const code of codes.filter((other) => shown(module, other))) {
    const rel = `${code}/${modulePage(module, code)}`;
    test.describe(rel, () => {
      test('header: parent title as h1 without link, module title as h2', () => {
        const html = read(rel);
        const header = /<header class="page-header">([\s\S]*?)<\/header>/.exec(html)[1];
        expect(decode(/<h1>([^<]*)<\/h1>/.exec(header)[1])).toBe(parents.get(module.parent).entry.title[code]);
        expect(decode(/<h2 class="page-header__module">([^<]*)<\/h2>/.exec(header)[1])).toBe(module.title[code]);
        expect(header).not.toContain('<a ');
      });

      test('back link and previous/next at the top and the bottom', () => {
        const html = read(rel);
        const navs = [...html.matchAll(/<p class="module-nav">[\s\S]*?<\/p>/g)].map((match) => match[0]);
        expect(navs.length, 'module navs').toBe(2);
        expect(navs[1]).toBe(navs[0]);
        const { key } = parents.get(module.parent);
        expect(resolve(rel, hrefOf(navs[0], 'module-nav__back'))).toBe(`${code}/${parentPage(key, module.parent, code)}`);
        const siblings = modules.filter((other) => other.parent === module.parent && shown(other, code) && (other === module || !isDraft(other)));
        const index = siblings.indexOf(module);
        const expected = (other) => (other ? `${code}/${modulePage(other, code)}` : undefined);
        const target = (cls) => { const href = hrefOf(navs[0], cls); return href === undefined ? undefined : resolve(rel, href); };
        expect(target('module-nav__prev'), 'previous').toBe(expected(siblings[index - 1]));
        expect(target('module-nav__next'), 'next').toBe(expected(siblings[index + 1]));
      });

      test('language selector pairs the module pages', () => {
        const selector = /<nav class="lang-switch"[\s\S]*?<\/nav>/.exec(read(rel))[0];
        for (const other of codes) {
          const href = new RegExp(`href="([^"]*)" lang="${other}"`).exec(selector)[1];
          expect(resolve(rel, href), `${other} link`).toBe(shown(module, other) ? `${other}/${modulePage(module, other)}` : `${other}/index.html`);
        }
      });
    });
  }
}
