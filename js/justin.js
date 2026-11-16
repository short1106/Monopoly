// JUSTIN: SIGMA ODER FUMBLE – Einzelspieler-Story in 6 Kapiteln.
// Justin (die Figur aus LARP EXTREME) gewinnt jedes soziale Duell – bis zum entscheidenden Moment.
// Jedes Kapitel: ein Minispiel, in dem Justin glänzt, danach der FUMBLE-MOMENT, eine fiese Falle, die man verhindern muss.
// Aura sammeln, Fumbles vermeiden, Highscore im Browser. April erzählt.
(function () {
  const FX = window.DULI_FX, VO = window.DULI_VOICE, GF = () => window.DULI_GOOFY;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const KEY = 'duli-justin-best';
  const root = $('#jg');
  let timers = [];
  const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
  const every = (f, ms) => { const t = setInterval(f, ms); timers.push(t); return t; };
  const clear = () => { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers = []; cancelAnimationFrame(raf); };
  let raf = 0;
  const play = (n) => { try { FX && FX.play(n); } catch (e) { /* ohne Ton */ } };
  const gf = (n, ...a) => { const g = GF(); if (g && g[n]) g[n](...a); };

  // ---------- Fumble-Moment: Auswahl unter Zeitdruck, Knöpfe springen herum ----------
  // opts: [{ t, ok }], ms; done(true = gerettet)
  function fumbleChoice(stage, prompt, opts, ms, done, jumpy = true) {
    let over = false;
    stage.innerHTML = `<div class="jg-fumble"><p class="jg-fm-k">FUMBLE-MOMENT</p><h3>${esc(prompt)}</h3><div class="jg-fm-bar"><i></i></div><div class="jg-fm-opts"></div></div>`;
    const box = $('.jg-fm-opts', stage), bar = $('.jg-fm-bar i', stage);
    const draw = () => {
      box.innerHTML = shuffle(opts).map((o) => `<button class="jg-btn ${o.ok ? 'ok' : ''}" data-i="${opts.indexOf(o)}">${esc(o.t)}</button>`).join('');
      box.querySelectorAll('button').forEach((b) => { b.onclick = () => end(opts[Number(b.dataset.i)].ok); });
    };
    const end = (ok) => { if (over) return; over = true; clear(); done(ok); };
    draw(); play('card');
    bar.style.transitionDuration = `${ms}ms`; requestAnimationFrame(() => { bar.style.width = '0%'; });
    if (jumpy) every(draw, 900);
    later(() => end(false), ms);
  }

  // ---------- Kapitel ----------
  const CHAPTERS = [
    {
      id: 'mog', title: 'Kapitel 1: Das Mog-Duell', place: 'Schulhof, Künzelsau, 7:52 Uhr',
      intro: 'Drei Leute wollen Justin heute die Aura streitig machen. Klick, wenn die Nadel im grünen Bereich ist. Dreimal.',
      play(stage, done) {
        const foes = ['Typ aus der 10b', 'Der Sportlehrer', 'Eine Taube mit Ego'];
        let round = 0, hits = 0, pos = 0, dir = 1, zone = [38, 62];
        const draw = () => {
          stage.innerHTML = `<div class="jg-mog"><p class="jg-vs">Justin <b>VS</b> ${esc(foes[round])}</p>
            <div class="jg-meter"><span class="zone" style="left:${zone[0]}%;width:${zone[1] - zone[0]}%"></span><i class="needle"></i></div>
            <button class="jg-btn big" id="jg-hit">MOGGEN</button><p class="jg-small">Runde ${round + 1}/3</p></div>`;
          $('#jg-hit', stage).onclick = hit;
        };
        const tick = () => { pos += dir * (1.4 + round * 0.7); if (pos >= 100 || pos <= 0) dir *= -1; const n = $('.needle', stage); if (n) n.style.left = `${pos}%`; raf = requestAnimationFrame(tick); };
        const hit = () => {
          const ok = pos >= zone[0] && pos <= zone[1];
          if (ok) { hits++; play('coinUp'); gf('pop', 'GEMOGGT'); } else { play('pay'); gf('pop', 'Blinzeln…'); }
          round++;
          if (round >= 3) { cancelAnimationFrame(raf); return fm(); }
          zone = [42 + round * 2, 58 - round * 2]; draw();
        };
        const fm = () => fumbleChoice(stage, 'Alle schauen Justin an. Er muss jetzt etwas Cooles sagen.', [
          { t: '… (cool schweigen)', ok: true }, { t: '„Ich bin Batman.“', ok: false }, { t: '„Danke, Mama.“', ok: false }, { t: '„Sigma Sigma on the wall“', ok: false },
        ], 4200, (ok) => done({ aura: hits * 250 + (ok ? 250 : 0), fumbled: !ok, note: `${hits}/3 Duelle gewonnen` }));
        draw(); raf = requestAnimationFrame(tick);
      },
    },
    {
      id: 'job', title: 'Kapitel 2: Das Bewerbungsgespräch', place: 'Würth, Künzelsau, 10:00 Uhr',
      intro: 'Justins Traumjob. Antworte richtig, bevor die Zeit abläuft. Und am Ende … bitte, bitte nicht wieder das Gleiche wie letztes Mal.',
      play(stage, done) {
        const Q = [
          ['Warum wollen Sie bei uns arbeiten?', [['Weil ich Ihre Firma bewundere und hier wachsen will.', 1], ['Wegen dem Geld, Bro.', 0], ['Meine Mama hat gesagt, ich soll.', 0]]],
          ['Was ist Ihre größte Schwäche?', [['Ich bin manchmal zu ehrgeizig.', 1], ['Entscheidende Momente.', 0], ['Kryptonit.', 0]]],
          ['Wo sehen Sie sich in fünf Jahren?', [['In einer Führungsposition hier im Haus.', 1], ['Auf Ihrem Stuhl.', 0], ['In Ohio.', 0]]],
          ['Haben Sie noch Fragen an uns?', [['Wie sieht ein typischer Tag im Team aus?', 1], ['Gibt es hier WLAN?', 0], ['Nein.', 0]]],
        ];
        let i = 0, good = 0;
        const ask = () => {
          if (i >= Q.length) return fm();
          const [q, a] = Q[i];
          stage.innerHTML = `<div class="jg-talk"><p class="jg-who">Personalchefin</p><h3>„${esc(q)}“</h3><div class="jg-fm-bar slow"><i></i></div><div class="jg-ans">${shuffle(a).map(([t, ok]) => `<button class="jg-btn alt" data-ok="${ok}">${esc(t)}</button>`).join('')}</div><p class="jg-small">Frage ${i + 1}/${Q.length}</p></div>`;
          const bar = $('.jg-fm-bar i', stage); bar.style.transitionDuration = '7000ms'; requestAnimationFrame(() => { bar.style.width = '0%'; });
          const t = later(() => { play('pay'); i++; ask(); }, 7000);
          stage.querySelectorAll('[data-ok]').forEach((b) => { b.onclick = () => { clearTimeout(t); if (b.dataset.ok === '1') { good++; play('cash'); } else play('pay'); i++; ask(); }; });
        };
        // Der Klassiker: „Viel Erfolg!“ – auf keinen Fall „Sie auch!“ sagen
        const fm = () => {
          let over = false;
          stage.innerHTML = `<div class="jg-fumble"><p class="jg-fm-k">FUMBLE-MOMENT</p><h3>Die Personalchefin steht auf: „Danke, das war super. Viel Erfolg noch!“</h3>
            <div class="jg-fm-bar"><i></i></div><div class="jg-trap"><button class="jg-btn trap" id="jg-sie">„SIE AUCH!“</button><button class="jg-btn small" id="jg-danke">„Danke, bis bald.“</button></div></div>`;
          const bar = $('.jg-fm-bar i', stage); bar.style.transitionDuration = '3500ms'; requestAnimationFrame(() => { bar.style.width = '0%'; });
          const end = (ok) => { if (over) return; over = true; clear(); done({ aura: good * 200 + (ok ? 300 : 0), fumbled: !ok, note: ok ? `${good}/4 gute Antworten. Und kein „Sie auch“.` : `${good}/4 gute Antworten. Dann: „Sie auch!“ Absage per Mail.` }); };
          const trap = $('#jg-sie', stage);
          every(() => { trap.style.transform = `translate(${(Math.random() - 0.5) * 40}px, ${(Math.random() - 0.5) * 20}px) scale(${1 + Math.random() * 0.25})`; }, 300);
          trap.onclick = () => end(false);
          $('#jg-danke', stage).onclick = () => end(true);
          later(() => end(false), 3500);
        };
        ask();
      },
    },
    {
      id: 'date', title: 'Kapitel 3: Das Date mit Kimberly', place: 'Eiscafé am Marktplatz, 17:30 Uhr',
      intro: 'Rizz-Rhythmus: Tipp die Herzen genau, wenn sie die Linie erreichen. Und dann kommt die Verabschiedung. Die gefährlichste Sekunde des Tages.',
      play(stage, done) {
        stage.innerHTML = `<div class="jg-rhythm"><div class="jg-lanes">${[0, 1, 2].map((l) => `<div class="jg-lane" data-l="${l}"><span class="jg-line"></span></div>`).join('')}</div>
          <div class="jg-keys">${['A', 'S', 'D'].map((k, l) => `<button class="jg-btn" data-k="${l}">${k}</button>`).join('')}</div><p class="jg-small" id="jg-rz">Rizz: 0</p></div>`;
        const lanes = [...stage.querySelectorAll('.jg-lane')];
        const notes = []; let hits = 0, total = 0, t0 = performance.now(), ended = false;
        const H = () => lanes[0].clientHeight || 300;
        const spawn = () => { if (ended) return; const l = Math.floor(Math.random() * 3); const el = document.createElement('i'); el.className = 'jg-heart'; el.innerHTML = '<svg viewBox="0 0 24 22"><path d="M12 21 C-6 9 4 -4 12 5 C20 -4 30 9 12 21Z" fill="#ff4fd8" stroke="#000" stroke-width="1.5"/></svg>'; lanes[l].appendChild(el); notes.push({ l, el, y: -30, hit: false }); total++; };
        const press = (l) => {
          const target = H() - 46;
          const n = notes.filter((x) => !x.hit && x.l === l).sort((a, b) => Math.abs(a.y - target) - Math.abs(b.y - target))[0];
          if (n && Math.abs(n.y - target) < 34) { n.hit = true; n.el.classList.add('pop'); hits++; play('pop'); later(() => n.el.remove(), 250); }
          else play('step');
          $('#jg-rz', stage).textContent = `Rizz: ${hits}`;
        };
        stage.querySelectorAll('[data-k]').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); press(Number(b.dataset.k)); }; });
        const key = (e) => { const l = 'asd'.indexOf(e.key.toLowerCase()); if (l >= 0) press(l); };
        addEventListener('keydown', key);
        every(spawn, 650);
        const step = () => {
          const sp = 2.6;
          notes.forEach((n) => { if (n.hit) return; n.y += sp; n.el.style.top = `${n.y}px`; if (n.y > H()) { n.hit = true; n.el.remove(); } });
          if (performance.now() - t0 < 14000) raf = requestAnimationFrame(step);
          else { ended = true; removeEventListener('keydown', key); clear(); fm(); }
        };
        raf = requestAnimationFrame(step);
        const fm = () => fumbleChoice(stage, 'Kimberly steht auf, um zu gehen. Wie verabschiedet sich Justin?', [
          { t: 'Umarmung', ok: true }, { t: 'Fester Handschlag', ok: false }, { t: 'High Five', ok: false }, { t: '„Tschüss, Mama!“', ok: false },
        ], 3600, (ok) => done({ aura: Math.round(700 * hits / Math.max(1, total)) + (ok ? 300 : 0), fumbled: !ok, note: `${hits} von ${total} Herzen` }));
      },
    },
    {
      id: 'elf', title: 'Kapitel 4: Das Elfmeterschießen', place: 'Kreisliga-Finale, Künzelsau, 19:00 Uhr',
      intro: 'Erst zielen (Klick stoppt den Pfeil), dann Schusskraft (Klick im grünen Bereich). Drei Elfmeter. Der vierte entscheidet alles.',
      play(stage, done) {
        let shot = 0, goals = 0;
        const kick = (inverted, cb) => {
          stage.innerHTML = `<div class="jg-goal"><p class="jg-vs">${inverted ? 'DER ENTSCHEIDENDE ELFMETER' : `Elfmeter ${shot + 1}/3`}</p>
            <div class="jg-net"><i class="jg-keeper"></i><i class="jg-aim"></i></div><div class="jg-meter"><span class="zone" style="left:70%;width:18%"></span><i class="needle"></i></div>
            <button class="jg-btn big" id="jg-k">${inverted ? 'SCHIESSEN (Steuerung spinnt!)' : 'ZIELEN'}</button></div>`;
          let phase = 0, a = 50, ad = 1, p = 0, pd = 1;
          const aim = $('.jg-aim', stage), nd = $('.needle', stage), btn = $('#jg-k', stage);
          const tk = () => {
            if (phase === 0) { a += ad * (inverted ? 3.2 : 2.1); if (a > 96 || a < 4) ad *= -1; aim.style.left = `${inverted ? 100 - a : a}%`; }
            if (phase === 1) { p += pd * (inverted ? 3.4 : 2.2); if (p > 100 || p < 0) pd *= -1; nd.style.left = `${inverted ? 100 - p : p}%`; }
            raf = requestAnimationFrame(tk);
          };
          btn.onclick = () => {
            if (phase === 0) { phase = 1; btn.textContent = 'SCHUSSKRAFT'; return; }
            cancelAnimationFrame(raf);
            const ax = inverted ? 100 - a : a, px = inverted ? 100 - p : p;
            const keeperL = Math.random() < 0.5 ? 25 : 75;
            const kp = $('.jg-keeper', stage); kp.style.left = `${keeperL}%`;
            const power = px >= 70 && px <= 88, saved = Math.abs(ax - keeperL) < 16, wide = ax < 8 || ax > 92;
            const goal = power && !saved && !wide;
            play(goal ? 'bigGain' : 'pay');
            later(() => cb(goal, !power ? (px > 88 ? 'drüber' : 'zu schwach') : wide ? 'daneben' : saved ? 'gehalten' : 'TOR'), 700);
          };
          raf = requestAnimationFrame(tk);
        };
        const next = () => {
          if (shot < 3) return kick(false, (g) => { if (g) goals++; shot++; gf('pop', g ? 'TOR!' : 'Nein…'); next(); });
          // Fumble-Moment: der vierte Schuss mit verdrehter Steuerung
          kick(true, (g, why) => done({ aura: goals * 200 + (g ? 400 : 0), fumbled: !g, note: `${goals}/3 verwandelt. Entscheidender Elfmeter: ${why}.` }));
        };
        next();
      },
    },
    {
      id: 'drive', title: 'Kapitel 5: Die Fahrprüfung', place: 'B19 Richtung Schwäbisch Hall, 21:00 Uhr',
      intro: 'Weich den Hindernissen aus (Pfeiltasten oder Knöpfe). Danach einparken: Stopp genau in der Lücke.',
      play(stage, done) {
        stage.innerHTML = `<div class="jg-road"><div class="jg-street" id="jg-st"><i class="jg-car" id="jg-car"></i></div><div class="jg-keys"><button class="jg-btn" data-d="-1">◀</button><button class="jg-btn" data-d="1">▶</button></div><p class="jg-small" id="jg-hp">Fehlerpunkte: 0</p></div>`;
        const st = $('#jg-st', stage), car = $('#jg-car', stage);
        let lane = 1, obs = [], faults = 0, t0 = performance.now();
        const OB = ['Ente', 'Rentner', 'Pylon', 'Traktor', 'Blitzer'];
        const setLane = () => { car.style.left = `${lane * 33.33 + 16.66}%`; };
        const move = (d) => { lane = Math.max(0, Math.min(2, lane + d)); setLane(); play('step'); };
        stage.querySelectorAll('[data-d]').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); move(Number(b.dataset.d)); }; });
        const key = (e) => { if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); };
        addEventListener('keydown', key);
        setLane();
        every(() => { const l = Math.floor(Math.random() * 3), el = document.createElement('span'); el.className = 'jg-ob'; el.textContent = pick(OB); el.style.left = `${l * 33.33 + 16.66}%`; st.appendChild(el); obs.push({ l, el, y: -40, done: false }); }, 700);
        const step = () => {
          const H = st.clientHeight;
          obs.forEach((o) => {
            if (o.done) return; o.y += 4.2; o.el.style.top = `${o.y}px`;
            if (o.l === lane && o.y > H - 90 && o.y < H - 30) { o.done = true; faults++; o.el.classList.add('hit'); play('pay'); gf('pop', o.el.textContent === 'Blitzer' ? 'GEBLITZT' : 'AUTSCH'); $('#jg-hp', stage).textContent = `Fehlerpunkte: ${faults}`; }
            if (o.y > H) { o.done = true; o.el.remove(); }
          });
          if (performance.now() - t0 < 13000) raf = requestAnimationFrame(step);
          else { removeEventListener('keydown', key); clear(); park(); }
        };
        raf = requestAnimationFrame(step);
        // Fumble-Moment: Einparken
        const park = () => {
          stage.innerHTML = `<div class="jg-fumble"><p class="jg-fm-k">FUMBLE-MOMENT</p><h3>Fast bestanden. Jetzt noch einparken. Der Prüfer schaut.</h3>
            <div class="jg-park"><span class="jg-spot"></span><i class="jg-car side" id="jg-pc"></i></div><button class="jg-btn big" id="jg-stop">BREMSEN</button></div>`;
          const pc = $('#jg-pc', stage); let x = 0, stopped = false;
          const go = () => { x += 1.15; pc.style.left = `${x}%`; if (x > 100) return end(false, 'Justin ist am Parkplatz vorbeigefahren. Und durch den Zaun.'); raf = requestAnimationFrame(go); };
          const end = (ok, why) => { if (stopped) return; stopped = true; clear(); done({ aura: Math.max(0, 600 - faults * 120) + (ok ? 400 : 0), fumbled: !ok, note: `${faults} Fehlerpunkte. ${why}` }); };
          $('#jg-stop', stage).onclick = () => { cancelAnimationFrame(raf); const ok = x >= 58 && x <= 66; end(ok, ok ? 'Perfekt eingeparkt.' : x < 58 ? 'Zu früh gebremst. Halb auf der Straße.' : 'Auf dem Gehweg geparkt. Neben dem Prüfer.'); };
          raf = requestAnimationFrame(go);
        };
      },
    },
    {
      id: 'boss', title: 'Finale: Der entscheidende Moment', place: 'Irgendwo in Justins Kopf, 23:59 Uhr',
      intro: 'Der Fumble persönlich steht vor Justin. Drück die angezeigte Taste, bevor die Zeit abläuft. Aber Vorsicht: Bei „NICHT DRÜCKEN“ nichts drücken.',
      play(stage, done) {
        const KEYS = ['A', 'S', 'D', 'F'];
        let i = 0, hp = 8, aura = 100, over = false;
        const N = 9;
        const draw = (k, trap, ms) => {
          stage.innerHTML = `<div class="jg-boss"><div class="jg-bars"><span>Justin <i style="--v:${aura}%"></i></span><span>Der Fumble <i class="red" style="--v:${hp / 8 * 100}%"></i></span></div>
            <p class="jg-prompt ${trap ? 'trap' : ''}">${trap ? 'NICHT DRÜCKEN' : k}</p><div class="jg-fm-bar"><i></i></div>
            <div class="jg-keys">${KEYS.map((x) => `<button class="jg-btn" data-k="${x}">${x}</button>`).join('')}</div><p class="jg-small">${i + 1}/${N}</p></div>`;
          const bar = $('.jg-fm-bar i', stage); bar.style.transitionDuration = `${ms}ms`; requestAnimationFrame(() => { bar.style.width = '0%'; });
        };
        const round = () => {
          if (over) return;
          if (i >= N || hp <= 0 || aura <= 0) return finish();
          const trap = i === N - 1 || (i > 2 && Math.random() < 0.2), k = pick(KEYS), ms = Math.max(800, 1900 - i * 120);
          draw(k, trap, ms);
          let answered = false;
          const answer = (x) => {
            if (answered) return; answered = true; removeEventListener('keydown', onKey); clearTimeout(t);
            const ok = trap ? x === null : x === k;
            if (ok) { hp -= trap ? 2 : 1; play('coinUp'); } else { aura -= 25; play('pay'); gf('pop', 'FUMBLE-GEFAHR'); }
            i++; later(round, 280);
          };
          const onKey = (e) => { const x = e.key.toUpperCase(); if (KEYS.includes(x)) answer(x); };
          addEventListener('keydown', onKey);
          stage.querySelectorAll('[data-k]').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); answer(b.dataset.k); }; });
          const t = later(() => answer(null), ms);
        };
        const finish = () => { if (over) return; over = true; clear(); const win = hp <= 1 || aura >= 50; done({ aura: Math.max(0, aura * 6) + (win ? 600 : 0), fumbled: !win, note: win ? 'Der Fumble ist besiegt. Zumindest für heute.' : 'Der Fumble hat gewonnen. Er gewinnt immer. Fast.' }); };
        round();
      },
    },
  ];

  // ---------- Sprüche ----------
  const SAY = {
    sigma: ['Kein Fumble. Ich bin ehrlich schockiert.', 'Sigma-Verhalten. Justin hat es tatsächlich durchgezogen.', 'Wer ist das und was hat er mit Justin gemacht?', 'Aura plus tausend. Ohne Ausrutscher.'],
    fumble: ['Und da ist er. Der Fumble.', 'Justin hat gefumbelt. Wie immer. Six seven.', 'Es war so nah. Es war SO nah.', 'Das Universum hat entschieden: Fumble.'],
  };
  const RANKS = [[0, 'NPC Justin'], [1500, 'Beta Justin'], [3000, 'Sigma Justin'], [4500, 'Gigachad Justin'], [5600, 'LEGENDE: Justin ohne Fumble']];

  // ---------- Ablauf ----------
  let run = null;
  function title() {
    clear();
    let best = 0; try { best = Number(localStorage.getItem(KEY)) || 0; } catch (e) { /* privat */ }
    root.innerHTML = `<div class="jg-title"><div class="jg-avatar">J</div><p class="jg-kick">DULIDAN STUDIOS PRÄSENTIERT</p><h1>JUSTIN<span>SIGMA ODER FUMBLE</span></h1>
      <p class="jg-lead">Justin gewinnt jedes Duell. Jedes Gespräch. Jeden Blickkontakt. Bis zu dem einen Moment, auf den es wirklich ankommt. Heute ist dieser Tag. Sechs Kapitel. Sechs Fumble-Momente. Rette ihn.</p>
      <button class="jg-btn big" id="jg-start">TAG STARTEN</button>${best ? `<p class="jg-small">Rekord: ${best.toLocaleString('de-DE')} Aura</p>` : ''}
      <ul class="jg-ch">${CHAPTERS.map((c) => `<li>${esc(c.title)}</li>`).join('')}</ul></div>`;
    $('#jg-start').onclick = () => {
      run = { i: 0, aura: 0, fumbles: 0, log: [] };
      if (FX && window.DULI_MUSIC && !window.DULI_MUSIC.playing) FX.music(true, 'anthem');
      if (VO) VO.say('justin-intro', { force: true });
      chapterIntro();
    };
  }
  function chapterIntro() {
    clear();
    const c = CHAPTERS[run.i];
    root.innerHTML = `<div class="jg-card intro"><p class="jg-kick">${esc(c.place)}</p><h2>${esc(c.title)}</h2>
      <div class="jg-april"><svg viewBox="0 0 100 100"><use href="#april"/></svg><p>${esc(c.intro)}</p></div>
      <button class="jg-btn big" id="jg-go">LOS</button>${hud()}</div>`;
    $('#jg-go').onclick = () => {
      root.innerHTML = `<div class="jg-card play"><p class="jg-kick">${esc(c.title)}</p><div class="jg-stage" id="jg-stage"></div>${hud()}</div>`;
      c.play($('#jg-stage'), result);
    };
  }
  function result(r) {
    clear();
    const c = CHAPTERS[run.i];
    const aura = Math.round(r.fumbled ? r.aura / 2 : r.aura);
    run.aura += aura; if (r.fumbled) run.fumbles++;
    run.log.push({ t: c.title, aura, fumbled: r.fumbled });
    if (r.fumbled) { gf('big', 'FUMBLE', 'bad'); gf('play', 'sad'); if (VO) VO.say('justin-fumble', { force: true }); }
    else { gf('big', 'SIGMA', 'gold'); gf('play', 'airhorn'); if (VO) VO.say('justin-sigma', { force: true }); }
    root.innerHTML = `<div class="jg-card res ${r.fumbled ? 'bad' : 'good'}"><p class="jg-kick">${esc(c.title)}</p>
      <div class="jg-stamp">${r.fumbled ? 'FUMBLE' : 'SIGMA'}</div><p class="jg-note">${esc(r.note)}</p>
      <p class="jg-gain">+${aura.toLocaleString('de-DE')} Aura${r.fumbled ? ' <small>(Fumble halbiert)</small>' : ''}</p>
      <div class="jg-april"><svg viewBox="0 0 100 100"><use href="#april"/></svg><p>${esc(pick(r.fumbled ? SAY.fumble : SAY.sigma))}</p></div>
      <button class="jg-btn big" id="jg-next">${run.i + 1 < CHAPTERS.length ? 'WEITER' : 'TAGESBILANZ'}</button>${hud()}</div>`;
    $('#jg-next').onclick = () => { run.i++; if (run.i < CHAPTERS.length) chapterIntro(); else end(); };
  }
  function end() {
    clear();
    let best = 0; try { best = Number(localStorage.getItem(KEY)) || 0; } catch (e) { /* privat */ }
    const rec = run.aura > best;
    if (rec) try { localStorage.setItem(KEY, String(run.aura)); } catch (e) { /* privat */ }
    const rank = RANKS.filter(([n]) => run.aura >= n).pop()[1];
    const perfect = run.fumbles === 0;
    if (perfect) { FX && FX.confetti(); gf('big', 'KEIN FUMBLE', 'gold'); if (VO) VO.say('justin-end', { force: true }); }
    root.innerHTML = `<div class="jg-card end"><p class="jg-kick">TAGESBILANZ</p><h2>${esc(rank)}</h2>
      <p class="jg-gain">${run.aura.toLocaleString('de-DE')} Aura · ${run.fumbles} Fumble${run.fumbles === 1 ? '' : 's'}${rec ? ' · NEUER REKORD' : ''}</p>
      <ol class="jg-log">${run.log.map((l) => `<li class="${l.fumbled ? 'bad' : 'good'}"><span>${esc(l.t)}</span><b>${l.fumbled ? 'FUMBLE' : 'SIGMA'}</b><em>+${l.aura.toLocaleString('de-DE')}</em></li>`).join('')}</ol>
      <div class="jg-april"><svg viewBox="0 0 100 100"><use href="#april"/></svg><p>${esc(perfect ? 'Ein ganzer Tag ohne Fumble. Ich schreibe es in den Kalender. Das passiert nie wieder.' : run.fumbles >= 4 ? 'Justin hatte einen sehr Justin-Tag. Morgen ist ein neuer.' : 'Fast perfekt. Fast. Das Wort, das Justins Leben beschreibt.')}</p></div>
      <div class="jg-row"><button class="jg-btn big" id="jg-again">NOCHMAL</button><button class="jg-btn alt" id="jg-title">Zum Titel</button></div></div>`;
    $('#jg-again').onclick = () => { run = { i: 0, aura: 0, fumbles: 0, log: [] }; chapterIntro(); };
    $('#jg-title').onclick = title;
  }
  const hud = () => (run ? `<div class="jg-hud"><span>Aura <b>${run.aura.toLocaleString('de-DE')}</b></span><span>Fumbles <b>${run.fumbles}</b></span><span>Kapitel <b>${run.i + 1}/${CHAPTERS.length}</b></span></div>` : '');

  title();
  // Direkt zu einem Kapitel springen (für Tests und zum Üben)
  const jump = (i) => { run = { i: Math.max(0, Math.min(CHAPTERS.length - 1, i)), aura: 0, fumbles: 0, log: [] }; chapterIntro(); };
  window.DULI_JUSTIN = { CHAPTERS, jump, get run() { return run; } };
})();
