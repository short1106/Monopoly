// DULIDAN WORLD – Monopoly auf der Weltkarte: würfeln, über Routen laufen, Städte kaufen, Maut kassieren.
// Wer als Letzter nicht pleite ist, gewinnt. Läuft wie die klassische Engine nur beim Host.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const WD = isNode ? require('./world-data.js') : root.DULI_WORLD_DATA;
  const { ZONES, CITIES, ROUTES, LEVELS, RENT_PCT, RULES, FACES, CHAOS, EVENTS } = WD;
  const CITY = Object.fromEntries(CITIES.map(c => [c.id, c]));
  const NEIGH = {};
  for (const c of CITIES) NEIGH[c.id] = [];
  for (const [a, b] of ROUTES) { NEIGH[a].push(b); NEIGH[b].push(a); }
  const HUBS = CITIES.filter(c => c.hub).map(c => c.id);
  const ZONE_CITIES = {};
  for (const c of CITIES) (ZONE_CITIES[c.zone] = ZONE_CITIES[c.zone] || []).push(c.id);
  const BUILD_ART = ['', 'ein Studio', 'ein Büro', 'einen Tower', 'ein Wahrzeichen'];

  let rng = Math.random;
  const d6 = () => 1 + Math.floor(rng() * 6);
  const pick = (a) => a[Math.floor(rng() * a.length)];
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
    if (ev(S).rentMult) r *= ev(S).rentMult;
    if (S.settings && S.settings.variant === 'hardcore') r *= 1.5;
    if (payer && payer.token === 'ship' && c.hub) r /= 2;
    return r5(r);
  }
  function salaryOf(S, p) {
    const base = RULES.salary + (p.token === 'zebra' ? 50 : 0);
    return Math.round(base * (ev(S).salaryMult ?? 1));
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
  function unmortgageCost(id) { return Math.ceil(CITY[id].price * 0.55); }

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

  function buildBlock(S, p, id) {
    const c = CITY[id], st = S.cities[id];
    if (!c || st.owner !== p.id) return 'Die Stadt gehört dir nicht.';
    if (!zoneComplete(S, p.id, c.zone)) return 'Erst die ganze Zone besitzen.';
    if (ZONE_CITIES[c.zone].some(i => S.cities[i].mort)) return 'In der Zone ist noch eine Hypothek.';
    if (st.level >= 4) return 'Hier steht schon ein Wahrzeichen.';
    if (st.level > Math.min(...ZONE_CITIES[c.zone].map(i => S.cities[i].level))) return 'Gleichmäßig bauen! Erst die anderen Städte der Zone.';
    if (p.money < buildCost(S, p, id)) return 'Nicht genug Dulis.';
    return null;
  }

  // Nächste mögliche Städte beim Laufen (nicht direkt zurück, außer Sackgasse)
  function walkOptions(S) {
    const p = curP(S);
    const opts = NEIGH[p.loc].filter(n => n !== S.prevLoc);
    return opts.length ? opts : NEIGH[p.loc].slice();
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
      const home = starts[i % starts.length];
      Object.assign(p, {
        money: st.startMoney || RULES.startMoney, loc: home, bankrupt: false, visited: [home],
        stats: { rentPaid: 0, rentGot: 0, maxRent: 0, built: 0, bought: 0, takeovers: 0, flights: 0, km: 0, doubles: 0 },
      });
    });
    S.maxRounds = st.maxRounds ?? 30;
    const variant = st.variant || 'normal';
    S.goal = variant === 'million' ? 5000 : 0;
    if (variant === 'blitz') S.maxRounds = 20;
    if (variant === 'hardcore') S.players.forEach(p => { p.money = 800; });
    if (variant === 'blitz') {
      const ids = CITIES.map(c => c.id).sort(() => rng() - 0.5);
      ids.forEach((id, i) => { S.cities[id].owner = S.players[i % S.players.length].id; });
    }
    S.phase = 'play'; S.cur = 0; S.round = 1; S.turnNo = 1;
    S.event = { ...EVENTS[0] };
    S.dice = [1, 1]; S.die3 = null; S.face = null; S.rollId = 0;
    S.path = []; S.moveId = 0; S.mover = null;
    S.debt = null; S.trade = null; S.log = []; S.winner = null; S.ranking = null;
    log(S, 'DULIDAN WORLD startet! Würfeln, um die Welt reisen, Städte kaufen – wer zuletzt nicht pleite ist, gewinnt.');
    const intro = { blitz: '⚡ Blitz: Alle Städte sind verteilt. Nach 20 Runden gewinnt der Reichste!', million: '💸 Millionär: Wer zuerst Ð5000 Vermögen hat, gewinnt!', chaos: '💖 April-Chaos: Jeden Zug eine neue Weltnachricht.', hardcore: '💀 Hardcore: Ð800 Startgeld, alle Mauten ×1,5.' }[variant];
    if (intro) log(S, intro);
    beginTurn(S);
    return null;
  }

  function beginTurn(S) {
    const p = curP(S);
    const sal = salaryOf(S, p);
    p.money += sal;
    S.sub = 'roll';
    S.doubles = 0; S.again = false; S.shield = false; S.landed = false;
    log(S, `${p.name} ist dran${sal ? ` und bekommt ${M(sal)} Gehalt` : ''}.`);
  }

  function drawEvent(S) {
    const e = { ...EVENTS[1 + Math.floor(rng() * (EVENTS.length - 1))] };
    if (e.boom) {
      const zs = Object.keys(ZONES);
      e.zone = pick(zs);
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
    } else if (S.settings && S.settings.variant === 'chaos') drawEvent(S);
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

  // ---------- Bezahlen ----------
  function charge(S, p, items) {
    const total = items.reduce((a, b) => a + b.amt, 0);
    if (p.money >= total) {
      for (const it of items) { p.money -= it.amt; if (it.to) P(S, it.to).money += it.amt; }
      return true;
    }
    S.debt = { pid: p.id, items };
    S.sub = 'debt';
    log(S, `${p.name} fehlen ${M(total - p.money)}. Gebäude abreißen, Hypotheken aufnehmen oder handeln!`);
    return false;
  }

  // ---------- Würfeln & Laufen ----------
  function roll(S) {
    const p = curP(S);
    const e = ev(S);
    const a = d6(), b = e.oneDie ? 0 : d6(), c = e.threeDice ? d6() : 0;
    S.dice = [a, b]; S.die3 = c || null;
    let face = FACES[Math.floor(rng() * FACES.length)];
    S.face = face.id;
    S.rollId++;
    const dbl = b && a === b;
    let steps = a + b + c;
    log(S, `🎲 ${p.name} würfelt ${[a, b, c].filter(Boolean).join(' + ')} = ${steps}${dbl ? ' (Pasch)' : ''} · Dulidan-Würfel: ${face.icon === 'D' ? '💜' : face.icon} ${face.name}`);
    if (dbl) { S.doubles++; p.stats.doubles++; }
    S.again = !!dbl && S.doubles < 3;

    S.shield = false;
    S.boss = false;
    switch (face.id) {
      case 'pay':
        p.money += 150;
        log(S, `💰 Zahltag! ${p.name} bekommt ${M(150)}.`);
        break;
      case 'shield':
        S.shield = true;
        break;
      case 'april': {
        const pool = p.token === 'april' ? CHAOS.filter(x => x.good) : CHAOS;
        const x = pick(pool);
        log(S, `💖 April-Chaos: ${x.t}`);
        const others = active(S).filter(o => o.id !== p.id);
        if (x.money > 0) p.money += x.money;
        if (x.collect) for (const o of others) { const v = Math.min(o.money, x.collect); o.money -= v; p.money += v; }
        if (x.stepMult) steps = Math.max(1, Math.round(steps * x.stepMult));
        if (x.money < 0 && !charge(S, p, [{ to: null, amt: -x.money }])) { S.pendingSteps = steps; return; }
        if (x.payEach && !charge(S, p, others.map(o => ({ to: o.id, amt: x.payEach })))) { S.pendingSteps = steps; return; }
        break;
      }
    }
    afterRoll(S, steps);
  }

  function afterRoll(S, steps) {
    const p = curP(S);
    S.steps = steps;
    S.pendingSteps = null;
    if (S.face === 'boss') { S.sub = 'pick'; S.pickRange = [2, 12]; return; }
    if (p.token === 'berlingo') { S.sub = 'pick'; S.pickRange = [Math.max(1, steps - 1), steps + 1]; return; }
    startWalk(S);
  }

  function startWalk(S) {
    if (S.face === 'jet') { S.sub = 'jet'; return; }
    S.prevLoc = null;
    S.path = [curP(S).loc];
    S.mover = curP(S).id;
    if (S.face === 'nav') { S.sub = 'walk'; return; }
    while (S.steps > 0) stepTo(S, pick(walkOptions(S)));
    finishWalk(S);
  }

  function stepTo(S, to) {
    const p = curP(S);
    S.prevLoc = p.loc;
    p.loc = to;
    p.stats.km++;
    S.path.push(to);
    S.steps--;
  }

  function finishWalk(S) {
    S.moveId++;
    land(S);
  }

  function land(S) {
    const p = curP(S), id = p.loc, c = CITY[id], st = S.cities[id];
    S.landed = true;
    log(S, `${p.name} landet in ${c.name}.`);
    if (c.quip && rng() < 0.5) log(S, `April: „${c.quip}“`);
    if (p.token === 'doener' && !p.visited.includes(id)) {
      p.visited.push(id);
      p.money += 30;
      log(S, `Street-Food-Tour! ${p.name} bekommt ${M(30)}. 🥙`);
    }
    if (!st.owner) { S.sub = 'buy'; return; }
    if (st.owner !== p.id && !st.mort) {
      const owner = P(S, st.owner);
      if (S.shield) { log(S, `🛡️ Schutzschild! ${p.name} zahlt keine Maut an ${owner.name}.`); return finishTurnStep(S); }
      const toll = rentFor(S, id, p);
      log(S, `${p.name} zahlt ${M(toll)} Maut an ${owner.name}.`);
      p.stats.rentPaid += toll; p.stats.maxRent = Math.max(p.stats.maxRent, toll);
      owner.stats.rentGot += toll;
      if (!charge(S, p, [{ to: owner.id, amt: toll }])) return;
    }
    finishTurnStep(S);
  }

  function finishTurnStep(S) {
    S.sub = 'end';
  }

  function checkGoal(S) {
    if (S.phase !== 'play' || !S.goal) return;
    const hit = active(S).find(p => netWorth(S, p) >= S.goal);
    if (hit) {
      S.ranking = rank(S); S.phase = 'over'; S.winner = hit.id;
      log(S, `💸 ${hit.name} knackt die ${M(S.goal)} und gewinnt!`);
    }
  }

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    const err = actInner(S, pid, a);
    if (!err) checkGoal(S);
    return err;
  }

  function actInner(S, pid, a) {
    if (S.phase !== 'play') return 'Das Spiel ist vorbei.';
    const p = P(S, pid);
    if (!p || p.bankrupt) return 'Du spielst nicht mit.';
    if (!a || !a.type) return 'Ungültige Aktion.';

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
        const total = S.debt.items.reduce((x, y) => x + y.amt, 0);
        if (p.money < total) return `Dir fehlen noch ${M(total - p.money)}.`;
        for (const it of S.debt.items) { p.money -= it.amt; if (it.to) P(S, it.to).money += it.amt; }
        S.debt = null;
        log(S, `${p.name} hat die Schulden bezahlt.`);
        if (S.pendingSteps != null) afterRoll(S, S.pendingSteps);
        else S.sub = S.landed ? 'end' : 'roll';
        return null;
      }
      case 'bankrupt':
        if (S.sub !== 'debt' || S.debt.pid !== pid) return 'Bankrott geht nur, wenn du nicht zahlen kannst.';
        return bankrupt(S, p);
    }

    if (curP(S).id !== pid) return 'Du bist nicht dran.';
    const manage = ['roll', 'end', 'buy', 'debt'].includes(S.sub);
    const here = p.loc, st = S.cities[here], city = CITY[here];

    switch (a.type) {
      case 'roll':
        if (S.sub !== 'roll') return 'Gerade kannst du nicht würfeln.';
        if (S.trade) return 'Erst das offene Angebot klären.';
        roll(S);
        return null;
      case 'pickSteps': {
        if (S.sub !== 'pick') return 'Geht gerade nicht.';
        const n = Math.round(Number(a.n));
        if (!(n >= S.pickRange[0] && n <= S.pickRange[1])) return 'Ungültige Schrittzahl.';
        S.steps = n;
        if (S.face === 'boss') log(S, `💜 Dulidan-Power! ${p.name} läuft genau ${n} Schritte.`);
        else if (n !== S.pickRange[0] + 1) log(S, `🚐 Berlingo-Manöver: ${p.name} läuft ${n} Schritte.`);
        startWalk(S);
        return null;
      }
      case 'fly': {
        if (S.sub !== 'jet') return 'Geht gerade nicht.';
        const to = String(a.to);
        if (!CITY[to] || !CITY[to].hub || to === here) return 'Wähle einen anderen Flughafen.';
        p.loc = to;
        p.stats.flights++;
        S.path = [here, to]; S.mover = p.id; S.moveId++; S.flight = true;
        log(S, `✈️ Jetset! ${p.name} fliegt nach ${CITY[to].name}.`);
        land(S);
        return null;
      }
      case 'walkInstead': {
        if (S.sub !== 'jet') return 'Geht gerade nicht.';
        S.face = null;
        startWalk(S);
        return null;
      }
      case 'step': {
        if (S.sub !== 'walk') return 'Geht gerade nicht.';
        const to = String(a.to);
        if (!walkOptions(S).includes(to)) return 'Da geht es nicht lang.';
        stepTo(S, to);
        S.flight = false;
        if (S.steps <= 0) finishWalk(S);
        else S.moveId++;
        return null;
      }
      case 'buy': {
        if (S.sub !== 'buy') return 'Geht gerade nicht.';
        const price = buyPrice(p, here);
        if (p.money < price) return 'Nicht genug Dulis.';
        p.money -= price;
        st.owner = p.id;
        p.stats.bought++;
        log(S, `${p.name} kauft ${city.name} für ${M(price)}.`);
        if (zoneComplete(S, p.id, city.zone)) log(S, `🔥 ${p.name} hat die ganze Zone ${ZONES[city.zone].name}! Jetzt darf gebaut werden.`);
        finishTurnStep(S);
        return null;
      }
      case 'skip':
        if (S.sub !== 'buy') return 'Geht gerade nicht.';
        log(S, `${p.name} lässt ${city.name} links liegen.`);
        finishTurnStep(S);
        return null;
      case 'takeover': {
        if (S.sub !== 'end' || !S.landed) return 'Übernehmen geht nach der Landung in einer fremden Stadt.';
        if (S.tookOver) return 'Nur eine Übernahme pro Zug.';
        const blk = takeoverBlock(S, p, here);
        if (blk) return blk;
        const cost = takeoverCost(S, here);
        if (p.money < cost) return 'Nicht genug Dulis für die Übernahme.';
        const old = P(S, st.owner);
        p.money -= cost; old.money += cost;
        st.owner = p.id;
        S.tookOver = true;
        p.stats.takeovers++;
        log(S, `🦹 Feindliche Übernahme! ${p.name} schnappt ${old.name} ${city.name} für ${M(cost)} weg.`);
        if (zoneComplete(S, p.id, city.zone)) log(S, `🔥 ${p.name} hat die ganze Zone ${ZONES[city.zone].name}!`);
        return null;
      }
      case 'build': {
        if (!['roll', 'end'].includes(S.sub)) return 'Bauen geht vor dem Würfeln oder am Ende deines Zuges.';
        const id = String(a.id);
        const blk = buildBlock(S, p, id);
        if (blk) return blk;
        const cost = buildCost(S, p, id);
        p.money -= cost;
        S.cities[id].level++;
        p.stats.built++;
        log(S, `🏗️ ${p.name} baut ${BUILD_ART[S.cities[id].level]} in ${CITY[id].name}.`);
        return null;
      }
      case 'sell': {
        if (!manage) return 'Geht gerade nicht.';
        const id = String(a.id), c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id || !s2.level) return 'Hier gibt es nichts zu verkaufen.';
        if (s2.level < Math.max(...ZONE_CITIES[c.zone].map(i => S.cities[i].level))) return 'Gleichmäßig abreißen!';
        s2.level--;
        const back = Math.floor(ZONES[c.zone].build / 2);
        p.money += back;
        log(S, `${p.name} reißt in ${c.name} ein Stockwerk ab (+${M(back)}).`);
        return null;
      }
      case 'mortgage': {
        if (!manage) return 'Geht gerade nicht.';
        const id = String(a.id), c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id || s2.mort) return 'Geht nicht.';
        if (zoneHasBuildings(S, c.zone)) return 'Erst alle Gebäude der Zone abreißen.';
        s2.mort = true;
        p.money += c.price / 2;
        log(S, `${p.name} nimmt eine Hypothek auf ${c.name} auf (+${M(c.price / 2)}).`);
        return null;
      }
      case 'unmortgage': {
        if (!manage) return 'Geht gerade nicht.';
        const id = String(a.id), c = CITY[id], s2 = S.cities[id];
        if (!c || s2.owner !== p.id || !s2.mort) return 'Keine Hypothek vorhanden.';
        const cost = unmortgageCost(id);
        if (p.money < cost) return 'Nicht genug Dulis.';
        p.money -= cost;
        s2.mort = false;
        log(S, `${p.name} löst die Hypothek auf ${c.name} ab.`);
        return null;
      }
      case 'tradePropose':
        if (!['roll', 'end', 'debt'].includes(S.sub)) return 'Handeln geht vor dem Würfeln oder am Ende deines Zuges.';
        if (S.trade) return 'Es gibt schon ein offenes Angebot.';
        return proposeTrade(S, pid, a.trade || {});
      case 'endTurn':
        if (S.sub !== 'end') return 'Du kannst deinen Zug noch nicht beenden.';
        if (S.trade) return 'Erst das offene Angebot klären.';
        S.tookOver = false;
        if (S.again) {
          S.sub = 'roll'; S.again = false; S.landed = false; S.shield = false;
          log(S, `Pasch! ${p.name} darf nochmal würfeln.`);
          return null;
        }
        nextTurn(S);
        return null;
    }
    return 'Unbekannte Aktion.';
  }

  function bankrupt(S, p) {
    const creditors = [...new Set(S.debt.items.map(i => i.to).filter(Boolean))];
    const heir = creditors.length === 1 ? P(S, creditors[0]) : null;
    for (const id in S.cities) {
      const st = S.cities[id];
      if (st.owner !== p.id) continue;
      if (heir) { p.money += Math.floor(st.level * ZONES[CITY[id].zone].build / 2); st.level = 0; st.owner = heir.id; }
      else { st.owner = null; st.level = 0; st.mort = false; }
    }
    if (heir) heir.money += p.money;
    log(S, `💀 ${p.name} ist pleite! ${heir ? `Alles geht an ${heir.name}.` : 'Alles geht zurück an die Bank.'}`);
    log(S, 'April: „F. Pleite. Ich hab nichts gesehen.“');
    p.money = 0; p.bankrupt = true;
    S.debt = null; S.pendingSteps = null;
    if (S.trade && (S.trade.from === p.id || S.trade.to === p.id)) S.trade = null;
    const left = active(S);
    if (left.length === 1) {
      S.ranking = rank(S); S.phase = 'over'; S.winner = left[0].id;
      log(S, `🏆 ${left[0].name} ist als Letzter übrig und gewinnt DULIDAN WORLD!`);
      return null;
    }
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
    return null;
  }

  // ---------- Bots ----------
  function cityValue(S, p, id) {
    const st = S.cities[id], c = CITY[id];
    if (!st.owner) return c.price * (1 + 0.7 * ZONE_CITIES[c.zone].filter(i => S.cities[i].owner === p.id).length);
    if (st.owner === p.id) return 50;
    return -rentFor(S, id, p) * 2;
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
    const reserve = 250;

    switch (S.sub) {
      case 'debt': {
        const need = S.debt.items.reduce((x, y) => x + y.amt, 0);
        if (p.money >= need) return go({ type: 'payDebt' });
        for (const id of owned) {
          const st = S.cities[id];
          if (st.level && st.level === Math.max(...ZONE_CITIES[CITY[id].zone].map(i => S.cities[i].level))) return go({ type: 'sell', id });
        }
        const m = owned.filter(id => !S.cities[id].mort && !zoneHasBuildings(S, CITY[id].zone)).sort((a, b) => CITY[a].price - CITY[b].price)[0];
        return go(m ? { type: 'mortgage', id: m } : { type: 'bankrupt' });
      }
      case 'roll':
      case 'end': {
        for (const id of owned) if (S.cities[id].mort && p.money - unmortgageCost(id) > 700) return go({ type: 'unmortgage', id });
        const b = owned.filter(id => !buildBlock(S, p, id) && p.money - buildCost(S, p, id) >= reserve)
          .sort((x, y) => S.cities[x].level - S.cities[y].level || CITY[y].price - CITY[x].price)[0];
        if (b) return go({ type: 'build', id: b });
        if (S.sub === 'end' && S.landed && !S.tookOver && !takeoverBlock(S, p, p.loc)) {
          const z = CITY[p.loc].zone;
          const mine = ZONE_CITIES[z].filter(i => S.cities[i].owner === p.id).length;
          if (mine >= 1 && p.money - takeoverCost(S, p.loc) >= reserve + 100) return go({ type: 'takeover' });
        }
        return go({ type: S.sub === 'roll' ? 'roll' : 'endTurn' });
      }
      case 'pick': {
        const [lo, hi] = S.pickRange;
        return go({ type: 'pickSteps', n: S.face === 'boss' ? 7 : Math.min(hi, Math.max(lo, S.steps)) });
      }
      case 'jet': {
        const best = HUBS.filter(h => h !== p.loc).map(h => ({ h, v: cityValue(S, p, h) })).sort((a, b) => b.v - a.v)[0];
        return go(best && best.v > 0 ? { type: 'fly', to: best.h } : { type: 'walkInstead' });
      }
      case 'walk': {
        const opts = walkOptions(S);
        const choice = S.steps === 1 ? opts.slice().sort((a, b) => cityValue(S, p, b) - cityValue(S, p, a))[0] : pick(opts);
        return go({ type: 'step', to: choice });
      }
      case 'buy': {
        const c = CITY[p.loc], price = buyPrice(p, p.loc);
        const mine = ZONE_CITIES[c.zone].filter(i => S.cities[i].owner === p.id).length;
        return go({ type: p.money - price >= 150 || (mine >= 1 && p.money >= price) ? 'buy' : 'skip' });
      }
    }
    return null;
  }

  const WORLD = {
    start, act, botStep, endGame, rentFor, salaryOf, buyPrice, buildCost, buildBlock, takeoverCost, takeoverBlock,
    unmortgageCost, netWorth, zoneComplete, completeZones, zoneHasBuildings, walkOptions,
    CITY, NEIGH, HUBS, ZONE_CITIES, FACES, setRng: (f) => { rng = f; },
  };
  if (isNode) module.exports = WORLD;
  else root.DULI_WORLD = WORLD;
})(typeof window !== 'undefined' ? window : globalThis);
