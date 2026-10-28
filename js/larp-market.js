// DULIDAN LARP EXTREME – Markt: Wohnungen, Häuser, Autos, Studium, Ausbildung, Jobs, Kleinanzeigen.
// Anzeigen werden aus echten Städten, Straßen (OpenStreetMap) und Hochschulen (Wikidata) erzeugt – ohne Hausnummern.
// Jeder Monat hat ein eigenes Angebot (fester Zufall aus Spiel-Seed, Stadt und Monat), damit alle dasselbe sehen.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const DB = root.DULI_LARP_DB || (isNode ? require('./larp-db') : null);
  const DATA = { cities: [], unis: [], schools: [], streets: {} };
  if (isNode) {
    const fs = require('fs'), path = require('path');
    ['cities', 'unis', 'schools', 'streets'].forEach((k) => { try { DATA[k] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'larp', `${k}.json`), 'utf8')); } catch (e) { /* ohne Daten */ } });
  }

  // ---------- fester Zufall ----------
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngOf(...parts) {
    let a = hash(parts.join('|'));
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pickR = (r, a) => a[Math.floor(r() * a.length)];
  const between = (r, lo, hi) => lo + r() * (hi - lo);
  const round = (v, s) => Math.round(v / s) * s;
  const idx = (d) => d.y * 12 + d.m;

  // ---------- Städte ----------
  const FALLBACK_CITIES = Object.keys(DB.CITY_PRICES).map((n) => ({ name: n, st: guessState(n), pop: 0 }));
  function guessState(n) {
    if (/Duisburg|Oberhausen|Mülheim|Essen|Bochum|Dortmund|Gelsenkirchen|Moers|Dinslaken|Krefeld|Düsseldorf|Köln|Bonn|Münster|Aachen|Wuppertal|Bielefeld|Paderborn|Siegen/.test(n)) return 'NW';
    if (/Öhringen|Künzelsau|Zweiflingen|Neuenstein|Pfedelbach|Bretzfeld|Schwäbisch Hall|Heilbronn|Neckarsulm|Stuttgart|Ludwigsburg|Heidelberg|Mannheim|Karlsruhe|Tübingen|Freiburg|Ulm|Konstanz|Reutlingen|Esslingen|Pforzheim|Offenburg|Furtwangen/.test(n)) return 'BW';
    if (/München|Nürnberg|Regensburg|Augsburg|Würzburg|Erlangen|Bamberg|Passau|Bayreuth|Ingolstadt|Kempten|Rosenheim|Landshut/.test(n)) return 'BY';
    return { Berlin: 'BE', Hamburg: 'HH', 'Frankfurt am Main': 'HE', Darmstadt: 'HE', Marburg: 'HE', Gießen: 'HE', Kassel: 'HE', Leipzig: 'SN', Dresden: 'SN', Chemnitz: 'SN', Hannover: 'NI', Göttingen: 'NI', Osnabrück: 'NI', Oldenburg: 'NI', Braunschweig: 'NI', Lüneburg: 'NI', Bremen: 'HB', Mainz: 'RP', Trier: 'RP', Koblenz: 'RP', Kiel: 'SH', Flensburg: 'SH', Jena: 'TH', Erfurt: 'TH', Magdeburg: 'ST', 'Halle (Saale)': 'ST', Rostock: 'MV', Greifswald: 'MV', Potsdam: 'BB', Saarbrücken: 'SL' }[n] || 'NW';
  }
  function cities() { return DATA.cities.length ? DATA.cities : FALLBACK_CITIES; }
  function city(name) {
    const c = cities().find((x) => x.name === name) || FALLBACK_CITIES.find((x) => x.name === name);
    if (c) return c;
    return { name, st: guessState(name), pop: 0, lat: 51.43, lng: 6.76 };
  }
  const GENERIC_STREETS = ['Hauptstraße', 'Bahnhofstraße', 'Schulstraße', 'Gartenstraße', 'Bergstraße', 'Lindenstraße', 'Kirchstraße', 'Ringstraße', 'Goethestraße', 'Schillerstraße', 'Am Markt', 'Mozartstraße', 'Friedhofstraße', 'Waldweg', 'Rosenweg', 'Amselweg', 'Feldstraße', 'Mühlenweg', 'Industriestraße', 'Parkstraße'];
  function streetsOf(c) {
    const s = DATA.streets[`${c.name}|${c.st}`] || DATA.streets[Object.keys(DATA.streets).find((k) => k.startsWith(`${c.name}|`)) || ''];
    if (s && s.s && s.s.length) return s;
    return { s: GENERIC_STREETS.map((n, i) => [n, (c.lat || 51.4) + Math.sin(i) * 0.02, (c.lng || 6.8) + Math.cos(i) * 0.03, 1]), q: [] };
  }
  function nearestQuarter(st, lat, lng) {
    let best = null, bd = 1e9;
    (st.q || []).forEach((q) => { const d = (q.lat - lat) ** 2 + (q.lng - lng) ** 2; if (d < bd) { bd = d; best = q.n; } });
    return best && bd < 0.0009 ? best : '';
  }

  // ---------- Namen ----------
  const SURNAMES = ['Krämer', 'Albers', 'Becker', 'Schulte', 'Yılmaz', 'Wolff', 'Hoffmann', 'Kowalski', 'Nguyen', 'Brandt', 'Demir', 'Lange', 'Vogel', 'Haddad', 'Fischer', 'Kaya', 'Neumann', 'Popescu', 'Schreiber', 'Winkler', 'Özdemir', 'Hartmann', 'Ritter', 'Jansen'];
  const FIRSTN = ['Dieter', 'Sabine', 'Murat', 'Petra', 'Jürgen', 'Aylin', 'Klaus', 'Monika', 'Sven', 'Ivana', 'Ralf', 'Gabi', 'Kevin', 'Jacqueline', 'Uwe', 'Leyla', 'Torsten', 'Natascha'];
  const FIRMS = ['{n} GmbH', '{n} & Söhne', 'Autohaus {n}', 'Stadtwerke {c}', 'Klinikum {c}', 'Bäckerei {n}', 'Elektro {n}', '{n} Logistik', 'IT-Systemhaus {n}', 'Kanzlei {n}', 'Hotel {n}hof', '{c}er Maschinenbau', '{n} Immobilien', 'Pflegedienst {n}', 'Agentur {n}', 'Spedition {n}', 'Supermarkt {n}', 'Werkstatt {n}', 'Steuerbüro {n}', 'Gasthaus Zur Post', 'Verkehrsbetriebe {c}', 'Stadtverwaltung {c}'];
  const firm = (r, c) => pickR(r, FIRMS).replace('{n}', pickR(r, SURNAMES)).replace('{c}', c.name.split(' ')[0]);

  // ---------- Wohnen ----------
  const EXTRAS = ['Balkon', 'Einbauküche', 'Aufzug', 'Keller', 'Stellplatz', 'Garten', 'Badewanne', 'Gäste-WC', 'Fußbodenheizung', 'Dachterrasse', 'frisch renoviert', 'Altbau mit Stuck', 'Fernwärme', 'Glasfaser'];
  const FLAWS = ['Schimmel im Bad (laut Vormieter „nur ein bisschen“)', 'Nachbar übt Schlagzeug', 'Direkt an der Bahnstrecke', '5. Stock ohne Aufzug', 'Fenster von 1974', 'Heizung macht Geräusche', 'Vermieter wohnt im Haus und guckt', 'Kein Handyempfang im Schlafzimmer'];
  const ENERGY = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  function housing(S, cityName, mIdx, cat) {
    const c = city(cityName), pr = DB.cityPrice(c.name, c.st, c.pop), st = streetsOf(c);
    const r = rngOf(S.market.seed, 'h', cat, c.name, mIdx);
    const n = cat === 'wg' ? 6 : cat === 'house' ? 5 : 8;
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = st.s[Math.floor(r() * st.s.length)];
      const year = Math.round(between(r, 1900, 2025)), en = ENERGY[Math.min(8, Math.max(0, Math.floor((2026 - year) / 14 + between(r, -1, 1.5))))];
      const extras = EXTRAS.filter(() => r() < 0.22).slice(0, 4), flaw = r() < 0.35 ? pickR(r, FLAWS) : '';
      const quality = 1 + (year > 2010 ? 0.18 : year < 1960 ? -0.08 : 0) + extras.length * 0.025 - (flaw ? 0.06 : 0) + between(r, -0.12, 0.14);
      const quarter = nearestQuarter(st, s[1], s[2]);
      const base = { id: `${cat}:${c.name}:${mIdx}:${i}`, cat, city: c.name, st: c.st, street: s[0], quarter, lat: s[1] + between(r, -0.002, 0.002), lng: s[2] + between(r, -0.002, 0.002), year, energy: en, extras, flaw, landlord: `${pickR(r, ['Frau', 'Herr'])} ${pickR(r, SURNAMES)}` };
      if (cat === 'wg') {
        const m2 = Math.round(between(r, 11, 22)), cold = round(m2 * pr.rent * 1.35 * quality, 5);
        out.push(Object.assign(base, { title: `WG-Zimmer, ${m2} m², ${pickR(r, ['3er-WG', '4er-WG', 'Zweck-WG', 'Studi-WG', 'Berufstätigen-WG'])}`, rooms: 1, m2, cold, nk: round(between(r, 60, 120), 5), heat: 0, deposit: cold * 2, mates: Math.ceil(between(r, 1, 4)), vibe: pickR(r, ['Putzplan wird eingehalten', 'Kühlschrank ist Krieg', 'Jeden Freitag Party', 'Alle arbeiten, alle schlafen', 'Mitbewohnerin hat eine Schlange']) }));
      } else if (cat === 'flat') {
        const rooms = pickR(r, [1, 1.5, 2, 2, 2.5, 3, 3, 4]), m2 = Math.round(rooms * between(r, 24, 32) + 8), cold = round(m2 * pr.rent * quality, 5);
        const scam = r() < 0.07;
        out.push(Object.assign(base, { title: `${rooms}-Zimmer-Wohnung, ${m2} m²${extras[0] ? `, ${extras[0]}` : ''}`, rooms, m2, cold: scam ? round(cold * 0.55, 5) : cold, nk: round(m2 * between(r, 2.2, 3.3), 5), heat: round(m2 * between(r, 0.9, 1.6), 5), deposit: (scam ? round(cold * 0.55, 5) : cold) * 3, scam, floor: Math.floor(between(r, 0, 6)) }));
      } else if (cat === 'buyflat' || cat === 'house') {
        const isH = cat === 'house', rooms = isH ? pickR(r, [4, 4.5, 5, 6, 7]) : pickR(r, [1, 2, 2, 3, 3, 4]);
        const m2 = Math.round(isH ? rooms * between(r, 24, 34) : rooms * between(r, 26, 33) + 6), plot = isH ? Math.round(between(r, 220, 900)) : 0;
        const price = round(m2 * pr.buy * quality * (isH ? 1.08 : 1) + plot * pr.buy * 0.09, 1000);
        out.push(Object.assign(base, { title: isH ? `${pickR(r, ['Einfamilienhaus', 'Doppelhaushälfte', 'Reihenhaus', 'Bungalow', 'Stadtvilla'])}, ${m2} m², ${plot} m² Grundstück` : `Eigentumswohnung ${rooms} Zimmer, ${m2} m²`, rooms, m2, plot, price, hausgeld: isH ? 0 : round(m2 * between(r, 2.8, 4.2), 5), rentEst: round(m2 * pr.rent * quality, 5), courtage: r() < 0.7 ? 3.57 : 0 }));
      }
    }
    return out;
  }

  // ---------- Autos ----------
  const DEFECTS = ['Zahnriemen fällig', 'Kupplung rutscht', 'Rost an den Schwellern', 'Klimaanlage tot', 'Ölverlust', 'Bremsen runter', 'Unfallschaden (verschwiegen)', 'Tacho zurückgedreht', 'Turbolader pfeift'];
  function carValue(newPrice, age, km) { return Math.max(400, newPrice * Math.pow(0.84, Math.min(age, 4)) * Math.pow(0.91, Math.max(0, age - 4)) * Math.max(0.35, 1 - km / 400000)); }
  function cars(S, cityName, mIdx) {
    const c = city(cityName), r = rngOf(S.market.seed, 'car', c.name, mIdx), out = [];
    const yNow = Math.floor(mIdx / 12);
    for (let i = 0; i < 12; i++) {
      const isNew = i < 3, m = DB.CARS[Math.floor(r() * DB.CARS.length)];
      const [brand, model, cls, np, ps, fuel, cons, tk] = m;
      if (isNew) { out.push({ id: `car:${c.name}:${mIdx}:${i}`, cat: 'car', brand, model, cls, ps, fuel, cons, tk, year: yNow, km: 10, price: round(np * between(r, 0.88, 1.0), 100), newPrice: np, tuv: 36, seller: `Autohaus ${pickR(r, SURNAMES)}`, dealer: true, isNew: true, defect: '', city: c.name }); continue; }
      const age = Math.floor(between(r, 1, 18)), km = Math.round(age * between(r, 7000, 19000) / 1000) * 1000;
      const val = carValue(np, age, km), dealer = r() < 0.45;
      const defect = r() < (dealer ? 0.15 : 0.32) ? pickR(r, DEFECTS) : '';
      out.push({ id: `car:${c.name}:${mIdx}:${i}`, cat: 'car', brand, model, cls, ps, fuel, cons, tk, year: yNow - age, km, price: round(val * (dealer ? 1.12 : 0.97) * between(r, 0.9, 1.1), 50), newPrice: np, tuv: Math.floor(between(r, 0, 24)), seller: dealer ? `${pickR(r, ['Autohaus', 'Autohandel', 'Car Center'])} ${pickR(r, SURNAMES)}` : `Privat (${pickR(r, FIRSTN)})`, dealer, defect, city: c.name, note: dealer ? 'Mit 12 Monaten Gewährleistung' : pickR(r, ['Scheckheftgepflegt, Nichtraucher', 'Muss weg, Umzug', 'Läuft. Fragen Sie nicht.', 'Letzte Preis!!!', 'Von Opa, nur sonntags gefahren']) });
    }
    return out.sort((a, b) => a.price - b.price);
  }
  // Monatliche Autokosten: Versicherung (Fahranfänger teuer), Steuer, Sprit/Strom
  function carCosts(S, ch, car) {
    const yrs = ch.license.has ? Math.max(0, Math.floor((idx(S.date) - ch.license.since) / 12)) : 0;
    const sf = Math.max(0.35, 1.9 - yrs * 0.18);
    const ins = Math.round([45, 60, 80, 110, 170][car.tk - 1] * sf * (car.isNew || car.year >= S.date.y - 3 ? 1.35 : 1));
    const tax = car.fuel === 'E' ? 0 : Math.round(car.ps * (car.fuel === 'D' ? 0.65 : 0.35) / 12 + 3);
    const km = 1000, energy = car.fuel === 'E' ? km / 100 * car.cons * 0.38 : km / 100 * car.cons * (car.fuel === 'D' ? S.econ.fuel - 0.08 : S.econ.fuel);
    return { ins, tax, energy: Math.round(energy), total: ins + tax + Math.round(energy) };
  }

  // ---------- Studium ----------
  function unisIn(cityName) {
    if (DATA.unis.length) return DATA.unis.filter((u) => u.city === cityName && u.kind !== 'spezial');
    const c = city(cityName);
    return c && DB.CITY_PRICES[cityName] && (c.pop || 1) ? [{ id: `u-${cityName}`, name: `Universität ${cityName}`, kind: 'uni', city: cityName, st: c.st, students: 20000 }, { id: `h-${cityName}`, name: `Hochschule ${cityName}`, kind: 'fh', city: cityName, st: c.st, students: 8000 }] : [];
  }
  function programs(S, u, mIdx) {
    const r = rngOf('prog', u.id), yr = rngOf(S.market.seed, 'nc', u.id, Math.floor(mIdx / 12));
    const big = u.students > 25000 ? 1 : 0;
    return DB.STUDIES.filter(([, , , , kinds]) => kinds.split(' ').includes(u.kind)).filter(() => r() < (u.kind === 'uni' ? 0.45 + big * 0.25 : 0.55)).map(([name, field, nc, sem, , salary], i) => {
      let n = nc ? nc - big * 0.15 + between(yr, -0.25, 0.25) : yr() < 0.2 ? Math.round(between(yr, 2.4, 3.2) * 10) / 10 : 0;
      if (n) n = Math.max(1.0, Math.round(n * 10) / 10);
      return { id: `uni:${u.id}:${i}:${name}`, cat: 'uni', uni: u.name, uniId: u.id, kind: u.kind, city: u.city, st: u.st, name, field, nc: n, sem, salary, fee: u.kind === 'privat' ? DB.PRIVATE_FEE : 0, semFee: DB.SEMESTER_FEE[u.st] || DB.SEMESTER_FEE.def, medicine: field === 'Medizin' };
    });
  }

  // ---------- Ausbildung und Jobs ----------
  function training(S, cityName, mIdx) {
    const c = city(cityName), r = rngOf(S.market.seed, 'tr', c.name, mIdx), out = [];
    for (let i = 0; i < 9; i++) {
      const t = DB.TRAINING[Math.floor(r() * DB.TRAINING.length)];
      const [name, area, years, pay, req, after] = t;
      out.push({ id: `tr:${c.name}:${mIdx}:${i}`, cat: 'training', name, area, years, pay: pay.map((p) => round(p * between(r, 0.95, 1.08), 10)), req, after, firm: firm(r, c), city: c.name, st: c.st, startM: area === 'Verwaltung' ? 8 : 7 });
    }
    return out;
  }
  function jobs(S, cityName, mIdx) {
    const c = city(cityName), r = rngOf(S.market.seed, 'job', c.name, mIdx), out = [];
    for (let i = 0; i < 11; i++) {
      const j = DB.JOBS[Math.floor(r() * DB.JOBS.length)];
      const [name, req, gross, hours, area] = j;
      out.push({ id: `job:${c.name}:${mIdx}:${i}`, cat: 'job', name, req, gross: round(gross * (gross > 700 ? between(r, 0.93, 1.12) : 1), 10), hours, area, firm: firm(r, c), city: c.name, st: c.st, kind: gross <= DB.TAX.minijob ? 'mini' : req === 'st' ? 'werk' : 'voll' });
    }
    return out;
  }
  // Kleinanzeigen: von April erfundene Sachen plus Angebote der Spieler
  const STUFF = [['PlayStation 5', 330], ['Gaming-PC (RTX)', 900], ['iPhone (2 Jahre alt)', 420], ['E-Bike', 1300], ['Sofa (Katzenhaare inklusive)', 120], ['Kühlschrank', 150], ['Waschmaschine', 180], ['Bett 140×200', 90], ['Rennrad', 450], ['Gitarre', 160], ['Schreibtisch', 60], ['Mikrowelle', 25], ['Hantelset', 70], ['Kaffeevollautomat', 220], ['Fernseher 55 Zoll', 350], ['Lehrbücher fürs Studium', 40]];
  function ads(S, cityName, mIdx) {
    const c = city(cityName), r = rngOf(S.market.seed, 'ad', c.name, mIdx), out = [];
    for (let i = 0; i < 6; i++) { const [n, p] = pickR(r, STUFF); out.push({ id: `ad:${c.name}:${mIdx}:${i}`, cat: 'ad', name: n, price: round(p * between(r, 0.6, 1.3), 5), seller: `${pickR(r, FIRSTN)} (Privat)`, city: c.name, scam: r() < 0.08 }); }
    return out.concat((S.market.ads || []).filter((a) => !a.sold));
  }

  function list(S, cat, cityName, mIdx) {
    mIdx = mIdx == null ? idx(S.date) : mIdx;
    let l;
    if (cat === 'flat' || cat === 'wg' || cat === 'buyflat' || cat === 'house') l = housing(S, cityName, mIdx, cat);
    else if (cat === 'car') l = cars(S, cityName, mIdx);
    else if (cat === 'uni') l = unisIn(cityName).flatMap((u) => programs(S, u, mIdx));
    else if (cat === 'training') l = training(S, cityName, mIdx);
    else if (cat === 'job') l = jobs(S, cityName, mIdx);
    else if (cat === 'ad') l = ads(S, cityName, mIdx);
    else l = [];
    return l.map((x) => Object.assign(x, { taken: !!S.market.taken[x.id] }));
  }
  function find(S, id) {
    const [cat, cityName, mIdx] = String(id).split(':');
    if (cat === 'uni') { const u = (DATA.unis.length ? DATA.unis : unisIn(String(id).split(':')[1].replace(/^[uh]-/, ''))).find((x) => x.id === cityName); return u ? programs(S, u, idx(S.date)).find((p) => p.id === id) : null; }
    if (cat === 'pad') return (S.market.ads || []).find((a) => a.id === id) || null;
    const all = list(S, cat === 'flat' || cat === 'wg' || cat === 'buyflat' || cat === 'house' ? cat : cat === 'tr' ? 'training' : cat, cityName, Number(mIdx));
    return all.find((x) => x.id === id) || null;
  }

  // ---------- Qualifikation ----------
  function quals(c) {
    const q = new Set(['-']);
    if (c.flags.abi || /Abitur \(|Fachhochschulreife|Mittlerer/.test(c.education)) q.add('r');
    if (c.flags.abi) q.add('a');
    if (c.flags.trained) q.add('z');
    if (c.flags.bachelor) { q.add('b'); q.add('z'); }
    if (c.flags.master) { q.add('m'); q.add('b'); q.add('z'); }
    if (c.edu.kind === 'uni') q.add('st');
    if (c.license.has) q.add('fs');
    if (c.edu.kind === 'school') q.add('r');
    return q;
  }

  // ---------- Aktionen ----------
  function act(S, pid, a, X) {
    const c = S.chars[pid];
    if (!c || c.dead) return 'Deine Figur lebt nicht mehr.';
    if (S.phase !== 'act') return 'Der Markt hat nur offen, während ihr plant.';
    const x = a.id ? find(S, a.id) : null;
    if (a.id && !x) return 'Die Anzeige gibt es nicht mehr.';
    if (x && x.taken && a.type !== 'mSellAd') return 'Schon weg. Jemand war schneller.';
    switch (a.type) {
      case 'mRent': return rent(S, pid, c, x, X);
      case 'mBuyHome': return buyHome(S, pid, c, x, a, X);
      case 'mMoveIn': return moveIn(S, pid, c, a, X);
      case 'mLease': return leaseOut(S, pid, c, a, X);
      case 'mSellHome': return sellHome(S, pid, c, a, X);
      case 'mCar': return buyCar(S, pid, c, x, a, X);
      case 'mSellCar': return sellCar(S, pid, c, X);
      case 'mApply': return apply(S, pid, c, x, X);
      case 'mQuit': return quit(S, pid, c, X);
      case 'mAd': return buyAd(S, pid, c, x, X);
      case 'mSellAd': return sellAd(S, pid, c, a, X);
      case 'mMoveHome': return moveHome(S, pid, c, X);
    }
    return 'Unbekannte Markt-Aktion.';
  }
  const canPay = (c, amt) => c.stats.money + c.bank.dispo >= amt;
  const netIncome = (c) => (c.job2 ? DB.net(c.job2.gross, c.job2.kind) : 0) + c.effects.filter((e) => e.pm > 0).reduce((s, e) => s + e.pm, 0);
  function endRent(c, months, S) {
    c.effects.forEach((e) => { if (e.rent && !e.until) e.until = S.round + 1 + months; });
  }
  function rent(S, pid, c, x, X) {
    if (!/^(flat|wg)$/.test(x.cat)) return 'Das kann man nicht mieten.';
    const warm = x.cold + x.nk + x.heat;
    if (!canPay(c, x.deposit + (x.scam ? 0 : 0))) return `Für die Kaution brauchst du ${X.eur(x.deposit)}.`;
    if (x.scam) {
      // Vorkasse-Betrug: Kaution weg, Wohnung gibt es nicht
      c.stats.money -= x.deposit;
      S.market.taken[x.id] = pid;
      X.report(S, pid, '🕳', `Du überweist ${X.eur(x.deposit)} Kaution vorab an „${x.landlord}“. Die Nummer ist danach tot. Die Wohnung hat nie existiert.`, 'bad');
      c.chronicle.push({ d: X.dateText(S), t: `Auf einen Wohnungsbetrug reingefallen (−${X.eur(x.deposit)}).` });
      return null;
    }
    // Vermieter prüft: SCHUFA, Einkommen (oder Bürgschaft der Eltern)
    const inc = netIncome(c), ok = c.bank.schufa >= 60 && (inc >= warm * 2.2 || (c.age <= 25 && X.rnd(100) < 60) || x.cat === 'wg');
    if (!ok) { S.market.taken[x.id] = 'other'; return `${x.landlord} hat sich für jemand anderen entschieden. Zu wenig Einkommen oder SCHUFA zu schlecht.`; }
    S.market.taken[x.id] = pid;
    c.stats.money -= x.deposit;
    c.bank.deposit = (c.bank.deposit || 0) + x.deposit;
    endRent(c, 3, S);
    c.effects = c.effects.filter((e) => !/keine Miete/.test(e.name));
    const label = `${x.street}${x.quarter ? ` (${x.quarter})` : ''}, ${x.city}`;
    c.effects.push({ id: X.uid('e'), name: `${x.cat === 'wg' ? 'WG-Zimmer' : 'Miete'}: ${label}`, pm: -warm, health: 0, happy: x.flaw ? -2 : 2, power: 0, until: 0, rent: true, locked: true });
    c.housing = { kind: x.cat === 'wg' ? 'wg' : 'rent', label, city: x.city, st: x.st, cold: x.cold, warm, since: X.idx(S.date), landlord: x.landlord, flaw: x.flaw };
    c.living = x.cat === 'wg' ? `wohnt in einer WG in ${x.city}` : `wohnt zur Miete in ${x.city}`;
    c.location = label; c.home = { label, city: x.city, lat: x.lat, lng: x.lng };
    if (!c.flags.living) { c.flags.living = 1; c.effects.push({ id: X.uid('e'), name: 'Lebenshaltung (Essen, Handy, Versicherung …)', pm: -950, health: 0, happy: 0, power: 0, until: 0, locked: true }); }
    X.addAppt(S, c, { kind: 'keys', y: Math.floor((X.idx(S.date) + 1) / 12), m: (X.idx(S.date) + 1) % 12, d: 1, title: `Schlüsselübergabe ${x.street}`, where: x.city, soft: true });
    c.chronicle.push({ d: X.dateText(S), t: `Mietet ${x.title} in ${label}.` });
    X.log(S, `${c.name} mietet in ${x.city} (${X.eur(warm)} warm).`);
    return null;
  }
  function moveHome(S, pid, c, X) {
    endRent(c, 3, S);
    c.housing = { kind: 'family' };
    c.living = 'wohnt wieder bei der Familie';
    c.chronicle.push({ d: X.dateText(S), t: 'Zieht zurück zur Familie.' });
    return null;
  }
  function loanRate(S, c) { const s = c.bank.schufa; return Math.round((S.econ.zins + (s >= 95 ? 0 : s >= 90 ? 0.35 : s >= 80 ? 0.9 : s >= 70 ? 1.8 : 3.2)) * 100) / 100; }
  function buyHome(S, pid, c, x, a, X) {
    if (!/^(buyflat|house)$/.test(x.cat)) return 'Das kann man nicht kaufen.';
    const grest = Math.round(x.price * DB.STATES[x.st].grest / 100), notar = Math.round(x.price * 0.015), gb = Math.round(x.price * 0.005), makler = Math.round(x.price * x.courtage / 100);
    const extra = grest + notar + gb + makler;
    const down = a.finance ? Math.max(extra, Math.round(Number(a.down) || 0)) : x.price + extra;
    if (!canPay(c, down)) return `Du brauchst ${X.eur(down)} (inklusive ${X.eur(extra)} Kaufnebenkosten).`;
    let loan = null;
    if (a.finance) {
      const amount = x.price + extra - down;
      const rate = loanRate(S, c), annuity = Math.round(amount * (rate + 2) / 100 / 12);
      const inc = netIncome(c);
      if (c.bank.schufa < 50) return 'Die Bank lehnt ab: SCHUFA zu schlecht.';
      if (annuity > inc * 0.45 + (a.lease ? x.rentEst * 0.7 : 0)) return `Die Bank lehnt ab: Die Rate von ${X.eur(annuity)} im Monat ist zu hoch für dein Einkommen (${X.eur(inc)} netto).`;
      loan = { id: X.uid('k'), why: x.title, orig: amount, rest: amount, rate, annuity };
      c.bank.loans.push(loan);
    }
    c.stats.money -= down;
    S.market.taken[x.id] = pid;
    const prop = { id: X.uid('p'), kind: x.cat === 'house' ? 'house' : 'flat', label: `${x.street}${x.quarter ? ` (${x.quarter})` : ''}, ${x.city}`, city: x.city, st: x.st, lat: x.lat, lng: x.lng, value: x.price, m2: x.m2, rentMonth: x.rentEst, hausgeld: x.hausgeld, leased: false, tenant: null, bought: X.dateText(S), loan: loan && loan.id, title: x.title };
    c.props.push(prop);
    c.stats.power = X.clampStat(c.stats.power + (x.price > 500000 ? 4 : 2));
    X.report(S, pid, '🏠', `Gekauft: ${x.title} für ${X.eur(x.price)}. Grunderwerbsteuer ${X.eur(grest)}, Notar ${X.eur(notar)}, Grundbuch ${X.eur(gb)}${makler ? `, Makler ${X.eur(makler)}` : ''}${loan ? `. Kredit ${X.eur(loan.orig)} zu ${String(loan.rate).replace('.', ',')} %, Rate ${X.eur(loan.annuity)}` : ''}.`, 'good');
    c.chronicle.push({ d: X.dateText(S), t: `Kauft ${x.title} in ${x.city} für ${X.eur(x.price)}.` });
    X.log(S, `${c.name} kauft für ${X.eur(x.price)} in ${x.city}.`);
    return null;
  }
  function moveIn(S, pid, c, a, X) {
    const p = c.props.find((q) => q.id === a.prop);
    if (!p) return 'Gehört dir nicht.';
    if (p.leased) { p.leased = false; p.tenant = null; }
    endRent(c, 3, S);
    c.housing = { kind: 'own', label: p.label, city: p.city, st: p.st, prop: p.id };
    c.living = `wohnt im eigenen ${p.kind === 'house' ? 'Haus' : 'Zuhause'} in ${p.city}`;
    c.location = p.label; c.home = { label: p.label, city: p.city, lat: p.lat, lng: p.lng };
    c.stats.happy = X.clampStat(c.stats.happy + 6);
    if (!c.flags.living) { c.flags.living = 1; c.effects.push({ id: X.uid('e'), name: 'Lebenshaltung (Essen, Handy, Versicherung …)', pm: -950, health: 0, happy: 0, power: 0, until: 0, locked: true }); }
    c.chronicle.push({ d: X.dateText(S), t: `Zieht ins eigene ${p.kind === 'house' ? 'Haus' : 'Eigentum'} in ${p.city}.` });
    return null;
  }
  const TENANTS = ['Familie Yılmaz', 'Herr Schmidt', 'Frau Kowalski', 'WG Studis', 'Familie Nguyen', 'Herr Becker', 'Frau Öztürk', 'Paar Weber', 'Herr Müller', 'Frau Hoffmann', 'Familie Popescu', 'Rentnerpaar Wagner', 'Azubi Kevin', 'Dr. Fischer'];
  function leaseOut(S, pid, c, a, X) {
    const p = c.props.find((q) => q.id === a.prop);
    if (!p) return 'Gehört dir nicht.';
    if (c.housing.prop === p.id) return 'Du wohnst da selbst.';
    if (p.leased) { p.leased = false; p.tenant = null; X.report(S, pid, '📤', `Vermietung ${p.label} beendet.`); return null; }
    p.leased = true;
    p.tenant = { name: TENANTS[X.rnd(TENANTS.length)], nomad: X.rnd(100) < 7, rent: p.rentMonth };
    X.report(S, pid, '🔑', `${p.tenant.name} zieht in ${p.label} ein. Kaltmiete ${X.eur(p.rentMonth)}.`);
    return null;
  }
  function sellHome(S, pid, c, a, X) {
    const p = c.props.find((q) => q.id === a.prop);
    if (!p) return 'Gehört dir nicht.';
    const loan = c.bank.loans.find((l) => l.id === p.loan);
    const value = Math.round(p.value * (0.92 + X.rnd(18) / 100));
    const fee = Math.round(value * 0.0357), penalty = loan ? Math.round(loan.rest * 0.03) : 0;
    const back = value - fee - (loan ? loan.rest + penalty : 0);
    c.stats.money += back;
    if (loan) c.bank.loans = c.bank.loans.filter((l) => l !== loan);
    c.props = c.props.filter((q) => q !== p);
    if (c.housing.prop === p.id) { c.housing = { kind: 'family' }; c.living = 'sucht gerade eine Bleibe'; }
    X.report(S, pid, '💰', `Verkauft: ${p.label} für ${X.eur(value)}. Makler ${X.eur(fee)}${loan ? `, Kredit abgelöst (${X.eur(loan.rest)} plus ${X.eur(penalty)} Vorfälligkeitsentschädigung)` : ''}. Bleibt: ${X.eur(back)}.`, back >= 0 ? 'good' : 'bad');
    c.chronicle.push({ d: X.dateText(S), t: `Verkauft ${p.label}.` });
    return null;
  }
  function buyCar(S, pid, c, x, a, X) {
    if (x.cat !== 'car') return 'Das ist kein Auto.';
    if (c.car) return 'Du hast schon ein Auto. Erst verkaufen.';
    let price = x.price;
    if (a.haggle) {
      const roll = X.d20() + (c.key === 'justin' ? 5 : 0) + Math.floor(c.stats.power / 30);
      price = roll >= 15 ? Math.round(price * 0.9 / 50) * 50 : roll >= 9 ? Math.round(price * 0.96 / 50) * 50 : price;
      X.report(S, pid, '🤝', roll >= 15 ? `Hart verhandelt: ${X.eur(price)} statt ${X.eur(x.price)}.` : roll >= 9 ? `Ein bisschen runtergehandelt: ${X.eur(price)}.` : 'Der Verkäufer lacht dich aus. Voller Preis.');
    }
    let loan = null;
    if (a.finance) {
      const down = Math.round(price * 0.2), amount = price - down, rate = loanRate(S, c) + 1.5, annuity = Math.round(amount * (rate / 100 / 12) / (1 - Math.pow(1 + rate / 100 / 12, -48)));
      if (!canPay(c, down)) return `Anzahlung: ${X.eur(down)}.`;
      if (annuity > netIncome(c) * 0.3 || c.bank.schufa < 60) return `Die Autobank lehnt ab (Rate ${X.eur(annuity)}).`;
      c.stats.money -= down;
      loan = { id: X.uid('k'), why: `${x.brand} ${x.model}`, orig: amount, rest: amount, rate, annuity, months: 48 };
      c.bank.loans.push(loan);
    } else {
      if (!canPay(c, price)) return `Du brauchst ${X.eur(price)}.`;
      c.stats.money -= price;
    }
    S.market.taken[x.id] = pid;
    c.car = { brand: x.brand, model: x.model, cls: x.cls, ps: x.ps, fuel: x.fuel, cons: x.cons, tk: x.tk, year: x.year, km: x.km, newPrice: x.newPrice, paid: price, defect: x.defect, defectFound: false, bought: X.idx(S.date), loan: loan && loan.id };
    const t = X.idx(S.date) + Math.max(1, x.tuv);
    X.addAppt(S, c, { kind: 'tuv', y: Math.floor(t / 12), m: t % 12, d: 1 + X.rnd(27), title: `TÜV (Hauptuntersuchung) ${x.brand} ${x.model}`, where: 'TÜV', fee: 145 });
    c.stats.happy = X.clampStat(c.stats.happy + (x.ps > 250 ? 14 : 8));
    if (x.ps > 250) c.stats.power = X.clampStat(c.stats.power + 3);
    const k = carCosts(S, c, c.car);
    X.report(S, pid, '🚘', `${x.brand} ${x.model} (${x.year}, ${x.km.toLocaleString('de-DE')} km) gekauft. Laufende Kosten etwa ${X.eur(k.total)} im Monat (Versicherung ${X.eur(k.ins)}, Steuer ${X.eur(k.tax)}, ${x.fuel === 'E' ? 'Strom' : 'Sprit'} ${X.eur(k.energy)}).${c.license.has ? '' : ' Fahren darfst du ohne Führerschein aber nicht.'}`, 'good');
    c.chronicle.push({ d: X.dateText(S), t: `Kauft einen ${x.brand} ${x.model}.` });
    X.log(S, `${c.name} kauft einen ${x.brand} ${x.model} für ${X.eur(price)}.`);
    return null;
  }
  function sellCar(S, pid, c, X) {
    if (!c.car) return 'Du hast kein Auto.';
    const age = S.date.y - c.car.year, val = Math.round(carValue(c.car.newPrice, age, c.car.km) * (c.car.defectFound ? 0.7 : 0.88) / 50) * 50;
    const loan = c.bank.loans.find((l) => l.id === c.car.loan);
    c.stats.money += val - (loan ? loan.rest : 0);
    if (loan) c.bank.loans = c.bank.loans.filter((l) => l !== loan);
    X.report(S, pid, '🚘', `${c.car.brand} ${c.car.model} an einen Händler verkauft: ${X.eur(val)}${loan ? `, davon ${X.eur(loan.rest)} an die Bank` : ''}.`);
    c.appts = c.appts.filter((t) => !(t.kind === 'tuv' && t.status === 'open'));
    c.car = null;
    return null;
  }
  function apply(S, pid, c, x, X) {
    const q = quals(c);
    if (c.appts.some((t) => t.status === 'open' && t.data && t.data.listing === x.id)) return 'Da hast du dich schon beworben.';
    const next = X.idx(S.date) + 1;
    if (x.cat === 'uni') {
      if (!c.flags.abi && !(c.flags.fhr && x.kind !== 'uni')) return 'Für ein Studium brauchst du das Abitur (oder Fachhochschulreife für Fachhochschulen).';
      if (c.edu.kind === 'uni') return 'Du studierst schon. Erst exmatrikulieren.';
      // Bewerbungsschluss 15. Juli fürs Wintersemester, Bescheid im August, Start im Oktober
      const y = S.date.m <= 6 ? S.date.y : S.date.y + 1;
      X.addAppt(S, c, { kind: 'uni-letter', y, m: 7, d: 10 + X.rnd(15), title: `Zulassungsbescheid: ${x.name}`, where: x.uni, data: { listing: x.id, prog: x }, soft: false });
      X.report(S, pid, '📨', `Bewerbung für ${x.name} an der ${x.uni} abgeschickt.${x.nc ? ` NC letztes Jahr: ${String(x.nc).replace('.', ',')}.` : ' Zulassungsfrei.'} Bescheid kommt im August.`);
      return null;
    }
    if (x.cat === 'training') {
      if (!q.has(x.req) && !(x.req === 'h') && !(x.req === 'r' && q.has('a'))) return `Dafür fehlt dir der Abschluss (${x.req === 'a' ? 'Abitur' : 'mittlere Reife'}).`;
      X.addAppt(S, c, { kind: 'interview', y: Math.floor(next / 12), m: next % 12, d: 3 + X.rnd(24), title: `Vorstellungsgespräch: ${x.name} bei ${x.firm}`, where: x.firm, data: { listing: x.id, offer: x } });
      X.report(S, pid, '📨', `Bewerbung als ${x.name} bei ${x.firm} raus. Einladung zum Gespräch nächsten Monat.`);
      return null;
    }
    if (x.cat === 'job') {
      const need = x.req;
      if (need === 'st' && c.edu.kind !== 'uni') return 'Werkstudentenjobs gibt es nur für Studierende.';
      if (need !== '-' && need !== 'st' && !q.has(need)) return `Dafür fehlt dir die Qualifikation (${({ r: 'mittlere Reife', a: 'Abitur', z: 'abgeschlossene Ausbildung', b: 'Bachelor', m: 'Master oder Staatsexamen', fs: 'Führerschein' })[need]}).`;
      X.addAppt(S, c, { kind: 'interview', y: Math.floor(next / 12), m: next % 12, d: 3 + X.rnd(24), title: `Vorstellungsgespräch: ${x.name} bei ${x.firm}`, where: x.firm, data: { listing: x.id, offer: x } });
      X.report(S, pid, '📨', `Bewerbung als ${x.name} bei ${x.firm} raus.`);
      return null;
    }
    return 'Darauf kann man sich nicht bewerben.';
  }
  function quit(S, pid, c, X) {
    if (!c.job2) return 'Du hast keinen Job.';
    X.report(S, pid, '✉', `Gekündigt bei ${c.job2.firm}. Ab nächstem Monat kein Gehalt mehr.`);
    X.endJob(S, c, 'selbst gekündigt');
    return null;
  }
  function buyAd(S, pid, c, x, X) {
    if (x.cat !== 'ad' && x.cat !== 'pad') return 'Das ist keine Kleinanzeige.';
    if (x.owner === pid) return 'Das ist deine eigene Anzeige.';
    if (!canPay(c, x.price)) return `Du brauchst ${X.eur(x.price)}.`;
    c.stats.money -= x.price;
    S.market.taken[x.id] = pid;
    if (x.scam) { X.report(S, pid, '🕳', `„${x.name}“ per PayPal Freunde bezahlt. Paket kommt nie. ${X.eur(x.price)} weg.`, 'bad'); return null; }
    if (x.cat === 'pad') {
      x.sold = true;
      const seller = S.chars[x.owner];
      if (seller) { seller.stats.money += x.price; X.report(S, x.owner, '💸', `${c.name} hat „${x.name}“ für ${X.eur(x.price)} gekauft.`, 'good'); seller.items = (seller.items || []).filter((i) => i !== x.name); }
    }
    c.items = (c.items || []).concat(x.name).slice(-30);
    c.stats.happy = X.clampStat(c.stats.happy + 3);
    X.report(S, pid, '📦', `Gekauft: ${x.name} für ${X.eur(x.price)}.`);
    return null;
  }
  function sellAd(S, pid, c, a, X) {
    const name = X.cleanText(a.name, 60), price = X.num(a.price, 1, 5000000);
    if (!name) return 'Was verkaufst du?';
    S.market.ads = (S.market.ads || []).filter((x) => !x.sold).slice(-30);
    S.market.ads.push({ id: `pad:${X.uid('a')}`, cat: 'pad', name, price, seller: `${c.name} (Mitspieler)`, owner: pid, city: c.home.city || '' });
    return null;
  }

  // ---------- Termine aus dem Markt ----------
  function appt(S, pid, ap, dec, late, X) {
    const c = S.chars[pid], skip = dec.d !== 'go' || late;
    switch (ap.kind) {
      case 'keys': X.report(S, pid, '🔑', `Schlüssel abgeholt: ${c.housing.label || ''}.`); return;
      case 'tuv': {
        if (!c.car) return;
        if (skip) { X.report(S, pid, '⚠', 'TÜV überzogen. Bei einer Kontrolle: Bußgeld. Neuer Termin nächsten Monat.', 'bad'); const t = X.idx(S.date) + S.stepM; X.addAppt(S, c, { kind: 'tuv', y: Math.floor(t / 12), m: t % 12, d: 10, title: ap.title, where: 'TÜV', fee: 145 }); c.flags.tuvLate = 1; return; }
        c.stats.money -= ap.fee;
        let repair = 0;
        if (c.car.defect && !c.car.defectFound) { c.car.defectFound = true; repair = 600 + X.rnd(1800); }
        else if (S.date.y - c.car.year > 8 && X.rnd(100) < 35) repair = 200 + X.rnd(900);
        c.stats.money -= repair;
        X.report(S, pid, '🔧', `TÜV ${repair ? `erst im zweiten Anlauf. Reparatur ${X.eur(repair)}${c.car.defect ? ` (${c.car.defect})` : ''}` : 'ohne Mängel'}. Gebühr ${X.eur(ap.fee)}. Nächster Termin in 2 Jahren.`, repair ? 'bad' : 'good');
        const t = X.idx(S.date) + 24;
        X.addAppt(S, c, { kind: 'tuv', y: Math.floor(t / 12), m: t % 12, d: ap.d, title: ap.title, where: 'TÜV', fee: 145 });
        return;
      }
      case 'interview': {
        const o = ap.data.offer;
        if (skip) { X.report(S, pid, '🚪', `Zum Vorstellungsgespräch bei ${o.firm} nicht erschienen. Die melden sich nie wieder.`, 'bad'); return; }
        const soc = c.key === 'justin' ? 5 : c.key === 'kimberly' ? 3 : 0, roll = X.d20();
        let score = roll + soc + Math.floor(c.stats.power / 25) + (c.flags.grade ? (3 - Number(String(c.flags.grade).replace(',', '.'))) * 2 : 0) + (c.flags.trained ? 2 : 0);
        if (c.key === 'justin' && roll <= 3) score = 0;
        const ok = roll === 20 || (roll !== 1 && score >= (o.cat === 'training' ? 9 : o.req === 'b' || o.req === 'm' ? 12 : 10));
        if (!ok) { X.report(S, pid, '❌', `Absage von ${o.firm} (${o.name}). ${['„Wir haben uns für jemand anderen entschieden.“', '„Leider passt das Profil nicht ganz.“', 'Du hast auf die Frage nach Schwächen „Ich bin zu perfekt“ gesagt.', 'Dein Handy hat im Gespräch geklingelt. Klingelton: Tung Tung Sahur.'][X.rnd(4)]}`, 'bad'); return; }
        if (o.cat === 'training') {
          const y = S.date.m <= o.startM ? S.date.y : S.date.y + 1;
          X.addAppt(S, c, { kind: 'start-training', y, m: o.startM, d: 1, title: `Ausbildungsstart: ${o.name} bei ${o.firm}`, where: o.firm, data: { offer: o } });
          X.report(S, pid, '✅', `Zusage! Ausbildung als ${o.name} bei ${o.firm}, Start am 1. ${X.MONTHS[o.startM]} ${y}.`, 'good');
          return;
        }
        const t = X.idx(S.date) + S.stepM;
        X.addAppt(S, c, { kind: 'start-job', y: Math.floor(t / 12), m: t % 12, d: 1, title: `Erster Arbeitstag: ${o.name}`, where: o.firm, data: { offer: o } });
        X.report(S, pid, '✅', `Zusage als ${o.name} bei ${o.firm}: ${X.eur(o.gross)} brutto, etwa ${X.eur(DB.net(o.gross, o.kind))} netto.`, 'good');
        return;
      }
      case 'start-job': case 'start-training': {
        const o = ap.data.offer;
        if (skip) { X.report(S, pid, '🚪', `Am ersten Tag nicht aufgetaucht. ${o.firm} zieht die Zusage zurück.`, 'bad'); return; }
        if (c.job2 && ap.kind === 'start-job' && o.kind !== 'mini') X.endJob(S, c, 'neuer Job');
        if (ap.kind === 'start-training') {
          c.job2 = { title: `Azubi ${o.name}`, firm: o.firm, gross: o.pay[0], kind: 'azubi', since: X.idx(S.date), training: o, warnings: 0 };
          c.edu = { kind: 'azubi', training: o, start: X.idx(S.date), year: 1 };
          c.flags.path = 'azubi'; c.flags.pathAt = X.idx(S.date);
          c.job = `Azubi ${o.name} bei ${o.firm}`; c.education = `Ausbildung ${o.name} läuft`;
          const end = X.idx(S.date) + Math.round(o.years * 12) - 1;
          X.addAppt(S, c, { kind: 'final-training', y: Math.floor(end / 12), m: end % 12, d: 15, title: `Abschlussprüfung ${o.name}`, where: 'IHK / HWK' });
        } else {
          c.job2 = { title: o.name, firm: o.firm, gross: o.gross, kind: o.kind, since: X.idx(S.date), warnings: 0 };
          if (o.kind !== 'mini' && o.kind !== 'werk') { c.job = `${o.name} bei ${o.firm}`; c.flags.path = c.flags.path || 'job'; }
        }
        if (!c.flags.living && o.kind !== 'mini' && o.kind !== 'werk') { /* Lebenshaltung zahlt man ab Auszug */ }
        X.report(S, pid, '💼', `Erster Tag bei ${o.firm}. ${ap.kind === 'start-training' ? `Vergütung ${X.eur(o.pay[0])} brutto.` : `Gehalt ${X.eur(o.gross)} brutto.`}`, 'good');
        c.chronicle.push({ d: X.dateText(S), t: `${ap.kind === 'start-training' ? 'Beginnt eine Ausbildung' : 'Neuer Job'}: ${o.name} bei ${o.firm}.` });
        return;
      }
      case 'final-training': {
        if (!c.edu || c.edu.kind !== 'azubi') return;
        const o = c.edu.training;
        if (skip) { X.report(S, pid, '🚪', 'Abschlussprüfung geschwänzt. Die Ausbildung verlängert sich um ein halbes Jahr.', 'bad'); const t = X.idx(S.date) + 6; X.addAppt(S, c, { kind: 'final-training', y: Math.floor(t / 12), m: t % 12, d: 15, title: ap.title, where: ap.where }); return; }
        const roll = X.d20(), score = roll + Math.min(6, (c.flags.study || 0)) + (c.key === 'shaquille' && /IT|Medien/.test(o.area) ? 3 : 0);
        if (roll !== 1 && score >= 9) {
          c.flags.trained = 1; c.edu = { kind: 'none', prev: 'azubi' };
          c.education = `Ausbildung ${o.name} abgeschlossen`;
          c.job2 = { title: o.name.replace(/:in|\/-frau|\/-in/, ''), firm: o.firm, gross: o.after, kind: 'voll', since: X.idx(S.date), warnings: 0 };
          c.job = `${o.name} bei ${o.firm}`;
          X.report(S, pid, '🎓', `Ausbildung bestanden! Übernahme bei ${o.firm} mit ${X.eur(o.after)} brutto.`, 'good');
          c.chronicle.push({ d: X.dateText(S), t: `Ausbildung als ${o.name} abgeschlossen.` });
        } else {
          X.report(S, pid, '❌', 'Abschlussprüfung nicht bestanden. Wiederholung in einem halben Jahr.', 'bad');
          const t = X.idx(S.date) + 6; X.addAppt(S, c, { kind: 'final-training', y: Math.floor(t / 12), m: t % 12, d: 15, title: ap.title, where: ap.where });
        }
        return;
      }
      case 'uni-letter': {
        const p = ap.data.prog, grade = Number(String(c.flags.grade || '4,0').replace(',', '.'));
        const wait = c.flags.wait || 0;
        const ok = !p.nc || grade <= p.nc + wait * 0.1 + (p.medicine ? 0 : X.rnd(10) / 100);
        if (!ok) { X.report(S, pid, '📭', `Absage für ${p.name} an der ${p.uni}. Dein Schnitt ${c.flags.grade || '?'}, der NC lag bei ${String(p.nc).replace('.', ',')}.`, 'bad'); c.flags.wait = wait + 1; return; }
        X.addAppt(S, c, { kind: 'start-uni', y: ap.y, m: 9, d: 1, title: `Semesterstart: ${p.name}`, where: p.uni, data: { prog: p } });
        X.report(S, pid, '📬', `ZULASSUNG: ${p.name} an der ${p.uni} (${p.city}). Semesterstart 1. Oktober. Such dir eine Bleibe!`, 'good');
        return;
      }
      case 'start-uni': {
        const p = ap.data.prog;
        if (skip) { X.report(S, pid, '🚪', 'Nicht eingeschrieben. Der Platz ist weg.', 'bad'); return; }
        c.edu = { kind: 'uni', prog: p, start: X.idx(S.date), sem: 1, ects: 0 };
        c.flags.path = 'uni'; c.flags.pathAt = X.idx(S.date);
        c.job = `Student:in ${p.name} (${p.uni})`; c.education = `${p.name} läuft`;
        c.effects.push({ id: X.uid('e'), name: `Semesterbeitrag ${p.uni}${p.fee ? ' plus Studiengebühr' : ''}`, pm: -Math.round(p.semFee / 6) - p.fee, health: 0, happy: 1, power: 0, until: 0, locked: true, uni: true });
        // BAföG bei nicht so reichen Eltern
        if (X.rnd(100) < 45 && c.key !== 'april') c.effects.push({ id: X.uid('e'), name: 'BAföG', pm: 450 + X.rnd(5) * 100, health: 0, happy: 0, power: 0, until: 0, uni: true });
        const g = p.sem * 6 - 1, t = X.idx(S.date) + g;
        X.addAppt(S, c, { kind: 'uni-exams', y: S.date.y + 1, m: 1, d: 10, title: `Klausurenphase (1. Semester)`, where: p.uni });
        X.addAppt(S, c, { kind: 'uni-end', y: Math.floor(t / 12), m: t % 12, d: 20, title: `Abschlussarbeit und Kolloquium: ${p.name}`, where: p.uni });
        c.chronicle.push({ d: X.dateText(S), t: `Beginnt ${p.name} an der ${p.uni}.` });
        X.report(S, pid, '🎒', `Erstsemester an der ${p.uni}. Willkommen in ${p.city}.`, 'good');
        return;
      }
      case 'uni-exams': {
        if (!c.edu || c.edu.kind !== 'uni') return;
        const sem = c.edu.sem;
        const nextIdx = X.idx(S.date) + 6;
        X.addAppt(S, c, { kind: 'uni-exams', y: Math.floor(nextIdx / 12), m: nextIdx % 12, d: 10, title: `Klausurenphase (${sem + 1}. Semester)`, where: c.edu.prog.uni });
        c.edu.sem++;
        if (skip) { X.report(S, pid, '🚪', 'Klausuren geschwänzt. 0 Credits.', 'bad'); return; }
        const roll = X.d20(), score = roll + Math.min(6, (c.flags.study || 0)) + (c.stats.happy > 40 ? 1 : -1);
        const ects = score >= 14 ? 30 : score >= 9 ? 20 : score >= 5 ? 10 : 0;
        c.edu.ects += ects;
        X.report(S, pid, ects >= 30 ? '🟢' : ects ? '🟡' : '🔴', `Klausurenphase: ${ects} von 30 Credits (gesamt ${c.edu.ects}).`, ects >= 20 ? 'good' : 'bad');
        return;
      }
      case 'uni-end': {
        if (!c.edu || c.edu.kind !== 'uni') return;
        const need = c.edu.prog.sem * 30;
        if (c.edu.ects < need * 0.85 || skip) {
          X.report(S, pid, '⏳', `Noch nicht fertig (${c.edu.ects}/${need} Credits). Ein Semester mehr.`, 'bad');
          const t = X.idx(S.date) + 6; X.addAppt(S, c, { kind: 'uni-end', y: Math.floor(t / 12), m: t % 12, d: 20, title: ap.title, where: ap.where });
          c.edu.ects += 15;
          return;
        }
        const p = c.edu.prog, master = /Staatsexamen|Medizin|Lehramt/.test(p.name);
        c.flags.bachelor = 1; if (master) c.flags.master = 1;
        c.edu = { kind: 'none', prev: 'uni' };
        c.effects = c.effects.filter((e) => !e.uni);
        c.education = master ? `Staatsexamen ${p.name}` : `Bachelor ${p.name}`;
        c.job = 'Absolvent:in, sucht Job';
        c.stats.happy = X.clampStat(c.stats.happy + 12); c.stats.power = X.clampStat(c.stats.power + 4);
        X.report(S, pid, '🎓', `${master ? 'Staatsexamen' : 'Bachelor'} in ${p.name} geschafft! Jetzt Jobs mit Abschluss im Markt.`, 'good');
        c.chronicle.push({ d: X.dateText(S), t: `${master ? 'Staatsexamen' : 'Bachelor'} in ${p.name}.` });
        return;
      }
    }
  }

  // ---------- Monatlich: Kredite, Mieter, Auto, Hausgeld ----------
  function month(S, c, pid, X) {
    let inc = 0, out = 0;
    c.bank.loans.forEach((l) => {
      const zins = l.rest * l.rate / 100 / 12, pay = Math.min(l.annuity, l.rest + zins);
      l.rest = Math.max(0, Math.round(l.rest + zins - pay));
      c.stats.money -= pay; out += pay;
      if (l.months) l.months--;
    });
    const done = c.bank.loans.filter((l) => l.rest <= 0);
    done.forEach((l) => X.report(S, pid, '🏦', `Kredit abbezahlt: ${l.why}.`, 'good'));
    c.bank.loans = c.bank.loans.filter((l) => l.rest > 0);
    c.props.forEach((p) => {
      if (p.hausgeld) { c.stats.money -= p.hausgeld; out += p.hausgeld; }
      else { const up = Math.round(p.m2 * 1.1); c.stats.money -= up; out += up; }
      if (p.leased && p.tenant) {
        if (p.tenant.nomad) {
          p.tenant.unpaid = (p.tenant.unpaid || 0) + 1;
          if (p.tenant.unpaid === 2) X.report(S, pid, '😤', `${p.tenant.name} zahlt seit zwei Monaten keine Miete. Mietnomaden. Räumungsklage kostet ${X.eur(2500)} und dauert.`, 'bad');
          if (p.tenant.unpaid >= 6) { c.stats.money -= 2500; out += 2500; X.report(S, pid, '⚖', `Räumung durch. ${p.tenant.name} ist raus, die Wohnung ist verwüstet.`, 'bad'); p.value = Math.round(p.value * 0.96); p.tenant = null; p.leased = false; }
        } else { c.stats.money += p.tenant.rent; inc += p.tenant.rent; }
      }
      p.value = Math.round(p.value * (1 + (S.econ.infl + 0.6) / 1200));
    });
    if (c.car) {
      const k = carCosts(S, c, c.car);
      c.stats.money -= k.total; out += k.total;
      c.car.km += 1000;
      if (c.car.defect && !c.car.defectFound && X.rnd(100) < 4) { c.car.defectFound = true; const rep = 500 + X.rnd(2500); c.stats.money -= rep; out += rep; X.report(S, pid, '💥', `Das Auto zeigt sein wahres Gesicht: ${c.car.defect}. Werkstatt ${X.eur(rep)}.`, 'bad'); }
    }
    // Ausbildung: Lehrjahr steigt
    if (c.edu && c.edu.kind === 'azubi' && c.job2 && c.edu.training) {
      const y = Math.min(c.edu.training.pay.length, 1 + Math.floor((X.idx(S.date) - c.edu.start) / 12));
      c.job2.gross = c.edu.training.pay[y - 1];
    }
    return { inc, out };
  }

  const MARKET = { DATA, hash, rngOf, list, find, cities, city, unisIn, programs, carCosts, carValue, quals, loanRate, act, appt, month, CATS: ['flat', 'wg', 'buyflat', 'house', 'car', 'uni', 'training', 'job', 'ad'] };
  if (isNode) module.exports = MARKET;
  else root.DULI_LARP_MARKET = MARKET;
})(typeof window !== 'undefined' ? window : globalThis);
