// DULIDAN WORLD – Strategie-Modus ohne Würfel. Läuft wie die klassische Engine nur beim Host.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const WD = isNode ? require('./world-data.js') : root.DULI_WORLD_DATA;
  const { ZONES, CITIES, ROUTES, LEVELS, RENT_PCT, INCOME_PCT, RULES, EVENTS } = WD;
  const CITY = Object.fromEntries(CITIES.map(c => [c.id, c]));
  const NEIGH = {};
  for (const c of CITIES) NEIGH[c.id] = [];
  for (const [a, b] of ROUTES) { NEIGH[a].push(b); NEIGH[b].push(a); }
  const HUBS = CITIES.filter(c => c.hub).map(c => c.id);
  const ZONE_CITIES = {};
  for (const c of CITIES) (ZONE_CITIES[c.zone] = ZONE_CITIES[c.zone] || []).push(c.id);

  let rng = Math.random;
  const M = (n) => 'Ð' + n;
  const r5 = (n) => Math.round(n / 5) * 5;
  const P = (S, id) => S.players.find(p => p.id === id);
  const curP = (S) => S.players[S.cur];
  const active = (S) => S.players.filter(p => !p.bankrupt);

  function log(S, m) {
    S.logSeq = (S.logSeq || 0) + 1;
    S.log.push(m);
    if (S.log.length > 80) S.log.splice(0, S.log.length - 80);
  }

  // ---------- Werte ----------
  const ev = (S) => S.event || {};
  function zoneComplete(S, pid, z) { return ZONE_CITIES[z].every(id => S.cities[id].owner === pid); }
  function completeZones(S, pid) { return Object.keys(ZONES).filter(z => zoneComplete(S, pid, z)); }
  function zoneHasBuildings(S, z) { return ZONE_CITIES[z].some(id => S.cities[id].level > 0); }

  function rentFor(S, id, payer) {
    const c = CITY[id], st = S.cities[id];
    if (!st.owner || st.mort) return 0;
    let r = c.price * RENT_PCT[st.level];
    if (st.level === 0 && zoneComplete(S, st.owner, c.zone)) r *= 2;
    if (ev(S).boom && ev(S).zone === c.zone) r *= 2;
    if (payer && payer.token === 'ship' && c.hub) r /= 2;
    return r5(r);
  }
  function incomeFor(S, id) {
    const c = CITY[id], st = S.cities[id];
    if (!st.owner || st.mort) return 0;
    let r = c.price * INCOME_PCT[st.level];
    if (st.level === 0 && zoneComplete(S, st.owner, c.zone)) r *= 2;
    return r5(r);
  }
  function incomeOf(S, p) {
    let sum = RULES.baseIncome + (p.token === 'zebra' ? 50 : 0);
    for (const id in S.cities) if (S.cities[id].owner === p.id) sum += incomeFor(S, id);
    return Math.round(sum * (ev(S).incomeMult || 1));
  }
  function buyPrice(p, id) { return p.token === 'dulidan' ? r5(CITY[id].price * 0.9) : CITY[id].price; }
  function buildCost(S, p, id) {
    const base = ZONES[CITY[id].zone].build - (p.token === 'pen' ? 25 : 0);
    return r5(base * (ev(S).buildMult || 1));
  }
  function takeoverCost(S, id) {
    const c = CITY[id], st = S.cities[id], owner = P(S, st.owner);
    const mult = owner && owner.token === 'helmet' ? 2 : (ev(S).takeoverMult || RULES.takeoverMult);
    return r5((c.price + st.level * ZONES[c.zone].build) * mult);
  }
  function flightCost(S) { return ev(S).flightCost ?? RULES.flightCost; }
  function flightAp(S) { return ev(S).flightAp ?? RULES.flightAp; }
  function unmortgageCost(id) { return Math.ceil(CITY[id].price * 0.55); }
  function moveCost(S, p) { return S.freeStep ? 0 : 1; }

  function netWorth(S, p) {
    let w = p.money;
    for (const id in S.cities) {
      const st = S.cities[id];
      if (st.owner !== p.id) continue;
      w += st.mort ? CITY[id].price / 2 : CITY[id].price;
      w += st.level * ZONES[CITY[id].zone].build;
    }
    return w;
  }

  function takeoverBlock(S, p, id) {
    const st = S.cities[id], c = CITY[id];
    if (!st.owner || st.owner === p.id) return 'Die Stadt gehört keinem Gegner.';
    if (ev(S).noTakeover) return 'Grenzen dicht: diese Runde keine Übernahmen.';
    if (zoneComplete(S, st.owner, c.zone)) return 'Komplette Zonen sind vor Übernahmen geschützt.';
    if (st.level >= 4) return 'Ein Wahrzeichen kann man nicht übernehmen.';
    return null;
  }

  // ---------- Start ----------
  function start(S) {
    if (S.players.length < 2) return 'Ihr braucht mindestens 2 Spieler.';
    if (S.players.some(p => !p.token)) return 'Jeder muss zuerst eine Figur wählen.';
    const st = S.settings || {};
    S.mode = 'world';
    S.cities = {};
    for (const c of CITIES) S.cities[c.id] = { owner: null, level: 0, mort: false };
    const starts = ['dui', 'nyc', 'tyo', 'lag', 'sao', 'syd'];
    S.players.forEach((p, i) => {
      Object.assign(p, {
        money: st.startMoney || RULES.startMoney, loc: starts[i % starts.length], bankrupt: false,
        used: { april: false }, visited: [starts[i % starts.length]],
        stats: { rentPaid: 0, rentGot: 0, maxRent: 0, built: 0, bought: 0, takeovers: 0, flights: 0, km: 0 },
      });
    });
    S.maxRounds = st.maxRounds || 30;
    S.phase = 'play'; S.cur = 0; S.round = 1; S.turnNo = 1;
    S.event = { ...EVENTS[0] };
    S.debt = null; S.trade = null; S.log = []; S.winner = null; S.ranking = null;
    log(S, `DULIDAN WORLD startet! Ziel: ${RULES.winZones} komplette Zonen.`);
    beginTurn(S);
    return null;
  }

  function beginTurn(S) {
    const p = curP(S);
    const inc = incomeOf(S, p);
    p.money += inc;
    S.ap = ev(S).ap || RULES.ap;
    S.freeStep = p.token === 'berlingo';
    S.sub = 'act';
    log(S, `${p.name} ist dran und kassiert ${M(inc)} Einnahmen.`);
  }

  function drawEvent(S) {
    const e = { ...EVENTS[1 + Math.floor(rng() * (EVENTS.length - 1))] };
    if (e.boom) {
      const zs = Object.keys(ZONES);
      e.zone = zs[Math.floor(rng() * zs.length)];
      e.t = e.t.replace('ZONE', ZONES[e.zone].name);
    }
    S.event = e;
    log(S, `📰 April-News, Runde ${S.round}: ${e.t}`);
    const act = active(S);
    if (e.robin) {
      const rich = act.slice().sort((a, b) => b.money - a.money)[0];
      const others = act.filter(p => p !== rich);
      const each = Math.floor(Math.min(rich.money, e.robin) / Math.max(1, others.length));
      for (const o of others) { rich.money -= each; o.money += each; }
    }
    if (e.taxPct) for (const p of act) p.money -= Math.floor(p.money * e.taxPct);
    if (e.gift) for (const p of act) p.money += e.gift;
  }

  function nextTurn(S) {
    const n = S.players.length;
    let i = S.cur, wrapped = false;
    for (let g = 0; g < n; g++) {
      i = (i + 1) % n;
      if (i === 0) wrapped = true;
      if (!S.players[i].bankrupt) break;
    }
    S.cur = i;
    S.turnNo++;
    if (wrapped) {
      S.round++;
      if (S.maxRounds && S.round > S.maxRounds) return endGame(S, 'Rundenlimit erreicht.');
      drawEvent(S);
    }
    beginTurn(S);
  }

  function rank(S) {
    return S.players.map(p => ({ id: p.id, worth: p.bankrupt ? 0 : netWorth(S, p) })).sort((a, b) => b.worth - a.worth);
  }
  function endGame(S, why) {
    S.ranking = rank(S);
    S.phase = 'over';
    S.winner = S.ranking[0].id;
    log(S, `${why || 'Spiel beendet.'} 🏆 ${P(S, S.winner).name} ist am reichsten!`);
  }
  function checkWin(S, p) {
    const z = completeZones(S, p.id);
    if (z.length >= RULES.winZones) {
      S.ranking = rank(S);
      S.phase = 'over';
      S.winner = p.id;
      log(S, `🌍 WELTHERRSCHAFT! ${p.name} kontrolliert ${z.length} komplette Zonen und gewinnt!`);
      return true;
    }
    return false;
  }

  // ---------- Bezahlen ----------
  function charge(S, p, to, amt) {
    if (p.money >= amt) {
      p.money -= amt;
      if (to) P(S, to).money += amt;
      return true;
    }
    S.debt = { pid: p.id, items: [{ to, amt }] };
    S.sub = 'debt';
    log(S, `${p.name} fehlen ${M(amt - p.money)}. Gebäude verkaufen, Hypotheken aufnehmen oder handeln!`);
    return false;
  }

  function arrive(S, p, id) {
    p.loc = id;
    p.stats.km++;
    const c = CITY[id], st = S.cities[id];
    log(S, `${p.name} reist nach ${c.name}.`);
    if (p.token === 'doener' && !p.visited.includes(id)) {
      p.visited.push(id);
      p.money += 30;
      log(S, `Street-Food-Tour! ${p.name} bekommt ${M(30)}. 🥙`);
    }
    if (c.quip && rng() < 0.45) log(S, `April: „${c.quip}“`);
    if (st.owner && st.owner !== p.id && !st.mort) {
      const owner = P(S, st.owner);
      const toll = rentFor(S, id, p);
      if (toll > 0) {
        log(S, `${p.name} zahlt ${M(toll)} Maut an ${owner.name}.`);
        p.stats.rentPaid += toll; p.stats.maxRent = Math.max(p.stats.maxRent, toll);
        owner.stats.rentGot += toll;
        charge(S, p, owner.id, toll);
      }
    }
  }

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    if (S.phase !== 'play') return 'Das Spiel ist vorbei.';
    const p = P(S, pid);
    if (!p || p.bankrupt) return 'Du spielst nicht mit.';
    if (!a || !a.type) return 'Ungültige Aktion.';
    const isCur = curP(S).id === pid;

    // Handel & Schulden zuerst
    switch (a.type) {
      case 'tradeAccept':
        if (!S.trade || S.trade.to !== pid) return 'Kein Angebot für dich.';
        return acceptTrade(S);
      case 'tradeDecline':
        if (!S.trade || (S.trade.to !== pid && S.trade.from !== pid)) return 'Kein Angebot.';
        log(S, S.trade.to === pid ? `${p.name} lehnt das Angebot ab.` : `${p.name} zieht das Angebot zurück.`);
        S.trade = null;
        return null;
      case 'payDebt': {
        if (S.sub !== 'debt' || S.debt.pid !== pid) return 'Du hast keine Schulden.';
        const d = S.debt, it = d.items[0];
        if (p.money < it.amt) return `Dir fehlen noch ${M(it.amt - p.money)}.`;
        p.money -= it.amt;
        if (it.to) P(S, it.to).money += it.amt;
        S.debt = null; S.sub = 'act';
        log(S, `${p.name} hat die Schulden bezahlt.`);
        return null;
      }
      case 'bankrupt':
        if (S.sub !== 'debt' || S.debt.pid !== pid) return 'Bankrott geht nur, wenn du nicht zahlen kannst.';
        return bankrupt(S, p);
    }

    if (!isCur) return 'Du bist nicht dran.';
    const here = p.loc, st = S.cities[here], city = CITY[here];
    const inAct = S.sub === 'act';
    const inManage = S.sub === 'act' || S.sub === 'debt';

    switch (a.type) {
      case 'move': {
        if (!inAct) return 'Erst die Schulden klären.';
        const to = String(a.to);
        if (!NEIGH[here].includes(to)) return 'Dahin gibt es keine direkte Route.';
        const cost = moveCost(S, p);
        if (S.ap < cost) return 'Keine Aktionen mehr übrig.';
        S.ap -= cost;
        S.freeStep = false;
        arrive(S, p, to);
        return null;
      }
      case 'fly': {
        if (!inAct) return 'Erst die Schulden klären.';
        const to = String(a.to);
        if (ev(S).noFlights) return 'Diese Runde sind alle Flughäfen zu.';
        if (!city.hub || !CITY[to] || !CITY[to].hub || to === here) return 'Flüge gehen nur von Flughafen zu Flughafen.';
        if (S.ap < flightAp(S)) return `Ein Flug braucht ${flightAp(S)} Aktionen.`;
        const fc = flightCost(S);
        if (p.money < fc) return 'Das Ticket ist zu teuer für dich.';
        S.ap -= flightAp(S);
        p.money -= fc;
        p.stats.flights++;
        log(S, `✈️ ${p.name} fliegt für ${M(fc)} nach ${CITY[to].name}.`);
        arrive(S, p, to);
        return null;
      }
      case 'buy': {
        if (!inAct) return 'Erst die Schulden klären.';
        if (st.owner) return 'Die Stadt gehört schon jemandem.';
        if (S.ap < 1) return 'Keine Aktionen mehr übrig.';
        const price = buyPrice(p, here);
        if (p.money < price) return 'Nicht genug Dulis.';
        S.ap -= 1;
        p.money -= price;
        st.owner = p.id;
        p.stats.bought++;
        log(S, `${p.name} kauft ${city.name} für ${M(price)}.`);
        if (zoneComplete(S, p.id, city.zone)) log(S, `🔥 ${p.name} kontrolliert jetzt die ganze Zone ${ZONES[city.zone].name}!`);
        checkWin(S, p);
        return null;
      }
      case 'build': {
        if (!inAct) return 'Erst die Schulden klären.';
        const id = String(a.id || here);
        const c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id) return 'Die Stadt gehört dir nicht.';
        if (CITY[here].zone !== c.zone) return 'Du musst dafür in dieser Zone sein.';
        if (!zoneComplete(S, p.id, c.zone)) return 'Erst die ganze Zone besitzen.';
        if (ZONE_CITIES[c.zone].some(i => S.cities[i].mort)) return 'In der Zone ist noch eine Hypothek.';
        if (s2.level >= 4) return 'Hier steht schon ein Wahrzeichen.';
        if (s2.level > Math.min(...ZONE_CITIES[c.zone].map(i => S.cities[i].level))) return 'Gleichmäßig bauen! Erst die anderen Städte der Zone.';
        if (S.ap < 1) return 'Keine Aktionen mehr übrig.';
        const cost = buildCost(S, p, id);
        if (p.money < cost) return 'Nicht genug Dulis.';
        S.ap -= 1;
        p.money -= cost;
        s2.level++;
        p.stats.built++;
        log(S, `🏗️ ${p.name} baut ${['', 'ein Studio', 'ein Büro', 'einen Tower', 'ein Wahrzeichen'][s2.level]} in ${c.name}.`);
        return null;
      }
      case 'takeover': {
        if (!inAct) return 'Erst die Schulden klären.';
        const blk = takeoverBlock(S, p, here);
        if (blk) return blk;
        if (S.ap < 2) return 'Eine Übernahme braucht 2 Aktionen.';
        const cost = takeoverCost(S, here);
        if (p.money < cost) return 'Nicht genug Dulis für die Übernahme.';
        const old = P(S, st.owner);
        S.ap -= 2;
        p.money -= cost; old.money += cost;
        st.owner = p.id;
        p.stats.takeovers = (p.stats.takeovers || 0) + 1;
        log(S, `🦹 Feindliche Übernahme! ${p.name} schnappt ${old.name} ${city.name} für ${M(cost)} weg.`);
        if (zoneComplete(S, p.id, city.zone)) log(S, `🔥 ${p.name} kontrolliert jetzt die ganze Zone ${ZONES[city.zone].name}!`);
        checkWin(S, p);
        return null;
      }
      case 'sell': {
        if (!inManage) return 'Geht gerade nicht.';
        const id = String(a.id), c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id || !s2.level) return 'Hier gibt es nichts zu verkaufen.';
        if (s2.level < Math.max(...ZONE_CITIES[c.zone].map(i => S.cities[i].level))) return 'Gleichmäßig verkaufen!';
        s2.level--;
        const back = Math.floor(ZONES[c.zone].build / 2);
        p.money += back;
        log(S, `${p.name} reißt in ${c.name} ein Stockwerk ab (+${M(back)}).`);
        return null;
      }
      case 'mortgage': {
        if (!inManage) return 'Geht gerade nicht.';
        const id = String(a.id), c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id || s2.mort) return 'Geht nicht.';
        if (zoneHasBuildings(S, c.zone)) return 'Erst alle Gebäude der Zone verkaufen.';
        s2.mort = true;
        p.money += c.price / 2;
        log(S, `${p.name} nimmt eine Hypothek auf ${c.name} auf (+${M(c.price / 2)}).`);
        return null;
      }
      case 'unmortgage': {
        if (!inManage) return 'Geht gerade nicht.';
        const id = String(a.id), c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id || !s2.mort) return 'Keine Hypothek vorhanden.';
        const cost = unmortgageCost(id);
        if (p.money < cost) return 'Nicht genug Dulis.';
        p.money -= cost;
        s2.mort = false;
        log(S, `${p.name} löst die Hypothek auf ${c.name} ab.`);
        return null;
      }
      case 'aprilReroll': {
        if (p.token !== 'april' || p.used.april) return 'Geht nicht.';
        p.used.april = true;
        log(S, `🤖 April legt die Nachricht zurück und erfindet eine neue.`);
        drawEvent(S);
        return null;
      }
      case 'tradePropose':
        if (!inManage) return 'Geht gerade nicht.';
        if (S.trade) return 'Es gibt schon ein offenes Angebot.';
        return proposeTrade(S, pid, a.trade || {});
      case 'endTurn':
        if (S.sub !== 'act') return 'Erst die Schulden klären.';
        if (S.trade) return 'Erst das offene Angebot klären.';
        nextTurn(S);
        return null;
    }
    return 'Unbekannte Aktion.';
  }

  function bankrupt(S, p) {
    const to = S.debt.items[0].to;
    const heir = to ? P(S, to) : null;
    for (const id in S.cities) {
      const st = S.cities[id];
      if (st.owner !== p.id) continue;
      if (heir) { p.money += Math.floor(st.level * ZONES[CITY[id].zone].build / 2); st.level = 0; st.owner = heir.id; }
      else { st.owner = null; st.level = 0; st.mort = false; }
    }
    if (heir) heir.money += p.money;
    log(S, `${p.name} ist pleite! ${heir ? `Alles geht an ${heir.name}.` : 'Alles geht zurück an die Bank.'}`);
    p.money = 0; p.bankrupt = true;
    S.debt = null;
    if (S.trade && (S.trade.from === p.id || S.trade.to === p.id)) S.trade = null;
    const left = active(S);
    if (left.length === 1) {
      S.ranking = rank(S); S.phase = 'over'; S.winner = left[0].id;
      log(S, `🏆 ${left[0].name} gewinnt DULIDAN WORLD!`);
      return null;
    }
    if (heir && checkWin(S, heir)) return null;
    nextTurn(S);
    return null;
  }

  // ---------- Handel ----------
  function validSide(S, pid, side) {
    const p = P(S, pid);
    side.money = Math.max(0, Math.floor(Number(side.money) || 0));
    side.props = (side.props || []).map(String);
    if (side.money > p.money) return `${p.name} hat nicht so viel Dulis.`;
    for (const id of side.props) {
      if (!CITY[id] || S.cities[id].owner !== pid) return `${CITY[id] ? CITY[id].name : 'Stadt'} gehört nicht ${p.name}.`;
      if (zoneHasBuildings(S, CITY[id].zone)) return `In der Zone von ${CITY[id].name} stehen Gebäude.`;
    }
    return null;
  }
  function proposeTrade(S, from, t) {
    const to = P(S, t.to);
    if (!to || to.bankrupt || to.id === from) return 'Ungültiger Handelspartner.';
    const give = { props: (t.give || {}).props, money: (t.give || {}).money, jf: 0 };
    const get = { props: (t.get || {}).props, money: (t.get || {}).money, jf: 0 };
    const e = validSide(S, from, give) || validSide(S, to.id, get);
    if (e) return e;
    if (!give.props.length && !get.props.length && !give.money && !get.money) return 'Das Angebot ist leer.';
    S.trade = { from, to: to.id, give, get };
    log(S, `${P(S, from).name} macht ${to.name} ein Angebot.`);
    return null;
  }
  function acceptTrade(S) {
    const t = S.trade;
    const e = validSide(S, t.from, t.give) || validSide(S, t.to, t.get);
    if (e) { S.trade = null; return e; }
    const a = P(S, t.from), b = P(S, t.to);
    for (const id of t.give.props) S.cities[id].owner = b.id;
    for (const id of t.get.props) S.cities[id].owner = a.id;
    a.money += t.get.money - t.give.money;
    b.money += t.give.money - t.get.money;
    S.trade = null;
    log(S, `Deal! ${a.name} und ${b.name} haben gehandelt. 🤝`);
    if (!checkWin(S, a)) checkWin(S, b);
    return null;
  }

  // ---------- Bots ----------
  function bfs(S, p, from) {
    // Distanz in Schritten, Kosten = Maut auf dem Weg (fremde Städte)
    const dist = { [from]: 0 }, toll = { [from]: 0 }, prev = {};
    const q = [from];
    while (q.length) {
      const x = q.shift();
      for (const y of NEIGH[x]) {
        if (dist[y] != null) continue;
        dist[y] = dist[x] + 1;
        const st = S.cities[y];
        toll[y] = toll[x] + (st.owner && st.owner !== p.id ? rentFor(S, y, p) : 0);
        prev[y] = x;
        q.push(y);
      }
    }
    return { dist, toll, prev };
  }
  function firstStep(prev, from, to) {
    let x = to;
    while (prev[x] && prev[x] !== from) x = prev[x];
    return x;
  }

  function botStep(S) {
    if (S.phase !== 'play') return null;
    if (S.trade) {
      const to = P(S, S.trade.to);
      return to.bot ? { pid: to.id, action: { type: 'tradeDecline' } } : null;
    }
    const p = curP(S);
    if (!p.bot) return null;
    const go = (action) => ({ pid: p.id, action });
    const owned = Object.keys(S.cities).filter(id => S.cities[id].owner === p.id);
    const reserve = 200;

    if (S.sub === 'debt') {
      const need = S.debt.items[0].amt;
      if (p.money >= need) return go({ type: 'payDebt' });
      for (const id of owned) {
        const st = S.cities[id];
        if (st.level && st.level === Math.max(...ZONE_CITIES[CITY[id].zone].map(i => S.cities[i].level))) return go({ type: 'sell', id });
      }
      const m = owned.filter(id => !S.cities[id].mort && !zoneHasBuildings(S, CITY[id].zone)).sort((a, b) => CITY[a].price - CITY[b].price)[0];
      return go(m ? { type: 'mortgage', id: m } : { type: 'bankrupt' });
    }

    for (const id of owned) if (S.cities[id].mort && p.money - unmortgageCost(id) > 600) return go({ type: 'unmortgage', id });

    const here = p.loc, st = S.cities[here], c = CITY[here];
    // Bauen in der aktuellen Zone
    if (S.ap >= 1 && zoneComplete(S, p.id, c.zone) && !ZONE_CITIES[c.zone].some(i => S.cities[i].mort)) {
      const min = Math.min(...ZONE_CITIES[c.zone].map(i => S.cities[i].level));
      const target = ZONE_CITIES[c.zone].find(i => S.cities[i].level === min && min < 4);
      if (target && p.money - buildCost(S, p, target) >= reserve) return go({ type: 'build', id: target });
    }
    // Kaufen
    if (S.ap >= 1 && !st.owner) {
      const price = buyPrice(p, here);
      const mineInZone = ZONE_CITIES[c.zone].filter(i => S.cities[i].owner === p.id).length;
      if (p.money - price >= 120 || (mineInZone >= 1 && p.money >= price)) return go({ type: 'buy' });
    }
    // Übernehmen, wenn es hilft
    if (S.ap >= 2 && st.owner && st.owner !== p.id && !takeoverBlock(S, p, here)) {
      const cost = takeoverCost(S, here);
      const mineInZone = ZONE_CITIES[c.zone].filter(i => S.cities[i].owner === p.id).length;
      if (mineInZone >= 1 && p.money - cost >= reserve) return go({ type: 'takeover' });
    }
    // Ziel suchen
    if (S.ap >= 1 || S.freeStep) {
      const { dist, toll, prev } = bfs(S, p, here);
      let best = null;
      for (const id in dist) {
        if (id === here) continue;
        const s2 = S.cities[id], cc = CITY[id];
        let score = 0;
        const mine = ZONE_CITIES[cc.zone].filter(i => S.cities[i].owner === p.id).length;
        if (!s2.owner && p.money > buyPrice(p, id)) score = cc.price * (1 + mine * 0.8);
        else if (s2.owner === p.id && zoneComplete(S, p.id, cc.zone) && p.money > 500) score = 250 + cc.price * 0.3;
        else if (s2.owner && s2.owner !== p.id && mine >= 1 && !takeoverBlock(S, p, id) && p.money - takeoverCost(S, id) > reserve) score = cc.price * 0.9;
        if (!score) continue;
        score = score / (dist[id] + 1) - toll[id] * 1.5;
        if (toll[id] > p.money - 50) continue;
        if (!best || score > best.score) best = { id, score };
      }
      if (best && best.score > 0) {
        if (dist[best.id] > 3 && CITY[here].hub && !ev(S).noFlights && S.ap >= flightAp(S) && p.money > flightCost(S) + 400) {
          const hub = HUBS.filter(h => h !== here).map(h => ({ h, d: bfs(S, p, h).dist[best.id] ?? 99 })).sort((a, b) => a.d - b.d)[0];
          if (hub && hub.d + 1 < dist[best.id]) return go({ type: 'fly', to: hub.h });
        }
        const step = firstStep(prev, here, best.id);
        const s3 = S.cities[step];
        if (!(s3.owner && s3.owner !== p.id && rentFor(S, step, p) > p.money - 50)) return go({ type: 'move', to: step });
      }
    }
    return go({ type: 'endTurn' });
  }

  const WORLD = {
    start, act, botStep, endGame, rentFor, incomeFor, incomeOf, buyPrice, buildCost, takeoverCost, takeoverBlock,
    flightCost, flightAp, unmortgageCost, netWorth, zoneComplete, completeZones, zoneHasBuildings, moveCost,
    CITY, NEIGH, HUBS, ZONE_CITIES, setRng: (f) => { rng = f; },
  };
  if (isNode) module.exports = WORLD;
  else root.DULI_WORLD = WORLD;
})(typeof window !== 'undefined' ? window : globalThis);
