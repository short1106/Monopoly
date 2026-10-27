// DULIDAN UNO – Regeln, Bots und Oberfläche.
// 4 Dulidan-Farben, Aussetzen, Richtungswechsel, +2, Farbwahl, +4 und die April-Karte (Farbwahl + Hand tauschen).
// +2 auf +2 und +4 auf +4 darf gestapelt werden. Wer mit einer Karte vergisst „UNO!“ zu sagen, kann erwischt werden.
(function (root) {
  const COLORS = { p: { name: 'Lila', hex: '#8122b5' }, k: { name: 'Pink', hex: '#e0249f' }, c: { name: 'Cyan', hex: '#1fb6e0' }, y: { name: 'Gelb', hex: '#f2b705' } };
  const CK = Object.keys(COLORS);
  let rng = Math.random;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function deck() {
    const d = [];
    let id = 0;
    for (const c of CK) {
      d.push({ id: id++, c, v: '0' });
      for (let n = 1; n <= 9; n++) for (let k = 0; k < 2; k++) d.push({ id: id++, c, v: String(n) });
      for (const v of ['skip', 'rev', 'd2']) for (let k = 0; k < 2; k++) d.push({ id: id++, c, v });
    }
    for (let k = 0; k < 4; k++) d.push({ id: id++, c: null, v: 'wild' });
    for (let k = 0; k < 4; k++) d.push({ id: id++, c: null, v: 'd4' });
    for (let k = 0; k < 2; k++) d.push({ id: id++, c: null, v: 'april' });
    return shuffle(d);
  }
  const points = (c) => (/^\d$/.test(c.v) ? Number(c.v) : ['skip', 'rev', 'd2'].includes(c.v) ? 20 : 50);
  const NAME = { skip: 'Aussetzen', rev: 'Richtungswechsel', d2: '+2', wild: 'Farbwahl', d4: '+4', april: 'April-Karte' };
  const cardName = (c) => (c.c ? `${COLORS[c.c].name} ${NAME[c.v] || c.v}` : NAME[c.v]);

  function log(S, m) { S.log.push(m); if (S.log.length > 30) S.log.shift(); S.logSeq++; }

  function start(players, settings, prev) {
    const S = {
      players: players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color })),
      hands: {}, draw: deck(), discard: [], color: null, dir: 1, cur: 0, pending: 0, pendType: null,
      drawn: null, exposed: {}, said: {}, winner: null, scores: (prev && prev.scores) || {}, round: (prev && prev.round || 0) + 1,
      log: [], logSeq: 0, fx: null, settings: Object.assign({ stack: true }, settings || {}),
    };
    S.players.forEach((p) => { S.hands[p.id] = S.draw.splice(0, 7); if (S.scores[p.id] == null) S.scores[p.id] = 0; });
    let top = S.draw.shift();
    while (!top.c) { S.draw.push(top); top = S.draw.shift(); }
    S.discard.push(top);
    S.color = top.c;
    S.cur = Math.floor(rng() * S.players.length);
    log(S, `Runde ${S.round}! Erste Karte: ${cardName(top)}. ${S.players[S.cur].name} fängt an.`);
    if (top.v === 'skip') { log(S, `${S.players[S.cur].name} muss gleich aussetzen.`); advance(S, 1); }
    if (top.v === 'rev') S.dir = -1;
    if (top.v === 'd2') { S.pending = 2; S.pendType = 'd2'; }
    return S;
  }
  const curP = (S) => S.players[S.cur];
  const top = (S) => S.discard[S.discard.length - 1];
  const idx = (S, pid) => S.players.findIndex((p) => p.id === pid);
  function nextIdx(S, steps = 1) { const n = S.players.length; return (((S.cur + S.dir * steps) % n) + n) % n; }
  function advance(S, steps = 1) { S.cur = nextIdx(S, steps); S.drawn = null; }
  function takeCards(S, pid, n) {
    const got = [];
    for (let k = 0; k < n; k++) {
      if (!S.draw.length) {
        const t = S.discard.pop();
        S.draw = shuffle(S.discard);
        S.discard = [t];
        if (!S.draw.length) break;
      }
      got.push(S.draw.shift());
    }
    S.hands[pid].push(...got);
    if (S.hands[pid].length > 1) { delete S.exposed[pid]; delete S.said[pid]; }
    return got;
  }
  function playable(S, c) {
    if (S.pending) return S.settings.stack !== false && c.v === S.pendType;
    if (!c.c) return true;
    return c.c === S.color || c.v === top(S).v;
  }

  function act(S, pid, a) {
    if (S.winner) return 'Die Runde ist vorbei.';
    const me = S.players[idx(S, pid)];
    if (!me) return 'Du spielst nicht mit.';
    if (a.type === 'catch') {
      const t = S.players.find((p) => p.id === a.target);
      if (!t || !S.exposed[t.id] || t.id === pid) return 'Da gibt es nichts zu erwischen.';
      delete S.exposed[t.id];
      takeCards(S, t.id, 2);
      log(S, `🚨 ${me.name} erwischt ${t.name} ohne UNO! ${t.name} zieht 2 Karten.`);
      S.fx = { seq: (S.fx ? S.fx.seq : 0) + 1, kind: 'catch', pid: t.id };
      return null;
    }
    if (a.type === 'uno') {
      if (S.hands[pid].length > 2) return 'UNO sagt man erst bei 2 oder 1 Karten.';
      if (S.hands[pid].length === 1 && S.exposed[pid]) { delete S.exposed[pid]; S.said[pid] = true; log(S, `📣 ${me.name}: UNO! (gerade noch)`); return null; }
      S.said[pid] = true;
      log(S, `📣 ${me.name}: UNO!`);
      return null;
    }
    if (curP(S).id !== pid) return 'Du bist nicht dran.';
    if (a.type === 'draw') {
      if (S.drawn != null) return 'Du hast schon gezogen. Spiel die Karte oder passe.';
      if (S.pending) {
        const n = S.pending;
        takeCards(S, pid, n);
        log(S, `${me.name} zieht ${n} Karten.`);
        S.pending = 0; S.pendType = null;
        S.fx = { seq: (S.fx ? S.fx.seq : 0) + 1, kind: 'draw', pid, n };
        advance(S);
        return null;
      }
      const [c] = takeCards(S, pid, 1);
      S.fx = { seq: (S.fx ? S.fx.seq : 0) + 1, kind: 'draw', pid, n: 1 };
      if (c && playable(S, c)) { S.drawn = c.id; log(S, `${me.name} zieht eine Karte.`); return null; }
      log(S, `${me.name} zieht eine Karte und passt.`);
      advance(S);
      return null;
    }
    if (a.type === 'pass') {
      if (S.drawn == null) return 'Erst ziehen, dann passen.';
      log(S, `${me.name} passt.`);
      advance(S);
      return null;
    }
    if (a.type !== 'play') return 'Unbekannte Aktion.';
    const hand = S.hands[pid];
    const k = hand.findIndex((c) => c.id === Number(a.id));
    if (k < 0) return 'Die Karte hast du nicht.';
    const c = hand[k];
    if (S.drawn != null && c.id !== S.drawn) return 'Du darfst nur die gezogene Karte spielen.';
    if (!playable(S, c)) return S.pending ? `Du musst ${S.pending} ziehen oder eine ${NAME[S.pendType]} drauflegen.` : 'Die Karte passt nicht.';
    if (!c.c && !COLORS[a.color]) return 'Wähle eine Farbe.';
    let target = null;
    if (c.v === 'april') {
      target = S.players.find((p) => p.id === a.target && p.id !== pid);
      if (!target) return 'Wähle, mit wem du die Hand tauschst.';
    }
    if (a.uno) S.said[pid] = true;
    hand.splice(k, 1);
    S.discard.push(c);
    S.color = c.c || a.color;
    S.drawn = null;
    S.fx = { seq: (S.fx ? S.fx.seq : 0) + 1, kind: 'play', pid, card: c };
    log(S, `${me.name} spielt ${cardName(c)}${c.c ? '' : ` → ${COLORS[S.color].name}`}.`);
    if (!hand.length) return roundOver(S, me);
    if (c.v === 'april') {
      const mine = S.hands[pid];
      S.hands[pid] = S.hands[target.id];
      S.hands[target.id] = mine;
      log(S, `💖 April tauscht die Hände: ${me.name} ↔ ${target.name}.`);
      [pid, target.id].forEach((x) => { if (S.hands[x].length !== 1) { delete S.exposed[x]; delete S.said[x]; } });
    }
    const n = S.hands[pid].length;
    if (n === 1 && !S.said[pid]) { S.exposed[pid] = true; }
    if (n > 1) delete S.said[pid];
    if (c.v === 'skip') { log(S, `${S.players[nextIdx(S)].name} setzt aus.`); advance(S, 2); return null; }
    if (c.v === 'rev') {
      S.dir *= -1;
      log(S, '🔁 Richtungswechsel!');
      advance(S, S.players.length === 2 ? 2 : 1);
      return null;
    }
    if (c.v === 'd2' || c.v === 'd4') { S.pending += c.v === 'd2' ? 2 : 4; S.pendType = c.v; }
    advance(S);
    return null;
  }
  function roundOver(S, w) {
    let pts = 0;
    S.players.forEach((p) => { if (p.id !== w.id) pts += S.hands[p.id].reduce((a, c) => a + points(c), 0); });
    S.scores[w.id] = (S.scores[w.id] || 0) + pts;
    S.winner = w.id;
    S.pending = 0;
    log(S, `🏆 ${w.name} legt die letzte Karte und gewinnt Runde ${S.round}! +${pts} Punkte.`);
    return null;
  }

  // Jede Person sieht nur ihre eigene Hand
  function view(S, pid) {
    const V = Object.assign({}, S);
    V.hands = {};
    V.counts = {};
    S.players.forEach((p) => { V.counts[p.id] = S.hands[p.id].length; });
    V.hand = S.hands[pid] || [];
    if (S.winner) V.reveal = S.hands;
    V.drawCount = S.draw.length;
    delete V.draw;
    V.top = top(S);
    V.discard = S.discard.slice(-4);
    return V;
  }

  function bot(S) {
    if (S.winner) return null;
    // Bots erwischen andere ohne UNO
    const ex = Object.keys(S.exposed).find((id) => S.exposed[id]);
    if (ex) {
      const catcher = S.players.find((p) => p.bot && p.id !== ex);
      if (catcher && rng() < 0.6) return { pid: catcher.id, action: { type: 'catch', target: ex }, delay: 1400 };
    }
    const p = curP(S);
    if (!p.bot) return null;
    const go = (action) => ({ pid: p.id, action });
    const hand = S.hands[p.id];
    let opts = hand.filter((c) => playable(S, c));
    if (S.drawn != null) opts = opts.filter((c) => c.id === S.drawn);
    if (!opts.length) return go({ type: S.drawn != null ? 'pass' : 'draw' });
    const next = S.players[nextIdx(S)];
    const danger = S.hands[next.id].length <= 2;
    const score = (c) => (c.v === 'april' ? (hand.length > Math.min(...S.players.filter((q) => q.id !== p.id).map((q) => S.hands[q.id].length)) + 2 ? 9 : -5)
      : c.v === 'd4' ? (danger ? 8 : 1) : c.v === 'wild' ? 0 : ['d2', 'skip'].includes(c.v) ? (danger ? 7 : 4) : c.v === 'rev' ? 3 : 2) + rng();
    const c = opts.sort((a, b) => score(b) - score(a))[0];
    const counts = {};
    hand.forEach((h) => { if (h.c && h.id !== c.id) counts[h.c] = (counts[h.c] || 0) + 1; });
    const color = c.c ? undefined : (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [CK[Math.floor(rng() * 4)]])[0];
    const others = S.players.filter((q) => q.id !== p.id);
    const target = c.v === 'april' ? others.sort((a, b) => S.hands[a.id].length - S.hands[b.id].length)[0].id : undefined;
    return go({ type: 'play', id: c.id, color, target, uno: hand.length === 2 && rng() < 0.85 });
  }

  const ENGINE = { COLORS, NAME, deck, start, act, view, bot, playable, cardName, setRng: (f) => { rng = f; } };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENGINE; return; }
  root.DULI_UNO = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
