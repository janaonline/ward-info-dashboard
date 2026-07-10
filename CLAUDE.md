# CLAUDE.md

Agent-facing rules for **Know Your Ward** — a static, no-build Bengaluru civic ward-information site. MapLibre GL JS for maps, vanilla ES modules (no framework, no bundler), data loaded client-side from local CSV/JSON files. There is no backend and no build step by design; the repo is deployed to Vercel (and is portable to any static host) exactly as committed.

## File map

```
index.html                        4-view shell, CDN tags (MapLibre, PapaParse, Google Fonts), theme toggle, methodology link
vercel.json                       Cache-Control headers for /public/data/*
favicon.svg                       site icon

public/data/wards.csv             369 rows, one per ward — the only tabular data source, keyed by uid
public/data/wards-geometry.json   ward polygons + amenity point coordinates, keyed by the same uid
public/data/meta.json             citywide averages (meta.avg) used by the facts engine + generation metadata

src/js/data-loader.js             loadData() -> { W, nameIndex, A, meta } — the only module that fetches data
src/js/theme.js                   theme persistence, View-Transitions ripple toggle, theme-change pub/sub
src/js/maps.js                    all MapLibre + geometry helpers: LAYER, CORP_COLORS, tile URLs, ray-casting,
                                   seeded polling scatter, walk buffers, feature-state hover tracking
src/js/home-view.js               cover view: corp choropleth map, geolocation CTA
src/js/find-view.js               search, geolocation, all-ward map, capped/sorted list
src/js/ward-view.js               ward detail: head block, map+legend, amenities grid, facts engine,
                                   N/E/S/W nav, ask/share panels — the largest view module
src/js/methodology-view.js        static content + "return to previous view"
src/js/main.js                    composition root: loads data, inits theme, owns the view router

src/styles/tokens.css             design tokens only (colors, spacing, elevation, fonts) — light + [data-theme="dark"]
src/styles/base.css               resets, view show/hide scaffold, fixed-position clusters
src/styles/components.css         every component/view style (buttons, cards, legend, amenity grid, facts, nav, tabs...)
src/styles/transition.css         theme-ripple + eyebrow-pulse keyframes only

.claude/skills/verify-and-update-docs/SKILL.md   verification-before-documentation workflow for this repo
```

## Data & Keying Rules

- `W` (in `data-loader.js`) is keyed by **`uid`** (`{corporation}-{ward_id}`, e.g. `"West-25"`), never by `ward_name`. `ward_name` is incidentally unique in the current dataset but not structurally guaranteed across the 5 corporations.
- `nameIndex` maps a lowercased `ward_name` to its `uid`, for search/display only. Any new lookup/navigation code should resolve to `uid` and use `ward_name` only for rendering.
- CSV parsing uses PapaParse with `dynamicTyping: true`; blank cells become `null` (confirmed empirically), not `""` or `0` — don't add redundant empty-string guards to threshold logic that already checks `== null`.
- `neighbourhoods` and `old_wards` CSV columns are semicolon-joined free text and are parsed into arrays in `data-loader.js` (`parseNeighbourhoods`, `parseOldWards`) — don't re-split them elsewhere.

## Map Rules (`src/js/maps.js`)

- MapLibre GL JS only — this project does not use Leaflet.
- Basemap tiles are CARTO `light_nolabels` / `dark_nolabels` raster tiles. MapLibre does not support Leaflet's `{s}` subdomain placeholder — subdomains (`a`-`d`) must stay expanded into a literal array (`tileUrlForTheme`).
- `LAYER` and `CORP_COLORS` are the single source of truth for every legend chip and every map fill/marker color in the app. Never hardcode a color for an amenity/corporation anywhere else — change it here and both the legend and the map update together.
- The ward map renders only **one** amenity layer at a time (`setActiveAmenityLayer`) — the 13 amenity colors are chosen for legend-row + single-dot legibility, not for simultaneous mutual distinction. Only the 5 `CORP_COLORS` are shown together and must stay mutually distinct.
- Feature-state hover (`makeHoverTracker`) must always clear the previously-hovered feature id before setting a new one — a stuck highlight means this bookkeeping broke.
- The 800m walk buffer (`buildWalkBuffer`) uses a latitude-adjusted geodesic formula (`dLng = meters / (111320 * cos(lat))`) — Bengaluru sits at ~13°N, so a flat degree offset produces a visibly non-circular buffer. Don't simplify this back to a fixed offset.
- The seeded polling-booth scatter (`hashStr` + `mulberry32` + `pollingPts`) must stay seeded from `hashStr(uid + '|' + n)` so it is stable across reloads regardless of iteration order — never seed from `Math.random()`, `Date.now()`, or array index.
- `wardAt`/`pointInWard` iterate every ring of a ward's `geom` — some wards (e.g. `North-2`) have multiple rings; don't assume `geom[0]` is the whole ward.

## Facts Engine Rules (`src/js/ward-view.js`)

- `buildFacts` and `suggestedQuestions` encode exact ground-truth thresholds ported from the original prototype (`WID_v5_7742.html`) — e.g. bus "cannot-reach" ≥30% is `bad`, parks ≥40% is `bad`, the WHO open-space benchmark is 9m²/person, water-rich is ≥2× the citywide average from `meta.avg`. Do not tune a threshold without re-deriving it from source; these numbers are not arbitrary.
- Flood is always the sum of two distinct fields — `flood_vuln + flood_prone` (CSV counts) and `floodvuln`/`floodprone` concatenated (geometry points). Never treat "flood" as a single CSV/geometry key.
- `buildFacts` caps output at 7 facts (`F.slice(0,7)`); `suggestedQuestions` caps at 6 and dedupes — preserve both caps.

## Styling & Theming Rules

- All brand colors, spacing, and elevation values live only in `src/styles/tokens.css` as named custom properties (Open City brand palette: green primary, red alert, yellow highlight, a 4pt spacing scale `--space-1`..`--space-7`, and a 3-step elevation scale `--shadow-1`/`--shadow-2`/`--shadow-3`). Components consume tokens (`var(--...)`) — never hardcode a brand hex value in `components.css` or in JS-rendered markup.
- `:root` (light) and `[data-theme="dark"]` in `tokens.css` must always be updated together — this project has no separate "light-only" or "dark-only" component file.
- `LAYER`/`CORP_COLORS` hexes in `maps.js` are intentionally theme-agnostic (chosen to read on both the light and dark CARTO basemaps) — don't add a per-theme marker color override unless a real contrast problem is found during manual verification.
- Fonts: Poppins (`--font-display`/`--font-stat`, headings and stat numbers) and PT Sans (`--font-body`, body text) — do not reintroduce Inter, Inter Tight, Playfair Display, or Plus Jakarta Sans.
- Touch targets on interactive elements (`.btn`, `.ward-row`, `.amrow`, `.legend-btn`, `.nav-btn`, `.icon-btn`) are `min-height: 44px` — preserve this on any further edits.

## Must-preserve selectors

The view JS modules build their markup via template strings and re-query the DOM by these exact IDs/classes. CSS or markup changes must never rename or remove them without updating every JS reference:

- **IDs**: `findList`, `findCount`, `findContainer`, `findSearch`, `findLocate`, `findMap`, `homeContainer`, `ctaFind`, `ctaLocate`, `homeCorpMap`, `loadingIndicator`, `methodologyLink`, `methodologyContainer`, `methBack`, `themeToggle`, `bufferToggle`, `wardContainer`, `wardBack`, `copyLinkBtn`, `wardMap`, `view-home`/`view-find`/`view-ward`/`view-methodology`.
- **Classes**: `.view`, `.view--active`, `.ward-row` (carries `data-uid`), `.legend-btn` (carries `.active` + `data-layer`), `.amrow` (carries `data-layer`), `.nav-btn` (carries `data-uid`), `.map`.

## Verification Rules

This project has no bundler, linter, formatter, or type checker — that is a deliberate architectural choice (zero-build static site), not an oversight. Do not add `package.json`/ESLint/Prettier/TypeScript without discussing it first. The real static gates for any change here are:

1. `node --input-type=module --check < path/to/file.js` for every changed file in `src/js/` — the only syntax gate available for ES modules with no bundler.
2. A `grep` sweep confirming: no banned terms reappear (`chart.js`, `plus jakarta`), no leftover reference to a removed color/token, and every ID/class in the "must-preserve selectors" list above is still present in `src/js/*.js`.
3. Confirm every `var(--...)` used in `base.css`/`components.css`/`transition.css` has a matching definition in `tokens.css` (`:root` or `[data-theme="dark"]`) — except `--ripple-x`/`--ripple-y`, which are set at runtime by `theme.js`, not defined statically.

UI/CSS changes additionally require a manual browser walk of all 4 views, in both themes, at a few widths — there is no automated screenshot or test-runner tooling in this repo. See `.claude/skills/verify-and-update-docs/SKILL.md` for the full workflow.

## Do Not

- Do not add Chart.js, Leaflet, Plus Jakarta Sans, Inter, Inter Tight, or Playfair Display back into the project.
- Do not add a bundler, package.json, or any npm dependency without discussing it first — the zero-build static-site architecture is intentional.
- Do not key ward data by `ward_name` — always `uid`.
- Do not invent commands, scripts, env vars, or file paths that don't exist in this repo when writing docs or instructions.

## Current state (by area)

- **Data loading**: keys everything by `uid`, not `ward_name`; loads 3 static files from `public/data/` with no backend; PapaParse handles CSV parsing including quoted, comma-containing fields.
- **Maps**: MapLibre GL JS (pinned `5.24.0` via CDN) across 3 map instances (home choropleth, find all-wards, ward detail); CARTO light/dark raster tiles swapped on theme change; feature-state hover, 800m geodesic walk buffers, and a seeded polling-booth scatter are all ported verbatim from the original prototype's algorithms.
- **Facts engine**: `buildFacts`/`suggestedQuestions` in `ward-view.js` use exact ground-truth thresholds (not invented), capped at 7 facts / 6 questions.
- **Theming**: full Open City brand palette (light + dark), a 4pt spacing scale, and a 3-step elevation system in `tokens.css`; Poppins (headings/stat numbers) + PT Sans (body); theme toggle uses the View Transitions API with a circular ripple and a `prefers-reduced-motion`-respecting fallback.
- **Map/legend colors**: `LAYER` (13 amenity types) and `CORP_COLORS` (5 corporations) use an 18-color palette derived from the brand's red/green/yellow arc plus one deliberate off-brand blue pair reserved for lake/pond (the brand palette has no blue, and this is the one intentional exception, agreed on for water-category legibility).
- **Responsiveness**: 44px minimum touch targets across interactive elements; breakpoints at 520px and 380px; fixed theme-toggle/methodology-link clusters respect `env(safe-area-inset-*)`.
- **Verification**: no test framework or lint/build tooling exists; verification is `node --check` per changed JS file, targeted `grep` sweeps, and manual browser walkthroughs — see the `verify-and-update-docs` skill.
