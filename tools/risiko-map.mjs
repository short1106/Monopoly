// Baut die Spielbrett-Karten für DULIDAN Risiko (js/risiko-shapes.js).
// Welt: echte Ländergrenzen (Natural Earth, gemeinfrei, über das npm-Paket world-atlas), zu den 42 Risiko-Gebieten
// zusammengefügt und zugeschnitten (z. B. Kanada in 4 Teile, Russland in 6). Ruhrpott: Voronoi-Flächen um die Städte.
// Einmalig ausführen:  npm i world-atlas@2 topojson-client@3 polygon-clipping@0.15 d3-delaunay@6
//                      node tools/risiko-map.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const topo = require('topojson-client');
const pc = require('polygon-clipping');
const { Delaunay } = require('d3-delaunay');
const world = require('world-atlas/countries-50m.json');
const DATA = require('../js/risiko-data.js');

// ---------- Hilfen ----------
const rad = Math.PI / 180;
const r1 = (n) => Math.round(n * 10) / 10;
function simplify(pts, tol) { // Douglas-Peucker
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) { const d = L > 1e-9 ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L : Math.hypot(pts[i][0] - ax, pts[i][1] - ay); if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return s / 2; };
function inside(p, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c; } return c; }
const insideMP = (p, mp) => mp.some((poly) => inside(p, poly[0]) && !poly.slice(1).some((h) => inside(p, h)));
function centroid(ring) { let x = 0, y = 0, a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; x += (ring[j][0] + ring[i][0]) * f; y += (ring[j][1] + ring[i][1]) * f; a += f; } return a ? [x / (3 * a), y / (3 * a)] : ring[0]; }
// Mitte für die Truppen-Plakette: weitester Punkt vom Rand im größten Teil (grobe „Pole of inaccessibility“)
function labelPoint(mp) {
  let best = null, ba = -1;
  mp.forEach((poly) => { const a = Math.abs(area(poly[0])); if (a > ba) { ba = a; best = poly; } });
  const ring = best[0];
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const segDist = (p) => { let m = Infinity; best.forEach((r) => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [ax, ay] = r[j], [bx, by] = r[i]; const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy)); } }); return m; };
  let bp = centroid(ring), bd = inside(bp, ring) ? segDist(bp) : -1;
  const N = 40;
  for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
    const p = [x0 + ((x1 - x0) * i) / N, y0 + ((y1 - y0) * j) / N];
    if (!inside(p, ring) || best.slice(1).some((h) => inside(p, h))) continue;
    const d = segDist(p);
    if (d > bd) { bd = d; bp = p; }
  }
  return bp.map(r1);
}
function toPath(mp, tol, minArea) {
  let out = '';
  mp.forEach((poly) => poly.forEach((ring, k) => {
    const s = simplify(ring, tol);
    if (s.length < 4 || (k === 0 && Math.abs(area(s)) < minArea)) return;
    out += `M${s.map((p) => `${r1(p[0])},${r1(p[1])}`).join('L')}Z`;
  }));
  return out;
}

// ---------- Welt ----------
const W = 1600, LNG0 = -170, LNG1 = 192, LAT0 = -56, LAT1 = 84;
const S = W / (LNG1 - LNG0);
const miller = (lat) => (1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * rad))) / rad;
const projW = ([lng, lat]) => [(lng - LNG0) * S, (miller(LAT1) - miller(lat)) * S];
const H = Math.round((miller(LAT1) - miller(LAT0)) * S);

const feats = topo.feature(world, world.objects.countries).features;
const byName = {};
feats.forEach((f) => { byName[f.properties.name] = f; });
function geomOf(name) {
  const f = byName[name];
  if (!f) throw new Error('Land fehlt: ' + name);
  const mp = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  // Datumsgrenze: Ostsibirien nach rechts, Aleuten nach links schieben
  return mp.map((poly) => poly.map((ring) => ring.map(([x, y]) => {
    if (name === 'Russia' && x < -160) return [x + 360, y];
    if (name === 'United States of America' && x > 160) return [x - 360, y];
    return [x, y];
  })));
}
const rect = ([a, b, c, d]) => [[[a, b], [c, b], [c, d], [a, d], [a, b]]];
const CROP = rect([LNG0, LAT0, LNG1, LAT1]);
const A = (...names) => names.map((n) => [n]);
const ASSIGN = {
  alaska: [['United States of America', [-195, 50, -129, 75]]],
  nwt: [['Canada', [-142, 60, -50, 85]]], alberta: [['Canada', [-142, 40, -102, 60]]], ontario: [['Canada', [-102, 40, -79.5, 60]]], quebec: [['Canada', [-79.5, 40, -50, 60]], ['St. Pierre and Miquelon']],
  groen: A('Greenland'), wusa: [['United States of America', [-129, 20, -98, 50]]], ousa: [['United States of America', [-98, 20, -60, 50]], ['Bermuda']],
  mamerika: A('Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Jamaica', 'Haiti', 'Dominican Rep.', 'Bahamas', 'Puerto Rico'),
  venezuela: A('Venezuela', 'Colombia', 'Guyana', 'Suriname', 'Trinidad and Tobago').concat([['France', [-56, 1, -50, 7]]]), peru: A('Peru', 'Ecuador', 'Bolivia'), brasilien: A('Brazil'),
  argentinien: A('Argentina', 'Chile', 'Uruguay', 'Paraguay', 'Falkland Is.'),
  island: A('Iceland'), gb: A('United Kingdom', 'Ireland', 'Isle of Man'), skandinavien: A('Norway', 'Sweden', 'Finland', 'Faeroe Is.', 'Åland'),
  meuropa: A('Germany', 'Poland', 'Denmark', 'Netherlands', 'Belgium', 'Luxembourg', 'Czechia', 'Austria', 'Switzerland', 'Slovakia', 'Hungary', 'Liechtenstein'),
  weuropa: [['France', [-6, 41, 10, 52]], ['Spain'], ['Portugal'], ['Andorra'], ['Monaco']],
  seuropa: A('Italy', 'Slovenia', 'Croatia', 'Bosnia and Herz.', 'Serbia', 'Montenegro', 'Kosovo', 'Albania', 'Macedonia', 'Greece', 'Bulgaria', 'Romania', 'San Marino', 'Vatican', 'Malta'),
  oeuropa: A('Ukraine', 'Belarus', 'Lithuania', 'Latvia', 'Estonia', 'Moldova').concat([['Russia', [19, 40, 55, 85]]]),
  nafrika: A('Morocco', 'W. Sahara', 'Algeria', 'Tunisia', 'Mauritania', 'Mali', 'Niger', 'Chad', 'Senegal', 'Gambia', 'Guinea', 'Guinea-Bissau', 'Sierra Leone', 'Liberia', "Côte d'Ivoire", 'Burkina Faso', 'Ghana', 'Togo', 'Benin', 'Nigeria', 'Cabo Verde'),
  aegypten: A('Egypt', 'Libya'),
  oafrika: A('Sudan', 'S. Sudan', 'Ethiopia', 'Eritrea', 'Djibouti', 'Somalia', 'Somaliland', 'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi'),
  kongo: A('Cameroon', 'Central African Rep.', 'Congo', 'Dem. Rep. Congo', 'Gabon', 'Eq. Guinea', 'Angola', 'São Tomé and Principe'),
  safrika: A('South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'Zambia', 'Mozambique', 'Malawi', 'Lesotho', 'eSwatini'),
  madagaskar: A('Madagascar', 'Comoros', 'Mauritius'),
  ural: [['Russia', [55, 40, 75, 85]]], sibirien: [['Russia', [75, 40, 100, 85]]], irkutsk: [['Russia', [100, 40, 130, 58]]], jakutien: [['Russia', [100, 58, 140, 85]]],
  kamtschatka: [['Russia', [130, 40, 195, 58]], ['Russia', [140, 58, 195, 85]]],
  mongolei: A('Mongolia'), japan: A('Japan'), china: A('China', 'Taiwan', 'North Korea', 'South Korea', 'Hong Kong', 'Macao'),
  afghanistan: A('Afghanistan', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan'),
  nahost: A('Turkey', 'Iran', 'Iraq', 'Syria', 'Lebanon', 'Israel', 'Palestine', 'Jordan', 'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Georgia', 'Armenia', 'Azerbaijan', 'Cyprus', 'N. Cyprus'),
  indien: A('India', 'Pakistan', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka', 'Siachen Glacier'),
  siam: A('Thailand', 'Myanmar', 'Laos', 'Cambodia', 'Vietnam', 'Singapore').concat([['Malaysia', [95, 0, 105, 8]]]),
  indonesien: [['Indonesia', [94, -12, 134, 8]], ['Malaysia', [105, 0, 120, 8]], ['Brunei'], ['Philippines'], ['Timor-Leste']],
  neuguinea: [['Papua New Guinea'], ['Indonesia', [134, -12, 142, 2]], ['Solomon Is.']],
  waustralien: [['Australia', [110, -45, 135, -9]]], oaustralien: [['Australia', [135, -45, 160, -9]], ['New Zealand']],
};
const M = DATA.MAPS.world;
const used = new Set();
const worldOut = { w: W, h: H, terr: {}, conts: {}, seas: {}, land: '', grid: [] };
const terrGeo = {};
for (const [id, parts] of Object.entries(ASSIGN)) {
  if (!M.T[id]) throw new Error('Unbekanntes Gebiet ' + id);
  const pieces = parts.map(([name, box]) => { used.add(name); const g = geomOf(name); return box ? pc.intersection(g, rect(box)) : g; });
  const geo = pc.intersection(pc.union(...pieces), CROP);
  const proj = geo.map((poly) => poly.map((ring) => ring.map(projW)));
  terrGeo[id] = proj;
  const T = M.T[id];
  const want = projW([T.lng, T.lat]);
  const lp = insideMP(want, proj) ? want.map(r1) : labelPoint(proj);
  worldOut.terr[id] = { d: toPath(proj, 0.7, 6), x: lp[0], y: lp[1] };
}
M.ids.forEach((id) => { if (!worldOut.terr[id]) throw new Error('Gebiet ohne Fläche ' + id); });
// Kontinent-Umrisse
for (const c of Object.values(M.conts)) {
  const u = pc.union(...c.terr.map((t) => terrGeo[t]));
  worldOut.conts[c.id] = toPath(u, 0.9, 30);
}
// Restliches Land (neutral, nur Optik)
const rest = feats.filter((f) => !used.has(f.properties.name) && f.properties.name !== 'Antarctica').map((f) => pc.intersection(geomOf(f.properties.name), CROP)).filter((g) => g.length);
worldOut.land = toPath(rest.flat().map((poly) => poly.map((ring) => ring.map(projW))), 0.8, 4);
Object.values(M.Z).forEach((z) => { const p = projW([z.lng, z.lat]); worldOut.seas[z.id] = { x: r1(p[0]), y: r1(p[1]) }; });
for (let lat = -40; lat <= 80; lat += 20) worldOut.grid.push(['h', r1(projW([0, lat])[1])]);
for (let lng = -160; lng <= 180; lng += 20) worldOut.grid.push(['v', r1(projW([lng, 0])[0])]);

// ---------- Ruhrpott (Voronoi um die Städte) ----------
const R = DATA.MAPS.ruhr;
const RW = 1200;
const lat0 = 51.46, kx = Math.cos(lat0 * rad);
const ids = R.ids, pts = ids.map((t) => [R.T[t].lng * kx, -R.T[t].lat]);
const minX = Math.min(...pts.map((p) => p[0])) - 0.09, maxX = Math.max(...pts.map((p) => p[0])) + 0.09;
const minY = Math.min(...pts.map((p) => p[1])) - 0.07, maxY = Math.max(...pts.map((p) => p[1])) + 0.07;
const RS = RW / (maxX - minX), RH = Math.round((maxY - minY) * RS);
const projR = ([x, y]) => [(x - minX) * RS, (y - minY) * RS];
const projRll = ([lng, lat]) => projR([lng * kx, -lat]);
// Land-Umriss: weiche Hülle um alle Städte
const blobPts = [];
pts.forEach(([x, y]) => { for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; blobPts.push([x + Math.cos(a) * 0.075, y + Math.sin(a) * 0.06]); } });
const hullIdx = Delaunay.from(blobPts).hull;
const blob = [[...Array.from(hullIdx, (i) => blobPts[i]), blobPts[hullIdx[0]]]];
const vor = Delaunay.from(pts).voronoi([minX, minY, maxX, maxY]);
const ruhrOut = { w: RW, h: RH, terr: {}, conts: {}, seas: {}, land: '', rivers: [], grid: [] };
const rGeo = {};
ids.forEach((t, i) => {
  const cell = vor.cellPolygon(i);
  const geo = pc.intersection([cell], blob);
  const proj = geo.map((poly) => poly.map((ring) => ring.map(projR)));
  rGeo[t] = proj;
  const p = projR(pts[i]);
  ruhrOut.terr[t] = { d: toPath(proj, 0.3, 1), x: r1(p[0]), y: r1(p[1]) };
});
for (const c of Object.values(R.conts)) ruhrOut.conts[c.id] = toPath(pc.union(...c.terr.map((t) => rGeo[t])), 0.3, 10);
Object.values(R.Z).forEach((z) => { const p = projRll([z.lng, z.lat]); ruhrOut.seas[z.id] = { x: r1(p[0]), y: r1(p[1]) }; });
// Flüsse und Kanäle (vereinfacht)
const RIVERS = {
  rhein: [[51.16, 6.76], [51.23, 6.75], [51.30, 6.72], [51.36, 6.73], [51.42, 6.735], [51.455, 6.72], [51.50, 6.71], [51.55, 6.68], [51.60, 6.655], [51.66, 6.60], [51.70, 6.55]],
  rhk: [[51.455, 6.735], [51.475, 6.80], [51.49, 6.87], [51.51, 6.95], [51.525, 7.03], [51.53, 7.12], [51.545, 7.22], [51.56, 7.30]],
  wdk: [[51.655, 6.62], [51.645, 6.72], [51.635, 6.84], [51.625, 6.96], [51.63, 7.06], [51.64, 7.17], [51.655, 7.28]],
  ruhr: [[51.445, 6.735], [51.43, 6.80], [51.415, 6.88], [51.40, 6.97], [51.405, 7.06], [51.42, 7.16], [51.415, 7.26], [51.40, 7.36], [51.385, 7.46]],
};
ruhrOut.rivers = Object.entries(RIVERS).map(([id, line]) => ({ id, d: 'M' + line.map(([la, ln]) => projRll([ln, la]).map(r1).join(',')).join('L'), w: id === 'rhein' ? 14 : 6 }));

const js = `// Automatisch erzeugt von tools/risiko-map.mjs – nicht von Hand ändern.
// Welt: Ländergrenzen aus Natural Earth (gemeinfrei), zu Risiko-Gebieten zusammengesetzt.
(function (root) {
  const SHAPES = ${JSON.stringify({ world: worldOut, ruhr: ruhrOut })};
  if (typeof module !== 'undefined' && module.exports) module.exports = SHAPES;
  else root.DULI_RISIKO_SHAPES = SHAPES;
})(typeof window !== 'undefined' ? window : globalThis);
`;
writeFileSync(new URL('../js/risiko-shapes.js', import.meta.url), js);
console.log('fertig', (js.length / 1024).toFixed(0), 'KB', 'Welt', W, 'x', H, 'Ruhr', RW, 'x', RH);
