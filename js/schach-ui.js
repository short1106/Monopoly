// DULIDAN SCHACH – Oberfläche: Brett (dreht sich für Schwarz), Zugvorschau, Ente setzen, Nebel, Uhren, April-Kommentar.
(function () {
  const C = window.DULI_CHESS, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const GF = () => window.DULI_GOOFY;
  const DUCK = '<svg viewBox="0 0 64 56" class="sc-duck"><ellipse cx="30" cy="36" rx="22" ry="15" fill="#ffd83a"/><circle cx="46" cy="18" r="12" fill="#ffd83a"/><path d="M56 17 L66 21 L56 24 Z" fill="#ff8a1f"/><circle cx="49" cy="15" r="2.4" fill="#111"/></svg>';
  let sel = null, lastFx = null, lastEvent = null, lastOver = false, clockT = null, clockBase = null;

  function render(root, V, me, api) {
    if (!V) return;
    const meP = V.players.find((p) => p.id === me), side = meP ? meP.side : null;
    const flip = side === 'b';
    const myTurn = !V.over && side === V.turn;
    // Töne und Effekte
    if (V.fx && V.fx.seq !== lastFx) {
      if (lastFx !== null) {
        const g = GF();
        if (V.fx.type === 'boom') { FX && FX.play('bigLoss'); g && g.big('BOOM', 'bad'); }
        else if (V.fx.type === 'capture') FX && FX.play(V.fx.piece === 'n' && V.goofy ? 'coinUp' : 'cash');
        else if (V.fx.type === 'check') { FX && FX.play('turn'); if (V.goofy && g) g.pop('SCHACH!'); }
        else if (V.fx.type === 'duck') { g && g.play('quack'); }
        else FX && FX.play('step');
      }
      lastFx = V.fx.seq; sel = null;
    }
    if (V.event && V.event.seq !== lastEvent) { if (lastEvent !== null || V.ply > 0) { const g = GF(); g && g.big(V.event.id === 'horses' ? 'PFERDE!' : V.event.id === 'boom' ? 'ATOM-ALARM' : 'APRIL GREIFT EIN', 'pink'); FX && FX.play('card'); } lastEvent = V.event.seq; }
    if (V.over && !lastOver) {
      lastOver = true;
      if (V.winner && V.winner === side) { FX && FX.play('win'); FX && FX.confetti(); }
      else if (V.winner && side) { FX && FX.play('bigLoss'); VO && VO.say('loss', { force: true }); }
    }
    if (!V.over) lastOver = false;

    // Legale Züge für die Auswahl (im Nebel aus der sichtbaren Stellung)
    const st = V.fog ? Object.assign({}, V.st, { b: V.st.b.map((P) => (P && P.fog ? null : P)) }) : V.st;
    const legal = myTurn && V.phase === 'move' ? C.moves(st, side, V.kc) : [];
    const targets = sel != null ? legal.filter((m) => m.f === sel).map((m) => m.t) : [];
    const checkSq = !V.kc && !V.over ? [V.turn].map((c) => (C.inCheck(st, c) ? C.kingSq(st, c) : -1))[0] : -1;
    const evSq = V.event && V.event.sq ? V.event.sq : [];

    let cells = '';
    for (let i = 0; i < 64; i++) {
      const s = flip ? 63 - i : i, P = V.st.b[s], r = s >> 3, f = s & 7, dark = (r + f) % 2 === 1;
      const cls = ['sc-sq', dark ? 'dk' : 'lt'];
      if (V.last && (V.last.f === s || V.last.t === s)) cls.push('last');
      if (sel === s) cls.push('sel');
      if (targets.includes(s)) cls.push(P && P.c ? 'cap' : 'tgt');
      if (s === checkSq) cls.push('chk');
      if (evSq.includes(s)) cls.push('ev');
      if (P && P.fog) cls.push('fog');
      if (V.phase === 'duck' && myTurn && !P && s !== V.duck) cls.push('duckok');
      const label = (i % 8 === 0 ? `<small class="rk">${8 - r}</small>` : '') + (i >= 56 ? `<small class="fl">${'abcdefgh'[f]}</small>` : '');
      const piece = !P || P.fog ? '' : P.t === 'd' ? DUCK : `<span class="sc-p ${P.c}${V.goofy && P.t === 'n' ? ' horse' : ''}">${C.GLYPH[P.t]}︎</span>`;
      cells += `<button class="${cls.join(' ')}" data-sq="${s}" aria-label="${C.sqName(s)}">${piece}${label}</button>`;
    }
    const pName = (c) => { const p = V.players.find((x) => x.side === c); return p ? `${esc(p.name)}${p.bot ? ' <small>BOT</small>' : ''}` : '?'; };
    const lost = (c) => (V.lost[c] || []).map((t) => `<span class="sc-p ${c}">${C.GLYPH[t] || ''}︎</span>`).join('');
    const clock = (c) => (V.clock ? `<b class="sc-clock ${V.clock.run === c ? 'run' : ''} ${V.clock[c] < 20000 ? 'low' : ''}" data-clock="${c}">${fmtClock(V.clock[c])}</b>` : '');
    const bar = (c) => `<div class="sc-player ${V.turn === c && !V.over ? 'on' : ''}"><i class="sc-dot ${c}"></i><span>${pName(c)}</span>${V.v === 'dreischach' ? `<em>${'+'.repeat(V.checks[c])}</em>` : ''}<span class="sc-lost">${lost(c === 'w' ? 'b' : 'w')}</span>${clock(c)}</div>`;
    const top = flip ? 'w' : 'b', bottom = flip ? 'b' : 'w';
    const status = V.over ? (V.winner ? `${V.winner === side ? 'Du gewinnst' : `${V.winner === 'w' ? 'Weiß' : 'Schwarz'} gewinnt`} – ${esc(V.reason)}` : `Remis – ${esc(V.reason)}`)
      : V.phase === 'duck' ? (myTurn ? '<b>Setz die Ente</b> auf ein freies Feld.' : 'Die Ente wird gesetzt …')
        : myTurn ? `<b>Du bist dran.</b>${V.v === 'doppel' && V.left > 1 ? ' (noch 2 Züge)' : V.v === 'doppel' ? ' (letzter Zug)' : ''}` : `${V.turn === 'w' ? 'Weiß' : 'Schwarz'} denkt nach …`;
    root.innerHTML = `<div class="sc ${V.goofy ? 'goofy' : ''}">
      <section class="sc-main">${bar(top)}<div class="sc-board ${flip ? 'flip' : ''}">${cells}</div>${bar(bottom)}</section>
      <aside class="sc-side">
        <div class="sc-mode"><small>MODUS</small><b>${esc(C.VARIANTS[V.v].name)}${V.goofy ? ' · GOOFY' : ''}</b><p>${esc(C.VARIANTS[V.v].text)}${V.goofy ? ' Alle 3 Runden greift April ein.' : ''}</p></div>
        <p class="sc-status">${status}</p>
        ${V.say ? `<div class="sc-april"><svg viewBox="0 0 100 100"><use href="#april"/></svg><p>${esc(V.say.replace(/^April: /, ''))}</p></div>` : ''}
        <ol class="sc-hist">${pairs(V.hist).map(([w, b], i) => `<li><span>${i + 1}.</span><b>${esc(w || '')}</b><b>${esc(b || '')}</b></li>`).join('')}</ol>
        <div class="btn-row">${!V.over && side ? '<button class="btn btn-small btn-ghost" data-resign>Aufgeben</button>' : ''}
          ${V.over && api.isHost ? '<button class="btn btn-primary" data-again>Revanche (Farben tauschen)</button><button class="btn btn-ghost" data-lobby>Zur Lobby</button>' : ''}${V.over && !api.isHost ? '<p class="p-wait">Der Host startet die Revanche.</p>' : ''}</div>
        ${Object.keys(V.wins).length ? `<p class="p-sub">Siege: ${V.players.map((p) => `${esc(p.name)} ${V.wins[p.id] || 0}`).join(' · ')}</p>` : ''}
      </aside></div>`;
    const hl = root.querySelector('.sc-hist'); if (hl) hl.scrollTop = hl.scrollHeight;
    root.querySelectorAll('[data-sq]').forEach((b) => { b.onclick = () => click(Number(b.dataset.sq), V, side, legal, api, root, me); });
    root.querySelectorAll('[data-resign]').forEach((b) => { b.onclick = () => { if (confirm('Wirklich aufgeben?')) api.act({ type: 'resign' }); }; });
    root.querySelectorAll('[data-again]').forEach((b) => { b.onclick = () => api.again(); });
    root.querySelectorAll('[data-lobby]').forEach((b) => { b.onclick = () => api.lobby(); });
    // Uhren laufen lokal weiter
    clearInterval(clockT);
    if (V.clock && V.clock.run) {
      clockBase = { t: Date.now(), V };
      clockT = setInterval(() => { const el = root.querySelector(`[data-clock="${V.clock.run}"]`); if (!el) return clearInterval(clockT); const left = V.clock[V.clock.run] - (Date.now() - clockBase.t); el.textContent = fmtClock(Math.max(0, left)); el.classList.toggle('low', left < 20000); }, 200);
    }
  }
  function click(s, V, side, legal, api, root, me) {
    if (V.over || side !== V.turn) return;
    if (V.phase === 'duck') { api.act({ type: 'duck', sq: s }); return; }
    const P = V.st.b[s];
    if (sel != null && legal.some((m) => m.f === sel && m.t === s)) { const f = sel; sel = null; api.act({ type: 'move', f, t: s }); return; }
    sel = P && P.c === side ? s : null;
    render(root, V, me, api);
  }
  const pairs = (h) => { const out = []; let cur = null; h.forEach((x) => { if (x.side === 'w' || !cur) { cur = [x.side === 'w' ? x.txt : '', x.side === 'b' ? x.txt : '']; out.push(cur); } else if (x.side === 'b' && !cur[1]) cur[1] = x.txt; else { cur = ['', x.txt]; out.push(cur); } }); return out.slice(-40); };
  const fmtClock = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const sel2 = (key, st, host, opts) => `<select data-set="${key}" ${typeof opts[0][0] === 'number' ? 'data-num="1"' : ''} ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${String(st[key]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  window.DULI_PARTY.start({
    id: 'schach', title: 'Schach', kicker: 'SCHACH · 9 MODI', titleHTML: 'SCH<span class="outline">ACH</span>',
    min: 1, max: 2, soloBots: 1, botNames: ['Stockfisch-Kevin', 'Magnus Carlsbot', 'Bauern-Bernd', 'Gaul-Gustav'],
    tagline: 'Schach mit Modi, die eigentlich verboten gehören: Nur Pferde, Atomschach, Enten-Schach, Nebel, Doppelzug und GOOFY. Online zu zweit oder gegen den Bot.',
    defaults: { variant: 'classic', goofy: false, clock: 0, level: 2 },
    settingsHTML: (st, host) => `
      <label class="row"><span>Modus<small>${esc((C.VARIANTS[st.variant || 'classic'] || C.VARIANTS.classic).text)}</small></span>${sel2('variant', st, host, Object.entries(C.VARIANTS).map(([k, v]) => [k, v.name]))}</label>
      <label class="row sc-set-goofy"><span>GOOFY-SCHACH<small>April greift alle 3 Runden ein: Pferde-Invasion, Enten, Spiegelung, Aura-Steuer, Atom-Alarm …</small></span><input type="checkbox" class="switch" data-set="goofy" ${st.goofy ? 'checked' : ''} ${host ? '' : 'disabled'}></label>
      <label class="row"><span>Bedenkzeit<small>Pro Spieler</small></span>${sel2('clock', st, host, [[0, 'ohne Uhr'], [1, '1 Minute (Bullet)'], [3, '3 Minuten (Blitz)'], [5, '5 Minuten'], [10, '10 Minuten']])}</label>
      <label class="row"><span>Bot-Stärke</span>${sel2('level', st, host, [[1, 'leicht'], [2, 'mittel'], [3, 'stark']])}</label>`,
    rulesHTML: `<div class="p-card"><h3>Die Modi</h3><ul>${Object.values(C.VARIANTS).map((v) => `<li><b>${esc(v.name)}:</b> ${esc(v.text)}</li>`).join('')}
      <li><b>GOOFY-SCHACH</b> (Schalter, mit jedem Modus kombinierbar): Alle 3 Runden greift April ein. Bauern werden zu Pferden, Enten landen auf dem Brett, das Brett wird gespiegelt, wer vorne liegt zahlt Aura-Steuer, der nächste Schlag explodiert … Bauern werden manchmal zu etwas Zufälligem. Wer den König schlägt, gewinnt.</li></ul></div>`,
    engine: C, render,
  });
})();
