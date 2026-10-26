// Dulidanopoly – Oberfläche: Startseite, Lobby, Brett, Aktionen
(function () {
  const D = window.DULI_DATA, E = window.DULI_ENGINE, Net = window.DULI_NET, FX = window.DULI_FX;
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

  const App = { mode: null, S: null, code: null, lastRoll: 0, lastPhase: null, localSel: null, confirmBankrupt: false, trade: null, conn: 'off', seenSeq: null, lastCurId: null };
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
  }
  function doAct(action, pid) {
    App.confirmBankrupt = action.type === 'bankruptAsk';
    if (action.type === 'bankruptAsk') return render();
    if (App.mode === 'client') {
      if (!Net.send({ type: 'act', action })) toast('Keine Verbindung zum Host.');
      return;
    }
    const err = E.act(App.S, pid || myId, action);
    if (err) toast(err); else commit();
  }

  function canControl(pid) {
    if (!pid) return false;
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
    } else if (msg.type === 'act') {
      if (!conn.clientId) return;
      const err = E.act(S, conn.clientId, msg.action || {});
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

  $('#btn-start').onclick = () => {
    const err = E.startGame(App.S);
    if (err) return toast(err);
    commit();
    enterRoom();
  };

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

    $('#lobby-players').innerHTML = S.players.map((p, i) => `
      <li class="${(local ? p.id === App.localSel : p.id === myId) ? 'is-me' : ''}" ${local ? `data-sel="${esc(p.id)}"` : ''}>
        ${tokHTML(p.token, D.PLAYER_COLORS[i % 6])}
        <div class="who"><strong>${esc(p.name)}${p.id === myId && !local ? ' (du)' : ''}</strong>
        <small>${p.token ? esc(TOKENS[p.token].name) : 'wählt noch …'}${i === 0 && !local ? ' · Host' : ''}</small></div>
        ${local ? `<button class="btn btn-small btn-ghost" data-rm="${esc(p.id)}">Entfernen</button>` : ''}
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
        <small>${esc(t.power)}</small></button>`;
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
        const next = App.S.players.find((p) => !p.token);
        if (next) App.localSel = next.id;
        return commit();
      }
      return doAct({ type: 'pickToken', token }, myId);
    }
    const sel = e.target.closest('[data-sel]');
    const rm = e.target.closest('[data-rm]');
    if (rm && App.mode === 'local') {
      App.S.players = App.S.players.filter((p) => p.id !== rm.dataset.rm);
      return render();
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
      const here = S.players.filter((p) => !p.bankrupt && p.pos === i);
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
    const d1 = $('#die1'), d2 = $('#die2');
    d1.innerHTML = dieHTML(a); d2.innerHTML = dieHTML(b);
    if (S.rollId !== App.lastRoll) {
      App.lastRoll = S.rollId;
      [d1, d2].forEach((d) => { d.classList.remove('is-rolling'); void d.offsetWidth; d.classList.add('is-rolling'); });
    }
    const cur = curP();
    $('#center-turn').innerHTML = S.phase === 'over'
      ? `🏆 <strong>${esc(P(S.winner).name)}</strong> gewinnt!`
      : `<strong>${esc(cur.name)}</strong> ist dran · Runde ${Math.ceil(S.turnNo / Math.max(1, S.players.filter((p) => !p.bankrupt).length))}`;

    const cc = $('#center-card');
    if (S.card) {
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
          h += `<div class="btn-row">${btn(S.rolledDouble ? '🎲 Nochmal würfeln' : '🎲 Würfeln', { type: 'roll' }, pid, 'btn-primary', !!S.trade)}</div>`;
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

  function renderPlayers() {
    const S = App.S;
    $('#players').innerHTML = S.players.map((p, i) => {
      const owned = Object.keys(S.props).filter((k) => S.props[k].owner === p.id).map(Number).sort((a, b) => a - b);
      const meta = [];
      if (p.inJail) meta.push('<span class="warn">in Düsseldorf</span>');
      if (p.skip) meta.push('<span class="warn">setzt aus</span>');
      if (p.jailFree.length) meta.push(`<span>${p.jailFree.length}× Freikarte</span>`);
      if (App.mode !== 'local' && !p.connected && !p.bankrupt) meta.push('<span class="warn">offline</span>');
      if (p.id === myId && App.mode !== 'local') meta.push('<span>du</span>');
      return `<li class="player ${i === S.cur && S.phase === 'play' ? 'is-cur' : ''} ${p.bankrupt ? 'is-out' : ''}" style="--pc:${p.color}">
        ${tokHTML(p.token, p.color)}
        <div style="min-width:0"><div class="pname">${esc(p.name)}</div>
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
          ${me.jailFree.length ? `<label class="field"><span>Freikarten (max. ${me.jailFree.length})</span><input id="tr-give-jf" type="number" min="0" max="${me.jailFree.length}" value="0"></label>` : ''}</div>
        <div class="trade-col"><h3>${esc(them.name)} gibt</h3>${list(them, 'get')}
          <label class="field"><span>Dulis (max. ${M(them.money)})</span><input id="tr-get-money" type="number" inputmode="numeric" min="0" max="${them.money}" value="0"></label>
          ${them.jailFree.length ? `<label class="field"><span>Freikarten (max. ${them.jailFree.length})</span><input id="tr-get-jf" type="number" min="0" max="${them.jailFree.length}" value="0"></label>` : ''}</div>
      </div>
      <div class="btn-row" style="margin-top:16px">${uiBtn(`Angebot an ${esc(them.name)} schicken`, 'tradeSend', 'btn-primary')}</div>`);
  }

  function uiAction(kind, data) {
    const S = App.S;
    if (kind === 'trade') return tradeModal();
    if (kind === 'tradeTo') { App.trade = { to: data.id }; return tradeModal(); }
    if (kind === 'tradeSend') {
      const vals = (name) => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => Number(x.value));
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
      old.forEach((p) => { E.addPlayer(N, p.id, p.name); N.players[N.players.length - 1].token = p.token; N.players[N.players.length - 1].connected = p.connected; });
      App.S = N;
      E.startGame(N);
      closeModal();
      return commit();
    }
    if (kind === 'endGame') {
      E.endGame(S);
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

  // ---------- Sounds aus dem Verlauf ----------
  const SOUND_RULES = [
    ['win', /gewinnt/], ['pot', /Spardose/], ['jail', /nach Düsseldorf/], ['pay', /zahlt|fehlen/],
    ['cash', /kassiert|Erhalte|ersteigert|kauft/], ['build', /baut/], ['card', /zieht eine/], ['roll', /würfelt/],
  ];
  function playSounds() {
    const S = App.S;
    const seq = S.logSeq || 0;
    if (App.seenSeq == null) { App.seenSeq = seq; return; }
    const n = Math.min(seq - App.seenSeq, S.log.length);
    App.seenSeq = seq;
    if (n <= 0) return;
    const fresh = S.log.slice(-n).join('\n');
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
  $('#btn-rules').onclick = () => openModal(`<h2>Regeln</h2><div class="rules">
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
    <h3>Figuren</h3><ul>${Object.values(TOKENS).map((t) => `<li><strong>${esc(t.name)}:</strong> ${esc(t.power)}</li>`).join('')}</ul></div>`);
  $('#btn-menu').onclick = () => {
    const host = App.mode !== 'client';
    openModal(`<h2>Menü</h2><div class="btn-row" style="flex-direction:column">
      ${App.mode !== 'local' ? uiBtn(`Einladungslink kopieren (Raum ${esc(App.code)})`, 'copy') : ''}
      ${host && App.S.phase === 'play' ? uiBtn('Spiel jetzt beenden – Reichster gewinnt', 'endGame') : ''}
      ${uiBtn(App.mode === 'host' ? 'Raum verlassen (Spiel bleibt gespeichert)' : 'Zur Startseite', 'leave', 'btn-ghost')}
    </div>
    ${App.mode === 'host' ? '<p class="action-note" style="margin-top:12px">Du bist der Host. Wenn du die Seite schließt, pausiert das Spiel für alle. Über die Startseite kannst du den Raum später fortsetzen.</p>' : ''}`);
  };

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
    renderBoard();
    renderAction();
    renderPlayers();
    renderProps();
    renderLog();
    playSounds();
    if (S.phase === 'over' && App.lastPhase !== 'over') {
      FX.confetti();
      const w = P(S.winner);
      openModal(`<div class="winner">${tokHTML(w.token, w.color)}<h2>${esc(w.name)} gewinnt!</h2><p>Herzlichen Glückwunsch zum Dulidanopoly-Sieg. 💜</p></div>`);
    }
    App.lastPhase = S.phase;
  }
})();
