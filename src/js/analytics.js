import { isLocalDev } from './data-loader.js';

// Central analytics utility. Three things live here:
//  - initAnalytics(): a generic delegated click listener (safety net for
//    anything not given its own explicit event below — header/footer nav,
//    methodology page, FAQ chips, etc).
//  - trackEvent(): the single push choke point every explicit named event
//    (ward_selected, ward_search, share_whatsapp, ...) goes through.
//  - wardAnalyticsAttrs(): the standard ward_number/ward_name/corporation/
//    zone_name/assembly_constituency block, reused everywhere a ward object
//    is already in scope so call sites never repeat a W[uid] lookup.

const PAGE_TYPE_MAP = {
  home: 'home',
  ward: 'ward_detail',
  methodology: 'methodology',
  'voter-faq': 'voter_faq',
};

// Defensive backstop: a param carrying one of these keys never reaches
// dataLayer, regardless of what a call site passes in. Raw lat/lng is never
// intentionally sent by this codebase, but this is the last line of defence
// if a future call site accidentally includes one.
const PII_KEY_BLOCKLIST = new Set([
  'lat', 'lng', 'latitude', 'longitude', 'coords', 'coordinates',
  'email', 'phone', 'name', 'voter_id', 'epic', 'address',
]);

// Elements that fire their own explicit trackEvent() call elsewhere in the
// codebase — excluded from the generic delegator below so one user click
// never produces both a clean named event and a raw cta_click for it.
const EXPLICITLY_TRACKED_SELECTORS = [
  '#wardWhatsappBtn', '#wardCopyLinkBtn', '.feedback-band a', '.ward-row',
  '.ward-suggest-row', '.legend-btn', '.amrow.is-clickable', '.am-benchmark-more',
  '#bufferToggle', '#wardMapReset', '.map-reset-btn', '.corp-filter-pill',
  '#findLocate', '.ward-popup-btn', '.accordion-trigger', '.faq-topic-tile',
  '.cat-nav button', '.faq-sidebar-nav button',
];

let getCurrentViewRef = null;

// Deliberately does NOT call preventDefault/stopPropagation so it can't
// break any existing click handler (ward-row, ward-suggest-row, amrow, etc).
//
// NOT covered here (by design): MapLibre GL canvas clicks (ward polygons,
// amenity dots) are resolved by MapLibre's own hit-testing, not real DOM
// clicks — those are tracked separately as map_interaction events, wired
// directly into the existing map.on('click', layerId, ...) handlers in
// home-view.js and ward-view.js.
function describeTarget(el) {
  const clickable = el.closest(
    'a, button, [role="button"], input[type="checkbox"], .ward-row, .ward-suggest-row, .amrow.is-clickable'
  );
  if (!clickable) return null;
  if (clickable.matches(EXPLICITLY_TRACKED_SELECTORS.join(','))) return null;

  return {
    element_type: clickable.tagName.toLowerCase(),
    element_id: clickable.id || null,
    element_class: clickable.className || null,
    element_text: (clickable.textContent || '').trim().slice(0, 100) || null,
    element_href: clickable.getAttribute('href') || null,
    ward_uid: clickable.dataset.uid || null,
  };
}

export function initAnalytics({ getCurrentView }) {
  window.dataLayer = window.dataLayer || [];
  getCurrentViewRef = getCurrentView || null;

  document.addEventListener('click', (e) => {
    const detail = describeTarget(e.target);
    if (!detail) return;

    window.dataLayer.push({
      event: 'cta_click',
      ...detail,
      current_view: getCurrentView ? getCurrentView() : null,
    });
  }, { capture: false, passive: true }); // observation only
}

// Single push choke point for every explicit, human-readable event. Strips
// empty params, blocks PII-shaped keys, and auto-attaches page_type so call
// sites never repeat it.
export function trackEvent(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];

  const clean = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (PII_KEY_BLOCKLIST.has(key)) {
      if (isLocalDev()) console.error(`analytics: dropped PII-shaped param "${key}" from event "${eventName}"`);
      continue;
    }
    clean[key] = value;
  }

  const view = getCurrentViewRef ? getCurrentViewRef() : null;
  const pageType = view ? (PAGE_TYPE_MAP[view] || view) : null;

  window.dataLayer.push({ event: eventName, page_type: pageType, ...clean });
}

export function wardAnalyticsAttrs(w) {
  if (!w) return {};
  return {
    ward_number: w.ward_id,
    ward_name: w.ward_name,
    corporation: w.corporation,
    zone_name: w.zone_name,
    assembly_constituency: w.assembly,
  };
}
