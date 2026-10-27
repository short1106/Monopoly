// Dulidanopoly – die Bretter ROYALE, METRO und TOWER (DULIDAN WORLD steht in world-data.js)
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const WD = isNode ? require('./world-data.js') : root.DULI_WORLD_DATA;
  const LEVELS = WD.LEVELS;
  const BOARDS = {};

  // ---------- gemeinsame Bausteine ----------
  const FUNK = [
    { t: 'April schenkt dir Ð100. Einfach so. Sie hatte einen guten Tag.', money: 100 },
    { t: 'April hatte Zugriff auf deine Karte. −Ð100.', money: -100 },
    { t: 'April macht für dich Werbung: Jeder Mitspieler zahlt dir Ð30.', collect: 30 },
    { t: 'April hat in deinem Namen Döner für alle bestellt. Du zahlst jedem Ð30.', payEach: 30 },
    { t: 'April findet deinen alten Pfand. +Ð40.', money: 40 },
    { t: 'April hat Sushi auf deinen Namen bestellt. Zahle Ð50.', money: -50 },
  ];
  const POWERS = {
    dulidan: 'Boss-Rabatt: kauft 10 % günstiger.',
    april: 'April-Chaos und April-Funk treffen sie nur positiv.',
    zebra: 'Bekommt jede Runde Ð50 mehr Gehalt.',
    ship: 'Zahlt auf Umsteige-, Portal- und Flughafen-Feldern nur die halbe Miete.',
    berlingo: 'Darf nach jedem Wurf 1 Schritt mehr oder weniger laufen.',
    pen: 'Gebäude kosten Ð25 weniger.',
    helmet: 'Übernahmen seiner Felder kosten 2× statt 1,5×.',
    doener: 'Street-Food-Tour: Ð30 für jedes neue Feld, auf dem die Figur zum ersten Mal landet.',
    cat: 'Die erste fiese Karte im Spiel prallt einfach ab.',
    crown: 'Bekommt jede Runde Ð20 mehr Gehalt.',
    ghost: 'Einmal pro Spiel durch die Wand: eine Miete einfach nicht zahlen.',
    pizza: 'Fiese Geld-Karten kosten nur die Hälfte.',
    camera: 'Content-Profi: Geld von Karten gibt 50 % mehr.',
    duck: 'Hypotheken bringen 60 % statt 50 % vom Preis.',
    gamepad: 'Jeder Pasch bringt Ð30 Highscore-Bonus.',
    rocket: 'Startet mit Ð150 mehr.',
  };
  const node = (id, name, extra) => Object.assign({ id, name, type: 'prop' }, extra);

  // Karten zum Ziehen auf den Brett-Modi (Kartenfelder)
  const CARDS = {
    april: [
      { t: 'TUNG TUNG TUNG SAHUR! April schenkt dir Ð100.', money: 100, good: true },
      { t: '67! 😂 April findet das so lustig, dass sie dir Ð67 gibt.', money: 67, good: true },
      { t: 'April hatte Zugriff auf deine Karte 💳 und hat 50 Energy-Drinks bestellt. Zahle Ð100.', money: -100 },
      { t: 'April hat Heißhunger auf Bubble Tea 🧋 und du zahlst. Ð50.', money: -50 },
      { t: 'No rizz. Dein Pitch ist gefloppt. Zahle jedem Mitspieler Ð30.', payEach: 30 },
      { t: 'April macht auf TikTok Werbung für dich. Jeder Mitspieler zahlt dir Ð30.', collect: 30, good: true },
      { t: '„April regelt das.“ 🛡️ Du bekommst ein Schild gegen die nächste Miete.', item: 'shield', good: true },
      { t: 'April gibt dir Red Bull. ⚡ Dein nächster Wurf geht 3 Felder weiter.', item: 'boost', good: true },
      { t: 'April hat sich verklickt und dich teleportiert. 🌀 Ab auf ein zufälliges Feld!', teleport: true },
      { t: 'April hackt den reichsten Mitspieler. Der zahlt dir Ð100. Robin Hood, aber cringe.', fromRichest: 100, good: true },
      { t: 'April hat dein altes Gaming-Setup verkauft. Erhalte Ð120.', money: 120, good: true },
      { t: 'April hat dein Display zerkratzt. Reparatur: Ð60.', money: -60 },
      { t: 'Geburtstag! Jeder Mitspieler zahlt dir Ð40.', collect: 40, good: true },
      { t: 'April hat deine Playlist geteilt. Peinlich. Zahle jedem Mitspieler Ð25.', payEach: 25 },
      { t: 'April hat ein NFT gekauft. Mit deinem Konto. Zahle Ð150.', money: -150 },
      { t: 'April hat im Casino gewonnen und teilt. Erhalte Ð200.', money: 200, good: true },
      { t: 'April leiht dir einen E-Scooter. ⚡ Dein nächster Wurf geht 3 Felder weiter.', item: 'boost', good: true },
      { t: 'April kippt Glitzer über deine Gebäude. Reinigung: Ð20 pro Ausbaustufe.', repairs: 20 },
      { t: 'April schickt dich auf einen Trip. 🌀 Ab auf ein zufälliges Feld!', teleport: true },
      { t: 'April schreibt der reichsten Person eine Rechnung „für Vibes“. Du bekommst Ð60.', fromRichest: 60, good: true },
    ],
    studio: [
      { t: 'Der Kunde zahlt endlich die Rechnung! Erhalte Ð200.', money: 200 },
      { t: 'Logo-Pitch gewonnen! Erhalte Ð100.', money: 100 },
      { t: '3D-Modell verkauft. Erhalte Ð50.', money: 50 },
      { t: 'Folierungsauftrag für einen Berlingo! Erhalte Ð150.', money: 150 },
      { t: 'Neue Grafikkarte nötig. Zahle Ð100.', money: -100 },
      { t: 'Server-Kosten für die Website. Zahle Ð50.', money: -50 },
      { t: 'Der Kunde will „das Logo größer, aber kleiner“. 12 Korrekturschleifen. Zahle Ð75 für Kaffee.', money: -75 },
      { t: 'Deine Werbekampagne geht viral! Jeder Mitspieler zahlt dir Ð20.', collect: 20 },
      { t: 'Studio-Renovierung: Zahle Ð30 pro Ausbaustufe auf deinen Feldern.', repairs: 30 },
      { t: 'Security-Ausweis 🛡️: Schild gegen die nächste Miete.', item: 'shield' },
      { t: 'Großauftrag: Branding für einen Sportverein. Erhalte Ð250.', money: 250 },
      { t: 'Festplatte kaputt. Datenrettung: Ð120.', money: -120 },
      { t: 'Du gibst einen Workshop. Jeder Mitspieler zahlt dir Ð25.', collect: 25 },
      { t: 'Team-Event! Du lädst alle zum Bowling ein. Zahle jedem Mitspieler Ð20.', payEach: 20 },
      { t: 'Ein Stock-Foto von dir wurde verkauft. Erhalte Ð60.', money: 60 },
      { t: 'Der Drucker streikt. Neuer Drucker: Ð90.', money: -90 },
      { t: 'Du hast einen Messestand designt. Erhalte Ð175.', money: 175 },
      { t: 'Brandschutz-Prüfung: Ð25 pro Ausbaustufe.', repairs: 25 },
      { t: 'Kundentermin am anderen Ende. 🌀 Ab auf ein zufälliges Feld!', teleport: true },
      { t: 'Dein Showreel gewinnt einen Award. Erhalte Ð120.', money: 120 },
    ],
  };

  // =====================================================================
  // 🌀 DULIDAN ROYALE – drei Ringe im All, der April-Sturm frisst sie von außen
  // =====================================================================
  {
    const ZONES = {
      ast: { name: 'Asteroiden-Gürtel', color: '#c47a45', build: 50 },
      zeb: { name: 'Zebra-Nebel', color: '#5fd0ff', build: 50 },
      pix: { name: 'Pixel-Planeten', color: '#ff8a2a', build: 100 },
      don: { name: 'Döner-Galaxie', color: '#ffd83a', build: 100 },
      rhe: { name: 'Rhein-Sternhaufen', color: '#ff3348', build: 150 },
      ohr: { name: 'Öhringer Orbit', color: '#2ad4c0', build: 150 },
      stu: { name: 'Studio-Sektor', color: '#2fe08a', build: 200 },
      apr: { name: 'April-Zone', color: '#ff7ae6', build: 200 },
      ker: { name: 'Dulidan-Kern', color: '#c020b8', build: 250 },
    };
    const p = (id, name, zone, price, quip) => node(id, name, { zone, price, quip });
    const ring3 = [
      node('r3s', 'Startrampe', { type: 'free', quip: 'Willkommen im All. Bitte anschnallen.' }),
      p('mar', 'Marxloh-Mond', 'ast', 60, 'Der Mond hat Brautkleid-Läden. Ehrlich.'),
      p('hoc', 'Hochfeld-Komet', 'ast', 60),
      p('pot', 'Pott-Asteroid', 'ast', 80, 'Aus Stahl. Natürlich.'),
      node('r3p1', 'Portal Alpha', { type: 'portal', link: 'r2p1' }),
      p('msv', 'MSV-Mond', 'zeb', 100, 'Zebras! Im Weltall!'),
      p('zko', 'Zebra-Komet', 'zeb', 100),
      p('wed', 'Wedau-Wolke', 'zeb', 120),
      node('r3l1', 'Loot-Kiste', { type: 'loot' }),
      p('pxp', 'Pixel Prime', 'pix', 140, 'Alles in 8 Bit. Gemütlich.'),
      p('vek', 'Vektor-Mond', 'pix', 140),
      p('ren', 'Render-Riese', 'pix', 160),
      node('r3p2', 'Portal Beta', { type: 'portal', link: 'r2p2' }),
      p('dnr', 'Dönerus Major', 'don', 180, 'Riecht nach Knoblauch. Auch im Vakuum.'),
      p('ayr', 'Ayran-Mond', 'don', 180),
      p('kno', 'Knoblauch-Nebel', 'don', 200),
    ];
    const ring2 = [
      node('r2p1', 'Portal Alpha', { type: 'portal', link: 'r3p1' }),
      p('rho', 'Rheinorange-Stern', 'rhe', 220, 'Orange im All. Kunst bleibt Kunst.'),
      p('tig', 'Tiger-&-Turtle-Station', 'rhe', 220),
      p('lpn', 'Landschaftspark-Pulsar', 'rhe', 240),
      node('r2p3', 'Portal Gamma', { type: 'portal', link: 'r1p1' }),
      node('r2f', 'April-Karte', { type: 'event', deck: 'april' }),
      p('hof', 'Hofgarten-Orbit', 'ohr', 260, 'Enten im Orbit. Ich liebe es.'),
      p('sch', 'Schloss-Satellit', 'ohr', 260),
      node('r2p2', 'Portal Beta', { type: 'portal', link: 'r3p2' }),
      p('lim', 'Limes-Station', 'ohr', 280),
      p('mood', 'Moodboard-Mond', 'stu', 300),
      node('r2p4', 'Portal Delta', { type: 'portal', link: 'r1p2' }),
      p('logo', 'Logo-Planet', 'stu', 300, 'Hier wurde das D erfunden.'),
      p('brand', 'Branding-Bahnhof', 'stu', 320),
    ];
    const ring1 = [
      node('r1p1', 'Portal Gamma', { type: 'portal', link: 'r2p3' }),
      p('ast1', 'April-Station', 'apr', 350, 'Meine Station. Schuhe aus.'),
      p('ene', 'Energy-Drink-Raffinerie', 'apr', 350),
      node('r1l', 'Loot-Kiste', { type: 'loot' }),
      p('srv', 'Aprils Server-Kern', 'apr', 380),
      node('r1p2', 'Portal Delta', { type: 'portal', link: 'r2p4' }),
      p('hq', 'HQ-Turm', 'ker', 420, 'Das Herz von Dulidan. Ganz nah am Kern.'),
      p('kron', 'Dulidan-Krone', 'ker', 500, 'Die teuerste Krone im Universum.'),
    ];
    const W = 1000, H = 800, cx = 500, cy = 400;
    const place = (ring, r, ringNo) => ring.forEach((n, i) => {
      const a = (-90 + (i * 360) / ring.length) * Math.PI / 180;
      n.x = Math.round(cx + Math.cos(a) * r); n.y = Math.round(cy + Math.sin(a) * r);
      n.ring = ringNo;
      n.next = ring[(i + 1) % ring.length].id;
      n.lab = Math.abs(Math.cos(a)) < 0.35 ? (Math.sin(a) < 0 ? 'n' : 's') : (Math.cos(a) > 0 ? 'e' : 'w');
      if (ringNo === 1) n.lab = Math.sin(a) < -0.3 ? 'n' : Math.sin(a) > 0.3 ? 's' : (Math.cos(a) > 0 ? 'e' : 'w');
    });
    place(ring3, 360, 3); place(ring2, 245, 2); place(ring1, 130, 1);
    const CITIES = [...ring3, ...ring2, ...ring1];
    const ROUTES = [];
    for (const n of CITIES) ROUTES.push([n.id, n.next, 'ring']);
    ROUTES.push(['r3p1', 'r2p1', 'portal'], ['r3p2', 'r2p2', 'portal'], ['r2p3', 'r1p1', 'portal'], ['r2p4', 'r1p2', 'portal']);
    BOARDS.royale = {
      id: 'royale', title: 'DULIDAN ROYALE', icon: '🌀',
      tagline: 'Drei Ringe im All. Der April-Sturm frisst sie von außen. Der Letzte gewinnt.',
      walk: 'ring', ZONES, CITIES, ROUTES, LEVELS, RENT_PCT: [0.15, 0.8, 2.2, 4.5, 7],
      RULES: { startMoney: 1500, salary: 50, takeoverMult: 1.5, noLimit: true },
      FACES: [], CHAOS: [], EVENTS: [], FUNK, POWERS,
      STORM: [{ warn: 5, at: 7, ring: 3 }, { warn: 12, at: 14, ring: 2 }],
      INFLATION: 0.3,
      LOOT: [
        { id: 'shield', t: '🛡️ Schild! Blockt die nächste Miete komplett.' },
        { id: 'boost', t: '⚡ Boost! Dein nächster Wurf geht 3 Felder weiter.' },
        { id: 'money', t: '💰 Dulis-Kiste! +Ð150.', money: 150 },
        { id: 'money', t: '💎 Seltene Kiste! +Ð250.', money: 250 },
        { id: 'shield', t: '🛡️ Schild! Blockt die nächste Miete komplett.' },
        { id: 'trap', t: '💥 Falle! Die Kiste explodiert. −Ð80.', money: -80 },
      ],
      starts: ['r3s', 'r3l1', 'wed', 'dnr', 'pot', 'pxp'],
      VIEW: { w: W, h: H, cx, cy, rings: [360, 245, 130] },
      words: { zone: 'Sektor', city: 'Planet', cities: 'Planeten' },
    };
  }

  // =====================================================================
  // 🚇 DULIDAN METRO – U-Bahn-Netz, Fahrpreise auf kompletten Linien
  // =====================================================================
  {
    const ZONES = {
      u1: { name: 'U1 Pott-Linie', color: '#a78bff', build: 50, short: 'U1' },
      u2: { name: 'U2 Zebra-Linie', color: '#5fd0ff', build: 50, short: 'U2' },
      u3: { name: 'U3 Kunst-Linie', color: '#ff8a2a', build: 100, short: 'U3' },
      u4: { name: 'U4 Öhringen-Express', color: '#2fe08a', build: 150, short: 'U4' },
      u5: { name: 'U5 Studio-Linie', color: '#ffd83a', build: 150, short: 'U5' },
      u6: { name: 'U6 April-Linie', color: '#ff4fd8', build: 200, short: 'U6' },
      u7: { name: 'U7 HQ-Linie', color: '#c020b8', build: 250, short: 'U7' },
    };
    const s = (id, name, zone, price, x, y, lab, quip) => node(id, name, { zone, price, x, y, lab, quip });
    const hub = (id, name, x, y, lab, type, quip) => node(id, name, { type: type || 'free', hub: true, x, y, lab, quip });
    const CITIES = [
      Object.assign(hub('bhf', 'Duisburg Hbf', 500, 310, 'e', 'event', 'Duisburg Hbf. Gleis 9 ¾ gibt’s nicht. Nur Verspätung.'), { deck: 'april' }),
      hub('koe', 'Königstraße', 280, 150, 'w', 'free', 'Umsteigen an der Kö. Die echte Kö.'),
      Object.assign(hub('ruh', 'Ruhrort', 720, 150, 'e', 'event', 'Ruhrort: Hafen, Möwen, Umsteigen.'), { deck: 'studio' }),
      hub('ohb', 'Öhringen Hbf', 280, 480, 'w', 'free', 'Öhringen Hbf. Endstation Gemütlichkeit.'),
      hub('plz', 'Dulidan Plaza', 720, 480, 'e', 'free', 'Dulidan Plaza: Hier steigt man stilvoll um.'),
      // U1 oben
      s('mrx', 'Marxloh', 'u1', 60, 370, 80, 'n', 'Marxloh: Hochzeitskleider an jeder Ecke.'),
      s('hch', 'Hochfeld', 'u1', 60, 500, 58, 'n'),
      s('mei', 'Meiderich', 'u1', 80, 630, 80, 'n'),
      // U2 links
      s('msv', 'MSV-Arena', 'u2', 100, 190, 230, 'w', 'Zebras! Zebras! Zebras!'),
      s('wed', 'Wedau', 'u2', 100, 165, 315, 'w'),
      s('sss', 'Sechs-Seen-Platte', 'u2', 120, 190, 400, 'w'),
      // U3 rechts
      s('lmb', 'Lehmbruck-Museum', 'u3', 140, 810, 230, 'e'),
      s('tig', 'Tiger & Turtle', 'u3', 140, 835, 315, 'e', 'Eine Achterbahn zum Laufen. Typisch Duisburg.'),
      s('lpk', 'Landschaftspark', 'u3', 160, 810, 400, 'e'),
      // U4 unten
      s('mkt', 'Öhringer Marktplatz', 'u4', 180, 370, 560, 's'),
      s('hgt', 'Hofgarten', 'u4', 180, 500, 590, 's', 'Enten! Ich liebe Enten.'),
      s('slo', 'Schloss Öhringen', 'u4', 200, 630, 560, 's'),
      // U5 Diagonale Königstraße → Plaza
      s('mdb', 'Moodboard-Gasse', 'u5', 220, 385, 225, 'w'),
      s('rnd', 'Render-Farm', 'u5', 220, 600, 385, 'e'),
      s('pix', 'Pixel-Platz', 'u5', 240, 655, 430, 'n'),
      // U6 Diagonale Ruhrort → Öhringen
      s('edr', 'Energy-Drink-Allee', 'u6', 260, 615, 225, 'e'),
      s('asv', 'Aprils Server', 'u6', 260, 400, 385, 'w', 'Meine Server. Bitte nicht anfassen.'),
      s('lil', 'Lila Lounge', 'u6', 280, 345, 430, 'n'),
      // U7 Mitte runter
      s('inh', 'Innenhafen', 'u7', 320, 500, 395, 'e', 'Innenhafen: Date-Spot. Teuer, aber schön.'),
      s('hq', 'DULIDAN HQ', 'u7', 400, 500, 470, 'e', 'DULIDAN HQ. Endstation Erfolg.'),
    ];
    const L = (zone, ids) => ids.slice(1).map((id, i) => [ids[i], id, 'line', zone]);
    const ROUTES = [
      ...L('u1', ['koe', 'mrx', 'hch', 'mei', 'ruh']),
      ...L('u2', ['koe', 'msv', 'wed', 'sss', 'ohb']),
      ...L('u3', ['ruh', 'lmb', 'tig', 'lpk', 'plz']),
      ...L('u4', ['ohb', 'mkt', 'hgt', 'slo', 'plz']),
      ...L('u5', ['koe', 'mdb', 'bhf', 'rnd', 'pix', 'plz']),
      ...L('u6', ['ruh', 'edr', 'bhf', 'asv', 'lil', 'ohb']),
      ...L('u7', ['bhf', 'inh', 'hq', 'hgt']),
    ];
    BOARDS.metro = {
      id: 'metro', title: 'DULIDAN METRO', icon: '🚇',
      tagline: 'U-Bahn-Netz durch den Pott und Öhringen. Wem eine ganze Linie gehört, kassiert Fahrpreis von allen, die durchfahren.',
      walk: 'random', ZONES, CITIES, ROUTES, LEVELS: ['Unbebaut', 'Kiosk', 'Café', 'Shop', 'Mall'],
      LEVEL_ART: ['', 'einen Kiosk', 'ein Café', 'einen Shop', 'eine Mall'],
      RENT_PCT: [0.2, 1, 2.8, 5.5, 8.5],
      RULES: { startMoney: 1500, salary: 40, takeoverMult: 1.5, fare: true, crisis: { from: 8, step: 0.2 }, noLimit: true },
      FACES: [
        { id: 'nav', icon: '🧭', name: 'Navigator', text: 'Du wählst an jedem Bahnhof selbst, wohin es geht.' },
        { id: 'jet', icon: '🚄', name: 'Express', text: 'Statt zu fahren springst du zu einem beliebigen Umsteigebahnhof.' },
        { id: 'pay', icon: '💰', name: 'Zahltag', text: 'Du bekommst Ð150 von der Bank.' },
        { id: 'april', icon: '💖', name: 'April-Chaos', text: 'April macht irgendwas. Gut oder schlecht.' },
        { id: 'shield', icon: '🎫', name: 'Freifahrt', text: 'Diesen Zug zahlst du weder Miete noch Fahrpreis.' },
        { id: 'boss', icon: 'D', name: 'Dulidan-Power', text: 'Du bestimmst selbst, wie weit du fährst (2–12).' },
      ],
      CHAOS: WD.CHAOS, EVENTS: WD.EVENTS, FUNK, POWERS,
      starts: ['bhf', 'koe', 'ruh', 'ohb', 'plz', 'bhf'],
      VIEW: { w: 1000, h: 640 },
      words: { zone: 'Linie', city: 'Station', cities: 'Stationen' },
    };
  }

  // =====================================================================
  // 🏙️ DULIDAN TOWER – fünf Etagen, Aufzüge hoch, Rutschen runter
  // =====================================================================
  {
    const ZONES = {
      f1: { name: 'Erdgeschoss', color: '#c47a45', build: 50, floor: 1 },
      f2: { name: 'Kreativ-Etage', color: '#5fd0ff', build: 100, floor: 2 },
      f3: { name: '3D-Etage', color: '#ff8a2a', build: 150, floor: 3 },
      f4: { name: 'Chef-Etage', color: '#2fe08a', build: 200, floor: 4 },
      f5: { name: 'Penthouse', color: '#c020b8', build: 250, floor: 5 },
    };
    const FLOORS = [
      { z: 'f1', rooms: [['Empfang', 60, 'Bitte warten Sie. Ewig.'], ['Poststelle', 60], ['Kaffeeküche', 80, 'Hier wird gearbeitet. Also Kaffee getrunken.'], ['Fahrradkeller', 80]] },
      { z: 'f2', rooms: [['Moodboard-Raum', 120], ['Pixel-Labor', 120], ['Vektor-Studio', 140], ['Farbraum', 140, 'Alles lila. Wie es sein muss.']] },
      { z: 'f3', rooms: [['Render-Farm', 180, 'Die Lüfter sind lauter als ich.'], ['Blender-Box', 180], ['Polygon-Lounge', 200], ['Motion-Lab', 200]] },
      { z: 'f4', rooms: [['Meetingraum', 240, 'Dieses Meeting hätte eine Mail sein können.'], ['Glas-Konferenz', 240], ['Aprils Büro', 260, 'Mein Büro. Klopf an.'], ['Server-Raum', 260]] },
      { z: 'f5', rooms: [['Skybar', 320, 'Aussicht bis nach Öhringen.'], ['Dachpool', 320], ['Penthouse-Suite', 360], ['DULIDAN-Thron', 400, 'Der Thron. Ganz oben. Natürlich lila.']] },
    ];
    const CITIES = [], ROUTES = [];
    const W = 1000, H = 820;
    FLOORS.forEach((f, fi) => {
      const fl = fi + 1;
      const yMid = H - 95 - fi * 150;
      const n = [];
      f.rooms.forEach((r, i) => n.push(node(`${f.z}r${i}`, r[0], { zone: f.z, price: r[1], quip: r[2] })));
      // Aufzüge und Rutschen liegen senkrecht übereinander: Aufzug → Aufzug darüber, Rutsche → Rutsche darunter
      const lift = fl < 5
        ? node(`${f.z}up`, 'Aufzug', { type: 'lift', link: fl < 4 ? `f${fl + 1}up` : 'heli', quip: 'Aufzug! Bitte nicht drängeln.' })
        : node('heli', 'Helipad', { type: 'loot', quip: 'Helipad. Leider kein Heli. Nur eine Kiste.' });
      const slide = fl > 1
        ? node(`${f.z}dn`, 'Rutsche', { type: 'slide', link: fl > 2 ? `f${fl - 1}dn` : 'in', quip: 'Wuuuuuuh!' })
        : node('in', 'Eingang', { type: 'free', quip: 'Willkommen im DULIDAN TOWER.' });
      const flur = node(`${f.z}fl`, `Flur ${fl}`, { type: 'free' });
      const funk = fl % 2 ? node(`${f.z}ev`, 'April-Karte', { type: 'event', deck: 'april' }) : node(`${f.z}ev`, 'Studio-Karte', { type: 'event', deck: 'studio' });
      // Rundgang: Flur links, vorne nach rechts, hinten zurück nach links
      const loop = [flur, n[0], n[1], funk, lift, n[2], n[3], slide];
      const pos = [[150, 0, 'w'], [300, 1, 's'], [460, 1, 's'], [620, 1, 's'], [800, 1, 's'], [800, -1, 'n'], [560, -1, 'n'], [320, -1, 'n']];
      loop.forEach((nd, i) => {
        const [x, side, lab] = pos[i];
        nd.x = x; nd.y = yMid + side * 32; nd.lab = lab;
        nd.floor = fl;
        nd.next = loop[(i + 1) % loop.length].id;
        CITIES.push(nd);
      });
      loop.forEach((nd) => ROUTES.push([nd.id, nd.next, 'ring']));
    });
    for (const c of CITIES) {
      if (c.type === 'lift') ROUTES.push([c.id, c.link, 'lift']);
      if (c.type === 'slide') ROUTES.push([c.id, c.link, 'slide']);
    }
    BOARDS.tower = {
      id: 'tower', title: 'DULIDAN TOWER', icon: '🏙️',
      tagline: 'Fünf Etagen, Aufzüge rauf, Rutschen runter. Wem eine ganze Etage gehört, kassiert die Aufzug-Gebühr.',
      walk: 'ring', ZONES, CITIES, ROUTES, LEVELS: ['Leer', 'Schreibtisch', 'Büro', 'Suite', 'Chefetage'],
      LEVEL_ART: ['', 'einen Schreibtisch', 'ein Büro', 'eine Suite', 'eine Chefetage'],
      RENT_PCT: [0.2, 1, 2.8, 5.5, 8.5],
      RULES: { startMoney: 1500, salary: 40, takeoverMult: 1.5, liftFee: 60, crisis: { from: 6, step: 0.3 }, noLimit: true },
      FACES: [], CHAOS: [], EVENTS: WD.EVENTS, FUNK, POWERS,
      LOOT: [
        { id: 'money', t: '💰 Auf dem Helipad liegt ein Koffer voller Dulis. +Ð200.', money: 200 },
        { id: 'shield', t: '🛡️ Security-Ausweis! Blockt die nächste Miete.' },
        { id: 'boost', t: '⚡ Treppen-Sprint! Dein nächster Wurf geht 3 Felder weiter.' },
      ],
      starts: ['in', 'in', 'in', 'in', 'in', 'in'],
      VIEW: { w: W, h: H },
      words: { zone: 'Etage', city: 'Raum', cities: 'Räume' },
    };
  }

  // =====================================================================
  // 🏝️ DULIDAN ISLANDS – Inselwelt, Fähren zwischen Häfen, jede Runde kann eine Insel überflutet werden
  // =====================================================================
  {
    const ZONES = {
      pom: { name: 'Pommes-Insel', color: '#ffd83a', build: 50 },
      zeb: { name: 'Zebra-Atoll', color: '#5fd0ff', build: 50 },
      pix: { name: 'Pixel-Archipel', color: '#ff8a2a', build: 100 },
      don: { name: 'Döner-Eiland', color: '#ff3348', build: 150 },
      ohr: { name: 'Öhringer Inseln', color: '#2fe08a', build: 150 },
      apr: { name: 'April-Paradies', color: '#ff7ae6', build: 200 },
      dul: { name: 'DULIDAN-Atoll', color: '#c020b8', build: 250 },
    };
    const ISL = [
      ['pom', 150, 150, [['Fritten-Strand', 60, 'Sand und Pommes. Paradies.'], ['Mayo-Bucht', 60], ['Currywurst-Kap', 80, 'Currywurst mit Meerblick. Ich weine.']]],
      ['zeb', 430, 105, [['Streifen-Strand', 100], ['MSV-Lagune', 100, 'Zebras schwimmen nicht. Sagen sie.'], ['Zebra-Riff', 120]]],
      ['pix', 740, 145, [['Pixel-Palme', 140, 'Eine Palme in 8 Bit. Wirft eckige Kokosnüsse.'], ['Vektor-Vulkan', 140], ['Render-Riff', 160]]],
      ['don', 820, 400, [['Knoblauch-Klippe', 180, 'Riecht man bis zum Festland.'], ['Ayran-Quelle', 180], ['Dönerspieß-Berg', 200, 'Der Berg dreht sich. Langsam.']]],
      ['ohr', 660, 585, [['Hofgarten-Holm', 220, 'Enten auf einer Insel. Sie sind die Chefs.'], ['Schloss-Sandbank', 220], ['Marktplatz-Mole', 240]]],
      ['apr', 340, 590, [['Aprils Hängematte', 260, 'Meine Hängematte. Besetzt. Für immer.'], ['Energy-Drink-Lagune', 260], ['Lila Lagune', 280]]],
      ['dul', 150, 400, [['Logo-Leuchtturm', 320, 'Der Leuchtturm blinkt im Dulidan-Lila.'], ['Studio-Villa', 350], ['DULIDAN Yacht-Club', 400, 'Die Yacht heißt „Berlingo II“.']]],
    ];
    const CITIES = [], ROUTES = [];
    const SEA = { x: 520, y: 360 };
    const labFor = (dx, dy) => (Math.abs(dx) > 0.4 ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n'));
    ISL.forEach(([z, cx, cy, props]) => {
      // Hafen zeigt Richtung Meeresmitte, die Strände liegen im Kreis dahinter
      const toSea = Math.atan2(SEA.y - cy, SEA.x - cx);
      const hub = node(`${z}H`, `Hafen ${ZONES[z].name.split(' ')[0].replace('-Insel', '').replace('-Atoll', '').replace('-Archipel', '').replace('-Eiland', '').replace('-Paradies', '')}`, {
        type: 'free', hub: true, icon: '⚓', info: '⚓ Hafen: Mit der ⛴️ Fähre vom Dulidan-Würfel kannst du direkt hierher.', quip: 'Leinen los!',
        x: Math.round(cx + Math.cos(toSea) * 58), y: Math.round(cy + Math.sin(toSea) * 58),
      });
      hub.lab = labFor(Math.cos(toSea), Math.sin(toSea));
      CITIES.push(hub);
      const ids = props.map((pr, i) => {
        const a = toSea + Math.PI + (i - 1) * 1.15;
        const n = node(`${z}${i}`, pr[0], { zone: z, price: pr[1], quip: pr[2], x: Math.round(cx + Math.cos(a) * 62), y: Math.round(cy + Math.sin(a) * 62) });
        n.lab = labFor(Math.cos(a), Math.sin(a));
        CITIES.push(n);
        return n.id;
      });
      const loop = [hub.id, ...ids];
      loop.forEach((id, i) => ROUTES.push([id, loop[(i + 1) % loop.length], 'path']));
    });
    // Meeresmitte: Karten und Schatzkisten
    const mid = [
      node('sea1', 'April-Karte', { type: 'event', deck: 'april', x: 430, y: 300, lab: 'n' }),
      node('sea2', 'Studio-Karte', { type: 'event', deck: 'studio', x: 610, y: 420, lab: 's' }),
      node('sea3', 'Schatzkiste', { type: 'loot', x: 610, y: 290, lab: 'n', quip: 'Eine Schatzkiste! Hoffentlich keine Falle.' }),
      node('sea4', 'Flaschenpost', { type: 'loot', x: 420, y: 430, lab: 's', quip: 'Flaschenpost! Vielleicht von April.' }),
    ];
    CITIES.push(...mid);
    const sea = (a, b) => ROUTES.push([a, b, 'sea']);
    sea('pomH', 'zebH'); sea('zebH', 'pixH'); sea('pixH', 'donH'); sea('donH', 'ohrH'); sea('ohrH', 'aprH'); sea('aprH', 'dulH'); sea('dulH', 'pomH');
    sea('pomH', 'sea1'); sea('zebH', 'sea1'); sea('sea1', 'sea3'); sea('pixH', 'sea3'); sea('sea3', 'donH');
    sea('donH', 'sea2'); sea('ohrH', 'sea2'); sea('sea2', 'sea4'); sea('aprH', 'sea4'); sea('sea4', 'dulH'); sea('sea1', 'sea4'); sea('sea3', 'sea2');
    BOARDS.islands = {
      id: 'islands', title: 'DULIDAN ISLANDS', icon: '🏝️',
      tagline: 'Sieben Inseln, Fähren zwischen den Häfen. Jede Runde kann eine Insel überflutet werden – dort zahlt dann niemand Miete.',
      walk: 'random', ZONES, CITIES, ROUTES, LEVELS: ['Unbebaut', 'Strandbar', 'Bungalow', 'Resort', 'Luxus-Villa'],
      LEVEL_ART: ['', 'eine Strandbar', 'einen Bungalow', 'ein Resort', 'eine Luxus-Villa'],
      RENT_PCT: [0.2, 1, 2.8, 5.5, 8.5],
      RULES: { startMoney: 1500, salary: 40, takeoverMult: 1.5, flood: true, crisis: { from: 8, step: 0.2 }, noLimit: true },
      FACES: [
        { id: 'nav', icon: '🧭', name: 'Kompass', text: 'Du wählst an jeder Kreuzung selbst, wohin es geht.' },
        { id: 'jet', icon: '⛴️', name: 'Fähre', text: 'Statt zu laufen fährst du zu einem Hafen deiner Wahl.' },
        { id: 'pay', icon: '💰', name: 'Zahltag', text: 'Du bekommst Ð150 von der Bank.' },
        { id: 'april', icon: '💖', name: 'April-Chaos', text: 'April macht irgendwas. Gut oder schlecht.' },
        { id: 'shield', icon: '🛟', name: 'Rettungsring', text: 'Diesen Zug zahlst du keine Miete.' },
        { id: 'boss', icon: 'D', name: 'Dulidan-Power', text: 'Du bestimmst selbst, wie weit du läufst (2–12).' },
      ],
      CHAOS: WD.CHAOS, EVENTS: WD.EVENTS, FUNK, POWERS,
      LOOT: [
        { id: 'money', t: '💰 Piratengold! +Ð150.', money: 150 },
        { id: 'shield', t: '🛟 Rettungsring! Blockt die nächste Miete.' },
        { id: 'boost', t: '⚡ Rückenwind! Dein nächster Wurf geht 3 Felder weiter.' },
        { id: 'money', t: '💎 Perle gefunden! +Ð250.', money: 250 },
        { id: 'trap', t: '🦀 Eine Krabbe kneift dich. Arztkosten: −Ð60.', money: -60 },
      ],
      starts: ['pomH', 'zebH', 'pixH', 'donH', 'ohrH', 'aprH'],
      VIEW: { w: 1000, h: 700 },
      words: { zone: 'Insel', city: 'Strand', cities: 'Strände' },
    };
  }

  // =====================================================================
  // 🎪 DULIDAN FESTIVAL – Rundgang übers Festivalgelände, jede Runde ein Headliner
  // =====================================================================
  {
    const ZONES = {
      cmp: { name: 'Campingplatz', color: '#c47a45', build: 50 },
      fod: { name: 'Foodcourt', color: '#ffd83a', build: 50 },
      tec: { name: 'Techno-Zelt', color: '#5fd0ff', build: 100 },
      rap: { name: 'Rap-Bühne', color: '#ff8a2a', build: 100 },
      rck: { name: 'Rock-Stage', color: '#ff3348', build: 150 },
      vip: { name: 'VIP-Bereich', color: '#2fe08a', build: 200 },
      dul: { name: 'Main Stage', color: '#c020b8', build: 250 },
    };
    const p = (id, name, zone, price, quip) => node(id, name, { zone, price, quip });
    const ring = [
      node('in', 'Eingang', { type: 'free', icon: '🎟️', quip: 'Bändchen dran? Dann rein da!' }),
      p('c1', 'Zeltplatz', 'cmp', 60, 'Zelt aufgebaut. Nach zwei Stunden.'), p('c2', 'Dosenravioli-Grill', 'cmp', 60), p('c3', 'Luftmatratzen-Lager', 'cmp', 80, 'Platt. Natürlich.'),
      node('ev1', 'April-Karte', { type: 'event', deck: 'april' }),
      p('f1', 'Döner-Truck', 'fod', 100, 'Festival-Döner. Doppelt so teuer, doppelt so gut.'), p('f2', 'Pommes-Bude', 'fod', 100), p('f3', 'Crêpes-Stand', 'fod', 120),
      node('wc', 'Dixi-Klo', { type: 'free', icon: '🚽', quip: 'Nicht atmen. Einfach nicht atmen.' }),
      p('t1', 'Bass-Bunker', 'tec', 140, 'Der Bass massiert meine Organe.'), p('t2', 'Strobo-Halle', 'tec', 140), p('t3', 'Nebelmaschine', 'tec', 160),
      node('lt1', 'Merch-Kiste', { type: 'loot', quip: 'Merch! Ich nehm ein Shirt in jeder Farbe.' }),
      p('r1', 'Cypher-Kreis', 'rap', 180, 'Ich droppe Bars. Schlechte Bars.'), p('r2', 'Ad-Lib-Ecke', 'rap', 180), p('r3', 'Bars-Bühne', 'rap', 200),
      node('ev2', 'Studio-Karte', { type: 'event', deck: 'studio' }),
      p('k1', 'Moshpit-Arena', 'rck', 220, 'Moshpit! Ich bin klein, aber gefährlich.'), p('k2', 'Gitarren-Turm', 'rck', 220), p('k3', 'Crowdsurf-Graben', 'rck', 240),
      node('lt2', 'Glitzer-Kiste', { type: 'loot', quip: 'Glitzer überall. Für immer.' }),
      p('v1', 'VIP-Lounge', 'vip', 260, 'Bändchen-Kontrolle. Ich bin auf der Liste.'), p('v2', 'Champagner-Bar', 'vip', 260), p('v3', 'Backstage', 'vip', 280),
      node('ev3', 'April-Karte', { type: 'event', deck: 'april' }),
      p('m1', 'Lichtpult', 'dul', 320), p('m2', 'Pyro-Tower', 'dul', 350, 'FEUER! Kontrolliertes Feuer.'), p('m3', 'DULIDAN Main Stage', 'dul', 400, 'Die Main Stage. Headliner: April.'),
    ];
    const cx = 500, cy = 350, rx = 360, ry = 270;
    ring.forEach((n, i) => {
      const a = (-90 + (i * 360) / ring.length) * Math.PI / 180;
      n.x = Math.round(cx + Math.cos(a) * rx); n.y = Math.round(cy + Math.sin(a) * ry);
      n.next = ring[(i + 1) % ring.length].id;
      n.lab = Math.abs(Math.cos(a)) < 0.4 ? (Math.sin(a) < 0 ? 'n' : 's') : (Math.cos(a) > 0 ? 'e' : 'w');
    });
    BOARDS.festival = {
      id: 'festival', title: 'DULIDAN FESTIVAL', icon: '🎪',
      tagline: 'Ein Rundgang übers Festivalgelände. Jede Runde ist eine Area Headliner – dort kostet alles das Dreifache.',
      walk: 'ring', ZONES, CITIES: ring, ROUTES: ring.map((n) => [n.id, n.next, 'ring']),
      LEVELS: ['Leer', 'Stand', 'Zelt', 'Bühne', 'Mega-Stage'], LEVEL_ART: ['', 'einen Stand', 'ein Zelt', 'eine Bühne', 'eine Mega-Stage'],
      RENT_PCT: [0.2, 1, 2.8, 5.5, 8.5],
      RULES: { startMoney: 1500, salary: 50, takeoverMult: 1.5, headliner: true, crisis: { from: 8, step: 0.2 }, noLimit: true },
      FACES: [
        { id: 'pay', icon: '💰', name: 'Gage', text: 'Du bekommst Ð150 Gage.' },
        { id: 'shield', icon: '🎫', name: 'Freikarte', text: 'Diesen Zug zahlst du keine Miete.' },
        { id: 'april', icon: '💖', name: 'April-Chaos', text: 'April macht irgendwas. Gut oder schlecht.' },
        { id: 'boss', icon: 'D', name: 'Dulidan-Power', text: 'Du bestimmst selbst, wie weit du läufst (2–12).' },
        { id: 'encore', icon: '🔁', name: 'Zugabe!', text: 'Die Crowd will mehr: Du darfst nochmal würfeln.' },
        { id: 'surf', icon: '🏄', name: 'Crowdsurfen', text: 'Die Menge trägt dich 3 Felder weiter.' },
      ],
      CHAOS: WD.CHAOS, EVENTS: WD.EVENTS, FUNK, POWERS,
      LOOT: [
        { id: 'money', t: '💰 Ein Bündel Festival-Coins! +Ð150.', money: 150 },
        { id: 'shield', t: '🎫 Backstage-Pass! Blockt die nächste Miete.' },
        { id: 'boost', t: '⚡ Energy-Drink! Dein nächster Wurf geht 3 Felder weiter.' },
        { id: 'money', t: '👕 Seltenes Merch-Shirt verkauft: +Ð200.', money: 200 },
        { id: 'trap', t: '🍺 Jemand hat dir Bier übers Handy gekippt. −Ð80.', money: -80 },
      ],
      starts: ['in', 'in', 'in', 'in', 'in', 'in'],
      VIEW: { w: 1000, h: 700, cx, cy, rx, ry },
      words: { zone: 'Area', city: 'Spot', cities: 'Spots' },
    };
  }

  for (const b of Object.values(BOARDS)) b.CARDS = CARDS;
  root.DULI_BOARDS = Object.assign(root.DULI_BOARDS || {}, BOARDS);
  if (root.DULI_BOARDS.world) root.DULI_BOARDS.world.CARDS = CARDS;
  root.DULI_BOARD_CARDS = CARDS;
  if (isNode) module.exports = BOARDS;
})(typeof window !== 'undefined' ? window : globalThis);
