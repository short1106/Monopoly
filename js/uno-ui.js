// DULIDAN UNO – Oberfläche (Karten, Tisch, Farbwahl, April-Tausch)
(function () {
  const U = window.DULI_UNO, FX = window.DULI_FX, esc = window.DULI_PARTY.esc;
  const SYM = { skip: '⊘', rev: '⇄', d2: '+2', d4: '+4', wild: '', april: '' };
  let pick = null, lastFx = null, lastTurn = null, lastWin = null;
  const VO = window.DULI_VOICE;
  if (VO) VO.remap({ card: ['card', 0.04], jail: ['loss', 0.5] });

  function cardHTML(c, attrs = '', cls = '') {
    const col = c.c ? `c-${c.c}` : 'c-wild';
    const label = /^\d$/.test(c.v) ? c.v : SYM[c.v];
    const mid = c.v === 'april' ? '<svg class="uc-april" viewBox="0 0 100 100"><use href="#april"/></svg>'
      : c.v === 'wild' || c.v === 'd4' ? `<span class="uc-wheel"><i></i><i></i><i></i><i></i></span>${c.v === 'd4' ? '<b class="uc-plus">+4</b>' : ''}`
        : `<span class="uc-num">${label}</span>`;
    return `<button type="button" class="ucard ${col} v-${c.v} ${cls}" ${attrs}><span class="uc-oval"></span><span class="uc-tl">${c.v === 'april' ? 'A' : c.v === 'wild' ? '★' : label}</span>${mid}<span class="uc-br">${c.v === 'april' ? 'A' : c.v === 'wild' ? '★' : label}</span></button>`;
  }
  const back = (n, cls = '') => `<span class="ucard uc-back ${cls}"><span class="uc-logo">DULIDAN<br><b>UNO</b></span>${n != null ? `<b class="uc-n">${n}</b>` : ''}</span>`;
  function playableV(V, c) {
    if (V.pending) return V.settings.stack !== false && c.v === V.pendType;
    if (!c.c) return true;
    return c.c === V.color || c.v === V.top.v;
  }

  function render(root, V, me, api) {
    if (!V) return;
    const P = (id) => V.players.find((p) => p.id === id);
    const cur = V.players[V.cur], myTurn = cur.id === me && !V.winner;
    const myIdx = V.players.findIndex((p) => p.id === me);
    const order = V.players.map((_, k) => V.players[(myIdx + 1 + k) % V.players.length]).filter((p) => p.id !== me);
    const hand = V.hand.slice().sort((a, b) => (a.c || 'z').localeCompare(b.c || 'z') || String(a.v).localeCompare(String(b.v)));
    // Soundeffekte und Hinweise
    if (V.fx && lastFx !== V.fx.seq) {
      if (lastFx != null) FX && FX.play(V.fx.kind === 'play' ? 'card' : V.fx.kind === 'catch' ? 'jail' : 'coinDown');
      if (lastFx != null && VO && V.fx.kind === 'play' && V.fx.card && V.fx.card.v === 'd4') VO.say('d4', { chance: 0.6 });
      lastFx = V.fx.seq;
    }
    if (myTurn && lastTurn !== `${V.logSeq}|${cur.id}` && lastTurn && !lastTurn.endsWith(me)) FX && FX.play('turn');
    lastTurn = `${V.logSeq}|${cur.id}`;
    if (V.winner && lastWin !== `${V.round}|${V.winner}`) { if (lastWin !== null) FX && FX.play('win'); lastWin = `${V.round}|${V.winner}`; } else if (!V.winner && lastWin === null) lastWin = '';

    const opp = order.map((p) => {
      const n = V.counts[p.id];
      return `<div class="uno-opp ${cur.id === p.id && !V.winner ? 'is-cur' : ''}" style="--pc:${p.color}">
        <div class="uo-fan">${Array.from({ length: Math.min(n, 9) }, (_, k) => `<i style="--k:${k - Math.min(n, 9) / 2}"></i>`).join('')}</div>
        <strong>${esc(p.name)}${p.bot ? ' <span class="bot-tag">BOT</span>' : ''}</strong><small>${n} Karte${n === 1 ? '' : 'n'} · ${V.scores[p.id] || 0} P.</small>
        ${n === 1 && V.said[p.id] ? '<span class="uo-uno">UNO!</span>' : ''}
        ${V.exposed[p.id] ? `<button class="btn btn-small btn-danger" data-catch="${esc(p.id)}">Erwischt!</button>` : ''}</div>`;
    }).join('');
    const col = U.COLORS[V.color];
    const canUno = V.hand.length <= 2 && !V.said[me] && !V.winner && (myTurn || V.exposed[me]);
    let h = `<div class="uno">
      <div class="uno-opps">${opp}</div>
      <div class="uno-table" style="--cc:${col.hex}">
        <button type="button" class="uno-pile ${myTurn && V.drawn == null ? 'is-live' : ''}" data-draw>${back(V.drawCount)}<small>${V.pending && myTurn ? `${V.pending} ziehen` : 'Ziehen'}</small></button>
        <div class="uno-discard" data-k="${V.fx ? V.fx.seq : 0}">${V.discard.slice(0, -1).map((c, k) => `<span class="uc-under" style="--r:${(k * 37) % 24 - 12}deg">${cardHTML(c, 'tabindex="-1"')}</span>`).join('')}${cardHTML(V.top, 'tabindex="-1"', 'uc-top')}</div>
        <div class="uno-info"><span class="uno-color"><i></i>${col.name}</span><span class="uno-dir">${V.dir > 0 ? '↻ im Uhrzeigersinn' : '↺ gegen den Uhrzeigersinn'}</span>${V.pending ? `<span class="uno-pend">+${V.pending} offen</span>` : ''}</div>
      </div>
      <div class="uno-status">${V.winner ? '' : myTurn ? `<strong>Du bist dran!</strong> ${V.pending ? `Leg eine ${U.NAME[V.pendType]} drauf oder zieh ${V.pending}.` : V.drawn != null ? 'Spiel die gezogene Karte oder passe.' : 'Leg eine passende Karte oder zieh.'}` : `${esc(cur.name)} ist dran …`}</div>
      <ul class="uno-log">${V.log.slice(-4).reverse().map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="uno-me" style="--n:${hand.length}">${hand.map((c, k) => cardHTML(c, `data-card="${c.id}" style="--k:${k - (hand.length - 1) / 2}"`, myTurn && playableV(V, c) && (V.drawn == null || V.drawn === c.id) ? 'is-ok' : 'is-dim')).join('')}</div>
      <div class="btn-row uno-acts">${canUno ? '<button class="btn btn-primary uno-btn" data-uno>UNO!</button>' : ''}${myTurn && V.drawn != null ? '<button class="btn" data-pass>Passen</button>' : ''}<span class="uno-score">Du: ${V.scores[me] || 0} Punkte · Runde ${V.round}</span></div>
    </div>`;
    if (V.winner) {
      const w = P(V.winner);
      h += `<div class="uno-over"><div class="p-card"><p class="sec-label"><span class="n">RUNDE ${V.round}</span>Vorbei</p><h2>${esc(w.name)} gewinnt!</h2>
        <ol class="rank">${V.players.slice().sort((a, b) => (V.scores[b.id] || 0) - (V.scores[a.id] || 0)).map((p) => `<li><span>${esc(p.name)}</span><strong>${V.scores[p.id] || 0} P.</strong></li>`).join('')}</ol>
        ${api.isHost ? '<div class="btn-row"><button class="btn btn-primary" data-again>Nächste Runde</button><button class="btn btn-ghost" data-lobby>Zur Lobby</button></div>' : '<p class="p-wait">Der Host startet die nächste Runde …</p>'}</div></div>`;
    }
    if (pick) {
      const c = V.hand.find((x) => x.id === pick.id);
      if (!c || !myTurn) pick = null;
      else {
        h += `<div class="uno-over"><div class="p-card uno-pick"><h3>${c.v === 'april' ? 'April-Karte: Farbe wählen und Hand tauschen' : 'Welche Farbe?'}</h3>
          <div class="uno-colors">${Object.entries(U.COLORS).map(([k, x]) => `<button class="uno-cbtn ${pick.color === k ? 'is-on' : ''}" style="--cc:${x.hex}" data-color="${k}">${x.name}</button>`).join('')}</div>
          ${c.v === 'april' ? `<p class="p-sub">Mit wem tauschst du die Karten?</p><div class="uno-targets">${order.map((p) => `<button class="btn btn-small ${pick.target === p.id ? 'btn-primary' : ''}" data-target="${esc(p.id)}">${esc(p.name)} · ${V.counts[p.id]} Karten</button>`).join('')}</div>` : ''}
          <div class="btn-row"><button class="btn btn-primary" data-go ${!pick.color || (c.v === 'april' && !pick.target) ? 'disabled' : ''}>Ausspielen</button><button class="btn btn-ghost" data-cancel>Abbrechen</button></div></div></div>`;
      }
    }
    root.innerHTML = h;
    root.querySelectorAll('[data-card]').forEach((b) => {
      b.onclick = () => {
        const c = V.hand.find((x) => x.id === Number(b.dataset.card));
        if (!myTurn) return api.toast('Du bist nicht dran.');
        if (!playableV(V, c) || (V.drawn != null && V.drawn !== c.id)) return api.toast(V.pending ? `Leg eine ${U.NAME[V.pendType]} drauf oder zieh ${V.pending}.` : 'Die Karte passt nicht.');
        if (!c.c) { pick = { id: c.id }; return render(root, V, me, api); }
        api.act({ type: 'play', id: c.id });
      };
    });
    const on = (sel, fn) => root.querySelectorAll(sel).forEach((b) => { b.onclick = () => fn(b); });
    on('[data-draw]', () => (myTurn ? api.act({ type: 'draw' }) : api.toast('Du bist nicht dran.')));
    on('[data-pass]', () => api.act({ type: 'pass' }));
    on('[data-uno]', () => { FX && FX.play('pop'); VO && VO.say('uno', { force: true }); api.act({ type: 'uno' }); });
    on('[data-catch]', (b) => api.act({ type: 'catch', target: b.dataset.catch }));
    on('[data-again]', () => api.again());
    on('[data-lobby]', () => api.lobby());
    on('[data-color]', (b) => { pick.color = b.dataset.color; render(root, V, me, api); });
    on('[data-target]', (b) => { pick.target = b.dataset.target; render(root, V, me, api); });
    on('[data-cancel]', () => { pick = null; render(root, V, me, api); });
    on('[data-go]', () => { const a = { type: 'play', id: pick.id, color: pick.color, target: pick.target }; pick = null; api.act(a); });
  }

  window.DULI_PARTY.start({
    id: 'uno', title: 'DULIDAN UNO', kicker: 'KARTEN', titleHTML: 'DULIDAN <span class="outline">UNO</span>', min: 2, max: 6, soloBots: 3,
    tagline: 'Das Kartenspiel in Dulidan-Farben. Mit April-Karte zum Händetauschen, Stapeln von +2 und +4 und Erwischt-Button, wenn jemand UNO vergisst.',
    defaults: { stack: true }, botDelay: 1000,
    settingsHTML: (st, host) => `<label class="row"><span>+2 und +4 stapeln<small>+2 auf +2 und +4 auf +4 legen, dann zieht die nächste Person alles</small></span><input type="checkbox" class="switch" data-set="stack" ${st.stack !== false ? 'checked' : ''} ${host ? '' : 'disabled'}></label>`,
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Leg eine Karte mit gleicher Farbe oder gleicher Zahl/gleichem Symbol. Kannst du nicht, ziehst du eine.</li>
      <li><b>⊘ Aussetzen</b>, <b>⇄ Richtungswechsel</b>, <b>+2</b>, <b>Farbwahl</b>, <b>+4</b>. +2 und +4 darf man stapeln.</li>
      <li><b>April-Karte</b>: Farbe wählen <i>und</i> mit einer Person die Hand tauschen. Hinterhältig.</li>
      <li>Bei zwei Karten „UNO!“ drücken, bevor du die vorletzte legst. Vergessen? Dann kann dich jemand erwischen: +2 Karten.</li>
      <li>Wer zuerst keine Karten mehr hat, gewinnt die Runde und bekommt die Punkte der anderen Hände.</li></ul></div>`,
    engine: U, render,
  });
})();
