// Dulidanopoly REALISTIC – Immobilien wie im echten Leben. Eine Runde ist ein Quartal.
// Kaufnebenkosten, Kredite mit SCHUFA, Mieter mit Mietspiegel, Hotels mit Auslastung,
// Betriebskosten, Steuererklärung (Steuerberater oder selbst rechnen), Anwälte und Gerichte.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.DULI_DATA;
  const { GROUPS, TOKENS, PLAYER_COLORS } = D;
  const GKEYS = Object.keys(GROUPS);
  const MODES = ['realistic'];

  // ---------- Brett: klassisches Brett, echte Preise, echte Ämter ----------
  const RENAME = {
    0: { name: 'LOS', sub: 'Neues Quartal' },
    2: { name: 'Mieter-Post' }, 17: { name: 'Mieter-Post' }, 33: { name: 'Mieter-Post' },
    7: { name: 'Post vom Amt' }, 22: { name: 'Post vom Amt' }, 36: { name: 'Post vom Amt' },
    4: { name: 'Finanzamt Duisburg', icon: '🧾', amount: 0 },
    38: { name: 'Betriebsprüfung', icon: '🔍', amount: 0 },
    10: { name: 'Amtsgericht Düsseldorf', sub: 'Nur als Zuschauer' },
    12: { name: 'Stadtwerke · Strom', icon: '⚡', sub: 'Beteiligung an den Stadtwerken' },
    28: { name: 'Stadtwerke · Wasser', icon: '💧', sub: 'Beteiligung an den Stadtwerken' },
    20: { name: 'KfW-Förderbank', sub: '15 % Zuschuss fürs nächste Bauprojekt' },
    30: { name: 'Klage! Ab vors Gericht', sub: 'Verfahren in Düsseldorf' },
  };
  const SPACES = D.SPACES.map((sp, i) => {
    const o = Object.assign({}, sp, RENAME[i] || {});
    if (sp.type === 'prop') o.price = sp.price * 2500;
    if (sp.type === 'rail') o.price = 520000;
    if (sp.type === 'util') o.price = 380000;
    return o;
  });
  const BOARD = Object.assign({}, D.BOARDS.normal, { id: 'real', SPACES, go: 0, moneyMult: 1 });
  D.BOARDS.real = BOARD;
  const N = 40, COURT = 10, BUYABLE = ['prop', 'rail', 'util'];

  // Pro Farbgruppe: Mietspiegel €/m² kalt, Baukosten €/m², Hotel-Zimmerpreis (ADR), Basis-Auslastung
  const LAGE = {
    brown: { m2: 10.0, bau: 2600, adr: 70, occ: 0.58, lage: 'einfache Lage' },
    lblue: { m2: 11.0, bau: 2700, adr: 78, occ: 0.60, lage: 'Kleinstadt (BW)' },
    pink: { m2: 12.5, bau: 2850, adr: 88, occ: 0.62, lage: 'mittlere Lage' },
    orange: { m2: 13.5, bau: 2950, adr: 98, occ: 0.65, lage: 'mittlere Lage' },
    red: { m2: 15.0, bau: 3100, adr: 110, occ: 0.67, lage: 'gute Lage' },
    yellow: { m2: 16.5, bau: 3250, adr: 124, occ: 0.70, lage: 'Innenstadt' },
    green: { m2: 18.5, bau: 3450, adr: 142, occ: 0.72, lage: 'sehr gute Lage' },
    dblue: { m2: 22.0, bau: 3800, adr: 170, occ: 0.75, lage: 'Toplage' },
  };
  const SLOTS = 6, APT_M2 = 75, ROOMS = 14;
  const SALARY = 16500, LIVING = 8400, START_CASH = 250000;
  const SEASON = [0.78, 1.05, 1.18, 0.99];
  const SEASON_NAME = ['Winter', 'Frühling', 'Sommer', 'Herbst'];
  const PRICE_LVL = {
    budget: { adr: 0.82, occ: 1.15, name: 'Budget' },
    normal: { adr: 1, occ: 1, name: 'Standard' },
    premium: { adr: 1.22, occ: 0.84, name: 'Premium' },
  };
  const TENANTS = ['Familie Yılmaz', 'Herr Schmidt', 'Frau Kowalski', 'WG Studis', 'Familie Nguyen', 'Herr Becker', 'Frau Öztürk', 'Paar Weber', 'Herr Müller', 'Frau Hoffmann', 'Familie Popescu', 'Herr Krause', 'Frau Demir', 'Rentnerpaar Wagner', 'Azubi Kevin', 'Dr. Fischer', 'Familie Haddad', 'Frau Schulz', 'Herr Kaya', 'Pärchen Lange'];
  const BOT_NAMES = ['Immo-Ingo', 'Makler Mike', 'Vermieterin Vera', 'Baulöwe Bernd', 'Investor Ivo', 'Hausverwalterin Hanna'];

  let rng = Math.random;
  const d6 = () => 1 + Math.floor(rng() * 6);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const r0 = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const money = (n) => (n < 0 ? '−' : '') + 'Ð' + Math.abs(r0(n)).toLocaleString('de-DE');
  const P = (S, id) => S.players.find((p) => p.id === id);
  const alive = (S) => S.players.filter((p) => !p.bankrupt);
  const gi = (i) => GKEYS.indexOf(SPACES[i].group);
  const qName = (q) => `Q${((q - 1) % 4) + 1} ${2026 + Math.floor((q - 1) / 4)}`;

  function log(S, m) {
    S.log.push(m);
    S.logSeq = (S.logSeq || 0) + 1;
    if (S.log.length > 160) S.log.splice(0, S.log.length - 160);
  }

  // ---------- Werte ----------
  const ownsGroup = (S, pid, g) => SPACES.every((sp, i) => sp.group !== g || (S.props[i] && S.props[i].owner === pid));
  const owned = (S, pid) => Object.keys(S.props).map(Number).filter((k) => S.props[k].owner === pid);
  const usedSlots = (st) => st.units.reduce((a, u) => a + (u.k === 'hotel' ? 2 : 1), 0);
  const landValue = (S, i) => SPACES[i].price * S.mk.idx;
  function unitCost(S, i, k) {
    const L = LAGE[SPACES[i].group];
    return r0((k === 'apt' ? APT_M2 * L.bau : ROOMS * (38000 + 7000 * gi(i))) * S.mk.build);
  }
  const permitFee = (k) => (k === 'apt' ? 1800 : 6500);
  function unitValue(S, u) {
    if (u.ready > S.q) return u.cost;
    return u.cost * (S.mk.idx / u.idx0) * Math.max(0.6, 1 - 0.004 * (S.q - u.ready));
  }
  function propValue(S, i) {
    const st = S.props[i];
    return r0(landValue(S, i) + (st && st.units ? st.units.reduce((a, u) => a + unitValue(S, u), 0) : 0));
  }
  // Mietspiegel (monatliche Kaltmiete für 75 m²), ganze Farbgruppe = Quartier aufgewertet
  function mietspiegel(S, i) {
    const st = S.props[i];
    const quartier = st && st.owner && ownsGroup(S, st.owner, SPACES[i].group) ? 1.08 : 1;
    return r0(LAGE[SPACES[i].group].m2 * APT_M2 * S.mk.rent * quartier);
  }
  const grest = (i) => (SPACES[i].group === 'lblue' || i === 35 ? 0.05 : 0.065);
  function buyCosts(S, i, price) {
    const g = r0(price * grest(i)), notar = r0(price * 0.015), grundbuch = r0(price * 0.005);
    return { grest: g, notar, grundbuch, total: g + notar + grundbuch, rate: grest(i) };
  }

  // ---------- Bank ----------
  const debt = (p) => p.loans.reduce((a, L) => a + L.rest, 0);
  const annuity = (L) => (L.orig * (L.rate + L.tilg)) / 400;
  function rateFor(S, p) {
    const s = p.schufa;
    return Math.round((S.mk.zins + (s >= 95 ? 0 : s >= 90 ? 0.35 : s >= 80 ? 0.9 : s >= 70 ? 1.8 : 3.2)) * 100) / 100;
  }
  const dispoLimit = (p) => 15000 + (p.schufa >= 80 ? 10000 : 0);
  function collateral(S, p) { return owned(S, p.id).reduce((a, k) => a + propValue(S, k), 0); }
  // Wie viel Kredit gibt die Bank noch? Beleihung bis 80 % und Kapitaldienst aus Gehalt + Mieten
  function loanRoom(S, p, extraCollateral = 0) {
    if (p.schufa < 50) return 0;
    const coll = 0.8 * (collateral(S, p) + extraCollateral) - debt(p);
    const rate = rateFor(S, p);
    const svcFree = 0.5 * SALARY + 0.8 * Math.max(0, p.opNet || 0) - p.loans.reduce((a, L) => a + annuity(L), 0);
    const svc = svcFree / ((rate + 1.5) / 400);
    return Math.max(0, Math.floor(Math.min(coll, svc) / 1000) * 1000);
  }
  function takeLoan(S, p, amt, why) {
    const L = { id: 'k' + (S.loanSeq = (S.loanSeq || 0) + 1), orig: amt, rest: amt, rate: rateFor(S, p), tilg: 1.5, q: S.q, why };
    p.loans.push(L);
    p.money += amt;
    return L;
  }
  function pay(S, p, amt) {
    p.money -= amt;
    if (amt > 0) p.stats.paid = (p.stats.paid || 0) + amt;
  }

  // ---------- Hotel ----------
  function hotelQ(S, i, u, p, qi) {
    const L = LAGE[SPACES[i].group];
    const lvl = PRICE_LVL[u.lvl] || PRICE_LVL.normal;
    const base = ROOMS * L.occ * L.adr * 91 * S.mk.rent;
    const quartier = ownsGroup(S, p.id, SPACES[i].group) ? 1.05 : 1;
    const occ = clamp(L.occ * SEASON[qi] * S.mk.hotel * lvl.occ * quartier * (p.badRep ? 0.85 : 1), 0.05, 0.97);
    const nights = ROOMS * occ * 91;
    const adr = L.adr * lvl.adr * S.mk.rent;
    const rev = nights * adr;
    return {
      occ, rev: r0(rev), ota: r0(rev * 0.15),
      water: r0(nights * L.adr * 0.06), energy: r0(nights * L.adr * 0.12), clean: r0(nights * L.adr * 0.12),
      staff: r0(base * 0.27), fixed: r0(base * 0.08), maint: r0(u.cost * 0.0025),
    };
  }
  function hotelNet(h) { return h.rev - h.ota - h.water - h.energy - h.clean - h.staff - h.fixed - h.maint; }

  // ---------- Spielstand ----------
  function newStats() { return { built: 0, bought: 0, rentGot: 0, paid: 0, cases: 0, won: 0, taxes: 0, doubles: 0, jail: 0, cards: 0, maxRent: 0 }; }
  function start(S) {
    if (S.players.length < 2) return 'Ihr braucht mindestens 2 Spieler.';
    if (S.players.some((p) => !p.token)) return 'Jeder muss zuerst eine Figur wählen.';
    const st = S.settings || {};
    S.mode = 'realistic';
    S.isReal = true;
    S.size = 'real';
    S.isCasino = false;
    S.settings = Object.assign({}, st, { mood: false });
    const years = [3, 5, 10, 0].includes(Number(st.years)) ? Number(st.years) : 5;
    S.settings.years = years;
    S.players.forEach((p, i) => {
      Object.assign(p, {
        money: START_CASH, pos: 0, bankrupt: false, court: 0, loans: [], schufa: 88 + Math.floor(rng() * 10),
        rs: false, elem: false, kfw: false, opNet: 0, taxPre: 0, taxDue: null, taxGap: 0, lossCarry: 0, badRep: 0,
        yr: newYear(), stmt: null, stats: newStats(), offered: false, botOps: 0, inJail: false, jailFree: [], skip: 0,
      });
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });
    S.props = {};
    SPACES.forEach((sp, i) => { if (BUYABLE.includes(sp.type)) S.props[i] = { owner: null, units: [], houses: 0, mort: false, bought: 0, paid: 0, blocked: 0 }; });
    S.mk = { idx: 1, rent: 1, build: 1, zins: 3.6, hotel: 1, shock: null, shockLeft: 0, hist: [1] };
    S.decks = { amt: shuffle(CARDS.map((c, k) => k).filter((k) => CARDS[k].deck === 'amt')), mieter: shuffle(CARDS.map((c, k) => k).filter((k) => CARDS[k].deck === 'mieter')) };
    Object.assign(S, {
      phase: 'play', cur: 0, sub: 'roll', turnNo: 1, round: 1, q: 1, dice: [1, 1], rollId: 0, doublesCount: 0,
      card: null, offer: null, back: null, winner: null, ranking: null, lastLand: null, pot: 0, event: null, trade: null, auction: null, debt: null,
    });
    S.hist = [S.players.map((p) => r0(netWorth(S, p)))];
    S.log = [];
    log(S, `🏢 DULIDANOPOLY REALISTIC startet in ${qName(1)}. Alle haben ${money(START_CASH)} Eigenkapital und einen Job.`);
    log(S, years ? `Gespielt wird ${years} Jahre (${years * 4} Quartale). Am Ende zählt das Nettovermögen.` : 'Gespielt wird, bis nur noch eine Person nicht insolvent ist.');
    S.sub = startSub(S, S.players[0]);
    return null;
  }
  function newYear() { return { vv: 0, gew: 0, gain: 0, int: 0, rev: 0, pre: 0, extraAfa: 0 }; }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function netWorth(S, p) {
    if (p.bankrupt) return 0;
    return p.money + collateral(S, p) - debt(p);
  }

  function startSub(S, p) {
    if (p.money < -dispoLimit(p)) return 'debt';
    if (p.taxDue) return 'tax';
    if (p.court > 0) return 'court';
    return 'roll';
  }
  function checkDebt(S, p) {
    if (p.money < -dispoLimit(p) && S.sub !== 'debt') { S.back = S.sub === 'roll' ? 'roll' : 'end'; S.sub = 'debt'; }
  }

  // ---------- Zug ----------
  function roll(S, p) {
    const a = d6(), b = d6();
    S.dice = [a, b];
    S.rollId++;
    const dbl = a === b;
    if (dbl) { S.doublesCount++; p.stats.doubles++; } else S.doublesCount = 0;
    if (S.doublesCount >= 3) {
      log(S, `${p.name} würfelt den dritten Pasch. Das wirkt verdächtig: Vorladung nach Düsseldorf!`);
      toCourt(S, p);
      return;
    }
    const from = p.pos;
    p.pos = (p.pos + a + b) % N;
    if (p.pos < from) log(S, `${p.name} zieht über LOS.`);
    log(S, `${p.name} würfelt ${a}+${b}${dbl ? ' (Pasch)' : ''} → ${SPACES[p.pos].name}.`);
    S.rolledDouble = dbl;
    land(S, p);
    if (S.sub === 'roll' || S.sub === 'end') S.sub = dbl && !p.court ? 'roll' : 'end';
    checkDebt(S, p);
  }
  function toCourt(S, p) {
    p.pos = COURT;
    p.court = 2;
    p.stats.jail++;
    S.doublesCount = 0;
    S.rolledDouble = false;
    S.sub = 'end';
  }
  function land(S, p) {
    const i = p.pos, sp = SPACES[i];
    S.lastLand = i;
    S.sub = 'end';
    if (BUYABLE.includes(sp.type)) {
      const st = S.props[i];
      if (!st.owner) { S.sub = 'buy'; return; }
      if (st.owner !== p.id) visit(S, p, i);
      return;
    }
    if (sp.type === 'tax') return audit(S, p, i === 38 ? 1 : 0.5, i === 38);
    if (sp.type === 'april') return draw(S, p, 'amt');
    if (sp.type === 'studio') return draw(S, p, 'mieter');
    if (sp.type === 'gotojail') {
      log(S, `⚖️ ${p.name} wird verklagt und muss vor Gericht in Düsseldorf.`);
      return toCourt(S, p);
    }
    if (sp.type === 'parking') {
      if (!p.kfw) log(S, `🏦 ${p.name} bekommt eine KfW-Förderzusage: 15 % Zuschuss aufs nächste Bauprojekt.`);
      else log(S, `🏦 ${p.name} hat die KfW-Zusage schon. Doppelt fördern die nicht.`);
      p.kfw = true;
    }
  }
  // Wer auf fremden Immobilien landet, zahlt für eine Leistung des Eigentümers
  function visit(S, p, i) {
    const st = S.props[i], o = P(S, st.owner), sp = SPACES[i];
    let fee = 0, what = '';
    if (sp.type === 'rail') { fee = 300 * owned(S, o.id).filter((k) => SPACES[k].type === 'rail').length; what = 'kauft ein Pendler-Jahresabo im Bahnhofsshop'; }
    else if (sp.type === 'util') { fee = (S.dice[0] + S.dice[1]) * 60; what = 'zahlt eine Nebenkosten-Nachzahlung an die Stadtwerke'; }
    else {
      const hotels = st.units.filter((u) => u.k === 'hotel' && u.ready <= S.q);
      const apts = st.units.filter((u) => u.k === 'apt' && u.ready <= S.q);
      if (hotels.length) { fee = r0(LAGE[sp.group].adr * 25 * hotels.length * S.mk.rent); what = `bucht eine Firmentagung im Hotel (${hotels.length > 1 ? hotels.length + ' Hotels, ' : ''}25 Zimmernächte)`; }
      else if (apts.length) { fee = mietspiegel(S, i); what = 'wohnt einen Monat zur Zwischenmiete'; }
    }
    if (!fee) { log(S, `${p.name} besichtigt ${sp.name} von ${o.name}. Schönes Grundstück.`); return; }
    if (o.bankrupt) return;
    pay(S, p, fee);
    o.money += fee;
    o.stats.rentGot += fee;
    o.yr[sp.type === 'prop' && st.units.some((u) => u.k === 'hotel') || sp.type !== 'prop' ? 'gew' : 'vv'] += fee;
    p.stats.maxRent = Math.max(p.stats.maxRent, fee);
    log(S, `${p.name} ${what} bei ${o.name}: ${money(fee)}.`);
  }

  function buy(S, p, fin) {
    const i = p.pos, st = S.props[i];
    if (S.sub !== 'buy' || st.owner) return 'Hier gibt es nichts zu kaufen.';
    fin = [0, 0.5, 0.8].includes(fin) ? fin : 0;
    const price = propValue(S, i);
    const nk = buyCosts(S, i, price);
    const loan = Math.floor((price * fin) / 1000) * 1000;
    if (loan && loan > loanRoom(S, p, price)) return 'Die Bank sagt nein: zu wenig Sicherheiten oder Einkommen für diesen Kredit.';
    if (p.money + loan < price + nk.total) return `Zu wenig Eigenkapital. Du brauchst ${money(price + nk.total - loan)} bar.`;
    if (loan) takeLoan(S, p, loan, `Kauf ${SPACES[i].name}`);
    pay(S, p, price + nk.total);
    Object.assign(st, { owner: p.id, bought: S.q, paid: price });
    p.yr.extraAfa += 0; // Kaufnebenkosten erhöhen die Anschaffungskosten (vereinfacht ohne Extra-AfA)
    p.stats.bought++;
    log(S, `🖋️ ${p.name} kauft ${SPACES[i].name} für ${money(price)} (+${money(nk.total)} Nebenkosten: Grunderwerbsteuer ${String(nk.rate * 100).replace('.', ',')} %, Notar, Grundbuch)${loan ? `, finanziert mit ${money(loan)} Kredit zu ${String(rateFor(S, p)).replace('.', ',')} %` : ''}.`);
    S.sub = S.rolledDouble ? 'roll' : 'end';
    return null;
  }

  function build(S, p, i, k, fin) {
    const st = S.props[i], sp = SPACES[i];
    if (!st || st.owner !== p.id || sp.type !== 'prop') return 'Du kannst nur auf eigenen Grundstücken bauen.';
    if (!['apt', 'hotel'].includes(k)) return 'Unbekanntes Bauprojekt.';
    const need = k === 'hotel' ? 2 : 1;
    if (usedSlots(st) + need > SLOTS) return `Nicht genug freie Slots (${SLOTS - usedSlots(st)} frei, ${need} nötig).`;
    if (st.blocked === S.q) return 'Das Bauamt hat diesen Antrag gerade abgelehnt. Neuer Antrag erst im nächsten Quartal.';
    let cost = unitCost(S, i, k);
    const kfw = p.kfw ? r0(cost * 0.15) : 0;
    const fee = permitFee(k);
    fin = [0.5, 0.8].includes(fin) ? fin : 0;
    const loan = fin ? Math.floor((cost * fin) / 1000) * 1000 : 0;
    if (loan && loan > loanRoom(S, p, cost)) return 'Die Bank finanziert das nicht. Zu wenig Sicherheiten oder Einkommen.';
    if (p.money + loan + kfw < cost + fee) return `Zu wenig Geld. Du brauchst ${money(cost + fee - loan - kfw)} bar.`;
    // Baugenehmigung
    const okChance = k === 'apt' ? 0.92 : gi(i) >= 5 ? 0.7 : 0.8;
    pay(S, p, fee);
    if (rng() > okChance) {
      st.blocked = S.q;
      log(S, `📋 Bauamt lehnt ${p.name}s Antrag für ${k === 'apt' ? 'eine Wohnung' : 'ein Hotel'} auf ${sp.name} ab (${pick(['Stellplatzschlüssel nicht erfüllt', 'Abstandsflächen zu klein', 'Brandschutzkonzept fehlt', 'Nachbar hat Einwände', 'Bebauungsplan sagt nein'])}). Gebühr ${money(fee)} ist weg.`);
      return null;
    }
    if (loan) takeLoan(S, p, loan, `Bau ${sp.name}`);
    if (kfw) { p.kfw = false; p.money += kfw; }
    pay(S, p, cost);
    st.units.push({ k, cost, idx0: S.mk.idx, ready: S.q + (k === 'apt' ? 1 : 2), rent: 0, tenant: null, raised: 0, nomad: false, mold: false, mode: 'self', lvl: 'normal' });
    st.houses = st.units.length;
    p.stats.built++;
    log(S, `🏗️ ${p.name} baut ${k === 'apt' ? 'eine Wohnung (75 m²)' : `ein Hotel (${ROOMS} Zimmer, 2 Slots)`} auf ${sp.name}: ${money(cost)}${kfw ? `, davon ${money(kfw)} KfW-Zuschuss` : ''}${loan ? `, ${money(loan)} finanziert` : ''}. Fertig in ${k === 'apt' ? 'einem Quartal' : 'zwei Quartalen'}.`);
    return null;
  }

  // Mieterhöhung bis zum Mietspiegel, max. +15 %, frühestens 15 Monate nach der letzten
  function raiseRent(S, p, i) {
    const st = S.props[i];
    if (!st || st.owner !== p.id) return 'Nicht deine Immobilie.';
    const ms = mietspiegel(S, i);
    const list = st.units.filter((u) => u.k === 'apt' && u.tenant && !u.nomad && S.q - u.raised >= 5 && u.rent < ms);
    if (!list.length) return 'Gerade ist keine Mieterhöhung erlaubt (Sperrfrist 15 Monate oder schon am Mietspiegel).';
    let up = 0, moved = 0, fight = null;
    list.forEach((u) => {
      const nu = Math.min(ms, r0(u.rent * 1.15));
      if (!fight && rng() < 0.12) { fight = u; return; }
      if (rng() < 0.06) { moved++; log(S, `📦 ${u.tenant} kündigt nach der Mieterhöhung und zieht aus.`); u.tenant = null; u.rent = 0; return; }
      up += (nu - u.rent);
      u.rent = nu;
      u.raised = S.q;
    });
    log(S, `📈 ${p.name} erhöht auf ${SPACES[i].name} die Miete: +${money(up)} im Monat${moved ? `, ${moved} Auszug` : ''}.`);
    if (fight) {
      const stake = r0((Math.min(ms, fight.rent * 1.15) - fight.rent) * 36);
      openChoice(S, p, 'raiseFight', { idx: i, unit: st.units.indexOf(fight), stake: Math.max(1500, stake) });
    }
    return null;
  }

  function sell(S, p, i) {
    const st = S.props[i];
    if (!st || st.owner !== p.id) return 'Nicht deine Immobilie.';
    if (st.units.some((u) => u.ready > S.q)) return 'Während der Bauphase kauft das niemand.';
    const v = propValue(S, i);
    const fast = S.sub === 'debt' ? 0.85 : 0.95;
    const gross = r0(v * fast), makler = r0(gross * 0.0357);
    const invested = st.paid + st.units.reduce((a, u) => a + u.cost, 0);
    const gain = gross - makler - invested;
    if (gain > 0 && S.q - st.bought < 40) p.yr.gain += gain;
    p.money += gross - makler;
    st.owner = null;
    st.units.forEach((u) => { u.nomad = false; });
    log(S, `🤝 ${p.name} verkauft ${SPACES[i].name} für ${money(gross)}${fast < 0.9 ? ' (Notverkauf)' : ''}, Makler ${money(makler)}${gain > 0 && S.q - st.bought < 40 ? `. Spekulationsgewinn ${money(gain)} ist steuerpflichtig` : ''}.`);
    // Bank verlangt Sondertilgung, wenn die Sicherheiten nicht mehr reichen
    const excess = debt(p) - (0.8 * collateral(S, p) + 30000);
    if (excess > 0 && p.money > 0) {
      let left = Math.min(excess, p.money);
      p.money -= left;
      const paid = left;
      p.loans.sort((a, b) => b.rate - a.rate);
      for (const L of p.loans) { const t = Math.min(L.rest, left); L.rest -= t; left -= t; if (!left) break; }
      p.loans = p.loans.filter((L) => L.rest > 0.5);
      log(S, `🏦 Die Bank verlangt eine Sondertilgung von ${money(paid)}: Die Sicherheiten sind weg.`);
    }
    return null;
  }

  function repay(S, p, id) {
    const L = p.loans.find((x) => x.id === id);
    if (!L) return 'Kredit nicht gefunden.';
    const vfe = r0(L.rest * 0.015);
    if (p.money < L.rest + vfe) return `Du brauchst ${money(L.rest + vfe)} (inkl. 1,5 % Vorfälligkeitsentschädigung).`;
    pay(S, p, L.rest + vfe);
    p.loans = p.loans.filter((x) => x !== L);
    log(S, `🏦 ${p.name} löst einen Kredit ab: ${money(L.rest)} + ${money(vfe)} Vorfälligkeitsentschädigung.`);
    return null;
  }

  // ---------- Entscheidungen (Karten, Klagen) ----------
  function openChoice(S, p, id, ctx) {
    if (!S.card) S.back = S.sub === 'card' ? (S.back || 'end') : S.sub;
    S.card = { id, pid: p.id, ctx: ctx || {} };
    S.sub = 'card';
  }
  function draw(S, p, deck) {
    if (!S.decks[deck].length) S.decks[deck] = shuffle(CARDS.map((c, k) => k).filter((k) => CARDS[k].deck === deck));
    const k = S.decks[deck].shift();
    const c = CARDS[k];
    p.stats.cards++;
    const ctx = c.prep ? c.prep(S, p) : {};
    S.back = S.rolledDouble && !p.court ? 'roll' : 'end';
    S.card = { id: k, pid: p.id, ctx: ctx || { none: true } };
    S.sub = 'card';
  }
  function cardOf(S) { return typeof S.card.id === 'number' ? CARDS[S.card.id] : CHOICES[S.card.id]; }
  function cardText(S) {
    const c = cardOf(S), p = P(S, S.card.pid);
    if (S.card.ctx.none && c.fallback) return { title: c.t, text: c.fallback, deck: c.deck || 'case' };
    return { title: c.t, text: typeof c.text === 'function' ? c.text(S, p, S.card.ctx) : c.text, deck: c.deck || 'case' };
  }
  function cardOpts(S) {
    const c = cardOf(S), p = P(S, S.card.pid);
    if (S.card.ctx.none || !c.opts) return [{ k: 'ok', label: 'OK' }];
    return c.opts(S, p, S.card.ctx);
  }
  function resolveCard(S, p, k) {
    const c = cardOf(S), ctx = S.card.ctx;
    const opts = cardOpts(S);
    const o = opts.find((x) => x.k === k);
    if (!o) return 'Diese Option gibt es nicht.';
    if (o.disabled) return o.why || 'Geht gerade nicht.';
    const back = S.back || 'end';
    S.card = null;
    S.sub = back;
    if (!ctx.none && c.run) c.run(S, p, ctx, k);
    else if (ctx.none && c.fallback) log(S, `${p.name}: ${c.fallback}`);
    if (S.sub === 'card') return null; // Folge-Entscheidung
    checkDebt(S, p);
    return null;
  }

  // Anwalt, selbst vertreten oder Vergleich. Wer verliert, zahlt beide Anwälte (§ 91 ZPO).
  const lawyerFee = (p, stake) => (p.rs ? 250 : Math.max(1200, r0(stake * 0.12)));
  function lawOpts(p, stake, settle = true) {
    const o = [{ k: 'lawyer', label: `⚖️ Fachanwalt (${p.rs ? 'Rechtsschutz, ' + money(250) + ' Selbstbeteiligung' : money(lawyerFee(p, stake))}) · ca. 75 %` }];
    o.push(stake > 10000 ? { k: 'self', label: '🙋 Selbst vertreten', disabled: true, why: 'Am Landgericht (über Ð10.000) herrscht Anwaltszwang.' } : { k: 'self', label: '🙋 Selbst vertreten (kostenlos) · ca. 35 %' });
    if (settle) o.push({ k: 'settle', label: `🤝 Vergleich: ${money(stake / 2)} zahlen` });
    return o;
  }
  function law(S, p, k, stake, oL = 0.75, oS = 0.35) {
    p.stats.cases++;
    if (k === 'settle') { pay(S, p, r0(stake / 2)); return { res: 'settle', msg: `Vergleich geschlossen, ${money(stake / 2)} gezahlt.` }; }
    const fee = k === 'lawyer' ? lawyerFee(p, stake) : 0;
    if (fee) pay(S, p, fee);
    const win = rng() < (k === 'lawyer' ? oL : oS);
    if (win) {
      p.stats.won++;
      if (k === 'lawyer' && !p.rs) p.money += fee;
      return { res: 'win', msg: `Gewonnen!${k === 'lawyer' && !p.rs ? ' Die Gegenseite trägt deine Anwaltskosten.' : ''}` };
    }
    const court = r0(300 + stake * 0.05), other = Math.max(900, r0(stake * 0.1));
    pay(S, p, court + other);
    return { res: 'lose', msg: `Verloren. Gerichtskosten ${money(court)} und gegnerischer Anwalt ${money(other)}.` };
  }

  function randOwnProp(S, p, filter) {
    const list = owned(S, p.id).filter((k) => SPACES[k].type === 'prop' && (!filter || filter(S.props[k], k)));
    return list.length ? pick(list) : null;
  }
  const readyApts = (S, st, f) => st.units.filter((u) => u.k === 'apt' && u.ready <= S.q && (!f || f(u)));

  // Ereigniskarten: Post vom Amt (Behörden, Bank, Steuern) und Mieter-Post (Mieter, Schäden, Hotels)
  const CARDS = [
    { deck: 'amt', t: 'Grundsteuer-Bescheid', text: 'Nach der Grundsteuerreform kommt ein neuer Bescheid mit Nachzahlung: 0,1 % deiner Grundstückswerte.',
      prep: (S, p) => (owned(S, p.id).length ? {} : null), fallback: 'Kein Grundbesitz, kein Grundsteuer-Bescheid.',
      run: (S, p) => { const a = r0(owned(S, p.id).reduce((s, k) => s + landValue(S, k), 0) * 0.001); pay(S, p, a); p.yr.vv -= a; log(S, `🧾 ${p.name} zahlt ${money(a)} Grundsteuer nach.`); } },
    { deck: 'amt', t: 'Heizungsgesetz (GEG)', text: (S, p, c) => `Die alten Gasthermen müssen raus: Wärmepumpen für ${c.n} Wohnung${c.n > 1 ? 'en' : ''}, je ${money(9000)}${p.kfw ? ' (30 % KfW-Zuschuss!)' : ''}.`,
      prep: (S, p) => { const n = owned(S, p.id).reduce((a, k) => a + readyApts(S, S.props[k]).length, 0); return n ? { n: Math.min(n, 6) } : null; }, fallback: 'Heizungsgesetz? Du hast noch keine Wohnungen. Glück gehabt.',
      run: (S, p, c) => { const a = r0(c.n * 9000 * (p.kfw ? 0.7 : 1)); if (p.kfw) p.kfw = false; pay(S, p, a); p.yr.vv -= a; log(S, `🔧 ${p.name} zahlt ${money(a)} für Wärmepumpen.`); } },
    { deck: 'amt', t: 'EZB hebt den Leitzins', text: 'Inflation zu hoch: Die Bauzinsen steigen um 0,5 Prozentpunkte. Neue Kredite werden teurer.',
      run: (S) => { S.mk.zins = Math.min(7.5, S.mk.zins + 0.5); log(S, `🏦 Bauzinsen steigen auf ${S.mk.zins.toFixed(2).replace('.', ',')} %.`); } },
    { deck: 'amt', t: 'EZB senkt den Leitzins', text: 'Die Wirtschaft schwächelt: Bauzinsen fallen um 0,4 Prozentpunkte.',
      run: (S) => { S.mk.zins = Math.max(1.2, S.mk.zins - 0.4); log(S, `🏦 Bauzinsen fallen auf ${S.mk.zins.toFixed(2).replace('.', ',')} %.`); } },
    { deck: 'amt', t: 'Energieausweis fehlt', text: 'Bei einer Vermietung fehlte der Energieausweis. Bußgeld: Ð1.500.',
      prep: (S, p) => (owned(S, p.id).some((k) => readyApts(S, S.props[k]).length) ? {} : null), fallback: 'Energieausweis? Du vermietest noch nichts.',
      run: (S, p) => { pay(S, p, 1500); log(S, `📄 ${p.name} zahlt ${money(1500)} Bußgeld wegen fehlendem Energieausweis.`); } },
    { deck: 'amt', t: 'Steuererstattung', text: 'Das Finanzamt hat sich verrechnet. Zu deinen Gunsten! Du bekommst Ð1.200 zurück.',
      run: (S, p) => { p.money += 1200; log(S, `🧾 ${p.name} bekommt ${money(1200)} vom Finanzamt.`); } },
    { deck: 'amt', t: 'Erbschaft aus Öhringen', text: 'Deine Großtante aus Öhringen vererbt dir Ð45.000. Erbschaftsteuer über dem Freibetrag von Ð20.000: 15 %.',
      run: (S, p) => { const t = r0((45000 - 20000) * 0.15); p.money += 45000 - t; log(S, `💌 ${p.name} erbt ${money(45000)}, zahlt ${money(t)} Erbschaftsteuer.`); } },
    { deck: 'amt', t: 'Schornsteinfeger', text: (S, p, c) => `Feuerstättenschau auf allen ${c.n} Grundstücken: je Ð89.`,
      prep: (S, p) => { const n = owned(S, p.id).filter((k) => SPACES[k].type === 'prop').length; return n ? { n } : null; }, fallback: 'Der Schornsteinfeger klingelt. Du hast kein Haus. Er bringt trotzdem Glück.',
      run: (S, p, c) => { pay(S, p, 89 * c.n); log(S, `🧹 ${p.name} zahlt ${money(89 * c.n)} an den Schornsteinfeger.`); } },
    { deck: 'amt', t: 'Denkmalschutz', text: (S, p, c) => `${SPACES[c.idx].name} steht jetzt unter Denkmalschutz: Sanierungsauflage ${money(14000)}. Dafür gibt es Denkmal-AfA (voll absetzbar).`,
      prep: (S, p) => { const k = randOwnProp(S, p); return k == null ? null : { idx: k }; }, fallback: 'Das Denkmalamt schaut sich um. Nichts von dir ist alt genug.',
      run: (S, p, c) => { pay(S, p, 14000); p.yr.extraAfa += 14000; log(S, `🏛️ ${p.name} saniert ${SPACES[c.idx].name} denkmalgerecht: ${money(14000)} (steuerlich absetzbar).`); } },
    { deck: 'amt', t: 'SCHUFA-Eintrag', text: 'Ein Inkassobüro hat einen falschen Eintrag gemeldet. Dein SCHUFA-Score sinkt um 8 Punkte, bis du widersprichst.',
      opts: (S, p) => [{ k: 'lawyer', label: `⚖️ Anwalt schreibt Widerspruch (${money(p.rs ? 250 : 900)})` }, { k: 'ok', label: 'Hinnehmen (−8 SCHUFA)' }],
      run: (S, p, c, k) => { if (k === 'lawyer') { pay(S, p, p.rs ? 250 : 900); log(S, `⚖️ ${p.name}s Anwalt lässt den falschen SCHUFA-Eintrag löschen.`); } else { p.schufa = Math.max(0, p.schufa - 8); log(S, `📉 ${p.name}s SCHUFA-Score fällt auf ${r0(p.schufa)}.`); } } },
    { deck: 'amt', t: 'Neuer Mietspiegel', text: 'Die Stadt veröffentlicht den neuen Mietspiegel: Vergleichsmieten +2 %.',
      run: (S) => { S.mk.rent *= 1.02; log(S, '📊 Neuer Mietspiegel: Vergleichsmieten +2 %.'); } },
    { deck: 'amt', t: 'Rundfunkbeitrag fürs Hotel', text: (S, p, c) => `Der Beitragsservice will Geld für jedes Hotelzimmer: ${money(c.a)} für deine Hotels.`,
      prep: (S, p) => { const n = owned(S, p.id).reduce((a, k) => a + S.props[k].units.filter((u) => u.k === 'hotel' && u.ready <= S.q).length, 0); return n ? { a: n * 330 } : null; }, fallback: 'Der Beitragsservice schreibt dir. Du zahlst sowieso schon. Weiter.',
      run: (S, p, c) => { pay(S, p, c.a); p.yr.gew -= c.a; log(S, `📺 ${p.name} zahlt ${money(c.a)} Rundfunkbeitrag für Hotelzimmer.`); } },
    { deck: 'amt', t: 'Betriebsprüfung!', text: 'Das Finanzamt kündigt eine Prüfung an. Hoffentlich war deine letzte Steuererklärung sauber.',
      run: (S, p) => audit(S, p, 1, false) },
    { deck: 'amt', t: 'KfW-Förderprogramm', text: 'Neues Förderprogramm: 15 % Zuschuss fürs nächste Bauprojekt.',
      run: (S, p) => { p.kfw = true; log(S, `🏦 ${p.name} bekommt eine KfW-Förderzusage.`); } },
    { deck: 'amt', t: 'Zweckentfremdung', text: (S, p, c) => `Die Stadt meint, dein Hotel auf ${SPACES[c.idx].name} nimmt Wohnraum weg. Bußgeld ${money(c.stake)}.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => st.units.some((u) => u.k === 'hotel')); return k == null ? null : { idx: k, stake: 8000 }; }, fallback: 'Das Wohnungsamt prüft Zweckentfremdung. Du hast kein Hotel. Alles sauber.',
      opts: (S, p, c) => lawOpts(p, c.stake),
      run: (S, p, c, k) => { const r = law(S, p, k, c.stake, 0.7, 0.3); if (r.res === 'lose') pay(S, p, c.stake); log(S, `⚖️ Zweckentfremdung (${p.name}): ${r.msg}${r.res === 'lose' ? ` Dazu ${money(c.stake)} Bußgeld.` : ''}`); } },
    { deck: 'amt', t: 'Baukosten explodieren', text: 'Handwerker sind ausgebucht, Material wird teurer: Baukosten +4 %.',
      run: (S) => { S.mk.build *= 1.04; log(S, '🧱 Baukosten steigen um 4 %.'); } },

    { deck: 'mieter', t: 'Wasserrohrbruch', text: (S, p, c) => `In ${SPACES[c.idx].name} ist ein Rohr geplatzt. Schaden ${money(c.dmg)}. Die Gebäudeversicherung zahlt, du trägst ${money(1000)} Selbstbeteiligung.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => st.units.some((u) => u.ready <= S.q)); return k == null ? null : { idx: k, dmg: 8000 + Math.floor(rng() * 10) * 1000 }; }, fallback: 'Bei deinen Nachbarn ist ein Rohr geplatzt. Nicht dein Problem.',
      run: (S, p) => { pay(S, p, 1000); p.yr.vv -= 1000; log(S, `💧 Wasserrohrbruch bei ${p.name}: ${money(1000)} Selbstbeteiligung.`); } },
    { deck: 'mieter', t: 'Hochwasser am Rhein', text: (S, p, c) => `Der Rhein tritt über die Ufer. ${SPACES[c.idx].name} steht unter Wasser: ${money(28000)} Schaden. ${p.elem ? 'Deine Elementarversicherung zahlt bis auf Ð2.500.' : 'Ohne Elementarversicherung zahlst du alles.'}`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => st.units.some((u) => u.ready <= S.q)); return k == null ? null : { idx: k }; }, fallback: 'Hochwasser am Rhein. Deine Füße werden nass, sonst nichts.',
      run: (S, p, c) => { const a = p.elem ? 2500 : 28000; pay(S, p, a); p.yr.vv -= a; log(S, `🌊 Hochwasser trifft ${SPACES[c.idx].name}: ${p.name} zahlt ${money(a)}.`); } },
    { deck: 'mieter', t: 'Mietnomade!', text: (S, p, c) => `${c.name} in ${SPACES[c.idx].name} zahlt keine Miete mehr und reagiert nicht. Räumungsklage über deine Immobilien-Akte.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => readyApts(S, st, (u) => u.tenant && !u.nomad).length); if (k == null) return null; const u = readyApts(S, S.props[k], (x) => x.tenant && !x.nomad)[0]; return { idx: k, unit: S.props[k].units.indexOf(u), name: u.tenant }; }, fallback: 'Ein Mietnomade sucht eine Wohnung. Zum Glück hast du keine frei.',
      run: (S, p, c) => { const u = S.props[c.idx].units[c.unit]; if (u) u.nomad = true; log(S, `🚪 ${c.name} zahlt bei ${p.name} keine Miete mehr.`); } },
    { deck: 'mieter', t: 'Schimmel', text: (S, p, c) => `${c.name} in ${SPACES[c.idx].name} findet Schimmel und mindert die Miete um 20 %. Sanieren kostet ${money(4500)}.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => readyApts(S, st, (u) => u.tenant && !u.mold).length); if (k == null) return null; const u = readyApts(S, S.props[k], (x) => x.tenant && !x.mold)[0]; return { idx: k, unit: S.props[k].units.indexOf(u), name: u.tenant, stake: 4500 }; }, fallback: 'Schimmel in der Nachbarschaft. Lüften nicht vergessen.',
      opts: (S, p, c) => [{ k: 'fix', label: `🛠️ Sanieren (${money(4500)})` }, ...lawOpts(p, c.stake, false)],
      run: (S, p, c, k) => {
        const u = S.props[c.idx].units[c.unit];
        if (k === 'fix') { pay(S, p, 4500); p.yr.vv -= 4500; log(S, `🛠️ ${p.name} lässt den Schimmel sanieren.`); return; }
        const r = law(S, p, k, c.stake, 0.55, 0.25);
        if (r.res === 'lose' && u) u.mold = true;
        log(S, `⚖️ Mietminderung wegen Schimmel (${p.name}): ${r.msg}${r.res === 'lose' ? ' Die Miete bleibt gemindert, bis du sanierst.' : ''}`);
      } },
    { deck: 'mieter', t: 'Kündigung', text: (S, p, c) => `${c.name} zieht aus ${SPACES[c.idx].name} aus. Die Wohnung steht leer, bis jemand Neues kommt.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => readyApts(S, st, (u) => u.tenant).length); if (k == null) return null; const u = readyApts(S, S.props[k], (x) => x.tenant)[0]; return { idx: k, unit: S.props[k].units.indexOf(u), name: u.tenant }; }, fallback: 'Jemand sucht eine Wohnung bei dir. Du hast keine. Schade eigentlich.',
      run: (S, p, c) => { const u = S.props[c.idx].units[c.unit]; if (u) { u.tenant = null; u.rent = 0; u.nomad = false; u.mold = false; } log(S, `📦 ${c.name} kündigt bei ${p.name}.`); } },
    { deck: 'mieter', t: 'Lärmstreit', text: 'Zwei deiner Mieter streiten über Lärm. Einer fordert Mietminderung rückwirkend: Ð3.000.',
      prep: (S, p) => (owned(S, p.id).some((k) => readyApts(S, S.props[k], (u) => u.tenant).length >= 2) ? { stake: 3000 } : null), fallback: 'Bei den Nachbarn ist es laut. Du hast Ohropax.',
      opts: (S, p, c) => lawOpts(p, c.stake), run: (S, p, c, k) => { const r = law(S, p, k, c.stake, 0.7, 0.45); if (r.res === 'lose') pay(S, p, c.stake); log(S, `⚖️ Lärmstreit (${p.name}): ${r.msg}`); } },
    { deck: 'mieter', t: 'Traummieter', text: 'Deine Mieter renovieren auf eigene Kosten und loben dich bei Google. Du sparst Ð1.500 Instandhaltung.',
      run: (S, p) => { p.money += 1500; log(S, `😇 ${p.name} hat Traummieter: +${money(1500)}.`); } },
    { deck: 'mieter', t: 'Nebenkostenabrechnung falsch', text: (S, p, c) => `Der Mieterverein findet Fehler in deiner Nebenkostenabrechnung. ${c.n} Mietparteien wollen je Ð280 zurück.`,
      prep: (S, p) => { const n = owned(S, p.id).reduce((a, k) => a + readyApts(S, S.props[k], (u) => u.tenant).length, 0); return n ? { n, stake: n * 280 } : null; }, fallback: 'Nebenkostenabrechnung? Erstmal Mieter haben.',
      opts: (S, p, c) => lawOpts(p, c.stake), run: (S, p, c, k) => { const r = law(S, p, k, c.stake, 0.6, 0.3); if (r.res === 'lose') pay(S, p, c.stake); log(S, `⚖️ Nebenkosten-Streit (${p.name}): ${r.msg}`); } },
    { deck: 'mieter', t: 'Messe-Woche', text: 'Große Messe in Düsseldorf: Alle Hotels in der Region sind ausgebucht. Jedes deiner Hotels bringt Ð9.000 extra.',
      prep: (S, p) => { const n = owned(S, p.id).reduce((a, k) => a + S.props[k].units.filter((u) => u.k === 'hotel' && u.ready <= S.q).length, 0); return n ? { n } : null; }, fallback: 'Messe in Düsseldorf. Du gehst selbst hin und gibst Ð120 für Eintritt und Currywurst aus.',
      run: (S, p, c) => { p.money += 9000 * c.n; p.yr.gew += 9000 * c.n; log(S, `🎪 Messe-Woche: ${p.name} kassiert ${money(9000 * c.n)} mit Hotels.`); } },
    { deck: 'mieter', t: 'Schlechte Bewertungen', text: 'Ein Influencer zerreißt dein Hotel auf TikTok: Google 2,1 ★. Nächstes Quartal −15 % Auslastung, oder du bezahlst eine Agentur.',
      prep: (S, p) => (owned(S, p.id).some((k) => S.props[k].units.some((u) => u.k === 'hotel' && u.ready <= S.q && u.mode === 'self')) ? {} : null), fallback: 'Jemand gibt dir eine 1-Stern-Bewertung. Du hast gar kein Hotel. Internet halt.',
      opts: () => [{ k: 'pr', label: `📣 PR-Agentur (${money(4000)})` }, { k: 'ok', label: 'Aussitzen (−15 % Auslastung)' }],
      run: (S, p, c, k) => { if (k === 'pr') { pay(S, p, 4000); p.yr.gew -= 4000; log(S, `📣 ${p.name} rettet den Ruf des Hotels für ${money(4000)}.`); } else { p.badRep = 1; log(S, `⭐ ${p.name}s Hotel hat einen schlechten Ruf.`); } } },
    { deck: 'mieter', t: 'Pächter insolvent', text: (S, p, c) => `Der Pächter deines Hotels auf ${SPACES[c.idx].name} ist pleite. Ð10.000 Pacht fallen aus, du betreibst es ab jetzt selbst.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => st.units.some((u) => u.k === 'hotel' && u.mode === 'pacht' && u.ready <= S.q)); return k == null ? null : { idx: k }; }, fallback: 'Ein Hotelpächter in der Stadt ist pleite. Nicht deiner.',
      run: (S, p, c) => { pay(S, p, 10000); S.props[c.idx].units.forEach((u) => { if (u.k === 'hotel') u.mode = 'self'; }); log(S, `💀 ${p.name}s Hotelpächter ist insolvent: ${money(10000)} Ausfall.`); } },
    { deck: 'mieter', t: 'Heizungsausfall im Januar', text: 'Die Heizung fällt aus, der Notdienst kommt am Sonntag. Ð2.400.',
      prep: (S, p) => (owned(S, p.id).some((k) => readyApts(S, S.props[k]).length) ? {} : null), fallback: 'Bei dir zu Hause fällt die Heizung aus. Dicke Socken.',
      run: (S, p) => { pay(S, p, 2400); p.yr.vv -= 2400; log(S, `🥶 ${p.name} zahlt ${money(2400)} für den Heizungsnotdienst.`); } },
    { deck: 'mieter', t: 'Indexmiete', text: 'Deine Mieter haben Indexmietverträge: Alle Mieten steigen um 3 % (höchstens bis zum Mietspiegel).',
      prep: (S, p) => (owned(S, p.id).some((k) => readyApts(S, S.props[k], (u) => u.tenant).length) ? {} : null), fallback: 'Indexmiete? Ohne Mieter keine Miete.',
      run: (S, p) => { owned(S, p.id).forEach((k) => readyApts(S, S.props[k], (u) => u.tenant).forEach((u) => { u.rent = Math.min(Math.max(u.rent, mietspiegel(S, k)), r0(u.rent * 1.03)); })); log(S, `📈 ${p.name}s Indexmieten steigen um 3 %.`); } },
    { deck: 'mieter', t: 'Kaufinteressent', text: (S, p, c) => `Ein Family Office will ${SPACES[c.idx].name} kaufen: ${money(c.price)} (Marktwert ${money(c.value)}). Makler zahlt der Käufer.`,
      prep: (S, p) => { const k = randOwnProp(S, p, (st) => !st.units.some((u) => u.ready > S.q)); if (k == null) return null; const v = propValue(S, k); return { idx: k, value: v, price: r0(v * (1.08 + rng() * 0.12)) }; }, fallback: 'Ein Family Office sucht Objekte. Du hast noch keine.',
      opts: () => [{ k: 'sell', label: '✍️ Verkaufen' }, { k: 'ok', label: 'Behalten' }],
      run: (S, p, c, k) => {
        if (k !== 'sell') return log(S, `${p.name} behält ${SPACES[c.idx].name}.`);
        const st = S.props[c.idx];
        if (!st || st.owner !== p.id) return;
        const invested = st.paid + st.units.reduce((a, u) => a + u.cost, 0), gain = c.price - invested;
        if (gain > 0 && S.q - st.bought < 40) p.yr.gain += gain;
        p.money += c.price; st.owner = null;
        log(S, `🤝 ${p.name} verkauft ${SPACES[c.idx].name} an ein Family Office für ${money(c.price)}.`);
      } },
    { deck: 'mieter', t: 'Einbruch im Keller', text: 'Fahrräder und eine Waschmaschine sind weg. Die Versicherung zahlt nicht alles: Ð600.',
      run: (S, p) => { pay(S, p, 600); log(S, `🥷 ${p.name} zahlt ${money(600)} nach einem Kellereinbruch.`); } },
  ];

  // Entscheidungen, die nicht aus dem Kartenstapel kommen
  const CHOICES = {
    raiseFight: { t: 'Widerspruch gegen Mieterhöhung', text: (S, p, c) => `Ein Mieter in ${SPACES[c.idx].name} widerspricht der Mieterhöhung und lässt sich vom Mieterverein beraten. Streitwert ${money(c.stake)}.`,
      opts: (S, p, c) => [...lawOpts(p, c.stake, false), { k: 'drop', label: 'Erhöhung zurückziehen' }],
      run: (S, p, c, k) => {
        const u = S.props[c.idx].units[c.unit];
        if (k === 'drop' || !u) return log(S, `${p.name} zieht die Mieterhöhung zurück.`);
        const r = law(S, p, k, c.stake, 0.7, 0.4);
        if (r.res === 'win' && u.tenant) { u.rent = Math.min(mietspiegel(S, c.idx), r0(u.rent * 1.15)); u.raised = S.q; }
        log(S, `⚖️ Mieterhöhungsklage (${p.name}): ${r.msg}`);
      } },
    evict: { t: 'Räumungsklage', text: (S, p, c) => `Räumungsklage gegen den Mietnomaden in ${SPACES[c.idx].name}. Streitwert: ${money(c.stake)} Mietrückstand.`,
      opts: (S, p, c) => [...lawOpts(p, c.stake, false), { k: 'drop', label: 'Doch nicht' }],
      run: (S, p, c, k) => {
        if (k === 'drop') return;
        const u = S.props[c.idx].units[c.unit];
        const r = law(S, p, k, c.stake, 0.85, 0.4);
        if (r.res === 'win' && u) { u.nomad = false; u.tenant = null; u.rent = 0; log(S, `🚪 Räumung erfolgreich (${p.name}). Die Wohnung ist wieder frei. ${r.msg}`); }
        else log(S, `⚖️ Räumungsklage (${p.name}): ${r.msg} Der Mietnomade bleibt.`);
      } },
    court: { t: 'Gericht in Düsseldorf', text: (S, p) => `Das Verfahren gegen ${p.name} läuft. Ohne Anwalt sitzt du noch ${p.court} Zug${p.court > 1 ? 'e' : ''} im Gericht fest.`,
      opts: (S, p) => [{ k: 'lawyer', label: `⚖️ Fachanwalt holt dich raus (${money(p.rs ? 250 : 2500)})` }, { k: 'wait', label: 'Abwarten (Zug aussetzen)' }],
      run: (S, p, c, k) => {
        if (k === 'lawyer') { pay(S, p, p.rs ? 250 : 2500); p.court = 0; S.sub = 'roll'; log(S, `⚖️ ${p.name}s Anwalt beendet das Verfahren.`); return; }
        p.court--; S.sub = 'end'; log(S, `⏳ ${p.name} wartet auf das Urteil.${p.court ? '' : ' Verfahren eingestellt.'}`);
      } },
  };

  // ---------- Finanzamt ----------
  function audit(S, p, prob, field) {
    if (p.taxGap > 0 && rng() < prob) {
      const gap = r0(p.taxGap), zins = r0(gap * 0.018), straf = gap > 5000 ? r0(gap * 0.2) : 0;
      pay(S, p, gap + zins + straf);
      p.taxGap = 0;
      log(S, `🔍 Das Finanzamt findet Fehler bei ${p.name}: ${money(gap)} Nachzahlung + ${money(zins)} Zinsen${straf ? ` + ${money(straf)} Zuschlag (leichtfertige Steuerverkürzung)` : ''}.`);
      return;
    }
    if (field && owned(S, p.id).length) { pay(S, p, 900); log(S, `🔍 Betriebsprüfung bei ${p.name}: alles korrekt. Der Steuerberater berechnet ${money(900)} für die Begleitung.`); return; }
    log(S, `🧾 ${p.name} ist beim Finanzamt. ${p.taxGap > 0 ? 'Puh, niemand hat genauer hingeschaut.' : 'Alles in Ordnung.'}`);
  }
  // Einkommensteuer-Tarif (vereinfacht nach § 32a EStG)
  function est(x) {
    x = Math.max(0, x);
    if (x <= 12096) return 0;
    if (x <= 17443) { const y = (x - 12096) / 10000; return (932.3 * y + 1400) * y; }
    if (x <= 68480) { const z = (x - 17443) / 10000; return (176.64 * z + 2397) * z + 1015.13; }
    if (x <= 277825) return 0.42 * x - 10911.92;
    return 0.45 * x - 19246.67;
  }
  const SALARY_GROSS = 66000;
  function yearEnd(S) {
    const year = 2026 + Math.floor((S.q - 1) / 4);
    alive(S).forEach((p) => {
      let afaV = 0, afaG = 0;
      owned(S, p.id).forEach((k) => {
        const st = S.props[k];
        afaV += st.paid * 0.3 * 0.02; // Bestandsgebäude beim Kauf: 30 % Gebäudeanteil, 2 % AfA
        st.units.forEach((u) => { if (u.ready <= S.q) { if (u.k === 'apt') afaV += u.cost * 0.03; else afaG += u.cost * 0.03; } });
      });
      const y = p.yr;
      const vv = r0(y.vv - afaV - y.extraAfa - y.int);
      const gew = r0(y.gew - afaG);
      let taxable = vv + gew + r0(y.gain);
      let carryUsed = 0;
      if (taxable < 0) { p.lossCarry += -taxable; taxable = 0; }
      else if (p.lossCarry) { carryUsed = Math.min(p.lossCarry, taxable); p.lossCarry -= carryUsed; taxable -= carryUsed; }
      const estAdd = r0(est(SALARY_GROSS + taxable) - est(SALARY_GROSS));
      const soli = est(SALARY_GROSS + taxable) > 19950 ? r0(estAdd * 0.055) : 0;
      const mess = Math.max(0, gew - 24500) * 0.035;
      const gewSt = r0(mess * 4.5);
      const anr = r0(Math.min(estAdd, mess * 4));
      const total = Math.max(0, estAdd + soli + gewSt - anr);
      p.taxDue = { year, vv, gew, gain: r0(y.gain), afa: r0(afaV + afaG + y.extraAfa), int: r0(y.int), carryUsed, taxable, est: estAdd, soli, gewSt, anr, total, pre: r0(y.pre), rev: r0(y.rev), lvl: taxLevel(S, p) };
      p.taxPre = total > 400 ? r0(total / 4) : 0;
      p.yr = newYear();
    });
    log(S, `🧾 Jahresabschluss ${year}: Alle müssen ihre Steuererklärung machen. Steuerberater oder selbst rechnen?`);
  }
  // Je mehr man besitzt, desto schwerer wird die Steuererklärung (Stufe 1–6)
  function taxLevel(S, p) {
    const props = owned(S, p.id).length;
    const units = owned(S, p.id).reduce((a, k) => a + S.props[k].units.length, 0);
    return clamp(1 + Math.floor(props / 3 + units / 5 + Math.max(0, netWorth(S, p)) / 1500000), 1, 6);
  }
  const taxTasks = (lvl) => 4 + lvl;
  const advisorFee = (t) => r0(900 + 0.004 * Math.max(0, t.rev));
  function finishTax(S, p, msg, payNow) {
    const t = p.taxDue;
    p.taxDue = null;
    p.stats.taxes += Math.max(0, payNow + t.pre);
    if (payNow >= 0) pay(S, p, payNow); else p.money -= payNow;
    log(S, `🧾 ${p.name}: ${msg} ${payNow >= 0 ? `Nachzahlung ${money(payNow)}` : `Erstattung ${money(-payNow)}`} (Steuer ${t.year}: ${money(t.total)}, vorausgezahlt ${money(t.pre)}).`);
    S.sub = startSub(S, p);
    checkDebt(S, p);
  }
  function taxAdvisor(S, p) {
    const t = p.taxDue, fee = advisorFee(t);
    const save = r0(t.total * 0.07);
    pay(S, p, fee);
    t.total -= save;
    finishTax(S, p, `Steuerberaterin erledigt alles für ${money(fee)} und findet ${money(save)} Ersparnis (Werbungskosten, Fahrtkosten, Arbeitszimmer).`, t.total - t.pre);
  }
  function taxSelf(S, p, ok, total) {
    const t = p.taxDue;
    const want = taxTasks(t.lvl);
    total = Number(total); ok = Number(ok);
    if (total !== want || !(ok >= 0 && ok <= total) || Math.floor(ok) !== ok) return 'Ungültiges Ergebnis.';
    const errors = total - ok;
    let over = 0, gap = 0;
    for (let e = 0; e < errors; e++) {
      if (rng() < 0.5) over += Math.max(300, r0(t.total * 0.04));
      else gap += Math.max(400, r0(t.total * 0.05));
    }
    gap = Math.min(gap, Math.max(0, t.total + over));
    p.taxGap += gap;
    const due = t.total + over - gap - t.pre;
    p.stats.taxSelf = (p.stats.taxSelf || 0) + 1;
    if (!errors) p.stats.taxPerfect = (p.stats.taxPerfect || 0) + 1;
    finishTax(S, p, errors === 0 ? `Selbst gerechnet, ${ok}/${total} richtig: perfekte Steuererklärung!` : `Selbst gerechnet, ${ok}/${total} richtig.${over ? ` ${money(over)} zu viel gezahlt.` : ''}${gap ? ' Ein paar Fehler zugunsten von dir … hoffentlich prüft niemand.' : ''}`, due);
    return null;
  }

  // ---------- Quartalsende ----------
  function quarterEnd(S) {
    const qi = (S.q - 1) % 4;
    let allApts = 0, allHotels = 0;
    Object.values(S.props).forEach((st) => { if (st.owner) st.units.forEach((u) => { if (u.ready <= S.q) { if (u.k === 'apt') allApts++; else allHotels++; } }); });
    alive(S).forEach((p) => {
      const lines = {};
      const add = (label, amt) => { if (amt) lines[label] = (lines[label] || 0) + r0(amt); };
      add('Gehalt (netto)', SALARY);
      add('Lebenshaltung', -LIVING);
      let op = 0;
      const opAdd = (label, amt, kind) => { add(label, amt); op += amt; p.yr[kind] += amt; };
      const mine = owned(S, p.id);
      const rails = mine.filter((k) => SPACES[k].type === 'rail').length;
      mine.forEach((k) => {
        const sp = SPACES[k], st = S.props[k];
        const grundsteuer = landValue(S, k) * 0.0009;
        if (sp.type === 'rail') { opAdd('Gewerbemiete Bahnhöfe', propValue(S, k) * 0.016 * (1 + 0.1 * (rails - 1)), 'gew'); opAdd('Grundsteuer', -grundsteuer, 'gew'); return; }
        if (sp.type === 'util') { opAdd('Stadtwerke-Dividende', propValue(S, k) * 0.012 + 220 * allApts + 900 * allHotels, 'gew'); return; }
        const bVal = st.units.reduce((a, u) => a + (u.ready <= S.q ? unitValue(S, u) : 0), 0);
        const vers = 150 + bVal * 0.0003 + (p.elem ? bVal * 0.00015 : 0);
        opAdd('Grundsteuer', -grundsteuer, 'vv');
        opAdd('Gebäudeversicherung', -vers, 'vv');
        const ms = mietspiegel(S, k);
        let occupied = 0;
        st.units.forEach((u) => {
          if (u.ready > S.q) return;
          if (u.ready === S.q && !u.done) { u.done = true; log(S, `🏁 Bauabnahme bei ${p.name}: ${u.k === 'apt' ? 'Wohnung' : 'Hotel'} auf ${sp.name} ist fertig.`); }
          if (u.k === 'hotel') {
            if (u.mode === 'pacht') { opAdd('Hotelpacht', u.cost * 0.0125, 'gew'); opAdd('Instandhaltung', -u.cost * 0.001, 'gew'); return; }
            const h = hotelQ(S, k, u, p, qi);
            u.occ = h.occ;
            p.yr.rev += h.rev;
            opAdd('Hotelumsatz', h.rev, 'gew'); opAdd('Booking-Provisionen (15 %)', -h.ota, 'gew'); opAdd('Personal Hotel', -h.staff, 'gew');
            opAdd('Wasser & Abwasser', -h.water, 'gew'); opAdd('Energie', -h.energy, 'gew'); opAdd('Reinigung & Wäsche', -h.clean, 'gew');
            opAdd('Hotel-Fixkosten', -h.fixed, 'gew'); opAdd('Instandhaltung', -h.maint, 'gew');
            return;
          }
          // Wohnung
          if (!u.tenant) {
            const chance = (0.75 + 0.03 * gi(k)) * (S.mk.shock === 'crash' ? 0.8 : 1);
            if (rng() < chance) { u.tenant = pick(TENANTS); u.rent = ms; u.raised = S.q; u.mold = false; log(S, `🔑 ${u.tenant} zieht bei ${p.name} in ${sp.name} ein (${money(ms)} kalt).`); }
          }
          if (u.tenant && !u.nomad) {
            occupied++;
            const rent = u.rent * 3 * (u.mold ? 0.8 : 1);
            opAdd('Mieteinnahmen (kalt)', rent, 'vv');
            p.yr.rev += rent;
            p.stats.rentGot += rent;
            add('Nebenkosten-Vorauszahlung Mieter', 240);
            add('Wasser & Abwasser', -150); add('Müllabfuhr', -60); add('Hausstrom', -30);
            if (rng() < 0.025 + (u.rent > ms * 1.05 ? 0.03 : 0)) { log(S, `📦 ${u.tenant} zieht aus ${sp.name} aus (${p.name}).`); u.tenant = null; u.rent = 0; u.mold = false; }
          } else {
            opAdd(u.nomad ? 'Leerstand/Mietausfall: Nebenkosten' : 'Leerstand: Nebenkosten', -(u.nomad ? 240 : 130), 'vv');
          }
          opAdd('Hausverwaltung', -105, 'vv');
          opAdd('Instandhaltungsrücklage', -270, 'vv');
        });
        if (occupied) opAdd('Umlage Grundsteuer & Versicherung', ((grundsteuer + vers) * occupied) / SLOTS, 'vv');
      });
      p.opNet = op;
      // Finanzierung
      p.loans.forEach((L) => {
        const zins = (L.rest * L.rate) / 400;
        const tilg = Math.min(L.rest, annuity(L) - zins);
        add('Kreditzinsen', -zins);
        add('Tilgung', -tilg);
        p.yr.int += zins;
        L.rest -= tilg;
      });
      const done = p.loans.filter((L) => L.rest < 1);
      if (done.length) log(S, `🎉 ${p.name} hat ${done.length > 1 ? done.length + ' Kredite' : 'einen Kredit'} komplett abbezahlt!`);
      p.loans = p.loans.filter((L) => L.rest >= 1);
      if (p.money < 0) { add('Dispozinsen (11,5 %)', (p.money * 0.115) / 4); p.schufa = Math.max(0, p.schufa - 1.5); }
      else add('Tagesgeld-Zinsen (nach Abgeltungsteuer)', p.money * 0.005 * 0.75);
      if (p.rs) add('Rechtsschutzversicherung', -390);
      if (p.taxPre) { add('Steuervorauszahlung', -p.taxPre); p.yr.pre += p.taxPre; }
      if (p.badRep) p.badRep = 0;
      const arr = Object.entries(lines).filter(([, v]) => v);
      const total = arr.reduce((a, [, v]) => a + v, 0);
      p.money += total;
      if (p.money >= 0) p.schufa = Math.min(99, p.schufa + 0.5);
      p.stmt = { q: S.q, lines: arr, total };
    });
    marketTick(S);
    if (S.q % 4 === 0) yearEnd(S);
    alive(S).forEach((p) => { if (p.taxGap > 0 && S.q % 4 === 0 && rng() < 0.08) audit(S, p, 1, false); });
    S.q++;
    S.round = S.q;
    S.hist.push(S.players.map((p) => r0(netWorth(S, p))));
    log(S, `📅 ${qName(S.q)} beginnt (${SEASON_NAME[(S.q - 1) % 4]}). Immobilienpreise ${pct(S.mk.idx - 1)} seit Start · Bauzins ${S.mk.zins.toFixed(2).replace('.', ',')} %.`);
  }
  const pct = (x) => (x >= 0 ? '+' : '−') + Math.abs(x * 100).toFixed(1).replace('.', ',') + ' %';

  function marketTick(S) {
    const m = S.mk;
    m.zins = clamp(m.zins + (rng() - 0.5) * 0.3 + (3.5 - m.zins) * 0.05, 1.2, 7.5);
    let g = 0.007 + (3.6 - m.zins) * 0.004 + (rng() - 0.5) * 0.025;
    if (m.shock === 'crash') g -= 0.045;
    m.idx = clamp(m.idx * (1 + g), 0.55, 3);
    m.rent *= 1.005 + rng() * 0.004;
    m.build *= 1.006 + rng() * 0.008;
    m.hotel = clamp(m.hotel + (1 - m.hotel) * 0.35 + (rng() - 0.5) * 0.12, 0.3, 1.4);
    if (m.shock) {
      if (m.shock === 'pandemic') m.hotel = Math.min(m.hotel, 0.4);
      if (--m.shockLeft <= 0) { log(S, m.shock === 'pandemic' ? '💉 Die Pandemie ist vorbei. Die Hotels füllen sich wieder.' : '📈 Der Immobilienmarkt hat sich gefangen.'); m.shock = null; }
    } else {
      const r = rng();
      if (r < 0.03) { m.shock = 'pandemic'; m.shockLeft = 3; m.hotel = 0.35; log(S, '🦠 PANDEMIE! Reisewarnungen überall. Hotels sind drei Quartale lang fast leer.'); }
      else if (r < 0.07) { m.shock = 'crash'; m.shockLeft = 2; log(S, '📉 IMMOBILIENKRISE! Die Preise fallen zwei Quartale lang. Wer zu viel Kredit hat, bekommt Probleme.'); }
      else if (r < 0.12) { m.hotel = 1.3; log(S, '🎉 Großevent im Ruhrgebiet: Hotels sind dieses Quartal ausgebucht.'); }
    }
    m.hist.push(Math.round(m.idx * 1000) / 1000);
    if (m.hist.length > 80) m.hist.shift();
  }

  // ---------- Runden ----------
  function nextTurn(S) {
    const p = S.players[S.cur];
    p.offered = false;
    p.botOps = 0;
    S.doublesCount = 0;
    S.rolledDouble = false;
    S.offer = null;
    S.back = null;
    S.card = null;
    if (alive(S).length < 2) return endGame(S);
    let i = S.cur;
    do { i = (i + 1) % S.players.length; } while (S.players[i].bankrupt);
    const wrapped = i <= S.cur;
    S.cur = i;
    S.turnNo++;
    if (wrapped) {
      quarterEnd(S);
      const years = S.settings.years;
      if (years && S.q > years * 4) return endGame(S);
    }
    const n = S.players[S.cur];
    S.sub = startSub(S, n);
    if (S.sub === 'court') openChoice(S, n, 'court', {});
  }
  function endGame(S) {
    const ranking = S.players.map((p) => ({ id: p.id, worth: r0(netWorth(S, p)) })).sort((a, b) => b.worth - a.worth);
    S.ranking = ranking;
    S.winner = alive(S).length === 1 ? alive(S)[0].id : ranking[0].id;
    S.phase = 'over';
    S.sub = 'over';
    log(S, `🏆 ${P(S, S.winner).name} gewinnt DULIDANOPOLY REALISTIC mit ${money(netWorth(S, P(S, S.winner)))} Nettovermögen!`);
  }
  function insolvency(S, p) {
    p.bankrupt = true;
    owned(S, p.id).forEach((k) => { const st = S.props[k]; st.owner = null; st.units.forEach((u) => { u.nomad = false; }); });
    log(S, `💀 ${p.name} meldet Privatinsolvenz an. Die Immobilien gehen in die Zwangsversteigerung (zurück an den Markt).`);
    p.loans = [];
    p.money = 0;
    S.hist.push(S.players.map((q) => r0(netWorth(S, q))));
    if (alive(S).length < 2) return endGame(S);
    if (S.players[S.cur].id === p.id) { S.card = null; nextTurn(S); }
  }

  // ---------- Aktionen ----------
  const MANAGE = ['build', 'raise', 'sell', 'loan', 'repay', 'toggle', 'evict', 'hotelMode', 'hotelPrice', 'offer'];
  function act(S, pid, a) {
    if (!a || typeof a !== 'object') return 'Ungültige Aktion.';
    if (S.phase !== 'play') return 'Das Spiel läuft nicht.';
    const p = P(S, pid);
    if (!p || p.bankrupt) return 'Du spielst nicht mit.';
    const cur = S.players[S.cur];
    // Kaufangebot beantwortet der Eigentümer
    if (a.type === 'offerAccept' || a.type === 'offerDecline') {
      if (!S.offer || S.offer.to !== pid) return 'Kein Angebot für dich.';
      return answerOffer(S, a.type === 'offerAccept');
    }
    if (cur.id !== pid) return 'Du bist nicht dran.';
    if (S.sub === 'offer') return 'Warte auf die Antwort zum Kaufangebot.';
    if (MANAGE.includes(a.type)) {
      if (!['roll', 'end', 'debt', 'buy'].includes(S.sub)) return 'Erst die aktuelle Entscheidung treffen.';
      if (S.sub === 'debt' && !['sell', 'loan', 'repay', 'toggle'].includes(a.type)) return 'Erst die Schulden in den Griff bekommen.';
      const r = manage(S, p, a);
      if (p.bot) { p.botOps++; if (r) return null; }
      if (!r) checkDebt(S, p);
      return r;
    }
    switch (a.type) {
      case 'roll':
        if (S.sub !== 'roll') return 'Du kannst gerade nicht würfeln.';
        roll(S, p);
        return null;
      case 'buy': return buy(S, p, Number(a.fin) || 0);
      case 'pass':
        if (S.sub !== 'buy') return 'Nichts abzulehnen.';
        log(S, `${p.name} kauft ${SPACES[p.pos].name} nicht.`);
        S.sub = S.rolledDouble ? 'roll' : 'end';
        return null;
      case 'card':
        if (S.sub !== 'card' || !S.card) return 'Keine Entscheidung offen.';
        return resolveCard(S, p, a.k);
      case 'taxAdvisor':
        if (S.sub !== 'tax' || !p.taxDue) return 'Keine Steuererklärung offen.';
        taxAdvisor(S, p);
        if (S.sub === 'court') openChoice(S, p, 'court', {});
        return null;
      case 'taxSelf': {
        if (S.sub !== 'tax' || !p.taxDue) return 'Keine Steuererklärung offen.';
        const e = taxSelf(S, p, a.ok, a.total);
        if (!e && S.sub === 'court') openChoice(S, p, 'court', {});
        return e;
      }
      case 'debtDone':
        if (S.sub !== 'debt') return 'Keine Schulden offen.';
        if (p.money < -dispoLimit(p)) return `Du bist noch ${money(-p.money - dispoLimit(p))} über dem Dispo-Limit.`;
        S.sub = S.back && S.back !== 'debt' ? S.back : startSub(S, p);
        S.back = null;
        if (S.sub === 'court') openChoice(S, p, 'court', {});
        return null;
      case 'insolvency':
        insolvency(S, p);
        return null;
      case 'endTurn':
        if (S.sub !== 'end') return 'Du kannst den Zug noch nicht beenden.';
        nextTurn(S);
        return null;
    }
    return 'Unbekannte Aktion.';
  }
  function manage(S, p, a) {
    const i = Number(a.idx);
    switch (a.type) {
      case 'build': return build(S, p, i, a.k, Number(a.fin) || 0);
      case 'raise': return raiseRent(S, p, i);
      case 'sell': return sell(S, p, i);
      case 'loan': {
        const amt = Math.floor(Number(a.amt) / 1000) * 1000;
        if (!(amt >= 5000)) return 'Mindestens Ð5.000.';
        if (amt > loanRoom(S, p)) return `Die Bank gibt dir höchstens ${money(loanRoom(S, p))}.`;
        takeLoan(S, p, amt, 'Beleihung');
        log(S, `🏦 ${p.name} nimmt ${money(amt)} Kredit zu ${String(rateFor(S, p)).replace('.', ',')} % auf (Grundschuld auf den Bestand).`);
        return null;
      }
      case 'repay': return repay(S, p, a.id);
      case 'toggle': {
        if (a.what === 'rs') { p.rs = !p.rs; log(S, `${p.name} ${p.rs ? 'schließt eine Vermieter-Rechtsschutzversicherung ab (Ð390 im Quartal)' : 'kündigt die Rechtsschutzversicherung'}.`); return null; }
        if (a.what === 'elem') { p.elem = !p.elem; log(S, `${p.name} ${p.elem ? 'versichert die Gebäude gegen Elementarschäden' : 'kündigt die Elementarversicherung'}.`); return null; }
        return 'Unbekannte Versicherung.';
      }
      case 'evict': {
        const st = S.props[i];
        if (!st || st.owner !== p.id) return 'Nicht deine Immobilie.';
        const u = st.units.find((x) => x.nomad);
        if (!u) return 'Hier wohnt kein Mietnomade.';
        openChoice(S, p, 'evict', { idx: i, unit: st.units.indexOf(u), stake: Math.max(3000, u.rent * 12) });
        return null;
      }
      case 'hotelMode': {
        const u = S.props[i] && S.props[i].owner === p.id && S.props[i].units[Number(a.u)];
        if (!u || u.k !== 'hotel') return 'Kein Hotel.';
        if (!['self', 'pacht'].includes(a.mode) || u.mode === a.mode) return null;
        if (a.mode === 'self') { if (p.money < 10000) return 'Den Pächter rauskaufen kostet Ð10.000.'; pay(S, p, 10000); }
        u.mode = a.mode;
        log(S, `🏨 ${p.name} ${a.mode === 'pacht' ? `verpachtet das Hotel auf ${SPACES[i].name} (feste Pacht, kein Risiko)` : `kauft den Pächter raus und betreibt das Hotel auf ${SPACES[i].name} selbst (${money(10000)})`}.`);
        return null;
      }
      case 'hotelPrice': {
        const u = S.props[i] && S.props[i].owner === p.id && S.props[i].units[Number(a.u)];
        if (!u || u.k !== 'hotel' || !PRICE_LVL[a.lvl]) return 'Kein Hotel.';
        u.lvl = a.lvl;
        return null;
      }
      case 'offer': return makeOffer(S, p, Number(a.pct));
    }
    return 'Unbekannte Aktion.';
  }

  // Kaufangebot an den Eigentümer des Feldes, auf dem man steht
  function makeOffer(S, p, pctv) {
    const i = p.pos, st = S.props[i];
    if (!st || !st.owner || st.owner === p.id) return 'Hier kannst du kein Kaufangebot machen.';
    if (p.offered) return 'Ein Angebot pro Zug reicht.';
    if (st.units.some((u) => u.ready > S.q)) return 'Baustelle. Erst nach der Fertigstellung.';
    if (![1, 1.15, 1.3].includes(pctv)) return 'Ungültiges Angebot.';
    const price = r0(propValue(S, i) * pctv);
    const nk = buyCosts(S, i, price).total;
    const loan = Math.min(Math.floor((price * 0.8) / 1000) * 1000, loanRoom(S, p, price));
    if (p.money + loan < price + nk) return `Dafür reicht dein Eigenkapital nicht (${money(price + nk - loan)} bar nötig).`;
    p.offered = true;
    S.offer = { from: p.id, to: st.owner, idx: i, price, back: S.sub };
    S.sub = 'offer';
    log(S, `✉️ ${p.name} bietet ${P(S, st.owner).name} ${money(price)} für ${SPACES[i].name}.`);
    return null;
  }
  function answerOffer(S, yes) {
    const o = S.offer, buyer = P(S, o.from), seller = P(S, o.to), st = S.props[o.idx];
    S.offer = null;
    S.sub = o.back;
    if (!yes || st.owner !== seller.id) { log(S, `${seller.name} lehnt das Angebot für ${SPACES[o.idx].name} ab.`); return null; }
    const nk = buyCosts(S, o.idx, o.price).total;
    const need = o.price + nk;
    const loan = Math.max(0, Math.min(Math.floor((o.price * 0.8) / 1000) * 1000, loanRoom(S, buyer, o.price), Math.ceil((need - buyer.money + 20000) / 1000) * 1000));
    if (buyer.money + loan < need) { log(S, `Die Finanzierung von ${buyer.name} platzt. Kein Verkauf.`); return null; }
    if (loan > 0) takeLoan(S, buyer, loan, `Kauf ${SPACES[o.idx].name}`);
    pay(S, buyer, need);
    const invested = st.paid + st.units.reduce((a, u) => a + u.cost, 0), gain = o.price - invested;
    if (gain > 0 && S.q - st.bought < 40) seller.yr.gain += gain;
    seller.money += o.price;
    Object.assign(st, { owner: buyer.id, bought: S.q, paid: o.price });
    st.units.forEach((u) => { u.cost = r0(unitValue(S, u)); u.idx0 = S.mk.idx; });
    buyer.stats.bought++;
    log(S, `🖋️ Notartermin: ${buyer.name} kauft ${SPACES[o.idx].name} von ${seller.name} für ${money(o.price)} (+${money(nk)} Nebenkosten).`);
    checkDebt(S, buyer);
    return null;
  }

  // ---------- Bots ----------
  function botStep(S) {
    if (S.phase !== 'play') return null;
    if (S.sub === 'offer' && S.offer) {
      const o = P(S, S.offer.to);
      if (!o.bot) return null;
      const v = propValue(S, S.offer.idx);
      return { pid: o.id, action: { type: S.offer.price >= v * 1.12 || (o.money < 0 && S.offer.price >= v) ? 'offerAccept' : 'offerDecline' } };
    }
    const p = S.players[S.cur];
    if (!p || !p.bot) return null;
    const go = (action) => ({ pid: p.id, action });
    switch (S.sub) {
      case 'tax': {
        const lvl = p.taxDue.lvl, total = taxTasks(lvl);
        if (netWorth(S, p) > 500000 || rng() < 0.35) return go({ type: 'taxAdvisor' });
        return go({ type: 'taxSelf', total, ok: Math.round(total * (0.55 + rng() * 0.45)) });
      }
      case 'card': {
        const opts = cardOpts(S).filter((o) => !o.disabled);
        const ks = opts.map((o) => o.k);
        const ctx = S.card.ctx;
        let k = ks[0];
        if (ks.includes('lawyer')) k = p.rs || (ctx.stake || 0) > 4000 ? 'lawyer' : ks.includes('settle') && (ctx.stake || 0) < 2000 ? 'settle' : ks.includes('self') ? 'self' : 'lawyer';
        if (S.card.id === 'court') k = p.money > 40000 ? 'lawyer' : 'wait';
        if (ks.includes('fix')) k = 'fix';
        if (ks.includes('pr')) k = p.money > 30000 ? 'pr' : 'ok';
        if (ks.includes('sell')) k = p.money < 0 || rng() < 0.4 ? 'sell' : 'ok';
        if (ks.includes('drop') && S.card.id === 'evict') k = 'lawyer';
        if (!ks.includes(k)) k = ks[0];
        return go({ type: 'card', k });
      }
      case 'buy': {
        const price = propValue(S, p.pos), nk = buyCosts(S, p.pos, price).total;
        const reserve = 15000;
        for (const fin of [0.8, 0.5, 0]) {
          const loan = Math.floor((price * fin) / 1000) * 1000;
          if (loan && loan > loanRoom(S, p, price)) continue;
          if (p.money + loan - price - nk >= reserve) return go({ type: 'buy', fin });
        }
        return go({ type: 'pass' });
      }
      case 'debt': {
        const room = loanRoom(S, p);
        const need = -p.money - dispoLimit(p) + 5000;
        if (room >= need && need > 0) return go({ type: 'loan', amt: Math.ceil(need / 1000) * 1000 });
        if (p.money >= -dispoLimit(p)) return go({ type: 'debtDone' });
        const mine = owned(S, p.id).filter((k) => !S.props[k].units.some((u) => u.ready > S.q)).sort((a, b) => propValue(S, a) - propValue(S, b));
        if (mine.length) return go({ type: 'sell', idx: mine[0] });
        return go({ type: 'insolvency' });
      }
      case 'roll': case 'end': {
        const m = p.botOps < 4 ? botManage(S, p) : null;
        if (m) return go(m);
        return go({ type: S.sub === 'roll' ? 'roll' : 'endTurn' });
      }
    }
    return null;
  }
  function botManage(S, p) {
    if (p.money < -5000) {
      const room = loanRoom(S, p);
      if (room >= 10000) return { type: 'loan', amt: Math.min(room, Math.ceil((-p.money + 10000) / 1000) * 1000) };
    }
    const mine = owned(S, p.id);
    for (const k of mine) {
      const st = S.props[k];
      if (SPACES[k].type !== 'prop') continue;
      if (st.units.some((u) => u.nomad)) return { type: 'evict', idx: k };
      const ms = mietspiegel(S, k);
      if (st.units.some((u) => u.k === 'apt' && u.tenant && !u.nomad && S.q - u.raised >= 5 && u.rent < ms * 0.97)) return { type: 'raise', idx: k };
    }
    if (!p.rs && mine.length >= 3) return { type: 'toggle', what: 'rs' };
    if (!p.offered && S.sub === 'end' && S.props[p.pos] && S.props[p.pos].owner && S.props[p.pos].owner !== p.id && rng() < 0.15 && p.money > 150000) return { type: 'offer', pct: 1.15 };
    const reserve = 25000;
    const sites = mine.filter((k) => SPACES[k].type === 'prop' && usedSlots(S.props[k]) < SLOTS && S.props[k].blocked !== S.q).sort((a, b) => gi(b) - gi(a));
    for (const k of sites) {
      const free = SLOTS - usedSlots(S.props[k]);
      const kind = free >= 2 && gi(k) >= 3 && rng() < 0.45 ? 'hotel' : 'apt';
      const cost = unitCost(S, k, kind) * (p.kfw ? 0.85 : 1), fee = permitFee(kind);
      for (const fin of [0, 0.5, 0.8]) {
        const loan = Math.floor((unitCost(S, k, kind) * fin) / 1000) * 1000;
        if (loan && loan > loanRoom(S, p, unitCost(S, k, kind))) continue;
        if (p.money - (cost - loan) - fee >= reserve * (fin ? 1 : 1.5)) return { type: 'build', idx: k, k: kind, fin };
      }
    }
    if (p.money > 200000 && p.loans.length) {
      const L = p.loans.slice().sort((a, b) => b.rate - a.rate)[0];
      if (p.money - L.rest * 1.015 > 80000) return { type: 'repay', id: L.id };
    }
    return null;
  }

  // ---------- Lobby (nutzt die Lobby des klassischen Spiels) ----------
  const REAL = {
    MODES, SPACES, BOARD, LAGE, SLOTS, APT_M2, ROOMS, SALARY, LIVING, PRICE_LVL, SEASON, SEASON_NAME, CARDS, CHOICES, BOT_NAMES,
    start, act, botStep, netWorth, endGame, qName, money,
    propValue, landValue, unitValue, unitCost, permitFee, mietspiegel, buyCosts, usedSlots, ownsGroup, owned, hotelQ, hotelNet,
    loanRoom, rateFor, debt, dispoLimit, annuity, collateral, lawyerFee, advisorFee, taxTasks, taxLevel, cardText, cardOpts, gi,
    setRng: (f) => { rng = f; },
  };
  if (isNode) module.exports = REAL;
  else root.DULI_REAL = REAL;
})(typeof window !== 'undefined' ? window : globalThis);
