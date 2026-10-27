// DULIDAN – Spiel des Lebens: Regeln und Spielstand.
// Die KI (April) erzählt und schlägt Änderungen vor. Diese Datei hält die Werte fest, begrenzt die Vorschläge
// der KI, rechnet laufende Effekte, Immobilien, Zeit und Tod. Läuft beim Host; alle anderen bekommen ihre Sicht.
(function (root) {
  const DECK = root.DULI_LEBEN_DECK || (typeof require !== 'undefined' ? require('./leben-deck') : null);
  const STEPS = { m: { months: 1, name: 'Monat' }, q: { months: 3, name: 'Quartal' }, h: { months: 6, name: 'Halbjahr' }, y: { months: 12, name: 'Jahr' } };
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const STATS = ['health', 'happy', 'power'];

  // Vorgefertigte Figuren (Startorte: Ortsmitte, nicht die echten Wohnungen)
  const PRESETS = {
    shaquille: {
      key: 'shaquille', name: 'Shaquille', age: 18, home: { label: 'Duisburg', lat: 51.4344, lng: 6.7623 },
      job: 'Schüler (Abi) und Gründer von Dulidan Studios', education: 'Abitur läuft', title: '', living: 'wohnt bei seinem Opa',
      bonus: 'Studio-Booster: Gründer von Dulidan Studios. Studio-Aufträge, Kunden und Firmenwachstum laufen bei ihm deutlich besser.',
      weakness: 'Macht Abi und Studio gleichzeitig. Zeit und Schlaf sind knapp.',
      stats: { health: 75, happy: 62, power: 12, money: 900 },
      effects: [{ name: 'Dulidan Studios (kleine Aufträge)', money: 150 }, { name: 'Wohnt bei Opa (keine Miete)', money: 0 }],
      relations: [{ name: 'Kimberly', kind: 'Freundin (befreundet)', val: 70 }, { name: 'Justin', kind: 'Freund (befreundet)', val: 70 }, { name: 'Opa', kind: 'Familie, wohnt bei ihm', val: 75 }],
      color: '#c020b8',
    },
    kimberly: {
      key: 'kimberly', name: 'Kimberly', age: 18, home: { label: 'Friedrichsruhe', lat: 49.2496, lng: 9.5266 },
      job: 'Schülerin (Abi)', education: 'Abitur läuft', title: '', living: 'wohnt bei ihren Eltern',
      bonus: 'Queen: Leute helfen ihr von sich aus, und sie kommt leichter aus Ärger raus. Charme öffnet ihr Türen.',
      weakness: 'Zerbrechlich: Sie wird öfter krank, ihre Gesundheit ist nur mittelmäßig belastbar.',
      stats: { health: 58, happy: 66, power: 16, money: 450 },
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', money: 0 }],
      relations: [{ name: 'Justin', kind: 'fester Freund', val: 80 }, { name: 'Shaquille', kind: 'Freund (befreundet)', val: 70 }, { name: 'Eltern', kind: 'Familie, wohnt bei ihnen', val: 65 }],
      color: '#ff7ae6',
    },
    justin: {
      key: 'justin', name: 'Justin', age: 18, home: { label: 'Künzelsau', lat: 49.2817, lng: 9.6893 },
      job: 'Schüler (Abi oder Ausbildung offen)', education: 'Abitur läuft', title: '', living: 'wohnt bei seinen Eltern',
      bonus: 'Mogger: Gewinnt fast jedes soziale Kräftemessen – Ausstrahlung, Einschüchtern, Flirten, Verhandeln. Sigma.',
      weakness: 'Fumbler: Genau in entscheidenden Momenten versagt er oft peinlich.',
      stats: { health: 80, happy: 60, power: 22, money: 550 },
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', money: 0 }],
      relations: [{ name: 'Kimberly', kind: 'feste Freundin', val: 78 }, { name: 'Shaquille', kind: 'Freund (befreundet)', val: 72 }, { name: 'Eltern', kind: 'Familie, wohnt bei ihnen', val: 60 }],
      color: '#3ad1ff',
    },
    april: {
      key: 'april', name: 'April', age: 1, home: { label: 'Duisburg (Dulidan-Server)', lat: 51.4321, lng: 6.7650 },
      job: 'KI auf den Servern von Dulidan Studios', education: '–', title: '', living: 'läuft auf einem Server im Studio',
      bonus: 'Sehr schlau: Wissen, Technik, Recherche und Rechnen fallen ihr leicht.',
      weakness: 'Existiert nur auf dem Server: braucht Strom, Rechenleistung und jemanden, der die Rechnung zahlt. Kann in der echten Welt erst mal kaum etwas selbst anfassen.',
      stats: { health: 70, happy: 55, power: 8, money: 0 },
      effects: [{ name: 'Serverkosten (zahlt Dulidan Studios)', money: 0 }],
      relations: [{ name: 'Shaquille', kind: 'hat sie gebaut', val: 70 }],
      color: '#3ce08a',
    },
  };

  // Immobilienpreise: €/m² nach Stadt, sonst nach Ortsgröße und Land
  const CITY = {
    'münchen': 9000, 'frankfurt am main': 7000, 'hamburg': 6800, 'berlin': 6000, 'stuttgart': 6000, 'düsseldorf': 5200, 'köln': 5000,
    'heidelberg': 5200, 'freiburg im breisgau': 6200, 'heilbronn': 3800, 'öhringen': 3100, 'künzelsau': 3000, 'zweiflingen': 2700,
    'duisburg': 2100, 'essen': 2600, 'dortmund': 2700, 'bochum': 2500, 'gelsenkirchen': 1700, 'oberhausen': 2100, 'mülheim an der ruhr': 2700,
    'leipzig': 3300, 'dresden': 3300, 'hannover': 3800, 'bremen': 3100, 'nürnberg': 4500, 'mainz': 5000, 'wiesbaden': 5000, 'bonn': 4300,
  };
  const COUNTRY = { de: 1, at: 1.2, ch: 2.2, fr: 1.1, nl: 1.3, be: 1.0, lu: 2.0, it: 0.9, es: 0.9, pt: 0.9, gb: 1.6, ie: 1.3, us: 1.5, ca: 1.3, dk: 1.3, se: 1.1, no: 1.4, pl: 0.6, cz: 0.8, tr: 0.4, ae: 1.5, jp: 1.2, mc: 9 };
  const KINDS = {
    flat: { name: 'Wohnung', m2: 70, upkeep: 4.2, rent: 1 },
    house: { name: 'Haus', m2: 140, upkeep: 3.4, rent: 0.95, land: 450 },
    plot: { name: 'Grundstück', m2: 600, upkeep: 0.25, rent: 0, landOnly: true },
  };
  function priceM2(place) {
    const c = String(place.city || '').toLowerCase();
    let p = CITY[c];
    if (!p) p = place.type === 'city' ? 3500 : place.type === 'town' ? 2800 : 2300;
    return Math.round(p * (COUNTRY[String(place.country || 'de').toLowerCase()] || 0.9));
  }
  function quote(place, kind) {
    const K = KINDS[kind], m2p = priceM2(place);
    const price = K.landOnly ? Math.round(K.m2 * m2p * 0.18) : Math.round(K.m2 * m2p + (K.land || 0) * m2p * 0.15);
    const rentMonth = K.landOnly ? 0 : Math.round(K.m2 * m2p * 0.0042 * K.rent);
    return { price, rentMonth, upkeepMonth: Math.round(K.m2 * K.upkeep), m2p };
  }

  // ---------- Spielstand ----------
  let seq = 0;
  const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
  function start(players, settings) {
    const st = Object.assign({ step: 'y', years: 20, death: 'rejoin', exam: 'dice', timer: 0, gm: 'auto' }, settings || {});
    const now = new Date();
    return {
      host: players[0] && players[0].id, players: players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
      settings: st, phase: 'pick', round: 0, date: { y: now.getFullYear(), m: now.getMonth() },
      chars: {}, actions: {}, rolls: {}, checks: {}, quiz: {}, stories: {}, events: {}, exam: {}, world: [], aiTask: null, aiSeq: 0,
      log: [], over: null, finals: {}, gm: null, cards: {}, picks: {}, recap: {}, lastAction: {},
    };
  }
  const months = (S) => STEPS[S.settings.step].months;
  const dateText = (S) => `${MONTHS[S.date.m]} ${S.date.y}`;
  const alive = (S) => S.players.filter((p) => S.chars[p.id] && !S.chars[p.id].dead);
  function log(S, m) { S.log.push(m); if (S.log.length > 60) S.log.shift(); }

  function cleanText(s, max) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max); }
  const num = (v, lo, hi) => { const n = Math.round(Number(v) || 0); return Math.max(lo, Math.min(hi, n)); };
  // Figur aus Vorlage oder eigener Figur bauen
  function makeChar(S, def) {
    const base = PRESETS[def.key] ? JSON.parse(JSON.stringify(PRESETS[def.key])) : {
      key: 'custom', name: cleanText(def.name, 24) || 'Unbekannt', age: num(def.age || 18, 14, 60),
      home: { label: cleanText(def.home && def.home.label, 60) || 'Duisburg', lat: Number(def.home && def.home.lat) || 51.4344, lng: Number(def.home && def.home.lng) || 6.7623 },
      job: cleanText(def.job, 80) || 'Schüler:in', education: cleanText(def.education, 60) || 'Abitur läuft', title: '', living: cleanText(def.living, 80) || 'wohnt bei den Eltern',
      bonus: cleanText(def.bonus, 200) || 'Kein besonderer Bonus.', weakness: cleanText(def.weakness, 200) || 'Keine besondere Schwäche.',
      about: cleanText(def.about, 300),
      stats: { health: 70, happy: 60, power: 12, money: 500 },
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', money: 0 }], relations: [], color: '#ffd83a',
    };
    base.img = typeof def.img === 'string' && def.img.startsWith('data:image/') && def.img.length < 40000 ? def.img : null;
    base.location = base.home.label;
    base.bornIdx = S.date.y * 12 + S.date.m - base.age * 12;
    // Vorlagen nennen Geld pro Monat; ein laufender Effekt zählt pro Runde
    base.effects = base.effects.map((e) => Object.assign({ id: uid('e'), health: 0, happy: 0, power: 0, money: 0, until: 0 }, e, { money: (e.money || 0) * months(S) }));
    base.props = [];
    base.flags = { company: def.key === 'shaquille' ? 1 : 0, partner: def.key === 'kimberly' ? 'Justin' : def.key === 'justin' ? 'Kimberly' : '' };
    const goals = DECK ? Object.keys(DECK.GOALS) : [];
    base.goal = DECK && DECK.GOALS[def.goal] ? def.goal : goals[Math.floor(Math.random() * goals.length)] || '';
    base.chronicle = [];
    base.dead = false;
    return base;
  }

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    const isHost = pid === S.host;
    const me = S.chars[pid];
    switch (a.type) {
      case 'pick': {
        if (S.phase !== 'pick' && !(S.phase === 'act' && (!me || me.dead) && S.settings.death === 'rejoin')) return 'Gerade kann man keine Figur wählen.';
        const def = a.char || {};
        if (def.key && PRESETS[def.key] && Object.entries(S.chars).some(([id, c]) => id !== pid && !c.dead && c.key === def.key)) return 'Die Figur hat schon jemand.';
        const c = makeChar(S, def);
        if (me && me.dead) c.chronicle.push({ d: dateText(S), t: `Neues Leben nach ${me.name}.` });
        S.chars[pid] = c;
        if (S.phase === 'act') {
          S.stories[pid] = `${c.name} betritt die Welt. ${c.living}.`; S.events[pid] = 'Was machst du als Erstes?';
          delete S.cards[pid]; delete S.recap[pid]; delete S.checks[pid];
          if (S.gm === 'builtin' && DECK) { const card = DECK.cardFor(S, pid); S.cards[pid] = card; S.events[pid] = card.text; }
        }
        log(S, `${S.players.find((p) => p.id === pid).name} spielt ${c.name}.`);
        return null;
      }
      case 'begin': {
        if (!isHost) return 'Nur der Host startet.';
        if (S.phase !== 'pick') return 'Läuft schon.';
        const missing = S.players.filter((p) => !S.chars[p.id]);
        if (missing.length) return `${missing.map((p) => p.name).join(', ')} hat noch keine Figur.`;
        S.gm = S.settings.gm === 'builtin' || !DECK ? (DECK ? 'builtin' : 'ai') : S.settings.gm === 'ai' ? 'ai' : (a.ai ? 'ai' : 'builtin');
        S.phase = 'think'; S.aiTask = 'intro'; S.aiSeq++;
        builtinNow(S);
        return null;
      }
      case 'do': {
        if (S.phase !== 'act') return 'Gerade wird nicht gespielt.';
        if (!me || me.dead) return 'Deine Figur lebt nicht mehr.';
        const card = S.cards[pid];
        if (Number.isInteger(a.choice) && card) {
          const o = card.opts[a.choice];
          if (!o) return 'Diese Wahl gibt es nicht.';
          if (o.cost && me.stats.money < o.cost) return `Dafür fehlen dir ${eur(o.cost - me.stats.money)}.`;
          S.picks[pid] = a.choice;
          S.actions[pid] = o.t;
        } else {
          const t = cleanText(a.text, 600);
          if (t.length < 2) return 'Schreib, was du tust.';
          delete S.picks[pid];
          S.actions[pid] = t;
        }
        if (a.quiz && S.exam[pid]) S.quiz[pid] = { ok: num(a.quiz.ok, 0, 10), total: num(a.quiz.total, 1, 10) };
        if (alive(S).every((p) => S.actions[p.id])) toThink(S);
        return null;
      }
      case 'undo': {
        if (S.phase !== 'act') return null;
        delete S.actions[pid]; delete S.picks[pid];
        return null;
      }
      case 'force': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase !== 'act') return null;
        toThink(S);
        return null;
      }
      case 'ai': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase !== 'think' || a.seq !== S.aiSeq) return null;
        // Ohne April weiter = die eingebaute Spielleitung übernimmt diese Runde
        if (a.failed && DECK) applyAI(S, DECK.run(S));
        else applyAI(S, a.data || {}, a.failed);
        return null;
      }
      case 'endGame': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase === 'over' || S.phase === 'think') return null;
        S.phase = 'think'; S.aiTask = 'final'; S.aiSeq++;
        builtinNow(S);
        return null;
      }
      case 'gm': {
        // Host schaltet die Spielleitung um (z. B. Schlüssel nachgetragen oder KI streikt)
        if (!isHost) return 'Nur der Host.';
        if (!DECK && a.gm === 'builtin') return null;
        S.gm = a.gm === 'ai' ? 'ai' : 'builtin';
        if (S.gm === 'builtin' && S.phase === 'act') alive(S).forEach((p) => { if (!S.cards[p.id]) { const card = DECK.cardFor(S, p.id); S.cards[p.id] = card; S.events[p.id] = card.text; } });
        builtinNow(S);
        return null;
      }
      case 'buy': case 'rent': case 'move': case 'lease': case 'sell':
        return estate(S, pid, a);
    }
    return 'Unbekannte Aktion.';
  }
  function toThink(S) {
    S.phase = 'think'; S.aiTask = 'resolve'; S.aiSeq++;
    // Würfel für jede Person, die eine Aktion hat (W20) – die KI muss mit diesem Wurf arbeiten
    alive(S).forEach((p) => { S.rolls[p.id] = 1 + Math.floor(Math.random() * 20); });
    builtinNow(S);
  }
  // Eingebaute Spielleitung rechnet sofort, ohne auf eine KI zu warten
  function builtinNow(S) {
    if (S.gm === 'builtin' && DECK && S.phase === 'think') applyAI(S, DECK.run(S));
  }

  // ---------- Immobilien (ohne KI, feste Regeln) ----------
  function estate(S, pid, a) {
    const c = S.chars[pid];
    if (!c || c.dead) return 'Deine Figur lebt nicht mehr.';
    if (S.phase !== 'act') return 'Kaufen und Umziehen geht, während ihr eure Züge schreibt.';
    const M = months(S);
    if (a.type === 'buy' || a.type === 'rent') {
      const kind = KINDS[a.kind] ? a.kind : 'flat';
      const place = { city: cleanText(a.place && a.place.city, 60), type: cleanText(a.place && a.place.type, 20), country: cleanText(a.place && a.place.country, 4) };
      const label = cleanText(a.label, 120) || 'Unbekannte Adresse';
      const lat = Number(a.lat), lng = Number(a.lng);
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return 'Ungültiger Ort.';
      const q = quote(place, kind);
      if (a.type === 'rent') {
        if (kind === 'plot') return 'Grundstücke mietet man nicht.';
        endEffect(c, (e) => e.rent);
        const cost = q.rentMonth + Math.round(q.upkeepMonth * 0.6);
        c.effects.push({ id: uid('e'), name: `Miete ${KINDS[kind].name}, ${label}`, money: -cost * M, health: 0, happy: 2, power: 0, until: 0, rent: true });
        c.location = label; c.home = { label, lat, lng };
        c.living = `wohnt zur Miete (${KINDS[kind].name}) in ${label}`;
        endEffect(c, (e) => /keine Miete/.test(e.name));
        c.chronicle.push({ d: dateText(S), t: `Zieht zur Miete in ${label}.` });
        log(S, `${c.name} zieht zur Miete nach ${label} (${eur(cost)} im Monat).`);
        return null;
      }
      const down = a.finance ? Math.round(q.price * 0.2) : q.price;
      if (c.stats.money < down) return `Dafür brauchst du ${eur(down)}${a.finance ? ' Eigenkapital (20 %)' : ''}.`;
      c.stats.money -= down;
      const prop = { id: uid('p'), kind, label, lat, lng, value: q.price, rentMonth: q.rentMonth, upkeepMonth: q.upkeepMonth, leased: false, bought: dateText(S) };
      c.props.push(prop);
      c.effects.push({ id: uid('e'), name: `Unterhalt ${KINDS[kind].name}, ${label}`, money: -q.upkeepMonth * M, health: 0, happy: 0, power: 0, until: 0, prop: prop.id });
      if (a.finance) {
        const loan = q.price - down, years = 25, rateMonth = Math.round((loan * (0.045 + 0.02)) / 12);
        c.effects.push({ id: uid('e'), name: `Kredit ${KINDS[kind].name}, ${label}`, money: -rateMonth * M, health: 0, happy: -1, power: 0, until: S.round + Math.ceil((years * 12) / M), prop: prop.id, loan: true });
      }
      c.stats.power = Math.min(100, c.stats.power + (q.price > 500000 ? 3 : 1));
      c.chronicle.push({ d: dateText(S), t: `Kauft ${KINDS[kind].name} in ${label} für ${eur(q.price)}${a.finance ? ' (finanziert)' : ''}.` });
      log(S, `${c.name} kauft ${KINDS[kind].name} in ${label} für ${eur(q.price)}${a.finance ? `, ${eur(down)} Eigenkapital` : ''}.`);
      return null;
    }
    const prop = c.props.find((p) => p.id === a.prop);
    if (!prop) return 'Das gehört dir nicht.';
    if (a.type === 'move') {
      if (prop.kind === 'plot') return 'Auf einem leeren Grundstück kann man nicht wohnen.';
      if (prop.leased) { prop.leased = false; endEffect(c, (e) => e.lease === prop.id); }
      endEffect(c, (e) => e.rent || /keine Miete/.test(e.name));
      c.location = prop.label; c.home = { label: prop.label, lat: prop.lat, lng: prop.lng };
      c.living = `wohnt im eigenen ${KINDS[prop.kind].name} in ${prop.label}`;
      c.stats.happy = Math.min(100, c.stats.happy + 5);
      c.chronicle.push({ d: dateText(S), t: `Zieht in die eigene ${KINDS[prop.kind].name} in ${prop.label}.` });
      log(S, `${c.name} zieht ins eigene ${KINDS[prop.kind].name} in ${prop.label}.`);
      return null;
    }
    if (a.type === 'lease') {
      if (prop.kind === 'plot') return 'Ein leeres Grundstück kann man nicht vermieten.';
      if (c.home && c.home.label === prop.label && /eigenen/.test(c.living)) return 'Du wohnst da selbst.';
      prop.leased = !prop.leased;
      if (prop.leased) c.effects.push({ id: uid('e'), name: `Mieteinnahmen, ${prop.label}`, money: prop.rentMonth * M, health: 0, happy: 0, power: 0, until: 0, lease: prop.id });
      else endEffect(c, (e) => e.lease === prop.id);
      log(S, `${c.name} ${prop.leased ? 'vermietet' : 'kündigt die Vermietung von'} ${prop.label}.`);
      return null;
    }
    if (a.type === 'sell') {
      const loanLeft = c.effects.filter((e) => e.prop === prop.id && e.loan).reduce((s, e) => s + Math.max(0, (e.until - S.round)) * -e.money, 0);
      const back = Math.round(prop.value * 0.95 - loanLeft);
      c.stats.money += back;
      c.props = c.props.filter((p) => p !== prop);
      endEffect(c, (e) => e.prop === prop.id || e.lease === prop.id);
      if (c.home && c.home.label === prop.label) { c.living = 'sucht gerade eine Bleibe'; }
      c.chronicle.push({ d: dateText(S), t: `Verkauft ${KINDS[prop.kind].name} in ${prop.label}.` });
      log(S, `${c.name} verkauft ${prop.label} (${back >= 0 ? '+' : ''}${eur(back)} nach Kredit und Makler).`);
      return null;
    }
    return 'Unbekannt.';
  }
  function endEffect(c, f) { c.effects = c.effects.filter((e) => !f(e)); }
  const eur = (n) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('de-DE')} €`;

  // ---------- KI-Antwort übernehmen (mit Grenzen) ----------
  function applyAI(S, data, failed) {
    const task = S.aiTask;
    const before = {};
    Object.entries(S.chars).forEach(([id, c]) => { before[id] = Object.assign({}, c.stats); });
    if (task === 'resolve') S.lastAction = Object.assign({}, S.actions);
    applyData(S, task, data, failed);
    if (task !== 'final') S.recap = {};
    if (task !== 'final') Object.entries(S.chars).forEach(([id, c]) => {
      const b = before[id];
      if (!b) return;
      const r = {};
      ['money', 'health', 'happy', 'power'].forEach((k) => { if (c.stats[k] !== b[k]) r[k] = c.stats[k] - b[k]; });
      S.recap[id] = r;
    });
    // Karten der eingebauten Spielleitung (bei KI-Antworten frei schreiben)
    if (task !== 'final') {
      S.cards = {};
      if (data.builtin) (data.players || []).forEach((x) => { if (x && x.card && S.chars[x.id] && !S.chars[x.id].dead) S.cards[x.id] = x.card; });
    }
    S.picks = {};
    // Zeit abgelaufen → bei eingebauter Spielleitung gleich die Lebensbilanz
    builtinNow(S);
  }
  function applyData(S, task, data, failed) {
    S.aiTask = null;
    const M = months(S);
    const byId = {};
    (Array.isArray(data.players) ? data.players : []).forEach((x) => { if (x && S.chars[x.id]) byId[x.id] = x; });
    if (task === 'final') {
      S.players.forEach((p) => {
        const x = byId[p.id] || {}, c = S.chars[p.id];
        const sc = c && DECK ? DECK.score(c) : null;
        S.finals[p.id] = { story: cleanText(x.story, 1500) || 'Ein Leben. Gelebt. Mehr sagt April dazu heute nicht.', title: cleanText(x.title, 80),
          score: sc ? sc.total : 0, parts: sc ? sc.parts : null, goalDone: !!(sc && sc.parts.goal) };
      });
      const fw = cleanText(data.world, 400);
      if (fw) S.world.unshift({ d: dateText(S), t: fw });
      S.phase = 'over';
      S.over = { d: dateText(S) };
      return;
    }
    if (task === 'resolve') {
      // Zeit vergeht, laufende Effekte greifen
      S.round++;
      const mm = S.date.m + M;
      S.date = { y: S.date.y + Math.floor(mm / 12), m: mm % 12 };
    }
    // Weltgeschehen bekommt das neue Datum
    const w = cleanText(data.world, 400);
    if (w) { S.world.unshift({ d: dateText(S), t: w }); S.world = S.world.slice(0, 12); }
    alive(S).forEach((p) => {
      const c = S.chars[p.id], x = byId[p.id];
      if (task === 'resolve') {
        c.age = Math.floor((S.date.y * 12 + S.date.m - c.bornIdx) / 12);
        // Werte-Effekte der eingebauten Spielleitung gelten pro Jahr und werden auf die Rundenlänge umgerechnet
        const f = M / 12, stoch = (v) => Math.floor(v + Math.random());
        c.effects.forEach((e) => {
          c.stats.money += e.money;
          STATS.forEach((k) => { if (e[k]) c.stats[k] = clampStat(c.stats[k] + (e.yr ? stoch(e[k] * f) : e[k])); });
        });
        c.effects = c.effects.filter((e) => !e.until || e.until > S.round);
      }
      if (!x) {
        if (failed || task) {
          S.stories[p.id] = failed ? 'April hat gerade Funkstille. Das Leben geht trotzdem weiter: Rechnungen kommen, die Zeit vergeht.' : (S.stories[p.id] || '');
          S.events[p.id] = S.events[p.id] || 'Was machst du als Nächstes?';
        }
        return;
      }
      S.stories[p.id] = cleanText(x.story, 1400);
      S.events[p.id] = cleanText(x.next_event, 600) || 'Was machst du als Nächstes?';
      S.exam[p.id] = !!x.exam;
      const ck = x.check || {};
      if (task === 'resolve' && ck.used) S.checks[p.id] = { stat: cleanText(ck.stat, 40), dc: num(ck.dc, 1, 30), roll: S.rolls[p.id] || 0, success: !!ck.success, mod: num(ck.mod, -15, 15) };
      else if (task === 'resolve') delete S.checks[p.id];
      // Einmalige Änderungen, begrenzt
      const d = x.delta || {};
      const cap = Math.max(25000, Math.abs(c.stats.money) * 1.5 + c.props.reduce((s, q) => s + q.value, 0) * 0.5);
      c.stats.money += num(d.money, -cap, cap);
      STATS.forEach((k) => { c.stats[k] = clampStat(c.stats[k] + num(d[k], -45, 45)); });
      // Laufende Effekte
      (Array.isArray(x.end_effects) ? x.end_effects : []).slice(0, 6).forEach((name) => {
        const n = cleanText(name, 80).toLowerCase();
        if (n) c.effects = c.effects.filter((e) => e.prop || e.rent || e.lease || e.name.toLowerCase() !== n);
      });
      (Array.isArray(x.add_effects) ? x.add_effects : []).slice(0, 4).forEach((e) => {
        const name = cleanText(e.name, 80);
        if (!name || c.effects.length >= 18) return;
        const mcap = Math.max(4000, Math.abs(c.stats.money) * 0.3) * Math.max(1, months(S) / 3);
        c.effects = c.effects.filter((o) => o.name !== name);
        c.effects.push({ id: uid('e'), name, money: num(e.money, -mcap, mcap), health: num(e.health, -12, 12), happy: num(e.happy, -12, 12), power: num(e.power, -12, 12), until: num(e.rounds, 0, 400) ? S.round + num(e.rounds, 0, 400) : 0, yr: !!e.yr });
      });
      // Beziehungen
      (Array.isArray(x.relations) ? x.relations : []).slice(0, 6).forEach((r) => {
        const name = cleanText(r.name, 40);
        if (!name) return;
        let rel = c.relations.find((o) => o.name.toLowerCase() === name.toLowerCase());
        if (!rel) { if (c.relations.length >= 20) return; rel = { name, kind: '', val: 50 }; c.relations.push(rel); }
        if (r.kind) rel.kind = cleanText(r.kind, 60);
        rel.val = num(rel.val + num(r.change, -60, 60), 0, 100);
        if (r.remove) c.relations = c.relations.filter((o) => o !== rel);
      });
      const st = x.status || {};
      if (st.job) c.job = cleanText(st.job, 100);
      if (st.education) c.education = cleanText(st.education, 80);
      if (st.location) c.location = cleanText(st.location, 80);
      if (st.title != null && st.title !== '') c.title = cleanText(st.title, 80) === '-' ? '' : cleanText(st.title, 80);
      if (st.living) c.living = cleanText(st.living, 100);
      const ch = cleanText(x.chronicle, 200);
      if (ch) c.chronicle.push({ d: dateText(S), t: ch });
      if (c.chronicle.length > 80) c.chronicle.splice(0, c.chronicle.length - 80);
      // Tod: wenn die Gesundheit weg ist oder die KI es sagt und es plausibel ist
      if (c.stats.health <= 0 || (x.dead && c.stats.health <= 25)) {
        c.dead = true;
        c.deathReason = cleanText(x.death_reason, 200) || 'Die Gesundheit hat nicht mehr mitgespielt.';
        c.chronicle.push({ d: dateText(S), t: `Stirbt mit ${c.age}. ${c.deathReason}` });
        log(S, `${c.name} ist gestorben (${c.age}). ${c.deathReason}`);
      }
    });
    if (task === 'resolve') { S.actions = {}; S.quiz = {}; }
    // Spielende?
    const yearsDone = (S.round * months(S)) / 12;
    const living = alive(S);
    if ((S.settings.years && yearsDone >= S.settings.years) || !living.length || (S.settings.death === 'win' && S.players.length > 1 && living.length <= 1)) {
      S.phase = 'think'; S.aiTask = 'final'; S.aiSeq++;
      return;
    }
    S.phase = 'act';
    S.deadline = S.settings.timer ? Date.now() + S.settings.timer * 1000 : 0;
  }
  const clampStat = (v) => Math.max(0, Math.min(100, Math.round(v)));

  // Sicht: Alle sehen alles außer den noch nicht ausgewerteten Zügen der anderen
  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    if (pid !== S.host) {
      Object.keys(V.actions).forEach((k) => { if (k !== pid) V.actions[k] = '•'; });
      Object.keys(V.picks || {}).forEach((k) => { if (k !== pid) delete V.picks[k]; });
    }
    return V;
  }
  const bot = () => null;

  const LEBEN = { STEPS, MONTHS, PRESETS, KINDS, quote, priceM2, start, act, view, bot, months, dateText, alive, eur };
  if (typeof module !== 'undefined' && module.exports) module.exports = LEBEN;
  else root.DULI_LEBEN = LEBEN;
})(typeof window !== 'undefined' ? window : globalThis);
