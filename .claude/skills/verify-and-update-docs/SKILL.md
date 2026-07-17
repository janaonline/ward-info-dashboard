---
name: verify-and-update-docs
description: Use as the closing step after a code change in Know Your Ward that's substantial enough to need it — a real implementation, bug fix, or feature (with or without a design/UI component) that changes app behavior, structure, or user-visible output — once that change is complete and has already been exercised/tested successfully. Skip it for trivial, non-behavioral edits (typo/comment fixes, pure formatting, a rename with no behavior change) that leave CLAUDE.md/README.md still accurate as-is — running the full gate set on those costs tokens for no doc-accuracy gain. Never invoke mid-implementation or before the change is confirmed working, and never more than once per completed task — this is a single closing gate, not a per-edit habit. Runs this project's real verification gates (node --check syntax validation, grep sweeps for banned terms and must-preserve selectors, var(--) coverage) plus manual/browser verification for UI changes, and only updates CLAUDE.md/README.md once everything passes and only for sections the change actually affects. Trigger on phrases like "verify this", "test and verify", "make sure this works", "update the docs", "sync CLAUDE.md", "update readme" — or proactively, without being asked, once as the closing step of any change substantial enough that CLAUDE.md/README.md would otherwise drift out of sync with actual behavior. This includes purely presentational UI reorganizations — moving, splitting, merging, adding, or renaming a documented section/view/component (e.g. "move X into its own section," "split Y out of Z," "add a new panel") — even when the change introduces no new visual/token decision and correctly skips `design-theme-protocols`: CLAUDE.md's "Must-preserve selectors" list and "Current state (by area)" changelog enumerate exact section/view names and structure, so any change to that structure is substantial by definition, regardless of how small the underlying code diff is.
---

# Verify & Update Docs

This skill enforces one rule: **never document a change that hasn't been verified.** CLAUDE.md and README.md describe the app as it actually behaves — updating them off unverified code turns them into fiction. Verification always comes first; doc updates are the last step, and are skipped entirely if verification fails.

Do not run this skill's doc-update step speculatively "to save time." If a gate fails, fix the code and re-run the gates — do not edit CLAUDE.md/README.md until they're clean.

## When to invoke this

Run this once, as the closing step, right after a code change — an implementation, bug fix, or feature, with or without a design/UI component — is finished and has already been exercised/tested to work at the code level, **and only when the change is substantial enough that skipping this would leave CLAUDE.md/README.md describing something no longer true.** Skip it for trivial, purely non-behavioral edits (a comment tweak, a rename with identical behavior, whitespace/formatting) that don't change what the app does or what either doc claims — running the full gate set on those burns tokens without improving doc accuracy. Do not invoke it before the change is confirmed working (this skill verifies a change, it doesn't substitute for getting the change working first), and do not invoke it more than once per completed task: if a gate fails, fix the issue and re-run the specific failed gate(s), not the whole skill from scratch, and don't re-run the whole thing again once everything is already clean for that change.

None of this is license to let the docs drift, though: whenever a change *does* qualify, CLAUDE.md/README.md must come out of §5 actually matching current behavior — accuracy is the whole reason this skill exists, and running it is wasted effort if the doc-update step gets rushed or skipped.

---

## 0. Scope the change

Identify exactly which files changed and which area(s) of the app they touch: data loading (`src/js/data-loader.js`), map/geometry logic (`src/js/maps.js`), the facts engine (`src/js/ward-view.js`), a specific view module (`home-view.js`/`ward-view.js`/`methodology-view.js`/`main.js`), or styling (`src/styles/*.css`). This determines which gates below actually apply — a CSS-only change doesn't need a JS syntax check, and a JS-only change with no markup/CSS touched doesn't need a full visual walkthrough (though a quick smoke check of the affected view is still worth doing).

## 1. Static verification gates (always required)

This project has **no bundler, linter, formatter, or type checker** — that's a deliberate zero-build static-site architecture, not a gap to fill in. Do not invent or add `format:check`/`lint`/`typecheck`/`build` npm scripts to make this section look more conventional; the real gates are:

1. **Syntax check** every changed file under `src/js/`:
   ```
   node --input-type=module --check < src/js/<file>.js
   ```
   Run this for each touched `.js` file. This is the only available syntax gate for ES modules with no bundler in the loop.

2. **grep sweep** for regressions:
   - No reintroduced banned terms: `grep -rniE "chart\.js|plus jakarta" src/ index.html` should return nothing.
   - No leftover reference to a color/token/value that was supposed to be removed in this change (check whatever the diff specifically removed).
   - Every ID/class in CLAUDE.md's "Must-preserve selectors" list is still present somewhere in `src/js/*.js` — if the change touched any view-render function, re-grep the full list, not just the ones you think you touched.

3. **Token coverage check** (only if `tokens.css`/`base.css`/`components.css`/`transition.css` changed): every `var(--xxx)` used in `base.css`/`components.css`/`transition.css` must have a matching `--xxx:` definition in `tokens.css` (`:root` or `[data-theme="dark"]`) — except `--ripple-x`/`--ripple-y`, which `theme.js` sets at runtime and are expected to be absent from the static definitions.

There is no database migration tooling and no test runner in this repo — do not report either of those as "skipped" gates; they are not applicable rather than deferred.

## 2. Runtime verification (required for UI/frontend changes)

Required whenever `index.html`, any file in `src/styles/`, or a view-render function in `src/js/` changed. There is no screenshot/visual-regression tooling here, so this step is a manual browser walkthrough:

1. Serve the repo (`npx serve .` or `python -m http.server`) — `file://` won't work since the app `fetch()`es local data.
2. Toggle both themes and confirm the ripple transition still runs.
3. Walk all 4 views: Home (search, geolocation, choropleth map, ward list), Ward (map + legend + amenities grid + vulnerability-hotspots grid + facts + ask), Methodology (back button restores the correct prior view), Voter FAQ (category nav + accordion + search). Share/WhatsApp/copy-link live in the persistent site footer (`footer.js`), shown only on the Ward view — check those there, not as part of the Ward view markup itself.
4. If the change touched anything in the "must-preserve selectors" list, specifically click/interact with that exact control (e.g. a legend chip, an amenity row, a nav button) rather than just eyeballing it — a renamed class can look fine visually while silently breaking a click handler.
5. Spot-check responsiveness at a couple of widths (e.g. ~375px and ~1024px) if the change touched layout/spacing.

## 3. DB verification (only if the change touches migrations or DB objects)

**Not applicable to this project.** There is no database — ward data is static CSV/JSON under `public/data/`, loaded once at startup with no migrations, no schema, and no server-side storage. Always report this gate as "not applicable — no database in this project," never as skipped-for-time.

## 4. Gate check

Proceed to §5 only if:
- Every gate in §1 passed, AND
- §2 was run (and passed) if the change touched any UI/CSS/markup surface.

If any gate fails, stop here: fix the underlying code, then re-run the failed gate(s) from the top. Do not touch CLAUDE.md or README.md while any gate is failing.

## 5. Update CLAUDE.md and README.md

Only after step 4 passes:

1. Re-read the relevant section(s) of both files — do not guess at current structure from memory.
2. Match existing tone and format exactly:
   - `CLAUDE.md` is organized into rule sections (data/map/facts-engine/styling/verification rules, a must-preserve-selectors list, a Do-Not list) written as terse, prescriptive bullets aimed at a coding agent, plus a "Current state (by area)" changelog-style list near the bottom noting what each feature area now has.
   - `README.md` covers the same ground in short prose sections aimed at a human contributor (running locally, deployment, features, data sources, design system, contributing) — keep it in sync with CLAUDE.md's content, not a duplicate of its wording.
3. Extend the existing section that covers the changed area. Only add a new section if nothing existing covers it — do not restructure either file.
4. Describe the resulting behavior, not the diff. Don't write "changed X to Y" — write what's true now, the way the rest of the file does.
5. Do not invent commands, scripts, env vars, or file paths that don't exist in the repo (CLAUDE.md's own "Do Not" rule — this project genuinely has no `package.json`, so never write one into either doc).
6. Keep changes minimal and targeted — this step documents the verified change, it is not a license for a broader documentation rewrite.

## 6. Report

Close with:

- Which gates ran and their result (pass/fail, or "not applicable" with a reason)
- Which gates were skipped and why (e.g., no UI/CSS touched, so §2 wasn't run)
- Exactly which CLAUDE.md/README.md sections were updated, or confirmation that no doc update was needed
- If verification failed and docs were intentionally *not* updated, say so plainly
