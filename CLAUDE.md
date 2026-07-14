# CLAUDE.md

Agent-facing rules for **Know Your Ward** — a static, no-build Bengaluru civic ward-information site. MapLibre GL JS for maps, vanilla ES modules (no framework, no bundler), data loaded client-side from local CSV/JSON files. There is no backend and no build step by design; the repo is deployed to Vercel (and is portable to any static host) exactly as committed. "Know Your Ward" is this project's engineering-facing name; the site's visitor-facing name (page `<title>`, meta description, eyebrow, share text) is currently **"Nimma Ward, Nimma Vote."**

## File map

```
index.html                        3-view shell + <footer id="siteFooter">, CDN tags (MapLibre, PapaParse, Google Fonts), theme toggle
vercel.json                       Cache-Control headers for /public/data/*
favicon.svg                       site icon

public/data/GBA_369_Wards_Enriched.geojson
                                   canonical ward boundaries + ward-level amenity counts/coverage
public/data/wards.csv             supplemental ward text/fact fields keyed by uid
public/logos/                     org logo images for the footer (janaagraha-logo.png, oorvani-logo.png)

src/js/data-loader.js             loadData() -> { W, nameIndex, A, meta } — the only module that fetches data
src/js/theme.js                   theme persistence, View-Transitions ripple toggle, theme-change pub/sub
src/js/footer.js                  global site footer: Methodology link, per-ward Share/WhatsApp/Copy-link row
                                   (hidden outside the ward view), org attribution + social links
src/js/maps.js                    all MapLibre + geometry helpers: LAYER (color + icon per amenity), CORP_COLORS,
                                   tile URLs, GeoJSON ray-casting, boundary builders, hover tracking
src/js/home-view.js               cover/landing view: search, geolocation, corp choropleth map, ward-definition
                                   copy, GBA/ward-councillor + how-this-works/about-data panels, ward list
src/js/ward-view.js               ward detail: head block (formed-from-old-wards + key-areas), candidates,
                                   map+legend, amenities grid, facts engine, ask/why-vote panels — the largest view module
src/js/methodology-view.js        static content + "return to previous view"
src/js/main.js                    composition root: loads data, inits theme, owns the view router + footer state

src/styles/tokens.css             design tokens only (colors, spacing, elevation, fonts) — light + [data-theme="dark"]
src/styles/base.css               resets, view show/hide scaffold, fixed-position clusters
src/styles/components.css         every component/view style (buttons, cards, legend, amenity grid, facts, footer...)
src/styles/transition.css         theme-ripple + eyebrow-pulse keyframes only

.claude/skills/verify-and-update-docs/SKILL.md   verification-before-documentation workflow for this repo
```

## Data & Keying Rules

- `W` (in `data-loader.js`) is keyed by **`uid`** (`{corporation}-{ward_id}`, e.g. `"West-25"`), never by `ward_name`. `ward_name` is incidentally unique in the current dataset but not structurally guaranteed across the 5 corporations.
- `nameIndex` maps a lowercased `ward_name` to its `uid`, for search/display only. Any new lookup/navigation code should resolve to `uid` and use `ward_name` only for rendering.
- CSV parsing uses PapaParse with `dynamicTyping: true`; blank cells become `null` (confirmed empirically), not `""` or `0` — don't add redundant empty-string guards to threshold logic that already checks `== null`.
- `neighbourhoods` and `old_wards` CSV columns are semicolon-joined free text and are parsed into arrays in `data-loader.js` (`parseNeighbourhoods`, `parseOldWards`) — don't re-split them elsewhere. `ward-view.js`'s head block renders these directly: `old_wards` (`[{name, pct}]`) under "Formed from old wards", `neighbourhoods` (`string[]`) under "Key areas" — both fall back to "Not available" when empty (`neighbourhoods` is blank for ~56 wards; `old_wards` is never blank in the current dataset).

## Map Rules (`src/js/maps.js`)

- MapLibre GL JS only — this project does not use Leaflet.
- Basemap tiles are CARTO `light_nolabels` / `dark_nolabels` raster tiles. MapLibre does not support Leaflet's `{s}` subdomain placeholder — subdomains (`a`-`d`) must stay expanded into a literal array (`tileUrlForTheme`).
- `LAYER` and `CORP_COLORS` are the single source of truth for every amenity icon/color and every corporation map fill color. Never hardcode a color for an amenity/corporation anywhere else.
- `LAYER[key].icon` is a hand-coded, `currentColor`-based inline-SVG string (one per amenity type) rendered in `ward-view.js`'s `.amrow` list — it is a visual pictogram only.
- The ward detail map uses `GBA_369_Wards_Enriched.geojson` for the ward boundary and currently enables real point markers only for polling booths from `Polling_Booths_with_GBA_369_Ward_Information.geojson`. Other amenity `*_with_GBA_369_Ward_Information.geojson` files are placeholder copies until replaced with real source data, so do not fetch or render them as marker layers yet.
- Polling booth features must be assigned by spatial point-in-ward checks against enriched ward boundaries. Ignore `ward_join_status !== "matched"`, ignore non-Point/invalid geometries, and drop matched points that do not fall inside any enriched ward.
- Ward Map filter cards render only for layers with valid point data in the selected ward. The separate Amenities grid keeps non-polling counts from the enriched GeoJSON; polling booths are map-filter-only and should not be added as an Amenities row.
- Keep the 800m walk checkbox visible, but apply buffers only to `LAYER[type].walk` layers. For non-walkable active layers such as polling, clear/disable the buffer behavior.
- Feature-state hover (`makeHoverTracker`) must always clear the previously-hovered feature id before setting a new one — a stuck highlight means this bookkeeping broke.
- The 800m walk buffer (`buildWalkBuffer`) uses a latitude-adjusted geodesic formula (`dLng = meters / (111320 * cos(lat))`) — Bengaluru sits at ~13°N, so a flat degree offset produces a visibly non-circular buffer. Don't simplify this back to a fixed offset.
- `wardAt`/`pointInWard` operate on GeoJSON `Polygon`/`MultiPolygon` geometry, including holes. Do not flatten a ward to `geometry.coordinates[0]`; wards such as `East-28` have multiple polygons and `North-21` has an interior ring.

## Facts Engine Rules (`src/js/ward-view.js`)

- `buildFacts` and `suggestedQuestions` encode exact ground-truth thresholds ported from the original prototype (`WID_v5_7742.html`) — e.g. bus "cannot-reach" ≥30% is `bad`, parks ≥40% is `bad`, the WHO open-space benchmark is 9m²/person, water-rich is ≥2× the in-memory citywide average. Do not tune a threshold without re-deriving it from source; these numbers are not arbitrary.
- Flood-prone spot counts come from enriched GeoJSON `FloodProne_Count` and are exposed to the view as `flood_prone`; `flood_vuln` is currently `0` in the normalized app data.
- `buildFacts` caps output at 7 facts (`F.slice(0,7)`); `suggestedQuestions` caps at 6 and dedupes — preserve both caps.

## Styling & Theming Rules

- All brand colors, spacing, and elevation values live only in `src/styles/tokens.css` as named custom properties (Open City brand palette: green primary, red alert, yellow highlight, a 4pt spacing scale `--space-1`..`--space-7`, and a 3-step elevation scale `--shadow-1`/`--shadow-2`/`--shadow-3`). Components consume tokens (`var(--...)`) — never hardcode a brand hex value in `components.css` or in JS-rendered markup.
- `:root` (light) and `[data-theme="dark"]` in `tokens.css` must always be updated together — this project has no separate "light-only" or "dark-only" component file.
- `LAYER`/`CORP_COLORS` hexes in `maps.js` are intentionally theme-agnostic (chosen to read on both the light and dark CARTO basemaps) — don't add a per-theme marker color override unless a real contrast problem is found during manual verification.
- Fonts: Manrope (`--font-display`/`--font-stat`, headings and stat numbers) and PT Sans (`--font-body`, body text) — do not reintroduce Poppins, Inter, Inter Tight, Playfair Display, or Plus Jakarta Sans. Manrope is the deliberate substitute for the brand guideline's Aileron, which is not on Google Fonts — don't "fix" it in either direction.
- `--lime` (`#c8e537`, the Open City accent) is dark-background-only — it is near-invisible on white (~1.4:1 contrast). It appears in exactly two places, both scoped under `[data-theme="dark"]`: the home search input's `:focus-visible` ring and the eyebrow dot. Do not use it in the light theme, for text, or as a general highlight.
- Touch targets on interactive elements (`.btn`, `.ward-row`, `.icon-btn`) are `min-height: 44px` — preserve this on any further edits.
- Text color follows a 3-tier hierarchy: body/description-length copy uses `--ink` (full contrast — e.g. `.panel p`, `.ward-def`, `.cand-intro`), inline metadata uses `--muted` (e.g. `.ward-row-meta`, `.whead-meta`, `.candparty`), and uppercase captions/labels use `--hint` (e.g. `.fact .k`, `.map-caption`, `.find-count`, `.whead-origin-block .label`). Don't put sentence-length text on `--muted`/`--hint` — those tones are for short secondary labels, not paragraphs.

## Must-preserve selectors

The view JS modules build their markup via template strings and re-query the DOM by these exact IDs/classes. CSS or markup changes must never rename or remove them without updating every JS reference:

- **IDs**: `findList`, `findCount`, `findSearch`, `findLocate` (all rendered by `home-view.js`), `homeContainer`, `homeCorpMap`, `loadingIndicator`, `siteFooter`, `methodologyLink` and `copyLinkBtn` (both now rendered and wired by `footer.js`, not `main.js`/`ward-view.js`), `footerShare`, `footerWhatsapp`, `methodologyContainer`, `methBack`, `themeToggle`, `wardContainer`, `wardBack`, `wardMap`, `view-home`/`view-ward`/`view-methodology`.
- **Classes**: `.view`, `.view--active`, `.ward-row` (carries `data-uid`), `.amrow` (carries `data-layer`), `.map`, `.map-tip` (Popup `className` set in `home-view.js`, styled in `components.css`).

## Verification Rules

This project has no bundler, linter, formatter, or type checker — that is a deliberate architectural choice (zero-build static site), not an oversight. Do not add `package.json`/ESLint/Prettier/TypeScript without discussing it first. The real static gates for any change here are:

1. `node --input-type=module --check < path/to/file.js` for every changed file in `src/js/` — the only syntax gate available for ES modules with no bundler.
2. A `grep` sweep confirming: no banned terms reappear (`chart.js`, `plus jakarta`), no leftover reference to a removed color/token, and every ID/class in the "must-preserve selectors" list above is still present in `src/js/*.js`.
3. Confirm every `var(--...)` used in `base.css`/`components.css`/`transition.css` has a matching definition in `tokens.css` (`:root` or `[data-theme="dark"]`) — except `--ripple-x`/`--ripple-y`, which are set at runtime by `theme.js`, not defined statically.

UI/CSS changes additionally require a manual browser walk of all 3 views (home, ward, methodology), in both themes, at a few widths — there is no automated screenshot or test-runner tooling in this repo. See `.claude/skills/verify-and-update-docs/SKILL.md` for the full workflow.

## Do Not

- Do not add Chart.js, Leaflet, Plus Jakarta Sans, Inter, Inter Tight, Playfair Display, or Poppins back into the project (Poppins was intentionally replaced by Manrope, the closest Google-Fonts match to the brand's Aileron).
- Do not add a bundler, package.json, or any npm dependency without discussing it first — the zero-build static-site architecture is intentional.
- Do not key ward data by `ward_name` — always `uid`.
- Do not invent commands, scripts, env vars, or file paths that don't exist in this repo when writing docs or instructions.

## Current state (by area)

- **Data loading**: keys everything by `uid`, not `ward_name`; loads `GBA_369_Wards_Enriched.geojson` as the canonical boundary/count/coverage source, `Polling_Booths_with_GBA_369_Ward_Information.geojson` as the only active marker source, and `wards.csv` for supplemental text/fact fields; citywide averages and `meta` are computed in memory.
- **Maps**: MapLibre GL JS (pinned `5.24.0` via CDN) across 2 map instances (home choropleth, ward detail); CARTO light/dark raster tiles swapped on theme change; feature-state hover is used on the home choropleth. Hovering a ward on the home choropleth shows a cursor-following `maplibregl.Popup` tooltip ("Ward N · name · corporation", class `.map-tip`, theme-aware via tokens) and outlines the hovered ward in black via the feature-state-driven `wards-line-hover` layer — the fill is constant and does not change on hover. The ward detail map renders the enriched ward boundary plus currently valid polling-booth point markers and hides non-polling filter cards until real point sources are available.
- **Facts engine**: `buildFacts`/`suggestedQuestions` in `ward-view.js` use exact ground-truth thresholds (not invented), capped at 7 facts / 6 questions.
- **Ward head block**: shows "Formed from old wards" (predecessor wards + % overlap from delimitation) and "Key areas" (localities), sourced from the `old_wards`/`neighbourhoods` CSV columns; there is no Corporator/AEE contact display or N/E/S/W neighbour-navigation row on the ward detail page.
- **Ward detail section cards**: every major block on the ward detail page — `.whead` (Ward Information) and every `.sec` (Who is contesting, Ward map, Amenities, Did you know?, Questions, BBMP Sahaaya) — renders as its own light card: `background: var(--surface-2)`, `border: 1px solid var(--line)`, `border-radius: var(--radius-l)` (18px, the newest step in the `--radius`/`--radius-m`/`--radius-s` scale), `box-shadow: var(--shadow-1)`, `padding: var(--space-5)` (bumped to `var(--space-6)` at the `min-width: 900px` breakpoint). Because the card background is `--surface-2` (the same token `.pill` and `.amrow:hover` used to use), `.pill`'s base background is `--surface` and `.amrow:hover`'s background is `--surface` too, so both stay visibly distinct against the new card background — don't revert either back to `--surface-2` without re-checking that contrast. Questions-to-ask and BBMP Sahaaya used to share one `.sec.tabpane` wrapper; they're now two independent `.sec` blocks (the `.tab-ask`/`.sahaaya`/`.tabpane` wrapper classes are gone, since they carried no styling of their own beyond the removed `.tabpane` layout rule).
- **Candidates**: `renderCandidates()` in `ward-view.js` is a "Coming soon" placeholder — heading "Who is contesting the election in your ward?", an intro sentence, and per-candidate placeholder Affidavit (assets/cases/education) and Manifesto fields. No real candidate data is wired up.
- **Amenity icons**: every `.amrow` on the ward page (Amenities section) renders a small `currentColor` inline-SVG pictogram from `LAYER[key].icon` (maps.js), one per amenity type.
- **Ward Map section**: `renderWardMap()` in `ward-view.js` renders the ward boundary map, status badge, filter cards for point-backed layers, Reset control, and visible 800m walk checkbox. Today the only point-backed layer is polling booths, so non-polling amenities remain absent from the Ward Map filter strip even when their enriched count is non-zero. Reset returns to the default point-backed layer, and the walk checkbox stays disabled for non-walkable layers such as polling.
- **Site footer**: a persistent `<footer>` (`src/js/footer.js`) renders on all 3 views — a Methodology feature card, a Share-this-ward/WhatsApp/Copy-link row shown only on the ward view (`setFooterView`/`setFooterWard`, driven by `main.js`'s router), and an org-attribution block ("Made with ❤️ for Bengaluru by:"). The Methodology entry (`a#methodologyLink.footer-methodology`) is a bordered, shadowed card — an icon badge (`.footer-methodology-icon`, `--green-soft`/`--green-d` tokens) plus a title/description text stack ending in an inline arrow — rather than a plain text link; same click handler and `#methodology` href as before, only the markup/styling changed. The WhatsApp and Copy-link buttons (`#footerWhatsapp`/`#copyLinkBtn`) each carry a small hand-coded `currentColor` SVG glyph ahead of their label, consistent with this project's no-icon-library convention; the Copy-link button's "Copied!" swap targets an inner `.btn-label` span (not the button's `textContent`) so the prepended icon survives the state change. The share row (`#footerShare`) is a vertical stack at every viewport width, not just on mobile: `.footer-share-label` ("Share this ward") sits above a `.footer-share-actions` row holding the WhatsApp/Copy-link buttons, which sit side by side and wrap onto a second line only when the viewport is too narrow for both (`.footer-share-actions .btn { flex-shrink: 0 }` so a button wraps whole rather than squeezing its text). A hairline `border-top` on `.footer-attribution` visually separates the utility row from the org row. Below that, the two orgs are kept strictly segregated: each org is its own `.footer-org-group` — a logo badge (`public/logos/{janaagraha,oorvani}-logo.png`, logo-only, no visible org name) immediately followed by *that org's own* social icons, with a `.footer-org-divider` between the two groups so the icons never read as one mixed list. Both logos sit on a fixed-light `.footer-org-badge` card (`--footer-logo-bg`/`--footer-logo-fallback-ink` tokens, same value in both themes like `--lime`) since the logo art itself is theme-agnostic dark ink that would be near-invisible directly on the dark theme's surface color — this badge is a static card (no hover affordance, since it isn't clickable). Social URLs live in a `SOCIAL_LINKS` config at the top of `footer.js` (all filled in, including Janaagraha's LinkedIn); `ORG_LABELS`/`NETWORK_LABELS` maps build human-readable `aria-label`s (e.g. "Janaagraha on YouTube") and each org's icon row carries `role="group"` for assistive tech. Social icon buttons are `44×44px` (matching this project's touch-target convention, up from an earlier `32px`).
- **Methodology view**: `methodology-view.js` renders fixed, non-dynamic content (no longer built from `meta` fields, though `initMethodologyView({ meta }, ...)` still destructures `meta` in its signature purely to stay call-site-compatible with `main.js`) — an info `.callout` box up top (a hand-coded `currentColor` info-circle SVG + a `<p><strong>Note:</strong> ...</p>`, styled with the `--yellow-soft`/`--yellow-ink`/`--yellow-line` "highlight/warn" tokens also used by `<mark>`), followed by three numbered `.sec` card sections ("1. Finding the data:", "2. Turning it into ward-level numbers:", "3. Scope and next steps.") reusing the same card component as the ward-detail sections, each holding a `.meth-list` bullet list. The OpenCity GIS-data explainer is a real external link (`target="_blank" rel="noopener"`, matching the footer's external-link convention).
- **Site name**: the visitor-facing name is "Nimma Ward, Nimma Vote" (page `<title>`, meta description, home eyebrow "Make an informed choice", WhatsApp share text) — see the top of this file.
- **Home view extras**: a ward-definition paragraph and a "Know your ward before you vote." transition line sit between the search controls and the choropleth map; two `<details class="panel">` accordions ("What is the Greater Bengaluru Authority?", "What is a ward councillor?") sit above the existing "How this works"/"About the data" panels. The `#findList` ward list is a fixed-height, internally scrollable box (`.ward-list`, `overflow-y: auto`, bordered) rather than a page-stretching list — its `max-height` shrinks/grows at the existing 520px/900px breakpoints alongside `.map-corp`/`.map-ward`/`.amgrid`.
- **View navigation**: `main.js` tracks history as a `viewStack` (not a single "previous view" slot) — `navigateTo(name)` pushes the current view and switches, no-opping if `name` already equals the current view; `goBack()` pops the stack (falling back to `home` if empty) and is passed as a stable `onBack`/`goBack` callback to `openWard()` and `initMethodologyView()`. This makes back-navigation correct across multiple hops (e.g. ward → methodology → back → back lands on home) and makes repeat clicks on the Methodology footer link idempotent rather than corrupting history. `showView()` — the single function every one of those paths funnels through to actually swap the visible `.view` — also resets `window.scrollTo(0, 0)` on every call, so every transition (forward or back) always lands at the top of the page rather than preserving whatever scroll position the previous view was left at.
- **Theming**: full Open City brand palette (light + dark), a 4pt spacing scale, and a 3-step elevation system in `tokens.css`; Manrope (headings/stat numbers, standing in for the brand's Aileron) + PT Sans (body); the brand's lime accent (`--lime`) is used sparingly in the dark theme only (search focus ring, eyebrow dot); theme toggle uses the View Transitions API with a circular ripple and a `prefers-reduced-motion`-respecting fallback. Body-length text uses `--ink`, metadata uses `--muted`, captions/labels use `--hint` (see Styling & Theming Rules above).
- **Map/legend colors**: `LAYER` (13 amenity types) and `CORP_COLORS` (5 corporations) use an 18-color palette derived from the brand's red/green/yellow arc plus one deliberate off-brand blue pair reserved for lake/pond (the brand palette has no blue, and this is the one intentional exception, agreed on for water-category legibility).
- **Responsiveness**: 44px minimum touch targets across interactive elements; breakpoints at 520px/380px (narrow) and 900px (wide — `.container` widens to 960px and `.amgrid`/`.factslist` reflow into multi-column grids); two further desktop tiers widen `.container` again at 1200px (1140px) and 1440px (1280px) — grids/maps/flex-wrap rows need no matching changes since `.map` is already `width:100%`, `.amgrid`/`.factslist`/`.candgrid-row` already use `repeat(auto-fit, minmax(...))`, and `.footer-orgs`/`.legend`/`.corp-legend` already `flex-wrap`, so they all absorb the extra width automatically; the theme-toggle cluster respects `env(safe-area-inset-*)`.
- **Verification**: no test framework or lint/build tooling exists; verification is `node --check` per changed JS file, targeted `grep` sweeps, and manual browser walkthroughs — see the `verify-and-update-docs` skill.
