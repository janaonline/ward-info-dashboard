---
name: design-theme-protocols
description: Use before/while writing or editing UI in Know Your Ward when the change is genuinely visual — new components, restyles, bug fixes to spacing/color/font/radius/elevation/touch-target, or any change-request that touches visuals. Enforces exact reuse of existing tokens/classes/patterns for components that already exist, and full-token-system compliance (color+spacing+radius+elevation+font+touch-target) for brand-new components. Also defines this skill's own self-update rule. Does not apply merely because a change happens to land inside `src/styles/`, `index.html`, or a view-render function in `src/js/` — a lot of edits in those files (new text, a new data field rendered through markup/classes that already exist, a copy change) touch no color/spacing/token/component decision at all, and don't need this skill. Trigger on phrases like "style this", "add a button/card/badge", "change the color/spacing/font of X", "new component", "redesign", "UI bug", or any edit that actually adds/changes a visual value or introduces a new markup/component pattern.
---

# Design & Theme Protocols

This skill enforces one rule: **every pixel of color, spacing, radius, elevation, type, and touch-target in this app traces back to `src/styles/tokens.css` (or `LAYER`/`CORP_COLORS` in `src/js/maps.js` for map/legend colors) — never a one-off hardcoded value.**

Two tiers of strictness:

1. **Existing component** (a pattern already in `components.css`/`base.css`/`transition.css` covers what you're building — a card, a button, a pill, a list row, an accordion, a callout, a filter chip, footer chrome…): **reuse it exactly.** Same class names, same selector structure, same token usage. Do not invent a parallel one-off class for something `.sec`/`.btn`/`.pill`/`.legend-btn`/etc. already does.
2. **New component** (a genuinely new requirement with no existing pattern to reuse): markup, class names, and layout are yours to design — but every visual value must still be a token: `var(--color-name)`, `var(--space-N)`, `var(--radius*)`, `var(--shadow-*)`, `var(--font-*)`, and 44px minimum touch targets. No new hex codes, no new arbitrary px spacing, no new font.

Both tiers apply in both themes — `:root` and `[data-theme="dark"]` are updated together, always (see §6).

---

## 1. Token reference (`src/styles/tokens.css`)

### Colors — light (`:root`) / dark (`[data-theme="dark"]`)

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--bg` | `#f3fce8` | `#10160b` | page background |
| `--surface` | `#ffffff` | `#1a2113` | raised elements: buttons, inputs, pills, map tooltip |
| `--surface-2` | `#eef7e0` | `#222c18` | card fill (`.sec`/`.whead`/`.why-vote`), hover states |
| `--inset` | `#e4f1d3` | `#2a3620` | recessed placeholder fill (`.candphoto` gradient) |
| `--ink` | `#1b2410` | `#eef3e6` | body/paragraph-length text (tier 1, see §2) |
| `--muted` | `#54614a` | `#aab89a` | inline metadata text (tier 2) |
| `--hint` | `#7f8d72` | `#7d8b6d` | uppercase captions/labels (tier 3) |
| `--line` | `rgba(27,36,16,.10)` | `rgba(238,243,230,.10)` | hairline borders |
| `--line2` | `rgba(27,36,16,.18)` | `rgba(238,243,230,.18)` | stronger borders (inputs, back-fab) |
| `--green` | `#5e9b48` | `#92c56e` | primary/positive accent |
| `--green-d` | `#457a31` | `#c6eaa0` | primary-dark (buttons in light, accent-in-dark swap) |
| `--green-soft` | `#dcf1c9` | `#233318` | tinted fill (active legend chip, pill-soon alt) |
| `--green-ring` | `#c6eaa0` | `#3c5228` | focus rings, hover border tint |
| `--red` | `#d33a4c` | `#f56a6d` | alert/bad |
| `--red-d` | `#b12a3a` | `#ffadac` | alert-dark |
| `--red-soft` | `#ffe7e6` | `#3a1c1d` | alert tint fill |
| `--red-ring` | `#ffadac` | `#5a2b2c` | alert focus/border tint |
| `--yellow` | `#ffd527` | `#ffd527` | highlighter/warn accent (same both themes) |
| `--yellow-soft` | `#fff3c4` | `#3a3212` | `<mark>`, `.callout`, `.pill-soon`, `.rule-chip` fill |
| `--yellow-ink` | `#6b5300` | `#f3dfa0` | text on yellow-soft |
| `--yellow-line` | `#f0dd8a` | `#5a4d24` | `.callout` border |
| `--lime` | `#c8e537` | `#c8e537` | **dark-theme-only** accent — see §6 |
| `--footer-logo-bg` | `#ffffff` | `#ffffff` | fixed-light chip behind partner logos (same both themes) |
| `--footer-logo-fallback-ink` | `#1b2410` | `#1b2410` | fallback text on that chip |
| `--blue` / `--violet` | `#2563c9` / `#6d4bd6` | `#5b8fe0` / `#9c85f0` | kept for back-compat only, not brand-critical — don't build new UI on these |

### Radius scale

`--radius:14px` (default) · `--radius-m:11px` (buttons, inputs, panels) · `--radius-s:8px` (small chips/icons) · `--radius-l:18px` (cards: `.sec`/`.whead`/`.why-vote`)

### Elevation (material-style)

`--shadow-1` (resting: cards, buttons, pills) · `--shadow-2` (hover/raised: `.btn:hover`, `.candcard:hover`, popovers) · `--shadow-3` (highest: FAB hover) — dark theme uses the same variable names with heavier black-based shadows. Aliases: `--shadow` = `--shadow-2`, `--shadow-s` = `--shadow-1`.

### Spacing scale (4pt)

`--space-1:4px  --space-2:8px  --space-3:12px  --space-4:16px  --space-5:24px  --space-6:32px  --space-7:48px`

Use these for every margin/padding/gap. A literal px value in new CSS is only acceptable when it's *sub-scale* and deliberately so (e.g. `.why-vote-subtitle`'s `margin-top:2px`, chosen because it needed to be tighter than the scale's own floor) — and even then, only when there's a real reason, not convenience.

### Motion

`--ease-out:cubic-bezier(.2,.7,.2,1)` · `--dur:.18s` — every hover/transition in this codebase uses these two, not ad-hoc values.

### Fonts

`--font-body:"PT Sans", …` (body text) · `--font-stat:"Manrope", var(--font-body)` (headings' numeric/stat emphasis, button labels) · `--font-display:"Manrope", …` (headings). See §7 for the banned-fonts list.

---

## 2. Text-color 3-tier hierarchy

| Tier | Token | For | Real examples |
|---|---|---|---|
| 1 | `--ink` | Body/description-length copy, full contrast | `.panel p`, `.ward-def`, `.cand-intro`, `.why-vote-body p`, `.callout p` |
| 2 | `--muted` | Inline metadata, short secondary text | `.ward-row-meta`, `.whead-meta`, `.candparty`, `.footer-heart-line` |
| 3 | `--hint` | Uppercase captions/labels only | `.fact .k`, `.map-caption`, `.find-count`, `.whead-origin-block .label` |

**Rule:** never put sentence-length text on `--muted`/`--hint` — they exist for short secondary labels, not paragraphs.

---

## 3. Component recipe catalog (reuse exactly — tier 1)

Selectors below are real, current selectors from `src/styles/components.css`/`base.css`. If what you're building matches one of these purposes, use the class — do not create a parallel one-off.

| Component | Selector(s) | Purpose / token usage | Example usage |
|---|---|---|---|
| Card shell | `.sec, .whead, .why-vote` | Every major section block: `--surface-2` bg, `--line` border, `--radius-l`, `--shadow-1`, `--space-5`/`--space-6` padding | every ward-detail section, methodology sections |
| Hero lede/subtitle | `.faq-lede` (top-margin-only variant), `.hero-subtitle` (symmetric-margin variant) | One-sentence paragraph directly under a `.headline`: `--ink` text (tier-1, sentence-length — never `--muted`/`--hint`), `0.95rem`, `max-width: 64ch` for line length; margin shorthand differs only by what follows it in each view | voter-FAQ hero (`.faq-lede`, followed by `.cta-row` which supplies its own top margin), home hero (`.hero-subtitle`, followed by `.why-vote`, which has none) |
| Primary button | `.btn.btn-primary` | Solid `--green-d` (light) / `--green` (dark) CTA | ward-view "Ask" CTA, voter-FAQ hero |
| Secondary button | `.btn.btn-secondary` | `--surface` bg, `--line2` border | back/cancel actions |
| WhatsApp button | `.btn.btn-whatsapp` | Fixed `#25d366`/`#06341c` — brand-locked exception, not a token; only ever for the WhatsApp share action, never reused for generic green CTAs | `#footerWhatsapp` |
| Small button | `.btn.btn-sm` | `36px` min-height variant of `.btn` for tight footer rows | footer share actions |
| Pill/badge | `.pill`, `.pill.pill-soon` | `--surface` bg + `--muted` text; `pill-soon` swaps to `--yellow-soft`/`--yellow-ink` | `.candgrid h3` "coming soon" badge |
| Icon button (round, 44px) | `.icon-btn` | Theme toggle and any other round icon-only control | `#themeToggle` |
| List row | `.ward-row`, `.ward-suggest-row` | 44px min-height, hover = `--surface-2` bg + `--green` left-border, active = `--green-soft` | ward list, autosuggest dropdown |
| Filter/legend button | `.legend-btn` (+ `.active`), `.amenity-card-*` | Map filter cards: `--surface`/`--line2` idle, `--green-soft`/`--green-d` active | ward-map amenity filter row |
| Native disclosure | `.panel` (wraps `<details>`) | Zero-JS accordion — use this by default for any simple expand/collapse | home-view "What is GBA?" panels |
| Custom animated accordion | `.accordion-item`/`.accordion-trigger`/`.accordion-panel` | Only when you need chevron-rotate + max-height transition + `aria-expanded` sync beyond what native `<details>` gives — a deliberate one-off already used once (voter FAQ); don't default to this over `.panel` | voter-FAQ categories |
| Note/alert box | `.callout` (+ `.callout-icon`) | `--yellow-soft` bg, `--yellow-ink` text, `--yellow-line` border — the *only* alert-style box pattern; don't invent a second one | methodology note, voter-FAQ key-dates |
| Severity card | `.fact`, `.fact.warn`, `.fact.bad` | Left-border color swap only (`--green-ring` → `--yellow` → `--red`); base card is plain `--surface` | facts engine (currently rendered with no tone class — see CLAUDE.md Facts Engine Rules) |
| Map surface | `.map`, `.map-corp`, `.map-ward` | `--radius`, `--line` border, `--shadow-s` | both MapLibre instances |
| Map tooltip | `.map-tip` | Theme-aware Popup override: `--surface` bg, `--ink` text, `--radius-s` | hover tooltips on both maps |
| Interactive map popup | `.ward-popup` (+ `.ward-popup-body`/`-name`/`-btn`) | Pinned, click-triggered Popup override (not `pointer-events: none` like `.map-tip`): `--surface` bg, `--radius-m`, `--shadow-2`, `.btn.btn-primary` reused verbatim for the action button | home choropleth's click-to-navigate ward popup |
| Fixed nav chrome | `.topcluster`, `.back-fab`, `.voter-faq-fab` | Fixed-position controls, 44px min touch target, `--shadow-1`/`--shadow-2` on hover | theme toggle, back button, FAQ FAB |
| Footer primitives | `.footer-methodology`, `.footer-share*`, `.footer-org*`, `.footer-social-link` | Card/link/icon patterns for the persistent site footer | `src/js/footer.js` |

When none of these fit, build a new component (tier 2, §4) — do not force an unrelated fit.

---

## 4. New components (tier 2) — full token system, free markup

For a genuinely new UI requirement:

- **Layout/markup/class names**: your choice — no obligation to match an existing component's DOM shape.
- **Color**: only `var(--token-name)` from §1's table. If the new component needs a shade not currently in `tokens.css`, that's a real gap — add the new custom property to **both** `:root` and `[data-theme="dark"]` in `tokens.css` (see §6), don't hardcode a hex inline anywhere else, and update this skill's §1 table in the same change (§8).
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

These hexes are **intentionally theme-agnostic** (chosen to read on both light and dark CARTO basemaps) — do not add a per-theme override unless a real contrast problem is confirmed by manual verification. The one deliberate off-brand exception in this palette is the blue pair reserved for lake/pond (the Open City brand palette has no blue) — don't extend "off-brand color" to anything else without the same explicit sign-off.

---

## 6. Theme-pairing rule

`:root` (light) and `[data-theme="dark"]` in `tokens.css` are **always updated together** — this project has no separate light-only or dark-only component CSS file. Adding/changing a color token means editing both blocks in the same change.

`--lime` (`#c8e537`) is the one deliberate exception to "just a token like any other": it's near-invisible on white (~1.4:1 contrast) and is used in exactly two places, both scoped under `[data-theme="dark"]`: the home search input's `:focus-visible` ring, and the eyebrow dot. Do not use `--lime` in the light theme, for text, or as a general highlight elsewhere.

---

## 7. Font rule

Only Manrope (`--font-display`/`--font-stat`) and PT Sans (`--font-body`). Manrope is the deliberate stand-in for the brand guideline's Aileron (not on Google Fonts) — don't "fix" that substitution in either direction.

**Banned — do not reintroduce:** Poppins, Inter, Inter Tight, Playfair Display, Plus Jakarta Sans.

---

## 8. Self-maintenance rule (this file must not drift)

Whenever a UI/UX change request or bug report **changes a token value, adds/removes a color, changes spacing/radius/elevation/typography, or introduces a new reusable component pattern** in `tokens.css`, `base.css`, `components.css`, `transition.css`, or `LAYER`/`CORP_COLORS` in `maps.js` — update the matching table/catalog entry in this SKILL.md **in the same change**, not later. This file's tables (§1, §3, §5) are a mirror of those source files; treat a merged change that leaves them out of sync as incomplete.

This skill governs *design correctness* (did the change use the right tokens/patterns) and only applies when a change is genuinely visual — a new color/spacing/radius/elevation/font/touch-target decision, or a new component pattern — not just because it lands in a styling file or a render function. `verify-and-update-docs` governs *verification and doc-sync* (syntax gates, grep sweeps, CLAUDE.md/README.md updates) and applies more broadly, but likewise only when the change is substantial enough to need it (see that skill's own "When to invoke this"). Neither skill is a reflex for every edit — both exist to catch real drift (design-token violations, or stale docs), not to add process to trivial changes.

When a change does genuinely touch design *and* is substantial: this skill runs first (or alongside implementation), to confirm token/pattern correctness while the change is being written; then `verify-and-update-docs` runs once, after the change is fully implemented and already tested successfully — never the reverse, and never either skill more than once per completed change.

---

## 9. Pre-flight checklist (run before finishing any UI change)

1. No hardcoded hex/rgb color anywhere outside `tokens.css` or `maps.js`'s `LAYER`/`CORP_COLORS` (the one WhatsApp-brand exception in §3 aside).
2. Every `var(--...)` you wrote resolves to a real definition in `tokens.css` (`:root` or `[data-theme="dark"]`) — except `--ripple-x`/`--ripple-y`, set at runtime by `theme.js`.
3. If you added/changed a color token, both `:root` and `[data-theme="dark"]` were updated (§6).
4. Every clickable element is ≥44px touch target.
5. Text follows the 3-tier hierarchy (§2) — no paragraph-length text on `--muted`/`--hint`.
6. You reused an existing component class (§3) if one fit the purpose; if you built a new one, it's still 100%-token-built (§4).
7. No new font, icon library, CSS framework, or bundler was introduced (§7, and CLAUDE.md's "Do Not" list).
8. If any table in this file (§1/§3/§5) is now stale relative to the source files you changed, you updated it (§8).

---

## 10. Do-Not list

- No CSS framework, bundler, or build step — this is a deliberate zero-build static site (CLAUDE.md).
- No new hardcoded brand hex outside `tokens.css` / `maps.js`'s `LAYER`/`CORP_COLORS`.
- No new font or icon library — every icon in this app is a hand-coded `currentColor` inline SVG; every font is Manrope/PT Sans.
- Don't reintroduce Poppins, Inter, Inter Tight, Playfair Display, or Plus Jakarta Sans.
- Don't add a per-theme marker-color override in `maps.js` without a confirmed, manually-verified contrast problem.
- Don't use `--lime` outside the two dark-theme-only spots already documented in §6.
