import { FEEDBACK_FORM_URL } from './constants.js';

const EXTERNAL_LINK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';

const STEP_ARROW_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const SOURCES = [
  { name: 'KGIS', desc: 'Karnataka Geographic Information System', url: 'https://kgis.karnataka.gov.in/' },
  { name: 'KSRSAC', desc: 'Karnataka State Remote Sensing Applications Centre', url: 'https://ksrsac.karnataka.gov.in/' },
  { name: 'OpenCity', desc: 'KGIS ArcGIS REST server explainer', url: 'https://opencity.in/how-to-access-government-gis-data-for-indian-cities-states/' },
  { name: 'QGIS', desc: 'Layer loading & download workflow', url: 'https://qgis.org/' },
];

export function initMethodologyView({ meta }) {
  const container = document.getElementById('methodologyContainer');

  container.innerHTML = `
    <section id="methHero">
      <div class="band-inner meth-hero">
        <div>
          <p class="whead-breadcrumb">Home <span aria-hidden="true">&rsaquo;</span> <span>Methodology</span></p>
          <span class="eyebrow eyebrow--red">Methodology</span>
          <h2 class="section-title">Where every number here comes from.</h2>
          <p class="sec-sub">How ward-level civic infrastructure data for all 369 Greater Bengaluru Authority wards is sourced, computed and reported on this dashboard.</p>
        </div>
        <div class="meth-statcard">
          <div class="meth-stat-hero"><span class="hero-stat-num">369</span><span class="hero-stat-label">wards covered</span></div>
          <div class="meth-stat-row"><span>800m</span><span class="meth-stat-row-label">walking buffer per amenity</span></div>
          <div class="meth-stat-row"><span>1.6km</span><span class="meth-stat-row-label">collection radius per ward</span></div>
        </div>
      </div>
    </section>

    <section id="methAiNote">
      <div class="band-inner callout">
        <span class="callout-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="7.5" x2="12" y2="7.5"/></svg></span>
        <p><strong>Note:</strong> Artificial Intelligence tools were used to scale up the GIS workflow across all 369 wards. While this enables broad, consistent coverage of all wards, it may introduce errors, and we welcome corrections.</p>
      </div>
    </section>

    <section class="sec" id="methStep1">
      <div class="band-inner meth-step-inner">
        <div class="meth-step-badge">
          <span class="meth-step-num">1</span>
          <span class="meth-step-label">Step One</span>
        </div>
        <div class="meth-step-content">
          <h3>1. Finding the data:</h3>
          <ul class="meth-list">
            <li>Much of Bengaluru's open civic data resides in the Karnataka Geographic Information System (KGIS), the state's public spatial-data platform run by the Karnataka State Remote Sensing Applications Centre (KSRSAC).</li>
            <li><a href="https://opencity.in/how-to-access-government-gis-data-for-indian-cities-states/" target="_blank" rel="noopener">OpenCity's explainer on the KGIS ArcGIS REST servers guided our approach</a>, as it lists the server URLs and sets out how to load and download the layers using a tool such as QGIS.</li>
            <li>From the layers available, we focused on the amenities most relevant to everyday life - bus stops, parks, schools, anganwadis, public toilets and lakes, among others.</li>
          </ul>
          <div class="meth-pills">
            <span class="pill">Bus stops</span><span class="pill">Parks</span><span class="pill">Schools</span><span class="pill">Anganwadis</span><span class="pill">Public toilets</span><span class="pill">Lakes</span>
          </div>
        </div>
      </div>
    </section>

    <section class="sec sec--sage" id="methStep2">
      <div class="band-inner meth-step-inner">
        <div class="meth-step-badge">
          <span class="meth-step-num">2</span>
          <span class="meth-step-label">Step Two</span>
        </div>
        <div class="meth-step-content">
          <h3>2. Turning it into ward-level numbers:</h3>
          <ul class="meth-list">
            <li>For most of the 369 wards, a script gathers every amenity within 1.6 km of the ward boundary, so that facilities just outside a ward still count for residents living near its edge.</li>
            <li>An 800 m walking buffer (approximately a 15-minute walk) is then drawn around each amenity, and we measure the share of the ward's area that falls within those buffers.</li>
            <li>This share is reported on the dashboard as the portion of a ward "within a 15-minute walk" of an amenity.</li>
          </ul>
          <div class="meth-mini-stats">
            <div class="mini-stat"><span class="mini-stat-k">Collect</span><span class="mini-stat-v">1.6&nbsp;km</span><span class="mini-stat-d">Every amenity within 1.6&nbsp;km of the ward boundary.</span></div>
            <span class="meth-stat-arrow" aria-hidden="true">${STEP_ARROW_ICON}</span>
            <div class="mini-stat"><span class="mini-stat-k">Buffer</span><span class="mini-stat-v">800&nbsp;m</span><span class="mini-stat-d">A walking buffer, about 15 minutes, drawn around each one.</span></div>
            <span class="meth-stat-arrow" aria-hidden="true">${STEP_ARROW_ICON}</span>
            <div class="mini-stat mini-stat--dark"><span class="mini-stat-k">Report</span><span class="mini-stat-v">% of ward</span><span class="mini-stat-d">The share of the ward within a 15-minute walk of that amenity.</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="sec sec--dark" id="methStep3">
      <div class="band-inner meth-step-inner">
        <div class="meth-step-badge">
          <span class="meth-step-num">3</span>
          <span class="meth-step-label">Step Three</span>
        </div>
        <div class="meth-step-content">
          <h3>3. Scope and next steps.</h3>
          <ul class="meth-list">
            <li>This is the first version, focused on physical, everyday infrastructure. The same method extends readily to environmental data, stormwater drains, lakes, air quality and noise, among others, which we intend to build on in future iterations.</li>
            <li>'Coming soon' placeholders flag data we plan to add as it becomes available.</li>
          </ul>
          <div class="meth-pills">
            <span class="pill pill--outline-dark">Stormwater drains &middot; coming soon</span>
            <span class="pill pill--outline-dark">Air quality &middot; coming soon</span>
            <span class="pill pill--outline-dark">Noise &middot; coming soon</span>
          </div>
        </div>
      </div>
    </section>

    <section class="sec" id="methSources">
      <div class="band-inner">
        <span class="eyebrow eyebrow--red">Sources</span>
        <h3>Check our work.</h3>
        <p class="sec-sub">Every layer we use is publicly accessible.</p>
        <div class="sources-grid">
          ${SOURCES.map((s, i) => `
            <a class="source-card" href="${s.url}" target="_blank" rel="noopener">
              <span class="source-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="source-name">${s.name}<span aria-hidden="true">${EXTERNAL_LINK_ICON}</span></span>
              <span class="source-desc">${s.desc}</span>
            </a>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="sec feedback-band" id="methFeedback">
      <div class="band-inner feedback-inner">
        <div>
          <span class="eyebrow eyebrow--red">Feedback</span>
          <h3>Spotted something wrong? Let us know.</h3>
          <p class="cand-intro">Help us improve ward-level information by reporting missing details, incorrect information, or civic issues you've observed.</p>
        </div>
        <div class="feedback-actions">
          <a class="btn btn-primary" href="${FEEDBACK_FORM_URL}" target="_blank" rel="noopener" aria-label="Submit feedback (opens in a new tab)">Submit feedback<span aria-hidden="true">${EXTERNAL_LINK_ICON}</span></a>
        </div>
      </div>
    </section>
  `;
}
