// Dulidanopoly – Brett-Engine für DULIDAN WORLD, ROYALE, METRO und TOWER.
// Würfeln, über ein Netz oder Ringe laufen, Felder kaufen, Miete kassieren.
// Wer als Letzter nicht pleite ist, gewinnt. Läuft wie die klassische Engine nur beim Host.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  if (isNode) { require('./world-data.js'); require('./boards-data.js'); }
  const BOARDS = root.DULI_BOARDS;
  const MOOD = isNode ? require('./mood.js') : root.DULI_MOOD;
  const RL = isNode ? require('./rules.js') : root.DULI_RULES;
  const MODES = ['world', 'royale', 'metro', 'tower', 'islands', 'festival', 'race', 'throne', 'quiz', 'bomb'];

  // ---------- Bretter vorbereiten ----------
  const compiled = {};
  function board(mode) {
    if (compiled[mode]) return compiled[mode];
    const d = BOARDS[mode];
    if (!d) return null;
    const CITY = Object.fromEntries(d.CITIES.map(c => [c.id, Object.assign({ type: 'prop' }, c)]));
    const NEIGH = {};
    for (const id in CITY) NEIGH[id] = [];
    for (const [a, b] of d.ROUTES) {
      if (!NEIGH[a].includes(b)) NEIGH[a].push(b);
      if (!NEIGH[b].includes(a)) NEIGH[b].push(a);
    }
    const PROPS = Object.keys(CITY).filter(id => CITY[id].type === 'prop');
    const ZONE_CITIES = {};
    for (const id of PROPS) (ZONE_CITIES[CITY[id].zone] = ZONE_CITIES[CITY[id].zone] || []).push(id);
    const HUBS = Object.keys(CITY).filter(id => CITY[id].hub);
    const PREV = {};
    for (const id in CITY) if (CITY[id].next) PREV[CITY[id].next] = id;
    const START = (d.CITIES.find(c => c.start) || {}).id || null;
    compiled[mode] = Object.assign({}, d, {
      CITY, NEIGH, PROPS, ZONE_CITIES, HUBS, PREV, START, SHOP: d.SHOP || [], QUESTIONS: d.QUESTIONS || [],
      LEVEL_ART: d.LEVEL_ART || ['', 'ein Studio', 'ein Büro', 'einen Tower', 'ein Wahrzeichen'],
      FUNK: d.FUNK || [], LOOT: d.LOOT || [], CARDS: d.CARDS || { april: [], studio: [] }, FACES: d.FACES || [], EVENTS: d.EVENTS || [], CHAOS: d.CHAOS || [],
      words: d.words || { zone: 'Zone', city: 'Stadt', cities: 'Städte' },
    });
    return compiled[mode];
  }
  const G = (S) => board(S.mode);

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
  const isProp = (S, id) => G(S).CITY[id].type === 'prop';
  const alive = (S, id) => !(S.dead && S.dead[id]);
  function zoneComplete(S, pid, z) { return G(S).ZONE_CITIES[z].every(id => S.cities[id].owner === pid); }
  function completeZones(S, pid) { return Object.keys(G(S).ZONES).filter(z => zoneComplete(S, pid, z)); }
  function zoneHasBuildings(S, z) { return G(S).ZONE_CITIES[z].some(id => S.cities[id].level > 0); }

  function rentFor(S, id, payer) {
    const g = G(S), c = g.CITY[id], st = S.cities[id];
    if (!st || !st.owner || st.mort) return 0;
    if (S.flood && S.flood === c.zone) return 0;
    let r = c.price * g.RENT_PCT[st.level];
    if (st.level === 0 && zoneComplete(S, st.owner, c.zone)) r *= RL.monoMult(S);
    if (S.headliner && S.headliner === c.zone) r *= 3;
    if (S.king && st.owner === S.king) r *= 1.5;
    r *= RL.rentFactor(S);
    if (ev(S).boom && ev(S).zone === c.zone) r *= 2;
    if (ev(S).rentMult != null) r *= ev(S).rentMult;
    if (S.inflation) r *= 1 + S.inflation;
    if (S.settings && S.settings.variant === 'hardcore') r *= 1.5;
    if (payer && payer.token === 'ship' && c.hub) r /= 2;
    return r5(r);
  }
  // METRO: Fahrpreis, wenn man durch eine Station einer kompletten fremden Linie fährt
  function fareFor(S, id, payer) {
    const g = G(S);
    if (!g.RULES.fare || !isProp(S, id)) return 0;
    const c = g.CITY[id], st = S.cities[id];
    if (!st.owner || st.owner === payer.id || st.mort || !zoneComplete(S, st.owner, c.zone)) return 0;
    return r5(c.price * 0.1 + st.level * 20);
  }
  function salaryOf(S, p) {
    const base = G(S).RULES.salary + (p.token === 'zebra' ? 50 : 0) + (p.token === 'crown' ? 20 : 0);
    return Math.round(base * (ev(S).salaryMult ?? 1));
  }
  function buyPrice(p, id, S) {
    const price = (S ? G(S) : board('world')).CITY[id].price;
    return p.token === 'dulidan' ? r5(price * 0.9) : price;
  }
  function buildCost(S, p, id) {
    const g = G(S);
    const base = g.ZONES[g.CITY[id].zone].build - (p.token === 'pen' ? 25 : 0);
    return Math.max(5, r5(base * (ev(S).buildMult || 1) * RL.buildFactor(S)));
  }
  function takeoverCost(S, id) {
    const g = G(S), c = g.CITY[id], st = S.cities[id], owner = P(S, st.owner);
    const mult = owner && owner.token === 'helmet' ? 2 : (ev(S).takeoverMult || g.RULES.takeoverMult);
    return r5((c.price + st.level * g.ZONES[c.zone].build) * mult);
  }
  function unmortgageCost(id, S) { return Math.ceil((S ? G(S) : board('world')).CITY[id].price * (RL.on(S, 'mortgageFree') ? 0.5 : 0.55)); }

  function netWorth(S, p) {
    const g = G(S);
    let w = p.money;
    for (const id in S.cities) {
      const st = S.cities[id];
      if (st.owner !== p.id) continue;
      w += st.mort ? g.CITY[id].price / 2 : g.CITY[id].price;
      w += st.level * g.ZONES[g.CITY[id].zone].build;
    }
    return w;
  }

  function takeoverBlock(S, p, id) {
    const st = S.cities[id];
    if (!st || !st.owner || st.owner === p.id) return 'Das gehört keinem Gegner.';
    if (ev(S).noTakeover) return 'Grenzen dicht: diese Runde keine Übernahmen.';
    if (zoneComplete(S, st.owner, G(S).CITY[id].zone)) return 'Komplette Gruppen sind vor Übernahmen geschützt.';
    if (st.level >= 4) return 'Ganz ausgebaute Felder kann man nicht übernehmen.';
    return null;
  }

  function buildBlock(S, p, id) {
    const g = G(S), c = g.CITY[id], st = S.cities[id];
    if (!c || !st || st.owner !== p.id) return 'Das gehört dir nicht.';
    if (!zoneComplete(S, p.id, c.zone)) return `Erst die ganze ${g.words.zone} besitzen.`;
    if (g.ZONE_CITIES[c.zone].some(i => S.cities[i].mort)) return 'Da ist noch eine Hypothek drauf.';
    if (st.level >= 4) return 'Hier ist schon alles ausgebaut.';
    if (st.level > Math.min(...g.ZONE_CITIES[c.zone].map(i => S.cities[i].level)) && !RL.on(S, 'freeBuild')) return 'Gleichmäßig bauen! Erst die anderen Felder der Gruppe.';
    if (p.money < buildCost(S, p, id)) return 'Nicht genug Dulis.';
    return null;
  }

  // Nächste mögliche Felder beim Laufen
  function walkOptions(S) {
    const g = G(S), p = curP(S);
    if (g.walk === 'ring') return [g.CITY[p.loc].next];
    const all = g.NEIGH[p.loc].filter(n => alive(S, n));
    const opts = all.filter(n => n !== S.prevLoc);
    return opts.length ? opts : all;
  }

  // ---------- Start ----------
  function start(S) {
    if (S.players.length < 2) return 'Ihr braucht mindestens 2 Spieler.';
    if (S.players.some(p => !p.token)) return 'Jeder muss zuerst eine Figur wählen.';
    const st = S.settings || {};
    S.mode = MODES.includes(st.mode) ? st.mode : 'world';
    const g = G(S);
    S.cities = {};
    for (const id of g.PROPS) S.cities[id] = { owner: null, level: 0, mort: false };
    S.dead = {};
    S.inflation = 0;
    const deck = (k) => (g.CARDS[k] || []).map((_, i) => i).sort(() => rng() - 0.5);
    S.decks = { april: deck('april'), studio: deck('studio') };
    S.card = null;
    S.players.forEach((p, i) => {
      const home = g.starts[i % g.starts.length];
      Object.assign(p, {
        money: g.RULES.fixedMoney || st.startMoney || g.RULES.startMoney, loc: home, bankrupt: false, visited: [home],
        items: { shield: 0, boost: 0 },
        stats: { rentPaid: 0, rentGot: 0, maxRent: 0, built: 0, bought: 0, takeovers: 0, flights: 0, km: 0, doubles: 0, loot: 0 },
      });
    });
    // Auf allen Brettern gilt: Gespielt wird, bis nur noch eine Person nicht pleite ist
    S.maxRounds = 0;
    const variant = st.variant || 'normal';
    S.goal = variant === 'million' ? 5000 : 0;
    S.crisis = g.RULES.crisis ? { ...g.RULES.crisis, from: variant === 'blitz' ? 3 : g.RULES.crisis.from } : null;
    if (variant === 'hardcore') S.players.forEach(p => { p.money = 800; });
    if (variant === 'rich') S.players.forEach(p => { p.money = 5000; });
    if (variant === 'tycoon') S.players.forEach(p => { p.money = Math.max(500, p.money - 500); });
    S.players.forEach(p => {
      if (p.token === 'rocket') p.money += 150;
      p.used = { ghost: false, cat: false, joker: false };
      p.items.joker = 0;
      if (g.RULES.race) p.race = { laps: 0, engine: 0, tires: false, nitro: 0 };
    });
    S.king = null; S.quiz = null; S.quizResult = null; S.raceWin = null;
    S.bomb = g.RULES.bomb ? { holder: pick(S.players).id, fuse: 3 + Math.floor(rng() * 3) } : null;
    const giveProps = (n) => {
      const free = g.PROPS.filter(id => !S.cities[id].owner).sort(() => rng() - 0.5);
      for (let r = 0; r < n; r++) for (const p of S.players) { const id = free.pop(); if (id) S.cities[id].owner = p.id; }
    };
    if (variant === 'tycoon') giveProps(3);
    if (RL.on(S, 'startProps')) giveProps(2);
    S.flood = null; S.headliner = null;
    if (variant === 'blitz') {
      const ids = g.PROPS.slice().sort(() => rng() - 0.5);
      ids.forEach((id, i) => { S.cities[id].owner = S.players[i % S.players.length].id; });
    }
    S.phase = 'play'; S.cur = 0; S.round = 1; S.turnNo = 1;
    S.event = g.EVENTS.length ? { ...g.EVENTS[0] } : null;
    if (g.STORM) S.event = { t: `🌪️ Der April-Sturm kommt! In Runde ${g.STORM[0].at} zerstört er den äußeren Ring.`, storm: true };
    S.dice = [1, 1]; S.die3 = null; S.face = null; S.rollId = 0;
    S.path = []; S.moveId = 0; S.mover = null;
    S.debt = null; S.trade = null; S.log = []; S.winner = null; S.ranking = null;
    MOOD.init(S);
    log(S, `${g.title} startet! ${g.tagline}`);
    S.hist = [];
    recordHist(S);
    const intro = { blitz: '⚡ Blitz: Alles ist verteilt. Die Krise kommt schon in Runde 3!', million: '💸 Millionär: Wer zuerst Ð5000 Vermögen hat, gewinnt!', chaos: '💖 April-Chaos: Jeden Zug eine neue Nachricht.', hardcore: '💀 Hardcore: Ð800 Startgeld, alle Mieten ×1,5.' }[variant];
    if (intro) log(S, intro);
    else if (variant !== 'normal') { const v = RL.VARIANTS.find(x => x.id === variant); if (v) log(S, `${v.icon} ${v.name}: ${v.text}`); }
    beginTurn(S);
    return null;
  }

  function beginTurn(S) {
    const p = curP(S);
    let sal = salaryOf(S, p);
    if (sal) sal += MOOD.salaryBonus(S);
    p.money += sal;
    S.sub = 'roll';
    S.doubles = 0; S.again = false; S.shield = false; S.landed = false; S.tookOver = false;
    log(S, `${p.name} ist dran${sal ? ` und bekommt ${M(sal)} Gehalt` : ''}.`);
    if (sal && RL.on(S, 'interest')) {
      const z = Math.min(50, Math.floor(p.money * 0.03));
      if (z > 0) { p.money += z; log(S, `🏦 Zinsen: ${p.name} bekommt ${M(z)}.`); }
    }
    MOOD.turnStart(S, p, moodApi(S));
    turnCharges(S, p);
  }

  // Zahlungen zu Zugbeginn: Sudden Death, Tribut an den König, Bombe. Bei Schulden ist erst mal Schluss.
  function turnCharges(S, p) {
    const g = G(S), due = [];
    if (p.bankrupt) return;
    const tax = RL.suddenTax(S);
    if (tax) due.push({ amt: tax, to: null, msg: `⏳ Sudden Death: ${p.name} zahlt ${M(tax)} Überlebens-Steuer.` });
    const king = S.king && P(S, S.king);
    if (g.RULES.throne && king && !king.bankrupt && king.id !== p.id) {
      const amt = g.RULES.throne.tribute + 10 * Math.floor((S.round - 1) / 3);
      due.push({ amt, to: king.id, msg: `👑 ${p.name} zahlt ${M(amt)} Tribut an König ${king.name}.` });
    }
    if (S.bomb && S.bomb.holder === p.id) {
      S.bomb.fuse--;
      if (S.bomb.fuse <= 0) {
        const dmg = g.RULES.bomb.base + g.RULES.bomb.step * S.round;
        due.push({ amt: dmg, to: null, msg: `💥 BOOM! Die Bombe explodiert bei ${p.name}: ${M(dmg)} Schaden!` });
        p.stats.boom = (p.stats.boom || 0) + 1;
        const others = active(S).filter(o => o.id !== p.id);
        if (others.length) {
          S.bomb = { holder: pick(others).id, fuse: 3 + Math.floor(rng() * 3) };
          due.push({ amt: 0, msg: `💣 Eine neue Bombe taucht bei ${P(S, S.bomb.holder).name} auf. Zündschnur: ${S.bomb.fuse} Züge.` });
        }
      } else log(S, `💣 Die Zündschnur bei ${p.name} brennt: noch ${S.bomb.fuse} ${S.bomb.fuse === 1 ? 'Zug' : 'Züge'}!`);
    }
    for (const d of due) {
      log(S, d.msg);
      if (d.amt > 0 && !charge(S, p, [{ to: d.to, amt: d.amt }])) return;
    }
  }

  // Auf Rundkursen Felder vor- oder zurückschieben (Boost, Öl, Rempler). Im Rennen zählen dabei die Runden mit.
  function shove(S, p, n) {
    const g = G(S);
    const dir = n > 0 ? 1 : -1;
    if (!S.path || !S.path.length || S.mover !== p.id) S.path = [p.loc];
    for (let k = 0; k < Math.abs(n); k++) {
      const from = p.loc, to = dir > 0 ? g.CITY[from].next : g.PREV[from];
      if (!to) break;
      if (p.race && dir > 0 && to === g.START) lap(S, p);
      if (p.race && dir < 0 && from === g.START) p.race.laps = Math.max(0, p.race.laps - 1);
      p.loc = to;
      if (p.id === curP(S).id) S.path.push(to);
    }
    if (p.id === curP(S).id) { S.mover = p.id; S.moveId++; }
  }
  function lap(S, p) {
    const L = G(S).RULES.race.laps;
    p.race.laps++;
    if (p.race.laps >= L) { if (!S.raceWin) S.raceWin = p.id; log(S, `🏁 ${p.name} fährt über die Ziellinie!`); }
    else log(S, `🏁 ${p.name} startet in Runde ${p.race.laps + 1} von ${L}.`);
  }
  function raceOver(S) {
    const w = P(S, S.raceWin);
    S.ranking = [w, ...S.players.filter(p => p !== w).sort((a, b) => (b.race ? b.race.laps : 0) - (a.race ? a.race.laps : 0) || b.money - a.money)]
      .map(p => ({ id: p.id, worth: p.money }));
    S.phase = 'over'; S.winner = w.id;
    log(S, `🏆 ${w.name} gewinnt das ${G(S).title}!`);
  }

  // Einmal pro Runde: Hausregeln, Varianten und Brett-Twists
  function roundRules(S) {
    const g = G(S), act = active(S);
    if (act.length < 2) return;
    if (RL.on(S, 'robin')) {
      const byMoney = act.slice().sort((a, b) => b.money - a.money);
      const rich = byMoney[0], poor = byMoney[byMoney.length - 1];
      const x = Math.min(50, rich.money);
      rich.money -= x; poor.money += x;
      log(S, `🏹 Robin Hood: ${rich.name} gibt ${poor.name} ${M(x)}.`);
    }
    if (RL.variant(S) === 'swap' && S.round % 5 === 0) {
      const ms = act.map(p => p.money).sort(() => rng() - 0.5);
      act.forEach((p, i) => { p.money = ms[i]; });
      log(S, '🔄 Konto-Roulette! Alle Kontostände wurden getauscht.');
    }
    const zones = Object.keys(g.ZONES);
    if (g.RULES.flood) {
      S.flood = S.round >= 3 && rng() < 0.6 ? pick(zones) : null;
      if (S.flood) log(S, `🌊 Flut! ${g.ZONES[S.flood].name} steht unter Wasser. Dort zahlt diese Runde niemand Miete.`);
    }
    if (g.RULES.headliner) {
      S.headliner = pick(zones);
      log(S, `🎤 Headliner dieser Runde: ${g.ZONES[S.headliner].name}! Dort kostet alles 3×.`);
    }
  }

  // Was April bei Hass kaputt machen darf
  function moodApi(S) {
    const g = G(S);
    const mine = (p) => Object.keys(S.cities).filter(id => S.cities[id].owner === p.id);
    return {
      tearDown(p) {
        const id = mine(p).filter(i => S.cities[i].level > 0).sort((a, b) => S.cities[b].level - S.cities[a].level)[0];
        if (!id) return null;
        S.cities[id].level--;
        return g.CITY[id].name;
      },
      mortgage(p) {
        const id = mine(p).filter(i => !S.cities[i].mort && !zoneHasBuildings(S, g.CITY[i].zone)).sort((a, b) => g.CITY[b].price - g.CITY[a].price)[0];
        if (!id) return null;
        S.cities[id].mort = true;
        return g.CITY[id].name;
      },
    };
  }

  function drawEvent(S) {
    const g = G(S);
    if (g.EVENTS.length < 2) return;
    const e = { ...g.EVENTS[1 + Math.floor(rng() * (g.EVENTS.length - 1))] };
    if (e.boom) {
      const zs = Object.keys(g.ZONES);
      e.zone = pick(zs);
      e.t = e.t.replace('ZONE', g.ZONES[e.zone].name);
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
    const byMoney = act.slice().sort((a, b) => b.money - a.money);
    if (e.poorGift && byMoney.length) byMoney[byMoney.length - 1].money += e.poorGift;
    if (e.richTax && byMoney.length) byMoney[0].money -= Math.min(byMoney[0].money, e.richTax);
  }

  // ---------- ROYALE: der April-Sturm ----------
  function stormTick(S) {
    const g = G(S);
    if (!g.STORM) return;
    for (const s of g.STORM) {
      if (S.round === s.warn) {
        S.event = { t: `⚠️ Sturmwarnung! In Runde ${s.at} zerstört der April-Sturm Ring ${s.ring}. Rette dich nach innen!`, storm: true, warn: s.ring };
        log(S, `🌪️ April-Sturm-Warnung: Ring ${s.ring} kollabiert in Runde ${s.at}!`);
      }
      if (S.round === s.at) collapse(S, s.ring);
    }
    const last = g.STORM[g.STORM.length - 1];
    if (S.round > last.at) {
      S.inflation = +(g.INFLATION * (S.round - last.at)).toFixed(2);
      S.event = { t: `🔥 Sturm-Inflation: Alle Mieten +${Math.round(S.inflation * 100)} %. Es wird eng.`, storm: true };
      log(S, `🔥 Sturm-Inflation! Alle Mieten sind jetzt ${Math.round(S.inflation * 100)} % teurer.`);
    }
  }

  // WORLD: Weltwirtschaftskrise – Mauten steigen jede Runde, damit am Ende jemand pleite geht
  function crisisTick(S) {
    const c = S.crisis;
    if (!c || S.round < c.from) return;
    const w = G(S).id === 'world' ? 'Mauten' : 'Mieten';
    S.inflation = +(c.step * (S.round - c.from + 1)).toFixed(2);
    if (S.round === c.from) log(S, `📈 WELTWIRTSCHAFTSKRISE! Ab jetzt steigen alle Mauten jede Runde um ${Math.round(c.step * 100)} %.`.replace('Mauten', w));
    else log(S, `📈 Krise: Alle ${w} sind jetzt ${Math.round(S.inflation * 100)} % teurer.`);
  }

  function collapse(S, ring) {
    const g = G(S);
    const dying = Object.keys(g.CITY).filter(id => g.CITY[id].ring === ring);
    for (const id of dying) {
      S.dead[id] = true;
      const st = S.cities[id];
      if (st && st.owner) {
        const owner = P(S, st.owner);
        const back = Math.floor((g.CITY[id].price + st.level * g.ZONES[g.CITY[id].zone].build) / 2);
        if (owner && !owner.bankrupt) { owner.money += back; log(S, `💥 ${g.CITY[id].name} wird zerstört. ${owner.name} bekommt ${M(back)} Versicherung.`); }
        st.owner = null; st.level = 0; st.mort = false;
      }
    }
    // Wer auf dem Ring steht, wird nach innen geschleudert
    const inner = Object.keys(g.CITY).filter(id => g.CITY[id].ring === ring - 1 && alive(S, id));
    const ang = (id) => Math.atan2(g.CITY[id].y - g.VIEW.cy, g.CITY[id].x - g.VIEW.cx);
    for (const p of active(S)) {
      if (g.CITY[p.loc].ring !== ring) continue;
      const a = ang(p.loc);
      const to = inner.slice().sort((x, y) => Math.abs(Math.sin((ang(x) - a) / 2)) - Math.abs(Math.sin((ang(y) - a) / 2)))[0];
      if (to) { p.loc = to; log(S, `🌪️ ${p.name} wird vom Sturm nach ${g.CITY[to].name} geschleudert.`); }
    }
    S.event = { t: `🌪️ Der April-Sturm hat Ring ${ring} zerstört! Alles dort ist weg.`, storm: true };
    log(S, `🌪️ RING ${ring} KOLLABIERT! Der April-Sturm frisst alles.`);
    S.moveId++; S.path = []; S.mover = null;
  }

  function nextTurn(S) {
    const n = S.players.length;
    let i = S.cur, wrapped = false;
    for (let k = 0; k < n; k++) {
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
      stormTick(S);
      crisisTick(S);
      MOOD.newRound(S, active(S), (q) => netWorth(S, q));
      roundRules(S);
      recordHist(S);
    } else if (S.settings && S.settings.variant === 'chaos') drawEvent(S);
    beginTurn(S);
  }

  // Vermögen pro Runde für das Diagramm am Spielende (bei langen Spielen ausgedünnt)
  function recordHist(S) {
    if (!S.hist) S.hist = [];
    S.hist.push(S.players.map(p => (p.bankrupt ? 0 : Math.round(netWorth(S, p)))));
    if (S.hist.length > 160) S.hist = S.hist.filter((_, i) => i % 2 === 0);
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
    items = items.filter(it => it.amt > 0);
    const total = items.reduce((a, b) => a + b.amt, 0);
    if (p.money >= total) {
      for (const it of items) { p.money -= it.amt; if (it.to) P(S, it.to).money += it.amt; }
      return true;
    }
    S.debt = { pid: p.id, items };
    S.sub = 'debt';
    log(S, `${p.name} fehlen ${M(total - p.money)}. Gebäude abreißen, Hypotheken aufnehmen oder handeln!`);
    MOOD.debt(S, p, total - p.money);
    return false;
  }

  // ---------- Würfeln & Laufen ----------
  function roll(S) {
    const g = G(S), p = curP(S), e = ev(S);
    const a = d6(), b = e.oneDie ? 0 : d6(), c = e.threeDice ? d6() : 0;
    S.dice = [a, b]; S.die3 = c || null;
    const face = g.FACES.length ? g.FACES[Math.floor(rng() * g.FACES.length)] : null;
    S.face = face ? face.id : null;
    S.rollId++;
    const dbl = b && a === b;
    const turbo = RL.variant(S) === 'speed' ? 1 + Math.floor(rng() * 3) : 0;
    let steps = a + b + c + turbo;
    if (turbo) log(S, `🏎️ Turbo-Würfel: +${turbo}`);
    const faceTxt = face ? ` · Dulidan-Würfel: ${face.icon === 'D' ? '💜' : face.icon} ${face.name}` : '';
    log(S, `🎲 ${p.name} würfelt ${[a, b, c].filter(Boolean).join(' + ')} = ${steps}${dbl ? ' (Pasch)' : ''}${faceTxt}`);
    if (dbl) { S.doubles++; p.stats.doubles++; if (S.doubles === 2) MOOD.doubles(S, p); }
    if (a + b + c === 7 && RL.on(S, 'lucky7')) { p.money += 77; log(S, `🍀 Glückszahl 7! ${p.name} bekommt ${M(77)}.`); }
    if (dbl && RL.on(S, 'doublesCash')) { p.money += 50; log(S, `🎲 Pasch-Prämie: ${p.name} bekommt ${M(50)}.`); }
    if (dbl && e.doubleBonus) { p.money += e.doubleBonus; log(S, `🎉 Pasch-Fieber: ${p.name} bekommt ${M(e.doubleBonus)}.`); }
    if (dbl && p.token === 'gamepad') { p.money += 30; log(S, `🎮 Highscore-Bonus: ${p.name} bekommt ${M(30)}.`); }
    S.again = !!dbl && S.doubles < 3;
    if (p.items && p.items.boost > 0) {
      p.items.boost--;
      steps += 3;
      log(S, `⚡ Boost! ${p.name} läuft 3 Felder weiter.`);
    }
    if (p.race) {
      if (p.race.engine) steps += p.race.engine;
      if (p.race.nitro > 0) { p.race.nitro--; steps *= 2; log(S, `🔥 NITRO! ${p.name} fährt doppelt so weit: ${steps} Felder.`); }
    }
    S.shield = false;
    switch (S.face) {
      case 'pay':
        p.money += 150;
        log(S, `💰 Zahltag! ${p.name} bekommt ${M(150)}.`);
        break;
      case 'shield':
        S.shield = true;
        break;
      case 'encore':
        S.again = true;
        log(S, `🔁 Zugabe! ${p.name} darf gleich nochmal würfeln.`);
        break;
      case 'surf':
        steps += 3;
        log(S, `${face.icon} ${face.name}! ${p.name} kommt 3 Felder weiter.`);
        break;
      case 'april': {
        const pool = p.token === 'april' ? g.CHAOS.filter(x => x.good) : g.CHAOS;
        const x = pick(pool);
        log(S, `💖 April-Chaos: ${x.t}`);
        const others = active(S).filter(o => o.id !== p.id);
        const half = p.token === 'pizza' ? 0.5 : 1;
        if (x.money > 0) p.money += x.money;
        if (x.collect) for (const o of others) { const v = Math.min(o.money, x.collect); o.money -= v; p.money += v; }
        if (x.stepMult) steps = Math.max(1, Math.round(steps * x.stepMult));
        if (x.money < 0 && !charge(S, p, [{ to: null, amt: Math.round(-x.money * half) }])) { S.pendingSteps = steps; return; }
        if (x.payEach && !charge(S, p, others.map(o => ({ to: o.id, amt: Math.round(x.payEach * half) })))) { S.pendingSteps = steps; return; }
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
    const g = G(S);
    if (S.face === 'jet' && g.HUBS.length) { S.sub = 'jet'; return; }
    S.prevLoc = null;
    S.path = [curP(S).loc];
    S.passed = [];
    S.mover = curP(S).id;
    S.flight = false;
    if (S.face === 'nav' && g.walk === 'random') { S.sub = 'walk'; return; }
    while (S.steps > 0) stepTo(S, pick(walkOptions(S)));
    finishWalk(S);
  }

  function stepTo(S, to) {
    const p = curP(S);
    if (p.race && to === G(S).START) lap(S, p);
    if (S.steps > 1) S.passed.push(to);
    S.prevLoc = p.loc;
    p.loc = to;
    p.stats.km++;
    S.path.push(to);
    S.steps--;
  }

  function finishWalk(S) {
    const g = G(S), p = curP(S);
    S.moveId++;
    // METRO: Fahrpreise für durchfahrene Stationen kompletter fremder Linien
    const passed = (S.passed || []).filter(id => id !== p.loc);
    S.passed = [];
    // Bombe: Wer überholt oder draufspringt, drückt sie weiter
    if (S.bomb && S.bomb.holder === p.id) {
      for (const node of passed.concat([p.loc])) {
        const o = active(S).find(q => q.id !== p.id && q.loc === node);
        if (o) { S.bomb.holder = o.id; log(S, `💣 ${p.name} drückt ${o.name} die Bombe in die Hand! Zündschnur: ${S.bomb.fuse}.`); break; }
      }
    }
    if (g.RULES.fare && passed.length && !S.shield) {
      const per = {};
      for (const id of passed) {
        const f = fareFor(S, id, p);
        if (f) { const o = S.cities[id].owner; per[o] = (per[o] || 0) + f; }
      }
      const items = Object.entries(per).map(([to, amt]) => ({ to, amt }));
      if (items.length) {
        items.forEach(it => {
          log(S, `🎫 ${p.name} zahlt ${M(it.amt)} Fahrpreis an ${P(S, it.to).name}.`);
          p.stats.rentPaid += it.amt; P(S, it.to).stats.rentGot += it.amt;
        });
        if (!charge(S, p, items)) { S.pendingLand = true; return; }
      }
    }
    land(S);
  }

  function moveLink(S, to, kind) {
    const p = curP(S);
    p.loc = to;
    S.path = S.path && S.path.length ? S.path.concat([to]) : [to];
    S.flight = kind === 'fly';
    S.mover = p.id;
    S.moveId++;
  }

  function land(S) {
    const g = G(S), p = curP(S), id = p.loc, c = g.CITY[id];
    S.landed = true;
    if (S.raceWin) return raceOver(S);
    if (p.race) {
      for (const o of active(S).filter(q => q.id !== p.id && q.loc === id)) {
        shove(S, o, -2);
        log(S, `💥 Rempler! ${p.name} schubst ${o.name} 2 Felder zurück.`);
      }
    }
    log(S, `${p.name} landet ${c.type === 'prop' ? 'auf' : 'bei'} ${c.name}.`);
    if (c.quip && rng() < 0.5) log(S, `April: „${c.quip}“`);
    if (p.token === 'doener' && !p.visited.includes(id)) {
      p.visited.push(id);
      p.money += 30;
      log(S, `Street-Food-Tour! ${p.name} bekommt ${M(30)}. 🥙`);
    }
    switch (c.type) {
      case 'prop': {
        const st = S.cities[id];
        if (!st.owner) { S.sub = 'buy'; return; }
        if (st.owner !== p.id && !st.mort) {
          const owner = P(S, st.owner);
          if (S.shield) { log(S, `🛡️ Schutzschild! ${p.name} zahlt nichts an ${owner.name}.`); break; }
          if (p.items && p.items.shield > 0) { p.items.shield--; log(S, `🛡️ ${p.name} blockt die Miete mit einem Schild!`); break; }
          const toll = rentFor(S, id, p);
          if (toll <= 0) { log(S, `Mietfrei! ${p.name} zahlt nichts.`); break; }
          if (p.token === 'ghost' && p.used && !p.used.ghost && toll >= 100) { p.used.ghost = true; log(S, `👻 ${p.name} geht als Geist durch die Wand und zahlt keine ${M(toll)}!`); break; }
          log(S, `${p.name} zahlt ${M(toll)} Miete an ${owner.name}.`);
          p.stats.rentPaid += toll; p.stats.maxRent = Math.max(p.stats.maxRent, toll);
          owner.stats.rentGot += toll;
          MOOD.rentPaid(S, p, owner, toll);
          if (!charge(S, p, [{ to: owner.id, amt: toll }])) return;
        }
        break;
      }
      case 'event': {
        // Karte ziehen: Spieler sieht sie groß und bestätigt mit OK
        const deck = c.deck || 'april';
        const list = g.CARDS[deck] || [];
        if (!list.length) break;
        if (!S.decks[deck] || !S.decks[deck].length) S.decks[deck] = list.map((_, i) => i).sort(() => rng() - 0.5);
        let i = S.decks[deck].shift();
        // April-Figur: April-Karten treffen sie nur positiv
        if (p.token === 'april' && deck === 'april' && !list[i].good) {
          const goodIdx = list.map((x, k) => (x.good ? k : -1)).filter(k => k >= 0);
          i = pick(goodIdx);
        }
        if (MOOD.wantsReroll(S, p, list[i])) { S.decks[deck].push(i); i = S.decks[deck].shift(); }
        if (deck === 'april') MOOD.aprilField(S, p);
        S.decks[deck].push(i);
        S.card = { deck, i };
        S.sub = 'card';
        log(S, `${p.name} zieht eine ${deck === 'april' ? 'April-Karte 💖' : 'Studio-Karte 💜'}.`);
        return;
      }
      case 'loot': {
        if (!g.LOOT.length) break;
        const x = pick(g.LOOT);
        p.stats.loot++;
        log(S, `🎁 Loot-Kiste! ${x.t}`);
        if (x.id === 'shield' || x.id === 'boost' || x.id === 'joker') p.items[x.id] = (p.items[x.id] || 0) + 1;
        if (x.id === 'defuse') {
          if (S.bomb && S.bomb.holder === p.id) { S.bomb.fuse += 2; log(S, `🧯 Die Zündschnur bei ${p.name} brennt 2 Züge länger.`); }
          else { p.money += 100; log(S, `🧯 Keine Bombe zum Entschärfen. ${p.name} verkauft das Kit für ${M(100)}.`); }
        }
        if (x.money > 0) p.money += x.money;
        if (x.money < 0 && !charge(S, p, [{ to: null, amt: -x.money }])) return;
        break;
      }
      case 'coin': {
        const amt = 30 + 10 * Math.floor(rng() * 6);
        p.money += amt;
        log(S, `🪙 ${p.name} sammelt ${M(amt)} ein.`);
        break;
      }
      case 'boost':
        log(S, `⏩ Boost-Pad! ${p.name} schießt 3 Felder nach vorn.`);
        shove(S, p, 3);
        if (S.raceWin) return raceOver(S);
        break;
      case 'oil':
        if ((p.race && p.race.tires) || S.shield) { log(S, `🛞 ${p.name} fährt souverän über den Ölfleck.`); break; }
        log(S, `🛢️ Ölfleck! ${p.name} rutscht 3 Felder zurück.`);
        shove(S, p, -3);
        break;
      case 'shop':
        S.sub = 'shop';
        return;
      case 'throne':
        if (S.king === p.id) { log(S, `👑 ${p.name} sitzt schon auf dem Thron.`); break; }
        log(S, `👑 ${p.name} stürmt den Thron${S.king && P(S, S.king) ? ` und stürzt ${P(S, S.king).name}` : ''}! Alle anderen zahlen ab jetzt Tribut.`);
        S.king = p.id;
        break;
      case 'quiz': {
        if (!g.QUESTIONS.length) break;
        if (!S.quizDeck || !S.quizDeck.length) S.quizDeck = g.QUESTIONS.map((_, i) => i).sort(() => rng() - 0.5);
        S.quiz = { i: S.quizDeck.shift(), order: [0, 1, 2, 3].sort(() => rng() - 0.5), hidden: [] };
        S.sub = 'quiz';
        log(S, `🧠 Quizfrage für ${p.name}!`);
        return;
      }
      case 'portal':
        if (c.link && alive(S, c.link)) { S.sub = 'portal'; return; }
        log(S, 'Das Portal ist tot. Der Sturm hat die andere Seite gefressen.');
        break;
      case 'lift':
      case 'slide': {
        const dest = g.CITY[c.link];
        if (c.type === 'lift') {
          const z = Object.keys(g.ZONES).find(k => g.ZONES[k].floor === dest.floor);
          const owners = [...new Set((g.ZONE_CITIES[z] || []).map(i => S.cities[i].owner))];
          log(S, `🛗 Aufzug! ${p.name} fährt hoch in den ${dest.floor}. Stock.`);
          if (owners.length === 1 && owners[0] && owners[0] !== p.id && g.RULES.liftFee) {
            const o = P(S, owners[0]);
            log(S, `${o.name} kontrolliert die Etage: ${p.name} zahlt ${M(g.RULES.liftFee)} Aufzug-Gebühr.`);
            moveLink(S, c.link, 'lift');
            if (!charge(S, p, [{ to: o.id, amt: g.RULES.liftFee }])) return;
            break;
          }
        } else {
          log(S, `🛝 Rutsche! ${p.name} rutscht runter in den ${dest.floor}. Stock.`);
        }
        moveLink(S, c.link, c.type);
        break;
      }
    }
    S.sub = 'end';
  }

  // ---------- Aktionen ----------
  function checkGoal(S) {
    if (S.phase !== 'play' || !S.goal) return;
    const hit = active(S).find(p => netWorth(S, p) >= S.goal);
    if (hit) {
      S.ranking = rank(S); S.phase = 'over'; S.winner = hit.id;
      log(S, `💸 ${hit.name} knackt die ${M(S.goal)} und gewinnt!`);
    }
  }

  function act(S, pid, a) {
    const err = actInner(S, pid, a);
    if (!err) checkGoal(S);
    return err;
  }

  function actInner(S, pid, a) {
    if (S.phase !== 'play') return 'Das Spiel ist vorbei.';
    const g = G(S);
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
        else if (S.pendingLand) { S.pendingLand = false; land(S); }
        else S.sub = S.landed ? 'end' : 'roll';
        return null;
      }
      case 'bankrupt':
        if (S.sub !== 'debt' || S.debt.pid !== pid) return 'Bankrott geht nur, wenn du nicht zahlen kannst.';
        return bankrupt(S, p);
    }

    if (curP(S).id !== pid) return 'Du bist nicht dran.';
    const manage = ['roll', 'end', 'buy', 'debt', 'portal'].includes(S.sub);
    const here = p.loc, st = S.cities[here], city = g.CITY[here];

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
        if (!g.CITY[to] || !g.CITY[to].hub || to === here) return 'Wähle ein anderes Ziel.';
        p.stats.flights++;
        S.path = [here];
        moveLink(S, to, 'fly');
        log(S, `${S.mode === 'metro' ? '🚄 Express' : '✈️ Jetset'}! ${p.name} ${S.mode === 'metro' ? 'springt' : 'fliegt'} nach ${g.CITY[to].name}.`);
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
        if (S.steps <= 0) finishWalk(S);
        else S.moveId++;
        return null;
      }
      case 'warp': {
        if (S.sub !== 'portal') return 'Geht gerade nicht.';
        const to = city.link;
        log(S, `🌀 ${p.name} springt durch ${city.name} auf Ring ${g.CITY[to].ring}.`);
        S.path = [here];
        moveLink(S, to, 'warp');
        S.sub = 'end';
        return null;
      }
      case 'stay':
        if (S.sub !== 'portal') return 'Geht gerade nicht.';
        S.sub = 'end';
        return null;
      case 'cardOk': {
        if (S.sub !== 'card' || !S.card) return 'Keine Karte offen.';
        const x = g.CARDS[S.card.deck][S.card.i];
        S.card = null;
        S.sub = 'end';
        log(S, `${x.t}`);
        if (p.token === 'cat' && p.used && !p.used.cat && MOOD.cardTone(x) < 0) {
          p.used.cat = true;
          log(S, `🐈 Glückskatze! Die fiese Karte prallt an ${p.name} ab.`);
          return null;
        }
        const others = active(S).filter(o => o.id !== p.id);
        const cm = RL.cardMult(S), up = cm * (p.token === 'camera' ? 1.5 : 1), down = cm * MOOD.badMult(S) * (p.token === 'pizza' ? 0.5 : 1);
        if (x.money > 0) p.money += Math.round(x.money * up);
        if (x.collect) for (const o of others) { const v = Math.min(o.money, Math.round(x.collect * up)); o.money -= v; p.money += v; }
        if (x.fromRichest) {
          const rich = others.slice().sort((a, b) => b.money - a.money)[0];
          if (rich) { const v = Math.min(rich.money, Math.round(x.fromRichest * up)); rich.money -= v; p.money += v; log(S, `${rich.name} zahlt ${M(v)} an ${p.name}.`); }
        }
        if (x.item) p.items[x.item] = (p.items[x.item] || 0) + 1;
        if (x.money < 0) charge(S, p, [{ to: null, amt: Math.round(-x.money * down) }]);
        else if (x.payEach) charge(S, p, others.map(o => ({ to: o.id, amt: Math.round(x.payEach * down) })));
        else if (x.repairs) {
          const lv = Object.values(S.cities).filter(st => st.owner === p.id).reduce((a, st) => a + st.level, 0);
          if (lv) { log(S, `${p.name} zahlt ${M(lv * x.repairs)} für ${lv} Ausbaustufen.`); charge(S, p, [{ to: null, amt: lv * x.repairs }]); }
        } else if (x.teleport) {
          const targets = g.PROPS.filter(id => alive(S, id) && id !== here);
          if (!targets.length) return null;
          const to = pick(targets);
          S.path = [here];
          moveLink(S, to, 'fly');
          log(S, `🌀 ${p.name} wird nach ${g.CITY[to].name} teleportiert.`);
          land(S);
        }
        return null;
      }
      case 'buy': {
        if (S.sub !== 'buy') return 'Geht gerade nicht.';
        const price = buyPrice(p, here, S);
        if (p.money < price) return 'Nicht genug Dulis.';
        p.money -= price;
        st.owner = p.id;
        p.stats.bought++;
        log(S, `${p.name} kauft ${city.name} für ${M(price)}.`);
        if (zoneComplete(S, p.id, city.zone)) log(S, `🔥 ${p.name} hat ${g.ZONES[city.zone].name} komplett! Jetzt darf gebaut werden.`);
        S.sub = 'end';
        return null;
      }
      case 'skip':
        if (S.sub !== 'buy') return 'Geht gerade nicht.';
        log(S, `${p.name} lässt ${city.name} links liegen.`);
        S.sub = 'end';
        return null;
      case 'takeover': {
        if (S.sub !== 'end' || !S.landed || !st) return 'Übernehmen geht nach der Landung auf einem fremden Feld.';
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
        if (zoneComplete(S, p.id, city.zone)) log(S, `🔥 ${p.name} hat ${g.ZONES[city.zone].name} komplett!`);
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
        log(S, `🏗️ ${p.name} baut ${g.LEVEL_ART[S.cities[id].level]} auf ${g.CITY[id].name}.`);
        if (S.cities[id].level === 4) MOOD.built(S, p, g.CITY[id].name);
        return null;
      }
      case 'bribe': {
        if (!['roll', 'end'].includes(S.sub)) return 'Bestechen geht vor dem Würfeln oder am Ende deines Zuges.';
        const r = MOOD.bribe(S, p, a.amt);
        return r.err || null;
      }
      case 'sell': {
        if (!manage) return 'Geht gerade nicht.';
        const id = String(a.id), c = g.CITY[id], s2 = S.cities[id];
        if (!c || !s2 || s2.owner !== p.id || !s2.level) return 'Hier gibt es nichts zu verkaufen.';
        if (s2.level < Math.max(...g.ZONE_CITIES[c.zone].map(i => S.cities[i].level)) && !RL.on(S, 'freeBuild')) return 'Gleichmäßig abreißen!';
        s2.level--;
        const back = Math.floor(g.ZONES[c.zone].build / 2);
        p.money += back;
        log(S, `${p.name} reißt auf ${c.name} eine Stufe ab (+${M(back)}).`);
        return null;
      }
      case 'mortgage': {
        if (!manage) return 'Geht gerade nicht.';
        const id = String(a.id), c = g.CITY[id], s2 = S.cities[id];
        if (!c || !s2 || s2.owner !== p.id || s2.mort) return 'Geht nicht.';
        if (zoneHasBuildings(S, c.zone)) return 'Erst alle Gebäude der Gruppe abreißen.';
        s2.mort = true;
        const val = Math.round(c.price * (p.token === 'duck' ? 0.6 : 0.5));
        p.money += val;
        log(S, `${p.name} nimmt eine Hypothek auf ${c.name} auf (+${M(val)}).`);
        return null;
      }
      case 'unmortgage': {
        if (!manage) return 'Geht gerade nicht.';
        const id = String(a.id), c = g.CITY[id], s2 = S.cities[id];
        if (!c || !s2 || s2.owner !== p.id || !s2.mort) return 'Keine Hypothek vorhanden.';
        const cost = unmortgageCost(id, S);
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
      case 'buyUpgrade': {
        if (S.sub !== 'shop' || !p.race) return 'Du bist nicht in der Boxengasse.';
        const it = g.SHOP.find(x => x.id === a.item);
        if (!it) return 'Unbekanntes Upgrade.';
        const have = it.id === 'tires' ? (p.race.tires ? 1 : 0) : p.race[it.id];
        if (have >= it.max) return 'Mehr geht nicht.';
        if (p.money < it.cost) return 'Nicht genug Dulis.';
        p.money -= it.cost;
        if (it.id === 'tires') p.race.tires = true; else p.race[it.id]++;
        log(S, `${it.icon} ${p.name} kauft ${it.name} für ${M(it.cost)}.`);
        return null;
      }
      case 'leaveShop':
        if (S.sub !== 'shop') return 'Geht gerade nicht.';
        S.sub = 'end';
        return null;
      case 'joker': {
        if (S.sub !== 'quiz' || !S.quiz) return 'Gerade gibt es keine Frage.';
        if (S.quiz.hidden.length) return 'Der Joker ist schon gespielt.';
        if (p.used.joker && !(p.items.joker > 0)) return 'Dein 50:50-Joker ist verbraucht.';
        if (p.used.joker) p.items.joker--; else p.used.joker = true;
        S.quiz.hidden = S.quiz.order.map((o, k) => (o === 0 ? -1 : k)).filter(k => k >= 0).sort(() => rng() - 0.5).slice(0, 2);
        log(S, `🃏 ${p.name} spielt den 50:50-Joker!`);
        return null;
      }
      case 'answer': {
        if (S.sub !== 'quiz' || !S.quiz) return 'Gerade gibt es keine Frage.';
        const k = Math.floor(Number(a.k));
        if (!(k >= 0 && k < 4) || S.quiz.hidden.includes(k)) return 'Ungültige Antwort.';
        const q = g.QUESTIONS[S.quiz.i], ok = S.quiz.order[k] === 0;
        S.quizResult = { seq: (S.quizResult ? S.quizResult.seq : 0) + 1, i: S.quiz.i, order: S.quiz.order, k, ok, pid: p.id };
        S.quiz = null;
        S.sub = 'end';
        if (ok) {
          p.money += g.RULES.quiz.win;
          p.stats.quiz = (p.stats.quiz || 0) + 1;
          log(S, `✅ Richtig! „${q.a[0]}“ – ${p.name} gewinnt ${M(g.RULES.quiz.win)}.`);
        } else {
          log(S, `❌ Leider falsch! Richtig war „${q.a[0]}“. ${p.name} zahlt ${M(g.RULES.quiz.lose)}.`);
          charge(S, p, [{ to: null, amt: g.RULES.quiz.lose }]);
        }
        return null;
      }
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
    const g = G(S);
    const creditors = [...new Set(S.debt.items.map(i => i.to).filter(Boolean))];
    const heir = creditors.length === 1 ? P(S, creditors[0]) : null;
    for (const id in S.cities) {
      const st = S.cities[id];
      if (st.owner !== p.id) continue;
      if (heir) { p.money += Math.floor(st.level * g.ZONES[g.CITY[id].zone].build / 2); st.level = 0; st.owner = heir.id; }
      else { st.owner = null; st.level = 0; st.mort = false; }
    }
    if (heir) heir.money += p.money;
    log(S, `💀 ${p.name} ist pleite! ${heir ? `Alles geht an ${heir.name}.` : 'Alles geht zurück an die Bank.'}`);
    if (MOOD.on(S)) MOOD.bankrupt(S, p); else log(S, 'April: „F. Pleite. Ich hab nichts gesehen.“');
    p.money = 0; p.bankrupt = true;
    S.debt = null; S.pendingSteps = null; S.pendingLand = false;
    if (S.king === p.id) { S.king = null; log(S, '👑 Der Thron ist wieder frei!'); }
    if (S.bomb && S.bomb.holder === p.id) {
      const others = active(S);
      if (others.length) S.bomb.holder = pick(others).id;
    }
    if (S.trade && (S.trade.from === p.id || S.trade.to === p.id)) S.trade = null;
    const left = active(S);
    if (left.length === 1) {
      S.ranking = rank(S); S.phase = 'over'; S.winner = left[0].id;
      log(S, `🏆 ${left[0].name} ist als Letzter übrig und gewinnt ${g.title}!`);
      return null;
    }
    nextTurn(S);
    return null;
  }

  // ---------- Handel ----------
  function validSide(S, pid, side) {
    const g = G(S), p = P(S, pid);
    side.money = Math.max(0, Math.floor(Number(side.money) || 0));
    side.props = (side.props || []).map(String);
    if (side.money > p.money) return `${p.name} hat nicht so viel Dulis.`;
    for (const id of side.props) {
      if (!S.cities[id] || S.cities[id].owner !== pid) return `${g.CITY[id] ? g.CITY[id].name : 'Feld'} gehört nicht ${p.name}.`;
      if (zoneHasBuildings(S, g.CITY[id].zone)) return `In der Gruppe von ${g.CITY[id].name} stehen Gebäude.`;
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
    const g = G(S), c = g.CITY[id], st = S.cities[id];
    if (c.type === 'throne') return S.king === p.id ? 0 : 500;
    if (c.hub && g.RULES.throne) return S.king === p.id ? 0 : 150;
    if (S.bomb && S.bomb.holder === p.id && active(S).some(q => q.id !== p.id && q.loc === id)) return 400;
    if (!st) return c.type === 'loot' ? 60 : 0;
    if (!st.owner) return c.price * (1 + 0.7 * g.ZONE_CITIES[c.zone].filter(i => S.cities[i].owner === p.id).length);
    if (st.owner === p.id) return 50;
    return -rentFor(S, id, p) * 2;
  }

  function botStep(S) {
    if (S.phase !== 'play') return null;
    const g = G(S);
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
          if (st.level && st.level === Math.max(...g.ZONE_CITIES[g.CITY[id].zone].map(i => S.cities[i].level))) return go({ type: 'sell', id });
        }
        const m = owned.filter(id => !S.cities[id].mort && !zoneHasBuildings(S, g.CITY[id].zone)).sort((a, b) => g.CITY[a].price - g.CITY[b].price)[0];
        return go(m ? { type: 'mortgage', id: m } : { type: 'bankrupt' });
      }
      case 'roll':
      case 'end': {
        for (const id of owned) if (S.cities[id].mort && p.money - unmortgageCost(id, S) > 700) return go({ type: 'unmortgage', id });
        const b = owned.filter(id => !buildBlock(S, p, id) && p.money - buildCost(S, p, id) >= reserve)
          .sort((x, y) => S.cities[x].level - S.cities[y].level || g.CITY[y].price - g.CITY[x].price)[0];
        if (b) return go({ type: 'build', id: b });
        const br = S.sub === 'roll' && MOOD.botBribe(S, p);
        if (br) return go({ type: 'bribe', amt: br });
        if (S.sub === 'end' && S.landed && !S.tookOver && S.cities[p.loc] && !takeoverBlock(S, p, p.loc)) {
          const z = g.CITY[p.loc].zone;
          const mine = g.ZONE_CITIES[z].filter(i => S.cities[i].owner === p.id).length;
          if (mine >= 1 && p.money - takeoverCost(S, p.loc) >= reserve + 100) return go({ type: 'takeover' });
        }
        return go({ type: S.sub === 'roll' ? 'roll' : 'endTurn' });
      }
      case 'pick': {
        const [lo, hi] = S.pickRange;
        return go({ type: 'pickSteps', n: S.face === 'boss' ? 7 : Math.min(hi, Math.max(lo, S.steps)) });
      }
      case 'jet': {
        const best = g.HUBS.filter(h => h !== p.loc && alive(S, h)).map(h => ({ h, v: cityValue(S, p, h) })).sort((a, b) => b.v - a.v)[0];
        return go(best && best.v > 0 ? { type: 'fly', to: best.h } : { type: 'walkInstead' });
      }
      case 'walk': {
        const opts = walkOptions(S);
        const choice = S.steps === 1 ? opts.slice().sort((a, b) => cityValue(S, p, b) - cityValue(S, p, a))[0] : pick(opts);
        return go({ type: 'step', to: choice });
      }
      case 'card': return go({ type: 'cardOk' });
      case 'shop': {
        const r = p.race, sh = (id) => g.SHOP.find(x => x.id === id);
        if (r.engine < 3 && p.money >= sh('engine').cost + 60) return go({ type: 'buyUpgrade', item: 'engine' });
        if (!r.tires && p.money >= sh('tires').cost + 60) return go({ type: 'buyUpgrade', item: 'tires' });
        if (r.nitro < 1 && p.money >= sh('nitro').cost + 60) return go({ type: 'buyUpgrade', item: 'nitro' });
        return go({ type: 'leaveShop' });
      }
      case 'quiz': {
        const q = S.quiz, right = q.order.indexOf(0);
        if (!q.hidden.length && !p.used.joker && rng() < 0.3) return go({ type: 'joker' });
        const open = [0, 1, 2, 3].filter(k => !q.hidden.includes(k));
        const k = rng() < (q.hidden.length ? 0.75 : 0.6) ? right : pick(open.filter(x => x !== right));
        return go({ type: 'answer', k });
      }
      case 'portal': {
        const c = g.CITY[p.loc], to = g.CITY[c.link];
        const warned = !!S.event && S.event.warn === c.ring;
        const inward = to.ring < c.ring;
        return go({ type: warned ? (inward ? 'warp' : 'stay') : (inward && p.money > 600) || (!inward && p.money < 400) ? 'warp' : 'stay' });
      }
      case 'buy': {
        const c = g.CITY[p.loc], price = buyPrice(p, p.loc, S);
        const mine = g.ZONE_CITIES[c.zone].filter(i => S.cities[i].owner === p.id).length;
        const doomed = !!c.ring && !!S.event && S.event.warn === c.ring;
        return go({ type: !doomed && (p.money - price >= 150 || (mine >= 1 && p.money >= price)) ? 'buy' : 'skip' });
      }
    }
    return null;
  }

  const WORLD = {
    start, act, botStep, endGame, rentFor, fareFor, salaryOf, buyPrice, buildCost, buildBlock, takeoverCost, takeoverBlock,
    unmortgageCost, netWorth, zoneComplete, completeZones, zoneHasBuildings, walkOptions, board, MODES,
    setRng: (f) => { rng = f; MOOD.setRng(f); },
  };
  if (isNode) module.exports = WORLD;
  else root.DULI_WORLD = WORLD;
})(typeof window !== 'undefined' ? window : globalThis);
