// Dulidan-Spielhalle: sechs Spiele, die nichts mit Monopoly zu tun haben.
// Jedes Spiel bekommt ein Element und eine kleine API (Sound, April, XP, Highscore) und liefert eine Aufräum-Funktion.
(function (root) {
  const FX = root.DULI_FX;
  const sound = (n) => { try { FX && FX.play(n); } catch (e) { /* egal */ } };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (n) => Math.floor(Math.random() * n);
  const best = {
    get(id) { try { return JSON.parse(localStorage.getItem('duli-arc-' + id)); } catch (e) { return null; } },
    set(id, v) { try { localStorage.setItem('duli-arc-' + id, JSON.stringify(v)); } catch (e) { /* privat */ } },
  };
  // Swipe-Gesten für Handys
  function onSwipe(el, cb) {
    let sx = 0, sy = 0;
    const start = (e) => { const t = e.touches ? e.touches[0] : e; sx = t.clientX; sy = t.clientY; };
    const end = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end);
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end); };
  }
  const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  // April als Bild für Canvas-Spiele
  function aprilImage() {
    const sym = document.getElementById('april');
    const img = new Image();
    if (sym) img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${sym.innerHTML}</svg>`);
    return img;
  }

  // =====================================================================
  // 🎲 KNIFFEL – bis zu 3 Bots
  // =====================================================================
  const KN_CATS = [
    ['ones', 'Einser'], ['twos', 'Zweier'], ['threes', 'Dreier'], ['fours', 'Vierer'], ['fives', 'Fünfer'], ['sixes', 'Sechser'],
    ['three', 'Dreierpasch'], ['four', 'Viererpasch'], ['full', 'Full House'], ['small', 'Kleine Straße'], ['large', 'Große Straße'], ['kniffel', 'Kniffel'], ['chance', 'Chance'],
  ];
  const UPPER = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  function knScore(cat, d) {
    const cnt = [0, 0, 0, 0, 0, 0, 0];
    d.forEach((x) => cnt[x]++);
    const sum = d.reduce((a, b) => a + b, 0);
    const has = (n) => cnt.some((c) => c >= n);
    const run = (len) => { let r = 0, m = 0; for (let v = 1; v <= 6; v++) { r = cnt[v] ? r + 1 : 0; m = Math.max(m, r); } return m >= len; };
    const ui = UPPER.indexOf(cat);
    if (ui >= 0) return cnt[ui + 1] * (ui + 1);
    switch (cat) {
      case 'three': return has(3) ? sum : 0;
      case 'four': return has(4) ? sum : 0;
      case 'full': return (cnt.includes(3) && cnt.includes(2)) || has(5) ? 25 : 0;
      case 'small': return run(4) ? 30 : 0;
      case 'large': return run(5) ? 40 : 0;
      case 'kniffel': return has(5) ? 50 : 0;
      case 'chance': return sum;
    }
    return 0;
  }
  function knTotal(sheet) {
    const up = UPPER.reduce((a, c) => a + (sheet[c] || 0), 0);
    const bonus = up >= 63 ? 35 : 0;
    return { up, bonus, total: KN_CATS.reduce((a, [c]) => a + (sheet[c] || 0), 0) + bonus };
  }
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dieFace = (n) => { let h = ''; for (let k = 0; k < 9; k++) h += PIPS[n].includes(k) ? '<i></i>' : '<span></span>'; return h; };

  function kniffel(el, api) {
    let timers = [], G = null;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    function setup() {
      el.innerHTML = `<div class="arc-setup"><h2>🎲 Kniffel</h2><p>Fünf Würfel, drei Würfe, 13 Kategorien. Oben 63 Punkte = 35 Bonus. Gegen wie viele Bots?</p>
        <div class="btn-row">${[0, 1, 2, 3].map((n) => `<button class="btn ${n === 1 ? 'btn-primary' : ''}" data-kn-bots="${n}">${n === 0 ? 'Solo' : `${n} ${n === 1 ? 'Bot' : 'Bots'}`}</button>`).join('')}</div></div>`;
    }
    function start(bots) {
      const names = ['April-Bot', 'KI-Kevin', 'Bot Bernd'];
      G = { players: [{ name: api.name(), bot: false, sheet: {} }, ...names.slice(0, bots).map((n) => ({ name: n, bot: true, sheet: {} }))], cur: 0, dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rolls: 3, rolling: false, over: false };
      render();
    }
    const curP = () => G.players[G.cur];
    function roll() {
      if (G.rolls <= 0 || G.over) return;
      G.rolls--; G.rolling = true;
      G.dice = G.dice.map((v, i) => (G.held[i] ? v : 1 + rnd(6)));
      sound('roll');
      render();
      later(() => { G.rolling = false; render(); if (curP().bot) botThink(); }, 450);
    }
    function pick(cat) {
      const p = curP();
      if (p.sheet[cat] != null || G.rolls === 3) return;
      p.sheet[cat] = knScore(cat, G.dice);
      sound(p.sheet[cat] >= 25 ? 'cash' : 'pop');
      if (cat === 'kniffel' && p.sheet[cat] === 50) { api.say(`KNIFFEL! ${p.name} hat fünf Gleiche!`); sound('win'); }
      next();
    }
    function next() {
      G.held = [false, false, false, false, false]; G.rolls = 3;
      const done = G.players.every((p) => KN_CATS.every(([c]) => p.sheet[c] != null));
      if (done) { G.over = true; render(); return finish(); }
      G.cur = (G.cur + 1) % G.players.length;
      render();
      if (curP().bot) later(() => roll(), 700);
    }
    function botThink() {
      const p = curP(), open = KN_CATS.map(([c]) => c).filter((c) => p.sheet[c] == null);
      const cnt = [0, 0, 0, 0, 0, 0, 0];
      G.dice.forEach((x) => cnt[x]++);
      const bestCat = () => open.map((c) => {
        let v = knScore(c, G.dice);
        if (UPPER.includes(c)) v += cnt[UPPER.indexOf(c) + 1] >= 3 ? 8 : -4;
        if (c === 'chance') v -= 12;
        if (c === 'kniffel' && v === 0) v = -3;
        return { c, v };
      }).sort((a, b) => b.v - a.v)[0];
      const b = bestCat();
      if (G.rolls > 0 && !(b && b.v >= 25)) {
        const vals = new Set(G.dice);
        const straight = [1, 2, 3, 4, 5, 6].filter((v) => vals.has(v));
        if ((open.includes('small') || open.includes('large')) && straight.length >= 4) {
          const seen = new Set();
          G.held = G.dice.map((v) => (!seen.has(v) && seen.add(v)) ? true : false);
        } else {
          let keep = 6;
          for (let v = 6; v >= 1; v--) if (cnt[v] > cnt[keep]) keep = v;
          G.held = G.dice.map((v) => v === keep);
        }
        render();
        later(() => roll(), 650);
        return;
      }
      if (!b) return next();
      later(() => pick(b.v > 0 || open.length === 1 ? b.c : open.sort((x, y) => knScore(x, G.dice) - knScore(y, G.dice) || (x === 'ones' ? -1 : 1))[0]), 600);
    }
    function finish() {
      const res = G.players.map((p) => ({ p, t: knTotal(p.sheet).total })).sort((a, b) => b.t - a.t);
      const me = G.players[0], mine = knTotal(me.sheet).total;
      const rec = best.get('kniffel') || 0;
      if (mine > rec) best.set('kniffel', mine);
      const won = res[0].p === me;
      api.xp(30 + (won && G.players.length > 1 ? 70 : 0) + Math.floor(mine / 10));
      api.say(won ? `${me.name} gewinnt mit ${mine} Punkten!` : `${res[0].p.name} gewinnt. Nächstes Mal, ${me.name}.`);
      if (won) sound('win');
      api.best();
    }
    function render() {
      if (!G) return setup();
      const p = curP(), mine = !p.bot && !G.over;
      el.innerHTML = `<div class="kn">
        <div class="kn-top"><div class="kn-turn">${G.over ? '🏁 Spiel vorbei' : `${p.bot ? '🤖' : '🎲'} <strong>${esc(p.name)}</strong> ist dran`}</div>
          <div class="kn-dice">${G.dice.map((v, i) => `<button class="kn-die ${G.held[i] ? 'is-held' : ''} ${G.rolling && !G.held[i] ? 'is-rolling' : ''}" data-kn-hold="${i}" ${!mine || G.rolls === 3 ? 'disabled' : ''}>${dieFace(v)}</button>`).join('')}</div>
          <div class="btn-row">${G.over ? '<button class="btn btn-primary" data-kn-again>Nochmal spielen</button>' : `<button class="btn btn-primary" data-kn-roll ${!mine || G.rolls <= 0 || G.rolling ? 'disabled' : ''}>🎲 Würfeln (${G.rolls} übrig)</button>`}</div>
          <p class="arc-hint">${G.over ? '' : mine ? (G.rolls === 3 ? 'Erst würfeln.' : 'Würfel antippen zum Festhalten, dann eine Kategorie wählen.') : 'Der Bot überlegt …'}</p></div>
        <div class="kn-sheet"><table><thead><tr><th></th>${G.players.map((q, i) => `<th class="${i === G.cur && !G.over ? 'is-cur' : ''}">${esc(q.name)}</th>`).join('')}</tr></thead><tbody>
          ${KN_CATS.map(([c, n], ci) => `${ci === 6 ? `<tr class="kn-sum"><td>Bonus (ab 63)</td>${G.players.map((q) => { const t = knTotal(q.sheet); return `<td>${t.bonus ? '+35' : `${t.up}/63`}</td>`; }).join('')}</tr>` : ''}
            <tr><td>${n}</td>${G.players.map((q, i) => {
              const v = q.sheet[c];
              if (v != null) return `<td class="kn-done">${v}</td>`;
              if (i === G.cur && mine && G.rolls < 3 && !G.rolling) { const s = knScore(c, G.dice); return `<td><button class="kn-pick ${s ? '' : 'is-zero'}" data-kn-pick="${c}">${s}</button></td>`; }
              return '<td class="kn-empty">·</td>';
            }).join('')}</tr>`).join('')}
          <tr class="kn-total"><td>Gesamt</td>${G.players.map((q) => `<td>${knTotal(q.sheet).total}</td>`).join('')}</tr>
        </tbody></table></div></div>`;
    }
    const onClick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.knBots != null) return start(Number(b.dataset.knBots));
      if (b.dataset.knAgain != null) { G = null; return setup(); }
      if (!G || curP().bot) return;
      if (b.dataset.knRoll != null) return roll();
      if (b.dataset.knHold != null) { G.held[b.dataset.knHold] = !G.held[b.dataset.knHold]; sound('step'); return render(); }
      if (b.dataset.knPick) return pick(b.dataset.knPick);
    };
    el.addEventListener('click', onClick);
    setup();
    return () => { timers.forEach(clearTimeout); el.removeEventListener('click', onClick); };
  }

  // =====================================================================
  // 🔴 VIER GEWINNT – gegen den Bot (Minimax) oder zu zweit
  // =====================================================================
  function connect4(el, api) {
    const R = 6, C = 7;
    let G = null, timer = null;
    const lines = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
        if (cells.every(([y, x]) => y >= 0 && y < R && x >= 0 && x < C)) lines.push(cells);
      }
    }
    const winner = (b) => { for (const l of lines) { const v = b[l[0][0]][l[0][1]]; if (v && l.every(([y, x]) => b[y][x] === v)) return { v, l }; } return null; };
    const dropRow = (b, c) => { for (let r = R - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; };
    function evalBoard(b, me) {
      let s = 0;
      for (const l of lines) {
        const vals = l.map(([y, x]) => b[y][x]);
        const m = vals.filter((v) => v === me).length, o = vals.filter((v) => v && v !== me).length;
        if (m && o) continue;
        s += m === 3 ? 6 : m === 2 ? 2 : 0;
        s -= o === 3 ? 8 : o === 2 ? 2 : 0;
      }
      for (let r = 0; r < R; r++) if (b[r][3] === me) s += 2;
      return s;
    }
    function minimax(b, depth, alpha, beta, maxi, me) {
      const w = winner(b);
      if (w) return w.v === me ? 10000 + depth : -10000 - depth;
      if (depth === 0) return evalBoard(b, me);
      const moves = [3, 2, 4, 1, 5, 0, 6].filter((c) => dropRow(b, c) >= 0);
      if (!moves.length) return 0;
      const who = maxi ? me : 3 - me;
      let bestV = maxi ? -Infinity : Infinity;
      for (const c of moves) {
        const r = dropRow(b, c);
        b[r][c] = who;
        const v = minimax(b, depth - 1, alpha, beta, !maxi, me);
        b[r][c] = 0;
        if (maxi) { bestV = Math.max(bestV, v); alpha = Math.max(alpha, v); } else { bestV = Math.min(bestV, v); beta = Math.min(beta, v); }
        if (beta <= alpha) break;
      }
      return bestV;
    }
    function botMove() {
      const b = G.b, me = 2;
      let bestC = 3, bestV = -Infinity;
      for (const c of [3, 2, 4, 1, 5, 0, 6]) {
        const r = dropRow(b, c);
        if (r < 0) continue;
        b[r][c] = me;
        const v = minimax(b, G.depth, -Infinity, Infinity, false, me) + (Math.random() - 0.5) * (G.depth < 3 ? 6 : 0.5);
        b[r][c] = 0;
        if (v > bestV) { bestV = v; bestC = c; }
      }
      play(bestC);
    }
    function setup() {
      el.innerHTML = `<div class="arc-setup"><h2>🔴 Vier gewinnt</h2><p>Vier in einer Reihe gewinnt – waagerecht, senkrecht oder schräg. Du spielst Lila.</p>
        <div class="btn-row"><button class="btn" data-c4="1">Gegen Bot · leicht</button><button class="btn btn-primary" data-c4="4">Gegen Bot · schwer</button><button class="btn" data-c4="0">Zu zweit</button></div></div>`;
    }
    function start(depth) {
      G = { b: Array.from({ length: R }, () => Array(C).fill(0)), turn: 1, depth, bot: depth > 0, over: null, last: null, score: G ? G.score : [0, 0] };
      render();
    }
    function play(c) {
      if (G.over) return;
      const r = dropRow(G.b, c);
      if (r < 0) return;
      G.b[r][c] = G.turn; G.last = [r, c];
      sound('step');
      const w = winner(G.b);
      if (w) {
        G.over = w; G.score[w.v - 1]++;
        sound(w.v === 1 || !G.bot ? 'win' : 'jail');
        if (G.bot) {
          if (w.v === 1) { api.xp(G.depth >= 4 ? 70 : 30); api.say('Vier in einer Reihe! Der Bot ist beleidigt.'); const s = best.get('connect4') || 0; best.set('connect4', s + 1); api.best(); }
          else api.say('Der Bot hat gewonnen. Ich hab nichts gesehen.');
        }
      } else if (G.b.every((row) => row.every(Boolean))) G.over = { v: 0, l: [] };
      else G.turn = 3 - G.turn;
      render();
      if (!G.over && G.bot && G.turn === 2) timer = setTimeout(botMove, 380);
    }
    function render() {
      const win = G.over && G.over.l ? G.over.l.map(([y, x]) => `${y}-${x}`) : [];
      const status = G.over ? (G.over.v === 0 ? 'Unentschieden!' : G.over.v === 1 ? (G.bot ? '🏆 Du gewinnst!' : '🏆 Lila gewinnt!') : (G.bot ? '🤖 Der Bot gewinnt.' : '🏆 Pink gewinnt!'))
        : G.turn === 1 ? (G.bot ? 'Du bist dran (Lila)' : 'Lila ist dran') : (G.bot ? 'Der Bot denkt …' : 'Pink ist dran');
      el.innerHTML = `<div class="c4"><div class="c4-head"><span class="c4-score">Lila ${G.score[0]} : ${G.score[1]} ${G.bot ? 'Bot' : 'Pink'}</span><strong>${status}</strong></div>
        <div class="c4-board">${Array.from({ length: C }, (_, c) => `<button class="c4-col" data-c4col="${c}" ${G.over || (G.bot && G.turn === 2) ? 'disabled' : ''}>${Array.from({ length: R }, (_, r) => {
          const v = G.b[r][c];
          return `<span class="c4-cell"><i class="${v === 1 ? 'p1' : v === 2 ? 'p2' : ''} ${G.last && G.last[0] === r && G.last[1] === c ? 'is-drop' : ''} ${win.includes(`${r}-${c}`) ? 'is-win' : ''}" style="--r:${r}"></i></span>`;
        }).join('')}</button>`).join('')}</div>
        <div class="btn-row">${G.over ? '<button class="btn btn-primary" data-c4again>Nochmal</button>' : ''}<button class="btn btn-ghost" data-c4menu>Modus wechseln</button></div></div>`;
    }
    const onClick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.c4 != null) return start(Number(b.dataset.c4));
      if (b.dataset.c4again != null) return start(G.depth);
      if (b.dataset.c4menu != null) { G = null; return setup(); }
      if (b.dataset.c4col != null && G && !(G.bot && G.turn === 2)) play(Number(b.dataset.c4col));
    };
    el.addEventListener('click', onClick);
    setup();
    return () => { clearTimeout(timer); el.removeEventListener('click', onClick); };
  }

  // =====================================================================
  // 🧠 MEMORY – Dulidan-Paare finden
  // =====================================================================
  const MEM_ICONS = ['🥙', '🦓', '🚐', '💖', '🎰', '🏁', '👑', '💣', '🍕', '🐈', '🦆', '🎮', '🚀', '📸', '👻', '🧠', '🍟', '🧋'];
  function memory(el, api) {
    let G = null, timer = null, clock = null;
    function setup() {
      el.innerHTML = `<div class="arc-setup"><h2>🧠 Memory</h2><p>Finde alle Paare mit so wenigen Zügen wie möglich.</p>
        <div class="btn-row"><button class="btn btn-primary" data-mem="4">4 × 4 (8 Paare)</button><button class="btn" data-mem="6">6 × 6 (18 Paare)</button></div></div>`;
    }
    function start(n) {
      const pairs = MEM_ICONS.slice(0, (n * n) / 2);
      const cards = pairs.concat(pairs).sort(() => Math.random() - 0.5).map((ic) => ({ ic, open: false, done: false }));
      G = { n, cards, first: null, lock: false, moves: 0, t0: Date.now(), found: 0 };
      clearInterval(clock);
      clock = setInterval(() => { const t = el.querySelector('.mem-time'); if (t && G && G.found < G.n * G.n / 2) t.textContent = `${Math.floor((Date.now() - G.t0) / 1000)} s`; }, 500);
      render();
    }
    function flip(i) {
      const c = G.cards[i];
      if (G.lock || c.open || c.done) return;
      c.open = true; sound('card');
      if (G.first == null) { G.first = i; return render(); }
      G.moves++;
      const a = G.cards[G.first];
      if (a.ic === c.ic) {
        a.done = c.done = true; G.first = null; G.found++;
        sound('cash');
        render();
        if (G.found === G.n * G.n / 2) {
          const key = `memory${G.n}`, rec = best.get(key);
          if (!rec || G.moves < rec) best.set(key, G.moves);
          api.xp(G.n === 6 ? 80 : 35);
          api.say(`Alle Paare in ${G.moves} Zügen! ${G.moves <= G.n * G.n * 0.75 ? 'Elefantengedächtnis.' : 'Nicht schlecht.'}`);
          sound('win');
          api.best();
        }
        return;
      }
      G.lock = true;
      render();
      timer = setTimeout(() => { a.open = c.open = false; G.first = null; G.lock = false; render(); }, 750);
    }
    function render() {
      const done = G.found === G.n * G.n / 2;
      el.innerHTML = `<div class="mem"><div class="mem-head"><span>Züge: <strong>${G.moves}</strong></span><span>Paare: <strong>${G.found}/${G.n * G.n / 2}</strong></span><span class="mem-time">${Math.floor((Date.now() - G.t0) / 1000)} s</span></div>
        <div class="mem-grid" style="--n:${G.n}">${G.cards.map((c, i) => `<button class="mem-card ${c.open || c.done ? 'is-open' : ''} ${c.done ? 'is-done' : ''}" data-mem-i="${i}"><span class="mem-back">D</span><span class="mem-front">${c.ic}</span></button>`).join('')}</div>
        <div class="btn-row">${done ? '<button class="btn btn-primary" data-mem-again>Nochmal</button>' : ''}<button class="btn btn-ghost" data-mem-menu>Größe wechseln</button></div></div>`;
    }
    const onClick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.mem) return start(Number(b.dataset.mem));
      if (b.dataset.memAgain != null) return start(G.n);
      if (b.dataset.memMenu != null) { G = null; clearInterval(clock); return setup(); }
      if (b.dataset.memI != null) flip(Number(b.dataset.memI));
    };
    el.addEventListener('click', onClick);
    setup();
    return () => { clearTimeout(timer); clearInterval(clock); el.removeEventListener('click', onClick); };
  }

  // =====================================================================
  // 🐍 DÖNER-SNAKE
  // =====================================================================
  function snake(el, api) {
    const N = 20;
    el.innerHTML = `<div class="cv-wrap"><div class="cv-head"><span>Döner: <strong id="sn-score">0</strong></span><span>Rekord: <strong id="sn-best">${best.get('snake') || 0}</strong></span></div>
      <canvas id="sn-cv" width="400" height="400"></canvas>
      <div class="dpad"><button data-dir="up">▲</button><button data-dir="left">◀</button><button data-dir="down">▼</button><button data-dir="right">▶</button></div>
      <p class="arc-hint">Pfeiltasten, WASD oder Wischen. Iss Döner, beiß dich nicht selbst.</p></div>`;
    const cv = el.querySelector('#sn-cv'), g = cv.getContext('2d'), S = 400 / N;
    let snakeB, dir, nextDir, food, score, tick, alive, speed;
    const place = () => { do { food = [rnd(N), rnd(N)]; } while (snakeB.some(([x, y]) => x === food[0] && y === food[1])); };
    function reset() { snakeB = [[10, 10], [9, 10], [8, 10]]; dir = 'right'; nextDir = 'right'; score = 0; alive = true; speed = 140; place(); el.querySelector('#sn-score').textContent = '0'; loop(); }
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
    function step() {
      dir = nextDir;
      const [hx, hy] = snakeB[0], nx = hx + D[dir][0], ny = hy + D[dir][1];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N || snakeB.some(([x, y]) => x === nx && y === ny)) return die();
      snakeB.unshift([nx, ny]);
      if (nx === food[0] && ny === food[1]) {
        score++; sound('coinUp'); place();
        el.querySelector('#sn-score').textContent = score;
        speed = Math.max(60, 140 - score * 3);
      } else snakeB.pop();
      draw();
      tick = setTimeout(step, speed);
    }
    function die() {
      alive = false; sound('bigLoss');
      const rec = best.get('snake') || 0;
      if (score > rec) { best.set('snake', score); el.querySelector('#sn-best').textContent = score; api.say(`Neuer Rekord: ${score} Döner!`); }
      api.xp(Math.min(120, score * 3));
      api.best();
      draw(true);
    }
    function draw(dead) {
      g.fillStyle = '#0c0a13'; g.fillRect(0, 0, 400, 400);
      g.strokeStyle = 'rgba(129,34,181,.12)';
      for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(i * S, 0); g.lineTo(i * S, 400); g.moveTo(0, i * S); g.lineTo(400, i * S); g.stroke(); }
      g.font = `${S * 0.9}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(food[0] * S + S / 2, food[1] * S + S / 2, S * 0.38, 0, Math.PI * 2); g.fill();
      snakeB.forEach(([x, y], i) => {
        g.fillStyle = i === 0 ? '#ff7ae6' : `hsl(${285 - i * 2},70%,${55 - Math.min(i, 20)}%)`;
        g.fillRect(x * S + 1, y * S + 1, S - 2, S - 2);
      });
      if (dead) {
        g.fillStyle = 'rgba(7,6,11,.75)'; g.fillRect(0, 0, 400, 400);
        g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.fillText('GAME OVER', 200, 180);
        g.font = '16px sans-serif'; g.fillText(`${score} Döner · Tippen oder Leertaste für neu`, 200, 220);
      }
    }
    function loop() { clearTimeout(tick); draw(); tick = setTimeout(step, speed); }
    const turn = (d) => { if (!alive) return reset(); if (d && d !== OPP[dir]) nextDir = d; };
    const onKey = (e) => {
      const d = KEYDIR[e.key] || KEYDIR[e.key.toLowerCase()];
      if (d) { e.preventDefault(); turn(d); } else if (e.key === ' ' && !alive) { e.preventDefault(); reset(); }
    };
    const onClick = (e) => { const b = e.target.closest('[data-dir]'); if (b) turn(b.dataset.dir); else if (e.target === cv && !alive) reset(); };
    window.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);
    const unsw = onSwipe(cv, turn);
    reset();
    return () => { clearTimeout(tick); window.removeEventListener('keydown', onKey); el.removeEventListener('click', onClick); unsw(); };
  }

  // =====================================================================
  // 🐤 FLAPPY APRIL – durch die Duisburger Schornsteine
  // =====================================================================
  function flappy(el, api) {
    el.innerHTML = `<div class="cv-wrap"><div class="cv-head"><span>Punkte: <strong id="fl-score">0</strong></span><span>Rekord: <strong id="fl-best">${best.get('flappy') || 0}</strong></span></div>
      <canvas id="fl-cv" width="360" height="560"></canvas><p class="arc-hint">Tippen, klicken oder Leertaste zum Flattern.</p></div>`;
    const cv = el.querySelector('#fl-cv'), g = cv.getContext('2d'), W = 360, H = 560;
    const img = aprilImage();
    let bird, pipes, score, state, raf, last;
    function reset() { bird = { y: H / 2, v: 0 }; pipes = []; score = 0; state = 'ready'; el.querySelector('#fl-score').textContent = '0'; }
    function flap() {
      if (state === 'dead') { if (Date.now() - last > 500) reset(); return; }
      if (state === 'ready') state = 'play';
      bird.v = -7.2; sound('step');
    }
    function frame() {
      if (state === 'play') {
        bird.v += 0.38; bird.y += bird.v;
        if (!pipes.length || pipes[pipes.length - 1].x < W - 190) pipes.push({ x: W + 20, gap: 120 + rnd(H - 330), passed: false });
        pipes.forEach((p) => { p.x -= 2.6; });
        pipes = pipes.filter((p) => p.x > -70);
        for (const p of pipes) {
          if (!p.passed && p.x + 60 < 70) { p.passed = true; score++; el.querySelector('#fl-score').textContent = score; sound('coinUp'); }
          const hitX = 70 + 16 > p.x && 70 - 16 < p.x + 60;
          if (hitX && (bird.y - 16 < p.gap || bird.y + 16 > p.gap + 150)) die();
        }
        if (bird.y > H - 40 || bird.y < 0) die();
      } else if (state === 'ready') bird.y = H / 2 + Math.sin(Date.now() / 300) * 8;
      draw();
      raf = requestAnimationFrame(frame);
    }
    function die() {
      if (state === 'dead') return;
      state = 'dead'; last = Date.now(); sound('bigLoss');
      const rec = best.get('flappy') || 0;
      if (score > rec) { best.set('flappy', score); el.querySelector('#fl-best').textContent = score; if (score >= 5) api.say(`Neuer Rekord: ${score}! Ich kann fliegen!`); }
      api.xp(Math.min(120, score * 6));
      api.best();
    }
    function draw() {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1a0f2e'); sky.addColorStop(1, '#3a1450');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (const p of pipes) {
        for (const [y0, h] of [[0, p.gap], [p.gap + 150, H - p.gap - 190]]) {
          g.fillStyle = '#5b1782'; g.fillRect(p.x, y0, 60, h);
          g.fillStyle = '#c020b8'; for (let y = y0 + 10; y < y0 + h - 6; y += 26) g.fillRect(p.x, y, 60, 6);
          g.fillStyle = '#8122b5'; g.fillRect(p.x - 6, y0 === 0 ? p.gap - 18 : p.gap + 150, 72, 18);
        }
      }
      g.fillStyle = '#241a33'; g.fillRect(0, H - 40, W, 40);
      g.fillStyle = '#c020b8'; g.fillRect(0, H - 40, W, 3);
      g.save(); g.translate(70, bird.y); g.rotate(Math.max(-0.5, Math.min(0.8, bird.v / 12)));
      if (img.complete && img.naturalWidth) g.drawImage(img, -22, -22, 44, 44); else { g.fillStyle = '#ff7ae6'; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill(); }
      g.restore();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 44px sans-serif';
      if (state !== 'ready') g.fillText(score, W / 2, 80);
      if (state === 'ready') { g.font = 'bold 22px sans-serif'; g.fillText('Tippen zum Starten', W / 2, H / 2 - 60); }
      if (state === 'dead') { g.fillStyle = 'rgba(7,6,11,.6)'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = 'bold 32px sans-serif'; g.fillText('AUTSCH', W / 2, H / 2 - 20); g.font = '16px sans-serif'; g.fillText('Tippen für nochmal', W / 2, H / 2 + 16); }
    }
    const onKey = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); } };
    const onDown = (e) => { e.preventDefault(); flap(); };
    window.addEventListener('keydown', onKey);
    cv.addEventListener('pointerdown', onDown);
    reset(); last = 0;
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); cv.removeEventListener('pointerdown', onDown); };
  }

  // =====================================================================
  // 🔢 DULIDAN 2048 – vom Pommes bis zum D
  // =====================================================================
  const T2048 = { 2: ['🍟', '#3a2f4f'], 4: ['🥙', '#4b2a5f'], 8: ['🧋', '#5b1782'], 16: ['🍕', '#7a1fa0'], 32: ['🦓', '#8122b5'], 64: ['🚐', '#a52fe6'], 128: ['🎰', '#c020b8'], 256: ['🏁', '#da29cf'], 512: ['👑', '#ff4fd8'], 1024: ['💎', '#ff7ae6'], 2048: ['D', '#ffd23a'] };
  function g2048(el, api) {
    let B, score, over, won;
    function reset() { B = Array.from({ length: 4 }, () => Array(4).fill(0)); score = 0; over = false; won = false; add(); add(); render(); }
    function add() {
      const free = [];
      B.forEach((row, r) => row.forEach((v, c) => { if (!v) free.push([r, c]); }));
      if (!free.length) return;
      const [r, c] = free[rnd(free.length)];
      B[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
    function slide(row) {
      const a = row.filter(Boolean);
      for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; if (a[i] === 2048 && !won) { won = true; api.say('2048! Das goldene D gehört dir!'); sound('win'); api.xp(150); } a.splice(i + 1, 1); }
      while (a.length < 4) a.push(0);
      return a;
    }
    function move(d) {
      if (over) return;
      const before = JSON.stringify(B);
      for (let i = 0; i < 4; i++) {
        let line = d === 'left' || d === 'right' ? B[i].slice() : B.map((r) => r[i]);
        if (d === 'right' || d === 'down') line.reverse();
        line = slide(line);
        if (d === 'right' || d === 'down') line.reverse();
        if (d === 'left' || d === 'right') B[i] = line; else line.forEach((v, r) => { B[r][i] = v; });
      }
      if (JSON.stringify(B) === before) return;
      add(); sound('step');
      const canMove = B.some((row, r) => row.some((v, c) => !v || (c < 3 && row[c + 1] === v) || (r < 3 && B[r + 1][c] === v)));
      if (!canMove) {
        over = true; sound('bigLoss');
        const rec = best.get('2048') || 0;
        if (score > rec) best.set('2048', score);
        api.xp(Math.min(120, Math.floor(score / 80)));
        api.best();
      }
      render();
    }
    function render() {
      el.innerHTML = `<div class="t48"><div class="cv-head"><span>Punkte: <strong>${score}</strong></span><span>Rekord: <strong>${Math.max(score, best.get('2048') || 0)}</strong></span></div>
        <div class="t48-grid">${B.flat().map((v) => `<div class="t48-cell ${v ? 'has' : ''}" style="--c:${v ? T2048[Math.min(v, 2048)][1] : 'transparent'}">${v ? `<span class="t48-ic">${T2048[Math.min(v, 2048)][0]}</span><small>${v}</small>` : ''}</div>`).join('')}</div>
        ${over ? '<p class="arc-hint"><strong>Keine Züge mehr!</strong></p>' : '<p class="arc-hint">Pfeiltasten oder Wischen. Gleiche Teile verschmelzen: 🍟 → 🥙 → 🧋 → 🍕 → 🦓 → 🚐 → 🎰 → 🏁 → 👑 → 💎 → D</p>'}
        <div class="btn-row"><button class="btn ${over ? 'btn-primary' : 'btn-ghost'}" data-t48-new>Neues Spiel</button></div></div>`;
    }
    const onKey = (e) => { const d = KEYDIR[e.key] || KEYDIR[(e.key || '').toLowerCase()]; if (d) { e.preventDefault(); move(d); } };
    const onClick = (e) => { if (e.target.closest('[data-t48-new]')) reset(); };
    window.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);
    const unsw = onSwipe(el, move);
    reset();
    return () => { window.removeEventListener('keydown', onKey); el.removeEventListener('click', onClick); unsw(); };
  }

  const GAMES = [
    { id: 'kniffel', icon: '🎲', name: 'Kniffel', text: 'Fünf Würfel, drei Würfe, 13 Kategorien. Solo oder gegen bis zu 3 Bots.', tags: ['Würfel', 'Bots'], run: kniffel, best: () => (best.get('kniffel') ? `${best.get('kniffel')} Punkte` : null) },
    { id: 'connect4', icon: '🔴', name: 'Vier gewinnt', text: 'Gegen einen Bot, der rechnen kann – oder zu zweit am selben Gerät.', tags: ['Taktik', 'Bot', '2 Spieler'], run: connect4, best: () => (best.get('connect4') ? `${best.get('connect4')} Siege gegen den Bot` : null) },
    { id: 'memory', icon: '🧠', name: 'Memory', text: 'Döner, Zebras, Berlingos: Finde alle Paare mit möglichst wenigen Zügen.', tags: ['Gedächtnis'], run: memory, best: () => (best.get('memory4') || best.get('memory6') ? `4×4: ${best.get('memory4') || '–'} · 6×6: ${best.get('memory6') || '–'} Züge` : null) },
    { id: 'snake', icon: '🐍', name: 'Döner-Snake', text: 'Die Schlange hat Hunger. Jeder Döner macht sie länger und schneller.', tags: ['Arcade', 'Highscore'], run: snake, best: () => (best.get('snake') ? `${best.get('snake')} Döner` : null) },
    { id: 'flappy', icon: '🐤', name: 'Flappy April', text: 'April flattert durch die Duisburger Schornsteine. Einmal antippen = einmal flattern.', tags: ['Arcade', 'Highscore'], run: flappy, best: () => (best.get('flappy') ? `${best.get('flappy')} Punkte` : null) },
    { id: '2048', icon: '🔢', name: 'Dulidan 2048', text: 'Verschmelze Pommes zu Döner zu … bis zum goldenen D.', tags: ['Puzzle', 'Highscore'], run: g2048, best: () => (best.get('2048') ? `${best.get('2048')} Punkte` : null) },
  ];

  root.DULI_ARCADE = { GAMES };
})(typeof window !== 'undefined' ? window : globalThis);
