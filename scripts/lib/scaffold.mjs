// Shared helpers for the scaffolding scripts (create, page, remove).

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SRC, exists, readJson } from './util.mjs';

export const DATA_DIR = path.join(SRC, 'data');
export const PAGES_FILE = path.join(DATA_DIR, 'pages.json');

export const writeJson = (file, data) => writeFile(file, `${JSON.stringify(data, null, 2)}\n`);

// Language codes (folder names) and the default language from data/site.json.
export async function loadSetup() {
  const site = await readJson(path.join(DATA_DIR, 'site.json'));
  const languages = Array.isArray(site.languages) ? site.languages.map((language) => language.code) : [];
  if (languages.length === 0 || !languages.includes(site.defaultLang)) {
    throw new Error('data/site.json: "languages" and "defaultLang" must be configured');
  }
  return { languages, defaultLang: site.defaultLang };
}

// data/pages.json groups ({ <lang>: <path> }); empty when the file is missing.
export async function readPages() {
  if (!await exists(PAGES_FILE)) return [];
  const pages = await readJson(PAGES_FILE);
  if (!Array.isArray(pages)) throw new Error('data/pages.json: expected an array');
  return pages;
}

// Page path of a project in a language (relative to the language folder):
// the mapped name from pages.json, else proj/{id}.html.
export function projectPagePath(pages, defaultLang, lang, id) {
  const standard = `proj/${id}.html`;
  const group = pages.find((entry) => entry[defaultLang] === standard);
  return group?.[lang] ?? standard;
}
