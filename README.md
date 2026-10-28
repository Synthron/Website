# Personal Project Website

A minimal, responsive, personal project website built with pure HTML, CSS and JavaScript. No frameworks, no runtime dependencies, no cookies. A small Node.js build script (`npm run build`) compiles the sources in `wwwroot/` into static pages in `dist/`. The site is multi-language (German as the default language, English in progress); see [Languages](#languages).

## Core Directives

1. **Pure stack**: the built site uses HTML5, CSS3 and vanilla JavaScript (ES2020+) only; no frameworks or libraries in the browser. Tooling is npm: packages may be installed and used for the build and tooling (declared in `package.json`). The output in `dist/` stays free of tracking, cookies and external services (see directives 5 and 8).
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
├── language.md            # Multi-language plan, decision record (L1–L32), work log (M-steps) and open user tasks (Phase M20)
├── radio.md               # Ham radio section: decision record (R1–…), open questions and next steps
├── todo.md                # Remaining work and decision record (kept outside the outline, may be deleted)
├── .gitignore             # Ignore OS/editor junk, node_modules/, dist/
├── .gitattributes         # LF line endings for text; binary for .bin/.jpg/.png/.webp
├── .editorconfig          # Indentation and encoding rules
├── .nvmrc                # Pins the local Node.js version to 24 (nvm)
├── .githooks/            # Versioned git hooks (pre-commit runs `npm run check` and `npm run lint`; activate with `npm run setup`)
├── .vscode/              # Shared editor config (tasks.json, launch.json, extensions.json)
├── package.json           # npm scripts and tooling dependencies
├── eslint.config.js       # ESLint flat config (npm run lint:js)
├── .stylelintrc.json      # Stylelint config (npm run lint:css)
├── .htmlvalidate.json     # html-validate config (npm run lint:html)
├── svgo.config.mjs        # SVGO config (npm run images)
├── playwright.config.mjs  # Playwright config (npm run test:e2e)
├── lighthouserc.json      # Lighthouse CI config (npm run lighthouse)
├── scripts/
│   ├── build.mjs          # Build CLI: wwwroot/ -> dist/ (orchestration only)
│   ├── lib/               # Build modules (importable, unit-testable)
│   │   ├── util.mjs       # Paths, error collection, escaping, small helpers
│   │   ├── data.mjs       # Load and validate data/*.json (ajv + file checks)
│   │   ├── render.mjs     # HTML/XML renderers for directives and sitemap
│   │   ├── pipeline.mjs   # @raw, includes, tokens, directives, cache busting (assets/JS/CSS)
│   │   ├── checks.mjs     # Checks on the rendered output (links, anchors, language setup)
│   │   ├── scaffold.mjs   # Shared helpers of create/page/remove (languages, pages.json)
│   │   ├── preview.mjs    # Shared helpers of serve/dev (root redirect, flasher detection)
│   │   └── *.test.mjs     # Unit tests (node --test): util, data, render, pipeline, checks, preview
│   ├── schemas/           # JSON Schemas for data/*.json (site, strings, nav, projects, ham, pages)
│   ├── e2e/               # Playwright specs (*.spec.mjs)
│   │   └── pages.spec.mjs # Every built page: 320/768/1280 px, console, requests, storage, focus
│   ├── create.mjs         # Scaffold a new project page + projects.json entry
│   ├── dev.mjs            # Dev server: build, serve, watch, live reload
│   ├── firmware.mjs       # Scaffold an assets/firmware/<suite>/manifest.json
│   ├── images.mjs         # WebP conversion, OG default image, SVG optimisation
│   ├── page.mjs           # Scaffold a minimal secondary page in every language folder
│   ├── remove.mjs         # Delete a project / ham entry and its pages in all languages (npm run remove:project / remove:afu)
│   ├── report.mjs         # Report dist/ size, largest files, unused assets
│   ├── check-external.mjs # Manual HEAD checks of external links
│   └── serve.mjs          # Local preview server for dist/
├── dist/                  # Build output (generated, git-ignored, deploy this)
└── wwwroot/               # Source (build input)
    ├── index.html         # Common landing page (placeholder "UNDER CONSTRUCTION"; fallback of the root redirect)
    ├── 404.html           # Common not-found page (English)
    ├── .htaccess          # Apache config for dm7wb.de (error page, headers, caching; production only)
    ├── favicon.svg        # Logo favicon (simplified trace; also the header brand icon)
    ├── robots.txt         # Crawler rules
    ├── partials/          # Build-time includes (not copied to dist/)
    │   ├── head.html      # Shared <head> content (charset, CSP, favicon, CSS, main.js)
    │   ├── header.html    # Shared skip link, header, language selector and nav (language pages)
    │   ├── header-common.html  # Skip link, brand and language selector only (common pages)
    │   └── footer.html    # Shared footer (copyright, footer nav)
    ├── templates/         # Source-only templates (not built, not deployed)
    │   └── project-template.html  # Master project write-up template (all layouts)
    ├── de/                # German pages (default language)
    │   ├── index.html     # German home (intro, featured projects)
    │   ├── projects.html  # Project listing page with tag filter
    │   ├── hamradio.html  # Ham radio page list with tag filter (see Ham Radio Pages)
    │   ├── about.html     # About and contact page
    │   ├── impressum.html # Legal: imprint
    │   ├── privacy.html   # Legal: privacy policy
    │   ├── rechtliches.html # Legal: legal notes
    │   ├── ham/           # Ham radio pages (one per data/ham.json entry, named by `id`)
    │   │   └── t2lt-antenna.html  # Placeholder ham page (from the project template)
    │   └── proj/          # Individual project pages (one per project, named by `id`)
    │       ├── sy317.html # Static project page (from template)
    │       ├── nixie-clock.html  # Static project page (from template)
    │       └── placeholder-project-*.html  # Static project pages (from template)
    ├── en/                # English pages (placeholders marked TODO until translated)
    │   ├── index.html, projects.html, hamradio.html, about.html
    │   └── proj/          # Skeletons; hidden while the project data in projects.json is TODO
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
    │   ├── nav.json        # Header navigation entries per language (label + href)
    │   ├── footer-nav.json # Footer navigation entries per language (label + href)
    │   ├── pages.json      # Pages with different file names per language (empty: pair by identical path)
    │   ├── projects.json   # Project entries (single source of truth)
    │   ├── ham.json        # Ham radio page entries (list on hamradio.html)
    │   ├── site.json       # Shared site info (languages, defaultLang, name, copyright, email, footerNote per language)
    │   └── strings.json    # UI strings per language (count labels, buttons, aria, status labels)
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
            ├── GitHub_Invertocat_White.svg  # Github mark (leading icon in the Source button)
            ├── flag-de.svg  # German flag (language selector)
            └── flag-gb.svg  # UK flag (language selector)
```

### Languages

The site is multi-language; the decisions behind it are recorded in [`language.md`](language.md) (L1–L32), including the open tasks for the owner (Phase M20).

- **Configuration** (`data/site.json`): `languages` (`code`, `name`, `locale`, `flag`), `defaultLang` (`de`, also the `x-default` and fallback language) and `footerNote` per language. The code is the folder name below `wwwroot/`.
- **Pages**: `wwwroot/<lang>/…` per language (`de/` is complete, `en/` holds placeholders). Two common pages live at the root: the landing page `index.html` (`lang="de"`, text blocks marked with their own `lang`) and `404.html` (English). Both use `partials/header-common.html` (brand and language selector, no nav). The legal pages exist in German only.
- **Root redirect**: `.htaccess` (and the preview servers) redirect `/` to `/de/` or `/en/` by the first `Accept-Language` entry (`302`, `Vary: Accept-Language`); everything else gets the landing page.
- **Page pairs**: a page pairs with the page of the same path in another language. Pages with different file names per language are listed in `data/pages.json` (`[{ "de": "ueber-mich.html", "en": "about.html" }]`; project groups must contain `"de": "proj/{id}.html"`). The language selector, the `hreflang` alternates and `npm run create:project`/`create:afu`/`page`/`remove` use these pairs; a missing counterpart leads to that language's home.
- **Localized data**: `strings.json`, `nav.json`, `footer-nav.json` hold one block per language; in `projects.json` `title`, `summary` and `tags` are objects per language (tag lists are independent, not translations, from a fixed vocabulary per language in the schema). `status` stays a German key; its label per language is `strings.<lang>.status`.
- **Missing translations**: the default language is required, other languages are optional. A project whose `title`/`summary` is missing or starts with `TODO` in a language (or whose page is missing) is hidden there (lists, filter, sitemap, alternates; its page is not built) and the build warns. Placeholders follow two conventions: `TODO` for project texts, `TODO_<German label>` for labels (navigation, strings, footer note).
- **Translations are written by the owner.** Agents only create structure and clearly marked placeholders unless asked to translate.

#### Add a language

1. `data/site.json`: add the language to `languages` (code, name, `locale` such as `fr_FR`, `flag` path; put the flag SVG into `assets/icons/`) and add `footerNote.<code>`.
2. `data/strings.json`, `data/nav.json`, `data/footer-nav.json`: add a block for the code (copy the default block; `TODO_<label>` until translated). Footer entries that point to pages that only exist in another language get `"lang": "<code>"`.
3. `data/projects.json` and `data/ham.json`: add the code to `title` and `summary` (`"TODO"`) and `tags` (`[]`) of every entry. Add the tag vocabulary for the code to `scripts/schemas/projects.schema.json` and `scripts/schemas/ham.schema.json` (`tags.properties.<code>`).
4. Create `wwwroot/<code>/` with `index.html`, `projects.html`, `about.html` and `proj/{id}.html` (copy the German pages and mark the texts `TODO`, or use the existing `en/` skeletons as a model). `npm run create:project`, `npm run create:afu` and `npm run page` create new pages in the new language automatically.
5. `wwwroot/.htaccess`: add a rewrite rule for the code next to the `de`/`en` rules; the preview servers read the codes from `site.json`.
6. `npm run build` (check the warnings), `npm test`, `npm run test:e2e`; add the new pages to `lighthouserc.json` if wanted.

### Build and Preview

Requires Node.js ≥ 24. Run `npm install` once after cloning and whenever `package.json` changes; it installs the tooling dependencies into `node_modules/` (git-ignored, never deployed).

| Command | Effect |
| --- | --- |
| `npm run build` | Deletes `dist/` and rebuilds it from `wwwroot/`. Exits non-zero on invalid data, unknown tokens/includes or broken internal links. |
| `npm run check` | Validation only: runs every build check (data, firmware manifests, tokens/includes/directives, links) and **writes nothing**. Fast pre-commit check; used by the git hook. |
| `npm run create:project -- "Name" "Brief" [flags]` | Scaffolds a new project: copies `templates/project-template.html` to `<lang>/proj/{id}.html` for every language and registers the project in `data/projects.json` (other languages as `TODO`). Flags: `--tags a,b`, `--featured`, `--status <value>`, `--repo <url>`, `--dry-run` (validate only). |
| `npm run create:afu -- "Name" "Brief" [flags]` | Same for a ham radio page: `<lang>/ham/{id}.html` (back link to `hamradio.html`) and an entry in `data/ham.json`. Flags: `--tags a,b`, `--status <value>` (optional), `--repo <url>` (optional), `--dry-run`. |
| `npm run page -- "Title" [--title-<lang> "…"] [--nav\|--footer]` | Scaffolds a minimal secondary page (shared head with CSP/`{{name}}` title/description, header, `h1`, one prose section, footer) at `<lang>/{slug}.html` for every language; refuses to overwrite; pairs differently named pages in `data/pages.json`; optionally appends nav entries to `data/nav.json` / `data/footer-nav.json`. |
| `npm run remove:project -- <id>` | Deletes a project from `data/projects.json`, its pages in every language folder and its `pages.json` group; asks for confirmation (`--yes` skips the prompt). The image file is left in place. |
| `npm run remove:afu -- <id>` | Same for a ham radio page: entry in `data/ham.json`, `<lang>/ham/{id}.html` pages and `pages.json` group. |
| `npm run report` | Prints a size report of `dist/` (run `npm run build` first): total size, largest files, page sizes (overall and per language), raster images not converted to WebP, unused images. |
| `npm run check:external` | Sends a HEAD request to every external link found in `wwwroot/` (pages, partials, template, `data/*.json`) and reports the status. Manual only — never part of `build` or `check`. |
| `npm run firmware -- <suite> --chip <family> [--chip …]` | Creates `assets/firmware/<suite>/manifest.json` with a `builds` entry per `--chip` and prints the `<esp-web-install-button>` snippet. Supported chips: ESP32, ESP32-S2, ESP32-S3, ESP32-C3 (see Firmware section for offsets). |
| `npm run dev` | Build once, serve `dist/`, then rebuild automatically on changes in `wwwroot/` and `scripts/` (debounced `fs.watch`). Live reload via Server-Sent Events: the dev server injects a same-origin `<script src="/__reload.js">` into served HTML and broadcasts a reload after each successful build — never written into `dist/`, and the CSP (`'self'`) still holds. Build errors print to the terminal; the server keeps running so a fix triggers the next rebuild. Serves on `localhost:8000` (`PORT`/`HOST` overrides apply as with `serve`). |
| `npm test` | Runs the unit tests (`node --test "scripts/**/*.test.mjs"`): helpers, data loaders (fixture trees), renderers (nav, language selector, cards, sitemap, Open Graph), pipeline (page classification, tokens), output checks and the preview helpers. |
| `npm run lint` | Runs `lint:js`, `lint:css` and `lint:html` (stops at the first failing linter). Also run by the pre-commit hook. |
| `npm run lint:js` | ESLint over `wwwroot/js/` (browser) and `scripts/` + root configs (Node). |
| `npm run lint:css` | Stylelint over `wwwroot/css/`. |
| `npm run lint:html` | Builds, then runs html-validate over `dist/**/*.html`. |
| `npm run images [-- --dry-run]` | WebP next to raster originals in `assets/img/` (skipped when not smaller), creates `assets/img/og-default.png` if missing, optimises SVGs in place. Never overwrites existing outputs or originals. |
| `npm run test:e2e` | Builds, then runs the Playwright specs in `scripts/e2e/` against `scripts/serve.mjs` on port 8010: every page at 320/768/1280 px (`pages.spec.mjs`) and the language setup of the built site (`language.spec.mjs`: `<html lang>`, canonical, `og:locale`, hreflang alternates, selector targets and `aria-current`, hidden projects, sitemap, root redirect, keyboard use of the selector). |
| `npm run lighthouse` | Builds, then runs Lighthouse CI against `scripts/serve.mjs` on port 8020; reports go to `.lighthouseci/` (never uploaded). |
| `npm run serve` | Serves `dist/` at `http://localhost:8000/` (`PORT` and `HOST` env vars override) with `Cache-Control: no-store` and the same security headers as production (mirrors `.htaccess`, flasher CSP exception detected from the served page); redirects directory requests to add the trailing slash and mirrors the root redirect (`/` → `/de/` or `/en/` by the first `Accept-Language` entry, `302` + `Vary: Accept-Language`; other languages get the landing page). `HOST=0.0.0.0` works for phone testing on the LAN, but WebSerial needs a secure context, so the web flasher will not work there. |
| `npm start` | Build, then serve. |
| `npm run clean` | Removes `dist/`. |
| `npm run setup` | Activates the versioned git hooks: sets `core.hooksPath` to `.githooks` (the `pre-commit` hook runs `npm run check`, then `npm run lint`). Run once after cloning. |

The build copies `wwwroot/` to `dist/` except `partials/`, `data/`, `templates/` and `assets/firmware/dummy/` (the template's example suite is not a real product, so it is not deployed). HTML files and `robots.txt` are processed in this order: `@raw` blocks are set aside, then includes, tokens and directives run, then local asset URLs are cache-busted and finally the `@raw` blocks are put back unchanged. The output is fully static: no `fetch()` and no runtime content loading. Deploy the contents of `dist/`.

The build also generates `dist/sitemap.xml` from every built page (excluding `404.html`; `index.html` becomes the root URL). Project pages carry a `lastmod` from their `date`; all other pages take it from the last git commit date of their source file — today when the file has uncommitted changes, omitted when git is unavailable or the file is untracked. Pages of projects that are hidden in a language are not built and therefore not listed; the sitemap has no `hreflang` alternates (those are `<link>` tags in the page heads). The build also fills the `Sitemap:` line in `dist/robots.txt`. Both use the canonical `url` in `data/site.json`. Keep `data/site.json`'s `url` current when the site moves domains.

### Tooling Packages

Installed as `devDependencies` (D27); none of them ship to `dist/`. Use these packages for the listed jobs instead of hand-written code for the same purpose.

| Package | Job | Command / config | Runs on |
| --- | --- | --- | --- |
| `eslint`, `@eslint/js`, `globals` | JS lint (`no-var`, `prefer-const`, `eqeqeq`; browser code: no storage APIs, `document.cookie`, `fetch` or `innerHTML`) | `npm run lint:js`, `eslint.config.js` | `wwwroot/js/` (browser globals), `scripts/` and root configs (Node globals); ignores `wwwroot/js/vendor/`, `dist/` |
| `stylelint`, `stylelint-config-standard`, `stylelint-declaration-strict-value` | CSS lint; BEM-light class names, `min-width` prefix media queries; colours only via custom properties outside `css/base.css` | `npm run lint:css`, `.stylelintrc.json` | `wwwroot/css/` |
| `html-validate` | HTML validation and accessibility rules (lowercase `<!doctype html>`) | `npm run lint:html`, `.htmlvalidate.json` | built pages in `dist/` (sources contain `{{tokens}}`) |
| `ajv` | JSON Schema validation of the data files | `scripts/schemas/*.schema.json`, used by `scripts/lib/data.mjs` | `wwwroot/data/*.json` |
| `sharp` | Raster → WebP, OG default image 1200×630 from `favicon.svg` (D25) | `npm run images`, `scripts/images.mjs` | `wwwroot/assets/img/`, `wwwroot/favicon.svg` |
| `svgo` | SVG optimisation | `npm run images`, `svgo.config.mjs` | `wwwroot/assets/img/`, `wwwroot/assets/icons/`, `wwwroot/favicon.svg` |
| `@playwright/test` | Browser checks: 320/768/1280 px (no horizontal overflow), console errors, external requests, cookies/storage, visible keyboard focus | `npm run test:e2e`, `playwright.config.mjs`, `scripts/e2e/*.spec.mjs` | `dist/` via `scripts/serve.mjs` (port 8010) |
| `@lhci/cli` | Lighthouse scores (accessibility and performance ≥ 95) | `npm run lighthouse`, `lighthouserc.json` | `dist/` via `scripts/serve.mjs` (port 8020) |

- Playwright needs a browser once: `npx playwright install chromium`. Alternatively use an installed browser: `$env:PLAYWRIGHT_CHANNEL='msedge'` (or `chrome`) before `npm run test:e2e`. Lighthouse CI uses the installed Chrome (`CHROME_PATH` overrides).
- Lighthouse CI uploads reports to a public server by default (`temporary-public-storage`); `lighthouserc.json` sets `upload.target` to `"filesystem"` — keep it that way.
- Name Playwright files `*.spec.mjs`: `npm test` runs every `*.test.mjs` under `scripts/`.
- Generated reports (`test-results/`, `playwright-report/`, `.lighthouseci/`) are git-ignored.
- `npm run build` and `npm run check` stay fast and offline: only `ajv` runs inside them. Lint runs via `npm run lint` (and the pre-commit hook); Playwright and Lighthouse run on demand.
- `html-validate` and the build's `checkHtmlRules` overlap on purpose: the build check (one `h1`, `<html lang>`, `alt`, no inline scripts or `style` attributes) runs offline in every build and `npm run check`; `html-validate` adds full HTML5 content-model, ARIA and landmark rules on the built pages.
- `data/site.json` and `data/strings.json` reference their schema via `$schema`; the array files (`projects.json`, `pages.json`) and the nav files (`nav.json`, `footer-nav.json`) are mapped via `json.schemas` in `.vscode/settings.json`.
- Add a package with `npm i -D <name>` and list it in this table in the same change. In PowerShell, quote scoped names: `npm i -D '@scope/name'` (a bare `@` starts splatting).

### Open Graph and Canonical Tags

Every built page except `404.html` automatically gets a canonical link and Open Graph tags injected into its `<head>` by the build:

- `canonical`, `og:url`, `og:type="website"`, `og:locale`, `og:site_name`, `og:title` and `og:description` come from `data/site.json` plus the page's own `<title>` and `meta name="description"` (parsed from the rendered page, so they always match). `og:locale` is the `locale` of the page language (`de_DE`, `en_GB`).
- Pages that exist in two or more languages also get `<link rel="alternate" hreflang="…">` for every available version (a project hidden in a language gets none), `hreflang="x-default"` pointing to the root `/`, and `og:locale:alternate` for the other versions.
- `og:image` uses the project's raster image (`.png`/`.jpg`/`.webp`) on project pages; every other page (and projects whose image is an SVG) uses `assets/img/og-default.png`. Create that file once — 1200×630, logo on a plain background: `npm run images` generates it from `favicon.svg` (or make it by hand in GIMP); until it exists the build warns and the image tag is omitted. The image URL is cache-busted like any local asset.
- No page edits needed: the tags are added at build time. Keep `url` in `data/site.json` current (it is the canonical base).

### Deployment

The site is hosted on an Apache webserver at `dm7wb.de` (Cloudflare is DNS only) and deployed by uploading the **contents** of `dist/` via SFTP to the web root. There is no CI and no scripted upload — this is a manual step.

1. Run `npm run build` (or `npm start`). The output is fully static and self-contained in `dist/`.
2. Upload the **contents** of `dist/` (not the `dist/` folder itself) to the web root of `dm7wb.de`, overwriting existing files.
3. SFTP clients often hide dotfiles — make sure `.htaccess` is uploaded too (it carries the caching and security headers, see [Supporting Files](#supporting-files)).
4. Delete files on the server that no longer exist in `dist/` (e.g. removed pages or renamed assets), so stale content is not served. **First upload of the language layout:** delete the old `/html/` folder; its pages moved to `/de/` and there are no redirects from the old URLs (the site was still under construction).
5. No Cloudflare cache purge is needed (DNS only, no proxy).

The `.htaccess` rules apply only on Apache; `npm run serve` ignores them, so always verify the production headers and the HTTPS redirect after a deploy. Verify the language setup too:

- Root redirect: `curl -sI -H "Accept-Language: de" https://dm7wb.de/` → `302` to `/de/`; `en-GB` → `/en/`; `fr` or no header → `200` (landing page). All of them carry `Vary: Accept-Language`.
- `https://dm7wb.de/de/` and `/en/` serve their `index.html`; a missing page deep in a language folder (`/en/does-not-exist`) shows the English `404.html`.
- The flasher page has the `style-src 'self' 'unsafe-inline'` header in every language (`curl -sI https://dm7wb.de/de/proj/nixie-clock.html`).
- `https://dm7wb.de/html/` is gone (404).

### Caching and Cache Busting

The build appends a `?v=<hash>` query string to URLs of local cacheable assets (`.css`, `.js`, images, `favicon.svg`): `<link rel="stylesheet" href="css/base.css?v=c6e1b42a">`. `<hash>` is the first 8 hex characters of the SHA-256 of the file's **content** (computed with `node:crypto`), so it changes automatically whenever the file changes — no counters or stored state, and the build stays deterministic. This makes it safe to serve versioned assets with a long `Cache-Control` in `wwwroot/.htaccess`, while HTML, firmware manifests and `.bin` files stay unversioned and are revalidated there too.

- Our own ES modules (`js/main.js` → `./nav.js?v=…`) and CSS `url(…)` references are versioned too, on output only. `js/vendor/` internals are left untouched (their chunk file names already carry hashes); only `install-button.js` gets `?v=` from the HTML.
- The link check strips the `?v=` suffix before resolving, so broken links still fail the build.
- A build pass is deterministic: running twice yields identical hashes, and touching one file only changes the hashes of that file and of the files that reference it.
- Never hard-code a `?v=` suffix in `wwwroot/` sources; it is added at build time only.

### Language Checks

Beyond the link, anchor and HTML-rule checks, the build verifies the language setup (`scripts/lib/checks.mjs`):

| Check | Result |
| --- | --- |
| `<html lang>` of a language page differs from its language | fail |
| Page of a non-default language without a default-language counterpart | fail |
| Default-language page without a counterpart in another language (project pages are covered by the project data warnings) | warn |
| Project page without project data in its language | warn |
| Link from a language page into another language's folder (the language selector and entries with `hreflang`/`lang` are exempt; common pages are not checked) | warn |
| Link into the removed `html/` folder (old URLs; the pages moved to `<lang>/`) | fail |
| Flasher page (`<esp-web-install-button>`) whose file name is not covered by a `<Files>`/`<FilesMatch>` block with `'unsafe-inline'` in `wwwroot/.htaccess` | warn |

`TODO` placeholders and missing translations in `data/projects.json` are reported when the data is loaded (one warning per project and language).

### Build-time Templating

Content is never hard-coded where it can be generated. Source pages use these constructs:

| Construct | Result |
| --- | --- |
| `<!-- @include head -->` / `<!-- @include header -->` / `<!-- @include header-common -->` / `<!-- @include footer -->` | Inserts `partials/head.html` / `partials/header.html` (language pages) / `partials/header-common.html` (landing page and 404: brand and language selector only) / `partials/footer.html` (any file in `partials/` works by its name). |
| `{{csp}}` | Content Security Policy for the page. Pages containing `<esp-web-install-button>` automatically get `style-src 'self' 'unsafe-inline'` added. Used in `partials/head.html`. |
| `{{lang}}` | Language of the current page: the language folder; on the common root pages the literal `<html lang="…">` of the source (landing page `de`, `404.html` `en`). Other root files such as `robots.txt` use the default language. |
| `{{langRoot}}` | Relative path from the page to its language folder (`""` for pages directly in it, `"../"` one level deeper); equals `{{root}}` on the common root pages. |
| `{{t:key}}` | UI string `key` of the page language from `data/strings.json` (HTML-escaped; unknown or non-text keys fail the build). |
| `{{name}}`, `{{year}}`, `{{email}}` | Values from `data/site.json`. |
| `{{footerNote}}` | `footerNote` of the page language from `data/site.json`. |
| `{{url}}`, `{{sitemapUrl}}` | Canonical base URL and `https://…/sitemap.xml` from `data/site.json` (`url`). Used by `robots.txt`. |
| `{{root}}` | Relative path to the web root (`""` for root pages, `"../"` for pages directly in a language folder). |
| `<!-- @nav -->` | Nav list built from `data/nav.json` for the page language; sets `aria-current="page"` on the entry whose `href` is the current page. Renders nothing on common pages (brand only). Used in `partials/header.html`. |
| `<!-- @footer-nav -->` | Footer nav list built from `data/footer-nav.json` for the page language; same `aria-current="page"` handling as `@nav`. Entries with `lang` pointing to another language get `lang`/`hreflang`. Used in `partials/footer.html`. |
| `<!-- @lang-switch -->` | Language selector: one link per language (flag, code, language name as `aria-label`) to the same page in that language, else to that language's home; `aria-current="true"` on the current language of a language page. Renders nothing with a single configured language. Cards, status labels and the link hint word use the page language. |
| `{{projectTitle}}`, `{{projectSummary}}` | Title/summary (in the page language) of the project whose page this is: `<lang>/proj/{id}.html` or the mapped name from `data/pages.json`. On ham pages (`<lang>/ham/{id}.html`) the same tokens hold the ham entry's title/summary. |
| `<!-- @project-header -->` | Project page header (h1, summary, status/date, tags, links) from `data/projects.json`; on ham pages from `data/ham.json` (status and links only when set). |
| `<!-- @projects all\|featured level=2\|3 id=list-id -->` | Pre-rendered project card grid, newest first. |
| `<!-- @ham-list level=2\|3 id=list-id -->` | Pre-rendered list of the ham pages from `data/ham.json` (title link, date, status if set, summary, tags), newest first; drafts are skipped; `strings.noHamPages` when empty. |
| `<!-- @tag-filter list-id [from=projects\|ham] -->` | Tag filter buttons and status line for the list with that `id`. `from` selects the data (default `projects`); `from=ham` uses the ham tags and the count words `hamCountSingular`/`hamCountPlural`. Hidden until `js/projects.js` runs. |
| `<!-- @raw -->` … `<!-- @endraw -->` | Everything in between is output verbatim: no includes, tokens or directives. Use it for code samples that show `{{…}}` or `<!-- @… -->`. The markers are removed; HTML-escape the content yourself (e.g. `&lt;` inside `<pre><code>`). Unmatched markers fail the build. |

All inserted values are HTML-escaped. Use `{{name}}` (not a hard-coded name) in every `<title>` and `meta[name="description"]`. Source files in `wwwroot/` are templates and are not meant to be opened directly in a browser; open the built files in `dist/`.

The build validates every data file (schemas in `scripts/schemas/`, cross-checks in `scripts/lib/data.mjs`: language keys, status labels, unique ids, image and page files per language, `pages.json` groups) and checks every internal link in the output: `href`, `src`, `manifest` (firmware flasher), `poster` and all candidates of `srcset`.

### Shared Head, Header and Footer

The common `<head>` content (charset, viewport, CSP, colour scheme, favicon, stylesheets, `js/main.js`) lives in `wwwroot/partials/head.html`. Every page keeps only its page-specific head entries:

```html
<head>
  <!-- @include head -->
  <meta name="description" content="… {{name}} …">
  <title>… — {{name}}</title>
</head>
```

The header (skip link, brand, language selector, nav) and footer live once in `wwwroot/partials/`; the landing page and `404.html` use the smaller `header-common.html` (skip link, brand, selector). Edit them there; every page picks them up on the next build. All texts come from `data/strings.json` via `{{t:key}}`. The nav toggle starts `hidden` so that without JavaScript the nav is always visible. The language selector sits next to the toggle, outside the collapsible nav. Required header structure (used by `css/layout.css` and `js/nav.js`):

```html
<header class="site-header">
  <div class="container site-header__inner">
    <a class="site-brand" href="{{langRoot}}index.html">…</a>
    <!-- @lang-switch -->
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>{{t:menu}}</button>
    <nav class="site-nav" id="site-nav" aria-label="{{t:mainNavLabel}}">…</nav>
  </div>
</header>
```

The footer mirrors the header: a `site-footer__nav` element (fed by `@footer-nav`) next to the copyright info:

```html
<footer class="site-footer">
  <div class="container site-footer__inner">
    <nav class="site-footer__nav" aria-label="{{t:footerNavLabel}}">…</nav>
    <div class="site-footer__info">…</div>
  </div>
</footer>
```

### Navigation (`data/nav.json`)

The navbar is generated from `data/nav.json`, an object with one ordered array per language; the footer nav comes from `data/footer-nav.json` (same shape) via `<!-- @footer-nav -->` (see `partials/footer.html`). Add, remove or reorder entries in either file to control which pages appear.

```json
{
  "de": [
    { "label": "Start", "href": "index.html" },
    { "label": "Projekte", "href": "projects.html" }
  ],
  "en": [
    { "label": "Home", "href": "index.html" },
    { "label": "Projects", "href": "projects.html" },
    { "label": "Imprint (German)", "href": "impressum.html", "lang": "de" }
  ]
}
```

`href` is relative to the language folder (the build prefixes `<lang>/` and `../` where needed) or an absolute `http(s)` URL (rendered with `rel="noopener noreferrer"`). An optional `lang` points to a page in another language (e.g. English footer → German legal pages) and adds `lang`/`hreflang` to the link. Internal targets must exist or the build fails on the broken link. Both files use the same schema; every configured language needs an array.

### Site Config (`data/site.json`)

Shared site info lives in `data/site.json` — the single source of truth, applied at build time.

| Field | Used for |
| --- | --- |
| `languages` | Configured languages: `code` (folder name), `name` (in that language, selector label), `locale` (Open Graph, e.g. `en_GB`), `flag` (SVG path inside `wwwroot/`). |
| `defaultLang` | Fallback and `x-default` language; must be a configured code. |
| `name` | Header brand, `{{name}}` in titles/descriptions/intro, footer copyright. |
| `url` | Canonical base URL (sitemap, canonical and Open Graph URLs). |
| `copyrightYear` | Footer copyright line (optional; defaults to the build year). |
| `footerNote` | Footer note, one text per configured language. |
| `email` | Contact `mailto:` link on the About page. |

### Script Hooks

`js/main.js` initialises modules based on data attributes in the page (emitted by the build):

| Attribute | Effect |
| --- | --- |
| `data-tag-filter="<list-id>"` | Filter host for the list with that `id`; `js/projects.js` reveals it and toggles the cards (or ham list items) via their `data-tags`. |
| `data-filter-status="<list-id>"` | Live status text with the result count. |
| `data-count-singular` / `data-count-plural` / `data-with-tag` / `data-quote-open` / `data-quote-close` / `data-lang` | Count words, the "mit Tag" connector and the quote marks of the page language, rendered from `data/strings.json` so `js/projects.js` never hard-codes labels. |

### Project Write-up Template

[`wwwroot/templates/project-template.html`](wwwroot/templates/project-template.html) is the master template for writing about a project. It is a reference page that is not built into `dist/`; it demonstrates every supported layout pattern with placeholder body content. Its header, title and description are generated from `data/projects.json` like any project page.

- To write a new project page, run `npm run create:project` (it adds the project to `data/projects.json` and copies the template to `<lang>/proj/{id}.html` for every language; `npm run create:afu` does the same for ham pages), keep the includes and `@project-header`, and replace the placeholder body content.
- Each numbered section shows one layout pattern: pure text, text with a small image, full-width image, text/image side by side, image gallery, callout, code block, lists, and table.
- The styles for all patterns live in `css/components.css` (base) and `css/responsive.css` (breakpoints at 640px and 960px). Do not add inline styles.
- To add a NEW layout pattern, append a new numbered section to the template, add its styles to `css/components.css` (and `css/responsive.css` if it needs breakpoints), and note it here.
- Placeholder images for different aspect ratios live in `assets/img/` (`placeholder.svg` wide, `placeholder-square.svg`, `placeholder-portrait.svg`).
- Project cards link to a static page per project at `<lang>/proj/{id}.html` (e.g. `de/proj/sy317.html`; other languages may use a mapped name from `data/pages.json`). The template is never built; `npm run create:project` / `create:afu` copy it.

### Scaffolding a New Project or Ham Page (`npm run create:project`, `npm run create:afu`)

`npm run create:project` scaffolds a new project, `npm run create:afu` a new ham radio page, both from the master template so you do not have to copy files and hand-edit JSON. Both take two arguments: the **name** and a one-sentence **brief** (used as the `summary`).

```sh
npm run create:project -- "My Project" "One-sentence description of the project."
npm run create:afu -- "T2LT Antenne" "One-sentence description." --tags antenne
```

The command:

- Derives a lowercase, hyphenated `id` from the name (e.g. `My Project` → `my-project`) and refuses to run if that `id` already exists in the data file or as a page in any `<lang>/proj/` (`<lang>/ham/`) folder (mapped names from `data/pages.json` included). Unknown flags fail.
- Copies `templates/project-template.html` to `<lang>/proj/{id}.html` (`<lang>/ham/{id}.html`) for **every** configured language (without the master-template instruction comment; ham pages get the back link to `hamradio.html`).
- `create:project` appends an entry to `data/projects.json` with the required schema: `id`, `title` and `summary` per language (the default language gets the name/brief, every other language `"TODO"`), `tags` per language (the default language gets `--tags`, others start empty), `status` (`--status`, default `"in Arbeit"`), `date` (current `YYYY-MM`), `links` (`repo` from `--repo`, else `null`; `demo` `null`), the placeholder image, and `featured` (`--featured`). The project stays hidden in a language until its `TODO` texts are replaced.
- `create:afu` appends the slim entry to `data/ham.json`: `id`, `title`, `summary`, `tags`, `date`; `status` and `links` only when `--status` / `--repo` are given. `--featured` is rejected.
- `--dry-run` validates and prints the entry without writing anything.

After scaffolding, replace the placeholder body on the new pages and set `tags` (projects also `links` and `image`) in the data file, then run `npm run build`.

### Scaffolding a Secondary Page (`npm run page`)

`npm run page -- "Title"` creates a minimal page for secondary content so you do not have to copy an existing page by hand.

```sh
npm run page -- "Petikette" --nav
```

The command:

- Derives a lowercase, hyphenated `slug` from the title (`ü`/`ä`/`ö`/`ß` are transliterated, e.g. `Über mich` → `ueber-mich`) and refuses to overwrite an existing `<lang>/{slug}.html`.
- Creates the page in **every** language folder. Other languages get `TODO_<title>` titles and a `TODO` text unless `--title-<lang> "…"` is given; then that language's file name follows its title and the differing names are paired in `data/pages.json`.
- Writes a minimal template: shared `<!-- @include head -->` (CSP, title and `meta description` with `{{name}}`, stylesheets, `main.js`), `<!-- @include header -->`, an `h1`, one `prose` section, `<!-- @include footer -->`.
- With `--nav` / `--footer` it appends `{ "label": "<Title>", "href": "{slug}.html" }` to the matching language array of `data/nav.json` / `data/footer-nav.json` (skips duplicates). `--description "…"` overrides the placeholder `meta description` of the default language.

After scaffolding, replace the placeholder body text and add the page to the README outline, then run `npm run build`.

### Removing a Project or Ham Page (`npm run remove:project` / `remove:afu`)

`npm run remove:project -- <id>` removes a project you no longer want to publish; `npm run remove:afu -- <id>` does the same for a ham radio page (`data/ham.json`, `<lang>/ham/`):

- Validates `<id>` (lowercase, hyphenated) and looks it up in `data/projects.json` (or `data/ham.json`); if the id belongs to the other collection, the error names the right script.
- Asks for a confirmation prompt (listing the files) and deletes the entry plus its page in every language folder (`<lang>/proj/{id}.html` / `<lang>/ham/{id}.html` or the mapped name) and its group in `data/pages.json`; pass `--yes` to skip the prompt.
- The project's image file is left in place — images can be shared between projects. Delete it manually if nothing references it anymore (`npm run report` lists unused images).
- Run `npm run build` afterwards and remove the now-stale files from the server on the next deploy.

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

Name, copyright and email come from `data/site.json`. Still to replace with real content: the landing page `index.html` ("UNDER CONSTRUCTION"), the intro on `de/index.html`, the text on `de/about.html`, the three `placeholder-project-*` entries in `data/projects.json` and their page bodies, and every `TODO` / `TODO_…` placeholder of the English version (see the open tasks in `language.md`, Phase M20).

### Supporting Files

| File | Purpose |
| --- | --- |
| `.editorconfig` | UTF-8, LF line endings, 2-space indent for HTML/CSS/JS/JSON, trim trailing whitespace. |
| `.gitignore` | Ignore `.DS_Store`, `Thumbs.db`, editor folders (`.vscode/`, `.idea/`), `node_modules/`, `dist/`, test and Lighthouse reports. `.vscode/` is ignored except the shared `tasks.json`, `extensions.json` and `launch.json`. |
| `package.json` | npm scripts and tooling dependencies (preferably `devDependencies`); none of them ship to `dist/`. |
| `wwwroot/robots.txt` | Crawler rules; the `Sitemap:` line is filled from `data/site.json` at build time. |
| `dist/sitemap.xml` | Generated by the build from all built pages (excludes `404.html`); not a source file. |
| `wwwroot/favicon.svg` | Logo favicon (simplified SVG trace); also used as the header brand icon. |
| `wwwroot/404.html` | Common not-found page (English, root-relative links) using the shared stylesheet and `header-common.html`. |
| `wwwroot/.htaccess` | Apache config for production on `dm7wb.de` (confirmed live 2026-10-23): `ErrorDocument` for 404 and 403 (both serve `404.html` for now — a separate 403 page can be added later), an HTTPS redirect via mod_rewrite (safe because Cloudflare is DNS only — a proxied "Flexible" SSL mode would loop), a `302` redirect for the path `/` only by the first `Accept-Language` entry (`de` → `/de/`, `en` → `/en/`; everything else gets the landing page; `Vary: Accept-Language` on the response), `Options -Indexes`, `DirectoryIndex`, `AddDefaultCharset UTF-8`, caching headers (HTML/firmware revalidate, versioned CSS/JS/images cache for a year — see [Caching and Cache Busting](#caching-and-cache-busting)) and security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy` with `frame-ancestors 'none'`, `Permissions-Policy` disabling camera/mic/geolocation but keeping `serial`, and `Strict-Transport-Security` with a short `max-age`). The flasher pages get the `style-src 'self' 'unsafe-inline'` CSP exception via a `<FilesMatch>` block that matches by file name in every language folder (a flasher page with another name in some language must be added to its pattern; the build warns). Applies **only** on Apache — it is copied to `dist/` but ignored by `npm run serve`. |

### Data Model (`data/projects.json`)

```json
{
  "id": "example-project",
  "title": { "de": "Beispielprojekt", "en": "Example Project" },
  "summary": { "de": "Ein Satz.", "en": "One-sentence description." },
  "tags": { "de": ["elektronik", "software"], "en": ["electronics", "software"] },
  "status": "fertig",
  "date": "2026-01",
  "links": { "repo": "https://example.com/repo", "demo": null },
  "image": "assets/img/example.webp",
  "featured": false
}
```

Field validation (enforced by the build, failures abort `npm run build`). The structure is defined in [`scripts/schemas/projects.schema.json`](scripts/schemas/projects.schema.json) and validated with `ajv`; language keys, unique ids, existing image and page files are checked in `scripts/lib/data.mjs`:

- `title`, `summary` and `tags` are objects keyed by language code. The default language is required; other languages are optional. A value that is missing or starts with `TODO` hides the project in that language and the build warns (`npm run create:project` writes `"TODO"` for every other language).
- `title` and `summary` are non-empty strings; `tags` are independent lists per language (not translations).
- `status` is one of the German keys: `in Arbeit`, `fertig`, `pausiert`, `veraltet`, `Konzept`, `abgebrochen`. Values contain spaces and capitals, so slugify before using one as a CSS hook. The label shown per language is `strings.<lang>.status[<key>]`; cards and headers carry the key as `data-status`.
- `featured` is a boolean.
- `draft` (optional) is a boolean when present. Draft projects keep their page built and their `<lang>/proj/{id}.html` link working, but are excluded from project lists, the tag filter and `sitemap.xml` — useful for projects that are not ready to be shown yet.
- `links` is an object; `repo` and `demo` are `null` or a valid http(s) URL (anything else fails the build).
- `tags` come from a fixed vocabulary per language, defined in `projects.schema.json` (`tags.properties.<lang>.items.enum`): `de` = `elektronik`, `software`, `roehren`, `esp32`, `stromversorgung`; `en` = `electronics`, `software`, `tubes`, `esp32`, `power-supply`. They must not repeat within a language. The build and `npm run create:project -- … --tags` reject other tags; a new tag or language is added to that list first.
- `image` is a relative path that resolves inside `wwwroot/`; `../` segments and absolute paths are rejected.
- Every project needs the page `de/proj/{id}.html`; other languages use `<lang>/proj/{id}.html` or the mapped name from `data/pages.json`.

Adding a project means `npm run create:project` (entry plus pages in all languages). Cards, filter, page title and page header are generated by the build. The project header's **Source** button (from `links.repo`) renders with the Github mark (`assets/icons/GitHub_Invertocat_White.svg`) as a leading badge; the **Demo** button (from `links.demo`) stays a plain text button. Omit the link to hide its button.

### Ham Radio Pages (`data/ham.json`)

A second collection next to the projects: `wwwroot/<lang>/hamradio.html` lists the ham radio pages (antennas, transceivers, contests, …) as a compact list with a tag filter instead of cards. Decisions and open steps: [`radio.md`](radio.md).

```json
{
  "id": "t2lt-antenna",
  "title": { "de": "T2LT Antenne", "en": "TODO" },
  "summary": { "de": "Ein Satz.", "en": "TODO" },
  "tags": { "de": ["antenne"], "en": [] },
  "date": "2026-10"
}
```

- Required: `id`, `title`, `summary`, `tags`, `date` (same rules as in `projects.json`, schema [`scripts/schemas/ham.schema.json`](scripts/schemas/ham.schema.json)). Optional: `status`, `links`, `draft`. No `image` and no `featured` (the list shows no images).
- Tags come from a fixed vocabulary per language (R9), defined in `ham.schema.json` (`tags.properties.<lang>.items.enum`): `de` = `antenne`, `transceiver`, `contest`, `funkbetrieb`, `messtechnik`, `diy`; `en` = `antenna`, `transceiver`, `contest`, `operating`, `measurement`, `diy`. The build and `npm run create:afu -- … --tags` reject other tags; a new tag or language is added to that list first.
- Pages live at `<lang>/ham/{id}.html` (or a mapped name from `data/pages.json`; a group with `ham/` pages may only contain `ham/` pages). The default-language page is required; a `TODO` or missing translation hides the entry in that language, like projects.
- A ham page uses the same structure as a project page (`{{projectTitle}}`, `{{projectSummary}}`, `@project-header`, layouts from the project template) with the back link `<a href="{{langRoot}}hamradio.html">{{t:backToHam}}</a>`.
- Ham entries do not appear on `projects.html`, the home page (R10) or in the project tag filter.
- Adding a ham page: `npm run create:afu -- "Name" "Brief" --tags a,b` (entry plus pages in all languages), replace the placeholder body, run `npm run build`.

### Other Data Files

| File | Content |
| --- | --- |
| `data/strings.json` | `{ "<lang>": { … } }`: UI strings per language (count words, labels, skip link, menu, aria labels, the connector word `projectLinkFor`, quote marks, `status` labels, ham list strings `hamCountSingular`/`hamCountPlural`/`noHamPages`/`backToHam`). Every language needs every key; `status` needs one label per status value. Rendered via `{{t:key}}` and the directives. |
| `data/ham.json` | Ham radio page entries, see [Ham Radio Pages](#ham-radio-pages-datahamjson). |
| `data/nav.json`, `data/footer-nav.json` | See [Navigation](#navigation-datanavjson). |
| `data/pages.json` | Groups of the same page under different file names per language, see [Languages](#languages). `[]` when all pages pair by identical path. |
| `data/site.json` | See [Site Config](#site-config-datasitejson). |

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
- [x] `de/projects.html`: full project listing
- ~~[x] `html/project.html`: detail template (driven by `?id=` query parameter)~~ — obsolete; replaced by static `<lang>/proj/{id}.html` pages
- [x] `de/about.html`: about and contact (contact via plain `mailto:` link)
- [x] Shared header/footer markup, documented how to keep it consistent across pages
- [x] `templates/project-template.html`: master project write-up template with all layout patterns
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
- [x] `npm run create:project`: scaffold a new project page from the template and register it in `projects.json`
- [x] Build logic split into `scripts/lib/` modules; `build.mjs` is a thin CLI
- [x] `@raw` … `@endraw` escape block for literal `{{…}}` / `<!-- @… -->` in code samples
- [x] Shared `<head>` partial with `{{csp}}` (flasher pages get the inline-style exception automatically)

### Phase 4 — Quality
Automated by the Phase 6 tooling once it exists (`test:e2e`, `lint:html`, `lint:css`, `lighthouse`).

- [x] Test layout at 320px, 768px, 1280px widths (`npm run test:e2e`: no horizontal overflow)
- [ ] Keyboard navigation and focus styles verified
- [ ] Validate HTML (W3C validator) and CSS
- [ ] Lighthouse check: accessibility and performance ≥ 95
- [x] Verify no cookies are set and no third-party requests are made (`npm run test:e2e`)

### Phase 5 — Release
- [x] Choose hosting (done: Apache at `dm7wb.de`, manual SFTP upload — see [Deployment](#deployment))
- [x] Add `sitemap.xml` (done: generated by the build)
- [x] Add meta descriptions / Open Graph tags (generated by the build — see [Open Graph and Canonical Tags](#open-graph-and-canonical-tags))
- [x] Write a short deployment note in this README (deploy the contents of `dist/`)

### Phase 6 — Tooling Integration
Wires the packages from [Tooling Packages](#tooling-packages) into the workflow. One step per change; add every new file to the outline.

- [x] `npm run lint:js`: `eslint.config.js` (flat config, `@eslint/js` recommended, `globals.browser` for `wwwroot/js/`, `globals.node` for `scripts/`; ignore `wwwroot/js/vendor/`, `dist/`)
- [x] `npm run lint:css`: `.stylelintrc.json` (`stylelint-config-standard`; `stylelint-declaration-strict-value` for colours outside `css/base.css`; rules matched to the existing CSS conventions)
- [x] `npm run lint:html`: `.htmlvalidate.json`, validates `dist/**/*.html` after a build; overlap with `checkHtmlRules` documented
- [x] `npm run lint` runs all three; `.githooks/pre-commit` runs it after `npm run check`
- [x] JSON schemas for `data/*.json` in `scripts/schemas/`, validated with `ajv` in `scripts/lib/data.mjs`; `$schema` references for editor support (combine with the localized data model in `language.md`, Phase M1)
- [x] `npm run images`: `scripts/images.mjs` — `sharp` writes WebP next to raster originals and creates `assets/img/og-default.png` (1200×630, D25) from `favicon.svg`; `svgo` (`svgo.config.mjs`) optimises SVGs in `assets/img/`, `assets/icons/` and `favicon.svg`
- [x] `npm run test:e2e`: `playwright.config.mjs` + `scripts/e2e/*.spec.mjs` against `npm run serve`: every page at 320/768/1280 px, no console errors, no external requests, no cookies/storage, visible keyboard focus
- [x] `npm run lighthouse`: `lighthouserc.json` with local URLs, assertions ≥ 0.95 for accessibility and performance, `upload.target: "filesystem"`
- [x] `.gitignore`: `test-results/`, `playwright-report/`, `.lighthouseci/`
- [x] `.vscode/extensions.json`: recommend the ESLint, Stylelint and html-validate extensions

### Phase 7 — Multi-language
Plan, decisions and work log: [`language.md`](language.md).

- [x] Localized data model, loaders and schemas (`site`, `strings`, `nav`, `projects`, `pages`)
- [x] Language-aware pipeline, renderers, language selector, hreflang alternates and checks
- [x] Content moved to `de/`, English skeletons in `en/`, landing page and 404 as common pages
- [x] Scaffolding and preview scripts for all languages; root redirect and flasher CSP in `.htaccess`
- [x] Unit tests for loaders, renderers, pipeline and checks
- [ ] English texts and the final landing page (owner, `language.md` Phase M20)
- [ ] Verification in the browser and on the server (`language.md`, Phase M11)

### Phase 8 — Ham Radio Section
Plan, decisions and open steps: [`radio.md`](radio.md).

- [x] `data/ham.json` + schema, loader, `<lang>/ham/` pages, `@ham-list`, `@tag-filter … from=ham`, list styles, tests
- [x] Scaffolding: `npm run create:afu` (ham pages), `npm run create:project` (projects)
- [x] Removal: `npm run remove:afu` (ham pages), `npm run remove:project` (projects)
- [ ] Remaining steps in `radio.md`

## Decisions

- **Hosting**: Apache at `dm7wb.de`, manual SFTP upload of `dist/` — see [Deployment](#deployment).
- **npm packages**: allowed for the build and tooling; the built site stays free of tracking, cookies and external services (D27).
- **Tooling integration**: the installed packages are wired in via npm scripts and config files (see [Tooling Packages](#tooling-packages) and Phase 6); approved 2026-10-27.
- **Languages**: German (default) and English; one folder per language (`de/`, `en/`) plus a common landing page and 404 at the root; the root redirects by `Accept-Language` (`302`) and falls back to the landing page; tags, titles and summaries are defined per language; `status` keeps German keys with labels per language; missing translations hide a project in that language and warn; legal pages stay German for now; no redirects from the old `/html/` URLs; all translations come from the owner. Full record: [`language.md`](language.md).
