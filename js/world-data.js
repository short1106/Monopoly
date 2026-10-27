// DULIDAN WORLD – Weltkarte, Zonen, Städte, Routen, Dulidan-Würfel, Weltnachrichten
(function (root) {
  // Zonen sind die "Farbgruppen": wer alle 3 Städte hat, darf bauen.
  const ZONES = {
    afr: { name: 'Savannen-Studios',     region: 'Afrika',        color: '#c47a45', build: 50 },
    sam: { name: 'Copa Creativa',        region: 'Südamerika',    color: '#5fd0ff', build: 50 },
    lat: { name: 'Latino Loop',          region: 'Mittelamerika', color: '#ff8a2a', build: 100 },
    ind: { name: 'Bollywood Branding',   region: 'Indien',        color: '#ffd83a', build: 100 },
    mid: { name: 'Wüsten-Wolkenkratzer', region: 'Nahost',        color: '#ff3348', build: 150 },
    oce: { name: 'Down Under Design',    region: 'Ozeanien',      color: '#2ad4c0', build: 150 },
    asi: { name: 'Neo-Asia Render',      region: 'Ostasien',      color: '#2fe08a', build: 200 },
    naw: { name: 'Westcoast Pixels',     region: 'Nordamerika',   color: '#4a6bff', build: 200 },
    nae: { name: 'Eastcoast Empire',     region: 'Nordamerika',   color: '#a78bff', build: 250 },
    eur: { name: 'Pott-Heimat',          region: 'Europa',        color: '#da29cf', build: 250 },
  };

  // lon/lat sind Anzeige-Koordinaten (teils auseinandergezogen, damit nichts klebt)
  const c = (id, name, real, zone, price, lon, lat, hub, quip) => ({ id, name, real, zone, price, lon, lat, hub: !!hub, quip });
  const CITIES = [
    c('lag', 'Lagos Lights', 'Lagos', 'afr', 60, 3.4, 6.5, true, 'Lagos! Hier ist es lauter als in meinem Kopf.'),
    c('nbo', 'Nairobi Render-Hub', 'Nairobi', 'afr', 60, 36.8, -1.3, false, 'Nairobi: Safari am Morgen, Rendern am Abend.'),
    c('cpt', 'Cape Pixel', 'Kapstadt', 'afr', 80, 18.4, -33.9, false, 'Kapstadt. Tafelberg, Pinguine, Pixel. Perfekt.'),
    c('lim', 'Lima Loop', 'Lima', 'sam', 100, -77, -12, false, 'Lima: Ceviche zum Frühstück. Mutig.'),
    c('bue', 'Buenos Dulis', 'Buenos Aires', 'sam', 100, -58.4, -34.6, false, 'Buenos Dulis! Tango tanzen, Miete kassieren.'),
    c('sao', 'São Pixel', 'São Paulo', 'sam', 120, -46.6, -23.5, true, 'São Paulo: 20 Millionen Menschen und alle im Stau.'),
    c('hav', 'Havanna Hues', 'Havanna', 'lat', 140, -86, 17, false, 'Havanna: Oldtimer, Farben, Vibes. Ich bleib hier.'),
    c('bog', 'Bogotá Beats', 'Bogotá', 'lat', 140, -74, 3, false, 'Bogotá liegt auf 2600 Metern. Mir ist schwindelig.'),
    c('mex', 'Mexi-Kreativ', 'Mexiko-Stadt', 'lat', 160, -104, 21, true, 'Tacos! Ich will Tacos! Ich kann keine Tacos essen!'),
    c('blr', 'Bangalore Bytes', 'Bangalore', 'ind', 180, 77.6, 12, false, 'Bangalore: Hier wohnt jeder Programmierer der Welt.'),
    c('del', 'Delhi Deadline', 'Delhi', 'ind', 180, 77.2, 28.6, false, 'Delhi. Die Deadline ist gestern. Wie immer.'),
    c('bom', 'Mumbai Motion', 'Mumbai', 'ind', 200, 70.5, 19.1, true, 'Mumbai Motion! Bollywood ruft. Tanz-Pause!'),
    c('kai', 'Kairo Kontrast', 'Kairo', 'mid', 220, 31.2, 30, false, 'Pyramiden: Die ersten 3D-Modelle der Geschichte.'),
    c('ist', 'Istanbul Bazaar', 'Istanbul', 'mid', 220, 29, 41, false, 'Istanbul: Ich handle den Preis runter. Für dich.'),
    c('dxb', 'Dubai Dulidan Tower', 'Dubai', 'mid', 240, 55.3, 25.2, true, 'Dubai: Hier ist sogar der Sand teurer als du.'),
    c('akl', 'Auckland Atelier', 'Auckland', 'oce', 260, 174, -42, false, 'Auckland: Schafe, Berge, Hobbits. Ich such Gandalf.'),
    c('mel', 'Melbourne Mockup', 'Melbourne', 'oce', 260, 139, -40, false, 'Melbourne: Flat White und vier Jahreszeiten an einem Tag.'),
    c('syd', 'Sydney Sunset Studio', 'Sydney', 'oce', 280, 154, -30, true, 'Sydney! Alles hier will dich töten. Außer mir.'),
    c('sel', 'Seoul Shader', 'Seoul', 'asi', 300, 127, 44, false, 'Seoul: K-Pop, Kimchi, kein Schlaf.'),
    c('sha', 'Shanghai Skyline', 'Shanghai', 'asi', 300, 118, 29, false, 'Shanghai: Die Skyline sieht aus wie gerendert.'),
    c('tyo', 'Neo-Tokio', 'Tokio', 'asi', 320, 143, 35, true, 'Neo-Tokio! Neon überall. Endlich fühl ich mich zu Hause.'),
    c('van', 'Vancouver Vector', 'Vancouver', 'naw', 340, -122, 51, false, 'Vancouver: Berge, Meer, Bären. Ich bleib im Auto.'),
    c('sfo', 'San Fran-Code', 'San Francisco', 'naw', 340, -126, 39, false, 'San Francisco: Jedes Café ist ein Start-up.'),
    c('lax', 'Los Dulidanos', 'Los Angeles', 'naw', 360, -114, 30, true, 'Los Dulidanos! Hollywood, aber in Lila.'),
    c('tor', 'Toronto Typo', 'Toronto', 'nae', 380, -86, 48, false, 'Toronto: Sorry. Sorry. Sorry. Alle sind so nett hier.'),
    c('mia', 'Miami Neon', 'Miami', 'nae', 380, -76, 27, false, 'Miami Neon! Sonnenbrille auf, Kontostand runter.'),
    c('nyc', 'New Duisburg City', 'New York', 'nae', 400, -68, 40, true, 'New Duisburg City: Die Stadt, die niemals schläft. Wie ich.'),
    c('lon', 'Londulidan', 'London', 'eur', 420, -14, 56, true, 'Londulidan: Regen, Tee und überteuerte Mieten. Wie erwartet.'),
    c('ber', 'Berlin Beton-Studio', 'Berlin', 'eur', 440, 20, 57, false, 'Berlin: Aus Prinzip unfertig. Wie unsere Website.'),
    c('dui', 'DUISBURG · DULIDAN HQ', 'Duisburg', 'eur', 500, 3, 46, false, 'Heimathafen! Das HQ. Hier wird die Welt erobert. 💜'),
    // Kartenfelder auf den Seerouten
    { id: 'c_atl', name: 'April-Karte', real: 'Nordatlantik', type: 'event', deck: 'april', lon: -40, lat: 47 },
    { id: 'c_sat', name: 'Studio-Karte', real: 'Südatlantik', type: 'event', deck: 'studio', lon: -22, lat: -12 },
    { id: 'c_ind', name: 'April-Karte', real: 'Indischer Ozean', type: 'event', deck: 'april', lon: 60, lat: -7 },
    { id: 'c_pac', name: 'Studio-Karte', real: 'Südchinesisches Meer', type: 'event', deck: 'studio', lon: 136, lat: -2 },
  ];

  // Routen: Land- und Seewege (sea = gestrichelt)
  const ROUTES = [
    ['lon', 'dui'], ['dui', 'ber'], ['ber', 'ist'], ['lon', 'c_atl', 'sea'], ['c_atl', 'nyc', 'sea'],
    ['ist', 'kai'], ['ist', 'dxb'], ['kai', 'dxb'],
    ['kai', 'lag'], ['kai', 'nbo'], ['lag', 'nbo'], ['nbo', 'cpt'], ['lag', 'cpt'],
    ['lag', 'c_sat', 'sea'], ['c_sat', 'sao', 'sea'], ['nbo', 'c_ind', 'sea'], ['c_ind', 'bom', 'sea'], ['dxb', 'bom', 'sea'],
    ['bom', 'del'], ['bom', 'blr'], ['del', 'blr'], ['del', 'sha'], ['blr', 'syd', 'sea'],
    ['sha', 'sel'], ['sel', 'tyo'], ['sha', 'tyo'], ['tyo', 'sfo', 'sea'], ['sha', 'c_pac', 'sea'], ['c_pac', 'syd', 'sea'],
    ['syd', 'mel'], ['syd', 'akl', 'sea'], ['mel', 'akl', 'sea'], ['akl', 'lim', 'sea'],
    ['van', 'sfo'], ['sfo', 'lax'], ['van', 'tor'], ['lax', 'mex'],
    ['tor', 'nyc'], ['nyc', 'mia'], ['mia', 'hav', 'sea'],
    ['hav', 'mex', 'sea'], ['mex', 'bog'], ['hav', 'bog', 'sea'], ['bog', 'lim'],
    ['lim', 'sao'], ['lim', 'bue'], ['bue', 'sao'],
  ];

  // Stufen: 0 = nur gekauft, 1 Studio, 2 Büro, 3 Tower, 4 Wahrzeichen
  const LEVELS = ['Unbebaut', 'Studio', 'Büro', 'Tower', 'Wahrzeichen'];
  const RENT_PCT = [0.15, 0.8, 2.2, 4.5, 7];

  // Ab Runde 8 Weltwirtschaftskrise: alle Mauten steigen jede Runde weiter, bis jemand pleite geht
  const RULES = { startMoney: 1500, salary: 50, takeoverMult: 1.5, crisis: { from: 8, step: 0.2 }, noLimit: true };

  // Der lila Dulidan-Würfel – sechs Spezialseiten
  const FACES = [
    { id: 'nav', icon: '🧭', name: 'Navigator', text: 'Du wählst an jeder Kreuzung selbst, wohin es geht.' },
    { id: 'jet', icon: '✈️', name: 'Jetset', text: 'Statt zu laufen darfst du zu einem beliebigen Flughafen fliegen.' },
    { id: 'pay', icon: '💰', name: 'Zahltag', text: 'Du bekommst Ð150 von der Bank.' },
    { id: 'april', icon: '💖', name: 'April-Chaos', text: 'April macht irgendwas. Gut oder schlecht.' },
    { id: 'shield', icon: '🛡️', name: 'Schutzschild', text: 'Diesen Zug zahlst du keine Maut.' },
    { id: 'boss', icon: 'D', name: 'Dulidan-Power', text: 'Du bestimmst selbst, wie weit du läufst (2–12).' },
  ];

  // Was April beim April-Chaos anstellt
  const CHAOS = [
    { t: 'April schenkt dir Ð100. Einfach so. Sie hatte einen guten Tag.', money: 100, good: true },
    { t: 'April hatte Zugriff auf deine Karte. −Ð100.', money: -100 },
    { t: 'April macht für dich Werbung: Jeder Mitspieler zahlt dir Ð30.', collect: 30, good: true },
    { t: 'April hat in deinem Namen eine Runde Döner ausgegeben. Du zahlst jedem Ð30.', payEach: 30 },
    { t: 'April gibt dir Red Bull. Du läufst doppelt so weit!', stepMult: 2, good: true },
    { t: 'April hat ihre Periode und will nicht laufen. Du läufst nur halb so weit.', stepMult: 0.5 },
  ];

  const POWERS = {
    dulidan: 'Boss-Rabatt: kauft Städte 10 % günstiger.',
    april: 'April-Chaos trifft sie nur positiv.',
    zebra: 'Bekommt jede Runde Ð50 mehr Gehalt.',
    ship: 'Zahlt in Flughafen-Städten nur die halbe Maut.',
    berlingo: 'Darf nach jedem Wurf 1 Schritt mehr oder weniger laufen.',
    pen: 'Gebäude kosten Ð25 weniger.',
    helmet: 'Übernahmen seiner Städte kosten 2× statt 1,5×.',
    doener: 'Street-Food-Tour: Ð30 für jede Stadt, in der er zum ersten Mal landet.',
  };

  // Weltnachrichten von April – eine pro Runde
  const EVENTS = [
    { t: 'Ruhige Woche. April schläft, die Welt auch.' },
    { t: 'Maut-Party! Alle Mauten diese Runde ×1,5.', rentMult: 1.5 },
    { t: 'Rezession. Diese Runde gibt es kein Gehalt.', salaryMult: 0 },
    { t: 'Wirtschaftswunder! Diese Runde dreifaches Gehalt.', salaryMult: 3 },
    { t: 'Baurausch: Gebäude kosten diese Runde die Hälfte.', buildMult: 0.5 },
    { t: 'Grenzen dicht: Diese Runde keine Übernahmen.', noTakeover: true },
    { t: 'Tourismus-Boom in ZONE! Die Maut dort ist diese Runde doppelt.', boom: true },
    { t: 'April hackt die Weltbank: Der reichste Spieler verteilt Ð300 an alle anderen.', robin: 300 },
    { t: 'Steuer-Chaos: Alle zahlen 10 % ihres Geldes an die Bank.', taxPct: 0.1 },
    { t: 'Ein Dulidan-Reel geht viral: Alle bekommen Ð100.', gift: 100 },
    { t: 'Übernahme-Saison: Feindliche Übernahmen kosten nur 1,2×.', takeoverMult: 1.2 },
    { t: 'Stau weltweit: Diese Runde würfelt jeder nur mit einem Würfel.', oneDie: true },
    { t: 'April verteilt Energy-Drinks: Diese Runde würfelt jeder mit drei Würfeln!', threeDice: true },
  ];

  // Grobe Kontinent-Umrisse (lon, lat) für die Punktkarte
  const LAND = [
    // Nordamerika
    [[-168, 66], [-160, 71], [-140, 70], [-125, 72], [-95, 75], [-80, 73], [-62, 60], [-55, 52], [-66, 45], [-70, 42], [-75, 38], [-81, 31], [-80, 25], [-82, 28], [-90, 30], [-97, 26], [-97, 20], [-90, 15], [-83, 9], [-78, 8], [-86, 14], [-95, 16], [-105, 20], [-112, 29], [-117, 33], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
    // Grönland
    [[-55, 60], [-45, 60], [-20, 70], [-20, 82], [-60, 82], [-73, 78], [-58, 70]],
    // Kuba
    [[-85, 22], [-80, 23.2], [-74, 20], [-78, 20.5]],
    // Südamerika
    [[-78, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -45], [-68, -55], [-74, -50], [-72, -30], [-70, -18], [-80, -5], [-80, 2]],
    // Eurasien
    [[-10, 36], [-9, 43], [-1, 46], [-4, 48], [2, 51], [8, 54], [9, 57], [5, 61], [14, 68], [25, 71], [40, 68], [60, 70], [80, 73], [100, 77], [130, 72], [160, 70], [180, 66], [170, 60], [160, 58], [142, 50], [140, 42], [130, 35], [122, 30], [120, 22], [108, 20], [106, 10], [100, 13], [103, 1], [98, 8], [95, 15], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 28], [48, 30], [36, 35], [28, 36], [26, 40], [22, 37], [16, 38], [12, 44], [5, 43], [0, 40], [-6, 36]],
    // Arabien
    [[35, 30], [43, 13], [52, 15], [58, 22], [56, 26], [48, 30]],
    // Großbritannien
    [[-5, 50], [1, 51], [2, 53], [-1, 57], [-3, 59], [-6, 57], [-5, 54]],
    // Japan
    [[130, 31], [135, 34], [141, 38], [142, 45], [140, 42], [132, 34]],
    // Afrika
    [[-17, 21], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [34, 28], [43, 12], [51, 12], [42, -2], [40, -15], [35, -25], [28, -33], [19, -35], [15, -28], [12, -15], [9, -1], [8, 5], [-8, 5], [-17, 14]],
    // Madagaskar
    [[44, -13], [50, -15], [47, -25], [43, -22]],
    // Australien
    [[113, -22], [122, -17], [131, -11], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -31], [115, -34]],
    // Indonesien & Neuguinea
    [[95, 5], [106, -6], [103, -5]],
    [[109, 1], [118, 7], [119, -4], [110, -3]],
    [[131, -1], [150, -6], [141, -9]],
    // Neuseeland
    [[172, -35], [178, -38], [174, -41], [167, -46], [171, -44]],
  ];

  // Kartenausschnitt
  const VIEW = { lonMin: -142, lonMax: 186, latMax: 64, latMin: -50, scale: 4 };

  // Wo die Beschriftung sitzt: n = oben, s = unten, e = rechts, w = links
  const LABELS = {
    dui: 's', lon: 'w', ber: 'n', ist: 'e', kai: 'w', dxb: 'n',
    tor: 'n', nyc: 'e', mia: 'e', hav: 's', mex: 's', bog: 'e',
    van: 'n', sfo: 'e', lax: 'w', sel: 'n', sha: 's', tyo: 'e',
    syd: 'e', mel: 's', akl: 's', del: 'n', bom: 'w', blr: 's',
    lag: 's', nbo: 'e', cpt: 's', lim: 'w', sao: 'e', bue: 's',
    c_atl: 'n', c_sat: 's', c_ind: 's', c_pac: 'e',
  };

  root.DULI_WORLD_DATA = { ZONES, CITIES, ROUTES, LEVELS, RENT_PCT, RULES, FACES, CHAOS, POWERS, EVENTS, LAND, VIEW, LABELS };
  // Als Brett für die gemeinsame Brett-Engine registrieren
  root.DULI_BOARDS = root.DULI_BOARDS || {};
  root.DULI_BOARDS.world = {
    id: 'world', title: 'DULIDAN WORLD', icon: '🌍',
    tagline: 'Weltkarte mit Dulidan-Würfel: um die Welt laufen, Städte kaufen, Maut kassieren.',
    walk: 'random', ZONES, CITIES, ROUTES, LEVELS, RENT_PCT, RULES, FACES, CHAOS, EVENTS, POWERS,
    FUNK: [], starts: ['dui', 'nyc', 'tyo', 'lag', 'sao', 'syd'],
    words: { zone: 'Zone', city: 'Stadt', cities: 'Städte' },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DULI_WORLD_DATA;
})(typeof window !== 'undefined' ? window : globalThis);
