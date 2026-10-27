// DULIDAN Stadt Land Fluss – Oberfläche (Schreiben, Stopp, Veto, Punkte)
(function () {
  const F = window.DULI_SLF, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const $ = (s, r = document) => r.querySelector(s);
  let tick = null, saveT = null, endSaved = null, lastKey = null, lastStop = null, lastPhase = null, lastOver = false;
  const put = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; return true; } return false; };

  function render(root, V, me, api) {
    if (!V) return;
    clearInterval(tick);
    const inGame = V.players.some((p) => p.id === me);
    const key = `${V.round}|${V.letter}`;
    // Sprüche und Töne
    if (V.phase === 'write' && lastKey !== key) { if (lastKey !== null || V.round === 1) { FX && FX.play('card'); VO && VO.say('slf-start', { chance: V.round === 1 ? 0 : 0.5 }); } }
    if (V.stopBy && lastStop !== `${key}|${V.stopBy}`) { lastStop = `${key}|${V.stopBy}`; FX && FX.play('jail'); VO && VO.say('slf-stop', { force: true }); }
    if (V.phase === 'review' && lastPhase === 'write') FX && FX.play('pop');
    if (V.phase === 'over' && !lastOver) { lastOver = true; if (V.winners.includes(me)) { FX && FX.play('win'); FX && FX.confetti(); } else VO && VO.say('loss', { force: true }); }
    if (V.phase !== 'over') lastOver = false;
    lastPhase = V.phase;
    if (V.phase === 'write') { renderWrite(root, V, me, api, inGame, key); lastKey = key; return; }
    lastKey = key;
    if (V.phase === 'review') return renderReview(root, V, me, api, inGame);
    return renderOver(root, V, me, api);
  }

  const scoreboard = (V, me) => `<ul class="slf-board">${V.players.slice().sort((a, b) => V.scores[b.id] - V.scores[a.id]).map((p) => `<li style="--pc:${p.color}"><strong>${esc(p.name)}${p.id === me ? ' (du)' : ''}</strong><b>${V.scores[p.id]}</b></li>`).join('')}</ul>`;

  // ----- Schreiben -----
  function renderWrite(root, V, me, api, inGame, key) {
    let box = root.querySelector('.slf-write');
    const collect = () => [...root.querySelectorAll('[data-ans]')].map((i) => i.value);
    const save = () => { clearTimeout(saveT); if (inGame) api.act({ type: 'save', answers: collect() }); };
    if (!box || box.dataset.k !== key) {
      const mine = (V.answers[me] || []);
      root.innerHTML = `<div class="slf slf-write" data-k="${esc(key)}">
        <div class="slf-head p-card"><div class="slf-letter">${esc(V.letter)}</div>
          <div><p class="sec-label"><span class="n">RUNDE ${V.round}/${V.rounds}</span>Stadt Land Fluss</p><p class="slf-sub">Alles mit <b>${esc(V.letter)}</b>. ${V.stopOn ? 'Wer alles hat, ruft STOPP – dann bleiben 10 Sekunden.' : 'Es läuft bis die Zeit um ist.'}</p></div>
          <div class="slf-timer" id="slf-timer"></div></div>
        ${inGame ? `<div class="slf-fields p-card">${V.cats.map((c, i) => `<label class="field"><span>${esc(c)}</span><input data-ans="${i}" maxlength="40" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${esc(c)} mit ${esc(V.letter)} …" value="${esc(mine[i] || '')}"></label>`).join('')}</div>` : '<p class="p-card p-wait">Du schaust zu.</p>'}
        <div class="btn-row slf-btns" id="slf-btns"></div>
        <div class="slf-who" id="slf-who"></div></div>`;
      const inputs = [...root.querySelectorAll('[data-ans]')];
      inputs.forEach((inp, i) => {
        inp.oninput = () => { clearTimeout(saveT); saveT = setTimeout(save, 350); };
        inp.onblur = save;
        inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); if (inputs[i + 1]) inputs[i + 1].focus(); } };
      });
      if (inputs[0] && !('ontouchstart' in window)) inputs[0].focus();
    }
    const stopped = V.stopBy ? V.players.find((p) => p.id === V.stopBy) : null;
    if (put($('#slf-btns'), `${inGame && V.stopOn ? `<button class="btn btn-primary slf-stop" id="slf-stop" ${stopped ? 'disabled' : ''}>STOPP!</button>` : ''}${api.isHost ? '<button class="btn btn-ghost" id="slf-next">Jetzt auswerten</button>' : ''}`)) {
      if ($('#slf-stop')) $('#slf-stop').onclick = () => { clearTimeout(saveT); api.act({ type: 'stop', answers: collect() }); };
      if ($('#slf-next')) $('#slf-next').onclick = () => { if (confirm('Runde jetzt beenden?')) { save(); api.act({ type: 'next' }); } };
    }
    put($('#slf-who'), `${stopped ? `<p class="slf-stopped"><b>${esc(stopped.name)}</b> hat STOPP gerufen!</p>` : ''}<ul>${V.players.map((p) => `<li style="--pc:${p.color}">${esc(p.name)} <small>${V.filled[p.id]}/${V.cats.length}</small></li>`).join('')}</ul>${scoreboard(V, me)}`);
    const t = (fromTick) => {
      const el = $('#slf-timer');
      if (!el) return;
      const s = Math.max(0, Math.ceil((V.deadline - Date.now()) / 1000));
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      el.classList.toggle('low', s <= 10);
      // Kurz vor Schluss einmal die letzten Eingaben schicken (nur aus dem Takt, nie beim Zeichnen)
      if (fromTick && s <= 1 && endSaved !== key) { endSaved = key; save(); }
    };
    t(false); tick = setInterval(() => t(true), 500);
  }

  // ----- Prüfen -----
  function renderReview(root, V, me, api, inGame) {
    const head = `<tr><th>${esc(V.letter)}</th>${V.players.map((p) => `<th style="color:${p.color}">${esc(p.name)}</th>`).join('')}</tr>`;
    const rows = V.cats.map((c, ci) => `<tr><td class="slf-cat">${esc(c)}</td>${V.players.map((p) => {
      const a = V.answers[p.id][ci], pts = V.points[p.id][ci], auto = V.auto[p.id][ci];
      const vs = V.vetoes[`${p.id}|${ci}`] || [], mineV = vs.includes(me);
      const bad = a && (!auto || vs.length >= V.need);
      const btn = a && auto && inGame && p.id !== me ? `<button class="slf-veto ${mineV ? 'on' : ''}" data-veto="${esc(p.id)}" data-ci="${ci}" title="${mineV ? 'Veto zurücknehmen' : 'Zählt nicht'}">${mineV ? 'zählt doch' : 'zählt nicht'}</button>` : '';
      return `<td class="${bad ? 'bad' : ''}"><span class="slf-a">${a ? esc(a) : '<i>–</i>'}</span>${a && !auto ? '<small>falscher Buchstabe</small>' : ''}${vs.length ? `<small>${vs.length}× abgelehnt${vs.length >= V.need ? '' : ` (ab ${V.need})`}</small>` : ''}<b class="slf-pts p${pts}">${pts}</b>${btn}</td>`;
    }).join('')}</tr>`).join('');
    const sums = `<tr class="slf-sum"><td>Runde</td>${V.players.map((p) => `<td>+${V.points[p.id].reduce((a, b) => a + b, 0)}</td>`).join('')}</tr>`;
    const ready = V.players.filter((p) => V.ready[p.id]).length;
    root.innerHTML = `<div class="slf slf-review">
      <div class="slf-head p-card"><div class="slf-letter">${esc(V.letter)}</div><div><p class="sec-label"><span class="n">RUNDE ${V.round}/${V.rounds}</span>Prüfen</p>
        <p class="slf-sub">Bullshit-Antwort? Auf „zählt nicht“ tippen. Ab ${V.need} ${V.need === 1 ? 'Veto' : 'Vetos'} gibt es 0 Punkte. Allein in der Kategorie 20, einzigartig 10, doppelt 5.</p></div></div>
      <div class="slf-table p-card"><table><thead>${head}</thead><tbody>${rows}${sums}</tbody></table></div>
      <div class="btn-row slf-btns">${inGame ? `<button class="btn ${V.ready[me] ? '' : 'btn-primary'}" id="slf-ready">${V.ready[me] ? 'Doch noch nicht' : 'Passt so, weiter'}</button>` : ''}${api.isHost ? '<button class="btn btn-ghost" id="slf-next">Weiter (Host)</button>' : ''}</div>
      <p class="p-sub slf-readyline">${ready}/${V.players.length} sind fertig${ready ? `: ${V.players.filter((p) => V.ready[p.id]).map((p) => esc(p.name)).join(', ')}` : ''}</p>
      ${scoreboard(V, me)}</div>`;
    root.querySelectorAll('[data-veto]').forEach((b) => { b.onclick = () => api.act({ type: 'veto', pid: b.dataset.veto, ci: Number(b.dataset.ci) }); });
    if ($('#slf-ready')) $('#slf-ready').onclick = () => api.act({ type: 'ready' });
    if ($('#slf-next')) $('#slf-next').onclick = () => api.act({ type: 'next' });
  }

  // ----- Ende -----
  function renderOver(root, V, me, api) {
    const ranked = V.players.slice().sort((a, b) => V.scores[b.id] - V.scores[a.id]);
    const w = ranked[0];
    const hist = `<table><thead><tr><th></th>${V.players.map((p) => `<th style="color:${p.color}">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>${V.history.map((h) => `<tr><td class="slf-cat">${esc(h.letter)}</td>${V.players.map((p) => `<td title="${esc(h.answers[p.id].filter(Boolean).join(', '))}">${h.pts[p.id].reduce((a, b) => a + b, 0)}</td>`).join('')}</tr>`).join('')}
      <tr class="slf-sum"><td>Gesamt</td>${V.players.map((p) => `<td>${V.scores[p.id]}</td>`).join('')}</tr></tbody></table>`;
    root.innerHTML = `<div class="slf slf-over"><div class="p-card slf-final"><p class="sec-label"><span class="n">ENDE</span>Stadt Land Fluss</p>
      <h2>${V.winners.length > 1 ? 'Unentschieden!' : w.id === me ? 'Du gewinnst!' : `${esc(w.name)} gewinnt!`}</h2>
      <ol class="kno-rank">${ranked.map((p) => `<li style="--pc:${p.color}"><strong>${esc(p.name)}</strong><b>${V.scores[p.id]}</b></li>`).join('')}</ol>
      ${Object.keys(V.wins).length ? `<p class="p-sub">Siege: ${V.players.map((p) => `${esc(p.name)} ${V.wins[p.id] || 0}`).join(' · ')}</p>` : ''}
      <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" id="slf-again">Nochmal</button><button class="btn btn-ghost" id="slf-lobby">Zur Lobby</button>' : '<p class="p-wait">Der Host startet die nächste Partie.</p>'}</div></div>
      <div class="slf-table p-card">${hist}</div></div>`;
    if ($('#slf-again')) { $('#slf-again').onclick = api.again; $('#slf-lobby').onclick = api.lobby; }
  }

  const sel = (key, st, host, opts) => `<select data-set="${key}" data-num="1" ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${Number(st[key]) === v ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  window.DULI_PARTY.start({
    id: 'slf', title: 'Stadt Land Fluss', kicker: 'SCHREIBSPIEL', titleHTML: 'Stadt Land <span class="outline">Fluss</span>',
    min: 2, max: 10, noBots: true, noSolo: true,
    tagline: 'Ein Buchstabe, eure Kategorien, wer zuerst alles hat, ruft STOPP. Danach wird gnadenlos abgelehnt.',
    defaults: { cats: F.DEFAULT_CATS, rounds: 5, time: 120, stop: true },
    settingsHTML: (st, host) => `
      <label class="field"><span>Kategorien (mit Komma getrennt, bis 12)</span><input data-set="cats" maxlength="300" value="${esc(st.cats || F.DEFAULT_CATS)}" ${host ? '' : 'disabled'}></label>
      ${host ? `<div class="slf-presets">${[['Klassisch', F.DEFAULT_CATS], ['Dulidan', 'Stadt, Land, Fluss, Promi, Marke, Game, Brainrot-Wort, Ausrede fürs Zuspätkommen'], ['18+', 'Stadt, Land, Fluss, Getränk, Peinlicher Moment, Grund für Schluss machen, Körperteil, Beleidigung']].map(([n, v]) => `<button type="button" class="btn btn-small btn-ghost" data-cats="${esc(v)}">${n}</button>`).join('')}</div>` : ''}
      <label class="row"><span>Runden</span>${sel('rounds', st, host, [[3, '3'], [5, '5'], [8, '8'], [10, '10']])}</label>
      <label class="row"><span>Zeit pro Runde</span>${sel('time', st, host, [[60, '1 Minute'], [90, '1:30'], [120, '2 Minuten'], [180, '3 Minuten'], [300, '5 Minuten']])}</label>
      <label class="row"><span>STOPP-Knopf<small>Wer alles hat, beendet die Runde (10 Sekunden Gnadenfrist)</small></span><input type="checkbox" class="switch" data-set="stop" ${st.stop !== false ? 'checked' : ''} ${host ? '' : 'disabled'}></label>`,
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Jede Runde gibt es einen <b>Buchstaben</b>. Füll alle Kategorien mit Wörtern, die damit anfangen.</li>
      <li>Wer alles hat, drückt <b>STOPP</b>. Dann haben alle noch 10 Sekunden.</li>
      <li>Danach sieht jeder alle Antworten. Mit <b>„zählt nicht“</b> lehnt ihr Quatsch ab.</li>
      <li>Punkte: allein in der Kategorie <b>20</b>, einzigartig <b>10</b>, gleiche Antwort wie jemand anders <b>5</b>.</li>
      <li>Kategorien bestimmt der Host – Klassisch, Dulidan, 18+ oder eigene.</li></ul></div>`,
    engine: F, render,
  });
  // Vorlagen für Kategorien in der Lobby
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cats]');
    if (!b) return;
    const inp = document.querySelector('[data-set="cats"]');
    if (inp) { inp.value = b.dataset.cats; inp.dispatchEvent(new Event('change')); }
  });
})();
