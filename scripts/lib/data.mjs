// Loading and validation of wwwroot/data/*.json.

import path from 'node:path';
import { SRC, exists, fail, readJson, safeExternalUrl } from './util.mjs';

const REQUIRED_PROJECT_FIELDS = ['id', 'title', 'summary', 'tags', 'status', 'date', 'links', 'image', 'featured'];

// D10: allowed status values. Values contain spaces and capitals; slugify one
// before using it as a CSS class hook.
export const STATUS_VALUES = ['in Arbeit', 'fertig', 'pausiert', 'veraltet', 'Konzept', 'abgebrochen'];

const LINK_KEYS = ['repo', 'demo'];
const slugLike = (value) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

// S13: image paths must resolve inside wwwroot/ — relative only, no ".." or "."
// segments, no backslashes, no drive letters or leading slash.
function insideWorkspace(value) {
  if (typeof value !== 'string' || value === '' || value.startsWith('/') || value.includes('\\') || /^[a-zA-Z]:/.test(value)) {
    return false;
  }
  return !value.split('/').some((segment) => segment === '..' || segment === '.');
}

export async function loadSite() {
  const site = await readJson(path.join(SRC, 'data/site.json'));
  for (const key of ['name', 'footerNote', 'email']) {
    if (typeof site[key] !== 'string' || site[key] === '') fail(`data/site.json: "${key}" must be a non-empty string`);
  }
  if (site.copyrightYear !== undefined && !Number.isInteger(site.copyrightYear)) {
    fail('data/site.json: "copyrightYear" must be an integer');
  }

  // Canonical base URL for sitemap.xml and the robots.txt Sitemap line.
  let url = '';
  if (typeof site.url !== 'string' || site.url === '') {
    fail('data/site.json: "url" must be a non-empty string');
  } else {
    try {
      const parsed = new URL(site.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        fail('data/site.json: "url" must be an http(s) URL');
      } else {
        url = parsed.href.replace(/\/+$/, '');
      }
    } catch {
      fail('data/site.json: "url" must be a valid absolute URL');
    }
  }

  return {
    name: site.name ?? '',
    footerNote: site.footerNote ?? '',
    email: site.email ?? '',
    year: site.copyrightYear ?? new Date().getFullYear(),
    url,
    sitemapUrl: url ? `${url}/sitemap.xml` : '',
  };
}

export async function loadNav(file) {
  const rel = `data/${file}`;
  const data = await readJson(path.join(SRC, rel));
  if (!Array.isArray(data) || data.length === 0) throw new Error(`${rel}: expected a non-empty array`);
  const items = [];
  for (const [index, item] of data.entries()) {
    const label = `${rel}[${index}]`;
    if (typeof item?.label !== 'string' || item.label.trim() === '') {
      fail(`${label}: "label" must be a non-empty string`);
      continue;
    }
    if (typeof item.href !== 'string' || item.href === '') {
      fail(`${label}: "href" must be a non-empty string`);
      continue;
    }
    const external = /^https?:\/\//i.test(item.href);
    if (!external && /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(item.href)) {
      fail(`${label}: "href" must be a path relative to the web root or an http(s) URL`);
      continue;
    }
    items.push({ label: item.label, href: item.href, external });
  }
  return items;
}

export async function loadProjects() {
  const data = await readJson(path.join(SRC, 'data/projects.json'));
  if (!Array.isArray(data)) throw new Error('data/projects.json: expected an array');
  const seen = new Set();
  const projects = [];

  for (const [index, project] of data.entries()) {
    const label = `data/projects.json[${index}]`;
    const missing = REQUIRED_PROJECT_FIELDS.filter((key) => !(key in (project ?? {})));
    if (missing.length > 0) {
      fail(`${label}: missing field(s) ${missing.join(', ')}`);
      continue;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(project.id)) fail(`${label}: invalid id "${project.id}"`);
    if (seen.has(project.id)) fail(`${label}: duplicate id "${project.id}"`);
    seen.add(project.id);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(project.date)) {
      fail(`${label}: date must be YYYY-MM`);
      continue;
    }
    for (const key of ['title', 'summary']) {
      if (typeof project[key] !== 'string' || project[key].trim() === '') {
        fail(`${label}: "${key}" must be a non-empty string`);
      }
    }
    if (!STATUS_VALUES.includes(project.status)) {
      fail(`${label}: "status" must be one of: ${STATUS_VALUES.join(', ')}`);
    }
    if (typeof project.featured !== 'boolean') fail(`${label}: "featured" must be a boolean`);
    if (typeof project.links !== 'object' || project.links === null || Array.isArray(project.links)) {
      fail(`${label}: "links" must be an object with "repo"/"demo" as string | null`);
    } else {
      for (const key of LINK_KEYS) {
        if (project.links[key] !== null && project.links[key] !== undefined && !safeExternalUrl(project.links[key])) {
          fail(`${label}: "links.${key}" must be null or a valid http(s) URL`);
        }
      }
    }
    if (!Array.isArray(project.tags)) {
      fail(`${label}: "tags" must be an array of strings`);
      continue;
    }
    for (const tag of project.tags) {
      if (typeof tag !== 'string' || !slugLike(tag)) fail(`${label}: invalid tag "${tag}" (lowercase, hyphenated)`);
    }
    if (new Set(project.tags).size !== project.tags.length) fail(`${label}: duplicate tags`);
    if (!insideWorkspace(project.image)) {
      fail(`${label}: "image" must stay within wwwroot/ (no "../" or absolute path): ${project.image}`);
      continue;
    }
    if (!await exists(path.join(SRC, project.image))) fail(`${label}: image not found: ${project.image}`);
    if (!await exists(path.join(SRC, 'html', 'proj', `${project.id}.html`))) {
      fail(`${label}: missing page wwwroot/html/proj/${project.id}.html`);
    }
    projects.push(project);
  }
  return projects.sort((a, b) => b.date.localeCompare(a.date));
}
