// Shared helpers for the scaffolding scripts (create, page, remove).

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SRC, exists, readJson } from './util.mjs';
import { COLLECTIONS } from './data.mjs';

export const DATA_DIR = path.join(SRC, 'data');
export const PAGES_FILE = path.join(DATA_DIR, 'pages.json');
export const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');

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

// Page path of a project (or ham page, folder key "ham") in a language, relative
// to the language folder: the mapped name from pages.json, else
// <folder>/{id}.html with the folder name of that language from `folders`.
export function projectPagePath(pages, defaultLang, lang, id, key = 'proj', folders = {}) {
  const group = pages.find((entry) => entry[defaultLang] === `${folderName(folders, key, defaultLang)}/${id}.html`);
  return group?.[lang] ?? `${folderName(folders, key, lang)}/${id}.html`;
}

// data/folders.json ({ <key>: { <lang>: <name> } }); empty when the file is missing.
export async function readFolders() {
  if (!await exists(FOLDERS_FILE)) return {};
  const folders = await readJson(FOLDERS_FILE);
  if (typeof folders !== 'object' || folders === null || Array.isArray(folders)) throw new Error('data/folders.json: expected an object');
  return folders;
}

// Folder name of a collection folder key in a language (the key when unmapped).
export const folderName = (folders, key, lang) => (typeof folders[key]?.[lang] === 'string' ? folders[key][lang] : key);

// Every collection folder name (keys and mapped names) of a language.
export const collectionFolders = (folders, lang) => Object.values(COLLECTIONS).map(({ folder }) => folderName(folders, folder, lang));
