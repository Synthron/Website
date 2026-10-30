// Tests for the scaffolding helpers (scaffold.mjs). loadSetup/readPages read
// the real data files (read-only).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR, MODULES_FILE, PAGES_FILE, collectionFolders, folderName, loadSetup, modulePagePath, projectPagePath, readModules, readPages } from './scaffold.mjs';

test('projectPagePath returns the mapped name or the standard path', () => {
  const pages = [{ de: 'proj/uhr.html', en: 'proj/clock.html' }, { de: 'ham/t2lt.html', en: 'ham/t2lt-antenna.html' }];
  assert.equal(projectPagePath(pages, 'de', 'en', 'uhr'), 'proj/clock.html');
  assert.equal(projectPagePath(pages, 'de', 'de', 'uhr'), 'proj/uhr.html');
  assert.equal(projectPagePath(pages, 'de', 'en', 'other'), 'proj/other.html');
  assert.equal(projectPagePath(pages, 'de', 'en', 't2lt', 'ham'), 'ham/t2lt-antenna.html');
  assert.equal(projectPagePath(pages, 'de', 'fr', 'uhr'), 'proj/uhr.html');
});

test('projectPagePath and collectionFolders use the folder of each language', () => {
  const folders = { ham: { de: 'afu' } };
  const pages = [{ de: 'afu/t2lt.html', en: 'ham/t2lt-antenna.html' }];
  assert.equal(projectPagePath(pages, 'de', 'en', 't2lt', 'ham', folders), 'ham/t2lt-antenna.html');
  assert.equal(projectPagePath(pages, 'de', 'de', 'x', 'ham', folders), 'afu/x.html');
  assert.equal(projectPagePath(pages, 'de', 'en', 'x', 'ham', folders), 'ham/x.html');
  assert.equal(projectPagePath(pages, 'de', 'de', 'x', 'proj', folders), 'proj/x.html');
  assert.equal(folderName(folders, 'ham', 'de'), 'afu');
  assert.equal(folderName(folders, 'ham', 'en'), 'ham');
  assert.deepEqual(collectionFolders(folders, 'de'), ['proj', 'afu']);
  assert.deepEqual(collectionFolders({}, 'en'), ['proj', 'ham']);
});

test('loadSetup returns the language codes and the default language of site.json', async () => {
  const site = JSON.parse(await readFile(path.join(DATA_DIR, 'site.json'), 'utf8'));
  const setup = await loadSetup();
  assert.deepEqual(setup.languages, site.languages.map((language) => language.code));
  assert.equal(setup.defaultLang, site.defaultLang);
  assert.ok(setup.languages.includes(setup.defaultLang));
});

test('readPages returns the groups of pages.json', async () => {
  const expected = JSON.parse(await readFile(PAGES_FILE, 'utf8'));
  assert.deepEqual(await readPages(), expected);
});

test('modulePagePath uses the module folder of the parent page per language', () => {
  const folders = { ham: { de: 'afu' } };
  const pages = [
    { de: 'proj/synsps.html', en: 'proj/synplc.html' },
    { de: 'proj/synsps/netzteil.html', en: 'proj/synplc/power-supply.html' },
    { de: 'afu/t2lt.html', en: 'ham/t2lt-antenna.html' },
  ];
  assert.equal(modulePagePath(pages, 'de', 'de', 'synsps', 'cpu'), 'proj/synsps/cpu.html');
  assert.equal(modulePagePath(pages, 'de', 'en', 'synsps', 'cpu'), 'proj/synplc/cpu.html');
  assert.equal(modulePagePath(pages, 'de', 'en', 'synsps', 'netzteil'), 'proj/synplc/power-supply.html');
  assert.equal(modulePagePath(pages, 'de', 'en', 'other', 'cpu'), 'proj/other/cpu.html');
  assert.equal(modulePagePath(pages, 'de', 'de', 't2lt', 'balun', 'ham', folders), 'afu/t2lt/balun.html');
  assert.equal(modulePagePath(pages, 'de', 'en', 't2lt', 'balun', 'ham', folders), 'ham/t2lt-antenna/balun.html');
  assert.equal(modulePagePath([], 'de', 'en', 'x', 'y', 'ham', folders), 'ham/x/y.html');
});

test('readModules returns the entries of modules.json', async () => {
  const expected = JSON.parse(await readFile(MODULES_FILE, 'utf8'));
  assert.deepEqual(await readModules(), expected);
});
