// DULIDAN Risiko – Regeln (online über js/party.js). Läuft beim Host.
// Klassisch wie Risiko: Verstärken (Gebiete/3, Kontinentbonus, Karten), Angreifen (3 gegen 2 Würfel), einmal Verschieben.
// Realistic: Einkauf statt Gratis-Truppen – Infanterie, Panzer (+1 auf einen Würfel), Flieger (Luftkampf und Bomben vor dem
// Angriff) und Schiffe in Seezonen (Seeschlachten, Küstenbeschuss, Blockade von Wasserwegen).
(function (root) {
  const DATA = root.DULI_RISIKO_DATA || (typeof require !== 'undefined' ? require('./risiko-data.js') : null);
  const COST = { inf: 1, tank: 2, air: 3, ship: 3 };
  const UNIT = { inf: 'Infanterie', tank: 'Panzer', air: 'Flieger', ship: 'Schiff' };
  const START = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };
  const MAX_TURNS = 160;

  const rnd = (n) => 1 + Math.floor(Math.random() * n);
  const roll = (n) => Array.from({ length: n }, () => rnd(6)).sort((a, b) => b - a);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const M = (S) => DATA.MAPS[S.map];
  const ground = (S, t) => S.inf[t] + S.tank[t];
  const cur = (S) => S.players[S.cur];
  const owned = (S, pid) => M(S).ids.filter((t) => S.owner[t] === pid);
  function log(S, m) { S.log.push(m); if (S.log.length > 80) S.log.shift(); }
  const nameOf = (S, pid) => (S.players.find((p) => p.id === pid) || {}).name || '?';
  const tname = (S, t) => M(S).T[t].name;

  function income(S, pid) {
    const mine = owned(S, pid);
    let n = Math.max(3, Math.floor(mine.length / 3));
    const bonus = [];
    Object.values(M(S).conts).forEach((c) => { if (c.terr.every((t) => S.owner[t] === pid)) { n += c.bonus; bonus.push(c.name); } });
    return { n, bonus, terr: mine.length };
  }
  const tradeValue = (k) => [4, 6, 8, 10, 12, 15][k] || 15 + 5 * (k - 5);
  function validSet(cards) {
    if (cards.length !== 3) return false;
    const k = cards.map((c) => c.k), j = k.filter((x) => x === 'joker').length;
    if (j) return true;
    return new Set(k).size === 1 || new Set(k).size === 3;
  }
  function findSet(cards) {
    const n = cards.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) if (validSet([cards[a], cards[b], cards[c]])) return [a, b, c];
    return null;
  }
  // Wasserwege: im Realistic-Modus blockiert eine fremde Flotte die Überfahrt
  function seaOk(S, pid, a, b) {
    const z = M(S).T[a].sea[b];
    if (!z || !S.real) return true;
    const f = S.fleet[z];
    return !f || f.pid === pid || f.n <= 0;
  }
  function reachable(S, pid, from, to) {
    const seen = new Set([from]), st = [from];
    while (st.length) {
      const t = st.pop();
      if (t === to) return true;
      M(S).T[t].adj.forEach((n) => { if (!seen.has(n) && S.owner[n] === pid && seaOk(S, pid, t, n)) { seen.add(n); st.push(n); } });
    }
    return false;
  }

  // ---------- Start ----------
  function start(players, settings) {
    const st = Object.assign({ map: 'world', mode: 'classic', goal: 'world', cards: true }, settings || {});
    const map = DATA.MAPS[st.map] ? st.map : 'world';
    const S = {
      map, real: st.mode === 'real', goal: ['world', 'quick', 'capitals'].includes(st.goal) ? st.goal : 'world', cardsOn: st.cards !== false,
      players: players.map((p) => ({ id: p.id, name: p.name, color: p.color, bot: !!p.bot })), alive: {}, cur: 0, turn: 1,
      phase: 'reinforce', owner: {}, inf: {}, tank: {}, air: {}, fleet: {}, shipMoved: {}, cards: {}, deck: [], discard: [], trades: 0,
      reinforce: 0, budget: 0, conquered: false, pending: null, battle: null, last: null, capitals: {}, log: [], winner: null, seq: 0, stats: {},
    };
    const m = DATA.MAPS[map];
    S.players = shuffle(S.players);
    S.players.forEach((p) => { S.alive[p.id] = true; S.cards[p.id] = []; S.stats[p.id] = { won: 0, lost: 0, kills: 0 }; });
    // Gebiete verteilen, Truppen zufällig dazu
    const ids = shuffle(m.ids);
    ids.forEach((t, i) => { S.owner[t] = S.players[i % S.players.length].id; S.inf[t] = 1; S.tank[t] = 0; S.air[t] = 0; });
    const per = Math.max(Math.ceil(m.ids.length / S.players.length) + 3, Math.round(((START[S.players.length] || 20) * m.ids.length) / 42));
    S.players.forEach((p) => {
      const mine = owned(S, p.id);
      for (let k = mine.length; k < per; k++) S.inf[mine[Math.floor(Math.random() * mine.length)]]++;
      if (S.goal === 'capitals') S.capitals[p.id] = mine[Math.floor(Math.random() * mine.length)];
    });
    // Karten: jedes Gebiet eine, dazu zwei Joker
    const kinds = ['inf', 'cav', 'art'];
    S.deck = shuffle(m.ids.map((t, i) => ({ t, k: kinds[i % 3] })).concat([{ t: null, k: 'joker' }, { t: null, k: 'joker' }]));
    beginTurn(S);
    log(S, `Das Spiel beginnt. ${nameOf(S, cur(S).id)} fängt an.`);
    return S;
  }
  function beginTurn(S) {
    const p = cur(S);
    const inc = income(S, p.id);
    S.phase = 'reinforce'; S.conquered = false; S.pending = null; S.battle = null; S.shipMoved = {};
    if (S.real) { S.budget = inc.n; S.reinforce = 0; } else { S.reinforce = inc.n; S.budget = 0; }
    S.incomeInfo = inc;
  }
  function nextTurn(S) {
    const p = cur(S);
    if (S.conquered && S.cardsOn) {
      if (!S.deck.length) { S.deck = shuffle(S.discard); S.discard = []; }
      if (S.deck.length) S.cards[p.id].push(S.deck.pop());
    }
    let i = S.cur;
    do { i = (i + 1) % S.players.length; if (i === 0) S.turn++; } while (!S.alive[S.players[i].id]);
    S.cur = i;
    if (S.turn > MAX_TURNS) return finish(S, mostTerritories(S));
    beginTurn(S);
  }
  const mostTerritories = (S) => S.players.filter((p) => S.alive[p.id]).sort((a, b) => owned(S, b.id).length - owned(S, a.id).length)[0].id;
  function finish(S, pid) { S.phase = 'over'; S.winner = pid; log(S, `${nameOf(S, pid)} gewinnt!`); }
  function checkWin(S, pid) {
    const live = S.players.filter((p) => S.alive[p.id]);
    if (live.length === 1) return finish(S, live[0].id), true;
    const n = owned(S, pid).length, all = M(S).ids.length;
    if (S.goal === 'quick' && n >= Math.ceil(all * 0.65)) return finish(S, pid), true;
    if (S.goal === 'capitals' && Object.values(S.capitals).every((t) => S.owner[t] === pid)) return finish(S, pid), true;
    return false;
  }

  // ---------- Kampf ----------
  function kill(S, t, n) {
    const fromInf = Math.min(S.inf[t], n);
    S.inf[t] -= fromInf;
    S.tank[t] = Math.max(0, S.tank[t] - (n - fromInf));
  }
  function boost(dice, k) { for (let i = 0; i < Math.min(k, dice.length); i++) dice[i] += 1; return dice; }
  // Eröffnungsschlag im Realistic-Modus: Luftkampf, Bomben, Küstenbeschuss
  function opening(S, pid, from, to) {
    const res = { aAir: S.air[from], dAir: S.air[to], aLost: 0, dLost: 0, bomb: 0, shore: 0, ships: 0 };
    if (res.aAir || res.dAir) {
      const hitA = roll(res.aAir).filter((d) => d >= 5).length, hitD = roll(res.dAir).filter((d) => d >= 5).length;
      res.dLost = Math.min(hitA, S.air[to]); res.aLost = Math.min(hitD, S.air[from]);
      S.air[to] -= res.dLost; S.air[from] -= res.aLost;
      const bombs = roll(S.air[from]).filter((d) => d >= 4).length;
      res.bomb = Math.min(bombs, ground(S, to));
      kill(S, to, res.bomb);
    }
    Object.entries(S.fleet).forEach(([z, f]) => {
      if (f.pid === pid && f.n > 0 && M(S).Z[z].coast.includes(to)) {
        res.ships += f.n;
        const h = Math.min(roll(f.n).filter((d) => d >= 5).length, ground(S, to));
        res.shore += h; kill(S, to, h);
      }
    });
    return res;
  }
  function groundRound(S, from, to) {
    const aN = Math.min(3, ground(S, from) - 1), dN = Math.min(2, ground(S, to));
    const a = roll(aN), d = roll(dN);
    if (S.real) { boost(a, Math.min(S.tank[from], aN)); boost(d, Math.min(S.tank[to], dN)); }
    let la = 0, ld = 0;
    for (let i = 0; i < Math.min(aN, dN); i++) { if (a[i] > d[i]) ld++; else la++; }
    kill(S, from, la); kill(S, to, ld);
    return { a, d, la, ld, aN };
  }
  function conquer(S, pid, from, to, minMove) {
    const victim = S.owner[to];
    S.owner[to] = pid; S.air[to] = 0;
    S.conquered = true;
    S.stats[pid].won++; S.stats[victim].lost++;
    log(S, `${nameOf(S, pid)} erobert ${tname(S, to)}.`);
    if (!owned(S, victim).length) {
      S.alive[victim] = false;
      S.stats[pid].kills++;
      S.cards[pid] = S.cards[pid].concat(S.cards[victim]); S.cards[victim] = [];
      Object.keys(S.fleet).forEach((z) => { if (S.fleet[z].pid === victim) delete S.fleet[z]; });
      log(S, `${nameOf(S, victim)} ist ausgelöscht!`);
      S.last.elim = victim;
    }
    const max = ground(S, from) - 1;
    S.pending = { from, to, min: Math.min(Math.max(1, minMove), max), max };
    S.phase = 'move';
    if (checkWin(S, pid)) { S.inf[to] = Math.max(1, max); kill(S, from, S.inf[to]); S.pending = null; }
  }
  function attack(S, pid, from, to, blitz) {
    const T = M(S).T;
    if (S.owner[from] !== pid) return 'Das ist nicht dein Gebiet.';
    if (S.owner[to] === pid) return 'Das gehört dir schon.';
    if (!T[from].adj.includes(to)) return 'Die Gebiete grenzen nicht aneinander.';
    if (ground(S, from) < 2) return 'Du brauchst mindestens 2 Truppen zum Angreifen.';
    if (!seaOk(S, pid, from, to)) return `Blockade: Fremde Schiffe kontrollieren ${M(S).Z[T[from].sea[to]].name}.`;
    const res = { seq: ++S.seq, kind: 'land', from, to, pid, def: S.owner[to], rounds: [], la: 0, ld: 0, conquered: false };
    S.last = res;
    if (S.real && !(S.battle && S.battle.from === from && S.battle.to === to)) {
      S.battle = { from, to };
      res.open = opening(S, pid, from, to);
    }
    let lastN = 1;
    do {
      if (!ground(S, to)) break;
      if (ground(S, from) < 2) break;
      const r = groundRound(S, from, to);
      res.rounds.push(r); res.la += r.la; res.ld += r.ld; lastN = r.aN;
    } while (blitz && res.rounds.length < 200);
    if (!ground(S, to) && ground(S, from) >= 2) { res.conquered = true; conquer(S, pid, from, to, lastN); }
    else if (!ground(S, to)) { S.inf[to] = 1; }
    return null;
  }
  function naval(S, pid, from, to) {
    const Z = M(S).Z;
    const f = S.fleet[from];
    if (!f || f.pid !== pid || f.n < 1) return 'Da hast du keine Schiffe.';
    if (!Z[from].adj.includes(to)) return 'Die Seezonen grenzen nicht aneinander.';
    if (S.shipMoved[from]) return 'Diese Flotte ist diese Runde schon gefahren.';
    const g = S.fleet[to];
    const res = { seq: ++S.seq, kind: 'sea', from, to, pid, def: g ? g.pid : null, rounds: [], la: 0, ld: 0, conquered: false };
    if (g && g.pid !== pid && g.n > 0) {
      S.last = res;
      while (f.n > 0 && g.n > 0 && res.rounds.length < 200) {
        const aN = Math.min(3, f.n), dN = Math.min(2, g.n), a = roll(aN), d = roll(dN);
        let la = 0, ld = 0;
        for (let i = 0; i < Math.min(aN, dN); i++) { if (a[i] > d[i]) ld++; else la++; }
        f.n -= la; g.n -= ld; res.la += la; res.ld += ld; res.rounds.push({ a, d, la, ld });
      }
      if (g.n <= 0) { delete S.fleet[to]; res.conquered = true; log(S, `${nameOf(S, pid)} gewinnt die Seeschlacht um ${Z[to].name}.`); }
      else log(S, `${nameOf(S, g.pid)} verteidigt ${Z[to].name}.`);
      if (f.n <= 0) { delete S.fleet[from]; return null; }
      if (g.n > 0) return null;
    }
    // Einlaufen (zusammenlegen)
    const n = f.n;
    delete S.fleet[from];
    if (S.fleet[to] && S.fleet[to].pid === pid) S.fleet[to].n += n; else S.fleet[to] = { pid, n };
    S.shipMoved[to] = true;
    if (!res.rounds.length) log(S, `${nameOf(S, pid)} verlegt ${n} ${n === 1 ? 'Schiff' : 'Schiffe'} nach ${Z[to].name}.`);
    return null;
  }

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    if (S.phase === 'over') return 'Das Spiel ist vorbei.';
    const p = cur(S);
    if (p.id !== pid) return 'Du bist nicht dran.';
    const T = M(S).T;
    switch (a.type) {
      case 'trade': {
        if (S.phase !== 'reinforce') return 'Karten tauschst du beim Verstärken.';
        const hand = S.cards[pid], idx = (a.idx || []).map(Number);
        if (new Set(idx).size !== 3 || idx.some((i) => !hand[i])) return 'Wähl drei Karten.';
        const set = idx.map((i) => hand[i]);
        if (!validSet(set)) return 'Das ist kein gültiges Set (drei gleiche, drei verschiedene oder mit Joker).';
        const v = tradeValue(S.trades++);
        if (S.real) S.budget += v; else S.reinforce += v;
        const own = set.find((c) => c.t && S.owner[c.t] === pid);
        if (own) S.inf[own.t] += 2;
        S.cards[pid] = hand.filter((_, i) => !idx.includes(i));
        S.discard = S.discard.concat(set);
        log(S, `${p.name} tauscht Karten gegen ${v} ${S.real ? 'Punkte' : 'Truppen'}${own ? ` (+2 in ${tname(S, own.t)})` : ''}.`);
        return null;
      }
      case 'place': {
        if (S.phase !== 'reinforce' || S.real) return null;
        if (S.cards[pid].length >= 5) return 'Du hast 5 Karten – erst tauschen.';
        if (S.owner[a.t] !== pid) return 'Das ist nicht dein Gebiet.';
        const n = Math.max(1, Math.min(S.reinforce, Math.round(Number(a.n) || 1)));
        S.inf[a.t] += n; S.reinforce -= n;
        if (S.reinforce <= 0) S.phase = 'attack';
        return null;
      }
      case 'buy': {
        if (S.phase !== 'reinforce' || !S.real) return null;
        if (S.cards[pid].length >= 5) return 'Du hast 5 Karten – erst tauschen.';
        const u = a.unit, n = Math.max(1, Math.round(Number(a.n) || 1));
        if (!COST[u]) return 'Unbekannte Einheit.';
        if (S.budget < COST[u] * n) return 'Dafür reicht dein Budget nicht.';
        if (u === 'ship') {
          const z = M(S).Z[a.zone];
          if (!z) return 'Schiffe kommen in eine Seezone.';
          if (!z.coast.some((t) => S.owner[t] === pid)) return 'Du brauchst ein Küstengebiet an dieser Seezone.';
          if (S.fleet[a.zone] && S.fleet[a.zone].pid !== pid) return 'Da liegt eine fremde Flotte.';
          S.fleet[a.zone] = { pid, n: (S.fleet[a.zone] ? S.fleet[a.zone].n : 0) + n };
        } else {
          if (S.owner[a.t] !== pid) return 'Das ist nicht dein Gebiet.';
          S[u][a.t] += n;
        }
        S.budget -= COST[u] * n;
        return null;
      }
      case 'endReinforce': {
        if (S.phase !== 'reinforce') return null;
        if (!S.real && S.reinforce > 0) return 'Erst alle Truppen setzen.';
        if (S.cards[pid].length >= 5) return 'Du hast 5 Karten – erst tauschen.';
        if (S.real && S.budget > 0) log(S, `${p.name} spart ${S.budget} ${S.budget === 1 ? 'Punkt' : 'Punkte'} (verfallen).`);
        S.budget = 0; S.phase = 'attack';
        return null;
      }
      case 'attack': {
        if (S.phase !== 'attack') return 'Gerade wird nicht angegriffen.';
        return attack(S, pid, a.from, a.to, !!a.blitz);
      }
      case 'naval': {
        if (!S.real || !['attack', 'fortify'].includes(S.phase)) return null;
        if (S.phase === 'fortify') { const g = S.fleet[a.to]; if (g && g.pid !== pid) return 'Seeschlachten nur in der Angriffsphase.'; }
        return naval(S, pid, a.from, a.to);
      }
      case 'move': {
        if (S.phase !== 'move' || !S.pending) return null;
        const P = S.pending, n = Math.max(P.min, Math.min(P.max, Math.round(Number(a.n) || P.min)));
        const tanks = Math.min(S.tank[P.from], n);
        S.tank[P.from] -= tanks; S.tank[P.to] += tanks;
        S.inf[P.from] -= n - tanks; S.inf[P.to] += n - tanks;
        if (S.real && a.air) { S.air[P.to] += S.air[P.from]; S.air[P.from] = 0; }
        S.pending = null; S.phase = 'attack';
        return null;
      }
      case 'endAttack': {
        if (S.phase !== 'attack') return null;
        S.phase = 'fortify';
        return null;
      }
      case 'fortify': {
        if (S.phase !== 'fortify') return null;
        const { from, to } = a, unit = S.real && ['inf', 'tank', 'air'].includes(a.unit) ? a.unit : 'inf';
        if (S.owner[from] !== pid || S.owner[to] !== pid || from === to) return 'Beide Gebiete müssen dir gehören.';
        if (!reachable(S, pid, from, to)) return 'Die Gebiete sind nicht über deine Gebiete verbunden.';
        let n = Math.max(1, Math.round(Number(a.n) || 1));
        if (unit === 'air') n = Math.min(n, S.air[from]);
        else n = Math.min(n, S[unit][from], ground(S, from) - 1);
        if (n < 1) return 'Ein Gebiet braucht mindestens 1 Bodentruppe.';
        S[unit][from] -= n; S[unit][to] += n;
        log(S, `${p.name} verschiebt ${n} ${S.real ? UNIT[unit] : 'Truppen'} von ${tname(S, from)} nach ${tname(S, to)}.`);
        nextTurn(S);
        return null;
      }
      case 'endTurn': {
        if (!['attack', 'fortify'].includes(S.phase)) return 'Erst verstärken.';
        nextTurn(S);
        return null;
      }
    }
    return 'Unbekannte Aktion.';
  }

  // Sicht: alles offen außer den Karten der anderen
  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    Object.keys(V.cards).forEach((k) => { if (k !== pid) V.cards[k] = V.cards[k].length; });
    V.deck = V.deck.length; V.discard = V.discard.length;
    V.nextTrade = tradeValue(S.trades);
    V.income = {};
    S.players.forEach((p) => { V.income[p.id] = income(S, p.id); });
    return V;
  }

  // ---------- Bots ----------
  function enemyNeighbors(S, pid, t) { return M(S).T[t].adj.filter((n) => S.owner[n] !== pid); }
  function bestAttack(S, pid) {
    let best = null;
    owned(S, pid).forEach((t) => {
      const g = ground(S, t);
      if (g < 3) return;
      enemyNeighbors(S, pid, t).forEach((e) => {
        if (!seaOk(S, pid, t, e)) return;
        const d = ground(S, e);
        const strength = g - 1 + (S.real ? S.tank[t] * 0.5 + S.air[t] * 0.6 : 0), def = d + (S.real ? S.tank[e] * 0.5 + S.air[e] * 0.4 : 0);
        const ratio = strength / Math.max(1, def);
        // Kontinente abschließen lohnt sich
        const c = M(S).conts[M(S).T[e].c];
        const left = c.terr.filter((x) => S.owner[x] !== pid).length;
        const score = ratio + (left <= 2 ? 0.6 : 0) + (S.goal === 'capitals' && Object.values(S.capitals).includes(e) ? 0.8 : 0);
        if (ratio >= 1.3 && (!best || score > best.score)) best = { from: t, to: e, score };
      });
    });
    return best;
  }
  function borderTarget(S, pid) {
    let best = null;
    owned(S, pid).forEach((t) => {
      const en = enemyNeighbors(S, pid, t).filter((e) => seaOk(S, pid, t, e));
      if (!en.length) return;
      const weakest = Math.min(...en.map((e) => ground(S, e)));
      const c = M(S).conts[M(S).T[t].c];
      const share = c.terr.filter((x) => S.owner[x] === pid).length / c.terr.length;
      const score = ground(S, t) - weakest + share * 4 + (S.goal === 'capitals' && S.capitals[pid] === t ? 3 : 0);
      if (!best || score > best.score) best = { t, score };
    });
    return best ? best.t : owned(S, pid)[0];
  }
  function botAction(S) {
    const p = cur(S), pid = p.id;
    if (S.phase === 'reinforce') {
      const set = findSet(S.cards[pid]);
      if (set && (S.cards[pid].length >= 4 || Math.random() < 0.6)) return { type: 'trade', idx: set };
      const t = borderTarget(S, pid);
      if (!S.real) return S.reinforce > 0 ? { type: 'place', t, n: S.reinforce } : { type: 'endReinforce' };
      if (S.budget >= 3 && S.turn % 3 === 0 && S.air[t] < 3) return { type: 'buy', unit: 'air', t };
      if (S.budget >= 2) return { type: 'buy', unit: 'tank', t, n: Math.floor(S.budget / 2) };
      if (S.budget >= 1) return { type: 'buy', unit: 'inf', t, n: S.budget };
      return { type: 'endReinforce' };
    }
    if (S.phase === 'move') {
      const P = S.pending;
      const stillBorder = enemyNeighbors(S, pid, P.from).length > 0;
      return { type: 'move', n: stillBorder ? Math.max(P.min, Math.ceil(P.max * 0.6)) : P.max, air: true };
    }
    if (S.phase === 'attack') {
      const b = bestAttack(S, pid);
      return b ? { type: 'attack', from: b.from, to: b.to, blitz: true } : { type: 'endAttack' };
    }
    if (S.phase === 'fortify') {
      const mine = owned(S, pid);
      const inner = mine.filter((t) => !enemyNeighbors(S, pid, t).length && ground(S, t) > 1).sort((x, y) => ground(S, y) - ground(S, x));
      for (const from of inner) {
        const target = mine.filter((t) => enemyNeighbors(S, pid, t).length && reachable(S, pid, from, t)).sort((x, y) => ground(S, x) - ground(S, y))[0];
        if (target) return S.real && S.tank[from] > 0 && S.inf[from] < 1 ? { type: 'fortify', from, to: target, unit: 'tank', n: ground(S, from) - 1 } : { type: 'fortify', from, to: target, unit: 'inf', n: Math.min(S.inf[from], ground(S, from) - 1) };
      }
      return { type: 'endTurn' };
    }
    return null;
  }
  function bot(S) {
    if (S.phase === 'over') return null;
    const p = cur(S);
    if (!p.bot) return null;
    const a = botAction(S);
    if (!a) return null;
    return { pid: p.id, action: a, delay: a.type === 'attack' ? 650 : a.type === 'endTurn' || a.type === 'endAttack' ? 350 : 450 };
  }

  const RISIKO = { COST, UNIT, start, act, view, bot, income, ground, validSet, findSet, reachable, seaOk, tradeValue, owned };
  if (typeof module !== 'undefined' && module.exports) module.exports = RISIKO;
  else root.DULI_RISIKO = RISIKO;
})(typeof window !== 'undefined' ? window : globalThis);
