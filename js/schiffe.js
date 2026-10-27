// DULIDAN SCHIFFE VERSENKEN – Regeln und Bot.
// 10×10, fünf Schiffe (5, 4, 3, 3, 2), Treffer = nochmal schießen. Pro Spiel einmal Radar (3×3 zählen)
// und einmal Luftschlag (3 Felder in einer Reihe).
(function (root) {
  const N = 10;
  const SHIPS = [
    { n: 'Flugzeugträger', len: 5 }, { n: 'Schlachtschiff', len: 4 }, { n: 'Kreuzer', len: 3 }, { n: 'U-Boot', len: 3 }, { n: 'Schnellboot', len: 2 },
  ];
  let rng = Math.random;
  const rc = (i) => [Math.floor(i / N), i % N];
  const coord = (i) => `${'ABCDEFGHIJ'[i % N]}${Math.floor(i / N) + 1}`;
  const around = (i) => {
    const [r, c] = rc(i), out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
    }
    return out;
  };

  function validFleet(fleet, noTouch) {
    if (!Array.isArray(fleet) || fleet.length !== SHIPS.length) return 'Alle fünf Schiffe setzen.';
    const used = new Set();
    for (let s = 0; s < SHIPS.length; s++) {
      const cells = (fleet[s] || []).map(Number);
      if (cells.length !== SHIPS[s].len) return `${SHIPS[s].n} hat die falsche Länge.`;
      if (cells.some((i) => !(i >= 0 && i < N * N))) return 'Schiff außerhalb des Meeres.';
      const rows = cells.map((i) => rc(i)[0]), cols = cells.map((i) => rc(i)[1]);
      const sorted = cells.slice().sort((a, b) => a - b);
      const horiz = rows.every((r) => r === rows[0]) && sorted.every((v, k) => k === 0 || v === sorted[k - 1] + 1);
      const vert = cols.every((c) => c === cols[0]) && sorted.every((v, k) => k === 0 || v === sorted[k - 1] + N);
      if (!horiz && !vert) return `${SHIPS[s].n} muss gerade liegen.`;
      for (const i of cells) if (used.has(i)) return 'Schiffe dürfen sich nicht überlappen.';
      if (noTouch) for (const i of cells) for (const j of around(i)) if (used.has(j)) return 'Schiffe dürfen sich nicht berühren.';
      cells.forEach((i) => used.add(i));
    }
    return null;
  }
  function randomFleet(noTouch) {
    for (let tries = 0; tries < 500; tries++) {
      const fleet = [];
      let ok = true;
      for (const sh of SHIPS) {
        let placed = false;
        for (let t = 0; t < 200 && !placed; t++) {
          const h = rng() < 0.5;
          const r = Math.floor(rng() * (h ? N : N - sh.len + 1)), c = Math.floor(rng() * (h ? N - sh.len + 1 : N));
          const cells = Array.from({ length: sh.len }, (_, k) => (h ? r * N + c + k : (r + k) * N + c));
          const test = fleet.concat([cells]);
          if (partialOk(test, noTouch)) { fleet.push(cells); placed = true; }
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return fleet;
    }
    return null;
  }
  function partialOk(fleet, noTouch) {
    const used = new Set();
    for (const cells of fleet) {
      for (const i of cells) if (used.has(i)) return false;
      if (noTouch) for (const i of cells) for (const j of around(i)) if (used.has(j)) return false;
      cells.forEach((i) => used.add(i));
    }
    return true;
  }

  function start(players, settings) {
    const st = Object.assign({ again: true, noTouch: true, specials: true }, settings || {});
    const S = {
      players: players.slice(0, 2).map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color })),
      boards: {}, phase: 'place', cur: 0, winner: null, last: null, radar: {}, special: {}, log: [], settings: st, turns: 0,
    };
    S.players.forEach((p) => {
      S.boards[p.id] = { ships: null, shots: {} };
      S.radar[p.id] = [];
      S.special[p.id] = { radar: st.specials ? 1 : 0, air: st.specials ? 1 : 0 };
      if (p.bot) S.boards[p.id].ships = randomFleet(st.noTouch).map((cells, k) => ({ n: SHIPS[k].n, cells }));
    });
    S.cur = Math.floor(rng() * 2);
    S.log.push('Setzt eure Flotten! Sobald beide bereit sind, geht die Seeschlacht los.');
    return S;
  }
  const opp = (S, pid) => S.players.find((p) => p.id !== pid);
  const sunk = (b, ship) => ship.cells.every((i) => b.shots[i] === 'hit');
  function log(S, m) { S.log.push(m); if (S.log.length > 20) S.log.shift(); }
  function fire(S, pid, i) {
    const o = opp(S, pid), b = S.boards[o.id];
    if (b.shots[i]) return null;
    const ship = b.ships.find((s) => s.cells.includes(i));
    b.shots[i] = ship ? 'hit' : 'miss';
    return { i, hit: !!ship, sunk: ship && sunk(b, ship) ? ship.n : null };
  }
  function afterShots(S, pid, res, keepTurn) {
    const o = opp(S, pid), b = S.boards[o.id], me = S.players.find((p) => p.id === pid);
    S.last = { seq: (S.last ? S.last.seq : 0) + 1, by: pid, res };
    res.forEach((r) => { if (r.sunk) log(S, `💥 ${me.name} versenkt das ${r.sunk} von ${o.name}!`); });
    if (b.ships.every((s) => sunk(b, s))) {
      S.winner = pid; S.phase = 'over';
      log(S, `🏆 ${me.name} hat die ganze Flotte von ${o.name} versenkt!`);
      return;
    }
    if (!keepTurn) S.cur = S.players.indexOf(o);
  }

  function act(S, pid, a) {
    const me = S.players.find((p) => p.id === pid);
    if (!me) return 'Du spielst nicht mit.';
    if (a.type === 'place') {
      if (S.phase !== 'place') return 'Die Schlacht läuft schon.';
      if (S.boards[pid].ships) return 'Deine Flotte steht schon.';
      const e = validFleet(a.fleet, S.settings.noTouch);
      if (e) return e;
      S.boards[pid].ships = a.fleet.map((cells, k) => ({ n: SHIPS[k].n, cells: cells.map(Number) }));
      log(S, `⚓ ${me.name} ist bereit.`);
      if (S.players.every((p) => S.boards[p.id].ships)) { S.phase = 'battle'; log(S, `Feuer frei! ${S.players[S.cur].name} beginnt.`); }
      return null;
    }
    if (S.phase !== 'battle') return 'Gerade wird nicht geschossen.';
    if (S.players[S.cur].id !== pid) return 'Du bist nicht dran.';
    const i = Number(a.cell);
    if (!(i >= 0 && i < N * N)) return 'Ungültiges Feld.';
    const ob = S.boards[opp(S, pid).id];
    S.turns++;
    if (a.type === 'shoot') {
      if (ob.shots[i]) return 'Da hast du schon hingeschossen.';
      const r = fire(S, pid, i);
      log(S, `${me.name} schießt auf ${coord(i)}: ${r.hit ? 'TREFFER!' : 'Wasser.'}`);
      afterShots(S, pid, [r], r.hit && S.settings.again);
      return null;
    }
    if (a.type === 'radar') {
      if (!S.special[pid].radar) return 'Dein Radar ist verbraucht.';
      S.special[pid].radar--;
      const area = around(i);
      const n = area.filter((j) => !ob.shots[j] && ob.ships.some((s) => s.cells.includes(j))).length;
      S.radar[pid].push({ i, n });
      log(S, `📡 ${me.name} scannt um ${coord(i)}: ${n} Schiffsteil${n === 1 ? '' : 'e'} entdeckt.`);
      S.last = { seq: (S.last ? S.last.seq : 0) + 1, by: pid, res: [], radar: i };
      S.cur = S.players.indexOf(opp(S, pid));
      return null;
    }
    if (a.type === 'air') {
      if (!S.special[pid].air) return 'Dein Luftschlag ist verbraucht.';
      const [r0, c0] = rc(i), h = a.dir !== 'v';
      const cells = [0, 1, 2].map((k) => (h ? [r0, c0 + k] : [r0 + k, c0])).filter(([r, c]) => r < N && c < N).map(([r, c]) => r * N + c);
      S.special[pid].air--;
      const res = cells.map((j) => fire(S, pid, j)).filter(Boolean);
      log(S, `✈️ ${me.name} fliegt einen Luftschlag auf ${coord(i)}: ${res.filter((x) => x.hit).length} Treffer.`);
      afterShots(S, pid, res, false);
      return null;
    }
    return 'Unbekannte Aktion.';
  }

  // Gegnerische Schiffe bleiben verdeckt, bis sie versenkt sind (oder das Spiel vorbei ist)
  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    S.players.forEach((p) => {
      if (p.id === pid || S.phase === 'over') return;
      const b = S.boards[p.id];
      V.boards[p.id] = { shots: b.shots, ready: !!b.ships, ships: b.ships ? b.ships.filter((s) => sunk(b, s)) : null, left: b.ships ? b.ships.filter((s) => !sunk(b, s)).map((s) => s.n) : null };
      V.radar[p.id] = [];
    });
    return V;
  }

  function bot(S) {
    if (S.phase !== 'battle') return null;
    const p = S.players[S.cur];
    if (!p.bot) return null;
    const o = opp(S, p.id), b = S.boards[o.id];
    const open = (i) => i >= 0 && i < N * N && !b.shots[i];
    const sunkCells = new Set(b.ships.filter((s) => sunk(b, s)).flatMap((s) => s.cells));
    const hits = Object.keys(b.shots).map(Number).filter((i) => b.shots[i] === 'hit' && !sunkCells.has(i));
    const go = (action) => ({ pid: p.id, action, delay: 900 });
    if (hits.length) {
      let cand = [];
      if (hits.length >= 2) {
        const rows = new Set(hits.map((i) => rc(i)[0])), cols = new Set(hits.map((i) => rc(i)[1]));
        const s = hits.slice().sort((a, b2) => a - b2);
        if (rows.size === 1) cand = [s[0] - 1, s[s.length - 1] + 1].filter((i) => rc(i)[0] === rc(s[0])[0]);
        else if (cols.size === 1) cand = [s[0] - N, s[s.length - 1] + N];
      }
      cand = cand.filter(open);
      if (!cand.length) hits.forEach((i) => { const [r, c] = rc(i); [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => { if (rr >= 0 && rr < N && cc >= 0 && cc < N) cand.push(rr * N + cc); }); });
      cand = cand.filter(open);
      if (cand.length) return go({ type: 'shoot', cell: cand[Math.floor(rng() * cand.length)] });
    }
    if (S.special[p.id].air && S.turns > 8 && rng() < 0.25) {
      const starts = [];
      for (let i = 0; i < N * N; i++) if (rc(i)[1] <= N - 3 && [i, i + 1, i + 2].every(open)) starts.push(i);
      if (starts.length) return go({ type: 'air', cell: starts[Math.floor(rng() * starts.length)], dir: 'h' });
    }
    const all = [];
    for (let i = 0; i < N * N; i++) if (open(i)) all.push(i);
    const parity = all.filter((i) => (rc(i)[0] + rc(i)[1]) % 2 === 0);
    const pool = parity.length ? parity : all;
    return go({ type: 'shoot', cell: pool[Math.floor(rng() * pool.length)] });
  }

  const ENGINE = { N, SHIPS, coord, validFleet, randomFleet, start, act, view, bot, setRng: (f) => { rng = f; } };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ENGINE; return; }
  root.DULI_SCHIFFE = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
