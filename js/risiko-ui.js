// DULIDAN Risiko – Oberfläche: echte Karte (Leaflet) mit Gebieten, Verbindungen und Seezonen, Seitenleiste mit Phasen,
// Würfeln, Karten, Spielern und Kontinenten.
(function () {
  const R = window.DULI_RISIKO, D = window.DULI_RISIKO_DATA, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const PHASE = { reinforce: 'Verstärken', attack: 'Angreifen', move: 'Truppen nachziehen', fortify: 'Verschieben', over: 'Spielende' };
  const KIND = { inf: 'Infanterie', cav: 'Kavallerie', art: 'Artillerie', joker: 'Joker' };
  const put = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; return true; } return false; };

  let skel = null, last = null, sel = null, target = null, zoneSel = null, qty = 1, unit = 'inf', fUnit = 'inf', pickCards = [], lastSeq = null, lastWinner = null, lastTurnKey = null;

  function mapOf(V) { return D.MAPS[V.map]; }
  const ground = (V, t) => V.inf[t] + V.tank[t];
  const color = (V, pid) => (V.players.find((p) => p.id === pid) || {}).color || '#888';
  const pname = (V, pid) => (V.players.find((p) => p.id === pid) || {}).name || '?';
  function seaOk(V, pid, a, b) { const z = mapOf(V).T[a].sea[b]; if (!z || !V.real) return true; const f = V.fleet[z]; return !f || f.pid === pid || f.n <= 0; }
  function reachable(V, pid, from, to) {
    const M = mapOf(V), seen = new Set([from]), st = [from];
    while (st.length) { const t = st.pop(); if (t === to) return true; M.T[t].adj.forEach((n) => { if (!seen.has(n) && V.owner[n] === pid && seaOk(V, pid, t, n)) { seen.add(n); st.push(n); } }); }
    return false;
  }

  // ---------- Gerüst: das Spielbrett als SVG (Formen aus js/risiko-shapes.js) ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  const SH = () => window.DULI_RISIKO_SHAPES;
  function ensureSkel(root, V) {
    if (skel && root.contains(skel.el) && skel.map === V.map) return;
    const M = mapOf(V), B = SH()[V.map];
    const world = V.map === 'world';
    const r = world ? 15 : 17;
    // Wasserwege (gestrichelt) zwischen den Plaketten; Alaska–Kamtschatka über den Kartenrand
    let routes = '';
    const drawn = new Set();
    Object.values(M.T).forEach((t) => t.adj.forEach((o) => {
      const k2 = [t.id, o].sort().join('|');
      if (drawn.has(k2) || !t.sea[o]) return;
      drawn.add(k2);
      const a = B.terr[t.id], c = B.terr[o];
      if (Math.abs(a.x - c.x) > B.w / 2) {
        const [l, rr] = a.x < c.x ? [a, c] : [c, a];
        routes += `<line x1="${l.x}" y1="${l.y}" x2="0" y2="${l.y - 6}"/><line x1="${rr.x}" y1="${rr.y}" x2="${B.w}" y2="${rr.y - 6}"/>`;
      } else routes += `<line x1="${a.x}" y1="${a.y}" x2="${c.x}" y2="${c.y}"/>`;
    }));
    const grid = (B.grid || []).map(([k, v]) => (k === 'h' ? `<line x1="0" y1="${v}" x2="${B.w}" y2="${v}"/>` : `<line x1="${v}" y1="0" x2="${v}" y2="${B.h}"/>`)).join('');
    root.innerHTML = `<div class="rk"><div class="rk-mapwrap"><div id="rk-map" class="rk-map rk-board-${V.map}" style="aspect-ratio:${B.w} / ${B.h}">
      <svg id="rk-svg" viewBox="0 0 ${B.w} ${B.h}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="rk-ocean" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#16406b"/><stop offset=".6" stop-color="#0d2c4f"/><stop offset="1" stop-color="#071a31"/></radialGradient>
          <filter id="rk-shadow" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="${world ? 2 : 4}" stdDeviation="${world ? 2.5 : 5}" flood-color="#000" flood-opacity=".55"/></filter>
          <filter id="rk-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <pattern id="rk-waves" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 10 Q10 4 20 10 T40 10" fill="none" stroke="#ffffff" stroke-opacity=".035" stroke-width="1.2"/></pattern>
        </defs>
        <rect width="${B.w}" height="${B.h}" fill="url(#rk-ocean)"/><rect width="${B.w}" height="${B.h}" fill="url(#rk-waves)"/>
        <g class="rk-grid">${grid}</g>
        <g filter="url(#rk-shadow)"><path class="rk-land" d="${B.land || ''}"/>${Object.values(B.conts).map((d) => `<path class="rk-landbase" d="${d}"/>`).join('')}</g>
        <g id="rk-terr">${M.ids.map((t) => `<path class="rk-tp" data-t="${t}" d="${B.terr[t].d}"/>`).join('')}</g>
        ${(B.rivers || []).map((rv) => `<path class="rk-river" d="${rv.d}" stroke-width="${rv.w}"/>`).join('')}
        <g class="rk-contlines">${Object.entries(B.conts).map(([c, d]) => `<path d="${d}" stroke="${M.conts[c].color}"/>`).join('')}</g>
        <g class="rk-routes">${routes}</g>
        <g id="rk-seas"></g>
        <g id="rk-badges" style="--r:${r}px"></g>
      </svg>
      <div class="rk-zoom"><button type="button" data-z="1" title="Reinzoomen">+</button><button type="button" data-z="-1" title="Rauszoomen">−</button><button type="button" data-z="0" title="Ganze Karte">⟲</button></div>
      <div class="rk-legend">${Object.values(M.conts).map((c) => `<span style="--cc:${c.color}">${esc(c.name)} <b>+${c.bonus}</b></span>`).join('')}</div>
      </div><div id="rk-banner" class="rk-banner"></div><div id="rk-dice" class="rk-dicebox"></div></div>
      <aside class="rk-side"><div id="rk-turn"></div><div id="rk-phase"></div><div id="rk-cards"></div><div id="rk-players"></div><div id="rk-conts"></div><div id="rk-log"></div></aside></div>`;
    const svg = $('#rk-svg');
    skel = { el: root.querySelector('.rk'), map: V.map, svg, vb: [0, 0, B.w, B.h], full: [0, 0, B.w, B.h], r, paths: {} };
    svg.querySelectorAll('.rk-tp').forEach((p) => { skel.paths[p.dataset.t] = p; });
    // Klicks auf Gebiete und Plaketten (ein Klick, kein Ziehen)
    let down = null, moved = false;
    svg.addEventListener('click', (e) => {
      if (moved) return;
      const el = e.target.closest('[data-t],[data-z-sea]');
      if (!el) return;
      if (el.dataset.t) clickTerr(el.dataset.t); else clickZone(el.dataset.zSea);
    });
    // Zoomen und Verschieben (Maus, Rad, Finger)
    const setVB = () => svg.setAttribute('viewBox', skel.vb.map((n) => n.toFixed(1)).join(' '));
    const clamp = () => {
      const [, , w0, h0] = skel.full;
      const ar = skel.ar || h0 / w0;
      skel.vb[2] = Math.min(w0, h0 / ar, Math.max(w0 / 6, skel.vb[2])); skel.vb[3] = skel.vb[2] * ar;
      skel.vb[0] = Math.max(-w0 * 0.05, Math.min(w0 * 1.05 - skel.vb[2], skel.vb[0])); skel.vb[1] = Math.max(-h0 * 0.05, Math.min(h0 * 1.05 - skel.vb[3], skel.vb[1]));
    };
    const toSvg = (cx, cy) => { const rc = svg.getBoundingClientRect(); const s = Math.max(skel.vb[2] / rc.width, skel.vb[3] / rc.height); const ox = (rc.width * s - skel.vb[2]) / 2, oy = (rc.height * s - skel.vb[3]) / 2; return [skel.vb[0] + (cx - rc.left) * s - ox, skel.vb[1] + (cy - rc.top) * s - oy, s]; };
    const zoomAt = (f, cx, cy) => { const [x, y] = toSvg(cx, cy); skel.vb[0] = x - (x - skel.vb[0]) * f; skel.vb[1] = y - (y - skel.vb[1]) * f; skel.vb[2] *= f; skel.vb[3] *= f; clamp(); setVB(); };
    svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    const ptrs = new Map();
    svg.addEventListener('pointerdown', (e) => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY, skel.vb[0], skel.vb[1]]; moved = false; });
    svg.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) {
        const [p1, p2] = [...ptrs.values()];
        const d1 = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
        const other = [...ptrs.entries()].find(([k]) => k !== e.pointerId)[1];
        const d0 = Math.hypot(prev[0] - other[0], prev[1] - other[1]);
        if (d0 > 0) zoomAt(d0 / d1, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
        moved = true;
        return;
      }
      if (!down) return;
      const dx = e.clientX - down[0], dy = e.clientY - down[1];
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (!moved) return;
      const [, , s] = toSvg(e.clientX, e.clientY);
      skel.vb[0] = down[2] - dx * s; skel.vb[1] = down[3] - dy * s; clamp(); setVB();
    });
    const up = (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) down = null; };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); svg.addEventListener('pointerleave', up);
    // Hochkant (Handy): Ausschnitt in der Form des Kartenfensters, damit die Karte die Höhe füllt
    const fit = () => {
      const rc = svg.getBoundingClientRect();
      if (!rc.width || !rc.height) return;
      const [, , w0, h0] = skel.full;
      skel.ar = rc.height / rc.width;
      const w = Math.min(w0, h0 / skel.ar);
      skel.home = [(w0 - w) / 2, (h0 - w * skel.ar) / 2, w, w * skel.ar];
      skel.vb = skel.home.slice(); clamp(); setVB();
    };
    setTimeout(fit, 30);
    window.addEventListener('resize', () => { if (skel && skel.svg === svg) fit(); });
    root.querySelectorAll('[data-z]').forEach((b) => {
      b.onclick = () => {
        const z = Number(b.dataset.z), rc = svg.getBoundingClientRect();
        if (!z) { skel.vb = (skel.home || skel.full).slice(); setVB(); return; }
        zoomAt(z > 0 ? 1 / 1.4 : 1.4, rc.left + rc.width / 2, rc.top + rc.height / 2);
      };
    });
  }

  // ---------- Darstellung ----------
  function render(root, V, me, api) {
    if (!V) return;
    last = { V, me, api };
    ensureSkel(root, V);
    const myTurn = V.players[V.cur].id === me && V.phase !== 'over';
    const turnKey = `${V.turn}|${V.cur}|${V.phase}`;
    if (turnKey !== lastTurnKey) { if (!['attack', 'fortify', 'move'].includes(V.phase) || (lastTurnKey && !lastTurnKey.startsWith(`${V.turn}|${V.cur}|`))) { sel = null; target = null; zoneSel = null; pickCards = []; } if (myTurn && V.phase === 'reinforce' && lastTurnKey) FX && FX.play('turn'); lastTurnKey = turnKey; }
    if (!myTurn) { sel = null; target = null; zoneSel = null; }
    sounds(V, me);
    drawMarkers(V, me, api, myTurn);
    renderTurn(V, me, myTurn);
    renderPhase(V, me, api, myTurn);
    renderCards(V, me, api, myTurn);
    renderPlayers(V, me);
    renderConts(V);
    put($('#rk-log'), `<details class="rk-box" open><summary>Protokoll</summary><ul class="rk-loglist">${V.log.slice(-10).reverse().map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>`);
    renderDice(V);
    if (V.phase === 'over') renderOver(root, V, me, api);
    else { const o = $('#rk-over'); if (o) o.remove(); }
  }

  function sounds(V, me) {
    if (V.last && V.last.seq !== lastSeq) {
      if (lastSeq !== null) {
        FX && FX.play('roll');
        if (V.last.kind === 'sea') VO && VO.say('risk-sea', { chance: 0.5 });
        else if (V.last.open && V.last.open.aAir) VO && VO.say('risk-air', { chance: 0.4 });
        if (V.last.conquered) { setTimeout(() => FX && FX.play(V.last.pid === me ? 'build' : 'coinDown'), 500); if (V.last.pid === me) VO && VO.say('risk-conquer', { chance: 0.35 }); }
        if (V.last.elim) setTimeout(() => VO && VO.say('risk-elim', { force: true }), 800);
      }
      lastSeq = V.last.seq;
    }
    if (V.phase === 'over' && lastWinner !== V.winner) { lastWinner = V.winner; if (V.winner === me) { FX && FX.play('win'); FX && FX.confetti(); } else VO && VO.say('loss', { force: true }); }
  }

  function targetsFor(V, me) {
    const M = mapOf(V), out = new Set();
    if (!sel) return out;
    if (V.phase === 'attack') M.T[sel].adj.forEach((n) => { if (V.owner[n] !== me && seaOk(V, me, sel, n)) out.add(n); });
    if (V.phase === 'fortify') M.ids.forEach((t) => { if (t !== sel && V.owner[t] === me && reachable(V, me, sel, t)) out.add(t); });
    return out;
  }
  function drawMarkers(V, me, api, myTurn) {
    const M = mapOf(V), B = SH()[V.map];
    const tg = targetsFor(V, me);
    const caps = Object.entries(V.capitals || {}).reduce((o, [pid, t]) => { o[t] = pid; return o; }, {});
    const pend = V.pending;
    const r = skel.r;
    // Flächen einfärben
    M.ids.forEach((t) => {
      const p = skel.paths[t];
      p.setAttribute('fill', color(V, V.owner[t]));
      p.setAttribute('class', ['rk-tp', V.owner[t] === me ? 'mine' : '', sel === t ? 'sel' : '', target === t ? 'tgt' : '', tg.has(t) ? 'can' : '', pend && (pend.from === t || pend.to === t) ? 'pend' : ''].join(' '));
    });
    // Ausgewählte und Ziele nach oben, damit ihr Rand sichtbar ist
    [...tg, sel, target].filter(Boolean).forEach((t) => skel.paths[t].parentNode.appendChild(skel.paths[t]));
    // Plaketten mit Truppenzahl und Namen
    const badges = M.ids.map((t) => {
      const T = M.T[t], P = B.terr[t], own = V.owner[t];
      const units = V.real && (V.tank[t] || V.air[t]) ? `<text class="rk-bu" x="${P.x}" y="${P.y - r - 4}">${V.tank[t] ? `P${V.tank[t]}` : ''}${V.tank[t] && V.air[t] ? ' ' : ''}${V.air[t] ? `F${V.air[t]}` : ''}</text>` : '';
      return `<g class="rk-b ${sel === t ? 'sel' : ''} ${target === t ? 'tgt' : ''} ${tg.has(t) ? 'can' : ''}" data-t="${t}">
        <circle cx="${P.x}" cy="${P.y}" r="${r}" fill="#0e0b13" stroke="${color(V, own)}"/>
        <text class="rk-bn" x="${P.x}" y="${P.y}">${ground(V, t)}</text>
        <text class="rk-bl" x="${P.x}" y="${P.y + r + 9}">${esc(T.name)}</text>${units}
        ${caps[t] ? `<text class="rk-bc" x="${P.x + r * 0.9}" y="${P.y - r * 0.7}">★</text>` : ''}<title>${esc(T.name)} · ${esc(M.conts[T.c].name)} · ${esc(pname(V, own))}: ${V.real ? `${V.inf[t]} Inf, ${V.tank[t]} Panzer, ${V.air[t]} Flieger` : `${ground(V, t)} Truppen`}</title></g>`;
    }).join('');
    $('#rk-badges').innerHTML = badges;
    // Seezonen (Realistic)
    $('#rk-seas').innerHTML = V.real ? Object.values(M.Z).map((z) => {
      const P = B.seas[z.id], f = V.fleet[z.id];
      const canZ = zoneSel && M.Z[zoneSel].adj.includes(z.id);
      const s = r * 1.05;
      return `<g class="rk-zb ${f ? 'has' : ''} ${zoneSel === z.id ? 'sel' : ''} ${canZ ? 'can' : ''}" data-z-sea="${z.id}">
        <rect x="${P.x - s}" y="${P.y - s}" width="${s * 2}" height="${s * 2}" rx="5" transform="rotate(45 ${P.x} ${P.y})" fill="${f ? color(V, f.pid) : 'rgba(10,30,60,.8)'}"/>
        <text class="rk-bn" x="${P.x}" y="${P.y}">${f ? f.n : '~'}</text><text class="rk-zl" x="${P.x}" y="${P.y + s + 11}">${esc(z.name)}</text>
        <title>${esc(z.name)}${f ? ` · ${esc(pname(V, f.pid))}: ${f.n} Schiffe` : ' · frei'}</title></g>`;
    }).join('') : '';
  }

  function clickTerr(t) {
    if (!last) return;
    const { V, me, api } = last;
    if (V.players[V.cur].id !== me) return;
    zoneSel = null;
    if (V.phase === 'reinforce') {
      if (V.owner[t] !== me) return api.toast('Das ist nicht dein Gebiet.');
      if (!V.real) { const n = qty === 'all' ? V.reinforce : Math.min(qty, V.reinforce); if (n > 0) { FX && FX.play('pop'); api.act({ type: 'place', t, n }); } return; }
      if (unit === 'ship') return api.toast('Schiffe setzt du in eine Seezone (die Kreise im Wasser).');
      const n = qty === 'all' ? Math.floor(V.budget / R.COST[unit]) : qty;
      if (n < 1) return api.toast('Dafür reicht dein Budget nicht.');
      FX && FX.play('pop'); api.act({ type: 'buy', unit, t, n });
      return;
    }
    if (V.phase === 'attack') {
      if (V.owner[t] === me) { sel = ground(V, t) >= 2 ? t : null; target = null; if (!sel) api.toast('Zum Angreifen braucht ein Gebiet mindestens 2 Truppen.'); }
      else if (sel && mapOf(V).T[sel].adj.includes(t)) { if (!seaOk(V, me, sel, t)) api.toast('Blockade: fremde Schiffe auf diesem Wasserweg.'); else target = t; }
      else api.toast(sel ? 'Das grenzt nicht an dein gewähltes Gebiet.' : 'Wähl zuerst eins deiner Gebiete.');
      return render2();
    }
    if (V.phase === 'fortify') {
      if (V.owner[t] !== me) return;
      if (!sel || sel === t) { sel = sel === t ? null : t; target = null; }
      else if (reachable(V, me, sel, t)) target = t;
      else { sel = t; target = null; }
      return render2();
    }
  }
  function clickZone(z) {
    if (!last) return;
    const { V, me, api } = last;
    if (V.players[V.cur].id !== me || !V.real) return;
    if (V.phase === 'reinforce') {
      if (unit !== 'ship') { unit = 'ship'; render2(); }
      const n = qty === 'all' ? Math.floor(V.budget / R.COST.ship) : qty;
      if (n < 1) return api.toast('Dafür reicht dein Budget nicht.');
      FX && FX.play('pop'); api.act({ type: 'buy', unit: 'ship', zone: z, n });
      return;
    }
    if (V.phase === 'attack' || V.phase === 'fortify') {
      const f = V.fleet[z];
      if (zoneSel && mapOf(V).Z[zoneSel].adj.includes(z)) { const from = zoneSel; zoneSel = null; api.act({ type: 'naval', from, to: z }); return; }
      if (f && f.pid === me) { zoneSel = zoneSel === z ? null : z; sel = null; target = null; render2(); }
      else api.toast('Wähl zuerst eine eigene Flotte.');
    }
  }
  const render2 = () => { if (last && skel) render(skel.el.parentElement, last.V, last.me, last.api); };

  function renderTurn(V, me, myTurn) {
    const p = V.players[V.cur];
    put($('#rk-turn'), `<div class="rk-box rk-turnbox" style="--pc:${p.color}"><div><small>Runde ${V.turn} · ${esc(PHASE[V.phase])}</small><b>${myTurn ? 'Du bist dran' : `${esc(p.name)} ist dran`}</b></div>
      <span class="chip">${esc(mapOf(V).name)} · ${V.real ? 'Realistic' : 'Klassisch'} · ${V.goal === 'world' ? 'Weltherrschaft' : V.goal === 'quick' ? '65 % der Gebiete' : 'Hauptstädte'}</span></div>`);
  }
  function renderPhase(V, me, api, myTurn) {
    const el = $('#rk-phase');
    if (!myTurn) { put(el, V.phase === 'over' ? '' : `<div class="rk-box rk-wait">${V.players[V.cur].bot ? 'Der Bot überlegt …' : 'Warte auf den Zug …'}</div>`); return; }
    const M = mapOf(V);
    // Nach einem Angriff: Startgebiet zu schwach oder Ziel erobert → Auswahl lösen
    if (V.phase === 'attack' && sel && (V.owner[sel] !== me || ground(V, sel) < 2)) { sel = null; target = null; }
    if (V.phase === 'attack' && target && V.owner[target] === me) target = null;
    let h = '';
    const qtyChips = (opts) => `<div class="rk-chips">${opts.map((q) => `<button type="button" class="${qty === q ? 'on' : ''}" data-qty="${q}">${q === 'all' ? 'Alle' : `+${q}`}</button>`).join('')}</div>`;
    if (V.phase === 'reinforce') {
      const inc = V.income[me];
      const mustTrade = typeof V.cards[me] === 'object' && V.cards[me].length >= 5;
      h = `<div class="rk-box rk-act"><h3>Verstärken</h3><p class="rk-sub">${inc.terr} Gebiete → ${Math.max(3, Math.floor(inc.terr / 3))}${inc.bonus.length ? ` + Bonus (${esc(inc.bonus.join(', '))})` : ''}</p>
        ${V.real ? `<div class="rk-big">${V.budget} <small>Punkte</small></div>
          <div class="rk-units-buy">${Object.entries(R.COST).map(([u, c]) => `<button type="button" class="${unit === u ? 'on' : ''}" data-unit="${u}"><b>${R.UNIT[u]}</b><small>${c} ${c === 1 ? 'Punkt' : 'Punkte'}</small><em>${{ inf: 'hält Gebiete', tank: '+1 auf einen Würfel', air: 'Luftkampf + Bomben', ship: 'See, Blockade, Beschuss' }[u]}</em></button>`).join('')}</div>
          ${qtyChips([1, 3, 5, 'all'])}<p class="rk-hint">${unit === 'ship' ? 'Klick auf eine Seezone neben deinem Küstengebiet.' : 'Klick auf dein Gebiet, um zu kaufen.'}</p>
          <button class="btn btn-primary" data-end-reinf>${V.budget > 0 ? 'Einkauf beenden (Rest verfällt)' : 'Weiter zum Angriff'}</button>`
        : `<div class="rk-big">${V.reinforce} <small>Truppen zu setzen</small></div>${qtyChips([1, 3, 5, 'all'])}<p class="rk-hint">Klick auf deine Gebiete. Danach geht es automatisch zum Angriff.</p>`}
        ${mustTrade ? '<p class="rk-warn">Du hast 5 Karten – erst ein Set tauschen.</p>' : ''}</div>`;
    } else if (V.phase === 'attack') {
      if (zoneSel) h = `<div class="rk-box rk-act"><h3>Flotte ${esc(M.Z[zoneSel].name)}</h3><p class="rk-sub">${V.fleet[zoneSel] ? V.fleet[zoneSel].n : 0} Schiffe. Klick auf eine angrenzende Seezone: einlaufen oder angreifen.</p><button class="btn btn-ghost" data-unsel>Abwählen</button></div>`;
      else if (sel && target) {
        const z = M.T[sel].sea[target];
        h = `<div class="rk-box rk-act"><h3>Angriff</h3><div class="rk-vs"><span style="--pc:${color(V, me)}"><b>${esc(M.T[sel].name)}</b>${ground(V, sel)} Truppen${V.real ? `<small>${V.tank[sel]} Panzer · ${V.air[sel]} Flieger</small>` : ''}</span><i>gegen</i><span style="--pc:${color(V, V.owner[target])}"><b>${esc(M.T[target].name)}</b>${ground(V, target)} Truppen${V.real ? `<small>${V.tank[target]} Panzer · ${V.air[target]} Flieger</small>` : ''}</span></div>
          ${z ? `<p class="rk-sub">Über Wasser: ${esc(M.Z[z].name)}</p>` : ''}
          <div class="btn-row"><button class="btn btn-primary" data-att="0">Würfeln</button><button class="btn" data-att="1">Blitz (bis zum Ende)</button></div><button class="btn btn-small btn-ghost" data-unsel>Abbrechen</button></div>`;
      } else h = `<div class="rk-box rk-act"><h3>Angreifen</h3><p class="rk-hint">${sel ? `Von <b>${esc(M.T[sel].name)}</b> aus: klick ein leuchtendes Nachbargebiet.` : 'Klick dein Gebiet (mind. 2 Truppen), dann ein Nachbargebiet.'}${V.real ? ' Flotten: klick deine Seezone.' : ''}</p>
        <div class="btn-row"><button class="btn" data-end-att>Angriff beenden</button><button class="btn btn-ghost" data-end-turn>Zug beenden</button></div></div>`;
    } else if (V.phase === 'move') {
      const P = V.pending;
      h = `<div class="rk-box rk-act"><h3>${esc(M.T[P.to].name)} erobert!</h3><p class="rk-sub">Wie viele Truppen ziehen nach?</p>
        <div class="rk-range"><input type="range" id="rk-mv" min="${P.min}" max="${P.max}" value="${P.max}"><b id="rk-mvn">${P.max}</b></div>
        ${V.real && V.air[P.from] ? `<label class="rk-check"><input type="checkbox" id="rk-mvair" checked> ${V.air[P.from]} Flieger mitverlegen</label>` : ''}
        <button class="btn btn-primary" data-move>Nachziehen</button></div>`;
    } else if (V.phase === 'fortify') {
      if (zoneSel) h = `<div class="rk-box rk-act"><h3>Flotte ${esc(M.Z[zoneSel].name)}</h3><p class="rk-sub">Klick eine angrenzende freie oder eigene Seezone zum Verlegen.</p><button class="btn btn-ghost" data-unsel>Abwählen</button></div>`;
      else if (sel && target) {
        const maxFor = (u) => (u === 'air' ? V.air[sel] : Math.min(V[u][sel], ground(V, sel) - 1));
        if (!V.real) fUnit = 'inf';
        else if (maxFor(fUnit) < 1) fUnit = ['inf', 'tank', 'air'].find((u) => maxFor(u) >= 1) || 'inf';
        const mx = maxFor(fUnit);
        h = `<div class="rk-box rk-act"><h3>Verschieben</h3><p class="rk-sub">${esc(M.T[sel].name)} → ${esc(M.T[target].name)}</p>
          ${V.real ? `<div class="rk-chips">${['inf', 'tank', 'air'].map((u) => `<button type="button" class="${fUnit === u ? 'on' : ''}" data-funit="${u}" ${maxFor(u) < 1 ? 'disabled' : ''}>${R.UNIT[u]} (${Math.max(0, maxFor(u))})</button>`).join('')}</div>` : ''}
          ${mx >= 1 ? `<div class="rk-range"><input type="range" id="rk-fv" min="1" max="${mx}" value="${mx}"><b id="rk-fvn">${mx}</b></div><button class="btn btn-primary" data-fort>Verschieben und Zug beenden</button>` : '<p class="rk-warn">Von hier kann nichts weg (1 Bodentruppe muss bleiben).</p>'}
          <button class="btn btn-small btn-ghost" data-unsel>Abbrechen</button></div>`;
      } else h = `<div class="rk-box rk-act"><h3>Verschieben</h3><p class="rk-hint">Einmal pro Zug: klick ein eigenes Gebiet, dann ein verbundenes eigenes Gebiet.${V.real ? ' Flotten kannst du auch verlegen.' : ''}</p><button class="btn btn-primary" data-end-turn>Zug beenden</button></div>`;
    }
    if (put(el, h)) {
      el.querySelectorAll('[data-qty]').forEach((b) => { b.onclick = () => { qty = b.dataset.qty === 'all' ? 'all' : Number(b.dataset.qty); render2(); }; });
      el.querySelectorAll('[data-unit]').forEach((b) => { b.onclick = () => { unit = b.dataset.unit; render2(); }; });
      el.querySelectorAll('[data-funit]').forEach((b) => { b.onclick = () => { fUnit = b.dataset.funit; render2(); }; });
      const on = (s, f) => { const b = el.querySelector(s); if (b) b.onclick = f; };
      on('[data-end-reinf]', () => api.act({ type: 'endReinforce' }));
      on('[data-end-att]', () => { sel = null; target = null; api.act({ type: 'endAttack' }); });
      on('[data-end-turn]', () => { sel = null; target = null; api.act({ type: 'endTurn' }); });
      on('[data-unsel]', () => { sel = null; target = null; zoneSel = null; render2(); });
      el.querySelectorAll('[data-att]').forEach((b) => { b.onclick = () => api.act({ type: 'attack', from: sel, to: target, blitz: b.dataset.att === '1' }); });
      const mv = $('#rk-mv'); if (mv) mv.oninput = () => { $('#rk-mvn').textContent = mv.value; };
      on('[data-move]', () => { api.act({ type: 'move', n: Number($('#rk-mv').value), air: !!($('#rk-mvair') && $('#rk-mvair').checked) }); target = null; });
      const fv = $('#rk-fv'); if (fv) fv.oninput = () => { $('#rk-fvn').textContent = fv.value; };
      on('[data-fort]', () => { const a = { type: 'fortify', from: sel, to: target, n: Number($('#rk-fv').value), unit: fUnit }; sel = null; target = null; api.act(a); });
    }
  }
  function renderCards(V, me, api, myTurn) {
    const hand = V.cards[me];
    if (!V.cardsOn || !Array.isArray(hand)) { put($('#rk-cards'), ''); return; }
    pickCards = pickCards.filter((i) => i < hand.length);
    const M = mapOf(V);
    const canTrade = myTurn && V.phase === 'reinforce' && pickCards.length === 3 && R.validSet(pickCards.map((i) => hand[i]));
    const h = `<div class="rk-box"><h4>Deine Karten <small>nächstes Set: ${V.nextTrade} ${V.real ? 'Punkte' : 'Truppen'}</small></h4>
      ${hand.length ? `<div class="rk-hand">${hand.map((c, i) => `<button type="button" class="rk-card k-${c.k} ${pickCards.includes(i) ? 'on' : ''}" data-card="${i}"><b>${KIND[c.k]}</b><small>${c.t ? esc(M.T[c.t].name) : 'passt zu allem'}</small></button>`).join('')}</div>` : '<p class="rk-sub">Keine. Erobere in einem Zug mindestens ein Gebiet, dann bekommst du eine.</p>'}
      ${myTurn && V.phase === 'reinforce' && hand.length >= 3 ? `<button class="btn btn-small ${canTrade ? 'btn-primary' : ''}" data-trade ${canTrade ? '' : 'disabled'}>Set tauschen</button><small class="rk-sub"> 3 gleiche, 3 verschiedene oder mit Joker</small>` : ''}</div>`;
    if (put($('#rk-cards'), h)) {
      $('#rk-cards').querySelectorAll('[data-card]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.card); pickCards = pickCards.includes(i) ? pickCards.filter((x) => x !== i) : pickCards.concat(i).slice(-3); render2(); }; });
      const t = $('#rk-cards [data-trade]'); if (t) t.onclick = () => { api.act({ type: 'trade', idx: pickCards }); pickCards = []; };
    }
  }
  function renderPlayers(V, me) {
    const M = mapOf(V);
    const rows = V.players.map((p) => {
      const terr = M.ids.filter((t) => V.owner[t] === p.id);
      const troops = terr.reduce((s, t) => s + ground(V, t) + (V.real ? V.air[t] : 0), 0) + (V.real ? Object.values(V.fleet).filter((f) => f.pid === p.id).reduce((s, f) => s + f.n, 0) : 0);
      const cards = Array.isArray(V.cards[p.id]) ? V.cards[p.id].length : V.cards[p.id];
      const cap = V.capitals && V.capitals[p.id];
      return `<li class="${V.alive[p.id] ? '' : 'dead'} ${V.players[V.cur].id === p.id ? 'cur' : ''}" style="--pc:${p.color}"><strong>${esc(p.name)}${p.id === me ? ' (du)' : ''}${p.bot ? ' <small>BOT</small>' : ''}</strong>
        <span>${terr.length} Gebiete · ${troops} ${V.real ? 'Einheiten' : 'Truppen'} · ${cards} Karten · +${V.income[p.id].n}</span>${cap ? `<em>★ ${esc(M.T[cap].name)}${V.owner[cap] !== p.id ? ' (verloren)' : ''}</em>` : ''}</li>`;
    }).join('');
    put($('#rk-players'), `<div class="rk-box"><h4>Spieler</h4><ul class="rk-plist">${rows}</ul></div>`);
  }
  function renderConts(V) {
    const M = mapOf(V);
    put($('#rk-conts'), `<details class="rk-box"><summary>Kontinente</summary><ul class="rk-clist">${Object.values(M.conts).map((c) => {
      const owners = new Set(c.terr.map((t) => V.owner[t]));
      const holder = owners.size === 1 ? [...owners][0] : null;
      return `<li style="--cc:${c.color}"><span>${esc(c.name)}</span><small>${c.terr.length} Gebiete</small><b>+${c.bonus}</b>${holder ? `<em style="color:${color(V, holder)}">${esc(pname(V, holder))}</em>` : ''}</li>`;
    }).join('')}</ul></details>`);
  }
  function renderDice(V) {
    const L = V.last;
    if (!L) { put($('#rk-dice'), ''); return; }
    const M = mapOf(V);
    const r = L.rounds[L.rounds.length - 1];
    const die = (n, cls) => `<i class="rk-die ${cls}">${n}</i>`;
    const where = L.kind === 'sea' ? `${esc(M.Z[L.from].name)} → ${esc(M.Z[L.to].name)}` : `${esc(M.T[L.from].name)} → ${esc(M.T[L.to].name)}`;
    const o = L.open;
    const open = o && (o.aAir || o.dAir || o.ships) ? `<div class="rk-open">${o.aAir || o.dAir ? `Luftkampf: ${o.aAir} gegen ${o.dAir} Flieger · verloren ${o.aLost}/${o.dLost} · Bomben ${o.bomb}` : ''}${o.ships ? `${o.aAir || o.dAir ? ' · ' : ''}Küstenbeschuss (${o.ships} Schiffe): ${o.shore}` : ''}</div>` : '';
    put($('#rk-dice'), `<div class="rk-dice" style="--ac:${color(V, L.pid)};--dc:${color(V, L.def)}"><small>${L.kind === 'sea' ? 'Seeschlacht' : 'Kampf'} · ${where}${L.rounds.length > 1 ? ` · ${L.rounds.length} Runden` : ''}</small>${open}
      ${r ? `<div class="rk-dicerow">${r.a.map((n) => die(n, 'att')).join('')}<span>vs</span>${r.d.map((n) => die(n, 'def')).join('')}</div>` : ''}
      <div class="rk-loss">${esc(pname(V, L.pid))} −${L.la} · ${esc(pname(V, L.def))} −${L.ld}${L.conquered ? ` · <b>${L.kind === 'sea' ? 'Seezone erobert' : 'erobert!'}</b>` : ''}</div></div>`);
  }
  function renderOver(root, V, me, api) {
    if ($('#rk-over')) return;
    const w = V.players.find((p) => p.id === V.winner);
    const M = mapOf(V);
    const rows = V.players.slice().sort((a, b) => M.ids.filter((t) => V.owner[t] === b.id).length - M.ids.filter((t) => V.owner[t] === a.id).length)
      .map((p) => `<li style="--pc:${p.color}"><strong>${esc(p.name)}</strong><b>${M.ids.filter((t) => V.owner[t] === p.id).length} Gebiete · ${V.stats[p.id].won} erobert · ${V.stats[p.id].kills} ausgelöscht</b></li>`).join('');
    const el = document.createElement('div');
    el.id = 'rk-over';
    el.className = 'uno-over';
    el.innerHTML = `<div class="p-card"><p class="sec-label"><span class="n">RISIKO</span>Runde ${V.turn}</p><h2>${w.id === me ? 'Du hast die Welt erobert!' : `${esc(w.name)} gewinnt!`}</h2><ol class="kno-rank">${rows}</ol>
      <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" data-again>Revanche</button><button class="btn btn-ghost" data-lobby>Zur Lobby</button>' : ''}<button class="btn btn-ghost" data-close>Karte ansehen</button></div></div>`;
    skel.el.appendChild(el);
    el.querySelector('[data-close]').onclick = () => el.remove();
    if (api.isHost) { el.querySelector('[data-again]').onclick = api.again; el.querySelector('[data-lobby]').onclick = api.lobby; }
  }

  // ---------- Lobby ----------
  const sel2 = (k, st, host, opts) => `<select data-set="${k}" ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${String(st[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  window.DULI_PARTY.start({
    id: 'risiko', title: 'Risiko', kicker: 'WELTEROBERUNG', titleHTML: 'Risi<span class="outline">ko</span>',
    min: 2, max: 6, soloBots: 2, botNames: ['April-Bot', 'General Kevin', 'Admiral Bernd', 'Feldmarschall Rita', 'Byte-Basti'],
    tagline: 'Erobere die Welt – oder den Pott. Klassisch wie Risiko oder Realistic mit Panzern, Fliegern und Schlachtschiffen.',
    defaults: { map: 'world', mode: 'classic', goal: 'world', cards: true },
    settingsHTML: (st, host) => `
      <label class="row"><span>Karte<small>${esc((D.MAPS[st.map] || D.MAPS.world).desc)}</small></span>${sel2('map', st, host, [['world', 'Welt'], ['ruhr', 'Ruhrpott']])}</label>
      <label class="row"><span>Modus<small>${st.mode === 'real' ? 'Einkauf mit Punkten: Infanterie, Panzer (+1 Würfel), Flieger (Luftkampf und Bomben), Schiffe (Seeschlacht, Blockade, Küstenbeschuss)' : 'Wie das Brettspiel: Truppen setzen, würfeln, verschieben'}</small></span>${sel2('mode', st, host, [['classic', 'Klassisch'], ['real', 'Realistic']])}</label>
      <label class="row"><span>Ziel</span>${sel2('goal', st, host, [['world', 'Weltherrschaft'], ['quick', 'Schnell: 65 % der Gebiete'], ['capitals', 'Alle Hauptstädte erobern']])}</label>
      <label class="row"><span>Risikokarten<small>Nach jedem Zug mit Eroberung eine Karte, Sets geben Extra-Truppen</small></span><input type="checkbox" class="switch" data-set="cards" ${st.cards !== false ? 'checked' : ''} ${host ? '' : 'disabled'}></label>`,
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li><b>Verstärken:</b> Gebiete geteilt durch 3 (mindestens 3) plus Bonus für ganze Kontinente plus Kartensets.</li>
      <li><b>Angreifen:</b> bis zu 3 Würfel gegen 2. Die höchsten Würfel werden verglichen, bei Gleichstand gewinnt die Verteidigung. „Blitz“ würfelt bis zum Ende.</li>
      <li><b>Verschieben:</b> einmal pro Zug zwischen verbundenen eigenen Gebieten.</li>
      <li><b>Realistic:</b> Panzer geben +1 auf einen Würfel (darum gibt es auch mal eine 7). Flieger kämpfen vor dem Angriff in der Luft und bomben Verteidiger. Schiffe beherrschen Seezonen, blockieren Wasserwege und beschießen Küsten.</li>
      <li>Ziele: Weltherrschaft, 65 % der Gebiete oder alle Hauptstädte. Auf der Ruhrpott-Karte sind Rhein und Kanäle das Wasser.</li></ul></div>`,
    engine: R, render,
  });
})();
