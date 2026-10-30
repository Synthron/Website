# todo.md — Open Work

Open tasks only: finished items are deleted, not ticked. Every item has an ID: `Uxx` items need content, decisions or server access from the owner (agents skip them and ask instead, see `AGENTS.md` → Workflow); `Axx` items are agent tasks. IDs are never reused; new items take the next free number. Background on finished features and standing decisions is in [`README.md`](README.md).

## Content (User)

Agents never write or translate site content. The build warns about every leftover placeholder (`TODO`, `TODO_…`, "Placeholder paragraph").


## Deployment (User)


## Feature: Folder Mapping per Language (planned)

Goal: collection folders can have a different name per language (e.g. German `ham/` → `afu/`), the same way `data/pages.json` maps file names today. Implemented **before** the module pages, which build on it. All questions are answered; the tasks are ready.

### Decisions

- **Config**: new `data/folders.json`, format `{ "ham": { "de": "afu", "en": "ham" } }`; a language without a value uses the key as folder name. The keys are the internal names (`proj`, `ham`); data files, ids, command names and code keep using the keys.
- **Token**: `{{folder:<key>}}` → mapped folder name with trailing slash, e.g. `{{langRoot}}{{folder:ham}}moxon-2m-70cm.html`.
- **Source tree** carries the mapped names (`wwwroot/de/afu/…`); scaffolds write there. The build resolves names, it does not rename output.
- **Scope**: collection folders (`proj/`, `ham/`) via `folders.json`. Module folders are not listed there; they follow the parent page's file name in each language (see Module Pages).
- **Rollout**: German `ham/` becomes `afu/`. No redirects (site still under construction).

### Implementation (Agent)

- [ ] **A42** `data/folders.json` + `scripts/schemas/folders.schema.json` + loader in `data.mjs`: format as decided; keys limited to the collection keys; known languages; slug names; unique per language; no clash with other folders/pages in that language folder. Tests in `data.test.mjs`.
- [ ] **A55** Token `{{folder:<key>}}` in `applyTokens` (`pipeline.mjs`): mapped name of the page language with trailing slash, fails on an unknown key, escaped with `esc()`. README templating table. Tests in `pipeline.test.mjs`.
- [ ] **A43** Page index (`data.mjs`): `COLLECTIONS` / `FOLDERS`, `collectionOf()`, `projectPage()`, `projectId()`, `counterparts()` use the folder name of each language; pages in a collection folder pair across languages by key + file name (`de/afu/x.html` ↔ `en/ham/x.html`) without a `pages.json` entry. Tests.
- [ ] **A44** `data/pages.json` validation: the folder rules ("a group with ham/ pages may only contain ham/ pages", default-language path `<folder>/{id}.html`) use the folder name of each language. Tests.
- [ ] **A45** Build (`build.mjs`): collection detection, `ctx.project`, flasher detection and listings work with mapped source folders; no output renaming.
- [ ] **A46** Generated links use the mapped folders: project/ham cards and lists, back links, canonical, `hreflang`, Open Graph URL, sitemap. Tests in `render.test.mjs` / `pipeline.test.mjs`.
- [ ] **A47** Checks (`checkLanguageLinks`, `checkOrphanPages`, `checkTranslationCoverage`, unused assets) with mapped folders. Tests in `checks.test.mjs`.
- [ ] **A48** Scaffolds (`create.mjs`, `remove.mjs`, `page.mjs`, `scaffold.mjs`) read/write the mapped folder per language; `page.mjs` refuses names that clash with a mapped folder. Tests in `scaffold.test.mjs`.
- [ ] **A51** Rollout: add the `ham` → `afu` mapping for German, move `wwwroot/de/ham/` to `wwwroot/de/afu/` (`git mv`), replace hand-written `ham/` links with `{{folder:ham}}`, rebuild. Depends on A42–A48, A55.
- [ ] **A52** Tooling and e2e: `dev`, `serve`, `lighthouse` url list, `report`; `language.spec.mjs` covers `de/afu/` ↔ `en/ham/` (selector, `hreflang`, sitemap).
- [ ] **A53** Docs: README (outline, Languages → page pairs, folder mapping section, templating table, Ham Radio Pages) and `AGENTS.md` (Directory Responsibilities `<lang>/ham/`, Data rules, Common Tasks).
- [ ] **A54** Verification: `build`, `check`, `test`, `lint`, `test:e2e`; before the rollout (A51) and without a mapping, `dist/` stays byte-identical.

## Feature: Module Pages (planned)

Goal: a project or ham entry (e.g. SynPLC, ModLab) can have module pages below its overview page. Starts after the folder mapping. All questions are answered; the tasks are ready.

### Decisions

- **Location**: `<lang>/<folder>/<parent-page>/<module>.html` next to the overview page `<lang>/<folder>/<parent-page>.html`, for projects and ham entries. One level only, no deeper nesting.
- **Module folder** = file name of the parent page in that language (mapped names included): de `proj/synsps.html` → `proj/synsps/`, en `proj/synplc.html` → `proj/synplc/`. `<folder>` is the mapped collection folder (`afu/` in German).
- **Module file name**: derived from the name like project ids (`Netzteil` → `netzteil`); same name in every language at first, renamable per language via `data/pages.json`.
- **Ids**: project and ham ids are unique across `projects.json` and `ham.json` (the build enforces it), so a module's `parent` is looked up in both.
- **Commands**: script names stay (`create:project`, `create:afu`, `remove:project`, `remove:afu`) with a `--module` flag after `--`:
  - `npm run create:project -- --module <parent-id> "Module name" "Brief"` (same for `create:afu`); creates the module folder if missing
  - `npm run remove:project -- --module <parent-id> <module-id>` (same for `remove:afu`)
- **Data**: `data/modules.json`, an array like `projects.json` but reduced: `{ "parent": "…", "id": "…", "title": { "de": "…", "en": "…" }, "summary": { "de": "…", "en": "…" }, "status": "…", "date": "2026-09", "image": "assets/img/nixie_face.webp" }`. All fields required; `status` uses the project status values and is shown on the module page; a `DRAFT` title prefix marks a draft module.
- **Overview page**: modules are linked by hand-written links/sections (may become generated later). The build **warns** (not fails) when a visible module is not linked from its overview page. Project cards and listings stay unchanged.
- **Module page header**: project name as `h1` (not linked), module name as `h2`. Page title `Projekt — Modul — {{name}}` (separator as on project pages). Smaller template `templates/module-template.html`.
- **Module navigation**: back link to the overview plus previous/next links, at the top and the bottom of the page; generic labels without module title; order = order in `data/modules.json`; draft modules are skipped. Labels in `data/strings.json`: en "previous" / "next", de `TODO_prev` / `TODO_next` until the owner provides German texts.
- **Visibility**: parent hidden in a language → its module pages are hidden there too. Module without translation → hidden in that language. A single module can be a draft (pages built, not linked by previous/next) without affecting the parent.
- **Removing**: removing a project/ham entry fails while it still has modules; modules are removed with `--module`.
- **Sitemap**: module pages are listed; `lastmod` from git like normal pages; draft modules and all modules of a draft parent are excluded.
- **Open Graph**: the module image; if it is an SVG, the parent image (then the default OG image as today).

### Implementation (Agent, after the folder mapping)

Data and page index:
- [ ] **A56** Ids unique across `projects.json` and `ham.json`: the build fails on a shared id; `create.mjs` refuses an id that exists in the other file. Tests in `data.test.mjs`.
- [ ] **A24** `data/modules.json` + `scripts/schemas/modules.schema.json` + `loadModules()` in `data.mjs`: fields `parent`, `id`, `title`, `summary`, `status`, `date`, `image`, all required; `status` enum shared with `projects.schema.json`; `date` `YYYY-MM`; image exists; `parent` looked up in projects and ham; `id` unique per parent; default-language `title`/`summary` required, other languages `TODO`/missing → hidden there (warn); `DRAFT` prefix → draft; page must exist per visible language (default language: fail, others: warn + hide); file order kept; `localize()` for modules. Tests in `data.test.mjs`. Depends on A56.
- [ ] **A20** Page index (`data.mjs`): recognise `<folder>/<parent-page>/<module>.html` as a module page, the module folder resolved from the parent's page name in that language (incl. `pages.json` mapping and mapped collection folder); fail on deeper nesting and on module folders without a parent page; `projectId()` returns the parent id for module pages; helpers for the module id and the module page path per language. Tests.
- [ ] **A21** `data/pages.json` validation: module groups (all paths are module pages of the same module; each path inside the module folder of its language; default-language path decides the module); keep the project/ham group rules; renaming a parent page moves the expected module folder (fail with a clear message if the folder was not renamed). Schema, loader and tests together.

Build and rendering:
- [ ] **A22** Build (`build.mjs`): module pages get the parent (`ctx.project`) and the module (`ctx.module`); a module page is skipped in a language where the parent or the module is hidden; language versions (selector, `hreflang`) only where both are visible; draft modules are built.
- [ ] **A23** Checks (`checks.mjs`, loader warnings): module pages are not reported as "page without a data entry"; a module page without `modules.json` entry or of an unknown parent fails; translation coverage leaves module pages to the data warnings (like entry pages). Tests in `checks.test.mjs`.
- [ ] **A39** Warning (not failure) for a visible, non-draft module that is not linked from its parent's overview page in the same language. Test in `checks.test.mjs`.
- [ ] **A25** Tokens on module pages: module title (for `<title>{{projectTitle}} — <module title> — {{name}}</title>`), module summary (`meta description`), link to the overview page (mapped name per language); parent title via `{{projectTitle}}`; all escaped with `esc()`. README templating table.
- [ ] **A27** Directives `@module-header` (`h1` project title without link, `h2` module title, module status like the project header) and `@module-nav` (back link + previous/next within the same parent, `modules.json` order, only modules visible in the page language, drafts skipped, no link at the ends, generic labels; used at the top and the bottom of the page); renderers in `render.mjs`; strings `prev`/`next` in `data/strings.json` (en "previous"/"next", de `TODO_prev`/`TODO_next`); CSS in `components.css` / `responsive.css` (320px). Tests in `render.test.mjs` / `pipeline.test.mjs`.
- [ ] **A28** Sitemap: module pages listed with `lastmod` from git; draft modules and modules of a draft parent excluded. Open Graph: `ogImageRel()` uses the module image, SVG → parent image → default. Tests in `render.test.mjs`.

Scaffolding:
- [ ] **A30** `wwwroot/templates/module-template.html`: head with module summary and the decided title, `@module-nav` at the top, `@module-header`, placeholder body, `@module-nav` at the bottom; not built (like `project-template.html`). README → Project Write-up Template.
- [ ] **A31** `create.mjs --module <parent-id> "Module name" "Brief"` for `create:project` and `create:afu`: parent must exist in the collection of the command; `--status` allowed (default `in Arbeit` like projects), `--tags` / `--featured` / `--repo` rejected; derive/validate the module id; refuse an existing module or page; create the module folder per language if missing (parent page name, mapped collection folder); copy `module-template.html` into every language folder; append the `modules.json` entry (other languages `TODO`, `date` = current month, `image` = `assets/img/placeholder.svg` like projects); `--dry-run`. Depends on A24, A30.
- [ ] **A32** `create.mjs` (project/ham): existing module folders and module pages must not break the id and page checks.
- [ ] **A33** `remove.mjs`: removing a project/ham entry fails while it has modules (lists them); `--module <parent-id> <module-id>` deletes the `modules.json` entry, the page in every language, its `pages.json` group and the module folder once it is empty; confirmation / `--yes`.
- [ ] **A41** Unit tests for the scaffold helpers in `scaffold.test.mjs` (module page path, mapped parent names, mapped collection folders).

Tooling, tests, docs:
- [ ] **A34** Check that pages at depth 3 (`<lang>/<folder>/<parent>/<module>.html`) work with `npm run dev` (watch/rebuild), `lighthouse` (url list), `report`, `lint:html`, cache busting and `{{root}}` / `{{langRoot}}`.
- [ ] **A35** e2e (`scripts/e2e/`): module page header, back link, previous/next at top and bottom (draft skipped, ends without link), language selector pairs mapped module pages and folders, untranslated module not built, no external requests.
- [ ] **A36** Docs: README (outline, Module Pages section, `modules.json` data model, cross-collection id rule, templating table, `pages.json` rules, `--module` in the command reference) and `AGENTS.md` (directory table, Data rules, Common Tasks "Add a module page" / "Remove a module page"); `.vscode/tasks.json` entries for `--module` if useful.
- [ ] **A37** Verification: `build`, `check`, `test`, `lint`, `test:e2e`; without module pages, `dist/` stays byte-identical (compare before/after).

## Release Checks

- [ ] **A16** Manual W3C validator check (validator.w3.org/nu) of the built HTML and CSS.
- [ ] **A17** Manual keyboard pass over every page type: focus order, mobile menu (toggle, Escape), language selector, tag filter. `npm run test:e2e` already checks visible focus.

## Tests

- [ ] **A18** Optional: e2e check in `scripts/e2e/` that the ham tag filter on `hamradio.html` hides and shows list items.

## Topics (User)

- General Projects
  - [ ] DCF77 Uhr
  - [ ] SynPLC (mit Unterseiten)
  - [ ] ModLab (mit Unterseiten)
  - [ ] 3D-Drucker?
  - [ ] Röhrenverstärker
  - [ ] Gitarrenverstärker
- AFU
  - [x] Moxon Dual Band
  - [ ] QMX Tuner
  - [ ] QMX 10W Upgrade
  - [ ] QMX Mikro Kapsel
  - [ ] 5+8ele Yagi und SCAD Teile
  - [ ] Signal Stick
  - [ ] Endfed?
  - [ ] SCAD Balun-Gehäuse (WIP)
