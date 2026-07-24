function parseOldWards(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*)\s\(([\d.]+)%\)$/);
    return m ? { name: m[1].trim(), pct: parseFloat(m[2]) } : { name: s, pct: null };
  });
}

function parseNeighbourhoods(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}

async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.text();
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

const POINT_SOURCES = {
  polling: 'public/data/Polling_Booths_with_GBA_369_Ward_Information.geojson',
  bus: 'public/data/bmtc_bus_stops.geojson',
  metro: 'public/data/Bengaluru_Metro_Stations.geojson',
  school: 'public/data/BBMP_Schools_Map.geojson',
  anganwadi: 'public/data/Bengaluru_Urban_Anganwadis_Map.geojson',
  park: 'public/data/Parks.geojson',
  toilet: 'public/data/BBMP_Public_Toilets_Map.geojson',
  lake: 'public/data/BBMP_Lakes_Map.geojson',
  flood_prone: 'public/data/Flood_Prone_Locations_Map.geojson',
  flood_vuln: 'public/data/Map_of_Locations_Vulnerable_to_Flooding_in.geojson',
  police: 'public/data/Bengaluru_Urban_Police_Station_Locations.geojson',
  police_outpost: 'public/data/Bengaluru_Urban_Police_Outpost_Locations_Map.geojson',
  railway_police: 'public/data/Bengaluru_Urban_Railway_Police_Stations_Map.geojson',
  fire: 'public/data/Bengaluru_Fire_Stations_Locations.geojson',
};

// Ward-specific "Did you know?" facts and "Questions to ask your candidates",
// matched to a ward by ward_name (see buildFactsQuestionsIndex/normalizeWardName).
const FACTS_QUESTIONS_SOURCE = 'public/data/ward_facts_questions.geojson';

// Ward-level temperature metrics, matched to a ward by its own `ward_name`
// property (see buildTemperatureIndex/normalizeWardName).
const TEMPERATURE_SOURCE = 'public/data/temperature.geojson';

// Amenity planning-standard benchmarks (11 rows, one per Amenities-section row
// type) — ward-independent, matched to amenityRows() labels by normalized
// Amenity text (see buildBenchmarkIndex/normalizeWardName). Consumed only by
// ward-view.js's renderAmenities.
const BENCHMARKS_SOURCE = 'public/data/benchmarks_for_WID.csv';

// Which raw GeoJSON property holds a point type's real display name (and, for
// polling only, a secondary booth-number field). Only types with a real per-feature
// name belong here — every other point source's Name property is a uniform literal
// "Placemark" placeholder (verified empirically), so pushing it would show garbage
// tooltips; those types are deliberately left out so their pointMeta stays empty and
// the hover tooltip no-ops.
const POINT_NAME_FIELDS = {
  polling: { name: 'POLIN_STATN_NAME', num: 'POLIN_STATN_NUM' },
  school: { name: 'Name' },
  metro: { name: 'Name' },
  flood_prone: { name: 'Name' },
};

function numberOr(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstNumber(source, keys, fallback = null) {
  for (const key of keys) {
    const n = numberOr(source[key], null);
    if (n != null) return n;
  }
  return fallback;
}

function stripWardPrefix(name) {
  return String(name || '').replace(/^\s*\d+\s*-\s*/, '').trim();
}

// Generic trim/collapse-whitespace/lowercase key normalizer — despite the name
// (kept for historical reasons, it predates the benchmark join), it's not
// ward-specific and is reused as-is for the Amenity-name join below.
export function normalizeWardName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isLocalDev() {
  return typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}

function makeUid(props) {
  return `${props.Corporation}-${Number(props.ward_id)}`;
}

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function pipRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) inside = !inside;
  }
  return inside;
}

function pointInPolygon(x, y, polygon) {
  if (!polygon.length || !pipRing(x, y, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pipRing(x, y, polygon[i])) return false;
  }
  return true;
}

function pointInGeometry(x, y, geometry) {
  return geometryPolygons(geometry).some(polygon => pointInPolygon(x, y, polygon));
}

function geometryBbox(geometry) {
  const bbox = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  for (const polygon of geometryPolygons(geometry)) {
    for (const ring of polygon) {
      for (const point of ring) {
        bbox.minx = Math.min(bbox.minx, point[0]);
        bbox.miny = Math.min(bbox.miny, point[1]);
        bbox.maxx = Math.max(bbox.maxx, point[0]);
        bbox.maxy = Math.max(bbox.maxy, point[1]);
      }
    }
  }
  return Number.isFinite(bbox.minx) ? bbox : null;
}

function bboxContains(bbox, x, y) {
  return bbox && x >= bbox.minx && x <= bbox.maxx && y >= bbox.miny && y <= bbox.maxy;
}

function average(wards, selector) {
  const values = wards.map(selector).filter(v => v != null && Number.isFinite(Number(v)));
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + Number(v), 0) / values.length;
}

function buildAverages(wards) {
  return {
    Num_Bus_Stops: average(wards, w => w.bus),
    Num_Metro_Stations: average(wards, w => w.metro),
    Num_Parks: average(wards, w => w.parks),
    Num_Playgrounds: average(wards, w => w.playgrounds),
    Num_Lakes: average(wards, w => w.lakes),
    Num_Ponds: average(wards, w => w.ponds),
    Num_Public_Toilets: average(wards, w => w.toilets),
    Num_Anganwadis: average(wards, w => w.anganwadi),
    Num_Schools: average(wards, w => w.schools),
    Num_Fire_Stations: average(wards, w => w.fire),
    Num_Police_Stations: average(wards, w => w.police),
    Num_Flood_Prone_Areas: average(wards, w => w.flood_prone),
    Perc_Bus_Stops_15MinWalk: average(wards, w => w.bus_cov),
    Perc_MS_15MinWalk: average(wards, w => w.metro_cov),
    Perc_Parks_15MinWalk: average(wards, w => w.parks_cov),
    Perc_Public_Toilet_15MinWalk: average(wards, w => w.toilet_cov),
    Perc_Lake_15MinWalk: average(wards, w => w.lake_cov),
    open_space_pc_sqm: average(wards, w => w.open_space_pc),
    water_cov_pct: average(wards, w => w.water_cov_pct),
    drain_density: average(wards, w => w.drain_density),
    road_density: average(wards, w => w.road_density),
    road_km: average(wards, w => w.road_km),
    drain_total_km: average(wards, w => w.drain_total),
    pop: average(wards, w => w.pop),
    Ward_Area: average(wards, w => w.area_sqkm),
  };
}

// Some polling booths share the exact same lat/lng (multiple numbered booths at one
// school), which would otherwise render as a single stacked marker on the ward map.
// Spread exact-duplicate points a few meters apart so every booth stays individually
// visible/clickable, using the same lat-adjusted geodesic conversion as maps.js's
// buildWalkBuffer (Bengaluru ~13N: a flat degree offset would be non-circular).
function spreadCoincidentPoints(points, radiusMeters = 15) {
  const groups = new Map();
  points.forEach((p, i) => {
    const key = `${p[0]},${p[1]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  });
  for (const idxs of groups.values()) {
    if (idxs.length < 2) continue;
    const [lng, lat] = points[idxs[0]];
    const dLat = radiusMeters / 111320;
    const dLng = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
    idxs.forEach((idx, k) => {
      const angle = (2 * Math.PI * k) / idxs.length;
      points[idx] = [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)];
    });
  }
}

function assignPointSource(W, sourceGeoJSON, pointKey) {
  const wards = Object.values(W).map(ward => ({
    ward,
    bbox: geometryBbox(ward.geometry),
  }));
  const nameFields = POINT_NAME_FIELDS[pointKey];

  for (const feature of sourceGeoJSON.features || []) {
    if (feature.properties?.ward_join_status !== 'matched') continue;
    if (feature.geometry?.type !== 'Point') continue;

    const [x, y] = feature.geometry.coordinates || [];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const matched = wards.find(({ ward, bbox }) => (
      bboxContains(bbox, x, y) && pointInGeometry(x, y, ward.geometry)
    ));
    if (matched) {
      matched.ward.points[pointKey].push([x, y]);
      if (nameFields) {
        const entry = { name: feature.properties[nameFields.name] || '' };
        if (nameFields.num) entry.num = feature.properties[nameFields.num] || '';
        matched.ward.pointMeta[pointKey].push(entry);
      }
    }
  }
}

// Properties-only index for ward_facts_questions.geojson, keyed by normalized
// ward_name — the file's own polygon geometry is unused and discarded here.
function buildFactsQuestionsIndex(geojson) {
  const index = {};
  for (const feature of geojson.features || []) {
    const name = feature.properties?.ward_name;
    if (!name) continue;
    index[normalizeWardName(name)] = feature.properties;
  }
  return index;
}

// Properties-only index for temperature.geojson, keyed by normalized ward
// name (its own `ward_name` property) — the file's own per-ward boundary
// polygon is unused and discarded here, same as buildFactsQuestionsIndex.
function buildTemperatureIndex(geojson) {
  const index = {};
  for (const feature of geojson.features || []) {
    const name = feature.properties?.ward_name;
    if (!name) continue;
    index[normalizeWardName(name)] = feature.properties;
  }
  return index;
}

// Index for benchmarks_for_WID.csv, keyed by normalized Amenity text — unlike
// the two indexes above, this isn't a per-ward join, it's a small (11-row)
// ward-independent lookup table shared by every ward.
function buildBenchmarkIndex(rows) {
  const index = {};
  for (const row of rows) {
    if (!row.Amenity) continue;
    index[normalizeWardName(row.Amenity)] = { text: row.benchmark_text || null, benchmark: row.benchmark };
  }
  return index;
}

export async function loadData() {
  const pointKeys = Object.keys(POINT_SOURCES);
  const [csvText, enrichedGeoJSON, factsQuestionsGeoJSON, temperatureGeoJSON, benchmarksText, ...pointGeoJSONs] = await Promise.all([
    fetchText('public/data/wards.csv'),
    fetchJSON('public/data/GBA_369_Wards_Enriched.geojson'),
    fetchJSON(FACTS_QUESTIONS_SOURCE),
    fetchJSON(TEMPERATURE_SOURCE),
    fetchText(BENCHMARKS_SOURCE),
    ...pointKeys.map(key => fetchJSON(POINT_SOURCES[key])),
  ]);
  const pointGeoJSONByKey = Object.fromEntries(pointKeys.map((key, i) => [key, pointGeoJSONs[i]]));
  const factsQuestionsByName = buildFactsQuestionsIndex(factsQuestionsGeoJSON);
  const temperatureByName = buildTemperatureIndex(temperatureGeoJSON);
  const benchmarksByAmenity = buildBenchmarkIndex(
    Papa.parse(benchmarksText, { header: true, dynamicTyping: true, skipEmptyLines: true }).data
  );

  const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });
  const csvByUid = {};
  for (const row of parsed.data) {
    if (row.uid) csvByUid[row.uid] = row;
  }

  const W = {};
  const nameIndex = {};

  for (const feature of enrichedGeoJSON.features || []) {
    const props = feature.properties || {};
    const uid = makeUid(props);
    if (!uid || uid.includes('NaN')) continue;

    const row = csvByUid[uid] || {};
    const wardName = stripWardPrefix(props.ward_name);
    const floodProne = firstNumber(props, ['FloodProne_Count'], 0);
    const ward = Object.assign({}, row, {
      uid,
      geometry: feature.geometry,
      points: Object.fromEntries(pointKeys.map(key => [key, []])),
      pointMeta: Object.fromEntries(pointKeys.map(key => [key, []])),
      ward_id: numberOr(props.ward_id, row.ward_id),
      ward_name: wardName || row.ward_name || props.ward_name,
      ward_name_kn: props.ward_name_kn || row.ward_name_kn,
      corporation: props.Corporation || row.corporation,
      corporation_id: props.corporation_id || row.corporation_id,
      zone: props.zone || row.zone,
      zone_name: props.zone_name || row.zone_name,
      ac: props.ac || row.ac,
      ac_no: props.ac_no || row.ac_no,
      assembly: props.Assembly || row.assembly,
      ro_division: props.RO_Division || row.ro_division,
      aro: props['ARO_ Sub Division'] || row.aro,
      area_sqkm: firstNumber(props, ['Ward_Area_SQKM', 'Ward_Area_SqKm'], row.area_sqkm),
      pop: firstNumber(props, ['TOT_P'], row.pop),
      male: firstNumber(props, ['TOT_M'], row.male),
      female: firstNumber(props, ['TOT_F'], row.female),
      bus: firstNumber(props, ['BusStop_Count'], 0),
      bus_cov: firstNumber(props, ['BusStop_Coverage_Percent', 'Perc_Bus_Stops_CovArea_15MinWalk'], null),
      metro: firstNumber(props, ['MetroStation_Count'], 0),
      metro_cov: firstNumber(props, ['MetroStation_Coverage_Percent', 'Perc_Metro_Stations_CovArea_15MinWalk'], null),
      parks: firstNumber(props, ['Park_Count'], 0),
      parks_cov: firstNumber(props, ['Park_Coverage_Percent'], null),
      schools: firstNumber(props, ['Num_Schools', 'School_Count'], 0),
      school_cov: firstNumber(props, ['School_Coverage_Percent', 'Perc_Schools_CovArea_15MinWalk'], null),
      anganwadi: firstNumber(props, ['Anganwadi_Count'], 0),
      anganwadi_cov: firstNumber(props, ['Anganwadi_Coverage_Percent', 'Perc_Anganwadis_CovArea_15MinWalk'], null),
      playgrounds: firstNumber(props, ['Num_Playgrounds'], 0),
      playground_area_sqkm: firstNumber(props, ['Playgrounds_Area_SqKm'], row.playground_area_sqkm),
      toilets: firstNumber(props, ['PublicToilet_Count'], 0),
      toilet_cov: firstNumber(props, ['PublicToilet_Coverage_Percent', 'Perc_Public_Toilets_CovArea_15MinWalk'], null),
      lakes: firstNumber(props, ['Lake_Count'], 0),
      lake_cov: firstNumber(props, ['Lake_Coverage_Percent'], null),
      ponds: firstNumber(props, ['Num_Ponds'], 0),
      pond_area_sqkm: firstNumber(props, ['Ponds_Area_SqKm'], row.pond_area_sqkm),
      police: firstNumber(props, ['PoliceStation_Count'], 0),
      police_outpost: firstNumber(props, ['PoliceOutpost_Count'], 0),
      railway_police: firstNumber(props, ['RailwayPolice_Count'], 0),
      fire: firstNumber(props, ['FireStation_Count'], 0),
      polling: firstNumber(props, ['Num_Polling_Stations'], row.polling),
      flood_vuln: 0,
      flood_prone: floodProne,
      low_lying: numberOr(row.low_lying, null),
      road_km: firstNumber(props, ['Roads_Length_Km'], row.road_km),
      road_density: numberOr(row.road_density, null),
      drain_primary: firstNumber(props, ['SWD_Primary_Length_Km'], row.drain_primary),
      drain_secondary: firstNumber(props, ['SWD_Secondary_Length_Km'], row.drain_secondary),
      drain_total: firstNumber(props, ['SWD_All_Length_Km'], row.drain_total),
      drain_density: numberOr(row.drain_density, null),
      open_space_pc: numberOr(row.open_space_pc, null),
      water_cov_pct: numberOr(row.water_cov_pct, null),
      neighbourhoods: parseNeighbourhoods(row.neighbourhoods),
      old_wards: parseOldWards(row.old_wards),
      reservation: row.reservation || null,
    });
    W[uid] = ward;
    nameIndex[String(ward.ward_name).toLowerCase()] = uid;
    if (props.ward_name) nameIndex[String(props.ward_name).toLowerCase()] = uid;
  }

  for (const key of pointKeys) {
    assignPointSource(W, pointGeoJSONByKey[key], key);
  }
  for (const ward of Object.values(W)) {
    for (const key of pointKeys) {
      spreadCoincidentPoints(ward.points[key]);
    }
    if (ward.polling == null) ward.polling = ward.points.polling.length;

    const fq = factsQuestionsByName[normalizeWardName(ward.ward_name)];
    ward.factsQuestions = fq || null;
    if (!fq && isLocalDev()) {
      console.warn(`[ward_facts_questions] No match for ward "${ward.ward_name}" (${ward.uid})`);
    }

    const temp = temperatureByName[normalizeWardName(ward.ward_name)];
    ward.temperature = temp || null;
    if (!temp && isLocalDev()) {
      console.warn(`[temperature] No match for ward "${ward.ward_name}" (${ward.uid})`);
    }
  }

  const wards = Object.values(W);

  return {
    W,
    nameIndex,
    A: buildAverages(wards),
    benchmarks: benchmarksByAmenity,
    meta: {
      generated: null,
      source: 'GBA_369_Wards_Enriched.geojson',
      n_wards: wards.length,
      city_pop: wards.reduce((sum, w) => sum + (numberOr(w.pop, 0) || 0), 0),
    },
  };
}
