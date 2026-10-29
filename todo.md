# todo.md — Open Work

Open tasks only: finished items are deleted, not ticked. Every item has an ID: `Uxx` items need content, decisions or server access from the owner (agents skip them and ask instead, see `AGENTS.md` → Workflow); `Axx` items are agent tasks. IDs are never reused; new items take the next free number. Background on finished features and standing decisions is in [`README.md`](README.md).

## Content (User)

Agents never write or translate site content. The build warns about every leftover placeholder (`TODO`, `TODO_…`, "Placeholder paragraph").


## Deployment (User)


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
- AFU
  - [ ] QMX Tuner
  - [ ] QMX 10W Upgrade
  - [ ] QMX Mikro Kapsel
  - [ ] 5+8ele Yagi und SCAD Teile
  - [ ] Signal Stick
  - [ ] Endfed?
  - [ ] SCAD Balun-Gehäuse (WIP)
