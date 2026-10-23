// Loading and validation of wwwroot/data/*.json.

import path from 'node:path';
import { SRC, exists, fail, readJson } from './util.mjs';

const REQUIRED_PROJECT_FIELDS = ['id', 'title', 'summary', 'tags', 'status', 'date', 'links', 'image', 'featured'];

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
    monogram: Array.from(site.name ?? '').find((char) => char.trim() !== '')?.toUpperCase() ?? '',
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
    if (!Array.isArray(project.tags) || !project.tags.every((tag) => typeof tag === 'string')) {
      fail(`${label}: tags must be an array of strings`);
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
