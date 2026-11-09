// DULIDAN SCHACH – Regeln, Modi und Bot (läuft beim Host, online über js/party.js).
// Modi: Klassisch, Nur Pferde, Atomschach, Enten-Schach, Nebel des Krieges, Doppelzug, König des Hügels, Drei-Schach, Fischer-Random.
// Goofy-Schalter: alle paar Züge greift April ins Brett ein (Pferde-Invasion, Enten, Ohio-Spiegelung, Aura-Steuer …).
// Normale Modi nutzen echte Schach-Regeln (Schach, Matt, Patt). Chaos-Modi und Goofy spielen mit „Königsschlag“:
// Schach muss man nicht beachten, wer den König schlägt, gewinnt.
(function (root) {
  const VARIANTS = {
    classic: { name: 'Klassisch', text: 'Ganz normales Schach. Schach, Matt, Patt, Rochade, en passant.' },
    pferde: { name: 'NUR PFERDE', text: 'Jede Seite hat einen König und 15 Pferde. Sonst nichts. Gallopp.' },
    atom: { name: 'Atomschach', text: 'Jeder Schlag explodiert: Alle Figuren rundherum (außer Bauern) fliegen mit vom Brett. Sprenge den König.', kc: true },
    ente: { name: 'Enten-Schach', text: 'Nach jedem Zug setzt du die Ente auf ein freies Feld. Die Ente blockiert alles und kann nicht geschlagen werden. Schlag den König.', kc: true },
    nebel: { name: 'Nebel des Krieges', text: 'Du siehst nur deine Figuren und die Felder, die sie erreichen. Schlag den König.', kc: true },
    doppel: { name: 'Doppelzug', text: 'Jede Seite zieht zweimal hintereinander (Weiß beginnt mit einem Zug). Schlag den König.', kc: true },
    huegel: { name: 'König des Hügels', text: 'Normales Schach – aber wer seinen König sicher auf eins der vier Mittelfelder bringt, gewinnt sofort.' },
    dreischach: { name: 'Drei-Schach', text: 'Normales Schach – wer dreimal Schach gibt, gewinnt.' },
    fischer: { name: 'Fischer-Random', text: 'Die Figuren der Grundreihe stehen zufällig (für beide gleich). Ohne Rochade.' },
  };
  const VAL = { p: 100, n: 310, b: 330, r: 500, q: 900, k: 20000, d: 0 };
  const NAME = { k: 'König', q: 'Dame', r: 'Turm', b: 'Läufer', n: 'Pferd', p: 'Bauer', d: 'Ente' };
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const D = {
    n: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
    k: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    b: [[-1, -1], [-1, 1], [1, -1], [1, 1]], r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  };
  D.q = D.b.concat(D.r);
  const opp = (c) => (c === 'w' ? 'b' : 'w');
  const sqName = (s) => 'abcdefgh'[s & 7] + (8 - (s >> 3));
  const CENTER = [27, 28, 35, 36];
  const rnd = (n) => Math.floor(Math.random() * n);

  // ---------- Startstellung ----------
  function setup(v) {
    const b = new Array(64).fill(null);
    let back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    if (v === 'pferde') back = ['n', 'n', 'n', 'n', 'k', 'n', 'n', 'n'];
    if (v === 'fischer') {
      // Läufer auf verschiedenen Farben, König zwischen den Türmen
      for (;;) {
        const a = new Array(8).fill(null);
        a[rnd(4) * 2] = 'b'; a[rnd(4) * 2 + 1] = 'b';
        const free = () => a.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
        let f = free(); a[f[rnd(f.length)]] = 'q';
        f = free(); a[f[rnd(f.length)]] = 'n'; f = free(); a[f[rnd(f.length)]] = 'n';
        f = free(); a[f[0]] = 'r'; a[f[1]] = 'k'; a[f[2]] = 'r';
        back = a; break;
      }
    }
    for (let f = 0; f < 8; f++) {
      b[f] = { t: back[f], c: 'b' }; b[56 + f] = { t: back[f], c: 'w' };
      b[8 + f] = { t: v === 'pferde' ? 'n' : 'p', c: 'b' }; b[48 + f] = { t: v === 'pferde' ? 'n' : 'p', c: 'w' };
    }
    const cast = v === 'classic' || v === 'huegel' || v === 'dreischach' || v === 'atom' || v === 'ente' || v === 'nebel' || v === 'doppel' ? { wK: 1, wQ: 1, bK: 1, bQ: 1 } : {};
    return { b, ep: null, cast, v, hm: 0 };
  }

  // ---------- Züge ----------
  function pseudo(st, c) {
    const B = st.b, out = [];
    const add = (f, t, x, extra) => out.push(Object.assign({ f, t, x: !!x }, extra || {}));
    for (let s = 0; s < 64; s++) {
      const P = B[s];
      if (!P || P.c !== c) continue;
      const r = s >> 3, f = s & 7;
      if (P.t === 'p') {
        const d = c === 'w' ? -1 : 1, start = c === 'w' ? 6 : 1, last = c === 'w' ? 0 : 7, r1 = r + d;
        if (r1 < 0 || r1 > 7) continue;
        const t = r1 * 8 + f;
        if (!B[t]) {
          add(s, t, false, r1 === last ? { promo: 'q' } : null);
          const t2 = (r + 2 * d) * 8 + f;
          if (r === start && !B[t2]) add(s, t2, false, { dbl: true });
        }
        for (const df of [-1, 1]) {
          const ff = f + df;
          if (ff < 0 || ff > 7) continue;
          const tc = r1 * 8 + ff, Q = B[tc];
          if (Q && Q.c && Q.c !== c) add(s, tc, true, r1 === last ? { promo: 'q' } : null);
          else if (st.ep === tc && !Q) add(s, tc, true, { ep: true });
        }
      } else if (P.t === 'n' || P.t === 'k') {
        for (const [dr, df] of D[P.t]) {
          const rr = r + dr, ff = f + df;
          if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
          const t = rr * 8 + ff, Q = B[t];
          if (!Q) add(s, t, false); else if (Q.c && Q.c !== c && !(st.v === 'atom' && P.t === 'k')) add(s, t, true);
        }
      } else {
        for (const [dr, df] of D[P.t]) {
          let rr = r + dr, ff = f + df;
          while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const t = rr * 8 + ff, Q = B[t];
            if (!Q) add(s, t, false);
            else { if (Q.c && Q.c !== c) add(s, t, true); break; }
            rr += dr; ff += df;
          }
        }
      }
    }
    // Rochade (nur Standard-Startstellung)
    const home = c === 'w' ? 60 : 4, K = B[home];
    if (K && K.t === 'k' && K.c === c) {
      const R = (sq) => B[sq] && B[sq].t === 'r' && B[sq].c === c;
      if (st.cast[`${c}K`] && R(home + 3) && !B[home + 1] && !B[home + 2]) add(home, home + 2, false, { castle: true, rf: home + 3, rt: home + 1 });
      if (st.cast[`${c}Q`] && R(home - 4) && !B[home - 1] && !B[home - 2] && !B[home - 3]) add(home, home - 2, false, { castle: true, rf: home - 4, rt: home - 1 });
    }
    return out;
  }
  function attacked(st, sq, by) {
    const B = st.b, r = sq >> 3, f = sq & 7;
    const at = (rr, ff) => (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 ? B[rr * 8 + ff] : undefined);
    for (const [dr, df] of D.n) { const P = at(r + dr, f + df); if (P && P.c === by && P.t === 'n') return true; }
    for (const [dr, df] of D.k) { const P = at(r + dr, f + df); if (P && P.c === by && P.t === 'k') return true; }
    const pd = by === 'w' ? 1 : -1;
    for (const df of [-1, 1]) { const P = at(r + pd, f + df); if (P && P.c === by && P.t === 'p') return true; }
    for (const [dirs, kinds] of [[D.b, 'bq'], [D.r, 'rq']]) {
      for (const [dr, df] of dirs) {
        let rr = r + dr, ff = f + df;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const P = B[rr * 8 + ff];
          if (P) { if (P.c === by && kinds.includes(P.t)) return true; break; }
          rr += dr; ff += df;
        }
      }
    }
    return false;
  }
  const kingSq = (st, c) => st.b.findIndex((P) => P && P.t === 'k' && P.c === c);
  const inCheck = (st, c) => { const k = kingSq(st, c); return k >= 0 && attacked(st, k, opp(c)); };

  function apply(st, m) {
    const b = st.b.slice(), P = b[m.f], cap = b[m.t];
    const n = { b, ep: null, cast: Object.assign({}, st.cast), v: st.v, hm: st.hm + 1, boom: st.boom };
    b[m.t] = P; b[m.f] = null;
    let x = !!cap;
    if (m.ep) { b[m.t + (P.c === 'w' ? 8 : -8)] = null; x = true; }
    if (m.promo) b[m.t] = { t: m.promo, c: P.c };
    if (m.dbl) n.ep = (m.f + m.t) / 2;
    if (m.castle) { b[m.rt] = b[m.rf]; b[m.rf] = null; }
    if (P.t === 'k') { delete n.cast[`${P.c}K`]; delete n.cast[`${P.c}Q`]; }
    [[63, 'wK'], [56, 'wQ'], [7, 'bK'], [0, 'bQ']].forEach(([sq, k]) => { if (m.f === sq || m.t === sq) delete n.cast[k]; });
    if (P.t === 'p' || x) n.hm = 0;
    // Atom: Explosion
    if (x && (st.v === 'atom' || st.boom)) {
      b[m.t] = null;
      const r = m.t >> 3, f = m.t & 7;
      for (const [dr, df] of D.k) { const rr = r + dr, ff = f + df; if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue; const Q = b[rr * 8 + ff]; if (Q && Q.t !== 'p' && Q.t !== 'd') b[rr * 8 + ff] = null; }
      n.exploded = true; n.boom = false;
    }
    return n;
  }
  // Legale Züge: mit echten Regeln oder im Königsschlag-Modus
  function moves(st, c, kc) {
    let ms = pseudo(st, c);
    if (kc) {
      // Atom: den eigenen König sprengen ist verboten
      if (st.v === 'atom' || st.boom) ms = ms.filter((m) => !m.x || kingSq(apply(st, m), c) >= 0);
      return ms;
    }
    return ms.filter((m) => {
      if (m.castle) {
        if (inCheck(st, c)) return false;
        const mid = (m.f + m.t) / 2;
        if (attacked(st, mid, opp(c))) return false;
      }
      return !inCheck(apply(st, m), c);
    });
  }

  // ---------- Spiel ----------
  function start(players, settings, prev) {
    const set = Object.assign({ variant: 'classic', goofy: false, clock: 0, level: 2 }, settings || {});
    const v = VARIANTS[set.variant] ? set.variant : 'classic';
    let ps = players.slice(0, 2).map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color }));
    // Revanche: Farben tauschen
    let white = 0;
    if (prev && prev.players && prev.players.length === 2) white = prev.players.findIndex((p) => p.side === 'b');
    if (white < 0) white = 0;
    ps = ps.map((p, i) => Object.assign(p, { side: ps.length === 1 ? 'w' : i === white ? 'w' : 'b' }));
    const st = setup(v);
    const S = {
      players: ps, v, goofy: !!set.goofy, kc: !!(VARIANTS[v].kc || set.goofy), level: Math.max(1, Math.min(3, Number(set.level) || 2)),
      st, turn: 'w', phase: 'move', duck: null, left: 1, ply: 0, checks: { w: 0, b: 0 }, hist: [], last: null, lost: { w: [], b: [] },
      over: false, winner: null, reason: '', fx: null, fxSeq: 0, event: null, say: '', wins: prev && prev.wins ? prev.wins : {},
      clock: set.clock ? { w: set.clock * 60000, b: set.clock * 60000, at: Date.now() } : null,
    };
    S.say = v === 'pferde' ? 'April: Nur Pferde. Ich hab gesagt, ich will Pferde. Viel Spaß.' : S.goofy ? 'April: GOOFY-SCHACH. Ich greife ab und zu ein. Ihr könnt nichts dagegen tun.' : `April: ${VARIANTS[v].name}. Möge der Bessere gewinnen. Oder der mit mehr Aura.`;
    return S;
  }
  const sideOf = (S, pid) => (S.players.find((p) => p.id === pid) || {}).side;
  const nowMs = () => Date.now();
  function tickClock(S) {
    if (!S.clock || S.over) return;
    const t = nowMs();
    S.clock[S.turn] -= t - S.clock.at; S.clock.at = t;
  }
  function finish(S, winner, reason) {
    S.over = true; S.phase = 'over'; S.winner = winner; S.reason = reason;
    if (winner) { const p = S.players.find((x) => x.side === winner); if (p) S.wins[p.id] = (S.wins[p.id] || 0) + 1; }
  }
  function material(st, c) { return st.b.reduce((s, P) => s + (P && P.c === c && P.t !== 'k' ? VAL[P.t] : 0), 0); }

  // April greift ein (Goofy): alle 6 Halbzüge ein Ereignis
  const GOOFY = [
    ['queen', 'April befördert eine zufällige Figur zur Dame. Warum? Aura.'],
    ['horses', 'PFERDE-INVASION: Alle Bauern von {side} werden zu Pferden.'],
    ['duck', 'Eine Ente landet auf dem Brett. Sie bleibt. Sie blockiert. Sie urteilt.'],
    ['swap', 'Ohio-Moment: Zwei Figuren tauschen einfach die Plätze.'],
    ['mirror', 'Das Brett wurde gespiegelt. Niemand weiß, warum. Ich auch nicht.'],
    ['tax', 'Aura-Steuer: Wer vorne liegt, muss eine Figur abgeben.'],
    ['pawn', 'Gnadenbauer: Wer hinten liegt, bekommt einen Bauern geschenkt.'],
    ['boom', 'ATOM-ALARM: Der nächste Schlag explodiert.'],
    ['chicken', 'Ein Pferd hat sich in eine Ente verwandelt. Quack.'],
  ];
  function goofyEvent(S) {
    const st = S.st, B = st.b, list = (pred) => B.map((P, i) => (pred(P, i) ? i : -1)).filter((i) => i >= 0);
    const pickOne = (a) => a[rnd(a.length)];
    let tries = 0;
    while (tries++ < 6) {
      const [id, text] = pickOne(GOOFY);
      const side = Math.random() < 0.5 ? 'w' : 'b';
      if (id === 'queen') { const c = list((P) => P && P.c && P.t !== 'k' && P.t !== 'q'); if (!c.length) continue; const i = pickOne(c); B[i] = { t: 'q', c: B[i].c }; S.event = { id, text, sq: [i] }; }
      else if (id === 'horses') { const c = list((P) => P && P.t === 'p' && P.c === side); if (!c.length) continue; c.forEach((i) => { B[i] = { t: 'n', c: side }; }); S.event = { id, text: text.replace('{side}', side === 'w' ? 'Weiß' : 'Schwarz'), sq: c }; }
      else if (id === 'duck') { const c = list((P, i) => !P && (i >> 3) >= 2 && (i >> 3) <= 5); if (!c.length) continue; const i = pickOne(c); B[i] = { t: 'd' }; S.event = { id, text, sq: [i] }; }
      else if (id === 'swap') { const c = list((P) => P && P.c && P.t !== 'k'); if (c.length < 2) continue; const a = pickOne(c); let b2 = pickOne(c); if (a === b2) continue; [B[a], B[b2]] = [B[b2], B[a]]; S.event = { id, text, sq: [a, b2] }; }
      else if (id === 'mirror') { for (let r = 0; r < 8; r++) for (let f = 0; f < 4; f++) { const a = r * 8 + f, b2 = r * 8 + 7 - f; [B[a], B[b2]] = [B[b2], B[a]]; } st.cast = {}; st.ep = null; if (S.duck != null) S.duck = (S.duck & ~7) + 7 - (S.duck & 7); S.event = { id, text, sq: [] }; }
      else if (id === 'tax') { const ahead = material(st, 'w') > material(st, 'b') ? 'w' : material(st, 'b') > material(st, 'w') ? 'b' : null; if (!ahead) continue; const c = list((P) => P && P.c === ahead && (P.t === 'p' || P.t === 'n' || P.t === 'b')); if (!c.length) continue; const i = pickOne(c); S.lost[ahead].push(B[i].t); B[i] = null; S.event = { id, text: `${text} (${ahead === 'w' ? 'Weiß' : 'Schwarz'})`, sq: [i] }; }
      else if (id === 'pawn') { const behind = material(st, 'w') < material(st, 'b') ? 'w' : material(st, 'b') < material(st, 'w') ? 'b' : side; const rows = behind === 'w' ? [5, 6] : [1, 2]; const c = list((P, i) => !P && rows.includes(i >> 3)); if (!c.length) continue; const i = pickOne(c); B[i] = { t: 'p', c: behind }; S.event = { id, text: `${text} (${behind === 'w' ? 'Weiß' : 'Schwarz'})`, sq: [i] }; }
      else if (id === 'boom') { st.boom = true; S.event = { id, text, sq: [] }; }
      else if (id === 'chicken') { const c = list((P) => P && P.t === 'n'); if (!c.length) continue; const i = pickOne(c); B[i] = { t: 'd' }; S.event = { id, text, sq: [i] }; }
      S.event.seq = (S.event.seq || 0) + S.ply;
      S.say = `April: ${S.event.text}`;
      return;
    }
  }

  function afterMove(S, mover) {
    const st = S.st, foe = opp(mover);
    // Königsschlag
    if (kingSq(st, foe) < 0) return finish(S, mover, S.v === 'atom' || st.exploded ? 'König in die Luft gejagt' : 'König geschlagen');
    if (kingSq(st, mover) < 0) return finish(S, foe, 'eigener König explodiert');
    if (S.v === 'huegel' && CENTER.includes(kingSq(st, mover))) return finish(S, mover, 'König auf dem Hügel');
    if (S.v === 'dreischach' && inCheck(st, foe)) { S.checks[mover]++; if (S.checks[mover] >= 3) return finish(S, mover, 'drei Schachs'); }
    if (st.hm >= 100) return finish(S, null, '50-Züge-Regel');
    if (st.b.every((P) => !P || P.t === 'k' || P.t === 'd')) return finish(S, null, 'nur noch Könige');
    return null;
  }
  function endTurn(S) {
    if (S.over) return;
    if (S.v === 'doppel' && S.left > 1) { S.left--; return checkStuck(S); }
    tickClock(S);
    S.turn = opp(S.turn); S.ply++;
    S.left = S.v === 'doppel' ? 2 : 1;
    if (S.goofy && S.ply % 6 === 0) goofyEvent(S);
    checkStuck(S);
  }
  function checkStuck(S) {
    const ms = moves(S.st, S.turn, S.kc);
    if (ms.length) return;
    if (S.kc) return finish(S, opp(S.turn), 'keine Züge mehr');
    if (inCheck(S.st, S.turn)) finish(S, opp(S.turn), 'Schachmatt');
    else finish(S, null, 'Patt');
  }

  function act(S, pid, a) {
    if (a.type === 'flag') {
      if (!S.clock || S.over) return null;
      tickClock(S);
      if (S.clock[S.turn] <= 0) { S.clock[S.turn] = 0; finish(S, opp(S.turn), 'Zeit abgelaufen'); S.say = 'April: Zeit ist um. Wer zu lange nachdenkt, verliert. Wie im echten Leben.'; }
      return null;
    }
    if (S.over) return 'Die Partie ist vorbei.';
    const side = sideOf(S, pid);
    if (a.type === 'resign') { if (!side) return 'Du spielst nicht mit.'; finish(S, opp(side), 'Aufgabe'); S.say = 'April: Aufgegeben. Ehrlich gesagt verständlich.'; return null; }
    if (side !== S.turn) return 'Du bist nicht dran.';
    if (a.type === 'duck') {
      if (S.phase !== 'duck') return 'Erst ziehen.';
      const sq = Number(a.sq);
      if (!(sq >= 0 && sq < 64) || S.st.b[sq] || sq === S.duck) return 'Die Ente muss auf ein anderes freies Feld.';
      if (S.duck != null && S.st.b[S.duck] && S.st.b[S.duck].t === 'd') S.st.b[S.duck] = null;
      S.st.b[sq] = { t: 'd' }; S.duck = sq; S.phase = 'move';
      S.fx = { type: 'duck', seq: ++S.fxSeq, sq };
      endTurn(S);
      return null;
    }
    if (a.type !== 'move') return 'Unbekannte Aktion.';
    if (S.phase !== 'move') return 'Erst die Ente setzen.';
    const f = Number(a.f), t = Number(a.t);
    const m = moves(S.st, S.turn, S.kc).find((x) => x.f === f && x.t === t);
    if (!m) return 'Dieser Zug geht nicht.';
    tickClock(S);
    const P = S.st.b[f], cap = m.ep ? S.st.b[t + (P.c === 'w' ? 8 : -8)] : S.st.b[t];
    // Goofy: Umwandlung manchmal in etwas Zufälliges
    if (m.promo && S.goofy && Math.random() < 0.3) m.promo = ['n', 'r', 'b'][rnd(3)];
    const before = S.st.b.filter(Boolean).length;
    S.st = apply(S.st, m);
    if (cap && cap.c) S.lost[cap.c].push(cap.t);
    const boom = S.st.exploded ? before - S.st.b.filter(Boolean).length : 0;
    const check = !S.over && kingSq(S.st, opp(S.turn)) >= 0 && inCheck(S.st, opp(S.turn));
    S.last = { f, t, side: S.turn };
    S.hist.push({ side: S.turn, txt: `${GLYPH[P.t]}${sqName(f)}${cap || m.ep ? '×' : '–'}${sqName(t)}${m.promo ? `=${GLYPH[m.promo]}` : ''}${m.castle ? ' (Rochade)' : ''}${boom ? ' BOOM' : ''}${check ? '+' : ''}` });
    S.fx = { type: boom ? 'boom' : cap ? 'capture' : check ? 'check' : m.castle ? 'castle' : 'move', seq: ++S.fxSeq, sq: t, piece: P.t, cap: cap && cap.t };
    delete S.st.exploded;
    S.event = null;
    S.say = comment(S, P, cap, boom, check, m);
    if (afterMove(S, S.turn)) return null;
    if (S.over) return null;
    if (S.v === 'ente') { S.phase = 'duck'; return null; }
    endTurn(S);
    return null;
  }
  const COMMENT = {
    capture: ['April: {p} frisst {x}. Kein Mitleid.', 'April: Weg ist {x}. Aura minus tausend.', 'April: {x} wurde gecooked.'],
    horse: ['April: Das Pferd hat Rizz.', 'April: Gallopp. Einfach Gallopp.', 'April: Pferde-Diff.'],
    boom: ['April: BOOM. {n} Figuren weg. Ich liebe das.', 'April: Das war eine Explosion. Und ein Statement.'],
    check: ['April: Schach! Jemand schwitzt gerade.', 'April: Schach. Der König hat Angst.'],
    castle: ['April: Rochade. Sehr vernünftig. Langweilig, aber vernünftig.'],
    promo: ['April: Ein Bauer wird {p}. Vom Tellerwäscher zum Millionär.'],
  };
  function comment(S, P, cap, boom, check, m) {
    const pk = (a) => a[rnd(a.length)];
    if (boom) return pk(COMMENT.boom).replace('{n}', boom);
    if (m.promo) return pk(COMMENT.promo).replace('{p}', NAME[m.promo]);
    if (cap) return pk(P.t === 'n' && Math.random() < 0.5 ? COMMENT.horse : COMMENT.capture).replace('{p}', NAME[P.t]).replace('{x}', NAME[cap.t]);
    if (check) return pk(COMMENT.check);
    if (m.castle) return pk(COMMENT.castle);
    return S.say && Math.random() < 0.6 ? S.say : '';
  }

  // Nebel: nur eigene Figuren und erreichbare Felder sichtbar
  function view(S, pid) {
    const V = Object.assign({}, S);
    if (S.clock) { const c = Object.assign({}, S.clock); if (!S.over) c[S.turn] -= nowMs() - c.at; V.clock = { w: Math.max(0, c.w), b: Math.max(0, c.b), run: S.over ? null : S.turn }; }
    const side = sideOf(S, pid);
    if (S.v === 'nebel' && side && !S.over && S.players.length === 2) {
      const vis = new Set();
      S.st.b.forEach((P, i) => { if (P && P.c === side) vis.add(i); });
      pseudo(S.st, side).forEach((m) => vis.add(m.t));
      // Bauern sehen schräg nach vorne
      S.st.b.forEach((P, i) => { if (P && P.t === 'p' && P.c === side) { const r = (i >> 3) + (side === 'w' ? -1 : 1); [-1, 1].forEach((d) => { const f = (i & 7) + d; if (r >= 0 && r < 8 && f >= 0 && f < 8) vis.add(r * 8 + f); }); } });
      V.st = Object.assign({}, S.st, { b: S.st.b.map((P, i) => (vis.has(i) ? P : { fog: 1 })) });
      if (S.last && S.last.side !== side && !vis.has(S.last.t)) V.last = null;
      V.hist = S.hist.map((h) => (h.side === side ? h : { side: h.side, txt: '???' }));
      V.fog = true;
    }
    return V;
  }

  // ---------- Bot ----------
  const PST_C = (i) => { const r = i >> 3, f = i & 7; return 14 - (Math.abs(3.5 - r) + Math.abs(3.5 - f)) * 4; };
  function evaluate(st, c, v) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const P = st.b[i];
      if (!P || P.t === 'd') continue;
      let x = VAL[P.t];
      if (P.t === 'n' || P.t === 'b' || P.t === 'q') x += PST_C(i);
      if (P.t === 'p') x += (P.c === 'w' ? 6 - (i >> 3) : (i >> 3) - 1) * 6;
      if (P.t === 'k' && v === 'huegel') x += PST_C(i) * 5;
      s += P.c === c ? x : -x;
    }
    return s;
  }
  const MATE = 1e6;
  function search(st, c, depth, alpha, beta, kc, ctx) {
    ctx.nodes++;
    if (kingSq(st, c) < 0) return -MATE;
    const ms = moves(st, c, kc);
    if (!ms.length) return kc || inCheck(st, c) ? -MATE + (10 - depth) : 0;
    if (depth === 0 || ctx.nodes > ctx.max) return evaluate(st, c, st.v);
    ms.sort((a, b) => (b.x ? VAL[(st.b[b.t] || { t: 'p' }).t] : 0) - (a.x ? VAL[(st.b[a.t] || { t: 'p' }).t] : 0));
    for (const m of ms) {
      const n = apply(st, m);
      let val;
      if (kingSq(n, opp(c)) < 0) val = MATE;
      else if (st.v === 'huegel' && CENTER.includes(kingSq(n, c))) val = MATE - 1;
      else val = -search(n, opp(c), depth - 1, -beta, -alpha, kc, ctx);
      if (val > alpha) alpha = val;
      if (alpha >= beta) break;
    }
    return alpha;
  }
  function bestMove(S) {
    const st = S.st, c = S.turn, ms = moves(st, c, S.kc);
    if (!ms.length) return null;
    const depth = S.level === 1 ? 1 : S.level === 2 ? 2 : 3;
    const ctx = { nodes: 0, max: S.level === 3 ? 60000 : 20000 };
    let best = null, bestV = -Infinity;
    const scored = ms.map((m) => {
      const n = apply(st, m);
      let v;
      if (kingSq(n, opp(c)) < 0) v = MATE;
      else if (st.v === 'huegel' && CENTER.includes(kingSq(n, c))) v = MATE - 1;
      else v = -search(n, opp(c), depth - 1, -Infinity, Infinity, S.kc, ctx);
      v += (Math.random() - 0.5) * (S.level === 1 ? 120 : S.level === 2 ? 30 : 6);
      return { m, v };
    });
    scored.forEach((s) => { if (s.v > bestV) { bestV = s.v; best = s.m; } });
    return best;
  }
  function bestDuck(S) {
    const st = S.st, foe = opp(S.turn);
    const empty = st.b.map((P, i) => (!P && i !== S.duck ? i : -1)).filter((i) => i >= 0);
    let best = empty[rnd(empty.length)], bestV = Infinity;
    empty.forEach((sq) => {
      const b = st.b.slice(); if (S.duck != null && b[S.duck] && b[S.duck].t === 'd') b[S.duck] = null; b[sq] = { t: 'd' };
      const t = Object.assign({}, st, { b });
      const worst = pseudo(t, foe).reduce((mx, m) => Math.max(mx, m.x && b[m.t] ? VAL[b[m.t].t] : 0), 0) + Math.random();
      if (worst < bestV) { bestV = worst; best = sq; }
    });
    return best;
  }
  const cache = new WeakMap();
  function bot(S) {
    if (S.over) return null;
    const p = S.players.find((x) => x.side === S.turn);
    if (p && p.bot) {
      const key = `${S.ply}|${S.left}|${S.phase}|${S.fxSeq}`, c0 = cache.get(S);
      if (c0 && c0.key === key) return c0.res;
      let res;
      if (S.phase === 'duck') res = { pid: p.id, action: { type: 'duck', sq: bestDuck(S) }, delay: 500 };
      else { const m = bestMove(S); res = m ? { pid: p.id, action: { type: 'move', f: m.f, t: m.t }, delay: 650 } : null; }
      cache.set(S, { key, res });
      return res;
    }
    // Uhr: Zeitüberschreitung prüfen
    if (S.clock) { const left = S.clock[S.turn] - (nowMs() - S.clock.at); return { pid: S.players[0].id, action: { type: 'flag' }, delay: Math.max(100, left + 50) }; }
    return null;
  }

  const CHESS = { VARIANTS, NAME, GLYPH, setup, pseudo, moves, apply, attacked, inCheck, kingSq, sqName, start, act, view, bot, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CHESS;
  else root.DULI_CHESS = CHESS;
})(typeof window !== 'undefined' ? window : globalThis);
