# language.md — Multi-language Plan

Plan for turning the site into a multi-language site. **Nothing in this file is implemented yet.** All decisions (L1–L32) were answered on 2026-10-27, including the build-scope approval (L32). The target structure and the work items (M-steps) below follow the answers; implementation can start with Phase M1.

Like `todo.md`, this file is kept outside the README outline until the user decides otherwise.

## Goal (from the user request)

- One **common landing page** (`index.html`) and one **common 404 page** (`404.html`) for all languages, both at the web root.
- All other pages move from `/html/…` to one folder per language: `/de/…`, `/en/…` (more languages later).
- A **language selector** in the header.
- Every internal link points to the page **in the same language**.
- **Tags are defined per language** (independent lists, not translations of one list).
- **Titles and summaries** stay in `data/projects.json`, as one per-language attribute each.

## Current State (what has to change)

| Area | Today | Language-dependent parts |
| --- | --- | --- |
| Page tree | `wwwroot/index.html`, `404.html`, `html/*.html`, `html/proj/*.html` | `html/` is hard-coded in `build.mjs`, `data.mjs`, `render.mjs`, `checks.mjs`, `create.mjs`, `page.mjs`, `remove.mjs`, `nav.json`, `footer-nav.json`, `index.html` |
| `site.json` | single `lang: "de"`, `footerNote` in German | `lang`, `footerNote` |
| `strings.json` | flat object of German UI strings | whole file |
| `nav.json` / `footer-nav.json` | flat arrays, German labels, `html/…` hrefs | labels, hrefs |
| `projects.json` | `title`, `summary`, `tags` as plain values; `status` is a German word | `title`, `summary`, `tags`, `status` label |
| Partials | German text hard-coded: `Zum Inhalt springen`, `Menü`, `Hauptnavigation`, `Fußbereich`; brand links to `{{root}}index.html` | all UI text, brand link target |
| Renderers | `renderLinks` hard-codes ` für `; `renderCard` hard-codes `html/proj/`; `renderMeta` prints the raw German status; `renderOpenGraph` maps only `de` → `de_DE` | strings, paths, locale |
| Pipeline | `ctx.project` looked up for `rel.startsWith('html/')`; `{{lang}}` = `site.lang` for every page | page language, project lookup |
| Checks | `checkOrphanPages` looks at `html/proj/` | paths, new translation checks |
| Sitemap | one URL per page, `html/proj/` detection for `lastmod` | paths, optional `hreflang` alternates |
| `js/projects.js` | quote marks `“ ”` hard-coded around the tag name | quote style per language (minor) |
| `.htaccess` | `ErrorDocument /404.html`, `<Files "nixie-clock.html">` (matches by name in every folder) | redirects for the old `/html/…` URLs |
| `serve.mjs` / `dev.mjs` | flasher detection by basename, `index.html` for directories | `/de/` and `/en/` directory index |
| Legal pages | `html/impressum.html`, `privacy.html`, `rechtliches.html` (protected) | location, translation (needs approval) |

The token regex in `pipeline.mjs` already accepts `:` in token names (`[\w:]+`), so a `{{t:key}}` string token fits without changing the parser.

---

## Questions for the User (L1–L22)

Recommended option in **bold**. Answers go into the last column; new questions get the next free ID.

| ID | Question | Options | Answer |
| --- | --- | --- | --- |
| L1 | Which languages at launch, and which is the default (fallback, `x-default`)? | **`de` (default) + `en`** · `en` (default) + `de` · more languages | default de|
| L2 | What is on the common landing page `index.html`? | **Short bilingual intro + one button per language (no project list)** · Pure language picker (logo + language links only) · Full home page in the default language with the featured projects | common page can be bilingual or, if .htaccess referral works, on per-language basis with german page as fallback |
| L3 | Does each language get its own home page (`/de/index.html`, `/en/index.html`) with the intro and featured projects? | **Yes** (the current home content moves there) · No, the language folders start at `projects.html` | yes, see L2 |
| L4 | Should the root redirect automatically based on the browser language (`Accept-Language`)? Conflicts with a visible common landing page. | **No, the visitor picks the language** · Yes, server-side redirect in `.htaccess` (no JS, no cookie) | yes, autoredirect to separate index page, common landing page as fallback |
| L5 | Language of the common pages (`index.html`, `404.html`): what goes into `<html lang>` and which header nav do they show? | **`lang` = default language, bilingual text blocks marked with `lang="…"`, header shows only brand + language selector** · default-language nav on both pages · separate small header partial without nav | language of 404 en |
| L6 | Where does the header brand (logo + name) link to on language pages? | **The language home (`/de/index.html`)** · The common landing page (`/index.html`) | language home |
| L7 | How does the language selector look? | **Short codes `DE` / `EN` (with `lang`/`hreflang`, full name as accessible label)** · Full names `Deutsch` / `English` · Flags (not recommended: flags are countries, not languages) | short codes with flags next to them, highlighted what language is selected, use UK flag for english, german flag for german|
| L8 | Where does the selector sit on small screens (< 640px)? | **Always visible next to the menu button** · Inside the collapsible nav | next to menu button / top nav |
| L9 | Where does a language switch lead? | **The same page in the other language; the language home if that page does not exist** · Always the language home | see default |
| L10 | Do page file names stay identical across languages (`de/about.html` ↔ `en/about.html`) or are they translated (`de/ueber-mich.html` ↔ `en/about.html`)? | **Identical names** (simple 1:1 mapping, no mapping table) · Translated names + a mapping table in data | mapped, this way user can decide later by naming the files accordingly |
| L11 | Must every page and every project exist in every language? | **Yes for the default language; other languages optional, missing ones are left out of that language (build warns)** · Every page in every language (build fails) · Missing pages fall back to the default language | yes for default, build warning |
| L12 | What happens when a project has no `title`/`summary`/`tags` for a language? | **Project is hidden in that language (lists, filter, sitemap); build warns** · Build fails · Fallback to the default-language text | project is hidden in that language |
| L13 | Tag format per language: may German tags contain umlauts (`röhren`) or stay ASCII (`roehren`)? | **ASCII lowercase-hyphenated as today (slug rule unchanged)** · Allow Unicode lowercase letters | ascii |
| L14 | `status` values: keep the German words as data values, or switch to language-neutral keys with labels per language? | **Neutral keys (`wip`, `done`, `paused`, `outdated`, `concept`, `cancelled`) + labels in `strings`** · Keep the German values as keys, map to labels per language | keep german values as keys, map to language (in data) |
| L15 | Data layout for the localized JSON files? | **One file per data type with language keys (`strings.json` → `{ "de": {…}, "en": {…} }`, same for `nav.json`, `footer-nav.json`)** · One file per language (`strings.de.json`, `nav.en.json`, …) | default |
| L16 | Legal pages (`impressum`, `privacy`, `rechtliches`) — protected files: may they move to `/de/`? Is there an English version? | **Move to `/de/`; English footer links point to the German legal pages, marked “(German)”** · Move and translate (user provides/approves the English wording) · Keep them at a language-neutral location | move to de, links to german text for now, will be translated later |
| L17 | Should old URLs (`/html/…`) redirect permanently to the new ones? | **Yes, `301` from `/html/x` to `/de/x` in `.htaccess` (old URLs are German)** · No (site is new, no external links yet) | no, site is new and still under construction |
| L18 | Project page body per language: one source file per language (`de/proj/sy317.html`, `en/proj/sy317.html`)? | **Yes, one file per language** (prose, figure captions and alt texts differ) · Shared layout file with per-language text blocks | one file per language  |
| L19 | Where does the master template `project-template.html` live? | **Stays a single, language-neutral file (outside the language folders, e.g. `wwwroot/templates/`), `npm run create` copies it into every language folder** · One template per language folder | stays in wwwroot/templates, does NOT get built and deployed with npm! |
| L20 | How does `npm run create` get the texts for the other languages? | **`--title-en "…" --summary-en "…"` flags; missing languages get no entry (project hidden there, see L12)** · Placeholder text marked `TODO` (build warns) · Interactive prompt | placeholder text marked TODO |
| L21 | `hreflang` alternates in `sitemap.xml` (`xhtml:link`) in addition to the `<link rel="alternate">` tags in the page head? | **Head tags only** · Head tags + sitemap alternates | head tags only |
| L22 | Translation work: who writes the English texts (pages, landing, 404, nav labels, footer note, project titles/summaries/tags)? | **User provides all texts; agents only build structure and clearly marked placeholders** · Agent drafts, user reviews (needs explicit approval per page, AGENTS.md forbids invented content) | user provides unless user asks agents explicitly to help in translation |

### Resulting decisions

Condensed reading of the answers; the target structure and the M-steps implement exactly this.

- **Languages** (L1): `de` (default, fallback, `x-default`) and `en`.
- **Root `/`** (L2, L4, L23, L24): `.htaccess` redirects the exact path `/` by the highest-priority `Accept-Language` entry (primary subtag: `de-AT` → `de`, `en-US` → `en`) with `302` + `Vary: Accept-Language` to `/de/` or `/en/`. Any other or missing language (most crawlers) gets the common bilingual landing page `index.html`.
- **Language homes** (L3): `/de/index.html` and `/en/index.html` with intro and featured projects; the current home content moves to `/de/index.html`.
- **404** (L5, L28): common page at the root, `lang="en"`; the English text is already written by the user and stays.
- **Common pages header** (L27): brand + language selector only, no nav; landing page `lang="de"` with every text block marked `lang="de"` / `lang="en"`.
- **Brand link** (L6): the language home.
- **Selector** (L7, L8, L9, L26): code + flag (`DE` with the German flag, `EN` with the UK flag; both SVGs created by an agent), current language highlighted; always visible in the top bar next to the menu button; links to the same page in the other language, otherwise to that language's home.
- **`og:locale`** (L25): `de_DE`, `en_GB`.
- **File names** (L10, L31): may differ per language, project pages included; `data/pages.json` pairs them. Pages not listed pair by identical path. The `de` project page always stays `de/proj/{id}.html` (anchor for the `id`); other languages default to `{id}.html` and may be renamed.
- **Local preview** (L29): `npm run serve` / `npm run dev` mirror the root redirect.
- **Coverage** (L11, L12): every page and project must exist in `de`; other languages are optional. Missing translations → build warning; the project is hidden in that language (lists, filter, sitemap, alternates).
- **Tags** (L13): per language, ASCII lowercase-hyphenated (slug rule unchanged).
- **Status** (L14): the German values stay the data keys; per-language labels are mapped in `data/strings.json`.
- **Data layout** (L15): one file per data type with language keys.
- **Legal pages** (L16): move to `/de/` (approved, wording unchanged); English footer links to the German pages for now, translations follow later.
- **Old URLs** (L17): no redirects; the old `/html/` folder is simply deleted on the server.
- **Project pages** (L18): one source file per language.
- **Template** (L19): `wwwroot/templates/project-template.html`, never built or deployed.
- **`npm run create`** (L20, L30): non-default languages get `TODO` placeholder texts; the build warns, and a `TODO` counts as missing, so the project stays hidden in that language until the text is filled in.
- **Sitemap** (L21): no alternates; `hreflang` only as head tags.
- **Translations** (L22): the user provides all texts; agents translate only on explicit request.
- **Build scope** (L32): all extensions in this plan are approved (`{{langRoot}}`, `{{t:key}}`, `@lang-switch`, head alternates, `data/pages.json`, new checks, `Accept-Language` redirect).
- Superseded: `todo.md` **D1** (German content and UI) → `AGENTS.md` → Language changes accordingly (M101, M102).

### Follow-up questions (L23–L32)

| ID | Question | Options | Answer |
| --- | --- | --- | --- |
| L23 | Root fallback: L2 mentions the German page as fallback, L4 the common landing page. What does a visitor get whose browser prefers neither `de` nor `en`, or sends no `Accept-Language` (most crawlers)? | **Common bilingual landing page** · Redirect to `/de/` | common bilingual langing page |
| L24 | Matching rule and type of the root redirect? | **Only for the exact path `/`; match the first (highest-priority) language by primary subtag (`de-AT` → `de`, `en-US` → `en`); `302` + `Vary: Accept-Language`** · Match any listed language in order · `301` (gets cached by browsers) | default |
| L25 | `og:locale` for English? | **`en_GB` (matches the UK flag)** · `en_US` | en_GB |
| L26 | Flag icons: who provides them? They must be self-hosted SVGs (no external requests). | **Agent creates two small geometric SVGs (`assets/icons/flag-de.svg`, `assets/icons/flag-gb.svg`)** · User provides them | agent creates |
| L27 | Header on the common pages (landing, 404): only brand + language selector, or also a nav? `<html lang>` of the bilingual landing page? | **Brand + selector only; landing `lang="de"` with every text block marked `lang="de"` / `lang="en"`** · English nav on the 404 page · German nav on both | default |
| L28 | The 404 page becomes English (L5). Who writes the English text replacing the current German teapot text? | **User provides it** · Agent translates the current text (explicit request per L22) | 404 page has been changed to english by user and will stay this way |
| L29 | Should `npm run serve` / `npm run dev` mirror the `Accept-Language` redirect so it can be tested locally? | **Yes (like the mirrored security headers)** · No, test on the server only | yes |
| L30 | Does a `TODO` placeholder (L20) count as missing data, so the project stays hidden in that language (L12) until the text is filled in? | **Yes** · No, show it with the placeholder text | yes |
| L31 | Project page file names: `<lang>/proj/{id}.html` in every language (the `id` is shared), or mappable like other pages (L10)? | **Always `{id}.html`** (no mapping for projects) · Mappable via `data/pages.json` | mappable, just in case |
| L32 | Approve the build extension this plan needs (AGENTS.md: no scope extension without approval): `{{langRoot}}`, `{{t:key}}`, `@lang-switch`, head alternates, `data/pages.json`, new checks, `Accept-Language` redirect. | **Approve all** · Approve with changes | approve |

---

## Target Structure

```
wwwroot/
├── index.html            # Common landing page (bilingual; fallback of the root redirect)
├── 404.html              # Common not-found page (English, root-relative links)
├── .htaccess             # + Accept-Language redirect for "/"            (L4)
├── de/
│   ├── index.html        # German home (intro, featured projects)       (L3)
│   ├── projects.html
│   ├── about.html
│   ├── impressum.html    # Legal pages, German only                     (L16)
│   ├── privacy.html
│   ├── rechtliches.html
│   └── proj/
│       ├── sy317.html
│       ├── nixie-clock.html
│       └── placeholder-project-two.html
├── en/                   # file names may differ from de/ (data/pages.json, L10)
│   ├── index.html
│   ├── projects.html
│   ├── about.html
│   └── proj/
│       └── … (hidden while English data is missing or TODO, L12/L30)
├── templates/
│   └── project-template.html   # not built, not deployed               (L19)
├── assets/icons/
│   ├── flag-de.svg       # selector flags                               (L7, L26)
│   └── flag-gb.svg
└── data/
    ├── site.json         # languages (code, name, locale, flag), defaultLang, per-language footerNote
    ├── pages.json        # pairs of differently named pages             (L10)
    ├── strings.json      # { "de": {…}, "en": {…} } incl. status labels
    ├── nav.json          # { "de": [...], "en": [...] }
    ├── footer-nav.json   # { "de": [...], "en": [...] }
    └── projects.json     # localized title/summary/tags
```

### Data model examples

`site.json`:

```json
{
  "languages": [
    { "code": "de", "name": "Deutsch", "locale": "de_DE", "flag": "assets/icons/flag-de.svg" },
    { "code": "en", "name": "English", "locale": "en_GB", "flag": "assets/icons/flag-gb.svg" }
  ],
  "defaultLang": "de",
  "name": "DM7WB",
  "url": "https://dm7wb.de",
  "copyrightYear": 2026,
  "footerNote": { "de": "Keine Cookies. Kein Tracking.", "en": "No cookies. No tracking." },
  "email": "qso@dm7wb.de"
}
```

`projects.json` entry:

```json
{
  "id": "sy317",
  "title":   { "de": "SY317 - 78xx Spannungsregler-Ersatz", "en": "…" },
  "summary": { "de": "Drop-In Schaltregler-Replacement …", "en": "…" },
  "tags":    { "de": ["hardware", "elektronik", "stromversorgung"], "en": ["hardware", "electronics", "power-supply"] },
  "status": "fertig",
  "date": "2026-05",
  "links": { "repo": "https://github.com/Synthron/SY317", "demo": null },
  "image": "assets/img/sy317_render.png",
  "featured": true
}
```

`id`, `status`, `date`, `links`, `image`, `featured` and `draft` stay language-neutral. A fresh `npm run create` writes `"TODO"` for every non-default language (L20); such a value counts as missing (L30).

`pages.json` (only pages whose names differ; everything else pairs by identical path; a project group must contain `"de": "proj/{id}.html"`, L31):

```json
[
  { "de": "ueber-mich.html", "en": "about.html" },
  { "de": "proj/sy317.html", "en": "proj/sy317-voltage-regulator.html" }
]
```

`nav.json` (hrefs relative to the **language folder**, the build prefixes `{{root}}<lang>/`):

```json
{
  "de": [
    { "label": "Start", "href": "index.html" },
    { "label": "Über mich", "href": "about.html" },
    { "label": "Projekte", "href": "projects.html" }
  ],
  "en": [
    { "label": "Home", "href": "index.html" },
    { "label": "About", "href": "about.html" },
    { "label": "Projects", "href": "projects.html" }
  ]
}
```

`footer-nav.json` points to a page in another language with an optional `"lang": "de"` per entry (English footer → German legal pages, L16). The link gets `hreflang`/`lang`; the label (e.g. with a “(German)” hint) is user text.

`strings.json` gains the strings that are hard-coded today: `skipLink`, `menu`, `mainNavLabel`, `footerNavLabel`, `languageLabel`, `projectLinkFor` (the ` für ` in `renderLinks`), `backToProjects`, `quoteOpen`/`quoteClose` for the filter status, and a `status` map from the German key to the label (L14):

```json
{
  "de": { "status": { "in Arbeit": "in Arbeit", "fertig": "fertig", "…": "…" }, "…": "…" },
  "en": { "status": { "in Arbeit": "…", "fertig": "…" }, "…": "…" }
}
```

### Templating additions (needs approval, L32)

| Construct | Result |
| --- | --- |
| `{{lang}}` | Language of the current page: the folder name; on common pages the literal `<html lang="…">` of the source (`index.html` = `de`, `404.html` = `en`). Behaviour changes, name stays. |
| `{{langRoot}}` | Relative path to the current language folder (e.g. `""` in `de/`, `"../"` in `de/proj/`); equals `{{root}}` on common pages. Used for the brand link (L6) and same-language links. |
| `{{t:key}}` | UI string `key` from `strings.json` for the page language (HTML-escaped). Used in partials. |
| `{{footerNote}}` | Now resolved per page language. |
| `{{projectTitle}}`, `{{projectSummary}}` | Now resolved per page language. |
| `<!-- @lang-switch -->` | Language selector: one link per language with flag (`<img alt="">`) + code (`DE`/`EN`), the language `name` as accessible label; target is the paired page (`pages.json`, identical path, or project `id`), otherwise that language's home (L9); `aria-current="true"` + highlight on the current language; `lang` + `hreflang` on each link. Used in `partials/header.html`, next to the menu button (L8). On common pages it links to the language homes. |
| head alternates (automatic) | `<link rel="alternate" hreflang="…">` for every available translation of the page + `hreflang="x-default"` → `/` (the redirecting root); added by the build next to the Open Graph tags. Not in `sitemap.xml` (L21). |

---

## Work Items (M-steps)

Order matters: data and pipeline first with only `de` configured, then the move, then English. Steps marked **User** need content or approval from the user.

### Phase M0 — Decisions

- [x] **M01** **User**: answer L1–L22 (2026-10-27).
- [x] **M02** Record the answers and the resulting decisions here.
- [x] **M03** **User**: answer the follow-ups L23–L32 (2026-10-27; build scope approved, L32).

### Phase M1 — Data model and validation (`scripts/lib/data.mjs`)

The structure of every data file is validated by the JSON Schemas in `scripts/schemas/` (`ajv`); update each schema together with its loader.

- [x] **M10** `loadSite()`: validate `languages` (non-empty array of `{ code, name, locale, flag }`, unique lowercase codes, `flag` an existing file inside `wwwroot/`), `defaultLang` (must be a configured code), `footerNote` as per-language object; keep `name`, `url`, `email`, `copyrightYear` shared. Remove `lang`.
- [x] **M11** `loadStrings()`: per-language layout (L15); every language has every key in `STRING_KEYS`; extend `STRING_KEYS` with the strings moved out of partials/renderers; validate the `status` map: exactly one label per value in `STATUS_VALUES` (L14).
- [x] **M12** `loadNav(file)`: per-language arrays; same validation per entry; hrefs relative to the language folder; optional `lang` for cross-language footer entries (L16), must be a configured code.
- [x] **M13** `loadProjects()`: `title`, `summary` as objects keyed by language; `tags` as object of arrays per language; the default language is required (fail); other languages optional; `"TODO"` (or a value starting with `TODO`) counts as missing (L20, L30) and warns; ASCII slug rule and no duplicates per language (L13).
- [x] **M14** `status`: German values stay the keys, `STATUS_VALUES` unchanged (L14); no migration of `projects.json` status values needed.
- [x] **M15** Page existence: `wwwroot/de/proj/{id}.html` required for every project (fail); for other languages the page is `<lang>/proj/{id}.html` or its mapped name from `pages.json` (L31): data without page or page without data → warn, project hidden in that language (L11, L12).
- [x] **M16** Helper: `localize(project, lang)` returning a flat view (`title`, `summary`, `tags`) so the renderers stay simple; `null` when the project is not available in that language.
- [x] **M17** New `loadPages()` for `data/pages.json` (L10): array of `{ <lang>: <path> }` groups; known language codes only; every path exists under `wwwroot/<lang>/`; no path in two groups; a group with a `proj/` path must contain `"de": "proj/{id}.html"` of an existing project and only `proj/` paths (L31). Builds a page index `(lang, rel) → counterparts` used by `@lang-switch`, head alternates and the coverage check; unlisted pages pair by identical path.

### Phase M2 — Build pipeline (`scripts/build.mjs`, `scripts/lib/pipeline.mjs`)

- [x] **M20** Classify every HTML file: language page (`<lang>/…`, first path segment is a configured code) or common page (`index.html`, `404.html`). Language pages take `lang` from the folder; common pages from the literal `<html lang="…">` in the source (landing `de`, 404 `en`; L5, L27). Put `lang`, `langRoot` and `isCommon` into `ctx`.
- [x] **M21** Project lookup: `ctx.project` for `rel` under `<lang>/proj/`, resolved to the `id` via the page index (mapped name → `de/proj/{id}.html`, otherwise the file name), localized for `ctx.lang` (replaces `rel.startsWith('html/')`).
- [x] **M22** `applyTokens`: `{{lang}}` from `ctx.lang`; new `{{langRoot}}`, `{{t:key}}` (fail on unknown key); `footerNote`, `projectTitle`, `projectSummary` per language.
- [x] **M23** `applyDirectives`: pass per-language `nav`, `footerNav`, `strings` and the localized project list; add `@lang-switch`. On common pages `@nav` renders nothing (brand + selector only, L27) and the footer uses the page language.
- [ ] **M24** (done: `templates` in `SKIP_DIRS`; open: drop `SKIP_FILES` entry with M57) Skip list: add `templates` to `SKIP_DIRS` (never built, never deployed, L19); drop `project-template.html` from `SKIP_FILES`.
- [x] **M25** Head alternates: inject `<link rel="alternate" hreflang>` for available translations + `x-default` → `${url}/`, together with the OG tags; hidden projects (L12) get no alternate.
- [x] **M26** Open Graph: `og:locale` from the language config (`en_GB`, L25); `og:locale:alternate` for available translations; canonical/`og:url` unchanged (path already contains the language).
- [x] **M27** `formatDate()` called with the page language.
- [x] **M28** Sitemap: replace the `html/proj/` detection with `<lang>/proj/`; include every language page; exclude projects hidden in a language (L12); no `xhtml:link` alternates (L21).
- [x] **M29** Optional pure-refactor check: after M10–M28 with `languages: ["de"]` and the files still in `html/`, compare `dist/` with the previous build — only intended differences allowed (AGENTS.md → Refactor the build).

### Phase M3 — Renderers (`scripts/lib/render.mjs`)

- [x] **M30** (until M50 the default language's hrefs are web-root-relative via `pages.base()`) `renderNav`: prefix `ctx.root + lang + '/'` for internal entries; `aria-current` comparison against `<lang>/<href>`; cross-language footer entries get `hreflang`/`lang`.
- [x] **M31** (signature `renderLangSwitch(ctx, site, strings)`; pairs come from `ctx.versions`; renders nothing with one language; the `@lang-switch` directive is wired, the header partial uses it in M55) New `renderLangSwitch(ctx, site, strings, pageIndex)`: `<nav aria-label="{{t:languageLabel}}">` with one link per language: flag image (`alt=""`, fixed `width`/`height`) + code, language `name` as accessible label; target per L9 via the page index (M17); `lang`, `hreflang`, `aria-current="true"` on the current language; HTML-escaped.
- [x] **M32** `renderCard`: link to the project page of the card's language (`${root}${lang}/proj/` + `{id}.html` or the mapped name, L31); localized title, summary, tags (`data-tags` from the language's tags).
- [x] **M33** `renderProjectHeader`, `renderMeta`: localized texts; status label from `strings[lang].status[project.status]` (L14), `data-status`/CSS hooks keep using the German key.
- [x] **M34** `renderLinks`: replace the hard-coded ` für ` with a string (`projectLinkFor`).
- [x] **M35** (the filter status also carries `data-quote-open`/`data-quote-close`) `renderProjectList`, `renderTagFilter`: only projects available in the page language; tags of that language; `data-lang` from the page.
- [x] **M36** (done in M26) `renderOpenGraph`: locale map instead of the `de` special case.

### Phase M4 — Checks (`scripts/lib/checks.mjs`)

- [x] **M40** `checkOrphanPages`: `<lang>/proj/*.html` (resolved via the page index) without project data in that language (warn).
- [x] **M41** (common pages are validated when they are classified, `classifyPage`) New: `<html lang>` of a language page must equal its folder; on common pages it must be a configured code.
- [x] **M42** New: translation coverage via the page index (M17): a page in another language without a `de` counterpart → fail (L11: required in `de`); a `de` page without a counterpart → warn.
- [x] **M43** (the `html/` rule only becomes active after M50) New: links between language folders (e.g. `de/…` → `en/…`) outside the language selector and declared cross-language footer entries → warn; leftover `html/` links → fail.
- [x] **M44** (covered by the `loadProjects()` warning, one per project and language) New: warn for every `TODO` placeholder left in `projects.json` (L20), listing project and language.
- [x] **M45** (tests with language folders added) `checkLinks`, `checkAnchors`: no change expected; verify with the new tree.
- [x] **M46** New: a page containing `<esp-web-install-button>` whose file name is not covered by the flasher CSP exception in `.htaccess` → warn (mapped names can differ per language, L31).

### Phase M5 — Content migration (`wwwroot/`)

- [x] **M50** Move `wwwroot/html/` → `wwwroot/de/` (`git mv`, keeps history and the sitemap `lastmod`), including the legal pages (approved, L16; wording unchanged). Relative links inside the folder (`../projects.html` on project pages) stay valid.
- [x] **M51** (English labels are `TODO_<German label>` placeholders, see U02) `data/footer-nav.json`: English entries point to the German legal pages via `"lang": "de"` (L16); **User** provides the English labels.
- [x] **M52** (English placeholders: `TODO_<German label>`) Move the current home content from `wwwroot/index.html` to `wwwroot/de/index.html` (L3); fix its links (`html/projects.html` → `projects.html`).
- [x] **M53** (placeholder page titled "UNDER CONSTRUCTION" with a button per language; final text is U01) **User**: new common landing page `wwwroot/index.html` (L2, L27) — bilingual, `lang` per text block, links to both language homes; structure by agent, text by user. Only shown as redirect fallback (L23).
- [x] **M54** (own partial `header-common.html` with brand + selector, no nav) Common `404.html` (L5, L27, L28): English text already written by the user, keep it. Remaining: `<html lang="en">` instead of `{{lang}}`, header with brand + selector only, stays root-relative (`{{root}}` = `/`).
- [x] **M55** Partials: replace hard-coded German strings with `{{t:…}}`; brand link `{{langRoot}}index.html` (L6); `<!-- @lang-switch -->` in `header.html` next to the menu button, outside the collapsible nav (L8); footer uses the per-language `footerNote`.
- [x] **M56** (English blocks hold placeholders) Convert `data/nav.json`, `data/footer-nav.json`, `data/strings.json`, `data/site.json`, `data/projects.json` to the new format with the existing German values; add `data/pages.json` (initially `[]`).
- [x] **M57** (`SKIP_FILES` entry removed; `npm run create` still points to the old path until M70) Move `project-template.html` to `wwwroot/templates/` (L19); update its instruction comment and the `{{root}}` assumptions in it.
- [x] **M58** (skeletons with `TODO` placeholders for pages, strings, nav, footer note and project data; real texts are U02–U05) **User**: English texts — `en/index.html`, `en/projects.html`, `en/about.html`, `en/proj/*.html` (prose, figure captions, alt texts), English strings, nav labels, footer note, project titles, summaries and tags. Agents create only the page skeletons with clearly marked placeholders (L22).
- [ ] **M59** (open, see U06) German tags per project (tags are redefined per language) — **User** provides the lists.

### Phase M6 — Front end (`wwwroot/css/`, `wwwroot/js/`)

- [x] **M60** Selector styles in `css/layout.css` (header): flag + code, current language highlighted by more than colour (e.g. underline or border, custom properties only); breakpoints in `css/responsive.css`; visible focus style; fits at 320px next to the menu button (L7, L8).
- [x] **M61** (the selector sits outside `#site-nav`, `nav.js` needed no change) `js/nav.js`: the selector sits outside the collapsible nav and is never hidden by the toggle (L8).
- [x] **M62** `js/projects.js`: quote marks around the tag from `data-*` attributes (`quoteOpen`/`quoteClose`) instead of the hard-coded `“ ”`.
- [x] **M63** (`lang` attributes on the placeholder landing page; final bilingual blocks with U01) Bilingual blocks on the landing page: `lang="de"` / `lang="en"` on the respective elements (screen readers, hyphenation).
- [x] **M64** Flag icons `assets/icons/flag-de.svg` and `assets/icons/flag-gb.svg` (L26): small, self-hosted, geometric SVGs.

### Phase M7 — Scripts (`scripts/`)

- [x] **M70** `create.mjs`: copy `templates/project-template.html` to `<lang>/proj/{id}.html` for every language; write the default-language `title`/`summary` from the arguments and `"TODO"` for every other language (L20); duplicate check across all language folders; `--tags` for the default language, other languages start empty.
- [x] **M71** (the skeleton needs no `{{t:…}}`: the UI strings live in the partials; other languages get `TODO_<title>` labels, matching the M5 convention) `page.mjs`: create the page in every language (default title from the argument, `--title-<lang>` for other languages, otherwise `TODO` title); per-language slug; add a `data/pages.json` group when slugs differ (L10); `--nav`/`--footer` entries into the per-language arrays; `{{t:…}}`-based skeleton.
- [x] **M72** `remove.mjs`: delete the project page in every language folder (`{id}.html` or the mapped name) and its `pages.json` group; update the confirmation text.
- [x] **M73** `report.mjs`: per-language page sizes; adapt any `html/` assumptions.
- [x] **M74** (the redirect uses the first `Accept-Language` entry, like the planned `.htaccess` rule) `serve.mjs`, `dev.mjs`: mirror the `Accept-Language` redirect for `/` (L29); `/de/` and `/en/` serve their `index.html`, `/de` redirects to `/de/`; flasher CSP detection must cover mapped file names (L31), e.g. by checking the served HTML for `<esp-web-install-button` instead of the hard-coded `nixie-clock.html` basename.
- [x] **M75** (no change needed) `check-external.mjs`, `firmware.mjs`: verify; the firmware snippet uses `{{root}}` and needs no change.

### Phase M8 — Server and deployment

- [x] **M80** (also `Vary: Accept-Language` on the response for `/`, set with an `<If>` block; matching uses the first entry's primary subtag, same as the preview servers) `.htaccess`: `Accept-Language` redirect for the exact path `/` only (L4, L23, L24): `RewriteCond %{REQUEST_URI} ^/$` + `RewriteCond %{HTTP:Accept-Language} ^en` → `/en/` and `^de` → `/de/` with `[R=302,L]`; `Vary: Accept-Language` on the root response; no match → `index.html` (landing). No `/html/` redirects (L17). `ErrorDocument` stays `/404.html`.
- [x] **M81** (the `<Files>` block is now a `<FilesMatch "^(nixie-clock)\.html$">`, so more names are added to the alternation; a test guards the real file) `.htaccess`: `<Files "nixie-clock.html">` matches the flasher page in every language folder as long as the name is not mapped; a renamed flasher page needs its name added (e.g. `<FilesMatch>`), M46 warns otherwise.
- [x] **M82** (README → Deployment step 4 and the verification list; deleting the folder on the server is U10) Deployment note: delete the old `/html/` folder on the server after the first upload of the new tree (README → Deployment step 4).

### Phase M9 — Tests (`scripts/lib/*.test.mjs`)

- [ ] **M90** `util.test.mjs`: `formatDate` for `de` and `en`.
- [ ] **M91** `render.test.mjs`: `renderNav` with language prefix and `aria-current`; `renderLangSwitch` (current language, paired page via `pages.json`, fallback to home, escaping); `renderCard` link and localized fields; status label mapping; sitemap with language folders and hidden projects; OG locale.
- [ ] **M92** `checks.test.mjs`: orphan pages per language, `lang` mismatch, translation coverage, leftover `html/` links, `TODO` warnings.
- [ ] **M93** Data validation tests (missing default language, unknown language key, `TODO` handling, tag rules per language, `pages.json` rules) if `data.mjs` gets tests.

### Phase M10 — Documentation

- [ ] **M100** `README.md`: outline (new tree, `templates/`, `data/pages.json`, flag icons, `language.md` if kept), Build-time Templating table (`{{lang}}`, `{{langRoot}}`, `{{t:key}}`, `@lang-switch`, alternates), Site Config, Navigation, Data Model (localized fields, `TODO`, status labels), Script Hooks, Project Write-up Template, scaffolding sections (`create`, `page`, `remove`), Open Graph section (`og:locale`, alternates), `.htaccess` (root redirect), Deployment (old `/html/` folder), Decisions (language).
- [ ] **M101** `AGENTS.md`: Language section (content per language, `de` default, translations only on explicit request, L22), Protected Files (legal pages now in `de/`), Directory Responsibilities (`html/` → `<lang>/`, `templates/`, `data/pages.json`), Common Tasks (add a project/page in all languages, add a language), Data rules (localized fields, German status keys, per-language tags).
- [ ] **M102** `todo.md`: note in D1 that it is superseded by this plan.
- [ ] **M103** New “Add a language” recipe in README/AGENTS.md: add the language to `site.json` (with flag), add its block to `strings.json`/`nav.json`/`footer-nav.json`, create `wwwroot/<lang>/`, add project data, extend the `.htaccess` redirect, build.

### Phase M11 — Verification

- [ ] **M110** `npm run build`, `npm run check`, `npm test` pass.
- [ ] **M111** Every page at 320px, 768px, 1280px in both languages; language selector usable by keyboard with visible focus.
- [ ] **M112** Language switch on every page lands on the paired page (or the home per L9); no link leads into the wrong language (except declared cross-language links); the current language is highlighted.
- [ ] **M113** `<html lang>`, `hreflang` alternates, `og:locale`, canonical and `sitemap.xml` correct for sample pages of each language; `TODO` projects hidden in `en`.
- [ ] **M114** DevTools: no console errors, no external requests, no cookies/storage.
- [ ] **M115** After deploy: root redirect (`Accept-Language: de` → `/de/`, `en-GB` → `/en/`, `fr` or none → landing page), `/de/` and `/en/` directory index, 404 page at a deep path (`/en/does-not-exist`), flasher page CSP in both languages, old `/html/` folder gone.

### Phase M20 — User actions

Everything the agents cannot do (texts, decisions, server work). Agents never invent English content (L22); until a task is done, the placeholders stay (`TODO_<German label>` for labels, `TODO` for project texts) and the build warns. IDs use `U` to avoid clashing with the M2x steps.

- [ ] **U01** (M53, M63) Landing page `wwwroot/index.html`: replace the "UNDER CONSTRUCTION" placeholder with the final bilingual text (`lang="de"` / `lang="en"` per block, links to both language homes).
- [ ] **U02** (M51, M58) English labels: replace every `TODO_…` value in `data/strings.json` (`en` block, incl. the status labels; `quoteOpen`/`quoteClose` are already English typographic quotes), `data/nav.json` (`en`), `data/footer-nav.json` (`en`, e.g. with a "(German)" hint while the legal pages are German) and `footerNote.en` in `data/site.json`.
- [ ] **U03** (M58) English page texts in `en/index.html`, `en/about.html`, `en/projects.html`: `title`, `meta description`, headings, lead and body (all `TODO` / `TODO_…` markers).
- [ ] **U04** (M58) English project data in `data/projects.json` for `nixie-clock`, `sy317`, `placeholder-project-two`: `title`, `summary` (now `"TODO"`) and `tags.en` (now `[]`). A project becomes visible in `en` as soon as both texts are filled in.
- [ ] **U05** (M58) English project pages `en/proj/nixie-clock.html`, `sy317.html`, `placeholder-project-two.html`: prose, figure captions, alt texts and the web flasher section of `nixie-clock` (currently a `TODO` skeleton).
- [ ] **U06** (M59) German tags per project: review `tags.de` (they are redefined per language; today they mix English and German words like `electronics`, `tubes`) and decide the English lists for U04.
- [ ] **U07** (L16) English legal pages (`impressum`, `privacy`, `rechtliches`) or keep the German ones: until translated, the build warns "no counterpart in en" for these three pages and the English footer links to the German pages (`"lang": "de"`).
- [ ] **U08** (M60) Review the language selector in the browser (flags, UK flag proportions, highlighted language, 320px) and request style changes if needed.
- [ ] **U09** Before deploying: decide how to handle the placeholder pages in `en/` (they are built and listed in `sitemap.xml`): finish U03 first, or ask for `noindex` on them.
- [ ] **U10** (M82, M115) On the server after the first upload: delete the old `/html/` folder, then run the M115 checks. The `Accept-Language` redirect (M80) is implemented in `.htaccess` but untested on the real server: verify it with the commands in README → Deployment.
- [ ] **U11** Existing, not language-specific: the de pages `about.html` and the `placeholder-project-*` pages still contain "Placeholder paragraph" text (build warnings), and `assets/img/og-default.png` is missing.

### Open follow-ups caused by the move

README sections beyond the outline, the script documentation and the file paths, and `AGENTS.md` beyond the script rows and file paths, follow in M100/M101. The preview servers and `.htaccess` both mirror the root redirect; the latter is untested on the real server (U10). Known, not caused by the move: a page created from the template contains the dummy web flasher section (`assets/firmware/dummy` is not deployed), so `npm run build` reports a broken link until that section is deleted.

---

## Risks and Notes

- **Protected files**: moving the legal pages to `de/` is approved (L16); their wording stays untouched.
- **Content**: no English text may be invented (AGENTS.md, L22). Until the user supplies it, `en/` pages and data carry `TODO` placeholders and stay hidden (L20, L30).
- **Root redirect**: must use `302` and `Vary: Accept-Language` so browsers and caches do not pin one language to `/`; crawlers usually send no `Accept-Language` and get the landing page, which matches `x-default`.
- **Sitemap `lastmod`**: `git mv` keeps the history, so `gitLastModified` keeps working; a copy-and-delete would reset it.
- **Cache busting**: unaffected; assets stay at the root and are referenced via `{{root}}`.
- **CSP**: unaffected; the flasher exception is detected per page content and works in every language folder.
- **Anchors and ids**: translated pages must keep unique ids; `checkAnchors` covers this.
- **Scope**: the build extension (new tokens, directive, `pages.json`, checks, redirect) is approved (L32); anything beyond this plan needs a new approval.
- **Mapped project pages** (L31): the flasher CSP exception in `.htaccess`, `serve.mjs` and `dev.mjs` is keyed by file name today; renamed flasher pages must be covered (M46, M74, M81).
