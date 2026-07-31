import { createMap, buildWardPolygonsGeoJSON, addChoroplethLayer, CORP_COLORS, wardAt, resizeMap, raiseLabels, addResetViewControl } from './maps.js';
import { esc, fmt } from './format.js';

let corpMap = null;
let corpHover = null;
let onOpenWardRef = null;
let suggestAbortController = null;
let suggestRequestSeq = 0;
let activeCorp = 'All';
let wardsRef = null;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_EMAIL = 'sss@gmail.com';
const LANDMARK_MIN_LEN = 3;
const LANDMARK_DEBOUNCE_MS = 400;
const SUGGEST_CAP = 6;
const BROWSE_CAP = 6;

const BALLOT_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10l3-6h10l3 6"/><path d="M9.5 13.5l2 2 4-4"/></svg>';
const ARROW_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const CORP_FILTERS = ['All', 'North', 'East', 'West', 'South', 'Central'];

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function matchesCorp(w, corp) {
  return corp === 'All' || w.corporation === corp;
}

function renderList(W, corp) {
  const listEl = document.getElementById('findList');
  const all = Object.values(W).filter(w => matchesCorp(w, corp));
  all.sort((a, b) => a.ward_id - b.ward_id);
  const shown = all.slice(0, 400);

  listEl.innerHTML = shown.map(w => `
    <li class="ward-row" data-uid="${esc(w.uid)}">
      <span class="ward-row-text">
        <span class="ward-row-name">${esc(w.ward_name)}</span>
        <span class="ward-row-meta">Ward ${fmt(w.ward_id)} &middot; ${esc(w.corporation)}</span>
      </span>
      <span class="ward-row-arrow" aria-hidden="true">${ARROW_ICON}</span>
    </li>
  `).join('');

  document.getElementById('findCount').textContent =
    `${all.length} ward${all.length === 1 ? '' : 's'}${all.length > 400 ? ' (showing first 400)' : ''}`;

  listEl.querySelectorAll('.ward-row').forEach(row => {
    row.addEventListener('click', () => onOpenWardRef(row.dataset.uid));
  });
}

function renderBrowseList(W, corp) {
  const listEl = document.getElementById('browseList');
  const all = Object.values(W).filter(w => matchesCorp(w, corp));
  all.sort((a, b) => a.ward_id - b.ward_id);
  const shown = all.slice(0, BROWSE_CAP);

  listEl.innerHTML = shown.map(w => `
    <li class="ward-row" data-uid="${esc(w.uid)}">
      <span class="ward-row-text">
        <span class="ward-row-name">${esc(w.ward_name)}</span>
        <span class="ward-row-meta">Ward ${fmt(w.ward_id)} &middot; ${esc(w.corporation)}</span>
      </span>
      <span class="ward-row-arrow" aria-hidden="true">${ARROW_ICON}</span>
    </li>
  `).join('');

  listEl.querySelectorAll('.ward-row').forEach(row => {
    row.addEventListener('click', () => onOpenWardRef(row.dataset.uid));
  });
}

function setActiveCorp(corp) {
  activeCorp = corp;
  document.querySelectorAll('.corp-filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.corp === corp);
  });
  if (wardsRef) {
    renderBrowseList(wardsRef, corp);
    renderList(wardsRef, corp);
  }
  if (corpMap && corpMap.getLayer('wards-fill')) {
    const filter = corp === 'All' ? null : ['==', ['get', 'corporation'], corp];
    corpMap.setFilter('wards-fill', filter);
    corpMap.setFilter('wards-line', filter);
    corpMap.setFilter('wards-line-hover', filter);
  }
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

export function initHomeView({ W, meta }, { onOpenWard, onMethodology }) {
  onOpenWardRef = onOpenWard;
  wardsRef = W;
  const container = document.getElementById('homeContainer');
  const nCorps = new Set(Object.values(W).map(w => w.corporation)).size;

  container.innerHTML = `
    <div class="cover">
      <div class="band-inner">
      <div class="eyebrow"><span class="eyebrow-dot"></span> Make an informed choice</div>
      <h1 class="headline">Know your ward before you vote.</h1>
      <p class="hero-subtitle">This election, Bengaluru will elect ward councillors under the Greater Bengaluru Authority (GBA) for the first time. Understand your neighbourhood, explore the candidates, and see the infrastructure around you.</p>

      <div class="find-controls">
        <div class="find-search-wrap">
          <input id="findSearch" type="search" placeholder="Search ward or area" autocomplete="off">
          <ul id="wardSuggest" class="ward-suggest" hidden></ul>
        </div>
        <button id="findSearchBtn" class="btn btn-primary" type="button">Search</button>
        <button id="findLocate" class="btn btn-secondary" type="button">Use my location</button>
      </div>

      <div class="hero-stats">
        <div class="hero-stat"><span class="hero-stat-num">${fmt(meta.n_wards)}</span><span class="hero-stat-label">wards</span></div>
        <div class="hero-stat"><span class="hero-stat-num">${String(nCorps).padStart(2, '0')}</span><span class="hero-stat-label">corporations</span></div>
        <div class="hero-stat"><span class="hero-stat-num">01</span><span class="hero-stat-label">councillor / ward</span></div>
        <div class="hero-stat hero-stat--alert"><span class="hero-stat-num">10</span><span class="hero-stat-label">yrs since last poll</span></div>
      </div>
      </div>
    </div>

    <section class="why-vote-band" aria-labelledby="whyVoteTitle">
      <div class="why-vote-band-inner band-inner">
        <div class="why-vote-head-col">
          <div class="why-vote-head">
            <span class="why-vote-icon" aria-hidden="true">${BALLOT_ICON}</span>
            <span class="eyebrow eyebrow--dark">Why vote?</span>
          </div>
          <h2 id="whyVoteTitle" class="why-vote-title">Bengaluru hasn't voted locally since 2015.</h2>
        </div>
        <div class="why-vote-body-col">
          <div class="why-vote-body">
            <p>For nearly a decade the city has functioned without elected corporators, leaving neighbourhoods without direct, accountable representation. Every ward elects one councillor who works on local civic issues such as roads, parks, sanitation, drainage, and streetlights.</p>
            <div class="why-vote-more" id="whyVoteMore">
              <p>In that time, the city has continued to spend significant public funds, INR 38,455 crore annually, yet much of this remains difficult to trace, and for citizens there has been little clarity on how decisions are made or whom to hold responsible when services fall short.</p>
              <p>What this looks like on the ground is not abstract: roads that remain damaged, garbage that is not cleared on time, drains that overflow during rains, footpaths that are unusable, and streetlights that do not function consistently, all without an elected representative whose role is to take these issues up and demand answers.</p>
              <p>This election is an opportunity to restore that link. Your vote decides who represents your ward, who raises your concerns, and who holds the system to account.</p>
              <p><strong>Vote. It is your voice in how Bengaluru is run.</strong></p>
            </div>
          </div>
          <div class="why-vote-pills">
            <span class="pill pill--band">Roads</span><span class="pill pill--band">Parks</span><span class="pill pill--band">Sanitation</span><span class="pill pill--band">Drainage</span><span class="pill pill--band">Streetlights</span>
          </div>
          <div class="why-vote-actions">
            <button type="button" id="whyVoteToggle" class="why-vote-toggle" aria-expanded="false" aria-controls="whyVoteMore">Read more <span class="why-vote-toggle-arrow" aria-hidden="true">&rarr;</span></button>
          </div>
        </div>
      </div>
    </section>

    <section class="ward-explorer">
      <div class="ward-explorer-head">
        <div>
          <span class="eyebrow eyebrow--red">Ward explorer</span>
          <h2 class="section-title">Find your neighbourhood on the map.</h2>
          <p class="section-sub">Greater Bengaluru Authority has ${fmt(nCorps)} municipal corporations and ${fmt(meta.n_wards)} wards. Pick a corporation, then a ward.</p>
        </div>
        <div class="corp-filter-pills" role="group" aria-label="Filter by corporation">
          ${CORP_FILTERS.map(c => `<button type="button" class="corp-filter-pill${c === 'All' ? ' active' : ''}" data-corp="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </div>
      <div class="ward-explorer-layout">
        <div id="homeCorpMap" class="map map-corp" aria-label="Map of Bengaluru's civic corporations"></div>
        <div class="ward-browse">
          <div class="ward-browse-head">
            <span class="ward-browse-title">Browse wards</span>
            <button type="button" id="viewAllWards" class="ward-browse-viewall">View all ${fmt(meta.n_wards)} &rarr;</button>
          </div>
          <ul id="browseList" class="ward-list ward-list--browse"></ul>
        </div>
      </div>
      <div class="corp-legend">
        ${Object.entries(CORP_COLORS).map(([name, color]) => `
          <span class="legend-chip"><span class="chip-dot" style="background:${color}"></span>${name}</span>
        `).join('')}
      </div>
      <p id="findCount" class="find-count" hidden></p>
      <ul id="findList" class="ward-list" hidden></ul>
    </section>

    <section class="basics-section">
      <span class="eyebrow eyebrow--red">The basics</span>
      <h2 class="section-title">Four things worth understanding.</h2>
      <div class="basics-list">
        <details class="panel basics-item" open>
          <summary><span class="basics-num">01</span> What is the Greater Bengaluru Authority?</summary>
          <p>The Greater Bengaluru Authority (GBA) is the apex civic body for the Bengaluru metropolitan region. It coordinates planning, infrastructure and governance across the city. Under the Greater Bengaluru Governance Act, 2024, the erstwhile Bruhat Bengaluru Mahanagara Palike (BBMP) has been reconstituted into multiple City Corporations (currently five), which now perform municipal functions within the Greater Bengaluru Area under the overarching coordination and supervision of the Greater Bengaluru Authority and its Executive Committee.</p>
        </details>
        <details class="panel basics-item">
          <summary><span class="basics-num">02</span> What is a ward councillor?</summary>
          <p>A ward councillor is your elected representative in local government. They represent your neighbourhood, raise local issues, oversee civic works, and help ensure municipal services respond to residents' needs.</p>
        </details>
        <details class="panel basics-item">
          <summary><span class="basics-num">03</span> How does this dashboard work?</summary>
          <p>This platform presents ward-level civic information for Bengaluru, overlapping ward boundaries with open datasets on public amenities&mdash;bus stops, metro, schools, parks, lakes and more&mdash;to indicate how well each area is served and where provision is lacking.</p>
          <p>Its purpose is to make civic data accessible and usable for residents, supporting an understanding of local conditions based on evidence and data. Ahead of elections, this can help citizens ask their candidates specific, informed questions.</p>
          <p>The intention is to develop this into a consolidated source of ward-level information for Bengaluru.</p>
        </details>
        <details class="panel basics-item">
          <summary><span class="basics-num">04</span> About the data</summary>
          <p>Ward-level data compiled from ${meta.source || 'public GBA/BBMP sources'} as of ${meta.generated || 'the latest available update'}. See the methodology page for full sourcing and caveats.</p>
        </details>
      </div>
    </section>

    <section class="methodology-band">
      <div class="methodology-band-inner band-inner">
        <div>
          <span class="eyebrow eyebrow--dark">Methodology</span>
          <h2 class="section-title">Every number here is traceable to a public source.</h2>
        </div>
        <button type="button" id="methodologyTeaserBtn" class="btn btn-primary">Read the methodology &rarr;</button>
      </div>
    </section>
  `;

  initWhyVoteToggle();

  renderList(W, 'All');
  renderBrowseList(W, 'All');

  document.getElementById('methodologyTeaserBtn').addEventListener('click', () => {
    if (onMethodology) onMethodology();
  });

  document.getElementById('viewAllWards').addEventListener('click', () => {
    setActiveCorp('All');
    document.getElementById('findList').hidden = false;
    document.getElementById('findCount').hidden = false;
    document.getElementById('findList').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('.corp-filter-pill').forEach(btn => {
    btn.addEventListener('click', () => setActiveCorp(btn.dataset.corp));
  });

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
    if (e.key === 'Enter' && latestLocalMatches.length) onOpenWardRef(latestLocalMatches[0]);
  });

  document.getElementById('findSearchBtn').addEventListener('click', () => {
    if (latestLocalMatches.length) {
      onOpenWardRef(latestLocalMatches[0]);
    } else {
      document.getElementById('findSearch').focus();
    }
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
    const isDesktopWidth = window.matchMedia('(min-width: 900px)').matches;
    const defaultView = { center: [77.5946, 12.9716], zoom: isDesktopWidth ? 9.3 : 9 };
    corpMap = createMap('homeCorpMap', defaultView);
    corpMap.on('load', () => {
      const geojson = buildWardPolygonsGeoJSON(W);
      corpHover = addChoroplethLayer(corpMap, geojson);
      raiseLabels(corpMap);
      addResetViewControl(corpMap, defaultView);
      const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-tip', offset: 12 });

      corpMap.on('mousemove', 'wards-fill', (e) => {
        if (!e.features.length) return;
        const f = e.features[0];
        corpHover.setHovered(f.id);
        if (activeWardPopup) return;
        tip.setLngLat(e.lngLat)
          .setHTML(`Ward ${fmt(f.properties.ward_id)} &middot; ${esc(f.properties.name)} &middot; ${esc(f.properties.corporation)}`)
          .addTo(corpMap);
      });
      corpMap.on('mouseleave', 'wards-fill', () => {
        corpHover.clear();
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
