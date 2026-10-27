// DULIDAN GeoGuessr – Oberfläche wie das Original:
// Straßenbilder (Mapillary, wie Street View) oder Satellit, Kompass, „Zurück zum Start“, Tippkarte mit Größe und Pin,
// Leertaste zum Raten, Countdown, Duelle mit Lebenspunkten, Länder-Battle-Royale, Auflösung mit Flagge und Punktebalken,
// Zusammenfassung aller Runden, Challenge-Links und eigene Statistik.
(function () {
  const G = window.DULI_GEO, D = window.DULI_GEO_DATA, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const CFG = window.DULI_GEO_CONFIG || {};
  const Lf = window.L;
  const $ = (s, r = document) => r.querySelector(s);
  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const SAT_ATTR = 'Satellit: Esri, Maxar, Earthstar Geographics';
  const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  // Karte ohne Beschriftung für „Wo liegt …?“
  const BLANK = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
  const BLANK_ATTR = '&copy; OpenStreetMap, &copy; CARTO';
  const SHOW = { image: 'Bild', name: 'Wo liegt …?', flag: 'Flaggen' };
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat */ } },
  };
  const put = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; return true; } return false; };
  const dist = (k) => (k == null ? '–' : k < 1 ? `${Math.round(k * 1000)} m` : k < 100 ? `${k.toFixed(1).replace('.', ',')} km` : `${Math.round(k).toLocaleString('de-DE')} km`);
  const pts = (n) => Math.round(n).toLocaleString('de-DE');
  const flag = (cc) => (cc ? `<img class="geo-flag" src="https://flagcdn.com/w80/${esc(cc)}.png" alt="" loading="lazy" onerror="this.remove()">` : '');
  const cname = (cc) => D.COUNTRIES[cc] || (cc || '').toUpperCase();
  const mlyToken = () => CFG.MAPILLARY_TOKEN || store.get('duli-geo-mly', '');
  const MOVE = { move: 'Bewegen', nomove: 'Kein Bewegen', nmpz: 'NMPZ', zoomout: 'Zoom-Out' };
  const GAMES = { classic: 'Klassisch', duel: 'Duell', br: 'Länder-Battle-Royale' };

  let maps = [], viewer = null, key = null, pick = null, tick = null, lastRes = null, lastOver = null, resolving = null, lastEmote = null, statsDone = null;
  function clearViews() {
    maps.forEach((m) => { try { m.off(); m.stop(); m.remove(); } catch (e) { /* weg */ } });
    maps = [];
    if (viewer) { try { viewer.remove(); } catch (e) { /* weg */ } viewer = null; }
  }
  const later = (m, fn, ms) => setTimeout(() => { if (maps.includes(m) && document.body.contains(m.getContainer())) { try { fn(); } catch (e) { /* Karte weg */ } } }, ms);
  const timeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };

  // ---------- Host: Ort auflösen (Straßenbild suchen, echtes Land bestimmen) ----------
  async function findImage(lat, lng, token) {
    for (const r of [0.0025, 0.008, 0.025]) {
      const bbox = [lng - r * 1.5, lat - r, lng + r * 1.5, lat + r].map((x) => x.toFixed(6)).join(',');
      try {
        const res = await fetch(`https://graph.mapillary.com/images?access_token=${encodeURIComponent(token)}&fields=id,computed_geometry,geometry,is_pano,creator&bbox=${bbox}&limit=60`, { signal: timeout(7000) });
        if (!res.ok) { if (res.status === 401 || res.status === 403) return { bad: true }; continue; }
        const j = await res.json();
        const list = (j.data || []).map((x) => { const c = (x.computed_geometry || x.geometry || {}).coordinates; return c ? { id: String(x.id), lng: c[0], lat: c[1], pano: !!x.is_pano, creator: x.creator && x.creator.username } : null; }).filter(Boolean);
        if (!list.length) continue;
        const d2 = (x) => (x.lat - lat) ** 2 + ((x.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
        list.sort((a, b) => (b.pano - a.pano) || d2(a) - d2(b));
        return list[0];
      } catch (e) { /* nächster Radius */ }
    }
    return null;
  }
  async function reverseInfo(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&accept-language=de`, { signal: timeout(6000) });
      const j = await r.json();
      const a = j.address || {};
      const town = a.city || a.town || a.village || a.municipality || a.county || '';
      const region = a.state && a.state !== town ? a.state : '';
      return { cc: a.country_code || '', place: [town, region].filter(Boolean).join(', ') };
    } catch (e) { return { cc: '', place: '' }; }
  }
  async function resolve(V, api) {
    const r = V.round, c = V.cand;
    resolving = `${V.gid}|${r}`;
    const token = mlyToken();
    let img = null;
    if (V.imagery === 'street' && token) {
      img = await findImage(c.lat, c.lng, token);
      if (img && img.bad) { api.toast('Der Mapillary-Token stimmt nicht. Es geht mit Satellitenbildern weiter.'); img = null; }
    }
    const at = img || c;
    const info = await reverseInfo(at.lat, at.lng);
    api.act({ type: 'place', round: r, lat: img ? img.lat : null, lng: img ? img.lng : null, img: img ? img.id : '', creator: img ? img.creator : '', cc: info.cc, place: info.place, token: img ? token : '' });
  }

  // ---------- Statistik ----------
  function addStats(V, me) {
    if (statsDone === V.gid || !V.players.some((p) => p.id === me)) return;
    statsDone = V.gid;
    const st = store.get('duli-geo-stats', { games: 0, rounds: 0, sum: 0, perfect: 0, best: {}, wins: 0, cRight: 0, cAll: 0, streak: 0 });
    st.games++;
    if (V.winners.includes(me)) st.wins++;
    V.history.forEach((h) => {
      const g = h.guesses[me];
      if (!g) return;
      st.rounds++; st.sum += g.pts || 0;
      if (g.pts >= G.MAX && V.guess === 'dist') st.perfect++;
      if (V.guess === 'country') { st.cAll++; if (g.ok) st.cRight++; }
    });
    if (V.game === 'classic') { const k = `${V.set}|${V.guess}|${V.rounds}`; st.best[k] = Math.max(st.best[k] || 0, V.scores[me]); }
    if (V.game === 'br' && V.lives === 1) st.streak = Math.max(st.streak, V.correct[me]);
    if (Number(V.seed) === daySeed() && V.game === 'classic') { st.daily = st.daily || {}; st.daily[today()] = Math.max(st.daily[today()] || 0, V.scores[me]); }
    store.set('duli-geo-stats', st);
  }
  function statsHTML() {
    const st = store.get('duli-geo-stats', null);
    if (!st || !st.games) return '';
    return `<div class="geo-stats"><span><b>${st.games}</b> Spiele</span><span><b>${st.wins}</b> Siege</span><span><b>${st.rounds ? pts(st.sum / st.rounds) : 0}</b> Ø Punkte/Runde</span><span><b>${st.perfect}</b>× 5.000</span>${st.cAll ? `<span><b>${Math.round((st.cRight / st.cAll) * 100)} %</b> Länder richtig</span>` : ''}${st.streak ? `<span><b>${st.streak}</b> beste Streak</span>` : ''}</div>`;
  }

  // ---------- Challenge-Links ----------
  const b64 = { enc: (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))) };
  let CH = null;
  try { const c = new URLSearchParams(location.search).get('ch'); if (c) CH = b64.dec(c); } catch (e) { CH = null; }
  function challengeLink(V, me) {
    const p = V.players.find((x) => x.id === me);
    const s = { show: V.show, game: 'classic', guess: V.guess, set: V.set, rounds: V.rounds, time: V.time, countdown: V.countdown, move: V.move, imagery: V.imagery, seed: V.seed, bw: !!(V.mods && V.mods.bw), blur: !!(V.mods && V.mods.blur), spot: !!(V.mods && V.mods.spot) };
    return `${location.origin}${location.pathname}?ch=${b64.enc({ s, n: p ? p.name : '?', sc: V.scores[me] })}`;
  }

  // ---------- Darstellung ----------
  function render(root, V, me, api) {
    if (!V) return;
    clearInterval(tick);
    if (api.isHost && V.phase === 'load' && V.cand && resolving !== `${V.gid}|${V.round}`) resolve(V, api);
    showEmote(V);
    if (V.phase === 'load') return renderLoad(root, V, me, api);
    if (V.phase === 'guess') return renderGuess(root, V, me, api);
    if (V.phase === 'result') return renderResult(root, V, me, api);
    return renderOver(root, V, me, api);
  }
  function showEmote(V) {
    if (!V.emote || lastEmote === V.emote.seq) return;
    const first = lastEmote === null;
    lastEmote = V.emote.seq;
    if (first) return;
    const p = V.players.find((x) => x.id === V.emote.pid);
    const el = document.createElement('div');
    el.className = 'geo-emote';
    el.style.setProperty('--pc', p ? p.color : '#fff');
    el.innerHTML = `<b>${esc(p ? p.name : '?')}</b> ${esc(G.EMOTES[V.emote.i])}`;
    document.body.appendChild(el);
    FX && FX.play('pop');
    setTimeout(() => el.remove(), 3200);
  }
  // Kopfzeile wie im Original: Karte · Runde · Punkte, dazu HP oder Leben
  function hud(V, me) {
    const meP = V.players.find((p) => p.id === me);
    const right = `<div class="geo-hud-box"><span><small>Karte</small><b>${esc(V.setName)}</b></span><span><small>Runde</small><b>${V.round}${V.game === 'classic' ? ` / ${V.rounds}` : ''}</b></span>${meP && V.game !== 'br' ? `<span><small>${V.game === 'duel' ? 'Leben' : 'Punkte'}</small><b>${pts(V.game === 'duel' ? Math.max(0, V.hp[me]) : V.scores[me])}</b></span>` : ''}${V.game === 'duel' ? `<span><small>Schaden</small><b>×${String(V.mult).replace('.', ',')}</b></span>` : ''}</div>`;
    let mid = '';
    if (V.game === 'duel') mid = `<div class="geo-hpbars">${V.players.map((p) => `<div class="geo-hp ${V.out[p.id] ? 'out' : ''}" style="--pc:${p.color}"><span>${esc(p.name)}</span><i style="--v:${Math.max(0, V.hp[p.id]) / G.HP * 100}%"></i><b>${pts(Math.max(0, V.hp[p.id]))}</b></div>`).join('')}</div>`;
    if (V.game === 'br') mid = `<div class="geo-lives">${V.players.map((p) => `<div class="geo-life ${V.out[p.id] ? 'out' : ''}" style="--pc:${p.color}"><span>${esc(p.name)}</span>${Array.from({ length: V.lives }, (_, i) => `<i class="${i < V.lifes[p.id] ? 'on' : ''}"></i>`).join('')}<b>${V.correct[p.id]}</b></div>`).join('')}</div>`;
    return `<div class="geo-hud">${mid}${right}</div>`;
  }

  function renderLoad(root, V, me, api) {
    key = `load${V.gid}|${V.round}`;
    clearViews();
    root.innerHTML = `<div class="geo geo-loading">${hud(V, me)}<div class="geo-stage geo-stage-load"><div class="geo-spin"></div><p>${V.round === 1 ? 'April sucht den ersten Ort …' : `Runde ${V.round} wird geladen …`}</p>${V.game === 'duel' && V.mult > 1 ? `<p class="geo-mult">Schaden ×${String(V.mult).replace('.', ',')}</p>` : ''}</div></div>`;
  }

  // ----- Raten -----
  function renderGuess(root, V, me, api) {
    const playing = V.players.some((p) => p.id === me) && !V.out[me];
    const k = `g${V.gid}|${V.round}`;
    const quiz = V.show !== 'image';
    if (key !== k || !root.querySelector('.geo-guess')) {
      key = k; pick = null; clearViews();
      const size = store.get('duli-geo-size', 1), pinned = store.get('duli-geo-pin', false);
      const q = V.show === 'flag'
        ? `<div class="geo-q geo-q-flag"><img src="https://flagcdn.com/w320/${esc(V.loc.q)}.png" alt="Flagge"><span>Welches Land ist das?</span></div>`
        : V.show === 'name' ? `<div class="geo-q"><span class="geo-k">Wo liegt</span><b>${esc(V.loc.q)}</b></div>` : '';
      root.innerHTML = `<div class="geo geo-guess">
        <div class="geo-stage ${quiz ? 'geo-quizstage' : ''}">${quiz ? q : '<div id="geo-view" class="geo-view"></div><div class="geo-speed" id="geo-speed" hidden></div>'}
          <div id="geo-hud"></div>
          <div class="geo-timer" id="geo-timer" hidden></div>
          <div class="geo-tools">
            ${quiz ? '' : '<div class="geo-compass" id="geo-compass" title="Norden"><i></i><span>N</span></div>'}
            ${!quiz && !['nmpz', 'zoomout'].includes(V.move) ? '<button class="geo-tool" id="geo-home" type="button" title="Zurück zum Start (R)">⟲</button>' : ''}
            <button class="geo-tool" id="geo-emo" type="button" title="Emotes">GG</button>
          </div>
          <div class="geo-emo-list" id="geo-emo-list" hidden>${G.EMOTES.map((t, i) => `<button type="button" data-emo="${i}">${esc(t)}</button>`).join('')}</div>
          <div class="geo-note" id="geo-note" hidden></div>
          <div id="geo-who" class="geo-who-wrap"></div>
          ${playing ? `<div class="geo-mini s${size} ${pinned ? 'pinned' : ''} ${quiz ? 'quiz' : ''}" id="geo-mini">
            <div class="geo-mini-ctl"><button type="button" data-size="1" title="Größer">⤢</button><button type="button" data-size="-1" title="Kleiner">⤡</button><button type="button" id="geo-pin" class="${pinned ? 'on' : ''}" title="Karte festhalten">⊙</button></div>
            <div id="geo-pick" class="geo-pickmap"></div>
            ${V.guess === 'country' ? `<input id="geo-country" list="geo-cl" placeholder="Land eintippen oder auf die Karte klicken" autocomplete="off"><datalist id="geo-cl">${Object.values(D.COUNTRIES).sort((a, b) => a.localeCompare(b, 'de')).map((n) => `<option value="${esc(n)}">`).join('')}</datalist>` : ''}
            <button class="btn btn-primary geo-guessbtn" id="geo-send" disabled>${V.guess === 'country' ? 'Land wählen' : 'Karte anklicken'}</button></div>
          <button class="btn btn-primary geo-mini-open" id="geo-open" type="button">Karte</button>` : `<div class="geo-spectate">${V.out[me] ? 'Du bist raus. Schau zu, wer gewinnt.' : 'Du schaust zu.'}</div>`}
        </div></div>`;
      window.scrollTo(0, 0);
      if (!quiz) buildViewer(V);
      if (playing) buildPicker(V, me, api);
      const emoBtn = $('#geo-emo'), emoList = $('#geo-emo-list');
      emoBtn.onclick = () => { emoList.hidden = !emoList.hidden; };
      emoList.querySelectorAll('[data-emo]').forEach((b) => { b.onclick = () => { emoList.hidden = true; api.act({ type: 'emote', i: Number(b.dataset.emo) }); }; });
    }
    put($('#geo-hud'), hud(V, me));
    if (V.guesses[me] && $('#geo-mini')) {
      $('#geo-mini').classList.add('is-done');
      const s = $('#geo-send'); s.disabled = true; s.textContent = 'Getippt – warte auf die anderen';
    }
    const live = V.players.filter((p) => !V.out[p.id]);
    put($('#geo-who'), `<ul class="geo-who">${live.map((p) => `<li class="${V.done[p.id] ? 'done' : ''}" style="--pc:${p.color}">${esc(p.name)} <small>${V.done[p.id] ? 'hat getippt' : 'sucht …'}</small></li>`).join('')}</ul>
      ${api.isHost ? '<button class="geo-force" id="geo-force" type="button">Runde auflösen</button>' : ''}`);
    if ($('#geo-force')) $('#geo-force').onclick = () => { if (confirm('Runde jetzt auflösen?')) api.act({ type: 'next' }); };
    const tEl = $('#geo-timer');
    if (V.deadline) {
      const t = () => {
        const s = Math.max(0, Math.ceil((V.deadline - Date.now()) / 1000));
        tEl.hidden = false;
        tEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
        tEl.classList.toggle('low', s <= 10);
        if (s <= 5 && s > 0 && tEl.dataset.s !== String(s)) { tEl.dataset.s = String(s); FX && FX.play('step'); }
      };
      t(); tick = setInterval(t, 250);
    } else tEl.hidden = true;
  }

  function buildViewer(V) {
    const el = $('#geo-view');
    applyMods(V, el);
    if (V.move === 'zoomout') return buildZoomOut(V, el);
    const useStreet = V.loc.img && V.mly && window.mapillary;
    const compass = $('#geo-compass i');
    if (useStreet) {
      try {
        const move = V.move === 'move', nmpz = V.move === 'nmpz';
        viewer = new window.mapillary.Viewer({
          accessToken: V.mly, container: el, imageId: V.loc.img,
          component: { cover: false, attribution: false, bearing: false, direction: move, sequence: false, keyboard: move, pointer: !nmpz, zoom: !nmpz, spatial: false, tag: false, popup: false, marker: false, slider: false, cache: true, image: true },
        });
        viewer.on('bearing', (e) => { if (compass) compass.style.transform = `rotate(${-e.bearing}deg)`; });
        if ($('#geo-home')) $('#geo-home').onclick = () => viewer && viewer.moveTo(V.loc.img).catch(() => {});
        if (nmpz) el.classList.add('is-nmpz');
        return;
      } catch (e) { viewer = null; }
    }
    // Satellit (auch als Ersatz, wenn es hier keine Straßenbilder gibt)
    if (V.imagery === 'street') { const n = $('#geo-note'); n.hidden = false; n.textContent = V.mly ? 'Hier gibt es keine Straßenbilder – Satellit.' : 'Satellitenbild (kein Mapillary-Token)'; setTimeout(() => { n.hidden = true; }, 5000); }
    const z = 17, free = V.move === 'move', fixed = V.move === 'nmpz';
    const pad = free ? 0.03 : 0.004;
    const sat = Lf.map(el, { zoomControl: false, attributionControl: true, dragging: free, scrollWheelZoom: fixed ? false : free ? true : 'center', doubleClickZoom: fixed ? false : free ? true : 'center', touchZoom: fixed ? false : free ? true : 'center', boxZoom: false, keyboard: free,
      minZoom: fixed ? z : 14, maxZoom: fixed ? z : 19, maxBounds: [[V.loc.lat - pad, V.loc.lng - pad * 1.6], [V.loc.lat + pad, V.loc.lng + pad * 1.6]], maxBoundsViscosity: 1 }).setView([V.loc.lat, V.loc.lng], z);
    Lf.tileLayer(SAT, { maxZoom: 19, maxNativeZoom: 18, attribution: SAT_ATTR }).addTo(sat);
    if (!fixed) Lf.control.zoom({ position: 'bottomleft' }).addTo(sat);
    maps.push(sat);
    if ($('#geo-home')) $('#geo-home').onclick = () => sat.setView([V.loc.lat, V.loc.lng], z);
    later(sat, () => sat.invalidateSize(), 60);
  }

  // Schwarzweiß, Unscharf (wird mit der Zeit schärfer), Taschenlampe (nur um die Maus herum sichtbar)
  function applyMods(V, el) {
    const m = V.mods || {};
    el.classList.toggle('mod-bw', !!m.bw);
    if (m.blur) { el.classList.add('mod-blur'); el.style.setProperty('--blur-ms', `${Math.max(0, 20000 - (Date.now() - V.startAt))}ms`); }
    if (m.spot) {
      el.classList.add('mod-spot');
      const stage = el.parentElement;
      stage.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); });
    }
  }
  // Zoom-Out: Satellit zoomt von ganz nah langsam raus, schneller raten = mehr Punkte
  function buildZoomOut(V, el) {
    const sat = Lf.map(el, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0.25, fadeAnimation: true });
    Lf.tileLayer(SAT, { maxZoom: 19, maxNativeZoom: 18, attribution: SAT_ATTR }).addTo(sat);
    maps.push(sat);
    const zoomAt = () => 18.5 - 9.5 * Math.min(1, (Date.now() - V.startAt) / G.ZOOM_MS);
    sat.setView([V.loc.lat, V.loc.lng], zoomAt(), { animate: false });
    const sp = $('#geo-speed');
    sp.hidden = false;
    const step = () => {
      if (!maps.includes(sat)) { clearInterval(zt); return; }
      sat.setView([V.loc.lat, V.loc.lng], zoomAt(), { animate: true, duration: 0.9 });
      const f = Math.max(0.3, 1 - 0.7 * Math.min(1, (Date.now() - V.startAt) / G.ZOOM_MS));
      sp.textContent = `Tempo ×${f.toFixed(2).replace('.', ',')}`;
    };
    const zt = setInterval(step, 1000);
    step();
    later(sat, () => sat.invalidateSize(), 60);
  }

  function buildPicker(V, me, api) {
    const set = D.SETS[V.set];
    const pm = Lf.map($('#geo-pick'), { worldCopyJump: true, attributionControl: true, minZoom: 1, zoomControl: false }).setView(set.center, set.zoom);
    if (V.show === 'name') Lf.tileLayer(BLANK, { maxZoom: 18, subdomains: 'abcd', attribution: BLANK_ATTR }).addTo(pm);
    else Lf.tileLayer(OSM, { maxZoom: 18, attribution: OSM_ATTR }).addTo(pm);
    Lf.control.zoom({ position: 'bottomleft' }).addTo(pm);
    maps.push(pm);
    const meP = V.players.find((p) => p.id === me);
    const send = $('#geo-send'), mini = $('#geo-mini');
    let marker = null, revT = null;
    const setPick = (lat, lng, cc, cn, typed) => {
      pick = { lat, lng, cc, cname: cn, typed };
      if (!typed) {
        const icon = Lf.divIcon({ className: 'geo-pin', html: `<span style="--pc:${meP.color}"></span>`, iconSize: [26, 34], iconAnchor: [13, 33] });
        if (!marker) marker = Lf.marker([lat, lng], { icon }).addTo(pm); else marker.setLatLng([lat, lng]);
      }
      if (V.guess === 'country') { send.disabled = !cc; send.textContent = cc ? `Raten: ${cn}` : 'Land wird gesucht …'; }
      else { send.disabled = false; send.textContent = 'Raten'; }
    };
    pm.on('click', (e) => {
      if (V.guesses[me]) return;
      const { lat, lng } = e.latlng;
      if (V.guess !== 'country') return setPick(lat, lng);
      setPick(lat, lng, null, null);
      clearTimeout(revT);
      revT = setTimeout(async () => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${((((lng + 180) % 360) + 360) % 360) - 180}&zoom=3&accept-language=de`, { signal: timeout(6000) });
          const j = await r.json();
          const cc = j.address && j.address.country_code;
          if (!pick || pick.lat !== lat) return;
          if (cc) { setPick(lat, lng, cc, cname(cc) || j.address.country); if ($('#geo-country')) $('#geo-country').value = D.COUNTRIES[cc] || j.address.country; }
          else send.textContent = 'Da ist kein Land (Meer?)';
        } catch (err) { send.textContent = 'Land unten eintippen'; }
      }, 300);
    });
    if ($('#geo-country')) {
      $('#geo-country').oninput = (e) => {
        const name = e.target.value.trim().toLowerCase();
        const cc = Object.keys(D.COUNTRIES).find((c) => D.COUNTRIES[c].toLowerCase() === name);
        if (cc) setPick(pick && !pick.typed ? pick.lat : 0, pick && !pick.typed ? pick.lng : 0, cc, D.COUNTRIES[cc], !(pick && !pick.typed));
      };
    }
    const doGuess = () => { if (pick && !send.disabled) { FX && FX.play('pop'); api.act({ type: 'guess', lat: pick.lat, lng: pick.lng, cc: pick.cc, cname: pick.cname, typed: pick.typed }); } };
    send.onclick = doGuess;
    // Tastatur wie im Original: Leertaste = raten, R = zurück zum Start
    document.onkeydown = (e) => {
      if (!document.body.contains(send) || /INPUT|TEXTAREA/.test((e.target || {}).tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); doGuess(); }
      if (e.key === 'r' || e.key === 'R') { const h = $('#geo-home'); if (h) h.click(); }
    };
    // Größe und Pin
    const setSize = (n) => { n = Math.max(0, Math.min(3, n)); ['s0', 's1', 's2', 's3'].forEach((c) => mini.classList.remove(c)); mini.classList.add(`s${n}`); store.set('duli-geo-size', n); later(pm, () => pm.invalidateSize(), 230); };
    mini.querySelectorAll('[data-size]').forEach((b) => { b.onclick = () => setSize(store.get('duli-geo-size', 1) + Number(b.dataset.size)); });
    $('#geo-pin').onclick = () => { const on = !mini.classList.contains('pinned'); mini.classList.toggle('pinned', on); $('#geo-pin').classList.toggle('on', on); store.set('duli-geo-pin', on); later(pm, () => pm.invalidateSize(), 230); };
    mini.addEventListener('mouseenter', () => later(pm, () => pm.invalidateSize(), 230));
    mini.addEventListener('mouseleave', () => later(pm, () => pm.invalidateSize(), 230));
    $('#geo-open').onclick = () => { mini.classList.toggle('is-open'); $('#geo-open').textContent = mini.classList.contains('is-open') ? 'Bild' : 'Karte'; later(pm, () => pm.invalidateSize(), 230); };
    later(pm, () => pm.invalidateSize(), 80);
  }

  // ----- Auflösung -----
  function renderResult(root, V, me, api) {
    const k = `r${V.gid}|${V.round}`;
    const L = V.loc, R = V.lastRes;
    document.onkeydown = null;
    if (key !== k || !root.querySelector('.geo-result')) {
      key = k; clearViews();
      root.innerHTML = `<div class="geo geo-result"><div class="geo-res-map"><div id="geo-rmap"></div><div id="geo-hud"></div></div><div class="geo-res-panel" id="geo-panel"></div></div>`;
      window.scrollTo(0, 0);
      const m = Lf.map($('#geo-rmap'), { zoomControl: false });
      Lf.control.zoom({ position: 'bottomright' }).addTo(m);
      Lf.tileLayer(OSM, { maxZoom: 18, attribution: OSM_ATTR }).addTo(m);
      maps.push(m);
      const all = [[L.lat, L.lng]];
      Lf.marker([L.lat, L.lng], { icon: Lf.divIcon({ className: 'geo-target', html: `<span>${flag(L.cc)}</span>`, iconSize: [34, 34] }) }).addTo(m);
      V.players.forEach((p) => {
        const g = V.guesses[p.id];
        if (!g || g.none || g.km == null) return;
        all.push([g.lat, g.lng]);
        Lf.polyline([[L.lat, L.lng], [g.lat, g.lng]], { color: '#0e0b13', weight: 5, opacity: 0.5 }).addTo(m);
        Lf.polyline([[L.lat, L.lng], [g.lat, g.lng]], { color: p.color, weight: 3, dashArray: '8 7' }).addTo(m);
        Lf.marker([g.lat, g.lng], { icon: Lf.divIcon({ className: 'geo-pin', html: `<span style="--pc:${p.color}"></span>`, iconSize: [26, 34], iconAnchor: [13, 33] }) }).bindTooltip(`${esc(p.name)}: ${dist(g.km)}`, { direction: 'top', offset: [0, -30] }).addTo(m);
      });
      later(m, () => { m.invalidateSize(); if (all.length > 1) m.fitBounds(all, { padding: [50, 50], maxZoom: 15 }); else m.setView(all[0], 11); }, 60);
      // Ton und Spruch für mich
      const g = V.guesses[me];
      if (g && lastRes !== k) {
        lastRes = k;
        if (V.guess === 'country') { FX && FX.play(g.ok ? 'coinUp' : 'coinDown'); VO && VO.say(g.ok ? 'country-right' : 'country-wrong', { chance: 0.7 }); }
        else { FX && FX.play(g.pts >= 3000 ? 'coinUp' : 'coinDown'); if (g.pts >= 4800) VO && VO.say('geo-perfect', { chance: 0.9 }); else if (g.pts >= 3000) VO && VO.say('geo-good', { chance: 0.5 }); else if (g.pts < 600) VO && VO.say('geo-bad', { chance: 0.7 }); }
        if (R.dmg && R.dmg[me] > 0) setTimeout(() => FX && FX.play('bigLoss'), 400);
        if (V.out[me] === V.round) setTimeout(() => VO && VO.say('geo-bad', { force: true }), 900);
      }
    }
    put($('#geo-hud'), hud(V, me));
    const mine = V.guesses[me];
    const myLine = mine ? (V.guess === 'country'
      ? `<div class="geo-big ${mine.ok ? 'ok' : 'bad'}">${mine.none ? 'Kein Tipp' : mine.ok ? 'Richtiges Land!' : `Falsch: ${esc(mine.cname)}`}</div>`
      : `<div class="geo-big">${mine.none ? 'Kein Tipp' : `Dein Tipp war <b>${dist(mine.km)}</b> entfernt`}</div><div class="geo-bar"><i style="--v:${(mine.pts / G.MAX) * 100}%"></i></div><div class="geo-ptsline"><b>${pts(mine.pts)}</b> / 5.000 Punkte${mine.speed ? ` <small>(Tempo ×${mine.speed.toFixed(2).replace('.', ',')})</small>` : ''}</div>`) : '';
    const rows = V.players.filter((p) => V.guesses[p.id]).sort((a, b) => V.guesses[b.id].pts - V.guesses[a.id].pts || (V.guesses[a.id].km || 1e9) - (V.guesses[b.id].km || 1e9)).map((p) => {
      const g = V.guesses[p.id];
      const what = g.none ? 'kein Tipp' : V.guess === 'country' ? `${esc(g.cname)} · ${g.ok ? 'richtig' : 'falsch'}` : dist(g.km);
      const extra = V.game === 'duel' ? `<em class="${R.dmg[p.id] ? 'dmg' : ''}">${R.dmg[p.id] ? `−${pts(R.dmg[p.id])} HP` : 'kein Schaden'}</em>`
        : V.game === 'br' ? `<em class="${R.lost[p.id] ? 'dmg' : ''}">${R.lost[p.id] ? '−1 Leben' : g.ok ? 'sicher' : '–'}</em>` : '';
      return `<li style="--pc:${p.color}" class="${V.ready[p.id] ? 'ready' : ''}"><strong>${esc(p.name)}${V.out[p.id] === V.round ? ' <small class="geo-ko">RAUS</small>' : ''}</strong><span>${what}</span>${extra}<b>+${pts(g.pts)}</b></li>`;
    }).join('');
    const playing = V.players.some((p) => p.id === me);
    const isLast = V.round >= V.rounds || (V.game !== 'classic' && (V.players.length > 1 ? V.alive.length <= 1 : V.alive.length === 0));
    const links = `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${L.lat},${L.lng}" target="_blank" rel="noopener">In Google Street View</a><a href="https://www.google.com/maps/@${L.lat},${L.lng},16z" target="_blank" rel="noopener">Google Maps</a>${L.img ? `<a href="https://www.mapillary.com/app/?pKey=${esc(L.img)}" target="_blank" rel="noopener">Mapillary</a>` : ''}`;
    if (put($('#geo-panel'), `<div class="geo-answer">${flag(L.cc)}<div><span class="geo-k">Das war</span><h2>${esc(L.name)}</h2><p>${esc(cname(L.cc))}${L.near && L.name !== L.near ? (V.show === 'flag' ? ` · ${esc(L.near)}` : ` · in der Nähe von ${esc(L.near)}`) : ''}</p></div></div>
      ${myLine}${R.allWrong ? '<p class="geo-allwrong">Alle falsch – niemand verliert ein Leben.</p>' : ''}
      <ul class="geo-list">${rows}</ul>
      <div class="btn-row geo-res-btns">${playing ? `<button class="btn ${V.ready[me] ? '' : 'btn-primary'}" id="geo-ready">${V.ready[me] ? 'Doch noch warten' : isLast ? 'Zum Ergebnis' : 'Nächste Runde'}</button>` : ''}${api.isHost ? '<button class="btn btn-ghost" id="geo-next">Weiter (Host)</button>' : ''}</div>
      <p class="geo-links">${links}</p>${L.creator ? `<p class="geo-credit">Foto: ${esc(L.creator)} · Mapillary, CC BY-SA 4.0</p>` : ''}
      <p class="p-sub">${V.players.filter((p) => V.ready[p.id]).length}/${V.players.length} bereit · Leertaste = weiter</p>`)) {
      if ($('#geo-ready')) $('#geo-ready').onclick = () => api.act({ type: 'ready' });
      if ($('#geo-next')) $('#geo-next').onclick = () => api.act({ type: 'next' });
    }
    document.onkeydown = (e) => { if (e.code === 'Space' && $('#geo-ready') && !V.ready[me]) { e.preventDefault(); $('#geo-ready').click(); } };
  }

  // ----- Ende -----
  function renderOver(root, V, me, api) {
    document.onkeydown = null;
    const k = `o${V.gid}`;
    const order = (V.rank || []).map((id) => V.players.find((p) => p.id === id)).filter(Boolean);
    if (lastOver !== V.gid) { lastOver = V.gid; addStats(V, me); if (V.winners.includes(me)) { FX && FX.play('win'); FX && FX.confetti(); } else VO && VO.say('geo-bad', { force: true }); }
    if (key === k && root.querySelector('.geo-over')) return;
    key = k; clearViews();
    const w = order[0];
    const val = (p) => (V.game === 'duel' ? `${pts(Math.max(0, V.hp[p.id]))} HP${V.out[p.id] ? ` · raus in Runde ${V.out[p.id]}` : ''}` : V.game === 'br' ? `${V.correct[p.id]} Länder richtig${V.out[p.id] ? ` · raus in Runde ${V.out[p.id]}` : ''}` : `${pts(V.scores[p.id])} / ${pts(V.rounds * G.MAX)}`);
    const ch = CH && Number(CH.s && CH.s.seed) === Number(V.seed) && V.game === 'classic' ? `<div class="geo-chres">Challenge von <b>${esc(CH.n)}</b>: ${pts(CH.sc)} Punkte · du: <b>${pts(V.scores[me] || 0)}</b> – ${V.scores[me] > CH.sc ? 'geschlagen!' : V.scores[me] === CH.sc ? 'gleichstand' : 'verloren'}</div>` : '';
    root.innerHTML = `<div class="geo geo-over">
      <div class="p-card geo-final"><p class="sec-label"><span class="n">${esc(GAMES[V.game])}</span>${esc(V.show === 'image' ? `${V.setName} · ${MOVE[V.move]}` : `${SHOW[V.show]} · ${V.setName}`)}</p>
        <h2>${V.players.length === 1 ? (V.game === 'br' ? `Streak: ${V.correct[me]}` : V.game === 'classic' ? `${pts(V.scores[me])} Punkte` : 'Fertig!') : V.winners.length > 1 ? 'Unentschieden!' : w && w.id === me ? 'Du gewinnst!' : `${esc(w ? w.name : '?')} gewinnt!`}</h2>${ch}
        <ol class="kno-rank">${order.map((p) => `<li style="--pc:${p.color}"><strong>${esc(p.name)}</strong><b>${val(p)}</b></li>`).join('')}</ol>
        ${Object.keys(V.wins).length && V.players.length > 1 ? `<p class="p-sub">Siege: ${V.players.map((p) => `${esc(p.name)} ${V.wins[p.id] || 0}`).join(' · ')}</p>` : ''}
        <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" id="geo-again">Nochmal (neue Orte)</button><button class="btn btn-ghost" id="geo-lobby">Zur Lobby</button>' : ''}${V.game === 'classic' && V.players.some((p) => p.id === me) ? '<button class="btn btn-ghost" id="geo-ch">Challenge-Link kopieren</button>' : ''}</div>
        ${api.isHost ? '' : '<p class="p-wait">Der Host entscheidet, wie es weitergeht.</p>'}
        ${statsHTML()}</div>
      <div class="geo-sum"><div id="geo-smap" class="geo-smap"></div></div>
      <div class="p-card geo-hist"><table><thead><tr><th>Runde</th>${V.players.map((p) => `<th style="color:${p.color}">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
      ${V.history.map((h) => `<tr><td>${flag(h.loc.cc)}<span>${h.round}. ${esc(h.loc.name)}</span><small>${esc(cname(h.loc.cc))}</small></td>${V.players.map((p) => { const g = h.guesses[p.id]; if (!g) return '<td class="geo-na">–</td>'; return `<td>${pts(g.pts)}<small>${g.none ? 'kein Tipp' : V.guess === 'country' ? `${esc(g.cname || '')}${g.ok ? ' ✓' : ''}` : dist(g.km)}${h.dmg && h.dmg[p.id] ? ` · −${pts(h.dmg[p.id])} HP` : ''}</small></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div></div>`;
    // Übersichtskarte aller Runden
    const m = Lf.map($('#geo-smap'));
    Lf.tileLayer(OSM, { maxZoom: 18, attribution: OSM_ATTR }).addTo(m);
    maps.push(m);
    const all = [];
    V.history.forEach((h) => {
      all.push([h.loc.lat, h.loc.lng]);
      Lf.marker([h.loc.lat, h.loc.lng], { icon: Lf.divIcon({ className: 'geo-num', html: `<span>${h.round}</span>`, iconSize: [24, 24] }) }).bindTooltip(esc(h.loc.name)).addTo(m);
      V.players.forEach((p) => {
        const g = h.guesses[p.id];
        if (!g || g.none || g.km == null) return;
        all.push([g.lat, g.lng]);
        Lf.polyline([[h.loc.lat, h.loc.lng], [g.lat, g.lng]], { color: p.color, weight: 2, dashArray: '5 6' }).addTo(m);
        Lf.circleMarker([g.lat, g.lng], { radius: 6, color: '#0e0b13', weight: 2, fillColor: p.color, fillOpacity: 1 }).bindTooltip(`${esc(p.name)} · Runde ${h.round}: ${dist(g.km)}`).addTo(m);
      });
    });
    later(m, () => { m.invalidateSize(); if (all.length > 1) m.fitBounds(all, { padding: [30, 30], maxZoom: 12 }); else if (all.length) m.setView(all[0], 8); }, 80);
    if ($('#geo-again')) { $('#geo-again').onclick = api.again; $('#geo-lobby').onclick = api.lobby; }
    if ($('#geo-ch')) $('#geo-ch').onclick = () => { const l = challengeLink(V, me); navigator.clipboard.writeText(l).then(() => api.toast('Challenge-Link kopiert. Wer ihn öffnet, spielt genau deine Orte.'), () => prompt('Challenge-Link:', l)); };
  }

  // ---------- Lobby ----------
  const sel = (k, st, host, opts, num) => `<select data-set="${k}" ${num ? 'data-num="1"' : ''} ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${String(st[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  function settingsHTML(st, host) {
    const game = st.game || 'classic';
    const setOpts = Object.entries(D.SETS).filter(([, s]) => (game === 'br' || (game === 'classic' && st.guess === 'country') ? s.countries : true)).map(([id, s]) => [id, `${s.name} (${s.list.length})`]);
    const setDesc = (D.SETS[st.set] || D.SETS.world).desc;
    return `
      <div class="geo-shows">${Object.entries({ image: ['Bild', 'Straße oder Satellit – wo bin ich?'], name: ['Wo liegt …?', 'Ein Ort steht da, du pinnst ihn auf einer Karte ohne Namen'], flag: ['Flaggen', 'Welches Land gehört zur Flagge?'] }).map(([id, [n, d]]) => `<button type="button" class="geo-mode ${(st.show || 'image') === id ? 'on' : ''}" data-geo-show="${id}" ${host ? '' : 'disabled'}><b>${n}</b><small>${d}</small></button>`).join('')}</div>
      <div class="geo-modes">${Object.entries({ classic: ['Klassisch', 'Feste Runden, so nah wie möglich oder nur das Land'], duel: ['Duell', '6.000 Leben, schlechterer Tipp kostet die Differenz'], br: ['Länder-Battle-Royale', 'Falsches Land kostet ein Leben. 1 Leben = Streak'] }).map(([id, [n, d]]) => `<button type="button" class="geo-mode ${game === id ? 'on' : ''}" data-geo-game="${id}" ${host ? '' : 'disabled'}><b>${n}</b><small>${d}</small></button>`).join('')}</div>
      ${game === 'classic' && st.show !== 'flag' ? `<label class="row"><span>Raten</span>${sel('guess', st, host, [['dist', 'So nah wie möglich'], ['country', 'Nur das Land']])}</label>` : ''}
      ${st.show === 'flag' ? '' : `<label class="row"><span>Karte<small>${esc(setDesc)}</small></span>${sel('set', st, host, setOpts)}</label>`}
      ${game === 'classic' ? `<label class="row"><span>Runden</span>${sel('rounds', st, host, [[3, '3'], [5, '5'], [10, '10'], [15, '15'], [20, '20']], true)}</label>` : ''}
      ${game === 'br' ? `<label class="row"><span>Leben<small>1 = Länder-Streak: so viele richtig wie möglich am Stück</small></span>${sel('lives', st, host, [[1, '1 (Streak)'], [3, '3'], [5, '5']], true)}</label>` : ''}
      ${(st.show || 'image') === 'image' ? `<label class="row"><span>Bewegung<small>Bewegen = frei · Kein Bewegen = nur umsehen · NMPZ = festes Bild · Zoom-Out = Satellit zoomt raus, schneller = mehr Punkte</small></span>${sel('move', st, host, [['move', 'Bewegen'], ['nomove', 'Kein Bewegen'], ['nmpz', 'NMPZ'], ['zoomout', 'Zoom-Out']])}</label>
      <label class="row"><span>Bilder<small>Straßenbilder wie Street View (Mapillary) oder Satellit</small></span>${sel('imagery', st, host, [['street', 'Straßenbilder'], ['sat', 'Satellit']])}</label>
      <div class="geo-mods"><span>Erschwerer</span>${[['bw', 'Schwarzweiß'], ['blur', 'Unscharf (wird schärfer)'], ['spot', 'Taschenlampe']].map(([k2, n]) => `<label><input type="checkbox" data-set="${k2}" ${st[k2] ? 'checked' : ''} ${host ? '' : 'disabled'}> ${n}</label>`).join('')}</div>` : ''}
      <label class="row"><span>Zeit pro Runde</span>${sel('time', st, host, [[0, 'unbegrenzt'], [30, '30 s'], [60, '1 min'], [120, '2 min'], [300, '5 min']], true)}</label>
      <label class="row"><span>Countdown nach erstem Tipp<small>Sobald jemand rät, bleiben den anderen noch …</small></span>${sel('countdown', st, host, [[0, game === 'duel' ? 'Standard (15 s)' : 'aus'], [10, '10 s'], [15, '15 s'], [30, '30 s']], true)}</label>`;
  }
  function lobbyNote(host) {
    const tok = mlyToken();
    const chal = CH ? `<div class="geo-chal"><b>Challenge von ${esc(CH.n)}:</b> ${pts(CH.sc)} Punkte auf ${esc((D.SETS[CH.s.set] || D.SETS.world).name)}. Gleiche Orte – schlag den Wert.</div>` : '';
    const mly = host && !CFG.MAPILLARY_TOKEN ? `<details class="geo-tokbox" ${tok ? '' : 'open'}><summary>${tok ? 'Straßenbilder aktiv (Mapillary-Token gespeichert)' : 'Für echte Straßenbilder: Mapillary-Token eintragen (kostenlos)'}</summary>
      <p class="p-sub">mapillary.com → Konto (kostenlos) → Developers → „Register application“ → den <b>Client Token</b> (fängt mit MLY| an) hier einfügen. Ohne Token wird mit Satellitenbildern gespielt.</p>
      <div class="geo-tokrow"><input id="geo-tok" placeholder="MLY|…" value="${esc(tok)}" autocomplete="off"><button type="button" class="btn btn-small" data-geo-tok>Speichern</button></div></details>` : '';
    const daily = host ? `<div class="geo-daily"><div><b>Tages-Challenge ${new Date().toLocaleDateString('de-DE')}</b><small>Heute für alle dieselben 5 Orte auf der Welt-Karte.${dailyBest() ? ` Dein Bestwert heute: ${pts(dailyBest())}` : ''}</small></div><button type="button" class="btn btn-small btn-primary" data-geo-daily>Einstellen</button></div>` : '';
    return `${chal}${daily}${mly}${statsHTML()}`;
  }

  // Tages-Challenge: Seed aus dem Datum
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const daySeed = () => { let h = 2166136261; for (const c of `dulidan-geo-${today()}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 1) || 1; };
  const dailyBest = () => (store.get('duli-geo-stats', {}).daily || {})[today()] || 0;

  // Challenge-Link: Einstellungen und Seed übernehmen
  const defaults = { show: 'image', game: 'classic', guess: 'dist', set: 'world', rounds: 5, time: 0, countdown: 0, move: 'move', imagery: 'street', lives: 3, seed: 0, bw: false, blur: false, spot: false };
  if (CH && CH.s) Object.assign(defaults, CH.s);

  const app = window.DULI_PARTY.start({
    id: 'geo', title: 'GeoGuessr', kicker: 'WO BIN ICH?', titleHTML: 'Geo<span class="outline">Guessr</span>',
    min: 1, max: 12, soloBots: 0, noBots: true, soloLabel: CH ? 'Challenge spielen' : 'Alleine spielen', soloChip: 'Alleine',
    tagline: CH ? `${CH.n} fordert dich heraus: ${pts(CH.sc)} Punkte auf genau denselben Orten. Schaffst du mehr?` : 'Du landest irgendwo auf der Welt. Schau dich um, lies Schilder, check die Straßenseite – und tipp auf der Karte, wo du bist.',
    defaults, settingsHTML, lobbyNote,
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Du stehst irgendwo – auf Straßenbildern wie bei Street View oder über dem Satellitenbild. Umsehen, herumfahren, Hinweise sammeln.</li>
      <li>Tipp auf der Karte unten rechts (Leertaste = raten). Je näher, desto mehr Punkte – bis <b>5.000</b> pro Runde.</li>
      <li><b>Duell:</b> alle haben 6.000 Leben. Wer schlechter tippt als der Beste, verliert die Differenz – ab Runde 4 mit Multiplikator.</li>
      <li><b>Länder-Battle-Royale:</b> nur das Land zählt, falsches Land kostet ein Leben. Mit einem Leben ist es eine <b>Streak</b>.</li>
      <li>Bewegen, Kein Bewegen oder <b>NMPZ</b> (no move, pan, zoom). Countdown nach dem ersten Tipp. Challenge-Links für eure Freunde.</li>
      <li>Karten: Welt, Berühmte Orte, Europa, Amerika, Asien, Afrika, Deutschland, <b>Duisburg & Ruhrpott</b>, <b>Hohenlohe</b>.</li></ul></div>`,
    engine: G, render,
  });
  // Lobby: Spielart-Kacheln und Token speichern
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-geo-game]');
    if (g && !g.disabled) { app.act({ type: 'setting', key: 'game', value: g.dataset.geoGame }); return; }
    const sh = e.target.closest('[data-geo-show]');
    if (sh && !sh.disabled) { app.act({ type: 'setting', key: 'show', value: sh.dataset.geoShow }); return; }
    if (e.target.closest('[data-geo-daily]')) {
      Object.entries({ show: 'image', game: 'classic', guess: 'dist', set: 'world', rounds: 5, move: 'move', time: 0, countdown: 0, bw: false, blur: false, spot: false, seed: daySeed() }).forEach(([key, value]) => app.act({ type: 'setting', key, value }));
      app.toast('Tages-Challenge eingestellt: Welt, 5 Runden, gleiche Orte für alle.');
      return;
    }
    if (e.target.closest('[data-geo-tok]')) {
      const v = ($('#geo-tok') || {}).value || '';
      store.set('duli-geo-mly', v.trim());
      app.toast(v.trim() ? 'Token gespeichert. Es gibt jetzt Straßenbilder.' : 'Token gelöscht. Es wird mit Satellit gespielt.');
      app.refresh();
    }
  });
})();
