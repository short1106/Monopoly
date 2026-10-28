// DULIDAN LARP EXTREME – Oberfläche: Figurenwahl, Vorbereitung (Schule, Abifächer), Intro, Monatsplanung mit Terminen,
// Prüfungs-Quiz, Fahrschule, Markt, Kalender, Leute und Chat. Der Host ruft hier April (KI) auf.
(function () {
  const L = window.DULI_LARP, DB = window.DULI_LARP_DB, MK = window.DULI_LARP_MARKET, Q = window.DULI_LARP_QUIZ, D = window.DULI_LARP_DECK;
  const AI = window.DULI_LARP_AI, FX = window.DULI_FX, esc = window.DULI_PARTY.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const eur = L.eur;
  const CHAR_STORE = 'duli-leben-chars';
  const STAT_NAMES = { health: 'Gesundheit', money: 'Geld', power: 'Macht', happy: 'Happiness' };
  const ERRORS = {
    nokey: 'Kein Anthropic-Schlüssel eingetragen. Oben auf „KI & Stimme“ und Schlüssel eintragen.',
    badkey: 'Der Anthropic-Schlüssel stimmt nicht (401).', ratelimit: 'Zu viele Anfragen oder kein Guthaben (429).',
    badrequest: 'Die Anfrage wurde abgelehnt (400). Anderes Modell wählen.', network: 'Keine Verbindung zu Claude.',
    refusal: 'April wollte diese Runde nicht erzählen.', toolong: 'Aprils Antwort war zu lang.', badjson: 'Aprils Antwort war kaputt.',
  };
  let last = null, skel = null, aiRun = null, aiErr = null, forcedFor = null, spoken = 0, lastPhaseKey = '', tick = null, app = null;
  let tab = 'month', draft = null, builder = {}, setupDraft = null;
  const mkt = { cat: 'flat', city: '', q: '' };

  // ---------- Daten laden (Hochschulen, Schulen, Straßen, Städte) ----------
  let dataReady = false;
  Promise.all(['cities', 'unis', 'schools', 'streets'].map((k) => fetch(`assets/larp/${k}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) MK.DATA[k] = j; }).catch(() => null)))
    .then(() => { dataReady = true; redraw(); });

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(CHAR_STORE)) || []; } catch (e) { return []; } },
    set(list) { try { localStorage.setItem(CHAR_STORE, JSON.stringify(list)); return true; } catch (e) { return false; } },
  };
  const encode = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const decode = (s) => JSON.parse(decodeURIComponent(escape(atob(String(s).trim()))));
  function shrinkImage(file) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'), n = 96, k = Math.min(img.width, img.height); c.width = c.height = n; c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n); res(c.toDataURL('image/jpeg', 0.7)); URL.revokeObjectURL(img.src); };
      img.onerror = () => res(null);
      img.src = URL.createObjectURL(file);
    });
  }
  async function search(q) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&accept-language=de&countrycodes=de&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (!j[0]) return null;
    const a = j[0].address || {};
    return { label: String(j[0].name || j[0].display_name.split(',')[0]), city: a.city || a.town || a.village || a.municipality || String(j[0].name), lat: Number(j[0].lat), lng: Number(j[0].lon), state: a.state || '' };
  }
  const STATE_BY_NAME = Object.fromEntries(Object.entries(DB.STATES).map(([k, v]) => [v.name, k]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const put = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; return true; } return false; };
  const para = (t) => String(t || '').split(/\n+/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');
  const dkm = (a, b) => { const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const idx = (d) => d.y * 12 + d.m;
  const toast = (m) => last && last.api.toast(m);
  function redraw() { if (app && app.refresh) app.refresh(); }
  const act = (a) => last && last.api.act(a);

  // ---------- Stimme ----------
  function voiceText(V) {
    const parts = [];
    if (V.world[0] && V.world[0].d === L.dateText(V)) parts.push(V.world[0].t);
    if (V.phase === 'over') V.players.forEach((p) => { const f = V.finals[p.id]; if (f) parts.push(`${p.name}. ${f.title ? f.title + '. ' : ''}${f.story}`); });
    else L.alive(V).forEach((p) => { if (V.stories[p.id]) parts.push(`${p.name}. ${V.stories[p.id]}`); });
    return parts.join('\n\n');
  }
  async function voiceFor(seq) {
    const V = last && last.V;
    if (!V || spoken === seq) return;
    spoken = seq;
    const buf = await AI.speak(voiceText(V));
    if (!buf) return;
    AI.play(buf);
    last.api.broadcast({ kind: 'voice', seq, audio: buf });
  }
  const say = (ev) => { if (window.DULI_VOICE) window.DULI_VOICE.say(ev); };

  // ---------- Host: April (KI) ----------
  function controller(V, api) {
    if (!api.isHost) return;
    if (V.phase === 'act' && V.deadline && Date.now() > V.deadline && forcedFor !== V.aiSeq) { forcedFor = V.aiSeq; api.act({ type: 'force' }); return; }
    if (V.phase !== 'think' || V.gm !== 'ai' || aiRun === V.aiSeq || (aiErr && aiErr.seq === V.aiSeq)) return;
    const seq = V.aiSeq;
    aiRun = seq;
    AI.runAI(V).then((r) => {
      aiRun = null;
      if (r.error) { aiErr = { seq, code: r.error, detail: r.detail || '' }; redraw(); return; }
      aiErr = null;
      api.act({ type: 'ai', seq, data: r.data });
      voiceFor(seq);
    });
  }

  // ---------- Darstellung ----------
  function render(root, V, me, api) {
    if (!V) return;
    last = { root, V, me, api };
    const mine = V.chars[me];
    const canRejoin = V.phase === 'act' && V.settings.death === 'rejoin' && (!mine || mine.dead);
    clearInterval(tick);
    if (V.phase === 'pick' || canRejoin) { killSkel(); renderPick(root, V, me, api); }
    else if (V.phase === 'setup') { killSkel(); renderSetup(root, V, me, api); }
    else if (V.phase === 'intro') { killSkel(); renderIntro(root, V, me, api); }
    else if (V.phase === 'over') { killSkel(); renderOver(root, V, me, api); }
    else renderMain(root, V, me, api);
    const pk = `${V.phase}|${V.aiSeq}`;
    if (pk !== lastPhaseKey && V.phase === 'act' && lastPhaseKey && FX) {
      const reps = V.reports[me] || [];
      FX.play(reps.some((r) => r.tone === 'bad') && !reps.some((r) => r.tone === 'good') ? 'coinDown' : 'turn');
      if (reps.some((r) => /FÜHRERSCHEIN BESTANDEN|Abitur bestanden|ZULASSUNG|Zusage/.test(r.text))) say('win');
      else if (reps.some((r) => /0 Punkte|nicht bestanden|Absage|durchgefallen/.test(r.text))) say('loss');
      if (innerWidth < 1100) { const st = root.querySelector('.lx-stage'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (V.gm !== 'ai' && api.isHost && V.round > 0) voiceFor(V.aiSeq);
    }
    lastPhaseKey = pk;
    controller(V, api);
  }
  function killSkel() { if (skel) { try { skel.map.remove(); } catch (e) { /* weg */ } skel = null; } }

  // ----- Figurenwahl -----
  function charCard(c, extra) {
    return `<div class="lb-cc" style="--pc:${esc(c.color || '#ffd83a')}">${c.img ? `<img class="lb-av" src="${esc(c.img)}" alt="">` : `<span class="lb-av lb-av-x">${esc((c.name || '?')[0])}</span>`}
      <div class="lb-cc-b"><strong>${esc(c.name)}</strong><small>${esc(c.age)} · ${esc(c.home ? c.home.label : '')}${c.st ? ` · ${esc((DB.STATES[c.st] || {}).name || '')}` : ''}</small>
      <p><b>Bonus:</b> ${esc(c.bonus || '–')}</p><p><b>Schwäche:</b> ${esc(c.weakness || '–')}</p>${c.contacts && c.contacts.length ? `<p><b>Kontakte:</b> ${c.contacts.map((k) => esc((DB.CONTACTS[k] || {}).name || k)).join(', ')}</p>` : ''}${extra || ''}</div></div>`;
  }
  function renderPick(root, V, me, api) {
    const takenBy = {};
    Object.entries(V.chars).forEach(([pid, c]) => { if (!c.dead && c.key !== 'custom') takenBy[c.key] = pid; });
    const pName = (pid) => (V.players.find((p) => p.id === pid) || {}).name || '?';
    const mine = V.chars[me];
    const rejoin = V.phase === 'act';
    if (!root.querySelector('.lb-pick')) {
      builder = {};
      root.innerHTML = `<div class="lb-pick"><div class="p-card lb-pick-head" id="pk-head"></div>
        <h3 class="lb-h">Figuren</h3><div class="lb-grid" id="pk-pre"></div>
        <h3 class="lb-h">Deine eigenen Figuren <small>gespeichert auf diesem Gerät</small></h3><div class="lb-grid" id="pk-own"></div>
        <div class="p-card lb-build"><h3>Eigene Figur bauen</h3>
          <div class="lb-form">
            <label class="field"><span>Name</span><input id="bf-name" maxlength="24"></label>
            <label class="field"><span>Alter</span><input id="bf-age" type="number" min="16" max="40" value="18"></label>
            <label class="field lb-span"><span>Wohnort (Stadt, keine Adresse)</span><div class="lb-inline"><input id="bf-home" placeholder="z. B. Öhringen"><button class="btn btn-small" id="bf-find" type="button">Suchen</button></div><small id="bf-home-res" class="p-sub"></small></label>
            <label class="field"><span>Bundesland</span><select id="bf-st">${Object.entries(DB.STATES).map(([k, v]) => `<option value="${k}" ${k === 'NW' ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
            <label class="field"><span>Schule</span><select id="bf-school"><option value="abi">macht gerade Abi</option><option value="none">fertig mit der Schule</option></select></label>
            <label class="field lb-span"><span>Wohnsituation</span><input id="bf-living" maxlength="80" placeholder="wohnt bei den Eltern"></label>
            <label class="field lb-span"><span>Bonus (Stärke)</span><input id="bf-bonus" maxlength="200" placeholder="z. B. kann jeden überreden"></label>
            <label class="field lb-span"><span>Schwäche</span><input id="bf-weak" maxlength="200" placeholder="z. B. kann kein Geld halten"></label>
            <label class="field lb-span"><span>Über die Figur (für April)</span><textarea id="bf-about" maxlength="300" rows="3"></textarea></label>
            <label class="field"><span>Bild (optional, bleibt auf dem Gerät)</span><input id="bf-img" type="file" accept="image/*"></label>
          </div>
          <div class="btn-row"><button class="btn btn-primary" id="bf-save">Figur speichern</button></div>
          <div class="lb-inline lb-import"><input id="bf-code" placeholder="Figuren-Code einfügen"><button class="btn btn-small" id="bf-imp">Importieren</button></div>
        </div></div>`;
      $('#bf-find').onclick = async () => {
        const q = $('#bf-home').value.trim();
        if (!q) return;
        $('#bf-home-res').textContent = 'Suche …';
        try {
          const r = await search(q);
          builder.home = r;
          if (r && STATE_BY_NAME[r.state]) $('#bf-st').value = STATE_BY_NAME[r.state];
          $('#bf-home-res').textContent = r ? `Gefunden: ${r.city} (${r.state || 'Deutschland'})` : 'Nichts gefunden.';
        } catch (e) { $('#bf-home-res').textContent = 'Suche geht gerade nicht.'; }
      };
      $('#bf-home').oninput = () => { builder.home = null; $('#bf-home-res').textContent = ''; };
      $('#bf-img').onchange = async (e) => { const f = e.target.files[0]; builder.img = f ? await shrinkImage(f) : null; };
      $('#bf-save').onclick = () => {
        const name = $('#bf-name').value.trim();
        if (!name) return api.toast('Gib der Figur einen Namen.');
        const typed = $('#bf-home').value.trim() || 'Duisburg';
        const home = builder.home ? { label: builder.home.city, city: builder.home.city, lat: builder.home.lat, lng: builder.home.lng } : { label: typed, city: typed, lat: 51.4344, lng: 6.7623 };
        const c = { name, age: Number($('#bf-age').value) || 18, home, st: $('#bf-st').value, school: $('#bf-school').value, living: $('#bf-living').value.trim(), bonus: $('#bf-bonus').value.trim(), weakness: $('#bf-weak').value.trim(), about: $('#bf-about').value.trim(), img: builder.img || null, active: true, color: ['#c58bff', '#ff8a1f', '#2fe08a', '#2fc8ff', '#ff3d5e'][store.get().length % 5] };
        const l = store.get(); l.push(c);
        if (!store.set(l)) { delete c.img; store.set(l); }
        builder = {};
        root.querySelectorAll('.lb-build input, .lb-build textarea').forEach((x) => { x.value = x.id === 'bf-age' ? '18' : ''; });
        api.toast(`${name} gespeichert.`);
        redraw();
      };
      $('#bf-imp').onclick = () => {
        try { const c = decode($('#bf-code').value); if (!c || !c.name) throw new Error('leer'); c.active = true; const l = store.get(); l.push(c); store.set(l); $('#bf-code').value = ''; api.toast(`${c.name} importiert.`); redraw(); } catch (e) { api.toast('Der Code ist kaputt.'); }
      };
    }
    const who = V.players.map((p) => { const c = V.chars[p.id]; return `<li style="--pc:${p.color}"><span class="p-dot"></span><strong>${esc(p.name)}</strong><small>${c ? (c.dead ? `${esc(c.name)} (tot)` : esc(c.name)) : 'wählt noch …'}</small></li>`; }).join('');
    const allPicked = V.players.every((p) => V.chars[p.id]);
    if (put($('#pk-head'), `<p class="sec-label"><span class="n">${rejoin ? 'NEUES LEBEN' : 'FIGUREN'}</span>LARP EXTREME</p>
        <h2>${rejoin ? (mine ? `${esc(mine.name)} ist tot. Such dir ein neues Leben aus.` : 'Such dir eine Figur aus und steig ein.') : 'Wer bist du in diesem Leben?'}</h2>
        ${rejoin && mine ? `<p class="lb-dead">${esc(mine.deathReason || '')}</p>` : ''}<ul class="p-players">${who}</ul>
        ${!rejoin && api.isHost ? `<div class="btn-row"><button class="btn btn-primary" id="lb-begin" ${allPicked ? '' : 'disabled'}>Weiter zur Vorbereitung</button></div>` : !rejoin ? '<p class="p-wait">Wenn alle eine Figur haben, geht es weiter.</p>' : ''}`)) {
      if ($('#lb-begin')) $('#lb-begin').onclick = () => act({ type: 'begin', ai: !!AI.keys().anthropic });
    }
    const presets = Object.values(L.PRESETS).map((c) => {
      const t = takenBy[c.key];
      return charCard(c, `<div class="btn-row">${t ? `<span class="lb-taken">${t === me ? 'deine Figur' : `${esc(pName(t))} spielt sie`}</span>` : `<button class="btn btn-small btn-primary" data-pick="${c.key}">Spielen</button>`}</div>`);
    }).join('');
    if (put($('#pk-pre'), presets)) root.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => act({ type: 'pick', char: { key: b.dataset.pick } }); });
    const list = store.get();
    const ownCard = (c) => { const i = list.indexOf(c); return charCard(c, `<div class="btn-row">${c.active !== false ? `<button class="btn btn-small btn-primary" data-own="${i}">Spielen</button>` : ''}<button class="btn btn-small btn-ghost" data-tog="${i}">${c.active !== false ? 'Deaktivieren' : 'Aktivieren'}</button><button class="btn btn-small btn-ghost" data-exp="${i}">Code</button><button class="btn btn-small btn-ghost" data-del="${i}">Löschen</button></div>`); };
    const actv = list.filter((c) => c.active !== false), off = list.filter((c) => c.active === false);
    if (put($('#pk-own'), (actv.map(ownCard).join('') || '<p class="p-sub">Noch keine eigene Figur. Bau dir unten eine.</p>') + (off.length ? `<details class="lb-off"><summary>Deaktiviert (${off.length})</summary><div class="lb-grid">${off.map(ownCard).join('')}</div></details>` : ''))) {
      const own = $('#pk-own');
      own.querySelectorAll('[data-own]').forEach((b) => { b.onclick = () => { const c = store.get()[b.dataset.own]; if (c) act({ type: 'pick', char: Object.assign({}, c, { key: 'custom', noSchool: c.school === 'none' }) }); }; });
      own.querySelectorAll('[data-tog]').forEach((b) => { b.onclick = () => { const l = store.get(); const c = l[b.dataset.tog]; c.active = c.active === false; store.set(l); redraw(); }; });
      own.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { const l = store.get(); if (!confirm(`${l[b.dataset.del].name} löschen?`)) return; l.splice(b.dataset.del, 1); store.set(l); redraw(); }; });
      own.querySelectorAll('[data-exp]').forEach((b) => { b.onclick = () => { const c = Object.assign({}, store.get()[b.dataset.exp]); delete c.img; delete c.active; const code = encode(c); navigator.clipboard.writeText(code).then(() => api.toast('Figuren-Code kopiert.'), () => prompt('Figuren-Code:', code)); }; });
    }
  }

  // ----- Vorbereitung: Schule und Abifächer -----
  function nearSchools(c) {
    const list = (MK.DATA.schools || []).filter((s) => s.st === c.st && /gym|ges|bk/.test(s.kind));
    const at = { lat: c.home.lat, lng: c.home.lng };
    return list.map((s) => Object.assign({ km: dkm(at, s) }, s)).sort((a, b) => a.km - b.km).slice(0, 40);
  }
  function previewDates(V, c, sel) {
    const R = DB.ABI[c.st] || DB.ABI.NW, y = V.abiYear;
    const written = sel.lk.concat(R === DB.ABI.NW ? [sel.gk[0]] : []), oral = R === DB.ABI.NW ? [sel.gk[1]] : sel.gk.slice();
    const rows = written.filter(Boolean).map((k) => { const d = R.written[k] || 28, m = R.writtenLate != null && d < 15 ? R.writtenLate : R.writtenMonth; return [`${d}. ${L.MONTHS[m]} ${y}`, `${DB.SUBJECTS[k].name} schriftlich${sel.lk.includes(k) ? ' (Leistungsfach)' : ''}`]; });
    oral.filter(Boolean).forEach((k, i) => rows.push([`${R.oralDay + i}. ${L.MONTHS[R.oralMonth]} ${y}`, `${DB.SUBJECTS[k].name} mündlich`]));
    rows.push([`${R.endDay}. ${L.MONTHS[R.endMonth]} ${y}`, 'Zeugnis und Abiball']);
    return rows;
  }
  function renderSetup(root, V, me, api) {
    const c = V.chars[me];
    if (!root.querySelector('.lx-setup')) {
      root.innerHTML = '<div class="lx-setup"><div class="p-card" id="su-head"></div><div class="lx-su-grid"><div class="p-card" id="su-school"></div><div class="p-card" id="su-abi"></div></div><div class="p-card" id="su-who"></div></div>';
      setupDraft = null;
    }
    if (!c) { put($('#su-head'), '<h2>Du schaust zu.</h2>'); return; }
    const school = c.edu.kind === 'school';
    if (!setupDraft || setupDraft.me !== me) setupDraft = { me, sel: school && c.abi.sel ? JSON.parse(JSON.stringify(c.abi.sel)) : { lk: [], gk: [] }, school: null };
    const R = DB.ABI[c.st] || DB.ABI.NW;
    const ready = !!V.ready[me];
    put($('#su-head'), `<p class="sec-label"><span class="n">VORBEREITUNG</span>${esc(L.dateText(V))}</p><h2>${esc(c.name)}, ${c.age}. ${esc((DB.STATES[c.st] || {}).name || '')}.</h2>
      <p class="p-sub">${school ? `Abschlussjahr. Die Abiprüfungen sind im Frühjahr ${V.abiYear}. Wähl deine Schule und deine Prüfungsfächer. ${esc(R.label)}` : 'Keine Schule mehr. Du startest direkt ins Leben.'}</p>`);
    if (school) {
      const near = nearSchools(c);
      const cur = setupDraft.school || c.edu.school;
      put($('#su-school'), `<h3>Deine Schule</h3>${near.length ? `<label class="field"><span>Schulen in der Nähe (${dataReady ? 'Schulverzeichnis' : 'lädt …'})</span><select id="su-sel"><option value="">– auswählen –</option>${near.map((s, i) => `<option value="${i}" ${cur && cur.name === s.name ? 'selected' : ''}>${esc(s.name)}${s.city ? `, ${esc(s.city)}` : ''} (${s.km.toFixed(1).replace('.', ',')} km)</option>`).join('')}</select></label>` : `<p class="p-sub">${dataReady ? 'Keine Schulliste für dein Bundesland. Trag deine Schule selbst ein.' : 'Schulliste lädt …'}</p>`}
        <label class="field"><span>…oder selbst eintragen</span><input id="su-own" maxlength="90" placeholder="z. B. Gymnasium am Stadtpark" value="${cur && !near.some((s) => s.name === cur.name) ? esc(cur.name) : ''}"></label>
        <small class="p-sub">Quellen: Schulministerium NRW (Datenlizenz Deutschland, Namensnennung 2.0), OpenStreetMap-Mitwirkende (ODbL).</small>`);
      const sel = $('#su-sel');
      if (sel) sel.onchange = () => { const s = near[Number(sel.value)]; setupDraft.school = s ? { name: s.name, city: s.city, lat: s.lat, lng: s.lng } : null; };
      const own = $('#su-own'); if (own) own.oninput = () => { setupDraft.school = own.value.trim() ? { name: own.value.trim(), city: c.home.city } : null; };
      const subs = Object.entries(DB.SUBJECTS).filter(([, s]) => !s.only || s.only === c.st);
      const chip = (k, s, list) => { const on = setupDraft.sel[list].includes(k), other = setupDraft.sel[list === 'lk' ? 'gk' : 'lk'].includes(k); return `<button type="button" class="lx-chip ${on ? 'on' : ''}" data-sub="${k}" data-list="${list}" ${other || ready ? 'disabled' : ''}>${esc(s.name)}</button>`; };
      const err = R.check(setupDraft.sel);
      const dates = !err ? previewDates(V, c, setupDraft.sel) : [];
      if (put($('#su-abi'), `<h3>Abifächer</h3>
        <p class="lx-lbl">${R.lk} ${R === DB.ABI.NW ? 'Leistungskurse' : 'Leistungsfächer (schriftlich)'} <small>${setupDraft.sel.lk.length}/${R.lk}</small></p><div class="lx-chips">${subs.map(([k, s]) => chip(k, s, 'lk')).join('')}</div>
        <p class="lx-lbl">${R === DB.ABI.NW ? '2 Grundkurse (3. Fach schriftlich, 4. Fach mündlich)' : '2 mündliche Prüfungsfächer'} <small>${setupDraft.sel.gk.length}/2</small></p><div class="lx-chips">${subs.map(([k, s]) => chip(k, s, 'gk')).join('')}</div>
        ${err ? `<p class="lx-warn">${esc(err)}</p>` : `<div class="lx-dates"><span class="lb-k">Deine Prüfungstermine ${V.abiYear}</span>${dates.map(([d, t]) => `<div><b>${esc(d)}</b><span>${esc(t)}</span></div>`).join('')}<small class="p-sub">Termine angelehnt an die üblichen Zeiträume.</small></div>`}`)) {
        $('#su-abi').querySelectorAll('[data-sub]').forEach((b) => {
          b.onclick = () => {
            const list = setupDraft.sel[b.dataset.list], k = b.dataset.sub, max = b.dataset.list === 'lk' ? R.lk : 2;
            if (list.includes(k)) list.splice(list.indexOf(k), 1); else if (list.length < max) list.push(k); else { list.shift(); list.push(k); }
            redraw();
          };
        });
      }
    } else { put($('#su-school'), `<h3>${esc(c.job)}</h3><p>${esc(c.living)}</p>`); put($('#su-abi'), '<h3>Kein Abi mehr</h3><p class="p-sub">Dein Leben startet ohne Schule. Jobs, Ausbildung und Wohnungen findest du im Markt.</p>'); }
    const who = L.alive(V).map((p) => `<li style="--pc:${p.color}" class="${V.ready[p.id] ? 'done' : ''}">${esc(V.chars[p.id].name)} <small>${V.ready[p.id] ? 'bereit' : 'wählt …'}</small></li>`).join('');
    if (put($('#su-who'), `<div class="lb-who"><span class="lb-k">Bereit?</span><ul>${who}</ul>
      <div class="btn-row">${ready ? '<button class="btn" id="su-un">Doch noch ändern</button>' : '<button class="btn btn-primary" id="su-ok">Bereit</button>'}${api.isHost ? '<button class="btn btn-ghost" id="su-force">Ohne die anderen starten</button>' : ''}</div></div>`)) {
      if ($('#su-ok')) $('#su-ok').onclick = () => act({ type: 'setup', sel: school ? setupDraft.sel : null, school: setupDraft.school });
      if ($('#su-un')) $('#su-un').onclick = () => act({ type: 'unready' });
      if ($('#su-force')) $('#su-force').onclick = () => { if (confirm('Alle, die noch nicht fertig sind, bekommen Standardfächer. Los?')) act({ type: 'forceSetup' }); };
    }
  }

  // ----- Intro (wird in LARP 7 zum Kino) -----
  function renderIntro(root, V, me, api) {
    if (window.DULI_LARP_INTRO) return window.DULI_LARP_INTRO.render(root, V, me, api);
    const cards = L.alive(V).map((p) => { const c = V.chars[p.id]; return `<div class="lx-ic" style="--pc:${esc(c.color)}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<b>${esc(c.name[0])}</b>`}<strong>${esc(c.name)}</strong><small>${esc(c.bonus.split(':')[0])}</small></div>`; }).join('');
    if (put(root, `<div class="lx-intro"><h1 class="lx-title">LARP<span>EXTREME</span></h1><p class="lx-sub">Live Action Roleplay. Ihr habt ein Leben. Genau eins.</p><div class="lx-ics">${cards}</div>
      ${api.isHost ? '<button class="btn btn-primary" id="in-go">Leben starten</button>' : '<p class="p-wait">Der Host startet gleich.</p>'}</div>`)) {
      if ($('#in-go')) $('#in-go').onclick = () => act({ type: 'intro' });
    }
  }

  // ----- Hauptbildschirm -----
  const TABS = [['month', 'Dieser Monat'], ['market', 'Markt'], ['cal', 'Kalender'], ['people', 'Leute'], ['life', 'Lebenslauf']];
  function ensureSkel(root, V, me) {
    if (skel && root.contains(skel.el)) return;
    killSkel();
    root.innerHTML = `<div class="lx-main"><aside class="lx-left" id="lx-left"></aside>
      <section class="lx-stage"><div id="lx-head"></div><nav class="lx-tabs" id="lx-tabs"></nav><div id="lx-err"></div><div id="lx-body"></div></section>
      <aside class="lx-right"><div class="lb-mapbox"><div class="lb-map" id="lx-map"></div></div><div id="lx-others"></div></aside></div>`;
    const el = root.querySelector('.lx-main');
    const map = window.L.map($('#lx-map', el), { worldCopyJump: true, zoomControl: true }).setView([50.6, 9], 6);
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende' }).addTo(map);
    const layer = window.L.layerGroup().addTo(map);
    skel = { el, map, layer, fitted: false, tab: null };
    setTimeout(() => map.invalidateSize(), 50);
    const c = V.chars[me];
    if (c && c.home) map.setView([c.home.lat, c.home.lng], 10);
  }
  function bar(k, v) { return `<div class="lb-bar lb-${k}"><span>${STAT_NAMES[k]}</span><i style="--v:${Math.max(0, Math.min(100, v))}%"></i><b>${v}</b></div>`; }
  function fx(e) {
    const p = [];
    const m = e.pm != null ? e.pm : e.money;
    if (m) p.push(`<b class="${m > 0 ? 'up' : 'down'}">${m > 0 ? '+' : ''}${eur(m)}${e.pm != null ? '/M' : ''}</b>`);
    ['health', 'happy', 'power'].forEach((k) => { if (e[k]) p.push(`<b class="${e[k] > 0 ? 'up' : 'down'}">${STAT_NAMES[k]} ${e[k] > 0 ? '+' : ''}${e[k]}${e.pm != null ? '/J' : ''}</b>`); });
    return p.join(' ') || '<b>±0</b>';
  }
  function goalLine(c) {
    const G = D && D.GOALS[c.goal];
    if (!G) return '';
    const done = G.test(c, D.netWorth(c));
    return `<p class="lb-goal ${done ? 'done' : ''}"><span>Lebensziel</span><b>${esc(G.name)}</b>${done ? '<i>erreicht</i>' : ''}</p>`;
  }
  function abiBox(V, c) {
    if (!c.abi || !c.abi.exams || !Object.keys(c.abi.exams).length) return '';
    const rows = Object.entries(c.abi.exams).map(([k, e]) => `<li><span>${esc(DB.SUBJECTS[k].name)} <small>${e.kind === 'w' ? 'schriftlich' : 'mündlich'}${e.lk ? ', LF' : ''}</small></span>${e.points != null ? `<b class="${e.points >= 5 ? 'up' : 'down'}">${e.points} P.</b>` : `<i class="lb-rel lx-prep" style="--v:${c.abi.prep[k] || 0}%" title="Vorbereitung ${c.abi.prep[k] || 0}/100"></i>`}</li>`).join('');
    const r = c.abi.result;
    return `<h4>Abitur <small>Kurse ${c.abi.blockI}/600${c.abi.absent ? ` · ${c.abi.absent} Fehltage` : ''}</small></h4><ul class="lb-list">${rows}</ul>${r ? `<p class="lx-abi ${r.passed ? 'ok' : 'bad'}">${r.passed ? `Bestanden: ${r.total} Punkte, Schnitt ${String(r.note.toFixed(1)).replace('.', ',')}` : `Stand: ${r.total} Punkte, noch nicht bestanden`}</p>` : ''}`;
  }
  function licBox(c, compact) {
    const Lc = c.license;
    if (Lc.has) return `<p class="lx-lic ok">Führerschein Klasse B${Lc.probation ? ' · Probezeit' : ''}</p>`;
    if (Lc.status === 'none') return '';
    const steps = [['Sehtest', Lc.eye], ['Erste Hilfe', Lc.firstAid], [`Theorie ${Lc.theory}/14`, Lc.theory >= 14], ['Theorieprüfung', Lc.theoryPass], [`Sonderfahrten ${Lc.special}/12`, Lc.special >= 12], [`Fahrstunden ${Lc.lessons}`, Lc.lessons >= 8], ['Praxisprüfung', Lc.has]];
    return `${compact ? `<small class="p-sub">Fahrkönnen ${Math.round(Lc.skill)}/100</small>` : `<h4>Führerschein <small>${esc(Lc.school ? Lc.school.name : '')} · Fahrkönnen ${Math.round(Lc.skill)}</small></h4>`}<div class="lx-steps">${steps.map(([t, ok]) => `<span class="${ok ? 'ok' : ''}">${esc(t)}</span>`).join('')}</div>`;
  }
  function sheet(V, pid, mine) {
    const c = V.chars[pid], p = V.players.find((x) => x.id === pid);
    if (!c) return '';
    const head = `<div class="lb-sh-head" style="--pc:${esc(c.color)}">${c.img ? `<img class="lb-av" src="${esc(c.img)}" alt="">` : `<span class="lb-av lb-av-x">${esc(c.name[0])}</span>`}
      <div><strong>${esc(c.name)}</strong>${c.title ? `<em>${esc(c.title)}</em>` : ''}<small>${esc(p ? p.name : '')} · ${c.age} Jahre${c.dead ? ' · tot' : ''}</small></div></div>`;
    const money = `<div class="lb-money ${c.stats.money < 0 ? 'neg' : ''}"><span>Konto</span><b>${eur(c.stats.money)}</b></div>`;
    const bars = bar('health', c.stats.health) + bar('happy', c.stats.happy) + bar('power', c.stats.power);
    if (!mine) {
      const r = V.recap && V.recap[pid];
      return `<div class="lb-sheet lb-other ${c.dead ? 'is-dead' : ''}" style="--pc:${esc(c.color)}">${head}${money}${bars}<p class="lb-line">${esc(c.job)} · ${esc(c.home.city || c.location || '')}${c.car ? ` · fährt ${esc(c.car.brand)} ${esc(c.car.model)}` : ''}</p>${r && Object.keys(r).length ? `<div class="lb-deltas sm">${fx(r)}</div>` : ''}</div>`;
    }
    const eff = c.effects.map((e) => `<li><span>${esc(e.name)}${e.until ? ' <small>befristet</small>' : ''}</span>${fx(e)}</li>`);
    if (c.job2) eff.unshift(`<li><span>${esc(c.job2.title)} <small>${esc(c.job2.firm)}, ${eur(c.job2.gross)} brutto</small></span><b class="up">+${eur(DB.net(c.job2.gross, c.job2.kind))}/M</b></li>`);
    const sum = c.effects.reduce((a, e) => a + (e.pm || 0), 0) + (c.job2 ? DB.net(c.job2.gross, c.job2.kind) : 0) - c.bank.loans.reduce((a, l) => a + l.annuity, 0) - (c.car ? MK.carCosts(V, c, c.car).total : 0);
    const props = c.props.map((q) => `<li><span><b>${esc(q.title || q.label)}</b><small>${esc(q.label)} · Wert ${eur(q.value)}${q.leased && q.tenant ? ` · vermietet an ${esc(q.tenant.name)}` : ''}</small></span>
      <span class="btn-row"><button class="btn btn-small btn-ghost" data-mv="${q.id}">Einziehen</button><button class="btn btn-small btn-ghost" data-ls="${q.id}">${q.leased ? 'Vermietung beenden' : 'Vermieten'}</button><button class="btn btn-small btn-ghost" data-sl="${q.id}">Verkaufen</button></span></li>`).join('');
    const loans = c.bank.loans.map((l) => `<li><span>${esc(l.why)} <small>${String(l.rate).replace('.', ',')} %</small></span><b class="down">Rest ${eur(l.rest)} · −${eur(l.annuity)}/M</b></li>`).join('');
    const car = c.car ? `<h4>Auto</h4><ul class="lb-list"><li><span><b>${esc(c.car.brand)} ${esc(c.car.model)}</b><small>${c.car.year} · ${c.car.km.toLocaleString('de-DE')} km · ${c.car.ps} PS${c.car.defectFound ? ` · ${esc(c.car.defect)}` : ''}</small></span><button class="btn btn-small btn-ghost" id="sh-sellcar">Verkaufen</button></li></ul>` : '';
    const rel = c.relations.map((r) => `<li><span>${esc(r.name)} <small>${esc(r.kind || '')}</small></span><i class="lb-rel" style="--v:${r.val}%"></i></li>`).join('');
    return `<div class="lb-sheet lb-mine ${c.dead ? 'is-dead' : ''}" style="--pc:${esc(c.color)}">${head}${money}<div class="lx-schufa"><span>SCHUFA</span><b>${c.bank.schufa}</b><small>Dispo ${eur(c.bank.dispo)}</small></div>${bars}${goalLine(c)}
      <dl class="lb-facts"><dt>Job</dt><dd>${esc(c.job)}</dd><dt>Bildung</dt><dd>${esc(c.education)}${c.edu.school ? ` · ${esc(c.edu.school.name)}` : ''}</dd><dt>Wohnen</dt><dd>${esc(c.living)}</dd><dt>Ort</dt><dd>${esc(c.location || '')} (${esc(c.st)})</dd>${c.items && c.items.length ? `<dt>Zeug</dt><dd>${esc(c.items.slice(-6).join(', '))}</dd>` : ''}</dl>
      ${abiBox(V, c)}${licBox(c)}
      <h4>Pro Monat <small>Saldo <b class="${sum >= 0 ? 'up' : 'down'}">${sum >= 0 ? '+' : ''}${eur(sum)}</b></small></h4><ul class="lb-list">${eff.join('') || '<li><span>nichts</span></li>'}${c.car ? `<li><span>Auto: Versicherung, Steuer, ${c.car.fuel === 'E' ? 'Strom' : 'Sprit'}</span><b class="down">−${eur(MK.carCosts(V, c, c.car).total)}/M</b></li>` : ''}</ul>
      ${loans ? `<h4>Kredite</h4><ul class="lb-list">${loans}</ul>` : ''}${car}
      ${props ? `<h4>Immobilien</h4><ul class="lb-list lb-props">${props}</ul>` : ''}
      ${rel ? `<h4>Beziehungen</h4><ul class="lb-list">${rel}</ul>` : ''}</div>`;
  }
  function renderMain(root, V, me, api) {
    ensureSkel(root, V, me);
    const mine = V.chars[me];
    if (put($('#lx-left'), mine ? sheet(V, me, true) : '<p class="p-sub">Du schaust zu.</p>')) {
      const left = $('#lx-left');
      left.querySelectorAll('[data-mv]').forEach((b) => { b.onclick = () => act({ type: 'mMoveIn', prop: b.dataset.mv }); });
      left.querySelectorAll('[data-ls]').forEach((b) => { b.onclick = () => act({ type: 'mLease', prop: b.dataset.ls }); });
      left.querySelectorAll('[data-sl]').forEach((b) => { b.onclick = () => { if (confirm('Wirklich verkaufen? Makler und Vorfälligkeitsentschädigung gehen ab.')) act({ type: 'mSellHome', prop: b.dataset.sl }); }; });
      if ($('#sh-sellcar')) $('#sh-sellcar').onclick = () => { if (confirm('Auto an einen Händler verkaufen?')) act({ type: 'mSellCar' }); };
    }
    put($('#lx-others'), V.players.filter((p) => p.id !== me && V.chars[p.id]).map((p) => sheet(V, p.id, false)).join(''));
    drawMap(V, me);
    const yearsDone = (idx(V.date) - V.startIdx) / 12;
    const pct = V.settings.years ? Math.min(100, Math.round((yearsDone / V.settings.years) * 100)) : 0;
    const nextAp = mine ? mine.appts.filter((a) => a.status === 'open' && !a.soft).sort((a, b) => idx(a) - idx(b) || a.d - b.d)[0] : null;
    put($('#lx-head'), `<div class="lb-date"><div><span>${esc(L.dateText(V))}</span><small>Diese Runde: ${V.stepM === 1 ? '1 Monat' : `${V.stepM} Monate`}${nextAp ? ` · nächster Termin: ${esc(L.dayText(nextAp))} (${esc(nextAp.title)})` : ''}</small></div>
      <span class="chip lb-gm">${V.gm === 'ai' ? 'April (KI)' : 'April (Karten)'}</span></div>
      ${V.settings.years ? `<div class="lb-life"><i style="--v:${pct}%"></i><small>${Math.floor(yearsDone)} von ${V.settings.years} Jahren</small></div>` : ''}
      ${V.world[0] && V.world[0].d === L.dateText(V) ? `<div class="lb-world"><span class="lb-k">Weltgeschehen</span>${para(V.world[0].t)}</div>` : ''}`);
    const badge = (t) => (t === 'month' && mine && V.phase === 'act' && !V.actions[me] ? ' <i class="lx-dot"></i>' : t === 'people' && V.offers && V.offers.some((o) => o.to === me && o.status === 'open') ? ' <i class="lx-dot"></i>' : '');
    if (put($('#lx-tabs'), TABS.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${n}${badge(k)}</button>`).join(''))) {
      $('#lx-tabs').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; redraw(); }; });
    }
    // KI-Fehler beim Host
    if (api.isHost && aiErr && V.phase === 'think' && aiErr.seq === V.aiSeq) {
      if (put($('#lx-err'), `<div class="lb-error"><b>April (KI) antwortet nicht.</b><p>${esc(ERRORS[aiErr.code] || aiErr.code)}</p>${aiErr.detail ? `<small>${esc(aiErr.detail)}</small>` : ''}
        <div class="btn-row"><button class="btn btn-small btn-primary" id="lb-retry">Nochmal</button><button class="btn btn-small" id="lb-skip">Diese Runde mit Karten</button><button class="btn btn-small btn-ghost" id="lb-togm">Ganz auf Karten umstellen</button></div></div>`)) {
        $('#lb-retry').onclick = () => { aiErr = null; $('#lx-err')._html = null; $('#lx-err').innerHTML = ''; redraw(); };
        $('#lb-skip').onclick = () => { const s = aiErr.seq; aiErr = null; act({ type: 'ai', seq: s, data: {}, failed: true }); };
        $('#lb-togm').onclick = () => { aiErr = null; act({ type: 'gm', gm: 'builtin' }); };
      }
    } else put($('#lx-err'), '');
    const body = $('#lx-body');
    if (skel.tab !== tab) { skel.tab = tab; body.innerHTML = ''; body._html = null; }
    if (tab === 'month') renderMonth(body, V, me, api);
    else if (tab === 'market') renderMarket(body, V, me, api);
    else if (tab === 'cal') renderCal(body, V, me);
    else if (tab === 'people') renderPeople(body, V, me, api);
    else renderLife(body, V, me);
  }

  // ----- Tab: Dieser Monat -----
  function ensureDraft(V, me) {
    if (!draft || draft.key !== `${V.aiSeq}|${me}`) draft = { key: `${V.aiSeq}|${me}`, choice: null, text: '', focus: [], subj: [], appts: {}, drive: { theory: 0, lessons: 0, special: 0 } };
    return draft;
  }
  function resultHTML(V, me) {
    const c = V.chars[me], ck = V.checks[me], r = V.recap && V.recap[me], did = V.lastAction && V.lastAction[me];
    const reps = V.reports[me] || [];
    const story = para(V.stories[me]);
    if (!story && !reps.length) return '';
    const roll = ck ? `<div class="lb-roll ${ck.success ? 'ok' : 'bad'}"><span class="lb-d20"><b>${ck.roll}</b></span><div><small>W20 ${ck.mod ? `${ck.mod > 0 ? '+' : '−'} ${Math.abs(ck.mod)} ${esc(ck.stat || '')}` : esc(ck.stat || '')} = <b>${ck.roll + (ck.mod || 0)}</b> gegen ${ck.dc}</small><strong>${ck.roll === 20 ? 'Glückswurf!' : ck.roll === 1 ? 'Totalausfall' : ck.success ? 'Geschafft' : 'Verkackt'}</strong></div></div>` : '';
    return `<div class="lb-result ${ck ? (ck.success ? 'ok' : 'bad') : ''}"><span class="lb-k">${V.round === 0 ? 'Dein Start' : 'Was passiert ist'}</span>
      ${did && did !== '•' && V.round > 0 ? `<p class="lb-did">Du: „${esc(did)}“</p>` : ''}${roll}${story}
      ${reps.length ? `<ul class="lx-reps">${reps.map((x) => `<li class="${esc(x.tone)}"><i></i><span>${esc(x.text)}</span></li>`).join('')}</ul>` : ''}
      ${r && Object.keys(r).length ? `<div class="lb-deltas"><small>Bilanz der Runde:</small>${fx(r)}</div>` : ''}${c && c.dead ? `<p class="lb-dead">${esc(c.deathReason || '')}</p>` : ''}</div>`;
  }
  const KIND = { real: 'Alltag', odd: 'Ungewöhnlich', absurd: 'Absurd' };
  function renderMonth(body, V, me, api) {
    if (!body.querySelector('#mo-result')) body.innerHTML = '<div id="mo-result"></div><div id="mo-think"></div><div id="mo-appts"></div><div id="mo-card"></div><div id="mo-focus"></div><div id="mo-drive"></div><div id="mo-send"></div><div id="mo-who"></div><div id="mo-more"></div>';
    const c = V.chars[me];
    put($('#mo-result'), c ? (c.dead ? `<div class="lb-result bad"><span class="lb-k">Tot</span><p>${esc(c.name)} ist gestorben. ${esc(c.deathReason || '')}</p></div>` : resultHTML(V, me)) : '');
    const k = AI.keys();
    put($('#mo-think'), V.phase === 'think' && !(api.isHost && aiErr && aiErr.seq === V.aiSeq) ? `<div class="lb-think"><svg viewBox="0 0 100 100"><use href="#april"/></svg><div><b>April ${V.aiTask === 'final' ? 'schreibt eure Lebensbilanz' : V.aiTask === 'intro' ? 'baut eure Welt' : 'wertet den Monat aus'} …</b><small>${api.isHost ? (k.anthropic ? 'Das dauert meist 10–40 Sekunden.' : '') : 'Der Host fragt April gerade.'}</small></div></div>` : '');
    const playing = V.phase === 'act' && c && !c.dead;
    const sent = playing && V.actions[me];
    const dr = ensureDraft(V, me);
    // Termine
    const appts = playing ? L.dueAppts(V, c).concat(L.overdue(V, c)) : [];
    if (put($('#mo-appts'), playing && appts.length ? `<div class="lx-appts"><span class="lb-k">Termine ${V.stepM > 1 ? `in den nächsten ${V.stepM} Monaten` : 'diesen Monat'}</span>${appts.map((a) => apptCard(V, c, a, dr, !!sent)).join('')}</div>` : '')) {
      $('#mo-appts').querySelectorAll('[data-ad]').forEach((b) => { b.onclick = () => { dr.appts[b.dataset.ap] = Object.assign(dr.appts[b.dataset.ap] || {}, { d: b.dataset.ad }); redraw(); }; });
      $('#mo-appts').querySelectorAll('[data-quiz]').forEach((b) => { b.onclick = () => startQuiz(V, c, appts.find((a) => a.id === b.dataset.quiz), dr); });
    }
    // Ereigniskarte
    const card = V.cards && V.cards[me];
    let cardHtml = '';
    if (playing && !sent) {
      if (card) {
        const opts = card.opts.map((o, i) => {
          const p = D ? D.chance(c, o) : 50, poor = o.cost && c.stats.money + c.bank.dispo < o.cost;
          const odds = o.dc ? `<span class="lb-odds"><i>${esc(D.SKILLS[o.stat] || o.stat)}</i> ${p} %</span>` : '<span class="lb-odds sure">sicher</span>';
          return `<button type="button" class="lb-opt ${dr.choice === i ? 'is-picked' : ''} ${poor ? 'is-poor' : ''}" data-choice="${i}" style="--odds:${o.dc ? p : 100}%" ${poor ? 'disabled' : ''}><b>${esc(o.t)}</b>${odds}${o.cost ? `<small>${poor ? 'zu teuer: ' : 'kostet '}${eur(o.cost)}</small>` : ''}</button>`;
        }).join('');
        cardHtml = `<div class="lb-card kind-${esc(card.kind || 'real')}"><span class="lb-k">Ereignis · ${KIND[card.kind] || 'Alltag'}</span><p class="lb-card-t">${esc(card.text)}</p><div class="lb-opts">${opts}</div>
          <details class="lb-free" ${dr.text ? 'open' : ''}><summary>Oder etwas ganz anderes machen</summary><textarea id="mo-text" rows="3" maxlength="600" placeholder="Schreib, was ${esc(c.name)} tut, sagt oder plant."></textarea></details></div>`;
      } else cardHtml = `${V.events[me] ? `<div class="lb-card"><span class="lb-k">Ereignis</span>${para(V.events[me])}</div>` : ''}<div class="lb-form-do"><label class="field"><span>Was machst du? (frei schreiben)</span></label><textarea id="mo-text" rows="3" maxlength="600" placeholder="Schreib, was ${esc(c.name)} tut, sagt oder plant."></textarea></div>`;
    }
    if (put($('#mo-card'), cardHtml)) {
      $('#mo-card').querySelectorAll('[data-choice]').forEach((b) => { b.onclick = () => { FX && FX.play('pop'); dr.choice = dr.choice === Number(b.dataset.choice) ? null : Number(b.dataset.choice); if (dr.choice != null) dr.text = ''; redraw(); }; });
      const ta = $('#mo-text');
      if (ta) { ta.value = dr.text; ta.oninput = () => { dr.text = ta.value; if (dr.text && dr.choice != null) { dr.choice = null; $('#mo-card').querySelectorAll('.is-picked').forEach((x) => x.classList.remove('is-picked')); } }; }
    }
    // Fokus des Monats
    let focusHtml = '';
    if (playing && !sent) {
      const fs = Object.entries(L.FOCUS).filter(([f]) => f !== 'hustle' || (c.flags.company || c.key === 'shaquille'));
      const subs = c.abi && c.edu.kind === 'school' ? Object.keys(c.abi.exams) : [];
      focusHtml = `<div class="lx-panel"><span class="lb-k">Fokus ${V.stepM > 1 ? `für ${V.stepM} Monate` : 'des Monats'} <small>bis zu 2</small></span><div class="lx-chips">${fs.map(([f, n]) => `<button type="button" class="lx-chip ${dr.focus.includes(f) ? 'on' : ''}" data-focus="${f}">${esc(n)}</button>`).join('')}</div>
        ${dr.focus.includes('learn') && subs.length ? `<p class="lx-lbl">Welche Fächer? <small>bis zu 3</small></p><div class="lx-chips">${subs.map((s) => `<button type="button" class="lx-chip sm ${dr.subj.includes(s) ? 'on' : ''}" data-subj="${s}">${esc(DB.SUBJECTS[s].name)} <small>${c.abi.prep[s] || 0}</small></button>`).join('')}</div>` : ''}</div>`;
    }
    if (put($('#mo-focus'), focusHtml)) {
      $('#mo-focus').querySelectorAll('[data-focus]').forEach((b) => { b.onclick = () => { const f = b.dataset.focus; if (dr.focus.includes(f)) dr.focus = dr.focus.filter((x) => x !== f); else { dr.focus.push(f); if (dr.focus.length > 2) dr.focus.shift(); } redraw(); }; });
      $('#mo-focus').querySelectorAll('[data-subj]').forEach((b) => { const s = b.dataset.subj; b.onclick = () => { if (dr.subj.includes(s)) dr.subj = dr.subj.filter((x) => x !== s); else { dr.subj.push(s); if (dr.subj.length > 3) dr.subj.shift(); } redraw(); }; });
    }
    // Fahrschule
    put($('#mo-drive'), playing ? driveHTML(V, c, dr, !!sent) : '');
    bindDrive(V, c, dr);
    // Abschicken
    const missingQuiz = appts.filter((a) => needsQuiz(V, a) && (!dr.appts[a.id] || dr.appts[a.id].d === 'go' || !dr.appts[a.id].d) && !(dr.appts[a.id] && dr.appts[a.id].quiz));
    const sendHtml = !playing ? '' : sent ? `<div class="lb-sent"><span class="lb-k">Dein Monat steht</span><p>„${esc(sent)}“</p><small class="p-sub">Warte auf die anderen. Dann rechnet das Leben ab.</small><div class="btn-row"><button class="btn btn-small btn-ghost" id="mo-undo">Ändern</button></div></div>`
      : `<div class="lx-send"><button class="btn btn-primary" id="mo-go" ${card && dr.choice == null && !dr.text.trim() ? 'disabled' : ''}>${V.stepM > 1 ? `${V.stepM} Monate leben` : 'Monat leben'}</button>${missingQuiz.length ? `<small class="lx-warn">${missingQuiz.length} Prüfung${missingQuiz.length > 1 ? 'en' : ''} noch nicht geschrieben – sonst entscheidet der Würfel.</small>` : card && dr.choice == null && !dr.text.trim() ? '<small class="p-sub">Erst beim Ereignis entscheiden.</small>' : ''}</div>`;
    if (put($('#mo-send'), sendHtml)) {
      if ($('#mo-undo')) $('#mo-undo').onclick = () => act({ type: 'undo' });
      if ($('#mo-go')) $('#mo-go').onclick = () => {
        const plan = { focus: dr.focus, subj: dr.subj, appts: dr.appts, drive: dr.drive };
        const a = dr.choice != null ? { type: 'do', choice: dr.choice, plan } : dr.text.trim() ? { type: 'do', text: dr.text.trim(), plan } : { type: 'do', plan };
        act(a);
      };
    }
    // Wer ist fertig
    const living = L.alive(V);
    const who = V.phase === 'act' && (living.length > 1 || api.isHost) ? `<div class="lb-who">${living.length > 1 ? `<span class="lb-k">Wer ist fertig?</span><ul>${living.map((p) => `<li class="${V.actions[p.id] ? 'done' : ''}" style="--pc:${p.color}">${esc(V.chars[p.id].name)} <small>${V.actions[p.id] ? 'fertig' : 'plant …'}</small></li>`).join('')}</ul>` : ''}<span id="lb-timer" class="lb-timer"></span>
      ${api.isHost ? '<div class="btn-row"><button class="btn btn-small" id="lb-force">Jetzt abrechnen</button><button class="btn btn-small btn-ghost" id="lb-end">Spiel beenden</button></div>' : ''}</div>` : '';
    if (put($('#mo-who'), who)) {
      if ($('#lb-force')) $('#lb-force').onclick = () => { if (Object.keys(V.actions).length || confirm('Noch hat niemand entschieden. Trotzdem abrechnen?')) act({ type: 'force' }); };
      if ($('#lb-end')) $('#lb-end').onclick = () => { if (confirm('Spiel jetzt beenden? Dann kommt die Lebensbilanz.')) act({ type: 'endGame' }); };
    }
    if (V.phase === 'act' && V.deadline) {
      const t = () => { const el = $('#lb-timer'); if (!el) return; const s = Math.max(0, Math.round((V.deadline - Date.now()) / 1000)); el.textContent = `Noch ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; el.classList.toggle('low', s < 20); if (s <= 0 && api.isHost) controller(last.V, api); };
      t(); tick = setInterval(t, 1000);
    }
    const otherStories = V.players.filter((p) => p.id !== me && V.chars[p.id] && (V.stories[p.id] || (V.reports[p.id] || []).length)).map((p) => `<div class="lb-os" style="--pc:${p.color}"><b>${esc(V.chars[p.id].name)}</b>${V.lastAction && V.lastAction[p.id] && V.lastAction[p.id] !== '•' && V.round > 0 ? `<small>„${esc(V.lastAction[p.id])}“</small>` : ''}${para(V.stories[p.id])}${(V.reports[p.id] || []).filter((r) => r.tone).slice(0, 4).map((r) => `<p class="lx-orep ${esc(r.tone)}">${esc(r.text)}</p>`).join('')}</div>`).join('');
    put($('#mo-more'), otherStories ? `<details open class="lx-more"><summary>Was bei den anderen los ist</summary>${otherStories}</details>` : '');
  }
  const needsQuiz = (V, a) => V.settings.exam === 'quiz' && /^(abi-w|abi-o|abi-retake|abi-extra|lic-theory)$/.test(a.kind);
  function apptCard(V, c, a, dr, locked) {
    const d = (dr.appts[a.id] && dr.appts[a.id].d) || 'go', q = dr.appts[a.id] && dr.appts[a.id].quiz;
    const late = idx(a) < idx(V.date);
    const exam = /^(abi|lic)/.test(a.kind);
    const opts = [['go', 'Hingehen'], ['sick', exam ? 'Krankmelden (Attest)' : 'Absagen'], ['skip', 'Schwänzen']];
    return `<div class="lx-ap ${late ? 'late' : ''}"><div class="lx-ap-h"><b>${esc(L.dayText(a))}</b><span>${esc(a.title)}</span>${a.fee ? `<small>Gebühr ${eur(a.fee)}</small>` : ''}</div>
      ${late ? '<p class="lx-warn">Verpasst – das wird jetzt abgerechnet.</p>' : `<div class="lx-ap-opts">${opts.map(([k, n]) => `<button type="button" class="lx-chip sm ${d === k ? 'on' : ''} ${k === 'skip' ? 'bad' : ''}" data-ap="${a.id}" data-ad="${k}" ${locked ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      ${needsQuiz(V, a) && d === 'go' ? (q ? `<p class="lx-quizres">Prüfung geschrieben: ${a.kind === 'lic-theory' ? `${q.err} Fehlerpunkte` : `${q.ok}/${q.total} richtig`}</p>` : `<button class="btn btn-small btn-primary" data-quiz="${a.id}" ${locked ? 'disabled' : ''}>Prüfung jetzt schreiben</button>`) : ''}`}</div>`;
  }
  function driveHTML(V, c, dr, locked) {
    const Lc = c.license;
    if (Lc.has) return '';
    if (c.key === 'april' && !c.flags.body) return '';
    if (Lc.status === 'none') {
      const opa = (c.contacts || []).includes('opa-fahrschule') || (c.perks || []).some((p) => p.kind === 'fahrschule');
      const fees = DB.LICENSE.fees;
      const base = (m) => Math.round(fees.base.eur * m) + fees.eye.eur + fees.firstAid.eur + fees.application.eur + fees.photo.eur + fees.app.eur;
      return `<div class="lx-panel"><span class="lb-k">Führerschein</span><p class="p-sub">Noch keiner. Anmeldung kostet Grundbetrag, Sehtest, Erste Hilfe, Antrag, Passfoto und Lern-App. Danach kommen Fahrstunden (${eur(fees.lesson.eur)}), 12 Sonderfahrten (${eur(fees.special.eur)}) und die Prüfungsgebühren.</p>
        <div class="lx-schools">${opa ? `<button class="btn btn-small btn-primary" data-enroll="opa">Opas Fahrschule (${(c.contacts || []).includes('opa-fahrschule') ? 'gratis, nur amtliche Gebühren' : 'mit Rabatt'})</button>` : ''}${DB.LICENSE.schools.map((s) => `<button class="btn btn-small" data-enroll="${s.id}">${esc(s.name)} · ${eur(base(s.mult))}</button>`).join('')}</div></div>`;
    }
    const lp = L.schoolPrice(c, 'lesson'), sp = L.schoolPrice(c, 'special');
    const cost = dr.drive.lessons * lp + dr.drive.special * sp;
    const canTheory = !Lc.theoryPass && Lc.theory >= 14 && Lc.firstAid && Lc.eye && idx(V.date) >= Lc.appliedIdx;
    const canPrac = Lc.theoryPass && Lc.special >= 12 && Lc.lessons >= 8;
    const booked = (k) => c.appts.some((a) => a.status === 'open' && a.kind === k);
    const step = (key, max, label, price) => `<div class="lx-step"><span>${label}${price != null ? ` <small>${price ? eur(price) : 'gratis'}</small>` : ''}</span><button type="button" data-dv="${key}" data-dd="-1" ${locked ? 'disabled' : ''}>−</button><b>${dr.drive[key]}</b><button type="button" data-dv="${key}" data-dd="1" data-max="${max}" ${locked ? 'disabled' : ''}>+</button></div>`;
    return `<div class="lx-panel"><span class="lb-k">Fahrschule · ${esc(Lc.school ? Lc.school.name : '')}</span>${licBox(c, true)}
      <div class="lx-steps-in">${Lc.theory < 14 ? step('theory', Math.min(8, 14 - Lc.theory), 'Theorie-Doppelstunden', null) : ''}${step('lessons', 16, 'Fahrstunden', lp)}${Lc.special < 12 ? step('special', Math.min(6, 12 - Lc.special), 'Sonderfahrten', sp) : ''}</div>
      ${cost ? `<p class="p-sub">Kosten diesen Monat: ${eur(cost)}</p>` : ''}
      <div class="btn-row">${!Lc.theoryPass ? `<button class="btn btn-small ${canTheory ? 'btn-primary' : ''}" data-book="theory" ${!canTheory || booked('lic-theory') || locked ? 'disabled' : ''}>${booked('lic-theory') ? 'Theorieprüfung gebucht' : 'Theorieprüfung buchen'}</button>` : ''}
      ${Lc.theoryPass ? `<button class="btn btn-small ${canPrac ? 'btn-primary' : ''}" data-book="practical" ${!canPrac || booked('lic-practical') || locked ? 'disabled' : ''}>${booked('lic-practical') ? 'Fahrprüfung gebucht' : 'Fahrprüfung buchen'}</button>` : ''}</div>
      ${!Lc.theoryPass && !canTheory ? `<small class="p-sub">Für die Theorieprüfung: 14 Doppelstunden, Sehtest, Erste Hilfe und der Antrag (dauert etwa 2 Monate).</small>` : ''}</div>`;
  }
  function bindDrive(V, c, dr) {
    const el = $('#mo-drive');
    if (!el) return;
    el.querySelectorAll('[data-enroll]').forEach((b) => { b.onclick = () => act({ type: 'licEnroll', school: b.dataset.enroll }); });
    el.querySelectorAll('[data-book]').forEach((b) => { b.onclick = () => act({ type: 'licBook', kind: b.dataset.book }); });
    el.querySelectorAll('[data-dv]').forEach((b) => {
      b.onclick = () => { const k = b.dataset.dv, d = Number(b.dataset.dd), max = Number(b.dataset.max || 99); dr.drive[k] = Math.max(0, Math.min(d > 0 ? max : 99, dr.drive[k] + d)); redraw(); };
    });
  }

  // ----- Prüfungs-Quiz -----
  function startQuiz(V, c, a, dr) {
    if (!a) return;
    let qs, drive = a.kind === 'lic-theory';
    if (drive) qs = shuffle(Q.DRIVE).slice(0, 10).map((q) => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1, 5)), pts: q[5] }));
    else { const bank = Q.ABI[a.data.subj] || Q.ABI.de; qs = shuffle(bank).slice(0, a.kind === 'abi-o' || a.kind === 'abi-extra' ? 4 : 6).map((q) => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1)) })); }
    let i = 0, ok = 0, err = 0, t0 = Date.now();
    const back = document.createElement('div');
    back.className = 'modal-back lx-quiz-back';
    document.body.appendChild(back);
    const draw = () => {
      if (i >= qs.length) {
        const res = drive ? { ok, total: qs.length, err } : { ok, total: qs.length };
        dr.appts[a.id] = Object.assign(dr.appts[a.id] || {}, { d: 'go', quiz: res });
        back.innerHTML = `<div class="modal lx-quiz"><h2>${esc(a.title)}</h2><p class="lx-qbig">${drive ? `${err} Fehlerpunkte` : `${ok} von ${qs.length} richtig`}</p><p class="p-sub">${drive ? (err <= 10 ? 'Das würde reichen. Das Ergebnis zählt, wenn der Monat abgerechnet wird.' : 'Mehr als 10 Fehlerpunkte. Das wird eng.') : 'Das Ergebnis fließt mit deiner Vorbereitung in die Punkte ein.'}</p><button class="btn btn-primary" id="qz-close">Fertig</button></div>`;
        $('#qz-close', back).onclick = () => { back.remove(); redraw(); };
        FX && FX.play(drive ? (err <= 10 ? 'coinUp' : 'coinDown') : ok >= qs.length / 2 ? 'coinUp' : 'coinDown');
        return;
      }
      const q = qs[i];
      back.innerHTML = `<div class="modal lx-quiz"><span class="lb-k">${esc(a.title)} · Frage ${i + 1}/${qs.length}${q.pts ? ` · ${q.pts} Fehlerpunkte` : ''}</span><h3>${esc(q.q)}</h3><div class="lb-qopts">${q.opts.map((o, j) => `<button class="btn" data-o="${j}">${esc(o)}</button>`).join('')}</div><small class="p-sub">Kein Zurück. Nicht googeln. April sieht alles.</small></div>`;
      back.querySelectorAll('[data-o]').forEach((b) => {
        b.onclick = () => {
          const right = q.opts[b.dataset.o] === q.right;
          if (right) ok++; else err += q.pts || 0;
          b.classList.add(right ? 'ok' : 'bad');
          if (!right) back.querySelectorAll('[data-o]').forEach((x) => { if (q.opts[x.dataset.o] === q.right) x.classList.add('ok'); });
          back.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; });
          FX && FX.play(right ? 'pop' : 'coinDown');
          setTimeout(() => { i++; draw(); }, 750);
        };
      });
    };
    draw();
  }

  // ----- Tab: Markt -----
  const CATS = [['flat', 'Wohnung mieten'], ['wg', 'WG-Zimmer'], ['buyflat', 'Wohnung kaufen'], ['house', 'Haus kaufen'], ['car', 'Autos'], ['uni', 'Studium'], ['training', 'Ausbildung'], ['job', 'Jobs'], ['ad', 'Kleinanzeigen']];
  function renderMarket(body, V, me, api) {
    const c = V.chars[me];
    if (!c) { put(body, '<p class="p-sub">Du schaust zu.</p>'); return; }
    if (!mkt.city) mkt.city = c.home.city || 'Duisburg';
    if (!body.querySelector('#mk-top')) {
      const names = MK.cities().slice(0, 1500).map((x) => x.name);
      body.innerHTML = `<div class="lx-mk"><div id="mk-top"></div><div class="lx-mk-bar"><div class="lb-inline"><input id="mk-city" list="mk-cities" value="${esc(mkt.city)}" placeholder="Stadt"><button class="btn btn-small" id="mk-go">Suchen</button><button class="btn btn-small btn-ghost" id="mk-home">Mein Ort</button></div><datalist id="mk-cities">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div><div id="mk-list"></div></div>`;
      $('#mk-go').onclick = () => { mkt.city = $('#mk-city').value.trim() || mkt.city; $('#mk-list')._html = null; redraw(); };
      $('#mk-city').onkeydown = (e) => { if (e.key === 'Enter') $('#mk-go').click(); };
      $('#mk-home').onclick = () => { mkt.city = c.home.city || 'Duisburg'; $('#mk-city').value = mkt.city; redraw(); };
    }
    if (put($('#mk-top'), `<div class="lx-cats">${CATS.map(([k, n]) => `<button class="${mkt.cat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>`)) {
      $('#mk-top').querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => { mkt.cat = b.dataset.cat; redraw(); }; });
    }
    const open = V.phase === 'act' && !c.dead;
    const items = MK.list(V, mkt.cat, mkt.city);
    const pr = DB.cityPrice(mkt.city, (MK.city(mkt.city) || {}).st);
    let html = `<p class="p-sub lx-mk-info">${esc(mkt.city)} · ${esc(L.dateText(V))} · Ø Kaltmiete ${String(pr.rent.toFixed(1)).replace('.', ',')} €/m², Kauf ${eur(pr.buy)}/m²${open ? '' : ' · Der Markt hat nur offen, während ihr plant.'}</p>`;
    if (!items.length) html += `<p class="p-sub">${mkt.cat === 'uni' ? 'Keine Hochschule in dieser Stadt gefunden.' : 'Nichts gefunden.'}</p>`;
    html += `<div class="lx-mk-grid">${items.map((x) => listingHTML(V, c, x, open)).join('')}</div>`;
    if (mkt.cat === 'ad') html += `<div class="lx-panel"><span class="lb-k">Selbst was verkaufen</span><div class="lb-inline"><input id="ad-name" placeholder="Was?" maxlength="60"><input id="ad-price" type="number" min="1" placeholder="Preis €" style="max-width:110px"><button class="btn btn-small" id="ad-go" ${open ? '' : 'disabled'}>Anzeige rein</button></div></div>`;
    if (put($('#mk-list'), html)) {
      const el = $('#mk-list');
      el.querySelectorAll('[data-mk]').forEach((b) => {
        b.onclick = () => {
          const t = b.dataset.mk, id = b.dataset.id;
          if (t === 'mBuyHome' && b.dataset.fin) { const down = prompt('Wie viel Eigenkapital bringst du ein? (mindestens die Kaufnebenkosten)', b.dataset.min); if (down == null) return; act({ type: t, id, finance: true, down: Number(down) }); return; }
          if (t === 'mRent' && !confirm(`Mietvertrag unterschreiben und ${b.dataset.dep} Kaution zahlen?`)) return;
          act({ type: t, id, finance: !!b.dataset.fin, haggle: !!b.dataset.haggle });
        };
      });
      if ($('#ad-go')) $('#ad-go').onclick = () => act({ type: 'mSellAd', name: $('#ad-name').value, price: Number($('#ad-price').value) });
    }
  }
  function listingHTML(V, c, x, open) {
    const dis = !open || x.taken ? 'disabled' : '';
    const tk = x.taken ? '<span class="lx-taken">weg</span>' : '';
    if (x.cat === 'flat' || x.cat === 'wg') {
      const warm = x.cold + x.nk + x.heat;
      return `<div class="lx-ls">${tk}<b>${esc(x.title)}</b><small>${esc(x.street)}${x.quarter ? ` · ${esc(x.quarter)}` : ''}, ${esc(x.city)} · Baujahr ${x.year} · Energie ${esc(x.energy)}</small>
        <div class="lx-price">${eur(x.cold)} kalt <span>+ ${eur(x.nk)} NK${x.heat ? ` + ${eur(x.heat)} Heizung` : ''} = <b>${eur(warm)}</b> warm</span></div>
        <p>${x.extras.map(esc).join(' · ')}${x.flaw ? ` <em>· ${esc(x.flaw)}</em>` : ''}${x.vibe ? ` <em>· ${esc(x.vibe)}</em>` : ''}</p><small>Kaution ${eur(x.deposit)} · ${esc(x.landlord)}${x.scam ? ' · „Bin gerade im Ausland, Schlüssel per Post“' : ''}</small>
        <div class="btn-row"><button class="btn btn-small btn-primary" data-mk="mRent" data-id="${esc(x.id)}" data-dep="${eur(x.deposit)}" ${dis}>Mieten</button></div></div>`;
    }
    if (x.cat === 'buyflat' || x.cat === 'house') {
      const grest = Math.round(x.price * DB.STATES[x.st].grest / 100), extra = grest + Math.round(x.price * 0.02) + Math.round(x.price * x.courtage / 100);
      return `<div class="lx-ls">${tk}<b>${esc(x.title)}</b><small>${esc(x.street)}${x.quarter ? ` · ${esc(x.quarter)}` : ''}, ${esc(x.city)} · Baujahr ${x.year} · Energie ${esc(x.energy)}</small>
        <div class="lx-price"><b>${eur(x.price)}</b> <span>+ ${eur(extra)} Nebenkosten (Grunderwerbsteuer ${DB.STATES[x.st].grest} %, Notar, Grundbuch${x.courtage ? ', Makler 3,57 %' : ''})</span></div>
        <p>${x.extras.map(esc).join(' · ')}${x.flaw ? ` <em>· ${esc(x.flaw)}</em>` : ''}</p><small>${x.hausgeld ? `Hausgeld ${eur(x.hausgeld)}/M · ` : ''}vermietbar für etwa ${eur(x.rentEst)} kalt · Kreditzins für dich ${String(MK.loanRate(V, c)).replace('.', ',')} %</small>
        <div class="btn-row"><button class="btn btn-small" data-mk="mBuyHome" data-id="${esc(x.id)}" ${dis}>Bar kaufen</button><button class="btn btn-small btn-primary" data-mk="mBuyHome" data-fin="1" data-min="${extra}" data-id="${esc(x.id)}" ${dis}>Finanzieren</button></div></div>`;
    }
    if (x.cat === 'car') {
      const k = MK.carCosts(V, c, x);
      return `<div class="lx-ls">${tk}<b>${esc(x.brand)} ${esc(x.model)}</b><small>${esc(x.cls)} · ${x.isNew ? 'Neuwagen' : `${x.year}, ${x.km.toLocaleString('de-DE')} km`} · ${x.ps} PS · ${({ B: 'Benzin', D: 'Diesel', E: 'Elektro', H: 'Hybrid' })[x.fuel]} · ${String(x.cons).replace('.', ',')} ${x.fuel === 'E' ? 'kWh' : 'l'}/100 km</small>
        <div class="lx-price"><b>${eur(x.price)}</b> <span>Unterhalt für dich etwa ${eur(k.total)}/Monat</span></div><p>${esc(x.seller)}${x.note ? ` · ${esc(x.note)}` : ''}${x.isNew ? '' : ` · TÜV noch ${x.tuv} Monate`}</p>
        <div class="btn-row"><button class="btn btn-small" data-mk="mCar" data-id="${esc(x.id)}" ${dis}>Kaufen</button><button class="btn btn-small btn-primary" data-mk="mCar" data-haggle="1" data-id="${esc(x.id)}" ${dis}>Handeln und kaufen</button><button class="btn btn-small btn-ghost" data-mk="mCar" data-fin="1" data-id="${esc(x.id)}" ${dis}>Finanzieren</button></div></div>`;
    }
    if (x.cat === 'uni') {
      return `<div class="lx-ls"><b>${esc(x.name)}</b><small>${esc(x.uni)} · ${esc({ uni: 'Universität', fh: 'Hochschule (FH)', privat: 'Private Hochschule', kunst: 'Kunst- und Musikhochschule' }[x.kind] || x.kind)} · ${x.sem} Semester</small>
        <div class="lx-price"><b>${x.nc ? `NC ${String(x.nc).replace('.', ',')}` : 'zulassungsfrei'}</b> <span>Semesterbeitrag ${eur(x.semFee)}${x.fee ? ` · Studiengebühr ${eur(x.fee)}/Monat` : ''}${x.medicine ? ' · zentrale Vergabe, Test hilft' : ''}</span></div>
        <small>Bewerbung bis 15. Juli, Bescheid im August, Start 1. Oktober. Einstieg danach etwa ${eur(x.salary)} im Jahr.</small>
        <div class="btn-row"><button class="btn btn-small btn-primary" data-mk="mApply" data-id="${esc(x.id)}" ${!open ? 'disabled' : ''}>Bewerben</button></div></div>`;
    }
    if (x.cat === 'training') {
      return `<div class="lx-ls">${tk}<b>${esc(x.name)}</b><small>${esc(x.firm)}, ${esc(x.city)} · ${String(x.years).replace('.', ',')} Jahre · ab ${esc(L.MONTHS[x.startM])}</small>
        <div class="lx-price"><b>${x.pay.map((p) => eur(p)).join(' / ')}</b> <span>brutto pro Lehrjahr · danach etwa ${eur(x.after)}</span></div><small>Voraussetzung: ${({ h: 'Hauptschulabschluss', r: 'mittlere Reife', a: 'Abitur' })[x.req]}</small>
        <div class="btn-row"><button class="btn btn-small btn-primary" data-mk="mApply" data-id="${esc(x.id)}" ${dis}>Bewerben</button></div></div>`;
    }
    if (x.cat === 'job') {
      return `<div class="lx-ls">${tk}<b>${esc(x.name)}</b><small>${esc(x.firm)}, ${esc(x.city)} · ${x.hours} Std./Woche · ${esc(x.area)}</small>
        <div class="lx-price"><b>${eur(x.gross)}</b> <span>brutto · etwa ${eur(DB.net(x.gross, x.kind))} netto</span></div><small>${({ '-': 'Keine Voraussetzung', r: 'Mittlere Reife', a: 'Abitur', z: 'Abgeschlossene Ausbildung', b: 'Bachelor', m: 'Master/Staatsexamen', st: 'Nur für Studierende', fs: 'Führerschein B' })[x.req] || ''}</small>
        <div class="btn-row"><button class="btn btn-small btn-primary" data-mk="mApply" data-id="${esc(x.id)}" ${dis}>Bewerben</button></div></div>`;
    }
    if (x.cat === 'ad' || x.cat === 'pad') return `<div class="lx-ls">${tk}<b>${esc(x.name)}</b><div class="lx-price"><b>${eur(x.price)}</b> <span>${esc(x.seller)}</span></div><div class="btn-row"><button class="btn btn-small" data-mk="mAd" data-id="${esc(x.id)}" ${dis || (x.owner === last.me ? 'disabled' : '')}>Kaufen</button></div></div>`;
    return '';
  }

  // ----- Tab: Kalender -----
  function renderCal(body, V, me) {
    const c = V.chars[me];
    if (!c) { put(body, ''); return; }
    const open = c.appts.filter((a) => a.status === 'open').sort((a, b) => idx(a) - idx(b) || a.d - b.d);
    const done = c.appts.filter((a) => a.status !== 'open').slice(-20).reverse();
    const months = (a) => idx(a) - idx(V.date);
    put(body, `<div class="lx-panel"><span class="lb-k">Kommende Termine</span>${open.length ? `<ul class="lx-cal">${open.map((a) => `<li class="${a.soft ? 'soft' : ''}"><b>${esc(L.dayText(a))}</b><span>${esc(a.title)}</span><small>${months(a) <= 0 ? 'diese Runde' : months(a) === 1 ? 'nächsten Monat' : `in ${months(a)} Monaten`}</small></li>`).join('')}</ul>` : '<p class="p-sub">Keine Termine.</p>'}</div>
      ${done.length ? `<div class="lx-panel"><span class="lb-k">Vorbei</span><ul class="lx-cal past">${done.map((a) => `<li><b>${esc(L.dayText(a))}</b><span>${esc(a.title)}</span><small>${({ done: 'erledigt', missed: 'geschwänzt', sick: 'krank gemeldet' })[a.status] || ''}</small></li>`).join('')}</ul></div>` : ''}`);
  }

  // ----- Tab: Leute (andere, Chat) -----
  function renderPeople(body, V, me, api) {
    if (!body.querySelector('#pe-chat')) {
      body.innerHTML = '<div id="pe-offers"></div><div class="lx-panel"><span class="lb-k">Chat in Charakter</span><div id="pe-chat" class="lx-chat"></div><div class="lb-inline"><input id="pe-in" maxlength="280" placeholder="Was sagt deine Figur?"><label class="lx-ooc"><input type="checkbox" id="pe-ooc"> außerhalb der Rolle</label><button class="btn btn-small" id="pe-send">Senden</button></div></div><div id="pe-list"></div>';
      const send = () => { const t = $('#pe-in').value.trim(); if (!t) return; act({ type: 'chat', text: t, ooc: $('#pe-ooc').checked }); $('#pe-in').value = ''; };
      $('#pe-send').onclick = send;
      $('#pe-in').onkeydown = (e) => { if (e.key === 'Enter') send(); };
    }
    if (window.DULI_LARP_SOCIAL) window.DULI_LARP_SOCIAL.render($('#pe-offers'), V, me, api);
    const ch = $('#pe-chat');
    if (put(ch, V.chat.slice(-60).map((m) => `<p class="${m.ooc ? 'ooc' : ''}" style="--pc:${esc(m.color)}"><b>${esc(m.name)}</b>${m.ooc ? ' <small>(OOC)</small>' : ''}: ${esc(m.t)} <small>${esc(m.d)}</small></p>`).join('') || '<p class="p-sub">Noch still hier.</p>')) ch.scrollTop = ch.scrollHeight;
    put($('#pe-list'), `<div class="lx-others-full">${V.players.filter((p) => V.chars[p.id]).map((p) => sheet(V, p.id, p.id === me && false)).join('')}</div>`);
  }

  // ----- Tab: Lebenslauf -----
  function renderLife(body, V, me) {
    const c = V.chars[me];
    const chron = c ? c.chronicle.slice().reverse().map((x) => `<li><small>${esc(x.d)}</small> ${esc(x.t)}</li>`).join('') : '';
    put(body, `<div class="lx-panel"><span class="lb-k">Dein Lebenslauf</span><ul class="lb-log">${chron || '<li>Noch leer.</li>'}</ul></div>
      ${V.world.length ? `<div class="lx-panel"><span class="lb-k">Weltgeschehen</span><ul class="lb-log">${V.world.map((w) => `<li><small>${esc(w.d)}</small> ${esc(w.t)}</li>`).join('')}</ul></div>` : ''}
      <div class="lx-panel"><span class="lb-k">Protokoll</span><ul class="lb-log">${V.log.slice().reverse().map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`);
  }

  // ----- Karte -----
  function drawMap(V, me) {
    const Lf = window.L, layer = skel.layer;
    const key = JSON.stringify(V.players.map((p) => { const c = V.chars[p.id]; return c ? [c.home, c.props.length, c.edu.school && c.edu.school.name, c.dead] : 0; }));
    if (skel.mapKey === key) return;
    skel.mapKey = key;
    layer.clearLayers();
    const pts = [];
    V.players.forEach((p) => {
      const c = V.chars[p.id];
      if (!c || c.dead || !c.home) return;
      pts.push([c.home.lat, c.home.lng]);
      Lf.circleMarker([c.home.lat, c.home.lng], { radius: p.id === me ? 11 : 8, color: p.id === me ? '#fff' : '#0e0b13', weight: p.id === me ? 3 : 2, fillColor: c.color, fillOpacity: 1 }).bindTooltip(`${esc(c.name)} · ${esc(c.home.label)}`, { direction: 'top' }).addTo(layer);
      if (c.edu.school && c.edu.school.lat) Lf.marker([c.edu.school.lat, c.edu.school.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">S</span>`, iconSize: [22, 22] }) }).bindTooltip(`${esc(c.name)}: ${esc(c.edu.school.name)}`).addTo(layer);
      c.props.forEach((q) => { Lf.marker([q.lat, q.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">${q.kind === 'house' ? '⌂' : '▤'}</span>`, iconSize: [22, 22] }) }).bindTooltip(`${esc(c.name)}: ${esc(q.title || q.label)}`).addTo(layer); });
    });
    if (!skel.fitted && pts.length > 1) { skel.map.fitBounds(pts, { padding: [30, 30], maxZoom: 10 }); skel.fitted = true; }
  }

  // ----- Spielende -----
  function renderOver(root, V, me, api) {
    const ranked = V.players.filter((p) => V.chars[p.id]).sort((a, b) => ((V.finals[b.id] || {}).score || 0) - ((V.finals[a.id] || {}).score || 0));
    const PART = { money: 'Vermögen', happy: 'Happiness', health: 'Gesundheit', power: 'Macht', people: 'Menschen', goal: 'Lebensziel', dead: 'Tod' };
    const cards = ranked.map((p, i) => {
      const c = V.chars[p.id], f = V.finals[p.id] || {}, G = D && D.GOALS[c.goal];
      const parts = f.parts ? Object.entries(f.parts).filter(([, v]) => v).map(([k, v]) => `<span class="${v < 0 ? 'down' : ''}">${PART[k] || k} ${v > 0 ? '+' : ''}${v}</span>`).join('') : '';
      return `<div class="p-card lb-final ${i === 0 && ranked.length > 1 ? 'is-best' : ''}" style="--pc:${esc(c.color)}"><div class="lb-rank"><b>${i + 1}.</b><span>${f.score || 0} Punkte</span></div>${G ? `<p class="lb-goal ${f.goalDone ? 'done' : ''}"><span>Lebensziel</span><b>${esc(G.name)}</b><i>${f.goalDone ? 'erreicht' : 'verfehlt'}</i></p>` : ''}${parts ? `<div class="lb-parts">${parts}</div>` : ''}
        <div class="lb-sh-head">${c.img ? `<img class="lb-av" src="${esc(c.img)}" alt="">` : `<span class="lb-av lb-av-x">${esc(c.name[0])}</span>`}<div><strong>${esc(c.name)}</strong>${f.title ? `<em>${esc(f.title)}</em>` : ''}<small>${esc(p.name)} · ${c.age} Jahre${c.dead ? ' · tot' : ''}</small></div></div>
        <div class="lb-money"><span>Konto</span><b>${eur(c.stats.money)}</b></div>${bar('health', c.stats.health)}${bar('happy', c.stats.happy)}${bar('power', c.stats.power)}
        <p class="lb-line">${esc(c.education)} · ${esc(c.job)}</p>${para(f.story)}${c.chronicle.length ? `<details><summary>Lebenslauf</summary><ul class="lb-log">${c.chronicle.map((x) => `<li><small>${esc(x.d)}</small> ${esc(x.t)}</li>`).join('')}</ul></details>` : ''}</div>`;
    }).join('');
    root.innerHTML = `<div class="lb-over"><div class="p-hero"><p class="sec-label"><span class="n">ENDE</span>${esc(L.dateText(V))}</p><h1 class="p-title">Lebens<span class="outline">bilanz</span></h1>
      ${ranked.length > 1 && V.chars[ranked[0].id] ? `<p class="p-lead">Bestes Leben: <b>${esc(V.chars[ranked[0].id].name)}</b> (${esc(ranked[0].name)})</p>` : ''}</div><div class="lb-finals">${cards}</div>
      ${api.isHost ? '<div class="btn-row lb-over-btns"><button class="btn btn-primary" id="lb-again">Neues Leben</button><button class="btn" id="lb-lobby">Zur Lobby</button></div>' : '<p class="p-wait">Der Host entscheidet, wie es weitergeht.</p>'}</div>`;
    if (api.isHost) { $('#lb-again').onclick = api.again; $('#lb-lobby').onclick = api.lobby; }
  }

  // ---------- KI & Stimme ----------
  function openKeys() {
    const k = AI.keys();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal lb-keys" role="dialog" aria-label="KI und Stimme"><button class="modal-x" aria-label="Schließen">×</button><h2>KI & Stimme</h2>
      <p class="p-sub">Optional. Ohne Schlüssel leitet April mit Ereigniskarten, ihre Sprüche sind vorher aufgenommen. Schlüssel bleiben nur in diesem Browser und gehen direkt an Anthropic bzw. ElevenLabs.</p>
      <label class="field"><span>Anthropic-API-Schlüssel (April erzählt frei)</span><input id="k-ant" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(k.anthropic)}"></label>
      <label class="field"><span>Modell</span><select id="k-model">${AI.MODELS.map(([id, n]) => `<option value="${id}" ${k.model === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="field"><span>ElevenLabs-Schlüssel (Erzählung vorlesen, optional)</span><input id="k-el" type="password" autocomplete="off" placeholder="leer = ohne" value="${esc(k.eleven)}"></label>
      <label class="row lb-row"><span>Erzählung vorlesen</span><input type="checkbox" class="switch" id="k-voice" ${k.voice ? 'checked' : ''}></label>
      <div class="btn-row"><button class="btn btn-primary" id="k-save">Speichern</button>${k.anthropic || k.eleven ? '<button class="btn btn-ghost" id="k-clear">Schlüssel löschen</button>' : ''}</div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (e) => { if (e.target === back) close(); };
    $('.modal-x', back).onclick = close;
    $('#k-save', back).onclick = () => { AI.saveKeys({ anthropic: $('#k-ant', back).value.trim(), model: $('#k-model', back).value, eleven: $('#k-el', back).value.trim(), voice: $('#k-voice', back).checked }); AI.voice.paused = false; if (!$('#k-voice', back).checked) AI.stopVoice(); close(); if (aiErr && aiErr.code !== 'refusal') aiErr = null; redraw(); };
    if ($('#k-clear', back)) $('#k-clear', back).onclick = () => { AI.saveKeys({ anthropic: '', eleven: '', model: k.model, voice: k.voice }); close(); redraw(); };
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-keys]')) { e.preventDefault(); openKeys(); } });

  // ---------- Party ----------
  const sel = (key, st, host, opts) => `<select data-set="${key}" ${typeof opts[0][0] === 'number' ? 'data-num="1"' : ''} ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${String(st[key]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  app = window.DULI_PARTY.start({
    id: 'larp', title: 'LARP EXTREME', kicker: 'LIVE ACTION ROLEPLAY', titleHTML: 'LARP <span class="outline">EXTREME</span>',
    min: 1, max: 6, soloBots: 0, noBots: true, soloLabel: 'Alleine spielen', soloChip: 'Alleine',
    tagline: 'Ihr seid 18 und lebt euer Leben. Echte Abiprüfungen nach Landesregeln, Fahrschule, Wohnungen, Autos, Unis und Jobs aus ganz Deutschland. Termine kann man schwänzen. Das hat Folgen.',
    defaults: { pace: 'auto', years: 20, death: 'rejoin', exam: 'quiz', timer: 0, gm: 'auto' },
    settingsHTML: (st, host) => `
      <label class="row"><span>Spielleitung<small>Karten laufen immer. Die KI erzählt frei, braucht aber einen Schlüssel beim Host.</small></span>${sel('gm', st, host, [['auto', 'automatisch'], ['builtin', 'April mit Ereigniskarten'], ['ai', 'April als KI (Claude)']])}</label>
      <label class="row"><span>Tempo<small>Die Zeit hält immer an Terminen an</small></span>${sel('pace', st, host, [['auto', 'automatisch (Schulzeit monatlich)'], ['m', 'immer 1 Monat'], ['q', 'Quartale'], ['y', 'Jahre']])}</label>
      <label class="row"><span>Spieldauer<small>Danach kommt die Lebensbilanz</small></span>${sel('years', st, host, [[5, '5 Jahre'], [10, '10 Jahre'], [20, '20 Jahre'], [40, '40 Jahre'], [0, 'offen']])}</label>
      <label class="row"><span>Wenn jemand stirbt<small>Tod ist endgültig</small></span>${sel('death', st, host, [['rejoin', 'mit neuer Figur weiter'], ['win', 'wer übrig bleibt, gewinnt']])}</label>
      <label class="row"><span>Prüfungen<small>Abi und Führerscheintheorie</small></span>${sel('exam', st, host, [['quiz', 'echtes Quiz'], ['dice', 'nur Würfel']])}</label>
      <label class="row"><span>Zeit pro Runde<small>Danach wird automatisch abgerechnet</small></span>${sel('timer', st, host, [[0, 'ohne Timer'], [120, '2 Minuten'], [300, '5 Minuten'], [600, '10 Minuten']])}</label>`,
    lobbyNote: (host) => {
      if (!host) return '<p class="p-sub">Läuft beim Host. Du brauchst nichts.</p>';
      const k = AI.keys();
      return k.anthropic ? '<p class="p-sub lb-ok">April als KI ist bereit. Bei Problemen springen die Karten ein. <a href="#" data-open-keys>Ändern</a></p>' : '<div class="lb-warn"><b>Kein KI-Schlüssel? Kein Problem.</b> April leitet mit Ereigniskarten, Prüfungen, Markt und vorher aufgenommener Stimme. Mit Anthropic-Schlüssel erzählt sie frei. <button class="btn btn-small" data-open-keys>KI & Stimme</button></div>';
    },
    rulesHTML: `<div class="p-card"><h3>So geht LARP EXTREME</h3><ul>
      <li>Alle starten mit 18 im Abschlussjahr. Ihr wählt eure echte Schule und eure <b>Abifächer</b> nach den Regeln eures Bundeslands. Die Prüfungstermine stehen fest.</li>
      <li>Eine Runde ist meist ein <b>Monat</b>. Die Zeit hält an jedem Termin an. Zu jedem Termin: <b>hingehen, krankmelden oder schwänzen</b>. Alles hat Folgen.</li>
      <li>Prüfungen schreibt ihr als <b>Quiz</b>, eure Vorbereitung zählt mit. Danach wird nach der echten Formel der Abischnitt berechnet.</li>
      <li><b>Führerschein</b>: anmelden, Sehtest, Erste Hilfe, Theorie, Fahrstunden, 12 Sonderfahrten, Theorie- und Praxisprüfung. Kostet wie in echt.</li>
      <li>Im <b>Markt</b>: Wohnungen und WGs auf echten Straßen, Häuser mit Grunderwerbsteuer, Notar und Kredit, Autos mit Versicherung und TÜV, echte Hochschulen mit NC, Ausbildungsplätze, Jobs, Kleinanzeigen.</li>
      <li>Jede Runde gibt es ein <b>Ereignis</b> mit Würfelprobe. Am Ende zählt das beste Leben.</li></ul></div>`,
    engine: L, render,
    onCustom: (d) => { if (d && d.kind === 'voice' && d.audio) AI.play(d.audio); },
  });
})();
