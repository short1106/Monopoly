// DULIDAN SCHIFFE VERSENKEN – Oberfläche (Flotte setzen, zwei Meere, Radar, Luftschlag)
(function () {
  const B = window.DULI_SCHIFFE, FX = window.DULI_FX, esc = window.DULI_PARTY.esc;
  const N = B.N;
  const L = { draft: [], sel: 0, horiz: true, hover: null, mode: 'shoot', dir: 'h', lastSeq: null, lastAll: null };
  const cellsFor = (start, len, h) => {
    const r = Math.floor(start / N), c = start % N;
    if (h ? c + len > N : r + len > N) return null;
    return Array.from({ length: len }, (_, k) => (h ? start + k : start + k * N));
  };
  const head = () => `<div class="sv-head"><i></i>${'ABCDEFGHIJ'.split('').map((x) => `<i>${x}</i>`).join('')}</div>`;
  function grid(cls, cellFn) {
    let h = `<div class="sv-grid ${cls}">${head()}`;
    for (let r = 0; r < N; r++) {
      h += `<div class="sv-row"><i class="sv-rn">${r + 1}</i>`;
      for (let c = 0; c < N; c++) { const i = r * N + c; const [k, inner] = cellFn(i); h += `<button type="button" class="sv-cell ${k}" data-i="${i}">${inner || ''}</button>`; }
      h += '</div>';
    }
    return h + '</div>';
  }
  // Schiffsteil: Bug, Mitte, Heck – so sieht man die Schiffe als Ganzes
  function shipPart(ship, i) {
    const k = ship.cells.indexOf(i), h = ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1;
    return `sh ${h ? 'sh-h' : 'sh-v'} ${k === 0 ? 'sh-a' : k === ship.cells.length - 1 ? 'sh-z' : 'sh-m'}`;
  }

  function render(root, V, me, api) {
    if (!V) return;
    const meP = V.players.find((p) => p.id === me), oP = V.players.find((p) => p.id !== me);
    if (!meP) { root.innerHTML = '<div class="p-card"><p class="p-wait">Hier spielen zwei andere. Schau beim nächsten Mal mit.</p></div>'; return; }
    const myB = V.boards[me], oB = V.boards[oP.id];
    // Effekte für neue Schüsse
    if (V.last && L.lastSeq !== V.last.seq) {
      if (L.lastSeq != null) FX && FX.play(V.last.res.some((r) => r.sunk) ? 'bigLoss' : V.last.res.some((r) => r.hit) ? 'jail' : V.last.radar != null ? 'pop' : 'coinDown');
      L.lastSeq = V.last.seq;
      L.lastAll = V.last;
    }
    const fresh = new Set(L.lastAll ? L.lastAll.res.map((r) => `${L.lastAll.by}|${r.i}`) : []);

    if (V.phase === 'place' && !myB.ships) return renderPlace(root, V, me, api);

    const myTurn = V.phase === 'battle' && V.players[V.cur].id === me;
    const sp = V.special[me] || {};
    const mine = grid('sv-mine', (i) => {
      const ship = myB.ships && myB.ships.find((s) => s.cells.includes(i));
      const shot = myB.shots[i];
      const sunk = ship && ship.cells.every((j) => myB.shots[j] === 'hit');
      return [`${ship ? shipPart(ship, i) : ''} ${shot ? `is-${shot}` : ''} ${sunk ? 'is-sunk' : ''} ${fresh.has(`${oP.id}|${i}`) ? 'is-fresh' : ''}`, shot === 'hit' ? '<b class="sv-x">✕</b>' : shot === 'miss' ? '<b class="sv-o"></b>' : ''];
    });
    const radar = new Map();
    (V.radar[me] || []).forEach((r) => radar.set(r.i, r.n));
    const preview = new Set();
    if (myTurn && L.hover != null) {
      if (L.mode === 'air') { const [r0, c0] = [Math.floor(L.hover / N), L.hover % N]; [0, 1, 2].forEach((k) => { const r = L.dir === 'v' ? r0 + k : r0, c = L.dir === 'v' ? c0 : c0 + k; if (r < N && c < N) preview.add(r * N + c); }); }
      else if (L.mode === 'radar') { const [r0, c0] = [Math.floor(L.hover / N), L.hover % N]; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r = r0 + dr, c = c0 + dc; if (r >= 0 && r < N && c >= 0 && c < N) preview.add(r * N + c); } }
      else preview.add(L.hover);
    }
    const theirs = grid(`sv-theirs ${myTurn ? 'is-live' : ''} mode-${L.mode}`, (i) => {
      const shot = oB.shots[i];
      const ship = oB.ships && oB.ships.find((s) => s.cells.includes(i));
      return [`${ship ? `${shipPart(ship, i)} is-sunk` : ''} ${shot ? `is-${shot}` : ''} ${preview.has(i) ? 'is-aim' : ''} ${fresh.has(`${me}|${i}`) ? 'is-fresh' : ''}`,
        (shot === 'hit' ? '<b class="sv-x">✕</b>' : shot === 'miss' ? '<b class="sv-o"></b>' : '') + (radar.has(i) ? `<b class="sv-radar">${radar.get(i)}</b>` : '')];
    });
    const fleetList = (left, all) => B.SHIPS.map((s) => `<li class="${left && !left.includes(s.n) ? 'is-down' : ''}"><span class="sv-pips">${'<i></i>'.repeat(s.len)}</span>${s.n}</li>`).join('');
    const oLeft = oB.left || (oB.ships ? B.SHIPS.map((s) => s.n).filter((n) => !oB.ships.some((x) => x.n === n)) : B.SHIPS.map((s) => s.n));
    const myLeft = myB.ships ? myB.ships.filter((s) => !s.cells.every((j) => myB.shots[j] === 'hit')).map((s) => s.n) : [];
    let h = `<div class="sv">
      <div class="sv-status ${myTurn ? 'is-me' : ''}">${V.phase === 'place' ? `Warte, bis ${esc(oP.name)} die Flotte gesetzt hat …` : V.phase === 'over' ? '' : myTurn ? '<strong>Du bist dran!</strong> Wähle ein Feld im gegnerischen Meer.' : `${esc(oP.name)} zielt …`}</div>
      ${V.phase === 'battle' ? `<div class="sv-tools">
        <button class="btn btn-small ${L.mode === 'shoot' ? 'btn-primary' : 'btn-ghost'}" data-mode="shoot">🎯 Schuss</button>
        <button class="btn btn-small ${L.mode === 'radar' ? 'btn-primary' : 'btn-ghost'}" data-mode="radar" ${sp.radar ? '' : 'disabled'}>📡 Radar ${sp.radar ? '(1×)' : '(weg)'}</button>
        <button class="btn btn-small ${L.mode === 'air' ? 'btn-primary' : 'btn-ghost'}" data-mode="air" ${sp.air ? '' : 'disabled'}>✈️ Luftschlag ${sp.air ? '(1×)' : '(weg)'}</button>
        ${L.mode === 'air' ? `<button class="btn btn-small btn-ghost" data-dir>${L.dir === 'h' ? '↔ waagerecht' : '↕ senkrecht'}</button>` : ''}</div>` : ''}
      <div class="sv-boards">
        <section><h3>Gegnerisches Meer <small>${esc(oP.name)}</small></h3>${theirs}<ul class="sv-fleet">${fleetList(oLeft)}</ul></section>
        <section><h3>Deine Flotte <small>${esc(meP.name)}</small></h3>${mine}<ul class="sv-fleet">${fleetList(myLeft)}</ul></section>
      </div>
      <ul class="uno-log">${V.log.slice(-4).reverse().map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
    if (V.phase === 'over') {
      const w = V.players.find((p) => p.id === V.winner);
      h += `<div class="uno-over"><div class="p-card"><p class="sec-label"><span class="n">SEESCHLACHT</span>Vorbei</p><h2>${w.id === me ? 'Sieg! Die Flotte ist versenkt.' : `${esc(w.name)} gewinnt.`}</h2>
        <p class="p-sub">Schließ das Fenster, um die aufgedeckten Flotten zu sehen.</p>
        <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" data-again>Revanche</button><button class="btn btn-ghost" data-lobby>Zur Lobby</button>' : ''}<button class="btn btn-ghost" data-close>Ansehen</button></div></div></div>`;
    }
    root.innerHTML = h;
    const on = (sel, fn) => root.querySelectorAll(sel).forEach((b) => { b.onclick = (e) => fn(b, e); });
    on('[data-mode]', (b) => { L.mode = b.dataset.mode; render(root, V, me, api); });
    on('[data-dir]', () => { L.dir = L.dir === 'h' ? 'v' : 'h'; render(root, V, me, api); });
    on('[data-again]', () => api.again());
    on('[data-lobby]', () => api.lobby());
    on('[data-close]', () => { const o = root.querySelector('.uno-over'); if (o) o.remove(); });
    root.querySelectorAll('.sv-theirs .sv-cell').forEach((b) => {
      b.onmouseenter = () => { if (!myTurn) return; L.hover = Number(b.dataset.i); root.querySelectorAll('.sv-theirs .is-aim').forEach((x) => x.classList.remove('is-aim')); markAim(root); };
      b.onclick = () => {
        if (!myTurn) return api.toast('Du bist nicht dran.');
        const i = Number(b.dataset.i);
        if (L.mode === 'shoot') { if (oB.shots[i]) return api.toast('Da hast du schon hingeschossen.'); api.act({ type: 'shoot', cell: i }); }
        else if (L.mode === 'radar') { api.act({ type: 'radar', cell: i }); L.mode = 'shoot'; }
        else { api.act({ type: 'air', cell: i, dir: L.dir }); L.mode = 'shoot'; }
      };
    });
  }
  function markAim(root) {
    const i = L.hover;
    const set = [];
    const [r0, c0] = [Math.floor(i / N), i % N];
    if (L.mode === 'air') [0, 1, 2].forEach((k) => { const r = L.dir === 'v' ? r0 + k : r0, c = L.dir === 'v' ? c0 : c0 + k; if (r < N && c < N) set.push(r * N + c); });
    else if (L.mode === 'radar') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const r = r0 + dr, c = c0 + dc; if (r >= 0 && r < N && c >= 0 && c < N) set.push(r * N + c); } }
    else set.push(i);
    set.forEach((j) => { const el = root.querySelector(`.sv-theirs .sv-cell[data-i="${j}"]`); if (el) el.classList.add('is-aim'); });
  }

  // ---------- Flotte setzen ----------
  function renderPlace(root, V, me, api) {
    const noTouch = V.settings.noTouch !== false;
    const used = new Map();
    L.draft.forEach((cells, k) => { if (cells) cells.forEach((i) => used.set(i, k)); });
    const len = B.SHIPS[L.sel] ? B.SHIPS[L.sel].len : 0;
    const prev = L.hover != null && L.sel < B.SHIPS.length ? cellsFor(L.hover, len, L.horiz) : null;
    const test = prev && L.draft.map((c, k) => (k === L.sel ? null : c)).filter(Boolean);
    const prevOk = prev && (() => { const occ = new Set(); test.forEach((c) => c.forEach((i) => { occ.add(i); })); return prev.every((i) => !occ.has(i)) && (!noTouch || prev.every((i) => !nearAny(i, occ))); })();
    const g0 = grid('sv-mine sv-place', (i) => {
      const k = used.get(i);
      const ship = k != null ? { cells: L.draft[k] } : null;
      return [`${ship ? shipPart(ship, i) : ''} ${prev && prev.includes(i) ? (prevOk ? 'is-prev' : 'is-bad') : ''} ${k === L.sel ? 'is-selship' : ''}`, ''];
    });
    const all = B.SHIPS.every((_, k) => L.draft[k]);
    const err = all ? B.validFleet(L.draft, noTouch) : null;
    root.innerHTML = `<div class="sv sv-placing"><div class="sv-status"><strong>Setz deine Flotte.</strong> Schiff wählen, ins Meer tippen. ${noTouch ? 'Schiffe dürfen sich nicht berühren.' : ''}</div>
      <div class="sv-boards"><section><h3>Dein Meer</h3>${g0}</section>
      <section class="sv-shipyard"><h3>Werft</h3><ul class="sv-yard">${B.SHIPS.map((s, k) => `<li><button class="sv-ship ${L.sel === k ? 'is-on' : ''} ${L.draft[k] ? 'is-set' : ''}" data-ship="${k}"><span class="sv-pips">${'<i></i>'.repeat(s.len)}</span>${s.n}<small>${s.len} Felder${L.draft[k] ? ' · gesetzt' : ''}</small></button></li>`).join('')}</ul>
        <div class="btn-row"><button class="btn" data-rot>${L.horiz ? '↔ Waagerecht' : '↕ Senkrecht'} (R)</button><button class="btn" data-rand>Zufällig</button><button class="btn btn-ghost" data-clear>Leeren</button></div>
        ${err ? `<p class="re-warn-line">${esc(err)}</p>` : ''}
        <button class="btn btn-primary" data-ready ${all && !err ? '' : 'disabled'}>⚓ Bereit</button>
        <p class="p-sub">${V.players.filter((p) => p.id !== me).map((p) => `${esc(p.name)}: ${V.boards[p.id].ready || V.boards[p.id].ships ? 'bereit' : 'setzt noch …'}`).join('')}</p></section></div></div>`;
    const on = (sel, fn) => root.querySelectorAll(sel).forEach((b) => { b.onclick = () => fn(b); });
    on('[data-ship]', (b) => { L.sel = Number(b.dataset.ship); render(root, V, me, api); });
    on('[data-rot]', () => { L.horiz = !L.horiz; render(root, V, me, api); });
    on('[data-rand]', () => { L.draft = B.randomFleet(noTouch); L.sel = B.SHIPS.length; render(root, V, me, api); });
    on('[data-clear]', () => { L.draft = []; L.sel = 0; render(root, V, me, api); });
    on('[data-ready]', () => api.act({ type: 'place', fleet: L.draft }));
    root.querySelectorAll('.sv-place .sv-cell').forEach((b) => {
      b.onmouseenter = () => { L.hover = Number(b.dataset.i); markPrev(root, noTouch); };
      b.onclick = () => {
        const i = Number(b.dataset.i);
        const k = used.get(i);
        if (k != null && k !== L.sel) { L.sel = k; return render(root, V, me, api); }
        if (L.sel >= B.SHIPS.length) return;
        const cells = cellsFor(i, B.SHIPS[L.sel].len, L.horiz);
        if (!cells) return api.toast('Passt nicht ins Meer. Dreh das Schiff oder nimm ein anderes Feld.');
        const others = new Set();
        L.draft.forEach((c, j) => { if (c && j !== L.sel) c.forEach((x) => others.add(x)); });
        if (cells.some((x) => others.has(x)) || (noTouch && cells.some((x) => nearAny(x, others)))) return api.toast(noTouch ? 'Schiffe dürfen sich nicht berühren.' : 'Da liegt schon ein Schiff.');
        L.draft[L.sel] = cells;
        L.sel = B.SHIPS.findIndex((_, j) => !L.draft[j]);
        if (L.sel < 0) L.sel = B.SHIPS.length;
        FX && FX.play('build');
        render(root, V, me, api);
      };
    });
    markPrev(root, noTouch);
    document.onkeydown = (e) => { if ((e.key === 'r' || e.key === 'R') && root.querySelector('.sv-placing')) { L.horiz = !L.horiz; render(root, V, me, api); } };
  }
  function markPrev(root, noTouch) {
    root.querySelectorAll('.sv-place .is-prev, .sv-place .is-bad').forEach((x) => x.classList.remove('is-prev', 'is-bad'));
    if (L.hover == null || L.sel >= B.SHIPS.length) return;
    const prev = cellsFor(L.hover, B.SHIPS[L.sel].len, L.horiz);
    if (!prev) return;
    const occ = new Set();
    L.draft.forEach((c, k) => { if (c && k !== L.sel) c.forEach((i) => occ.add(i)); });
    const ok = prev.every((i) => !occ.has(i)) && (!noTouch || prev.every((i) => !nearAny(i, occ)));
    prev.forEach((i) => { const el = root.querySelector(`.sv-place .sv-cell[data-i="${i}"]`); if (el) el.classList.add(ok ? 'is-prev' : 'is-bad'); });
  }
  function nearAny(i, set) {
    const r = Math.floor(i / N), c = i % N;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && set.has(rr * N + cc)) return true;
    }
    return false;
  }

  window.DULI_PARTY.start({
    id: 'schiffe', title: 'Schiffe versenken', kicker: 'SEESCHLACHT', titleHTML: 'SCHIFFE <span class="outline">VERSENKEN</span>', min: 2, max: 2, soloBots: 1,
    tagline: 'Die Seeschlacht für zwei. Flotte setzen, zielen, versenken. Mit Radar und Luftschlag aus DULIDANOPOLY WAR.',
    defaults: { again: true, noTouch: true, specials: true }, botDelay: 900,
    settingsHTML: (st, host) => [['again', 'Treffer = nochmal', 'Wer trifft, darf gleich nochmal schießen'], ['noTouch', 'Abstand halten', 'Schiffe dürfen sich nicht berühren (auch nicht schräg)'], ['specials', 'Radar und Luftschlag', 'Jede Seite hat einmal Radar (3×3 zählen) und einmal Luftschlag (3 Felder)']]
      .map(([k, n, d]) => `<label class="row"><span>${n}<small>${d}</small></span><input type="checkbox" class="switch" data-set="${k}" ${st[k] !== false ? 'checked' : ''} ${host ? '' : 'disabled'}></label>`).join(''),
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Jede Seite setzt fünf Schiffe: Flugzeugträger (5), Schlachtschiff (4), Kreuzer (3), U-Boot (3), Schnellboot (2).</li>
      <li>Abwechselnd wird geschossen. Treffer: nochmal. Ist ein Schiff ganz getroffen, ist es versenkt.</li>
      <li><b>📡 Radar</b> (1×): zeigt, wie viele Schiffsteile in einem 3×3-Feld liegen. <b>✈️ Luftschlag</b> (1×): drei Felder in einer Reihe auf einmal.</li>
      <li>Wer zuerst die ganze gegnerische Flotte versenkt, gewinnt.</li></ul></div>`,
    engine: B, render,
  });
})();
