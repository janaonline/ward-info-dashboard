import {
  createMap, buildWardPolygonsGeoJSON, addWardBoundaryLayer, LAYER, LAYER_ORDER,
  amenityRows, defaultLayer, layerPoints, setActiveAmenityLayer, setWalkBufferLayer,
  nearbyWards, resizeMap,
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
      <button class="back-link" id="wardBack" type="button">&larr; Back</button>
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

function renderCandidates() {
  return `
    <section class="sec candgrid">
      <h3>Candidates</h3>
      <div class="candgrid-row">
        ${[1, 2, 3].map(n => `
          <div class="candcard">
            <div class="candphoto"></div>
            <div class="candname">Candidate ${n}</div>
            <div class="candparty">Party</div>
            <span class="pill">Info coming soon</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderLegend(uid, W) {
  return `
    <div class="legend">
      ${LAYER_ORDER.concat(['polling']).map(key => {
        const has = layerPoints(uid, key, W).length > 0;
        if (!has) return '';
        return `<button class="legend-chip legend-btn ${key === currentLayer ? 'active' : ''}" data-layer="${key}" type="button">
          <span class="chip-dot" style="background:${LAYER[key].color}"></span>${LAYER[key].label}
        </button>`;
      }).join('')}
      <label class="buffer-toggle"><input type="checkbox" id="bufferToggle" ${bufferOn ? 'checked' : ''}> Show 800m walk reach</label>
    </div>
  `;
}

function renderAmenities(w) {
  const rows = amenityRows(w);
  return `
    <section class="sec">
      <h3>Amenities</h3>
      <div class="amgrid">
        ${rows.map(([key, label, count, cov]) => `
          <div class="amrow" data-layer="${key}">
            <span class="am-label">${esc(label)}</span>
            <span class="cnt">${fmt(count || 0)}</span>
            ${cov != null ? `<span class="am-bar"><span class="am-bar-fill" style="width:${Math.max(0, Math.min(100, cov))}%"></span></span>` : ''}
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

function renderAskShare(w) {
  const questions = suggestedQuestions(w);
  const shareText = encodeURIComponent(`Check out ward info for ${w.ward_name} on Know Your Ward: `);
  const shareUrl = encodeURIComponent(`${location.origin}${location.pathname}#ward=${w.uid}`);
  return `
    <section class="sec tabpane">
      <div class="tab-ask">
        <h3>Questions to ask your candidates</h3>
        <ul class="qlist">${questions.map(q => `<li>${q}</li>`).join('')}</ul>
      </div>
      <div class="tab-share">
        <h3>Share this ward</h3>
        <a class="btn btn-whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${shareText}${shareUrl}">Share on WhatsApp</a>
        <button class="btn btn-secondary" id="copyLinkBtn" type="button">Copy link</button>
      </div>
      <div class="sahaaya">
        <h3>Report a civic issue (BBMP Sahaaya)</h3>
        <div class="sahaaya-cats">
          <span class="pill">Roads &amp; potholes</span>
          <span class="pill">Garbage &amp; sanitation</span>
          <span class="pill">Water / drains / flooding</span>
        </div>
      </div>
    </section>
  `;
}

// ---- map wiring ----

function setLayer(uid, W, type) {
  currentLayer = type;
  const points = setActiveAmenityLayer(wardMap, type, uid, W);
  const walkEligible = LAYER[type].walk;
  setWalkBufferLayer(wardMap, walkEligible ? points : [], bufferOn && walkEligible);
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layer === type);
  });
}

function wireLayerClicks(uid, W) {
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.addEventListener('click', () => setLayer(uid, W, btn.dataset.layer));
  });
  document.querySelectorAll('.amrow').forEach(row => {
    row.addEventListener('click', () => setLayer(uid, W, row.dataset.layer));
  });
  const bufferToggle = document.getElementById('bufferToggle');
  if (bufferToggle) {
    bufferToggle.addEventListener('change', (e) => {
      bufferOn = e.target.checked;
      setLayer(uid, W, currentLayer);
    });
  }
}

// ---- entry point ----

export function initWardView({ W, A }) {
  dataRef = W;
  avgRef = A;
}

export function openWard(uid, { onOpenWard, onBack } = {}) {
  const W = dataRef;
  const A = avgRef;
  const w = W[uid];
  currentLayer = defaultLayer(uid, W);
  bufferOn = false;

  const container = document.getElementById('wardContainer');
  container.innerHTML = `
    ${renderHead(w)}
    ${renderCandidates()}
    <section class="sec">
      <h3>Ward map</h3>
      ${renderLegend(uid, W)}
      <div id="wardMap" class="map map-ward" aria-label="Map of ${esc(w.ward_name)}"></div>
    </section>
    ${renderAmenities(w)}
    ${renderFacts(w, A)}
    ${renderAskShare(w)}
  `;

  document.getElementById('wardBack').addEventListener('click', () => onBack());
  const copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const url = `${location.origin}${location.pathname}#ward=${uid}`;
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500);
      });
    });
  }

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
    w.geom.forEach(ring => ring.forEach(pt => bounds.extend(pt)));
    wardMap.fitBounds(bounds, { padding: 40, duration: 0 });

    setLayer(uid, W, currentLayer);
    wireLayerClicks(uid, W);
  });
}

export function resizeWardMap() {
  resizeMap(wardMap);
}

export { buildFacts, suggestedQuestions };
