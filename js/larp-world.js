// DULIDAN LARP EXTREME – Weltweit: Länder, Hochschulen im Ausland, Studium mit IELTS und Visum, Reisen, Auswandern.
// Werte sind gerundete Richtwerte (Studiengebühren für Deutsche pro Jahr, Miete und Kauf pro m², Gehaltsniveau relativ zu DE).
// Mehr Hochschulen kommen aus assets/larp/world.json (Wikidata), falls vorhanden.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const DB = root.DULI_LARP_DB || (isNode ? require('./larp-db') : null);
  // cc: [Name, Sprache, EU/EWR (kein Visum), Studiengebühr pro Jahr, Miete €/m², Kauf €/m², Gehalt ×, Visum €, Flug €, Bachelor-Semester, Grunderwerb %]
  const RAW = {
    AT: ['Österreich', 'de', 1, 0, 12.5, 5200, 1.0, 0, 120, 6, 3.5], CH: ['Schweiz', 'de', 1, 1500, 22, 12000, 1.9, 0, 150, 6, 2],
    NL: ['Niederlande', 'nl', 1, 2600, 20, 5200, 1.05, 0, 120, 6, 2], BE: ['Belgien', 'nl', 1, 1000, 13, 3200, 1.0, 0, 120, 6, 12],
    FR: ['Frankreich', 'fr', 1, 250, 18, 4500, 0.95, 0, 140, 6, 6], ES: ['Spanien', 'es', 1, 1500, 14, 3000, 0.7, 0, 160, 8, 8],
    IT: ['Italien', 'it', 1, 2000, 13, 3200, 0.75, 0, 150, 6, 9], PT: ['Portugal', 'pt', 1, 1000, 15, 3500, 0.55, 0, 180, 6, 6],
    DK: ['Dänemark', 'da', 1, 0, 18, 5000, 1.25, 0, 130, 6, 1], SE: ['Schweden', 'sv', 1, 0, 15, 4500, 1.0, 0, 140, 6, 1.5],
    NO: ['Norwegen', 'no', 1, 0, 19, 6000, 1.4, 0, 170, 6, 2.5], FI: ['Finnland', 'fi', 1, 0, 16, 3800, 0.95, 0, 170, 6, 3],
    IE: ['Irland', 'en', 1, 3000, 25, 5000, 1.15, 0, 140, 8, 1], PL: ['Polen', 'pl', 1, 2500, 12, 2600, 0.5, 0, 110, 6, 2],
    CZ: ['Tschechien', 'cs', 1, 0, 13, 3800, 0.55, 0, 100, 6, 0], GB: ['Großbritannien', 'en', 0, 28000, 28, 6500, 1.1, 600, 110, 6, 5],
    US: ['USA', 'en', 0, 45000, 30, 4500, 1.5, 170, 550, 8, 1], CA: ['Kanada', 'en', 0, 25000, 22, 5000, 1.15, 120, 600, 8, 1.5],
    AU: ['Australien', 'en', 0, 30000, 24, 6000, 1.3, 1000, 1300, 6, 4], NZ: ['Neuseeland', 'en', 0, 25000, 20, 5500, 1.1, 250, 1500, 6, 0],
    JP: ['Japan', 'ja', 0, 5000, 16, 6000, 0.85, 0, 800, 8, 3], KR: ['Südkorea', 'ko', 0, 6000, 14, 7000, 0.85, 60, 750, 8, 4],
    CN: ['China', 'zh', 0, 4000, 15, 8000, 0.5, 120, 600, 8, 3], SG: ['Singapur', 'en', 0, 25000, 35, 14000, 1.3, 30, 700, 8, 3],
    AE: ['Vereinigte Arabische Emirate', 'en', 0, 20000, 22, 4000, 1.3, 100, 400, 8, 4], TR: ['Türkei', 'tr', 0, 3000, 8, 1500, 0.35, 60, 200, 8, 4],
    ZA: ['Südafrika', 'en', 0, 4000, 8, 1300, 0.35, 40, 800, 6, 8], BR: ['Brasilien', 'pt', 0, 3000, 7, 1800, 0.3, 80, 800, 8, 3],
    MX: ['Mexiko', 'es', 0, 3000, 8, 1500, 0.35, 40, 700, 8, 3], AR: ['Argentinien', 'es', 0, 0, 6, 2000, 0.25, 0, 900, 10, 3],
    IN: ['Indien', 'en', 0, 3000, 4, 1200, 0.2, 80, 600, 8, 6],
  };
  const COUNTRIES = {};
  Object.entries(RAW).forEach(([cc, r]) => { COUNTRIES[cc] = { cc, name: r[0], lang: r[1], eu: !!r[2], tuition: r[3], rent: r[4], buy: r[5], sal: r[6], visa: r[7], flight: r[8], sem: r[9], grest: r[10] }; });
  // [Name, Land, Stadt, lat, lng, Rang (grob), Art]
  const UNI_RAW = [
    ['Massachusetts Institute of Technology (MIT)', 'US', 'Boston', 42.3601, -71.0942, 1], ['Harvard University', 'US', 'Boston', 42.377, -71.1167, 4], ['Stanford University', 'US', 'San Francisco', 37.4275, -122.1697, 5],
    ['University of California, Berkeley', 'US', 'San Francisco', 37.8719, -122.2585, 10], ['Princeton University', 'US', 'New York', 40.3431, -74.6551, 20], ['Yale University', 'US', 'New York', 41.3163, -72.9223, 20],
    ['Columbia University', 'US', 'New York', 40.8075, -73.9626, 25], ['New York University', 'US', 'New York', 40.7295, -73.9965, 40], ['University of California, Los Angeles (UCLA)', 'US', 'Los Angeles', 34.0689, -118.4452, 40],
    ['University of Michigan', 'US', 'Detroit', 42.278, -83.7382, 45], ['University of Texas at Austin', 'US', 'Austin', 30.2849, -97.7341, 70], ['Arizona State University', 'US', 'Phoenix', 33.4242, -111.9281, 200],
    ['University of Oxford', 'GB', 'Oxford', 51.7548, -1.2544, 3], ['University of Cambridge', 'GB', 'Cambridge', 52.2043, 0.1149, 5], ['Imperial College London', 'GB', 'London', 51.4988, -0.1749, 2],
    ['University College London (UCL)', 'GB', 'London', 51.5246, -0.134, 9], ["King's College London", 'GB', 'London', 51.5115, -0.116, 40], ['University of Edinburgh', 'GB', 'Edinburgh', 55.9445, -3.1892, 30],
    ['University of Manchester', 'GB', 'Manchester', 53.4668, -2.2339, 35], ['ETH Zürich', 'CH', 'Zürich', 47.3763, 8.5477, 7], ['Universität Zürich', 'CH', 'Zürich', 47.3744, 8.5507, 90],
    ['EPFL Lausanne', 'CH', 'Lausanne', 46.5191, 6.5668, 25], ['Universität Basel', 'CH', 'Basel', 47.5585, 7.5838, 120], ['Universität Wien', 'AT', 'Wien', 48.2132, 16.36, 130],
    ['Technische Universität Wien', 'AT', 'Wien', 48.199, 16.3699, 190], ['Universität Innsbruck', 'AT', 'Innsbruck', 47.2629, 11.3847, 300], ['Universität Graz', 'AT', 'Graz', 47.0777, 15.4497, 400],
    ['TU Delft', 'NL', 'Delft', 52.0022, 4.3736, 50], ['Universiteit van Amsterdam', 'NL', 'Amsterdam', 52.3557, 4.9556, 55], ['Universiteit Utrecht', 'NL', 'Utrecht', 52.0857, 5.178, 110],
    ['Universiteit Leiden', 'NL', 'Leiden', 52.1571, 4.4851, 120], ['Erasmus Universiteit Rotterdam', 'NL', 'Rotterdam', 51.917, 4.5258, 170], ['Maastricht University', 'NL', 'Maastricht', 50.8474, 5.6873, 250],
    ['KU Leuven', 'BE', 'Leuven', 50.8777, 4.7005, 60], ['Université PSL', 'FR', 'Paris', 48.8418, 2.344, 25], ['Sorbonne Université', 'FR', 'Paris', 48.8469, 2.3561, 60],
    ['Institut Polytechnique de Paris', 'FR', 'Paris', 48.7147, 2.2114, 40], ['Sciences Po', 'FR', 'Paris', 48.8541, 2.3283, 200], ['Universitat de Barcelona', 'ES', 'Barcelona', 41.3869, 2.164, 150],
    ['Universidad Complutense de Madrid', 'ES', 'Madrid', 40.4489, -3.7286, 170], ['Universidad de Granada', 'ES', 'Granada', 37.1847, -3.601, 450], ['Politecnico di Milano', 'IT', 'Mailand', 45.4781, 9.2272, 110],
    ['Università Bocconi', 'IT', 'Mailand', 45.4507, 9.189, 100, 'privat'], ['Sapienza Università di Roma', 'IT', 'Rom', 41.9038, 12.5145, 130], ['Università di Bologna', 'IT', 'Bologna', 44.4963, 11.3527, 140],
    ['Universidade de Lisboa', 'PT', 'Lissabon', 38.7529, -9.1585, 250], ['Universidade do Porto', 'PT', 'Porto', 41.1496, -8.6109, 250], ['Københavns Universitet', 'DK', 'Kopenhagen', 55.6802, 12.5722, 100],
    ['Danmarks Tekniske Universitet (DTU)', 'DK', 'Kopenhagen', 55.7858, 12.5225, 110], ['KTH Royal Institute of Technology', 'SE', 'Stockholm', 59.3498, 18.0707, 75], ['Lunds universitet', 'SE', 'Lund', 55.7116, 13.2034, 80],
    ['Uppsala universitet', 'SE', 'Uppsala', 59.8498, 17.629, 100], ['Universitetet i Oslo', 'NO', 'Oslo', 59.9399, 10.7217, 120], ['Helsingin yliopisto', 'FI', 'Helsinki', 60.1726, 24.951, 115],
    ['Aalto-yliopisto', 'FI', 'Helsinki', 60.1867, 24.8277, 110], ['Trinity College Dublin', 'IE', 'Dublin', 53.3438, -6.2546, 85], ['Uniwersytet Warszawski', 'PL', 'Warschau', 52.2403, 21.0189, 260],
    ['Uniwersytet Jagielloński', 'PL', 'Krakau', 50.0614, 19.9366, 300], ['Univerzita Karlova', 'CZ', 'Prag', 50.088, 14.4208, 250], ['University of Toronto', 'CA', 'Toronto', 43.6629, -79.3957, 25],
    ['McGill University', 'CA', 'Montréal', 45.5048, -73.5772, 30], ['University of British Columbia', 'CA', 'Vancouver', 49.2606, -123.246, 35], ['University of Melbourne', 'AU', 'Melbourne', -37.7963, 144.9614, 15],
    ['University of Sydney', 'AU', 'Sydney', -33.8886, 151.1873, 20], ['UNSW Sydney', 'AU', 'Sydney', -33.9173, 151.2313, 20], ['Australian National University', 'AU', 'Canberra', -35.2777, 149.1185, 30],
    ['University of Auckland', 'NZ', 'Auckland', -36.8523, 174.7691, 65], ['University of Tokyo', 'JP', 'Tokio', 35.7126, 139.762, 30], ['Waseda University', 'JP', 'Tokio', 35.709, 139.7193, 190],
    ['Kyoto University', 'JP', 'Kyoto', 35.0262, 135.7808, 50], ['Seoul National University', 'KR', 'Seoul', 37.4602, 126.952, 30], ['Yonsei University', 'KR', 'Seoul', 37.5658, 126.9386, 60],
    ['KAIST', 'KR', 'Daejeon', 36.3721, 127.3604, 55], ['Peking University', 'CN', 'Peking', 39.9869, 116.3059, 15], ['Tsinghua University', 'CN', 'Peking', 40.0, 116.3264, 20],
    ['Fudan University', 'CN', 'Shanghai', 31.2989, 121.5015, 35], ['National University of Singapore (NUS)', 'SG', 'Singapur', 1.2966, 103.7764, 8], ['Nanyang Technological University', 'SG', 'Singapur', 1.3483, 103.6831, 15],
    ['Khalifa University', 'AE', 'Abu Dhabi', 24.4473, 54.3957, 200], ['American University in Dubai', 'AE', 'Dubai', 25.0943, 55.1569, 600, 'privat'], ['Boğaziçi Üniversitesi', 'TR', 'Istanbul', 41.0837, 29.0503, 400],
    ['Orta Doğu Teknik Üniversitesi (ODTÜ)', 'TR', 'Ankara', 39.891, 32.7837, 350], ['University of Cape Town', 'ZA', 'Kapstadt', -33.9577, 18.4612, 170], ['Universidade de São Paulo', 'BR', 'São Paulo', -23.5614, -46.7308, 90],
    ['Universidad Nacional Autónoma de México (UNAM)', 'MX', 'Mexiko-Stadt', 19.3326, -99.1867, 100], ['Universidad de Buenos Aires', 'AR', 'Buenos Aires', -34.5997, -58.373, 80],
    ['IIT Bombay', 'IN', 'Mumbai', 19.1334, 72.9133, 120], ['IIT Delhi', 'IN', 'Neu-Delhi', 28.545, 77.1926, 120],
  ];
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  let UNIS = UNI_RAW.map(([name, cc, city, lat, lng, rank, kind]) => ({ id: `w-${slug(name)}`, name, cc, city, lat, lng, rank, kind: kind || 'uni' }));
  // Städte im Ausland (aus den Hochschulen, plus ein paar Klassiker zum Auswandern)
  const EXTRA_CITIES = [['Barcelona', 'ES', 41.3874, 2.1686], ['Mallorca (Palma)', 'ES', 39.5696, 2.6502], ['Los Angeles', 'US', 34.0522, -118.2437], ['Miami', 'US', 25.7617, -80.1918], ['Bangkok', 'TH', 13.7563, 100.5018],
    ['Bali (Denpasar)', 'ID', -8.6705, 115.2126], ['Kapstadt', 'ZA', -33.9249, 18.4241], ['Reykjavík', 'IS', 64.1466, -21.9426], ['Marrakesch', 'MA', 31.6295, -7.9811], ['Antalya', 'TR', 36.8969, 30.7133]];
  function cities() {
    const by = {};
    UNIS.forEach((u) => { if (!by[u.city]) by[u.city] = { name: u.city, cc: u.cc, st: 'INT', lat: u.lat, lng: u.lng, pop: 1000000, world: true }; });
    EXTRA_CITIES.forEach(([n, cc, lat, lng]) => { if (!by[n]) by[n] = { name: n, cc, st: 'INT', lat, lng, pop: 800000, world: true }; });
    return Object.values(by);
  }
  let CITY_CACHE = null;
  const allCities = () => CITY_CACHE || (CITY_CACHE = cities());
  const cityOf = (name) => allCities().find((c) => c.name === name) || null;
  // Länder ohne eigene Zeile (Thailand, Bali …) bekommen Standardwerte
  const country = (cc) => COUNTRIES[cc] || { cc, name: { TH: 'Thailand', ID: 'Indonesien', IS: 'Island', MA: 'Marokko' }[cc] || cc, lang: 'en', eu: cc === 'IS', tuition: 5000, rent: cc === 'IS' ? 20 : 7, buy: cc === 'IS' ? 5000 : 1500, sal: cc === 'IS' ? 1.3 : 0.3, visa: 50, flight: 700, sem: 8, grest: 3 };
  // zusätzliche Hochschulen aus world.json (Wikidata), nur Länder mit Werten
  function addData(list) {
    if (!Array.isArray(list)) return;
    const have = new Set(UNIS.map((u) => u.name));
    // nur die größten (ab 40.000 Studierenden), damit die Liste übersichtlich bleibt
    list.filter((u) => u && u.students >= 40000).slice(0, 120).forEach((u) => { if (u && u.name && COUNTRIES[u.cc] && !have.has(u.name) && u.city) { have.add(u.name); UNIS.push({ id: `w-${slug(u.name)}`, name: u.name, cc: u.cc, city: u.city, lat: u.lat, lng: u.lng, rank: u.rank || 500, kind: 'uni' }); } });
    CITY_CACHE = null;
  }
  if (isNode) { try { addData(JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'assets', 'larp', 'world.json'), 'utf8')).unis); } catch (e) { /* ohne Daten */ } }

  function price(c) { const K = country(c.cc); const big = c.pop > 3000000 ? 1.2 : 1; return { buy: Math.round(K.buy * big / 50) * 50, rent: Math.round(K.rent * big * 10) / 10 }; }
  const needGrade = (rank) => (rank <= 10 ? 1.2 : rank <= 30 ? 1.5 : rank <= 80 ? 1.9 : rank <= 200 ? 2.4 : 3.0);
  const langNote = (K) => (K.lang === 'de' ? 'auf Deutsch' : K.lang === 'en' ? 'auf Englisch' : 'auf Englisch (Landessprache hilft)');
  function unisIn(cityName) { return UNIS.filter((u) => u.city === cityName); }
  // Studiengänge an einer Hochschule im Ausland (deterministisch je Hochschule)
  function programs(S, u, rngOf) {
    const K = country(u.cc), r = rngOf('wprog', u.id);
    return DB.STUDIES.filter(([name, , , , kinds]) => /uni|privat/.test(kinds) && !/Staatsexamen|Lehramt/.test(name)).map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).slice(0, 8).map(([name, field, , , , salary], i) => {
      const nc = Math.max(1.0, Math.round((needGrade(u.rank) + (r() - 0.5) * 0.3) * 10) / 10);
      const tuition = u.kind === 'privat' ? Math.max(K.tuition, 14000) : K.tuition;
      return { id: `wuni:${u.id}:${i}`, cat: 'uni', abroad: u.cc, country: K.name, uni: u.name, uniId: u.id, kind: 'uni', city: u.city, st: 'INT', lat: u.lat, lng: u.lng, rank: u.rank, name: `${name} (${langNote(K)})`, field, nc, sem: K.sem, salary: Math.round(salary * (u.rank <= 30 ? 1.2 : 1)), fee: Math.round(tuition / 12), tuition, semFee: 0, visa: !K.eu, visaFee: K.visa, needLang: K.lang !== 'de', medicine: field === 'Medizin' };
    });
  }
  function abroad(S, q, rngOf) {
    const s = String(q || '').trim().toLowerCase();
    let l = UNIS.filter((u) => !s || u.city.toLowerCase().includes(s) || u.name.toLowerCase().includes(s) || country(u.cc).name.toLowerCase().includes(s) || u.cc.toLowerCase() === s);
    if (!l.length) l = UNIS;
    return l.slice().sort((a, b) => a.rank - b.rank).slice(0, 14).flatMap((u) => programs(S, u, rngOf).slice(0, 2));
  }
  function findProgram(S, id, rngOf) {
    const [, uid] = String(id).split(':');
    const u = UNIS.find((x) => x.id === uid);
    return u ? programs(S, u, rngOf).find((p) => p.id === id) || null : null;
  }

  // ---------- Ferien und Urlaub ----------
  // Schulferien (jedes Jahr gleich angenommen, Richtwerte nach NRW und BW): [Name, Monat von, Tag von, Monat bis, Tag bis] (Monat 0 = Januar)
  const SCHOOL_HOLIDAYS = {
    NW: [['Weihnachtsferien', 0, 1, 0, 6], ['Osterferien', 2, 22, 3, 3], ['Pfingstferien', 4, 18, 4, 18], ['Sommerferien', 6, 15, 7, 27], ['Herbstferien', 9, 12, 9, 24], ['Weihnachtsferien', 11, 23, 11, 31]],
    BW: [['Weihnachtsferien', 0, 1, 0, 9], ['Osterferien', 2, 29, 3, 3], ['Pfingstferien', 4, 18, 4, 29], ['Sommerferien', 6, 29, 8, 11], ['Herbstferien', 9, 26, 9, 31], ['Weihnachtsferien', 11, 23, 11, 31]],
  };
  // Vorlesungsfreie Zeit (Semesterferien) grob: Mitte Februar bis Mitte April, August und September
  const UNI_BREAKS = [['Semesterferien', 1, 15, 3, 15], ['Semesterferien', 7, 1, 8, 30]];
  const inRange = (m, d, r) => { const v = m * 100 + d, a = r[1] * 100 + r[2], b = r[3] * 100 + r[4]; return v >= a && v <= b; };
  // Welche Ferien hat diese Person im Monat m? (null = keine)
  function holidayIn(c, m) {
    const list = c.edu && c.edu.kind === 'school' ? SCHOOL_HOLIDAYS[c.st] || SCHOOL_HOLIDAYS.NW : c.edu && c.edu.kind === 'uni' ? UNI_BREAKS : null;
    if (!list) return null;
    const h = list.find((r) => (r[1] <= m && r[3] >= m));
    return h ? { name: h[0], from: `${h[2]}.${h[1] + 1}.`, to: `${h[4]}.${h[3] + 1}.`, full: list.filter((r) => r[1] <= m && r[3] >= m).reduce((s, r) => s + Math.min(r[3] === m ? r[4] : 31, 31) - (r[1] === m ? r[2] : 1) + 1, 0) } : null;
  }
  // Urlaubstage im Job (gesetzlich mindestens 20, üblich 30, Azubis meist 25–30)
  function vacation(c, y) {
    const J = c.job2;
    if (!J || J.kind === 'mini') return null;
    if (!c.vac || c.vac.y !== y) c.vac = { y, left: J.kind === 'azubi' ? 27 : J.kind === 'werk' ? 20 : 30 };
    return c.vac;
  }
  // Was bedeutet eine Reise von `days` Tagen jetzt für diese Person?
  function tripStatus(S, c, days) {
    const m = S.date.m, h = holidayIn(c, m), work = Math.max(1, Math.round(days * 5 / 7));
    if (c.edu && c.edu.kind === 'school') return h ? { ok: true, kind: 'ferien', text: `${h.name} (${h.from}–${h.to})` } : { ok: false, kind: 'schwaenzen', work, text: `Keine Ferien: ${work} Fehltage, Bußgeld möglich` };
    if (c.edu && c.edu.kind === 'uni' && !c.job2) return h ? { ok: true, kind: 'ferien', text: 'Semesterferien' } : { ok: true, kind: 'vorlesung', work, text: `Mitten im Semester: ${work} Tage Vorlesungen verpasst` };
    const v = vacation(c, S.date.y);
    if (!v) return { ok: true, kind: 'frei', text: 'Du hast frei' };
    return v.left >= work ? { ok: true, kind: 'urlaub', work, text: `${work} Urlaubstage (noch ${v.left} von ${c.job2.kind === 'azubi' ? 27 : c.job2.kind === 'werk' ? 20 : 30})` } : { ok: false, kind: 'unbezahlt', work, text: `Nur noch ${v.left} Urlaubstage: Rest unbezahlt, Abmahnung möglich` };
  }
  // Hauptsaison: in den Sommer- und Osterferien sind Reisen teurer
  const peak = (m) => m === 6 || m === 7 || m === 3 || m === 11;
  const km = (a, b) => { const R = 6371, t = Math.PI / 180, dl = (b.lat - a.lat) * t, dg = (b.lng - a.lng) * t; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

  // ---------- Reisen ----------
  const STYLES = [['backpack', 'Backpacking', 35, 6, 1], ['urlaub', 'Pauschalurlaub', 110, 8, 1.1], ['staedte', 'Städtetrip', 140, 6, 1], ['luxus', 'Luxusreise', 420, 12, 1.4], ['abenteuer', 'Abenteuerreise', 160, 10, 0.9]];
  const DEST = [['Mallorca (Palma)', 'ES'], ['Barcelona', 'ES'], ['Rom', 'IT'], ['Paris', 'FR'], ['Lissabon', 'PT'], ['Antalya', 'TR'], ['Istanbul', 'TR'], ['Prag', 'CZ'], ['Kopenhagen', 'DK'], ['Reykjavík', 'IS'],
    ['New York', 'US'], ['Los Angeles', 'US'], ['Miami', 'US'], ['Tokio', 'JP'], ['Seoul', 'KR'], ['Bangkok', 'TH'], ['Bali (Denpasar)', 'ID'], ['Dubai', 'AE'], ['Kapstadt', 'ZA'], ['Sydney', 'AU'], ['Marrakesch', 'MA'], ['Mexiko-Stadt', 'MX'], ['Buenos Aires', 'AR'], ['Singapur', 'SG']];
  function travel(S, mIdx, rngOf) {
    const r = rngOf(S.market.seed, 'trip', mIdx), out = [];
    for (let i = 0; i < 8; i++) {
      const [city, cc] = DEST[Math.floor(r() * DEST.length)], [style, sname, daily, days0, happy] = STYLES[Math.floor(r() * STYLES.length)], K = country(cc);
      const days = Math.max(3, Math.round(days0 * (0.7 + r() * 0.8)));
      let priceT = Math.round((K.flight * (0.7 + r() * 0.7) + days * daily * Math.max(0.6, Math.min(1.5, K.sal + 0.3))) / 10) * 10;
      if (peak(mIdx % 12)) priceT = Math.round(priceT * 1.3 / 10) * 10;
      const last = r() < 0.2;
      const wc = cityOf(city) || {};
      out.push({ id: `trip:${mIdx}:${i}`, cat: 'travel', city, cc, lat: wc.lat, lng: wc.lng, peak: peak(mIdx % 12), country: K.name, style, title: `${sname}: ${city} (${K.name})`, days, price: last ? Math.round(priceT * 0.65 / 10) * 10 : priceT, last, happy: Math.round(8 * happy + days * 0.6), visa: !K.eu && K.visa ? K.visa : 0 });
    }
    return out;
  }
  const INCIDENTS = [
    [0.08, 'Koffer verloren. Drei Tage im selben T-Shirt.', { happy: -3, money: -120 }], [0.08, 'Sonnenbrand Stufe Hummer.', { health: -3 }], [0.06, 'Lebensmittelvergiftung vom Streetfood. Es war es trotzdem wert.', { health: -6 }],
    [0.07, 'Urlaubsflirt. Ihr schreibt euch noch.', { happy: 6, flirt: 1 }], [0.05, 'Handy geklaut. Alle Urlaubsfotos weg.', { happy: -4, money: -400 }], [0.04, 'Flug gestrichen, zwei Nächte am Flughafen.', { happy: -5, money: -150 }],
    [0.05, 'Du lernst Einheimische kennen und wirst zu einer Hochzeit eingeladen.', { happy: 8, power: 1 }], [0.03, 'Ein Reel von dir geht viral.', { power: 3, happy: 4 }],
  ];
  function act(S, pid, a, X) {
    const c = S.chars[pid];
    if (a.type === 'mTravel') {
      const mIdx = Number(String(a.id).split(':')[1]);
      const t = travel(S, mIdx, X.rngOf).find((x) => x.id === a.id);
      if (!t) return 'Angebot abgelaufen.';
      if (c.flags.tripAt === X.idx(S.date)) return 'Diesen Monat warst du schon weg.';
      const cost = t.price + t.visa;
      if (c.stats.money + c.bank.dispo < cost) return `Kostet ${X.eur(cost)}. Das hast du nicht.`;
      if (c.key === 'april' && !c.flags.body) return 'April kann nicht reisen. Sie ist eine KI. Sie schaut sich Fotos an.';
      if (c.prison) return 'Aus dem Gefängnis gibt es keinen Urlaub.';
      const T = tripStatus(S, c, t.days);
      c.stats.money -= cost;
      c.flags.tripAt = X.idx(S.date);
      c.away = { city: t.city, label: `${t.city} (${t.country})`, lat: t.lat, lng: t.lng, until: S.round + 1, kind: 'trip' };
      c.flags.trips = (c.flags.trips || 0) + 1;
      c.stats.happy = X.clampStat(c.stats.happy + t.happy);
      c.stats.health = X.clampStat(c.stats.health + (t.style === 'luxus' ? 4 : t.style === 'abenteuer' ? -1 : 2));
      let txt = `${t.title}, ${t.days} Tage: −${X.eur(cost)}${t.visa ? ` (inklusive Visum ${X.eur(t.visa)})` : ''}, Happiness +${t.happy}.`;
      txt += ` ${consequences(S, pid, c, T, X)}`;
      let roll = (X.rnd(1000) / 1000);
      const inc = INCIDENTS.find(([p]) => { roll -= p; return roll < 0; });
      if (inc) {
        const e = inc[2];
        if (e.happy) c.stats.happy = X.clampStat(c.stats.happy + e.happy);
        if (e.health) c.stats.health = X.clampStat(c.stats.health + e.health);
        if (e.power) c.stats.power = X.clampStat(c.stats.power + e.power);
        if (e.money) c.stats.money += e.money;
        if (e.flirt) c.relations.push({ name: `Urlaubsflirt aus ${t.city}`, kind: 'Fernbeziehung?', val: 55 });
        txt += ` ${inc[1]}`;
      }
      X.report(S, pid, '•', txt, inc && inc[2].happy < 0 ? 'bad' : 'good');
      swapEvent(S, pid, t.city, t.country, 'trip');
      c.chronicle.push({ d: X.dateText(S), t: `Reise: ${t.title}.` });
      X.log(S, `${c.name} fliegt weg: ${t.city}.`);
      return null;
    }
    if (a.type === 'wGo') return go(S, pid, a, X);
    return 'Unbekannt.';
  }
  // Folgen einer Reise je nach Ferien, Urlaubstagen oder Schwänzen
  function consequences(S, pid, c, T, X) {
    if (T.kind === 'ferien') return `Ferien: ${T.text}.`;
    if (T.kind === 'urlaub') { c.vac.left -= T.work; return `${T.work} Urlaubstage genommen, noch ${c.vac.left} übrig.`; }
    if (T.kind === 'vorlesung') { c.flags.study = Math.max(0, (c.flags.study || 0) - 1); return 'Vorlesungen verpasst, die Klausurvorbereitung leidet.'; }
    if (T.kind === 'schwaenzen') {
      if (c.abi) { c.abi.absent += T.work; c.abi.blockI = Math.max(200, c.abi.blockI - T.work * 2); }
      if (X.rnd(100) < 30) { c.stats.money -= 300; c.stats.happy = X.clampStat(c.stats.happy - 6); return `Vor den Ferien abgehauen: ${T.work} Fehltage. Kontrolle am Flughafen, die Schule erfährt es: 300 € Bußgeld.`; }
      return `Vor den Ferien abgehauen: ${T.work} unentschuldigte Fehltage. Diesmal fällt es nicht auf.`;
    }
    if (T.kind === 'unbezahlt') {
      const left = c.vac.left, unpaid = T.work - left;
      c.vac.left = 0;
      const lost = Math.round(c.job2.gross / 21 * unpaid);
      c.stats.money -= lost;
      if (X.rnd(100) < 50) { c.job2.warnings = (c.job2.warnings || 0) + 1; return `Urlaub aufgebraucht: ${unpaid} Tage unbezahlt (−${X.eur(lost)}) und eine Abmahnung.`; }
      return `Urlaub aufgebraucht: ${unpaid} Tage unbezahlt (−${X.eur(lost)}).`;
    }
    return '';
  }
  // Ausflug: auf der Karte irgendwohin fahren (einmal pro Runde), Treffen mit anderen am selben Ort
  function go(S, pid, a, X) {
    const c = S.chars[pid];
    if (c.prison) return 'Du sitzt im Gefängnis.';
    const lat = Number(a.lat), lng = Number(a.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) return 'Da kann man nicht hin.';
    if (c.flags.goAt === S.round) return 'Diese Runde warst du schon unterwegs.';
    if (c.away && c.away.kind === 'trip' && c.away.until > S.round) return `Du bist gerade in ${c.away.city}. Ausflüge gehen erst wieder nach der Reise.`;
    const from = c.home && c.home.lat ? c.home : { lat: 51.4, lng: 6.8 }, to = { lat, lng }, d = km(from, to);
    let how, cost;
    if (d > 900) { how = 'Flug'; cost = Math.round(120 + d * 0.09); }
    else if (c.car && c.license && c.license.has) { how = `mit dem ${c.car.brand}`; cost = Math.round(d * 2 * (c.car.fuel === 'E' ? 0.07 : 0.14)); }
    else { how = d < 25 ? 'mit Bus und Bahn (Deutschlandticket)' : 'mit dem Zug'; cost = d < 25 ? 0 : Math.round(Math.min(160, d * 2 * 0.12)); }
    if (c.stats.money + c.bank.dispo < cost) return `Die Fahrt kostet ${X.eur(cost)}. Das hast du nicht.`;
    const label = X.cleanText(a.label || '', 60) || nearestName(to) || 'irgendwo';
    c.stats.money -= cost;
    c.flags.goAt = S.round;
    c.away = { city: label, label, lat, lng, until: S.round + 1, kind: 'go' };
    c.stats.happy = X.clampStat(c.stats.happy + (d < 25 ? 2 : d < 300 ? 4 : 6));
    let txt = `Ausflug nach ${label} (${Math.round(d)} km, ${how}${cost ? `, −${X.eur(cost)}` : ''}).`;
    // Wer ist auch da? (andere unterwegs oder zu Hause in der Nähe)
    Object.entries(S.chars).forEach(([oid, o]) => {
      if (oid === pid || o.dead) return;
      const op = o.away && o.away.until > S.round ? o.away : o.home;
      if (!op || !Number.isFinite(op.lat) || km(op, to) > 20) return;
      c.stats.happy = X.clampStat(c.stats.happy + 4); o.stats.happy = X.clampStat(o.stats.happy + 4);
      const r1 = c.relations.find((r) => r.name === o.name); if (r1) r1.val = Math.min(100, r1.val + 6); else c.relations.push({ name: o.name, kind: 'trifft sich', val: 55 });
      const r2 = o.relations.find((r) => r.name === c.name); if (r2) r2.val = Math.min(100, r2.val + 6); else o.relations.push({ name: c.name, kind: 'trifft sich', val: 55 });
      txt += ` Du triffst ${o.name}! Ihr verbringt den Tag zusammen.`;
      X.report(S, oid, '•', `${c.name} kommt in ${label} vorbei. Ihr verbringt den Tag zusammen.`, 'good');
    });
    X.report(S, pid, '•', txt, 'good');
    if (d > 40 && X.rnd(100) < 50) swapEvent(S, pid, label, '', 'go');
    return null;
  }
  // April erzählt ab jetzt vom Reiseort: das Ereignis dieser Runde wird getauscht (solange noch nicht entschieden)
  function swapEvent(S, pid, place, country, kind) {
    const D = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
    if (!D || !D.travelCard || S.actions[pid]) return;
    const card = D.travelCard(S, pid, place, country, kind);
    if (S.gm === 'builtin') { S.cards[pid] = card; if (S.picks) delete S.picks[pid]; S.events[pid] = card.text; }
    else S.events[pid] = `Du bist gerade in ${place}${country ? ` (${country})` : ''}. ${card.text} Was machst du?`;
  }
  function nearestName(p) {
    let best = null, bd = 1e9;
    const MKT = root.DULI_LARP_MARKET || (isNode ? require('./larp-market') : null);
    const all = allCities().concat(MKT ? MKT.cities() : []);
    all.forEach((x) => { if (!Number.isFinite(x.lat)) return; const d = km(p, x); if (d < bd) { bd = d; best = x.name; } });
    return best && bd < 60 ? best : null;
  }

  // Leben im Ausland: Gehalt und Lebenshaltung passen sich an
  function livingAbroad(c) { if (!c.abroad) return 0; const K = country(c.abroad); return Math.round(950 * (Math.min(1.8, Math.max(0.35, K.sal * 0.9 + 0.1)) - 1)); }

  const WORLD = { COUNTRIES, get UNIS() { return UNIS; }, country, cities: allCities, cityOf, price, unisIn, programs, abroad, findProgram, travel, act, livingAbroad, addData, needGrade, holidayIn, tripStatus, vacation, km, SCHOOL_HOLIDAYS };
  if (isNode) module.exports = WORLD;
  else root.DULI_LARP_WORLD = WORLD;
})(typeof window !== 'undefined' ? window : globalThis);
