# Personal Project Website

A minimal, responsive, personal project website built with pure HTML, CSS and JavaScript. No frameworks, no runtime dependencies, no cookies. A small dependency-free Node.js build script (`npm run build`) compiles the sources in `wwwroot/` into static pages in `dist/`.

## Core Directives

1. **Pure stack**: HTML5, CSS3, vanilla JavaScript (ES2020+). No frameworks or libraries. The only tooling is npm with a dependency-free Node.js build script (approved); do not add further dependencies or bundlers unless explicitly approved and documented here.
2. **Minimalistic design**: restrained colour palette, generous whitespace, no decorative noise, no animations beyond subtle transitions.
3. **Responsive**: mobile-first layout; must work from 320px width up to large desktop screens.
4. **System fonts only**: use the default font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` and `ui-monospace, monospace` for code). No web font downloads.
5. **No cookies**: no cookies, no `localStorage`/`sessionStorage` for tracking, no third-party trackers, analytics or embeds that set cookies.
6. **Modular and expandable**: each page section, project entry and style concern lives in its own file/module. New projects are added by data, not by editing layout code.
7. **Accessible**: semantic HTML, keyboard navigable, sufficient contrast, `alt` text on images, `prefers-reduced-motion` respected.
8. **Lightweight**: no unnecessary assets; images optimised; no external requests required to render the site.

## Outline

```
Website/
├── README.md              # This file: directives, outline, todos
├── AGENTS.md              # Instructions for AI agents / contributors (AGENTS.md)
├── .gitignore             # Ignore OS/editor junk, node_modules/, dist/
├── .editorconfig          # Indentation and encoding rules
├── package.json           # npm scripts (no dependencies)
├── scripts/
│   ├── build.mjs          # Build: wwwroot/ -> dist/
│   └── serve.mjs          # Local preview server for dist/
├── dist/                  # Build output (generated, git-ignored, deploy this)
└── wwwroot/               # Source (build input)
    ├── index.html         # Entry page (home / overview)
    ├── 404.html           # Not-found page
    ├── favicon.svg        # Monogram favicon (template; initial comes from site.json)
    ├── robots.txt         # Crawler rules
    ├── partials/          # Build-time includes (not copied to dist/)
    │   ├── header.html    # Shared skip link, header and nav
    │   └── footer.html    # Shared footer
    ├── html/              # Additional page templates
    │   ├── projects.html  # Project listing page with tag filter
    │   ├── about.html     # About and contact page
    │   └── proj/          # Individual project pages (one per project, named by `id`)
    │       ├── project-template.html  # Master project write-up template (all layouts; not built)
    │       ├── sy317.html # Static project page (from template)
    │       └── placeholder-project-*.html  # Static project pages (from template)
    ├── css/
    │   ├── base.css       # Reset, custom properties, typography, colour schemes
    │   ├── layout.css     # Container, header, nav, footer, sections
    │   ├── components.css # Cards, tags, filter, buttons, messages
    │   └── responsive.css # Breakpoints (640px, 960px), fluid type
    ├── js/
    │   ├── main.js        # Bootstrap, initialises modules per page
    │   ├── projects.js    # Tag filter for the pre-rendered project list
    │   └── nav.js         # Mobile navigation toggle
    ├── data/              # Build input only (not copied to dist/)
    │   ├── nav.json       # Navigation entries (label + href)
    │   ├── projects.json  # Project entries (single source of truth)
    │   └── site.json      # Shared site info (name, copyright, email)
    └── assets/
        ├── img/           # Optimised images (WebP/SVG preferred)
        │   ├── placeholder.svg  # Placeholder project image (wide)
        │   ├── placeholder-square.svg  # Placeholder (square)
        │   ├── placeholder-portrait.svg  # Placeholder (portrait)
        │   └── GitHub_Invertocat_White.svg  # Github mark (leading icon in the Source button)
        └── icons/         # SVG icons (.gitkeep until first icon)
```

### Build and Preview

Requires Node.js ≥ 18. There are no dependencies, so no `npm install` is needed.

| Command | Effect |
| --- | --- |
| `npm run build` | Deletes `dist/` and rebuilds it from `wwwroot/`. Exits non-zero on invalid data, unknown tokens/includes or broken internal links. |
| `npm run serve` | Serves `dist/` at `http://localhost:8000/` (`PORT` env var overrides). |
| `npm start` | Build, then serve. |
| `npm run clean` | Removes `dist/`. |

The build copies `wwwroot/` to `dist/` except `partials/`, `data/` and `html/proj/project-template.html`. HTML files and `favicon.svg` are processed in three passes: includes, tokens, directives. The output is fully static: no `fetch()` and no runtime content loading. Deploy the contents of `dist/`.

### Build-time Templating

Content is never hard-coded where it can be generated. Source pages use these constructs:

| Construct | Result |
| --- | --- |
| `<!-- @include header -->` / `<!-- @include footer -->` | Inserts `partials/header.html` / `partials/footer.html` (any file in `partials/` works by its name). |
| `{{name}}`, `{{year}}`, `{{footerNote}}`, `{{email}}`, `{{monogram}}` | Values from `data/site.json` (`monogram` = first letter of `name`). |
| `{{root}}` | Relative path to the web root (`""` for root pages, `"../"` for pages in `html/`). |
| `<!-- @nav -->` | Nav list built from `data/nav.json`; sets `aria-current="page"` on the entry whose `href` is the current page. Used in `partials/header.html`. |
| `{{projectTitle}}`, `{{projectSummary}}` | Title/summary of the project whose `id` equals the page filename (`html/proj/{id}.html`). |
| `<!-- @project-header -->` | Project page header (h1, summary, status/date, tags, links) from `data/projects.json`. |
| `<!-- @projects all\|featured level=2\|3 id=list-id -->` | Pre-rendered project card grid, newest first. |
| `<!-- @tag-filter list-id -->` | Tag filter buttons and status line for the list with that `id` (hidden until `js/projects.js` runs). |

All inserted values are HTML-escaped. Use `{{name}}` (not a hard-coded name) in every `<title>` and `meta[name="description"]`. Source files in `wwwroot/` are templates and are not meant to be opened directly in a browser; open the built files in `dist/`.

The build validates `data/projects.json` (required fields, unique lowercase ids, `YYYY-MM` dates, existing image and `html/proj/{id}.html` page) and checks every internal `href`/`src` in the output.

### Shared Header/Footer

The header (skip link, brand, nav) and footer live once in `wwwroot/partials/`. Edit them there; every page picks them up on the next build. The nav toggle starts `hidden` so that without JavaScript the nav is always visible. Required header structure (used by `css/layout.css` and `js/nav.js`):

```html
<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-brand" href="…">…</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">…</nav>
  </div>
</header>
```

### Navigation (`data/nav.json`)

The navbar is generated from `data/nav.json`, an ordered array. Add, remove or reorder entries to control which pages appear.

```json
[
  { "label": "Home", "href": "index.html" },
  { "label": "Projects", "href": "html/projects.html" }
]
```

`href` is relative to the web root (the build prefixes `../` where needed) or an absolute `http(s)` URL (rendered with `rel="noopener noreferrer"`). Internal targets must exist or the build fails on the broken link.

### Site Config (`data/site.json`)

Shared site info lives in `data/site.json` — the single source of truth, applied at build time.

| Field | Used for |
| --- | --- |
| `name` | Header brand, `{{name}}` in titles/descriptions/intro, footer copyright, favicon monogram. |
| `copyrightYear` | Footer copyright line (optional; defaults to the build year). |
| `footerNote` | Footer note. |
| `email` | Contact `mailto:` link on the About page. |

### Script Hooks

`js/main.js` initialises modules based on data attributes in the page (emitted by the build):

| Attribute | Effect |
| --- | --- |
| `data-tag-filter="<list-id>"` | Filter host for the list with that `id`; `js/projects.js` reveals it and toggles cards via their `data-tags`. |
| `data-filter-status="<list-id>"` | Live status text with the result count. |

### Project Write-up Template

[`wwwroot/html/proj/project-template.html`](wwwroot/html/proj/project-template.html) is the master template for writing about a project. It is a reference page that is not built into `dist/`; it demonstrates every supported layout pattern with placeholder body content. Its header, title and description are generated from `data/projects.json` like any project page.

- To write a new project page, add the project to `data/projects.json`, copy the template to `html/proj/{id}.html`, keep the includes and `@project-header`, and replace the placeholder body content.
- Each numbered section shows one layout pattern: pure text, text with a small image, full-width image, text/image side by side, image gallery, callout, code block, lists, and table.
- The styles for all patterns live in `css/components.css` (base) and `css/responsive.css` (breakpoints at 640px and 960px). Do not add inline styles.
- To add a NEW layout pattern, append a new numbered section to the template, add its styles to `css/components.css` (and `css/responsive.css` if it needs breakpoints), and note it here.
- Placeholder images for different aspect ratios live in `assets/img/` (`placeholder.svg` wide, `placeholder-square.svg`, `placeholder-portrait.svg`).
- Project cards link to a static page per project at `html/proj/{id}.html` (e.g. `html/proj/placeholder-project-one.html`). When adding a project to `data/projects.json`, create its page from this template and name it after the project `id`.

### Placeholders

Name, copyright, footer note, email and favicon initial come from `data/site.json`. Still to replace with real content: the intro on `index.html`, the text on `html/about.html`, the three `placeholder-project-*` entries in `data/projects.json` and their page bodies.

### Supporting Files

| File | Purpose |
| --- | --- |
| `.editorconfig` | UTF-8, LF line endings, 2-space indent for HTML/CSS/JS/JSON, trim trailing whitespace. |
| `.gitignore` | Ignore `.DS_Store`, `Thumbs.db`, editor folders (`.vscode/`, `.idea/`), `node_modules/`, `dist/`. |
| `package.json` | npm scripts only; no dependencies. |
| `wwwroot/robots.txt` | Allow all crawlers, point to sitemap once it exists. |
| `wwwroot/sitemap.xml` | Optional, generated manually when pages are added. |
| `wwwroot/favicon.svg` | Monogram favicon template; `{{monogram}}` is filled at build time. |
| `wwwroot/404.html` | Minimal not-found page using the shared stylesheet. |

### Data Model (`data/projects.json`)

```json
{
  "id": "example-project",
  "title": "Example Project",
  "summary": "One-sentence description.",
  "tags": ["javascript", "tool"],
  "status": "active",
  "date": "2026-01",
  "links": { "repo": "https://example.com/repo", "demo": null },
  "image": "assets/img/example.webp",
  "featured": false
}
```

Adding a project means adding an entry to this file and creating `html/proj/{id}.html` from the project template. Cards, filter, page title and page header are generated by the build. The project header's **Source** button (from `links.repo`) renders with the Github mark (`assets/img/GitHub_Invertocat_White.svg`) as a leading badge; the **Demo** button (from `links.demo`) stays a plain text button. Omit the link to hide its button.

## Todo List

### Phase 0 — Setup
- [x] Create `index.html` with semantic skeleton (`header`, `main`, `footer`)
- [x] Add `.editorconfig` and `.gitignore`
- [x] Add `favicon.svg`, `robots.txt`, `404.html`
- [x] Create `assets/img/` and `assets/icons/` folders

### Phase 1 — Styling Foundation
- [x] `css/base.css`: CSS custom properties (colours, spacing scale, type scale), reset, system font stack
- [x] `css/layout.css`: container, header, footer, main grid
- [x] `css/components.css`: project card, tag, link, button styles
- [x] `css/responsive.css`: breakpoints (≥ 640px, ≥ 960px), fluid typography
- [x] Light and dark colour scheme via `prefers-color-scheme`

### Phase 2 — Content & Structure
- [x] Home page: intro, featured projects (placeholder text)
- [x] `html/projects.html`: full project listing
- [x] `html/project.html`: detail template (driven by `?id=` query parameter)
- [x] `html/about.html`: about and contact (contact via plain `mailto:` link)
- [x] Shared header/footer markup, documented how to keep it consistent across pages
- [x] `html/project-template.html`: master project write-up template with all layout patterns
- [ ] Replace placeholder content (intro, about text, project entries and pages)

### Phase 3 — Data & Scripts
- [x] Create `data/projects.json` with schema above (placeholder entries)
- [x] `js/projects.js`: tag filter (originally fetched and rendered cards; now done at build time)
- [x] `data/site.json`: single source of truth for header/footer content (name, copyright, email)
- [x] `js/nav.js`: accessible mobile menu (button with `aria-expanded`, Escape to close)
- [x] `js/main.js`: bootstrap that initialises modules per page
- [x] Filtering by tag (no persistence, no cookies)

### Phase 3b — npm Build
- [x] `package.json` (no dependencies) with `build`, `clean`, `serve`, `start` scripts
- [x] `scripts/build.mjs`: wwwroot/ → dist/, includes, tokens, directives, data validation, link check
- [x] `scripts/serve.mjs`: local preview of `dist/`
- [x] Navbar generated from `data/nav.json` (`@nav` directive)
- [x] Shared header/footer as partials; site.json content generated at build time
- [x] Project lists, project headers and tag filter pre-rendered; runtime `fetch` removed

### Phase 4 — Quality
- [ ] Test layout at 320px, 768px, 1280px widths
- [ ] Keyboard navigation and focus styles verified
- [ ] Validate HTML (W3C validator) and CSS
- [ ] Lighthouse check: accessibility and performance ≥ 95
- [ ] Verify no cookies are set and no third-party requests are made

### Phase 5 — Release
- [ ] Choose hosting (static: GitHub Pages, Netlify, or self-hosted)
- [ ] Add `sitemap.xml` and meta descriptions / Open Graph tags
- [ ] Write a short deployment note in this README (deploy the contents of `dist/`)

## Open Decisions
- Hosting target
- Whether a dark mode toggle is wanted (default: follow system preference only)
- Language of the site (default: English)
