# AGENTS.md

Instructions for AI agents and contributors working in this repository.

## Project Summary

This repository contains a personal project website built with **pure HTML, CSS and vanilla JavaScript**. See [`README.md`](README.md) for the full outline, data model and todo list. Treat the core directives in the README as binding.

## Hard Constraints

- Use only HTML5, CSS3 and vanilla JavaScript (ES2020+).
- The project is an npm project (Node.js ≥ 18) with a dependency-free build script. Do not add npm dependencies, frameworks, libraries, bundlers or other build tools without explicit user approval. Runtime code in the browser stays vanilla.
- Do not set cookies, and do not use `localStorage`, `sessionStorage`, or `IndexedDB` for user tracking.
- Do not add third-party scripts, trackers, analytics, fonts, or CDN assets. The site must render with no external requests.
- Use system font stacks only. Do not download web fonts.
- Keep the design minimal: no heavy shadows, gradients-for-decoration, or decorative animation.
- Every page must be responsive, starting at 320px width.

## Directory Responsibilities

All site sources live under `wwwroot/`. `npm run build` compiles them into `dist/` (generated, git-ignored; never edit it by hand). Keep every page, stylesheet, script, data file and asset inside `wwwroot/`; tooling lives in `scripts/`.

| Path | Contents | Rules |
| --- | --- | --- |
| `scripts/` | `build.mjs`, `serve.mjs` | Node built-ins only. Keep the build deterministic and failing loudly on bad data. |
| `wwwroot/index.html` | Home page | Only page-level layout and section structure. No inline styles or scripts. |
| `wwwroot/404.html` | Not-found page | Use the shared header/footer includes and stylesheet. |
| `wwwroot/partials/` | Header and footer includes | Single copy of the shared markup. Not copied to `dist/`. |
| `wwwroot/html/` | Secondary page templates | One page per file. Use `<!-- @include header -->` / `footer`. |
| `wwwroot/html/project-template.html` | Master project write-up template | Reference for every supported project layout (not built). Copy sections into new project pages; append new layouts here over time. |
| `wwwroot/css/` | Stylesheets | Split by concern: `base`, `layout`, `components`, `responsive`. Use CSS custom properties for all colours and spacing. |
| `wwwroot/js/` | Scripts | One module per concern (`nav`, `projects`, `main`). Use `type="module"` and no global variables. |
| `wwwroot/data/` | JSON content (build input) | `projects.json` is the single source of truth for projects; `site.json` holds shared site info (name, copyright, email). Keep both valid JSON. Not copied to `dist/`. |
| `wwwroot/assets/` | Images and icons | Prefer SVG; use WebP for raster images; always provide `alt` text. |

Note: `wwwroot/js/` and `wwwroot/assets/` exist but may be sparse. Create new files there only when the task requires it.

## Project Write-up Template

[`wwwroot/html/project-template.html`](wwwroot/html/project-template.html) is the master template for writing about a project. It is a reference page that is not built into `dist/`; it demonstrates every supported layout pattern with placeholder body content. Header, title and description are generated from `data/projects.json`.

Use it as follows:

- To write a new project page, add the project to `data/projects.json`, copy the template to `html/{id}.html`, keep the includes and `<!-- @project-header -->`, and replace the placeholder body content.
- Each numbered section shows one layout pattern: pure text, text with a small image, full-width image, text/image side by side, image gallery, callout, code block, lists, and table.
- The styles for all patterns live in `css/components.css` (base) and `css/responsive.css` (breakpoints at 640px and 960px). Do not add inline styles.
- To add a NEW layout pattern, append a new numbered section to the template, add its styles to `css/components.css` (and `css/responsive.css` if it needs breakpoints), and note it in `README.md`.
- Placeholder images for different aspect ratios live in `assets/img/` (`placeholder.svg` wide, `placeholder-square.svg`, `placeholder-portrait.svg`).

## Build and Templating

Commands: `npm run build` (wwwroot → dist), `npm run serve`, `npm start` (both), `npm run clean`. Full reference of includes, `{{tokens}}` and `@directives` is in [`README.md`](README.md#build-time-templating).

- Never hard-code generated content (site name, year, footer note, email, nav, project titles/summaries/cards) in pages. Use `{{name}}`, `{{email}}`, `<!-- @include header -->`, `<!-- @project-header -->`, `<!-- @projects … -->`, etc.
- The navbar comes from `data/nav.json` via `<!-- @nav -->` in `partials/header.html`; never hard-code nav links.
- Shared info lives in `data/site.json` (`name`, `copyrightYear`, `footerNote`, `email`); the build fills header, footer, titles, descriptions, contact link and the favicon monogram.
- Use `{{name}}` (not a hard-coded name) in every `<title>` and `meta[name="description"]`.
- Browser scripts must not fetch content; everything is pre-rendered. Keep the build free of dependencies.
- Run `npm run build` after any change to `wwwroot/` or `scripts/` and fix all reported errors. If you add a token or directive, document it in `README.md`.

## Coding Standards

### HTML
- Semantic elements first (`header`, `nav`, `main`, `section`, `article`, `footer`).
- Exactly one `h1` per page.
- Attributes in double quotes; lowercase tags and attributes.
- Links to internal pages use relative paths (e.g., `html/projects.html`); shared partials use `{{root}}`. The build fails on broken internal links.
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
- Handle missing DOM elements and malformed attributes; never throw uncaught exceptions.
- No `innerHTML` with unsanitised data; build nodes with `document.createElement` or use `textContent`. The build script must HTML-escape all data it inserts.
- No `document.cookie`, no storage APIs for tracking.

### Data
- `data/projects.json` must match the schema documented in `README.md`.
- Required fields: `id`, `title`, `summary`, `tags`, `status`, `date`, `links`, `image`, `featured`.
- `id` values are unique, lowercase, hyphenated.
- `date` format: `YYYY-MM`.
- Each project needs a page `wwwroot/html/{id}.html`; the build fails otherwise.

## Workflow for Agents

1. Read `README.md` and this file before making changes.
2. Check the todo list in `README.md`. Work on the earliest unchecked item unless the user specifies otherwise.
3. When a task is completed, tick the corresponding checkbox in `README.md`.
4. Keep changes scoped: one concern per change. Do not refactor unrelated files.
5. Do not create files that are not part of the planned outline without updating the outline in `README.md` first.
6. After editing HTML/CSS/JS, run `npm run build`, then verify `dist/` (e.g. `npm run serve`) in a browser at 320px, 768px and 1280px widths where possible.
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
- Do not add npm dependencies or extend the build pipeline beyond its documented scope without user approval.
- Do not edit files in `dist/`.
- Do not write long prose in code comments; keep comments short and technical.
