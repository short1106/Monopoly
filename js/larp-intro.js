// DULIDAN LARP EXTREME – Intro: läuft bei jedem Spielstart bei allen gleichzeitig, mit Aprils vorher aufgenommener Stimme.
// Der Host beendet das Intro für alle (oder überspringt es).
(function () {
  const esc = window.DULI_PARTY.esc, FX = window.DULI_FX, DB = window.DULI_LARP_DB;
  const V0 = () => window.DULI_VOICE;
  let running = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const speak = (id, min) => { const v = V0(); return Promise.all([v && v.line ? v.line(id) : wait(2600), wait(min || 0)]); };

  function render(root, V, me, api) {
    const key = `${V.round}|${Object.keys(V.chars).join(',')}`;
    if (running && running.key === key && root.querySelector('.lxi')) return;
    running = { key, stop: false };
    const run = running;
    const chars = V.players.filter((p) => V.chars[p.id] && !V.chars[p.id].dead).map((p) => ({ p, c: V.chars[p.id] }));
    root.innerHTML = `<div class="lxi"><div class="lxi-noise"></div><div class="lxi-stage" id="lxi-stage"></div>
      <div class="lxi-bar">${api.isHost ? '<button class="btn btn-small btn-ghost" id="lxi-skip">Intro überspringen</button>' : '<small>Intro läuft …</small>'}</div></div>`;
    const stage = root.querySelector('#lxi-stage');
    const set = (html, cls) => { if (run.stop) return; stage.className = `lxi-stage ${cls || ''}`; stage.innerHTML = html; };
    const finish = () => { if (run.stop) return; run.stop = true; const v = V0(); if (v && v.stop) v.stop(); if (api.isHost) api.act({ type: 'intro' }); else set('<p class="lxi-wait">Gleich geht es los …</p>'); };
    const skip = root.querySelector('#lxi-skip');
    if (skip) skip.onclick = finish;
    let customN = 0;
    (async () => {
      set('<p class="lxi-type">Handys weg.</p>', 'is-dark');
      FX && FX.play('turn');
      await speak('larp-intro-1', 2200);
      if (run.stop) return;
      set('<h1 class="lxi-title">LARP<span>EXTREME</span></h1><p class="lxi-sub">Live Action Roleplay</p>', 'is-slam');
      FX && FX.play('bigLoss');
      await speak('larp-intro-2', 3000);
      for (const { p, c } of chars) {
        if (run.stop) return;
        const st = DB && DB.STATES[c.st] ? DB.STATES[c.st].name : '';
        set(`<div class="lxi-card" style="--pc:${esc(c.color)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<b>${esc(c.name[0])}</b>`}
          <h2>${esc(c.name)}</h2><p class="lxi-meta">${c.age} · ${esc(c.home.label)}${st ? ` · ${esc(st)}` : ''} · gespielt von ${esc(p.name)}</p>
          <p><span>Stärke</span>${esc(c.bonus)}</p><p><span>Schwäche</span>${esc(c.weakness)}</p></div>`, 'is-char');
        FX && FX.play('pop');
        const id = window.DULI_LARP && window.DULI_LARP.PRESETS[c.key] ? `larp-char-${c.key}` : `larp-char-custom-${(customN++ % 3) + 1}`;
        await speak(id, 2600);
      }
      if (run.stop) return;
      set('<ul class="lxi-rules"><li>Der Würfel entscheidet.</li><li>Termine kann man schwänzen. Alles hat Folgen.</li><li>Der Tod ist endgültig.</li></ul>', 'is-rules');
      await speak('larp-rules', 3500);
      if (run.stop) return;
      const v = V0();
      const go = v && v.line ? v.line('larp-go') : wait(3000);
      for (const n of ['3', '2', '1']) { if (run.stop) return; set(`<p class="lxi-count">${n}</p>`, 'is-count'); FX && FX.play('roll'); await wait(900); }
      await go;
      finish();
    })();
  }
  window.DULI_LARP_INTRO = { render };
})();
