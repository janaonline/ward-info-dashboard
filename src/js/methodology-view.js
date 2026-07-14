export function initMethodologyView({ meta }, { onBack }) {
  const container = document.getElementById('methodologyContainer');

  container.innerHTML = `
    <button class="back-link" id="methBack" type="button">&larr; Back</button>
    <h2>Methodology &amp; data sources</h2>
    <p>Ward boundaries, population, and amenity counts are compiled from ${meta.source || 'public GBA/BBMP datasets'}, last generated ${meta.generated || 'recently'}, covering ${meta.n_wards || 'all'} wards and an estimated population of ${meta.city_pop ? meta.city_pop.toLocaleString('en-IN') : 'over 8.4 million'}.</p>
    <h3>How "walking distance" is measured</h3>
    <p>Amenity coverage percentages reflect the share of a ward's area within roughly an 800-metre walk of a bus stop, metro station, park, lake, or public toilet — the amenity types where walking access matters most.</p>
    <h3>What's not yet verified</h3>
    <p>Corporator and engineering-division contact details are drawn from administrative rollups and may reflect an AC/AEE division rather than a per-ward-verified contact. Candidate information is a placeholder pending the next election cycle.</p>
    <h3>Limitations</h3>
    <p>Ward centroids used for nearest-neighbour comparisons are a simple average of boundary points, not a true geometric centroid, and may fall slightly off-center for irregularly shaped wards.</p>
  `;

  document.getElementById('methBack').addEventListener('click', () => onBack());
}
