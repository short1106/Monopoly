// Dulidan – GOOFY-MODUS: komplett unnötiger, cringer Quatsch auf allen Seiten. Stört das Spiel nie (nichts blockiert Klicks).
// Aura-Zähler, Vine-Boom, Airhorn, trauriges Posaunen-Wah-Wah, Ente, die quer durchs Bild watschelt, DVD-Logo,
// geheime Wörter (67, sigma, rizz, bruh, skibidi, aura …), Konami-Code für ULTRA-GOOFY, falsche Erfolge, Ohio-Moment.
// Ausschaltbar über den Knopf „GOOFY“ oben (Wahl bleibt gespeichert). Alle Sounds werden synthetisiert, keine Dateien.
(function () {
  let on = true;
  try { on = localStorage.getItem('duli-goofy') !== '0'; } catch (e) { /* privat */ }
  let aura = 0;
  try { aura = Number(localStorage.getItem('duli-aura')) || 0; } catch (e) { /* privat */ }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => on && Math.random() < p;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fxMuted = () => window.DULI_FX && window.DULI_FX.muted;

  // ---------- Sounds ----------
  let ac = null;
  const ctx = () => { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); } if (ac.state === 'suspended') ac.resume(); return ac; };
  function voice(type, f, t, d, v, dest) { const c = ac, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(dest || c.destination); o.start(t); o.stop(t + d + 0.05); return o; }
  function noiseSrc(t, d, dest) { const c = ac, b = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; s.connect(dest); s.start(t); return s; }
  const SND = {
    boom() { // Vine-Boom-artig: tiefer Schlag mit Verzerrung und Hall-Schwanz
      const c = ctx(); if (!c) return; const t = c.currentTime;
      const ws = c.createWaveShaper(), cur = new Float32Array(512); for (let i = 0; i < 512; i++) cur[i] = Math.tanh((i / 256 - 1) * 6); ws.curve = cur;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      ws.connect(g).connect(c.destination);
      const o = voice('sine', 120, t, 1.3, 1, ws); o.frequency.exponentialRampToValueAtTime(38, t + 0.9);
      const n = c.createBiquadFilter(); n.type = 'lowpass'; n.frequency.value = 900; const ng = c.createGain(); ng.gain.setValueAtTime(0.4, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); n.connect(ng).connect(ws); noiseSrc(t, 0.3, n);
    },
    airhorn(times = 3) {
      const c = ctx(); if (!c) return; const t = c.currentTime;
      for (let k = 0; k < times; k++) { const s = t + k * (k === times - 1 ? 0.24 : 0.2), d = k === times - 1 ? 0.75 : 0.16; [466, 470, 587, 700].forEach((f) => { const o = voice('sawtooth', f, s, d, 0.035); o.frequency.linearRampToValueAtTime(f * 0.97, s + d); }); }
    },
    sad() { // Wah wah wah waaaah
      const c = ctx(); if (!c) return; const t = c.currentTime;
      [[392, 0], [370, 0.45], [349, 0.9], [330, 1.35]].forEach(([f, s], i) => {
        const d = i === 3 ? 1.4 : 0.4, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.connect(c.destination);
        lp.frequency.setValueAtTime(400, t + s); lp.frequency.linearRampToValueAtTime(1800, t + s + 0.15); lp.frequency.linearRampToValueAtTime(500, t + s + d);
        const o = voice('sawtooth', f, t + s, d, 0.09, lp);
        if (i === 3) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = 9; l.connect(lg).connect(o.frequency); l.start(t + s + 0.3); l.stop(t + s + d); o.frequency.linearRampToValueAtTime(f * 0.92, t + s + d); }
      });
    },
    quack() { const c = ctx(); if (!c) return; const t = c.currentTime; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3; bp.connect(c.destination); [0, 0.14].forEach((s) => { const o = voice('sawtooth', 520, t + s, 0.12, 0.25, bp); o.frequency.exponentialRampToValueAtTime(380, t + s + 0.12); }); },
    boing() { const c = ctx(); if (!c) return; const t = c.currentTime; const o = voice('sine', 180, t, 0.6, 0.22); o.frequency.exponentialRampToValueAtTime(720, t + 0.25); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 18; lg.gain.value = 60; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + 0.6); },
    pfft() { const c = ctx(); if (!c) return; const t = c.currentTime; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 8; const g = c.createGain(); g.gain.value = 0.9; lp.connect(g).connect(c.destination); const o = voice('sawtooth', 70, t, 0.5, 0.3, lp); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 28; lg.gain.value = 25; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + 0.5); o.frequency.linearRampToValueAtTime(52, t + 0.5); },
    ding() { const c = ctx(); if (!c) return; const t = c.currentTime; voice('sine', 1568, t, 0.6, 0.12); voice('sine', 2093, t + 0.08, 0.8, 0.1); },
  };
  const play = (n, ...a) => { if (!on || fxMuted()) return; try { SND[n](...a); } catch (e) { /* kein Ton */ } };

  // ---------- Bausteine ----------
  let layer = null;
  const L = () => { if (!layer || !document.body.contains(layer)) { layer = document.createElement('div'); layer.className = 'gf-layer'; document.body.appendChild(layer); } return layer; };
  function pop(text, x, y, cls = '') {
    const el = document.createElement('div');
    el.className = `gf-pop ${cls}`; el.textContent = text;
    el.style.left = `${x == null ? rnd(15, 85) * innerWidth / 100 : x}px`; el.style.top = `${y == null ? rnd(25, 70) * innerHeight / 100 : y}px`;
    el.style.setProperty('--r', `${rnd(-18, 18)}deg`);
    L().appendChild(el); setTimeout(() => el.remove(), 1800);
  }
  function big(text, cls = '') { const el = document.createElement('div'); el.className = `gf-big ${cls}`; el.textContent = text; L().appendChild(el); setTimeout(() => el.remove(), 1700); }
  function shake(strong) { if (reduced) return; const b = document.body; b.classList.remove('gf-shake', 'gf-zoom'); void b.offsetWidth; b.classList.add(strong ? 'gf-zoom' : 'gf-shake'); setTimeout(() => b.classList.remove('gf-shake', 'gf-zoom'), 700); }
  function rain(chars, n = 40) { for (let i = 0; i < n; i++) { const el = document.createElement('i'); el.className = 'gf-rain'; el.textContent = pick(chars); el.style.left = `${rnd(0, 100)}vw`; el.style.animationDelay = `${rnd(0, 0.9)}s`; el.style.animationDuration = `${rnd(1.4, 2.6)}s`; el.style.fontSize = `${rnd(18, 42)}px`; L().appendChild(el); setTimeout(() => el.remove(), 3800); } }

  // ---------- Aura ----------
  let badge = null;
  function drawAura(delta) {
    if (!on) { if (badge) badge.remove(); badge = null; return; }
    if (!badge || !document.body.contains(badge)) { badge = document.createElement('button'); badge.type = 'button'; badge.className = 'gf-aura'; badge.title = 'Deine Aura. Komplett unnötig.'; badge.onclick = (e) => { e.stopPropagation(); auraUp(pick([67, 100, -250, 420, 1, -1]), e.clientX, e.clientY); play('boing'); }; document.body.appendChild(badge); }
    badge.innerHTML = `<small>AURA</small><b>${aura.toLocaleString('de-DE')}</b>`;
    if (delta) { badge.classList.remove('up', 'down'); void badge.offsetWidth; badge.classList.add(delta > 0 ? 'up' : 'down'); }
  }
  function auraUp(d, x, y) {
    aura += d;
    try { localStorage.setItem('duli-aura', String(aura)); } catch (e) { /* privat */ }
    pop(`${d > 0 ? '+' : ''}${d.toLocaleString('de-DE')} AURA${d < 0 ? pick([' (L)', ' bruh', ' (cringe)', '']) : pick(['', ' (W)', ' fr', ' sheesh'])}`, x, y, d > 0 ? 'good' : 'bad');
    drawAura(d);
  }

  // ---------- Klicks ----------
  const SLANG = ['bruh', 'sheesh', 'no cap', 'fr fr', 'sigma', 'W', 'L', 'ohio', 'rizz', 'gyatt', 'skibidi', 'npc', 'based', 'cooked', 'mewing', '6 7', 'slay', 'ratio', 'aura farming', 'lowkey', 'goated'];
  document.addEventListener('click', (e) => {
    if (!on || e.target.closest('.gf-layer')) return;
    const btn = e.target.closest('button, .btn, a');
    if (chance(0.07)) auraUp(pick([10, 25, 67, 100, 250, 500, 1000, -50, -100, -500]), e.clientX, e.clientY);
    else if (chance(0.05)) pop(pick(SLANG), e.clientX, e.clientY);
    if (btn && chance(0.025)) { play('boom'); shake(true); big(pick(['BRUH', '?!', 'WAS', 'OH NEIN', 'KRASS'])); }
    else if (btn && chance(0.03)) { btn.classList.add('gf-wobble'); setTimeout(() => btn.classList.remove('gf-wobble'), 700); play('boing'); }
  }, true);

  // ---------- Spiel-Sounds bekommen Bonus-Quatsch ----------
  function hookFX() {
    const FX = window.DULI_FX;
    if (!FX || FX._goofy) return;
    const orig = FX.play.bind(FX);
    FX.play = (name) => {
      orig(name);
      if (!on) return;
      if (name === 'bigGain' && chance(0.6)) { setTimeout(() => play('airhorn'), 150); big(pick(['SHEESH', 'GELD MACHEN', 'STONKS', 'W']), 'gold'); rain(['Ð', '€', '$', 'W'], 36); auraUp(500); }
      else if (name === 'bigLoss' && chance(0.6)) { setTimeout(() => play('sad'), 200); big(pick(['L', 'NOT STONKS', 'COOKED', 'RIP BOZO']), 'bad'); auraUp(-300); }
      else if (name === 'win') { setTimeout(() => play('airhorn', 4), 300); big('GIGA W', 'gold'); rain(['W', 'GOAT', 'Ð', '67'], 60); auraUp(6767); }
      else if (name === 'roll' && chance(0.08)) { setTimeout(() => play('boing'), 350); pop(pick(['der würfel hat rizz', 'skibidi wurf', 'würfel gecooked', 'trust the process'])); }
      else if (name === 'pay' && chance(0.12)) { play('pfft'); pop(pick(['pffft', 'geld weg', 'ups']), null, null, 'bad'); }
      else if (name === 'jail' && chance(0.7)) { setTimeout(() => play('sad'), 300); big('BUSTED', 'bad'); }
      else if (name === 'cash' && chance(0.08)) pop('ka-ching (rizz)');
    };
    FX._goofy = true;
  }

  // ---------- Ente ----------
  const DUCK = '<svg viewBox="0 0 64 56" width="58" height="51"><ellipse cx="30" cy="36" rx="22" ry="15" fill="#ffd83a"/><circle cx="46" cy="18" r="12" fill="#ffd83a"/><path d="M56 17 L66 21 L56 24 Z" fill="#ff8a1f"/><circle cx="49" cy="15" r="2.4" fill="#111"/><path d="M14 33 Q24 26 32 34" stroke="#e8b923" stroke-width="3" fill="none"/><path d="M22 50 l-3 6 M36 50 l3 6" stroke="#ff8a1f" stroke-width="3"/></svg>';
  function duck() {
    if (!on || document.hidden) return;
    const d = document.createElement('button');
    d.type = 'button'; d.className = 'gf-duck'; d.innerHTML = DUCK; d.title = 'quack';
    const rtl = Math.random() < 0.5; if (rtl) d.classList.add('rtl');
    d.style.animationDuration = `${rnd(9, 15)}s`;
    d.onclick = (e) => { e.stopPropagation(); play('quack'); auraUp(100, e.clientX, e.clientY - 30); d.classList.add('fly'); setTimeout(() => d.remove(), 900); };
    d.onanimationend = (e) => { if (e.animationName.startsWith('gf-walk')) d.remove(); };
    L().appendChild(d);
    if (chance(0.5)) setTimeout(() => { if (d.isConnected && !d.classList.contains('fly')) play('quack'); }, rnd(1500, 5000));
  }

  // ---------- DVD-Logo ----------
  function dvd() {
    if (!on || reduced || document.hidden || document.querySelector('.gf-dvd')) return;
    const el = document.createElement('div'); el.className = 'gf-dvd'; el.textContent = 'DULIDAN'; L().appendChild(el);
    let x = rnd(0, innerWidth - 160), y = rnd(60, innerHeight - 60), vx = 2.2, vy = 1.7, hue = rnd(0, 360);
    const end = Date.now() + 26000;
    (function f() {
      if (!el.isConnected) return;
      if (Date.now() > end || !on) { el.remove(); return; }
      const w = el.offsetWidth, h = el.offsetHeight; x += vx; y += vy; let hx = false, hy = false;
      if (x <= 0 || x + w >= innerWidth) { vx = -vx; hx = true; x = Math.max(0, Math.min(innerWidth - w, x)); }
      if (y <= 0 || y + h >= innerHeight) { vy = -vy; hy = true; y = Math.max(0, Math.min(innerHeight - h, y)); }
      if (hx || hy) { hue = (hue + 67) % 360; el.style.color = `hsl(${hue} 100% 60%)`; }
      if (hx && hy) { play('airhorn'); big('ECKE!!!', 'gold'); auraUp(10000); }
      el.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(f);
    })();
  }

  // ---------- Falsche Erfolge ----------
  const FAKE = ['Hat 3× geblinzelt', 'Maus bewegt (sehr gut)', 'Touch Grass (nicht erfüllt)', 'Seit 5 Minuten nicht aufgegeben', 'Hat eine Taste gedrückt', 'Professioneller Zuschauer', 'Aura-Farmer Stufe 1', 'Hat das Spiel geöffnet (krass)', 'Sigma-Grindset aktiviert', 'Wasser getrunken? (bitte)', 'Ohio-Bewohner:in', 'Hat April ignoriert (mutig)', 'Mewing-Streak: 0 Tage'];
  function fakeAch() {
    if (!on || document.hidden) return;
    const el = document.createElement('div'); el.className = 'gf-ach';
    el.innerHTML = '<b>ERFOLG FREIGESCHALTET</b><span></span><small>+0 Punkte · völlig wertlos</small>';
    el.querySelector('span').textContent = pick(FAKE);
    L().appendChild(el); play('ding'); setTimeout(() => el.remove(), 4300);
  }

  // ---------- Geheime Wörter & Konami ----------
  let buf = '', konami = 0;
  const KON = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const WORDS = {
    '67': () => { big('SIX SEVEN', 'sixseven'); rain(['6', '7', '67'], 50); play('boing'); auraUp(67); },
    sigma: () => { big('SIGMA', 'gold'); play('boom'); auraUp(1000); },
    rizz: () => { big('UNSPOKEN RIZZ', 'pink'); play('ding'); auraUp(420); },
    bruh: () => { big('BRUH'); play('boom'); shake(true); },
    skibidi: () => { big('SKIBIDI'); rain(['?', '!', 'skibidi'], 30); play('boing'); },
    aura: () => { big(`AURA: ${aura.toLocaleString('de-DE')}`, 'gold'); },
    ohio: () => ohio(),
    april: () => { big('APRIL SIEHT DICH', 'pink'); play('ding'); },
    goofy: () => ultra(),
    quack: () => duck(),
  };
  document.addEventListener('keydown', (e) => {
    if (!on) return;
    konami = e.key === KON[konami] || e.key.toLowerCase() === KON[konami] ? konami + 1 : (e.key === 'ArrowUp' ? 1 : 0);
    if (konami === KON.length) { konami = 0; ultra(); return; }
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-12);
    const hit = Object.keys(WORDS).find((w) => buf.endsWith(w));
    if (hit) { buf = ''; WORDS[hit](); }
  });
  function ultra() {
    document.body.classList.add('gf-ultra'); big('ULTRA GOOFY MODUS', 'pink'); play('airhorn', 5); rain(['W', 'L', '67', 'Ð', '?!'], 70);
    clearTimeout(ultra.t); ultra.t = setTimeout(() => document.body.classList.remove('gf-ultra'), 20000);
  }
  function ohio() { if (reduced) return; document.body.classList.add('gf-ohio'); big('OHIO MOMENT'); play('boom'); setTimeout(() => document.body.classList.remove('gf-ohio'), 2600); }

  // ---------- Tab-Titel ----------
  const TABS = ['komm zurück bro', 'April vermisst dich', 'dein Geld läuft weg', 'hallo??', 'wir sehen dich', 'du hast Aura verloren'];
  let realTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    if (!on) return;
    if (document.hidden) { realTitle = document.title; document.title = pick(TABS); } else { document.title = realTitle; if (chance(0.4)) pop('welcome back king', null, null, 'good'); }
  });

  // ---------- Logo 5× klicken ----------
  let logoClicks = 0, logoT = 0;
  document.addEventListener('click', (e) => {
    if (!on || !e.target.closest('[data-logo], .brand, .logo')) return;
    if (Date.now() - logoT > 2500) logoClicks = 0;
    logoT = Date.now(); logoClicks++;
    const lg = e.target.closest('[data-logo], .brand, .logo');
    lg.classList.remove('gf-spin'); void lg.offsetWidth; lg.classList.add('gf-spin');
    if (logoClicks === 5) { logoClicks = 0; big('HÖR AUF DAS LOGO ZU KLICKEN'); play('boom'); auraUp(-67); }
  });

  // ---------- Schalter in der Kopfleiste ----------
  function toggleBtn() {
    document.querySelectorAll('.games-nav').forEach((nav) => {
      if (nav.querySelector('.gf-toggle')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-small btn-ghost gf-toggle';
      const draw = () => { b.textContent = on ? 'GOOFY' : 'goofy aus'; b.classList.toggle('is-on', on); b.title = on ? 'Goofy-Modus ausschalten (warum?)' : 'Goofy-Modus einschalten'; };
      b.onclick = (e) => { e.stopPropagation(); on = !on; try { localStorage.setItem('duli-goofy', on ? '1' : '0'); } catch (x) { /* privat */ } draw(); drawAura(); if (on) { big('GOOFY IST ZURÜCK', 'pink'); play('airhorn'); } };
      draw(); nav.prepend(b);
    });
  }

  function init() {
    hookFX(); toggleBtn(); drawAura();
    if (on && chance(0.01)) setTimeout(ohio, 4000);
    setInterval(() => { if (chance(0.35)) duck(); }, 60000);
    setInterval(() => { if (chance(0.3)) dvd(); }, 90000);
    setInterval(() => { if (chance(0.4)) fakeAch(); }, 150000);
    setTimeout(() => { if (on) duck(); }, rnd(12000, 30000));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.DULI_GOOFY = { pop, big, play, duck, dvd, ultra, ohio, fakeAch, get on() { return on; }, get aura() { return aura; } };
})();
