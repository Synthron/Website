# todo.md — Open Work

Open tasks only: finished items are deleted, not ticked. Items marked **User** need content, decisions or server access from the owner; agents skip them and ask instead (see `AGENTS.md` → Workflow). Background on finished features and standing decisions is in [`README.md`](README.md).

## Content (User)

Agents never write or translate site content. The build warns about every leftover placeholder (`TODO`, `TODO_…`, "Placeholder paragraph").

- [ ] **User** `de/proj/nixie-clock.html`: replace the "Placeholder paragraph" overview and fill in or remove the empty "Hardware" section; set `image` in `data/projects.json` (currently `assets/img/placeholder.svg`).
- [ ] **User** `de/ham/t2lt.html`, `en/ham/t2lt.html`: replace the template placeholder sections with the real write-up. Check the German summary in `data/ham.json` ("7m/70cm", probably "2m/70cm").
- [ ] **User** English pages `en/index.html`, `en/projects.html`, `en/hamradio.html`: `title`, `meta description`, headings, lead and body (all `TODO` / `TODO_…` markers).
- [ ] **User** English project pages `en/proj/nixie-clock.html`, `en/proj/sy317.html`: prose, figure captions, alt texts and the web flasher section of `nixie-clock`.
- [ ] **User** Before the first deploy: finish the English pages above, or ask for `noindex` on the remaining placeholder pages (they are built and listed in `sitemap.xml`).

## Deployment (User)

- [ ] **User** First upload of the language layout: delete the old `/html/` folder on the server.
- [ ] **User** After the deploy, verify on `dm7wb.de` (commands in README → Deployment): root redirect (`Accept-Language: de` → `/de/`, `en-GB` → `/en/`, `fr` or none → landing page, `Vary: Accept-Language`), `/de/` and `/en/` directory index, English 404 page at a deep path (`/en/does-not-exist`), flasher CSP header on `nixie-clock.html` in both languages, `/html/` returns 404.
- [ ] **User** Once the `Strict-Transport-Security` header is confirmed live, raise its `max-age` in `wwwroot/.htaccess` (currently `86400`).

## Release Checks

- [ ] `npm run lighthouse`: accessibility and performance ≥ 95.
- [ ] Manual W3C validator check (validator.w3.org/nu) of the built HTML and CSS.
- [ ] Manual keyboard pass over every page type: focus order, mobile menu (toggle, Escape), language selector, tag filter. `npm run test:e2e` already checks visible focus.

## Tests

- [ ] Optional: e2e check in `scripts/e2e/` that the ham tag filter on `hamradio.html` hides and shows list items.

## Tooling (User)

- [ ] **User** Optional: install the Playwright browser once (`npx playwright install chromium`); until then run `npm run test:e2e` with `$env:PLAYWRIGHT_CHANNEL='msedge'`.
