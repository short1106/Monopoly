// Dulidanopoly – Oberfläche: Startseite, Lobby, Brett, Aktionen
(function () {
  const D = window.DULI_DATA, E = window.DULI_ENGINE, Net = window.DULI_NET, FX = window.DULI_FX;
  const W = window.DULI_WORLD, WD = window.DULI_WORLD_DATA;
  const isWorld = () => !!(App.S && W.MODES.includes(App.S.mode));
  const GB = () => W.board(App.S.mode);
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

  const VARIANTS = [
    { id: 'normal', ic: '🎲', name: 'Klassisch', text: 'Die normalen Regeln.' },
    { id: 'blitz', ic: '⚡', name: 'Blitz', text: 'Alles wird am Start verteilt. Nach 20 Runden gewinnt der Reichste.' },
    { id: 'million', ic: '💸', name: 'Millionär', text: 'Wer zuerst Ð5.000 Vermögen hat, gewinnt.' },
    { id: 'chaos', ic: aprilIcon('v-april'), name: 'April-Chaos', text: 'April wirft ständig Chaos-Events rein. Nichts ist sicher.' },
    { id: 'hardcore', ic: '💀', name: 'Hardcore', text: 'Nur Ð800 Startgeld, alle Mieten ×1,5.' },
  ];
  $('#settings').addEventListener('click', (e) => {
    const b = e.target.closest('.variant');
    if (!b || App.mode === 'client' || !App.S) return;
    E.setSettings(App.S, { variant: b.dataset.variant });
    const v = VARIANTS.find((x) => x.id === b.dataset.variant);
    if (v) aprilSay({ normal: 'Klassisch. Solide Wahl. Langweilig, aber solide.', blitz: 'Blitz! Alles verteilt, 20 Runden, keine Gnade.', million: 'Millionär! Ich zähl mit. Ð5.000 und Schluss.', chaos: 'April-Chaos?! Endlich darf ich mal richtig. Hehe.', hardcore: 'Hardcore. Ð800. Ich hoffe, ihr könnt rechnen.' }[v.id]);
    commit();
  });

  function startByMode(S) {
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
    const world = W.MODES.includes(st.mode);
    const curVar = st.variant || 'normal';
    const variantsHTML = `<div class="row-block"><span class="vb-title">Spielvariante<small>${esc(VARIANTS.find((v) => v.id === curVar).text)}</small></span>
      <div class="variant-grid">${VARIANTS.map((v) => `<button type="button" class="variant ${v.id === curVar ? 'is-on' : ''}" data-variant="${v.id}" ${ro}><span class="v-ic">${v.ic}</span><strong>${v.name}</strong><small>${v.text}</small></button>`).join('')}</div></div>`;
    $('#settings').innerHTML = variantsHTML + `
      <label class="row"><span>Spielmodus<small>${world ? esc(W.board(st.mode).tagline) : 'Das Brett mit Duisburg und Öhringen'}</small></span>
        <select id="set-mode" ${ro}>${[['classic', '🎲 Klassisch'], ['world', '🌍 DULIDAN WORLD'], ['royale', '🌀 DULIDAN ROYALE'], ['metro', '🚇 DULIDAN METRO'], ['tower', '🏙️ DULIDAN TOWER']].map(([v, l]) => `<option value="${v}" ${(st.mode || 'classic') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${world && st.mode !== 'royale' ? `<label class="row"><span>Runden-Limit<small>Danach gewinnt der Reichste – vorher gewinnt, wer als Letzter nicht pleite ist</small></span>
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
        <small>${esc(world ? W.board(st.mode).POWERS[k] : t.power)}</small></button>`;
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
  const TYPE_ICON = { april: '💖', studio: '💜' };

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
        body = `<div class="cicon">${sp.type === 'april' ? aprilIcon() : TYPE_ICON[sp.type]}</div><div class="cname">${esc(sp.name)}</div>`;
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
        tokEl.innerHTML = here.map((p) => tokHTML(p.token, p.color).replace('<span class="tok', `<span data-tokpid="${esc(p.id)}" class="tok`)).join('');
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
      cc.innerHTML = `<div class="card-icon">${S.card.deck === 'april' ? aprilIcon('card-april') : TYPE_ICON[S.card.deck]}</div><div class="card-kind">${S.card.deck === 'april' ? 'April-Karte' : 'Studio-Karte'}</div><div class="card-text">${esc(c.text)}</div>`;
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
    if (S.event) h += `<div class="news"><strong>📰 April-News · Runde ${S.round}</strong><span>${esc(S.event.t)}</span></div>`;
    else if (S.maxRounds) h += `<div class="news"><strong>⚡ Blitz · Runde ${S.round}/${S.maxRounds}</strong><span>Danach gewinnt der Reichste.</span></div>`;

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
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" data-pid="${esc(p.id)}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${owned.map((k) => `<i class="${S.props[k].mort ? 'is-mort' : ''}" style="--g:${SPACES[k].group ? GROUPS[SPACES[k].group].color : '#cfc3e6'}" title="${esc(SPACES[k].name)}"></i>`).join('')}</div>
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${M(p.money)}</div>${goalBar(p)}</li>`;
    }).join('');
  }

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
      if (sp.type === 'prop' && st.houses) info = st.houses === 5 ? 'Hotel' : `${st.houses} ${st.houses === 1 ? 'Haus' : 'Häuser'}`;
      if (!info) info = sp.type === 'rail' ? 'Bahnhof' : sp.type === 'util' ? 'Werk' : 'Keine Häuser';
      let btns = '';
      if (manage) {
        if (sp.type === 'prop' && !st.mort && E.ownsGroup(S, v.id, sp.group)) {
          const cost = E.houseCost(v, sp.group, S);
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

  // April spricht über ihre Begleiter-Sprechblase unten rechts
  function showApril(text, delay = 900) {
    clearTimeout(App.aprilShowT);
    App.aprilShowT = setTimeout(() => aprilSay(text.replace(/^„|“$/g, '')), delay);
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
    ['win', /gewinnt/], ['pot', /Spardose/], ['jail', /nach Düsseldorf/],
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
    const aprilLine = freshLines.filter((l) => l.startsWith('April:') || /April-News|April-Chaos|^(⚡|💸|💖|💀) /.test(l)).pop();
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
    ${variantRulesHTML()}
    <h3>Figuren</h3><ul>${Object.values(TOKENS).map((t) => `<li><strong>${esc(t.name)}:</strong> ${esc(t.power)}</li>`).join('')}</ul></div>`));
  function variantRulesHTML() {
    const cur = (App.S && App.S.settings && App.S.settings.variant) || 'normal';
    return `<h3>Spielvarianten</h3><ul>${VARIANTS.map((v) => `<li>${v.ic} <strong>${v.name}${v.id === cur ? ' (läuft gerade)' : ''}:</strong> ${esc(v.text)}</li>`).join('')}</ul>`;
  }
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

  function nodeHTML(c, x, y, g, lab) {
    const [lx, ly, anchor] = { n: [0, -17, 'middle'], s: [0, 26, 'middle'], e: [16, 4, 'start'], w: [-16, 4, 'end'] }[lab || 'n'];
    const t = c.type || 'prop';
    const color = t === 'prop' ? g.ZONES[c.zone].color : { portal: '#3ad1ff', loot: '#ffd83a', event: '#ff7ae6', lift: '#3ce08a', slide: '#ff4fd8', free: '#efeaf7' }[t] || '#efeaf7';
    const icon = { portal: '🌀', loot: '🎁', lift: '⬆', slide: '⬇' }[t];
    const inner = t === 'event' ? '<use href="#april" x="-9" y="-9" width="18" height="18"/>'
      : icon ? `<text class="nicon" y="4.5">${icon}</text>`
      : t === 'free' ? `<text class="nicon" y="4">${c.hub ? '⇄' : c.id === 'r3s' ? '🚀' : c.id === 'in' ? '🚪' : '•'}</text>` : '';
    return `<g class="city n-${t}${c.hub ? ' n-hub' : ''}" data-city="${c.id}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${esc(c.name)}">
      <circle class="hit" r="15"/>
      <circle class="reach" r="17"/>
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
      if (kind === 'ring' && g.id === 'royale') continue;
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

  const rentWord = () => (App.S.mode === 'world' ? 'Maut' : 'Miete');
  const words = () => GB().words;
  const NODE_INFO = {
    portal: (c, g) => `🌀 Portal: Springt auf Ring ${g.CITY[c.link] ? g.CITY[c.link].ring : '?'}. Du entscheidest, ob du durchgehst.`,
    loot: () => '🎁 Loot-Kiste: Schild, Boost, Dulis – oder eine Falle.',
    event: () => '💖 April-Funk: April macht irgendwas. Gut oder schlecht.',
    lift: (c, g) => `⬆ Aufzug: Fährt dich in den ${g.CITY[c.link].floor}. Stock. Wem die Ziel-Etage komplett gehört, kassiert Ð${g.RULES.liftFee}.`,
    slide: (c, g) => `⬇ Rutsche: Wuuuh, runter in den ${g.CITY[c.link].floor}. Stock.`,
    free: (c) => (c.hub ? '⇄ Umsteigebahnhof: Hier kreuzen sich Linien. Mit 🚄 Express kannst du direkt hierher springen.' : 'Hier passiert nichts. Einfach durchatmen.'),
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
      g.classList.toggle('is-mort', !!st.mort);
      g.classList.toggle('is-dead', !!(S.dead && S.dead[id]));
      g.classList.toggle('is-warn', !!warnRing && gb.CITY[id].ring === warnRing);
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
          return `<g class="wtok" data-tokpid="${esc(p.id)}" transform="translate(${ox},-30)"><circle r="10" style="stroke:${p.color}"/>${p.token === 'april' ? '<use href="#april" x="-10" y="-10" width="20" height="20"/>' : `<text y="4.5">${p.token === 'dulidan' ? 'D' : tk.emoji}</text>`}</g>`;
        }).join('');
      }
    });
    document.querySelectorAll('#world .route').forEach((r) => {
      const [a, b] = r.dataset.r.split('-');
      r.classList.toggle('is-open', (a === cur.loc && t.walk.includes(b)) || (b === cur.loc && t.walk.includes(a)));
    });
  }

  function destBtn(S, cur, to, action) {
    const s2 = S.cities[to], cc = GB().CITY[to];
    const o = s2 ? P(s2.owner) : null;
    const toll = o && o.id !== cur.id ? W.rentFor(S, to, cur) : 0;
    const tag = !s2 ? ({ free: cc.hub ? '⇄ Umsteigen' : 'frei', event: '💖 April-Funk', loot: '🎁 Loot', portal: '🌀 Portal', lift: '⬆ Aufzug', slide: '⬇ Rutsche' }[cc.type] || '')
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
      <small>${M(cur.money)} · ${esc(GB().CITY[cur.loc].name)}</small></div></div>`;
    if (Date.now() < (App.busyUntil || 0)) {
      el.innerHTML = h + `<p class="action-note rolling">${S.sub === 'walk' ? '🧭 unterwegs …' : '🎲 Die Würfel rollen …'}</p>`;
      return;
    }
    if (!me) {
      const what = { roll: 'würfelt gleich', pick: 'wählt die Schritte', jet: 'sucht sich ein Ziel aus', walk: 'navigiert durchs Netz', buy: 'überlegt, ob gekauft wird', end: 'beendet gleich den Zug', debt: 'muss Schulden begleichen', portal: 'steht vor einem Portal' }[S.sub] || '';
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
        }[S.mode]}</p>`;
        if (cur.items && (cur.items.shield || cur.items.boost)) h += `<p class="action-note">Deine Items: ${cur.items.shield ? `🛡️ ×${cur.items.shield} ` : ''}${cur.items.boost ? `⚡ ×${cur.items.boost}` : ''}</p>`;
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
        h += S.mode === 'metro'
          ? `<p class="action-note">🚄 <strong>Express!</strong> Spring zu einem Umsteigebahnhof deiner Wahl – oder fahr ganz normal ${S.steps} Stationen.</p>`
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
      if (!p.bankrupt) meta.push(`<span>${owned.length} ${words().cities}</span>`, `<span>${zones.length} komplett</span>`);
      if (p.items && p.items.shield) meta.push(`<span>🛡️×${p.items.shield}</span>`);
      if (p.items && p.items.boost) meta.push(`<span>⚡×${p.items.boost}</span>`);
      if (p.bankrupt) meta.push('<span class="warn">pleite</span>');
      if (App.mode !== 'local' && !p.connected && !p.bankrupt && !p.bot) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" data-pid="${esc(p.id)}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)} ${p.bot ? '<span class="bot-tag">BOT</span>' : ''}</div>
          <div class="swatches">${owned.map((id) => `<i class="${S.cities[id].mort ? 'is-mort' : ''}" style="--g:${GB().ZONES[GB().CITY[id].zone].color}" title="${esc(GB().CITY[id].name)}"></i>`).join('')}</div>
          <div class="pmeta">${meta.join('')}</div></div>
        <div class="pmoney">${M(p.money)}</div>${goalBar(p)}</li>`;
    }).join('');
  }

  function renderWorldProps() {
    const S = App.S, v = viewer(), wrap = $('#my-props');
    const Wd = words().cities;
    if (!v) { $('#props-title').textContent = Wd; wrap.innerHTML = '<p class="empty">Du schaust zu.</p>'; return; }
    $('#props-title').textContent = App.mode === 'local' || v.id !== myId ? `${Wd} von ${v.name}` : `Deine ${Wd}`;
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
    world: '<li>Die Weltkarte: Routen über Land und See, ✈ Flughäfen für Jetset-Flüge.</li>',
    royale: '<li>🌀 Drei Ringe. Portale verbinden sie. Je weiter innen, desto teurer.</li><li>🌪️ Der April-Sturm zerstört in Runde 7 den äußeren und in Runde 14 den mittleren Ring. Wer dort steht, fliegt nach innen. Zerstörte Planeten zahlen die Hälfte zurück.</li><li>🔥 Danach steigen alle Mieten jede Runde um 30 %, bis nur noch einer übrig ist.</li><li>🎁 Loot-Kisten: 🛡️ Schild blockt eine Miete, ⚡ Boost bringt dich 3 Felder weiter.</li>',
    metro: '<li>🚇 Sieben U-Bahn-Linien, fünf Umsteigebahnhöfe.</li><li>🎫 Gehört jemandem eine ganze Linie, zahlst du Fahrpreis für jede seiner Stationen, durch die du nur durchfährst.</li><li>🚄 Express-Seite des Dulidan-Würfels: Spring zu einem beliebigen Umsteigebahnhof.</li>',
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
      ${variantRulesHTML()}
      <h3>Figuren</h3><ul>${Object.entries(GB().POWERS).map(([k, t]) => `<li><strong>${esc(TOKENS[k].name)}:</strong> ${esc(t)}</li>`).join('')}</ul></div>`;
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
    const delay = isWorld() ? busy + 120 : (App.animT ? 1100 : 150);
    setTimeout(() => {
      let gain = false, loss = false;
      diffs.forEach(({ p, d }, i) => {
        setTimeout(() => popMoney(p, d), i * 120);
        if (d > 0) gain = true; else loss = true;
      });
      const big = diffs.some(({ d }) => Math.abs(d) >= 500);
      if (loss) FX.play(big ? 'bigLoss' : 'coinDown');
      if (gain) setTimeout(() => FX.play(big ? 'bigGain' : 'coinUp'), loss ? 180 : 0);
    }, delay);
  }

  function popMoney(p, d) {
    const txt = `${d > 0 ? '+' : '−'}Ð${Math.abs(d).toLocaleString('de-DE')}`;
    const big = Math.abs(d) >= 500;
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
  runBoot();

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
    moneyPops();
    if (S.phase === 'over' && App.lastPhase !== 'over') {
      FX.confetti();
      const w = P(S.winner);
      openModal(`<div class="winner">${tokHTML(w.token, w.color)}<h2>${esc(w.name)} gewinnt!</h2><p>${world ? 'Die Welt gehört jetzt Dulidan. 🌍💜' : 'Herzlichen Glückwunsch zum Dulidanopoly-Sieg. 💜'}</p>${awardsHTML()}</div>`);
    }
    App.lastPhase = S.phase;
  }
})();
