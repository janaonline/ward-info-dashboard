import { createMap, buildWardPolygonsGeoJSON, addChoroplethLayer, CORP_COLORS, wardAt, resizeMap } from './maps.js';
import { esc, fmt } from './format.js';

let corpMap = null;
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

export function initHomeView({ W, meta }, { onOpenWard }) {
  onOpenWardRef = onOpenWard;
  const container = document.getElementById('homeContainer');
  const nCorps = new Set(Object.values(W).map(w => w.corporation)).size;

  container.innerHTML = `
    <div class="cover">
      <div class="eyebrow"><span class="eyebrow-dot"></span> Greater Bengaluru &middot; Ward Guide</div>
      <h1 class="headline">Bengaluru is choosing its <mark>ward councillor</mark> for the first time in years.</h1>
      <p class="hero-kicker">Know your ward before you vote.</p>
      <div class="find-controls">
        <input id="findSearch" type="search" placeholder="Search by ward, area, or constituency" autocomplete="off">
        <button id="findLocate" class="btn btn-secondary" type="button">Use my location</button>
      </div>
      <div id="homeCorpMap" class="map map-corp" aria-label="Map of Bengaluru's civic corporations"></div>
      <p class="map-caption">Greater Bengaluru Authority boundary &middot; ${fmt(nCorps)} corporations &middot; ${fmt(meta.n_wards)} wards</p>
      <div class="corp-legend">
        ${Object.entries(CORP_COLORS).map(([name, color]) => `
          <span class="legend-chip"><span class="chip-dot" style="background:${color}"></span>${name}</span>
        `).join('')}
      </div>
      <p id="findCount" class="find-count"></p>
      <ul id="findList" class="ward-list"></ul>
      <details class="panel">
        <summary>How this works</summary>
        <p>We combine ward boundaries with open civic datasets on buses, metro, schools, parks, lakes, and more to show how well-served your neighbourhood is.</p>
      </details>
      <details class="panel">
        <summary>About the data</summary>
        <p>Ward-level data compiled from ${meta.source || 'public GBA/BBMP sources'} as of ${meta.generated || 'the latest available update'}. See the methodology page for full sourcing and caveats.</p>
      </details>
    </div>
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

  if (!corpMap) {
    corpMap = createMap('homeCorpMap', { center: [77.5946, 12.9716], zoom: 9.5 });
    corpMap.on('load', () => {
      const geojson = buildWardPolygonsGeoJSON(W);
      addChoroplethLayer(corpMap, geojson);
    });
  }
}

export function resizeHomeMap() {
  resizeMap(corpMap);
}
