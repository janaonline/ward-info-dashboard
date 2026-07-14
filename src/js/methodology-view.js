export function initMethodologyView({ meta }, { onBack }) {
  const container = document.getElementById('methodologyContainer');

  container.innerHTML = `
    <button class="back-link" id="methBack" type="button">&larr; Back</button>
    <h2>Methodology &amp; data sources</h2>

    <div class="callout">
      <span class="callout-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="7.5" x2="12" y2="7.5"/></svg></span>
      <p><strong>Note:</strong> Artificial Intelligence tools were used to scale up the GIS workflow across all 369 wards. While this enables broad, consistent coverage of all wards, it may introduce errors, and we welcome corrections.</p>
    </div>

    <section class="sec">
      <h3>1. Finding the data:</h3>
      <ul class="meth-list">
        <li>Much of Bengaluru's open civic data resides in the Karnataka Geographic Information System (KGIS), the state's public spatial-data platform run by the Karnataka State Remote Sensing Applications Centre (KSRSAC).</li>
        <li><a href="https://opencity.in/how-to-access-government-gis-data-for-indian-cities-states/" target="_blank" rel="noopener">OpenCity's explainer on the KGIS ArcGIS REST servers guided our approach</a>, as it lists the server URLs and sets out how to load and download the layers using a tool such as QGIS.</li>
        <li>From the layers available, we focused on the amenities most relevant to everyday life - bus stops, parks, schools, anganwadis, public toilets and lakes, among others.</li>
      </ul>
    </section>

    <section class="sec">
      <h3>2. Turning it into ward-level numbers:</h3>
      <ul class="meth-list">
        <li>For most of the 369 wards, a script gathers every amenity within 1.6 km of the ward boundary, so that facilities just outside a ward still count for residents living near its edge.</li>
        <li>An 800 m walking buffer (approximately a 15-minute walk) is then drawn around each amenity, and we measure the share of the ward's area that falls within those buffers.</li>
        <li>This share is reported on the dashboard as the portion of a ward "within a 15-minute walk" of an amenity.</li>
      </ul>
    </section>

    <section class="sec">
      <h3>3. Scope and next steps.</h3>
      <ul class="meth-list">
        <li>This is the first version, focused on physical, everyday infrastructure. The same method extends readily to environmental data, stormwater drains, lakes, air quality and noise, among others, which we intend to build on in future iterations.</li>
        <li>Coming soon' placeholders flag data we plan to add as it becomes available.</li>
      </ul>
    </section>
  `;

  document.getElementById('methBack').addEventListener('click', () => onBack());
}
