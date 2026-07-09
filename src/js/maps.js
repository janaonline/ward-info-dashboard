import { onThemeChange, getCurrentTheme } from './theme.js';

export const LAYER = {
  polling:   { label: 'Polling booth',  color: '#a89a86', walk: false, indicative: true },
  bus:       { label: 'Bus stop',       color: '#3f7d34', walk: true,  ptkey: 'bus' },
  metro:     { label: 'Metro station',  color: '#1f7a5c', walk: true,  ptkey: 'metro' },
  school:    { label: 'School',         color: '#c8890a', walk: false, ptkey: 'school' },
  anganwadi: { label: 'Anganwadi',      color: '#eab308', walk: false, ptkey: 'anganwadi' },
  park:      { label: 'Park',           color: '#5e9b48', walk: true,  ptkey: 'park' },
  playground:{ label: 'Playground',     color: '#8fae14', walk: false, ptkey: 'playground' },
  lake:      { label: 'Lake',           color: '#2f7fb0', walk: true,  ptkey: 'lake' },
  pond:      { label: 'Pond / tank',    color: '#6bb3d9', walk: false, ptkey: 'pond' },
  police:    { label: 'Police station', color: '#616161', walk: false, ptkey: 'police' },
  fire:      { label: 'Fire station',   color: '#d33a4c', walk: false, ptkey: 'fire' },
  toilet:    { label: 'Public toilet',  color: '#9a6b3f', walk: true,  ptkey: 'toilet' },
  flood:     { label: 'Flood spot',     color: '#e05a2f', walk: false, flood: true },
};

export const LAYER_ORDER = ['bus','park','school','metro','toilet','anganwadi','playground','lake','pond','police','fire','flood'];

export const CORP_COLORS = {
  North: '#d33a4c',
  East: '#e8912a',
  West: '#d4b81f',
  South: '#5e9b48',
  Central: '#6f6f6f',
};

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'];

export function tileUrlForTheme(theme) {
  const variant = theme === 'dark' ? 'dark_nolabels' : 'light_nolabels';
  return CARTO_SUBDOMAINS.map(s => `https://${s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}.png`);
}

// ---- geometry helpers (ground-truth ported from the original prototype, keyed by uid) ----

export function pipRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) inside = !inside;
  }
  return inside;
}

export function pointInWard(x, y, uid, W) {
  const g = W[uid].geom;
  for (let i = 0; i < g.length; i++) if (pipRing(x, y, g[i])) return true;
  return false;
}

export function wardAt(lng, lat, W) {
  for (const k in W) {
    const g = W[k].geom;
    for (let i = 0; i < g.length; i++) if (pipRing(lng, lat, g[i])) return k;
  }
  return null;
}

export function centroid(uid, W) {
  const g = W[uid].geom[0], n = g.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += g[i][0]; sy += g[i][1]; }
  return [sx / n, sy / n];
}

export function nearbyWards(uid, W, k = 6) {
  const c = centroid(uid, W), arr = [];
  for (const key in W) {
    if (key === uid) continue;
    const cc = centroid(key, W), dx = cc[0] - c[0], dy = cc[1] - c[1];
    arr.push([key, dx * dx + dy * dy]);
  }
  arr.sort((a, b) => a[1] - b[1]);
  return arr.slice(0, k).map(x => x[0]);
}

export function dirNeighbors(uid, W) {
  const c = centroid(uid, W);
  const out = { N: null, E: null, S: null, W: null };
  const best = { N: 1e9, E: 1e9, S: 1e9, W: 1e9 };
  for (const k in W) {
    if (k === uid) continue;
    const cc = centroid(k, W), dx = cc[0] - c[0], dy = cc[1] - c[1], d = dx * dx + dy * dy;
    if (!d) continue;
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy > 0) { if (d < best.N) { best.N = d; out.N = k; } }
      else { if (d < best.S) { best.S = d; out.S = k; } }
    } else {
      if (dx > 0) { if (d < best.E) { best.E = d; out.E = k; } }
      else { if (d < best.W) { best.W = d; out.W = k; } }
    }
  }
  return out;
}

// ---- seeded polling-booth scatter ----

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const _scatterCache = {};

export function pollingPts(uid, W) {
  if (_scatterCache[uid]) return _scatterCache[uid];
  const w = W[uid], n = w.polling || 0, g = w.geom;
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  g.forEach(r => r.forEach(p => {
    if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0];
    if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1];
  }));
  const rnd = mulberry32(hashStr(uid + '|' + n));
  const pts = [];
  let tries = 0;
  const cap = n * 500 + 3000;
  while (pts.length < n && tries < cap) {
    tries++;
    const x = minx + (maxx - minx) * rnd(), y = miny + (maxy - miny) * rnd();
    if (pointInWard(x, y, uid, W)) pts.push([x, y]);
  }
  _scatterCache[uid] = pts;
  return pts;
}

// ---- amenity point/row helpers (flood = floodvuln + floodprone combined) ----

export function layerPoints(uid, type, W) {
  const w = W[uid];
  if (type === 'polling') return pollingPts(uid, W);
  if (type === 'flood') {
    const a = (w.points && w.points.floodvuln) || [];
    const b = (w.points && w.points.floodprone) || [];
    return a.concat(b);
  }
  const k = LAYER[type].ptkey;
  return (w.points && w.points[k]) || [];
}

export function defaultLayer(uid, W) {
  for (const type of LAYER_ORDER) {
    if (layerPoints(uid, type, W).length > 0) return type;
  }
  return 'polling';
}

export function amenityRows(w) {
  return [
    ['bus', 'Bus stops', w.bus, w.bus_cov],
    ['metro', 'Metro stations', w.metro, w.metro_cov],
    ['park', 'Parks', w.parks, w.parks_cov],
    ['school', 'Schools', w.schools, null],
    ['anganwadi', 'Anganwadis', w.anganwadi, null],
    ['playground', 'Playgrounds', w.playgrounds, null],
    ['toilet', 'Public toilets', w.toilets, w.toilet_cov],
    ['lake', 'Lakes', w.lakes, w.lake_cov],
    ['pond', 'Ponds / tanks', w.ponds, null],
    ['police', 'Police stations', w.police, null],
    ['fire', 'Fire stations', w.fire, null],
    ['flood', 'Flood-prone spots', (w.flood_vuln || 0) + (w.flood_prone || 0), null],
  ];
}

// ---- 800m geodesic walk buffer (Bengaluru ~13N: lng degrees are shorter than lat degrees) ----

export function buildWalkBuffer(lng, lat, meters = 800, steps = 64) {
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.cos(lat * Math.PI / 180));
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

// ---- GeoJSON builders ----

export function buildWardPolygonsGeoJSON(W, { filterUids } = {}) {
  const uids = filterUids || Object.keys(W);
  const features = uids.map((uid, i) => ({
    type: 'Feature',
    id: i,
    properties: { uid, name: W[uid].ward_name, corporation: W[uid].corporation },
    geometry: { type: 'Polygon', coordinates: W[uid].geom },
  }));
  return { type: 'FeatureCollection', features };
}

// ---- map factory ----

const _liveMaps = new Set();

export function createMap(containerId, { center = [77.5946, 12.9716], zoom = 10.5, theme } = {}) {
  const currentTheme = theme || getCurrentTheme();
  const map = new maplibregl.Map({
    container: containerId,
    style: {
      version: 8,
      sources: {
        carto: { type: 'raster', tiles: tileUrlForTheme(currentTheme), tileSize: 256, attribution: '© CARTO © OpenStreetMap contributors' },
      },
      layers: [{ id: 'carto-base', type: 'raster', source: 'carto' }],
    },
    center,
    zoom,
    attributionControl: { compact: true },
  });

  const unsubscribe = onThemeChange((newTheme) => {
    const src = map.getSource('carto');
    if (src && src.setTiles) src.setTiles(tileUrlForTheme(newTheme));
  });

  map.on('remove', unsubscribe);
  _liveMaps.add(map);
  return map;
}

export function resizeMap(map) {
  if (map) map.resize();
}

// ---- feature-state hover bookkeeping ----

export function makeHoverTracker(map, sourceId) {
  let hoveredId = null;
  return {
    setHovered(featureId) {
      if (hoveredId !== null && hoveredId !== featureId) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      }
      hoveredId = featureId;
      if (featureId !== null) {
        map.setFeatureState({ source: sourceId, id: featureId }, { hover: true });
      }
    },
    clear() {
      if (hoveredId !== null) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
        hoveredId = null;
      }
    },
  };
}

export function addChoroplethLayer(map, geojson) {
  map.addSource('wards', { type: 'geojson', data: geojson, promoteId: undefined });
  map.addLayer({
    id: 'wards-fill',
    type: 'fill',
    source: 'wards',
    paint: {
      'fill-color': [
        'match', ['get', 'corporation'],
        'North', CORP_COLORS.North,
        'East', CORP_COLORS.East,
        'West', CORP_COLORS.West,
        'South', CORP_COLORS.South,
        'Central', CORP_COLORS.Central,
        '#999999',
      ],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.85, 0.6],
    },
  });
  map.addLayer({
    id: 'wards-line',
    type: 'line',
    source: 'wards',
    paint: { 'line-color': '#ffffff', 'line-width': 0.5 },
  });
  return makeHoverTracker(map, 'wards');
}

export function addWardBoundaryLayer(map, geojson, { fillColor = '#2f8f66', hoverColor = '#227a55' } = {}) {
  map.addSource('ward-boundaries', { type: 'geojson', data: geojson });
  map.addLayer({
    id: 'ward-boundaries-fill',
    type: 'fill',
    source: 'ward-boundaries',
    paint: {
      'fill-color': ['case', ['boolean', ['feature-state', 'hover'], false], hoverColor, fillColor],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.45, 0.18],
    },
  });
  map.addLayer({
    id: 'ward-boundaries-line',
    type: 'line',
    source: 'ward-boundaries',
    paint: { 'line-color': fillColor, 'line-width': 1.2 },
  });
  return makeHoverTracker(map, 'ward-boundaries');
}

export function addAmenityPointsLayer(map, points, color) {
  const geojson = {
    type: 'FeatureCollection',
    features: points.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} })),
  };
  if (map.getSource('amenity-points')) {
    map.getSource('amenity-points').setData(geojson);
    map.setPaintProperty('amenity-points-circle', 'circle-color', color);
  } else {
    map.addSource('amenity-points', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'amenity-points-circle',
      type: 'circle',
      source: 'amenity-points',
      paint: {
        'circle-radius': 5,
        'circle-color': color,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}

export function setActiveAmenityLayer(map, type, uid, W) {
  const points = layerPoints(uid, type, W);
  addAmenityPointsLayer(map, points, LAYER[type].color);
  return points;
}

export function setWalkBufferLayer(map, points, visible) {
  const geojson = {
    type: 'FeatureCollection',
    features: visible ? points.map(p => buildWalkBuffer(p[0], p[1])) : [],
  };
  if (map.getSource('walk-buffer')) {
    map.getSource('walk-buffer').setData(geojson);
  } else {
    map.addSource('walk-buffer', { type: 'geojson', data: geojson });
    map.addLayer({
      id: 'walk-buffer-fill',
      type: 'fill',
      source: 'walk-buffer',
      paint: { 'fill-color': '#2f8f66', 'fill-opacity': 0.12 },
    }, 'amenity-points-circle');
  }
}
