# AGENTS.md

Instructions for AI agents and contributors working in this repository.

## Project Summary

This repository contains a personal project website built with **pure HTML, CSS and vanilla JavaScript**. See [`README.md`](README.md) for the full outline, data model and todo list. Treat the core directives in the README as binding.

## Hard Constraints

- Use only HTML5, CSS3 and vanilla JavaScript (ES2020+).
- Do not add frameworks, libraries, build tools, or package managers (`package.json`, `node_modules`) without explicit user approval.
- Do not set cookies, and do not use `localStorage`, `sessionStorage`, or `IndexedDB` for user tracking.
- Do not add third-party scripts, trackers, analytics, fonts, or CDN assets. The site must render with no external requests.
- Use system font stacks only. Do not download web fonts.
- Keep the design minimal: no heavy shadows, gradients-for-decoration, or decorative animation.
- Every page must be responsive, starting at 320px width.

## Directory Responsibilities

All site files live under the `wwwroot/` directory, which is the web root served to visitors. Keep every page, stylesheet, script, data file and asset inside `wwwroot/`.

| Path | Contents | Rules |
| --- | --- | --- |
| `wwwroot/index.html` | Home page | Only page-level layout and section structure. No inline styles or scripts. |
| `wwwroot/404.html` | Not-found page | Reuse the shared header/footer markup and stylesheet. |
| `wwwroot/html/` | Secondary page templates | One page per file. Reuse the same header/footer markup as `index.html`. |
| `wwwroot/html/project-template.html` | Master project write-up template | Reference for every supported project layout. Copy sections into new project pages; append new layouts here over time. |
| `wwwroot/css/` | Stylesheets | Split by concern: `base`, `layout`, `components`, `responsive`. Use CSS custom properties for all colours and spacing. |
| `wwwroot/js/` | Scripts | One module per concern (`nav`, `projects`, `site`, `main`). Use `type="module"` and no global variables. |
| `wwwroot/data/` | JSON content | `projects.json` is the single source of truth for projects; `site.json` holds shared site info (name, copyright, email). Keep both valid JSON. |
| `wwwroot/assets/` | Images and icons | Prefer SVG; use WebP for raster images; always provide `alt` text. |

Note: `wwwroot/js/` and `wwwroot/assets/` exist but may be sparse. Create new files there only when the task requires it.

## Project Write-up Template

[`wwwroot/html/project-template.html`](wwwroot/html/project-template.html) is the master template for writing about a project. It is a static reference page (not data-driven) that demonstrates every supported layout pattern with placeholder content for a test project named "FooBar Template".

Use it as follows:

- To write a new project page, copy the template to a new file (e.g. `html/my-project.html`), keep the shared header/footer, and replace the placeholder content.
- Each numbered section shows one layout pattern: pure text, text with a small image, full-width image, text/image side by side, image gallery, callout, code block, lists, and table.
- The styles for all patterns live in `css/components.css` (base) and `css/responsive.css` (breakpoints at 640px and 960px). Do not add inline styles.
- To add a NEW layout pattern, append a new numbered section to the template, add its styles to `css/components.css` (and `css/responsive.css` if it needs breakpoints), and note it in `README.md`.
- Placeholder images for different aspect ratios live in `assets/img/` (`placeholder.svg` wide, `placeholder-square.svg`, `placeholder-portrait.svg`).

## Site Config (`data/site.json`)

Shared site info (name, copyright year, footer note, contact email) lives in `data/site.json` — the single source of truth. `js/site.js` fetches it on every page and fills in the header/footer, page title and meta description, so you do not repeat this content in each page.

- `name` → the header brand (`[data-site-brand]`) and the `{name}` token in `<title>` and `meta[name="description"]`.
- `copyrightYear` + `name` → the footer copyright line (`[data-site-copyright]`).
- `footerNote` → the footer note (`[data-site-note]`).
- `email` → the contact `mailto:` link (`[data-site-email]`).

Keep the placeholder text in the HTML as a no-JavaScript fallback; `site.js` overwrites it when the config loads. Use the `{name}` token (not a hard-coded name) in every `<title>` and `meta[name="description"]`.

## Coding Standards

### HTML
- Semantic elements first (`header`, `nav`, `main`, `section`, `article`, `footer`).
- Exactly one `h1` per page.
- Attributes in double quotes; lowercase tags and attributes.
- Links to internal pages use relative paths (e.g., `html/projects.html`).
- Every `img` has `alt` (empty `alt=""` only for purely decorative images).

### CSS
- Mobile-first: base styles target small screens; use `min-width` media queries.
- Breakpoints are defined in `css/responsive.css` only: `640px` and `960px`.
- Colours, spacing and type scale are defined as custom properties in `css/base.css`. Do not hard-code colours elsewhere.
- Use `rem` for font sizes and spacing; avoid fixed pixel widths for containers.
- Support `prefers-color-scheme` and `prefers-reduced-motion`.
- Class names: lowercase, hyphenated, BEM-light (e.g., `project-card`, `project-card__title`).

### JavaScript
- Vanilla ES modules only. No `var`; use `const` by default, `let` when reassigned.
- Each module exports functions and initialises on `DOMContentLoaded` via `js/main.js`.
- Handle failure states: failed `fetch`, empty data, missing DOM elements. Fail quietly with a visible message, never with an uncaught exception.
- No `innerHTML` with unsanitised data from JSON; build nodes with `document.createElement` or use `textContent`.
- No `document.cookie`, no storage APIs for tracking.

### Data
- `data/projects.json` must match the schema documented in `README.md`.
- Required fields: `id`, `title`, `summary`, `tags`, `status`, `date`, `links`, `image`, `featured`.
- `id` values are unique, lowercase, hyphenated.
- `date` format: `YYYY-MM`.

## Workflow for Agents

1. Read `README.md` and this file before making changes.
2. Check the todo list in `README.md`. Work on the earliest unchecked item unless the user specifies otherwise.
3. When a task is completed, tick the corresponding checkbox in `README.md`.
4. Keep changes scoped: one concern per change. Do not refactor unrelated files.
5. Do not create files that are not part of the planned outline without updating the outline in `README.md` first.
6. After editing HTML/CSS/JS, verify the page by opening it in a browser at 320px, 768px and 1280px widths where possible.
7. Do not commit, push, or deploy unless explicitly asked.

## Definition of Done

- Valid HTML and CSS (no errors in W3C validators).
- No console errors in the browser.
- No external network requests and no cookies set.
- Keyboard navigable; visible focus styles.
- Matches the minimal design and directives in `README.md`.
- Todo checkbox updated in `README.md`.

## Things Agents Must Not Do

- Do not invent project data. Use placeholders clearly marked as such, or ask the user.
- Do not add tracking, analytics, or consent banners (there are no cookies to consent to).
- Do not replace the system font stack with custom or web fonts.
- Do not add a build pipeline unless the user requests it.
- Do not write long prose in code comments; keep comments short and technical.
