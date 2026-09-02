// Generic CTA click tracker — observes clicks, never intercepts them.
// Deliberately does NOT call preventDefault/stopPropagation so it can't
// break any existing click handler (ward-row, ward-suggest-row, amrow, etc).
//
// Selector list confirmed against the real markup in this repo:
//  - a, button, [role="button"]   -> every real <a>/<button> sitewide,
//    including voter-faq-view.js's .accordion-trigger, .faq-topic-tile,
//    .cat-nav / .faq-sidebar-nav buttons, .faq-empty-chip, #faqSearchClear,
//    home-view.js's .corp-filter-pill, #methodologyTeaserBtn, #whyVoteToggle,
//    #findLocate, ward-view.js's .legend-btn, #wardCopyLinkBtn,
//    #wardMapReset, #wheadHomeLink, #wardWhatsappBtn (an <a>), and MapLibre
//    popup buttons (.ward-popup-btn) — popups render real DOM nodes, not
//    canvas, so these are ordinary clicks.
//  - input[type="checkbox"]        -> #bufferToggle (ward map's 800m toggle)
//  - .ward-row, .ward-suggest-row  -> home-view.js's ward list / autosuggest
//    rows (plain <li>, not <a>/<button>) — carry data-uid
//  - .amrow.is-clickable           -> ward-view.js's clickable amenity rows
//    (plain <div>, only the ones wireLayerClicks() actually wires a
//    listener onto — scoped to .is-clickable so non-interactive amrows
//    with zero points aren't logged as clicks)
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
