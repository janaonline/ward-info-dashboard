---
name: design-theme-protocols
description: Use before/while writing or editing UI in Know Your Ward when the change is genuinely visual — new components, restyles, bug fixes to spacing/color/font/radius/elevation/touch-target, or any change-request that touches visuals. Enforces exact reuse of existing tokens/classes/patterns for components that already exist, and full-token-system compliance (color+spacing+radius+elevation+font+touch-target) for brand-new components. Also defines this skill's own self-update rule. Does not apply merely because a change happens to land inside `src/styles/`, `index.html`, or a view-render function in `src/js/` — a lot of edits in those files (new text, a new data field rendered through markup/classes that already exist, a copy change) touch no color/spacing/token/component decision at all, and don't need this skill. Trigger on phrases like "style this", "add a button/card/badge", "change the color/spacing/font of X", "new component", "redesign", "UI bug", or any edit that actually adds/changes a visual value or introduces a new markup/component pattern.
---

# Design & Theme Protocols

This skill enforces one rule: **every pixel of color, spacing, radius, elevation, type, and touch-target in this app traces back to `src/styles/tokens.css` (or `LAYER`/`CORP_COLORS` in `src/js/maps.js` for map/legend colors) — never a one-off hardcoded value.**

Two tiers of strictness:

1. **Existing component** (a pattern already in `components.css`/`base.css` covers what you're building — a card, a button, a pill, a list row, an accordion, a callout, a filter chip, a colored band, header/footer chrome…): **reuse it exactly.** Same class names, same selector structure, same token usage. Do not invent a parallel one-off class for something `.sec`/`.btn`/`.pill`/`.legend-btn`/etc. already does.
2. **New component** (a genuinely new requirement with no existing pattern to reuse): markup, class names, and layout are yours to design — but every visual value must still be a token: `var(--color-name)`, `var(--space-N)`, `var(--radius*)`, `var(--shadow-*)`, `var(--font-*)`, and 44px minimum touch targets. No new hex codes, no new arbitrary px spacing, no new font.

**This project has no light/dark theme toggle** (removed in the 2026 redesign, see CLAUDE.md's top-of-file note) — `tokens.css` is a single `:root` palette, not a paired `:root`/`[data-theme="dark"]` system. Dark-vs-light contrast within a page comes from deliberately mixing dark (`--forest`) and light (`--bg`/`--surface`) sections on the same page, not from a user-toggled theme.

---

## 1. Token reference (`src/styles/tokens.css`)

### Colors (single palette — no theme variants)

| Token | Value | Use for |
|---|---|---|
| `--bg` | `#f2e9d8` | page background (cream/beige) |
| `--surface` | `#ffffff` | raised elements: buttons, inputs, pills, map tooltip, white cards |
| `--surface-2` | `#ece1cb` | card fill (`.sec`), hover states |
| `--inset` | `#e6d8bd` | recessed placeholder fill (`.candphoto` gradient, progress-bar tracks) |
| `--ink` | `#18230f` | body/paragraph-length text on light surfaces (tier 1, see §2) |
| `--muted` | `#57624a` | inline metadata text (tier 2) |
| `--hint` | `#7d8a70` | uppercase captions/labels (tier 3) |
| `--line` | `rgba(24,35,15,.12)` | hairline borders |
| `--line2` | `rgba(24,35,15,.20)` | stronger borders (inputs) |
| `--forest` | `#132010` | dark-green surface: site header, footer, home/ward hero bands, dark cards (`.sec--dark`) |
| `--forest-2` | `#1b2b16` | secondary dark surface (hero-stat tiles, mobile menu hover) |
| `--forest-3` | `#25391e` | tertiary dark surface, currently reserved |
| `--on-forest` | `#f2ead9` | text/headings on `--forest` surfaces |
| `--on-forest-muted` | `#a7b89a` | secondary/metadata text on `--forest` surfaces |
| `--on-forest-line` | `rgba(242,234,217,.14)` | hairline borders on `--forest` surfaces |
| `--green` | `#3d7a40` | primary/positive accent, benchmark "met" tier |
| `--green-d` | `#2a5c2c` | primary-dark (button hover, link hover) |
| `--green-soft` | `#dcecd2` | tinted fill (`.sec--tint`, active legend chip) |
| `--green-ring` | `#b8d9ac` | focus rings, hover border tint |
| `--red` | `#c1392b` | alert/bad, benchmark "under-served" tier, Voter FAQ hero band |
| `--red-d` | `#a12d20` | alert-dark |
| `--red-soft` | `#f8ded8` | alert tint fill |
| `--red-ring` | `#e7a99b` | alert focus/border tint |
| `--yellow` | `#f0b429` | mustard accent: highlighter/warn, CTA/badge fills, Why-vote and Did-you-know bands |
| `--yellow-soft` | `#fbe8b6` | `<mark>`, `.callout`, `.pill-soon`, `.rule-chip`, Feedback band fill |
| `--yellow-ink` | `#6b4a06` | text on yellow-soft/yellow surfaces |
| `--yellow-line` | `#e3c37a` | `.callout` border |
| `--sage` | `#ccdabd` | Methodology teaser band fill |
| `--sage-ink` | `#28371c` | text on `--sage` |
| `--footer-logo-bg` | `#ffffff` | fixed-light chip behind partner logos on the dark footer |
| `--footer-logo-fallback-ink` | `#18230f` | fallback text on that chip |
| `--violet` | `#6d4bd6` | kept for back-compat only, not brand-critical — don't build new UI on this |
| `--blue` | `#2563c9` | Amenities-grid benchmark-badge tone: "Network standard"; also a Voter-FAQ topic-tile color (`.faq-topic-tile--7`) |
| `--teal` | `#0f8a7e` | Amenities benchmark-badge tone: "Accessibility based" |
| `--indigo` | `#4b53c9` | Amenities benchmark-badge tone: "Coverage based" |
| `--cyan` | `#0891b2` | Amenities benchmark-badge tone: "Geography based" |
| `--gray` | `#6b7280` | Amenities benchmark-badge tone: "Planning based" / fallback; neutral tint for `.am-benchmark-track` |
| `--orange` | `#c2660a` | Amenities benchmark-badge tone: "Activity based"; progress-bar "Moderate" (40–74%) fill tier |
| `--light-green` | `#7cb342` | Amenities progress-bar "Good" (75–99%) fill tier; also a Voter-FAQ topic-tile color (`.faq-topic-tile--6`) |

The benchmark-badge/progress-tier tokens (`--blue`/`--teal`/`--indigo`/`--cyan`/`--gray`/`--orange`/`--light-green`) are scoped to the Amenities benchmark UI per an explicit requester color-mapping — not a general license to use these hues elsewhere, though `--blue`/`--light-green` were reused as-is (not duplicated) for two of the Voter FAQ topic tiles' 8-color set. `--green`/`--red` are reused as-is for the progress-bar "Excellent"/"Poor" tiers and the badge "Environmental" category.

### Radius scale

`--radius:14px` (default) · `--radius-m:11px` (buttons, inputs, panels) · `--radius-s:8px` (small chips/icons) · `--radius-l:18px` (cards: `.sec`, `.meth-statcard`)

### Elevation (material-style)

`--shadow-1` (resting: cards, buttons, pills) · `--shadow-2` (hover/raised: `.btn:hover`, `.candcard:hover`, popovers) · `--shadow-3` (highest, currently only referenced defensively — no active FAB left to use it since the 2026 redesign removed the floating Voter FAQs button). Aliases: `--shadow` = `--shadow-2`, `--shadow-s` = `--shadow-1`.

### Spacing scale (4pt)

`--space-1:4px  --space-2:8px  --space-3:12px  --space-4:16px  --space-5:24px  --space-6:32px  --space-7:48px`

Use these for every margin/padding/gap. A literal px value in new CSS is only acceptable when it's *sub-scale* and deliberately so — and even then, only when there's a real reason, not convenience.

### Motion

`--ease-out:cubic-bezier(.2,.7,.2,1)` · `--dur:.18s` — every hover/transition in this codebase uses these two, not ad-hoc values.

### Fonts

`--font-body:"PT Sans", …` (body text) · `--font-stat:"Manrope", var(--font-body)` (headings' numeric/stat emphasis, button labels) · `--font-display:"Manrope", …` (headings). See §7 for the banned-fonts list.

---

## 2. Text-color 3-tier hierarchy

| Tier | Token | For | Real examples |
|---|---|---|---|
| 1 | `--ink` (light surfaces) / `--on-forest` (dark surfaces) | Body/description-length copy, full contrast | `.panel p`, `.cand-intro`, `.why-vote-body p`, `.callout p` |
| 2 | `--muted` (light) / `--on-forest-muted` (dark) | Inline metadata, short secondary text | `.ward-row-meta`, `.candparty`, `.sec-sub`, `.whead-breadcrumb` |
| 3 | `--hint` | Uppercase captions/labels only | `.fact .k`, `.map-caption`, `.find-count`, `.whead-origin-block .label`, `.mini-stat-k` |

**Rule:** never put sentence-length text on `--muted`/`--hint`/`--on-forest-muted` — they exist for short secondary labels, not paragraphs. Any component placed on a `--forest` (dark) surface must swap `--ink`/`--muted` for `--on-forest`/`--on-forest-muted` explicitly — they do not auto-invert.

---

## 3. Component recipe catalog (reuse exactly — tier 1)

Selectors below are real, current selectors from `src/styles/components.css`/`base.css`. If what you're building matches one of these purposes, use the class — do not create a parallel one-off.

| Component | Selector(s) | Purpose / token usage | Example usage |
|---|---|---|---|
| Card shell | `.sec` | Every major section block: `--surface-2` bg, `--line` border, `--radius-l`, `--shadow-1`, `--space-5`/`--space-6` padding | ward-detail Overview/Amenities/Ask-your-candidates, methodology steps |
| Card shell — dark | `.sec--dark` | Same shell, `--forest` bg + `--on-forest` text (also overrides `.meth-list`/`.buffer-toggle`/`.am-icon`/`.amrow` colors inside it) | ward-view Ward map + Safety & climate, methodology step 3 |
| Card shell — tinted | `.sec--tint` | Same shell, `--green-soft` bg | ward-view Candidates |
| Full-bleed colored band | `.cover`, `.why-vote-band`, `.methodology-band`, `.whead`, `.facts-band`, `.feedback-band` | Break out of the enclosing `.container`'s max-width via `margin-left/right: calc(50% - 50vw)` + matching `padding-left/right`, so the background spans the full viewport while `.band-inner` (a child wrapper) re-applies `.container`'s own max-width scale to keep content aligned. Each has its own background/text-color pairing (dark forest, yellow, sage, yellow-soft) — see their own rules in `components.css`, don't invent a new bleed mechanism | home hero/why-vote/methodology-teaser, ward-detail head band + Did-you-know + Feedback |
| Hero lede/subtitle | `.faq-lede` (top-margin-only variant), `.hero-subtitle` (symmetric-margin variant) | One-sentence paragraph directly under a `.headline`: sentence-length copy, `0.95rem`, `max-width: 64ch` for line length | voter-FAQ hero, home hero |
| Hero/stat tile | `.hero-stats`/`.hero-stat` (+ `.hero-stat--alert` red, `.hero-stat--highlight` yellow) | 2-column grid of dark tiles, big number + small label | home hero (wards/corporations/councillor/yrs-since-poll), ward-view head band (population/male/female/booths) |
| Primary button | `.btn.btn-primary` | Solid `--green-d` CTA | ward-view Feedback CTA, voter-FAQ hero |
| Secondary button | `.btn.btn-secondary` | `--surface` bg, `--line2` border | "Use my location", Reset map |
| WhatsApp button | `.btn.btn-whatsapp` | Fixed `#25d366`/`#06341c` — brand-locked exception, not a token; only ever for the WhatsApp share action | `#wardWhatsappBtn` |
| Small button | `.btn.btn-sm` | `36px` min-height variant of `.btn` | ward-view share buttons, map Reset button |
| Pill/badge | `.pill`, `.pill.pill-soon`, `.pill--fill-yellow`, `.pill--outline-dark` | `--surface` bg + `--muted` text by default; `pill-soon` swaps to `--yellow-soft`/`--yellow-ink`; `--fill-yellow`/`--outline-dark` are `--forest`-surface variants (ward badge row) | ward head badges, key-areas pills, methodology tag pills |
| Benchmark progress bar | `.am-benchmark-track`/`.am-benchmark-fill` (+ `--green`/`--light-green`/`--orange`/`--red` tone modifiers)/`.am-benchmark-ratio` | Neutral gray track; fill color is a performance tier (`progressTone()` in `ward-view.js`), never flat | Amenities-grid rows with a numeric CSV benchmark |
| Colored amenity card | `.amrow.amcard` (+ `.amcard--green`/`--light-green`/`--orange`/`--red`) | Solid-tone card wrapping a bar-kind Amenities row (same `progressTone()` result as its own benchmark bar) — still carries the base `.amrow`/`data-layer` so `wireLayerClicks()`'s click-wiring is untouched; has its own hover overrides (`.amrow.amcard--<tone>.is-clickable:hover`) so hover doesn't flash to plain `--surface` | ward-view Amenities grid |
| Benchmark badge | `.am-benchmark-badge` (+ `--blue`/`--teal`/`--indigo`/`--cyan`/`--gray`/`--orange`/`--green` tone modifiers) | Outlined pill, color keyed by category via `BADGE_TONES` in `ward-view.js` | Amenities-grid rows with no numeric CSV benchmark |
| List row | `.ward-row` (+ `.ward-row-text`/`.ward-row-arrow`), `.ward-suggest-row` | 44px min-height, hover = `--surface-2` bg + `--green` left-border + arrow shift, active = `--green-soft` | home ward list/browse list, autosuggest dropdown |
| Filter pill (functional) | `.corp-filter-pill` (+ `.active`) | Segmented pill row, `.active` = `--forest` fill | home Ward Explorer corporation filter |
| Filter/legend button | `.legend-btn` (+ `.active`), `.amenity-card-*` | Map filter cards: `--surface`/`--line2` idle, `--green-soft`/`--green-d` active | ward-map amenity filter row |
| Native disclosure | `.panel` (wraps `<details>`) | Zero-JS accordion — use this by default for any simple expand/collapse | home "Four things worth understanding" |
| Custom animated accordion | `.accordion-item`/`.accordion-trigger`/`.accordion-panel` | Only when you need chevron-rotate + max-height transition + `aria-expanded` sync beyond what native `<details>` gives | voter-FAQ categories |
| Note/alert box | `.callout` (+ `.callout-icon`) | `--yellow-soft` bg, `--yellow-ink` text, `--yellow-line` border — the base alert-box pattern; page-scoped overrides (e.g. `.faq-key-dates`) may recolor it for a specific card without forking the structure | methodology note, voter-FAQ key-dates |
| Colored topic tile | `.faq-topic-tile` (+ `--1`..`--8` tone modifiers) | Net-new tier-2 grid tile, one solid brand/token color per tile, number + label + count | voter-FAQ "Eight topics" grid |
| Severity card | `.fact` | Plain `--surface`/`--yellow-soft` card (see `.facts-band`) | ward-view Did-you-know |
| Map surface | `.map`, `.map-corp`, `.map-ward` | `--radius`, `--line` border, `--shadow-s` | both MapLibre instances |
| Map tooltip | `.map-tip` | `--surface` bg, `--ink` text, `--radius-s` | hover tooltips on both maps |
| Interactive map popup | `.ward-popup` (+ `.ward-popup-body`/`-name`/`-btn`) | Pinned, click-triggered Popup override: `--surface` bg, `--radius-m`, `--shadow-2`, `.btn.btn-primary` reused verbatim for the action button | home choropleth's click-to-navigate ward popup |
| Site header chrome | `.site-header`, `.site-header-nav`, `.site-header-cta`, `.site-header-menu-btn`, `.site-header-mobile-menu` | Persistent `--forest` bar; desktop = logo+nav+CTA, mobile = logo+hamburger (home) or back-chevron+title+hamburger (other views) | `src/js/header.js`, every view |
| Sticky sub-nav | `.ward-subnav`/`.ward-subnav-btn`, `.cat-nav`/button (voter-FAQ) | Horizontal-scroll tab bar, `position: sticky`, `top` set in JS from `#siteHeader`'s `offsetHeight` | ward-detail 7-tab sub-nav, voter-FAQ category nav |
| Footer primitives | `.footer-cols`, `.footer-col`, `.footer-col-brand`, `.footer-org*`, `.footer-social-link`, `.footer-bottom` | Dark, full-bleed multi-column link footer | `src/js/footer.js` |
| Inline info-icon link | `.temp-info-link` | Small tooltip+external-link icon embedded mid-sentence, full 44×44px touch target via padding around a smaller glyph | ward-view Temperature card's link to `Temperature_2015_2026.pdf` |

When none of these fit, build a new component (tier 2, §4) — do not force an unrelated fit.

---

## 4. New components (tier 2) — full token system, free markup

For a genuinely new UI requirement:

- **Layout/markup/class names**: your choice — no obligation to match an existing component's DOM shape.
- **Color**: only `var(--token-name)` from §1's table. If the new component needs a shade not currently in `tokens.css`, that's a real gap — add the new custom property to `tokens.css`'s single `:root` block, don't hardcode a hex inline anywhere else, and update this skill's §1 table in the same change (§8).
- **Spacing/gap/margin/padding**: only `var(--space-N)`, unless deliberately sub-scale with a stated reason (see §1).
- **Radius**: only `var(--radius*)`.
- **Elevation**: only `var(--shadow-*)`.
- **Font**: only `var(--font-body)`/`var(--font-stat)`/`var(--font-display)`.
- **Touch targets**: any clickable element gets `min-height: 44px` (and `min-width: 44px` if icon-only/round), matching `.btn`/`.ward-row`/`.icon-btn`.
- **Motion**: `var(--dur)` + `var(--ease-out)` for any hover/transition, matching every existing interactive element.

---

## 5. Map/legend colors (`src/js/maps.js`)

`LAYER` (amenity icon+color per type) and `CORP_COLORS` (corporation fill color) are the **single source of truth** for every amenity/corporation color in the app. Never hardcode a color for an amenity or corporation anywhere else (CSS or JS).

Current tables (17 `LAYER` entries, 5 `CORP_COLORS`):

```
LAYER: polling #a89a86 · bus #3f7d34 · metro #1f7a5c · school #c8890a · anganwadi #eab308
       park #5e9b48 · playground #8fae14 (no backing data) · lake #2f7fb0 · pond #6bb3d9 (no backing data)
       police #616161 · police_outpost #8f8f8f · railway_police #42576b · fire #d33a4c
       toilet #9a6b3f · flood #e05a2f (legacy merged, superseded) · flood_prone #b3401f · flood_vuln #e88b4b

CORP_COLORS: North #d33a4c · East #e8912a · West #d4b81f · South #5e9b48 · Central #6f6f6f
```

These hexes are unchanged by the 2026 redesign and are **intentionally basemap-agnostic** (chosen to read on the dark CARTO basemap, the only variant now in use — see CLAUDE.md's Map Rules) — do not add a per-context override unless a real contrast problem is confirmed by manual verification. The one deliberate off-brand exception in this palette is the blue pair reserved for lake/pond (the Open City brand palette has no blue) — don't extend "off-brand color" to anything else without the same explicit sign-off.

---

## 6. No theme toggle — single palette only

`tokens.css` has one `:root` block, no `[data-theme="dark"]` counterpart, and no `data-theme` attribute is ever set on `<html>` (`theme.js`/`back-button.js` were deleted in the 2026 redesign along with `#themeToggle`/`.topcluster`/`#voterFaqFab`). Do not reintroduce a paired light/dark token block or a theme-toggle control without an explicit request to do so — this was a deliberate, confirmed removal, not an oversight.

Dark-vs-light contrast on a page is achieved by deliberately alternating `--forest` (dark) and `--bg`/`--surface` (light) sections on the same page — e.g. the ward-detail head band and Ward-map card are dark, the Overview/Amenities cards beneath them are light. When building a component for a `--forest` surface, explicitly use the `--on-forest*` text tokens (§2) rather than assuming inversion.

---

## 7. Font rule

Only Manrope (`--font-display`/`--font-stat`) and PT Sans (`--font-body`). Manrope is the deliberate stand-in for the brand guideline's Aileron (not on Google Fonts) — don't "fix" that substitution in either direction.

**Banned — do not reintroduce:** Poppins, Inter, Inter Tight, Playfair Display, Plus Jakarta Sans.

---

## 8. Self-maintenance rule (this file must not drift)

Whenever a UI/UX change request or bug report **changes a token value, adds/removes a color, changes spacing/radius/elevation/typography, or introduces a new reusable component pattern** in `tokens.css`, `base.css`, `components.css`, or `LAYER`/`CORP_COLORS` in `maps.js` — update the matching table/catalog entry in this SKILL.md **in the same change**, not later. This file's tables (§1, §3, §5) are a mirror of those source files; treat a merged change that leaves them out of sync as incomplete.

This skill governs *design correctness* (did the change use the right tokens/patterns) and only applies when a change is genuinely visual — a new color/spacing/radius/elevation/font/touch-target decision, or a new component pattern — not just because it lands in a styling file or a render function. `verify-and-update-docs` governs *verification and doc-sync* (syntax gates, grep sweeps, CLAUDE.md/README.md updates) and applies more broadly, but likewise only when the change is substantial enough to need it (see that skill's own "When to invoke this"). Neither skill is a reflex for every edit — both exist to catch real drift (design-token violations, or stale docs), not to add process to trivial changes.

When a change does genuinely touch design *and* is substantial: this skill runs first (or alongside implementation), to confirm token/pattern correctness while the change is being written; then `verify-and-update-docs` runs once, after the change is fully implemented and already tested successfully — never the reverse, and never either skill more than once per completed change.

---

## 9. Pre-flight checklist (run before finishing any UI change)

1. No hardcoded hex/rgb color anywhere outside `tokens.css` or `maps.js`'s `LAYER`/`CORP_COLORS` (the one WhatsApp-brand exception in §3 aside).
2. Every `var(--...)` you wrote resolves to a real definition in `tokens.css`'s single `:root` block — except `--faq-nav-clearance`, set at runtime by `voter-faq-view.js`.
3. If you added/changed a color token, `tokens.css`'s single `:root` block was updated — there is no second theme block to keep in sync (§6).
4. Every clickable element is ≥44px touch target.
5. Text follows the 3-tier hierarchy (§2), using the `--on-forest*` variants on dark surfaces — no paragraph-length text on `--muted`/`--hint`/`--on-forest-muted`.
6. You reused an existing component class (§3) if one fit the purpose; if you built a new one, it's still 100%-token-built (§4).
7. No new font, icon library, CSS framework, or bundler was introduced (§7, and CLAUDE.md's "Do Not" list).
8. If any table in this file (§1/§3/§5) is now stale relative to the source files you changed, you updated it (§8).

---

## 10. Do-Not list

- No CSS framework, bundler, or build step — this is a deliberate zero-build static site (CLAUDE.md).
- No new hardcoded brand hex outside `tokens.css` / `maps.js`'s `LAYER`/`CORP_COLORS`.
- No new font or icon library — every icon in this app is a hand-coded `currentColor` inline SVG; every font is Manrope/PT Sans.
- Don't reintroduce Poppins, Inter, Inter Tight, Playfair Display, or Plus Jakarta Sans.
- Don't add a per-context marker-color override in `maps.js` without a confirmed, manually-verified contrast problem.
- Don't reintroduce a light/dark theme toggle or a paired `:root`/`[data-theme="dark"]` token block without an explicit request (§6) — this was a deliberate 2026 removal.
