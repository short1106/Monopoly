// Dulidan Party – gemeinsames Gerüst für die Extra-Spiele (UNO, Schiffe versenken …):
// Startseite, Raum erstellen/beitreten, Lobby mit Bots, Host hält das Spiel und schickt jeder Person
// nur ihre eigene Sicht (verdeckte Karten und Schiffe bleiben verdeckt).
(function () {
  const Net = window.DULI_NET;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } },
  };
  let myId = store.get('duli-id');
  if (!myId) { myId = 'u' + Math.random().toString(36).slice(2, 10); store.set('duli-id', myId); }
  const COLORS = ['#c020b8', '#3ad1ff', '#ffd83a', '#3ce08a', '#ff7a2a', '#ff3d5e'];

  function start(G) {
    Net.prefix = `dulidan-${G.id}-v1-`;
    const App = { mode: null, code: null, room: null, view: null, botT: null, name: store.get('duli-name') || '' };
    const root = $('#party');
    let toastT;
    const toast = (m) => { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3000); };

    // ---------- Host-Seite ----------
    const newRoom = () => ({ phase: 'lobby', players: [], settings: Object.assign({}, G.defaults || {}), S: null, seq: 0 });
    function addPlayer(R, id, name, bot) {
      if (R.players.find((p) => p.id === id)) { R.players.find((p) => p.id === id).connected = true; return null; }
      if (R.phase !== 'lobby') return 'Das Spiel läuft schon.';
      if (R.players.length >= G.max) return `Mehr als ${G.max} geht nicht.`;
      R.players.push({ id, name: String(name || 'Gast').slice(0, 16), bot: !!bot, connected: true, color: COLORS[R.players.length % COLORS.length] });
      return null;
    }
    function hostAct(pid, a) {
      const R = App.room;
      if (a.type === 'start') {
        if (pid !== myId) return 'Nur der Host startet.';
        if (R.players.length < G.min) return `Ihr braucht mindestens ${G.min} Spieler.`;
        R.S = G.engine.start(R.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color })), R.settings);
        R.phase = 'play';
        return null;
      }
      if (a.type === 'again') {
        if (pid !== myId) return 'Nur der Host startet neu.';
        R.S = G.engine.start(R.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color })), R.settings, R.S);
        return null;
      }
      if (a.type === 'lobby') { if (pid !== myId) return 'Nur der Host.'; R.phase = 'lobby'; R.S = null; return null; }
      if (a.type === 'addBot') {
        if (pid !== myId) return 'Nur der Host.';
        const names = G.botNames || ['April-Bot', 'KI-Kevin', 'Bot Bernd', 'Robo-Rita', 'Byte-Basti'];
        const n = names.find((x) => !R.players.some((p) => p.name === x)) || 'Bot';
        return addPlayer(R, 'bot-' + Math.random().toString(36).slice(2, 8), n, true);
      }
      if (a.type === 'kick') { if (pid !== myId || R.phase !== 'lobby') return 'Nur der Host in der Lobby.'; R.players = R.players.filter((p) => p.id !== a.id); return null; }
      if (a.type === 'setting') { if (pid !== myId || R.phase !== 'lobby') return 'Nur der Host in der Lobby.'; R.settings[a.key] = a.value; return null; }
      if (R.phase !== 'play' || !R.S) return 'Das Spiel läuft nicht.';
      return G.engine.act(R.S, pid, a);
    }
    function viewFor(pid) {
      const R = App.room;
      return { phase: R.phase, code: App.code, host: myId, players: R.players, settings: R.settings, seq: ++R.seq, S: R.S ? G.engine.view(R.S, pid) : null };
    }
    function commit() {
      if (App.mode === 'host') for (const [cid, c] of Net.conns) if (c.open) c.send({ type: 'room', room: viewFor(cid) });
      App.view = viewFor(myId);
      render();
      scheduleBots();
    }
    function scheduleBots() {
      clearTimeout(App.botT);
      const R = App.room;
      if (!R || R.phase !== 'play' || !R.S) return;
      const st = G.engine.bot(R.S);
      if (!st) return;
      App.botT = setTimeout(() => {
        const s2 = App.room.S && G.engine.bot(App.room.S);
        if (!s2) return;
        const err = G.engine.act(App.room.S, s2.pid, s2.action);
        if (err) console.warn('Bot:', err, s2.action);
        commit();
      }, st.delay || G.botDelay || 900);
    }

    // ---------- Aktionen von der Oberfläche ----------
    function act(a) {
      if (App.mode === 'client') { if (!Net.send({ type: 'act', action: a })) toast('Keine Verbindung zum Host.'); return; }
      const err = hostAct(myId, a);
      if (err) toast(err); else commit();
    }

    // ---------- Netz ----------
    Net.handlers.status = (st) => { App.conn = st; renderTop(); if (st === 'noroom') toast('Raum nicht gefunden.'); };
    Net.handlers.message = (msg, conn) => {
      if (App.mode === 'host') {
        if (msg.type === 'hello') {
          Net.register(conn, msg.clientId);
          const err = addPlayer(App.room, msg.clientId, msg.name, false);
          if (err) { conn.send({ type: 'error', msg: err }); return; }
          commit();
        } else if (msg.type === 'act' && conn.clientId) {
          const err = hostAct(conn.clientId, msg.action || {});
          if (err) conn.send({ type: 'error', msg: err }); else commit();
        }
        return;
      }
      if (msg.type === 'room') { App.view = msg.room; render(); }
      if (msg.type === 'custom' && G.onCustom) G.onCustom(msg.data);
      if (msg.type === 'error') toast(msg.msg);
    };
    Net.handlers.peerLeft = (cid) => { const p = App.room && App.room.players.find((x) => x.id === cid); if (p) { p.connected = false; commit(); } };

    function askName() {
      const n = $('#p-name').value.trim().slice(0, 16);
      if (!n) { toast('Gib zuerst deinen Namen ein.'); $('#p-name').focus(); return null; }
      store.set('duli-name', n);
      App.name = n;
      return n;
    }
    function hostRoom(online) {
      const n = askName();
      if (!n) return;
      App.room = newRoom();
      addPlayer(App.room, myId, n, false);
      App.mode = 'host';
      if (!online) { App.code = null; App.mode = 'host'; App.solo = true; for (let k = 1; k < (G.soloBots ?? 1) + 1; k++) hostAct(myId, { type: 'addBot' }); commit(); return; }
      App.solo = false;
      const code = Net.randomCode();
      $('#p-create').disabled = true;
      Net.host(code, (err, ok) => {
        $('#p-create').disabled = false;
        if (err === 'taken') return hostRoom(true);
        if (err) { toast('Online gerade nicht erreichbar. Spiel gegen Bots geht trotzdem.'); App.mode = null; return; }
        App.code = ok;
        history.replaceState(null, '', `?raum=${ok}`);
        commit();
      });
    }
    function joinRoom() {
      const n = askName();
      if (!n) return;
      const code = $('#p-code').value.trim().toUpperCase();
      if (code.length !== 4) return toast('Der Code hat 4 Zeichen.');
      App.mode = 'client';
      App.code = code;
      App.view = null;
      Net.join(code, () => ({ type: 'hello', clientId: myId, name: n }));
      render();
    }

    // ---------- Darstellung ----------
    function renderTop() {
      const chip = $('#p-room');
      chip.hidden = !App.mode;
      chip.textContent = App.solo ? (G.soloChip || 'Gegen Bots') : App.code ? `Raum ${App.code}` : '';
      const net = $('#p-net');
      net.hidden = !App.mode || App.solo;
      net.textContent = App.mode === 'host' ? 'Host' : { online: 'Online', lost: 'Verbindung weg …', noroom: 'Raum nicht gefunden', reconnecting: 'Verbinde neu …' }[App.conn] || 'Verbinde …';
    }
    function render() {
      renderTop();
      const V = App.view;
      if (!App.mode) return renderHome();
      if (!V) { root.innerHTML = '<div class="p-card"><p class="p-wait">Verbinde mit dem Raum …</p></div>'; return; }
      if (V.phase === 'lobby') return renderLobby(V);
      G.render(root, V.S, myId, { act, toast, esc, players: V.players, settings: V.settings, isHost: V.host === myId, solo: !!App.solo, again: () => act({ type: 'again' }), lobby: () => act({ type: 'lobby' }),
        broadcast: (data) => { if (App.mode === 'host' && !App.solo) Net.broadcast({ type: 'custom', data }); } });
    }
    function renderHome() {
      root.innerHTML = `<div class="p-hero"><p class="sec-label"><span class="n">${esc(G.kicker || 'SPIEL')}</span>Dulidan Studios</p>
        <h1 class="p-title">${G.titleHTML || esc(G.title)}</h1><p class="p-lead">${esc(G.tagline)}</p></div>
        <div class="p-card home-card term"><div class="term-bar"><i></i><i></i><i></i><span>dulidan://${esc(G.id)}</span></div><div class="term-body">
          <label class="field"><span>Dein Name</span><input id="p-name" maxlength="16" autocomplete="nickname" placeholder="z. B. Shaquille" value="${esc(App.name)}"></label>
          <button id="p-create" class="btn btn-primary">Online-Raum erstellen</button>
          <div class="divider"><span>oder</span></div>
          <div class="join-row"><label class="field"><span>Raum-Code</span><input id="p-code" maxlength="4" autocomplete="off" placeholder="ABCD" value="${esc(new URLSearchParams(location.search).get('raum') || '')}"></label><button id="p-join" class="btn">Beitreten</button></div>
          <button id="p-solo" class="btn btn-ghost">${esc(G.soloLabel || 'Gegen Bots spielen')}</button>
        </div></div>
        <div class="p-rules">${G.rulesHTML || ''}</div>`;
      $('#p-create').onclick = () => hostRoom(true);
      $('#p-join').onclick = joinRoom;
      $('#p-solo').onclick = () => hostRoom(false);
      $('#p-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(); });
    }
    function renderLobby(V) {
      const host = V.host === myId;
      root.innerHTML = `<div class="p-card p-lobby"><p class="sec-label"><span class="n">LOBBY</span>${esc(G.title)}</p>
        ${App.solo ? `<h2 class="p-code">${esc(G.soloChip || 'Gegen Bots')}</h2>` : `<h2 class="p-code">${esc(V.code || '----')}</h2><p class="p-sub">Schick den Code oder den Link an deine Leute.</p>${host ? '<button class="btn btn-small" id="p-copy">Link kopieren</button>' : ''}`}
        <ul class="p-players">${V.players.map((p) => `<li style="--pc:${p.color}"><span class="p-dot"></span><strong>${esc(p.name)}</strong>${p.bot ? '<span class="bot-tag">BOT</span>' : ''}${p.id === V.host ? '<small>Host</small>' : ''}${p.id === myId ? '<small>du</small>' : ''}${!p.connected && !p.bot ? '<small class="warn">offline</small>' : ''}${host && p.id !== myId ? `<button class="btn btn-small btn-ghost" data-kick="${esc(p.id)}">Entfernen</button>` : ''}</li>`).join('')}</ul>
        <p class="p-sub">${V.players.length}/${G.max} · mindestens ${G.min}</p>
        ${G.settingsHTML ? `<div class="p-settings">${G.settingsHTML(V.settings, host)}</div>` : ''}
        ${G.lobbyNote ? G.lobbyNote(host) : ''}
        ${host ? `<div class="btn-row">${V.players.length < G.max && !G.noBots ? '<button class="btn" id="p-bot">+ Bot</button>' : ''}<button class="btn btn-primary" id="p-start" ${V.players.length < G.min ? 'disabled' : ''}>Spiel starten</button></div>` : '<p class="p-wait">Der Host startet gleich …</p>'}</div>`;
      if (host) {
        $('#p-start').onclick = () => act({ type: 'start' });
        if ($('#p-bot')) $('#p-bot').onclick = () => act({ type: 'addBot' });
        if ($('#p-copy')) $('#p-copy').onclick = () => { const l = `${location.origin}${location.pathname}?raum=${V.code}`; navigator.clipboard.writeText(l).then(() => toast('Link kopiert!'), () => toast(l)); };
        root.querySelectorAll('[data-kick]').forEach((b) => { b.onclick = () => act({ type: 'kick', id: b.dataset.kick }); });
        root.querySelectorAll('[data-set]').forEach((el) => { el.onchange = () => act({ type: 'setting', key: el.dataset.set, value: el.type === 'checkbox' ? el.checked : el.type === 'number' || el.dataset.num ? Number(el.value) : el.value }); });
      }
    }
    render();
    if (new URLSearchParams(location.search).get('raum') && App.name) setTimeout(() => { if (!App.mode) joinRoom(); }, 50);
    return { act, toast, refresh: render };
  }

  window.DULI_PARTY = { start, esc };
})();
