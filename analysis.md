# Codebase Analysis

Audit date: 2026-11-26

This review covers the first-party build and preview tooling, browser code, HTML/CSS, data and schemas, tests, and repository configuration. All findings from the review have been addressed and revalidated. No source symlinks were present in the working tree; the symlink protection is preventive. The vendored ESP Web Tools code was excluded as required by `AGENTS.md`.

## Findings Resolved

- **Source symlinks:** [`scripts/lib/util.mjs`](scripts/lib/util.mjs) now rejects symbolic links while walking the source tree, before they can be copied into `dist/`. A unit test covers link rejection; the current source tree has no symlinks.
- **Flasher CSP coverage:** [`scripts/lib/checks.mjs`](scripts/lib/checks.mjs) now fails the build if a flasher page has no matching `.htaccess` exception or if `.htaccess` is missing. Unit tests cover both cases. [`scripts/e2e/pages.spec.mjs`](scripts/e2e/pages.spec.mjs) checks the actual HTTP CSP header on every page and asserts that `unsafe-inline` appears only on flasher pages.
- **Clean-build regression coverage:** [`scripts/build.test.mjs`](scripts/build.test.mjs) runs `build:clean` against a temporary site copy and checks that draft modules are absent from built pages, references, sitemap, and feeds while published fixture modules remain.
- **Sitemap Git lookup cost:** [`scripts/build.mjs`](scripts/build.mjs) now performs last-modified lookups with bounded concurrency using `mapLimit()` from [`scripts/lib/util.mjs`](scripts/lib/util.mjs), preserving output order while limiting simultaneous Git processes.
- **Lighthouse target mismatch:** [`lighthouserc.json`](lighthouserc.json) now enforces `0.95` for accessibility and performance, matching the documented target in [`README.md`](README.md).
- **Layout shift exposed by the stricter target:** The mobile nav now starts collapsed in [`wwwroot/partials/header.html`](wwwroot/partials/header.html), with a `<noscript>` stylesheet in [`wwwroot/css/no-js.css`](wwwroot/css/no-js.css) to keep it visible when JavaScript is disabled. This avoids the delayed nav collapse that produced CLS 0.208 on the English project listing. Browser tests assert CLS below 0.1 and verify the no-JavaScript fallback.

## Verification

- `npm test`: passed, 136 tests, including the clean-build integration test.
- `npm run check`: passed with warnings and no errors.
- `npm run lint`: passed (ESLint, Stylelint, and html-validate).
- `npm run test:e2e`: passed, 502 tests across the built pages and configured viewports, including HTTP CSP headers, mobile CLS, and JavaScript-disabled navigation.
- `npm run lighthouse`: passed all 26 deployment pages against the 95-point accessibility and performance thresholds.
- `npm run lighthouse:full`: passed all 60 regular preview pages against the same thresholds.
- `npm run build:clean`: passed, 26 pages built.
- `npm run build`: passed afterward, restoring the regular 60-page preview output.
- The normal build/check still reports draft, missing-translation, unused-image, and placeholder-content warnings; these are existing content warnings and did not fail validation.

## Other Areas Checked

- First-party browser JavaScript showed no cookie, storage, `fetch`, or unsanitized `innerHTML` usage; the vendor tree was excluded.
- Firmware manifest path validation, language/page pairing, and link/anchor checks have focused unit coverage.
