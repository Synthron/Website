// Removes a project (remove:project) or ham page (remove:afu, --ham): deletes
// its entry from data/projects.json / data/ham.json, its page in every
// language folder (<lang>/proj|ham/{id}.html or the mapped name from
// data/pages.json) and its pages.json group (S66). Asks for confirmation
// unless --yes. Node built-ins only.

import { readFile, rm } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSetup, PAGES_FILE, projectPagePath, readPages, writeJson } from './lib/scaffold.mjs';
import { exists } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = {
  project: { script: 'remove:project', noun: 'project', folder: 'proj', file: path.join(ROOT, 'wwwroot', 'data', 'projects.json') },
  ham: { script: 'remove:afu', noun: 'ham page', folder: 'ham', file: path.join(ROOT, 'wwwroot', 'data', 'ham.json') },
};
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const args = process.argv.slice(2);
const id = args.find((arg) => !arg.startsWith('-'));
const yes = args.includes('--yes') || args.includes('-y');
const ham = args.includes('--ham');
const kind = KINDS[ham ? 'ham' : 'project'];

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
  const dataRel = `data/${path.basename(kind.file)}`;
  if (!id || !ID_RE.test(id)) {
    console.error(`Usage: npm run ${kind.script} -- <id> [--yes]`);
    console.error(`  <id> must be lowercase, hyphenated (matches an id in ${dataRel}).`);
    process.exit(1);
  }
  const data = JSON.parse(await readFile(kind.file, 'utf8'));
  const index = data.findIndex((entry) => entry.id === id);
  if (index === -1) {
    const other = KINDS[ham ? 'project' : 'ham'];
    const hint = JSON.parse(await readFile(other.file, 'utf8')).some((entry) => entry.id === id) ? ` It is a ${other.noun}: use npm run ${other.script}.` : '';
    console.error(`No ${kind.noun} with id "${id}" in ${dataRel}.${hint}`);
    process.exit(1);
  }

  const entry = data[index];
  const { languages, defaultLang } = await loadSetup();
  const pages = await readPages();
  const title = typeof entry.title === 'object' ? (entry.title[defaultLang] ?? id) : entry.title;
  const candidates = languages.map((code) => `wwwroot/${code}/${projectPagePath(pages, defaultLang, code, id, kind.folder)}`);
  const existing = [];
  for (const rel of candidates) {
    if (await exists(path.join(ROOT, rel))) existing.push(rel);
  }
  const message = `Remove ${kind.noun} "${title}" (${id})?\nThis deletes its entry from ${dataRel} and ${existing.length > 0 ? `the pages ${existing.join(', ')}` : 'no pages (none found)'}.\nContinue? [y/N] `;
  if (!yes && !(await confirm(message))) {
    console.log('Aborted.');
    return;
  }

  data.splice(index, 1);
  await writeJson(kind.file, data);
  for (const rel of existing) await rm(path.join(ROOT, rel), { force: true });
  const remaining = pages.filter((group) => group[defaultLang] !== `${kind.folder}/${id}.html`);
  if (remaining.length !== pages.length) {
    await writeJson(PAGES_FILE, remaining);
    console.log('Removed its group from data/pages.json.');
  }
  // Project images can be shared, so they are deliberately left in place.
  const note = ham ? '' : ' (image left in place)';
  console.log(`Removed ${id}: entry and ${existing.length} page(s) deleted${note}. Run \`npm run build\` and remove stale files on the server.`);
}

main().catch((error) => {
  console.error(`remove failed: ${error.message}`);
  process.exit(1);
});
