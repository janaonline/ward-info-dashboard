import {
  createMap, buildWardPolygonsGeoJSON, addWardBoundaryLayer, LAYER, LAYER_ORDER,
  amenityRows, defaultLayer, layerPoints, setActiveAmenityLayer, setWalkBufferLayer,
  nearbyWards, resizeMap, forEachWardCoordinate,
} from './maps.js';
import { esc, fmt } from './format.js';
import { isLocalDev } from './data-loader.js';

let wardMap = null;
let currentLayer = null;
let bufferOn = false;
let dataRef = null;

// ---- facts & questions engine (sourced from ward_facts_questions.geojson,
// matched to a ward by ward_name once at load time in data-loader.js) ----

const DID_YOU_KNOW_FIELDS = ['did_you_know_1', 'did_you_know_2', 'did_you_know_3'];
const CANDIDATE_QUESTION_FIELDS = ['question_1', 'question_2', 'question_3', 'question_4', 'question_5'];
const VULNERABILITY_KEYS = ['flood_prone', 'flood_vuln'];

function isBlank(v) {
  return v == null || String(v).trim() === '';
}

function orderedFields(source, fields) {
  if (!source) return [];
  return fields.map(f => source[f]).filter(v => !isBlank(v));
}

function buildFacts(w) {
  return orderedFields(w.factsQuestions, DID_YOU_KNOW_FIELDS);
}

function suggestedQuestions(w) {
  return orderedFields(w.factsQuestions, CANDIDATE_QUESTION_FIELDS);
}

// ---- render pieces ----

function oldWardsText(w) {
  if (!w.old_wards || !w.old_wards.length) return 'Not available';
  return w.old_wards.map(o => o.pct != null ? `${esc(o.name)} (${o.pct}%)` : esc(o.name)).join(', ');
}

function neighbourhoodsText(w) {
  if (!w.neighbourhoods || !w.neighbourhoods.length) return 'Not available';
  return w.neighbourhoods.map(esc).join(', ');
}

function demographicsParts(w) {
  const parts = [];
  if (w.pop != null) parts.push(`<strong>Total population:</strong> ${fmt(w.pop)}`);
  if (w.male != null) parts.push(`<strong>Male:</strong> ${fmt(w.male)}`);
  if (w.female != null) parts.push(`<strong>Female:</strong> ${fmt(w.female)}`);
  return parts;
}

function renderHead(w) {
  const demoParts = demographicsParts(w);
  if (!demoParts.length && isLocalDev()) {
    console.warn(`[demographics] No population data for ward "${w.ward_name}" (${w.uid})`);
  }
  return `
    <div class="whead">
      <h2>${esc(w.ward_name)}${w.ward_name_kn ? ` <span class="kn">${esc(w.ward_name_kn)}</span>` : ''}</h2>
      <p class="whead-meta">Ward ${fmt(w.ward_id)} &middot; <strong>Corporation:</strong> ${esc(w.corporation)} &middot; <strong>Zone:</strong> ${esc(w.zone_name || w.zone)} &middot; <strong>Assembly:</strong> ${esc(w.assembly)}</p>
      ${demoParts.length ? `<p class="whead-meta">${demoParts.join(' &middot; ')}</p>` : ''}
      <div class="whead-origin">
        <div class="whead-origin-block">
          <span class="label">Formed from old wards</span>
          <p>${oldWardsText(w)}</p>
        </div>
        <div class="whead-origin-block">
          <span class="label">Key areas</span>
          <p>${neighbourhoodsText(w)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderCandidates(w) {
  return `
    <section class="sec candgrid">
      <h3>Who is contesting the election in your ward? <span class="pill pill-soon">Coming soon</span></h3>
      <p class="cand-intro">Placeholders for Ward ${fmt(w.ward_id)}. Photo, party, symbol, affidavit and manifesto will load here once candidates are declared.</p>
      <div class="candgrid-row">
        ${[1, 2, 3].map(n => `
          <div class="candcard">
            <div class="candphoto"></div>
            <div class="candname">Candidate ${n}</div>
            <div class="candparty">Party</div>
            <div class="cand-detail"><span class="k">Affidavit</span> assets, cases, education</div>
            <div class="cand-detail"><span class="k">Manifesto</span> stated priorities for the ward</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

const RESET_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>';

function amenityLabel(type, uid, W, w) {
  if (type === 'polling') return 'Polling booths';
  const row = amenityRows(uid, W, w).find(r => r[0] === type);
  return row ? row[1] : LAYER[type].label;
}

function renderAmenityFilters(uid, W, w) {
  return LAYER_ORDER.concat(['polling']).map(key => {
    const count = layerPoints(uid, key, W).length;
    if (!count) return '';
    return `
      <button class="legend-btn amenity-card ${key === currentLayer ? 'active' : ''}" data-layer="${key}" type="button">
        <span class="amenity-card-icon" style="color:${LAYER[key].color}" aria-hidden="true">${LAYER[key].icon}</span>
        <span class="amenity-card-text">
          <span class="amenity-card-name">${esc(amenityLabel(key, uid, W, w))}</span>
          <span class="amenity-card-count">${fmt(count)}</span>
        </span>
      </button>
    `;
  }).join('');
}

function renderWardMap(uid, W, w) {
  const activeLayer = currentLayer;
  const initialCount = activeLayer ? layerPoints(uid, activeLayer, W).length : 0;
  const walkEligible = activeLayer ? LAYER[activeLayer].walk : false;
  return `
    <section class="sec">
      <h3>Ward map</h3>
      <div class="wardmap-frame">
        <div id="wardMap" class="map map-ward" aria-label="Map of ${esc(w.ward_name)}"></div>
        ${activeLayer ? `
          <div class="wardmap-badge" id="wardMapBadge">
            <span class="wardmap-badge-dot" style="background:${LAYER[activeLayer].color}" aria-hidden="true"></span>
            <span id="wardMapBadgeLabel">Showing: ${esc(amenityLabel(activeLayer, uid, W, w))} (${fmt(initialCount)})</span>
          </div>
        ` : ''}
      </div>
      <div class="wardmap-toolbar">
        <label class="buffer-toggle"><input type="checkbox" id="bufferToggle" ${bufferOn ? 'checked' : ''} ${walkEligible ? '' : 'disabled'}> Show 800m walk reach</label>
        <button class="btn btn-secondary btn-sm" id="wardMapReset" type="button"><span aria-hidden="true">${RESET_ICON}</span>Reset</button>
      </div>
      <div class="amenity-filters">
        ${renderAmenityFilters(uid, W, w)}
      </div>
    </section>
  `;
}

function renderAmenities(uid, W, w) {
  const rows = amenityRows(uid, W, w).filter(([key]) => !VULNERABILITY_KEYS.includes(key));
  return `
    <section class="sec">
      <h3>Amenities</h3>
      <div class="amgrid">
        ${rows.map(([key, label, count]) => `
          <div class="amrow" data-layer="${key}">
            <span class="am-icon" aria-hidden="true">${LAYER[key].icon}</span>
            <span class="am-label">${esc(label)}</span>
            <span class="cnt">${fmt(count || 0)}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderVulnerability(uid, W, w) {
  const rows = amenityRows(uid, W, w).filter(([key]) => VULNERABILITY_KEYS.includes(key));
  return `
    <section class="sec">
      <h3>Vulnerability hotspots</h3>
      <div class="amgrid">
        ${rows.map(([key, label, count]) => `
          <div class="amrow" data-layer="${key}">
            <span class="am-icon" aria-hidden="true">${LAYER[key].icon}</span>
            <span class="am-label">${esc(label)}</span>
            <span class="cnt">${fmt(count || 0)}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderFacts(w) {
  const facts = buildFacts(w);
  return `
    <section class="sec">
      <h3>Did you know?</h3>
      <div class="factslist">
        ${facts.map(f => `<div class="fact">${esc(f)}</div>`).join('')}
      </div>
    </section>
  `;
}

function renderAsk(w) {
  const questions = suggestedQuestions(w);
  return `
    <section class="sec">
      <h3>Questions to ask your candidates</h3>
      <ul class="qlist">${questions.map(q => `<li>${esc(q)}</li>`).join('')}</ul>
    </section>
    <section class="sec">
      <h3>BBMP Sahaaya &mdash; Top Grievances</h3>
      <p class="sahaaya-sub">Most-reported civic complaints in this ward</p>
      <div class="sahaaya-cats">
        <span class="pill">Roads &amp; potholes</span>
        <span class="pill">Garbage &amp; sanitation</span>
        <span class="pill">Water / drains / flooding</span>
      </div>
    </section>
  `;
}

// ---- map wiring ----

function setLayer(uid, W, type) {
  if (!type || !LAYER[type]) return;
  currentLayer = type;
  const points = setActiveAmenityLayer(wardMap, type, uid, W);
  const walkEligible = LAYER[type].walk;
  const bufferToggle = document.getElementById('bufferToggle');

  if (!walkEligible) {
    bufferOn = false;
    if (bufferToggle) bufferToggle.checked = false;
  }
  if (bufferToggle) bufferToggle.disabled = !walkEligible;

  setWalkBufferLayer(wardMap, walkEligible ? points : [], bufferOn && walkEligible);
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layer === type);
  });
  const badgeDot = document.querySelector('.wardmap-badge-dot');
  const badgeLabel = document.getElementById('wardMapBadgeLabel');
  if (badgeDot && badgeLabel) {
    badgeDot.style.background = LAYER[type].color;
    badgeLabel.textContent = `Showing: ${amenityLabel(type, uid, W, W[uid])} (${fmt(points.length)})`;
  }
}

function wireLayerClicks(uid, W) {
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.addEventListener('click', () => setLayer(uid, W, btn.dataset.layer));
  });
  document.querySelectorAll('.amrow').forEach(row => {
    if (layerPoints(uid, row.dataset.layer, W).length > 0) {
      row.classList.add('is-clickable');
      row.addEventListener('click', () => setLayer(uid, W, row.dataset.layer));
    }
  });
  const bufferToggle = document.getElementById('bufferToggle');
  if (bufferToggle) {
    bufferToggle.addEventListener('change', (e) => {
      bufferOn = e.target.checked;
      setLayer(uid, W, currentLayer);
    });
  }
  const resetBtn = document.getElementById('wardMapReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      bufferOn = false;
      if (bufferToggle) bufferToggle.checked = false;
      setLayer(uid, W, defaultLayer(uid, W));
    });
  }
}

// ---- entry point ----

export function initWardView({ W }) {
  dataRef = W;
}

export function openWard(uid, { onOpenWard } = {}) {
  const W = dataRef;
  const w = W[uid];
  currentLayer = defaultLayer(uid, W);
  bufferOn = false;

  const container = document.getElementById('wardContainer');
  container.innerHTML = `
    ${renderHead(w)}
    ${renderCandidates(w)}
    ${renderWardMap(uid, W, w)}
    ${renderAmenities(uid, W, w)}
    ${renderVulnerability(uid, W, w)}
    ${renderFacts(w)}
    ${renderAsk(w)}
  `;

  if (wardMap) {
    wardMap.remove();
    wardMap = null;
  }
  wardMap = createMap('wardMap', { center: [77.5946, 12.9716], zoom: 13.5 });
  wardMap.on('load', () => {
    const geojson = buildWardPolygonsGeoJSON(W, { filterUids: [uid] });
    addWardBoundaryLayer(wardMap, geojson);

    const nearby = nearbyWards(uid, W, 8);
    const neighborGeojson = buildWardPolygonsGeoJSON(W, { filterUids: nearby });
    wardMap.addSource('neighbor-wards', { type: 'geojson', data: neighborGeojson });
    wardMap.addLayer({
      id: 'neighbor-wards-line',
      type: 'line',
      source: 'neighbor-wards',
      paint: { 'line-color': '#93a29a', 'line-width': 1, 'line-dasharray': [2, 2] },
    });
    wardMap.on('click', 'neighbor-wards-line', (e) => {
      if (e.features.length) onOpenWard(e.features[0].properties.uid);
    });

    const bounds = new maplibregl.LngLatBounds();
    let boundCount = 0;
    forEachWardCoordinate(w, (pt) => {
      bounds.extend(pt);
      boundCount++;
    });
    if (boundCount) wardMap.fitBounds(bounds, { padding: 40, duration: 0 });

    if (currentLayer) {
      setLayer(uid, W, currentLayer);
      const amenityTip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-tip', offset: 12 });
      wardMap.on('mousemove', 'amenity-points-circle', (e) => {
        if (!e.features.length) return;
        const { name, num } = e.features[0].properties;
        if (!name) { amenityTip.remove(); return; }
        const html = num ? `${esc(name)} &middot; Booth ${esc(num)}` : esc(name);
        amenityTip.setLngLat(e.lngLat).setHTML(html).addTo(wardMap);
      });
      wardMap.on('mouseleave', 'amenity-points-circle', () => amenityTip.remove());
    }
    wireLayerClicks(uid, W);
  });
}

export function resizeWardMap() {
  resizeMap(wardMap);
}

export { buildFacts, suggestedQuestions };
