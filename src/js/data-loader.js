function parseOldWards(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*)\s\(([\d.]+)%\)$/);
    return m ? { name: m[1].trim(), pct: parseFloat(m[2]) } : { name: s, pct: null };
  });
}

function parseNeighbourhoods(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}

async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.text();
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

export async function loadData() {
  const [csvText, geometry, metaJSON] = await Promise.all([
    fetchText('public/data/wards.csv'),
    fetchJSON('public/data/wards-geometry.json'),
    fetchJSON('public/data/meta.json'),
  ]);

  const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true, skipEmptyLines: true });

  const W = {};
  const nameIndex = {};

  for (const row of parsed.data) {
    const uid = row.uid;
    if (!uid) continue;
    const geo = geometry[uid] || { points: {}, geom: [] };
    const ward = Object.assign({}, row, {
      uid,
      geom: geo.geom || [],
      points: geo.points || {},
      neighbourhoods: parseNeighbourhoods(row.neighbourhoods),
      old_wards: parseOldWards(row.old_wards),
    });
    W[uid] = ward;
    nameIndex[String(row.ward_name).toLowerCase()] = uid;
  }

  return {
    W,
    nameIndex,
    A: metaJSON.avg,
    meta: metaJSON.meta,
  };
}
