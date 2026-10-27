// Dulidanopoly – Oberfläche: Startseite, Lobby, Brett, Aktionen
(function () {
  const D = window.DULI_DATA, E = window.DULI_ENGINE, Net = window.DULI_NET, FX = window.DULI_FX;
  const W = window.DULI_WORLD, WD = window.DULI_WORLD_DATA;
  const MOOD = window.DULI_MOOD, CZ = window.DULI_CASINO, RL = window.DULI_RULES, CAMP = window.DULI_CAMPAIGN;
  const isWorld = () => !!(App.S && W.MODES.includes(App.S.mode));
  const GB = () => W.board(App.S.mode);
  const R = window.DULI_REAL, LG = window.DULI_LOGI;
  const isReal = () => !!(App.S && App.S.isReal);
  const ENG = () => (isWorld() ? W : isReal() ? R : E);
  const { GROUPS, TOKENS } = D;
  // Normales Brett oder MEGA-Brett (wird bei jedem Rendern zum Spielstand passend gesetzt)
  let BRD = D.BOARDS.normal, SPACES = BRD.SPACES, RAILS = BRD.RAILS, UTILS = BRD.UTILS;
  function syncBoard() {
    BRD = E.board(App.S);
    ({ SPACES, RAILS, UTILS } = BRD);
    E.useBoard(App.S);
  }
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = (n) => (n < 0 ? '−' : '') + 'Ð' + (Math.abs(n) >= (App.S && App.S.isReal ? 1000 : 10000) ? Math.round(Math.abs(n)).toLocaleString('de-DE') : Math.round(Math.abs(n)));
  // Kompakt fürs Brett: Ð450k, Ð1,25 Mio
  const MK = (n) => (Math.abs(n) >= 1e6 ? `Ð${(n / 1e6).toFixed(2).replace('.', ',')} Mio` : Math.abs(n) >= 10000 ? `Ð${Math.round(n / 1000)}k` : M(n));

  // ---------- Speicher ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* privat */ } },
  };
  let myId = store.get('duli-id');
  if (!myId) { myId = 'u' + Math.random().toString(36).slice(2, 10); store.set('duli-id', myId); }

  // Tempo: normal = Würfel rollen langsam, Figur läuft gemütlich; Blitzmodus = alles schnell
  let fastMode = false;
  try { fastMode = localStorage.getItem('duli-fast') === '1'; } catch (e) { /* privat */ }
  const T = () => (fastMode
    ? { dice: 450, hop: 70, hopBoard: 100, flight: 300, bot: 400 }
    : { dice: 1700, hop: 340, hopBoard: 400, flight: 900, bot: 900 });
  function applyTempo() {
    document.documentElement.style.setProperty('--roll-ms', T().dice + 'ms');
    document.documentElement.classList.toggle('is-fast', fastMode);
    document.querySelectorAll('[data-ui="tempo"]').forEach((b) => {
      b.textContent = fastMode ? '⚡ Blitzmodus: an' : '⚡ Blitzmodus: aus';
      b.classList.toggle('is-on', fastMode);
    });
  }
  const App = { mode: null, S: null, code: null, lastRoll: 0, lastPhase: null, localSel: null, confirmBankrupt: false, trade: null, conn: 'off', seenSeq: null, lastCurId: null, disp: {}, animT: null, botT: null, chat: [] };
  const REACTIONS = ['😂', '🔥', '💀', '🤡', '😭', '🫡', '🙏', '🥙', 'DIGGA', '67', 'WALLAH', 'NO RIZZ', 'TUNG TUNG'];
  const reactLimit = new Map();

  // ---------- Logo ----------
  let logoUid = 0;
  function logoSVG() {
    const u = 'l' + (logoUid++);
    return `<svg viewBox="0 0 700 620" aria-hidden="true"><defs>
<linearGradient id="${u}m" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4a1288"/><stop offset=".55" stop-color="#8a24cc"/><stop offset="1" stop-color="#a52fe6"/></linearGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#b42cf0"/><stop offset="1" stop-color="#e03cff"/></linearGradient>
<linearGradient id="${u}b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3d0f78"/><stop offset="1" stop-color="#7a22bd"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c1cae"/><stop offset="1" stop-color="#7d22c4"/></linearGradient>
<clipPath id="${u}c"><path d="M200 0H380C562 0 690 135 690 310C690 485 562 620 380 620H0V606L272 440H420C478 440 512 380 512 305C512 222 466 155 372 155H200Z"/></clipPath></defs>
<path d="M0 0H150V190L0 268Z" fill="url(#${u}s)"/><path d="M0 325L188 218V425L0 540Z" fill="url(#${u}s)"/>
<g clip-path="url(#${u}c)"><rect width="700" height="620" fill="url(#${u}m)"/>
<path d="M190 -10H710V190L512 296L498 250L480 207L448 177L408 167L372 166L190 166Z" fill="url(#${u}t)"/>
<path d="M-10 640V600L272 440H420L610 548V640Z" fill="url(#${u}b)"/>
<path d="M512 296L700 188M420 440L610 548" stroke="#2a0a4a" stroke-opacity=".45" stroke-width="7"/></g></svg>`;
  }
  document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoSVG(); });

  const aprilIcon = (cls = 'april-ic') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#april"/></svg>`;
  function tokHTML(token, color, extraClass = '') {
    const t = TOKENS[token];
    const inner = !t ? '?' : token === 'dulidan' ? logoSVG() : token === 'april' ? aprilIcon() : t.emoji;
    return `<span class="tok ${extraClass}${token === 'april' ? ' is-april-tok' : ''}" style="--pc:${color || 'var(--line)'}">${inner}</span>`;
  }

  // ---------- Allgemeine UI ----------
  function show(id) {
    for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
    window.scrollTo(0, 0);
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }
  function openModal(html, refresh) {
    App.reModal = refresh || null;
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
  }
  function closeModal() { $('#modal').hidden = true; App.trade = null; App.reModal = null; }
  $('#modal-x').onclick = closeModal;
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  const shareLink = () => `${location.origin}${location.pathname}?raum=${App.code}`;
  async function copyLink() {
    const link = shareLink();
    try { await navigator.clipboard.writeText(link); toast('Link kopiert! Schick ihn deinen Freunden.'); }
    catch (e) { toast(link); }
  }

  // ---------- Zustand & Aktionen ----------
  const P = (id) => App.S && App.S.players.find((p) => p.id === id);
  const curP = () => App.S.players[App.S.cur];

  function save() {
    if (App.mode === 'host' || App.mode === 'local') store.set('duli-save', { mode: App.mode, code: App.code, S: App.S, t: Date.now() });
  }
  function commit() {
    App.S.v++;
    save();
    if (App.mode === 'host') Net.broadcast({ type: 'state', S: App.S });
    render();
    scheduleBots();
  }

  // Bots laufen nur auf dem Host-Gerät (oder lokal)
  function scheduleBots() {
    if (App.botT || (App.mode !== 'host' && App.mode !== 'local')) return;
    if (!App.S || App.S.phase !== 'play' || !ENG().botStep(App.S)) return;
    App.botT = setTimeout(() => {
      App.botT = null;
      if (App.animT || Date.now() < (App.busyUntil || 0)) return scheduleBots();
      const st = App.S && ENG().botStep(App.S);
      if (!st) return;
      const err = ENG().act(App.S, st.pid, st.action);
      if (err) { console.warn('Bot:', err, st.action); return; }
      commit();
    }, T().bot);
  }
  function doAct(action, pid) {
    App.confirmBankrupt = action.type === 'bankruptAsk';
    if (action.type === 'bankruptAsk') return render();
    if (App.mode === 'client') {
      if (!Net.send({ type: 'act', action })) toast('Keine Verbindung zum Host.');
      return;
    }
    const err = (App.S.phase === 'lobby' ? E : ENG()).act(App.S, pid || myId, action);
    if (err) toast(err); else commit();
  }

  function canControl(pid) {
    if (!pid) return false;
    if (P(pid) && P(pid).bot) return false;
    if (App.mode === 'local') return true;
    if (pid === myId) return true;
    const p = P(pid);
    return App.mode === 'host' && p && !p.connected && App.S.phase === 'play';
  }

  // ---------- Netzwerk ----------
  Net.handlers.status = (st) => {
    App.conn = st;
    if (st === 'noroom' && App.mode === 'client' && !App.S) toast('Raum nicht gefunden. Stimmt der Code? Ist der Host online?');
    renderNet();
  };
  Net.handlers.message = (msg, conn) => {
    if (App.mode === 'host') return hostMessage(msg, conn);
    if (msg.type === 'state') {
      App.S = msg.S;
      store.set('duli-client', { code: App.code, name: App.name });
      render();
    } else if (msg.type === 'error') {
      toast(msg.msg);
    } else if (msg.type === 'react') {
      showBubble(msg.pid, msg.r);
    } else if (msg.type === 'chat') {
      showChat(msg.pid, msg.text);
    }
  };
  Net.handlers.peerLeft = (id) => {
    const S = App.S, p = P(id);
    if (!p) return;
    if (S.phase === 'lobby') S.players = S.players.filter((x) => x.id !== id);
    else p.connected = false;
    commit();
  };

  function hostMessage(msg, conn) {
    const S = App.S;
    if (msg.type === 'hello') {
      const id = String(msg.clientId || '').slice(0, 40);
      if (!id) return;
      Net.register(conn, id);
      const p = P(id);
      if (p) {
        p.connected = true;
        if (S.phase === 'lobby' && msg.name) p.name = String(msg.name).trim().slice(0, 16) || p.name;
      } else if (S.phase === 'lobby') {
        const err = E.addPlayer(S, id, msg.name);
        if (err) conn.send({ type: 'error', msg: err });
      } else {
        conn.send({ type: 'error', msg: 'Das Spiel läuft schon. Du kannst zuschauen.' });
      }
      commit();
      if (conn.open) conn.send({ type: 'state', S: App.S });
    } else if (msg.type === 'react') {
      if (!conn.clientId || !REACTIONS.includes(msg.r)) return;
      const now = Date.now();
      if (now - (reactLimit.get(conn.clientId) || 0) < 700) return;
      reactLimit.set(conn.clientId, now);
      sendReaction(conn.clientId, msg.r);
    } else if (msg.type === 'chat') {
      const text = String(msg.text || '').trim().slice(0, 80);
      if (!conn.clientId || !text) return;
      const now = Date.now();
      if (now - (reactLimit.get(conn.clientId) || 0) < 700) return;
      reactLimit.set(conn.clientId, now);
      sendChat(conn.clientId, text);
    } else if (msg.type === 'act') {
      if (!conn.clientId) return;
      const err = (S.phase === 'lobby' ? E : ENG()).act(S, conn.clientId, msg.action || {});
      if (err) conn.send({ type: 'error', msg: err }); else commit();
    }
  }

  function renderNet() {
    const chip = $('#net-chip');
    if (App.mode === 'local') { chip.hidden = true; return; }
    chip.hidden = false;
    const labels = { online: 'Online', reconnecting: 'Verbinde neu …', lost: 'Verbindung weg – versuche neu', noroom: 'Raum nicht gefunden', error: 'Verbindungsproblem', off: 'Verbinde …' };
    chip.textContent = labels[App.conn] || 'Verbinde …';
    chip.classList.toggle('is-online', App.conn === 'online');
    chip.classList.toggle('is-bad', ['lost', 'noroom', 'error'].includes(App.conn));
  }

  // ---------- Startseite ----------
  const params = new URLSearchParams(location.search);
  const nameIn = $('#in-name'), codeIn = $('#in-code');
  nameIn.value = store.get('duli-name') || '';
  if (params.get('raum')) codeIn.value = params.get('raum').toUpperCase().slice(0, 4);
  codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

  function needName() {
    const n = nameIn.value.trim();
    if (!n) { toast('Gib zuerst deinen Namen ein.'); nameIn.focus(); return null; }
    store.set('duli-name', n);
    return n;
  }

  function startHost(code, S, attempt = 0) {
    App.mode = 'host'; App.S = S; App.code = code; App.conn = 'off';
    Net.host(code, (err, okCode) => {
      if (!err) { save(); return enterRoom(); }
      if (err === 'taken' && S.phase === 'lobby' && S.players.length <= 1) return startHost(Net.randomCode(), S, attempt);
      if (err === 'taken' && attempt < 6) { toast('Raum wird wiederhergestellt …'); return setTimeout(() => startHost(code, S, attempt + 1), 4000); }
      toast('Online-Dienst nicht erreichbar. Prüf dein Internet und versuch es nochmal.');
      Net.leave(); App.mode = null;
      show('screen-home');
    });
    show('screen-lobby');
    renderLobby();
  }

  $('#btn-create').onclick = () => {
    const name = needName();
    if (!name) return;
    const S = E.newGame();
    E.addPlayer(S, myId, name);
    if (App.prefMode) E.setSettings(S, { mode: App.prefMode });
    startHost(Net.randomCode(), S);
  };

  function joinRoom(code, name) {
    App.mode = 'client'; App.code = code; App.name = name; App.S = null; App.conn = 'off';
    Net.join(code, () => ({ type: 'hello', clientId: myId, name: App.name }));
    store.set('duli-client', { code, name });
    show('screen-lobby');
    renderLobby();
  }
  $('#btn-join').onclick = () => {
    const name = needName();
    if (!name) return;
    const code = codeIn.value.trim().toUpperCase();
    if (code.length !== 4) { toast('Der Raum-Code hat 4 Zeichen.'); codeIn.focus(); return; }
    joinRoom(code, name);
  };
  codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').click(); });

  $('#btn-local').onclick = () => {
    App.mode = 'local'; App.code = null; App.S = E.newGame(); App.localSel = null;
    if (App.prefMode) E.setSettings(App.S, { mode: App.prefMode });
    show('screen-lobby');
    renderLobby();
    $('#in-local-name').focus();
  };

  const saved = store.get('duli-save');
  if (saved && saved.S && saved.S.phase !== 'over') {
    const b = $('#btn-resume');
    b.hidden = false;
    b.textContent = saved.mode === 'host' ? `Raum ${saved.code} fortsetzen (du bist Host)` : 'Lokales Spiel fortsetzen';
    b.onclick = () => {
      if (saved.mode === 'host') {
        saved.S.players.forEach((p) => { p.connected = p.id === myId; });
        startHost(saved.code, saved.S);
      } else {
        App.mode = 'local'; App.S = saved.S; App.code = null;
        enterRoom();
      }
    };
  }
  const savedClient = store.get('duli-client');
  if (savedClient && params.get('raum') && savedClient.code === params.get('raum').toUpperCase() && savedClient.name) {
    nameIn.value = savedClient.name;
    joinRoom(savedClient.code, savedClient.name);
  }

  // ---------- Profil: XP, Level, Titel (bleibt auf diesem Gerät) ----------
  const TITLES = [[1, 'Praktikant'], [3, 'Junior-Designer'], [6, 'Designer'], [10, 'Senior-Designer'], [15, 'Art Director'], [21, 'Creative Lead'], [28, 'Studio-Chef'], [36, 'Dulidan-Legende']];
  const prof = () => Object.assign({ xp: 0, games: 0, wins: 0, token: 'april' }, store.get('duli-profile') || {});
  const lvlOf = (xp) => Math.floor(Math.sqrt(xp / 40)) + 1;
  const xpFor = (L) => 40 * (L - 1) * (L - 1);
  const titleOf = (L) => TITLES.filter(([m]) => L >= m).pop()[1];
  function profileHTML() {
    const p = prof(), L = lvlOf(p.xp), a = xpFor(L), b = xpFor(L + 1);
    const pct = Math.round(((p.xp - a) / (b - a)) * 100);
    return `<div class="profile">${tokHTML(p.token, '#c020b8')}<div><strong>Level ${L} · ${titleOf(L)}</strong>
      <div class="pf-bar"><i style="width:${pct}%"></i></div><small>${p.xp} XP · ${p.wins} ${p.wins === 1 ? 'Sieg' : 'Siege'} · ${p.games} Spiele</small></div></div>`;
  }
  function gainXP(amount, won) {
    const p = prof(), before = lvlOf(p.xp);
    p.xp += amount; p.games += 1; if (won) p.wins += 1;
    store.set('duli-profile', p);
    return { amount, level: lvlOf(p.xp), title: titleOf(lvlOf(p.xp)), up: lvlOf(p.xp) > before };
  }

  // ---------- Spielhalle: Spiele ohne Monopoly ----------
  const ARC = window.DULI_ARCADE;
  let arcCleanup = null;
  function buildArcadeHome() {
    $('#arc-grid').innerHTML = ARC.GAMES.map((g, i) => {
      const b = g.best();
      return `<button type="button" class="mode-card spot arc-card" data-arc="${g.id}"><span class="mc-n">G/${String(i + 1).padStart(2, '0')}</span><span class="mc-ic">${g.icon}</span>
        <strong>${g.name}</strong><small>${g.text}</small><span class="mc-tags">${g.tags.map((t) => `<i>${t}</i>`).join('')}${b ? `<i class="hot">🏆 ${esc(b)}</i>` : ''}</span></button>`;
    }).join('');
  }
  function openArcade(id) {
    const g = ARC.GAMES.find((x) => x.id === id);
    if (!g) return;
    if (arcCleanup) arcCleanup();
    show('screen-arcade');
    $('#arc-title').innerHTML = `${g.icon} ${g.name}`;
    const best = () => { const b = g.best(); $('#arc-best').textContent = b ? `🏆 ${b}` : 'Noch kein Rekord'; };
    best();
    const stage = $('#arc-stage');
    stage.innerHTML = '';
    arcCleanup = g.run(stage, {
      name: () => (nameIn.value.trim() || store.get('duli-name') || 'Du').slice(0, 16),
      say: (t) => aprilSay(t),
      xp: (n) => { if (n <= 0) return; const r = gainXP(n, false); toast(`+${n} XP${r.up ? ` · Level ${r.level}: ${r.title}!` : ''}`); },
      best,
    });
  }
  $('#arc-grid').addEventListener('click', (e) => { const c = e.target.closest('[data-arc]'); if (c) openArcade(c.dataset.arc); });
  $('#arc-back').onclick = () => {
    if (arcCleanup) arcCleanup();
    arcCleanup = null;
    show('screen-home');
    buildHome();
    $('#arcade').scrollIntoView();
  };

  // ---------- Kampagne „Aprils Story“ ----------
  const campDone = () => store.get('duli-camp') || {};
  function buildCampaign() {
    const done = campDone(), modes = modeList();
    let open = true, total = 0;
    $('#camp-grid').innerHTML = CAMP.LEVELS.map((lv, i) => {
      const st = done[lv.id] || 0, isOpen = open, m = modes.find((x) => x.id === lv.mode);
      total += st; open = open && st > 0;
      const v = lv.variant && VARIANTS.find((x) => x.id === lv.variant);
      return `<button type="button" class="camp-card spot ${isOpen ? '' : 'is-locked'} ${st ? 'is-done' : ''}" data-level="${lv.id}" ${isOpen ? '' : 'disabled'}>
        <span class="mc-n">L/${String(i + 1).padStart(2, '0')}</span><span class="mc-ic">${isOpen ? m.icon : '🔒'}</span>
        <strong>${esc(lv.title)}</strong><small>${isOpen ? esc(lv.story) : 'Hol im Level davor mindestens einen Stern.'}</small>
        <span class="camp-stars">${'★'.repeat(st)}<i>${'☆'.repeat(3 - st)}</i></span>
        <span class="mc-tags"><i>${esc(m.name.replace('DULIDAN ', ''))}</i>${lv.size ? `<i>${lv.size.toUpperCase()}</i>` : ''}${v ? `<i>${v.name}</i>` : ''}<i>${lv.bots} ${lv.bots === 1 ? 'Bot' : 'Bots'}</i></span></button>`;
    }).join('');
    const tok = prof().token;
    $('#camp-top').innerHTML = `<div class="camp-progress"><strong>⭐ ${total} / ${CAMP.LEVELS.length * 3}</strong><span>Sterne gesammelt</span></div>
      <div class="camp-tok"><span>Deine Figur:</span>${Object.keys(TOKENS).map((k) => `<button type="button" class="tok-pick ${k === tok ? 'is-on' : ''}" data-pf-token="${k}" title="${esc(TOKENS[k].name)}">${tokHTML(k, k === tok ? '#ff7ae6' : 'var(--line)')}</button>`).join('')}</div>`;
  }
  function resetView() {
    App.disp = {}; App.wdisp = {}; App.czSeq = null; App.castKey = null; App.qrInit = false;
    App.lastClassicRoll = null; App.lastMoveId = null; App.prevMoney = null; App.busyUntil = 0;
  }
  function startLevel(id) {
    const lv = CAMP.LEVELS.find((x) => x.id === id);
    if (!lv) return;
    const name = (nameIn.value.trim() || store.get('duli-name') || 'Du').slice(0, 16);
    const S = E.newGame();
    E.addPlayer(S, 'me', name);
    S.players[0].token = prof().token;
    for (let i = 0; i < lv.bots; i++) E.addBot(S);
    E.setSettings(S, { mode: lv.mode, variant: lv.variant || 'normal', size: lv.size || 'normal' });
    (lv.rules || []).forEach((r) => E.setSettings(S, { rule: r, on: true }));
    S.campaign = lv.id;
    const err = startByMode(S);
    if (err) return toast(err);
    closeModal();
    App.mode = 'local'; App.code = null; App.localSel = null;
    resetView();
    App.S = S;
    commit();
    enterRoom();
    setTimeout(() => aprilSay(lv.story, 8000), 600);
  }
  $('#camp-grid').addEventListener('click', (e) => {
    const c = e.target.closest('[data-level]');
    if (c && !c.disabled) startLevel(c.dataset.level);
  });
  $('#camp-top').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pf-token]');
    if (!b) return;
    const p = prof(); p.token = b.dataset.pfToken; store.set('duli-profile', p);
    FX.play('pop');
    buildHome();
  });
  // Sterne am Ende eines Kampagnen-Levels
  function campResult(save) {
    const S = App.S;
    const lv = S.campaign && CAMP.LEVELS.find((x) => x.id === S.campaign);
    const me = S.players.find((p) => !p.bot);
    if (!lv || !me) return null;
    const ctx = {
      S, me, won: S.winner === me.id, rounds: S.round || 1,
      props: S.props ? Object.values(S.props).filter((st) => st.owner === me.id) : [],
      cities: S.cities ? Object.values(S.cities).filter((st) => st.owner === me.id) : [],
      zones: isWorld() ? W.completeZones(S, me.id).length : 0,
      ownsHQ: !!S.props && Object.keys(S.props).some((k) => SPACES[k] && SPACES[k].name === 'DULIDAN HQ' && S.props[k].owner === me.id),
    };
    const res = lv.stars.map(([, f]) => { try { return !!f(ctx); } catch (e) { return false; } });
    const count = res.filter(Boolean).length;
    const done = campDone();
    if (save && count > (done[lv.id] || 0)) { done[lv.id] = count; store.set('duli-camp', done); }
    const idx = CAMP.LEVELS.indexOf(lv);
    return { lv, idx, res, count, next: CAMP.LEVELS[idx + 1] || null };
  }
  function campEndHTML(c) {
    return `<div class="camp-end"><p class="sec-label"><span class="n">L/${String(c.idx + 1).padStart(2, '0')}</span>${esc(c.lv.title)}</p>
      <h3>${c.count ? 'Level geschafft!' : 'Leider verloren'}</h3>
      <div class="stars-big">${'★'.repeat(c.count)}<i>${'☆'.repeat(3 - c.count)}</i></div>
      <ul class="camp-goals">${c.lv.stars.map(([t], i) => `<li class="${c.res[i] ? 'ok' : ''}">${c.res[i] ? '★' : '☆'} ${esc(t)}</li>`).join('')}</ul>
      <div class="btn-row">${uiBtn('↻ Nochmal', 'campRetry')}${c.next && c.count ? uiBtn('Nächstes Level →', 'campNext', 'btn-primary') : ''}${uiBtn('Zur Startseite', 'leave', 'btn-ghost')}</div></div>`;
  }
  // Belohnungen am Spielende: Erfolge, Kampagnen-Sterne, XP (pro Spiel nur einmal)
  function gameOverRewards() {
    const S = App.S;
    const gid = `${S.players.map((p) => p.id).join('|')}:${S.turnNo}:${S.logSeq}`;
    const mine = App.mode === 'local' ? S.players.filter((p) => !p.bot) : S.players.filter((p) => p.id === myId);
    if (store.get('duli-lastgame') === gid || !mine.length) return { fresh: [], xp: null, camp: campResult(false) };
    store.set('duli-lastgame', gid);
    const fresh = checkAchievements();
    const camp = campResult(true);
    const won = mine.some((p) => p.id === S.winner);
    const xp = gainXP(40 + (won ? 120 : 0) + fresh.length * 30 + (camp ? camp.count * 25 : 0) + S.players.filter((p) => p.bot).length * 5, won);
    return { fresh, xp, camp };
  }

  // ---------- Brett-Skins (nur auf diesem Gerät) ----------
  const SKINS = [['neon', 'Neon', '💜'], ['retro', 'Retro-Papier', '📜'], ['gold', 'Gold', '🏆'], ['matrix', 'Matrix', '🟩'], ['pastell', 'Pastell', '🌸']];
  function setSkin(k) {
    if (!SKINS.some(([id]) => id === k)) k = 'neon';
    document.documentElement.dataset.skin = k;
    store.set('duli-skin', k);
  }
  setSkin(store.get('duli-skin'));
  const skinPickerHTML = () => `<div class="skin-row">${SKINS.map(([id, n, ic]) => `<button type="button" class="skin-btn ${document.documentElement.dataset.skin === id ? 'is-on' : ''}" data-ui="skin" data-skin="${id}"><span class="sk-prev sk-${id}"></span>${ic} ${n}</button>`).join('')}</div>`;

  // ---------- Brett-Editor ----------
  const EDIT_TYPES = ['prop', 'rail', 'util', 'tax'];
  const myBoard = () => Object.assign({ name: 'Mein Brett', names: {} }, store.get('duli-board') || {});
  function editorHTML(b = myBoard()) {
    const base = D.BOARDS.normal.SPACES;
    const rows = base.map((sp, i) => (EDIT_TYPES.includes(sp.type) ? `<label class="ed-row"><i style="--g:${sp.group ? GROUPS[sp.group].color : sp.type === 'tax' ? '#ff3348' : '#cfc3e6'}"></i>
      <span class="ed-orig">${esc(sp.name)}</span><input data-ed="${i}" maxlength="26" value="${esc(b.names[i] || '')}" placeholder="${esc(sp.name)}"></label>` : '')).join('');
    return `<h2>🛠️ Brett-Editor</h2>
      <p class="action-note">Gib den Feldern vom klassischen Brett eigene Namen. Leer lassen heißt Originalname. In der Lobby wählst du dein Brett unter „Feinschliff“ aus. Online sehen alle deine Namen.</p>
      <label class="field"><span>Name deines Bretts</span><input id="ed-name" maxlength="24" value="${esc(b.name)}"></label>
      <div class="ed-grid">${rows}</div>
      <div class="btn-row ed-actions">${uiBtn('💾 Speichern', 'edSave', 'btn-primary')}${uiBtn('📋 Code kopieren', 'edCopy')}${uiBtn('Alles leeren', 'edReset', 'btn-ghost')}</div>
      <div class="join-row"><label class="field"><span>Brett-Code von jemand anderem</span><input id="ed-code" placeholder="DULI-…"></label>${uiBtn('Laden', 'edLoad')}</div>`;
  }
  function editorCollect() {
    const names = {};
    document.querySelectorAll('[data-ed]').forEach((inp) => { const v = inp.value.trim(); if (v) names[inp.dataset.ed] = v.slice(0, 26); });
    return { name: (($('#ed-name') && $('#ed-name').value.trim()) || 'Mein Brett').slice(0, 24), names };
  }
  const boardCode = (b) => 'DULI-' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: b.name, s: b.names }))));
  function applyBoardToLobby(b) {
    const S = App.S;
    if (!S || S.phase !== 'lobby' || App.mode === 'client') return;
    if (S.settings.names && Object.keys(S.settings.names).length) { E.setSettings(S, { names: b.names, boardName: b.name }); commit(); }
  }

  // ---------- Startseite: Laufband, Modi, Features ----------
  const FEATS = [
    ['💖', 'Aprils Laune', 'April mag jede Person anders. Bestich sie – oder sie reißt dir ein Haus ab.'],
    ['🎙️', 'Live-Kommentar', 'April kommentiert große Momente wie im Fußball. Laut, unfair, ehrlich.'],
    ['🧩', '17 Hausregeln', 'Pasch-Prämie, Mietwahnsinn, Robin Hood, Geheimes Konto … einfach anklicken.'],
    ['🎰', 'Casino-Minispiele', 'Münzwurf bis Slotmaschine, Blackjack gegen die Bank. Korruption inklusive.'],
    ['🌍', 'MEGA-Weltreise', '120 Felder von Sofia bis New York – und ganz am Ende das DULIDAN HQ.'],
    ['📈', 'Geldverlauf & Erfolge', 'Am Ende siehst du, wer wann abgestürzt ist. Erfolge bleiben gespeichert.'],
  ];
  function buildHome() {
    const modes = modeList();
    const names = modes.map((m) => `<span>${esc(m.name.replace('DULIDAN ', ''))}</span>`).join('');
    $('#marquee').innerHTML = names + names;
    $('#home-modes').innerHTML = modes.map((m, i) => modeCardHTML(m, i, m.id === App.prefMode)).join('');
    $('#home-feats').innerHTML = FEATS.map(([ic, t, d], i) => `<article class="feat spot"><span class="mc-n">F/${String(i + 1).padStart(2, '0')}</span><span class="mc-ic">${ic}</span><strong>${t}</strong><small>${d}</small></article>`).join('');
    $('#home-profile').innerHTML = profileHTML();
    buildCampaign();
    buildArcadeHome();
    const pick = $('#home-pick');
    const m = modes.find((x) => x.id === App.prefMode);
    pick.hidden = !m;
    if (m) pick.innerHTML = `Modus: <strong>${m.icon} ${esc(m.name)}</strong> <button type="button" class="link-btn" id="home-pick-x">ändern</button>`;
  }
  App.prefMode = store.get('duli-mode');
  $('#home-modes').addEventListener('click', (e) => {
    const c = e.target.closest('[data-mode]');
    if (!c) return;
    App.prefMode = c.dataset.mode;
    store.set('duli-mode', App.prefMode);
    buildHome();
    FX.play('pop');
    $('.hero2').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => nameIn.focus(), 450);
  });
  $('#home-pick').addEventListener('click', (e) => {
    if (e.target.id !== 'home-pick-x') return;
    $('#home-modes').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  // Spotlight-Effekt auf Karten wie auf dulidan-studios.com
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.spot');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  // ---------- Lobby ----------
  function enterRoom() {
    if (App.S && App.S.phase !== 'lobby') { show('screen-game'); buildBoard(); }
    else show('screen-lobby');
    render();
    scheduleBots();
  }

  $('#btn-copy').onclick = copyLink;
  $('#btn-leave').onclick = leaveRoom;
  function leaveRoom() {
    Net.leave();
    if (App.mode === 'client') store.del('duli-client');
    App.mode = null; App.S = null;
    history.replaceState(null, '', location.pathname);
    location.reload();
  }

  $('#btn-local-add').onclick = () => {
    const n = $('#in-local-name').value.trim();
    if (!n) return toast('Name fehlt.');
    const id = 'p' + Math.random().toString(36).slice(2, 8);
    const err = E.addPlayer(App.S, id, n);
    if (err) return toast(err);
    App.localSel = id;
    $('#in-local-name').value = '';
    render();
  };
  $('#in-local-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-local-add').click(); });

  $('#btn-add-bot').onclick = () => {
    const err = E.addBot(App.S);
    if (err) return toast(err);
    commit();
  };
  $('#settings').addEventListener('change', (e) => {
    if (e.target.id === 'set-skin') { setSkin(e.target.value); return toast('Brett-Skin gewechselt.'); }
    if (App.mode === 'client' || !App.S) return;
    const t = e.target;
    const o = {};
    if (t.id === 'set-board') { const b = myBoard(); Object.assign(o, t.value === 'custom' ? { names: b.names, boardName: b.name } : { names: {} }); }
    if (t.id === 'set-money') o.startMoney = Number(t.value);
    if (t.id === 'set-pot') o.pot = t.checked;
    if (t.id === 'set-go') o.goDouble = t.checked;
    if (t.id === 'set-mode') o.mode = t.value;
    if (t.id === 'set-rounds') o.maxRounds = Number(t.value);
    if (t.id === 'set-mood') o.mood = t.checked;
    if (t.id === 'set-size') o.size = t.value;
    if (t.id === 'set-years') o.years = Number(t.value);
    E.setSettings(App.S, o);
    commit();
  });

  $('#btn-start').onclick = () => {
    const err = startByMode(App.S);
    if (err) return toast(err);
    commit();
    enterRoom();
  };

  const VARIANTS = RL.VARIANTS;
  const varIcon = (v) => (v.icon === 'april' ? aprilIcon('v-april') : v.icon);
  const MODE_TAGS = { classic: ['Brett', '3 Größen'], casino: ['Brett', '8 Minispiele'], world: ['Weltkarte', 'Jetset'], royale: ['Ringe', 'Sturm'], metro: ['U-Bahn', 'Fahrpreis'], tower: ['Etagen', 'Aufzüge'], islands: ['Inseln', 'Flut'], festival: ['Rundgang', 'Headliner'], race: ['Rennen', 'Kein Kaufen', 'NEU'], throne: ['König', 'Tribut', 'NEU'], quiz: ['40 Fragen', 'Joker'], bomb: ['Heiße Kartoffel'], realistic: ['Quartale', 'Steuern', 'NEU'], logistics: ['Schienen', 'Netze', 'NEU'], war: ['Truppen', 'Eroberung', 'NEU'], politics: ['Wahlen', 'Gesetze', 'NEU'] };
  function modeList() {
    return [
      { id: 'classic', icon: '🎲', name: 'Klassisch', text: 'Das Brett mit Duisburg und Öhringen. Als MINI, Normal oder MEGA-Weltreise.' },
      { id: 'casino', icon: '🎰', name: 'DULIDAN CASINO', text: 'Jede Straße ist ein Casino. Wer bei dir landet, zockt gegen deine Bank.' },
      ...W.MODES.map((id) => { const b = W.board(id); return { id, icon: b.icon || '🌍', name: b.title, text: b.tagline }; }),
      { id: 'war', icon: '🪖', name: 'WAR', text: 'Straßen sind Gebiete. Zahl Tribut oder greif mit deinen Truppen an und erobere sie.' },
      { id: 'politics', icon: '🏛️', name: 'POLITICS', text: 'Alle 5 Runden Bundestagswahl. Wer regiert, macht Gesetze. Drei Wahlsiege und das Spiel ist vorbei.' },
      { id: 'logistics', icon: '🚆', name: 'LOGISTICS', text: 'Nur Bahnhöfe, Flughäfen und Häfen. Leg teure Schienen: Je größer dein Netz, desto höher die Miete.' },
      { id: 'realistic', icon: '🏢', name: 'REALISTIC', text: 'Echte Immobilien: Quartale, Kredite, SCHUFA, Mieter, Hotels, Steuererklärung und Anwälte.' },
    ].map((m) => Object.assign(m, { tags: MODE_TAGS[m.id] || [] }));
  }
  function modeCardHTML(m, i, on, attrs = '') {
    return `<button type="button" class="mode-card spot ${on ? 'is-on' : ''}" data-mode="${m.id}" ${attrs}>
      <span class="mc-n">M/${String(i + 1).padStart(2, '0')}</span><span class="mc-ic">${m.icon}</span>
      <strong>${esc(m.name)}</strong><small>${esc(m.text)}</small>
      <span class="mc-tags">${m.tags.map((t) => `<i class="${t === 'NEU' ? 'hot' : ''}">${t}</i>`).join('')}</span></button>`;
  }
  function endText(b) {
    if (b.RULES.race) return `Wer zuerst ${b.RULES.race.laps} Runden fährt, gewinnt. Startgeld fest Ð${b.RULES.fixedMoney}.`;
    if (b.id === 'royale') return 'Kein Runden-Limit: Es gewinnt, wer zuletzt noch nicht pleite ist. Der April-Sturm sorgt dafür.';
    return `Kein Runden-Limit: Es gewinnt, wer zuletzt noch nicht pleite ist.${b.RULES.crisis ? ` Ab Runde ${b.RULES.crisis.from} steigen alle Mieten jede Runde (Krise).` : ''}`;
  }
  function ruleCards(st, world) {
    const rules = st.rules || {};
    const extra = world ? [] : [
      { id: 'pot', setting: 'pot', icon: '🐷', name: 'Aprils Spardose', text: 'Steuern und Strafen sammeln sich auf „Aprils Pause“.', on: st.pot !== false },
      { id: 'goDouble', setting: 'goDouble', icon: '💸', name: 'Doppelt auf LOS', text: 'Wer genau auf LOS landet, bekommt das Gehalt doppelt.', on: !!st.goDouble },
    ];
    return extra.concat(RL.RULES.filter((r) => !r.only || !world).map((r) => Object.assign({}, r, { on: !!rules[r.id] })));
  }
  $('#settings').addEventListener('click', (e) => {
    if (App.mode === 'client' || !App.S || App.S.phase !== 'lobby') return;
    const m = e.target.closest('[data-mode]');
    if (m) { E.setSettings(App.S, { mode: m.dataset.mode }); return commit(); }
    const r = e.target.closest('[data-rule]');
    if (r) {
      const on = !r.classList.contains('is-on');
      E.setSettings(App.S, r.dataset.setting ? { [r.dataset.setting]: on } : { rule: r.dataset.rule, on });
      return commit();
    }
    const b = e.target.closest('.variant');
    if (!b) return;
    E.setSettings(App.S, { variant: b.dataset.variant });
    const v = VARIANTS.find((x) => x.id === b.dataset.variant);
    if (v) aprilSay({ normal: 'Klassisch. Solide Wahl. Langweilig, aber solide.', blitz: 'Blitz! Alles verteilt, keine Gnade.', million: 'Millionär! Ich zähl mit. Ð5.000 und Schluss.', chaos: 'April-Chaos?! Endlich darf ich mal richtig. Hehe.', hardcore: 'Hardcore. Ð800. Ich hoffe, ihr könnt rechnen.', speed: 'Turbo! Drei Würfel, null Geduld.', tycoon: 'Baulöwe. Ich riech schon den Beton.', rich: 'Neureich! Viel Geld, noch mehr Miete.', sudden: 'Sudden Death. Am Ende bleibt nur einer. Oder keiner.', swap: 'Konto-Roulette! Heute reich, morgen pleite. Herrlich.' }[v.id]);
    commit();
  });

  function startByMode(S) {
    if (S.settings && S.settings.mode === 'realistic') return R.start(S);
    return S.settings && W.MODES.includes(S.settings.mode) ? W.start(S) : E.startGame(S);
  }

  function renderLobby() {
    const S = App.S, local = App.mode === 'local';
    $('#lobby-code').textContent = local ? 'Ein Gerät' : (App.code || '----');
    $('#lobby-eyebrow').textContent = local ? 'Lokales Spiel' : 'Raum-Code';
    $('#btn-copy').hidden = local;
    $('#local-add').hidden = !local;
    $('#lobby-hint').textContent = local
      ? 'Füge alle Spieler hinzu. Tippe einen Spieler an und wähle dann seine Figur.'
      : App.mode === 'host'
        ? 'Schick deinen Freunden den Link oder den Code. Lass diese Seite offen, solange ihr spielt – dein Gerät ist der Host.'
        : (S ? 'Wähle deine Figur. Der Host startet das Spiel.' : 'Verbinde mit dem Raum …');
    const startBtn = $('#btn-start');
    startBtn.hidden = App.mode === 'client';
    $('#token-title').textContent = local
      ? (App.localSel && P(App.localSel) ? `Figur für ${P(App.localSel).name}` : 'Figuren')
      : 'Wähle deine Figur';
    if (!S) { $('#lobby-players').innerHTML = ''; $('#token-grid').innerHTML = ''; return; }
    startBtn.disabled = S.players.length < 2 || S.players.some((p) => !p.token);
    $('#lobby-tools').hidden = App.mode === 'client';
    const st = S.settings || { startMoney: 1500, pot: true, goDouble: false };
    const ro = App.mode === 'client' ? 'disabled' : '';
    const mode = st.mode || 'classic';
    const world = W.MODES.includes(mode);
    const curVar = st.variant || 'normal';
    const real = mode === 'realistic';
    ['#lbl-variant', '#variant-box', '#lbl-rules', '#rule-grid'].forEach((sel) => { $(sel).hidden = real; });
    $('#mode-grid').innerHTML = modeList().map((m, i) => modeCardHTML(m, i, m.id === mode, ro)).join('');
    const vText = (v) => (world && v.boardText ? v.boardText : v.text);
    const cv = VARIANTS.find((v) => v.id === curVar) || VARIANTS[0];
    $('#variant-box').innerHTML = `<p class="pick-note">${varIcon(cv)} <strong>${cv.name}:</strong> ${esc(vText(cv))}</p>
      <div class="variant-grid">${VARIANTS.map((v) => `<button type="button" class="variant ${v.id === curVar ? 'is-on' : ''}" data-variant="${v.id}" ${ro}><span class="v-ic">${varIcon(v)}</span><strong>${v.name}</strong><small>${esc(vText(v))}</small></button>`).join('')}</div>`;
    const rules = ruleCards(st, world);
    $('#rule-grid').innerHTML = rules.map((r) => `<button type="button" class="rule-card ${r.on ? 'is-on' : ''}" data-rule="${r.id}" ${r.setting ? `data-setting="${r.setting}"` : ''} aria-pressed="${r.on}" ${ro}>
      <span class="rc-ic">${r.icon}</span><strong>${r.name}</strong><small>${esc(r.text)}</small><i class="rc-check" aria-hidden="true"></i></button>`).join('');
    $('#rule-count').textContent = `${rules.filter((r) => r.on).length} aktiv`;
    const yrs = [3, 5, 10, 0].includes(st.years) ? st.years : 5;
    $('#fine-settings').innerHTML = `
      ${real ? `<label class="row"><span>Spieldauer<small>Eine Runde ist ein Quartal. Am Ende gewinnt das höchste Nettovermögen. Alle starten mit Ð250.000 und einem Job.</small></span>
        <select id="set-years" ${ro}>${[[3, '3 Jahre (12 Quartale)'], [5, '5 Jahre (20 Quartale)'], [10, '10 Jahre (40 Quartale)'], [0, 'Bis zur Insolvenz']].map(([v, l]) => `<option value="${v}" ${yrs === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : `<label class="row"><span>Startgeld<small>Mit wie viel Dulis alle starten</small></span>
        <select id="set-money" ${ro}>${[1000, 1500, 2000, 3000].map((m) => `<option value="${m}" ${st.startMoney === m ? 'selected' : ''}>${M(m)}</option>`).join('')}</select></label>`}
      ${!world && !real && !['casino', 'logistics', 'war', 'politics'].includes(mode) ? `<label class="row"><span>Brettgröße<small>${{ mega: 'MEGA: einmal um die Welt mit 120 Feldern – Weltstädte, dazu Duisburg, Öhringen und DULIDAN. Doppelte Schritte, 1,5× Startgeld', mini: 'MINI: 24 Felder, nur die wichtigsten Straßen. Schnelle Runde, weniger Startgeld' }[st.size] || 'Normal: 40 Felder'}</small></span>
        <select id="set-size" ${ro}>${[['mini', '⚡ MINI (24 Felder)'], ['normal', 'Normal (40 Felder)'], ['mega', '🚀 MEGA (120 Felder)']].map(([v, l]) => `<option value="${v}" ${(st.size || 'normal') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      ${!world && !real && !['logistics'].includes(mode) && (st.size || 'normal') === 'normal' ? `<label class="row"><span>🛠️ Straßennamen<small>${st.names && Object.keys(st.names).length ? `Eigenes Brett „${esc(st.boardName || 'Eigenes Brett')}“ mit ${Object.keys(st.names).length} neuen Namen` : 'Originalnamen. Eigene Namen baust du im Brett-Editor.'}</small></span>
        <span class="row-ctl"><select id="set-board" ${ro}><option value="orig">Original</option>${(st.names && Object.keys(st.names).length) || Object.keys(myBoard().names).length ? `<option value="custom" ${st.names && Object.keys(st.names).length ? 'selected' : ''}>🛠️ ${esc(st.names && Object.keys(st.names).length ? st.boardName || 'Eigenes Brett' : myBoard().name)}</option>` : ''}</select>
        ${ro ? '' : uiBtn('Editor', 'editor', 'btn-small btn-ghost')}</span></label>` : ''}
      <label class="row"><span>🎨 Brett-Skin<small>Nur auf deinem Gerät</small></span>
        <select id="set-skin">${SKINS.map(([id, n, ic]) => `<option value="${id}" ${document.documentElement.dataset.skin === id ? 'selected' : ''}>${ic} ${n}</option>`).join('')}</select></label>
      ${real ? '' : `<label class="row"><span>💖 Aprils Laune<small>April mag jede Person anders, lässt sich bestechen, macht Geschenke – und rächt sich, wenn sie dich hasst</small></span>
        <input type="checkbox" class="switch" id="set-mood" ${st.mood !== false ? 'checked' : ''} ${ro}></label>`}
      ${world ? `<p class="row"><span>Spielende<small>${endText(W.board(mode))}</small></span></p>` : ''}`;

    $('#lobby-players').innerHTML = S.players.map((p, i) => `
      <li class="${(local ? p.id === App.localSel : p.id === myId) ? 'is-me' : ''}" ${local ? `data-sel="${esc(p.id)}"` : ''}>
        ${tokHTML(p.token, D.PLAYER_COLORS[i % 6])}
        <div class="who"><strong>${esc(p.name)}${p.id === myId && !local ? ' (du)' : ''} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</strong>
        <small>${p.token ? esc(TOKENS[p.token].name) : 'wählt noch …'}${i === 0 && !local ? ' · Host' : ''}</small></div>
        ${local || (App.mode === 'host' && p.bot) ? `<button class="btn btn-small btn-ghost" data-rm="${esc(p.id)}">Entfernen</button>` : ''}
      </li>`).join('') || '<li><div class="who"><small>Noch niemand da.</small></div></li>';

    const chooser = local ? App.localSel : myId;
    $('#token-grid').innerHTML = Object.entries(TOKENS).map(([k, t]) => {
      const holder = S.players.find((p) => p.token === k);
      const mine = holder && holder.id === chooser;
      const taken = holder && !mine;
      return `<button class="token-card ${mine ? 'is-picked' : ''} ${taken ? 'is-taken' : ''}" data-token="${k}" ${taken ? 'disabled' : ''}>
        ${tokHTML(k, mine ? 'var(--magenta)' : 'var(--line)')}
        <strong>${esc(t.name)}</strong>
        ${taken ? `<span class="taken-by">${esc(holder.name)}</span>` : '<span></span>'}
        <small>${esc(real ? 'Keine Superkraft. Ist ja realistisch.' : world ? W.board(st.mode).POWERS[k] : t.power)}</small></button>`;
    }).join('');
  }

  document.addEventListener('click', (e) => {
    const tokBtn = e.target.closest('[data-token]');
    if (tokBtn && App.S && App.S.phase === 'lobby') {
      const token = tokBtn.dataset.token;
      if (App.mode === 'local') {
        if (!App.localSel) return toast('Tippe zuerst einen Spieler an.');
        const err = E.pickToken(App.S, App.localSel, token);
        if (err) return toast(err);
        const next = App.S.players.find((p) => !p.token && !p.bot);
        if (next) App.localSel = next.id;
        return commit();
      }
      return doAct({ type: 'pickToken', token }, myId);
    }
    const sel = e.target.closest('[data-sel]');
    const rm = e.target.closest('[data-rm]');
    if (rm && App.mode !== 'client') {
      E.removePlayer(App.S, rm.dataset.rm);
      return commit();
    }
    if (sel && App.mode === 'local') { App.localSel = sel.dataset.sel; return render(); }

    const act = e.target.closest('[data-act]');
    if (act) {
      const a = JSON.parse(act.dataset.act);
      if (act.closest('#modal') && !act.dataset.keep) closeModal();
      if (a.type === 'bidCustom') {
        const v = Number($('#in-bid').value);
        return doAct({ type: 'bid', amt: v }, act.dataset.pid);
      }
      return doAct(a, act.dataset.pid);
    }
    const ui = e.target.closest('[data-ui]');
    if (ui) return uiAction(ui.dataset.ui, ui.dataset);
    const cell = e.target.closest('.cell');
    if (cell) return openDeed(Number(cell.dataset.i));
  });

  // ---------- Brett ----------
  function cellPos(i) {
    const L = BRD.N / 4, G = L + 1;
    if (i <= L) return { r: G, c: G - i, side: 'bottom' };
    if (i <= 2 * L) return { r: G - (i - L), c: 1, side: 'left' };
    if (i <= 3 * L) return { r: 1, c: i - 2 * L + 1, side: 'top' };
    return { r: i - 3 * L + 1, c: G, side: 'right' };
  }
  const CORNER_ICON = { go: '⟵', jail: '😱', parking: '🐷', gotojail: '👉' };
  const TYPE_ICON = { april: '💖', studio: '💜' };
  const REAL_ICON = { april: '✉️', studio: '📬', parking: '🏦', jail: '⚖️', gotojail: '📜', go: null };

  function buildBoard() {
    if (!$('#die1')) $('#dice').innerHTML = cubeHTML('die1') + cubeHTML('die2');
    const board = $('#board');
    const casino = !!(App.S && App.S.isCasino);
    const kind = casino ? 'casino' : BRD.id;
    if (board.dataset.kind === kind && board.querySelector('.cell')) return;
    board.querySelectorAll('.cell').forEach((c) => c.remove());
    board.dataset.kind = kind;
    board.classList.toggle('is-casino', casino);
    const mega = BRD.id === 'mega', L = BRD.N / 4;
    board.classList.toggle('is-mega', mega);
    const custom = !['normal', 'real', 'logi'].includes(BRD.id);
    const logi = BRD.id === 'logi';
    board.classList.toggle('is-logi', logi);
    const real = BRD.id === 'real';
    board.classList.toggle('is-mini', BRD.id === 'mini');
    board.style.gridTemplateColumns = board.style.gridTemplateRows = custom ? `1.55fr repeat(${L - 1}, 1fr) 1.55fr` : '';
    $('#center').style.gridArea = custom ? `2 / 2 / ${L + 1} / ${L + 1}` : '';
    // Das MEGA-Brett startet gezoomt, die Kamera folgt der Figur
    if (mega && !App.megaZoomInit) { App.megaZoomInit = true; $('#board-wrap').classList.add('is-zoomed'); $('#btn-zoom').textContent = 'Übersicht'; }
    $('.center-sub').textContent = casino ? 'Casino Night · Duisburg' : real ? 'Realistic · Immobilien' : logi ? 'Logistics · Deutschland' : 'Duisburg · Öhringen';
    SPACES.forEach((sp, i) => {
      const { r, c, side } = cellPos(i);
      const el = document.createElement('div');
      const corner = i % L === 0;
      el.className = `cell s-${side} t-${sp.type}${corner ? ' corner' : ''}${sp.name === 'DULIDAN HQ' ? ' is-hq' : ''}`;
      el.style.gridArea = `${r} / ${c}`;
      el.dataset.i = i;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', sp.name);
      let body = '';
      if (corner) {
        body = sp.type === 'go'
          ? `<div class="cname">LOS</div><div class="cicon">${CORNER_ICON.go}</div><div class="csub">${esc(sp.sub)}</div>`
          : `<div class="cicon">${(real && REAL_ICON[sp.type]) || CORNER_ICON[sp.type]}</div><div class="cname">${esc(sp.name)}</div>${sp.sub ? `<div class="csub">${esc(sp.sub)}</div>` : ''}`;
      } else if (sp.type === 'prop') {
        body = `${casino ? `<div class="cgame">${CZ.INFO[CZ.GAMES[sp.group]].icon}</div>` : ''}<div class="cname">${esc(sp.name)}</div><div class="cprice">${real ? MK(sp.price) : M(sp.price)}</div>`;
      } else if (sp.type === 'rail' || sp.type === 'util' || sp.type === 'station') {
        body = `<div class="cicon">${sp.icon}</div><div class="cname">${esc(sp.name)}</div><div class="cprice">${real ? MK(sp.price) : M(sp.price)}</div>`;
      } else if (sp.type === 'tax') {
        body = `<div class="cicon">${sp.icon}</div><div class="cname">${esc(sp.name)}</div>${real ? '' : `<div class="cprice">${M(sp.amount)}</div>`}`;
      } else {
        body = `<div class="cicon">${real && REAL_ICON[sp.type] ? REAL_ICON[sp.type] : sp.type === 'april' ? aprilIcon() : TYPE_ICON[sp.type] || sp.icon || ''}</div><div class="cname">${esc(sp.name)}</div>`;
      }
      el.innerHTML = (sp.type === 'prop' ? `<div class="band" style="--g:${GROUPS[sp.group].color}"></div>` : '')
        + `<div class="cell-body">${body}</div>${['prop', 'rail', 'util', 'station'].includes(sp.type) ? '<div class="owner-flag"></div>' : ''}<div class="cell-tokens"></div>`;
      board.appendChild(el);
    });
    if (board.dataset.kbd) return;
    board.dataset.kbd = '1';
    board.addEventListener('keydown', (e) => {
      const cell = e.target.closest('.cell');
      if (cell && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDeed(Number(cell.dataset.i)); }
    });
  }

  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function dieHTML(n) {
    let h = '';
    for (let k = 0; k < 9; k++) h += PIPS[n].includes(k) ? '<i></i>' : '<span></span>';
    return h;
  }

  function renderBoard() {
    const S = App.S;
    const cells = document.querySelectorAll('#board .cell');
    cells.forEach((el) => {
      const i = Number(el.dataset.i), st = S.props[i];
      if (st) {
        const owner = P(st.owner);
        el.classList.toggle('is-owned', !!owner);
        el.classList.toggle('is-mort', !!st.mort);
        if (owner) el.style.setProperty('--oc', owner.color);
        const band = el.querySelector('.band');
        if (band) {
          band.innerHTML = S.isReal ? realBand(st) : !S.isCasino ? (st.houses === 5 ? '<span class="hotel"></span>' : '<span class="house"></span>'.repeat(st.houses))
            : st.houses ? `<span class="corr">${st.houses === 5 ? '💀' : '😈'.repeat(st.houses)}</span>` : '';
        }
        const fl = el.querySelector('.owner-flag');
        const fk = owner ? owner.id : '';
        if (fl && fl.dataset.k !== fk) { fl.dataset.k = fk; fl.innerHTML = owner ? tokHTML(owner.token, owner.color) : ''; }
        const v = viewer();
        el.classList.toggle('is-mine', !!owner && !!v && owner.id === v.id);
      }
      const here = S.players.filter((p) => !p.bankrupt && (App.disp[p.id] ?? p.pos) === i);
      const tokKey = here.map((p) => p.id).join(',');
      const tokEl = el.querySelector('.cell-tokens');
      if (tokEl.dataset.key !== tokKey) {
        tokEl.dataset.key = tokKey;
        tokEl.innerHTML = here.map((p) => tokHTML(p.token, p.color).replace('<span class="tok', `<span data-tokpid="${esc(p.id)}" class="tok`)).join('');
      }
      tokEl.querySelectorAll('.tok').forEach((t) => t.classList.toggle('is-cur-tok', S.phase === 'play' && t.dataset.tokpid === curP().id));
      el.classList.toggle('is-last', !isBusy() && S.lastLand === i);
      if (SPACES[i].type === 'parking' && !S.isReal) {
        el.classList.toggle('has-pot', S.pot > 0);
        el.querySelector('.csub').textContent = S.pot > 0 ? `🐷 Spardose: ${M(S.pot)}` : 'Spardose leer';
      }
    });

    renderTracks();
    // Würfel
    const [a, b] = S.dice;
    const fresh = S.rollId !== App.lastRoll;
    App.lastRoll = S.rollId;
    setCube($('#die1'), a, fresh);
    setCube($('#die2'), b, fresh);
    const cur = curP();
    $('#center-turn').innerHTML = S.isReal && S.phase !== 'over' ? `<strong>${esc(cur.name)}</strong> ist dran · ${R.qName(S.q)}` : S.phase === 'over'
      ? `🏆 <strong>${esc(P(S.winner).name)}</strong> gewinnt!`
      : `<strong>${esc(cur.name)}</strong> ist dran · Runde ${Math.ceil(S.turnNo / Math.max(1, S.players.filter((p) => !p.bankrupt).length))}`;

    const cc = $('#center-card');
    if (S.isReal && S.card && S.phase === 'play' && !isBusy()) {
      const c = R.cardText(S);
      cc.className = `center-card deck-${c.deck === 'amt' ? 'april' : 'studio'} is-real`;
      cc.innerHTML = `<div class="card-icon">${{ amt: '✉️', mieter: '🏠', case: '⚖️' }[c.deck]}</div><div class="card-kind">${{ amt: 'Post vom Amt', mieter: 'Mieter-Post', case: 'Entscheidung' }[c.deck]}</div><div class="card-text"><strong>${esc(c.title)}</strong><br>${esc(c.text)}</div>`;
      cc.hidden = false;
    } else if (S.isReal) cc.hidden = true;
    else if (S.card && S.phase === 'play' && !isBusy()) {
      const c = E.CARDS[S.card.deck][S.card.id];
      cc.className = `center-card deck-${S.card.deck}`;
      cc.innerHTML = `<div class="card-icon">${S.card.deck === 'april' ? aprilIcon('card-april') : TYPE_ICON[S.card.deck]}</div><div class="card-kind">${S.card.deck === 'april' ? 'April-Karte' : 'Studio-Karte'}</div><div class="card-text">${esc(c.text)}</div>`;
      cc.hidden = false;
    } else cc.hidden = true;
    // MEGA-Brett im Zoom: Karte schwebt über dem Bildschirm, sonst wäre sie irgendwo in der Brettmitte
    const fc = $('#float-card');
    if (BRD.id === 'mega' && $('#board-wrap').classList.contains('is-zoomed') && !cc.hidden) {
      if (fc.dataset.k !== cc.innerHTML) { fc.dataset.k = cc.innerHTML; fc.innerHTML = cc.innerHTML; }
      fc.className = cc.className.replace('center-card', 'float-card');
      fc.hidden = false;
      cc.hidden = true;
    } else fc.hidden = true;
  }

  // ---------- Seitenleiste ----------
  function btn(label, action, pid, cls = '', disabled = false, title = '') {
    return `<button class="btn ${cls}" data-act='${esc(JSON.stringify(action))}' data-pid="${esc(pid)}" ${disabled ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''}>${label}</button>`;
  }
  function uiBtn(label, ui, cls = '', extra = '') {
    return `<button class="btn ${cls}" data-ui="${ui}" ${extra}>${label}</button>`;
  }

  function deedHTML(i, highlight) {
    const S = App.S, sp = SPACES[i], st = S && S.props[i];
    const owner = st && P(st.owner);
    const ownerLine = st ? `<div class="deed-foot">${owner ? `Besitzer: <strong>${esc(owner.name)}</strong>${st.mort ? ' · mit Hypothek' : ''}` : 'Gehört der Bank'}</div>` : '';
    if (sp.type === 'prop' && S && S.isCasino) {
      const g = GROUPS[sp.group], game = CZ.GAMES[sp.group], info = CZ.INFO[game];
      const lvl = st && owner ? st.houses : -1;
      const rows = CZ.LEVELS.map((name, k) => `<tr class="${highlight && k === lvl ? 'is-now' : ''}"><td>${k === 0 ? '😇' : k === 5 ? '💀' : '😈'.repeat(k)} ${name}</td><td>${M(Math.max(20, sp.rent[k] * 2))} · ${game === 'blackjack' ? `Bank schummelt ${Math.round(CZ.rig(k) * 100)} %` : `${Math.round(CZ.chance(game, k) * 100)} % Chance`}</td></tr>`).join('');
      return `<div class="deed"><div class="deed-head" style="--g:${g.color}">${info.icon} ${esc(sp.name)}<small>${info.name} · ${esc(g.name)}</small></div>
        <p class="deed-note">${esc(info.text)} Der Einsatz ist die doppelte Miete (mindestens Ð20). Ganze Farbgruppe ohne Korruption: noch mal doppelt.</p>
        <table><tr><th>Stufe</th><th>Einsatz · Chance für Gäste</th></tr>${rows}
        <tr><td>Korruption kostet</td><td>${M(g.house)}</td></tr><tr><td>Hypothek</td><td>${M(sp.price / 2)}</td></tr><tr><td>Kaufpreis</td><td>${M(sp.price)}</td></tr></table>${ownerLine}</div>`;
    }
    if (sp.type === 'prop') {
      const g = GROUPS[sp.group];
      const rows = [
        ['Miete', sp.rent[0]], ['Ganze Farbgruppe', sp.rent[0] * 2],
        ['Mit 1 Haus', sp.rent[1]], ['Mit 2 Häusern', sp.rent[2]], ['Mit 3 Häusern', sp.rent[3]],
        ['Mit 4 Häusern', sp.rent[4]], ['Mit Hotel', sp.rent[5]],
      ];
      const now = st ? (st.houses > 0 ? st.houses + 1 : (owner && E.ownsGroup(S, owner.id, sp.group) ? 1 : 0)) : -1;
      return `<div class="deed"><div class="deed-head" style="--g:${g.color}">${esc(sp.name)}<small>${esc(sp.sub || g.name)}</small></div>
        <table>${rows.map((r, k) => `<tr class="${highlight && owner && k === now ? 'is-now' : ''}"><td>${r[0]}</td><td>${M(r[1])}</td></tr>`).join('')}
        <tr><td>Haus / Hotel kostet</td><td>${M(g.house)}</td></tr><tr><td>Hypothek</td><td>${M(sp.price / 2)}</td></tr><tr><td>Kaufpreis</td><td>${M(sp.price)}</td></tr></table>${ownerLine}</div>`;
    }
    if (S && S.isLogi && ['station', 'rail', 'util'].includes(sp.type)) return logiDeedHTML(i, ownerLine);
    if (sp.type === 'rail') {
      return `<div class="deed"><div class="deed-head light-text" style="--g:#2a2140">🚉 ${esc(sp.name)}<small>Bahnhof</small></div>
        <table><tr><td>1 Bahnhof</td><td>${M(25)}</td></tr><tr><td>2 Bahnhöfe</td><td>${M(50)}</td></tr><tr><td>3 Bahnhöfe</td><td>${M(100)}</td></tr><tr><td>4 Bahnhöfe</td><td>${M(200)}</td></tr>
        <tr><td>Hypothek</td><td>${M(100)}</td></tr><tr><td>Kaufpreis</td><td>${M(200)}</td></tr></table>${ownerLine}</div>`;
    }
    if (sp.type === 'util') {
      return `<div class="deed"><div class="deed-head light-text" style="--g:#2a2140">${sp.icon} ${esc(sp.name)}<small>${esc(sp.sub)}</small></div>
        <table><tr><td>1 Werk</td><td>4× Augen</td></tr><tr><td>Beide Werke</td><td>10× Augen</td></tr><tr><td>Hypothek</td><td>${M(75)}</td></tr><tr><td>Kaufpreis</td><td>${M(150)}</td></tr></table>${ownerLine}</div>`;
    }
    const desc = {
      go: `Jedes Mal, wenn du hier vorbeiziehst, bekommst du ${M(BRD.go)} (das Zebra ${M(BRD.go + 50)}).`,
      free: `${sp.sub || ''} Hier passiert nichts. Kurz durchatmen.`,
      jail: 'Wer hierher geschickt wird, sitzt fest. Raus kommst du mit einem Pasch, mit Ð50 oder mit einer Freikarte. Wer nur draufkommt, ist nur zu Besuch.',
      parking: 'Aprils Pause mit Aprils Spardose: Alle Steuern und Strafen an die Bank sammeln sich hier. Wer draufkommt, bekommt alles.',
      gotojail: 'Deadline verpasst! Du gehst direkt nach Düsseldorf, ohne über LOS zu ziehen.',
      tax: `Zahle ${M(sp.amount || 0)} an die Bank.`,
      april: 'Zieh eine April-Karte. April ist launisch, cringe und manchmal großzügig.',
      studio: 'Zieh eine Studio-Karte. Kunden, Aufträge, Rechnungen – der Studio-Alltag.',
    }[sp.type];
    return `<div class="deed"><div class="deed-head light-text" style="--g:#2a2140">${esc(sp.name)}</div><div class="deed-foot" style="border:0;font-size:14px;color:var(--fg)">${esc(desc)}</div></div>`;
  }

  function openDeed(i) {
    if (!App.S) return;
    if (App.S.isReal) return openRealProp(i);
    if (App.S.isLogi) return openModal(deedHTML(i, true), () => deedHTML(i, true));
    openModal(deedHTML(i, true));
  }

  function offerSideHTML(side) {
    const items = [];
    side.props.forEach((i) => items.push(esc(SPACES[i].name)));
    if (side.money) items.push(M(side.money));
    if (side.jf) items.push(`${side.jf}× Düsseldorf-Freikarte`);
    return items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="empty">nichts</p>';
  }

  function renderAction() {
    const S = App.S, el = $('#panel-action');
    if (S.phase === 'over') {
      const w = P(S.winner);
      el.innerHTML = `<div class="winner">${tokHTML(w.token, w.color)}<h3>${esc(w.name)} gewinnt Dulidanopoly! 🏆</h3>
        <ol class="rank">${(S.ranking || []).map((r) => `<li><span>${esc(P(r.id).name)}</span><strong>${M(r.worth)}</strong></li>`).join('')}</ol>
        ${chartHTML()}
        ${awardsHTML()}
        ${App.mode !== 'client' ? uiBtn('Neue Runde', 'rematch', 'btn-primary') : '<p class="action-note">Der Host kann eine neue Runde starten.</p>'}</div>`;
      return;
    }
    const cur = curP();
    let h = '';
    if (isBusy()) {
      el.innerHTML = `<div class="action-head">${tokHTML(cur.token, cur.color)}<div><h3>${esc(cur.name)} ist dran</h3><small>${moneyTxt(cur)}</small></div></div>
        <p class="action-note rolling">${Date.now() < (App.walkAfter || 0) ? '🎲 Die Würfel rollen …' : App.czAnim && Date.now() < App.czAnim.until ? '🎰 Es wird gezockt …' : '🚶 unterwegs …'}</p>`;
      return;
    }
    if (S.event) h += `<div class="news"><strong>📰 April-News · Runde ${S.round}</strong><span>${esc(S.event.t)}</span></div>`;
    h += moodNewsHTML();
    if (S.maxRounds && !S.event) h += `<div class="news"><strong>⚡ Blitz · Runde ${S.round}/${S.maxRounds}</strong><span>Danach gewinnt der Reichste.</span></div>`;

    // Offenes Handelsangebot
    if (S.trade) {
      const from = P(S.trade.from), to = P(S.trade.to);
      h += `<div class="offer"><strong>🤝 ${esc(from.name)} → ${esc(to.name)}</strong>
        <div><small>${esc(from.name)} gibt:</small>${offerSideHTML(S.trade.give)}</div>
        <div><small>${esc(to.name)} gibt:</small>${offerSideHTML(S.trade.get)}</div>
        <div class="btn-row">
        ${canControl(to.id) ? btn(App.mode === 'local' ? `${esc(to.name)}: Annehmen` : 'Annehmen', { type: 'tradeAccept' }, to.id, 'btn-primary') + btn('Ablehnen', { type: 'tradeDecline' }, to.id) : ''}
        ${canControl(from.id) && !canControl(to.id) ? btn('Angebot zurückziehen', { type: 'tradeDecline' }, from.id) : ''}
        ${!canControl(to.id) && !canControl(from.id) ? '<p class="action-note">Warte auf Antwort …</p>' : ''}
        </div></div>`;
    }

    if (S.sub === 'auction') {
      const a = S.auction, bidder = P(a.active[a.turn]), high = P(a.highId);
      h += `<div class="action-head"><div><h3>Versteigerung: ${esc(SPACES[a.idx].name)}</h3>
        <small>Höchstgebot: <strong>${high ? `${M(a.high)} von ${esc(high.name)}` : 'noch keins'}</strong></small></div></div>`;
      if (canControl(bidder.id)) {
        const opts = [10, 50, 100].map((inc) => a.high + inc);
        h += `<div class="auction-box"><strong>${esc(bidder.name)}, dein Gebot (du hast ${M(bidder.money)}):</strong>
          <div class="btn-row">${opts.map((v) => btn(M(v), { type: 'bid', amt: v }, bidder.id, '', v > bidder.money)).join('')}</div>
          <div class="join-row"><label class="field"><span>Eigenes Gebot</span><input id="in-bid" type="number" inputmode="numeric" min="${a.high + 1}" max="${bidder.money}" value="${Math.min(bidder.money, a.high + 1)}"></label>
          ${btn('Bieten', { type: 'bidCustom' }, bidder.id)}</div>
          ${btn('Aussteigen', { type: 'pass' }, bidder.id, 'btn-ghost')}</div>`;
      } else {
        h += `<p class="action-note">${esc(bidder.name)} ist mit Bieten dran …</p>`;
      }
      el.innerHTML = h;
      return;
    }

    h += modeNewsHTML(S);
    const special = specialSubHTML(S, cur);
    if (special != null) { el.innerHTML = h + special; return; }
    const me = canControl(cur.id);
    const label = App.mode === 'local' || cur.id !== myId ? esc(cur.name) : 'Du';
    h += `<div class="action-head">${tokHTML(cur.token, cur.color)}<div><h3>${me ? (label === 'Du' ? 'Du bist dran!' : `${label} ist dran`) : `${esc(cur.name)} ist dran`}</h3>
      <small>${moneyTxt(cur)} · ${esc(SPACES[cur.pos].name)}${cur.id !== myId && App.mode === 'host' && !cur.connected ? ' · offline – du spielst für sie/ihn' : ''}</small></div></div>`;

    if (!me) {
      const what = { roll: 'würfelt gleich', berlingo: 'überlegt sich das Berlingo-Manöver', buy: `überlegt, ob ${esc(SPACES[cur.pos].name)} gekauft wird`, card: 'liest eine Karte', debt: 'muss Schulden begleichen', end: 'beendet gleich den Zug', casino: 'zockt im Casino' }[S.sub] || '';
      if (S.sub === 'casino' && S.casino) h += casinoInfoHTML(S.casino) + (S.casino.bj ? bjHandsHTML(S.casino.bj, false) : '');
      h += `<p class="action-note">${esc(cur.name)} ${what} …</p>`;
      el.innerHTML = h;
      return;
    }

    const pid = cur.id;
    const canTrade = !S.trade && S.players.filter((p) => !p.bankrupt).length > 1;
    switch (S.sub) {
      case 'roll': {
        if (cur.inJail) {
          const max = cur.token === 'helmet' ? 2 : 3;
          h += `<p class="action-note">😱 Du sitzt in Düsseldorf fest. Versuch ${cur.jailTries + 1} von ${max}: Würfle einen Pasch oder kauf dich frei.</p>`;
          h += `<div class="btn-row">${btn('🎲 Würfeln', { type: 'roll' }, pid, 'btn-primary', !!S.trade)}
            ${btn(`${M(50)} zahlen`, { type: 'payJail' }, pid, '', cur.money < 50)}
            ${cur.jailFree.length ? btn('Freikarte nutzen', { type: 'useJailCard' }, pid) : ''}</div>`;
        } else {
          h += `<div class="btn-row">${btn(S.rolledDouble ? '🎲 Nochmal würfeln' : '🎲 Würfeln', { type: 'roll' }, pid, 'btn-primary btn-roll', !!S.trade)}</div>${shakeHint()}`;
          if (cur.token === 'berlingo' && !cur.used.berlingo) {
            h += btn(S.berlingoArmed ? '🚐 Berlingo-Manöver ist an' : '🚐 Berlingo-Manöver einschalten', { type: 'armBerlingo' }, pid, S.berlingoArmed ? 'btn-primary btn-small' : 'btn-ghost btn-small');
          }
        }
        if (canTrade) h += uiBtn('Handeln', 'trade', 'btn-ghost');
        h += bribeBtn(cur);
        if (S.isPol) h += `<div class="btn-row pol-camp"><small>📣 Wahlkampf (1 Stimme pro Ð100):</small>${[100, 250, 500].map((a) => btn(M(a), { type: 'campaign', amt: a }, pid, 'btn-small btn-ghost', cur.money < a)).join('')}</div>`;
        break;
      }
      case 'casino': {
        const c = S.casino, info = CZ.INFO[c.game];
        h += casinoInfoHTML(c);
        if (c.bj) {
          h += bjHandsHTML(c.bj, false);
          h += `<div class="btn-row">${btn('🃏 Karte', { type: 'bjHit' }, pid, 'btn-primary')}${btn('✋ Halten', { type: 'bjStand' }, pid)}</div>`;
        } else {
          h += `<div class="btn-row cz-choices">${info.choices.map(([k, l]) => btn(l, { type: 'casinoPlay', choice: k }, pid, 'btn-primary')).join('')}</div>`;
        }
        break;
      }
      case 'berlingo': {
        const base = S.pendingMove;
        const target = (d) => SPACES[(cur.pos + (base + d) * BRD.stepMult) % BRD.N].name;
        h += `<p class="action-note">Du hast ${base} gewürfelt. Berlingo-Manöver: 1 Feld vor oder zurück?</p>
          <div class="btn-row">${btn(`−1 · ${esc(target(-1))}`, { type: 'berlingoMove', d: -1 }, pid)}
          ${btn(`Normal · ${esc(target(0))}`, { type: 'berlingoMove', d: 0 }, pid, 'btn-ghost')}
          ${btn(`+1 · ${esc(target(1))}`, { type: 'berlingoMove', d: 1 }, pid)}</div>`;
        break;
      }
      case 'buy': {
        const price = E.buyPrice(cur, cur.pos);
        h += deedHTML(cur.pos, false);
        h += `<div class="btn-row">${btn(`Kaufen für ${M(price)}`, { type: 'buy' }, pid, 'btn-primary', cur.money < price)}
          ${btn('Versteigern', { type: 'auction' }, pid)}</div>`;
        if (cur.token === 'dulidan') h += '<p class="action-note">Boss-Rabatt: 10 % günstiger.</p>';
        if (cur.money < price) h += '<p class="action-note">Zu wenig Dulis? Nimm eine Hypothek auf, oder lass es versteigern.</p>';
        break;
      }
      case 'card': {
        const c = E.CARDS[S.card.deck][S.card.id];
        h += `<p class="action-note">${esc(c.text)}</p><div class="btn-row">${btn('OK', { type: 'cardOk' }, pid, 'btn-primary')}
          ${cur.token === 'april' && !cur.used.april ? btn(`${aprilIcon('btn-april')} Neu ziehen (1× pro Spiel)`, { type: 'cardRedraw' }, pid) : ''}</div>`;
        break;
      }
      case 'debt': {
        const total = S.debt.items.reduce((x, y) => x + y.amt, 0);
        h += `<p class="action-note">Du musst <strong>${M(total)}</strong> zahlen, hast aber nur ${M(cur.money)}. Verkauf Häuser, nimm Hypotheken auf (unten bei deinen Feldern) oder handle.</p>
          <div class="btn-row">${btn(`${M(total)} bezahlen`, { type: 'payDebt' }, pid, 'btn-primary', cur.money < total)}
          ${canTrade ? uiBtn('Handeln', 'trade', 'btn-ghost') : ''}</div>`;
        h += App.confirmBankrupt
          ? `<div class="btn-row">${btn('Ja, ich bin pleite', { type: 'bankrupt' }, pid, 'btn-danger')}${uiBtn('Doch nicht', 'cancelBankrupt', 'btn-ghost')}</div>`
          : btn('Bankrott erklären', { type: 'bankruptAsk' }, pid, 'btn-ghost btn-small');
        break;
      }
      case 'end': {
        h += `<div class="btn-row">${btn('Zug beenden', { type: 'endTurn' }, pid, 'btn-primary', !!S.trade)}${canTrade ? uiBtn('Handeln', 'trade', 'btn-ghost') : ''}</div>`;
        h += bribeBtn(cur);
        break;
      }
    }
    el.innerHTML = h;
  }

  const AWARDS = [
    ['🦈', 'Miethai', 'rentGot', (v) => `${M(v)} Miete kassiert`],
    ['💸', 'Goldesel', 'rentPaid', (v) => `${M(v)} Miete gezahlt`],
    ['😱', 'Düsseldorf-Stammgast', 'jail', (v) => `${v}× in Düsseldorf`],
    ['🎲', 'Pasch-König', 'doubles', (v) => `${v} Pasche`],
    ['🐷', 'Spardosen-Dieb', 'pot', (v) => `${M(v)} aus der Spardose`],
    ['🏗️', 'Baulöwe', 'built', (v) => `${v} Gebäude gebaut`],
    ['🃏', 'Kartenjunkie', 'cards', (v) => `${v} Karten gezogen`],
    ['🔥', 'Schmerzhaftester Moment', 'maxRent', (v) => `${M(v)} Miete auf einen Schlag`],
    ['🦹', 'Übernahme-Hai', 'takeovers', (v) => `${v} feindliche Übernahmen`],
    ['✈️', 'Vielflieger', 'flights', (v) => `${v} Flüge`],
    ['🧭', 'Weltenbummler', 'km', (v) => `${v} Felder gelaufen`],
    ['🎁', 'Loot-Goblin', 'loot', (v) => `${v} Kisten geöffnet`],
  ];
  // ---------- Geldverlauf ----------
  function chartHTML() {
    const S = App.S, h = (S.hist || []).slice();
    if (h.length < 2) return '';
    h.push(S.players.map((p) => (p.bankrupt ? 0 : Math.round(ENG().netWorth(S, p)))));
    const CW = 520, CH = 190, pad = 6;
    const max = Math.max(100, ...h.flat());
    const x = (i) => pad + (i / (h.length - 1)) * (CW - pad * 2);
    const y = (v) => CH - pad - (v / max) * (CH - pad * 2);
    let grid = '';
    for (let k = 1; k < 4; k++) grid += `<line x1="0" x2="${CW}" y1="${(CH * k) / 4}" y2="${(CH * k) / 4}"/>`;
    const lines = S.players.map((p, k) => `<polyline points="${h.map((row, i) => `${x(i).toFixed(1)},${y(row[k] || 0).toFixed(1)}`).join(' ')}" style="stroke:${p.color}"/>`).join('');
    return `<div class="chart"><div class="chart-head"><span>📈 Vermögen pro Runde</span><span>Spitze ${M(max)}</span></div>
      <svg viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="none" aria-label="Vermögensverlauf aller Spieler">${grid}${lines}</svg>
      <div class="chart-legend">${S.players.map((p) => `<span><i style="background:${p.color}"></i>${esc(p.name)}</span>`).join('')}</div></div>`;
  }

  // ---------- Erfolge (bleiben auf diesem Gerät gespeichert) ----------
  const ACH = [
    { id: 'win', icon: '🏆', name: 'Erster Sieg', text: 'Gewinne ein Spiel.' },
    { id: 'win5', icon: '👑', name: 'Serien-Sieger', text: 'Gewinne 5 Spiele.' },
    { id: 'rentKing', icon: '🦈', name: 'Miethai', text: 'Kassiere in einem Spiel Ð3.000 Miete.' },
    { id: 'bigPay', icon: '💸', name: 'Schmerzgrenze', text: 'Zahle Ð1.000 Miete auf einmal.' },
    { id: 'jail3', icon: '😱', name: 'Düsseldorf-Stammgast', text: 'Lande in einem Spiel 3× in Düsseldorf.' },
    { id: 'builder', icon: '🏗️', name: 'Baulöwe', text: 'Baue in einem Spiel 10 Gebäude.' },
    { id: 'doubles5', icon: '🎲', name: 'Pasch-Maschine', text: 'Würfle in einem Spiel 5 Pasche.' },
    { id: 'mega', icon: '🚀', name: 'Weltreise', text: 'Spiele ein MEGA-Spiel zu Ende.' },
    { id: 'casino', icon: '🎰', name: 'High Roller', text: 'Spiele ein Casino-Spiel zu Ende.' },
    { id: 'newMode', icon: '🏝️', name: 'Entdecker', text: 'Spiele ISLANDS oder FESTIVAL zu Ende.' },
    { id: 'allModes', icon: '🧭', name: 'Modus-Sammler', text: 'Beende Spiele in 4 verschiedenen Modi.' },
    { id: 'aprilLove', icon: '💖', name: 'Aprils Liebling', text: 'Beende ein Spiel als Aprils Liebling.' },
    { id: 'aprilHate', icon: '💔', name: 'Staatsfeind', text: 'Beende ein Spiel, während April dich hasst.' },
    { id: 'briber', icon: '🤑', name: 'Korrupt', text: 'Besteche April 3× in einem Spiel.' },
    { id: 'rules5', icon: '🧩', name: 'Regel-Bastler', text: 'Spiele mit 5 oder mehr Hausregeln.' },
    { id: 'speedrun', icon: '⏱️', name: 'Speedrun', text: 'Gewinne ein Spiel in höchstens 15 Runden.' },
    { id: 'racer', icon: '🏎️', name: 'Rennfahrer', text: 'Gewinne ein DULIDAN RACE.' },
    { id: 'king', icon: '👑', name: 'Lang lebe der König', text: 'Sei am Spielende König in DULIDAN THRON.' },
    { id: 'quizmaster', icon: '🧠', name: 'Quizmaster', text: 'Beantworte in einem Spiel 5 Quizfragen richtig.' },
    { id: 'bombproof', icon: '💣', name: 'Bombensicher', text: 'Gewinne ein Spiel DULIDAN BOMBE.' },
    { id: 'realist', icon: '🏢', name: 'Immobilienprofi', text: 'Spiele ein REALISTIC-Spiel zu Ende.' },
    { id: 'taxpro', icon: '🧮', name: 'Steuerfuchs', text: 'Mach in REALISTIC eine fehlerfreie Steuererklärung selbst.' },
  ];
  const achStore = () => Object.assign({ got: {}, wins: 0, modes: [] }, store.get('duli-ach') || {});
  function checkAchievements() {
    const S = App.S, st = achStore();
    const gid = `${S.players.map((p) => p.id).join('|')}:${S.turnNo}:${S.logSeq}`;
    if (st.lastGame === gid) return [];
    st.lastGame = gid;
    const mine = App.mode === 'local' ? S.players.filter((p) => !p.bot) : S.players.filter((p) => p.id === myId);
    if (!mine.length) { store.set('duli-ach', st); return []; }
    const modeKey = S.isCasino ? 'casino' : S.mode || 'classic';
    if (!st.modes.includes(modeKey)) st.modes.push(modeKey);
    const won = mine.some((p) => p.id === S.winner);
    if (won) st.wins += 1;
    const any = (fn) => mine.some((p) => fn(p, p.stats || {}));
    const ok = {
      win: won, win5: st.wins >= 5,
      rentKing: !S.isReal && any((p, x) => x.rentGot >= 3000), bigPay: !S.isReal && any((p, x) => x.maxRent >= 1000),
      realist: !!S.isReal, taxpro: !!S.isReal && any((p, x) => (x.taxPerfect || 0) >= 1),
      jail3: any((p, x) => (x.jail || 0) >= 3), builder: any((p, x) => (x.built || 0) >= 10), doubles5: any((p, x) => (x.doubles || 0) >= 5),
      mega: S.size === 'mega', casino: !!S.isCasino, newMode: ['islands', 'festival'].includes(S.mode), allModes: st.modes.length >= 4,
      aprilLove: MOOD.on(S) && any((p) => p.like >= 70), aprilHate: MOOD.on(S) && any((p) => p.like < 15),
      briber: any((p) => (p.bribes || 0) >= 3),
      rules5: Object.values((S.settings && S.settings.rules) || {}).filter(Boolean).length >= 5,
      speedrun: won && !S.isReal && (S.round || 99) <= 15,
      racer: won && S.mode === 'race', king: S.mode === 'throne' && mine.some((p) => p.id === S.king),
      quizmaster: any((p, x) => (x.quiz || 0) >= 5), bombproof: won && S.mode === 'bomb',
    };
    const fresh = ACH.filter((a) => ok[a.id] && !st.got[a.id]);
    fresh.forEach((a) => { st.got[a.id] = Date.now(); });
    store.set('duli-ach', st);
    return fresh;
  }
  function achGridHTML(fresh = []) {
    const st = achStore();
    return `<div class="ach-grid">${ACH.map((a) => `<div class="ach ${st.got[a.id] ? 'is-got' : ''} ${fresh.includes(a) ? 'is-new' : ''}"><span class="ach-ic">${st.got[a.id] ? a.icon : '🔒'}</span><strong>${a.name}</strong><small>${a.text}</small></div>`).join('')}</div>`;
  }
  function achModalHTML() {
    const st = achStore();
    return `<h2>🏅 Erfolge</h2><p class="action-note">${Object.keys(st.got).length} von ${ACH.length} freigeschaltet · ${st.wins} Siege auf diesem Gerät</p>${achGridHTML()}`;
  }

  function awardsHTML() {
    const rows = AWARDS.map(([icon, title, key, fmt]) => {
      let best = null;
      for (const p of App.S.players) {
        const v = (p.stats || {})[key] || 0;
        if (v > 0 && (!best || v > best.v)) best = { p, v };
      }
      return best ? `<li><span class="aw-icon">${icon}</span><strong>${title}: ${esc(best.p.name)}</strong><small>${fmt(best.v)}</small></li>` : '';
    }).join('');
    return rows ? `<ul class="awards">${rows}</ul>` : '';
  }

  function renderPlayers() {
    const S = App.S;
    $('#players').innerHTML = S.players.map((p, i) => {
      const owned = Object.keys(S.props).filter((k) => S.props[k].owner === p.id).map(Number).sort((a, b) => a - b);
      const meta = [];
      if (p.inJail) meta.push('<span class="warn">in Düsseldorf</span>');
      if (p.skip) meta.push('<span class="warn">setzt aus</span>');
      if (p.jailFree.length) meta.push(`<span>${p.jailFree.length}× Freikarte</span>`);
      if (S.isWar && !p.bankrupt) meta.push(`<span>🪖 ${p.troops || 0} Truppen</span>`);
      if (S.isPol && S.pol) { const w = S.pol.wins[p.id] || 0; if (S.pol.kanzler === p.id) meta.push('<span class="warn">🏛️ Kanzler</span>'); if (w) meta.push(`<span>${w}/3 Wahlsiege</span>`); }
      if (App.mode !== 'local' && !p.connected && !p.bankrupt && !p.bot) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" data-pid="${esc(p.id)}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${owned.map((k) => `<i class="${S.props[k].mort ? 'is-mort' : ''}" style="--g:${SPACES[k].group ? GROUPS[SPACES[k].group].color : '#cfc3e6'}" title="${esc(SPACES[k].name)}"></i>`).join('')}</div>
          ${likeHTML(p)}
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${moneyTxt(p)}</div>${goalBar(p)}</li>`;
    }).join('');
  }

  // Geheimes Konto: fremdes Geld wird versteckt (lokal sieht man nur die Person, die dran ist)
  function hideMoney(p) {
    const S = App.S;
    if (!S || S.phase !== 'play' || !RL.on(S, 'secret')) return false;
    const v = viewer();
    return !v || v.id !== p.id;
  }
  const moneyTxt = (p) => (hideMoney(p) ? '🕵️ Ð???' : M(p.money));
  function goalBar(p) {
    const S = App.S;
    if (!S.goal || p.bankrupt) return '';
    const w = isWorld() ? W.netWorth(S, p) : E.netWorth(S, p);
    const pct = Math.min(100, Math.round((w / S.goal) * 100));
    return `<div class="goal-row" title="Vermögen ${M(w)} von ${M(S.goal)}"><div class="goal-bar"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>`;
  }

  function viewer() {
    const S = App.S;
    if (App.mode === 'local') return curP();
    const me = P(myId);
    if (me) return me;
    return null;
  }

  function renderProps() {
    const S = App.S, v = viewer();
    const wrap = $('#my-props');
    if (!v) { $('#props-title').textContent = 'Felder'; wrap.innerHTML = '<p class="empty">Du schaust zu.</p>'; return; }
    $('#props-title').textContent = App.mode === 'local' || v.id !== myId ? `Felder von ${v.name}` : 'Deine Felder';
    const owned = Object.keys(S.props).map(Number).filter((k) => S.props[k].owner === v.id).sort((a, b) => a - b);
    if (!owned.length) { wrap.innerHTML = '<p class="empty">Noch keine Felder. Kauf was!</p>'; return; }
    const manage = S.phase === 'play' && curP().id === v.id && canControl(v.id) && ['roll', 'end', 'debt', 'buy'].includes(S.sub);
    wrap.innerHTML = owned.map((k) => {
      const sp = SPACES[k], st = S.props[k];
      const color = sp.group ? GROUPS[sp.group].color : '#cfc3e6';
      let info = st.mort ? 'Hypothek' : '';
      if (sp.type === 'prop' && S.isCasino) info = `${CZ.INFO[CZ.GAMES[sp.group]].icon} ${CZ.LEVELS[st.houses]}${st.mort ? ' · geschlossen (Hypothek)' : ''}`;
      else if (sp.type === 'prop' && st.houses) info = st.houses === 5 ? 'Hotel' : `${st.houses} ${st.houses === 1 ? 'Haus' : 'Häuser'}`;
      if (S.isLogi && sp.type === 'station') info = `${st.mort ? 'Hypothek · ' : ''}Netz: ${((n) => `${n} ${n > 1 ? 'Bahnhöfe' : 'Bahnhof'}`)(LG.network(S, k).length)} · Miete ${M(E.calcRent(S, k))}`;
      if (S.isLogi && !info) info = sp.type === 'rail' ? 'Flughafen' : 'Hafen';
      if (!info) info = sp.type === 'rail' ? (S.isCasino ? 'Casino-Shuttle' : 'Bahnhof') : sp.type === 'util' ? (S.isCasino ? 'Wechselstube' : 'Werk') : 'Keine Häuser';
      let btns = '';
      if (S.isWar && sp.type === 'prop') info += ` · 🛡️ ${E.defense(S, k)}`;
      if (manage && S.isWar && sp.type === 'prop' && (v.troops || 0) > 0) btns += btn('+1🪖', { type: 'deploy', idx: k, n: 1 }, v.id, 'btn-ghost', false, 'Truppe stationieren') + ((v.troops || 0) >= 3 ? btn('+3🪖', { type: 'deploy', idx: k, n: 3 }, v.id, 'btn-ghost') : '');
      if (manage && S.isLogi && sp.type === 'station') btns += uiBtn('🛤️ Schienen', 'logiDeed', 'btn-small', `data-i="${k}"`);
      if (manage) {
        if (sp.type === 'prop' && !st.mort && E.ownsGroup(S, v.id, sp.group)) {
          const cost = E.houseCost(v, sp.group, S);
          if (S.isCasino) {
            if (st.houses < 5) btns += btn(`+😈 ${M(cost)}`, { type: 'build', idx: k }, v.id, '', v.money < cost, `Korrupter machen: ${CZ.LEVELS[st.houses + 1]}`);
            if (st.houses > 0) btns += btn('−', { type: 'sell', idx: k }, v.id, 'btn-ghost', false, 'Korruption zurückfahren (halber Preis zurück)');
          } else {
            if (st.houses < 5) btns += btn(st.houses === 4 ? `+Hotel ${M(cost)}` : `+Haus ${M(cost)}`, { type: 'build', idx: k }, v.id, '', v.money < cost);
            if (st.houses > 0) btns += btn('−', { type: 'sell', idx: k }, v.id, 'btn-ghost', false, 'Gebäude verkaufen (halber Preis)');
          }
        }
        if (!st.mort && !(sp.type === 'prop' && E.groupHasHouses(S, sp.group))) btns += btn(`Hypothek +${M(sp.price / 2)}`, { type: 'mortgage', idx: k }, v.id, 'btn-ghost');
        if (st.mort) btns += btn(`Einlösen ${M(E.unmortgageCost(k))}`, { type: 'unmortgage', idx: k }, v.id, 'btn-ghost', v.money < E.unmortgageCost(k));
      }
      return `<div class="prop-row" style="--g:${color}"><span class="bar"></span>
        <div class="pr-name">${esc(sp.name)}<small>${info}</small></div><div class="pr-btns">${btns}</div></div>`;
    }).join('');
  }

  function renderLog() {
    const S = App.S;
    let lines = S.log;
    // Während Würfel rollen und Figur läuft, nichts verraten
    if (isBusy() && App.logHoldSeq != null) lines = S.log.slice(0, Math.max(0, S.log.length - (S.logSeq - App.logHoldSeq)));
    else App.logHoldSeq = S.logSeq;
    $('#log').innerHTML = lines.slice(-40).reverse().map((m) => `<li class="${m.startsWith('April:') ? 'is-april' : m.startsWith('🎙️') ? 'is-april is-cast' : ''}">${esc(m)}</li>`).join('');
  }

  // ---------- Handel ----------
  function tradeModal() {
    const S = App.S, me = curP();
    if (!canControl(me.id)) return;
    const partners = S.players.filter((p) => !p.bankrupt && p.id !== me.id);
    if (!App.trade || !P(App.trade.to)) App.trade = { to: partners[0].id };
    const them = P(App.trade.to);
    const list = (p, side) => {
      if (isWorld()) {
        const mine = Object.keys(S.cities).filter((id) => S.cities[id].owner === p.id);
        if (!mine.length) return '<p class="empty">Keine Städte</p>';
        return mine.map((id) => {
          const c = GB().CITY[id], blocked = W.zoneHasBuildings(S, c.zone);
          return `<label class="check"><input type="checkbox" name="${side}" value="${id}" ${blocked ? 'disabled' : ''}>
            <i style="--g:${GB().ZONES[c.zone].color}"></i>${esc(c.name)}${S.cities[id].mort ? ' (Hypothek)' : ''}${blocked ? ' (Gebäude)' : ''}</label>`;
        }).join('');
      }
      const owned = Object.keys(S.props).map(Number).filter((k) => S.props[k].owner === p.id).sort((a, b) => a - b);
      if (!owned.length) return '<p class="empty">Keine Felder</p>';
      return owned.map((k) => {
        const sp = SPACES[k], blocked = sp.type === 'prop' && E.groupHasHouses(S, sp.group);
        return `<label class="check"><input type="checkbox" name="${side}" value="${k}" ${blocked ? 'disabled' : ''}>
          <i style="--g:${sp.group ? GROUPS[sp.group].color : '#cfc3e6'}"></i>${esc(sp.name)}${S.props[k].mort ? ' (Hypothek)' : ''}${blocked ? ' (Häuser)' : ''}</label>`;
      }).join('');
    };
    openModal(`<h2>Handeln</h2>
      <div class="partner-row">${partners.map((p) => `<button class="btn btn-small ${p.id === them.id ? 'is-on' : ''}" data-ui="tradeTo" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>
      <div class="trade-grid">
        <div class="trade-col"><h3>${esc(me.name)} gibt</h3>${list(me, 'give')}
          <label class="field"><span>Dulis (max. ${M(me.money)})</span><input id="tr-give-money" type="number" inputmode="numeric" min="0" max="${me.money}" value="0"></label>
          ${(me.jailFree || []).length ? `<label class="field"><span>Freikarten (max. ${me.jailFree.length})</span><input id="tr-give-jf" type="number" min="0" max="${me.jailFree.length}" value="0"></label>` : ''}</div>
        <div class="trade-col"><h3>${esc(them.name)} gibt</h3>${list(them, 'get')}
          <label class="field"><span>Dulis (max. ${M(them.money)})</span><input id="tr-get-money" type="number" inputmode="numeric" min="0" max="${them.money}" value="0"></label>
          ${(them.jailFree || []).length ? `<label class="field"><span>Freikarten (max. ${them.jailFree.length})</span><input id="tr-get-jf" type="number" min="0" max="${them.jailFree.length}" value="0"></label>` : ''}</div>
      </div>
      <div class="btn-row" style="margin-top:16px">${uiBtn(`Angebot an ${esc(them.name)} schicken`, 'tradeSend', 'btn-primary')}</div>`);
  }

  function uiAction(kind, data) {
    const S = App.S;
    if (kind === 'trade') return tradeModal();
    if (kind === 'motion') return enableMotion();
    if (kind === 'tempo') {
      fastMode = !fastMode;
      try { localStorage.setItem('duli-fast', fastMode ? '1' : '0'); } catch (e) { /* privat */ }
      applyTempo();
      toast(fastMode ? '⚡ Blitzmodus an: Würfeln und Laufen gehen sofort.' : '🎲 Blitzmodus aus: Würfel rollen langsam, die Figur läuft gemütlich.');
      return App.S && App.S.phase !== 'lobby' ? render() : null;
    }
    if (kind === 'cityInfo') return openCity(data.id);
    if (kind === 'logiDeed') return openDeed(Number(data.i));
    if (kind === 'rxProp') return openRealProp(Number(data.i));
    if (kind === 'rxBank') return openModal(realBankHTML(), realBankHTML);
    if (kind === 'rxStmt') return openModal(stmtHTML(), stmtHTML);
    if (kind === 'rxTax') return openTaxGame();
    if (kind === 'bribe') return bribeModal();
    if (kind === 'achievements') return openModal(achModalHTML());
    if (kind === 'skin') { setSkin(data.skin); toast('Brett-Skin gewechselt.'); return $('#modal').hidden ? null : openModal(menuHTML()); }
    if (kind === 'editor') return openModal(editorHTML());
    if (kind === 'edSave') {
      const b = editorCollect();
      store.set('duli-board', b);
      applyBoardToLobby(b);
      toast(`„${b.name}“ gespeichert (${Object.keys(b.names).length} eigene Namen).`);
      closeModal();
      return App.S && App.S.phase === 'lobby' ? render() : null;
    }
    if (kind === 'edCopy') {
      const code = boardCode(editorCollect());
      try { navigator.clipboard.writeText(code); toast('Brett-Code kopiert. Schick ihn rum!'); } catch (e) { toast(code); }
      return null;
    }
    if (kind === 'edReset') { document.querySelectorAll('[data-ed]').forEach((inp) => { inp.value = ''; }); return null; }
    if (kind === 'edLoad') {
      try {
        const raw = $('#ed-code').value.trim().replace(/^DULI-/, '');
        const j = JSON.parse(decodeURIComponent(escape(atob(raw))));
        const names = {};
        for (const k of Object.keys(j.s || {})) if (D.BOARDS.normal.SPACES[k] && EDIT_TYPES.includes(D.BOARDS.normal.SPACES[k].type)) names[k] = String(j.s[k]).slice(0, 26);
        return openModal(editorHTML({ name: String(j.n || 'Geteiltes Brett').slice(0, 24), names }));
      } catch (e) { return toast('Der Code ist kaputt. Nochmal kopieren?'); }
    }
    if (kind === 'campRetry' || kind === 'campNext') {
      const c = campResult(false);
      if (!c) return null;
      return startLevel(kind === 'campNext' && c.next ? c.next.id : c.lv.id);
    }
    if (kind === 'music') return toggleMusic();
    if (kind === 'tradeTo') { App.trade = { to: data.id }; return tradeModal(); }
    if (kind === 'tradeSend') {
      const vals = (name) => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => (isWorld() ? x.value : Number(x.value)));
      const num = (id) => { const x = document.getElementById(id); return x ? Number(x.value) || 0 : 0; };
      const trade = {
        to: App.trade.to,
        give: { props: vals('give'), money: num('tr-give-money'), jf: num('tr-give-jf') },
        get: { props: vals('get'), money: num('tr-get-money'), jf: num('tr-get-jf') },
      };
      const pid = curP().id;
      closeModal();
      return doAct({ type: 'tradePropose', trade }, pid);
    }
    if (kind === 'cancelBankrupt') { App.confirmBankrupt = false; return render(); }
    if (kind === 'rematch') {
      const old = S.players;
      const N = E.newGame();
      N.settings = Object.assign({}, S.settings || N.settings);
      old.forEach((p) => {
        E.addPlayer(N, p.id, p.name);
        Object.assign(N.players[N.players.length - 1], { token: p.token, connected: p.connected, bot: !!p.bot });
      });
      App.disp = {};
      App.czSeq = null; App.castKey = null; App.qrInit = false;
      App.S = N;
      startByMode(N);
      closeModal();
      return commit();
    }
    if (kind === 'endGame') {
      ENG().endGame(S);
      closeModal();
      return commit();
    }
    if (kind === 'copy') return copyLink();
    if (kind === 'leave') return leaveRoom();
  }

  // ---------- Reaktionen ----------
  $('#reactions').innerHTML = REACTIONS.map((r) => `<button data-react="${esc(r)}" class="${/^[A-Z0-9 ]+$/.test(r) ? 'txt' : ''}">${esc(r)}</button>`).join('');
  $('#reactions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-react]');
    if (!b) return;
    const r = b.dataset.react;
    if (App.mode === 'client') Net.send({ type: 'react', r });
    else sendReaction(App.mode === 'local' ? curP().id : myId, r);
  });
  function sendReaction(pid, r) {
    if (App.mode === 'host') Net.broadcast({ type: 'react', pid, r });
    showBubble(pid, r);
  }
  function showBubble(pid, r) {
    const p = P(pid);
    if (!p || !REACTIONS.includes(r)) return;
    const b = document.createElement('div');
    b.className = 'bubble';
    b.style.setProperty('--pc', p.color);
    b.style.left = (8 + Math.random() * 55) + '%';
    b.innerHTML = `${tokHTML(p.token, p.color)}<span>${esc(p.name)}</span><span class="r ${/^[A-Z0-9 ]+$/.test(r) ? 'txt' : ''}">${esc(r)}</span>`;
    $('#bubbles').appendChild(b);
    FX.play('pop');
    setTimeout(() => b.remove(), 2900);
  }

  // ---------- Chat ----------
  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#chat-in');
    const text = inp.value.trim().slice(0, 80);
    if (!text || !App.S) return;
    inp.value = '';
    if (App.mode === 'client') Net.send({ type: 'chat', text });
    else sendChat(App.mode === 'local' ? curP().id : myId, text);
  });
  function sendChat(pid, text) {
    if (App.mode === 'host') Net.broadcast({ type: 'chat', pid, text });
    showChat(pid, text);
  }
  function showChat(pid, text) {
    const p = P(pid);
    if (!p) return;
    text = String(text).slice(0, 80);
    App.chat.push({ name: p.name, text });
    if (App.chat.length > 30) App.chat.shift();
    $('#chat-panel').hidden = false;
    $('#chat-log').innerHTML = App.chat.slice().reverse().map((m) => `<li><strong>${esc(m.name)}:</strong> ${esc(m.text)}</li>`).join('');
    const b = document.createElement('div');
    b.className = 'bubble is-chat';
    b.style.setProperty('--pc', p.color);
    b.style.left = (6 + Math.random() * 30) + '%';
    b.innerHTML = `${tokHTML(p.token, p.color)}<span class="msg"><strong>${esc(p.name)}:</strong> ${esc(text)}</span>`;
    $('#bubbles').appendChild(b);
    FX.play('pop');
    setTimeout(() => b.remove(), 4600);
  }

  // April spricht über ihre Begleiter-Sprechblase unten rechts
  function showApril(text, delay = 900) {
    delay = Math.max(delay, (App.busyUntil || 0) - Date.now() + 250);
    clearTimeout(App.aprilShowT);
    App.aprilShowT = setTimeout(() => aprilSay(text.replace(/^„|“$/g, '')), delay);
  }

  // ---------- Figuren laufen Feld für Feld ----------
  function animateTokens() {
    const S = App.S;
    if (!S || S.phase === 'lobby' || isWorld()) return;
    if (Date.now() < (App.walkAfter || 0)) {
      renderBoard();
      App.animT = setTimeout(() => { App.animT = null; animateTokens(); }, App.walkAfter - Date.now());
      return;
    }
    let moving = false;
    for (const p of S.players) {
      const d = App.disp[p.id];
      if (d == null || p.bankrupt) { App.disp[p.id] = p.pos; continue; }
      if (d === p.pos) continue;
      const fwd = (p.pos - d + BRD.N) % BRD.N;
      if (fwd > 0 && fwd <= 13 * BRD.stepMult && !(p.inJail && p.pos === BRD.JAIL)) { App.disp[p.id] = (d + 1) % BRD.N; moving = true; }
      else App.disp[p.id] = p.pos;
    }
    renderBoard();
    followCam();
    if (moving) { FX.play('step'); App.animT = setTimeout(animateTokens, hopMs()); }
    else App.animT = null;
  }

  // Neuer Wurf im klassischen Modus: Würfel ausrollen lassen, dann laufen, erst danach Aktionen
  function planClassicMove() {
    const S = App.S;
    if (S.rollId === App.lastClassicRoll) return;
    const first = App.lastClassicRoll == null;
    App.lastClassicRoll = S.rollId;
    if (first) return;
    const p = curP();
    const d = App.disp[p.id];
    let dist = d == null ? 0 : (p.pos - d + BRD.N) % BRD.N;
    if (dist > 13 * BRD.stepMult || (p.inJail && p.pos === BRD.JAIL)) dist = 0;
    App.walkAfter = Date.now() + T().dice;
    clearTimeout(App.animT); App.animT = null;
    rattle();
    holdActions(T().dice + dist * hopMs() + 150);
  }
  // Auf dem MEGA-Brett läuft die Figur doppelt so weit, also schneller pro Feld
  const hopMs = () => Math.round(T().hop / BRD.stepMult * 1.1);

  // MEGA-Brett gezoomt: Kamera folgt der Figur, die gerade dran ist
  function followCam() {
    const wrap = $('#board-wrap');
    if (BRD.id !== 'mega' || !wrap.classList.contains('is-zoomed') || !App.S) return;
    const p = curP(), cell = document.querySelector(`#board .cell[data-i="${App.disp[p.id] ?? p.pos}"]`);
    if (!cell) return;
    const wr = wrap.getBoundingClientRect(), cr = cell.getBoundingClientRect();
    const left = wrap.scrollLeft + cr.left - wr.left - wr.width / 2 + cr.width / 2;
    const top = wrap.scrollTop + cr.top - wr.top - wr.height / 2 + cr.height / 2;
    if (Math.abs(left - wrap.scrollLeft) > 4 || Math.abs(top - wrap.scrollTop) > 4) wrap.scrollTo({ left, top, behavior: fastMode ? 'auto' : 'smooth' });
  }

  // Aktionen (Kaufen, Karten, Geldanzeigen) erst zeigen, wenn alles durch ist
  function holdActions(ms) {
    App.busyUntil = Math.max(App.busyUntil || 0, Date.now() + ms);
    clearTimeout(App.busyT);
    App.busyT = setTimeout(() => { if (App.S) render(); }, App.busyUntil - Date.now() + 40);
  }
  const isBusy = () => Date.now() < (App.busyUntil || 0);
  // Im langsamen Modus klappern die Würfel länger
  function rattle() {
    if (fastMode) return;
    [450, 900, 1300].forEach((t) => setTimeout(() => FX.play('roll'), t));
  }

  // ---------- Sounds aus dem Verlauf ----------
  const SOUND_RULES = [
    ['win', /gewinnt(?!.*\bbei\b)/], ['pot', /Spardose/], ['jail', /nach Düsseldorf/],
    ['jail', /Übernahme|KOLLABIERT|Sturm-Warnung/], ['pot', /Loot-Kiste/], ['card', /Aufzug|Rutsche|springt durch/], ['build', /baut/], ['card', /zieht eine|April-News|fliegt/], ['roll', /würfelt/], ['step', /reist nach/],
  ];
  function playSounds() {
    const S = App.S;
    const seq = S.logSeq || 0;
    if (App.seenSeq == null) { App.seenSeq = seq; return; }
    const n = Math.min(seq - App.seenSeq, S.log.length);
    App.seenSeq = seq;
    if (n <= 0) return;
    const freshLines = S.log.slice(-n);
    const fresh = freshLines.join('\n');
    const aprilLine = freshLines.filter((l) => l.startsWith('April:') || /April-News|April-Chaos|^(⚡|💸|💖|💀) (Blitz|Millionär|April-Chaos|Hardcore)/.test(l)).pop();
    if (aprilLine) showApril(aprilLine.replace(/^April:\s*/, '').replace(/^📰 April-News, Runde \d+: /, '📰 '));
    const hit = SOUND_RULES.find(([, re]) => re.test(fresh));
    if (hit) FX.play(hit[0]);
    const cur = curP();
    if (S.phase === 'play' && App.mode !== 'local' && cur.id === myId && App.lastCurId !== myId) {
      setTimeout(() => FX.play('turn'), 450);
      try { navigator.vibrate && navigator.vibrate(120); } catch (e) { /* egal */ }
    }
    App.lastCurId = cur.id;
  }
  document.addEventListener('pointerdown', () => FX.unlock(), { once: true });
  $('#btn-sound').textContent = FX.muted ? '🔇' : '🔊';
  $('#btn-sound').onclick = () => { $('#btn-sound').textContent = FX.toggle() ? '🔇' : '🔊'; };

  // ---------- Topbar ----------
  $('#btn-mine').onclick = () => {
    const on = $('#board-wrap').classList.toggle('show-mine');
    $('#btn-mine').textContent = on ? '🏠 Alle Felder' : '🏠 Meine Felder';
    $('#btn-mine').classList.toggle('is-on', on);
  };
  $('#btn-zoom').onclick = () => {
    const w = $('#board-wrap');
    w.classList.toggle('is-zoomed');
    const mega = !isWorld() && BRD.id === 'mega';
    $('#btn-zoom').textContent = w.classList.contains('is-zoomed') ? (mega ? 'Übersicht' : 'Normal') : 'Zoom';
    followCam();
  };
  $('#btn-rules').onclick = () => (App.S && (App.S.isWar || App.S.isPol) ? openModal(App.S.isWar ? `<h2>🪖 DULIDANOPOLY WAR</h2><div class="rules"><p>Das klassische Brett, aber jede Straße ist ein Gebiet. Wer zuletzt nicht pleite ist, gewinnt.</p>
    <h3>Truppen</h3><ul><li>Alle starten mit 12 Truppen. Über LOS gibt es 4 neue, plus 1 pro 3 eigenen Feldern.</li><li>Truppen stationierst du in deinen Gebieten (unten bei deinen Feldern: +1🪖, +3🪖).</li></ul>
    <h3>Fremdes Gebiet</h3><ul><li>Entweder Tribut zahlen (die normale Miete) oder angreifen.</li><li>Verteidigung = 1 Miliz + Besatzung + 2 pro Haus (Bunker) + 2, wenn die ganze Farbgruppe einer Person gehört.</li>
    <li>Gekämpft wird wie bei Risiko: bis zu 3 Angriffswürfel gegen 2 Verteidigungswürfel, bei Gleichstand gewinnt die Verteidigung.</li><li>Sieg: Das Gebiet gehört dir, ein Haus wird zerstört, die Überlebenden bleiben als Besatzung. Niederlage: Truppen weg und halbe Miete als Reparationen.</li></ul></div>`
    : `<h2>🏛️ DULIDANOPOLY POLITICS</h2><div class="rules"><p>Das klassische Brett, aber jede Straße ist ein Wahlkreis. Gewonnen hat, wer zuletzt nicht pleite ist – oder wer drei Wahlen gewinnt.</p>
    <h3>Wahlen</h3><ul><li>Alle 5 Runden ist Bundestagswahl. Stimmen: jedes Feld 1 (+1 pro Haus, ×1,5 bei ganzer Farbgruppe), 1 pro Ð400 Bargeld, Wahlkampfspenden (1 pro Ð100), +2 wenn April dich liebt.</li>
    <li>100 Sitze werden verteilt. Mehr als 50: allein regieren. Sonst Koalition mit Platz 2 (Vize).</li><li>Diäten: Kanzler Ð100 pro Runde, Vize Ð50.</li></ul>
    <h3>Gesetze</h3><ul>${Object.values(E.LAWS).map((L) => `<li>${L.icon} <strong>${L.name}:</strong> ${esc(L.text)}</li>`).join('')}</ul><p>Nach jeder Wahl darf die Regierung aus drei zufälligen Gesetzen eins wählen.</p></div>`) : isReal() ? openModal(realRulesHTML()) : App.S && App.S.isLogi ? openModal(`<h2>🚆 DULIDANOPOLY LOGISTICS</h2><div class="rules">
    <p>Auf dem Brett gibt es nur Bahnhöfe, Flughäfen und Häfen. Wer zuletzt nicht pleite ist, gewinnt.</p>
    <h3>Bahnhöfe & Schienen</h3><ul><li>20 deutsche Bahnhöfe. Allein bringt ein Bahnhof wenig Miete.</li>
      <li>Gehören dir zwei Bahnhöfe, die durch eine echte Strecke verbunden sind, kannst du Schienen legen. Teuer: Ð100 + Ð3 pro Kilometer.</li>
      <li>Miete = Grundmiete × Netzgröße². 2 verbundene Bahnhöfe = 4-fach, 5 = 25-fach, 10 = 100-fach. Du kannst mehrere kleine Netze haben und sie später verbinden.</li>
      <li>Hypothek auf einen Bahnhof unterbricht das Netz. Wechselt ein Bahnhof den Besitzer, werden die Schienen daran abgebaut.</li></ul>
    <h3>Flughäfen & Häfen</h3><ul><li>4 Flughäfen (Ð25/50/100/200) und 4 Häfen (Ð30/60/120/240) zählen wie Bahnhöfe im Klassiker.</li>
      <li>Jeder eigene Flughafen oder Hafen gibt +10 % auf alle deine Bahnhöfe.</li></ul>
    <h3>Sonst</h3><ul><li>Würfeln, kaufen, versteigern, handeln, Karten, Stellwerk (statt Düsseldorf) wie im Klassiker. Über LOS gibt es Ð200.</li></ul></div>`) : isWorld() ? openModal(worldRulesHTML()) : openModal(`<h2>Regeln</h2><div class="rules">
    <p>Alle starten mit ${M(Math.round(((App.S && App.S.settings && App.S.settings.startMoney) || D.START_MONEY) * BRD.moneyMult))}. Wer zuletzt nicht pleite ist, gewinnt. Bezahlt wird in Dulis (Ð).</p>
    ${BRD.id === 'mega' ? '<h3>🚀 MEGA-Brett</h3><ul><li>Einmal um die Welt: 120 Felder, von Duisburg und Öhringen über Afrika, Südamerika, Asien und Europa bis New York – und ganz am Ende das DULIDAN HQ.</li><li>Du läufst doppelt so weit, wie du würfelst. Startgeld ×1,5, über LOS gibt es Ð300.</li><li>Gebaut wird erst, wenn dir die ganze Gruppe gehört – meistens 4 Straßen. Handeln lohnt sich!</li><li>„Übersicht“ zeigt das ganze Brett, im Zoom folgt die Kamera der Figur.</li></ul>' : BRD.id === 'mini' ? '<h3>⚡ MINI-Brett</h3><ul><li>24 Felder mit den wichtigsten Straßen, jede Farbgruppe hat nur 2 Felder.</li><li>Weniger Startgeld, über LOS gibt es Ð100. Schnelle Runde für zwischendurch.</li></ul>' : ''}
    <h3>Dein Zug</h3><ul>
      <li>Würfeln und ziehen. Bei einem Pasch darfst du nochmal. Drei Pasch hintereinander: ab nach Düsseldorf.</li>
      <li>Freies Feld: kaufen oder versteigern lassen. Fremdes Feld: Miete zahlen.</li>
      <li>Über LOS gibt es ${M(BRD.go)}.</li>
      <li>🐷 Aprils Spardose: Alle Steuern und Strafen an die Bank landen im Topf. Wer auf „Aprils Pause“ kommt, bekommt alles.</li></ul>
    <h3>Bauen</h3><ul>
      <li>Häuser baust du, wenn dir die ganze Farbgruppe gehört. Gleichmäßig bauen, nach 4 Häusern kommt das Hotel.</li>
      <li>Eine ganze Farbgruppe ohne Häuser bringt doppelte Miete.</li></ul>
    <h3>Geld knapp?</h3><ul>
      <li>Hypothek: halber Kaufpreis sofort, keine Miete solange. Einlösen kostet 10 % mehr.</li>
      <li>Häuser verkaufst du für den halben Preis zurück. Handeln geht in deinem Zug.</li>
      <li>Kannst du nicht zahlen, bist du bankrott.</li></ul>
    <h3>UH! Schreckensort Düsseldorf</h3><ul>
      <li>Raus kommst du mit Pasch, ${M(50)} oder einer Freikarte. Nach dem 3. Fehlversuch musst du zahlen.</li></ul>
    <h3>Extras</h3><ul>
      <li>🤖 Bots kann der Host in der Lobby hinzufügen. Sie spielen automatisch.</li>
      <li>Hausregeln (Startgeld, Spardose, Doppelt auf LOS) stellt der Host in der Lobby ein.</li>
      <li>Am Ende gibt es Awards wie Miethai, Pasch-König und Düsseldorf-Stammgast.</li></ul>
    ${App.S && App.S.isCasino ? casinoRulesHTML() : ''}
    ${moodRulesHTML()}
    ${variantRulesHTML()}
    <h3>Figuren</h3><ul>${Object.values(TOKENS).map((t) => `<li><strong>${esc(t.name)}:</strong> ${esc(t.power)}</li>`).join('')}</ul></div>`));
  function variantRulesHTML() {
    const cur = (App.S && App.S.settings && App.S.settings.variant) || 'normal';
    const st = (App.S && App.S.settings) || {};
    const active = ruleCards(st, isWorld()).filter((r) => r.on);
    return `<h3>Hausregeln in diesem Spiel</h3><ul>${active.length ? active.map((r) => `<li>${r.icon} <strong>${r.name}:</strong> ${esc(r.text)}</li>`).join('') : '<li>Keine Extra-Regeln aktiv.</li>'}</ul>
      <h3>Spielvarianten</h3><ul>${VARIANTS.map((v) => `<li>${varIcon(v)} <strong>${v.name}${v.id === cur ? ' (läuft gerade)' : ''}:</strong> ${esc(isWorld() && v.boardText ? v.boardText : v.text)}</li>`).join('')}</ul>`;
  }
  function toggleMusic() {
    const on = FX.music(!FX.musicOn);
    $('#btn-music').classList.toggle('is-on', on);
    toast(on ? '🎵 Musik an. April legt auf.' : '🎵 Musik aus.');
    if (!$('#modal').hidden && $('#modal-body h2') && $('#modal-body h2').textContent === 'Menü') openModal(menuHTML());
  }
  $('#btn-music').onclick = toggleMusic;
  $('#btn-music').classList.toggle('is-on', FX.musicOn);
  const menuHTML = () => {
    const host = App.mode !== 'client';
    return `<h2>Menü</h2><h3 class="ach-title">🎨 Brett-Skin</h3>${skinPickerHTML()}<div class="btn-row" style="flex-direction:column;margin-top:14px">
      ${uiBtn(FX.musicOn ? '🎵 Musik ausschalten' : '🎵 Musik einschalten', 'music')}
      ${App.mode !== 'local' ? uiBtn(`Einladungslink kopieren (Raum ${esc(App.code)})`, 'copy') : ''}
      ${uiBtn('🏅 Erfolge ansehen', 'achievements')}
      ${host && App.S.phase === 'play' ? uiBtn('Spiel jetzt beenden – Reichster gewinnt', 'endGame') : ''}
      ${uiBtn(App.mode === 'host' ? 'Raum verlassen (Spiel bleibt gespeichert)' : 'Zur Startseite', 'leave', 'btn-ghost')}
    </div>
    ${App.mode === 'host' ? '<p class="action-note" style="margin-top:12px">Du bist der Host. Wenn du die Seite schließt, pausiert das Spiel für alle. Über die Startseite kannst du den Raum später fortsetzen.</p>' : ''}`;
  };
  $('#btn-menu').onclick = () => openModal(menuHTML());


  // ================= DULIDAN WORLD =================
  const V = WD.VIEW;
  const projX = (lon) => (lon - V.lonMin) * V.scale;
  const projY = (lat) => (V.latMax - lat) * V.scale;
  const MAP_W = (V.lonMax - V.lonMin) * V.scale, MAP_H = (V.latMax - V.latMin) * V.scale;

  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function nodeHTML(c, x, y, g, lab) {
    const [lx, ly, anchor] = { n: [0, -17, 'middle'], s: [0, 26, 'middle'], e: [16, 4, 'start'], w: [-16, 4, 'end'] }[lab || 'n'];
    const t = c.type || 'prop';
    const color = t === 'prop' ? g.ZONES[c.zone].color : t === 'event' && c.deck === 'studio' ? '#a78bff' : { portal: '#3ad1ff', loot: '#ffd83a', event: '#ff7ae6', lift: '#3ce08a', slide: '#ff4fd8', free: '#efeaf7', boost: '#3ad1ff', oil: '#8a83a0', coin: '#ffd83a', shop: '#2fe08a', throne: '#ffd23a', quiz: '#a78bff' }[t] || '#efeaf7';
    const icon = { portal: '🌀', loot: '🎁', lift: '⬆', slide: '⬇', boost: '⏩', oil: '🛢️', coin: '🪙', shop: '🔧', throne: '👑', quiz: '❓' }[t];
    const inner = t === 'event' ? (c.deck === 'studio' ? '<text class="nicon" y="4.5">💜</text>' : '<use href="#april" x="-9" y="-9" width="18" height="18"/>')
      : icon ? `<text class="nicon" y="4.5">${icon}</text>`
      : t === 'free' ? `<text class="nicon" y="4">${c.icon || (c.hub ? '⇄' : c.id === 'r3s' ? '🚀' : c.id === 'in' ? '🚪' : '•')}</text>` : '';
    return `<g class="city n-${t}${c.hub ? ' n-hub' : ''}" data-city="${c.id}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${esc(c.name)}">
      <circle class="hit" r="15"/>
      <circle class="reach" r="17"/>
      <circle class="own" r="16"/>
      <circle class="ring" r="${t === 'prop' ? 11 : 12}" style="stroke:${color}"/>
      <circle class="core" r="${t === 'prop' ? 7 : 9}"/>
      ${inner}
      <text class="lvl" y="3.5"></text>
      ${c.hub && g.id === 'world' ? '<text class="hub" x="10" y="-9">✈</text>' : ''}
      <text class="cname" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(c.name)}</text>
      <g class="ctoks"></g>
    </g>`;
  }

  function worldMapHTML() {
    const g = W.board('world');
    let dots = '';
    for (let lat = V.latMax; lat >= V.latMin; lat -= 2.5) {
      for (let lon = V.lonMin; lon <= V.lonMax; lon += 2.5) {
        const L = lon > 180 ? lon - 360 : lon;
        if (WD.LAND.some((poly) => inPoly(L, lat, poly))) dots += `<circle cx="${projX(lon).toFixed(1)}" cy="${projY(lat).toFixed(1)}" r="3.2"/>`;
      }
    }
    let routes = '';
    for (const [a, b, kind] of g.ROUTES) {
      const A = g.CITY[a], B = g.CITY[b];
      const ax = projX(A.lon), ay = projY(A.lat), bx = projX(B.lon), by = projY(B.lat);
      const cls = `route${kind === 'sea' ? ' sea' : ''}`;
      if (Math.abs(A.lon - B.lon) > 180) {
        // Pazifik: über den Kartenrand
        const [wx, wy, ex, ey] = A.lon > B.lon ? [ax, ay, bx, by] : [bx, by, ax, ay];
        const my = (wy + ey) / 2;
        routes += `<path class="${cls}" data-r="${a}-${b}" d="M${wx},${wy} Q${(wx + MAP_W) / 2},${my - 30} ${MAP_W},${my}"/>`;
        routes += `<path class="${cls}" data-r="${a}-${b}" d="M0,${my} Q${ex / 2},${my - 30} ${ex},${ey}"/>`;
      } else {
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        const len = Math.hypot(bx - ax, by - ay);
        const bend = kind === 'sea' ? Math.min(60, len * 0.18) : len * 0.08;
        routes += `<path class="${cls}" data-r="${a}-${b}" d="M${ax},${ay} Q${mx + ((by - ay) / len) * bend},${my - ((bx - ax) / len) * bend} ${bx},${by}"/>`;
      }
    }
    const cities = g.CITIES.map((c) => nodeHTML(g.CITY[c.id], projX(c.lon), projY(c.lat), g, WD.LABELS[c.id])).join('');
    return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" class="world-svg" role="img" aria-label="Weltkarte">
      <defs><radialGradient id="wglow" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#8122b5" stop-opacity=".28"/><stop offset="1" stop-color="#0e0b13" stop-opacity="0"/></radialGradient></defs>
      <rect width="${MAP_W}" height="${MAP_H}" fill="url(#wglow)"/>
      <g class="land">${dots}</g><g class="routes">${routes}</g><g class="cities">${cities}</g>
      <text class="map-title" x="${MAP_W - 16}" y="${MAP_H - 14}" text-anchor="end">DULIDAN WORLD</text>
    </svg>`;
  }

  // ROYALE, METRO, TOWER: Bretter mit festen x/y-Koordinaten
  function boardMapHTML(g) {
    const Vw = g.VIEW.w, Vh = g.VIEW.h;
    let decor = '', routes = '';
    if (g.id === 'royale') {
      const { cx, cy, rings } = g.VIEW;
      decor += `<circle class="core-glow" cx="${cx}" cy="${cy}" r="95"/>`;
      rings.forEach((r, i) => { decor += `<circle class="orbit" data-ring="${3 - i}" cx="${cx}" cy="${cy}" r="${r}"/>`; });
      decor += logoSVG().replace('<svg viewBox="0 0 700 620"', `<svg x="${cx - 42}" y="${cy - 37}" width="84" height="74" viewBox="0 0 700 620" class="core-logo"`);
      for (let i = 0; i < 60; i++) decor += `<circle class="star" cx="${(i * 137.5) % Vw}" cy="${(i * 89.3 + 40) % Vh}" r="${(i % 3) * 0.6 + 0.6}"/>`;
    }
    if (g.id === 'islands') {
      for (let i = 0; i < 46; i++) decor += `<path class="wave" d="M${(i * 173) % Vw} ${(i * 97 + 30) % Vh} q8 -6 16 0 t16 0"/>`;
      for (const z of Object.keys(g.ZONES)) {
        const ns = g.CITIES.filter((c) => c.zone === z || c.id === `${z}H`);
        const xs = ns.map((c) => c.x), ys = ns.map((c) => c.y);
        const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
        decor += `<ellipse class="isle" cx="${mx}" cy="${my}" rx="${(Math.max(...xs) - Math.min(...xs)) / 2 + 34}" ry="${(Math.max(...ys) - Math.min(...ys)) / 2 + 30}" style="--g:${g.ZONES[z].color}"/>`;
      }
    }
    if (g.id === 'race') {
      const { cx, cy, rx, ry } = g.VIEW;
      decor += `<ellipse class="track" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/><ellipse class="track-line" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
      decor += `<ellipse class="track-grass" cx="${cx}" cy="${cy}" rx="${rx - 60}" ry="${ry - 60}"/>`;
      for (let k = 0; k < 8; k++) decor += `<rect class="chk${k % 2 ? ' b' : ''}" x="${cx - 8 + (k % 2) * 8}" y="${cy - ry - 24 + Math.floor(k / 2) * 12}" width="8" height="12"/>`;
      decor += `<text class="fest-title" x="${cx}" y="${cy + 12}" text-anchor="middle">DULIDAN RACE</text><text class="fest-sub" x="${cx}" y="${cy + 44}" text-anchor="middle">${g.RULES.race.laps} RUNDEN · VOLLGAS</text>`;
    }
    if (g.id === 'throne') {
      const { cx, cy } = g.VIEW;
      decor += `<rect class="castle" x="${cx - 120}" y="${cy - 90}" width="240" height="180" rx="8"/>`;
      for (let k = 0; k < 4; k++) decor += `<rect class="castle-tower" x="${k % 2 ? cx + 98 : cx - 142}" y="${k < 2 ? cy - 112 : cy + 68}" width="44" height="44" rx="4"/>`;
      decor += `<circle class="throne-glow" cx="${cx}" cy="${cy}" r="46"/>`;
    }
    if (g.id === 'quiz') {
      const { cx, cy } = g.VIEW;
      decor += `<rect class="tv" x="${cx - 170}" y="${cy - 100}" width="340" height="200" rx="16"/><text class="fest-title" x="${cx}" y="${cy - 10}" text-anchor="middle">QUIZ-SHOW</text><text class="fest-sub" x="${cx}" y="${cy + 24}" text-anchor="middle">MIT APRIL · LIVE</text><text class="tv-q" x="${cx}" y="${cy + 80}" text-anchor="middle">? ? ?</text>`;
    }
    if (g.id === 'bomb') {
      const { cx, cy } = g.VIEW;
      decor += `<ellipse class="hazard" cx="${cx}" cy="${cy}" rx="300" ry="190"/><circle class="crater" cx="${cx}" cy="${cy}" r="90"/><text class="bomb-big" x="${cx}" y="${cy + 30}" text-anchor="middle">💣</text>`;
    }
    if (g.id === 'festival') {
      const { cx, cy, rx, ry } = g.VIEW;
      decor += `<ellipse class="fest-ground" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
      decor += `<rect class="fest-stage" x="${cx - 150}" y="${cy - 70}" width="300" height="120" rx="10"/><text class="fest-title" x="${cx}" y="${cy - 8}" text-anchor="middle">DULIDAN</text><text class="fest-sub" x="${cx}" y="${cy + 26}" text-anchor="middle">FESTIVAL · MAIN STAGE</text>`;
      for (let i = 0; i < 7; i++) decor += `<path class="fest-beam" d="M${cx - 120 + i * 40} ${cy - 70} L${cx - 220 + i * 73} ${cy - 220}" style="animation-delay:${i * 0.3}s"/>`;
    }
    if (g.id === 'tower') {
      const floors = [...new Set(g.CITIES.map((c) => c.floor))];
      floors.forEach((f) => {
        const ys = g.CITIES.filter((c) => c.floor === f).map((c) => c.y);
        const y0 = Math.min(...ys) - 34, y1 = Math.max(...ys) + 34;
        const z = Object.values(g.ZONES).find((zz) => zz.floor === f);
        decor += `<rect class="floor" x="80" y="${y0}" width="${Vw - 120}" height="${y1 - y0}" rx="14" style="--g:${z.color}"/>`;
        decor += `<text class="floor-label" transform="translate(64 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">${f} · ${esc(z.name.toUpperCase())}</text>`;
      });
      decor += `<path class="tower-roof" d="M80 ${Math.min(...g.CITIES.map((c) => c.y)) - 60} L${Vw / 2} 10 L${Vw - 40} ${Math.min(...g.CITIES.map((c) => c.y)) - 60}"/>`;
    }
    for (const [a, b, kind, zone] of g.ROUTES) {
      const A = g.CITY[a], B = g.CITY[b];
      if (kind === 'ring' && (g.id === 'royale' || g.id === 'race')) continue;
      if (kind === 'slide') {
        const mx = Math.min(A.x, B.x) - 70;
        routes += `<path class="route r-slide" data-r="${a}-${b}" d="M${A.x},${A.y} C${mx},${A.y} ${mx},${B.y} ${B.x},${B.y}"/>`;
        continue;
      }
      const style = kind === 'line' ? ` style="stroke:${g.ZONES[zone].color}"` : '';
      routes += `<path class="route r-${kind}" data-r="${a}-${b}"${style} d="M${A.x},${A.y} L${B.x},${B.y}"/>`;
    }
    const cities = g.CITIES.map((c) => nodeHTML(g.CITY[c.id], c.x, c.y, g, c.lab)).join('');
    return `<svg viewBox="0 0 ${Vw} ${Vh}" class="world-svg board-${g.id}" role="img" aria-label="${esc(g.title)}">
      <defs><radialGradient id="wglow-${g.id}" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#8122b5" stop-opacity=".3"/><stop offset="1" stop-color="#0e0b13" stop-opacity="0"/></radialGradient></defs>
      <rect width="${Vw}" height="${Vh}" fill="url(#wglow-${g.id})"/>
      <g class="decor">${decor}</g><g class="routes">${routes}</g><g class="cities">${cities}</g>
      <text class="map-title" x="${Vw - 16}" y="${Vh - 14}" text-anchor="end">${esc(g.title)}</text>
    </svg>`;
  }

  function buildWorld() {
    const el = $('#world');
    const mode = App.S.mode;
    if (el.dataset.built === mode) return;
    el.dataset.built = mode;
    el.innerHTML = mode === 'world' ? worldMapHTML() : boardMapHTML(GB());
    if (el.dataset.listen) return;
    el.dataset.listen = '1';
    el.addEventListener('click', (e) => {
      const g = e.target.closest('.city');
      if (g) worldClick(g.dataset.city);
    });
    el.addEventListener('keydown', (e) => {
      const g = e.target.closest('.city');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); worldClick(g.dataset.city); }
    });
  }

  // ================= 3D-WÜRFEL =================
  const CUBE_ROT = { 1: [0, 0], 2: [0, -90], 3: [0, 90], 4: [-90, 0], 5: [90, 0], 6: [0, 180] };
  function cubeHTML(id, special) {
    let faces = '';
    for (let f = 1; f <= 6; f++) {
      let inner;
      if (special) {
        const face = GB().FACES[f - 1];
        inner = face.icon === 'D' ? `<span class="dlogo">${logoSVG()}</span>` : face.id === 'april' ? `<span class="dlogo">${aprilIcon('die-april')}</span>` : `<span class="ficon">${face.icon}</span>`;
      } else {
        inner = '';
        for (let k = 0; k < 9; k++) inner += PIPS[f].includes(k) ? '<i></i>' : '<span></span>';
      }
      faces += `<div class="face f${f}">${inner}</div>`;
    }
    return `<div class="die3d${special ? ' special' : ''}" id="${id}"><div class="cube">${faces}</div></div>`;
  }
  // Würfel auf Augenzahl drehen; bei neuem Wurf mit mehreren Überschlägen
  function setCube(el, value, roll) {
    if (!el) return;
    const cube = el.querySelector('.cube');
    const [x, y] = CUBE_ROT[value] || CUBE_ROT[1];
    if (roll) {
      el.spins = (el.spins || 0) + 1;
      el.classList.remove('is-thrown'); void el.offsetWidth; el.classList.add('is-thrown');
    }
    const n = el.spins || 0;
    const tilt = roll ? (Math.random() < 0.5 ? 1 : -1) : 1;
    cube.style.transform = `rotateX(${x + 720 * n * tilt}deg) rotateY(${y + 1080 * n}deg)`;
  }

  // Handy schütteln = würfeln
  let lastShake = 0;
  window.addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (mag < 26 || Date.now() - lastShake < 1500) return;
    const b = document.querySelector('#panel-action [data-act*="\"roll\""]:not([disabled])');
    if (b) { lastShake = Date.now(); FX.play('roll'); b.click(); }
  });
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const needsMotionPermission = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
  function shakeHint() {
    if (!coarse) return '';
    if (needsMotionPermission && !App.motionOk) return uiBtn('📳 Schütteln zum Würfeln aktivieren', 'motion', 'btn-ghost btn-small');
    return '<p class="action-note shake">📳 Oder schüttel dein Handy!</p>';
  }
  async function enableMotion() {
    try {
      const r = await DeviceMotionEvent.requestPermission();
      App.motionOk = r === 'granted';
      toast(App.motionOk ? 'Schütteln ist an. Schüttel dein Handy zum Würfeln!' : 'Ohne Erlaubnis geht Schütteln nicht. Tippe einfach auf Würfeln.');
    } catch (e) { toast('Schütteln geht auf diesem Gerät nicht.'); }
    render();
  }

  // ================= WELT: Würfel-Tablett, Laufen, Aktionen =================
  function buildTray() {
    const t = $('#dice-tray');
    if (t.dataset.built === App.S.mode) return;
    t.dataset.built = App.S.mode;
    App.lastWorldRoll = null;
    t.innerHTML = `<div class="tray-dice">${cubeHTML('wd1')}${cubeHTML('wd2')}${cubeHTML('wd3')}${GB().FACES.length ? cubeHTML('wds', true) : ''}</div><div class="tray-label" id="tray-label"></div>`;
  }

  function renderTray() {
    const S = App.S;
    buildTray();
    const roll = S.rollId !== App.lastWorldRoll;
    App.lastWorldRoll = S.rollId;
    const [a, b] = S.dice;
    setCube($('#wd1'), a || 1, roll);
    $('#wd2').hidden = !b;
    if (b) setCube($('#wd2'), b, roll);
    $('#wd3').hidden = !S.die3;
    if (S.die3) setCube($('#wd3'), S.die3, roll);
    const fi = GB().FACES.findIndex((f) => f.id === S.face);
    if ($('#wds') && fi >= 0) setCube($('#wds'), fi + 1, roll);
    const face = GB().FACES[fi];
    const sum = (a || 0) + (b || 0) + (S.die3 || 0);
    const label = S.rollId ? `<strong>${sum}</strong>${face ? ` · ${face.icon === 'D' ? '💜' : face.icon} ${esc(face.name)}` : ''}` : 'Würfeln!';
    const lab = $('#tray-label');
    if (roll && S.rollId > 0) {
      rattle();
      App.busyUntil = Math.max(App.busyUntil || 0, Date.now() + T().dice);
      clearTimeout(App.diceT);
      App.diceT = setTimeout(() => { if (App.S) render(); }, T().dice + 60);
    }
    if (roll) { lab.innerHTML = '…'; setTimeout(() => { lab.innerHTML = label; }, T().dice); } else if (lab.innerHTML !== '…') lab.innerHTML = label;
    return roll;
  }

  // Figuren laufen Stadt für Stadt den gewürfelten Weg ab
  function animateWorld(delay) {
    const S = App.S;
    if (!S || !isWorld()) return;
    App.wdisp = App.wdisp || {};
    for (const p of S.players) if (App.wdisp[p.id] == null || p.id !== S.mover) App.wdisp[p.id] = p.loc;
    if (S.moveId === App.lastMoveId) return;
    App.lastMoveId = S.moveId;
    const mover = S.mover, path = S.path || [];
    if (!mover || path.length < 2) { App.wdisp[mover] = P(mover) ? P(mover).loc : null; return; }
    let i = path.lastIndexOf(App.wdisp[mover]);
    if (i < 0) i = 0;
    const queue = path.slice(i + 1);
    clearTimeout(App.wAnimT);
    // Aktionen erst zeigen, wenn die Figur angekommen ist
    const hopMs = S.flight ? T().flight : T().hopBoard;
    const total = delay + queue.length * hopMs;
    App.busyUntil = Date.now() + total;
    clearTimeout(App.busyT);
    App.busyT = setTimeout(() => { if (App.S) render(); }, total + 60);
    const hop = () => {
      if (!queue.length) { App.wAnimT = null; renderWorld(); return; }
      App.wdisp[mover] = queue.shift();
      FX.play(S.flight ? 'card' : 'step');
      renderWorld();
      App.wAnimT = setTimeout(hop, hopMs);
    };
    App.wAnimT = setTimeout(hop, delay);
  }

  const rentWord = () => (App.S.mode === 'world' ? 'Maut' : 'Miete');
  const words = () => GB().words;
  const NODE_INFO = {
    portal: (c, g) => `🌀 Portal: Springt auf Ring ${g.CITY[c.link] ? g.CITY[c.link].ring : '?'}. Du entscheidest, ob du durchgehst.`,
    loot: () => '🎁 Loot-Kiste: Schild, Boost, Dulis – oder eine Falle.',
    boost: () => '⏩ Boost-Pad: Schießt dich 3 Felder nach vorn.',
    oil: () => '🛢️ Ölfleck: Du rutschst 3 Felder zurück – außer mit Profi-Reifen.',
    coin: () => '🪙 Münzen: Ð30 bis Ð80 zum Einsammeln.',
    shop: () => '🔧 Boxengasse: Motor-Tuning, Profi-Reifen und Nitro kaufen.',
    throne: () => '👑 Der Thron: Wer hier landet, wird König. Alle anderen zahlen zu Zugbeginn Tribut, die Mieten des Königs zählen 1,5×.',
    quiz: (c, g) => `❓ Quizfeld: Richtig beantwortet gibt es ${M(g.RULES.quiz.win)}, falsch kostet ${M(g.RULES.quiz.lose)}.`,
    event: (c) => (c.deck === 'studio' ? '💜 Studio-Karte: Zieh eine Karte aus dem Studio-Stapel. Gut oder schlecht.' : '💖 April-Karte: April zieht für dich eine Karte. Gut oder schlecht.'),
    lift: (c, g) => `⬆ Aufzug: Fährt dich in den ${g.CITY[c.link].floor}. Stock. Wem die Ziel-Etage komplett gehört, kassiert Ð${g.RULES.liftFee}.`,
    slide: (c, g) => `⬇ Rutsche: Wuuuh, runter in den ${g.CITY[c.link].floor}. Stock.`,
    free: (c) => c.info || (c.hub ? '⇄ Umsteigebahnhof: Hier kreuzen sich Linien. Mit 🚄 Express kannst du direkt hierher springen.' : 'Hier passiert nichts. Einfach durchatmen.'),
  };

  function worldTargets() {
    const S = App.S, p = curP();
    if (S.phase !== 'play' || !canControl(p.id) || S.trade) return { walk: [], fly: [] };
    if (S.sub === 'walk') return { walk: W.walkOptions(S), fly: [] };
    if (S.sub === 'jet') return { walk: [], fly: GB().HUBS.filter((h) => h !== p.loc) };
    return { walk: [], fly: [] };
  }

  function worldClick(id) {
    const S = App.S;
    if (!S) return;
    const t = worldTargets(), p = curP();
    if (t.fly.includes(id)) return doAct({ type: 'fly', to: id }, p.id);
    if (t.walk.includes(id)) return doAct({ type: 'step', to: id }, p.id);
    openCity(id);
  }

  function cityDeedHTML(id) {
    const S = App.S, g = GB(), c = g.CITY[id], st = S.cities[id];
    const dead = S.dead && S.dead[id];
    if (!st) {
      const info = NODE_INFO[c.type] ? NODE_INFO[c.type](c, g) : '';
      return `<div class="deed"><div class="deed-head light-text" style="--g:#2a2140">${esc(c.name)}</div><div class="deed-foot" style="border:0;font-size:14px;color:var(--fg)">${dead ? '🌪️ Vom April-Sturm zerstört.' : esc(info)}</div></div>`;
    }
    const z = g.ZONES[c.zone];
    const owner = P(st.owner);
    const rows = g.LEVELS.map((name, i) => `<tr class="${owner && st.level === i ? 'is-now' : ''}"><td>${i === 0 ? `${rentWord()} unbebaut (ganze ${words().zone}: ×2)` : `${rentWord()} mit ${name}`}</td><td>${M(Math.round(c.price * g.RENT_PCT[i] / 5) * 5)}</td></tr>`).join('');
    const sub = [c.real, z.name, z.region, c.hub && g.id === 'world' ? '✈ Flughafen' : '', dead ? '🌪️ zerstört' : ''].filter(Boolean).join(' · ');
    return `<div class="deed"><div class="deed-head" style="--g:${z.color}">${esc(c.name)}<small>${esc(sub)}</small></div>
      <table>${rows}<tr><td>Gebäude kostet</td><td>${M(z.build)}</td></tr><tr><td>Hypothek</td><td>${M(c.price / 2)}</td></tr><tr><td>Kaufpreis</td><td>${M(c.price)}</td></tr></table>
      <div class="deed-foot">${owner ? `Besitzer: <strong>${esc(owner.name)}</strong> · ${GB().LEVELS[st.level]}${st.mort ? ' · mit Hypothek' : ''}` : 'Gehört niemandem'}</div></div>`;
  }
  function openCity(id) { openModal(cityDeedHTML(id)); }

  function renderWorld() {
    const S = App.S;
    buildWorld();
    const t = worldTargets();
    const cur = curP();
    const disp = (p) => (App.wdisp && App.wdisp[p.id] != null ? App.wdisp[p.id] : p.loc);
    const gb = GB();
    const warnRing = S.event && S.event.warn;
    document.querySelectorAll('#world .orbit').forEach((o) => {
      const r = Number(o.dataset.ring);
      o.classList.toggle('is-dead', !!(S.dead && Object.keys(S.dead).some((id) => gb.CITY[id] && gb.CITY[id].ring === r)));
      o.classList.toggle('is-warn', warnRing === r);
    });
    document.querySelectorAll('#world .city').forEach((g) => {
      const id = g.dataset.city, st = S.cities[id] || {};
      const owner = P(st.owner);
      g.style.setProperty('--oc', owner ? owner.color : 'transparent');
      g.classList.toggle('is-owned', !!owner);
      g.classList.toggle('is-mine', !!owner && !!viewer() && owner.id === viewer().id);
      g.classList.toggle('is-mort', !!st.mort);
      g.classList.toggle('is-dead', !!(S.dead && S.dead[id]));
      g.classList.toggle('is-warn', !!warnRing && gb.CITY[id].ring === warnRing);
      g.classList.toggle('is-flood', !!S.flood && gb.CITY[id].zone === S.flood);
      g.classList.toggle('is-headliner', !!S.headliner && gb.CITY[id].zone === S.headliner);
      g.classList.toggle('can-move', t.walk.includes(id));
      g.classList.toggle('can-fly', t.fly.includes(id));
      g.classList.toggle('is-here', S.phase === 'play' && disp(cur) === id);
      g.querySelector('.lvl').textContent = st.level ? ['', '1', '2', '3', '★'][st.level] : '';
      const here = S.players.filter((p) => !p.bankrupt && disp(p) === id);
      const key = here.map((p) => p.id).join(',');
      const tg = g.querySelector('.ctoks');
      if (tg.dataset.key !== key) {
        tg.dataset.key = key;
        tg.innerHTML = here.map((p, i) => {
          const tk = TOKENS[p.token];
          const ox = (i - (here.length - 1) / 2) * 34;
          // Ganz oben am Rand hängen die Figuren unter dem Feld, sonst werden sie abgeschnitten
          const low = Number((g.getAttribute('transform').match(/,\s*([-\d.]+)\)/) || [])[1]) < 60;
          return `<g class="wtok" data-tokpid="${esc(p.id)}" transform="translate(${ox},${low ? 40 : -40})" style="--pc:${p.color}"><line class="pin" y1="${low ? -14 : 14}" y2="${low ? -30 : 30}"/><circle class="halo" r="24"/><g class="bob"><circle class="body" r="17"/>${p.token === 'april' ? '<use href="#april" x="-16" y="-16" width="32" height="32"/>' : `<text y="6.5">${p.token === 'dulidan' ? 'D' : tk.emoji}</text>`}</g></g>`;
        }).join('');
      }
      tg.querySelectorAll('.wtok').forEach((el) => el.classList.toggle('is-cur', S.phase === 'play' && el.dataset.tokpid === cur.id));
      if (here.some((p) => p.id === cur.id) && g.nextElementSibling) g.parentNode.appendChild(g);
    });
    let mc = $('#world .map-card');
    if (!mc) { mc = document.createElement('div'); mc.className = 'map-card'; mc.hidden = true; $('#world').appendChild(mc); }
    const qr = S.quizResult;
    if (!App.qrInit) { App.qrInit = true; App.qrSeen = qr ? qr.seq : 0; }
    if (qr && qr.seq !== App.qrSeen) {
      App.qrSeen = qr.seq; App.qrUntil = Date.now() + 3400;
      FX.play(qr.ok ? 'win' : 'jail');
      clearTimeout(App.qrT); App.qrT = setTimeout(() => { if (App.S && isWorld()) renderWorld(); }, 3500);
    }
    const opts = (q, order, cls) => `<div class="quiz-opts">${order.map((o, k) => `<span class="${cls(o, k)}"><b>${'ABCD'[k]}</b>${esc(q.a[o])}</span>`).join('')}</div>`;
    if (S.sub === 'quiz' && S.quiz && S.phase === 'play' && !isBusy()) {
      const q = gb.QUESTIONS[S.quiz.i], k = `q|${S.turnNo}|${S.quiz.i}|${S.quiz.hidden.join(',')}`;
      if (mc.dataset.key !== k || mc.hidden) {
        mc.dataset.key = k;
        mc.className = 'map-card deck-quiz';
        mc.innerHTML = `<div class="mc-icon">🧠</div><div class="mc-kind">Quizfrage · +${M(gb.RULES.quiz.win)} / −${M(gb.RULES.quiz.lose)}</div><div class="mc-text">${esc(q.q)}</div>${opts(q, S.quiz.order, (o, j) => (S.quiz.hidden.includes(j) ? 'is-hidden' : ''))}<div class="mc-who">${esc(cur.name)} antwortet …</div>`;
        mc.hidden = false;
      }
    } else if (qr && Date.now() < (App.qrUntil || 0)) {
      const q = gb.QUESTIONS[qr.i], k = `r|${qr.seq}`;
      if (mc.dataset.key !== k || mc.hidden) {
        mc.dataset.key = k;
        mc.className = `map-card deck-quiz ${qr.ok ? 'is-right' : 'is-wrong'}`;
        mc.innerHTML = `<div class="mc-icon">${qr.ok ? '✅' : '❌'}</div><div class="mc-kind">${qr.ok ? 'Richtig!' : 'Leider falsch'}</div><div class="mc-text">${esc(q.q)}</div>${opts(q, qr.order, (o, j) => (o === 0 ? 'is-right' : j === qr.k ? 'is-wrong' : ''))}<div class="mc-who">${esc(P(qr.pid).name)} ${qr.ok ? `+${M(gb.RULES.quiz.win)}` : `−${M(gb.RULES.quiz.lose)}`}</div>`;
        mc.hidden = false;
      }
    } else if (S.sub === 'card' && S.card && S.phase === 'play' && !isBusy()) {
      const x = gb.CARDS[S.card.deck][S.card.i];
      const k = `${S.turnNo}|${S.card.deck}|${S.card.i}`;
      if (mc.dataset.key !== k || mc.hidden) {
        mc.dataset.key = k;
        mc.className = `map-card deck-${S.card.deck}`;
        mc.innerHTML = `<div class="mc-icon">${S.card.deck === 'april' ? aprilIcon('mc-april') : '💜'}</div><div class="mc-kind">${S.card.deck === 'april' ? 'April-Karte' : 'Studio-Karte'}</div><div class="mc-text">${esc(x.t)}</div><div class="mc-who">${esc(cur.name)} hat gezogen</div>`;
        mc.hidden = false;
      }
    } else mc.hidden = true;
    document.querySelectorAll('#world .route').forEach((r) => {
      const [a, b] = r.dataset.r.split('-');
      r.classList.toggle('is-open', (a === cur.loc && t.walk.includes(b)) || (b === cur.loc && t.walk.includes(a)));
    });
  }

  function destBtn(S, cur, to, action) {
    const s2 = S.cities[to], cc = GB().CITY[to];
    const o = s2 ? P(s2.owner) : null;
    const toll = o && o.id !== cur.id ? W.rentFor(S, to, cur) : 0;
    const tag = !s2 ? ({ free: cc.hub ? (cc.icon === '⚓' ? '⚓ Hafen' : '⇄ Umsteigen') : 'frei', event: cc.deck === 'studio' ? '💜 Studio-Karte' : '💖 April-Karte', loot: '🎁 Loot', portal: '🌀 Portal', lift: '⬆ Aufzug', slide: '⬇ Rutsche', boost: '⏩ Boost', oil: '🛢️ Öl', coin: '🪙 Münzen', shop: '🔧 Box', throne: '👑 Thron', quiz: '❓ Quiz' }[cc.type] || '')
      : !o ? `frei · ${M(cc.price)}` : o.id === cur.id ? 'deins' : `${rentWord()} ${M(toll)}`;
    const color = s2 ? GB().ZONES[cc.zone].color : '#efeaf7';
    return `<button class="dest ${toll ? 'is-toll' : ''}" data-act='${esc(JSON.stringify(action))}' data-pid="${esc(cur.id)}" style="--g:${color}">
      <span>${esc(cc.name)}</span><small>${tag}</small></button>`;
  }

  function renderWorldAction() {
    const S = App.S, el = $('#panel-action');
    const cur = curP();
    let h = '';
    if (S.event) h += `<div class="news ${S.event.storm ? 'is-storm' : ''}"><strong>${S.event.storm ? '🌪️ April-Sturm' : '📰 April-News'} · Runde ${S.round}${S.maxRounds ? '/' + S.maxRounds : ''}</strong><span>${esc(S.event.t)}</span></div>`;
    const crisis = S.crisis || GB().RULES.crisis, rw = S.mode === 'world' ? 'Mauten' : 'Mieten';
    if (crisis && !S.event?.storm) {
      h += S.inflation
        ? `<div class="news is-storm"><strong>📈 ${S.mode === 'world' ? 'Weltwirtschaftskrise' : 'Dulidan-Krise'}</strong><span>Alle ${rw} +${Math.round(S.inflation * 100)} % – und es wird jede Runde schlimmer.</span></div>`
        : `<div class="news"><strong>📈 Krise in Runde ${crisis.from}</strong><span>Ab dann steigen alle ${rw} jede Runde. Spiel läuft, bis alle bis auf einen pleite sind.</span></div>`;
    }
    if (S.flood) h += `<div class="news is-storm"><strong>🌊 Flut</strong><span>${esc(GB().ZONES[S.flood].name)} steht unter Wasser. Dort zahlt diese Runde niemand Miete.</span></div>`;
    if (S.headliner) h += `<div class="news"><strong>🎤 Headliner</strong><span>${esc(GB().ZONES[S.headliner].name)} spielt heute! Miete dort 3×.</span></div>`;
    if (GB().RULES.throne) h += S.king && P(S.king) ? `<div class="news"><strong>👑 König: ${esc(P(S.king).name)}</strong><span>Alle anderen zahlen zu Zugbeginn Tribut. Die Mieten des Königs zählen 1,5×. Stürm den Thron in der Mitte!</span></div>`
      : '<div class="news"><strong>👑 Der Thron ist frei</strong><span>Wer zuerst auf dem Thron in der Mitte landet, wird König und kassiert Tribut.</span></div>';
    if (S.bomb && P(S.bomb.holder)) h += `<div class="news is-storm"><strong>💣 Bombe bei ${esc(P(S.bomb.holder).name)}</strong><span>Zündschnur: noch ${S.bomb.fuse} ${S.bomb.fuse === 1 ? 'Zug' : 'Züge'}. Weitergeben durch Überholen oder Draufspringen!</span></div>`;
    if (GB().RULES.race) h += `<div class="news"><strong>🏁 ${GB().RULES.race.laps} Runden</strong><span>Wer zuerst ${GB().RULES.race.laps}× über die Ziellinie fährt, gewinnt. Rempler schubsen andere 2 Felder zurück.</span></div>`;
    h += moodNewsHTML();
    if (S.trade) {
      const from = P(S.trade.from), to = P(S.trade.to);
      const side = (sd) => {
        const items = sd.props.map((id) => esc(GB().CITY[id].name));
        if (sd.money) items.push(M(sd.money));
        return items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="empty">nichts</p>';
      };
      h += `<div class="offer"><strong>🤝 ${esc(from.name)} → ${esc(to.name)}</strong>
        <div><small>${esc(from.name)} gibt:</small>${side(S.trade.give)}</div><div><small>${esc(to.name)} gibt:</small>${side(S.trade.get)}</div>
        <div class="btn-row">${canControl(to.id) ? btn('Annehmen', { type: 'tradeAccept' }, to.id, 'btn-primary') + btn('Ablehnen', { type: 'tradeDecline' }, to.id) : ''}
        ${canControl(from.id) && !canControl(to.id) ? btn('Angebot zurückziehen', { type: 'tradeDecline' }, from.id) : ''}
        ${!canControl(to.id) && !canControl(from.id) ? '<p class="action-note">Warte auf Antwort …</p>' : ''}</div></div>`;
    }
    const me = canControl(cur.id);
    h += `<div class="action-head">${tokHTML(cur.token, cur.color)}<div><h3>${me ? (App.mode === 'local' || cur.id !== myId ? `${esc(cur.name)} ist dran` : 'Du bist dran!') : `${esc(cur.name)} ist dran`}</h3>
      <small>${moneyTxt(cur)} · ${esc(GB().CITY[cur.loc].name)}</small></div></div>`;
    if (Date.now() < (App.busyUntil || 0)) {
      el.innerHTML = h + `<p class="action-note rolling">${S.sub === 'walk' ? '🧭 unterwegs …' : '🎲 Die Würfel rollen …'}</p>`;
      return;
    }
    if (!me) {
      const what = { roll: 'würfelt gleich', pick: 'wählt die Schritte', jet: 'sucht sich ein Ziel aus', walk: 'navigiert durchs Netz', buy: 'überlegt, ob gekauft wird', end: 'beendet gleich den Zug', debt: 'muss Schulden begleichen', portal: 'steht vor einem Portal', card: 'liest eine Karte', shop: 'ist in der Boxengasse', quiz: 'grübelt über der Quizfrage' }[S.sub] || '';
      el.innerHTML = h + `<p class="action-note">${esc(cur.name)} ${what} …</p>`;
      return;
    }
    const pid = cur.id;
    const canTrade = !S.trade && S.players.filter((p) => !p.bankrupt).length > 1;
    const face = GB().FACES.find((f) => f.id === S.face);
    switch (S.sub) {
      case 'roll': {
        h += `<div class="btn-row">${btn(S.again ? '🎲 Pasch! Nochmal würfeln' : '🎲 Würfeln', { type: 'roll' }, pid, 'btn-primary btn-roll', !!S.trade)}</div>${shakeHint()}`;
        h += `<p class="action-note">${{
          world: 'Du würfelst mit zwei Würfeln und dem lila Dulidan-Würfel. Deine Figur läuft die Augenzahl über die Routen.',
          metro: 'Du würfelst und fährst die Augenzahl durchs U-Bahn-Netz. Durch fremde komplette Linien zahlst du Fahrpreis.',
          royale: 'Du würfelst und läufst im Uhrzeigersinn um deinen Ring. Portale bringen dich nach innen oder außen.',
          tower: 'Du würfelst und läufst um deine Etage. Aufzüge bringen dich hoch, Rutschen runter.',
          islands: 'Du würfelst und läufst über Strände und Seewege. Der Dulidan-Würfel kann dir eine Fähre schenken.',
          festival: 'Du würfelst und läufst übers Festivalgelände. Achte auf den Headliner – dort ist alles 3× so teuer.',
          race: 'Du würfelst und fährst. Motor-Tuning gibt Extra-Felder, Nitro verdoppelt den Wurf.',
          throne: 'Du würfelst und läufst durch die Burg. Über die Treppen kommst du zum Thron in der Mitte.',
          quiz: 'Du würfelst und läufst durchs Studio. Auf ❓-Feldern stellt April eine Quizfrage.',
          bomb: 'Du würfelst und läufst um die Arena. Hast du die Bombe, überhol jemanden oder spring auf sein Feld!',
        }[S.mode]}</p>`;
        if (cur.items && (cur.items.shield || cur.items.boost)) h += `<p class="action-note">Deine Items: ${cur.items.shield ? `🛡️ ×${cur.items.shield} ` : ''}${cur.items.boost ? `⚡ ×${cur.items.boost}` : ''}</p>`;
        if (canTrade) h += uiBtn('Handeln', 'trade', 'btn-ghost');
        h += bribeBtn(cur);
        break;
      }
      case 'pick': {
        const [lo, hi] = S.pickRange;
        h += `<p class="action-note">${S.face === 'boss' ? '💜 <strong>Dulidan-Power!</strong> Wie weit willst du laufen?' : `🚐 Berlingo-Manöver: Du hast ${lo + 1} gewürfelt. 1 mehr oder weniger?`}</p>`;
        let nums = '';
        for (let n = lo; n <= hi; n++) nums += btn(String(n), { type: 'pickSteps', n }, pid, 'btn-num');
        h += `<div class="btn-row nums">${nums}</div>`;
        break;
      }
      case 'jet': {
        h += S.mode === 'metro'
          ? `<p class="action-note">🚄 <strong>Express!</strong> Spring zu einem Umsteigebahnhof deiner Wahl – oder fahr ganz normal ${S.steps} Stationen.</p>`
          : S.mode === 'islands'
          ? `<p class="action-note">⛴️ <strong>Fähre!</strong> Fahr zu einem Hafen deiner Wahl – oder lauf ganz normal ${S.steps} Schritte.</p>`
          : `<p class="action-note">✈️ <strong>Jetset!</strong> Flieg zu einem Flughafen deiner Wahl – oder lauf ganz normal ${S.steps} Schritte.</p>`;
        h += `<div class="dests">${GB().HUBS.filter((x) => x !== cur.loc).map((to) => destBtn(S, cur, to, { type: 'fly', to })).join('')}</div>`;
        h += btn(`Lieber laufen (${S.steps} Schritte)`, { type: 'walkInstead' }, pid, 'btn-ghost');
        break;
      }
      case 'walk': {
        h += `<p class="action-note">🧭 <strong>Navigator:</strong> Noch ${S.steps} ${S.steps === 1 ? 'Schritt' : 'Schritte'}. Wohin geht's?</p>`;
        h += `<div class="dests">${W.walkOptions(S).map((to) => destBtn(S, cur, to, { type: 'step', to })).join('')}</div>`;
        break;
      }
      case 'card': {
        const x = GB().CARDS[S.card.deck][S.card.i];
        h += `<div class="card-mini deck-${S.card.deck}"><span class="ck">${S.card.deck === 'april' ? `${aprilIcon('ck-april')} April-Karte` : '💜 Studio-Karte'}</span><p>${esc(x.t)}</p></div>`;
        h += `<div class="btn-row">${btn('OK', { type: 'cardOk' }, pid, 'btn-primary')}</div>`;
        break;
      }
      case 'shop': {
        h += '<p class="action-note">🔧 <strong>Boxengasse!</strong> Was soll an deinen Wagen?</p>';
        h += `<div class="shop">${GB().SHOP.map((it) => {
          const have = it.id === 'tires' ? (cur.race.tires ? 1 : 0) : cur.race[it.id];
          return `<div class="shop-item"><span class="si-ic">${it.icon}</span><div><strong>${it.name} <small>${have}/${it.max}</small></strong><small>${esc(it.text)}</small></div>${btn(M(it.cost), { type: 'buyUpgrade', item: it.id }, pid, 'btn-small', have >= it.max || cur.money < it.cost)}</div>`;
        }).join('')}</div>`;
        h += `<div class="btn-row">${btn('Weiterfahren', { type: 'leaveShop' }, pid, 'btn-primary')}</div>`;
        break;
      }
      case 'quiz': {
        const q = GB().QUESTIONS[S.quiz.i];
        h += `<div class="card-mini deck-quiz"><span class="ck">🧠 Quizfrage</span><p>${esc(q.q)}</p></div>`;
        h += `<div class="quiz-btns">${S.quiz.order.map((o, k) => btn(`<b>${'ABCD'[k]}</b> ${esc(q.a[o])}`, { type: 'answer', k }, pid, 'btn-quiz', S.quiz.hidden.includes(k))).join('')}</div>`;
        const canJoker = !S.quiz.hidden.length && (!cur.used.joker || (cur.items && cur.items.joker > 0));
        if (canJoker) h += btn('🃏 50:50-Joker', { type: 'joker' }, pid, 'btn-ghost btn-small');
        break;
      }
      case 'portal': {
        const c = GB().CITY[cur.loc], to = GB().CITY[c.link];
        const warned = S.event && S.event.warn === c.ring;
        h += `<p class="action-note">🌀 <strong>${esc(c.name)}!</strong> Springst du rüber auf Ring ${to.ring} (${to.ring < c.ring ? 'weiter nach innen, teurer' : 'nach außen, billiger'})?${warned ? ' ⚠️ Dein Ring wird bald vom Sturm zerstört!' : ''}</p>`;
        h += `<div class="btn-row">${btn(`🌀 Durchs Portal auf Ring ${to.ring}`, { type: 'warp' }, pid, 'btn-primary')}${btn('Hierbleiben', { type: 'stay' }, pid, 'btn-ghost')}</div>`;
        break;
      }
      case 'buy': {
        const price = W.buyPrice(cur, cur.loc, S);
        h += cityDeedHTML(cur.loc);
        h += `<div class="btn-row">${btn(`Kaufen für ${M(price)}`, { type: 'buy' }, pid, 'btn-primary', cur.money < price)}${btn('Nicht kaufen', { type: 'skip' }, pid, 'btn-ghost')}</div>`;
        if (cur.money < price) h += '<p class="action-note">Zu wenig Dulis? Nimm unten eine Hypothek auf.</p>';
        break;
      }
      case 'end': {
        const st = S.cities[cur.loc];
        if (S.landed && st && st.owner && st.owner !== cur.id && !S.tookOver) {
          const blk = W.takeoverBlock(S, cur, cur.loc);
          if (!blk) {
            const cost = W.takeoverCost(S, cur.loc);
            h += `<div class="btn-row">${btn(`🦹 ${GB().CITY[cur.loc].name} übernehmen: ${M(cost)}`, { type: 'takeover' }, pid, 'btn-danger', cur.money < cost)}</div>`;
          }
        }
        h += `<div class="btn-row">${btn(S.again ? 'Weiter (Pasch: nochmal würfeln)' : 'Zug beenden', { type: 'endTurn' }, pid, 'btn-primary', !!S.trade)}${canTrade ? uiBtn('Handeln', 'trade', 'btn-ghost') : ''}</div>`;
        h += `<p class="action-note">Bauen kannst du unten bei deinen ${words().cities}, sobald dir eine ganze ${words().zone} gehört.</p>`;
        h += bribeBtn(cur);
        break;
      }
      case 'debt': {
        const need = S.debt.items.reduce((x, y) => x + y.amt, 0);
        h += `<p class="action-note">Du musst <strong>${M(need)}</strong> zahlen, hast aber nur ${M(cur.money)}. Reiß Gebäude ab, nimm Hypotheken auf oder handle.</p>
          <div class="btn-row">${btn(`${M(need)} bezahlen`, { type: 'payDebt' }, pid, 'btn-primary', cur.money < need)}${canTrade ? uiBtn('Handeln', 'trade', 'btn-ghost') : ''}</div>`;
        h += App.confirmBankrupt
          ? `<div class="btn-row">${btn('Ja, ich bin pleite', { type: 'bankrupt' }, pid, 'btn-danger')}${uiBtn('Doch nicht', 'cancelBankrupt', 'btn-ghost')}</div>`
          : btn('Bankrott erklären', { type: 'bankruptAsk' }, pid, 'btn-ghost btn-small');
        break;
      }
    }
    if (face && ['pick', 'jet', 'walk'].includes(S.sub) === false && S.sub !== 'roll' && S.rollId) {
      h += `<p class="action-note face-note">Dulidan-Würfel: ${face.icon === 'D' ? '💜' : face.icon} <strong>${esc(face.name)}</strong> – ${esc(face.text)}</p>`;
    }
    el.innerHTML = h;
  }

  function renderWorldPlayers() {
    const S = App.S;
    $('#players').innerHTML = S.players.map((p, i) => {
      const owned = Object.keys(S.cities).filter((id) => S.cities[id].owner === p.id);
      const zones = W.completeZones(S, p.id);
      const meta = [];
      const gb = GB();
      if (!p.bankrupt && gb.PROPS.length) meta.push(`<span>${owned.length} ${words().cities}</span>`, `<span>${zones.length} komplett</span>`);
      if (p.race && !p.bankrupt) {
        meta.push(`<span class="hot">🏁 Runde ${Math.min(p.race.laps + 1, gb.RULES.race.laps)}/${gb.RULES.race.laps}</span>`);
        if (p.race.engine) meta.push(`<span>🔧+${p.race.engine}</span>`);
        if (p.race.tires) meta.push('<span>🛞</span>');
        if (p.race.nitro) meta.push(`<span>🔥×${p.race.nitro}</span>`);
      }
      if (S.king === p.id) meta.push('<span class="hot">👑 König</span>');
      if (S.bomb && S.bomb.holder === p.id) meta.push(`<span class="warn">💣 ${S.bomb.fuse}</span>`);
      if (gb.RULES.quiz && !p.bankrupt) meta.push(`<span>🃏 ${(p.used && !p.used.joker ? 1 : 0) + ((p.items && p.items.joker) || 0)}</span>`);
      if (p.items && p.items.shield) meta.push(`<span>🛡️×${p.items.shield}</span>`);
      if (p.items && p.items.boost) meta.push(`<span>⚡×${p.items.boost}</span>`);
      if (p.bankrupt) meta.push('<span class="warn">pleite</span>');
      if (App.mode !== 'local' && !p.connected && !p.bankrupt && !p.bot) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" data-pid="${esc(p.id)}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${owned.map((id) => `<i class="${S.cities[id].mort ? 'is-mort' : ''}" style="--g:${GB().ZONES[GB().CITY[id].zone].color}" title="${esc(GB().CITY[id].name)}"></i>`).join('')}</div>
          ${likeHTML(p)}
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${moneyTxt(p)}</div>${goalBar(p)}</li>`;
    }).join('');
  }

  function renderWorldProps() {
    const S = App.S, v = viewer(), wrap = $('#my-props');
    const Wd = words().cities;
    if (!v) { $('#props-title').textContent = Wd; wrap.innerHTML = '<p class="empty">Du schaust zu.</p>'; return; }
    $('#props-title').textContent = App.mode === 'local' || v.id !== myId ? `${Wd} von ${v.name}` : `Deine ${Wd}`;
    if (GB().RULES.race && v.race) {
      wrap.innerHTML = GB().SHOP.map((it) => {
        const have = it.id === 'tires' ? (v.race.tires ? 1 : 0) : v.race[it.id];
        return `<div class="prop-row" style="--g:${have ? '#2fe08a' : '#3a2f4f'}"><span class="bar"></span><div class="pr-name">${it.icon} ${it.name}<small>${have}/${it.max} · ${esc(it.text)}</small></div></div>`;
      }).join('') + '<p class="empty">Upgrades gibt’s in der 🔧 Boxengasse.</p>';
      return;
    }
    const owned = GB().PROPS.map((id) => GB().CITY[id]).filter((c) => S.cities[c.id].owner === v.id);
    if (!owned.length) { wrap.innerHTML = `<p class="empty">Noch keine ${Wd}. Würfel los und kauf was!</p>`; return; }
    const myTurn = S.phase === 'play' && curP().id === v.id && canControl(v.id);
    const manage = myTurn && ['roll', 'end', 'buy', 'debt'].includes(S.sub);
    const canBuild = myTurn && ['roll', 'end'].includes(S.sub);
    wrap.innerHTML = owned.map((c) => {
      const st = S.cities[c.id];
      const complete = W.zoneComplete(S, v.id, c.zone);
      const info = `${GB().LEVELS[st.level]}${complete ? ` · ${words().zone} komplett` : ''} · ${rentWord()} ${M(W.rentFor(S, c.id))}${st.mort ? ' · Hypothek' : ''}`;
      let b = '';
      if (canBuild && complete && !W.buildBlock(S, v, c.id)) b += btn(`+${GB().LEVELS[st.level + 1]} ${M(W.buildCost(S, v, c.id))}`, { type: 'build', id: c.id }, v.id);
      if (manage) {
        if (st.level) b += btn('Abreißen', { type: 'sell', id: c.id }, v.id, 'btn-ghost', false, 'Stockwerk für den halben Preis verkaufen');
        if (!st.mort && !W.zoneHasBuildings(S, c.zone)) b += btn(`Hypothek +${M(c.price / 2)}`, { type: 'mortgage', id: c.id }, v.id, 'btn-ghost');
        if (st.mort) b += btn(`Einlösen ${M(W.unmortgageCost(c.id, S))}`, { type: 'unmortgage', id: c.id }, v.id, 'btn-ghost', v.money < W.unmortgageCost(c.id, S));
      }
      return `<div class="prop-row" style="--g:${GB().ZONES[c.zone].color}"><span class="bar"></span>
        <div class="pr-name">${esc(c.name)}<small>${info}</small></div><div class="pr-btns">${b}</div></div>`;
    }).join('');
  }

  const TWISTS = {
    world: '<li>Die Weltkarte: Routen über Land und See, ✈ Flughäfen für Jetset-Flüge.</li><li>📈 Ab Runde 8 kommt die Weltwirtschaftskrise: Alle Mauten steigen jede Runde um 20 %. Gespielt wird, bis alle bis auf einen pleite sind.</li>',
    royale: '<li>🌀 Drei Ringe. Portale verbinden sie. Je weiter innen, desto teurer.</li><li>🌪️ Der April-Sturm zerstört in Runde 7 den äußeren und in Runde 14 den mittleren Ring. Wer dort steht, fliegt nach innen. Zerstörte Planeten zahlen die Hälfte zurück.</li><li>🔥 Danach steigen alle Mieten jede Runde um 30 %, bis nur noch einer übrig ist.</li><li>🎁 Loot-Kisten: 🛡️ Schild blockt eine Miete, ⚡ Boost bringt dich 3 Felder weiter.</li>',
    metro: '<li>🚇 Sieben U-Bahn-Linien, fünf Umsteigebahnhöfe.</li><li>🎫 Gehört jemandem eine ganze Linie, zahlst du Fahrpreis für jede seiner Stationen, durch die du nur durchfährst.</li><li>🚄 Express-Seite des Dulidan-Würfels: Spring zu einem beliebigen Umsteigebahnhof.</li>',
    islands: '<li>🏝️ Sieben Inseln, verbunden über Seewege. Jede Insel hat einen ⚓ Hafen.</li><li>⛴️ Fähre auf dem Dulidan-Würfel: Fahr direkt zu einem Hafen deiner Wahl.</li><li>🌊 Ab Runde 3 kann jede Runde eine Insel überflutet werden. Dort zahlt dann niemand Miete.</li><li>🎁 Schatzkisten und Flaschenpost liegen mitten im Meer.</li><li>📈 Ab Runde 8 steigen alle Mieten jede Runde. Gespielt wird, bis alle bis auf einen pleite sind.</li>',
    race: '<li>🏁 Kein Kaufen, kein Bauen: Wer zuerst 3 Runden fährt, gewinnt. Alle starten mit Ð400.</li><li>⏩ Boost-Pads schießen dich 3 Felder vor, 🛢️ Ölflecken lassen dich 3 zurückrutschen.</li><li>🔧 In der Boxengasse: Motor-Tuning (+1 Feld pro Wurf), Profi-Reifen (Öl egal), Nitro (Wurf ×2).</li><li>💥 Landest du auf jemandem, schubst du ihn 2 Felder zurück.</li><li>🪙 Münzfelder bringen Geld für Upgrades.</li>',
    throne: '<li>👑 In der Mitte steht der Thron. Über vier Treppen kommst du hin, mit 🕳️ Geheimgang direkt.</li><li>Wer auf dem Thron landet, wird König: Alle anderen zahlen zu Zugbeginn Tribut (steigt alle 3 Runden), und die Mieten des Königs zählen 1,5×.</li><li>Landet jemand anderes auf dem Thron, ist der alte König gestürzt.</li><li>📈 Ab Runde 10 steigen alle Mieten jede Runde.</li>',
    quiz: '<li>🧠 Auf ❓-Feldern stellt April eine Quizfrage mit vier Antworten: Duisburg, Öhringen, Dulidan und Allgemeinwissen.</li><li>Richtig: +Ð150. Falsch: −Ð50. Alle sehen die Frage live auf dem Brett.</li><li>🃏 Einmal pro Spiel gibt es den 50:50-Joker, weitere findest du beim Publikumsjoker.</li><li>📈 Ab Runde 8 steigen alle Mieten jede Runde.</li>',
    bomb: '<li>💣 Eine Person hat die Bombe. Bei jedem eigenen Zug brennt die Zündschnur einen Zug weiter.</li><li>Überholst du jemanden oder landest auf seinem Feld, wandert die Bombe zu ihm.</li><li>💥 Explodiert sie, kostet das Ð250 plus Ð25 pro Runde. Danach taucht eine neue Bombe bei jemand anderem auf.</li><li>🧯 Entschärfer-Kits verlängern die Zündschnur um 2 Züge.</li>',
    festival: '<li>🎪 Ein Rundgang übers Festival: Campingplatz, Foodcourt, Techno-Zelt, Rap-Bühne, Rock-Stage, VIP und Main Stage.</li><li>🎤 Jede Runde ist eine Area Headliner. Dort kostet die Miete das Dreifache.</li><li>🔁 Zugabe auf dem Dulidan-Würfel: nochmal würfeln. 🏄 Crowdsurfen: 3 Felder extra.</li><li>📈 Ab Runde 8 steigen alle Mieten jede Runde. Gespielt wird, bis alle bis auf einen pleite sind.</li>',
    tower: '<li>🏙️ Fünf Etagen, jede ein eigener Rundgang. Ganz oben das Penthouse.</li><li>⬆ Aufzüge bringen dich einen Stock hoch, ⬇ Rutschen einen runter.</li><li>Gehört jemandem eine ganze Etage, kassiert er Aufzug-Gebühr von allen, die dort ankommen.</li><li>🎁 Auf dem Helipad liegen Loot-Kisten.</li>',
  };
  function worldRulesHTML() {
    const g = GB(), w = words();
    return `<h2>${esc(g.title)}</h2><div class="rules">
      <p>${esc(g.tagline)} Wer als Letzter nicht pleite ist, gewinnt.</p>
      <h3>Das Besondere</h3><ul>${TWISTS[g.id] || ''}</ul>
      <h3>Dein Zug</h3><ul>
        <li>Zu Beginn bekommst du ${M(g.RULES.salary)} Gehalt.</li>
        <li>Du würfelst und läufst die Augenzahl Feld für Feld.</li>
        <li>Landest du auf einer freien ${w.city}, kannst du sie kaufen. Bei fremden zahlst du ${rentWord()}.</li>
        <li>Pasch: nochmal würfeln.</li></ul>
      ${g.FACES.length ? `<h3>💜 Der Dulidan-Würfel</h3><ul>${g.FACES.map((f) => `<li>${f.icon === 'D' ? '💜' : f.icon} <strong>${esc(f.name)}:</strong> ${esc(f.text)}</li>`).join('')}</ul>` : ''}
      <h3>${w.zone} & Bauen</h3><ul>
        <li>Eine ganze ${w.zone} verdoppelt die ${rentWord()} der unbebauten ${w.cities}.</li>
        <li>Mit ganzer ${w.zone} baust du gleichmäßig: ${g.LEVELS.slice(1).join(' → ')}. Jede Stufe macht es viel teurer.</li>
        <li>Bauen geht vor dem Würfeln oder am Ende deines Zuges, egal wo du stehst.</li></ul>
      <h3>🦹 Feindliche Übernahme</h3><ul>
        <li>Landest du in einer fremden Stadt, kannst du sie dem Besitzer für 1,5× (Preis + Gebäude) wegkaufen.</li>
        <li>Geschützt sind ganze Zonen und Wahrzeichen.</li></ul>
      <h3>Geld knapp?</h3><ul>
        <li>Gebäude abreißen (halber Preis zurück) oder Hypotheken aufnehmen. Kannst du nicht zahlen, bist du pleite und raus.</li></ul>
      ${g.EVENTS.length ? '<h3>📰 April-News</h3><ul><li>Jede Runde eine Nachricht: Mietparty, Stau, drei Würfel, Rezession und mehr.</li></ul>' : ''}
      ${moodRulesHTML()}
      ${variantRulesHTML()}
      <h3>Figuren</h3><ul>${Object.entries(GB().POWERS).map(([k, t]) => `<li><strong>${esc(TOKENS[k].name)}:</strong> ${esc(t)}</li>`).join('')}</ul></div>`;
  }




  // ================= APRILS LAUNE =================
  function likeHTML(p) {
    if (!MOOD.on(App.S) || p.bankrupt || p.like == null) return '';
    const l = MOOD.levelOf(p.like);
    return `<div class="like lv-${l.id}" title="April ${l.name} (${p.like}/100)"><span>${l.icon}</span><div class="like-bar"><i style="width:${p.like}%"></i></div><small>${l.name}</small></div>`;
  }
  function moodNewsHTML() {
    const S = App.S;
    if (!MOOD.on(S)) return '';
    const d = MOOD.DAYS[S.mood.day];
    return `<div class="news mood-news mood-${S.mood.day}"><strong>${aprilIcon('mn-april')} Aprils Laune: ${d.icon} ${d.name}</strong><span>${d.text}</span></div>`;
  }
  function bribeBtn(cur) {
    const S = App.S;
    if (!MOOD.on(S)) return '';
    const done = cur.bribeTurn === S.turnNo;
    return uiBtn(done ? '💸 April ist bestochen' : '💸 April bestechen', 'bribe', 'btn-ghost btn-small btn-bribe', done ? 'disabled' : '');
  }
  function bribeModal() {
    const S = App.S, p = curP();
    if (!canControl(p.id) || !MOOD.on(S)) return;
    const l = MOOD.levelOf(p.like);
    openModal(`<h2>${aprilIcon('bribe-april')} April bestechen</h2>
      <p class="action-note">April ${l.icon} <strong>${l.name}</strong> (${p.like}/100). Je mehr Dulis, desto lieber hat sie dich – meistens. Das Geld landet in ${S.mode && W.MODES.includes(S.mode) ? 'Aprils Taschen' : 'Aprils Spardose'}.</p>
      <ul class="bribe-info"><li>💖 Liebling: öfter gute Karten, ab und zu ein Geschenk, mehr Glück im Casino.</li><li>💔 Hass: fiese Karten, und April reißt Häuser ab oder packt deine Straßen in Hypothek.</li></ul>
      <div class="btn-row">${Object.keys(MOOD.BRIBES).map((a) => btn(`💸 ${M(a)}`, { type: 'bribe', amt: Number(a) }, p.id, Number(a) === 100 ? 'btn-primary' : '', p.money < Number(a))).join('')}</div>`);
  }
  function castBanner() {
    const S = App.S, c = S.mood && S.mood.cast;
    if (!c) return;
    const key = `${c.seq}|${c.text}`;
    if (App.castKey == null) { App.castKey = key; return; }
    if (key === App.castKey) return;
    App.castKey = key;
    const delay = Math.max(0, (App.busyUntil || 0) - Date.now()) + 150;
    clearTimeout(App.castT);
    App.castT = setTimeout(() => {
      const el = $('#cast');
      $('#cast-text').textContent = c.text;
      el.hidden = false;
      el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
      FX.play('pop');
      clearTimeout(App.castHideT);
      App.castHideT = setTimeout(() => { el.hidden = true; }, 4600);
    }, delay);
  }
  function moodRulesHTML() {
    return `<h3>💖 Aprils Laune</h3><ul>
      <li>April mag jede Person anders (Herz neben dem Namen): 💔 Hass · 🩶 mag dich nicht · 💗 okay · 💖 Liebling.</li>
      <li>Bestechen geht einmal pro Zug (Ð50, Ð100 oder Ð200). Manchmal findet April das zu billig.</li>
      <li>Wer zu reich wird oder abzockt, nervt sie. Wer arm ist oder ihre Felder besucht, tut ihr leid.</li>
      <li>Liebling: öfter gute Karten, ab und zu ein Geschenk, im Casino mehr Glück.</li>
      <li>Hass: öfter fiese Karten – und April rächt sich: Sie reißt ein Haus ab oder packt eine Straße in Hypothek (das Geld behält sie).</li>
      <li>Tageslaune jede Runde: 😊 Ð25 extra Gehalt · 😡 Steuern doppelt, fiese Karten ×1,5.</li></ul>`;
  }
  function casinoRulesHTML() {
    return `<h3>🎰 DULIDAN CASINO</h3><ul>
      <li>Jede Straße ist ein Casino. Landest du bei jemand anderem, spielst du dort gegen die Bank. Der Einsatz ist die doppelte Miete.</li>
      <li>Verloren: Du zahlst den Einsatz. Gewonnen: Der Besitzer zahlt ihn dir aus.</li>
      <li>Statt Häusern machst du dein Casino korrupter: ${CZ.LEVELS.join(' → ')}. Jede Stufe erhöht den Einsatz und senkt die Gewinnchance der Gäste.</li>
      <li>Spiele: ${Object.entries(CZ.GAMES).map(([g, k]) => `${CZ.INFO[k].icon} ${CZ.INFO[k].name} (${GROUPS[g].name})`).join(', ')}.</li>
      <li>Bahnhöfe sind Casino-Shuttles, Werke sind Wechselstuben – dort zahlst du ganz normal.</li></ul>`;
  }

  // ================= CASINO =================
  const cardName = (v) => ({ 11: 'B', 12: 'D', 13: 'K', 14: 'A' }[v] || String(v));
  function casinoInfoHTML(c) {
    const info = CZ.INFO[c.game], owner = P(c.owner);
    return `<div class="cz-info"><div class="cz-title"><span class="cz-ic">${info.icon}</span><div><strong>${info.name}</strong><small>${esc(SPACES[c.idx].name)} von ${esc(owner.name)} · ${CZ.LEVELS[c.level]}</small></div></div>
      <p>${esc(info.text)}</p>
      <div class="cz-stats"><span>Einsatz <strong>${M(c.stake)}</strong></span><span>${c.game === 'blackjack' ? `Bank schummelt <strong>${Math.round(c.rig * 100)} %</strong>` : `Deine Chance <strong>${Math.round(c.chance * 100)} %</strong>`}</span></div>
      ${c.game === 'hilo' ? `<p class="cz-open">Offene Karte: <span class="pcard mini">${cardName(c.card)}</span></p>` : ''}</div>`;
  }
  const isRed = (card) => /[♥♦]$/.test(card);
  function bjHandsHTML(bj, reveal) {
    const show = reveal || bj.over;
    const cards = (list, hide) => list.map((c, i) => (hide && i === 1 ? '<span class="pcard back">?</span>' : `<span class="pcard ${isRed(c) ? 'red' : ''}">${c}</span>`)).join('');
    return `<div class="bj"><div class="bj-row"><small>Bank${show ? ` · ${CZ.value(bj.dealer)}` : ''}</small><div>${cards(bj.dealer, !show)}</div></div>
      <div class="bj-row"><small>Du · ${CZ.value(bj.player)}</small><div>${cards(bj.player, false)}</div></div></div>`;
  }
  const HORSE_IC = { 1: '🐎', 2: '🦄', 3: '🐴', 4: '🫏' };
  const SLOT_IC = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '💎'];
  function czAnimHTML(sh, dur) {
    const x = sh.show || {};
    const choice = (CZ.INFO[sh.game].choices.find(([k]) => k === sh.choice) || [, ''])[1];
    let stage = '';
    switch (sh.game) {
      case 'coin':
        stage = `<div class="cz-coin"><span class="coin-spin">🪙</span></div><div class="cz-reveal">${x.side === 'kopf' ? '👑 KOPF' : '🔢 ZAHL'}</div><div class="cz-sub">Getippt: ${choice}</div>`;
        break;
      case 'dice':
        stage = `<div class="cz-dice"><div><small>${esc(P(sh.pid).name)}</small><div class="die-flat">${dieHTML(x.a)}</div></div><div class="cz-vs">VS</div><div><small>Bank</small><div class="die-flat">${dieHTML(x.b)}</div></div></div>`;
        break;
      case 'hilo':
        stage = `<div class="cz-cards"><span class="pcard big">${cardName(x.card)}</span><span class="cz-arrow">${sh.choice === 'hi' ? '⬆' : '⬇'}</span><span class="pcard big flip">${cardName(x.next)}</span></div><div class="cz-sub">Getippt: ${choice}</div>`;
        break;
      case 'wheel': {
        const seg = 360 / CZ.WHEEL.length;
        const rot = x.spin * 360 + (360 - (x.seg * seg + seg / 2));
        const grad = CZ.WHEEL.map((w, i) => `${w === 'win' ? '#2fe08a' : '#ff3348'} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
        stage = `<div class="cz-wheel"><div class="wheel" style="--rot:${rot}deg;background:conic-gradient(${grad})"></div><div class="wheel-pin">▼</div></div>`;
        break;
      }
      case 'roulette':
        stage = `<div class="cz-roul"><div class="roul-wheel"><i></i></div><div class="cz-reveal roul-n c-${x.color}">${x.n}</div></div><div class="cz-sub">Gesetzt: ${choice}</div>`;
        break;
      case 'horses':
        stage = `<div class="cz-race">${['1', '2', '3', '4'].map((h) => {
          const rank = x.order.indexOf(h);
          return `<div class="lane ${h === sh.choice ? 'is-pick' : ''}"><span class="horse" style="--t:${Math.round(dur * (0.78 + rank * 0.07))}ms">${HORSE_IC[h]}</span></div>`;
        }).join('')}</div><div class="cz-sub">Gesetzt: ${choice}</div>`;
        break;
      case 'slots':
        stage = `<div class="cz-slots">${x.reels.map((r, i) => {
          const strip = [];
          for (let k = 0; k < 10 + i * 4; k++) strip.push(SLOT_IC[Math.floor(Math.random() * SLOT_IC.length)]);
          strip.push(r);
          return `<div class="reel"><div class="strip" style="--t:${Math.round(dur * (0.6 + i * 0.18))}ms;--n:${strip.length - 1}">${strip.map((e) => `<span>${e}</span>`).join('')}</div></div>`;
        }).join('')}</div>`;
        break;
      case 'blackjack':
        stage = sh.bj ? bjHandsHTML(sh.bj, true) : '';
        break;
    }
    const res = sh.push ? '🤝 Unentschieden – Einsatz zurück'
      : sh.win ? `${sh.jackpot ? '💎 JACKPOT!' : '🎉 GEWONNEN!'} +${M(sh.paid || 0)}`
        : `💸 VERLOREN −${M(sh.stake)}`;
    return `<div class="cz-stage g-${sh.game}" style="--d:${dur}ms">
      <div class="cz-head">${CZ.INFO[sh.game].icon} ${CZ.INFO[sh.game].name} · ${esc(SPACES[sh.idx].name)}</div>
      ${stage}
      <div class="cz-result ${sh.push ? 'is-push' : sh.win ? 'is-win' : 'is-lose'}"><strong>${esc(P(sh.pid).name)}</strong> ${res}</div></div>`;
  }
  function czTableHTML(c) {
    const info = CZ.INFO[c.game];
    return `<div class="cz-stage is-table"><div class="cz-head">${info.icon} ${info.name} · ${esc(SPACES[c.idx].name)}</div>
      <div class="cz-big">${info.icon}</div>
      ${c.bj ? bjHandsHTML(c.bj, false) : c.game === 'hilo' ? `<div class="cz-cards"><span class="pcard big">${cardName(c.card)}</span><span class="cz-arrow">?</span><span class="pcard big back">?</span></div>` : ''}
      <div class="cz-sub"><strong>${esc(P(c.pid).name)}</strong> spielt um ${M(c.stake)} gegen ${esc(P(c.owner).name)}s Bank</div></div>`;
  }
  function renderCasino() {
    const S = App.S, el = $('#casino-view');
    if (!S.isCasino) { el.hidden = true; return; }
    const sh = S.casinoShow;
    const key = sh ? `${sh.seq}|${sh.idx}|${sh.pid}|${sh.stake}` : '';
    if (App.czSeq == null) App.czSeq = key;
    if (sh && key !== App.czSeq) {
      App.czSeq = key;
      const dur = fastMode ? 1100 : 2800;
      App.czAnim = { until: Date.now() + dur + 2600 };
      holdActions(dur + 250);
      el.innerHTML = czAnimHTML(sh, dur);
      el.hidden = false;
      $('#center-card').hidden = true;
      if (!fastMode) [0, 500, 1000, 1500].forEach((t) => setTimeout(() => FX.play(sh.game === 'slots' || sh.game === 'wheel' ? 'step' : 'roll'), t));
      setTimeout(() => FX.play(sh.win ? 'win' : sh.push ? 'pop' : 'jail'), dur);
      clearTimeout(App.czHideT);
      App.czHideT = setTimeout(() => { if (App.S) renderCasino(); }, dur + 2650);
      return;
    }
    if (App.czAnim && Date.now() < App.czAnim.until) return;
    if (S.casino && S.sub === 'casino' && S.phase === 'play' && !isBusy()) {
      const k = `t|${S.casino.idx}|${S.casino.bj ? S.casino.bj.player.length : 0}`;
      if (el.dataset.k !== k || el.hidden) { el.dataset.k = k; el.innerHTML = czTableHTML(S.casino); }
      el.hidden = false;
      return;
    }
    el.dataset.k = '';
    el.hidden = true;
  }


  // ================= GELD LIVE: +Ð / −Ð fliegt hoch =================
  function moneyPops() {
    const S = App.S;
    if (!S || S.phase === 'lobby') { App.prevMoney = null; return; }
    const seq = S.logSeq || 0;
    const fresh = !App.prevMoney || seq < (App.prevSeq || 0);
    App.prevSeq = seq;
    const now = {};
    S.players.forEach((p) => { now[p.id] = p.money; });
    if (fresh) { App.prevMoney = now; return; }
    const diffs = [];
    for (const p of S.players) {
      const before = App.prevMoney[p.id];
      if (before != null && before !== p.money) diffs.push({ p, d: p.money - before });
    }
    App.prevMoney = now;
    if (!diffs.length) return;
    // erst knallen lassen, wenn Würfel und Figur durch sind
    const busy = Math.max(0, (App.busyUntil || 0) - Date.now());
    const delay = busy + 120;
    setTimeout(() => {
      let gain = false, loss = false;
      diffs.forEach(({ p, d }, i) => {
        setTimeout(() => popMoney(p, d), i * 120);
        if (d > 0) gain = true; else loss = true;
      });
      const big = diffs.some(({ d }) => Math.abs(d) >= (isReal() ? 25000 : 500));
      if (loss) FX.play(big ? 'bigLoss' : 'coinDown');
      if (gain) setTimeout(() => FX.play(big ? 'bigGain' : 'coinUp'), loss ? 180 : 0);
    }, delay);
  }

  function popMoney(p, d) {
    const txt = hideMoney(p) ? (d > 0 ? '+Ð???' : '−Ð???') : `${d > 0 ? '+' : '−'}Ð${Math.abs(d).toLocaleString('de-DE')}`;
    const big = Math.abs(d) >= (isReal() ? 25000 : 500);
    const spawn = (el, cls) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const pop = document.createElement('div');
      pop.className = `money-pop ${d > 0 ? 'is-up' : 'is-down'} ${big ? 'is-big' : ''} ${cls}`;
      pop.textContent = txt + (big && d < 0 ? ' 💀' : big ? ' 🔥' : '');
      pop.style.left = (r.left + r.width / 2) + 'px';
      pop.style.top = (r.top + r.height / 2) + 'px';
      document.body.appendChild(pop);
      setTimeout(() => pop.remove(), 1900);
    };
    spawn(document.querySelector(`[data-tokpid="${CSS.escape(p.id)}"]`), 'at-token');
    const row = document.querySelector(`#players [data-pid="${CSS.escape(p.id)}"]`);
    spawn(row && row.querySelector('.pmoney'), 'at-list');
    if (row) {
      row.classList.remove('flash-up', 'flash-down', 'shake'); void row.offsetWidth;
      row.classList.add(d > 0 ? 'flash-up' : 'flash-down');
      if (big && d < 0) row.classList.add('shake');
    }
  }

  // ================= APRIL: Begleiterin, Boot, Easter Eggs =================
  function aprilSay(text, ms = 5200) {
    const bub = $('#april-bubble'), av = $('#april-av');
    $('#april-text').textContent = text;
    bub.classList.add('on');
    av.classList.remove('is-talking'); void av.offsetWidth; av.classList.add('is-talking');
    clearTimeout(App.aprilHideT);
    App.aprilHideT = setTimeout(() => bub.classList.remove('on'), ms);
  }
  const APRIL_TIPS = [
    'Tipp: Eine ganze Farbgruppe bringt doppelte Miete. Erst dann darfst du bauen.',
    'Im Weltmodus würfelt der lila Dulidan-Würfel mit. 🧭 Navigator heißt: du wählst den Weg.',
    'Schüttel dein Handy, dann würfle ich für dich. Oder tipp halt auf den Knopf, langweilig.',
    'Kein Geld mehr? Hypotheken! Das ist wie Schulden, nur mit Stil.',
    'Ich hab die Würfel nicht gezinkt. Wahrscheinlich.',
    'Tung tung tung sahur. Mehr hab ich gerade nicht.',
    'Pro-Tipp: Kauf die Bahnhöfe. Ich fahr gern Zug. Wenn er kommt.',
    'Bots sind meine Kollegen. Sie sind nett, aber gnadenlos.',
    'Psst: ↑ ↑ ↓ ↓ ← → ← → B A. Du hast das nicht von mir.',
    'Ich hab Hunger. Ich bin eine KI. Trotzdem. Döner.',
  ];
  let tipIdx = Math.floor(Math.random() * APRIL_TIPS.length);
  $('#april-av').addEventListener('click', () => {
    tipIdx = (tipIdx + 1) % APRIL_TIPS.length;
    aprilSay(APRIL_TIPS[tipIdx]);
  });
  $('#april-bubble').addEventListener('click', () => $('#april-bubble').classList.remove('on'));

  // Konami-Code = April-Modus
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiPos = 0;
  document.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konamiPos = k === KONAMI[konamiPos] ? konamiPos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      const on = document.documentElement.classList.toggle('april-mode');
      aprilSay(on ? 'APRIL-MODUS AKTIVIERT 💖 Alles ist jetzt pinker. Gern geschehen.' : 'April-Modus aus. Langweilig, aber okay.');
      FX.play('pot');
    }
  });

  // Boot-Sequenz beim ersten Öffnen pro Sitzung
  function runBoot() {
    let seen = false;
    try { seen = sessionStorage.getItem('duli-booted') === '1'; sessionStorage.setItem('duli-booted', '1'); } catch (e) { seen = false; }
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const greet = () => setTimeout(() => aprilSay('Hi, ich bin April! Ich moderiere heute. Erstell einen Raum, spiel lokal oder gegen meine Bot-Kollegen.'), 500);
    if (seen || reduce) { greet(); return; }
    const boot = $('#boot'), lines = $('#boot-lines'), bar = $('#boot-bar'), pct = $('#boot-pct');
    const steps = [
      '&gt; DULIDANOPOLY_OS v2.0 startet …',
      '&gt; Spielbrett Duisburg / Öhringen <b>OK</b>',
      '&gt; Weltkarte: 30 Städte, 10 Zonen <b>OK</b>',
      '&gt; 3D-Würfel kalibriert <b>OK</b>',
      '&gt; Düsseldorf abgesichert <b>OK</b>',
      '&gt; April wird geweckt … <span class="pk">sie ist genervt</span>',
      '&gt; Bereit. Viel Glück.',
    ];
    boot.hidden = false;
    let i = 0, done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      boot.classList.add('is-done');
      setTimeout(() => { boot.hidden = true; }, 500);
      document.removeEventListener('keydown', onKey);
      greet();
    };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') finish(); };
    document.addEventListener('keydown', onKey);
    $('#boot-skip').onclick = finish;
    const timer = setInterval(() => {
      if (i < steps.length) lines.innerHTML += `<div>${steps[i]}</div>`;
      i++;
      const p = Math.min(100, Math.round((i / steps.length) * 100));
      bar.style.width = p + '%';
      pct.textContent = p + '%';
      if (i > steps.length) finish();
    }, 320);
  }
  buildHome();
  runBoot();
  applyTempo();

  // ================= WAR, POLITICS, SPLIT OR STEAL =================
  function modeNewsHTML(S) {
    let h = '';
    if (S.isPol && S.pol) {
      const pol = S.pol, k = pol.kanzler && P(pol.kanzler), v = pol.vize && P(pol.vize), L = pol.law && E.LAWS[pol.law];
      const next = pol.every - (S.round % pol.every);
      h += `<div class="news pol-news"><strong>🏛️ ${k ? `Kanzler: ${esc(k.name)}${v ? ` · Vize: ${esc(v.name)}` : ''}` : 'Noch keine Regierung'} · ${next === pol.every ? `Gerade gewählt · nächste Wahl in ${next} Runden` : `Wahl in ${next} Runde${next > 1 ? 'n' : ''}`}</strong>
        <span>${L ? `${L.icon} ${L.name}: ${esc(L.text)}` : 'Kein Gesetz in Kraft.'}</span>
        ${pol.last ? `<div class="seats">${Object.entries(pol.last.seats).map(([id, n]) => (P(id) ? `<i style="flex:${n};background:${P(id).color}" title="${esc(P(id).name)}: ${n} Sitze">${n >= 12 ? n : ''}</i>` : '')).join('')}</div>` : ''}</div>`;
    }
    const b = S.battle;
    if (S.isWar && b && b.turn === S.turnNo) {
      const A = P(b.att), Dp = P(b.def);
      h += `<div class="news war-news ${b.win ? 'is-win' : 'is-loss'}"><strong>⚔️ Schlacht um ${esc(SPACES[b.idx].name)}</strong>
        <span>${esc(A.name)} (${b.n}) gegen ${esc(Dp.name)} (${b.defN}): ${b.win ? `Erobert! ${b.left} bleiben als Besatzung.` : `Abgewehrt. ${esc(Dp.name)} hat noch ${b.left}.`}</span>
        <div class="war-rolls">${b.rolls.map(([a, d]) => `<span><b>${a.join(' ')}</b> vs <em>${d.join(' ')}</em></span>`).join('')}</div></div>`;
    }
    const x = S.sosShow;
    if (x && x.turn === S.turnNo) {
      const A = P(x.a), B = P(x.b), ic = (k) => (k === 'split' ? '🤝' : '🗡️');
      h += `<div class="news sos-news"><strong>🐷 Split or Steal · ${M(x.pot)}</strong>
        <span>${esc(A.name)} sagte „${x.claim === 'split' ? 'Ich teile' : 'Ich klaue'}“ und wählte ${ic(x.pa)} · ${esc(B.name)} wählte ${ic(x.pb)} · ${x.claim === x.pa ? 'Wahrheit!' : 'GELOGEN!'}</span></div>`;
    }
    return h;
  }
  function specialSubHTML(S, cur) {
    if (S.sub === 'sos' && S.sos) {
      const x = S.sos, A = P(x.a), B = P(x.b);
      let h = `<div class="sos-box"><span class="rc-kind">🐷 Split or Steal</span><strong>${esc(A.name)} und ${esc(B.name)} spielen um ${M(x.pot)}</strong>`;
      if (!x.claim) {
        h += `<p>${esc(A.name)} muss zuerst etwas behaupten. Lügen ist erlaubt.</p>`;
        h += canControl(A.id) ? `<div class="btn-col">${btn('🗣️ „Ich teile, versprochen!“', { type: 'sosClaim', claim: 'split' }, A.id, 'btn-primary')}${btn('🗣️ „Ich klaue. Ehrlich.“', { type: 'sosClaim', claim: 'steal' }, A.id)}</div>` : `<p class="action-note">${esc(A.name)} überlegt, was er/sie sagt …</p>`;
        return h + '</div>';
      }
      h += `<p class="sos-claim">${esc(A.name)}: „${x.claim === 'split' ? 'Ich teile, versprochen!' : 'Ich klaue. Ehrlich.'}“</p>
        <p class="action-note">Beide wählen geheim. Beide teilen: halbe-halbe. Eine Person klaut: sie kriegt alles. Beide klauen: niemand.</p>`;
      const local = App.mode === 'local' && !A.bot && !B.bot;
      [[A, '🤝 Teilen', '🗡️ Klauen'], [B, '🤝 Ich glaube dir – teilen', '🗡️ Du lügst – ich klaue']].forEach(([q, ls, lk]) => {
        if (x.pick[q.id]) h += `<p class="action-note">✔ ${esc(q.name)} hat gewählt.</p>`;
        else if (canControl(q.id)) h += `<div class="sos-pick"><small>${esc(q.name)}${local ? ' (die andere Person kurz wegschauen 🙈)' : ''}:</small><div class="btn-row">${btn(ls, { type: 'sosPick', pick: 'split' }, q.id, 'btn-primary')}${btn(lk, { type: 'sosPick', pick: 'steal' }, q.id, 'btn-danger')}</div></div>`;
        else h += `<p class="action-note">${esc(q.name)} wählt …</p>`;
      });
      return h + '</div>';
    }
    if (S.sub === 'law' && S.pol && S.pol.pending) {
      const k = P(S.pol.kanzler);
      let h = `<div class="sos-box"><span class="rc-kind">📜 Neues Gesetz</span><strong>${esc(k.name)} regiert und wählt ein Gesetz</strong>`;
      h += canControl(k.id)
        ? `<div class="btn-col">${S.pol.pending.opts.map((id) => { const L = E.LAWS[id]; return btn(`${L.icon} ${L.name}<small>${esc(L.text)}</small>`, { type: 'law', id }, k.id); }).join('')}</div>`
        : `<p class="action-note">${esc(k.name)} schreibt am Gesetz …</p>`;
      return h + '</div>';
    }
    if (S.sub === 'war' && S.war) {
      const w = S.war, o = P(w.def), d = E.defense(S, w.idx);
      let h = `<div class="sos-box war-box"><span class="rc-kind">⚔️ Feindliches Gebiet</span><strong>${esc(SPACES[w.idx].name)} gehört ${esc(o.name)}</strong>
        <p>Verteidigung: <b>🛡️ ${d}</b> (Miliz 1 + Besatzung ${S.props[w.idx].gar || 0} + Bunker ${2 * S.props[w.idx].houses}${E.ownsGroup(S, o.id, SPACES[w.idx].group) ? ' + Farbgruppe 2' : ''}). Du hast <b>🪖 ${cur.troops || 0}</b> Truppen.</p>
        <p class="action-note">Angriff wie bei Risiko: bis zu 3 Würfel gegen 2, Gleichstand gewinnt die Verteidigung. Verlierst du, zahlst du die halbe Miete als Reparationen.</p>`;
      if (!canControl(cur.id)) return h + `<p class="action-note">${esc(cur.name)} plant den nächsten Zug …</p></div>`;
      const ns = [...new Set([Math.ceil(d * 1.5), d * 2, cur.troops || 0].filter((n) => n >= 1 && n <= (cur.troops || 0)))].sort((a, b) => a - b);
      h += `<div class="btn-col">${btn(`💸 Tribut zahlen: ${M(w.rent)}`, { type: 'warPay' }, cur.id, 'btn-primary', false)}
        ${ns.map((n) => btn(`⚔️ Mit ${n} Truppen angreifen`, { type: 'warAttack', n }, cur.id, 'btn-danger')).join('') || '<p class="action-note">Keine Truppen zum Angreifen. Neue gibt es über LOS.</p>'}</div>`;
      return h + '</div>';
    }
    return null;
  }

  // ================= LOGISTICS: Schienen und Netze =================
  function logiDeedHTML(i, ownerLine) {
    const S = App.S, sp = SPACES[i], st = S.props[i];
    const owner = st && P(st.owner);
    if (sp.type === 'rail' || sp.type === 'util') {
      const rents = sp.type === 'rail' ? [25, 50, 100, 200] : [1, 2, 3, 4].map((n) => LG.portRent(n));
      return `<div class="deed"><div class="deed-head light-text" style="--g:#2a2140">${sp.icon} ${esc(sp.name)}<small>${sp.type === 'rail' ? 'Flughafen' : 'Hafen'}</small></div>
        <table>${rents.map((r, k) => `<tr><td>${k + 1} ${sp.type === 'rail' ? (k ? 'Flughäfen' : 'Flughafen') : (k ? 'Häfen' : 'Hafen')}</td><td>${M(r)}</td></tr>`).join('')}
        <tr><td>Bonus</td><td>+10 % auf alle deine Bahnhöfe</td></tr><tr><td>Hypothek</td><td>${M(sp.price / 2)}</td></tr><tr><td>Kaufpreis</td><td>${M(sp.price)}</td></tr></table>${ownerLine}</div>`;
    }
    const net = owner ? LG.network(S, i) : [i];
    const v = viewer();
    const manage = owner && v && owner.id === v.id && S.phase === 'play' && curP().id === v.id && canControl(v.id) && ['roll', 'end', 'debt', 'buy'].includes(S.sub);
    const sizes = [1, 2, 3, 4, 6, 8, 12];
    const lines = LG.LINES.filter((l) => l.a === i || l.b === i).map((l) => {
      const j = l.a === i ? l.b : l.a, t = (S.tracks || []).find((x) => LG.key(x.a, x.b) === LG.key(l.a, l.b));
      const oj = S.props[j].owner && P(S.props[j].owner);
      const cost = E.trackCost(S, i, j);
      let status;
      if (t) status = `<span class="trk-on" style="--pc:${P(t.owner).color}">liegt (${esc(P(t.owner).name)})</span>${manage && t.owner === v.id ? kbtn(`Rückbau +${M(Math.floor(t.cost / 2))}`, { type: 'untrack', a: i, b: j }, v.id, 'btn-small btn-ghost') : ''}`;
      else if (manage && oj && oj.id === v.id && !S.props[j].mort && !st.mort) status = kbtn(`🛤️ Bauen ${M(cost)}`, { type: 'track', a: i, b: j }, v.id, 'btn-small', v.money < cost, v.money < cost ? 'Zu wenig Geld' : '');
      else status = `<small>${oj ? `gehört ${esc(oj.name)}` : 'noch frei'} · ${M(cost)}</small>`;
      return `<tr><td>🚉 ${esc(SPACES[j].name)}<small>${l.km} km</small></td><td>${status}</td></tr>`;
    }).join('');
    return `<div class="deed logi-deed"><div class="deed-head light-text" style="--g:#1b3a2a">🚉 ${esc(sp.name)}<small>${esc(sp.sub || 'Bahnhof')}</small></div>
      <p class="deed-note">Miete = ${M(sp.price / 8)} × Netzgröße². Netz = deine Bahnhöfe, die mit deinen Schienen verbunden sind. +10 % pro eigenem Flughafen oder Hafen.${owner ? ` Aktuelles Netz: <strong>${net.length} Bahnhöfe</strong> → ${M(E.calcRent(S, i))}.` : ''}</p>
      <table><tr><th>Netz</th><th>Miete (ohne Bonus)</th></tr>${sizes.map((n) => `<tr class="${owner && n === net.length ? 'is-now' : ''}"><td>${n} ${n > 1 ? 'Bahnhöfe' : 'Bahnhof'}</td><td>${M(Math.round((sp.price / 8) * n * n))}</td></tr>`).join('')}</table>
      <h4 class="logi-h">Strecken</h4><table class="logi-lines">${lines}</table>
      <table><tr><td>Hypothek</td><td>${M(sp.price / 2)} (unterbricht das Netz)</td></tr><tr><td>Kaufpreis</td><td>${M(sp.price)}</td></tr></table>${ownerLine}</div>`;
  }
  // Schienennetz als Linien quer durch die Brettmitte
  function renderTracks() {
    const S = App.S, c = $('#center');
    let svg = $('#tracks');
    if (!S || !S.isLogi) { if (svg) svg.remove(); return; }
    const cr = c.getBoundingClientRect();
    if (!cr.width) return;
    const key = JSON.stringify([S.tracks, Math.round(cr.width), Math.round(cr.height), Object.keys(S.props).map((k) => S.props[k].owner)]);
    if (svg && svg.dataset.k === key) return;
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'tracks'; svg.setAttribute('aria-hidden', 'true'); c.prepend(svg); }
    svg.dataset.k = key;
    const W0 = cr.width, H0 = cr.height;
    svg.setAttribute('viewBox', `0 0 ${W0} ${H0}`);
    const pt = (i) => {
      const r = document.querySelector(`#board .cell[data-i="${i}"]`).getBoundingClientRect();
      return [Math.max(6, Math.min(W0 - 6, r.left + r.width / 2 - cr.left)), Math.max(6, Math.min(H0 - 6, r.top + r.height / 2 - cr.top))];
    };
    const path = (a, b) => {
      const [x1, y1] = pt(a), [x2, y2] = pt(b);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const cx = mx + (W0 / 2 - mx) * 0.35, cy = my + (H0 / 2 - my) * 0.35;
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    };
    const out = LG.LINES.map((l) => {
      const t = (S.tracks || []).find((x) => LG.key(x.a, x.b) === LG.key(l.a, l.b));
      return t ? `<path class="trk is-on" style="--pc:${P(t.owner).color}" d="${path(l.a, l.b)}"/>` : `<path class="trk" d="${path(l.a, l.b)}"/>`;
    }).join('');
    const dots = LG.STATIONS.map((i) => { const [x, y] = pt(i), o = S.props[i].owner && P(S.props[i].owner); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${o ? 5 : 3}" style="fill:${o ? o.color : 'rgba(255,255,255,.35)'}"/>`; }).join('');
    svg.innerHTML = out + dots;
  }
  window.addEventListener('resize', () => { if (App.S && App.S.isLogi && App.S.phase !== 'lobby') renderTracks(); });

  // ================= REALISTIC: Immobilien wie im echten Leben =================
  const pctTxt = (x, d = 1) => (x * 100).toFixed(d).replace('.', ',') + ' %';
  const signM = (n) => (n > 0 ? '+' : '') + M(n);
  const signPct = (x) => (x >= 0 ? '+' : '−') + pctTxt(Math.abs(x));
  const grpColor = (i) => (SPACES[i].group ? GROUPS[SPACES[i].group].color : '#cfc3e6');
  const kbtn = (...a) => btn(...a).replace('<button ', '<button data-keep="1" ');
  const REAL_DESC = {
    go: 'Über LOS passiert nichts. Geld gibt es am Quartalsende: Gehalt, Mieten, Hotelumsätze.',
    jail: 'Amtsgericht Düsseldorf. Wer nur draufkommt, schaut zu.',
    gotojail: 'Du wirst verklagt. Ohne Fachanwalt sitzt du bis zu 2 Züge im Gericht fest.',
    parking: 'KfW-Förderbank: 15 % Zuschuss aufs nächste Bauprojekt.',
    tax: 'Das Finanzamt schaut sich deine Steuererklärung an. Wer geschummelt (oder sich verrechnet) hat, zahlt nach – mit Zinsen.',
    april: 'Post vom Amt: Bescheide, Zinsen, Gesetze, Förderungen.',
    studio: 'Mieter-Post: Rohrbrüche, Mietnomaden, Schimmel, Hotelgäste.',
  };
  function realBand(st) {
    return st.units.map((u) => `<span class="slot s-${u.ready > App.S.q ? 'bau' : u.k}${u.nomad ? ' s-bad' : ''}"></span>`).join('');
  }
  function realTicker(S) {
    const m = S.mk;
    const shock = m.shock === 'pandemic' ? '<b class="bad">🦠 Pandemie</b>' : m.shock === 'crash' ? '<b class="bad">📉 Immobilienkrise</b>' : '';
    const left = S.settings.years ? S.settings.years * 4 - S.q + 1 : 0;
    return `<div class="re-ticker"><span>📅 <strong>${R.qName(S.q)}</strong> · ${R.SEASON_NAME[(S.q - 1) % 4]}</span><span>🏠 Preise ${signPct(m.idx - 1)}</span><span>🏦 Bauzins ${m.zins.toFixed(2).replace('.', ',')} %</span><span>🏨 Hotels ${Math.round(m.hotel * 100)} %</span>${left ? `<span>⏳ noch ${left} Quartal${left > 1 ? 'e' : ''}</span>` : ''}${shock}</div>`;
  }
  function expSub(i) {
    const S = App.S, sp = SPACES[i];
    if (sp.type === 'rail') return 'Bahnhof-Gewerbe · Gewerbemiete ca. 6,4 % im Jahr, mehr Bahnhöfe = mehr Pendler';
    if (sp.type === 'util') return 'Stadtwerke-Anteil · Dividende wächst mit allen Wohnungen und Hotels auf dem Brett';
    return `${R.LAGE[sp.group].lage} · Mietspiegel ${M(R.mietspiegel(S, i))}/Monat · ${R.SLOTS} Bau-Slots`;
  }
  function unitsLine(S, st) {
    const apts = st.units.filter((u) => u.k === 'apt').length, hotels = st.units.filter((u) => u.k === 'hotel').length;
    const bau = st.units.filter((u) => u.ready > S.q).length;
    const parts = [];
    if (apts) parts.push(`${apts} Wohnung${apts > 1 ? 'en' : ''}`);
    if (hotels) parts.push(`${hotels} Hotel${hotels > 1 ? 's' : ''}`);
    if (bau) parts.push(`${bau} im Bau`);
    return parts.join(' · ');
  }

  function exposeHTML(S, p, i, me) {
    const sp = SPACES[i], st = S.props[i], price = R.propValue(S, i), nk = R.buyCosts(S, i, price);
    const rows = [['Kaufpreis (Marktwert)', price], [`Grunderwerbsteuer ${pctTxt(nk.rate)}${nk.rate < 0.06 ? ' (BW)' : ' (NRW)'}`, nk.grest], ['Notar (1,5 %)', nk.notar], ['Grundbuchamt (0,5 %)', nk.grundbuch]];
    const room = R.loanRoom(S, p, price), rate = R.rateFor(S, p);
    const fins = [[0.8, '80 % finanzieren'], [0.5, '50 % finanzieren'], [0, 'Bar zahlen']].map(([f, l], k) => {
      const loan = Math.floor((price * f) / 1000) * 1000, cash = price + nk.total - loan;
      const bankNo = loan > room, noCash = p.money < cash;
      return btn(`${l}<small>${M(cash)} bar${loan ? ` · ${M(loan)} Kredit zu ${String(rate).replace('.', ',')} % · Rate ${M((loan * (rate + 1.5)) / 400)}/Q` : ''}</small>`, { type: 'buy', fin: f }, p.id, k === 0 ? 'btn-primary' : '', bankNo || noCash, bankNo ? 'Die Bank sagt nein: zu wenig Sicherheiten oder Einkommen' : noCash ? 'Zu wenig Eigenkapital' : '');
    });
    const units = st.units.length ? `Mit Bestand: ${unitsLine(S, st)}.` : sp.type === 'prop' ? 'Unbebautes Grundstück: kostet Grundsteuer und bringt erst mit Wohnungen oder Hotel Geld.' : '';
    return `<div class="expose"><div class="ex-head" style="--g:${grpColor(i)}"><strong>${esc(sp.name)}</strong><small>${esc(expSub(i))}</small></div>
      <table>${rows.map((r) => `<tr><td>${r[0]}</td><td>${M(r[1])}</td></tr>`).join('')}<tr class="sum"><td>Gesamt</td><td>${M(price + nk.total)}</td></tr></table>
      ${units ? `<p class="ex-note">${units}</p>` : ''}
      ${me ? `<div class="btn-col">${fins.join('')}${btn('Nicht kaufen', { type: 'pass' }, p.id, 'btn-ghost')}</div>` : `<p class="action-note">${esc(p.name)} überlegt …</p>`}</div>`;
  }
  function realCardHTML(S) {
    const c = R.cardText(S), opts = R.cardOpts(S), pid = S.card.pid;
    const kind = { amt: '✉️ Post vom Amt', mieter: '📬 Mieter-Post', case: '⚖️ Entscheidung' }[c.deck];
    return `<div class="re-card deck-${c.deck}"><span class="rc-kind">${kind}</span><strong>${esc(c.title)}</strong><p>${esc(c.text)}</p>
      ${canControl(pid) ? `<div class="btn-col">${opts.map((o, k) => btn(esc(o.label), { type: 'card', k: o.k }, pid, k === 0 ? 'btn-primary' : '', !!o.disabled, o.why || '')).join('')}</div>` : `<p class="action-note">${esc(P(pid).name)} entscheidet …</p>`}</div>`;
  }
  function taxDueHTML(S, p, me) {
    const t = p.taxDue, fee = R.advisorFee(t), n = R.taxTasks(t.lvl);
    const rows = [
      ['Vermietung & Verpachtung', t.vv], ['Gewerbe (Hotels, Bahnhöfe, Stadtwerke)', t.gew], ['Spekulationsgewinne', t.gain],
      ['… darin AfA (Abschreibung)', -t.afa], ['… darin Kreditzinsen', -t.int], ...(t.carryUsed ? [['Verlustvortrag genutzt', -t.carryUsed]] : []),
      ['Zu versteuern', t.taxable, 'sum'], ['Einkommensteuer (zusätzlich)', t.est], ['Solidaritätszuschlag', t.soli], ['Gewerbesteuer', t.gewSt], ['Anrechnung § 35 EStG', -t.anr],
      ['Steuer gesamt', t.total, 'sum'], ['Schon vorausgezahlt', -t.pre], [t.total - t.pre >= 0 ? 'Nachzahlung' : 'Erstattung', t.total - t.pre, 'sum'],
    ];
    return `<div class="re-tax"><span class="rc-kind">🧾 Steuererklärung ${t.year}</span>
      <table>${rows.map(([l, v, c]) => `<tr class="${c || ''}"><td>${l}</td><td>${M(v)}</td></tr>`).join('')}</table>
      ${me ? `<div class="btn-col">${btn(`👩‍💼 Steuerberaterin beauftragen: ${M(fee)}<small>Macht alles fehlerfrei und findet ca. ${M(t.total * 0.07)} Ersparnis</small>`, { type: 'taxAdvisor' }, p.id, 'btn-primary')}
        ${uiBtn(`🧮 Selbst machen: STEUER-RUSH<small>Stufe ${t.lvl}/6 · ${n} Belege · Fehler kosten Geld oder fliegen bei einer Prüfung auf</small>`, 'rxTax')}</div>`
        : `<p class="action-note">${esc(p.name)} macht die Steuererklärung …</p>`}</div>`;
  }
  function debtHTML(S, p, me) {
    const lim = R.dispoLimit(p), over = -p.money - lim, room = R.loanRoom(S, p);
    const need = Math.ceil((over + 5000) / 1000) * 1000;
    let h = `<div class="re-warn"><strong>⚠️ Dispo-Limit überschritten</strong><p>Konto ${M(p.money)}, Dispo-Limit ${M(-lim)}. Die Bank will ${M(Math.max(0, over))} sehen. Verkaufe eine Immobilie (Portfolio → Objekt-Akte), nimm einen Kredit auf oder melde Privatinsolvenz an.</p></div>`;
    if (!me) return h + `<p class="action-note">${esc(p.name)} verhandelt mit der Bank …</p>`;
    h += '<div class="btn-col">';
    if (over > 0 && room >= need) h += btn(`🏦 Kredit über ${M(need)} aufnehmen`, { type: 'loan', amt: need }, p.id, 'btn-primary');
    else if (over > 0) h += `<p class="action-note">Die Bank gibt dir höchstens ${M(room)}. Das reicht nicht.</p>`;
    h += btn('Weiter', { type: 'debtDone' }, p.id, over > 0 ? '' : 'btn-primary', over > 0);
    h += App.confirmBankrupt
      ? `<p class="action-note">Wirklich? Alle Immobilien gehen in die Zwangsversteigerung.</p>${btn('Ja, Privatinsolvenz', { type: 'insolvency' }, p.id, 'btn-danger')}${uiBtn('Abbrechen', 'cancelBankrupt', 'btn-ghost')}`
      : btn('Privatinsolvenz …', { type: 'bankruptAsk' }, p.id, 'btn-ghost');
    return h + '</div>';
  }

  function renderRealAction() {
    const S = App.S, el = $('#panel-action'), cur = curP();
    const head = `<div class="action-head">${tokHTML(cur.token, cur.color)}<div><h3>${esc(cur.name)} ist dran</h3><small>Konto ${M(cur.money)} · Netto ${MK(R.netWorth(S, cur))}</small></div></div>`;
    if (isBusy()) {
      el.innerHTML = realTicker(S) + head + `<p class="action-note rolling">${Date.now() < (App.walkAfter || 0) ? '🎲 Die Würfel rollen …' : '🚶 unterwegs …'}</p>`;
      return;
    }
    let h = realTicker(S) + head;
    const me = canControl(cur.id);
    const wait = (t) => `<p class="action-note">${t}</p>`;
    switch (S.sub) {
      case 'roll': h += me ? `<div class="btn-row">${btn('🎲 Würfeln', { type: 'roll' }, cur.id, 'btn-primary btn-big')}</div>` : wait(`${esc(cur.name)} würfelt gleich …`); break;
      case 'buy': h += exposeHTML(S, cur, cur.pos, me); break;
      case 'card': h += realCardHTML(S); break;
      case 'tax': h += taxDueHTML(S, cur, me); break;
      case 'debt': h += debtHTML(S, cur, me); break;
      case 'offer': {
        const o = S.offer, from = P(o.from), to = P(o.to);
        h += `<div class="offer"><strong>✉️ Kaufangebot</strong><p>${esc(from.name)} bietet ${esc(to.name)} <strong>${M(o.price)}</strong> für ${esc(SPACES[o.idx].name)} (Marktwert ${M(R.propValue(S, o.idx))}).</p>
          ${canControl(to.id) ? `<div class="btn-row">${btn(App.mode === 'local' ? `${esc(to.name)}: Verkaufen` : 'Verkaufen', { type: 'offerAccept' }, to.id, 'btn-primary')}${btn('Ablehnen', { type: 'offerDecline' }, to.id)}</div>` : wait(`Warte auf ${esc(to.name)} …`)}</div>`;
        break;
      }
      case 'end': {
        if (!me) { h += wait(`${esc(cur.name)} verwaltet das Portfolio …`); break; }
        const st = S.props[cur.pos];
        if (st && st.owner && st.owner !== cur.id && !cur.offered && st.units.every((u) => u.ready <= S.q)) {
          const v = R.propValue(S, cur.pos);
          h += `<div class="re-offer"><small>Kaufangebot an ${esc(P(st.owner).name)} für ${esc(SPACES[cur.pos].name)} (Marktwert ${MK(v)}):</small>
            <div class="btn-row">${[1, 1.15, 1.3].map((x) => btn(`${Math.round(x * 100)} % · ${MK(v * x)}`, { type: 'offer', pct: x }, cur.id, 'btn-small')).join('')}</div></div>`;
        }
        h += `<div class="btn-row">${btn('Zug beenden', { type: 'endTurn' }, cur.id, 'btn-primary')}</div>`;
        break;
      }
    }
    if (me && ['roll', 'end', 'buy', 'debt'].includes(S.sub)) h += `<p class="action-note re-hint">Bauen, Mieten erhöhen, verkaufen: Immobilie im Portfolio oder auf dem Brett antippen.</p>`;
    el.innerHTML = h;
  }

  function renderRealPlayers() {
    const S = App.S;
    $('#players').innerHTML = S.players.map((p, i) => {
      const own = R.owned(S, p.id).sort((a, b) => a - b);
      const meta = [];
      if (p.bankrupt) meta.push('<span class="warn">insolvent</span>');
      if (p.court) meta.push('<span class="warn">vor Gericht</span>');
      if (p.money < 0 && !p.bankrupt) meta.push('<span class="warn">im Dispo</span>');
      if (p.taxDue) meta.push('<span>Steuer offen</span>');
      if (p.rs) meta.push('<span>⚖️ Rechtsschutz</span>');
      if (p.kfw) meta.push('<span>🏦 KfW</span>');
      if (App.mode !== 'local' && !p.connected && !p.bankrupt && !p.bot) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      const sc = p.schufa >= 90 ? 'good' : p.schufa >= 75 ? 'mid' : 'bad';
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" data-pid="${esc(p.id)}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${own.map((k) => `<i style="--g:${grpColor(k)}" title="${esc(SPACES[k].name)}"></i>`).join('')}</div>
          ${p.bankrupt ? '' : `<div class="re-pstats"><span title="Nettovermögen">💎 ${MK(R.netWorth(S, p))}</span><span title="Kredite">🏦 ${MK(R.debt(p))}</span><span class="schufa is-${sc}" title="SCHUFA-Score">SCHUFA ${Math.round(p.schufa)}</span></div>`}
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${M(p.money)}</div></li>`;
    }).join('');
  }

  function renderRealProps() {
    const S = App.S, v = viewer(), wrap = $('#my-props');
    if (!v) { $('#props-title').textContent = 'Portfolio'; wrap.innerHTML = '<p class="empty">Du schaust zu.</p>'; return; }
    $('#props-title').textContent = App.mode === 'local' || v.id !== myId ? `Portfolio von ${v.name}` : 'Dein Portfolio';
    const own = R.owned(S, v.id).sort((a, b) => a - b);
    const st = v.stmt;
    let h = `<div class="re-fin">
      <div><small>Konto</small><strong class="${v.money < 0 ? 'neg' : ''}">${M(v.money)}</strong></div>
      <div><small>Nettovermögen</small><strong>${MK(R.netWorth(S, v))}</strong></div>
      <div><small>Kredite</small><strong>${MK(R.debt(v))}</strong></div>
      <div><small>Letztes Quartal</small><strong class="${st && st.total < 0 ? 'neg' : 'pos'}">${st ? signM(st.total) : '–'}</strong></div></div>
      <div class="btn-row">${uiBtn('📄 Kontoauszug', 'rxStmt', 'btn-small btn-ghost')}${uiBtn('🏦 Bank & Versicherungen', 'rxBank', 'btn-small btn-ghost')}</div>`;
    if (!own.length) h += '<p class="empty">Noch keine Immobilien. Lande auf einem freien Feld und kauf es.</p>';
    h += own.map((k) => {
      const sp = SPACES[k], ps = S.props[k];
      let info = sp.type === 'rail' ? 'Bahnhof · Gewerbemiete' : sp.type === 'util' ? 'Stadtwerke-Anteil' : `${R.usedSlots(ps)}/${R.SLOTS} Slots${ps.units.length ? ' · ' + unitsLine(S, ps) : ' · unbebaut'}`;
      const warn = [];
      if (ps.units.some((u) => u.nomad)) warn.push('Mietnomade!');
      const empty = ps.units.filter((u) => u.k === 'apt' && u.ready <= S.q && !u.tenant).length;
      if (empty) warn.push(`${empty} leer`);
      if (ps.units.some((u) => u.mold)) warn.push('Schimmel');
      return `<button type="button" class="prop-row re-prow" data-ui="rxProp" data-i="${k}" style="--g:${grpColor(k)}"><span class="bar"></span>
        <div class="pr-name">${esc(sp.name)}<small>${info}${warn.length ? ` · <b class="warn">${warn.join(' · ')}</b>` : ''}</small></div>
        <div class="pr-val">${MK(R.propValue(S, k))}<span class="band re-band">${realBand(ps)}</span></div></button>`;
    }).join('');
    wrap.innerHTML = h;
  }

  function unitCardHTML(S, i, u, k, manage, owner) {
    const ready = u.ready <= S.q;
    let h = `<div class="slot-card is-${u.k}${u.k === 'hotel' ? ' w2' : ''}${ready ? '' : ' is-bau'}${u.nomad ? ' is-bad' : ''}">`;
    if (!ready) return h + `<span>🚧 ${u.k === 'apt' ? 'Wohnung' : 'Hotel'} im Bau</span><small>fertig ${R.qName(u.ready)} · ${MK(u.cost)}</small></div>`;
    if (u.k === 'apt') {
      const ms = R.mietspiegel(S, i);
      h += `<span>🏠 ${u.tenant ? esc(u.tenant) : 'Leerstand'}</span>`;
      h += u.tenant ? `<small>${M(u.rent)}/Monat (Spiegel ${M(ms)})${u.nomad ? ' · <b class="warn">zahlt nicht!</b>' : ''}${u.mold ? ' · <b class="warn">Schimmel −20 %</b>' : ''}</small>` : '<small>Neue Mieter kommen zum Quartalsende</small>';
      return h + `<small>Wert ${MK(R.unitValue(S, u))}</small></div>`;
    }
    const pacht = u.mode === 'pacht';
    const qi = (S.q - 1) % 4;
    const fc = pacht ? u.cost * 0.0125 : R.hotelNet(R.hotelQ(S, i, u, owner, qi));
    h += `<span>🏨 Hotel · ${R.ROOMS} Zimmer · ${pacht ? 'verpachtet' : 'selbst betrieben'}</span>`;
    h += `<small>${pacht ? `Feste Pacht ${M(fc)}/Q` : `${u.occ ? `Auslastung zuletzt ${Math.round(u.occ * 100)} % · ` : ''}Prognose ${R.SEASON_NAME[qi]}: ${signM(fc)}`} · Wert ${MK(R.unitValue(S, u))}</small>`;
    if (manage) {
      h += '<div class="btn-row">';
      if (!pacht) h += Object.entries(R.PRICE_LVL).map(([id, l]) => kbtn(l.name, { type: 'hotelPrice', idx: i, u: k, lvl: id }, owner.id, `btn-small ${u.lvl === id ? 'is-on' : 'btn-ghost'}`)).join('');
      h += kbtn(pacht ? 'Selbst betreiben (Ð10.000)' : 'Verpachten', { type: 'hotelMode', idx: i, u: k, mode: pacht ? 'self' : 'pacht' }, owner.id, 'btn-small btn-ghost');
      h += '</div>';
    }
    return h + '</div>';
  }

  function realPropHTML(i) {
    const S = App.S, sp = SPACES[i], st = S.props[i];
    if (!st) return `<div class="deed"><div class="deed-head light-text" style="--g:#2a2140">${REAL_ICON[sp.type] || sp.icon || ''} ${esc(sp.name)}</div><div class="deed-foot" style="border:0;font-size:14px;color:var(--fg)">${esc(REAL_DESC[sp.type] || '')}</div></div>`;
    const owner = P(st.owner), v = viewer();
    const mine = owner && v && owner.id === v.id;
    const manage = mine && S.phase === 'play' && curP().id === v.id && canControl(v.id) && ['roll', 'end', 'debt', 'buy'].includes(S.sub);
    const val = R.propValue(S, i), land = R.landValue(S, i);
    let h = `<div class="re-file"><div class="ex-head" style="--g:${grpColor(i)}"><strong>${esc(sp.name)}</strong><small>${esc(expSub(i))}</small></div>
      <div class="re-kpis"><div><small>Marktwert</small><strong>${M(val)}</strong></div><div><small>davon Boden</small><strong>${M(land)}</strong></div>
      <div><small>Eigentümer</small><strong>${owner ? esc(owner.name) : 'zu verkaufen'}</strong></div>
      ${owner ? `<div><small>Gekauft</small><strong>${R.qName(st.bought)} · ${MK(st.paid)}</strong></div>` : ''}</div>`;
    if (sp.type === 'prop') {
      const ms = R.mietspiegel(S, i), used = R.usedSlots(st);
      h += `<p class="re-sub">Mietspiegel ${M(ms)}/Monat für 75 m² · Grundsteuer ${M(land * 0.0009)}/Quartal · Ganze Farbgruppe: Quartier +8 % Miete, +5 % Hotelgäste</p>`;
      h += '<div class="slots">';
      st.units.forEach((u, k) => { h += unitCardHTML(S, i, u, k, manage, owner); });
      for (let k = used; k < R.SLOTS; k++) h += `<div class="slot-card is-free"><span>Slot ${k + 1}</span><small>frei</small></div>`;
      h += '</div>';
      if (manage) {
        const free = R.SLOTS - used;
        if (st.blocked === S.q) h += '<p class="re-warn-line">📋 Das Bauamt hat gerade abgelehnt. Neuer Antrag im nächsten Quartal.</p>';
        else if (free) {
          h += '<div class="build-opts">';
          ['apt', 'hotel'].forEach((kind) => {
            if (kind === 'hotel' && free < 2) return;
            const cost = R.unitCost(S, i, kind), fee = R.permitFee(kind), kfw = v.kfw ? Math.round(cost * 0.15) : 0;
            const yr = kind === 'hotel' ? [0, 1, 2, 3].reduce((a, q) => a + R.hotelNet(R.hotelQ(S, i, { cost, lvl: 'normal' }, v, q)), 0) : ms * 12 - 1500;
            const room = R.loanRoom(S, v, cost);
            const fins = [0, 0.5, 0.8].map((f) => {
              const loan = Math.floor((cost * f) / 1000) * 1000, cash = cost + fee - loan - kfw;
              const no = loan > room, poor = v.money < cash;
              return kbtn(f ? `${f * 100} % Kredit · ${MK(cash)} bar` : `Bar · ${MK(cash)}`, { type: 'build', idx: i, k: kind, fin: f }, v.id, 'btn-small', no || poor, no ? 'Bank sagt nein' : poor ? 'Zu wenig Geld' : '');
            }).join('');
            h += `<div class="build-opt"><div><strong>${kind === 'apt' ? '🏠 Wohnung bauen' : '🏨 Hotel bauen'}</strong>
              <small>${kind === 'apt' ? `75 m² · 1 Slot · Bauzeit 1 Quartal · Miete ca. ${M(ms)}/Monat` : `${R.ROOMS} Zimmer · 2 Slots · Bauzeit 2 Quartale · Gewinn ca. ${M(yr)}/Jahr (schwankt mit Saison und Krisen)`}</small>
              <small>Baukosten ${M(cost)} + Baugenehmigung ${M(fee)}${kfw ? ` − KfW-Zuschuss ${M(kfw)}` : ''} · Rendite ca. ${pctTxt(yr / cost)}</small></div>
              <div class="btn-row">${fins}</div></div>`;
          });
          h += '</div>';
        }
        const can = st.units.some((u) => u.k === 'apt' && u.tenant && !u.nomad && S.q - u.raised >= 5 && u.rent < ms);
        const nomad = st.units.some((u) => u.nomad);
        h += '<div class="btn-row re-acts">';
        if (st.units.some((u) => u.k === 'apt' && u.tenant)) h += btn('📈 Mieterhöhung verlangen', { type: 'raise', idx: i }, v.id, 'btn-small', !can, can ? 'Bis zum Mietspiegel, höchstens +15 %' : 'Sperrfrist 15 Monate oder schon am Mietspiegel');
        if (nomad) h += btn('🚪 Räumungsklage', { type: 'evict', idx: i }, v.id, 'btn-small btn-danger');
        h += '</div>';
      }
    }
    if (manage && !st.units.some((u) => u.ready > S.q)) {
      const fast = S.sub === 'debt' ? 0.85 : 0.95, gross = Math.round(val * fast), mak = Math.round(gross * 0.0357);
      h += `<div class="re-sell"><small>${S.sub === 'debt' ? 'Notverkauf: 85 % vom Marktwert' : 'Verkauf: 95 % vom Marktwert'}, Makler 3,57 %${S.q - st.bought < 40 ? ' · Gewinn innerhalb von 10 Jahren ist steuerpflichtig' : ''}</small>
        ${btn(`🤝 Verkaufen für ${M(gross - mak)}`, { type: 'sell', idx: i }, v.id, 'btn-small btn-ghost')}</div>`;
    }
    return h + '</div>';
  }
  function openRealProp(i) { openModal(realPropHTML(i), () => realPropHTML(i)); }

  function realBankHTML() {
    const S = App.S, v = viewer();
    if (!v || !S.isReal) return '';
    const manage = S.phase === 'play' && curP().id === v.id && canControl(v.id) && ['roll', 'end', 'debt', 'buy'].includes(S.sub);
    const room = R.loanRoom(S, v), rate = R.rateFor(S, v);
    const loans = v.loans.map((L) => `<tr><td>${esc(L.why)}<small>${R.qName(L.q)}</small></td><td>${M(L.rest)}</td><td>${String(L.rate).replace('.', ',')} %</td><td>${M(R.annuity(L))}</td>
      <td>${manage ? kbtn('Ablösen', { type: 'repay', id: L.id }, v.id, 'btn-small btn-ghost', v.money < L.rest * 1.015, `${M(L.rest * 1.015)} inkl. 1,5 % Vorfälligkeitsentschädigung`) : ''}</td></tr>`).join('');
    const amounts = [10000, 50000, 100000, 250000].filter((a) => a < room).concat(room >= 5000 ? [room] : []);
    const elemCost = Math.round(R.owned(S, v.id).reduce((a, k) => a + S.props[k].units.reduce((b, u) => b + (u.ready <= S.q ? R.unitValue(S, u) : 0), 0), 0) * 0.00015);
    return `<h2>🏦 Bank & Versicherungen</h2>
      <div class="re-kpis"><div><small>SCHUFA-Score</small><strong>${Math.round(v.schufa)}</strong></div><div><small>Dein Zins</small><strong>${String(rate).replace('.', ',')} %</strong></div>
      <div><small>Kreditrahmen</small><strong>${M(room)}</strong></div><div><small>Dispo-Limit</small><strong>${M(R.dispoLimit(v))}</strong></div></div>
      <p class="re-sub">Die Bank leiht bis 80 % vom Wert deiner Immobilien – und nur, wenn die Raten zu Gehalt und Mieten passen. Zins = Bauzins ${S.mk.zins.toFixed(2).replace('.', ',')} % + Aufschlag nach SCHUFA. Tilgung 1,5 % im Jahr. Dispo kostet 11,5 %.</p>
      <h3>Kredite</h3>${v.loans.length ? `<table class="re-loans"><tr><th>Zweck</th><th>Rest</th><th>Zins</th><th>Rate/Q</th><th></th></tr>${loans}</table>` : '<p class="empty">Keine Kredite. Schuldenfrei!</p>'}
      ${manage && amounts.length ? `<h3>Neuer Kredit (Grundschuld auf den Bestand)</h3><div class="btn-row">${amounts.map((a) => kbtn(M(a), { type: 'loan', amt: a }, v.id, 'btn-small')).join('')}</div>` : ''}
      <h3>Versicherungen</h3>
      <div class="re-ins"><div><strong>⚖️ Vermieter-Rechtsschutz</strong><small>Ð390 im Quartal. Anwälte kosten dich dann nur Ð250 Selbstbeteiligung.</small></div>${manage ? kbtn(v.rs ? 'Kündigen' : 'Abschließen', { type: 'toggle', what: 'rs' }, v.id, `btn-small ${v.rs ? 'btn-ghost' : ''}`) : `<span>${v.rs ? 'aktiv' : 'keine'}</span>`}</div>
      <div class="re-ins"><div><strong>🌊 Elementarversicherung</strong><small>ca. ${M(elemCost)} im Quartal. Zahlt bei Hochwasser bis auf Ð2.500.</small></div>${manage ? kbtn(v.elem ? 'Kündigen' : 'Abschließen', { type: 'toggle', what: 'elem' }, v.id, `btn-small ${v.elem ? 'btn-ghost' : ''}`) : `<span>${v.elem ? 'aktiv' : 'keine'}</span>`}</div>
      <p class="re-sub">🏠 Gebäudeversicherung gegen Feuer und Leitungswasser ist bei allen Gebäuden automatisch dabei.</p>`;
  }
  function stmtHTML() {
    const v = viewer(), st = v && v.stmt;
    if (!v) return '';
    if (!st) return '<h2>📄 Kontoauszug</h2><p class="empty">Das erste Quartal läuft noch. Am Quartalsende kommt hier die Abrechnung.</p>';
    const row = ([l, a]) => `<div class="stmt-row"><span>${esc(l)}</span><strong class="${a < 0 ? 'neg' : 'pos'}">${signM(a)}</strong></div>`;
    return `<h2>📄 Quartalsabrechnung ${R.qName(st.q)}</h2><p class="action-note">${esc(v.name)} · Konto jetzt ${M(v.money)}</p>
      <div class="stmt"><h4>Einnahmen</h4>${st.lines.filter(([, a]) => a > 0).map(row).join('')}<h4>Ausgaben</h4>${st.lines.filter(([, a]) => a < 0).map(row).join('')}
      <div class="stmt-sum"><span>Saldo</span><strong class="${st.total < 0 ? 'neg' : 'pos'}">${signM(st.total)}</strong></div></div>
      <p class="re-sub">Steuer-Vorauszahlung ${M(v.taxPre)} im Quartal${v.lossCarry ? ` · Verlustvortrag ${M(v.lossCarry)}` : ''} · Nebenkosten der Mieter werden umgelegt, bei Leerstand zahlst du sie selbst.</p>`;
  }
  function realRulesHTML() {
    return `<h2>🏢 DULIDANOPOLY REALISTIC</h2><div class="rules">
      <p>Immobilien wie im echten Leben. Eine Runde ist ein Quartal. Alle starten mit Ð250.000 Eigenkapital und einem Job (Ð16.500 netto im Quartal, Ð8.400 Lebenshaltung). Am Ende zählt das Nettovermögen: Konto + Immobilien − Kredite.</p>
      <h3>Kaufen</h3><ul><li>Auf freien Feldern kaufst du zum Marktwert. Dazu kommen Grunderwerbsteuer (6,5 % in NRW, 5 % in Öhringen/BW), Notar 1,5 % und Grundbuch 0,5 %.</li>
        <li>Finanzieren geht mit 50 % oder 80 % Kredit. Die Bank prüft Sicherheiten (80 % Beleihung) und ob die Raten zu Gehalt und Mieten passen. Zins nach SCHUFA-Score.</li>
        <li>Auf fremden Feldern zahlst du eine Leistung (Zwischenmiete, Hotel-Tagung, Pendler-Abo) und darfst ein Kaufangebot machen.</li></ul>
      <h3>Bauen mit Slots</h3><ul><li>Jedes Grundstück hat 6 Slots. Eine Wohnung braucht 1 Slot, ein Hotel 2. Reihenfolge egal: 6 Wohnungen, 3 Hotels oder gemischt.</li>
        <li>Erst kommt die Baugenehmigung (Gebühr, kann abgelehnt werden), dann die Bauzeit: Wohnung 1 Quartal, Hotel 2 Quartale. KfW-Förderung gibt 15 % Zuschuss.</li></ul>
      <h3>Wohnungen</h3><ul><li>Mieter zahlen Kaltmiete nach Mietspiegel. Nebenkosten (Wasser, Müll, Hausstrom) werden umgelegt, bei Leerstand zahlst du sie.</li>
        <li>Mieterhöhung höchstens bis zum Mietspiegel, max. +15 %, frühestens nach 15 Monaten. Mieter können widersprechen oder kündigen.</li>
        <li>Mietnomaden zahlen nicht – dann hilft nur die Räumungsklage.</li></ul>
      <h3>Hotels</h3><ul><li>Umsatz = Zimmer × Auslastung × Zimmerpreis. Sommer voll, Winter leer. Davon gehen ab: 15 % Booking-Provision, Personal, Wasser, Energie, Reinigung, Fixkosten.</li>
        <li>Preisstrategie Budget/Standard/Premium ändert Preis und Auslastung. Oder verpachten: feste Pacht, kein Risiko, weniger Gewinn.</li>
        <li>Pandemien leeren Hotels, Messen füllen sie.</li></ul>
      <h3>Jedes Quartal</h3><ul><li>Abrechnung mit allem: Mieten, Hotelumsatz, Grundsteuer, Versicherung, Hausverwaltung, Instandhaltung, Zinsen, Tilgung, Steuer-Vorauszahlung. Steht im Kontoauszug.</li>
        <li>Der Markt bewegt sich: Immobilienpreise, Bauzinsen, Baukosten, Mietspiegel. Krisen kommen ohne Vorwarnung.</li></ul>
      <h3>Steuern</h3><ul><li>Nach jedem Q4 kommt die Steuererklärung: Vermietung (minus AfA und Zinsen), Gewerbe (Hotels, Bahnhöfe), Spekulationsgewinne. Einkommensteuer nach Tarif, Soli, Gewerbesteuer.</li>
        <li>Entweder die Steuerberaterin machen lassen (kostet, spart aber Steuern), oder selbst rechnen im STEUER-RUSH. Je mehr du besitzt, desto schwerer. Fehler kosten Geld – oder fliegen bei einer Prüfung auf (Finanzamt-Felder, Betriebsprüfung).</li></ul>
      <h3>Anwälte & Gericht</h3><ul><li>Bei Streit wählst du: Fachanwalt (teuer, gute Chancen), selbst vertreten (nur bis Ð10.000) oder Vergleich. Wer verliert, zahlt beide Anwälte.</li>
        <li>Rechtsschutzversicherung macht Anwälte billig. „Klage! Ab vors Gericht“ hält dich bis zu 2 Züge fest – außer dein Anwalt holt dich raus.</li></ul>
      <h3>Pleite</h3><ul><li>Das Konto darf bis zum Dispo-Limit ins Minus (11,5 % Zinsen). Darüber musst du verkaufen, umschulden oder Privatinsolvenz anmelden.</li></ul></div>`;
  }

  // ---------- STEUER-RUSH: die Steuererklärung als Rechen-Minigame ----------
  function makeTaxTasks(S, p, lvl, n) {
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const fmt = (x) => 'Ð' + x.toLocaleString('de-DE');
    const mine = R.owned(S, p.id).filter((k) => SPACES[k].type === 'prop');
    const nm = () => (mine.length ? SPACES[mine[ri(0, mine.length - 1)]].name : ['Weseler Straße', 'Hochfeld', 'Meiderich'][ri(0, 2)]);
    const big = lvl >= 4 ? 3 : 1;
    const T = [
      [1, () => { const w = ri(1, 3), r = ri(55, 150) * 10; return { head: 'Mieteinnahmen', stamp: 'EINNAHME', q: `${esc(nm())}<br>${w} Wohnung${w > 1 ? 'en' : ''} × ${fmt(r)} × 3 Monate`, a: w * r * 3 }; }],
      [1, () => { const a = ri(80, 240), b = ri(30, 90), c = ri(15, 60); return { head: 'Nebenkosten', stamp: 'UMLAGE', q: `Wasser ${fmt(a)}<br>+ Müll ${fmt(b)}<br>+ Hausstrom ${fmt(c)}`, a: a + b + c }; }],
      [2, () => { const a = ri(40, 120) * 100 * big, b = ri(10, 35) * 100 * big; return { head: 'Überschuss', stamp: 'V+V', q: `Mieteinnahmen ${fmt(a)}<br>− Werbungskosten ${fmt(b)}`, a: a - b }; }],
      [2, () => { const c = ri(150, 350) * 1000; return { head: 'Abschreibung', stamp: 'AfA', q: `AfA 3 % von<br>Baukosten ${fmt(c)}`, a: (c / 100) * 3 }; }],
      [3, () => { const pr = ri(100, 900) * 1000; return { head: 'Grunderwerbsteuer', stamp: 'NOTAR', q: `6,5 % auf<br>Kaufpreis ${fmt(pr)}`, a: (pr / 1000) * 65 }; }],
      [3, () => { const nights = ri(6, 25), adr = ri(7, 17) * 10; return { head: 'Hotelumsatz', stamp: 'GEWERBE', q: `${R.ROOMS} Zimmer × ${nights} Nächte<br>× ${fmt(adr)} pro Nacht`, a: R.ROOMS * nights * adr }; }],
      [4, () => { const L = ri(50, 600) * 1000; return { head: 'Kreditzinsen', stamp: 'BANK', q: `Zinsen pro Quartal:<br>${fmt(L)} × 4 % ÷ 4`, a: L / 100 }; }],
      [4, () => { const a = ri(300, 900) * 100, b = ri(50, 250) * 100; return { head: 'Steuer', stamp: 'ESt', q: `(${fmt(a)} − ${fmt(b)})<br>× 30 % Steuersatz`, a: ((a - b) / 10) * 3 }; }],
      [5, () => { const x = ri(10, 200); return { head: 'Gewerbesteuer', stamp: 'GewSt', q: `(Gewinn ${fmt(24500 + x * 400)} − Freibetrag ${fmt(24500)})<br>× 3,5 % × Hebesatz 450 %`, a: x * 63 }; }],
      [5, () => { const e = ri(20, 300) * 200; return { head: 'Solidaritätszuschlag', stamp: 'SOLI', q: `5,5 % von<br>Einkommensteuer ${fmt(e)}`, a: (e / 200) * 11 }; }],
      [6, () => { const L = ri(25, 150) * 4000; return { head: 'Annuität', stamp: 'BANK', q: `Quartalsrate:<br>${fmt(L)} × (3,6 % + 1,5 %) ÷ 4`, a: (L / 4000) * 51 }; }],
      [6, () => { const a = ri(20, 80) * 1000, b = ri(5, 30) * 1000, c = ri(2, 12) * 1000; return { head: 'Jahresergebnis', stamp: 'BILANZ', q: `Umsatz ${fmt(a * 4)}<br>− Personal ${fmt(b * 4)} − AfA ${fmt(c)}`, a: a * 4 - b * 4 - c }; }],
    ];
    const pool = T.filter(([m]) => m <= lvl);
    const tasks = [];
    for (let k = 0; k < n; k++) {
      // erst leicht, dann die schweren Belege der eigenen Stufe
      const hard = pool.filter(([m]) => m >= lvl - 1);
      const from = k >= n / 2 && hard.length ? hard : pool;
      tasks.push(from[ri(0, from.length - 1)][1]());
    }
    return tasks;
  }
  function openTaxGame() {
    const S = App.S, p = curP();
    if (!S || !S.isReal || S.sub !== 'tax' || !p.taxDue || !canControl(p.id) || $('#taxgame')) return;
    const lvl = p.taxDue.lvl, n = R.taxTasks(lvl), pid = p.id;
    const tasks = makeTaxTasks(S, p, lvl, n);
    const secs = Math.max(8, 22 - 2 * lvl);
    let k = 0, ok = 0, combo = 0, input = '', t0 = 0, timer = null, lock = true;
    const ov = document.createElement('div');
    ov.className = 'taxgame';
    ov.id = 'taxgame';
    ov.innerHTML = `<div class="tg-grid" aria-hidden="true"></div><div class="tg-box" role="dialog" aria-label="Steuer-Rush">
      <div class="tg-top"><span class="tg-logo">ELSTER<b>3000</b></span><span class="tg-lvl">STEUER-RUSH · Stufe ${lvl}/6</span><span class="tg-prog" id="tg-prog">${n} Belege</span><button class="tg-x" id="tg-x" aria-label="Abbrechen">✕</button></div>
      <div class="tg-time"><i id="tg-bar"></i></div>
      <div class="tg-stage" id="tg-stage"></div>
      <div class="tg-display" hidden><span id="tg-in">0</span></div>
      <div class="tg-keys" hidden>${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button data-k="${d}">${d}</button>`).join('')}<button data-k="del">⌫</button><button data-k="0">0</button><button data-k="ok" class="tg-ok">OK</button></div>
      <div class="tg-foot"><span id="tg-score">Steuerjahr ${p.taxDue.year}</span><span id="tg-combo"></span></div></div>`;
    document.body.appendChild(ov);
    const q = (s) => ov.querySelector(s);
    const close = () => { clearInterval(timer); ov.remove(); document.removeEventListener('keydown', onKey); };
    const upd = () => { q('#tg-in').textContent = input ? Number(input).toLocaleString('de-DE') : '0'; };
    function show() {
      if (k >= n) return finish();
      const t = tasks[k];
      q('#tg-prog').textContent = `Beleg ${k + 1}/${n}`;
      q('#tg-stage').innerHTML = `<div class="tg-receipt" style="--rot:${(Math.random() * 6 - 3).toFixed(1)}deg"><div class="tg-r-head">${esc(t.head)}<span>Nr. ${String(1000 + Math.floor(Math.random() * 9000))}</span></div><div class="tg-r-body">${t.q}</div><div class="tg-r-eq">= ?</div><div class="tg-stamp">${esc(t.stamp)}</div></div>`;
      input = '';
      upd();
      t0 = Date.now();
      lock = false;
      clearInterval(timer);
      timer = setInterval(() => {
        const left = 1 - (Date.now() - t0) / (secs * 1000);
        q('#tg-bar').style.width = Math.max(0, left * 100) + '%';
        q('#tg-bar').classList.toggle('is-low', left < 0.3);
        if (left <= 0) answer(true);
      }, 60);
    }
    function answer(timeout) {
      if (lock) return;
      lock = true;
      clearInterval(timer);
      const t = tasks[k];
      const right = !timeout && Number(input) === t.a;
      if (right) { ok++; combo++; FX.play('coinUp'); } else { combo = 0; FX.play('coinDown'); }
      const fb = document.createElement('div');
      fb.className = 'tg-fb ' + (right ? 'is-ok' : 'is-bad');
      fb.textContent = right ? `✔ KORREKT${combo >= 3 ? ` · COMBO ×${combo}` : ''}` : `${timeout ? '⏱ ZEIT UM' : '✘ FALSCH'} · richtig: Ð${t.a.toLocaleString('de-DE')}`;
      q('#tg-stage').appendChild(fb);
      ov.classList.remove('flash-ok', 'flash-bad');
      void ov.offsetWidth;
      ov.classList.add(right ? 'flash-ok' : 'flash-bad');
      q('#tg-score').textContent = `${ok} von ${k + 1} richtig`;
      q('#tg-combo').textContent = combo >= 2 ? `🔥 ${combo}er-Serie` : '';
      k++;
      setTimeout(show, right ? 750 : 1700);
    }
    function finish() {
      lock = true;
      clearInterval(timer);
      q('.tg-keys').hidden = true; q('.tg-display').hidden = true; q('.tg-time').style.visibility = 'hidden';
      const grade = ok === n ? 'A+' : ok >= n * 0.8 ? 'B' : ok >= n * 0.6 ? 'C' : ok >= n * 0.4 ? 'D' : 'F';
      q('#tg-stage').innerHTML = `<div class="tg-end"><div class="tg-grade g-${grade[0]}">${grade}</div><h3>${ok}/${n} Belege richtig</h3>
        <p>${ok === n ? 'Fehlerfrei! Das Finanzamt ist beeindruckt.' : n - ok > n / 2 ? 'Oha. Das wird entweder teuer oder gefährlich.' : 'Ein paar Fehler. Mal sehen, ob das jemand merkt.'}</p>
        <button class="btn btn-primary" id="tg-send">📨 Erklärung abschicken</button></div>`;
      q('#tg-send').onclick = () => { close(); doAct({ type: 'taxSelf', ok, total: n }, pid); };
      FX.play(ok === n ? 'win' : 'pop');
    }
    function press(key) {
      if (lock) return;
      if (key === 'del') input = input.slice(0, -1);
      else if (key === 'ok') { if (input) answer(false); return; }
      else if (input.length < 9) input = (input + key).replace(/^0+(?=\d)/, '');
      upd();
    }
    const onKey = (e) => {
      if (k >= n && e.key === 'Enter' && q('#tg-send')) { e.preventDefault(); return q('#tg-send').click(); }
      if (e.key === 'Escape') return close();
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
      else if (e.key === 'Enter') { e.preventDefault(); press('ok'); }
    };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    q('#tg-x').onclick = close;
    q('#tg-stage').innerHTML = `<div class="tg-end"><div class="tg-grade">§</div><h3>Steuererklärung ${p.taxDue.year}</h3>
      <p>${n} Belege, je ${secs} Sekunden. Rechne das Ergebnis aus, tipp es ein, drück OK. Jeder Fehler heißt: Entweder zahlst du zu viel – oder zu wenig, und das Finanzamt kann es später finden. Mit Zinsen.</p>
      <button class="btn btn-primary" id="tg-go">▶ Los geht's</button></div>`;
    q('#tg-go').onclick = () => { q('.tg-keys').hidden = false; q('.tg-display').hidden = false; show(); };
  }

  // ---------- Render ----------
  function render() {
    const S = App.S;
    if (S && S.phase !== 'lobby' && !isWorld()) syncBoard();
    if (!S || S.phase === 'lobby') {
      if (!$('#screen-lobby').hidden || !S) renderLobby();
      if (S && S.phase !== 'lobby') enterRoom();
      return;
    }
    if ($('#screen-game').hidden) { show('screen-game'); buildBoard(); }
    $('#room-chip').textContent = App.mode === 'local' ? 'Ein Gerät' : `Raum ${App.code}`;
    renderNet();
    if (S.sub !== 'debt') App.confirmBankrupt = false;
    const world = isWorld();
    $('#board').hidden = world;
    $('#world').hidden = !world;
    $('#board-wrap').classList.toggle('is-world', world);
    $('#dice-tray').hidden = !world;
    if (world) {
      const rolled = renderTray();
      animateWorld(rolled ? T().dice : 0);
      renderWorld();
      if (S.phase === 'over') renderAction(); else renderWorldAction();
      renderWorldPlayers();
      renderWorldProps();
    } else {
      buildBoard();
      planClassicMove();
      if (!App.animT) animateTokens(); else renderBoard();
      renderCasino();
      if (isReal()) {
        if (S.phase === 'over') renderAction(); else renderRealAction();
        renderRealPlayers();
        renderRealProps();
      } else {
        renderAction();
        renderPlayers();
        renderProps();
      }
    }
    renderLog();
    playSounds();
    castBanner();
    if (App.reModal && !$('#modal').hidden) $('#modal-body').innerHTML = App.reModal();
    moneyPops();
    if (S.phase === 'over' && App.lastPhase !== 'over') {
      FX.confetti();
      const w = P(S.winner);
      const { fresh, xp, camp } = gameOverRewards();
      openModal(`<div class="winner">${camp ? campEndHTML(camp) : ''}${tokHTML(w.token, w.color)}<h2>${esc(w.name)} gewinnt!</h2><p>${world ? 'Die Welt gehört jetzt Dulidan. 🌍💜' : 'Herzlichen Glückwunsch zum Dulidanopoly-Sieg. 💜'}</p>
        ${xp ? `<p class="xp-line">+${xp.amount} XP · Level ${xp.level} · ${xp.title}${xp.up ? ' · <strong>LEVEL UP!</strong>' : ''}</p>` : ''}
        ${chartHTML()}
        ${fresh.length ? `<h3 class="ach-title">🏅 Neue Erfolge</h3><div class="ach-grid">${fresh.map((a) => `<div class="ach is-got is-new"><span class="ach-ic">${a.icon}</span><strong>${a.name}</strong><small>${a.text}</small></div>`).join('')}</div>` : ''}
        ${awardsHTML()}</div>`);
    }
    App.lastPhase = S.phase;
  }
})();
