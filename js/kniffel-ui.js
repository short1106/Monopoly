// DULIDAN Kniffel online – Oberfläche (Würfel, Block für alle, Revanche)
(function () {
  const K = window.DULI_KNIFFEL, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const face = (n) => { let h = ''; for (let k = 0; k < 9; k++) h += PIPS[n].includes(k) ? '<i></i>' : '<span></span>'; return h; };
  let lastRoll = null, lastPick = null, lastOver = false, lastCur = null;

  function render(root, V, me, api) {
    if (!V) return;
    const p = V.players[V.cur], mine = p.id === me && !V.over;
    // Ton und Sprüche
    const rolled = lastRoll !== null && V.rollSeq !== lastRoll;
    if (rolled) FX && FX.play('roll');
    lastRoll = V.rollSeq;
    if (V.last && lastPick !== `${V.last.seq}|${V.last.cat}|${V.last.pid}`) {
      if (lastPick !== null) {
        if (V.last.cat === 'kniffel' && V.last.v === 50) { FX && FX.play('pot'); VO && VO.say('kniffel', { force: true }); }
        else FX && FX.play(V.last.v >= 25 ? 'cash' : 'pop');
      }
      lastPick = `${V.last.seq}|${V.last.cat}|${V.last.pid}`;
    }
    if (mine && lastCur !== null && lastCur !== V.cur) FX && FX.play('turn');
    lastCur = V.cur;
    if (V.over && !lastOver) { lastOver = true; if (V.winners.includes(me)) { FX && FX.play('win'); FX && FX.confetti(); } else VO && VO.say('loss', { force: true }); }
    if (!V.over) lastOver = false;

    const cols = V.players.map((q, i) => `<th class="${i === V.cur && !V.over ? 'is-cur' : ''}" style="color:${q.color}">${esc(q.name)}${q.id === me ? ' (du)' : ''}</th>`).join('');
    const rows = K.CATS.map(([c, n], ci) => `${ci === 6 ? `<tr class="kn-sum"><td>Bonus (ab 63)</td>${V.players.map((q) => { const t = K.total(V.sheets[q.id]); return `<td>${t.bonus ? '+35' : `${t.up}/63`}</td>`; }).join('')}</tr>` : ''}
      <tr><td>${n}${K.HINT[c] ? ` <small>${K.HINT[c]}</small>` : ''}</td>${V.players.map((q, i) => {
        const v = V.sheets[q.id][c];
        if (v != null) return `<td class="kn-done ${V.last && V.last.pid === q.id && V.last.cat === c ? 'kno-new' : ''}">${v || '–'}</td>`;
        if (i === V.cur && mine && V.rolls < 3) { const s = K.score(c, V.dice); return `<td><button class="kn-pick ${s ? '' : 'is-zero'}" data-pick="${c}">${s}</button></td>`; }
        return '<td class="kn-empty">·</td>';
      }).join('')}</tr>`).join('');
    const status = V.over ? 'Spiel vorbei'
      : mine ? (V.rolls === 3 ? '<strong>Du bist dran.</strong> Würfeln!' : V.rolls === 0 ? '<strong>Keine Würfe mehr.</strong> Trag etwas im Block ein.' : '<strong>Du bist dran.</strong> Tipp Würfel zum Halten, dann nochmal würfeln oder eintragen.')
        : `<strong style="color:${p.color}">${esc(p.name)}</strong> ${p.bot ? '(Bot) ' : ''}ist dran …`;
    let h = `<div class="kn kno">
      <div class="kn-top"><div class="kn-turn">${status}</div>
        <div class="kn-dice">${V.dice.map((v, i) => `<button class="kn-die ${V.held[i] ? 'is-held' : ''} ${rolled && !V.held[i] ? 'is-rolling' : ''}" data-hold="${i}" ${!mine || V.rolls === 3 || V.rolls === 0 ? 'disabled' : ''} aria-label="Würfel ${v}">${face(v)}</button>`).join('')}</div>
        <div class="btn-row">${V.over ? '' : `<button class="btn btn-primary" data-roll ${!mine || V.rolls <= 0 ? 'disabled' : ''}>Würfeln (${V.rolls} übrig)</button>`}</div>
        <ul class="uno-log">${V.log.slice(-5).reverse().map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        ${Object.keys(V.wins).length ? `<p class="p-sub">Siege: ${V.players.map((q) => `${esc(q.name)} ${V.wins[q.id] || 0}`).join(' · ')}</p>` : ''}</div>
      <div class="kn-sheet"><table><thead><tr><th></th>${cols}</tr></thead><tbody>${rows}
        <tr class="kn-sum"><td>Oben</td>${V.players.map((q) => `<td>${K.total(V.sheets[q.id]).up}</td>`).join('')}</tr>
        <tr class="kn-total"><td>Gesamt</td>${V.players.map((q) => `<td>${K.total(V.sheets[q.id]).total}</td>`).join('')}</tr></tbody></table></div></div>`;
    if (V.over) {
      const ranked = V.players.map((q) => ({ q, t: K.total(V.sheets[q.id]).total })).sort((a, b) => b.t - a.t);
      const w = ranked[0].q;
      h += `<div class="uno-over"><div class="p-card"><p class="sec-label"><span class="n">KNIFFEL</span>Vorbei</p><h2>${V.winners.length > 1 ? 'Unentschieden!' : w.id === me ? 'Du gewinnst!' : `${esc(w.name)} gewinnt!`}</h2>
        <ol class="kno-rank">${ranked.map((r) => `<li style="--pc:${r.q.color}"><strong>${esc(r.q.name)}</strong><b>${r.t}</b></li>`).join('')}</ol>
        <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" data-again>Revanche</button><button class="btn btn-ghost" data-lobby>Zur Lobby</button>' : '<p class="p-wait">Der Host startet die Revanche.</p>'}<button class="btn btn-ghost" data-close>Block ansehen</button></div></div></div>`;
    }
    root.innerHTML = h;
    const on = (s, f) => root.querySelectorAll(s).forEach((b) => { b.onclick = () => f(b); });
    on('[data-roll]', () => api.act({ type: 'roll' }));
    on('[data-hold]', (b) => api.act({ type: 'hold', i: Number(b.dataset.hold) }));
    on('[data-pick]', (b) => api.act({ type: 'pick', cat: b.dataset.pick }));
    on('[data-again]', () => api.again());
    on('[data-lobby]', () => api.lobby());
    on('[data-close]', (b) => { b.closest('.uno-over').remove(); });
  }

  window.DULI_PARTY.start({
    id: 'kniffel', title: 'Kniffel', kicker: 'WÜRFELSPIEL', titleHTML: 'Knif<span class="outline">fel</span>',
    min: 1, max: 6, soloBots: 1, botNames: ['April-Bot', 'KI-Kevin', 'Bot Bernd', 'Robo-Rita', 'Byte-Basti'],
    tagline: 'Fünf Würfel, drei Würfe, 13 Felder. Online mit bis zu 6 Leuten oder gegen Bots. April kommentiert.',
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Du hast pro Zug bis zu <b>drei Würfe</b>. Tipp Würfel an, um sie zu halten.</li>
      <li>Danach trägst du in genau <b>ein Feld</b> deines Blocks ein. Passt nichts, streichst du ein Feld (0 Punkte).</li>
      <li>Oben zählen die Augen der jeweiligen Zahl. Ab <b>63 Punkten oben</b> gibt es <b>35 Bonus</b>.</li>
      <li>Unten: Dreier- und Viererpasch (Summe), Full House 25, kleine Straße 30, große Straße 40, <b>Kniffel 50</b>, Chance (Summe).</li>
      <li>Wenn alle 13 Felder voll sind, gewinnt die höchste Summe.</li></ul></div>`,
    engine: K, render,
  });
})();
