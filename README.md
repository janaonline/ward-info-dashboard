# Know Your Ward

A mobile-first, static website that helps Bengaluru residents understand their own civic ward — amenities, coverage gaps, flood risk, and how the ward was formed — for all 369 wards across the city's 5 civic corporations. The site's visitor-facing name is "Nimma Ward, Nimma Vote."

There's no backend and no build step. It's plain HTML, CSS, and vanilla ES modules, with [MapLibre GL JS](https://maplibre.org/) for maps and [PapaParse](https://www.papaparse.com/) for CSV parsing, both loaded from a CDN. All ward data ships as static files in the repo.

## Running locally

Because the app `fetch()`es its data files, opening `index.html` directly (`file://`) won't work — browsers block `fetch` of local files under that protocol. Serve the repo root with any static file server instead:

```
npx serve .
# or
python -m http.server
```

Then open the printed local URL. There is nothing to install and nothing to compile — edit any file under `src/` or `index.html` and reload.

## Deployment

The site deploys to [Vercel](https://vercel.com) as a static project — no framework preset, no build command. `vercel.json` sets a `Cache-Control` header on `/public/data/*` so the ward dataset is cached at the edge. Because there's no build step, the same repo is portable to any static host (e.g. AWS S3 + CloudFront) with no changes.

## Features

A persistent site header (logo + Home/Methodology/Voter FAQs nav on desktop; logo + hamburger menu on mobile, or a back-chevron + page/ward title on mobile for every non-home view) sits above all 4 views, replacing the theme toggle and floating buttons an earlier version of this site had.

**Home** — the landing view and the single place to find your ward. A dark hero carries the headline, a search box (all 369 wards, by name/ward number/corporation/assembly constituency, with a live autosuggestion dropdown — instant local matches from the first letter typed, plus debounced landmark lookups via the public OpenStreetMap Nominatim API, cross-checked against ward boundaries before being shown), and a 2×2 stat tile row (wards/corporations/councillor-per-ward/years since the last poll). A full-width "Why vote?" band follows, then a "Ward Explorer" section pairing the corporation choropleth map with a browsable ward list — corporation filter pills here actually filter both the map and the list, not just the map. Four accordion panels explain the GBA, the ward councillor role, and how the site's data works, and a closing band links out to the Methodology page.

**Ward detail** — the core of the app for a single ward. A dark head band gives the ward's name, a breadcrumb, badges (ward number/corporation/assembly/reservation), Share-on-WhatsApp/Copy-link buttons, and population/male/female/polling-booth stat tiles. A sticky sub-nav (Overview / Candidates / Ward map / Amenities / Safety & climate / Ask your candidates / Feedback — abbreviated to 4 tabs on mobile) scroll-spies the rest of the page. Below it: an Overview card (predecessor wards with % overlap, key areas); a "coming soon" candidates placeholder; an interactive ward map with 13 amenity-type filter cards, an 800m walk-reach toggle, and a secondary dimmed-marker layer for nearby amenities in neighbouring wards within 1.6km of the boundary; an Amenities grid whose rows are tone-colored cards (green/orange/red) driven by the same population-derived benchmark that powers each row's progress bar or badge, with a "show all" toggle past the first 6; a "Did you know?" band; a combined "Safety & climate" section (flood-prone/vulnerable counts + a temperature card) alongside a "BBMP Sahaaya" top-complaints card; a suggested-questions-to-ask-your-candidates list; and a closing feedback band linking to an external Microsoft Forms link (not pre-filled with ward info — Microsoft Forms only supports dynamic pre-fill via a form-owner-generated link this project doesn't have access to).

**Methodology** — a stat card (369 wards / 800m walking buffer / 1.6km collection radius), an AI-assisted-GIS-workflow disclosure note, three numbered sections covering where the data comes from, how it's turned into "15-minute walk" percentages, and what's planned next, a 4-card sources grid (KGIS/KSRSAC/OpenCity/QGIS), and a closing feedback band.

**Voter FAQs** — a neutral, factual FAQ page on the GBA elections, reachable via the site header's "Voter FAQs" nav link. A red hero pairs the headline/CTAs with a white key-dates card; a colored 8-tile grid offers a jump-to-topic entry point above the original sticky category nav + two-column accordion read-through (with instant search/highlight across all questions and answers).

**Footer** — present on all 4 views, full-bleed dark: a logo/blurb column plus Explore/Data/Sources link columns, org logo badges + social icons, and a bottom copyright bar. Ward-sharing (WhatsApp/Copy-link) lives in the Ward detail head band, not the footer.

## Data sources

All display data lives in `public/data/` and is loaded once at startup by `src/js/data-loader.js`:

- **`GBA_369_Wards_Enriched.geojson`** — canonical ward boundaries plus ward-level coverage percentages and per-corporation attributes. Ward boundary display comes from this file.
- **13 point-marker source files** (`Polling_Booths_with_GBA_369_Ward_Information.geojson`, `bmtc_bus_stops.geojson`, `Bengaluru_Metro_Stations.geojson`, `BBMP_Schools_Map.geojson`, `Bengaluru_Urban_Anganwadis_Map.geojson`, `BBMP_Public_Toilets_Map.geojson`, `BBMP_Lakes_Map.geojson`, `Flood_Prone_Locations_Map.geojson`, `Map_of_Locations_Vulnerable_to_Flooding_in.geojson`, `Bengaluru_Urban_Police_Station_Locations.geojson`, `Bengaluru_Urban_Police_Outpost_Locations_Map.geojson`, `Bengaluru_Urban_Railway_Police_Stations_Map.geojson`, `Bengaluru_Fire_Stations_Locations.geojson`) — each is a raw point dataset pre-joined to its containing ward. Matched point features are assigned to enriched ward boundaries spatially; unmatched features and points outside all wards are ignored. `police_outpost` and `railway_police` are Ward Map filter-card-only and are not added to either grid; the other 11 types appear as both a Ward Map filter card and an Amenities-grid row, while the split `flood_prone`/`flood_vuln` pair appear as a Ward Map filter card and a row in the separate "Vulnerability hotspots" grid instead — all groupings always show the identical matched-marker count. The polling-booth count always comes from the enriched GeoJSON's `Num_Polling_Stations` (never recomputed from the marker match); every other type's count — in both the Ward Map filter card and the Amenities grid — is the matched-marker count directly. `park`, `playground`, and `pond` have no backing source file, so their Amenities-grid rows always read 0 and they never get a Ward Map filter card. Points sharing the exact same coordinates within a ward — common where one facility hosts several numbered entries, or several stops share a coordinate — are nudged a few meters apart so every one still shows up as its own marker. Hovering a marker shows a name tooltip only for polling booths, schools, metro stations, and flood-prone spots — the other 9 source files carry no real per-feature name in their raw data (a uniform placeholder string), so those types intentionally show no tooltip.
- **`wards.csv`** — supplemental text and fact fields not present in the enriched GeoJSON, including old-ward overlap, neighbourhood lists, open-space-per-person, and contact/admin fields.
- **`ward_facts_questions.geojson`** — 369 features (one per ward) supplying the Ward Detail page's "Did you know?" facts (`did_you_know_1..3`) and "Questions to ask your candidates" (`question_1..5`), each a ready-to-display sentence rather than a computed statistic. Any blank field is skipped; up to 3 facts and 5 questions are shown, in the order they appear in the file.
- **`benchmarks_for_WID.csv`** — 11 rows, one per Amenities-grid row type, giving each a planning-standard description (`benchmark_text`) and, where one exists, a numeric per-capita benchmark (`benchmark`, e.g. 1 park per 5,000 residents) used to compute that row's recommended count against the ward's population.

The two flood-related source files are deliberately kept as two independent Ward Map layers (flood-prone = already-affected locations, flood-vulnerable = at future risk) rather than merged into one. Likewise, the three police-related files are three independent layers (police stations, police outposts, railway police) rather than merged into one "police" layer.

Every record is keyed by **`uid`** (`{Corporation}-{ward_id}`, e.g. `West-25`), derived from the enriched GeoJSON and never by ward name — a few ward names are similar enough across corporations that name-based joins would be unreliable. `ward_facts_questions.geojson` is the one deliberate exception: it carries no `uid`-compatible field, so it's joined to a ward by `ward_name` alone (whitespace/case-normalized), which is safe today because every ward name in both files is globally unique — confirmed empirically, not assumed.

**Known data caveat**: corporator and engineering-division contact fields (`contact_corporator`, `contact_aee_phone`, `contact_aro_phone`) repeat across many wards, suggesting they reflect an AC/AEE administrative division rather than a verified per-ward contact.

## Design system

Colors, typography, and spacing follow Open City's brand guidelines, applied through a single palette (no light/dark theme toggle): a dark-green "forest" surface family for the header, footer, and hero/dark-card sections, cream/beige neutrals for body content, and green/red/yellow accent families (plus a sage tone for the methodology teaser and one deliberate off-brand blue reserved for lake/pond markers, since the brand palette has no blue). Manrope is used for headings and stat numbers (the closest Google Fonts match to the brand's Aileron, which isn't freely hosted), PT Sans for body text, a 4pt spacing scale, and a 3-step material-style elevation system. Body-length text uses full-contrast ink (or its light-on-dark counterpart on forest surfaces), short metadata uses a muted tone, and captions/labels use the lightest hint tone — a deliberate 3-tier hierarchy, not an accident. Amenity types each get a small hand-coded, currentColor SVG icon (no icon font or library). There is no external UI/component framework — every component is hand-styled in `src/styles/`. See `.claude/skills/design-theme-protocols/SKILL.md` for the full token/component reference.

The footer's Janaagraha/Oorvani logo images are expected at `public/logos/janaagraha-logo.svg` and `public/logos/oorvani-logo.svg`; until those files are added, the footer falls back to plain text wordmarks automatically.

## Contributing / verification

There's no lint, formatter, type checker, or bundler in this project by design — it stays a dependency-free static site. Before committing a change:

- Syntax-check any edited JS file: `node --input-type=module --check < src/js/<file>.js`
- Grep for regressions: no `chart.js`/`plus jakarta` references, no leftover old color values, and none of the IDs/classes the view modules depend on (see `CLAUDE.md`'s "must-preserve selectors") have been renamed or removed.
- For any CSS/markup change, manually click through all 4 views (home, ward detail, methodology, voter FAQs) at a few screen widths — there's no automated visual test suite and no theme toggle to check (single palette only).

See `.claude/skills/verify-and-update-docs/SKILL.md` for the full verify-then-document workflow this repo follows, and `CLAUDE.md` for the detailed rules an AI coding agent should follow when working in this codebase.
