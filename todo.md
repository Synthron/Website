# todo.md — Remaining Open Work

Open work after the step-by-step plan (S01–S73) and the tooling integration (README → Phase 6). Finished and dropped steps are removed; their IDs (S-numbers) stay reserved because code comments still reference them.

> Note: `todo.md` is intentionally kept outside the README outline (D17) and will be deleted at the user's discretion. The decision record below keeps only decisions that still guide the work or are referenced by code comments, the README or `language.md`; removed IDs stay reserved. New questions get the next free ID (D28 …).

---

## Decision Record

Recommended option in **bold**.

| ID  | Question | Options| Answer |
| --- | -------- | ------ | ------ |
| D1  | Which language is the site (content + UI strings)? | **German content and German UI** · German content, English UI · English everything  | German Content and German UI. **Superseded** by [`language.md`](language.md): German (default) and English, content and UI strings per language |
| D6  | What happens with `placeholder-project-two`?| **Delete it** · Keep it as `draft` (needs step S36) · Keep it as is | Keep it as is for now  |
| D10 | Allowed values for `status`?| **`active`, `finished`, `paused`, `archived`** · other list  | **`in Arbeit`, `fertig`, `pausiert`, `veraltet`, `Konzept`, `abgebrochen`**|
| D13 | Should new HTML rule checks (one `h1`, `alt`, no inline styles …) fail the build or only warn? | **Fail** · Warn  | Fail|
| D16 | Add a GitHub Actions build check?  | **Yes, build check on push/PR** · Yes, plus deploy · No| No  |
| D17 | Keep `todo.md` after the plan is done?| **Merge open items into the README todo list and delete it** · Keep it and add it to the outline | Keep it without adding to the outline, will be deleted at users discretion |
| D18 | Is the Cloudflare proxy (orange cloud) active for `dm7wb.de`, and which SSL mode? The live check shows `Server: Apache` and no `cf-ray` header, i.e. DNS only. | **DNS only (matches the live check)** · Proxied, SSL "Full (strict)" · Proxied, SSL "Flexible"| DNS only (matches the live check)|
| D20 | Nixie page (S22): what goes into "Overview" and "Hardware", and is there a project image?| Provide text + image · Remove the empty sections for now  | still work in progress, will be filled out by user  |
| D21 | Template for `npm run page` (S43)? | **Minimal (head, header, `h1`, prose, footer)** · Copy of `about.html` | Minimal (head, header, `h1`, prose, footer)|
| D22 | Which chip families should `npm run firmware` support (S44)?| **ESP32 only (extend later)** · ESP32 + S2/S3/C3 | ESP32 + S2/S3/C3 |
| D24 | Source for `sitemap.xml` `lastmod` of non-project pages (S63)? | **Last git commit date of the source file** · File mtime (changes on every checkout) · None  | Last git commit date of the source file, should be updated on npm run build automatically  |
| D25 | Default Open Graph share image (S64)? OG images must be raster (PNG/JPG), SVG is not supported by most platforms.  | **Create a 1200×630 PNG with the logo in GIMP** · Project image only, no image for other pages| Create a 1200×630 PNG with the logo in GIMP; `npm run images` can now generate it from `favicon.svg` |
| D26 | Dark mode toggle (README "Open Decisions", S58)?| **No, follow the system preference** · Add a toggle (no persistence, or `localStorage` for the preference only)  | No, follow the system preference |
| D27 | May npm packages be installed and used (2026-10-27)? | Keep the build dependency-free · Allow packages for build and tooling | Allowed; “dependency-free” now refers to the built site only: no tracking, no cookies, no external services |

---

## Open Steps

### Content (user)

- [ ] **S22** **User** (D20: work in progress, filled by the user). `nixie-clock.html` still contains the template's "Placeholder paragraph" overview section and an empty "2. Hardware" comment; its card uses `placeholder.svg`. Replace the placeholder overview, fill or remove the empty Hardware section, and set `image` in `projects.json`. Agents do not write this content.
Files: `nixie-clock.html`, `projects.json`, `assets/img/`
- [ ] **S64** **User** (D25). Create `assets/img/og-default.png` (1200×630): run `npm run images` or make it in GIMP. The build warns until it exists.
- **S23** Deferred (D6): `placeholder-project-two` stays a live project. It can be set to `"draft": true` whenever desired.

### Tooling (user)

- [ ] **User** Install the Playwright browser: `npx playwright install chromium` (or run `npm run test:e2e` with `$env:PLAYWRIGHT_CHANNEL='msedge'` to use the installed Edge).
