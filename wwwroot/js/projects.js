// Loads data/projects.json and renders lists, tag filter and detail view.
// Paths resolve from this module, so it works from any page depth.

const SITE_ROOT = new URL('../', import.meta.url);
const DATA_URL = new URL('data/projects.json', SITE_ROOT);
const REQUIRED_FIELDS = ['id', 'title', 'summary', 'tags', 'status', 'date', 'links', 'image', 'featured'];
const LINK_LABELS = [['repo', 'Source'], ['demo', 'Demo']];

// Helpers

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function isValidProject(project) {
  return project !== null
    && typeof project === 'object'
    && REQUIRED_FIELDS.every((key) => key in project)
    && typeof project.id === 'string'
    && typeof project.title === 'string'
    && Array.isArray(project.tags);
}

// External links: http(s) only.
function safeExternalUrl(value) {
  if (typeof value !== 'string' || value === '') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// Images: site-relative paths only (no external requests).
function resolveAsset(path) {
  if (typeof path !== 'string' || path === '') return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return null;
  return new URL(path, SITE_ROOT).href;
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value));
  if (!match) return String(value);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString('en', { year: 'numeric', month: 'short', timeZone: 'UTC' });
}

function sortByDate(projects) {
  return [...projects].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// Static project pages live at html/{id}.html (copied from the template).
function detailHref(id) {
  return new URL(`html/${encodeURIComponent(id)}.html`, SITE_ROOT).href;
}

function countLabel(count) {
  return count === 1 ? '1 project' : `${count} projects`;
}

// Rendering

function renderMessage(container, text, variant = 'info') {
  const message = el('p', `message message--${variant}`, text);
  message.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  container.replaceChildren(message);
}

function createImage(path, alt, className) {
  const src = resolveAsset(path);
  if (!src) return null;
  const img = el('img', className);
  img.src = src;
  img.alt = alt;
  img.decoding = 'async';
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

function createMeta(project) {
  const meta = el('p', 'project-meta');
  meta.append(el('span', 'status', project.status));
  const time = el('time', null, formatDate(project.date));
  time.dateTime = String(project.date);
  meta.append(time);
  return meta;
}

function createTagList(tags) {
  const list = el('ul', 'tag-list');
  list.setAttribute('aria-label', 'Tags');
  tags.filter((tag) => typeof tag === 'string').forEach((tag) => {
    const item = el('li');
    item.append(el('span', 'tag', tag));
    list.append(item);
  });
  return list;
}

function createLinks(links, title) {
  const list = el('ul', 'link-list');
  LINK_LABELS.forEach(([key, label]) => {
    const href = safeExternalUrl(links?.[key]);
    if (!href) return;
    const anchor = el('a', 'button button--secondary', label);
    anchor.href = href;
    anchor.rel = 'noopener noreferrer';
    anchor.append(el('span', 'visually-hidden', ` for ${title}`));
    const item = el('li');
    item.append(anchor);
    list.append(item);
  });
  return list.childElementCount > 0 ? list : null;
}

function createCard(project, headingTag) {
  const card = el('article', 'project-card');

  // Decorative in cards: the title follows directly.
  const img = createImage(project.image, '', 'project-card__image');
  if (img) {
    img.loading = 'lazy';
    card.append(img);
  }

  const body = el('div', 'project-card__body');
  const heading = el(headingTag, 'project-card__title');
  const link = el('a', 'project-card__link', project.title);
  link.href = detailHref(project.id);
  heading.append(link);

  body.append(
    heading,
    createMeta(project),
    el('p', 'project-card__summary', project.summary),
    createTagList(project.tags),
  );
  card.append(body);
  return card;
}

function renderList(container, projects, headingTag) {
  if (projects.length === 0) {
    renderMessage(container, 'No projects to show yet.');
    return;
  }
  container.replaceChildren(...projects.map((project) => createCard(project, headingTag)));
}

function initTagFilter(host, status, container, projects, headingTag) {
  const tags = [...new Set(projects.flatMap((project) => project.tags))]
    .filter((tag) => typeof tag === 'string')
    .sort((a, b) => a.localeCompare(b));

  if (tags.length === 0) {
    host.hidden = true;
    return;
  }

  const buttons = ['', ...tags].map((tag) => {
    const button = el('button', 'tag-filter__button', tag || 'All');
    button.type = 'button';
    button.dataset.tag = tag;
    button.setAttribute('aria-pressed', String(tag === ''));
    return button;
  });

  const apply = (tag) => {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.tag === tag)));
    const visible = tag ? projects.filter((project) => project.tags.includes(tag)) : projects;
    renderList(container, visible, headingTag);
    if (status) {
      status.textContent = tag ? `${countLabel(visible.length)} tagged “${tag}”` : countLabel(visible.length);
    }
  };

  host.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-tag]');
    if (button) apply(button.dataset.tag);
  });

  host.replaceChildren(...buttons);
  if (status) status.textContent = countLabel(projects.length);
}

// Public API

export async function loadProjects() {
  const response = await fetch(DATA_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Expected an array of projects');
  return data.filter(isValidProject);
}

// Container attributes:
//   data-projects="all" | "featured"
//   data-heading-level="2" | "3" (default 3)
//   id="..." links to [data-tag-filter="id"] and [data-filter-status="id"]
export async function initProjectList(container) {
  const headingTag = container.dataset.headingLevel === '2' ? 'h2' : 'h3';
  renderMessage(container, 'Loading projects…');

  let projects;
  try {
    projects = await loadProjects();
  } catch (error) {
    console.warn('Projects could not be loaded:', error);
    renderMessage(container, 'Projects could not be loaded. Please try again later.', 'error');
    return;
  }

  const selection = container.dataset.projects === 'featured'
    ? projects.filter((project) => project.featured === true)
    : projects;
  const sorted = sortByDate(selection);
  renderList(container, sorted, headingTag);

  if (!container.id) return;
  const key = CSS.escape(container.id);
  const filterHost = document.querySelector(`[data-tag-filter="${key}"]`);
  const statusHost = document.querySelector(`[data-filter-status="${key}"]`);
  if (filterHost && sorted.length > 0) initTagFilter(filterHost, statusHost, container, sorted, headingTag);
}

// Root needs [data-project-title] and [data-project-body]; reads ?id= from the URL.
export async function initProjectDetail(root) {
  const title = root.querySelector('[data-project-title]');
  const body = root.querySelector('[data-project-body]');
  if (!title || !body) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    title.textContent = 'No project selected';
    renderMessage(body, 'Choose a project from the project list.');
    return;
  }

  renderMessage(body, 'Loading project…');

  let projects;
  try {
    projects = await loadProjects();
  } catch (error) {
    console.warn('Project could not be loaded:', error);
    title.textContent = 'Project unavailable';
    renderMessage(body, 'The project could not be loaded. Please try again later.', 'error');
    return;
  }

  const project = projects.find((entry) => entry.id === id);
  if (!project) {
    title.textContent = 'Project not found';
    renderMessage(body, 'There is no project with this ID.', 'error');
    return;
  }

  title.textContent = project.title;
  const siteName = document.querySelector('.site-brand')?.textContent.trim();
  document.title = siteName ? `${project.title} — ${siteName}` : project.title;

  const nodes = [createMeta(project)];
  const img = createImage(project.image, `Preview of ${project.title}`, 'project-detail__image');
  if (img) nodes.push(img);
  nodes.push(el('p', 'project-detail__summary', project.summary), createTagList(project.tags));
  const links = createLinks(project.links, project.title);
  if (links) nodes.push(links);

  body.replaceChildren(...nodes);
}
