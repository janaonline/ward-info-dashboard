import {
  createMap, buildWardPolygonsGeoJSON, addWardBoundaryLayer, LAYER, LAYER_ORDER,
  amenityRows, defaultLayer, layerPoints, setActiveAmenityLayer, setWalkBufferLayer,
  nearbyWards, resizeMap, forEachWardCoordinate,
} from './maps.js';
import { esc, fmt, cov100 } from './format.js';

let wardMap = null;
let currentLayer = null;
let bufferOn = false;
let dataRef = null;
let avgRef = null;

// ---- ground-truth facts engine (exact thresholds ported from the original prototype) ----

function buildFacts(w, A) {
  const F = [];

  const mc = cov100(w.metro_cov);
  if (w.metro > 0 && mc != null && mc >= 1) {
    const can = Math.round(mc);
    F.push({ t: 'nearby', tone: '', h: `Your ward has <mark>${w.metro}</mark> metro station${w.metro > 1 ? 's' : ''}, and about <mark>${can}%</mark> of it is within a short walk of one.` });
  } else {
    const mcan = mc ? Math.round(mc) : 0;
    const cannot = 100 - mcan;
    F.push({ t: 'getting around', tone: cannot >= 60 ? 'bad' : 'warn', h: `${w.metro > 0 ? '' : 'There is no metro station inside your ward. '}<mark>${cannot}%</mark> of the ward cannot reach a metro station on foot.` });
  }

  const bc = cov100(w.bus_cov);
  if (bc != null) {
    const bcan = 100 - Math.round(bc);
    if (bcan <= 2) F.push({ t: 'getting around', tone: '', h: `Nearly everyone in your ward — about <mark>${Math.round(bc)}%</mark> — lives within a short walk of a bus stop.` });
    else F.push({ t: 'getting around', tone: bcan >= 30 ? 'bad' : 'warn', h: `<mark>${bcan}%</mark> of your ward is beyond a comfortable walk of a bus stop.` });
  }

  const pc = cov100(w.parks_cov);
  if (pc != null) {
    const pcan = 100 - Math.round(pc);
    if (pcan <= 5) F.push({ t: 'green space', tone: '', h: `A park is within a short walk for almost the whole ward (<mark>${Math.round(pc)}%</mark> covered).` });
    else F.push({ t: 'green space', tone: pcan >= 40 ? 'bad' : 'warn', h: `<mark>${pcan}%</mark> of your ward has no park within a short walk.` });
  }

  if (w.open_space_pc != null) {
    if (w.open_space_pc >= 9) F.push({ t: 'green space', tone: '', h: `Your ward meets the WHO open-space benchmark with about <mark>${fmt(w.open_space_pc, 1)} m²</mark> per person.` });
    else F.push({ t: 'green space', tone: 'warn', h: `Your ward has roughly <mark>${fmt(w.open_space_pc, 1)} m²</mark> of open space per person — the WHO benchmark is <mark>9 m²</mark>.` });
  }

  const wat = (w.lakes || 0) + (w.ponds || 0);
  const cavg = Math.max(1, Math.round((A.Num_Lakes || 0) + (A.Num_Ponds || 0)));
  if (wat === 0) F.push({ t: 'lakes & water', tone: 'warn', h: 'No lakes or ponds are mapped in your ward.' });
  else if (wat >= cavg * 2) F.push({ t: 'lakes & water', tone: '', h: `Your ward is water-rich: <mark>${w.lakes}</mark> lake${w.lakes === 1 ? '' : 's'} and <mark>${w.ponds}</mark> pond${w.ponds === 1 ? '' : 's'} — well above the city average.` });
  else F.push({ t: 'lakes & water', tone: '', h: `Your ward has <mark>${w.lakes}</mark> lake${w.lakes === 1 ? '' : 's'} and <mark>${w.ponds}</mark> pond${w.ponds === 1 ? '' : 's'} to protect.` });

  const fl = (w.flood_vuln || 0) + (w.flood_prone || 0);
  if (fl === 0) F.push({ t: 'monsoon', tone: '', h: '<mark>No</mark> flood-prone spots are recorded in your ward — that’s the goal.' });
  else F.push({ t: 'monsoon', tone: 'bad', h: `<mark>${fl}</mark> spot${fl === 1 ? '' : 's'} in your ward ${fl === 1 ? 'is' : 'are'} known to flood or lie low during the monsoon.` });

  if (w.schools > 0) {
    const pps = Math.round(w.pop / w.schools);
    F.push({ t: 'schools', tone: pps > 8000 ? 'warn' : '', h: `Your ward has <mark>${w.schools}</mark> schools — about <mark>${fmt(pps)}</mark> residents per school.` });
  }

  const toc = cov100(w.toilet_cov);
  if (toc != null) {
    const tcan = 100 - Math.round(toc);
    if (tcan >= 40) F.push({ t: 'sanitation', tone: 'warn', h: `<mark>${tcan}%</mark> of the ward has no public toilet within a short walk.` });
  }

  return F.slice(0, 7);
}

function suggestedQuestions(w) {
  const q = [];
  const nm = esc(w.ward_name);
  if (cov100(w.bus_cov) != null && w.bus_cov < 90) q.push(`Parts of ${nm} are a long walk from a bus stop — how will you bring frequent, reliable buses closer to every neighbourhood?`);
  if (w.metro === 0) q.push(`There's no metro station in ${nm} — how will you improve buses and safe links to the nearest metro?`);
  if (cov100(w.parks_cov) != null && w.parks_cov < 90) q.push(`Many parts of ${nm} have no park within walking distance — how will you add green space nearby?`);
  if (((w.flood_vuln || 0) + (w.flood_prone || 0)) > 0) q.push(`The same spots in ${nm} flood every monsoon — what is your dated plan to fix the drains before the next rains?`);
  if (w.open_space_pc != null && w.open_space_pc < 9) q.push(`Open space in ${nm} is below the WHO standard — how will you create and protect parks and playgrounds?`);
  if (w.police === 0) q.push(`Safety is a worry after dark in ${nm} — how will you improve police presence and street lighting?`);
  q.push(`Garbage pickup and segregation are patchy — how will you make daily door-to-door waste collection reliable across ${nm}?`);
  q.push(`How will you fix broken footpaths and dark streets so walking around ${nm} is safe?`);
  q.push(`Many homes depend on tankers — how will you improve piped water and rainwater recharge in ${nm}?`);
  const seen = {}, out = [];
  q.forEach(x => { if (!seen[x]) { seen[x] = 1; out.push(x); } });
  return out.slice(0, 6);
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

function renderHead(w) {
  return `
    <div class="whead">
      <h2>${esc(w.ward_name)}${w.ward_name_kn ? ` <span class="kn">${esc(w.ward_name_kn)}</span>` : ''}</h2>
      <p class="whead-meta">Ward ${fmt(w.ward_id)} &middot; ${esc(w.corporation)} &middot; ${esc(w.zone_name || w.zone)} &middot; ${esc(w.assembly)}</p>
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
  const rows = amenityRows(uid, W, w);
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

function renderFacts(w, A) {
  const facts = buildFacts(w, A);
  return `
    <section class="sec">
      <h3>Did you know?</h3>
      <div class="factslist">
        ${facts.map(f => `<div class="fact ${f.tone || ''}"><span class="k">${esc(f.t)}</span>${f.h}</div>`).join('')}
      </div>
    </section>
  `;
}

function renderAsk(w) {
  const questions = suggestedQuestions(w);
  return `
    <section class="sec">
      <h3>Questions to ask your candidates</h3>
      <ul class="qlist">${questions.map(q => `<li>${q}</li>`).join('')}</ul>
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

export function initWardView({ W, A }) {
  dataRef = W;
  avgRef = A;
}

export function openWard(uid, { onOpenWard } = {}) {
  const W = dataRef;
  const A = avgRef;
  const w = W[uid];
  currentLayer = defaultLayer(uid, W);
  bufferOn = false;

  const container = document.getElementById('wardContainer');
  container.innerHTML = `
    ${renderHead(w)}
    ${renderCandidates(w)}
    ${renderWardMap(uid, W, w)}
    ${renderAmenities(uid, W, w)}
    ${renderFacts(w, A)}
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
