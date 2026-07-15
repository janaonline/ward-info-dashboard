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

**Home** — the landing view and the single place to find your ward: a search box covering all 369 wards (by name, ward number, corporation, or assembly constituency), a "use my location" button that geolocates you straight into your ward, a plain-language explainer of what a ward is, a choropleth map of Bengaluru's 5 civic corporations (hovering a ward outlines it and shows its number, name, and corporation in a tooltip), a browsable list of every ward — housed in a fixed-height, internally scrolling box so a full 369-ward result set doesn't stretch the page — that opens the ward detail on tap, and accordion panels explaining the Greater Bengaluru Authority (GBA), the ward councillor role, and how the site's data works.

**Ward detail** — the core of the app for a single ward: which predecessor wards it was formed from (with % overlap) and its key areas/localities, a "coming soon" candidates placeholder (photo/party/affidavit/manifesto fields, pending the next election cycle), an interactive ward map with the enriched boundary plus point-backed polling-booth markers (hovering one shows its station name and booth number in a tooltip)/filter card/status badge/reset control/800m walk checkbox, an amenities grid with non-polling counts and coverage bars sourced from the enriched ward GeoJSON, a "did you know?" facts panel (e.g. walking-distance coverage vs. the WHO open-space benchmark, flood risk, schools-per-resident), suggested questions to ask your candidates, and a "BBMP Sahaaya — Top Grievances" panel listing the most-reported civic complaint categories for the ward.

**Methodology** — an AI-assisted-GIS-workflow disclosure note, followed by three sections covering where the underlying civic data comes from (KGIS/OpenCity), how it's turned into per-ward "15-minute walk" coverage percentages, and the current scope and what's planned next — with a back button that returns you to whichever view you actually came from — navigation is tracked as a history stack, so this stays correct across multiple hops (e.g. ward → methodology → back → back lands on home, not back on methodology).

**Footer** — present on all 3 views: a Methodology feature card (icon, title, and description), a Share this ward/WhatsApp/copy-link row (shown only while viewing a ward), and an attribution line crediting Janaagraha and Oorvani Foundation, each in its own logo card followed by that org's own social icons.

## Data sources

All display data lives in `public/data/` and is loaded once at startup by `src/js/data-loader.js`:

- **`GBA_369_Wards_Enriched.geojson`** — canonical ward boundaries plus ward-level amenity counts and coverage percentages. Ward boundary display and Amenities counts come from this file.
- **`Polling_Booths_with_GBA_369_Ward_Information.geojson`** — the only active point-marker source. Matched point features are assigned to enriched ward boundaries spatially; unmatched features and points outside all wards are ignored. Polling booths appear only in the Ward Map filter cards, not in the separate Amenities grid. The displayed polling-booth count always comes from the enriched GeoJSON's `Num_Polling_Stations` (never recomputed from the marker match), and booths that share the exact same coordinates as another booth in the same ward — common where one school hosts several numbered booths — are nudged a few meters apart so every one still shows up as its own marker on the map, distinguishable on hover by its own station name and booth number.
- **`wards.csv`** — supplemental text and fact fields not present in the enriched GeoJSON, including old-ward overlap, neighbourhood lists, open-space-per-person, and contact/admin fields.

Other `*_with_GBA_369_Ward_Information.geojson` files in `public/data/` are placeholder copies for future amenity point data and are not fetched by the app yet.

Every record is keyed by **`uid`** (`{Corporation}-{ward_id}`, e.g. `West-25`), derived from the enriched GeoJSON and never by ward name — a few ward names are similar enough across corporations that name-based joins would be unreliable.

**Known data caveat**: corporator and engineering-division contact fields (`contact_corporator`, `contact_aee_phone`, `contact_aro_phone`) repeat across many wards, suggesting they reflect an AC/AEE administrative division rather than a verified per-ward contact.

## Design system

Colors, typography, and spacing follow Open City's brand guidelines: a green/red/yellow palette (plus one deliberate off-brand blue reserved for lake/pond markers, since the brand palette has no blue), the brand's lime accent used sparingly on dark surfaces only (the dark theme's search focus ring and eyebrow dot — lime is nearly invisible on white), Manrope for headings and stat numbers (the closest Google Fonts match to the brand's Aileron, which isn't freely hosted), PT Sans for body text, a 4pt spacing scale, and a 3-step material-style elevation system. Body-length text uses full-contrast ink, short metadata uses a muted tone, and captions/labels use the lightest hint tone — a deliberate 3-tier hierarchy, not an accident. Both a light and a dark theme are fully supported, toggled with a circular reveal animation (the View Transitions API, with a plain fallback for browsers that don't support it) and persisted across visits. Amenity types each get a small hand-coded, currentColor SVG icon (no icon font or library). There is no external UI/component framework — every component is hand-styled in `src/styles/`.

The footer's Janaagraha/Oorvani logo images are expected at `public/logos/janaagraha-logo.svg` and `public/logos/oorvani-logo.svg`; until those files are added, the footer falls back to plain text wordmarks automatically.

## Contributing / verification

There's no lint, formatter, type checker, or bundler in this project by design — it stays a dependency-free static site. Before committing a change:

- Syntax-check any edited JS file: `node --input-type=module --check < src/js/<file>.js`
- Grep for regressions: no `chart.js`/`plus jakarta` references, no leftover old color values, and none of the IDs/classes the view modules depend on (see `CLAUDE.md`'s "must-preserve selectors") have been renamed or removed.
- For any CSS/markup change, manually click through all 3 views (home, ward detail, methodology) in both themes at a few screen widths — there's no automated visual test suite.

See `.claude/skills/verify-and-update-docs/SKILL.md` for the full verify-then-document workflow this repo follows, and `CLAUDE.md` for the detailed rules an AI coding agent should follow when working in this codebase.
