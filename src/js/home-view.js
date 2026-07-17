import { createMap, buildWardPolygonsGeoJSON, addChoroplethLayer, CORP_COLORS, wardAt, resizeMap, raiseLabels, addResetViewControl } from './maps.js';
import { esc, fmt } from './format.js';

let corpMap = null;
let onOpenWardRef = null;
let suggestAbortController = null;
let suggestRequestSeq = 0;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_EMAIL = 'sss@gmail.com';
const LANDMARK_MIN_LEN = 3;
const LANDMARK_DEBOUNCE_MS = 400;
const SUGGEST_CAP = 6;

const BALLOT_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10l3-6h10l3 6"/><path d="M9.5 13.5l2 2 4-4"/></svg>';

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

function computeLocalMatches(W, query) {
  const s = query.toLowerCase();
  const matches = Object.values(W).filter(w => String(w.ward_name).toLowerCase().includes(s));
  matches.sort((a, b) => {
    const aStarts = String(a.ward_name).toLowerCase().startsWith(s);
    const bStarts = String(b.ward_name).toLowerCase().startsWith(s);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return String(a.ward_name).localeCompare(String(b.ward_name));
  });
  return matches.slice(0, SUGGEST_CAP).map(w => w.uid);
}

function findWardNameTextMatch(text, W) {
  const t = text.toLowerCase();
  let best = null;
  let bestLen = -1;
  for (const w of Object.values(W)) {
    const name = String(w.ward_name).toLowerCase();
    if (t.includes(name) || name.includes(t)) {
      if (name.length > bestLen || (name.length === bestLen && w.ward_name < W[best].ward_name)) {
        best = w.uid;
        bestLen = name.length;
      }
    }
  }
  return best;
}

async function resolveLandmarkMatches(query, W) {
  if (suggestAbortController) suggestAbortController.abort();
  suggestAbortController = new AbortController();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('amenity', query);
  url.searchParams.set('country', 'india');
  url.searchParams.set('city', 'bangalore');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('email', NOMINATIM_EMAIL);

  let results;
  try {
    const res = await fetch(url, { signal: suggestAbortController.signal });
    if (!res.ok) return [];
    results = await res.json();
  } catch (err) {
    if (err.name === 'AbortError') return null;
    return [];
  }

  const seen = new Set();
  const matches = [];
  for (const result of results) {
    const lon = parseFloat(result.lon);
    const lat = parseFloat(result.lat);
    if (Number.isNaN(lon) || Number.isNaN(lat)) continue;

    const geometryUid = wardAt(lon, lat, W);
    const textUid = findWardNameTextMatch(`${result.name || ''} ${result.display_name || ''}`, W);

    let uid;
    if (textUid) {
      if (textUid !== geometryUid) continue;
      uid = textUid;
    } else {
      if (!geometryUid) continue;
      uid = geometryUid;
    }
    if (seen.has(uid)) continue;

    const landmark = result.name || (result.display_name ? result.display_name.split(',')[0].trim() : '');
    if (!landmark) continue;
    seen.add(uid);
    matches.push({ uid, landmark });
  }
  return matches;
}

function buildSuggestionRows(localUids, landmarkMatches) {
  const rows = localUids.map(uid => ({ uid, subtext: null }));
  const seen = new Set(localUids);
  for (const { uid, landmark } of landmarkMatches) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    rows.push({ uid, subtext: `near ${landmark}` });
    if (rows.length >= SUGGEST_CAP) break;
  }
  return rows.slice(0, SUGGEST_CAP);
}

function renderSuggestions(W, rows) {
  const listEl = document.getElementById('wardSuggest');
  if (!rows || !rows.length) {
    listEl.innerHTML = '';
    listEl.setAttribute('hidden', '');
    return;
  }

  listEl.innerHTML = rows.map(({ uid, subtext }) => `
    <li class="ward-suggest-row" data-uid="${esc(uid)}">
      <span class="ward-row-name">${esc(W[uid].ward_name)}</span>
      <span class="ward-row-meta">${subtext ? esc(subtext) : `Ward ${fmt(W[uid].ward_id)} &middot; ${esc(W[uid].corporation)}`}</span>
    </li>
  `).join('');
  listEl.removeAttribute('hidden');

  listEl.querySelectorAll('.ward-suggest-row').forEach(row => {
    row.addEventListener('click', () => {
      renderSuggestions(W, []);
      onOpenWardRef(row.dataset.uid);
    });
  });
}

function initWhyVoteToggle() {
  const btn = document.getElementById('whyVoteToggle');
  const more = document.getElementById('whyVoteMore');
  if (!btn || !more) return;
  more.inert = true;

  function setExpanded(expanded) {
    more.inert = !expanded;
    more.style.maxHeight = expanded ? `${more.scrollHeight}px` : '0px';
    btn.setAttribute('aria-expanded', String(expanded));
    btn.classList.toggle('why-vote-toggle--less', expanded);
    btn.innerHTML = expanded
      ? 'Show less <span class="why-vote-toggle-arrow" aria-hidden="true">&uarr;</span>'
      : 'Read more <span class="why-vote-toggle-arrow" aria-hidden="true">&rarr;</span>';
  }

  btn.addEventListener('click', () => setExpanded(btn.getAttribute('aria-expanded') !== 'true'));
}

export function initHomeView({ W, meta }, { onOpenWard }) {
  onOpenWardRef = onOpenWard;
  const container = document.getElementById('homeContainer');
  const nCorps = new Set(Object.values(W).map(w => w.corporation)).size;

  container.innerHTML = `
    <div class="cover">
      <div class="eyebrow"><span class="eyebrow-dot"></span> Make an informed choice</div>
      <h1 class="headline">This election, Bengaluru will elect <mark>ward councillors</mark> under the Greater Bengaluru Authority (GBA) for the first time.</h1>
      <p class="hero-subtitle">Before you vote, understand your neighbourhood, explore the candidates, see the public infrastructure around you, and learn how your local government shapes everyday life.</p>
      <section class="why-vote" aria-labelledby="whyVoteTitle">
        <div class="why-vote-head">
          <span class="why-vote-icon" aria-hidden="true">${BALLOT_ICON}</span>
          <h2 id="whyVoteTitle" class="why-vote-title">Why vote?</h2>
        </div>
        <p class="why-vote-subtitle">Why your vote in the ward election matters.</p>
        <div class="why-vote-body">
          <p>Bengaluru has not held local body elections since 2015, and for nearly a decade the city has functioned without elected corporators, leaving neighbourhoods without direct, accountable representation in the system.</p>
          <div class="why-vote-more" id="whyVoteMore">
            <p>In that time, the city has continued to spend significant public funds, INR 38,455 crore annually, yet much of this remains difficult to trace, and for citizens there has been little clarity on how decisions are made or whom to hold responsible when services fall short.</p>
            <p>What this looks like on the ground is not abstract: roads that remain damaged, garbage that is not cleared on time, drains that overflow during rains, footpaths that are unusable, and streetlights that do not function consistently, all without an elected representative whose role is to take these issues up and demand answers.</p>
            <p>This election is an opportunity to restore that link.</p>
            <p>Your vote decides who represents your ward, who raises your concerns, and who holds the system to account. It shapes how your neighbourhood functions and how responsive the city becomes.</p>
            <p><strong>Vote. It is your voice in how Bengaluru is run.</strong></p>
          </div>
        </div>
        <div class="why-vote-actions">
          <button type="button" id="whyVoteToggle" class="why-vote-toggle" aria-expanded="false" aria-controls="whyVoteMore">Read more <span class="why-vote-toggle-arrow" aria-hidden="true">&rarr;</span></button>
        </div>
      </section>
      <div class="find-controls">
        <div class="find-search-wrap">
          <input id="findSearch" type="search" placeholder="Search by ward, area, or constituency" autocomplete="off">
          <ul id="wardSuggest" class="ward-suggest" hidden></ul>
        </div>
        <button id="findLocate" class="btn btn-secondary" type="button">Use my location</button>
      </div>
      <p class="ward-def">A ward is the smallest electoral unit in a city. It is the neighbourhood or group of neighbourhoods you live in. Every ward elects one councillor who works on local civic issues such as roads, parks, sanitation, drainage, streetlights, and neighbourhood infrastructure.</p>
      <p class="hero-kicker">Know your ward before you vote.</p>
      <div id="homeCorpMap" class="map map-corp" aria-label="Map of Bengaluru's civic corporations"></div>
      <p class="map-caption">Greater Bengaluru Authority has ${fmt(nCorps)} Municipal Corporations and ${fmt(meta.n_wards)} wards</p>
      <div class="corp-legend">
        ${Object.entries(CORP_COLORS).map(([name, color]) => `
          <span class="legend-chip"><span class="chip-dot" style="background:${color}"></span>${name}</span>
        `).join('')}
      </div>
      <p id="findCount" class="find-count"></p>
      <ul id="findList" class="ward-list"></ul>
      <details class="panel">
        <summary>What is the Greater Bengaluru Authority?</summary>
        <p>The Greater Bengaluru Authority (GBA) is the apex civic body for the Bengaluru metropolitan region. It coordinates planning, infrastructure and governance across the city. Under the Greater Bengaluru Governance Act, 2024, the erstwhile Bruhat Bengaluru Mahanagara Palike (BBMP) has been reconstituted into multiple City Corporations (currently five), which now perform municipal functions within the Greater Bengaluru Area under the overarching coordination and supervision of the Greater Bengaluru Authority and its Executive Committee.</p>
      </details>
      <details class="panel">
        <summary>What is a ward councillor?</summary>
        <p>A ward councillor is your elected representative in local government. They represent your neighbourhood, raise local issues, oversee civic works, and help ensure municipal services respond to residents' needs.</p>
      </details>
      <details class="panel">
        <summary>How does this dashboard work?</summary>
        <p>This platform presents ward-level civic information for Bengaluru, overlapping ward boundaries with open datasets on public amenities—bus stops, metro, schools, parks, lakes and more—to indicate how well each area is served and where provision is lacking.</p>
        <p>Its purpose is to make civic data accessible and usable for residents, supporting an understanding of local conditions based on evidence and data. Ahead of elections, this can help citizens ask their candidates specific, informed questions.</p>
        <p>The intention is to develop this into a consolidated source of ward-level information for Bengaluru.</p>
      </details>
      <details class="panel">
        <summary>About the data</summary>
        <p>Ward-level data compiled from ${meta.source || 'public GBA/BBMP sources'} as of ${meta.generated || 'the latest available update'}. See the methodology page for full sourcing and caveats.</p>
      </details>
    </div>
  `;

  initWhyVoteToggle();

  renderList(W, '');

  let latestLocalMatches = [];
  let activeWardPopup = null;

  function closeWardPopup() {
    if (activeWardPopup) {
      activeWardPopup.remove();
      activeWardPopup = null;
    }
  }

  const landmarkLookup = debounce(async (query, mySeq) => {
    if (query.length < LANDMARK_MIN_LEN) return;
    const landmarkMatches = await resolveLandmarkMatches(query, W);
    if (landmarkMatches === null) return;
    if (mySeq !== suggestRequestSeq) return;
    renderSuggestions(W, buildSuggestionRows(latestLocalMatches, landmarkMatches));
  }, LANDMARK_DEBOUNCE_MS);

  document.getElementById('findSearch').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    suggestRequestSeq += 1;
    latestLocalMatches = query ? computeLocalMatches(W, query) : [];
    renderSuggestions(W, buildSuggestionRows(latestLocalMatches, []));
    landmarkLookup(query, suggestRequestSeq);
  });

  document.getElementById('findSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') renderSuggestions(W, []);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.find-search-wrap')) renderSuggestions(W, []);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWardPopup();
  });

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
    const defaultView = { center: [77.5946, 12.9716], zoom: 9 };
    corpMap = createMap('homeCorpMap', defaultView);
    corpMap.on('load', () => {
      const geojson = buildWardPolygonsGeoJSON(W);
      const hover = addChoroplethLayer(corpMap, geojson);
      raiseLabels(corpMap);
      addResetViewControl(corpMap, defaultView);
      const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-tip', offset: 12 });

      corpMap.on('mousemove', 'wards-fill', (e) => {
        if (!e.features.length) return;
        const f = e.features[0];
        hover.setHovered(f.id);
        if (activeWardPopup) return;
        tip.setLngLat(e.lngLat)
          .setHTML(`Ward ${fmt(f.properties.ward_id)} &middot; ${esc(f.properties.name)} &middot; ${esc(f.properties.corporation)}`)
          .addTo(corpMap);
      });
      corpMap.on('mouseleave', 'wards-fill', () => {
        hover.clear();
        tip.remove();
      });

      corpMap.on('click', 'wards-fill', (e) => {
        if (!e.features.length) return;
        const f = e.features[0];
        const uid = f.properties.uid;
        const name = f.properties.name;

        closeWardPopup();
        tip.remove();

        const popup = new maplibregl.Popup({ closeButton: false, className: 'ward-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="ward-popup-body">
              <div class="ward-popup-name">Ward: ${esc(name)}</div>
              <button type="button" class="btn btn-primary btn-sm ward-popup-btn" aria-label="View ward info for ${esc(name)}">View ward info</button>
            </div>
          `)
          .addTo(corpMap);

        popup.getElement().querySelector('.ward-popup-body').addEventListener('click', () => {
          closeWardPopup();
          onOpenWardRef(uid);
        });

        popup.on('close', () => { if (activeWardPopup === popup) activeWardPopup = null; });
        activeWardPopup = popup;
      });
    });
  }
}

export function resizeHomeMap() {
  resizeMap(corpMap);
}
