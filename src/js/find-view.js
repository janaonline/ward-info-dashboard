import { createMap, buildWardPolygonsGeoJSON, addWardBoundaryLayer, wardAt, resizeMap } from './maps.js';
import { esc, fmt } from './format.js';

let findMap = null;
let hoverTracker = null;
let dataRef = null;
let onOpenWardRef = null;

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function matchesQuery(w, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    String(w.ward_name).toLowerCase().includes(s) ||
    String(w.ward_id).includes(s) ||
    String(w.corporation).toLowerCase().includes(s) ||
    String(w.assembly || '').toLowerCase().includes(s)
  );
}

function renderList(W, query) {
  const listEl = document.getElementById('findList');
  const all = Object.values(W).filter(w => matchesQuery(w, query));
  all.sort((a, b) => a.ward_id - b.ward_id);
  const shown = all.slice(0, 400);

  listEl.innerHTML = shown.map(w => `
    <li class="ward-row" data-uid="${esc(w.uid)}">
      <span class="ward-row-name">${esc(w.ward_name)}</span>
      <span class="ward-row-meta">Ward ${fmt(w.ward_id)} &middot; ${esc(w.corporation)}</span>
    </li>
  `).join('');

  document.getElementById('findCount').textContent =
    `${all.length} ward${all.length === 1 ? '' : 's'}${all.length > 400 ? ' (showing first 400)' : ''}`;

  listEl.querySelectorAll('.ward-row').forEach(row => {
    row.addEventListener('click', () => onOpenWardRef(row.dataset.uid));
  });
}

export function initFindView({ W }, { onOpenWard }) {
  dataRef = W;
  onOpenWardRef = onOpenWard;
  const container = document.getElementById('findContainer');

  container.innerHTML = `
    <div class="find-head">
      <h2>Find your ward</h2>
      <div class="find-controls">
        <input id="findSearch" type="search" placeholder="Search by ward, area, or constituency" autocomplete="off">
        <button id="findLocate" class="btn btn-secondary" type="button">Use my location</button>
      </div>
    </div>
    <div id="findMap" class="map map-find" aria-label="Map of all Bengaluru wards"></div>
    <p id="findCount" class="find-count"></p>
    <ul id="findList" class="ward-list"></ul>
  `;

  renderList(W, '');

  document.getElementById('findSearch').addEventListener('input', debounce((e) => {
    renderList(W, e.target.value);
  }, 120));

  document.getElementById('findLocate').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uid = wardAt(pos.coords.longitude, pos.coords.latitude, W);
        if (uid) onOpenWard(uid);
      },
      () => {},
      { timeout: 8000 }
    );
  });

  if (!findMap) {
    findMap = createMap('findMap', { center: [77.5946, 12.9716], zoom: 10 });
    findMap.on('load', () => {
      const geojson = buildWardPolygonsGeoJSON(W);
      hoverTracker = addWardBoundaryLayer(findMap, geojson);

      findMap.on('mousemove', 'ward-boundaries-fill', (e) => {
        findMap.getCanvas().style.cursor = 'pointer';
        if (e.features.length) hoverTracker.setHovered(e.features[0].id);
      });
      findMap.on('mouseleave', 'ward-boundaries-fill', () => {
        findMap.getCanvas().style.cursor = '';
        hoverTracker.clear();
      });
      findMap.on('click', 'ward-boundaries-fill', (e) => {
        if (e.features.length) onOpenWard(e.features[0].properties.uid);
      });
    });
  }
}

export function resizeFindMap() {
  resizeMap(findMap);
}
