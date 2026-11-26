# Codebase Analysis

Audit date: 2026-11-26

This review covers the first-party build and preview tooling, browser code, HTML/CSS, data and schemas, tests, and repository configuration. Findings are ordered by impact. No source symlinks were present during this review; the symlink finding is a hardening risk, not an observed exposure. The vendored ESP Web Tools code was excluded as required by `AGENTS.md`.

## Findings

### [P2] The build follows source symlinks into the public output

[`scripts/lib/util.mjs`](scripts/lib/util.mjs#L45) adds every non-directory entry to the build file list, including symbolic links. [`scripts/build.mjs`](scripts/build.mjs#L120) then copies those paths with `copyFile()`, which follows a file symlink. A link accidentally added below `wwwroot/` could therefore copy a file outside the source tree into `dist/` and expose it when the site is deployed.

**Recommendation:** Reject symlinks during traversal, or resolve each source path and verify that its real path remains inside `wwwroot/` before reading or copying it.

### [P2] Missing flasher CSP coverage does not fail a build

[`scripts/lib/checks.mjs`](scripts/lib/checks.mjs#L198) only warns when a page with `<esp-web-install-button>` is not covered by the `.htaccess` CSP exception; the build exits unsuccessfully only when its error collection is non-empty ([`scripts/build.mjs`](scripts/build.mjs#L294)). If a flasher page is renamed or the matching header rule is removed, a deployment can still succeed while the restrictive HTTP CSP blocks styles required by ESP Web Tools. The current `.htaccess` coverage test passes, so this is a regression-detection gap rather than a current broken page.

**Recommendation:** Make missing coverage (including a missing `.htaccess`) a build error, and add an HTTP response-header assertion for a normal page and a flasher page.

### [P3] Lighthouse thresholds are below the documented target

[`lighthouserc.json`](lighthouserc.json#L77) and [`lighthouserc.json`](lighthouserc.json#L83) accept accessibility and performance scores of `0.9`. The tooling documentation says both targets are at least 95 ([`README.md`](README.md#L228)). Scores from 90 to 94 therefore pass automation despite missing the documented target.

**Recommendation:** Set both assertions to `0.95`, or change the documented target if 90 is intentional.

### [P3] The deployment-only filtering path has no integration test

The draft/TODO filtering and its follow-up list pruning run in [`scripts/build.mjs`](scripts/build.mjs#L139), but the unit tests exercise the page classifier in isolation ([`scripts/lib/pipeline.test.mjs`](scripts/lib/pipeline.test.mjs#L17)). The browser suite tests the regular build output, not `build:clean`. A regression could leave a draft page or link in the deployment sitemap, feed, language alternates, or generated lists without these checks noticing.

**Recommendation:** Add a temporary-fixture integration test for `build:clean` that checks excluded pages and their modules across output files, lists, alternates, sitemap, and feed.

### [P3] Sitemap Git metadata is collected with sequential child processes

For every non-project page, [`scripts/build.mjs`](scripts/build.mjs#L259) awaits `gitLastModified()` one page at a time. [`scripts/lib/util.mjs`](scripts/lib/util.mjs#L101) can start two Git processes per page (`status`, then `log`). This adds avoidable process startup latency as the number of static and module pages grows, especially on Windows.

**Recommendation:** Collect the required Git metadata in a batched query, or parallelize the independent lookups with a bounded concurrency limit and reuse their results.

## Verification

- `npm test`: passed, 132 tests.
- `npm run check`: passed with warnings and no errors.
- `npm run lint`: passed (ESLint, Stylelint, and html-validate).
- `npm run test:e2e`: passed, 499 tests across the built pages and configured viewports.
- `npm run build:clean`: passed, 26 pages built.
- The normal build/check currently reports expected draft, missing-translation, unused-image, and placeholder-content warnings; these did not make the checks fail. The clean build omits the placeholder pages.

## Areas Checked Without a Finding

- First-party browser JavaScript showed no cookie, storage, `fetch`, or unsanitized `innerHTML` usage; the vendor tree was excluded.
- The current `.htaccess` matches the flasher page names checked by the unit test.
- Firmware manifest path validation, language/page pairing, and link/anchor checks have focused unit coverage.