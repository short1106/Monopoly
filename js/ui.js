// Dulidanopoly – Oberfläche: Startseite, Lobby, Brett, Aktionen
(function () {
  const D = window.DULI_DATA, E = window.DULI_ENGINE, Net = window.DULI_NET, FX = window.DULI_FX;
  const W = window.DULI_WORLD, WD = window.DULI_WORLD_DATA;
  const isWorld = () => !!(App.S && App.S.mode === 'world');
  const ENG = () => (isWorld() ? W : E);
  const { SPACES, GROUPS, TOKENS, RAILS, UTILS } = D;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = (n) => 'Ð' + n;

  // ---------- Speicher ----------
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* privat */ } },
  };
  let myId = store.get('duli-id');
  if (!myId) { myId = 'u' + Math.random().toString(36).slice(2, 10); store.set('duli-id', myId); }

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

  function tokHTML(token, color, extraClass = '') {
    const t = TOKENS[token];
    const inner = !t ? '?' : token === 'dulidan' ? logoSVG() : t.emoji;
    return `<span class="tok ${extraClass}" style="--pc:${color || 'var(--line)'}">${inner}</span>`;
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
  function openModal(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
  }
  function closeModal() { $('#modal').hidden = true; App.trade = null; }
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
    }, 750);
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
    if (App.mode === 'client' || !App.S) return;
    const t = e.target;
    const o = {};
    if (t.id === 'set-money') o.startMoney = Number(t.value);
    if (t.id === 'set-pot') o.pot = t.checked;
    if (t.id === 'set-go') o.goDouble = t.checked;
    if (t.id === 'set-mode') o.mode = t.value;
    if (t.id === 'set-rounds') o.maxRounds = Number(t.value);
    E.setSettings(App.S, o);
    commit();
  });

  $('#btn-start').onclick = () => {
    const err = startByMode(App.S);
    if (err) return toast(err);
    commit();
    enterRoom();
  };

  function startByMode(S) {
    return S.settings && S.settings.mode === 'world' ? W.start(S) : E.startGame(S);
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
    const world = st.mode === 'world';
    $('#settings').innerHTML = `
      <label class="row"><span>Spielmodus<small>${world ? 'Weltkarte mit Dulidan-Würfel: um die Welt laufen, Städte kaufen, Maut kassieren' : 'Das Brett mit Duisburg und Öhringen'}</small></span>
        <select id="set-mode" ${ro}><option value="classic" ${!world ? 'selected' : ''}>Klassisch</option><option value="world" ${world ? 'selected' : ''}>🌍 DULIDAN WORLD</option></select></label>
      ${world ? `<label class="row"><span>Runden-Limit<small>Danach gewinnt der Reichste – vorher gewinnt, wer als Letzter nicht pleite ist</small></span>
        <select id="set-rounds" ${ro}>${[15, 20, 30, 50, 0].map((r) => `<option value="${r}" ${(st.maxRounds ?? 30) === r ? 'selected' : ''}>${r ? r + ' Runden' : 'Kein Limit'}</option>`).join('')}</select></label>` : ''}
      <label class="row"><span>Startgeld<small>Mit wie viel Dulis alle starten</small></span>
        <select id="set-money" ${ro}>${[1000, 1500, 2000, 3000].map((m) => `<option value="${m}" ${st.startMoney === m ? 'selected' : ''}>${M(m)}</option>`).join('')}</select></label>
      ${world ? '' : `<label class="row"><span>🐷 Aprils Spardose<small>Steuern und Strafen sammeln sich auf „Aprils Pause“</small></span>
        <input type="checkbox" class="switch" id="set-pot" ${st.pot ? 'checked' : ''} ${ro}></label>
      <label class="row"><span>💸 Doppelt auf LOS<small>Wer genau auf LOS landet, bekommt ${M(400)}</small></span>
        <input type="checkbox" class="switch" id="set-go" ${st.goDouble ? 'checked' : ''} ${ro}></label>`}`;

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
        <small>${esc(world ? WD.POWERS[k] : t.power)}</small></button>`;
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
    if (i <= 10) return { r: 11, c: 11 - i, side: 'bottom' };
    if (i <= 20) return { r: 11 - (i - 10), c: 1, side: 'left' };
    if (i <= 30) return { r: 1, c: i - 19, side: 'top' };
    return { r: i - 29, c: 11, side: 'right' };
  }
  const CORNER_ICON = { go: '⟵', jail: '😱', parking: '🐷', gotojail: '👉' };
  const TYPE_ICON = { april: '🤖', studio: '💜' };

  function buildBoard() {
    if (!$('#die1')) $('#dice').innerHTML = cubeHTML('die1') + cubeHTML('die2');
    const board = $('#board');
    if (board.querySelector('.cell')) return;
    SPACES.forEach((sp, i) => {
      const { r, c, side } = cellPos(i);
      const el = document.createElement('div');
      const corner = i % 10 === 0;
      el.className = `cell s-${side} t-${sp.type}${corner ? ' corner' : ''}${i === 39 ? ' is-hq' : ''}`;
      el.style.gridArea = `${r} / ${c}`;
      el.dataset.i = i;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', sp.name);
      let body = '';
      if (corner) {
        body = sp.type === 'go'
          ? `<div class="cname">LOS</div><div class="cicon">${CORNER_ICON.go}</div><div class="csub">${esc(sp.sub)}</div>`
          : `<div class="cicon">${CORNER_ICON[sp.type]}</div><div class="cname">${esc(sp.name)}</div>${sp.sub ? `<div class="csub">${esc(sp.sub)}</div>` : ''}`;
      } else if (sp.type === 'prop') {
        body = `<div class="cname">${esc(sp.name)}</div><div class="cprice">${M(sp.price)}</div>`;
      } else if (sp.type === 'rail' || sp.type === 'util') {
        body = `<div class="cicon">${sp.icon}</div><div class="cname">${esc(sp.name)}</div><div class="cprice">${M(sp.price)}</div>`;
      } else if (sp.type === 'tax') {
        body = `<div class="cicon">${sp.icon}</div><div class="cname">${esc(sp.name)}</div><div class="cprice">${M(sp.amount)}</div>`;
      } else {
        body = `<div class="cicon">${TYPE_ICON[sp.type]}</div><div class="cname">${esc(sp.name)}</div>`;
      }
      el.innerHTML = (sp.type === 'prop' ? `<div class="band" style="--g:${GROUPS[sp.group].color}"></div>` : '')
        + `<div class="cell-body">${body}</div><div class="cell-tokens"></div>`;
      board.appendChild(el);
    });
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
        if (band) band.innerHTML = st.houses === 5 ? '<span class="hotel"></span>' : '<span class="house"></span>'.repeat(st.houses);
      }
      const here = S.players.filter((p) => !p.bankrupt && (App.disp[p.id] ?? p.pos) === i);
      const tokKey = here.map((p) => p.id).join(',');
      const tokEl = el.querySelector('.cell-tokens');
      if (tokEl.dataset.key !== tokKey) {
        tokEl.dataset.key = tokKey;
        tokEl.innerHTML = here.map((p) => tokHTML(p.token, p.color)).join('');
      }
      el.classList.toggle('is-last', S.lastLand === i);
      if (i === 20) {
        el.classList.toggle('has-pot', S.pot > 0);
        el.querySelector('.csub').textContent = S.pot > 0 ? `🐷 Spardose: ${M(S.pot)}` : 'Spardose leer';
      }
    });

    // Würfel
    const [a, b] = S.dice;
    const fresh = S.rollId !== App.lastRoll;
    App.lastRoll = S.rollId;
    setCube($('#die1'), a, fresh);
    setCube($('#die2'), b, fresh);
    const cur = curP();
    $('#center-turn').innerHTML = S.phase === 'over'
      ? `🏆 <strong>${esc(P(S.winner).name)}</strong> gewinnt!`
      : `<strong>${esc(cur.name)}</strong> ist dran · Runde ${Math.ceil(S.turnNo / Math.max(1, S.players.filter((p) => !p.bankrupt).length))}`;

    const cc = $('#center-card');
    if (S.card && S.phase === 'play') {
      const c = E.CARDS[S.card.deck][S.card.id];
      cc.className = `center-card deck-${S.card.deck}`;
      cc.innerHTML = `<div class="card-icon">${TYPE_ICON[S.card.deck]}</div><div class="card-kind">${S.card.deck === 'april' ? 'April-Karte' : 'Studio-Karte'}</div><div class="card-text">${esc(c.text)}</div>`;
      cc.hidden = false;
    } else cc.hidden = true;
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
      go: 'Jedes Mal, wenn du hier vorbeiziehst, bekommst du Ð200 (das Zebra Ð250).',
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
        ${awardsHTML()}
        ${App.mode !== 'client' ? uiBtn('Neue Runde', 'rematch', 'btn-primary') : '<p class="action-note">Der Host kann eine neue Runde starten.</p>'}</div>`;
      return;
    }
    const cur = curP();
    let h = '';

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

    const me = canControl(cur.id);
    const label = App.mode === 'local' || cur.id !== myId ? esc(cur.name) : 'Du';
    h += `<div class="action-head">${tokHTML(cur.token, cur.color)}<div><h3>${me ? (label === 'Du' ? 'Du bist dran!' : `${label} ist dran`) : `${esc(cur.name)} ist dran`}</h3>
      <small>${M(cur.money)} · ${esc(SPACES[cur.pos].name)}${cur.id !== myId && App.mode === 'host' && !cur.connected ? ' · offline – du spielst für sie/ihn' : ''}</small></div></div>`;

    if (!me) {
      const what = { roll: 'würfelt gleich', berlingo: 'überlegt sich das Berlingo-Manöver', buy: `überlegt, ob ${esc(SPACES[cur.pos].name)} gekauft wird`, card: 'liest eine Karte', debt: 'muss Schulden begleichen', end: 'beendet gleich den Zug' }[S.sub] || '';
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
        break;
      }
      case 'berlingo': {
        const base = S.pendingMove;
        const target = (d) => SPACES[(cur.pos + base + d) % 40].name;
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
          ${cur.token === 'april' && !cur.used.april ? btn('🤖 Neu ziehen (1× pro Spiel)', { type: 'cardRedraw' }, pid) : ''}</div>`;
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
    ['🧭', 'Weltenbummler', 'km', (v) => `${v} Reisen`],
  ];
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
      if (App.mode !== 'local' && !p.connected && !p.bankrupt && !p.bot) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${owned.map((k) => `<i class="${S.props[k].mort ? 'is-mort' : ''}" style="--g:${SPACES[k].group ? GROUPS[SPACES[k].group].color : '#cfc3e6'}" title="${esc(SPACES[k].name)}"></i>`).join('')}</div>
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${M(p.money)}</div></li>`;
    }).join('');
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
      if (sp.type === 'prop' && st.houses) info = st.houses === 5 ? 'Hotel' : `${st.houses} ${st.houses === 1 ? 'Haus' : 'Häuser'}`;
      if (!info) info = sp.type === 'rail' ? 'Bahnhof' : sp.type === 'util' ? 'Werk' : 'Keine Häuser';
      let btns = '';
      if (manage) {
        if (sp.type === 'prop' && !st.mort && E.ownsGroup(S, v.id, sp.group)) {
          const cost = E.houseCost(v, sp.group);
          if (st.houses < 5) btns += btn(st.houses === 4 ? `+Hotel ${M(cost)}` : `+Haus ${M(cost)}`, { type: 'build', idx: k }, v.id, '', v.money < cost);
          if (st.houses > 0) btns += btn('−', { type: 'sell', idx: k }, v.id, 'btn-ghost', false, 'Gebäude verkaufen (halber Preis)');
        }
        if (!st.mort && !(sp.type === 'prop' && E.groupHasHouses(S, sp.group))) btns += btn(`Hypothek +${M(sp.price / 2)}`, { type: 'mortgage', idx: k }, v.id, 'btn-ghost');
        if (st.mort) btns += btn(`Einlösen ${M(E.unmortgageCost(k))}`, { type: 'unmortgage', idx: k }, v.id, 'btn-ghost', v.money < E.unmortgageCost(k));
      }
      return `<div class="prop-row" style="--g:${color}"><span class="bar"></span>
        <div class="pr-name">${esc(sp.name)}<small>${info}</small></div><div class="pr-btns">${btns}</div></div>`;
    }).join('');
  }

  function renderLog() {
    $('#log').innerHTML = App.S.log.slice(-40).reverse().map((m) => `<li class="${m.startsWith('April:') ? 'is-april' : ''}">${esc(m)}</li>`).join('');
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
          const c = W.CITY[id], blocked = W.zoneHasBuildings(S, c.zone);
          return `<label class="check"><input type="checkbox" name="${side}" value="${id}" ${blocked ? 'disabled' : ''}>
            <i style="--g:${WD.ZONES[c.zone].color}"></i>${esc(c.name)}${S.cities[id].mort ? ' (Hypothek)' : ''}${blocked ? ' (Gebäude)' : ''}</label>`;
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
    if (kind === 'cityInfo') return openCity(data.id);
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

  function showApril(text) {
    const b = document.createElement('div');
    b.className = 'bubble is-chat is-april';
    b.style.setProperty('--pc', '#da29cf');
    b.style.left = (10 + Math.random() * 25) + '%';
    b.innerHTML = `<span class="tok" style="--pc:#da29cf">🤖</span><span class="msg"><strong>April:</strong> ${esc(text)}</span>`;
    // kurz warten, bis die Figur angekommen ist
    setTimeout(() => { $('#bubbles').appendChild(b); setTimeout(() => b.remove(), 4600); }, 900);
  }

  // ---------- Figuren laufen Feld für Feld ----------
  function animateTokens() {
    const S = App.S;
    if (!S || S.phase === 'lobby' || isWorld()) return;
    let moving = false;
    for (const p of S.players) {
      const d = App.disp[p.id];
      if (d == null || p.bankrupt) { App.disp[p.id] = p.pos; continue; }
      if (d === p.pos) continue;
      const fwd = (p.pos - d + 40) % 40;
      if (fwd > 0 && fwd <= 13 && !(p.inJail && p.pos === 10)) { App.disp[p.id] = (d + 1) % 40; moving = true; }
      else App.disp[p.id] = p.pos;
    }
    renderBoard();
    if (moving) { FX.play('step'); App.animT = setTimeout(animateTokens, 140); }
    else App.animT = null;
  }

  // ---------- Sounds aus dem Verlauf ----------
  const SOUND_RULES = [
    ['win', /gewinnt/], ['pot', /Spardose/], ['jail', /nach Düsseldorf/], ['pay', /zahlt|fehlen/],
    ['jail', /Übernahme/], ['cash', /kassiert|Erhalte|ersteigert|kauft/], ['build', /baut/], ['card', /zieht eine|April-News|fliegt/], ['roll', /würfelt/], ['step', /reist nach/],
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
    const aprilLine = freshLines.filter((l) => l.startsWith('April:')).pop();
    if (aprilLine) showApril(aprilLine.replace(/^April:\s*/, ''));
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
  $('#btn-zoom').onclick = () => {
    const w = $('#board-wrap');
    w.classList.toggle('is-zoomed');
    $('#btn-zoom').textContent = w.classList.contains('is-zoomed') ? 'Normal' : 'Zoom';
  };
  $('#btn-rules').onclick = () => (isWorld() ? openModal(worldRulesHTML()) : openModal(`<h2>Regeln</h2><div class="rules">
    <p>Alle starten mit ${M(D.START_MONEY)}. Wer zuletzt nicht pleite ist, gewinnt. Bezahlt wird in Dulis (Ð).</p>
    <h3>Dein Zug</h3><ul>
      <li>Würfeln und ziehen. Bei einem Pasch darfst du nochmal. Drei Pasch hintereinander: ab nach Düsseldorf.</li>
      <li>Freies Feld: kaufen oder versteigern lassen. Fremdes Feld: Miete zahlen.</li>
      <li>Über LOS gibt es ${M(D.GO_MONEY)}.</li>
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
    <h3>Figuren</h3><ul>${Object.values(TOKENS).map((t) => `<li><strong>${esc(t.name)}:</strong> ${esc(t.power)}</li>`).join('')}</ul></div>`));
  $('#btn-menu').onclick = () => {
    const host = App.mode !== 'client';
    openModal(`<h2>Menü</h2><div class="btn-row" style="flex-direction:column">
      ${App.mode !== 'local' ? uiBtn(`Einladungslink kopieren (Raum ${esc(App.code)})`, 'copy') : ''}
      ${host && App.S.phase === 'play' ? uiBtn('Spiel jetzt beenden – Reichster gewinnt', 'endGame') : ''}
      ${uiBtn(App.mode === 'host' ? 'Raum verlassen (Spiel bleibt gespeichert)' : 'Zur Startseite', 'leave', 'btn-ghost')}
    </div>
    ${App.mode === 'host' ? '<p class="action-note" style="margin-top:12px">Du bist der Host. Wenn du die Seite schließt, pausiert das Spiel für alle. Über die Startseite kannst du den Raum später fortsetzen.</p>' : ''}`);
  };


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

  function buildWorld() {
    const el = $('#world');
    if (el.dataset.built) return;
    el.dataset.built = '1';
    let dots = '';
    for (let lat = V.latMax; lat >= V.latMin; lat -= 2.5) {
      for (let lon = V.lonMin; lon <= V.lonMax; lon += 2.5) {
        const L = lon > 180 ? lon - 360 : lon;
        if (WD.LAND.some((poly) => inPoly(L, lat, poly))) dots += `<circle cx="${projX(lon).toFixed(1)}" cy="${projY(lat).toFixed(1)}" r="3.2"/>`;
      }
    }
    let routes = '';
    for (const [a, b, kind] of WD.ROUTES) {
      const A = W.CITY[a], B = W.CITY[b];
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
    const cities = WD.CITIES.map((c) => {
      const x = projX(c.lon), y = projY(c.lat);
      const lab = WD.LABELS[c.id] || 'n';
      const [lx, ly, anchor] = { n: [0, -17, 'middle'], s: [0, 26, 'middle'], e: [16, 4, 'start'], w: [-16, 4, 'end'] }[lab];
      return `<g class="city" data-city="${c.id}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${esc(c.name)}">
        <circle class="hit" r="15"/>
        <circle class="reach" r="17"/>
        <circle class="ring" r="11" style="stroke:${WD.ZONES[c.zone].color}"/>
        <circle class="core" r="7"/>
        <text class="lvl" y="3.5"></text>
        ${c.hub ? '<text class="hub" x="10" y="-9">✈</text>' : ''}
        <text class="cname" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(c.name)}</text>
        <g class="ctoks" transform="translate(0,0)"></g>
      </g>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" class="world-svg" role="img" aria-label="Weltkarte">
      <defs><radialGradient id="wglow" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#8122b5" stop-opacity=".28"/><stop offset="1" stop-color="#0e0b13" stop-opacity="0"/></radialGradient></defs>
      <rect width="${MAP_W}" height="${MAP_H}" fill="url(#wglow)"/>
      <g class="land">${dots}</g><g class="routes">${routes}</g><g class="cities">${cities}</g>
      <text class="map-title" x="${MAP_W - 16}" y="${MAP_H - 14}" text-anchor="end">DULIDAN WORLD</text>
    </svg>`;
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
        const face = WD.FACES[f - 1];
        inner = face.icon === 'D' ? `<span class="dlogo">${logoSVG()}</span>` : `<span class="ficon">${face.icon}</span>`;
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
    if (t.dataset.built) return;
    t.dataset.built = '1';
    t.innerHTML = `<div class="tray-dice">${cubeHTML('wd1')}${cubeHTML('wd2')}${cubeHTML('wd3')}${cubeHTML('wds', true)}</div><div class="tray-label" id="tray-label"></div>`;
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
    const fi = WD.FACES.findIndex((f) => f.id === S.face);
    $('#wds').hidden = fi < 0 && !S.rollId;
    if (fi >= 0) setCube($('#wds'), fi + 1, roll);
    const face = WD.FACES[fi];
    const sum = (a || 0) + (b || 0) + (S.die3 || 0);
    const label = S.rollId ? `<strong>${sum}</strong>${face ? ` · ${face.icon === 'D' ? '💜' : face.icon} ${esc(face.name)}` : ''}` : 'Würfeln!';
    const lab = $('#tray-label');
    if (roll && S.rollId > 0) {
      App.busyUntil = Math.max(App.busyUntil || 0, Date.now() + 1000);
      clearTimeout(App.diceT);
      App.diceT = setTimeout(() => { if (App.S) render(); }, 1060);
    }
    if (roll) { lab.innerHTML = '…'; setTimeout(() => { lab.innerHTML = label; }, 1000); } else if (lab.innerHTML !== '…') lab.innerHTML = label;
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
    const total = delay + queue.length * (S.flight ? 600 : 260);
    App.busyUntil = Date.now() + total;
    clearTimeout(App.busyT);
    App.busyT = setTimeout(() => { if (App.S) render(); }, total + 60);
    const hop = () => {
      if (!queue.length) { App.wAnimT = null; renderWorld(); return; }
      App.wdisp[mover] = queue.shift();
      FX.play(S.flight ? 'card' : 'step');
      renderWorld();
      App.wAnimT = setTimeout(hop, S.flight ? 600 : 260);
    };
    App.wAnimT = setTimeout(hop, delay);
  }

  function worldTargets() {
    const S = App.S, p = curP();
    if (S.phase !== 'play' || !canControl(p.id) || S.trade) return { walk: [], fly: [] };
    if (S.sub === 'walk') return { walk: W.walkOptions(S), fly: [] };
    if (S.sub === 'jet') return { walk: [], fly: W.HUBS.filter((h) => h !== p.loc) };
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
    const S = App.S, c = W.CITY[id], z = WD.ZONES[c.zone], st = S.cities[id];
    const owner = P(st.owner);
    const rows = WD.LEVELS.map((name, i) => `<tr class="${owner && st.level === i ? 'is-now' : ''}"><td>${i === 0 ? 'Maut unbebaut (ganze Zone: ×2)' : `Maut mit ${name}`}</td><td>${M(Math.round(c.price * WD.RENT_PCT[i] / 5) * 5)}</td></tr>`).join('');
    return `<div class="deed"><div class="deed-head" style="--g:${z.color}">${esc(c.name)}<small>${esc(c.real)} · ${esc(z.name)} (${esc(z.region)})${c.hub ? ' · ✈ Flughafen' : ''}</small></div>
      <table>${rows}<tr><td>Gebäude kostet</td><td>${M(z.build)}</td></tr><tr><td>Hypothek</td><td>${M(c.price / 2)}</td></tr><tr><td>Kaufpreis</td><td>${M(c.price)}</td></tr></table>
      <div class="deed-foot">${owner ? `Besitzer: <strong>${esc(owner.name)}</strong> · ${WD.LEVELS[st.level]}${st.mort ? ' · mit Hypothek' : ''}` : 'Gehört niemandem'}</div></div>`;
  }
  function openCity(id) { openModal(cityDeedHTML(id)); }

  function renderWorld() {
    const S = App.S;
    buildWorld();
    const t = worldTargets();
    const cur = curP();
    const disp = (p) => (App.wdisp && App.wdisp[p.id] != null ? App.wdisp[p.id] : p.loc);
    document.querySelectorAll('#world .city').forEach((g) => {
      const id = g.dataset.city, st = S.cities[id];
      const owner = P(st.owner);
      g.style.setProperty('--oc', owner ? owner.color : 'transparent');
      g.classList.toggle('is-owned', !!owner);
      g.classList.toggle('is-mort', !!st.mort);
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
          const ox = (i - (here.length - 1) / 2) * 20;
          return `<g class="wtok" transform="translate(${ox},-30)"><circle r="10" style="stroke:${p.color}"/><text y="4.5">${p.token === 'dulidan' ? 'D' : tk.emoji}</text></g>`;
        }).join('');
      }
    });
    document.querySelectorAll('#world .route').forEach((r) => {
      const [a, b] = r.dataset.r.split('-');
      r.classList.toggle('is-open', (a === cur.loc && t.walk.includes(b)) || (b === cur.loc && t.walk.includes(a)));
    });
  }

  function destBtn(S, cur, to, action) {
    const s2 = S.cities[to], o = P(s2.owner), cc = W.CITY[to];
    const toll = o && o.id !== cur.id ? W.rentFor(S, to, cur) : 0;
    const tag = !o ? `frei · ${M(cc.price)}` : o.id === cur.id ? 'deins' : `Maut ${M(toll)}`;
    return `<button class="dest ${toll ? 'is-toll' : ''}" data-act='${esc(JSON.stringify(action))}' data-pid="${esc(cur.id)}" style="--g:${WD.ZONES[cc.zone].color}">
      <span>${esc(cc.name)}</span><small>${tag}</small></button>`;
  }

  function renderWorldAction() {
    const S = App.S, el = $('#panel-action');
    const cur = curP();
    let h = '';
    if (S.event) h += `<div class="news"><strong>📰 April-News · Runde ${S.round}${S.maxRounds ? '/' + S.maxRounds : ''}</strong><span>${esc(S.event.t)}</span></div>`;
    if (S.trade) {
      const from = P(S.trade.from), to = P(S.trade.to);
      const side = (sd) => {
        const items = sd.props.map((id) => esc(W.CITY[id].name));
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
      <small>${M(cur.money)} · ${esc(W.CITY[cur.loc].name)}</small></div></div>`;
    if (Date.now() < (App.busyUntil || 0)) {
      el.innerHTML = h + `<p class="action-note rolling">${S.sub === 'walk' ? '🧭 unterwegs …' : '🎲 Die Würfel rollen …'}</p>`;
      return;
    }
    if (!me) {
      const what = { roll: 'würfelt gleich', pick: 'wählt die Schritte', jet: 'sucht sich einen Flughafen aus', walk: 'navigiert durch die Welt', buy: 'überlegt, ob gekauft wird', end: 'beendet gleich den Zug', debt: 'muss Schulden begleichen' }[S.sub] || '';
      el.innerHTML = h + `<p class="action-note">${esc(cur.name)} ${what} …</p>`;
      return;
    }
    const pid = cur.id;
    const canTrade = !S.trade && S.players.filter((p) => !p.bankrupt).length > 1;
    const face = WD.FACES.find((f) => f.id === S.face);
    switch (S.sub) {
      case 'roll': {
        h += `<div class="btn-row">${btn(S.again ? '🎲 Pasch! Nochmal würfeln' : '🎲 Würfeln', { type: 'roll' }, pid, 'btn-primary btn-roll', !!S.trade)}</div>${shakeHint()}`;
        h += '<p class="action-note">Du würfelst mit zwei Würfeln und dem lila Dulidan-Würfel. Deine Figur läuft die Augenzahl über die Routen.</p>';
        if (canTrade) h += uiBtn('Handeln', 'trade', 'btn-ghost');
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
        h += `<p class="action-note">✈️ <strong>Jetset!</strong> Flieg zu einem Flughafen deiner Wahl – oder lauf ganz normal ${S.steps} Schritte.</p>`;
        h += `<div class="dests">${W.HUBS.filter((x) => x !== cur.loc).map((to) => destBtn(S, cur, to, { type: 'fly', to })).join('')}</div>`;
        h += btn(`Lieber laufen (${S.steps} Schritte)`, { type: 'walkInstead' }, pid, 'btn-ghost');
        break;
      }
      case 'walk': {
        h += `<p class="action-note">🧭 <strong>Navigator:</strong> Noch ${S.steps} ${S.steps === 1 ? 'Schritt' : 'Schritte'}. Wohin geht's?</p>`;
        h += `<div class="dests">${W.walkOptions(S).map((to) => destBtn(S, cur, to, { type: 'step', to })).join('')}</div>`;
        break;
      }
      case 'buy': {
        const price = W.buyPrice(cur, cur.loc);
        h += cityDeedHTML(cur.loc);
        h += `<div class="btn-row">${btn(`Kaufen für ${M(price)}`, { type: 'buy' }, pid, 'btn-primary', cur.money < price)}${btn('Nicht kaufen', { type: 'skip' }, pid, 'btn-ghost')}</div>`;
        if (cur.money < price) h += '<p class="action-note">Zu wenig Dulis? Nimm unten eine Hypothek auf.</p>';
        break;
      }
      case 'end': {
        const st = S.cities[cur.loc];
        if (S.landed && st.owner && st.owner !== cur.id && !S.tookOver) {
          const blk = W.takeoverBlock(S, cur, cur.loc);
          if (!blk) {
            const cost = W.takeoverCost(S, cur.loc);
            h += `<div class="btn-row">${btn(`🦹 ${W.CITY[cur.loc].name} übernehmen: ${M(cost)}`, { type: 'takeover' }, pid, 'btn-danger', cur.money < cost)}</div>`;
          }
        }
        h += `<div class="btn-row">${btn(S.again ? 'Weiter (Pasch: nochmal würfeln)' : 'Zug beenden', { type: 'endTurn' }, pid, 'btn-primary', !!S.trade)}${canTrade ? uiBtn('Handeln', 'trade', 'btn-ghost') : ''}</div>`;
        h += '<p class="action-note">Bauen kannst du unten bei deinen Städten, sobald dir eine ganze Zone gehört.</p>';
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
      if (!p.bankrupt) meta.push(`<span>${owned.length} Städte</span>`, `<span>${zones.length} Zonen</span>`);
      if (p.bankrupt) meta.push('<span class="warn">pleite</span>');
      if (App.mode !== 'local' && !p.connected && !p.bankrupt && !p.bot) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${owned.map((id) => `<i class="${S.cities[id].mort ? 'is-mort' : ''}" style="--g:${WD.ZONES[W.CITY[id].zone].color}" title="${esc(W.CITY[id].name)}"></i>`).join('')}</div>
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${M(p.money)}</div></li>`;
    }).join('');
  }

  function renderWorldProps() {
    const S = App.S, v = viewer(), wrap = $('#my-props');
    if (!v) { $('#props-title').textContent = 'Städte'; wrap.innerHTML = '<p class="empty">Du schaust zu.</p>'; return; }
    $('#props-title').textContent = App.mode === 'local' || v.id !== myId ? `Städte von ${v.name}` : 'Deine Städte';
    const owned = WD.CITIES.filter((c) => S.cities[c.id].owner === v.id);
    if (!owned.length) { wrap.innerHTML = '<p class="empty">Noch keine Städte. Würfel los und kauf was!</p>'; return; }
    const myTurn = S.phase === 'play' && curP().id === v.id && canControl(v.id);
    const manage = myTurn && ['roll', 'end', 'buy', 'debt'].includes(S.sub);
    const canBuild = myTurn && ['roll', 'end'].includes(S.sub);
    wrap.innerHTML = owned.map((c) => {
      const st = S.cities[c.id];
      const complete = W.zoneComplete(S, v.id, c.zone);
      const info = `${WD.LEVELS[st.level]}${complete ? ' · Zone komplett' : ''} · Maut ${M(W.rentFor(S, c.id))}${st.mort ? ' · Hypothek' : ''}`;
      let b = '';
      if (canBuild && complete && !W.buildBlock(S, v, c.id)) b += btn(`+${WD.LEVELS[st.level + 1]} ${M(W.buildCost(S, v, c.id))}`, { type: 'build', id: c.id }, v.id);
      if (manage) {
        if (st.level) b += btn('Abreißen', { type: 'sell', id: c.id }, v.id, 'btn-ghost', false, 'Stockwerk für den halben Preis verkaufen');
        if (!st.mort && !W.zoneHasBuildings(S, c.zone)) b += btn(`Hypothek +${M(c.price / 2)}`, { type: 'mortgage', id: c.id }, v.id, 'btn-ghost');
        if (st.mort) b += btn(`Einlösen ${M(W.unmortgageCost(c.id))}`, { type: 'unmortgage', id: c.id }, v.id, 'btn-ghost', v.money < W.unmortgageCost(c.id));
      }
      return `<div class="prop-row" style="--g:${WD.ZONES[c.zone].color}"><span class="bar"></span>
        <div class="pr-name">${esc(c.name)}<small>${info}</small></div><div class="pr-btns">${b}</div></div>`;
    }).join('');
  }

  function worldRulesHTML() {
    return `<h2>DULIDAN WORLD</h2><div class="rules">
      <p>Monopoly auf der Weltkarte. Wer als Letzter nicht pleite ist, gewinnt.</p>
      <h3>Dein Zug</h3><ul>
        <li>Zu Beginn bekommst du ${M(WD.RULES.salary)} Gehalt.</li>
        <li>Du würfelst mit zwei Würfeln und läufst die Augenzahl Stadt für Stadt über die Routen. An Kreuzungen entscheidet der Zufall.</li>
        <li>Landest du in einer freien Stadt, kannst du sie kaufen. In fremden Städten zahlst du Maut.</li>
        <li>Pasch: nochmal würfeln.</li></ul>
      <h3>💜 Der Dulidan-Würfel</h3><ul>${WD.FACES.map((f) => `<li>${f.icon === 'D' ? '💜' : f.icon} <strong>${esc(f.name)}:</strong> ${esc(f.text)}</li>`).join('')}</ul>
      <h3>Zonen & Bauen</h3><ul>
        <li>10 Zonen mit je 3 Städten. Eine ganze Zone verdoppelt die Maut der unbebauten Städte.</li>
        <li>Mit ganzer Zone baust du gleichmäßig: Studio → Büro → Tower → Wahrzeichen. Jede Stufe macht die Maut viel teurer.</li>
        <li>Bauen geht vor dem Würfeln oder am Ende deines Zuges, egal wo du stehst.</li></ul>
      <h3>🦹 Feindliche Übernahme</h3><ul>
        <li>Landest du in einer fremden Stadt, kannst du sie dem Besitzer für 1,5× (Preis + Gebäude) wegkaufen.</li>
        <li>Geschützt sind ganze Zonen und Wahrzeichen.</li></ul>
      <h3>Geld knapp?</h3><ul>
        <li>Gebäude abreißen (halber Preis zurück) oder Hypotheken aufnehmen. Kannst du nicht zahlen, bist du pleite und raus.</li></ul>
      <h3>📰 April-News</h3><ul><li>Jede Runde eine Weltnachricht: Maut-Party, Stau, drei Würfel, Rezession und mehr.</li></ul>
      <h3>Figuren</h3><ul>${Object.entries(WD.POWERS).map(([k, t]) => `<li><strong>${esc(TOKENS[k].name)}:</strong> ${esc(t)}</li>`).join('')}</ul></div>`;
  }

  // ---------- Render ----------
  function render() {
    const S = App.S;
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
      animateWorld(rolled ? 1000 : 0);
      renderWorld();
      if (S.phase === 'over') renderAction(); else renderWorldAction();
      renderWorldPlayers();
      renderWorldProps();
    } else {
      if (!App.animT) animateTokens(); else renderBoard();
      renderAction();
      renderPlayers();
      renderProps();
    }
    renderLog();
    playSounds();
    if (S.phase === 'over' && App.lastPhase !== 'over') {
      FX.confetti();
      const w = P(S.winner);
      openModal(`<div class="winner">${tokHTML(w.token, w.color)}<h2>${esc(w.name)} gewinnt!</h2><p>${world ? 'Die Welt gehört jetzt Dulidan. 🌍💜' : 'Herzlichen Glückwunsch zum Dulidanopoly-Sieg. 💜'}</p>${awardsHTML()}</div>`);
    }
    App.lastPhase = S.phase;
  }
})();
