// Project scaffold: creates a new project page from the master template and
// registers it in data/projects.json. Node built-ins only.
//
// Usage: npm run create -- "Project Name" "One-sentence brief"

import { access, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJ_DIR = path.join(ROOT, 'wwwroot', 'html', 'proj');
const TEMPLATE = path.join(PROJ_DIR, 'project-template.html');
const PROJECTS_FILE = path.join(ROOT, 'wwwroot', 'data', 'projects.json');

// Same id rule the build enforces in scripts/build.mjs.
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const exists = (file) => access(file).then(() => true, () => false);

// "My Cool Project!" -> "my-cool-project"
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function currentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

// The master template opens with an instructional comment block that only
// belongs on the reference page; drop it from generated project pages.
const MASTER_COMMENT = /<!--\s*={10,}\s*MASTER PROJECT TEMPLATE[\s\S]*?-->\s*/;

async function main() {
  const [name, brief] = process.argv.slice(2).map((arg) => arg.trim());
  if (!name || !brief) {
    console.error('Usage: npm run create -- "Project Name" "One-sentence brief"');
    process.exit(1);
  }

  const id = slugify(name);
  if (!ID_RE.test(id)) {
    console.error(`Could not derive a valid project id from "${name}" (got "${id}").`);
    process.exit(1);
  }

  const projects = JSON.parse(await readFile(PROJECTS_FILE, 'utf8'));
  if (projects.some((project) => project.id === id)) {
    console.error(`A project with id "${id}" already exists in data/projects.json.`);
    process.exit(1);
  }

  const page = path.join(PROJ_DIR, `${id}.html`);
  if (await exists(page)) {
    console.error(`A page already exists at wwwroot/html/proj/${id}.html.`);
    process.exit(1);
  }

  const template = await readFile(TEMPLATE, 'utf8');
  await writeFile(page, template.replace(MASTER_COMMENT, ''));

  projects.push({
    id,
    title: name,
    summary: brief,
    tags: [],
    status: 'active',
    date: currentMonth(),
    links: { repo: null, demo: null },
    image: 'assets/img/placeholder.svg',
    featured: false,
  });
  await writeFile(PROJECTS_FILE, `${JSON.stringify(projects, null, 2)}\n`);

  console.log(`Created wwwroot/html/proj/${id}.html from project-template.html`);
  console.log(`Registered "${name}" in wwwroot/data/projects.json`);
  console.log('Next: replace the placeholder body, set tags/links/image, then run npm run build.');
}

main().catch((error) => {
  console.error(`create failed: ${error.message}`);
  process.exit(1);
});
