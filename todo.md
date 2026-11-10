# todo.md — Open Work

Open tasks only: finished items are deleted, not ticked. Every item has an ID: `Uxx` items need content, decisions or server access from the owner (agents skip them and ask instead, see `AGENTS.md` → Workflow); `Axx` items are agent tasks. IDs are never reused; new items take the next free number. Background on finished features and standing decisions is in [`README.md`](README.md).

## Content (User)

Agents never write or translate site content. The build warns about every leftover placeholder (`TODO`, `TODO_…`, "Placeholder paragraph").

- [x] **U15** Translate `en.feedDescription` in `data/strings.json` (channel description of `en/feed.xml`; currently `TODO_…`) and check the German one.

## Deployment (User)

- [ ] **U12** Next deploy: delete the stale `de/ham/` folder on the server (German ham pages moved to `de/afu/`, no redirects).
- [ ] **U17** After the next deploy: check that `https://dm7wb.de/de/feed.xml` and `/en/feed.xml` load, carry `Cache-Control: no-cache` and validate (e.g. validator.w3.org/feed).

## Release Checks

- [ ] **A16** Manual W3C validator check (validator.w3.org/nu) of the built HTML and CSS.
- [ ] **A17** Manual keyboard pass over every page type: focus order, mobile menu (toggle, Escape), language selector, tag filter. `npm run test:e2e` already checks visible focus.

## Tests

- [ ] **A18** Optional: e2e check in `scripts/e2e/` that the ham tag filter on `hamradio.html` hides and shows list items.

## Topics (User)

### General Projects

| Project                    | Page created | Page written | Page translated |
| -------------------------- | :----------: | :----------: | :-------------: |
| DCF77 Uhr                  | [x]          | [ ]          | [ ]             |
| SynPLC (mit Unterseiten)   | [x]          | [ ]          | [ ]             |
| ↳ CPU                      | [x]          | [ ]          | [ ]             |
| ↳ DI                       | [ ]          | [ ]          | [ ]             |
| ↳ DO                       | [ ]          | [ ]          | [ ]             |
| ↳ AI                       | [ ]          | [ ]          | [ ]             |
| ↳ AO                       | [ ]          | [ ]          | [ ]             |
| ↳ XT                       | [ ]          | [ ]          | [ ]             |
| ModLab (mit Unterseiten)   | [x]          | [ ]          | [ ]             |
| ↳ Main                     | [x]          | [ ]          | [ ]             |
| ↳ LNT                      | [ ]          | [ ]          | [ ]             |
| ↳ SMPS                     | [ ]          | [ ]          | [ ]             |
| ↳ Function Generator       | [ ]          | [ ]          | [ ]             |
| ↳ Load                     | [ ]          | [ ]          | [ ]             |
| ↳ Diode Tester             | [ ]          | [ ]          | [ ]             |
| Röhrenverstärker 6L6       | [x]          | [ ]          | [ ]             |
| Gitarrenverstärker         | [x]          | [ ]          | [ ]             |
| Modular 6502               | [ ]          | [ ]          | [ ]             |
| Plantomation               | [ ]          | [ ]          | [ ]             |
| 3D-Drucker?                | [ ]          | [ ]          | [ ]             |

### AFU

| Project                    | Page created | Page written | Page translated |
| -------------------------- | :----------: | :----------: | :-------------: |
| Moxon Dual Band            | [x]          | [x]          | [x]             |
| QMX Mikro Kapsel           | [x]          | [ ]          | [ ]             |
| 5+8ele Yagi und SCAD Teile | [ ]          | [ ]          | [ ]             |
| Endfed mit Spule           | [x]          | [ ]          | [ ]             |
| QMX Tuner                  | [ ]          | [ ]          | [ ]             |
| QMX 10W Upgrade            | [ ]          | [ ]          | [ ]             |
| Signal Stick               | [ ]          | [ ]          | [ ]             |
| SCAD Balun-Gehäuse (WIP)   | [ ]          | [ ]          | [ ]             |
