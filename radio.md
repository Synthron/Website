# radio.md — Ham Radio Section

Plan and decision record for the ham radio section (`hamradio.html` and its sub-pages). Recommended option in **bold**. New questions get the next free ID (R11 …).

## Decision Record

| ID  | Question | Options | Answer |
| --- | -------- | ------- | ------ |
| R1  | Where are ham entries kept? | **Own file `data/ham.json`, pages in `<lang>/ham/{id}.html`** · `projects.json` with `"section": "ham"` | Own file `data/ham.json`, pages in `<lang>/ham/{id}.html` |
| R2  | Which fields does an entry need? | **Slim: `id`, `title`, `summary`, `tags`, `date`; `status`, `links` optional** · Same as projects | Slim; `status`, `links`, `draft` optional; no `image`, no `featured` |
| R3  | Ham entries also on `projects.html`? | **No, only on `hamradio.html`** · Yes | No |
| R4  | What does a list item show? | **Title (link), date, summary, tags** · Without summary · Title and date only | Title (link), date (and status if set), summary, tags |
| R5  | Count word of the filter status? | Beitrag · Eintrag · Thema · Seite | „Seite / Seiten“ (`hamCountSingular` / `hamCountPlural`) |
| R6  | Test page `de/ham/placeholder-project-two.html`? | **Rename to `ham/t2lt-antenna.html` and register** · Keep · Delete | Renamed to `ham/t2lt-antenna.html`, registered in `ham.json`; texts stay placeholders |
| R7  | Scaffolding for ham pages? | **`npm run create -- "Name" "Brief" --ham`** (same script, ham template/back link) · Separate `npm run ham` · Manual only | `npm run create:afu` (same script with `--ham`); projects use `npm run create:project`, `npm run create` is gone |
| R8  | Template of a new ham page? | **Project template with the ham back link** · Own, smaller `templates/ham-template.html` | Project template with the ham back link (set by `create:afu`) |
| R9  | Tag vocabulary? | **Free tags, suggested list in this file** (e.g. `antenne`, `transceiver`, `contest`, `funkbetrieb`, `messtechnik`) · Fixed list enforced by the schema | enforced by schema |
| R10 | Show the latest ham pages on the home page? | **No** · Yes, the newest 3 (`@ham-list limit=3`) | no |

## Implemented (2026-10-28)

- `data/ham.json` + `scripts/schemas/ham.schema.json` (references the project definitions), loaded by `loadHam()` in `scripts/lib/data.mjs` with the same language rules as projects (TODO hides an entry in that language, default-language page required, `pages.json` groups for `ham/` pages).
- `scripts/lib/data.mjs`: `COLLECTIONS` (`projects` → `proj/`, `ham` → `ham/`) and `collectionOf()`; `build.mjs` resolves `{{projectTitle}}`, `{{projectSummary}}`, `@project-header`, sitemap `lastmod` and Open Graph for ham pages like for project pages.
- Directives: `<!-- @ham-list level=2 id=ham-list -->` (`renderEntryList()`), `<!-- @tag-filter ham-list from=ham -->`; `js/projects.js` filters the list items unchanged (`data-tags`).
- Strings `hamCountSingular`, `hamCountPlural`, `noHamPages`, `backToHam` (English: `TODO_` placeholders).
- Styles `.entry-list*` in `css/components.css`.
- `de/hamradio.html` with filter and list; `en/hamradio.html` skeleton (`TODO_` texts).
- Unit tests in `data.test.mjs`, `render.test.mjs`, `pipeline.test.mjs`, `checks.test.mjs`.

## Open Steps

### Agent

- [x] **R7/R8** Scaffolding: `npm run create:afu` writes `<lang>/ham/{id}.html` (project template, ham back link) and the `ham.json` entry.
- [x] Removal: `npm run remove:afu` deletes a ham entry and its pages; projects use `npm run remove:project`, `npm run remove` is gone.
- [x] **R9** Fixed tag vocabulary per language in `ham.schema.json` (`de`: antenne, transceiver, contest, funkbetrieb, messtechnik, diy; `en`: antenna, transceiver, contest, operating, measurement, diy); `create:afu --tags` checks it too.
- [x] **R10** No home page list (decided: no; nothing to build).
- [ ] Optional: e2e check that the ham filter hides and shows list items (`scripts/e2e/`).

### User

- [x] Intro text of `de/hamradio.html` (currently „Alle meine Amateurfunk-Projekte und Themen.“) — keep or rewrite.
- [ ] `~~de/ham/t2lt-antenna.html`: real text instead of the template placeholders; in `data/ham.json` a German title/summary (currently „T2LT Antenna“ / „Placeholder entry — Test 2.“) and the tags.~~ - deprecated
- [x] English: `en/hamradio.html` texts, the four `TODO_` strings in `data/strings.json`, and per entry `title`/`summary`/`tags` in `ham.json` plus a page `en/ham/{id}.html` (until then the entry is hidden in English).
- [x] Answer R9–R10.
