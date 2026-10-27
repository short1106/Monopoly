// DULIDAN Kniffel – Regeln und Bots (online über js/party.js). Läuft beim Host.
(function (root) {
  const CATS = [
    ['ones', 'Einser'], ['twos', 'Zweier'], ['threes', 'Dreier'], ['fours', 'Vierer'], ['fives', 'Fünfer'], ['sixes', 'Sechser'],
    ['three', 'Dreierpasch'], ['four', 'Viererpasch'], ['full', 'Full House'], ['small', 'Kleine Straße'], ['large', 'Große Straße'], ['kniffel', 'Kniffel'], ['chance', 'Chance'],
  ];
  const UPPER = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  const HINT = { three: 'Summe aller Würfel', four: 'Summe aller Würfel', full: '25', small: '30', large: '40', kniffel: '50', chance: 'Summe' };

  function score(cat, d) {
    const cnt = [0, 0, 0, 0, 0, 0, 0];
    d.forEach((x) => cnt[x]++);
    const sum = d.reduce((a, b) => a + b, 0);
    const has = (n) => cnt.some((c) => c >= n);
    const run = (len) => { let r = 0, m = 0; for (let v = 1; v <= 6; v++) { r = cnt[v] ? r + 1 : 0; m = Math.max(m, r); } return m >= len; };
    const ui = UPPER.indexOf(cat);
    if (ui >= 0) return cnt[ui + 1] * (ui + 1);
    switch (cat) {
      case 'three': return has(3) ? sum : 0;
      case 'four': return has(4) ? sum : 0;
      case 'full': return (cnt.includes(3) && cnt.includes(2)) || has(5) ? 25 : 0;
      case 'small': return run(4) ? 30 : 0;
      case 'large': return run(5) ? 40 : 0;
      case 'kniffel': return has(5) ? 50 : 0;
      case 'chance': return sum;
    }
    return 0;
  }
  function total(sheet) {
    const up = UPPER.reduce((a, c) => a + (sheet[c] || 0), 0);
    const bonus = up >= 63 ? 35 : 0;
    const low = CATS.filter(([c]) => !UPPER.includes(c)).reduce((a, [c]) => a + (sheet[c] || 0), 0);
    return { up, bonus, low, total: up + bonus + low };
  }
  const rnd = () => 1 + Math.floor(Math.random() * 6);

  function start(players, settings, prev) {
    const order = players.slice();
    // Revanche: wer zuletzt verloren hat, fängt an
    if (prev && prev.over) order.sort((a, b) => (total(prev.sheets[a.id] || {}).total) - (total(prev.sheets[b.id] || {}).total));
    const sheets = {};
    order.forEach((p) => { sheets[p.id] = {}; });
    return { players: order.map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color })), cur: 0, dice: [1, 2, 3, 4, 5], held: [false, false, false, false, false],
      rolls: 3, rollSeq: 0, sheets, log: [], last: null, over: false, wins: prev && prev.wins ? prev.wins : {} };
  }
  function log(S, m) { S.log.push(m); if (S.log.length > 30) S.log.shift(); }
  function act(S, pid, a) {
    if (S.over) return 'Das Spiel ist vorbei.';
    const p = S.players[S.cur];
    if (p.id !== pid) return 'Du bist nicht dran.';
    if (a.type === 'roll') {
      if (S.rolls <= 0) return 'Keine Würfe mehr. Trag etwas ein.';
      S.dice = S.dice.map((v, i) => (S.held[i] && S.rolls < 3 ? v : rnd()));
      S.rolls--; S.rollSeq++;
      return null;
    }
    if (a.type === 'hold') {
      if (S.rolls === 3) return 'Erst würfeln.';
      if (S.rolls === 0) return null;
      const i = Number(a.i);
      if (i >= 0 && i < 5) S.held[i] = !S.held[i];
      return null;
    }
    if (a.type === 'pick') {
      if (S.rolls === 3) return 'Erst würfeln.';
      const sh = S.sheets[pid];
      if (!CATS.some(([c]) => c === a.cat)) return 'Gibt es nicht.';
      if (sh[a.cat] != null) return 'Schon eingetragen.';
      sh[a.cat] = score(a.cat, S.dice);
      const name = CATS.find(([c]) => c === a.cat)[1];
      S.last = { seq: S.rollSeq, pid, cat: a.cat, v: sh[a.cat] };
      log(S, `${p.name}: ${name} ${sh[a.cat] ? `+${sh[a.cat]}` : 'gestrichen'}`);
      S.held = [false, false, false, false, false]; S.rolls = 3;
      if (S.players.every((q) => CATS.every(([c]) => S.sheets[q.id][c] != null))) {
        S.over = true;
        const best = Math.max(...S.players.map((q) => total(S.sheets[q.id]).total));
        S.winners = S.players.filter((q) => total(S.sheets[q.id]).total === best).map((q) => q.id);
        S.winners.forEach((id) => { S.wins[id] = (S.wins[id] || 0) + 1; });
        return null;
      }
      S.cur = (S.cur + 1) % S.players.length;
      return null;
    }
    return 'Unbekannte Aktion.';
  }
  const view = (S) => S;

  // Bot: hält die häufigste Zahl oder eine Straße, nimmt das beste offene Feld
  function botPlan(S) {
    const p = S.players[S.cur], sh = S.sheets[p.id];
    const open = CATS.map(([c]) => c).filter((c) => sh[c] == null);
    if (S.rolls === 3) return { type: 'roll' };
    const cnt = [0, 0, 0, 0, 0, 0, 0];
    S.dice.forEach((x) => cnt[x]++);
    const ranked = open.map((c) => {
      let v = score(c, S.dice);
      if (UPPER.includes(c)) v += cnt[UPPER.indexOf(c) + 1] >= 3 ? 8 : -4;
      if (c === 'chance') v -= 12;
      if (c === 'kniffel' && v === 0) v = -3;
      return { c, v };
    }).sort((a, b) => b.v - a.v);
    const b = ranked[0];
    if (S.rolls > 0 && !(b && b.v >= 25)) {
      const vals = new Set(S.dice);
      let want;
      if ((open.includes('small') || open.includes('large')) && [1, 2, 3, 4, 5, 6].filter((v) => vals.has(v)).length >= 4) {
        const seen = new Set();
        want = S.dice.map((v) => (!seen.has(v) && seen.add(v)) ? true : false);
      } else {
        let keep = 6;
        for (let v = 6; v >= 1; v--) if (cnt[v] > cnt[keep]) keep = v;
        want = S.dice.map((v) => v === keep);
      }
      const diff = want.findIndex((w, i) => w !== S.held[i]);
      if (diff >= 0) return { type: 'hold', i: diff };
      return { type: 'roll' };
    }
    if (b.v > 0 || open.length === 1) return { type: 'pick', cat: b.c };
    const cheapest = open.slice().sort((x, y) => score(x, S.dice) - score(y, S.dice) || (x === 'ones' ? -1 : y === 'ones' ? 1 : 0))[0];
    return { type: 'pick', cat: cheapest };
  }
  function bot(S) {
    if (S.over) return null;
    const p = S.players[S.cur];
    if (!p.bot) return null;
    const a = botPlan(S);
    return { pid: p.id, action: a, delay: a.type === 'hold' ? 280 : a.type === 'roll' ? 750 : 900 };
  }

  const K = { CATS, UPPER, HINT, score, total, start, act, view, bot };
  if (typeof module !== 'undefined' && module.exports) module.exports = K;
  else root.DULI_KNIFFEL = K;
})(typeof window !== 'undefined' ? window : globalThis);
