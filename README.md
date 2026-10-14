# Personal Project Website

A minimal, responsive, personal project website built with pure HTML, CSS and JavaScript. No frameworks, no build step, no cookies.

## Core Directives

1. **Pure stack**: HTML5, CSS3, vanilla JavaScript (ES2020+). No frameworks, libraries, bundlers or package managers unless explicitly approved and documented here.
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
├── .gitignore             # Ignore OS/editor junk
├── .editorconfig          # Indentation and encoding rules
└── wwwroot/               # Web root served to visitors
    ├── index.html         # Entry page (home / overview)
    ├── 404.html           # Not-found page
    ├── favicon.svg        # Monogram favicon (placeholder initial)
    ├── robots.txt         # Crawler rules
    ├── html/              # Additional page templates
    │   ├── projects.html  # Project listing page with tag filter
    │   ├── project.html   # Single project detail template (?id=)
    │   ├── project-template.html  # Master project write-up template (all layouts)
    │   ├── placeholder-project-one.html  # Static project page (from template)
    │   ├── placeholder-project-two.html  # Static project page (from template)
    │   ├── placeholder-project-three.html  # Static project page (from template)
    │   └── about.html     # About and contact page
    ├── css/
    │   ├── base.css       # Reset, custom properties, typography, colour schemes
    │   ├── layout.css     # Container, header, nav, footer, sections
    │   ├── components.css # Cards, tags, filter, buttons, messages
    │   └── responsive.css # Breakpoints (640px, 960px), fluid type
    ├── js/
    │   ├── main.js        # Bootstrap, initialises modules per page
    │   ├── projects.js    # Loads data, renders lists, filter and detail
    │   ├── site.js        # Loads site.json, fills header/footer/title
    │   └── nav.js         # Mobile navigation toggle
    ├── data/
    │   ├── projects.json  # Project entries (single source of truth)
    │   └── site.json      # Shared site info (name, copyright, email)
    └── assets/
        ├── img/           # Optimised images (WebP/SVG preferred)
        │   ├── placeholder.svg  # Placeholder project image (wide)
        │   ├── placeholder-square.svg  # Placeholder (square)
        │   └── placeholder-portrait.svg  # Placeholder (portrait)
        └── icons/         # SVG icons (.gitkeep until first icon)
```

### Local Preview

`fetch()` does not work over `file://`, so serve the web root with any static server, e.g.:

```sh
cd wwwroot
python3 -m http.server 8000
# open http://localhost:8000/
```

### Shared Header/Footer Markup

There is no build step, so the header and footer are copied into every page. Keep them identical except for:

- **Relative paths**: root pages (`index.html`, `404.html`) use `html/…`, `css/…`, `js/…`; pages in `html/` use `../` for root assets and plain filenames for sibling pages.
- **`aria-current="page"`**: set only on the nav link of the current page.

When changing the header or footer, update all of: `index.html`, `404.html`, `html/projects.html`, `html/project.html`, `html/about.html`, `html/project-template.html`.

The visible content (brand name, copyright, footer note, contact email) is not hard-coded per page — it is read from `data/site.json` by `js/site.js` (see [Site Config](#site-config-datasitejson)). Keep the placeholder text in the HTML as a no-JavaScript fallback.

Required structure (used by `css/layout.css` and `js/nav.js`):

```html
<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-brand" href="…">Your Name</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">…</nav>
  </div>
</header>
```

The toggle starts `hidden` so that without JavaScript the nav is always visible.

### Site Config (`data/site.json`)

Shared site info lives in `data/site.json` — the single source of truth. `js/site.js` fetches it on every page and fills in the header/footer, page title and meta description, so you do not repeat this content in each page.

| Field | Used for |
| --- | --- |
| `name` | Header brand (`[data-site-brand]`) and the `{name}` token in `<title>` and `meta[name="description"]`. |
| `copyrightYear` | Footer copyright line (`[data-site-copyright]`), combined with `name`. |
| `footerNote` | Footer note (`[data-site-note]`). |
| `email` | Contact `mailto:` link (`[data-site-email]`). |

Use the `{name}` token (not a hard-coded name) in every `<title>` and `meta[name="description"]`.

### Script Hooks

`js/main.js` initialises modules based on data attributes in the page:

| Attribute | Effect |
| --- | --- |
| `data-projects="all"` / `"featured"` | Renders project cards into the element. |
| `data-heading-level="2"` | Card title level (default `3`). |
| `data-tag-filter="<list-id>"` | Tag filter buttons for the list with that `id`. |
| `data-filter-status="<list-id>"` | Live status text with the result count. |
| `data-project-detail` | Detail view; needs `[data-project-title]` and `[data-project-body]` children. |

### Project Write-up Template

[`wwwroot/html/project-template.html`](wwwroot/html/project-template.html) is the master template for writing about a project. It is a static reference page (not data-driven) that demonstrates every supported layout pattern with placeholder content for a test project named "FooBar Template".

- To write a new project page, copy the template to a new file (e.g. `html/my-project.html`), keep the shared header/footer, and replace the placeholder content.
- Each numbered section shows one layout pattern: pure text, text with a small image, full-width image, text/image side by side, image gallery, callout, code block, lists, and table.
- The styles for all patterns live in `css/components.css` (base) and `css/responsive.css` (breakpoints at 640px and 960px). Do not add inline styles.
- To add a NEW layout pattern, append a new numbered section to the template, add its styles to `css/components.css` (and `css/responsive.css` if it needs breakpoints), and note it here.
- Placeholder images for different aspect ratios live in `assets/img/` (`placeholder.svg` wide, `placeholder-square.svg`, `placeholder-portrait.svg`).
- Project cards link to a static page per project at `html/{id}.html` (e.g. `html/placeholder-project-one.html`). When adding a project to `data/projects.json`, create its page from this template and name it after the project `id`.

### Placeholders

All content marked "Your Name", "Placeholder…", `you@example.com` and the three `placeholder-project-*` entries in `data/projects.json` must be replaced with real content.

### Supporting Files

| File | Purpose |
| --- | --- |
| `.editorconfig` | UTF-8, LF line endings, 2-space indent for HTML/CSS/JS/JSON, trim trailing whitespace. |
| `.gitignore` | Ignore `.DS_Store`, `Thumbs.db`, editor folders (`.vscode/`, `.idea/`), `node_modules/` (in case tooling is added later). |
| `wwwroot/robots.txt` | Allow all crawlers, point to sitemap once it exists. |
| `wwwroot/sitemap.xml` | Optional, generated manually when pages are added. |
| `wwwroot/favicon.svg` | Simple monogram favicon at the web root. |
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

Adding a project means adding an entry to this file only.

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
- [ ] Replace placeholder content (name, intro, about text, email, favicon initial)

### Phase 3 — Data & Scripts
- [x] Create `data/projects.json` with schema above (placeholder entries)
- [x] `js/projects.js`: fetch JSON, render cards, handle empty and error states
- [x] `data/site.json` + `js/site.js`: single source of truth for header/footer content (name, copyright, email)
- [x] `js/nav.js`: accessible mobile menu (button with `aria-expanded`, Escape to close)
- [x] `js/main.js`: bootstrap that initialises modules per page
- [x] Filtering by tag (no persistence, no cookies)

### Phase 4 — Quality
- [ ] Test layout at 320px, 768px, 1280px widths
- [ ] Keyboard navigation and focus styles verified
- [ ] Validate HTML (W3C validator) and CSS
- [ ] Lighthouse check: accessibility and performance ≥ 95
- [ ] Verify no cookies are set and no third-party requests are made

### Phase 5 — Release
- [ ] Choose hosting (static: GitHub Pages, Netlify, or self-hosted)
- [ ] Add `sitemap.xml` and meta descriptions / Open Graph tags
- [ ] Write a short deployment note in this README

## Open Decisions
- Hosting target
- Whether a dark mode toggle is wanted (default: follow system preference only)
- Language of the site (default: English)
