# Know Your Ward

A mobile-first, static website that helps Bengaluru residents understand their own civic ward — amenities, coverage gaps, flood risk, and corporator contact details — for all 369 wards across the city's 5 civic corporations.

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

**Home** — the landing view and the single place to find your ward: a search box covering all 369 wards (by name, ward number, corporation, or assembly constituency), a "use my location" button that geolocates you straight into your ward, a choropleth map of Bengaluru's 5 civic corporations, and a browsable list of every ward that opens the ward detail on tap.

**Ward detail** — the core of the app for a single ward: corporator/contact info, a map with a legend of amenity types (buses, metro, schools, parks, lakes, toilets, police, fire, flood spots, polling booths — with an optional 800m walking-distance overlay for the walkable amenity types), an amenities grid with coverage bars, a "did you know?" facts panel (e.g. walking-distance coverage vs. the WHO open-space benchmark, flood risk, schools-per-resident), suggested questions to ask your candidates, a WhatsApp share link + copy-link button, and North/East/South/West navigation to neighbouring wards.

**Methodology** — data sourcing, what "within walking distance" means, and known data-quality caveats, with a back button that returns you to whichever view you came from.

## Data sources

All data lives in `public/data/` and is loaded once at startup by `src/js/data-loader.js`:

- **`wards.csv`** — one row per ward: identity (`uid`, `ward_id`, `ward_name`, corporation/zone/assembly), population, amenity counts and walking-distance coverage percentages, flood risk, drainage, and corporator/AEE contact details.
- **`wards-geometry.json`** — ward boundary polygons and amenity point coordinates, keyed by the same `uid` as the CSV.
- **`meta.json`** — citywide average values (used by the ward-detail facts panel to say things like "your ward has more lakes than the city average").

Every record is joined on **`uid`** (`{corporation}-{ward_id}`, e.g. `West-25`), not on ward name — a few ward names are similar enough across corporations that name-based joins would be unreliable.

**Known data caveat**: corporator and engineering-division contact fields (`contact_corporator`, `contact_aee_phone`, `contact_aro_phone`) repeat across many wards, suggesting they reflect an AC/AEE administrative division rather than a verified per-ward contact. This is surfaced on the Methodology page rather than silently cleaned up.

## Design system

Colors, typography, and spacing follow Open City's brand guidelines: a green/red/yellow palette (plus one deliberate off-brand blue reserved for lake/pond markers, since the brand palette has no blue), Poppins for headings and stat numbers, PT Sans for body text, a 4pt spacing scale, and a 3-step material-style elevation system. Both a light and a dark theme are fully supported, toggled with a circular reveal animation (the View Transitions API, with a plain fallback for browsers that don't support it) and persisted across visits. There is no external UI/component framework — every component is hand-styled in `src/styles/`.

## Contributing / verification

There's no lint, formatter, type checker, or bundler in this project by design — it stays a dependency-free static site. Before committing a change:

- Syntax-check any edited JS file: `node --input-type=module --check < src/js/<file>.js`
- Grep for regressions: no `chart.js`/`plus jakarta` references, no leftover old color values, and none of the IDs/classes the view modules depend on (see `CLAUDE.md`'s "must-preserve selectors") have been renamed or removed.
- For any CSS/markup change, manually click through all 3 views (home, ward detail, methodology) in both themes at a few screen widths — there's no automated visual test suite.

See `.claude/skills/verify-and-update-docs/SKILL.md` for the full verify-then-document workflow this repo follows, and `CLAUDE.md` for the detailed rules an AI coding agent should follow when working in this codebase.
