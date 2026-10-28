// DULIDAN LARP EXTREME – episches Intro: läuft bei allen gleichzeitig, mit Aprils vorher aufgenommener Stimme.
// Ablauf: Kino-Balken → „Dulidan Studios präsentiert“ → April → Titel mit Schockwelle → jede Figur als Kinokarte → Aufstellung → Regeln → Countdown.
// Der Host beendet das Intro für alle (oder überspringt es).
(function () {
  const esc = window.DULI_PARTY.esc, FX = window.DULI_FX, DB = window.DULI_LARP_DB;
  const V0 = () => window.DULI_VOICE;
  let running = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const speak = (id, min) => { const v = V0(); return Promise.all([v && v.line ? v.line(id) : wait(2600), wait(min || 0)]); };
  const play = (n) => { try { FX && FX.play(n); } catch (e) { /* ohne Ton */ } };

  // Glut-Partikel im Hintergrund
  function particles(canvas, run) {
    const ctx = canvas.getContext('2d');
    const fit = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
    fit();
    const P = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 2.2, v: 0.0004 + Math.random() * 0.0016, h: Math.random() < 0.6 ? 315 : 195, a: 0.2 + Math.random() * 0.6, w: Math.random() * 6.28 }));
    run.boost = 1;
    const tick = () => {
      if (run.stop) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      P.forEach((p) => {
        p.y -= p.v * run.boost; p.w += 0.02; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const x = (p.x + Math.sin(p.w) * 0.004) * W, y = p.y * H;
        ctx.beginPath(); ctx.arc(x, y, p.r * devicePixelRatio, 0, 6.28);
        ctx.fillStyle = `hsla(${p.h}, 100%, 65%, ${p.a})`; ctx.shadowBlur = 12; ctx.shadowColor = `hsl(${p.h}, 100%, 60%)`; ctx.fill();
      });
      run.boost += (1 - run.boost) * 0.04;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    addEventListener('resize', fit);
  }
  // Text Buchstabe für Buchstabe
  async function typewrite(el, text, run, speed = 38) {
    el.textContent = '';
    for (const ch of text) { if (run.stop) return; el.textContent += ch; await wait(ch === '.' ? 260 : speed); }
  }
  const countUp = (el, to, ms) => { const t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * (1 - (1 - k) ** 3)).toLocaleString('de-DE'); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };

  function render(root, V, me, api) {
    const key = `${V.round}|${Object.keys(V.chars).join(',')}`;
    if (running && running.key === key && root.querySelector('.lxi')) return;
    if (running) running.stop = true;
    running = { key, stop: false };
    const run = running;
    const chars = V.players.filter((p) => V.chars[p.id] && !V.chars[p.id].dead).map((p) => ({ p, c: V.chars[p.id] }));
    root.innerHTML = `<div class="lxi lxi2"><canvas class="lxi-fx"></canvas><div class="lxi-vignette"></div><div class="lxi-noise"></div>
      <div class="lxi-bars"><i></i><i></i></div><div class="lxi-stage" id="lxi-stage"></div>
      <div class="lxi-bar">${api.isHost ? '<button class="btn btn-small btn-ghost" id="lxi-skip">Intro überspringen</button>' : '<small>Intro läuft …</small>'}</div></div>`;
    const box = root.querySelector('.lxi'), stage = root.querySelector('#lxi-stage');
    particles(root.querySelector('.lxi-fx'), run);
    const set = (html, cls) => { if (run.stop) return null; stage.className = `lxi-stage ${cls || ''}`; stage.innerHTML = html; return stage; };
    const shake = () => { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); run.boost = 9; };
    const finish = () => { if (run.stop) return; run.stop = true; const v = V0(); if (v && v.stop) v.stop(); if (api.isHost) api.act({ type: 'intro' }); else set('<p class="lxi-wait">Gleich geht es los …</p>'); };
    const skip = root.querySelector('#lxi-skip');
    if (skip) skip.onclick = finish;
    let customN = 0;
    (async () => {
      await wait(600);
      // 1. Studio
      set('<p class="lxi-pre">DULIDAN STUDIOS <span>präsentiert</span></p>', 'is-pre');
      play('turn');
      await wait(2400);
      if (run.stop) return;
      // 2. April spricht
      const s1 = set('<div class="lxi-april"><svg viewBox="0 0 100 100"><use href="#april"/></svg><p class="lxi-type"></p></div>', 'is-dark');
      const p1 = speak('larp-intro-1', 2400);
      if (s1) await typewrite(s1.querySelector('.lxi-type'), 'Handys weg. Ab jetzt ist das kein Spiel mehr.', run);
      await p1;
      if (run.stop) return;
      // 3. Titel mit Schockwelle
      set('<div class="lxi-shock"></div><h1 class="lxi-title" data-t="LARP">LARP<span>EXTREME</span></h1><p class="lxi-sub">Live Action Roleplay</p><p class="lxi-tag">Ein Leben. Eine Chance. Keine zweite Runde.</p>', 'is-slam');
      shake(); play('bigLoss');
      await speak('larp-intro-2', 3400);
      // 4. Jede Figur als Kinokarte
      let side = 0;
      for (const { p, c } of chars) {
        if (run.stop) return;
        const st = DB && DB.STATES[c.st] ? DB.STATES[c.st].name : '';
        const top = Object.entries(c.skills || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const s = set(`<div class="lxi-hero ${side++ % 2 ? 'right' : 'left'}" style="--pc:${esc(c.color)}">
          <div class="lxi-hero-img">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<b>${esc(c.name[0])}</b>`}</div>
          <div class="lxi-hero-txt"><small>Spieler:in ${esc(p.name)}</small><h2>${esc(c.name)}</h2><p class="lxi-meta">${c.age} Jahre · ${esc(c.home.label)}${st ? ` · ${esc(st)}` : ''}</p>
          <div class="lxi-stats"><span>Gesundheit<i style="--v:${c.stats.health}%"></i></span><span>Happiness<i style="--v:${c.stats.happy}%"></i></span><span>Macht<i style="--v:${c.stats.power}%"></i></span><span class="money">Konto <b data-to="${Math.round(c.stats.money)}">0</b> €</span></div>
          ${top.length ? `<div class="lxi-skills">${top.map(([k, v]) => `<em>${esc(k)} <b>${Math.round(v)}</b></em>`).join('')}</div>` : ''}
          <p><span>Stärke</span>${esc(c.bonus)}</p><p><span>Schwäche</span>${esc(c.weakness)}</p></div></div>`, 'is-char');
        if (s) { const m = s.querySelector('[data-to]'); if (m) countUp(m, Number(m.dataset.to), 1400); }
        play('pop'); run.boost = 4;
        const id = window.DULI_LARP && window.DULI_LARP.PRESETS[c.key] ? `larp-char-${c.key}` : `larp-char-custom-${(customN++ % 3) + 1}`;
        await speak(id, 3000);
      }
      if (run.stop) return;
      // 5. Aufstellung
      if (chars.length > 1) {
        set(`<div class="lxi-lineup">${chars.map(({ c }, i) => `<div style="--pc:${esc(c.color)};--d:${i * 0.15}s">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<b>${esc(c.name[0])}</b>`}<span>${esc(c.name)}</span></div>`).join('')}</div><p class="lxi-vs">${chars.length} Leben. Eine Welt.</p>`, 'is-line');
        shake(); play('turn');
        await wait(2600);
      }
      if (run.stop) return;
      // 6. Regeln
      set('<ul class="lxi-rules"><li><i>01</i>Der Würfel entscheidet. Oder ihr.</li><li><i>02</i>Termine kann man schwänzen. Alles hat Folgen.</li><li><i>03</i>Schreib April, was du willst. Alles geht.</li><li class="d"><i>04</i>Der Tod ist endgültig.</li></ul>', 'is-rules');
      await speak('larp-rules', 4200);
      if (run.stop) return;
      // 7. Countdown
      const v = V0();
      const go = v && v.line ? v.line('larp-go') : wait(3000);
      for (const n of ['3', '2', '1']) { if (run.stop) return; set(`<div class="lxi-ring"></div><p class="lxi-count">${n}</p>`, 'is-count'); play('roll'); run.boost = 6; await wait(900); }
      if (run.stop) return;
      set('<p class="lxi-go">LEBEN!</p>', 'is-go'); shake(); play('bigLoss');
      await Promise.all([go, wait(1100)]);
      finish();
    })();
  }
  window.DULI_LARP_INTRO = { render };
})();
