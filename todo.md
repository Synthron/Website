# todo.md — Open Work

Open tasks only: finished items are deleted, not ticked. Every item has an ID: `Uxx` items need content, decisions or server access from the owner (agents skip them and ask instead, see `AGENTS.md` → Workflow); `Axx` items are agent tasks. IDs are never reused; new items take the next free number. Background on finished features and standing decisions is in [`README.md`](README.md).

## Content (User)

Agents never write or translate site content. The build warns about every leftover placeholder (`TODO`, `TODO_…`, "Placeholder paragraph").

- [x] **U01** `de/proj/nixie-clock.html`: replace the "Placeholder paragraph" overview and fill in or remove the empty "Hardware" section; set `image` in `data/projects.json` (currently `assets/img/placeholder.svg`).
- [x] **U02** `de/ham/t2lt.html`, `en/ham/t2lt.html`: replace the template placeholder sections with the real write-up. Check the German summary in `data/ham.json` ("7m/70cm", probably "2m/70cm").
- [x] **U03** English pages `en/index.html`, `en/projects.html`, `en/hamradio.html`: `title`, `meta description`, headings, lead and body (all `TODO` / `TODO_…` markers).
- [ ] **U04** English project pages `en/proj/nixie-clock.html`, `en/proj/sy317.html`: prose, figure captions, alt texts and the web flasher section of `nixie-clock`.
- [ ] **U05** Before the first deploy: finish the English pages above, or ask for `noindex` on the remaining placeholder pages (they are built and listed in `sitemap.xml`).
- [ ] **U06** `de/proj/sy317.html`: the schematic `img` (`sy317_sch.png`) has the alt text "Placeholder: wide project screenshot"; typos "Schalplan" (caption) and "Nichtbestückun".
- [x] **U07** `404.html`: title and `h1` say "418 I'm a teapot" although it is served for 404/403 and nothing states that the page was not found; the prose uses `<br>` for spacing and keeps a commented-out paragraph. Decide on the wording.

## Deployment (User)

- [ ] **U08** First upload of the language layout: delete the old `/html/` folder on the server.
- [ ] **U09** After the deploy, verify on `dm7wb.de` (commands in README → Deployment): root redirect (`Accept-Language: de` → `/de/`, `en-GB` → `/en/`, `fr` or none → landing page, `Vary: Accept-Language`), `/de/` and `/en/` directory index, English 404 page at a deep path (`/en/does-not-exist`), flasher CSP header on `nixie-clock.html` in both languages, `/html/` returns 404.
- [ ] **U10** Once the `Strict-Transport-Security` header is confirmed live, raise its `max-age` in `wwwroot/.htaccess` (currently `86400`).

## Fixes (code analysis 2026-10-28)

- [ ] **A05** `de/proj/sy317.html`: the schematic `img` has no `width`/`height` (layout shift); `npm run images` would create `sy317_render.webp` (73.6 KB → 36.3 KB), then switch the reference.

## Release Checks

- [ ] **A15** `npm run lighthouse`: accessibility and performance ≥ 95.
- [ ] **A16** Manual W3C validator check (validator.w3.org/nu) of the built HTML and CSS.
- [ ] **A17** Manual keyboard pass over every page type: focus order, mobile menu (toggle, Escape), language selector, tag filter. `npm run test:e2e` already checks visible focus.

## Tests

- [ ] **A18** Optional: e2e check in `scripts/e2e/` that the ham tag filter on `hamradio.html` hides and shows list items.

## Tooling (User)

- [x] **U11** Optional: install the Playwright browser once (`npx playwright install chromium`); until then run `npm run test:e2e` with `$env:PLAYWRIGHT_CHANNEL='msedge'`.
