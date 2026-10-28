# todo.md — Open Work

Open tasks only: finished items are deleted, not ticked. Every item has an ID: `Uxx` items need content, decisions or server access from the owner (agents skip them and ask instead, see `AGENTS.md` → Workflow); `Axx` items are agent tasks. IDs are never reused; new items take the next free number. Background on finished features and standing decisions is in [`README.md`](README.md).

## Content (User)

Agents never write or translate site content. The build warns about every leftover placeholder (`TODO`, `TODO_…`, "Placeholder paragraph").

- [ ] **U01** `de/proj/nixie-clock.html`: replace the "Placeholder paragraph" overview and fill in or remove the empty "Hardware" section; set `image` in `data/projects.json` (currently `assets/img/placeholder.svg`).
- [ ] **U02** `de/ham/t2lt.html`, `en/ham/t2lt.html`: replace the template placeholder sections with the real write-up. Check the German summary in `data/ham.json` ("7m/70cm", probably "2m/70cm").
- [ ] **U03** English pages `en/index.html`, `en/projects.html`, `en/hamradio.html`: `title`, `meta description`, headings, lead and body (all `TODO` / `TODO_…` markers).
- [ ] **U04** English project pages `en/proj/nixie-clock.html`, `en/proj/sy317.html`: prose, figure captions, alt texts and the web flasher section of `nixie-clock`.
- [ ] **U05** Before the first deploy: finish the English pages above, or ask for `noindex` on the remaining placeholder pages (they are built and listed in `sitemap.xml`).
- [ ] **U06** `de/proj/sy317.html`: the schematic `img` (`sy317_sch.png`) has the alt text "Placeholder: wide project screenshot"; typos "Schalplan" (caption) and "Nichtbestückun".
- [ ] **U07** `404.html`: title and `h1` say "418 I'm a teapot" although it is served for 404/403 and nothing states that the page was not found; the prose uses `<br>` for spacing and keeps a commented-out paragraph. Decide on the wording.

## Deployment (User)

- [ ] **U08** First upload of the language layout: delete the old `/html/` folder on the server.
- [ ] **U09** After the deploy, verify on `dm7wb.de` (commands in README → Deployment): root redirect (`Accept-Language: de` → `/de/`, `en-GB` → `/en/`, `fr` or none → landing page, `Vary: Accept-Language`), `/de/` and `/en/` directory index, English 404 page at a deep path (`/en/does-not-exist`), flasher CSP header on `nixie-clock.html` in both languages, `/html/` returns 404.
- [ ] **U10** Once the `Strict-Transport-Security` header is confirmed live, raise its `max-age` in `wwwroot/.htaccess` (currently `86400`).

## Fixes (code analysis 2026-10-28)

- [ ] **A01** `npm run lint:html` fails (and with it `npm run lint` and the pre-commit hook): two unlabelled `<aside class="callout">` per page violate `unique-landmark`. Source: `templates/project-template.html` section 6, copied into `de/ham/t2lt.html` and `en/ham/t2lt.html`. Fix the template (e.g. `aria-label` per callout or a non-landmark element) and the two pages.
- [ ] **A02** `scripts/e2e/language.spec.mjs` (line 110) counts cards on `${code}/projects.html`, ignoring `data/pages.json` (`de/projekte.html`): the test fails for `de` (expected 2, received 0).
- [ ] **A03** `lighthouserc.json`: stale URLs `de/projects.html`, `de/privacy.html` and `de/proj/placeholder-project-two.html` (do not exist; use `de/projekte.html`, `de/datenschutz.html`); English pages, `hamradio.html` and `ham/t2lt.html` are not audited.
- [ ] **A04** `de/proj/sy317.html` line 20: `aria-labelledby="layout-split"` points to a missing id (the `h2` has `id="layout-small"`). Add a build check in `scripts/lib/checks.mjs` that `aria-labelledby`/`aria-describedby` reference existing ids (README → Language Checks / templating docs).
- [ ] **A05** `de/proj/sy317.html`: the schematic `img` has no `width`/`height` (layout shift); `npm run images` would create `sy317_render.webp` (73.6 KB → 36.3 KB), then switch the reference.
- [ ] **A06** Leftover-placeholder check (`scripts/lib/checks.mjs` line 202) only matches "Placeholder paragraph"; `TODO` / `TODO_…` markers in pages (e.g. `en/index.html`, `en/projects.html`, `en/hamradio.html`) are not reported, contrary to README → Placeholders.
- [ ] **A07** `scripts/lib/render.mjs` line 163: `text()` in `renderOpenGraph` replaces each character by itself (entity decoding lost), so a title or description containing `&`, `<`, `>` or `"` ends up double-escaped (`&amp;amp;`) in `og:title`/`og:description`. Decode the entities and add a unit test.
- [ ] **A08** `scripts/dev.mjs` line 118: `decodeURIComponent` runs outside the `try`; a malformed URL (`/%E0%A4%A`) rejects the request handler and can crash the dev server (`serve.mjs` handles it).
- [ ] **A09** `scripts/page.mjs` lines 29–39: title and description from the CLI are inserted into the HTML unescaped; use `esc()`.
- [ ] **A10** `scripts/lib/checks.mjs` line 86: firmware `parts[].path` may contain `../` or be absolute and still pass; restrict it to the suite folder.
- [ ] **A11** `scripts/lib/render.mjs` `renderSitemap`: `<loc>` values are not XML-escaped (the `url` schema allows `&`).
- [ ] **A12** `scripts/lib/scaffold.mjs` has no unit tests (`AGENTS.md`: every `scripts/lib/` module has `*.test.mjs`).
- [ ] **A13** README outline: `scripts/e2e/language.spec.mjs` and `wwwroot/assets/img/og-default.png` are missing.
- [ ] **A14** README → Tooling Packages says the JSON schemas are mapped in `.vscode/settings.json`, but `.gitignore` excludes that file, so the mapping is not shared. Un-ignore it or adjust the README.

## Release Checks

- [ ] **A15** `npm run lighthouse`: accessibility and performance ≥ 95.
- [ ] **A16** Manual W3C validator check (validator.w3.org/nu) of the built HTML and CSS.
- [ ] **A17** Manual keyboard pass over every page type: focus order, mobile menu (toggle, Escape), language selector, tag filter. `npm run test:e2e` already checks visible focus.

## Tests

- [ ] **A18** Optional: e2e check in `scripts/e2e/` that the ham tag filter on `hamradio.html` hides and shows list items.

## Tooling (User)

- [ ] **U11** Optional: install the Playwright browser once (`npx playwright install chromium`); until then run `npm run test:e2e` with `$env:PLAYWRIGHT_CHANNEL='msedge'`.
