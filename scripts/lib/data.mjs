// Loading and validation of wwwroot/data/*.json. Structure is validated with
// the JSON Schemas in scripts/schemas/ (ajv); file-system and cross-entry
// checks stay here.

import path from 'node:path';
import Ajv from 'ajv';
import { ROOT, SRC, exists, fail, readJson, safeExternalUrl } from './util.mjs';

const SCHEMA_DIR = path.join(ROOT, 'scripts', 'schemas');
const ajv = new Ajv({ allErrors: true, verbose: true });
const schemas = {};
for (const name of ['site', 'strings', 'nav', 'projects']) {
  schemas[name] = ajv.compile(await readJson(path.join(SCHEMA_DIR, `${name}.schema.json`)));
}

// D10: allowed status values, defined once in projects.schema.json. Values
// contain spaces and capitals; slugify one before using it as a CSS class hook.
export const STATUS_VALUES = schemas.projects.schema.items.properties.status.enum;

// "/0/links/repo" -> "[0].links.repo"
const pointer = (instancePath) => instancePath.split('/').slice(1)
  .map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join('');

// Validates `data` against a schema; reports every error via fail() and returns
// the set of top-level array indices with errors (empty for objects).
function validate(name, rel, data) {
  const invalid = new Set();
  if (schemas[name](data)) return invalid;
  for (const error of schemas[name].errors) {
    // oneOf/anyOf report every failing branch; the summary error is enough.
    if (/\/(oneOf|anyOf)\//.test(error.schemaPath)) continue;
    let detail = error.message;
    if (error.keyword === 'enum') detail += `: ${error.params.allowedValues.join(', ')}`;
    if (error.keyword === 'additionalProperties') detail += ` "${error.params.additionalProperty}"`;
    if (['oneOf', 'anyOf', 'pattern'].includes(error.keyword) && error.parentSchema?.description) {
      detail += ` (${error.parentSchema.description})`;
    }
    fail(`${rel}${pointer(error.instancePath)}: ${detail}`);
    const index = /^\/(\d+)/.exec(error.instancePath)?.[1];
    if (index !== undefined) invalid.add(Number(index));
  }
  return invalid;
}

export async function loadSite() {
  const site = await readJson(path.join(SRC, 'data/site.json'));
  validate('site', 'data/site.json', site);

  // Canonical base URL for sitemap.xml and the robots.txt Sitemap line.
  let url = '';
  if (typeof site.url === 'string') {
    try {
      url = new URL(site.url).href.replace(/\/+$/, '');
    } catch {
      fail('data/site.json: "url" must be a valid absolute URL');
    }
  }

  return {
    lang: site.lang ?? 'de',
    name: site.name ?? '',
    footerNote: site.footerNote ?? '',
    email: site.email ?? '',
    year: site.copyrightYear ?? new Date().getFullYear(),
    url,
    sitemapUrl: url ? `${url}/sitemap.xml` : '',
  };
}

export async function loadStrings() {
  const data = await readJson(path.join(SRC, 'data/strings.json'));
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('data/strings.json: expected an object');
  }
  validate('strings', 'data/strings.json', data);
  const { $schema, ...strings } = data;
  return strings;
}

export async function loadNav(file) {
  const rel = `data/${file}`;
  const data = await readJson(path.join(SRC, rel));
  if (!Array.isArray(data)) throw new Error(`${rel}: expected a non-empty array`);
  const invalid = validate('nav', rel, data);
  return data
    .filter((_, index) => !invalid.has(index))
    .map((item) => ({ label: item.label, href: item.href, external: /^https?:\/\//i.test(item.href) }));
}

export async function loadProjects() {
  const data = await readJson(path.join(SRC, 'data/projects.json'));
  if (!Array.isArray(data)) throw new Error('data/projects.json: expected an array');
  const invalid = validate('projects', 'data/projects.json', data);
  const seen = new Set();
  const projects = [];

  for (const [index, project] of data.entries()) {
    if (invalid.has(index)) continue;
    const label = `data/projects.json[${index}]`;
    if (seen.has(project.id)) fail(`${label}: duplicate id "${project.id}"`);
    seen.add(project.id);
    for (const key of ['repo', 'demo']) {
      const value = project.links[key];
      if (value !== null && value !== undefined && !safeExternalUrl(value)) {
        fail(`${label}.links.${key}: must be null or a valid http(s) URL`);
      }
    }
    if (!await exists(path.join(SRC, project.image))) fail(`${label}: image not found: ${project.image}`);
    if (!await exists(path.join(SRC, 'html', 'proj', `${project.id}.html`))) {
      fail(`${label}: missing page wwwroot/html/proj/${project.id}.html`);
    }
    projects.push(project);
  }
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}
