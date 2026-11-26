// Integration test of the deployment build (`build.mjs --clean`) on a temporary
// copy of wwwroot/ with one published and one draft module (node --test).

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { ROOT, SRC } from './lib/util.mjs';

const run = promisify(execFile);
const listFiles = async (dir) => (await readdir(dir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));

let site;

async function build(flag) {
  const args = ['scripts/build.mjs', ...flag];
  await run(process.execPath, args, { cwd: ROOT, env: { ...process.env, SITE_ROOT: site } });
}

test.before(async () => {
  site = await mkdtemp(path.join(tmpdir(), 'site-build-'));
  await cp(SRC, path.join(site, 'wwwroot'), { recursive: true });
  const dataFile = path.join(site, 'wwwroot', 'data', 'modules.json');
  const modules = JSON.parse(await readFile(dataFile, 'utf8'));
  const entry = (id, title) => ({
    parent: 'sy317',
    id,
    title: { de: title, en: title },
    summary: { de: 'Fixture', en: 'Fixture' },
    status: 'in Arbeit',
    date: '2026-01',
    image: 'assets/img/placeholder.svg',
  });
  modules.push(entry('fx-ok', 'Fixture OK'), entry('fx-wip', 'DRAFT Fixture WIP'));
  await writeFile(dataFile, JSON.stringify(modules, null, 2));
  const template = await readFile(path.join(SRC, 'templates', 'module-template.html'), 'utf8');
  for (const lang of ['de', 'en']) {
    const dir = path.join(site, 'wwwroot', lang, 'proj', 'sy317');
    await mkdir(dir, { recursive: true });
    for (const id of ['fx-ok', 'fx-wip']) await writeFile(path.join(dir, `${id}.html`), template);
  }
});

test.after(async () => {
  await rm(site, { recursive: true, force: true });
});

test('build:clean omits draft pages and their modules from files, links, sitemap and feeds', { timeout: 180000 }, async () => {
  await build([]);
  const dist = path.join(site, 'dist');
  const regular = new Set((await listFiles(dist)).filter((file) => file.endsWith('.html')));
  assert.ok(regular.has('de/proj/sy317/fx-wip.html') && regular.has('de/proj/sy317/fx-ok.html'));

  await build(['--clean']);
  const files = await listFiles(dist);
  const clean = new Set(files.filter((file) => file.endsWith('.html')));
  const excluded = new Set([...regular].filter((file) => !clean.has(file)));

  for (const lang of ['de', 'en']) {
    assert.ok(excluded.has(`${lang}/proj/sy317/fx-wip.html`), `${lang} draft module is built`);
    assert.ok(clean.has(`${lang}/proj/sy317/fx-ok.html`), `${lang} published module is missing`);
  }
  const data = JSON.parse(await readFile(path.join(site, 'wwwroot', 'data', 'projects.json'), 'utf8'));
  const draftIds = new Set(data.filter((project) => Object.values(project.title).some((title) => title.startsWith('DRAFT'))).map((project) => project.id));
  assert.ok(draftIds.size > 0, 'the test needs at least one draft project');
  for (const module of JSON.parse(await readFile(path.join(site, 'wwwroot', 'data', 'modules.json'), 'utf8'))) {
    const page = `de/proj/${module.parent}/${module.id}.html`;
    if (draftIds.has(module.parent) && regular.has(page)) assert.ok(excluded.has(page), `${page} of a draft parent is built`);
  }

  const siteUrl = JSON.parse(await readFile(path.join(site, 'wwwroot', 'data', 'site.json'), 'utf8')).url;
  const toRel = (from, ref) => {
    const clean = ref.replace(/[?#].*$/, '');
    if (clean === '') return null;
    if (siteUrl && clean.startsWith(`${siteUrl}/`)) return clean.slice(siteUrl.length + 1) || 'index.html';
    if (/^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.startsWith('//')) return null;
    const joined = clean.startsWith('/') ? clean.slice(1) : path.posix.join(path.posix.dirname(from), clean);
    const normal = path.posix.normalize(joined);
    return normal.endsWith('/') || normal === '.' ? `${normal === '.' ? '' : normal}index.html` : normal;
  };
  for (const file of files.filter((name) => /\.(html|xml)$/.test(name))) {
    const text = await readFile(path.join(dist, file), 'utf8');
    const refs = file.endsWith('.html')
      ? [...text.matchAll(/\b(?:href|src)="([^"]*)"/g)].map((match) => match[1])
      : [...text.matchAll(/<(?:loc|link)>([^<]*)<\/(?:loc|link)>|\bhref="([^"]*)"/g)].map((match) => match[1] ?? match[2]);
    for (const ref of refs) {
      const target = toRel(file, ref);
      assert.ok(target === null || !excluded.has(target), `${file} references excluded page ${target}`);
    }
  }

  if (siteUrl) {
    const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('fx-ok.html'));
    assert.ok(!sitemap.includes('fx-wip.html'));
    for (const lang of ['de', 'en']) {
      const feed = await readFile(path.join(dist, lang, 'feed.xml'), 'utf8');
      assert.ok(!feed.includes('fx-wip'));
    }
  }
});
