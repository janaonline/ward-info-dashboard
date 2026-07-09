import { createMap, buildWardPolygonsGeoJSON, addChoroplethLayer, CORP_COLORS, wardAt, resizeMap } from './maps.js';
import { fmt } from './format.js';

let corpMap = null;

export function initHomeView({ W, meta }, { onFindWard, onOpenWard }) {
  const container = document.getElementById('homeContainer');

  container.innerHTML = `
    <div class="cover">
      <div class="eyebrow"><span class="eyebrow-dot"></span> ${fmt(meta.n_wards)} wards &middot; Bengaluru</div>
      <h1 class="headline">Know <mark>your ward</mark> before you vote.</h1>
      <p class="sub">Amenities, coverage gaps, and your corporator &mdash; for every one of Bengaluru's ${fmt(meta.n_wards)} wards, in one place.</p>
      <div class="cta-row">
        <button id="ctaLocate" class="btn btn-primary" type="button">Use my location</button>
        <button id="ctaFind" class="btn btn-secondary" type="button">Find my ward</button>
      </div>
      <div id="homeCorpMap" class="map map-corp" aria-label="Map of Bengaluru's civic corporations"></div>
      <div class="corp-legend">
        ${Object.entries(CORP_COLORS).map(([name, color]) => `
          <span class="legend-chip"><span class="chip-dot" style="background:${color}"></span>${name}</span>
        `).join('')}
      </div>
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

  document.getElementById('ctaFind').addEventListener('click', () => onFindWard());

  document.getElementById('ctaLocate').addEventListener('click', () => {
    if (!navigator.geolocation) { onFindWard(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uid = wardAt(pos.coords.longitude, pos.coords.latitude, W);
        if (uid) onOpenWard(uid); else onFindWard();
      },
      () => onFindWard(),
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
