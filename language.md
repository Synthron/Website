# Multilingual Website (German / English) — Planning

Status: **Draft / no code written yet.** This document collects the options, the open decisions, a step-by-step implementation plan, feasibility considerations and the answer to the "cookies?" question. It is a planning aid only; nothing here is implemented.

---

## 1. Goal

Make the site bilingual — **German (primary) and English** — with:

1. **Automatic language detection** from the visitor's browser settings on first load.
2. A **language selector in the header** so the visitor can switch manually.
3. The manual choice **persisting across pages** (and ideally across visits).

The feature must respect the project's hard constraints: pure static HTML/CSS/vanilla JS, no runtime `fetch`, no cookies, no third-party assets, strict CSP, minimal design, and the project's own verification rule that the browser shows **no cookies and no storage entries**.

---

## 2. Current State (how language works today)

Language is currently a **single, build-time constant**:

- `data/site.json` → `"lang": "de"` drives `<html lang="{{lang}}">` and `formatDate()`.
- `data/strings.json` → German UI labels (count words, buttons, aria labels) rendered into pages and exposed to `js/projects.js` via `data-*` attributes.
- `data/nav.json` / `data/footer-nav.json` → German nav labels.
- `data/projects.json` → German `title`, `summary`, `status`, `tags`.
- Page bodies in `wwwroot/html/**` are written in German.
- The build (`scripts/build.mjs`) loads **one** site/nav/footerNav/projects/strings set and renders **one** output tree into `dist/`.

Relevant build mechanics that a multilingual build must reuse or extend:

- `{{root}}` is computed from the page's directory depth in [`scripts/build.mjs`](scripts/build.mjs:106), so pages placed under a `de/` or `en/` subdirectory automatically get correct relative links.
- `{{lang}}`, `{{name}}`, `{{year}}`, `{{footerNote}}`, `{{email}}` come from `data/site.json` via [`applyTokens`](scripts/lib/pipeline.mjs:39).
- `@nav`, `@footer-nav`, `@projects`, `@tag-filter`, `@project-header` render from the loaded data in [`applyDirectives`](scripts/lib/pipeline.mjs:62).
- `formatDate(value, locale)` in [`scripts/lib/util.mjs`](scripts/lib/util.mjs:85) already takes a locale.
- Open Graph `og:locale` is derived from `site.lang` in [`renderOpenGraph`](scripts/lib/render.mjs:113).
- The CSP in [`partials/head.html`](wwwroot/partials/head.html:3) is `default-src 'self'` with **no inline scripts allowed** (only flasher pages get a `style-src` exception). Any client-side detection must therefore be an **external** module, not an inline `<script>`.

---

## 3. Feasibility: is it achievable without cookies?

**Yes — fully achievable without cookies, and even without any browser storage.**

The project's own verification step ("no cookies or storage entries") makes the cleanest approach the **URL-based** one:

- The chosen language lives in the **URL path** (`/de/…` vs `/en/…`), so it persists across navigation naturally and is shareable/bookmarkable — no storage of any kind is needed.
- **Auto-detection** on first load is done **server-side** by Apache reading the `Accept-Language` header (cookie-free, no JS, no FOUC), or — if a client-side fallback is wanted — by a small **external** module (CSP-compliant) that reads `navigator.language` and redirects only when no language is present in the URL.
- The **selector** is just a pair of static links to the same page in the other language — no JavaScript required.

Why not `localStorage` for remembering the choice: although the AGENTS.md constraint only forbids storage *for tracking*, the project's own **Verification** step explicitly checks for "no cookies or storage entries" in DevTools. Using `localStorage` would trip that check and contradict the "no storage" spirit. The URL-based approach avoids the question entirely. (This is a decision to confirm — see §6.)

---

## 4. Options for the content structure

### Option A — Per-language subdirectories (recommended)

The build renders two parallel trees: `dist/de/…` and `dist/en/…`. Each page exists once per language. The selector links between the two.

- **Pros:** Fully static and pre-rendered (matches the project philosophy), best SEO (`hreflang`, per-language canonical, per-language sitemap), no runtime content loading, works without JS, `{{root}}` already handles the extra depth, clean separation of translations.
- **Cons:** Content is duplicated per language (must be maintained in two places); the build must loop over languages; every data file and page body needs a translation.

### Option B — Single page, runtime translation via JS (rejected)

One HTML per page; a JS module swaps text from an embedded dictionary.

- **Cons:** Violates "everything is pre-rendered / no runtime content loading"; poor SEO (search engines see only the default language); needs the full dictionary shipped to every visitor; more JS and more failure modes; contradicts the minimal, static design. **Not recommended.**

### Option C — Query parameter `?lang=en` (rejected)

- **Cons:** Static pages cannot vary by query string without JS; not shareable cleanly; poor for SEO; requires JS to rewrite links. **Not recommended.**

**Recommendation: Option A.**

---

## 5. Options for browser-language detection

### Option A — Server-side (Apache, recommended)

Add rules to `wwwroot/.htaccess` that redirect the root (`/` and `/index.html`) to `/de/` or `/en/` based on the `Accept-Language` header, with a German default. Add `Vary: Accept-Language` so caches do not serve the wrong redirect.

- **Pros:** Cookie-free, no JS, no flash of wrong language, works for crawlers and no-JS visitors, CSP untouched.
- **Cons:** Only applies on Apache (not in `npm run serve`); needs the language subdirectories to exist; must be tested on the production server.

### Option B — Client-side (external module)

A small external module (e.g. `js/lang.js`, loaded in `partials/head.html`) reads `navigator.language` and, if the URL has no language segment, redirects to the matching language path.

- **Pros:** Works in `npm run serve` too; no server config.
- **Cons:** Requires an external script (CSP `'self'` allows it), causes a redirect + possible flash, does nothing for no-JS visitors, and adds a tiny bit of JS. Should be a **fallback** only, not the primary mechanism.

**Recommendation:** Server-side detection as primary, with the client-side module as an optional fallback for the local dev server. (Decision to confirm — see §6.)

---

## 6. Decisions to make

Decisions for the multilingual feature, answered by the user on 2026-10-25. Recommended option in **bold**. New questions that come up during implementation get the next free ID (D13 …).

| ID  | Question                                                                                                                | Options                                                                                                                                                                                                                         | Answer |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| D1  | Which content structure for the two languages?                                                                          | **Per-language subdirectories `/de/`, `/en/`** (Option A) · Single page, runtime JS translation (Option B) · Query parameter `?lang=` (Option C)                                                                                | Option A       |
| D2  | Which language is the default / fallback for visitors with an unrecognised or missing `Accept-Language`?                | **German** (matches current `lang: "de"`) · English · no default (always show the selector)                                                                                                                                     | Default German       |
| D3  | How is the browser language detected on first load?                                                                     | **Server-side Apache redirect (primary)** · Client-side external module (fallback) · Both · Neither (manual only)                                                                                                               | Server Side       |
| D4  | How does the manual language choice persist across pages and visits?                                                    | **URL-based (language in the path, no storage)** · `localStorage`/`sessionStorage` for the preference only (trips the "no storage entries" verification) · No persistence                                                       | URL Based       |
| D5  | How are the per-language data files laid out?                                                                           | **Separate files per language** (`strings.de.json`/`strings.en.json`, `nav.de.json`/`nav.en.json`, `footer-nav.de.json`/`footer-nav.en.json`, `site.de.json`/`site.en.json`) · Single file with `{ "de": …, "en": … }` keys     | seperate files per language       |
| D6  | How are `title`/`summary`/`status`/`tags` translated in `data/projects.json`?                                           | **Add `title_en`/`summary_en`/`status_en` fields, keep `tags` shared** (tags are lowercase-hyphenated identifiers, likely language-neutral) · Separate `projects.en.json` · Other                                               | add *_en fields, also ass tags_en, english rpoject page should filter for english tags       |
| D7  | Where does the translated page prose live?                                                                              | **One file per language under `html/de/…` and `html/en/…`** · One source page with per-language blocks · Other                                                                                                                  | one file per language       |
| D8  | Where and how is the language selector rendered?                                                                        | **Small `DE \| EN` link group in the header (`partials/header.html`), rendered by a new `@lang-switch` directive, plain links (no JS)** · Also in the footer · Dropdown/`<select>` (needs JS) · Other                           | small selector group in header, maybe with language flag symbols instead or in addition to GER/EN       |
| D9  | How is SEO handled for the two languages?                                                                               | **Per-language canonical + `hreflang` alternates, `og:locale:alternate`, one combined sitemap with `hreflang`** · One sitemap per language · No `hreflang` (accept duplicate-content risk)                                      | per-language canonical       |
| D10 | How does the 404 page behave for `/de/…` vs `/en/…`?                                                                    | **Root-relative links as today, single 404 page** · Language-aware 404 (serve the matching language's 404) · Other                                                                                                              | only one 404, same as today (root-relative)       |
| D11 | Are the scaffolding scripts (`npm run create` / `npm run page` / `npm run remove`) updated to write per-language data?  | **Yes, update them** · Defer until the build is multilingual · No (manual edits only)                                                                                                                                           | have to be updated       |
| D12 | Who provides the English translations (UI strings, nav labels, project fields, page bodies)?                            | **User-provided** (AGENTS.md: never invent page text) · Agent drafts placeholders marked as such, user reviews · Other                                                                                                          | user provides       |

---

## 7. Step-by-step implementation plan

### Phase 1 — Data model
1. Add per-language data files (D5: separate files per language): `data/strings.en.json`, `data/nav.en.json`, `data/footer-nav.en.json`, `data/site.en.json` (with `lang: "en"`, English `name`/`footerNote`/`email` as needed). Keep the existing `*.json` as the German set (optionally rename to `*.de.json` for symmetry).
2. Extend `data/projects.json` with per-language fields (D6): `title_en`, `summary_en`, `status_en` **and `tags_en`** — English tags are separate, not shared. The English project page and its tag filter use `tags_en`.
3. Update `scripts/lib/data.mjs` loaders to accept a language and validate the per-language fields (mirror the existing validation, e.g. `STRING_KEYS`, `REQUIRED_PROJECT_FIELDS`, `STATUS_VALUES`; validate `tags_en` like `tags`).

### Phase 2 — Build pipeline
4. Refactor `scripts/build.mjs` to **loop over languages** (`['de', 'en']`), loading the per-language site/nav/footerNav/projects/strings and rendering each page into `dist/<lang>/…`.
5. Verify `{{root}}` is correct for the extra depth (it is computed from depth in [`build.mjs`](scripts/build.mjs:106) — confirm with a build).
6. Make `{{lang}}`, `{{name}}`, `{{year}}`, `{{footerNote}}`, `{{email}}` resolve from the per-language `site` object (already the case via `applyTokens` once `ctx.site` is per-language).
7. Pass the per-language `strings` and `lang` into `@nav`, `@footer-nav`, `@projects`, `@tag-filter`, `@project-header`; make `renderCard`/`renderTagFilter` use the per-language tags (`tags` for German, `tags_en` for English) so the English filter works on English tags (D6).
8. Add a new directive `@lang-switch` that renders the selector links pointing to the same page in the other language, using the current `rel` and the language list. Document it in `README.md` (per AGENTS.md rule).
9. Add `@lang-switch` to `partials/header.html`. The selector shows `DE | EN` text; optionally add small flag SVG icons (`assets/icons/`) in addition to or instead of the text (D8 — confirm the flag choice).

### Phase 3 — Detection & selector
10. Add Apache rules to `wwwroot/.htaccess` (D3: server-side): redirect `/` and `/index.html` to `/de/` or `/en/` based on `Accept-Language`, German default (D2), plus `Vary: Accept-Language`. Test on the production server.
11. No client-side detection module (D3: server-side only). Note: `npm run serve` will not redirect; manual navigation covers local preview.

### Phase 4 — SEO
12. Update `renderOpenGraph` to emit per-language canonical, `og:locale` per language and `og:locale:alternate` for the other language (D9).
13. Update `renderSitemap` to list both languages with `xhtml:link rel="alternate" hreflang` alternates in one combined sitemap (D9); update the `robots.txt` `Sitemap:` line accordingly.
14. Confirm `html lang` is correct per language (via `{{lang}}`).

### Phase 5 — Scripts & checks
15. Update `npm run create` / `npm run page` / `npm run remove` to write per-language data (D11: they have to be updated).
16. Update `scripts/lib/checks.mjs` (`checkLinks`, `checkOrphanPages`, `checkPlaceholderText`, `checkHtmlRules`) to run per language and to understand the language subdirectories.
17. Update/extend the unit tests in `scripts/lib/*.test.mjs` for the new loaders, the `@lang-switch` renderer and the per-language build.

### Phase 6 — Content & verification
18. Obtain the English translations from the user (D12) and fill `strings.en.json`, `nav.en.json`, `footer-nav.en.json`, `site.en.json`, the project `*_en` fields (incl. `tags_en`), and the `html/en/…` page bodies.
19. Run `npm run build`, `npm run check`, `npm test` — all must pass.
20. `npm run serve` and test at 320px / 768px / 1280px; verify the selector, detection, and both languages.
21. DevTools: no console errors, no external requests, **no cookies, no storage entries**.
22. Deploy `dist/` and verify the Apache detection rules and headers on the production server.

---

## 8. Impact on existing systems

| Area | Impact |
| --- | --- |
| `scripts/build.mjs` | Loop over languages; per-language data + output tree. |
| `scripts/lib/data.mjs` | Language-aware loaders + validation of per-language fields. |
| `scripts/lib/pipeline.mjs` | New `@lang-switch` directive; per-language `ctx.site`/`strings`. |
| `scripts/lib/render.mjs` | `@lang-switch` renderer; per-language OG + sitemap with `hreflang`. |
| `scripts/lib/checks.mjs` | Run per language; understand `de/`/`en/` subdirs. |
| `scripts/lib/*.test.mjs` | New tests for loaders, `@lang-switch`, per-language build. |
| `scripts/create.mjs`, `page.mjs`, `remove.mjs` | Write per-language data (or defer). |
| `wwwroot/partials/header.html` | Add `@lang-switch` selector (DE/EN, optional flags). |
| `wwwroot/partials/head.html` | Unchanged (D3: server-side detection only, no client-side module). |
| `wwwroot/assets/icons/` | Optional flag SVGs for the selector (D8). |
| `wwwroot/data/*` | Per-language files + project `*_en` fields (incl. `tags_en`). |
| `wwwroot/html/**` | Per-language page bodies. |
| `wwwroot/.htaccess` | `Accept-Language` redirect + `Vary: Accept-Language`. |
| `wwwroot/robots.txt` | `Sitemap:` line(s) for both languages. |
| `wwwroot/404.html` | Unchanged (single root-relative 404, D10). |
| `dist/sitemap.xml` | Both languages + `hreflang` alternates. |
| `README.md` | Document the new directive, data layout and build behaviour (required by AGENTS.md). |

---

## 9. Risks & considerations

- **Content duplication:** Every page and data field exists twice. Mitigate with the per-language file layout and by keeping translations in one obvious place per language.
- **Tag duplication:** `tags_en` duplicates the tag list per language (D6); the English filter must use `tags_en`, and both lists must stay in sync with the project's content.
- **`{{root}}` depth:** Must be verified after moving pages under `de/`/`en/`; the existing depth-based computation should handle it, but a build check is required.
- **CSP:** No inline scripts allowed. Server-side detection (D3) avoids any client-side script entirely.
- **Apache-only detection:** `npm run serve` will not do the redirect (D3: server-side only); manual navigation covers local preview. Production behaviour must be tested after deploy.
- **Caching:** The `Accept-Language` redirect must be served with `Vary: Accept-Language` to avoid wrong-language responses from caches.
- **SEO:** Without `hreflang` and per-language canonicals, search engines may treat the two languages as duplicate content. Phase 4 addresses this.
- **Verification rule:** The project checks for "no cookies or storage entries". The URL-based approach keeps this green; do not introduce `localStorage` without revisiting that rule.
- **Selector flags:** if flag SVGs are used (D8), keep them small and decorative (`alt=""`); confirm the flag choice before adding assets.
- **Translations are user content:** English texts must come from the user (AGENTS.md: never invent page text). The plan assumes the user provides them.

---

## 10. Bottom line

- **Achievable without cookies: yes**, and even without any browser storage, by making the language part of the URL (`/de/` vs `/en/`) and detecting the browser language server-side via `Accept-Language`.
- **Recommended approach (confirmed in §6):** per-language subdirectories (Option A), separate per-language data files, per-language project fields incl. `tags_en`, a `@lang-switch` header selector (DE/EN, optional flags), server-side detection only, per-language canonical + `hreflang` + one combined sitemap, and a single root-relative 404.
- **Next step:** decisions D1–D12 are resolved (see §6). Implement Phase 1 → Phase 6.
