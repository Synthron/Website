// Removes a project: deletes its entry from data/projects.json and its page
// wwwroot/html/proj/{id}.html (S66). Asks for confirmation unless --yes.
// Node built-ins only.

import { readFile, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const page = path.join(ROOT, 'wwwroot/html/proj', `${id}.html`);
  const message = `Remove project "${project.title}" (${id})?\nThis deletes its entry from data/projects.json and the page wwwroot/html/proj/${id}.html.\nContinue? [y/N] `;
  if (!yes && !(await confirm(message))) {
    console.log('Aborted.');
    return;
  }

  data.splice(index, 1);
  await writeFile(PROJECTS, `${JSON.stringify(data, null, 2)}\n`);
  await rm(page, { force: true });
  // The project image is shared, so it is deliberately left in place.
  console.log(`Removed ${id}: entry and page deleted (image left in place). Run \`npm run build\` and remove stale files on the server.`);
}

await main();
