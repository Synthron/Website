// Removes a project: deletes its entry from data/projects.json, its page in
// every language folder (<lang>/proj/{id}.html or the mapped name from
// data/pages.json) and its pages.json group (S66). Asks for confirmation
// unless --yes. Node built-ins only.

import { readFile, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSetup, PAGES_FILE, projectPagePath, readPages, writeJson } from './lib/scaffold.mjs';
import { exists } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(ROOT, 'wwwroot/data/projects.json');
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const id = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const yes = process.argv.includes('--yes') || process.argv.includes('-y');

function confirm(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function main() {
  if (!id || !ID_RE.test(id)) {
    console.error('Usage: npm run remove -- <id> [--yes]');
    console.error('  <id> must be lowercase, hyphenated (matches an id in data/projects.json).');
    process.exit(1);
  }
  const data = JSON.parse(await readFile(PROJECTS, 'utf8'));
  const index = data.findIndex((project) => project.id === id);
  if (index === -1) {
    console.error(`No project with id "${id}" in data/projects.json.`);
    process.exit(1);
  }

  const project = data[index];
  const { languages, defaultLang } = await loadSetup();
  const pages = await readPages();
  const title = typeof project.title === 'object' ? (project.title[defaultLang] ?? id) : project.title;
  const candidates = languages.map((code) => `wwwroot/${code}/${projectPagePath(pages, defaultLang, code, id)}`);
  const existing = [];
  for (const rel of candidates) {
    if (await exists(path.join(ROOT, rel))) existing.push(rel);
  }
  const message = `Remove project "${title}" (${id})?\nThis deletes its entry from data/projects.json and ${existing.length > 0 ? `the pages ${existing.join(', ')}` : 'no pages (none found)'}.\nContinue? [y/N] `;
  if (!yes && !(await confirm(message))) {
    console.log('Aborted.');
    return;
  }

  data.splice(index, 1);
  await writeFile(PROJECTS, `${JSON.stringify(data, null, 2)}\n`);
  for (const rel of existing) await rm(path.join(ROOT, rel), { force: true });
  const remaining = pages.filter((group) => group[defaultLang] !== `proj/${id}.html`);
  if (remaining.length !== pages.length) {
    await writeJson(PAGES_FILE, remaining);
    console.log('Removed its group from data/pages.json.');
  }
  // The project image is shared, so it is deliberately left in place.
  console.log(`Removed ${id}: entry and ${existing.length} page(s) deleted (image left in place). Run \`npm run build\` and remove stale files on the server.`);
}

await main();
