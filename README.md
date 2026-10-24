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
├── .gitattributes         # LF line endings for text; binary for .bin/.jpg/.png/.webp
├── .editorconfig          # Indentation and encoding rules
├── .nvmrc                # Pins the local Node.js version to 22 (nvm)
├── .githooks/            # Versioned git hooks (pre-commit runs `npm run check`; activate with `npm run setup`)
├── .vscode/              # Shared editor config (tasks.json; extensions.json/launch.json planned)
├── package.json           # npm scripts (no dependencies)
├── scripts/
│   ├── build.mjs          # Build CLI: wwwroot/ -> dist/ (orchestration only)
│   ├── lib/               # Build modules (importable, unit-testable)
│   │   ├── util.mjs       # Paths, error collection, escaping, small helpers
│   │   ├── data.mjs       # Load and validate data/*.json
│   │   ├── render.mjs     # HTML/XML renderers for directives and sitemap
│   │   ├── pipeline.mjs   # @raw, includes, tokens, directives, cache busting (assets/JS/CSS)
│   │   ├── checks.mjs     # Checks on the rendered output (links)
│   │   └── *.test.mjs     # Unit tests (node --test): util, render, checks
│   ├── create.mjs         # Scaffold a new project page + projects.json entry
│   ├── dev.mjs            # Dev server: build, serve, watch, live reload
│   ├── firmware.mjs       # Scaffold an assets/firmware/<suite>/manifest.json
│   ├── page.mjs           # Scaffold a minimal secondary page in html/
│   └── serve.mjs          # Local preview server for dist/
├── dist/                  # Build output (generated, git-ignored, deploy this)
└── wwwroot/               # Source (build input)
    ├── index.html         # Entry page (home / overview)
    ├── 404.html           # Not-found page
    ├── .htaccess          # Apache config for dm7wb.de (error page, headers, caching; production only)
    ├── favicon.svg        # Logo favicon (simplified trace; also the header brand icon)
    ├── robots.txt         # Crawler rules
    ├── partials/          # Build-time includes (not copied to dist/)
    │   ├── head.html      # Shared <head> content (charset, CSP, favicon, CSS, main.js)
    │   ├── header.html    # Shared skip link, header and nav
    │   └── footer.html    # Shared footer (copyright, footer nav)
    ├── html/              # Additional page templates
    │   ├── projects.html  # Project listing page with tag filter
    │   ├── about.html     # About and contact page
    │   ├── impressum.html # Legal: imprint
    │   ├── privacy.html   # Legal: privacy policy
    │   ├── rechtliches.html # Legal: legal notes
    │   └── proj/          # Individual project pages (one per project, named by `id`)
    │       ├── project-template.html  # Master project write-up template (all layouts; not built)
    │       ├── sy317.html # Static project page (from template)
    │       ├── nixie-clock.html  # Static project page (from template)
    │       └── placeholder-project-*.html  # Static project pages (from template)
    ├── css/
    │   ├── base.css       # Reset, custom properties, typography, colour schemes
    │   ├── layout.css     # Container, header, nav, footer, sections
    │   ├── components.css # Cards, tags, filter, buttons, messages
    │   └── responsive.css # Breakpoints (640px, 960px), fluid type
    ├── js/
    │   ├── main.js        # Bootstrap, initialises modules per page
    │   ├── projects.js    # Tag filter for the pre-rendered project list
    │   ├── nav.js         # Mobile navigation toggle
    │   └── vendor/        # Vendored third-party JS (no CDN)
    │       └── esp-web-tools/  # ESP Web Tools web flasher (self-contained)
    ├── data/              # Build input only (not copied to dist/)
    │   ├── nav.json        # Header navigation entries (label + href)
    │   ├── footer-nav.json # Footer navigation entries (label + href)
    │   ├── projects.json   # Project entries (single source of truth)
    │   ├── site.json       # Shared site info (lang, name, copyright, email)
    │   └── strings.json    # German UI strings (count labels, buttons, aria)
    └── assets/
        ├── img/           # Optimised images (WebP/SVG preferred)
        │   ├── placeholder.svg  # Placeholder project image (wide)
        │   ├── placeholder-square.svg  # Placeholder (square)
        │   ├── placeholder-portrait.svg  # Placeholder (portrait)
        │   └── sy317_*    # sy317 project images (pic, render, schematic)
        ├── firmware/      # Web-flasher suites (one folder per firmware variant)
        │   ├── nixie-clock/  # bootloader.bin, partitions.bin, firmware.bin, manifest.json
        │   └── dummy/        # Example suite referenced by project-template.html (not built)
        └── icons/         # SVG icons
            └── GitHub_Invertocat_White.svg  # Github mark (leading icon in the Source button)
```

### Build and Preview

Requires Node.js ≥ 22. There are no dependencies, so no `npm install` is needed.

| Command | Effect |
| --- | --- |
| `npm run build` | Deletes `dist/` and rebuilds it from `wwwroot/`. Exits non-zero on invalid data, unknown tokens/includes or broken internal links. |
| `npm run check` | Validation only: runs every build check (data, firmware manifests, tokens/includes/directives, links) and **writes nothing**. Fast pre-commit check; used by the git hook. |
| `npm run create -- "Name" "Brief" [flags]` | Scaffolds a new project: copies `project-template.html` to `html/proj/{id}.html` and registers the project in `data/projects.json`. Flags: `--tags a,b`, `--featured`, `--status <value>` (D10 enum), `--repo <url>`, `--dry-run` (validate only). |
| `npm run page -- "Title" [--nav\|--footer]` | Scaffolds a minimal secondary page from the D21 template (shared head with CSP/`{{name}}` title/description, header, `h1`, one prose section, footer) at `html/{slug}.html`; refuses to overwrite; optionally appends a nav entry to `data/nav.json` / `data/footer-nav.json`. |
| `npm run firmware -- <suite> --chip <family> [--chip …]` | Creates `assets/firmware/<suite>/manifest.json` with a `builds` entry per `--chip` and prints the `<esp-web-install-button>` snippet. Supported chips: ESP32, ESP32-S2, ESP32-S3, ESP32-C3 (see Firmware section for offsets). |
| `npm run dev` | Build once, serve `dist/`, then rebuild automatically on changes in `wwwroot/` and `scripts/` (debounced `fs.watch`). Live reload via Server-Sent Events: the dev server injects a same-origin `<script src="/__reload.js">` into served HTML and broadcasts a reload after each successful build — never written into `dist/`, and the CSP (`'self'`) still holds. Build errors print to the terminal; the server keeps running so a fix triggers the next rebuild. |
| `npm test` | Runs the unit tests (`node --test scripts/`): `esc`, `slugify`, `safeExternalUrl`, `formatDate`, `renderNav` (`aria-current`), sitemap rendering and the link check. |
| `npm run serve` | Serves `dist/` at `http://localhost:8000/` (`PORT` env var overrides) with `Cache-Control: no-store`; redirects directory requests to add the trailing slash. |
| `npm start` | Build, then serve. |
| `npm run clean` | Removes `dist/`. |
| `npm run setup` | Activates the versioned git hooks: sets `core.hooksPath` to `.githooks` (the `pre-commit` hook runs `npm run check`). Run once after cloning. |

The build copies `wwwroot/` to `dist/` except `partials/`, `data/`, `html/proj/project-template.html` and `assets/firmware/dummy/` (the template's example suite is not a real product, so it is not deployed). HTML files and `robots.txt` are processed in this order: `@raw` blocks are set aside, then includes, tokens and directives run, then local asset URLs are cache-busted and finally the `@raw` blocks are put back unchanged. The output is fully static: no `fetch()` and no runtime content loading. Deploy the contents of `dist/`.

The build also generates `dist/sitemap.xml` from every built page (excluding `404.html`; `index.html` becomes the root URL, project pages carry a `lastmod` from their `date`) and fills the `Sitemap:` line in `dist/robots.txt`. Both use the canonical `url` in `data/site.json`. Keep `data/site.json`'s `url` current when the site moves domains.

### Deployment

The site is hosted on an Apache webserver at `dm7wb.de` (Cloudflare is DNS only, D18) and deployed by uploading the **contents** of `dist/` via SFTP to the web root. There is no CI and no scripted upload — this is a manual step.

1. Run `npm run build` (or `npm start`). The output is fully static and self-contained in `dist/`.
2. Upload the **contents** of `dist/` (not the `dist/` folder itself) to the web root of `dm7wb.de`, overwriting existing files.
3. SFTP clients often hide dotfiles — make sure `.htaccess` is uploaded too (it carries the caching and security headers, see [Supporting Files](#supporting-files)).
4. Delete files on the server that no longer exist in `dist/` (e.g. removed pages or renamed assets), so stale content is not served.
5. No Cloudflare cache purge is needed (D18: DNS only, no proxy).

The `.htaccess` rules apply only on Apache; `npm run serve` ignores them, so always verify the production headers after a deploy.

### Caching and Cache Busting

The build appends a `?v=<hash>` query string to URLs of local cacheable assets (`.css`, `.js`, images, `favicon.svg`): `<link rel="stylesheet" href="css/base.css?v=c6e1b42a">`. `<hash>` is the first 8 hex characters of the SHA-256 of the file's **content** (computed with `node:crypto`), so it changes automatically whenever the file changes — no counters or stored state, and the build stays deterministic. This makes it safe to serve versioned assets with a long `Cache-Control` in `wwwroot/.htaccess`, while HTML, firmware manifests and `.bin` files stay unversioned and are revalidated there too.

- Our own ES modules (`js/main.js` → `./nav.js?v=…`) and CSS `url(…)` references are versioned too, on output only. `js/vendor/` internals are left untouched (their chunk file names already carry hashes); only `install-button.js` gets `?v=` from the HTML.
- The link check strips the `?v=` suffix before resolving, so broken links still fail the build.
- A build pass is deterministic: running twice yields identical hashes, and touching one file only changes the hashes of that file and of the files that reference it.
- Never hard-code a `?v=` suffix in `wwwroot/` sources; it is added at build time only.

### Build-time Templating

Content is never hard-coded where it can be generated. Source pages use these constructs:

| Construct | Result |
| --- | --- |
| `<!-- @include head -->` / `<!-- @include header -->` / `<!-- @include footer -->` | Inserts `partials/head.html` / `partials/header.html` / `partials/footer.html` (any file in `partials/` works by its name). |
| `{{csp}}` | Content Security Policy for the page. Pages containing `<esp-web-install-button>` automatically get `style-src 'self' 'unsafe-inline'` added. Used in `partials/head.html`. |
| `{{lang}}` | Page language code from `data/site.json` (`lang`), used in `<html lang="{{lang}}">`. |
| `{{name}}`, `{{year}}`, `{{footerNote}}`, `{{email}}` | Values from `data/site.json`. |
| `{{url}}`, `{{sitemapUrl}}` | Canonical base URL and `https://…/sitemap.xml` from `data/site.json` (`url`). Used by `robots.txt`. |
| `{{root}}` | Relative path to the web root (`""` for root pages, `"../"` for pages in `html/`). |
| `<!-- @nav -->` | Nav list built from `data/nav.json`; sets `aria-current="page"` on the entry whose `href` is the current page. Used in `partials/header.html`. |
| `<!-- @footer-nav -->` | Footer nav list built from `data/footer-nav.json`; same `aria-current="page"` handling as `@nav`. Used in `partials/footer.html`. |
| `{{projectTitle}}`, `{{projectSummary}}` | Title/summary of the project whose `id` equals the page filename (`html/proj/{id}.html`). |
| `<!-- @project-header -->` | Project page header (h1, summary, status/date, tags, links) from `data/projects.json`. |
| `<!-- @projects all\|featured level=2\|3 id=list-id -->` | Pre-rendered project card grid, newest first. |
| `<!-- @tag-filter list-id -->` | Tag filter buttons and status line for the list with that `id` (hidden until `js/projects.js` runs). |
| `<!-- @raw -->` … `<!-- @endraw -->` | Everything in between is output verbatim: no includes, tokens or directives. Use it for code samples that show `{{…}}` or `<!-- @… -->`. The markers are removed; HTML-escape the content yourself (e.g. `&lt;` inside `<pre><code>`). Unmatched markers fail the build. |

All inserted values are HTML-escaped. Use `{{name}}` (not a hard-coded name) in every `<title>` and `meta[name="description"]`. Source files in `wwwroot/` are templates and are not meant to be opened directly in a browser; open the built files in `dist/`.

The build validates `data/projects.json` (required fields, unique lowercase ids, `YYYY-MM` dates, existing image and `html/proj/{id}.html` page) and checks every internal link in the output: `href`, `src`, `manifest` (firmware flasher), `poster` and all candidates of `srcset`.

### Shared Head, Header and Footer

The common `<head>` content (charset, viewport, CSP, colour scheme, favicon, stylesheets, `js/main.js`) lives in `wwwroot/partials/head.html`. Every page keeps only its page-specific head entries:

```html
<head>
  <!-- @include head -->
  <meta name="description" content="… {{name}} …">
  <title>… — {{name}}</title>
</head>
```

The header (skip link, brand, nav) and footer live once in `wwwroot/partials/`. Edit them there; every page picks them up on the next build. The nav toggle starts `hidden` so that without JavaScript the nav is always visible. Required header structure (used by `css/layout.css` and `js/nav.js`):

```html
<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-brand" href="…">…</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menü</button>
    <nav class="site-nav" id="site-nav" aria-label="Hauptnavigation">…</nav>
  </div>
</header>
```

The footer mirrors the header: a `site-footer__nav` element (fed by `@footer-nav`) next to the copyright info:

```html
<footer class="site-footer">
  <div class="container site-footer__inner">
    <nav class="site-footer__nav" aria-label="Fußbereich">…</nav>
    <div class="site-footer__info">…</div>
  </div>
</footer>
```

### Navigation (`data/nav.json`)

The navbar is generated from `data/nav.json`, an ordered array; the footer nav comes from `data/footer-nav.json` via `<!-- @footer-nav -->` (see `partials/footer.html`). Add, remove or reorder entries in either file to control which pages appear.

```json
[
  { "label": "Home", "href": "index.html" },
  { "label": "Projects", "href": "html/projects.html" }
]
```

`href` is relative to the web root (the build prefixes `../` where needed) or an absolute `http(s)` URL (rendered with `rel="noopener noreferrer"`). Internal targets must exist or the build fails on the broken link. Both `nav.json` and `footer-nav.json` use the same schema.

### Site Config (`data/site.json`)

Shared site info lives in `data/site.json` — the single source of truth, applied at build time.

| Field | Used for |
| --- | --- |
| `lang` | Page language code (used by `<html lang="{{lang}}">` and `formatDate`). |
| `name` | Header brand, `{{name}}` in titles/descriptions/intro, footer copyright. |
| `copyrightYear` | Footer copyright line (optional; defaults to the build year). |
| `footerNote` | Footer note. |
| `email` | Contact `mailto:` link on the About page. |

### Script Hooks

`js/main.js` initialises modules based on data attributes in the page (emitted by the build):

| Attribute | Effect |
| --- | --- |
| `data-tag-filter="<list-id>"` | Filter host for the list with that `id`; `js/projects.js` reveals it and toggles cards via their `data-tags`. |
| `data-filter-status="<list-id>"` | Live status text with the result count. |
| `data-count-singular` / `data-count-plural` / `data-with-tag` / `data-lang` | German count words and the "mit Tag" connector, rendered from `data/strings.json` so `js/projects.js` never hard-codes labels. |

### Project Write-up Template

[`wwwroot/html/proj/project-template.html`](wwwroot/html/proj/project-template.html) is the master template for writing about a project. It is a reference page that is not built into `dist/`; it demonstrates every supported layout pattern with placeholder body content. Its header, title and description are generated from `data/projects.json` like any project page.

- To write a new project page, add the project to `data/projects.json`, copy the template to `html/proj/{id}.html`, keep the includes and `@project-header`, and replace the placeholder body content.
- Each numbered section shows one layout pattern: pure text, text with a small image, full-width image, text/image side by side, image gallery, callout, code block, lists, and table.
- The styles for all patterns live in `css/components.css` (base) and `css/responsive.css` (breakpoints at 640px and 960px). Do not add inline styles.
- To add a NEW layout pattern, append a new numbered section to the template, add its styles to `css/components.css` (and `css/responsive.css` if it needs breakpoints), and note it here.
- Placeholder images for different aspect ratios live in `assets/img/` (`placeholder.svg` wide, `placeholder-square.svg`, `placeholder-portrait.svg`).
- Project cards link to a static page per project at `html/proj/{id}.html` (e.g. `html/proj/placeholder-project-one.html`). When adding a project to `data/projects.json`, create its page from this template and name it after the project `id`.

### Scaffolding a New Project (`npm run create`)

`npm run create` scaffolds a new project from the master template so you do not have to copy files and hand-edit JSON. It takes two arguments: the project **name** and a one-sentence **brief** (used as the `summary`).

```sh
npm run create -- "My Project" "One-sentence description of the project."
```

The command:

- Derives a lowercase, hyphenated `id` from the name (e.g. `My Project` → `my-project`) and refuses to run if that `id` already exists in `data/projects.json` or as a page in `html/proj/`.
- Copies `html/proj/project-template.html` to `html/proj/{id}.html` (without the master-template instruction comment).
- Appends an entry to `data/projects.json` with the required schema: `id`, `title` (the name), `summary` (the brief), empty `tags`, `status: "in Arbeit"`, `date` (current `YYYY-MM`), `links` (`repo`/`demo` both `null`), the placeholder image, and `featured: false`.

After scaffolding, replace the placeholder body on the new page and set `tags`, `links` and `image` in `data/projects.json`, then run `npm run build`.

### Scaffolding a Secondary Page (`npm run page`)

`npm run page -- "Title"` creates a minimal page for secondary content (D21) so you do not have to copy an existing page by hand.

```sh
npm run page -- "Petikette" --nav
```

The command:

- Derives a lowercase, hyphenated `slug` from the title (`ü`/`ä`/`ö`/`ß` are transliterated, e.g. `Über mich` → `ueber-mich`) and refuses to overwrite an existing `html/{slug}.html`.
- Writes a minimal template: shared `<!-- @include head -->` (CSP, title and `meta description` with `{{name}}`, stylesheets, `main.js`), `<!-- @include header -->`, an `h1`, one `prose` section, `<!-- @include footer -->`.
- With `--nav` / `--footer` it appends an entry `{ "label": "<Title>", "href": "html/{slug}.html" }` to `data/nav.json` / `data/footer-nav.json` (skips duplicates). `--description "…"` overrides the placeholder `meta description`.

After scaffolding, replace the placeholder body text and add the page to the README outline, then run `npm run build`.

### Firmware / Web Flasher

Some projects ship firmware that visitors can flash to an ESP32 directly from the browser over USB-serial. This uses [ESP Web Tools](https://esphome.github.io/esp-web-tools/) (vendored locally — no CDN, no external requests).

- The library lives in `js/vendor/esp-web-tools/` (all modules of the `dist/web/` build, kept as-is so relative imports resolve). Reference it with `<script type="module" src="{{root}}js/vendor/esp-web-tools/install-button.js"></script>`.
- Firmware suites live in `assets/firmware/<suite>/` (copied to `dist/` like any other asset). Each suite is a folder holding its own `manifest.json` and the binaries it references, e.g. `assets/firmware/nixie-clock/{bootloader.bin, partitions.bin, firmware.bin, manifest.json}`. Different projects or variants live in separate folders, so each can use the same file names without collisions.
- Each `manifest.json` references the binaries in its own folder (paths are relative to the manifest). For a plain app image (typical Arduino/PlatformIO build) flash **all three** parts per chip with the correct offsets: partitions at `0x8000` and the app at `0x10000` for every family; the bootloader offset depends on the chip — `0x1000` for ESP32 and ESP32-S2, `0x0` for ESP32-S3 and ESP32-C3. Flashing a plain app at offset `0` overwrites the bootloader and partition table ("invalid header" boot-loop). If you instead use a combined/factory image, offset `0` is correct. The binaries are committed in git per suite in `assets/firmware/<suite>/`; they are not provided separately, so a checkout always contains everything the build and deployment need. The build validates every manifest: it must parse as JSON, `builds[].parts[].path` must point to a real file next to the manifest, every `offset` must be an integer, and offsets of known files (`bootloader.bin`/`partitions.bin`/`firmware.bin`) are checked against the `chipFamily` (a mismatch warns).
- Scaffold a suite with `npm run firmware -- <suite> --chip ESP32` (repeat `--chip ESP32-S3` etc. for several builds in one manifest). Each build expects its binaries under `<chip>/` (e.g. `esp32s3/bootloader.bin`). The command prints the button snippet for the project page.
- To flash, add one `<esp-web-install-button manifest="{{root}}assets/firmware/<suite>/manifest.json"></esp-web-install-button>` per firmware variant — you can add several buttons on one page, each targeting a different manifest. See section 10 ("Firmware / web flasher") in `project-template.html` for a working example with two buttons. Include the vendored script before `</body>`.
- The page CSP must allow the component's injected styles (`style-src 'self' 'unsafe-inline'`). The build adds this automatically via `{{csp}}` on every page that contains `<esp-web-install-button>`; other pages keep the strict policy. The flasher needs a secure context (HTTPS or `localhost`) for the WebSerial API — serving over a LAN IP like `http://192.168.x.x` will not expose WebSerial.
- On **Linux**, Chrome/Chromium hides the Web Serial API by default; launch with `google-chrome --enable-features=WebSerialPorts` (fully quit Chrome first, or the flag is ignored). On macOS/Windows WebSerial works out of the box in current Chrome/Edge.

### Placeholders

Name, copyright, footer note and email come from `data/site.json`. Still to replace with real content: the intro on `index.html`, the text on `html/about.html`, the three `placeholder-project-*` entries in `data/projects.json` and their page bodies.

### Supporting Files

| File | Purpose |
| --- | --- |
| `.editorconfig` | UTF-8, LF line endings, 2-space indent for HTML/CSS/JS/JSON, trim trailing whitespace. |
| `.gitignore` | Ignore `.DS_Store`, `Thumbs.db`, editor folders (`.vscode/`, `.idea/`), `node_modules/`, `dist/`. `.vscode/` is ignored except the shared `tasks.json`, `extensions.json` and `launch.json`. |
| `package.json` | npm scripts only; no dependencies. |
| `wwwroot/robots.txt` | Crawler rules; the `Sitemap:` line is filled from `data/site.json` at build time. |
| `dist/sitemap.xml` | Generated by the build from all built pages (excludes `404.html`); not a source file. |
| `wwwroot/favicon.svg` | Logo favicon (simplified SVG trace); also used as the header brand icon. |
| `wwwroot/404.html` | Minimal not-found page using the shared stylesheet. |
| `wwwroot/.htaccess` | Apache config for production on `dm7wb.de` (confirmed live 2026-10-23): `ErrorDocument` for 404/403, `Options -Indexes`, `DirectoryIndex`, `AddDefaultCharset UTF-8`, caching headers (HTML/firmware revalidate, versioned CSS/JS/images cache for a year — see [Caching and Cache Busting](#caching-and-cache-busting)) and security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy` with `frame-ancestors 'none'`, `Permissions-Policy` disabling camera/mic/geolocation but keeping `serial`, and `Strict-Transport-Security` with a short `max-age`). The flasher page (`nixie-clock.html`) gets the `style-src 'self' 'unsafe-inline'` CSP exception via a `<Files>` block. Applies **only** on Apache — it is copied to `dist/` but ignored by `npm run serve`. |

### Data Model (`data/projects.json`)

```json
{
  "id": "example-project",
  "title": "Example Project",
  "summary": "One-sentence description.",
  "tags": ["javascript", "tool"],
  "status": "fertig",
  "date": "2026-01",
  "links": { "repo": "https://example.com/repo", "demo": null },
  "image": "assets/img/example.webp",
  "featured": false
}
```

Field validation (enforced by the build, failures abort `npm run build`):

- `title` and `summary` are non-empty strings.
- `status` is one of: `in Arbeit`, `fertig`, `pausiert`, `veraltet`, `Konzept`, `abgebrochen`. Values contain spaces and capitals, so slugify before using one as a CSS hook.
- `featured` is a boolean.
- `draft` (optional) is a boolean when present. Draft projects keep their page built and their `html/proj/{id}.html` link working, but are excluded from project lists, the tag filter and `sitemap.xml` — useful for projects that are not ready to be shown yet.
- `links` is an object; `repo` and `demo` are `null` or a valid http(s) URL (anything else fails the build).
- `tags` are lowercase and hyphenated (same rule as `id`) and must not repeat within a project.
- `image` is a relative path that resolves inside `wwwroot/`; `../` segments and absolute paths are rejected.

Adding a project means adding an entry to this file and creating `html/proj/{id}.html` from the project template. Cards, filter, page title and page header are generated by the build. The project header's **Source** button (from `links.repo`) renders with the Github mark (`assets/icons/GitHub_Invertocat_White.svg`) as a leading badge; the **Demo** button (from `links.demo`) stays a plain text button. Omit the link to hide its button.

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
- ~~[x] `html/project.html`: detail template (driven by `?id=` query parameter)~~ — obsolete; replaced by static `html/proj/{id}.html` pages
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
- [x] Web flasher for ESP32 firmware (vendored ESP Web Tools, `assets/firmware/<suite>/manifest.json`, `nixie-clock.html`)

### Phase 3b — npm Build
- [x] `package.json` (no dependencies) with `build`, `clean`, `serve`, `start` scripts
- [x] `scripts/build.mjs`: wwwroot/ → dist/, includes, tokens, directives, data validation, link check
- [x] `scripts/serve.mjs`: local preview of `dist/`
- [x] Navbar generated from `data/nav.json` (`@nav` directive)
- [x] Footer nav generated from `data/footer-nav.json` (`@footer-nav` directive)
- [x] Shared header/footer as partials; site.json content generated at build time
- [x] Project lists, project headers and tag filter pre-rendered; runtime `fetch` removed
- [x] `npm run create`: scaffold a new project page from the template and register it in `projects.json`
- [x] Build logic split into `scripts/lib/` modules; `build.mjs` is a thin CLI
- [x] `@raw` … `@endraw` escape block for literal `{{…}}` / `<!-- @… -->` in code samples
- [x] Shared `<head>` partial with `{{csp}}` (flasher pages get the inline-style exception automatically)

### Phase 4 — Quality
- [ ] Test layout at 320px, 768px, 1280px widths
- [ ] Keyboard navigation and focus styles verified
- [ ] Validate HTML (W3C validator) and CSS
- [ ] Lighthouse check: accessibility and performance ≥ 95
- [ ] Verify no cookies are set and no third-party requests are made

### Phase 5 — Release
- [x] Choose hosting (done: Apache at `dm7wb.de`, manual SFTP upload — see [Deployment](#deployment))
- [x] Add `sitemap.xml` (done: generated by the build)
- [ ] Add meta descriptions / Open Graph tags
- [x] Write a short deployment note in this README (deploy the contents of `dist/`)

## Decisions

All previously open decisions are resolved and recorded in `todo.md` (D1–D26):

- **Hosting**: Apache at `dm7wb.de`, manual SFTP upload of `dist/` (D7, D18) — see [Deployment](#deployment).
- **Language**: German content and UI (D1).
- **Dark mode**: follow the system preference, no toggle (D26).
