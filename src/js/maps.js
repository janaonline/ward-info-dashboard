import { onThemeChange, getCurrentTheme } from './theme.js';

const SVG_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';

// simple, unambiguous line pictograms — one per amenity type (CLAUDE.md: LAYER is the
// single source of truth for amenity visuals, so icons live here alongside color/label)
const ICONS = {
  bus: `${SVG_OPEN}<rect x="3" y="6" width="18" height="10" rx="2"/><path d="M3 12h18"/><circle cx="7.5" cy="18" r="1.3"/><circle cx="16.5" cy="18" r="1.3"/></svg>`,
  metro: `${SVG_OPEN}<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 13h14"/><circle cx="9" cy="16.5" r="1"/><circle cx="15" cy="16.5" r="1"/><path d="M8 20l-2 2M16 20l2 2"/></svg>`,
  school: `${SVG_OPEN}<path d="M12 4L2 9l10 5 10-5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>`,
  anganwadi: `${SVG_OPEN}<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/><path d="M9.5 14.5c1-1 2.5-.7 2.5.7 0-1.4 1.5-1.7 2.5-.7.9.9-.3 2.3-2.5 3.8-2.2-1.5-3.4-2.9-2.5-3.8z"/></svg>`,
  park: `${SVG_OPEN}<circle cx="12" cy="9" r="5"/><path d="M12 14v6"/></svg>`,
  playground: `${SVG_OPEN}<path d="M4 3v18M20 3v18M4 4h16"/><path d="M9 4v6a3 3 0 0 0 6 0V4"/></svg>`,
  lake: `${SVG_OPEN}<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>`,
  pond: `${SVG_OPEN}<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>`,
  police: `${SVG_OPEN}<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/></svg>`,
  fire: `${SVG_OPEN}<path d="M12 2c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-.5-1.5-.5-1.5.3 1.5-1.5 1.8-1.5 0"/><path d="M8 14a4 4 0 0 0 8 0c0-2.5-1.5-3.5-1.5-3.5.5 2.5-1 3.5-2.5 3.5s-3-1-3-3c0 0-1 1-1 3z"/></svg>`,
  toilet: `${SVG_OPEN}<circle cx="9" cy="5" r="2"/><path d="M6 20l1-9h4l1 9M6 13h6"/><path d="M16 4v16M19 4v6a3 3 0 0 1-3 3"/></svg>`,
  flood: `${SVG_OPEN}<path d="M12 3l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="16.5" r="0.6" fill="currentColor"/></svg>`,
  polling: `${SVG_OPEN}<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16"/><path d="M12 4v9M9 7l3-3 3 3"/></svg>`,
  flood_prone: `${SVG_OPEN}<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" fill="currentColor"/><path d="M6.5 14.5h11"/></svg>`,
  flood_vuln: `${SVG_OPEN}<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>`,
  police_outpost: `${SVG_OPEN}<path d="M6 21v-8l6-3 6 3v8z"/><path d="M9 21v-5h6v5"/></svg>`,
  railway_police: `${SVG_OPEN}<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M8.5 12h7M8.5 15h7"/><path d="M10 12v3M14 12v3"/></svg>`,
};

export const LAYER = {
  polling:   { label: 'Polling booth',  color: '#a89a86', walk: false, indicative: true, icon: ICONS.polling },
  bus:       { label: 'Bus stop',       color: '#3f7d34', walk: true,  ptkey: 'bus', icon: ICONS.bus },
  metro:     { label: 'Metro station',  color: '#1f7a5c', walk: true,  ptkey: 'metro', icon: ICONS.metro },
  school:    { label: 'School',         color: '#c8890a', walk: false, ptkey: 'school', icon: ICONS.school },
  anganwadi: { label: 'Anganwadi',      color: '#eab308', walk: false, ptkey: 'anganwadi', icon: ICONS.anganwadi },
  park:      { label: 'Park',           color: '#5e9b48', walk: true,  ptkey: 'park', icon: ICONS.park },
  playground:{ label: 'Playground',     color: '#8fae14', walk: false, ptkey: 'playground', icon: ICONS.playground },
  lake:      { label: 'Lake',           color: '#2f7fb0', walk: true,  ptkey: 'lake', icon: ICONS.lake },
  pond:      { label: 'Pond / tank',    color: '#6bb3d9', walk: false, ptkey: 'pond', icon: ICONS.pond },
  police:    { label: 'Police station', color: '#616161', walk: false, ptkey: 'police', icon: ICONS.police },
  police_outpost: { label: 'Police outpost', color: '#8f8f8f', walk: false, ptkey: 'police_outpost', icon: ICONS.police_outpost },
  railway_police: { label: 'Railway police', color: '#42576b', walk: false, ptkey: 'railway_police', icon: ICONS.railway_police },
  fire:      { label: 'Fire station',   color: '#d33a4c', walk: false, ptkey: 'fire', icon: ICONS.fire },
  toilet:    { label: 'Public toilet',  color: '#9a6b3f', walk: true,  ptkey: 'toilet', icon: ICONS.toilet },
  flood:     { label: 'Flood spot',     color: '#e05a2f', walk: false, flood: true, icon: ICONS.flood },
  flood_prone: { label: 'Flood-prone spot', color: '#b3401f', walk: false, ptkey: 'flood_prone', icon: ICONS.flood_prone },
  flood_vuln: { label: 'Flood-vulnerable spot', color: '#e88b4b', walk: false, ptkey: 'flood_vuln', icon: ICONS.flood_vuln },
};

export const LAYER_ORDER = ['bus','park','school','metro','toilet','anganwadi','playground','lake','pond','police','police_outpost','railway_police','fire','flood_prone','flood_vuln'];

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

// ---- geometry helpers (keyed by uid; supports GeoJSON Polygon and MultiPolygon) ----

export function pipRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) inside = !inside;
  }
  return inside;
}

function wardGeometry(w) {
  if (!w) return null;
  if (w.geometry) return w.geometry;
  if (w.geom) return { type: 'Polygon', coordinates: w.geom };
  return null;
}

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function pointInPolygon(x, y, polygon) {
  if (!polygon.length || !pipRing(x, y, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pipRing(x, y, polygon[i])) return false;
  }
  return true;
}

export function forEachWardCoordinate(w, cb) {
  for (const polygon of geometryPolygons(wardGeometry(w))) {
    for (const ring of polygon) {
      for (const point of ring) cb(point);
    }
  }
}

function forEachWardOuterCoordinate(w, cb) {
  for (const polygon of geometryPolygons(wardGeometry(w))) {
    const outer = polygon[0] || [];
    for (const point of outer) cb(point);
  }
}

export function pointInWard(x, y, uid, W) {
  return geometryPolygons(wardGeometry(W[uid])).some(polygon => pointInPolygon(x, y, polygon));
}

export function wardAt(lng, lat, W) {
  for (const k in W) {
    if (pointInWard(lng, lat, k, W)) return k;
  }
  return null;
}

export function centroid(uid, W) {
  let sx = 0, sy = 0, n = 0;
  forEachWardOuterCoordinate(W[uid], (point) => {
    sx += point[0];
    sy += point[1];
    n++;
  });
  return n ? [sx / n, sy / n] : [0, 0];
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

// ---- amenity point/row helpers ----

export function layerPoints(uid, type, W) {
  const w = W[uid];
  if (!w || !w.points) return [];
  if (type === 'polling') return w.points.polling || [];
  const k = LAYER[type].ptkey;
  return (w.points && w.points[k]) || [];
}

const TYPES_WITH_META = ['polling', 'school', 'metro', 'flood_prone'];

export function layerPointMeta(uid, type, W) {
  if (!TYPES_WITH_META.includes(type)) return [];
  const w = W[uid];
  const k = type === 'polling' ? 'polling' : LAYER[type].ptkey;
  return (w && w.pointMeta && w.pointMeta[k]) || [];
}

export function defaultLayer(uid, W) {
  for (const type of LAYER_ORDER.concat(['polling'])) {
    if (layerPoints(uid, type, W).length > 0) return type;
  }
  return null;
}

export function amenityRows(uid, W, w) {
  return [
    ['bus', 'Bus stops', layerPoints(uid, 'bus', W).length, w.bus_cov],
    ['metro', 'Metro stations', layerPoints(uid, 'metro', W).length, w.metro_cov],
    ['park', 'Parks', layerPoints(uid, 'park', W).length, w.parks_cov],
    ['school', 'Schools', layerPoints(uid, 'school', W).length, null],
    ['anganwadi', 'Anganwadis', layerPoints(uid, 'anganwadi', W).length, null],
    ['playground', 'Playgrounds', layerPoints(uid, 'playground', W).length, null],
    ['toilet', 'Public toilets', layerPoints(uid, 'toilet', W).length, w.toilet_cov],
    ['lake', 'Lakes', layerPoints(uid, 'lake', W).length, w.lake_cov],
    ['pond', 'Ponds / tanks', layerPoints(uid, 'pond', W).length, null],
    ['police', 'Police stations', layerPoints(uid, 'police', W).length, null],
    ['fire', 'Fire stations', layerPoints(uid, 'fire', W).length, null],
    ['flood_prone', 'Flood-prone spots', layerPoints(uid, 'flood_prone', W).length, null],
    ['flood_vuln', 'Flood-vulnerable spots', layerPoints(uid, 'flood_vuln', W).length, null],
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
    properties: { uid, name: W[uid].ward_name, corporation: W[uid].corporation, ward_id: W[uid].ward_id },
    geometry: wardGeometry(W[uid]) || { type: 'Polygon', coordinates: [] },
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
      'fill-opacity': 0.6,
    },
  });
  map.addLayer({
    id: 'wards-line',
    type: 'line',
    source: 'wards',
    paint: { 'line-color': '#ffffff', 'line-width': 0.5 },
  });
  map.addLayer({
    id: 'wards-line-hover',
    type: 'line',
    source: 'wards',
    paint: {
      'line-color': '#000000',
      'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2, 0],
    },
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

export function addAmenityPointsLayer(map, points, color, meta) {
  const geojson = {
    type: 'FeatureCollection',
    features: points.map((p, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p },
      properties: (meta && meta[i]) || {},
    })),
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
  const meta = layerPointMeta(uid, type, W);
  addAmenityPointsLayer(map, points, LAYER[type].color, meta);
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
