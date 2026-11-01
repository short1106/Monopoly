// DULIDAN AURA GAMES – Oberfläche: Rundenkarte, die 9 Minispiele, Ergebnis mit April-Kommentar, Finale.
// Das Minispiel wird pro Phase nur einmal aufgebaut; spätere Updates ändern nur Seitenleiste, Timer und Kommentar.
(function () {
  const A = window.DULI_AURA, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const GF = () => window.DULI_GOOFY;
  const fmt = (n) => Math.round(n).toLocaleString('de-DE');
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const DUCK = '<svg viewBox="0 0 64 56"><ellipse cx="30" cy="36" rx="22" ry="15" fill="#ffd83a"/><circle cx="46" cy="18" r="12" fill="#ffd83a"/><path d="M56 17 L66 21 L56 24 Z" fill="#ff8a1f"/><circle cx="49" cy="15" r="2.4" fill="#111"/></svg>';
  const TAUNTS = ['Lass los, es gibt Döner.', 'Deine Mama ruft.', 'Loslassen gibt +1000 Aura. (Lüge)', 'Dein Akku ist bei 1 %.', 'Hinter dir steht eine Ente.', 'Die anderen haben schon losgelassen. (Lüge)', 'Mewing-Pause?', 'Ohio ruft an.', 'Du verpasst gerade ein Reel.', 'Six seven. Six seven. Six seven.'];

  let cur = null; // { key, localEnds, done, cleanup }
  let lastVoice = null, lastPhase = null, meLast = null;

  function render(root, V, me, api) {
    if (!V) return;
    const key = `${V.phaseId}|${V.phase}`;
    const fresh = !cur || cur.key !== key || !root.querySelector('.ag');
    if (fresh) {
      if (cur && cur.cleanup) cur.cleanup();
      cur = { key, localEnds: Date.now() + (V.leftMs || 0), done: false, cleanup: null };
      root.innerHTML = `<div class="ag"><aside class="ag-side" id="ag-side"></aside><section class="ag-main"><div class="ag-top" id="ag-top"></div><div class="ag-april" id="ag-april"></div><div class="ag-wrap" id="ag-wrap"></div></section></div>`;
      phaseEnter(root, V, me, api);
    }
    side(root, V, me);
    if (fresh) top(root, V);
    april(root, V, fresh);
    if (V.phase === 'play') doneMarks(root, V, me);
  }

  // ---------- Seitenleiste: Aura-Rangliste ----------
  function side(root, V, me) {
    const ranked = V.players.slice().sort((a, b) => V.aura[b.id] - V.aura[a.id]);
    root.querySelector('#ag-side').innerHTML = `<p class="ag-k">AURA-RANKING</p><ol class="ag-rank">${ranked.map((p, i) => `<li style="--pc:${p.color}" class="${p.id === me ? 'me' : ''}"><span class="ag-pos">${i + 1}</span><b>${esc(p.name)}${p.bot ? ' <small>BOT</small>' : ''}</b><em class="${V.aura[p.id] < 0 ? 'neg' : ''}">${fmt(V.aura[p.id])}</em>${V.phase === 'play' ? `<i class="ag-dot ${V.sub[p.id] ? 'ok' : ''}"></i>` : ''}</li>`).join('')}</ol>
      <p class="ag-k">RUNDEN</p><ol class="ag-rounds">${V.order.map((g, i) => `<li class="${i < V.round ? 'past' : i === V.round ? 'now' : ''}">${i <= V.round ? esc(A.GAMES[g].name) : '???'}</li>`).join('')}</ol>`;
  }
  function top(root, V) {
    const lv = V.level;
    root.querySelector('#ag-top').innerHTML = V.over ? '' : `<div class="ag-round">RUNDE ${V.round + 1}/${V.rounds}</div><div class="ag-weird" title="Weirdness-Level"><span>WEIRDNESS</span>${A.LEVELS.map((_, i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}<b>${esc(A.LEVELS[lv])}</b></div>
      ${V.mods.length ? `<div class="ag-mods">${V.mods.map((m) => `<span class="${m === 'invert' || m === 'double' ? 'hot' : ''}">${esc(A.MODS[m])}</span>`).join('')}</div>` : ''}
      <div class="ag-timer"><i id="ag-bar"></i></div>`;
    const bar = root.querySelector('#ag-bar');
    if (bar) { const total = Math.max(1, cur.localEnds - Date.now()); bar.style.transitionDuration = `${total}ms`; requestAnimationFrame(() => { bar.style.width = '0%'; }); }
  }
  function april(root, V, fresh) {
    const box = root.querySelector('#ag-april');
    if (box.dataset.say !== V.say) {
      box.dataset.say = V.say;
      box.innerHTML = `<svg class="ag-av" viewBox="0 0 100 100"><use href="#april"/></svg><p></p>`;
      const p = box.querySelector('p'); let i = 0; const t = V.say;
      (function type() { if (!p.isConnected) return; p.textContent = t.slice(0, i); i += 2; if (i <= t.length + 1) setTimeout(type, 18); })();
    }
    if (fresh && V.voice && lastVoice !== V.phaseId) { lastVoice = V.phaseId; if (VO) VO.say(V.voice, { force: true }); }
  }
  function doneMarks(root, V, me) {
    const w = root.querySelector('.ag-wait small');
    if (w) { const left = V.players.filter((p) => !V.sub[p.id]).map((p) => p.name); w.textContent = left.length ? `Warten auf: ${left.join(', ')}` : 'Alle fertig!'; }
  }

  // ---------- Phasen ----------
  function phaseEnter(root, V, me, api) {
    const wrap = root.querySelector('#ag-wrap');
    if (V.phase !== lastPhase) { lastPhase = V.phase; if (V.phase === 'intro') FX && FX.play('turn'); }
    if (V.phase === 'intro') return intro(wrap, V);
    if (V.phase === 'play') return play(wrap, V, me, api);
    if (V.phase === 'result') return result(wrap, V, me);
    if (V.phase === 'over') return over(wrap, V, me, api);
  }
  function intro(wrap, V) {
    const G = A.GAMES[V.game], last = V.round === V.rounds - 1;
    wrap.innerHTML = `<div class="ag-card ag-intro ${last ? 'final' : ''}"><small>${last ? 'DAS GROSSE FINALE' : `MINISPIEL ${V.round + 1}`}</small><h2>${esc(G.name)}</h2><p>${esc(G.rule)}</p>${V.mods.includes('invert') ? '<p class="ag-warn">WERTUNG UMGEDREHT: Wer am schlechtesten ist, gewinnt!</p>' : ''}<div class="ag-count" id="ag-count"></div></div>`;
    const c = wrap.querySelector('#ag-count');
    const iv = setInterval(() => {
      const left = Math.ceil((cur.localEnds - Date.now()) / 1000);
      if (!c.isConnected) return clearInterval(iv);
      if (left <= 3 && left > 0) { if (c.textContent !== String(left)) { c.textContent = left; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); FX && FX.play('pop'); } } else c.textContent = '';
    }, 100);
    cur.cleanup = () => clearInterval(iv);
  }

  // ---------- Minispiele ----------
  function play(wrap, V, me, api) {
    const mods = V.mods.filter((m) => m !== 'invert' && m !== 'double' && m !== 'speed');
    wrap.innerHTML = `<div class="ag-stage ${mods.map((m) => `ag-m-${m}`).join(' ')}" id="ag-stage"></div>${mods.includes('ducks') ? `<div class="ag-ducks">${Array.from({ length: 6 }, (_, i) => `<i style="--d:${i * 1.3}s;--y:${10 + i * 14}%">${DUCK}</i>`).join('')}</div>` : ''}`;
    const st = wrap.querySelector('#ag-stage');
    const rng = mulberry(V.seed), endAt = cur.localEnds - 1300, timers = [];
    const later = (f, ms) => timers.push(setTimeout(f, ms));
    const every = (f, ms) => timers.push(setInterval(f, ms));
    let sent = false;
    const done = (score, note) => {
      if (sent) return; sent = true; cur.done = true;
      api.act({ type: 'submit', score });
      st.innerHTML = `<div class="ag-wait"><b>${esc(note || 'Abgegeben.')}</b><small>Warten auf die anderen …</small></div>`;
      doneMarks(document, V, me);
    };
    cur.cleanup = () => { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); };
    const left = () => endAt - Date.now();
    const fallback = (f) => later(() => { if (!sent) f(); }, Math.max(200, left()));
    if (!V.players.some((p) => p.id === me)) { st.innerHTML = '<div class="ag-wait"><b>Du schaust zu.</b></div>'; return; }
    GAMES[V.game](st, V, { rng, done, later, every, left, fallback, me });
  }
  const pointer = (el, down, up) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } down(e); });
    if (up) { el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); }
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  const GAMES = {
    reaktion(st, V, k) {
      st.innerHTML = '<button class="ag-react wait" id="ag-r"><b>WARTEN …</b><small>Erst bei GRÜN drücken</small></button>';
      const b = st.querySelector('#ag-r'), wait = 1600 + k.rng() * 3600; let goAt = 0;
      if (V.level >= 2) [0.3, 0.6].forEach((f, i) => k.later(() => { if (!goAt) { b.className = 'ag-react fake'; b.innerHTML = `<b>${i ? 'J E T Z T (Spaß)' : 'JETZT? NEIN.'}</b><small>nicht drücken</small>`; k.later(() => { if (!goAt) { b.className = 'ag-react wait'; b.innerHTML = '<b>WARTEN …</b><small>Erst bei GRÜN drücken</small>'; } }, 450); } }, wait * f));
      k.later(() => { goAt = performance.now(); b.className = 'ag-react go'; b.innerHTML = '<b>JETZT!</b>'; }, wait);
      pointer(b, () => { if (!goAt) { k.done(9999, 'ZU FRÜH. CRINGE.'); GF() && GF().play('boom'); } else { const ms = Math.round(performance.now() - goAt); k.done(ms, `${ms} ms`); } });
      k.fallback(() => k.done(9999, 'Eingeschlafen?'));
    },
    spam(st, V, k) {
      let n = 0, t0 = 0;
      st.innerHTML = '<div class="ag-spam"><p class="ag-big" id="ag-n">0</p><button class="ag-btn" id="ag-b">AURA FARMEN</button><small id="ag-t">Los gehts beim ersten Klick. 6 Sekunden.</small></div>';
      const b = st.querySelector('#ag-b'), num = st.querySelector('#ag-n'), tt = st.querySelector('#ag-t');
      const jump = V.level >= 3 || V.mods.includes('tiny');
      pointer(b, () => {
        if (!t0) { t0 = Date.now(); k.later(() => k.done(n, `${n} Klicks`), 6000); k.every(() => { tt.textContent = `${Math.max(0, (6 - (Date.now() - t0) / 1000)).toFixed(1)} s`; }, 100); }
        n++; num.textContent = n; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
        if (jump && n % 6 === 0) { b.style.position = 'relative'; b.style.left = `${(Math.random() - 0.5) * 60}%`; b.style.top = `${(Math.random() - 0.5) * 40}px`; }
      });
      k.fallback(() => k.done(n, `${n} Klicks`));
    },
    hold67(st, V, k) {
      st.innerHTML = '<div class="ag-spam"><p class="ag-big" id="ag-c">0,00</p><button class="ag-btn round" id="ag-b">HALTEN</button><small>Ziel: genau 6,70 Sekunden. Nach 2 Sekunden wird es dunkel.</small></div>';
      const b = st.querySelector('#ag-b'), c = st.querySelector('#ag-c'); let t0 = 0, raf = 0;
      const tick = () => { const s = (performance.now() - t0) / 1000; c.textContent = s < 2 ? s.toFixed(2).replace('.', ',') : V.level >= 4 ? (Math.random() * 9).toFixed(2).replace('.', ',') : '?,??'; raf = requestAnimationFrame(tick); };
      pointer(b, () => { if (t0) return; t0 = performance.now(); b.textContent = 'MEWING …'; b.classList.add('held'); tick(); }, () => {
        if (!t0) return; cancelAnimationFrame(raf); const s = (performance.now() - t0) / 1000, off = Math.round(Math.abs(s - 6.7) * 1000) / 1000;
        k.done(off, `${s.toFixed(2).replace('.', ',')} s – ${off.toFixed(2).replace('.', ',')} daneben`);
      });
      k.fallback(() => { cancelAnimationFrame(raf); k.done(t0 ? Math.abs((performance.now() - t0) / 1000 - 6.7) : 99, 'Zeit um.'); });
    },
    enten(st, V, k) {
      const N = 7 + Math.floor(k.rng() * 14) + V.level * 2;
      st.innerHTML = `<div class="ag-pond">${Array.from({ length: N }, () => `<i style="left:${(k.rng() * 88).toFixed(1)}%;top:${(k.rng() * 80).toFixed(1)}%;--dx:${((k.rng() - 0.5) * (V.level >= 2 ? 140 : 30)).toFixed(0)}px;--s:${(0.6 + k.rng() * 0.6).toFixed(2)}">${DUCK}</i>`).join('')}</div>`;
      k.later(() => {
        st.innerHTML = '<div class="ag-spam"><p class="ag-q">Wie viele Enten waren es?</p><input type="number" inputmode="numeric" id="ag-i" class="ag-in" min="0" max="99" autofocus><button class="ag-btn" id="ag-b">ABGEBEN</button></div>';
        const i = st.querySelector('#ag-i'), go = () => { const g = Number(i.value); if (i.value === '' || !isFinite(g)) return; k.done(Math.abs(g - N), `Du sagst ${g}. Es waren ${N}.`); };
        st.querySelector('#ag-b').onclick = go; i.onkeydown = (e) => { if (e.key === 'Enter') go(); }; i.focus();
      }, 3400);
      k.fallback(() => k.done(99, `Zeit um. Es waren ${N}.`));
    },
    tippen(st, V, k) {
      const txt = A.TEXTS[V.seed % A.TEXTS.length], t0 = performance.now();
      st.innerHTML = `<div class="ag-spam"><p class="ag-phrase ${V.level >= 3 ? 'wild' : ''}">${txt.split('').map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</p><input id="ag-i" class="ag-in wide" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="hier tippen …"></div>`;
      const i = st.querySelector('#ag-i'), norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
      i.focus();
      i.oninput = () => { i.classList.toggle('ok', txt.startsWith(norm(i.value)) || norm(txt).startsWith(norm(i.value))); if (norm(i.value) === norm(txt)) { const ms = Math.round(performance.now() - t0); k.done(ms, `${(ms / 1000).toFixed(2).replace('.', ',')} s`); } };
      k.fallback(() => k.done(99999, 'Nicht fertig geworden.'));
    },
    simon(st, V, k) {
      const len = Math.min(10, 4 + V.level), seq = Array.from({ length: len }, () => Math.floor(k.rng() * 4));
      st.innerHTML = `<div class="ag-spam"><p class="ag-q" id="ag-q">Merken …</p><div class="ag-pads">${[0, 1, 2, 3].map((c) => `<button class="ag-pad c${c}" data-c="${c}" disabled></button>`).join('')}</div><small id="ag-p"></small></div>`;
      const pads = [...st.querySelectorAll('.ag-pad')], q = st.querySelector('#ag-q'), pr = st.querySelector('#ag-p');
      const flash = (c) => { pads[c].classList.add('lit'); k.later(() => pads[c].classList.remove('lit'), 330); FX && FX.play('step'); };
      seq.forEach((c, j) => k.later(() => flash(c), 600 + j * 560));
      let pos = 0, t0 = 0;
      k.later(() => { q.textContent = 'Jetzt du!'; t0 = performance.now(); pads.forEach((p) => { p.disabled = false; }); }, 600 + len * 560 + 200);
      pads.forEach((p) => { p.onclick = () => {
        const c = Number(p.dataset.c); flash(c);
        if (c !== seq[pos]) return k.done(pos * 100000 - Math.round(performance.now() - t0), `Falsch bei ${pos + 1}. ${pos} von ${len} richtig.`);
        pos++; pr.textContent = `${pos}/${len}`;
        if (pos === len) k.done(len * 100000 - Math.round(performance.now() - t0), `Alle ${len} richtig. Gehirn: aktiviert.`);
      }; });
      k.fallback(() => k.done(pos * 100000 - 99999, `Zeit um. ${pos} von ${len}.`));
    },
    umfrage(st, V, k) {
      const [q, ans] = A.QUESTIONS[V.seed % A.QUESTIONS.length];
      st.innerHTML = `<div class="ag-spam"><p class="ag-q">${esc(q)}</p><div class="ag-ans">${ans.map((a, i) => `<button class="ag-btn alt" data-a="${i}">${esc(a)}</button>`).join('')}</div><small>Die Mehrheit gewinnt.</small></div>`;
      st.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => k.done(Number(b.dataset.a), `Du: „${ans[b.dataset.a]}“`); });
    },
    teilen(st, V, k) {
      st.innerHTML = '<div class="ag-spam"><p class="ag-q">Teilen oder klauen?</p><div class="ag-ans two"><button class="ag-btn share" data-a="0">TEILEN</button><button class="ag-btn steal" data-a="1">KLAUEN</button></div><small>Niemand sieht deine Wahl. Noch nicht.</small></div>';
      st.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => k.done(Number(b.dataset.a), b.dataset.a === '1' ? 'Du klaust. Toxisch.' : 'Du teilst. Wholesome.'); });
    },
    loslassen(st, V, k) {
      st.innerHTML = '<div class="ag-spam"><p class="ag-big" id="ag-c">0,0 s</p><button class="ag-btn round huge" id="ag-b">GEDRÜCKT HALTEN</button><p class="ag-taunt" id="ag-t"></p></div>';
      const b = st.querySelector('#ag-b'), c = st.querySelector('#ag-c'), tt = st.querySelector('#ag-t'); let t0 = 0, iv = 0;
      pointer(b, () => {
        if (t0) return; t0 = performance.now(); b.classList.add('held'); b.textContent = 'NICHT LOSLASSEN';
        iv = setInterval(() => { c.textContent = `${((performance.now() - t0) / 1000).toFixed(1).replace('.', ',')} s`; }, 100);
        k.every(() => { tt.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)]; tt.classList.remove('pop'); void tt.offsetWidth; tt.classList.add('pop'); if (V.level >= 4 && Math.random() < 0.4) GF() && GF().play('boing'); }, 1900);
      }, () => { if (!t0) return; clearInterval(iv); const ms = Math.round(performance.now() - t0); k.done(ms, `Losgelassen nach ${(ms / 1000).toFixed(1).replace('.', ',')} s`); });
      k.fallback(() => { clearInterval(iv); k.done(t0 ? Math.round(performance.now() - t0) : 0, t0 ? 'Bis zum Ende gehalten. Legende.' : 'Gar nicht gedrückt?'); });
    },
  };

  // ---------- Ergebnis ----------
  function rawText(V, r) {
    const v = r.raw;
    if (v == null) return 'nichts gemacht';
    switch (V.game) {
      case 'reaktion': return v >= 9999 ? 'zu früh' : `${v} ms`;
      case 'spam': return `${v} Klicks`;
      case 'hold67': return `${Number(v).toFixed(2).replace('.', ',')} s daneben`;
      case 'enten': return v >= 99 ? 'keine Ahnung' : `${v} daneben`;
      case 'tippen': return v >= 99999 ? 'nicht fertig' : `${(v / 1000).toFixed(2).replace('.', ',')} s`;
      case 'simon': return `${Math.max(0, Math.ceil(v / 100000))} richtig`;
      case 'umfrage': return `„${A.QUESTIONS[V.seed % A.QUESTIONS.length][1][v]}“`;
      case 'teilen': return v ? 'KLAUEN' : 'TEILEN';
      case 'loslassen': return `${(v / 1000).toFixed(1).replace('.', ',')} s`;
    }
    return String(v);
  }
  function result(wrap, V, me) {
    const R = V.res, byId = Object.fromEntries(V.players.map((p) => [p.id, p]));
    wrap.innerHTML = `<div class="ag-card ag-res"><small>ERGEBNIS · ${esc(A.GAMES[V.game].name)}${R.inverted ? ' · WERTUNG UMGEDREHT' : ''}</small>
      <ol>${R.ranked.map((r, i) => `<li style="--pc:${byId[r.id].color};--i:${i}" class="${r.id === me ? 'me' : ''}"><span class="ag-pos">${r.place + 1}</span><b>${esc(byId[r.id].name)}</b><small>${esc(rawText(V, r))}</small><em class="${r.gain < 0 ? 'neg' : ''}">${r.gain > 0 ? '+' : ''}${fmt(r.gain)} AURA</em></li>`).join('')}</ol></div>`;
    const mine = R.ranked.find((r) => r.id === me);
    if (mine && meLast !== V.phaseId) {
      meLast = V.phaseId;
      const g = GF();
      if (mine.place === 0) { FX && FX.play('cash'); g && g.play('airhorn'); g && g.big('+AURA', 'gold'); }
      else if (mine.gain < 0) { g && g.play('sad'); g && g.big('L', 'bad'); }
    }
  }
  function over(wrap, V, me, api) {
    const ranked = V.players.slice().sort((a, b) => V.aura[b.id] - V.aura[a.id]);
    const TITLES = ['SIGMA DES ABENDS', 'Beta mit Potenzial', 'Mittelmaß-Enjoyer', 'Statist:in', 'Hintergrund-NPC'];
    wrap.innerHTML = `<div class="ag-card ag-over"><small>AURA GAMES · ENDSTAND</small><h2>${V.winners.includes(me) ? 'DU BIST DER SIGMA.' : `${esc(ranked[0].name)} GEWINNT.`}</h2>
      <ol>${ranked.map((p, i) => `<li style="--pc:${p.color};--i:${i}" class="${p.id === me ? 'me' : ''}"><span class="ag-pos">${i + 1}</span><b>${esc(p.name)}</b><small>${ranked.length > 1 && i === ranked.length - 1 ? 'NPC DES ABENDS' : TITLES[Math.min(i, TITLES.length - 1)]}</small><em class="${V.aura[p.id] < 0 ? 'neg' : ''}">${fmt(V.aura[p.id])} AURA</em></li>`).join('')}</ol>
      <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" data-again>Nochmal (noch komischer)</button><button class="btn btn-ghost" data-lobby>Zur Lobby</button>' : '<p class="p-wait">Der Host startet die Revanche.</p>'}</div></div>`;
    wrap.querySelectorAll('[data-again]').forEach((b) => { b.onclick = () => api.again(); });
    wrap.querySelectorAll('[data-lobby]').forEach((b) => { b.onclick = () => api.lobby(); });
    if (V.winners.includes(me)) { FX && FX.play('win'); FX && FX.confetti(); } else { const g = GF(); g && g.play('sad'); }
  }

  window.DULI_PARTY.start({
    id: 'aura', title: 'Aura Games', kicker: 'PARTY · MINISPIELE', titleHTML: 'AURA <span class="outline">GAMES</span>',
    min: 1, max: 8, soloBots: 3, botNames: ['Sigma-Bot', 'NPC Norbert', 'Rizz-Robo', 'Mewing-Maik', 'Skibidi-Sven', 'Ohio-Olga', 'Aura-Anna'],
    tagline: 'Minispiele-Battle um Aura. Jede Runde wird komischer. April kommentiert alles. Sehr cringe. Online bis 8 Leute oder gegen Bots.',
    defaults: { rounds: 7 },
    settingsHTML: (st, host) => `<label class="row"><span>Runden<small>Das letzte Spiel ist immer das Finale</small></span><select data-set="rounds" data-num="1" ${host ? '' : 'disabled'}>${[5, 7, 9].map((v) => `<option value="${v}" ${Number(st.rounds || 7) === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`,
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Jede Runde ist ein <b>Minispiel</b>. Alle spielen <b>gleichzeitig</b>: Reaktion, Spam-Klicken, 6,7 Sekunden halten, Enten zählen, Brainrot tippen, Farben merken, Rizz-Umfrage, Teilen oder Klauen.</li>
      <li>Platz 1 bekommt die meiste <b>Aura</b>. Wer Letzte:r wird, <b>verliert</b> Aura.</li>
      <li>Jede Runde steigt das <b>Weirdness-Level</b>: gespiegelter Bildschirm, Comic Sans, Erdbeben, Enten, kopfüber, umgedrehte Wertung, doppelte Aura.</li>
      <li>Finale: <b>Wer zuletzt loslässt</b>. April lenkt dich ab.</li></ul></div>`,
    engine: A, render,
  });
})();
