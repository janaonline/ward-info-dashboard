import {
  createMap, buildWardPolygonsGeoJSON, addWardBoundaryLayer, LAYER, LAYER_ORDER,
  amenityRows, defaultLayer, layerPoints, setActiveAmenityLayer, setWalkBufferLayer,
  setExternalAmenityLayer, setBufferZoneWardsLayer, makeHoverTracker, resizeMap,
  forEachWardCoordinate, raiseLabels, addResetViewControl, distanceMetersToWardBoundary,
} from './maps.js';
import { esc, fmt, fmtTrunc } from './format.js';
import { isLocalDev, normalizeWardName } from './data-loader.js';

let wardMap = null;
let currentLayer = null;
let bufferOn = false;
let dataRef = null;
let benchmarksRef = null;
let activeSecondaryPopup = null;
let activeNeighborWardPopup = null;
let onNavigateHomeRef = null;

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

// ---- icons ----

const RESET_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>';
const EXTERNAL_LINK_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';
const TEMPERATURE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0z"/></svg>';
const INFO_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
const CHEVRON_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
const WHATSAPP_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.4 3.8 3.4.5.2.9.4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"/></svg>';
const COPY_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';

const FEEDBACK_FORM_URL = 'https://forms.office.com/Pages/ResponsePage.aspx?id=durzKFDheUu_0kCRJE6V1UD6pxYgE_lDvC_e0YLsHi9UNk05RFRIUEFaS1U3VkpTMDRYTDMxR1pKSi4u';
const TEMPERATURE_PDF_URL = 'public/data/Temperature_2015_2026.pdf';

// ---- sub-nav ----

const SUBNAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'ward-map', label: 'Ward map', shortLabel: 'Map' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'safety-climate', label: 'Safety & climate' },
  { id: 'ask-candidates', label: 'Ask your candidates' },
  { id: 'feedback', label: 'Feedback' },
];

function renderSubnav() {
  return `
    <nav class="ward-subnav" id="wardSubnav" aria-label="Ward sections">
      <div class="band-inner">
        ${SUBNAV_ITEMS.map((item, i) => `
          <button type="button" class="ward-subnav-btn${i === 0 ? ' active' : ''}" data-target="${item.id}">${esc(item.shortLabel || item.label)}</button>
        `).join('')}
      </div>
    </nav>
  `;
}

let subnavSuppressSpy = false;

function initWardSubnav() {
  const nav = document.getElementById('wardSubnav');
  if (!nav) return;
  const header = document.getElementById('siteHeader');
  const headerHeight = header ? header.offsetHeight : 0;
  nav.style.top = `${headerHeight}px`;

  const buttons = Array.from(nav.querySelectorAll('.ward-subnav-btn'));
  const sections = buttons
    .map(btn => document.getElementById(btn.dataset.target))
    .filter(Boolean);

  // Sticky header + sticky sub-nav both occupy the viewport's top region, so
  // scrollIntoView({block:'start'}) on a target section would otherwise tuck
  // its top underneath them — .category's scroll-margin-top in
  // voter-faq-view.js's .cat-nav solves the identical problem, and this
  // mirrors it exactly, scoped to #wardContainer instead of #voterFaqContainer.
  function updateSubnavClearance() {
    const topOffset = parseFloat(getComputedStyle(nav).top) || 0;
    const clearance = topOffset + nav.getBoundingClientRect().height;
    document.getElementById('wardContainer')?.style.setProperty('--ward-subnav-clearance', `${clearance}px`);
  }
  new ResizeObserver(updateSubnavClearance).observe(nav);
  updateSubnavClearance();

  let activeId = null;
  let followTimer = null;
  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.target === id));
    // Keep the active tab visible/centered in the horizontally scrolling nav
    // (same pattern as voter-faq-view.js's .cat-nav). block:'nearest' matters,
    // not just inline:'center' — overflow-x:auto makes .band-inner's paired
    // overflow-y compute to auto too (per the CSS overflow spec), making it
    // its own nearest scrolling ancestor on both axes, so this can't leak
    // into scrolling the page itself vertically. Debounced (not fired
    // immediately) — mobile browsers commonly ignore/defer a programmatic
    // scroll issued while the user's own touch-scroll gesture is still
    // active, and firing on every rapid scroll-spy transition during a fast
    // scroll would also cancel/restart the animation before it can run;
    // waiting for scrolling to pause briefly avoids both.
    clearTimeout(followTimer);
    followTimer = setTimeout(() => {
      nav.querySelector(`.ward-subnav-btn[data-target="${id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 120);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      subnavSuppressSpy = true;
      setActive(btn.dataset.target);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => { subnavSuppressSpy = false; }, 900);
    });
  });

  const observer = new IntersectionObserver(() => {
    if (subnavSuppressSpy) return;
    const navHeight = nav.offsetHeight;
    const bandTop = headerHeight + navHeight + 4;
    let current = sections[0];
    for (const sec of sections) {
      if (sec.getBoundingClientRect().top - bandTop <= 0) current = sec;
    }
    if (current) setActive(current.id);
  }, { rootMargin: `-${headerHeight + 8}px 0px -70% 0px`, threshold: 0 });

  sections.forEach(sec => observer.observe(sec));
  window.addEventListener('scroll', () => {
    if (subnavSuppressSpy) return;
    const navHeight = nav.offsetHeight;
    const bandTop = headerHeight + navHeight + 4;
    let current = sections[0];
    for (const sec of sections) {
      if (sec.getBoundingClientRect().top - bandTop <= 0) current = sec;
    }
    if (current) setActive(current.id);
  }, { passive: true });
}

// ---- share (relocated from footer.js — see Phase 1/3 of the redesign) ----

function shareHref(uid, wardName) {
  const shareText = encodeURIComponent(`Check out ward info for ${wardName}: `);
  const shareUrl = encodeURIComponent(`${location.origin}${location.pathname}#ward=${uid}`);
  return `https://wa.me/?text=${shareText}${shareUrl}`;
}

function copyUrl(uid) {
  return `${location.origin}${location.pathname}#ward=${uid}`;
}

function wireShareButtons(uid, wardName) {
  const copyBtn = document.getElementById('wardCopyLinkBtn');
  if (copyBtn) {
    const label = copyBtn.querySelector('.btn-label');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(copyUrl(uid)).then(() => {
        label.textContent = 'Copied!';
        setTimeout(() => { label.textContent = 'Copy link'; }, 1500);
      });
    });
  }
}

// ---- render pieces ----

function oldWardsText(w) {
  if (!w.old_wards || !w.old_wards.length) return null;
  return w.old_wards;
}

function neighbourhoodsText(w) {
  if (!w.neighbourhoods || !w.neighbourhoods.length) return 'Not available';
  return w.neighbourhoods.map(esc).join(', ');
}

function demographicsParts(w) {
  const parts = [];
  if (w.pop != null) parts.push({ label: 'Total population', value: fmt(w.pop) });
  if (w.male != null) parts.push({ label: 'Male', value: fmt(w.male) });
  if (w.female != null) parts.push({ label: 'Female', value: fmt(w.female) });
  return parts;
}

function badgesHtml(w) {
  const badges = [`Corporation: ${esc(w.corporation)}`];
  if (!isBlank(w.zone_name)) badges.push(`Zone: ${esc(w.zone_name)}`);
  if (w.assembly) badges.push(`Assembly: ${esc(w.assembly)}`);
  if (!isBlank(w.reservation)) badges.push(`Reservation: ${esc(w.reservation)}`);
  return badges.map(b => `<span class="pill pill--outline-dark">${b}</span>`).join('');
}

function renderHead(uid, w) {
  const demoParts = demographicsParts(w);
  if (!demoParts.length && isLocalDev()) {
    console.warn(`[demographics] No population data for ward "${w.ward_name}" (${w.uid})`);
  }
  return `
    <div class="whead">
      <div class="band-inner">
        <p class="whead-breadcrumb">
          <a href="#" id="wheadHomeLink">Home</a> &rsaquo; ${esc(w.corporation)} &rsaquo; <span>${esc(w.ward_name)}</span>
        </p>
        <div class="whead-top">
          <div>
            <h2>${esc(w.ward_name)}${w.ward_name_kn ? ` <span class="kn">${esc(w.ward_name_kn)}</span>` : ''}</h2>
            <div class="whead-badges">
              <span class="pill pill--fill-yellow">Ward ${fmt(w.ward_id)}</span>
              ${badgesHtml(w)}
            </div>
          </div>
          <div class="whead-share">
            <a class="btn btn-whatsapp btn-sm" id="wardWhatsappBtn" target="_blank" rel="noopener" href="${esc(shareHref(uid, w.ward_name))}"><span aria-hidden="true">${WHATSAPP_ICON}</span>Share on WhatsApp</a>
            <button class="btn btn-secondary btn-sm" id="wardCopyLinkBtn" type="button"><span aria-hidden="true">${COPY_ICON}</span><span class="btn-label">Copy link</span></button>
          </div>
        </div>
        <div class="whead-stats hero-stats">
          ${demoParts.map(p => `<div class="hero-stat"><span class="hero-stat-num">${p.value}</span><span class="hero-stat-label">${esc(p.label)}</span></div>`).join('')}
          <div class="hero-stat hero-stat--highlight"><span class="hero-stat-num">${fmt(w.polling ?? 0)}</span><span class="hero-stat-label">Polling booths</span></div>
        </div>
      </div>
    </div>
  `;
}

function renderOverview(w) {
  const oldWards = oldWardsText(w);
  return `
    <section class="sec" id="overview">
      <div class="band-inner">
        <span class="eyebrow eyebrow--red">Overview</span>
        <h3>How this ward came to be.</h3>
        <div class="whead-origin-block">
          <span class="label">Formed from old wards</span>
          ${oldWards ? `
            <div class="oldwards-list">
              ${oldWards.map(o => `
                <div class="oldward-row">
                  <span class="oldward-name">${esc(o.name)}</span>
                  <span class="oldward-track"><span class="oldward-fill" style="width:${o.pct != null ? Math.max(0, Math.min(100, Number(o.pct))) : 0}%"></span></span>
                  <span class="oldward-pct">${o.pct != null ? `${o.pct}%` : ''}</span>
                </div>
              `).join('')}
            </div>
          ` : `<p>Not available</p>`}
        </div>
        <div class="whead-origin-block">
          <span class="label">Key areas</span>
          <div class="key-areas-pills">
            ${w.neighbourhoods && w.neighbourhoods.length
              ? w.neighbourhoods.map(n => `<span class="pill pill--band">${esc(n)}</span>`).join('')
              : `<p>${neighbourhoodsText(w)}</p>`}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderCandidates(w) {
  return `
    <section class="sec sec--tint" id="candidates">
      <div class="band-inner">
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
      </div>
    </section>
  `;
}

// Static badge labels for amenityRows() keys whose benchmarks_for_WID.csv entry
// has no numeric `benchmark` (so no recommended-count progress bar can be
// computed) — keyed by `key`, not the CSV's Amenity text, so this never depends
// on string matching.
const BENCHMARK_BADGES = {
  bus: { label: 'Network standard' },
  metro: { label: 'Network standard' },
  lake: { label: 'Geography based' },
  pond: { label: 'Geography based' },
};
const DEFAULT_BENCHMARK_BADGE = { label: 'No fixed benchmark' };

// Badge category -> accent tone (see .am-benchmark-badge--* in components.css).
// Only Network standard/Geography based are reachable with today's CSV data;
// the rest are defined so a future badge-eligible amenity using one of these
// category labels gets the right color automatically, no code change needed.
const BADGE_TONES = {
  'Network standard': 'blue',
  'Accessibility based': 'teal',
  'Coverage based': 'indigo',
  'Geography based': 'cyan',
  'Planning based': 'gray',
  'Activity based': 'orange',
  'Environmental': 'green',
};
const DEFAULT_BADGE_TONE = 'gray';

// Progress-bar fill tone by percent-of-recommended (pct is already clamped to
// [0, 100] by benchmarkFor — every ratio >=100% collapses to exactly 100,
// which still correctly satisfies ">= 100" here, so no separate unclamped
// ratio is needed just to classify the "Excellent" tier).
function progressTone(pct) {
  if (pct >= 100) return 'green';
  if (pct >= 75) return 'light-green';
  if (pct >= 40) return 'orange';
  return 'red';
}

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
    <section class="sec" id="ward-map">
      <div class="band-inner">
        <span class="eyebrow eyebrow--red">Ward map</span>
        <h3>Everything within a 15-minute walk.</h3>
        <p class="sec-sub">Toggle the 800m walk reach to see how much of ${esc(w.ward_name)} is actually served by each amenity type.</p>
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
      </div>
    </section>
  `;
}

// Looks up label's benchmark entry (blank/no-match returns null so the row
// renders exactly as it did before this feature existed) and turns it into a
// progress-bar payload (numeric benchmark + known ward population), a badge
// payload (no numeric benchmark), or a text-only payload (numeric benchmark
// but population unavailable — not reachable with current data, since every
// ward has a population, but kept as a safe no-crash fallback).
function benchmarkFor(key, label, count, w) {
  const entry = benchmarksRef && benchmarksRef[normalizeWardName(label)];
  if (!entry) return null;

  const hasBenchmark = entry.benchmark != null && Number.isFinite(Number(entry.benchmark)) && Number(entry.benchmark) > 0;
  const hasPop = w.pop != null && Number.isFinite(Number(w.pop)) && Number(w.pop) > 0;
  const text = isBlank(entry.text) ? null : esc(entry.text);

  if (hasBenchmark && hasPop) {
    const recommended = Math.ceil(Number(w.pop) / Number(entry.benchmark));
    const pct = recommended > 0 ? Math.max(0, Math.min(100, ((count || 0) / recommended) * 100)) : 0;
    const roundedPct = Math.round(pct);
    return { kind: 'bar', pct: roundedPct, tone: progressTone(roundedPct), count: count || 0, recommended, text };
  }
  if (!hasBenchmark) {
    const badge = BENCHMARK_BADGES[key] || DEFAULT_BENCHMARK_BADGE;
    const tone = BADGE_TONES[badge.label] || DEFAULT_BADGE_TONE;
    return { kind: 'badge', badgeLabel: badge.label, tone, text };
  }
  return text ? { kind: 'text', text } : null;
}

function renderBenchmarkBlock(key, label, count, w) {
  const b = benchmarkFor(key, label, count, w);
  if (!b) return '';
  if (b.kind === 'bar') {
    return `
      <div class="am-benchmark">
        <div class="am-benchmark-bar">
          <span class="am-benchmark-track" aria-hidden="true"><span class="am-benchmark-fill am-benchmark-fill--${b.tone}" style="width:${b.pct}%"></span></span>
          <span class="am-benchmark-ratio">${fmt(b.count)} / ${fmt(b.recommended)} recommended</span>
        </div>
        ${b.text ? `<p class="am-benchmark-desc">${b.text}</p>` : ''}
      </div>
    `;
  }
  if (b.kind === 'badge') {
    return `
      <div class="am-benchmark">
        <span class="am-benchmark-badge am-benchmark-badge--${b.tone}">${esc(b.badgeLabel)}</span>
        ${b.text ? `<p class="am-benchmark-desc">${b.text}</p>` : ''}
      </div>
    `;
  }
  return `<div class="am-benchmark"><p class="am-benchmark-desc">${b.text}</p></div>`;
}

function renderAmenities(uid, W, w) {
  const rows = amenityRows(uid, W, w).filter(([key]) => !VULNERABILITY_KEYS.includes(key));
  const cardHtml = ([key, label, count]) => {
    const b = benchmarkFor(key, label, count, w);
    const tone = b ? b.tone : null;
    return `
      <div class="amrow amcard${tone ? ` amcard--${tone}` : ''}" data-layer="${key}">
        <span class="am-icon" aria-hidden="true">${LAYER[key].icon}</span>
        <span class="am-label">${esc(label)}</span>
        <span class="cnt">${fmt(count || 0)}</span>
        ${renderBenchmarkBlock(key, label, count, w)}
      </div>
    `;
  };
  return `
    <section class="sec" id="amenities">
      <div class="band-inner">
        <span class="eyebrow eyebrow--red">Amenities</span>
        <h3>What&rsquo;s actually here &mdash; and what isn&rsquo;t.</h3>
        <p class="sec-sub">Counts measured against URDPFI-based benchmarks for a ward this size.</p>
        <div class="amenities-legend">
          <span><span class="legend-dot legend-dot--green"></span>Benchmark met</span>
          <span><span class="legend-dot legend-dot--red"></span>Under-served</span>
          <span><span class="legend-dot legend-dot--blue"></span>Geography based</span>
        </div>
        <div class="amgrid amgrid-benchmarks">
          ${rows.map(cardHtml).join('')}
        </div>
      </div>
    </section>
  `;
}

// Ward-level temperature is informational only (sourced from temperature.geojson,
// joined by ward_name once at load time in data-loader.js) — unlike the flood rows
// above, it never toggles the Ward Map, so it's rendered outside wireLayerClicks'
// `.amrow` click-wiring entirely (see renderTemperatureRow). The row always renders,
// even when a ward has no temperature data (shows "N/A"), so the info icon/PDF link
// stays visible and functional for every ward.
function temperatureText(w) {
  if (!w.temperature) return { current: null, deltaText: null }; // join miss already warned in data-loader.js
  const current = Number(w.temperature.lst_2026);
  const delta = Number(w.temperature.delta_lst);
  if (!Number.isFinite(current) || !Number.isFinite(delta)) {
    if (isLocalDev()) {
      console.warn(`[temperature] Missing lst_2026/delta_lst for ward "${w.ward_name}" (${w.uid})`);
    }
    return { current: null, deltaText: null };
  }
  const deltaAbs = Math.abs(delta);
  const deltaText = delta > 0 ? `Increased by ${fmtTrunc(deltaAbs, 1)}&deg;C since 2015`
    : delta < 0 ? `Decreased by ${fmtTrunc(deltaAbs, 1)}&deg;C since 2015`
    : 'No change since 2015';
  return { current: fmtTrunc(current, 1), deltaText, delta };
}

function renderTemperatureCard(w) {
  const t = temperatureText(w);
  const tone = t.current == null ? '' : (t.delta > 0 ? 'amcard--red' : 'amcard--green');
  return `
    <div class="temp-card ${tone}">
      <span class="am-icon" aria-hidden="true">${TEMPERATURE_ICON}</span>
      <span class="temp-card-text">
        ${t.current == null ? 'N/A' : `${t.current}&deg;C <span class="temp-card-delta">${t.deltaText}</span>`}
      </span>
      <a class="temp-info-link" href="${TEMPERATURE_PDF_URL}" target="_blank" rel="noopener" title="About this temperature data" aria-label="About this temperature data (opens PDF in a new tab)">${INFO_ICON}</a>
    </div>
  `;
}

function renderSafetyClimate(uid, W, w) {
  const rows = amenityRows(uid, W, w).filter(([key]) => VULNERABILITY_KEYS.includes(key));
  return `
    <section class="sec safety-climate-wrap" id="safety-climate">
      <div class="band-inner">
        <div class="safety-card sec--dark">
          <span class="eyebrow eyebrow--dark">Safety &amp; climate</span>
          <h3>Vulnerability hotspots.</h3>
          <div class="amgrid">
            ${rows.map(([key, label, count]) => `
              <div class="amrow" data-layer="${key}">
                <span class="am-icon" aria-hidden="true">${LAYER[key].icon}</span>
                <span class="am-label">${esc(label)}</span>
                <span class="cnt">${fmt(count || 0)}</span>
              </div>
            `).join('')}
          </div>
          ${renderTemperatureCard(w)}
        </div>
        <div class="sahaaya-card sec--dark">
          <span class="eyebrow eyebrow--dark">BBMP Sahaaya</span>
          <h3>What neighbours complain about most.</h3>
          <p class="sec-sub">Most-reported civic complaints in this ward</p>
          <ol class="sahaaya-ranked">
            <li><span class="sahaaya-rank">01</span><span class="sahaaya-name">Roads &amp; potholes</span><span class="sahaaya-bar"><span class="sahaaya-bar-fill--yellow" style="width:100%"></span></span></li>
            <li><span class="sahaaya-rank">02</span><span class="sahaaya-name">Garbage &amp; sanitation</span><span class="sahaaya-bar"><span class="sahaaya-bar-fill--light-green" style="width:70%"></span></span></li>
            <li><span class="sahaaya-rank">03</span><span class="sahaaya-name">Water, drains &amp; flooding</span><span class="sahaaya-bar"><span class="sahaaya-bar-fill--blue" style="width:45%"></span></span></li>
          </ol>
        </div>
      </div>
    </section>
  `;
}

function renderFacts(w) {
  const facts = buildFacts(w);
  if (!facts.length) return '';
  return `
    <section class="sec facts-band">
      <div class="band-inner">
        <span class="eyebrow eyebrow--dark">Did you know?</span>
        <h3>Three numbers worth remembering.</h3>
        <div class="factslist">
          ${facts.map(f => `<div class="fact">${esc(f)}</div>`).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderAskCandidates(w) {
  const questions = suggestedQuestions(w);
  return `
    <section class="sec" id="ask-candidates">
      <div class="band-inner">
        <span class="eyebrow eyebrow--red">Ask your candidates</span>
        <h3>Five questions this ward&rsquo;s data suggests.</h3>
        <p class="sec-sub">Generated from the gaps above.</p>
        <ol class="qlist qlist--numbered">${questions.map((q, i) => `<li><span class="q-num">${String(i + 1).padStart(2, '0')}</span><span>${esc(q)}</span></li>`).join('')}</ol>
      </div>
    </section>
  `;
}

function renderFeedback() {
  return `
    <section class="sec feedback-band" id="feedback">
      <div class="band-inner feedback-inner">
        <div>
          <span class="eyebrow eyebrow--red">Feedback</span>
          <h3>Spotted something wrong? Let us know.</h3>
          <p class="cand-intro">Help us improve ward-level information by reporting missing details, incorrect information, or civic issues you've observed.</p>
        </div>
        <div class="feedback-actions">
          <a class="btn btn-primary" href="${FEEDBACK_FORM_URL}" target="_blank" rel="noopener" aria-label="Submit feedback about this ward (opens in a new tab)">Submit feedback<span aria-hidden="true">${EXTERNAL_LINK_ICON}</span></a>
        </div>
      </div>
    </section>
  `;
}

// ---- map wiring ----

function closeSecondaryPopup() {
  if (activeSecondaryPopup) { activeSecondaryPopup.remove(); activeSecondaryPopup = null; }
}

function closeNeighborWardPopup() {
  if (activeNeighborWardPopup) { activeNeighborWardPopup.remove(); activeNeighborWardPopup = null; }
}

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
  const external = setExternalAmenityLayer(wardMap, type, uid, W);
  setBufferZoneWardsLayer(wardMap, external.wardUids, W);
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

// -webkit-line-clamp is purely visual truncation — the paragraph's textContent
// already holds the full benchmark_text regardless of clipping, so "expanding"
// is just a CSS class toggle, no text-swapping needed. Only adds a toggle for
// descriptions that are actually clamped (scrollHeight > clientHeight); a
// short one-line description gets no control at all.
function wireBenchmarkToggles() {
  document.querySelectorAll('.am-benchmark-desc').forEach((el, i) => {
    if (el.scrollHeight <= el.clientHeight + 1) return;
    el.id = el.id || `am-benchmark-desc-${i}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'am-benchmark-more';
    btn.textContent = 'Read more';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', el.id);
    btn.addEventListener('click', (e) => {
      // Prevents bubbling into the parent .amrow's map-layer-switch click handler
      // (wireLayerClicks), which would otherwise also fire on this click.
      e.stopPropagation();
      const expanded = el.classList.toggle('am-benchmark-desc--expanded');
      btn.textContent = expanded ? 'Show less' : 'Read more';
      btn.setAttribute('aria-expanded', String(expanded));
    });
    // Appended as a child (not a sibling) so CSS can absolutely position it at
    // this paragraph's own bottom-right corner (.am-benchmark-more), landing
    // at the end of line 2 instead of adding a line of its own underneath.
    el.appendChild(btn);
  });
}

function wireLayerClicks(uid, W) {
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.addEventListener('click', () => setLayer(uid, W, btn.dataset.layer));
  });
  document.querySelectorAll('.amrow').forEach(row => {
    if (layerPoints(uid, row.dataset.layer, W).length > 0) {
      row.classList.add('is-clickable');
      row.addEventListener('click', () => {
        setLayer(uid, W, row.dataset.layer);
        document.getElementById('ward-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
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

export function initWardView({ W, benchmarks }) {
  dataRef = W;
  benchmarksRef = benchmarks || {};
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSecondaryPopup(); closeNeighborWardPopup(); }
  });
}

export function openWard(uid, { onOpenWard, onNavigateHome } = {}) {
  const W = dataRef;
  const w = W[uid];
  onNavigateHomeRef = onNavigateHome;
  currentLayer = defaultLayer(uid, W);
  bufferOn = false;
  activeSecondaryPopup = null;
  activeNeighborWardPopup = null;

  const container = document.getElementById('wardContainer');
  container.innerHTML = `
    ${renderHead(uid, w)}
    ${renderSubnav()}
    ${renderOverview(w)}
    ${renderCandidates(w)}
    ${renderWardMap(uid, W, w)}
    ${renderAmenities(uid, W, w)}
    ${renderFacts(w)}
    ${renderSafetyClimate(uid, W, w)}
    ${renderAskCandidates(w)}
    ${renderFeedback()}
  `;

  initWardSubnav();
  wireShareButtons(uid, w.ward_name);
  const homeLink = document.getElementById('wheadHomeLink');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (onNavigateHomeRef) onNavigateHomeRef();
    });
  }

  // Deferred until web fonts finish loading: measuring scrollHeight/clientHeight
  // immediately after innerHTML would race the Manrope/PT Sans <link> fonts —
  // text still on the fallback font can measure as fitting within 2 lines, then
  // silently overflow once the real font swaps in, permanently under-detecting
  // which descriptions actually need a "Read more" toggle. document.fonts.ready
  // resolves immediately (next microtask) once fonts are already cached, so this
  // adds no perceptible delay on repeat ward navigations.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(wireBenchmarkToggles);
  } else {
    wireBenchmarkToggles();
  }

  if (wardMap) {
    wardMap.remove();
    wardMap = null;
  }
  wardMap = createMap('wardMap', { center: [77.5946, 12.9716], zoom: 13.5 });
  wardMap.on('load', () => {
    const geojson = buildWardPolygonsGeoJSON(W, { filterUids: [uid] });
    addWardBoundaryLayer(wardMap, geojson);

    const bounds = new maplibregl.LngLatBounds();
    let boundCount = 0;
    forEachWardCoordinate(w, (pt) => {
      bounds.extend(pt);
      boundCount++;
    });
    if (boundCount) wardMap.fitBounds(bounds, { padding: 40, duration: 0 });
    const defaultView = {
      center: wardMap.getCenter(),
      zoom: wardMap.getZoom(),
      bearing: wardMap.getBearing(),
      pitch: wardMap.getPitch(),
    };

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

      const secondaryTip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-tip', offset: 12 });
      wardMap.on('mousemove', 'amenity-points-secondary-circle', (e) => {
        if (!e.features.length || activeSecondaryPopup) return;
        if (wardMap.queryRenderedFeatures(e.point, { layers: ['amenity-points-circle'] }).length) return;
        const { name, num } = e.features[0].properties;
        if (!name) { secondaryTip.remove(); return; }
        const html = num ? `${esc(name)} &middot; Booth ${esc(num)}` : esc(name);
        secondaryTip.setLngLat(e.lngLat).setHTML(html).addTo(wardMap);
      });
      wardMap.on('mouseleave', 'amenity-points-secondary-circle', () => secondaryTip.remove());

      wardMap.on('click', 'amenity-points-secondary-circle', (e) => {
        if (!e.features.length) return;
        const { name, num } = e.features[0].properties;
        if (!name) return;

        // --- analytics: map interaction (canvas click, not a DOM click —
        // analytics.js's generic delegation listener can't see this) ---
        window.dataLayer?.push({
          event: 'map_interaction',
          map_context: 'ward-detail',
          interaction_type: 'amenity_marker_click',
          ward_uid: uid || null,
        });

        closeSecondaryPopup();
        secondaryTip.remove();
        const html = num ? `${esc(name)} &middot; Booth ${esc(num)}` : esc(name);
        activeSecondaryPopup = new maplibregl.Popup({ closeButton: false, className: 'map-tip', offset: 12 })
          .setLngLat(e.lngLat).setHTML(html).addTo(wardMap);
        activeSecondaryPopup.on('close', () => { activeSecondaryPopup = null; });
      });

      const neighborTip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-tip', offset: 12 });
      const neighborHover = makeHoverTracker(wardMap, 'buffer-zone-wards');

      wardMap.on('mousemove', 'buffer-zone-wards-fill', (e) => {
        if (!e.features.length) return;
        if (wardMap.queryRenderedFeatures(e.point, { layers: ['amenity-points-secondary-circle'] }).length) {
          neighborHover.clear();
          neighborTip.remove();
          return;
        }
        // The rendered polygon is the qualifying ward's whole shape, but only the portion
        // actually within 1.6km of the current ward's boundary should react to hover/click —
        // a large neighboring ward can extend far beyond the buffer zone that made it qualify.
        if (distanceMetersToWardBoundary(e.lngLat.lng, e.lngLat.lat, uid, W) > 1600) {
          neighborHover.clear();
          neighborTip.remove();
          return;
        }
        const f = e.features[0];
        neighborHover.setHovered(f.id);
        if (activeNeighborWardPopup) return;
        neighborTip.setLngLat(e.lngLat)
          .setHTML(`Ward ${fmt(f.properties.ward_id)} &middot; ${esc(f.properties.name)}`)
          .addTo(wardMap);
      });
      wardMap.on('mouseleave', 'buffer-zone-wards-fill', () => {
        neighborHover.clear();
        neighborTip.remove();
      });

      wardMap.on('click', 'buffer-zone-wards-fill', (e) => {
        if (!e.features.length) return;
        if (wardMap.queryRenderedFeatures(e.point, { layers: ['amenity-points-secondary-circle'] }).length) return;
        if (distanceMetersToWardBoundary(e.lngLat.lng, e.lngLat.lat, uid, W) > 1600) return;
        const f = e.features[0];
        const targetUid = f.properties.uid;
        const targetName = f.properties.name;

        // --- analytics: map interaction (canvas click, not a DOM click —
        // analytics.js's generic delegation listener can't see this) ---
        window.dataLayer?.push({
          event: 'map_interaction',
          map_context: 'ward-detail',
          interaction_type: 'neighbor_ward_popup',
          ward_uid: targetUid || null,
        });

        closeNeighborWardPopup();
        neighborTip.remove();
        const popup = new maplibregl.Popup({ closeButton: false, className: 'ward-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="ward-popup-body">
              <div class="ward-popup-name">Ward: ${esc(targetName)}</div>
              <button type="button" class="btn btn-primary btn-sm ward-popup-btn" aria-label="View ward info for ${esc(targetName)}">View this ward</button>
            </div>
          `)
          .addTo(wardMap);
        popup.getElement().querySelector('.ward-popup-body').addEventListener('click', () => {
          closeNeighborWardPopup();
          onOpenWard(targetUid);
        });
        popup.on('close', () => { if (activeNeighborWardPopup === popup) activeNeighborWardPopup = null; });
        activeNeighborWardPopup = popup;
      });
    }
    wireLayerClicks(uid, W);
    raiseLabels(wardMap);
    addResetViewControl(wardMap, defaultView);
  });
}

export function resizeWardMap() {
  resizeMap(wardMap);
}

export { buildFacts, suggestedQuestions };
