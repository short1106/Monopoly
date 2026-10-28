// LARP EXTREME – Daten einmal herunterladen und kompakt ins Repo legen (assets/larp/*.json).
// Läuft als GitHub Action (.github/workflows/larp-data.yml), weil die Quellen nur von dort erreichbar sind.
// Quellen:
//   Hochschulen, Städte: Wikidata (CC0)
//   Schulen NRW: Schulministerium NRW, „Grunddaten der Schulen“ (Datenlizenz Deutschland – Namensnennung 2.0)
//   Schulen BW (und NRW als Ersatz), Straßennamen: OpenStreetMap über Overpass (ODbL, © OpenStreetMap-Mitwirkende)
// Jede Quelle ist einzeln abgesichert: Fällt eine aus, bleiben die alten Daten liegen.
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const OUT = new URL('../assets/larp/', import.meta.url);
const UA = 'DulidanLARP/1.0 (Spiel-Daten, einmaliger Abruf; github.com/short1106/monopoly)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = [];

async function get(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, Object.assign({ headers: { 'User-Agent': UA, Accept: opts.accept || '*/*' }, signal: AbortSignal.timeout(opts.ms || 150000) }, opts));
      if (r.ok) return r;
      console.log(`  ${r.status} bei ${url.slice(0, 120)}`);
      if (r.status === 429 || r.status >= 500) { await sleep(8000 * (i + 1)); continue; }
      return null;
    } catch (e) { console.log(`  Fehler: ${e.message}`); await sleep(5000 * (i + 1)); }
  }
  return null;
}
async function save(name, data) {
  await mkdir(OUT, { recursive: true });
  const json = JSON.stringify(data);
  await writeFile(new URL(name, OUT), json);
  summary.push(`${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length} Einträge, ${(json.length / 1024).toFixed(0)} KB`);
}
const r4 = (n) => Math.round(n * 1e4) / 1e4;

// ---------- Wikidata ----------
async function sparql(q) {
  const r = await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`, { accept: 'application/sparql-results+json' });
  if (!r) return null;
  return (await r.json()).results.bindings;
}
const point = (s) => { const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(s || ''); return m ? [Number(m[2]), Number(m[1])] : null; };
const STATES = { 'Nordrhein-Westfalen': 'NW', 'Baden-Württemberg': 'BW', Bayern: 'BY', Berlin: 'BE', Brandenburg: 'BB', Bremen: 'HB', Hamburg: 'HH', Hessen: 'HE', 'Mecklenburg-Vorpommern': 'MV', Niedersachsen: 'NI', 'Rheinland-Pfalz': 'RP', Saarland: 'SL', Sachsen: 'SN', 'Sachsen-Anhalt': 'ST', 'Schleswig-Holstein': 'SH', 'Thüringen': 'TH' };

async function cities() {
  console.log('Städte (Wikidata) …');
  const rows = await sparql(`SELECT ?c ?cLabel ?pop ?coord ?stateLabel WHERE {
    ?c wdt:P439 ?ags ; wdt:P1082 ?pop ; wdt:P625 ?coord .
    ?c wdt:P131+ ?state . ?state wdt:P31 wd:Q1221156 .
    FILTER(?pop >= 8000)
    SERVICE wikibase:label { bd:serviceParam wikibase:language "de". }
  }`);
  if (!rows) return null;
  const by = {};
  rows.forEach((x) => {
    const name = x.cLabel.value, st = STATES[x.stateLabel.value], p = point(x.coord.value), pop = Math.round(Number(x.pop.value));
    if (!st || !p || /^Q\d+$/.test(name)) return;
    const k = `${name}|${st}`;
    if (!by[k] || by[k].pop < pop) by[k] = { name, st, lat: r4(p[0]), lng: r4(p[1]), pop };
  });
  const list = Object.values(by).sort((a, b) => b.pop - a.pop);
  await save('cities.json', list);
  return list;
}

async function unis() {
  console.log('Hochschulen (Wikidata) …');
  const q = (cls) => `SELECT ?u ?uLabel ?tLabel ?coord ?cityLabel ?stateLabel ?students ?inception WHERE {
    ?u wdt:P31 ?t . ?t wdt:P279* wd:${cls} .
    ?u wdt:P17 wd:Q183 .
    FILTER NOT EXISTS { ?u wdt:P576 ?end }
    OPTIONAL { ?u wdt:P625 ?coord }
    OPTIONAL { ?u wdt:P131 ?city . OPTIONAL { ?city wdt:P131* ?state . ?state wdt:P31 wd:Q1221156 } }
    OPTIONAL { ?u wdt:P2196 ?students }
    OPTIONAL { ?u wdt:P571 ?inception }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
  }`;
  // Q38723 = Hochschule (Oberbegriff); falls das zu groß wird, die einzelnen Arten
  let rows = await sparql(q('Q38723'));
  if (!rows || !rows.length) {
    rows = [];
    for (const cls of ['Q3918', 'Q875538', 'Q902104', 'Q1371037', 'Q15936437', 'Q2467461']) { const r = await sparql(q(cls)); if (r) rows.push(...r); await sleep(1500); }
  }
  if (!rows.length) return null;
  const by = {};
  rows.forEach((x) => {
    const id = x.u.value.split('/').pop(), name = x.uLabel.value;
    if (/^Q\d+$/.test(name)) return;
    const o = by[id] || (by[id] = { id, name, types: new Set(), city: '', st: '', lat: 0, lng: 0, students: 0, founded: 0 });
    o.types.add(String(x.tLabel ? x.tLabel.value : '').toLowerCase());
    const p = point(x.coord && x.coord.value);
    if (p && !o.lat) { o.lat = r4(p[0]); o.lng = r4(p[1]); }
    if (x.cityLabel && !o.city && !/^Q\d+$/.test(x.cityLabel.value)) o.city = x.cityLabel.value;
    if (x.stateLabel && !o.st) o.st = STATES[x.stateLabel.value] || '';
    if (x.students) o.students = Math.max(o.students, Math.round(Number(x.students.value)));
    if (x.inception && !o.founded) o.founded = Number(String(x.inception.value).slice(0, 4)) || 0;
  });
  const kind = (o) => {
    const t = [...o.types].join(' ') + ' ' + o.name.toLowerCase();
    if (/kunst|musik|film|design|schauspiel|art school|music|academy of fine/.test(t)) return 'kunst';
    if (/privat|private/.test(t)) return 'privat';
    if (/fachhochschule|angewandte|applied|technische hochschule(?! (münchen|darmstadt|aachen))|duale/.test(t)) return 'fh';
    if (/verwaltung|polizei|bundeswehr|kirchlich|theolog|seminar/.test(t)) return 'spezial';
    return 'uni';
  };
  const list = Object.values(by).filter((o) => o.lat && o.name.length < 120)
    .map((o) => ({ id: o.id, name: o.name, kind: kind(o), city: o.city, st: o.st, lat: o.lat, lng: o.lng, students: o.students, founded: o.founded }))
    .sort((a, b) => b.students - a.students);
  await save('unis.json', list);
  return list;
}

// ---------- Schulen NRW (CSV des Schulministeriums) ----------
// UTM Zone 32N (ETRS89) → WGS84
function utm32ToLatLng(E, N) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const x = E - 500000, y = N, lon0 = (9 * Math.PI) / 180;
  const M = y / k0, mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2), T1 = Math.tan(p1) ** 2, C1 = ep2 * Math.cos(p1) ** 2;
  const R1 = (a * (1 - e2)) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5, D = x / (N1 * k0);
  const lat = p1 - ((N1 * Math.tan(p1)) / R1) * (D * D / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon = lon0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) / Math.cos(p1);
  return [r4((lat * 180) / Math.PI), r4((lon * 180) / Math.PI)];
}
function decode(buf) {
  const u = new TextDecoder('utf-8', { fatal: true });
  try { return u.decode(buf); } catch (e) { return new TextDecoder('latin1').decode(buf); }
}
function parseCSV(text, sep) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const SCHOOL_RE = /gymnasium|gesamtschule|berufskolleg|realschule|sekundarschule|gemeinschaftsschule|berufliche schule|berufsschule|kolleg/i;
async function schoolsNRW() {
  console.log('Schulen NRW (CSV) …');
  const urls = ['https://www.schulministerium.nrw/BiPo/OpenData/Schuldaten/schuldaten.csv', 'https://www.schulministerium.nrw.de/BiPo/OpenData/Schuldaten/schuldaten.csv'];
  const meta = await get('https://ckan.open.nrw.de/api/3/action/package_show?id=schulgrunddaten_nrw_1572515479', { accept: 'application/json' });
  if (meta) { try { (await meta.json()).result.resources.forEach((r) => { if (/csv/i.test(r.format || r.url)) urls.unshift(r.url); }); } catch (e) { /* weiter */ } }
  let text = null;
  for (const u of [...new Set(urls)]) { const r = await get(u); if (r) { text = decode(new Uint8Array(await r.arrayBuffer())); console.log(`  geladen: ${u}`); break; } }
  if (!text) return null;
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = parseCSV(text, sep);
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  console.log('  Spalten:', head.join(' | '));
  const col = (...re) => head.findIndex((h) => re.some((r) => r.test(h)));
  const iName = col(/bezeichnung_1|schulbezeichnung|^name/), iName2 = col(/bezeichnung_2/), iOrt = col(/^ort$|ort/), iPlz = col(/plz/), iForm = col(/schulform/), iE = col(/rechtswert|utm.*ost|east/), iN = col(/hochwert|utm.*nord|north/), iTr = col(/traeger|rechtsform/);
  const forms = {};
  const list = [];
  rows.forEach((r) => {
    if (r.length < 4) return;
    const name = [r[iName], iName2 >= 0 ? r[iName2] : ''].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    forms[r[iForm]] = (forms[r[iForm]] || 0) + 1;
    if (!SCHOOL_RE.test(name)) return;
    const E = Number(String(r[iE]).replace(',', '.')), N = Number(String(r[iN]).replace(',', '.'));
    if (!(E > 200000 && N > 5000000)) return;
    const [lat, lng] = utm32ToLatLng(E, N);
    list.push({ name, city: (r[iOrt] || '').trim(), plz: (r[iPlz] || '').trim(), st: 'NW', lat, lng, kind: schoolKind(name), priv: iTr >= 0 && /privat|frei|kirch|ersatz/i.test(r[iTr] || '') ? 1 : 0 });
  });
  console.log('  Schulformen:', JSON.stringify(forms).slice(0, 400));
  return list;
}
function schoolKind(n) {
  n = n.toLowerCase();
  if (/gymnasium/.test(n)) return 'gym';
  if (/gesamtschule|gemeinschaftsschule/.test(n)) return 'ges';
  if (/berufskolleg|berufliche|berufsschule/.test(n)) return 'bk';
  if (/realschule|sekundarschule/.test(n)) return 'real';
  return 'kolleg';
}

// ---------- OpenStreetMap (Overpass) ----------
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
async function overpass(q) {
  for (const base of OVERPASS) {
    const r = await get(base, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, ms: 200000 }, 2);
    if (r) { try { return (await r.json()).elements || []; } catch (e) { /* nächster */ } }
    await sleep(3000);
  }
  return null;
}
async function schoolsOSM(iso, st) {
  console.log(`Schulen ${st} (OSM) …`);
  const el = await overpass(`[out:json][timeout:240];area["ISO3166-2"="${iso}"]["admin_level"="4"]->.a;
    nwr["amenity"="school"]["name"](area.a);out center tags;`);
  if (!el) return null;
  return el.map((e) => {
    const name = (e.tags.name || '').trim(), c = e.center || e;
    if (!SCHOOL_RE.test(name) || !c.lat) return null;
    return { name, city: e.tags['addr:city'] || '', plz: e.tags['addr:postcode'] || '', st, lat: r4(c.lat), lng: r4(c.lon), kind: schoolKind(name), priv: /privat|frei|waldorf|evangel|kathol/i.test(name + (e.tags.operator || '')) ? 1 : 0 };
  }).filter(Boolean);
}
// Straßennamen für Wohnungsanzeigen (ohne Hausnummer) und Stadtteile
async function prevStreets() { try { return JSON.parse(await readFile(new URL('streets.json', OUT), 'utf8')); } catch (e) { return null; } }
const AGS = { SH: '01', HH: '02', NI: '03', HB: '04', NW: '05', HE: '06', RP: '07', BW: '08', BY: '09', SL: '10', BE: '11', BB: '12', MV: '13', SN: '14', ST: '15', TH: '16' };
async function streets(cityList) {
  const out = {};
  for (const c of cityList) {
    const ags = AGS[c.st] ? `["de:amtlicher_gemeindeschluessel"~"^${AGS[c.st]}"]` : '["de:amtlicher_gemeindeschluessel"]';
    const el = await overpass(`[out:json][timeout:120];
      area["name"="${c.name}"]["boundary"="administrative"]${ags}->.a;
      (way["highway"~"^(residential|living_street|tertiary|secondary)$"]["name"](area.a););out center tags 1500;
      (node["place"~"^(suburb|quarter|neighbourhood)$"]["name"](area.a););out tags 200;`);
    if (!el) { console.log(`  ${c.name}: keine Straßen`); continue; }
    const seen = new Set(), sts = [], subs = [];
    el.forEach((e) => {
      const n = e.tags && e.tags.name;
      if (!n) return;
      if (e.type === 'node' && e.tags.place) { subs.push({ n, lat: r4(e.lat), lng: r4(e.lon) }); return; }
      if (seen.has(n) || !e.center) return;
      seen.add(n);
      sts.push([n, r4(e.center.lat), r4(e.center.lon), e.tags.highway === 'residential' || e.tags.highway === 'living_street' ? 1 : 0]);
    });
    // gleichmäßig ausdünnen, damit die Datei klein bleibt
    const step = Math.max(1, Math.floor(sts.length / 220));
    out[`${c.name}|${c.st}`] = { s: sts.filter((x, i) => i % step === 0).slice(0, 220), q: subs.slice(0, 60) };
    console.log(`  ${c.name}: ${sts.length} Straßen, ${subs.length} Stadtteile`);
    await mkdir(OUT, { recursive: true });
    await writeFile(new URL('streets.json', OUT), JSON.stringify(Object.assign((await prevStreets()) || {}, out)));
    await sleep(2500);
  }
  return out;
}

// ---------- Ablauf ----------
const CORE = ['Duisburg', 'Oberhausen', 'Mülheim an der Ruhr', 'Essen', 'Bochum', 'Dortmund', 'Gelsenkirchen', 'Moers', 'Dinslaken', 'Krefeld', 'Düsseldorf', 'Köln', 'Bonn', 'Münster', 'Aachen', 'Wuppertal',
  'Öhringen', 'Künzelsau', 'Zweiflingen', 'Neuenstein', 'Pfedelbach', 'Bretzfeld', 'Schwäbisch Hall', 'Heilbronn', 'Neckarsulm', 'Stuttgart', 'Ludwigsburg', 'Heidelberg', 'Mannheim', 'Karlsruhe', 'Tübingen', 'Freiburg im Breisgau', 'Ulm', 'Würzburg',
  'Berlin', 'Hamburg', 'München', 'Frankfurt am Main', 'Leipzig', 'Dresden', 'Hannover', 'Bremen', 'Nürnberg', 'Mainz', 'Göttingen', 'Kiel', 'Regensburg', 'Augsburg', 'Darmstadt', 'Marburg', 'Gießen', 'Jena', 'Konstanz', 'Kassel', 'Erlangen', 'Bielefeld', 'Paderborn', 'Siegen', 'Trier', 'Magdeburg', 'Rostock', 'Greifswald', 'Lüneburg', 'Osnabrück', 'Oldenburg', 'Bamberg', 'Passau', 'Bayreuth', 'Potsdam', 'Saarbrücken', 'Koblenz', 'Halle (Saale)', 'Erfurt', 'Chemnitz', 'Braunschweig', 'Flensburg', 'Ingolstadt', 'Reutlingen', 'Esslingen am Neckar', 'Pforzheim', 'Offenburg', 'Kempten (Allgäu)', 'Rosenheim', 'Landshut', 'Furtwangen im Schwarzwald'];

const only = process.argv[2] || 'all';
const prev = async (n) => { try { return JSON.parse(await readFile(new URL(n, OUT), 'utf8')); } catch (e) { return null; } };
let cityList = null;
if (only === 'all' || only === 'cities') cityList = await cities();
if (!cityList) cityList = await prev('cities.json');
if (only === 'all' || only === 'unis') await unis();
if (only === 'all' || only === 'schools') {
  const nrw = (await schoolsNRW()) || (await schoolsOSM('DE-NW', 'NW'));
  await sleep(3000);
  const bw = await schoolsOSM('DE-BW', 'BW');
  const all = [...(nrw || []), ...(bw || [])];
  if (all.length) await save('schools.json', all);
}
if (only === 'all' || only === 'streets') {
  const list = CORE.map((n) => (cityList || []).find((c) => c.name === n) || { name: n, st: '' });
  const old = (await prevStreets()) || {};
  // Was schon da ist, nicht nochmal holen
  const todo = list.filter((c) => !Object.keys(old).some((k) => k.startsWith(`${c.name}|`)));
  const s = await streets(todo);
  if (Object.keys(s).length || Object.keys(old).length) await save('streets.json', Object.assign(old, s));
}
console.log('\nZusammenfassung:\n' + (summary.join('\n') || 'nichts geschrieben'));
