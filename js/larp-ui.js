// DULIDAN LARP EXTREME – Oberfläche: Figurenwahl, Vorbereitung (Schule, Abifächer), Intro, Monatsplanung mit Terminen,
// Prüfungs-Quiz, Fahrschule, Markt, Kalender, Leute und Chat. Der Host ruft hier April (KI) auf.
(function () {
  const L = window.DULI_LARP, DB = window.DULI_LARP_DB, MK = window.DULI_LARP_MARKET, Q = window.DULI_LARP_QUIZ, D = window.DULI_LARP_DECK;
  const AC = window.DULI_LARP_ACADEMY, AI = window.DULI_LARP_AI, FX = window.DULI_FX, esc = window.DULI_PARTY.esc;
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
  Promise.all(['cities', 'unis', 'schools', 'streets'].map((k) => fetch(`assets/larp/${k}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) MK.DATA[k] = j; }).catch(() => null))
    .concat(fetch('assets/larp/world.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && window.DULI_LARP_WORLD) window.DULI_LARP_WORLD.addData(j.unis); }).catch(() => null)))
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
  const say = (ev, force) => { if (window.DULI_VOICE) window.DULI_VOICE.say(ev, { force: !!force }); };
  // Welche Zeile passt zu welchem Bericht (erste passende gewinnt)
  const VOICE_RULES = [
    [/gestorben/, 'larp-death'], [/Abi bestanden|Abitur bestanden|Gerettet\. Abi/, 'larp-abi-pass'], [/Abi nicht bestanden|Kein Abitur|nicht gereicht\. Abi/, 'larp-abi-fail'],
    [/FÜHRERSCHEIN BESTANDEN/, 'larp-license'], [/HAFTBEFEHL|Monate Haft/, 'larp-prison'], [/BEFÖRDERT/, 'larp-promo'], [/KÜNDIGUNG:/, 'larp-fired'], [/ANZEIGE wegen/, 'larp-busted'], [/ZERTIFIKAT:/, 'larp-cert'], [/Theorie nicht bestanden|: nicht bestanden \(Wurf/, 'larp-cert-fail'], [/Fahrprüfung nicht bestanden|Theorie durchgefallen/, 'larp-license-fail'],
    [/verpfeift|nimmt alles|Aufgeflogen|verraten/, 'larp-betray'], [/nie existiert|Paket kommt nie/, 'larp-scam'], [/Hochzeit/, 'larp-wedding'],
    [/ZULASSUNG/, 'larp-uni'], [/Absage/, 'larp-reject'], [/Erster Tag bei|Zusage/, 'larp-job'], [/Mietvertrag unterschrieben/, 'larp-move'],
    [/gekauft\. Laufende Kosten/, 'larp-car'], [/nicht erschienen|geschwänzt|Geschwänzt/, 'larp-skip'],
  ];
  function voiceFromReports(list) {
    const txt = (list || []).map((r) => r.text).join(' | ');
    const hit = VOICE_RULES.find(([re]) => re.test(txt));
    if (hit) { say(hit[1], true); return true; }
    return false;
  }
  let pendSeen = 0;

  // ---------- Host: April (KI) ----------
  function controller(V, api) {
    if (!api.isHost) return;
    if (V.phase === 'act' && V.deadline && Date.now() > V.deadline && forcedFor !== V.aiSeq) { forcedFor = V.aiSeq; api.act({ type: 'force' }); return; }
    if (V.phase !== 'think' || V.gm !== 'ai' || aiRun === V.aiSeq || (aiErr && aiErr.seq === V.aiSeq)) return;
    const seq = V.aiSeq;
    aiRun = seq;
    AI.runAI(V).catch((e) => ({ error: 'network', detail: String((e && e.message) || e) })).then((r) => {
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
    if (lastPhaseKey.startsWith('intro|') && V.phase !== 'intro' && window.DULI_VOICE && window.DULI_VOICE.stop) window.DULI_VOICE.stop();
    const pk = `${V.phase}|${V.aiSeq}`;
    if (pk !== lastPhaseKey && V.phase === 'act' && lastPhaseKey && FX) {
      const reps = V.reports[me] || [];
      FX.play(reps.some((r) => r.tone === 'bad') && !reps.some((r) => r.tone === 'good') ? 'coinDown' : 'turn');
      const c = V.chars[me];
      if (!voiceFromReports(reps) && c && !c.dead) {
        const due = L.dueAppts(V, c);
        if (due.some((a) => /^(abi|lic-)/.test(a.kind))) say('larp-exam', true);
        else if (due.some((a) => a.kind === 'tax')) say('larp-tax', true);
      }
      if (innerWidth < 1100) { const st = root.querySelector('.lx-stage'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (V.gm !== 'ai' && api.isHost && V.round > 0) voiceFor(V.aiSeq);
    }
    lastPhaseKey = pk;
    // Sprüche zu dem, was gerade eben passiert ist (Kauf, Angebot, Duell)
    const pend = (V.pending && V.pending[me]) || [];
    if (V.phase === 'act' && pend.length > pendSeen) voiceFromReports(pend.slice(pendSeen));
    pendSeen = V.phase === 'act' ? pend.length : 0;
    if (V.phase === 'over' && !render.endSaid) { render.endSaid = true; say('larp-end', true); }
    if (V.phase !== 'over') render.endSaid = false;
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
  const TABS = [['month', 'Dieser Monat'], ['market', 'Markt'], ['acad', 'Akademie'], ['skills', 'Skills'], ['firma', 'Firma'], ['cal', 'Kalender'], ['people', 'Leute'], ['life', 'Lebenslauf']];
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
      ${abiBox(V, c)}${licBox(c)}${certBox(c)}
      <h4>Pro Monat <small>Saldo <b class="${sum >= 0 ? 'up' : 'down'}">${sum >= 0 ? '+' : ''}${eur(sum)}</b></small></h4><ul class="lb-list">${eff.join('') || '<li><span>nichts</span></li>'}${c.car ? `<li><span>Auto: Versicherung, Steuer, ${c.car.fuel === 'E' ? 'Strom' : 'Sprit'}</span><b class="down">−${eur(MK.carCosts(V, c, c.car).total)}/M</b></li>` : ''}</ul>
      ${loans ? `<h4>Kredite</h4><ul class="lb-list">${loans}</ul>` : ''}${car}
      ${props ? `<h4>Immobilien</h4><ul class="lb-list lb-props">${props}</ul>` : ''}
      ${(c.offices || []).length ? `<h4>Firma <small>${esc(window.DULI_LARP_OFFICE ? window.DULI_LARP_OFFICE.firmName(c) : '')} · Größe ${String((c.flags.company || 0).toFixed(1)).replace('.', ',')}</small></h4><ul class="lb-list lb-props">${c.offices.map((o) => `<li><span><b>${esc(o.title)}</b><small>${esc(o.label)} · ${o.desks} ${o.desks === 1 ? "Platz" : "Plätze"} · ${o.own ? `Eigentum, Wert ${eur(o.value)}` : `Miete ${eur(o.rent)}/M`}</small></span><span class="btn-row"><button class="btn btn-small btn-ghost" data-ofend="${esc(o.id)}">${o.own ? 'Verkaufen' : 'Kündigen'}</button></span></li>`).join('')}</ul>` : ''}
      ${(c.assets || []).length ? `<h4>Besitz</h4><ul class="lb-list">${c.assets.map((a) => `<li><span>${esc(a.name)}${a.kind ? ` <small>${esc(a.kind)}</small>` : ''}</span>${a.value ? `<b>${eur(a.value)}</b>` : ''}</li>`).join('')}</ul>` : ''}
      ${rel ? `<h4>Beziehungen</h4><ul class="lb-list">${rel}</ul>` : ''}</div>`;
  }
  function renderMain(root, V, me, api) {
    ensureSkel(root, V, me);
    const mine = V.chars[me];
    notifyOffers(V, me);
    notifyDocs(V, me);
    renderPhone(V, me);
    if (put($('#lx-left'), mine ? sheet(V, me, true) : '<p class="p-sub">Du schaust zu.</p>')) {
      const left = $('#lx-left');
      left.querySelectorAll('[data-mv]').forEach((b) => { b.onclick = () => act({ type: 'mMoveIn', prop: b.dataset.mv }); });
      left.querySelectorAll('[data-ls]').forEach((b) => { b.onclick = () => act({ type: 'mLease', prop: b.dataset.ls }); });
      left.querySelectorAll('[data-sl]').forEach((b) => { b.onclick = () => { if (confirm('Wirklich verkaufen? Makler und Vorfälligkeitsentschädigung gehen ab.')) act({ type: 'mSellHome', prop: b.dataset.sl }); }; });
      left.querySelectorAll('[data-ofend]').forEach((b) => { b.onclick = () => { if (confirm('Büro wirklich aufgeben?')) act({ type: 'mOfficeEnd', office: b.dataset.ofend }); }; });
      if ($('#sh-sellcar')) $('#sh-sellcar').onclick = () => { if (confirm('Auto an einen Händler verkaufen?')) act({ type: 'mSellCar' }); };
    }
    put($('#lx-others'), V.players.filter((p) => p.id !== me && V.chars[p.id]).map((p) => sheet(V, p.id, false)).join(''));
    drawMap(V, me);
    const yearsDone = (idx(V.date) - V.startIdx) / 12;
    const pct = V.settings.years ? Math.min(100, Math.round((yearsDone / V.settings.years) * 100)) : 0;
    const nextAp = mine ? mine.appts.filter((a) => a.status === 'open' && !a.soft).sort((a, b) => idx(a) - idx(b) || a.d - b.d)[0] : null;
    const Wd = window.DULI_LARP_WORLD, fer = mine && Wd ? Wd.holidayIn(mine, V.date.m) : null, vac = mine && Wd && mine.job2 ? Wd.vacation(JSON.parse(JSON.stringify(mine)), V.date.y) : null;
    const freeTag = fer ? `<span class="lx-ferien">${esc(fer.name)} ${esc(fer.from)}–${esc(fer.to)}</span>` : vac ? `<span class="lx-ferien job">Urlaub: noch ${vac.left} Tage</span>` : '';
    put($('#lx-head'), `<div class="lb-date"><div><span>${esc(L.dateText(V))}${freeTag}</span><small>Diese Runde: ${V.stepM === 1 ? '1 Monat' : `${V.stepM} Monate`}${nextAp ? ` · nächster Termin: ${esc(L.dayText(nextAp))} (${esc(nextAp.title)})` : ''}</small></div>
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
    else if (tab === 'acad') renderAcad(body, V, me);
    else if (tab === 'skills') renderSkills(body, V, me);
    else if (tab === 'firma') renderFirm(body, V, me);
    else if (tab === 'cal') renderCal(body, V, me);
    else if (tab === 'people') renderPeople(body, V, me, api);
    else renderLife(body, V, me);
  }

  // ----- Tab: Dieser Monat -----
  function ensureDraft(V, me) {
    if (!draft || draft.key !== `${V.aiSeq}|${me}`) draft = { key: `${V.aiSeq}|${me}`, choice: null, text: '', focus: [], subj: [], appts: {}, drive: { theory: 0, lessons: 0, special: 0 }, courses: [], skills: [] };
    return draft;
  }
  function resultHTML(V, me) {
    const c = V.chars[me], ck = V.checks[me], r = V.recap && V.recap[me], did = V.lastAction && V.lastAction[me];
    const reps = V.reports[me] || [];
    const story = para(V.stories[me]);
    const live = (V.pending && V.pending[me]) || [];
    if (!story && !reps.length) return '';
    const roll = ck ? `<div class="lb-roll ${ck.success ? 'ok' : 'bad'}"><span class="lb-d20"><b>${ck.roll}</b></span><div><small>W20 ${ck.mod ? `${ck.mod > 0 ? '+' : '−'} ${Math.abs(ck.mod)} ${esc(ck.stat || '')}` : esc(ck.stat || '')} = <b>${ck.roll + (ck.mod || 0)}</b> gegen ${ck.dc}</small><strong>${ck.roll === 20 ? 'Glückswurf!' : ck.roll === 1 ? 'Totalausfall' : ck.success ? 'Geschafft' : 'Verkackt'}</strong></div></div>` : '';
    return `<div class="lb-result ${ck ? (ck.success ? 'ok' : 'bad') : ''}"><span class="lb-k">${V.round === 0 ? 'Dein Start' : 'Was passiert ist'}</span>
      ${did && did !== '•' && V.round > 0 ? `<p class="lb-did">Du: „${esc(did)}“</p>` : ''}${roll}${story}
      ${reps.length ? `<ul class="lx-reps">${reps.map((x) => `<li class="${esc(x.tone)}"><i></i><span>${esc(x.text)}</span></li>`).join('')}</ul>` : ''}
      ${r && Object.keys(r).length ? `<div class="lb-deltas"><small>Bilanz der Runde:</small>${fx(r)}</div>` : ''}${c && c.dead ? `<p class="lb-dead">${esc(c.deathReason || '')}</p>` : ''}</div>
      ${live.length ? `<div class="lx-panel lx-live"><span class="lb-k">Gerade eben</span><ul class="lx-reps">${live.map((x) => `<li class="${esc(x.tone)}"><i></i><span>${esc(x.text)}</span></li>`).join('')}</ul></div>` : ''}`;
  }
  const KIND = { real: 'Alltag', odd: 'Ungewöhnlich', absurd: 'Absurd', trip: 'Unterwegs' };
  function renderMonth(body, V, me, api) {
    if (!body.querySelector('#mo-result')) body.innerHTML = '<div id="mo-result"></div><div id="mo-think"></div><div id="mo-offers"></div><div id="mo-appts"></div><div id="mo-vote"></div><div id="mo-scene"></div><div id="mo-card"></div><div id="mo-focus"></div><div id="mo-drive"></div><div id="mo-send"></div><div id="mo-who"></div><div id="mo-more"></div>';
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
      $('#mo-appts').querySelectorAll('[data-doc]').forEach((b) => { b.onclick = () => openDoc(b.dataset.doc, c); });
      $('#mo-appts').querySelectorAll('[data-quiz]').forEach((b) => { b.onclick = () => startQuiz(V, c, appts.find((a) => a.id === b.dataset.quiz), dr); });
    }
    // Angebote, gemeinsame Szene
    const incN = playing ? V.offers.filter((o) => o.to === me && o.status === 'open').length : 0;
    if (put($('#mo-offers'), incN ? `<button class="lx-banner" id="mo-gooffers">${incN} Angebot${incN > 1 ? 'e' : ''} von anderen warten auf dich. Ansehen</button>` : '')) { if ($('#mo-gooffers')) $('#mo-gooffers').onclick = () => { tab = 'people'; redraw(); }; }
    const vt = V.vote && !V.vote.done && V.vote.candidates.includes(me) && playing ? V.vote : null;
    const voteHtml = vt ? `<div class="lb-card kind-odd"><span class="lb-k">Abstimmung · geheim</span><p class="lb-card-t">${esc(vt.text)}</p><div class="lb-opts">${vt.candidates.filter((id) => id !== me).map((id) => `<button type="button" class="lb-opt ${vt.votes[me] === id ? 'is-picked' : ''}" data-vote="${id}" style="--odds:0%"><b>${esc(V.chars[id].name)}</b><span class="lb-odds">${vt.votes[me] === id ? 'deine Stimme' : ''}</span></button>`).join('')}</div></div>` : '';
    if (put($('#mo-vote'), voteHtml)) $('#mo-vote').querySelectorAll('[data-vote]').forEach((b) => { b.onclick = () => act({ type: 'oVote', for: b.dataset.vote }); });
    if (put($('#mo-scene'), sceneHTML(V, me))) $('#mo-scene').querySelectorAll('[data-scene]').forEach((b) => { b.onclick = () => { FX && FX.play('pop'); act({ type: 'oScene', choice: Number(b.dataset.scene) }); }; });
    // Ereigniskarte
    const card = V.cards && V.cards[me];
    if (card && dr.cardId !== card.id + card.text.length) { dr.cardId = card.id + card.text.length; dr.choice = null; }
    let cardHtml = '';
    if (playing && !sent) {
      if (card) {
        const opts = card.opts.map((o, i) => {
          const p = D ? D.chance(c, o) : 50, poor = o.cost && c.stats.money + c.bank.dispo < o.cost;
          const odds = o.dc ? `<span class="lb-odds"><i>${esc(D.SKILLS[o.stat] || o.stat)}</i> ${p} %</span>` : '<span class="lb-odds sure">sicher</span>';
          return `<button type="button" class="lb-opt ${dr.choice === i ? 'is-picked' : ''} ${poor ? 'is-poor' : ''}" data-choice="${i}" style="--odds:${o.dc ? p : 100}%" ${poor ? 'disabled' : ''}><b>${esc(o.t)}</b>${odds}${o.cost ? `<small>${poor ? 'zu teuer: ' : 'kostet '}${eur(o.cost)}</small>` : ''}</button>`;
        }).join('');
        cardHtml = `<div class="lb-card kind-${esc(card.kind || 'real')}"><span class="lb-k">Ereignis · ${KIND[card.kind] || 'Alltag'}${card.t ? ` · ${esc(card.t)}` : ''}</span><p class="lb-card-t">${esc(card.text)}</p><div class="lb-opts">${opts}</div>
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
        ${dr.focus.includes('learn') && c.skills ? `<p class="lx-lbl">Welche Skills trainieren? <small>bis zu 2, auch im Tab „Skills“</small></p><div class="lx-chips">${Object.entries(c.skills).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `<button type="button" class="lx-chip sm ${dr.skills.includes(k) ? 'on' : ''}" data-skl="${esc(k)}">${esc(k)} <small>${Math.round(v)}</small></button>`).join('')}</div>` : ''}
        ${dr.focus.includes('learn') && learning(c).length ? `<p class="lx-lbl">Für welche Akademie-Prüfung? <small>bis zu 2</small></p><div class="lx-chips">${learning(c).map((K) => `<button type="button" class="lx-chip sm ${dr.courses.includes(K.id) ? 'on' : ''}" data-crs="${K.id}">${esc(K.name)} <small>${c.courses[K.id].prep}</small></button>`).join('')}</div>` : ''}
        ${dr.focus.includes('learn') && subs.length ? `<p class="lx-lbl">Welche Fächer? <small>bis zu 3</small></p><div class="lx-chips">${subs.map((s) => `<button type="button" class="lx-chip sm ${dr.subj.includes(s) ? 'on' : ''}" data-subj="${s}">${esc(DB.SUBJECTS[s].name)} <small>${c.abi.prep[s] || 0}</small></button>`).join('')}</div>` : ''}</div>`;
    }
    if (put($('#mo-focus'), focusHtml)) {
      $('#mo-focus').querySelectorAll('[data-focus]').forEach((b) => { b.onclick = () => { const f = b.dataset.focus; if (dr.focus.includes(f)) dr.focus = dr.focus.filter((x) => x !== f); else { dr.focus.push(f); if (dr.focus.length > 2) dr.focus.shift(); } redraw(); }; });
      $('#mo-focus').querySelectorAll('[data-skl]').forEach((b) => { const k = b.dataset.skl; b.onclick = () => { toggleSkill(k); redraw(); }; });
      $('#mo-focus').querySelectorAll('[data-crs]').forEach((b) => { const s = b.dataset.crs; b.onclick = () => { if (dr.courses.includes(s)) dr.courses = dr.courses.filter((x) => x !== s); else { dr.courses.push(s); if (dr.courses.length > 2) dr.courses.shift(); } redraw(); }; });
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
        const plan = { focus: dr.focus, subj: dr.subj, appts: dr.appts, drive: dr.drive, courses: dr.courses, skills: dr.skills };
        const a = dr.choice != null ? { type: 'do', choice: dr.choice, plan } : dr.text.trim() ? { type: 'do', text: dr.text.trim(), plan } : { type: 'do', plan };
        act(a);
      };
    }
    // Wer ist fertig
    const living = L.alive(V);
    const who = V.phase === 'act' && (living.length > 1 || api.isHost) ? `<div class="lb-who">${living.length > 1 ? `<span class="lb-k">Wer ist fertig?</span><ul>${living.map((p) => `<li class="${V.actions[p.id] ? 'done' : ''}" style="--pc:${p.color}">${esc(V.chars[p.id].name)} <small>${V.actions[p.id] ? 'fertig' : 'plant …'}</small></li>`).join('')}</ul>` : ''}<span id="lb-timer" class="lb-timer"></span>
      ${api.isHost ? `<label class="lx-pace"><span>Tempo ab der nächsten Runde (Zeitsprung)</span><select id="lb-pace">${[['auto', 'automatisch'], ['m', '1 Monat'], ['q', 'Quartal'], ['y', 'ganzes Jahr']].map(([k, n]) => `<option value="${k}" ${V.settings.pace === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
      ${api.isHost ? '<div class="btn-row"><button class="btn btn-small" id="lb-force">Jetzt abrechnen</button><button class="btn btn-small btn-ghost" id="lb-end">Spiel beenden</button></div>' : ''}</div>` : '';
    if (put($('#mo-who'), who)) {
      if ($('#lb-pace')) $('#lb-pace').onchange = (e) => act({ type: 'pace', pace: e.target.value });
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
  const needsQuiz = (V, a) => a.kind === 'tax' || a.kind === 'ac-theory' || (V.settings.exam === 'quiz' && /^(abi-w|abi-o|abi-retake|abi-extra|lic-theory)$/.test(a.kind));
  function apptCard(V, c, a, dr, locked) {
    const d = (dr.appts[a.id] && dr.appts[a.id].d) || 'go', q = dr.appts[a.id] && dr.appts[a.id].quiz;
    const late = idx(a) < idx(V.date);
    const exam = /^(abi|lic|ac-)/.test(a.kind);
    const opts = a.kind === 'tax' ? [['go', 'Selbst machen (STEUER-RUSH)'], ['sick', 'Steuerberaterin'], ['skip', 'Ignorieren']] : a.kind === 'court' ? [['go', 'Mit Anwältin hin (ca. 1.000 €)'], ['sick', 'Ohne Anwalt hin'], ['skip', 'Nicht erscheinen']] : a.kind === 'raise' ? [['go', 'Hingehen und verhandeln'], ['skip', 'Absagen']] : [['go', 'Hingehen'], ['sick', exam ? 'Krankmelden (Attest)' : 'Absagen'], ['skip', 'Schwänzen']];
    return `<div class="lx-ap ${late ? 'late' : ''}"><div class="lx-ap-h"><b>${esc(L.dayText(a))}</b><span>${esc(a.title)}</span>${a.fee ? `<small>Gebühr ${eur(a.fee)}</small>` : ''}</div>
      ${late ? '<p class="lx-warn">Verpasst – das wird jetzt abgerechnet.</p>' : `<div class="lx-ap-opts">${opts.map(([k, n]) => `<button type="button" class="lx-chip sm ${d === k ? 'on' : ''} ${k === 'skip' ? 'bad' : ''}" data-ap="${a.id}" data-ad="${k}" ${locked ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      ${needsQuiz(V, a) && d === 'go' ? (q ? `<p class="lx-quizres">${a.kind === 'tax' ? `STEUER-RUSH: ${q.ok}/${q.total} Belege richtig` : `Prüfung geschrieben: ${a.kind === 'lic-theory' ? `${q.err} Fehlerpunkte` : `${q.ok}/${q.total} richtig`}`}</p>` : `<button class="btn btn-small btn-primary" data-quiz="${a.id}" ${locked ? 'disabled' : ''}>${a.kind === 'tax' ? 'STEUER-RUSH starten' : 'Prüfung jetzt schreiben'}</button>`) : ''}${a.kind === 'ac-theory' ? `<button class="btn btn-small btn-ghost" data-doc="${esc(a.data.course)}">Lernzettel</button>` : ''}`}</div>`;
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
    if (a.kind === 'tax') return taxRush(V, c, a, dr);
    let qs, drive = a.kind === 'lic-theory';
    const K = a.kind === 'ac-theory' && AC ? AC.byId(a.data.course) : null;
    if (K) qs = shuffle(K.quiz).slice(0, 8).map((q) => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1)) }));
    else if (drive) qs = shuffle(Q.DRIVE).slice(0, 10).map((q) => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1, 5)), pts: q[5] }));
    else { const bank = Q.ABI[a.data.subj] || Q.ABI.de; qs = shuffle(bank).slice(0, a.kind === 'abi-o' || a.kind === 'abi-extra' ? 4 : 6).map((q) => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1)) })); }
    let i = 0, ok = 0, err = 0, t0 = Date.now();
    const back = document.createElement('div');
    back.className = 'modal-back lx-quiz-back';
    document.body.appendChild(back);
    const draw = () => {
      if (i >= qs.length) {
        const res = drive ? { ok, total: qs.length, err } : { ok, total: qs.length };
        dr.appts[a.id] = Object.assign(dr.appts[a.id] || {}, { d: 'go', quiz: res });
        back.innerHTML = `<div class="modal lx-quiz"><h2>${esc(a.title)}</h2><p class="lx-qbig">${drive ? `${err} Fehlerpunkte` : `${ok} von ${qs.length} richtig`}</p><p class="p-sub">${drive ? (err <= 10 ? 'Das würde reichen. Das Ergebnis zählt, wenn der Monat abgerechnet wird.' : 'Mehr als 10 Fehlerpunkte. Das wird eng.') : K ? (ok / qs.length >= 0.6 ? 'Bestanden, wenn der Monat abgerechnet wird. Ab 60 % reicht es.' : 'Unter 60 %. Das reicht nicht. Nochmal lernen und neu buchen.') : 'Das Ergebnis fließt mit deiner Vorbereitung in die Punkte ein.'}</p><button class="btn btn-primary" id="qz-close">Fertig</button></div>`;
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

  // ----- STEUER-RUSH (Belege abtippen wie bei Monopoly REALISTIC) -----
  function taxTasks(c, T, n) {
    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const f = (x) => `${x.toLocaleString('de-DE')} €`;
    const gross = Math.max(600, Math.round((T.gross || 7200) / 12 / 10) * 10);
    const L = [
      () => ({ head: 'Lohnsteuerbescheinigung', stamp: 'BRUTTO', q: `Bruttolohn ${f(gross)}<br>× 12 Monate`, a: gross * 12 }),
      () => { const km = ri(4, 35), d = ri(18, 23) * 10; return { head: 'Entfernungspauschale', stamp: 'PENDLER', q: `${km} km einfach × 0,38 €<br>× ${d} Arbeitstage`, a: Math.round(km * 0.38 * d) }; },
      () => { const a = ri(30, 120) * 10, b = ri(2, 9) * 10, d = ri(3, 15) * 5; return { head: 'Arbeitsmittel', stamp: 'WERBUNGSK.', q: `Laptop ${f(a)}<br>+ Fachbücher ${f(b)} + Kleidung ${f(d)}`, a: a + b + d }; },
      () => { const a = ri(25, 90) * 100, b = ri(9, 30) * 100; return { head: 'Zu versteuern', stamp: 'zvE', q: `Einkünfte ${f(a)}<br>− Werbungskosten ${f(b)}`, a: a - b }; },
      () => { const s1 = ri(2, 20) * 5, s2 = ri(2, 20) * 5; return { head: 'Spenden', stamp: 'SONDERAUSG.', q: `Tierheim ${f(s1)}<br>+ Kältehilfe ${f(s2)}`, a: s1 + s2 }; },
      () => { const r = (T.rent ? Math.round(T.rent / 12 / 10) * 10 : ri(40, 90) * 10); return { head: 'Mieteinnahmen', stamp: 'V+V', q: `Kaltmiete ${f(r)}<br>× 12 Monate`, a: r * 12 }; },
      () => { const x = ri(10, 60) * 100; return { head: 'Steuer drauf', stamp: 'ESt', q: `${f(x)} Gewinn<br>× 25 %`, a: x / 4 }; },
      () => { const kv = ri(12, 30) * 10; return { head: 'Krankenversicherung', stamp: 'VORSORGE', q: `Beitrag ${f(kv)} im Monat<br>× 12`, a: kv * 12 }; },
    ];
    const pool = T.rent ? L : L.filter((_, i) => i !== 5);
    return Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]());
  }
  function taxRush(V, c, a, dr) {
    const T = c.taxDue || { year: V.date.y - 1, gross: 0, rent: 0 };
    const n = T.pflicht ? 8 : 6, secs = 20, tasks = taxTasks(c, T, n);
    let k = 0, ok = 0, combo = 0, input = '', t0 = 0, timer = null, lock = true;
    const ov = document.createElement('div');
    ov.className = 'taxgame';
    ov.innerHTML = `<div class="tg-grid" aria-hidden="true"></div><div class="tg-box" role="dialog" aria-label="Steuer-Rush">
      <div class="tg-top"><span class="tg-logo">ELSTER<b>3000</b></span><span class="tg-lvl">STEUER-RUSH · ${T.year}</span><span class="tg-prog" id="tg-prog">${n} Belege</span><button class="tg-x" id="tg-x" aria-label="Abbrechen">×</button></div>
      <div class="tg-time"><i id="tg-bar"></i></div><div class="tg-stage" id="tg-stage"></div>
      <div class="tg-display" hidden><span id="tg-in">0</span></div>
      <div class="tg-keys" hidden>${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button data-k="${d}">${d}</button>`).join('')}<button data-k="del">⌫</button><button data-k="0">0</button><button data-k="ok" class="tg-ok">OK</button></div>
      <div class="tg-foot"><span id="tg-score">Steuerjahr ${T.year}</span><span id="tg-combo"></span></div></div>`;
    document.body.appendChild(ov);
    const q = (x) => ov.querySelector(x);
    const onKey = (e) => {
      if (e.key === 'Escape') return close();
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); press('del'); } else if (e.key === 'Enter') { e.preventDefault(); if (q('#tg-send')) q('#tg-send').click(); else press('ok'); }
    };
    const close = () => { clearInterval(timer); ov.remove(); document.removeEventListener('keydown', onKey); };
    const upd = () => { q('#tg-in').textContent = input ? Number(input).toLocaleString('de-DE') : '0'; };
    function show() {
      if (k >= n) return finish();
      const t = tasks[k];
      q('#tg-prog').textContent = `Beleg ${k + 1}/${n}`;
      q('#tg-stage').innerHTML = `<div class="tg-receipt" style="--rot:${(Math.random() * 6 - 3).toFixed(1)}deg"><div class="tg-r-head">${esc(t.head)}<span>Nr. ${1000 + Math.floor(Math.random() * 9000)}</span></div><div class="tg-r-body">${t.q}</div><div class="tg-r-eq">= ?</div><div class="tg-stamp">${esc(t.stamp)}</div></div>`;
      input = ''; upd(); t0 = Date.now(); lock = false;
      clearInterval(timer);
      timer = setInterval(() => { const left = 1 - (Date.now() - t0) / (secs * 1000); q('#tg-bar').style.width = Math.max(0, left * 100) + '%'; q('#tg-bar').classList.toggle('is-low', left < 0.3); if (left <= 0) answer(true); }, 60);
    }
    function answer(timeout) {
      if (lock) return;
      lock = true; clearInterval(timer);
      const t = tasks[k], right = !timeout && Number(input) === t.a;
      if (right) { ok++; combo++; FX && FX.play('coinUp'); } else { combo = 0; FX && FX.play('coinDown'); }
      const fb = document.createElement('div');
      fb.className = 'tg-fb ' + (right ? 'is-ok' : 'is-bad');
      fb.textContent = right ? `KORREKT${combo >= 3 ? ` · ${combo}er-Serie` : ''}` : `${timeout ? 'ZEIT UM' : 'FALSCH'} · richtig: ${t.a.toLocaleString('de-DE')} €`;
      q('#tg-stage').appendChild(fb);
      q('#tg-score').textContent = `${ok} von ${k + 1} richtig`;
      k++;
      setTimeout(show, right ? 700 : 1600);
    }
    function finish() {
      lock = true; clearInterval(timer);
      q('.tg-keys').hidden = true; q('.tg-display').hidden = true; q('.tg-time').style.visibility = 'hidden';
      const grade = ok === n ? 'A+' : ok >= n * 0.8 ? 'B' : ok >= n * 0.6 ? 'C' : ok >= n * 0.4 ? 'D' : 'F';
      q('#tg-stage').innerHTML = `<div class="tg-end"><div class="tg-grade g-${grade[0]}">${grade}</div><h3>${ok}/${n} Belege richtig</h3><p>${ok === n ? 'Fehlerfrei. Das Finanzamt ist beeindruckt.' : 'Abgeschickt wird beim Abrechnen des Monats. Fehler kosten Erstattung, bei Pflicht-Erklärungen auch Nachfragen.'}</p><button class="btn btn-primary" id="tg-send">Erklärung abschicken</button></div>`;
      q('#tg-send').onclick = () => { dr.appts[a.id] = { d: 'go', quiz: { ok, total: n } }; close(); redraw(); };
    }
    function press(key) {
      if (lock) return;
      if (key === 'del') input = input.slice(0, -1);
      else if (key === 'ok') { if (input) answer(false); return; }
      else if (input.length < 9) input = (input + key).replace(/^0+(?=\d)/, '');
      upd();
    }
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    q('#tg-x').onclick = close;
    q('#tg-stage').innerHTML = `<div class="tg-end"><div class="tg-grade">§</div><h3>Steuererklärung ${T.year}</h3><p>${n} Belege, je ${secs} Sekunden. Rechnen, eintippen, OK. ${T.pflicht ? 'Du musst abgeben (Mieten oder Selbstständigkeit). Fehler können auffallen.' : 'Freiwillig, aber jeder richtige Beleg holt Geld zurück.'}</p><button class="btn btn-primary" id="tg-go">Los</button></div>`;
    q('#tg-go').onclick = () => { q('.tg-keys').hidden = false; q('.tg-display').hidden = false; show(); };
  }

  // ----- Akademie: Lizenzen, Lernzettel von April, Prüfungen -----
  const learning = (c) => (AC && c.courses ? Object.keys(c.courses).filter((k) => c.courses[k].status === 'learning').map((k) => AC.byId(k)).filter(Boolean) : []);
  function certBox(c) {
    if (!AC) return '';
    const certs = (c.certs || []).map((k) => AC.byId(k)).filter(Boolean), lr = learning(c);
    if (!certs.length && !lr.length) return '';
    return `<h4>Lizenzen</h4><div class="lx-certs">${certs.map((K) => `<span class="ok">${esc(K.name)}</span>`).join('')}${lr.map((K) => `<span>${esc(K.name)} <small>${c.courses[K.id].theory ? 'Theorie bestanden' : `lernt ${c.courses[K.id].prep}/100`}</small></span>`).join('')}</div>`;
  }
  const acad = { cat: '' };
  function renderAcad(body, V, me) {
    const c = V.chars[me];
    if (!c || !AC) { put(body, '<p class="p-sub">Du schaust zu.</p>'); return; }
    const cats = [...new Set(AC.COURSES.map((K) => K.cat))];
    if (!acad.cat) acad.cat = cats[0];
    const open = V.phase === 'act' && !c.dead && !V.actions[me];
    const card = (K) => {
      const st = c.courses && c.courses[K.id], done = (c.certs || []).includes(K.id);
      const err = !st && !done ? AC.reqError(V, c, K) || (K.cost && !K.loan && c.stats.money + c.bank.dispo < K.cost ? `Zu teuer: Dir fehlen ${eur(K.cost - c.stats.money - c.bank.dispo)}.` : null) : null;
      const booked = c.appts.some((a) => a.status === 'open' && a.data && a.data.course === K.id);
      const minIdx = st ? st.since + Math.max(1, Math.ceil(K.months / 2)) : 0;
      const status = done ? '<b class="up">Bestanden</b>' : st ? `${st.theory ? 'Theorie bestanden' : `Vorbereitung ${st.prep}/100`}${booked ? ' · Termin steht' : ''}` : err ? `<span class="down">${esc(err)}</span>` : '';
      let btn = '';
      if (!done && !st) btn = `<button class="btn btn-small btn-primary" data-en="${K.id}" ${err || !open ? 'disabled' : ''}>Anmelden${K.cost ? ` · ${eur(K.cost)}` : ''}</button>`;
      else if (st && !done) btn = `<button class="btn btn-small btn-ghost" data-doc="${K.id}">Lernzettel</button><button class="btn btn-small ${st.theory || idx(V.date) + 1 >= minIdx ? 'btn-primary' : ''}" data-bk="${K.id}" ${booked || !open ? 'disabled' : ''}>${st.theory ? `${esc((K.practical || {}).name || 'Praxis')} buchen` : 'Theorieprüfung buchen'}</button>`;
      else btn = `<button class="btn btn-small btn-ghost" data-doc="${K.id}">Lernzettel</button>`;
      return `<div class="lx-course ${done ? 'done' : ''}"><div><b>${esc(K.name)}</b><p>${esc(K.text)}</p><small>${K.cost ? `Kurs ${eur(K.cost)}` : 'Kurs kostenlos'}${K.examFee ? ` · Prüfung ${eur(K.examFee)}` : ''} · ca. ${K.months} Monate${K.practical ? ` · Praxis: ${esc(K.practical.name)}` : ''}${K.loan ? ' · Bildungskredit möglich' : ''}</small><small>${status}</small></div><div class="btn-row">${btn}</div></div>`;
    };
    if (!body.querySelector('#ac-top')) body.innerHTML = '<div class="lx-panel lx-acad"><span class="lb-k">Akademie · Prüfungen für fast alles</span><p class="p-sub">Anmelden → April schickt dir einen Lernzettel in den Chat → im Monatsfokus „Lernen“ vorbereiten → Theorieprüfung als Quiz → Praxis per Würfel → Lizenz. Manche Lizenzen bringen direkt ein Jobangebot oder eine Ausbildung.</p><div id="ac-top"></div><div id="ac-list"></div></div>';
    if (put($('#ac-top'), `<div class="lx-cats">${cats.map((k) => `<button class="${acad.cat === k ? 'on' : ''}" data-acat="${esc(k)}">${esc(k)}</button>`).join('')}</div>`)) $('#ac-top').querySelectorAll('[data-acat]').forEach((b) => { b.onclick = () => { acad.cat = b.dataset.acat; redraw(); }; });
    if (put($('#ac-list'), AC.COURSES.filter((K) => K.cat === acad.cat).map(card).join('') + (open ? '' : '<p class="p-sub">Anmelden und buchen geht nur, während ihr plant.</p>'))) {
      const el = $('#ac-list');
      el.querySelectorAll('[data-en]').forEach((b) => { b.onclick = () => { const K = AC.byId(b.dataset.en); if (!K.cost || confirm(`${K.name} für ${eur(K.cost)} buchen?`)) { FX && FX.play('card'); act({ type: 'aEnroll', id: K.id }); } }; });
      el.querySelectorAll('[data-bk]').forEach((b) => { b.onclick = () => act({ type: 'aBook', id: b.dataset.bk }); });
      el.querySelectorAll('[data-doc]').forEach((b) => { b.onclick = () => openDoc(b.dataset.doc, c); });
    }
  }
  // Lernzettel als süße Karte
  function openDoc(id, c) {
    const K = AC && AC.byId(id);
    if (!K) return;
    const d = K.doc;
    const back = document.createElement('div');
    back.className = 'modal-back lx-doc-back';
    back.innerHTML = `<div class="lx-doc" role="dialog" aria-label="${esc(d.title)}"><div class="lx-doc-tape"></div><button class="lx-doc-x" aria-label="Schließen">×</button>
      <div class="lx-doc-head"><svg viewBox="0 0 100 100"><use href="#april"/></svg><div><small>Von April${c ? ` für ${esc(c.name)}` : ''}</small><h2>${esc(d.title)}</h2></div></div>
      <p class="lx-doc-intro">${esc(d.intro)}</p>
      ${d.sections.map((sec) => `<section><h3>${esc(sec.h)}</h3>${sec.items.map((it) => (it === AC.NATO ? `<div class="lx-nato">${AC.NATO.split(', ').map((w) => `<span><b>${esc(w[0])}</b>${esc(w)}</span>`).join('')}</div>` : `<p>${esc(it)}</p>`)).join('')}</section>`).join('')}
      <p class="lx-doc-outro">${esc(d.outro || '')}</p><p class="lx-doc-sig">April</p>
      <div class="btn-row"><button class="btn btn-primary lx-doc-ok">Verstanden</button></div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.querySelector('.lx-doc-x').onclick = close;
    back.querySelector('.lx-doc-ok').onclick = close;
    back.onclick = (e) => { if (e.target === back) close(); };
    FX && FX.play('card');
  }
  let seenDocs = null;
  function notifyDocs(V, me) {
    const mine = (V.chat || []).filter((m) => m.doc && m.to === me);
    if (seenDocs === null) { seenDocs = new Set(mine.map((m) => m.id)); return; }
    mine.forEach((m) => { if (!seenDocs.has(m.id)) { seenDocs.add(m.id); toast('April hat dir einen Lernzettel geschickt.'); say('larp-doc', true); setTimeout(() => openDoc(m.doc, V.chars[me]), 400); } });
  }

  // ----- Tab: Skills -----
  const CO = window.DULI_LARP_COMPANY, ST = window.DULI_LARP_SKILLTEST;
  function toggleSkill(k) {
    const dr = draft;
    if (!dr) return;
    if (dr.skills.includes(k)) dr.skills = dr.skills.filter((x) => x !== k);
    else { dr.skills.push(k); if (dr.skills.length > 2) dr.skills.shift(); if (!dr.focus.includes('learn')) { dr.focus.push('learn'); if (dr.focus.length > 2) dr.focus.shift(); } }
  }
  const lvlName = (v) => (v >= 90 ? 'Weltklasse' : v >= 75 ? 'Profi' : v >= 55 ? 'Fortgeschritten' : v >= 30 ? 'Solide' : v >= 12 ? 'Anfänger:in' : 'Ahnungslos');
  const sbar = (v, cls) => `<i class="lx-sbar ${cls || ''}" style="--v:${Math.max(0, Math.min(100, v))}%"></i>`;
  function renderSkills(body, V, me) {
    const c = V.chars[me];
    if (!c || !CO) { put(body, '<p class="p-sub">Du schaust zu.</p>'); return; }
    const sk = c.skills || {}, dr = ensureDraft(V, me), open = V.phase === 'act' && !c.dead && !V.actions[me];
    const groups = {};
    Object.entries(sk).forEach(([k, v]) => { const g = CO.catOf(k); (groups[g] = groups[g] || []).push([k, v]); });
    const missing = CO.ALL.filter((k) => sk[k] == null);
    const others = V.players.filter((p) => p.id !== me && V.chars[p.id] && V.chars[p.id].skills).map((p) => { const o = V.chars[p.id]; return `<li style="--pc:${esc(o.color)}"><b>${esc(o.name)}</b> ${Object.entries(o.skills).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `<span>${esc(k)} ${Math.round(v)}</span>`).join('')}</li>`; }).join('');
    const html = `<div class="lx-panel lx-skills"><span class="lb-k">Deine Skills</span><p class="p-sub">Level 0–100. Neue Skills startest du mit einem Einstufungstest, der zum Skill passt (Quiz, Rhythmus, Reaktion, Farbe, Tippen, Gedächtnis). Jeden Skill kannst du einmal nachtesten. Trainieren läuft über den Fokus „Lernen“ (bis zu 2 Skills pro Runde). Jobs, Lizenzen, Leben im Ausland und Aprils Ereignisse ändern Skills auch. Deine Skills zählen für deine Firma mit.</p>
      ${Object.keys(groups).sort().map((g) => `<h4>${esc(g)}</h4><ul class="lx-sk">${groups[g].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span><b>${esc(k)}</b><small>${lvlName(v)}</small></span>${sbar(v)}<em>${Math.round(v)}</em><span class="lx-sk-btns"><button class="lx-chip sm ${dr.skills.includes(k) ? 'on' : ''}" data-tr="${esc(k)}" ${open ? '' : 'disabled'}>${dr.skills.includes(k) ? 'wird trainiert' : 'trainieren'}</button>${ST && ST.kindOf(k) !== 'none' ? ((c.tested || {})[k] != null ? `<small class="lx-tested">${(c.tested || {})[k] >= 0 ? `Test ${c.tested[k]}` : 'ohne Test'}</small>` : `<button class="lx-chip sm test" data-test="${esc(k)}" ${open ? '' : 'disabled'} title="${esc(ST.LABEL[ST.kindOf(k)])}">Einstufungstest</button>`) : ''}</span></li>`).join('')}</ul>`).join('') || '<p class="p-sub">Noch keine Skills.</p>'}
      <h4>Neuen Skill anfangen</h4><div class="lb-inline"><input id="sk-new" list="sk-list" maxlength="40" placeholder="z. B. 3D-Modellierung, Singen, Poker …"><datalist id="sk-list">${missing.map((k) => `<option value="${esc(k)}">`).join('')}</datalist><button class="btn btn-small" id="sk-add" ${open ? '' : 'disabled'}>Anfangen</button></div></div>
      ${gigHTML(V, me, c, open)}
      ${others ? `<div class="lx-panel"><span class="lb-k">Die anderen können</span><ul class="lx-sk-others">${others}</ul></div>` : ''}`;
    if (put(body, html)) {
      body.querySelectorAll('[data-tr]').forEach((b) => { b.onclick = () => { toggleSkill(b.dataset.tr); body._html = null; redraw(); }; });
      body.querySelectorAll('[data-gig]').forEach((b) => { b.onclick = () => { FX && FX.play('card'); act({ type: 'kGig', id: b.dataset.gig }); }; });
      body.querySelectorAll('[data-test]').forEach((b) => { b.onclick = () => ST.run(b.dataset.test, (score) => { if (score != null) act({ type: 'kTest', name: b.dataset.test, score }); }); });
      const add = () => { const n = $('#sk-new').value.trim(); if (!n) return; if (ST) ST.run(n, (score) => act({ type: 'kLearn', name: n, score })); else act({ type: 'kLearn', name: n }); };
      $('#sk-add').onclick = add;
      $('#sk-new').onkeydown = (e) => { if (e.key === 'Enter') add(); };
    }
  }
  function gigHTML(V, me, c, open) {
    const now = idx(V.date), list = CO.gigs(V, JSON.parse(JSON.stringify(c)), now), used = c.flags.gigAt === now;
    if (!list.length) return '<div class="lx-panel"><span class="lb-k">Gigs</span><p class="p-sub">Ab Level 12 in einem passenden Skill gibt es hier kleine Aufträge für nebenbei (Auftritte, Websites, Fotos, Nachhilfe …).</p></div>';
    return `<div class="lx-panel"><span class="lb-k">Gigs diesen Monat</span><p class="p-sub">Nebenbei Geld mit deinen Skills, ohne Firma. Einer pro Monat. Ob es klappt, hängt von deinem Level gegenüber der Anforderung ab. Auftritte und Fotos machen dich bekannter.${used ? ' <b>Diesen Monat hattest du schon einen Gig.</b>' : ''}</p>
      ${list.map((g) => { const lv = Math.round((c.skills || {})[g.skill] || 0), p = Math.max(5, Math.min(95, Math.round(((21 - (9 - Math.round((lv - g.req) / 5))) / 20) * 100))); return `<div class="lx-job"><b>${esc(g.title)}</b><small>${esc(g.skill)}: braucht etwa ${g.req}, du hast ${lv} · ${eur(g.pay)}${g.fame ? ' · bringt Bekanntheit' : ''} · Chance etwa ${p} %</small><div class="btn-row"><button class="btn btn-small btn-primary" data-gig="${esc(g.id)}" ${open && !used ? '' : 'disabled'}>Machen</button></div></div>`; }).join('')}</div>`;
  }
  // ----- Tab: Firma -----
  function ladderHTML(V, me, C, F, people) {
    const rows = CO.LADDER.map((L, i) => ({ i, L, who: people.filter((p) => (p.level != null ? p.level : 2) === i) })).reverse();
    return `<div class="lx-panel lx-ladder"><span class="lb-k">Hierarchie</span><p class="p-sub">So hoch kann man hier steigen. Für jede Stufe zählen Skills (Schnitt der zwei besten), Führung, Zeit in der Firma und Firmengröße.</p>
      <div class="lx-rung top"><div><b>Gründer:in und CEO</b><small>gehört dir</small></div><div class="lx-who"><span class="me" style="--pc:${esc(C.color)}">${esc(C.name)}</span></div></div>
      ${rows.map(({ i, L, who }) => `<div class="lx-rung ${who.length ? '' : 'empty'}"><div><b>${esc(L.name)}</b><small>${eur(L.band[0])}–${eur(L.band[1])} · ab Skill ${L.avg}${L.lead ? ` · Führung ${L.lead}` : ''}${L.months ? ` · ${L.months} Mon.` : ''}${L.team ? ` · ab ${L.team} Leuten` : ''}</small></div><div class="lx-who">${who.map((p) => `<span class="${p.player ? 'pl' : ''}" style="--pc:${esc(p.player ? V.chars[p.pid].color : '#7a6a90')}">${esc(p.name)}</span>`).join('') || '<em>noch niemand</em>'}</div></div>`).join('')}</div>`;
  }
  function renderFirm(body, V, me) {
    const c = V.chars[me];
    if (!c || !CO) { put(body, '<p class="p-sub">Du schaust zu.</p>'); return; }
    const open = V.phase === 'act' && !c.dead && !c.prison;
    // Ich arbeite für eine andere Spieler-Figur
    let mineJob = '';
    if (c.job2 && c.job2.boss && V.chars[c.job2.boss]) {
      const B = V.chars[c.job2.boss], BC = JSON.parse(JSON.stringify(B)), BF = CO.firm(BC), lv = c.job2.level != null ? c.job2.level : 2;
      const next = CO.LADDER[lv + 1], miss = next ? CO.missingFor({ skills: c.skills || {} }, lv + 1, idx(V.date) - c.job2.since, 99) : [];
      const pending = (V.offers || []).filter((o) => o.from === me && o.to === c.job2.boss && o.status === 'open' && (o.kind === 'raise' || o.kind === 'promo'));
      const people = CO.players(V, c.job2.boss).concat(BF.staff.map((p) => Object.assign({ level: 2 }, p)));
      mineJob = `<div class="lx-panel"><span class="lb-k">Dein Job bei ${esc(BF.name)}</span><p>Chef:in: <b style="color:${esc(B.color)}">${esc(B.name)}</b> (Spieler:in). Über Gehalt und Beförderung entscheidet ${esc(B.name)} selbst, nicht der Würfel.</p>
        <p>Stufe: <b>${esc(CO.LADDER[lv].name)}</b> · ${eur(c.job2.gross)} brutto${next ? ` · nächste Stufe: <b>${esc(next.name)}</b>${miss.length ? ` <small class="down">(fehlt: ${esc(miss.join(', '))})</small>` : ' <small class="up">(du erfüllst alles)</small>'}` : ''}</p>
        ${pending.length ? `<p class="p-sub">Offen bei ${esc(B.name)}: ${pending.map((o) => esc(o.kind === 'raise' ? `${o.terms.pct} % mehr Gehalt` : `Beförderung zu ${o.terms.next}`)).join(', ')}</p>` : ''}
        <div class="lb-inline"><select id="fj-pct">${[5, 8, 10, 15, 20].map((x) => `<option value="${x}">${x} %</option>`).join('')}</select><input id="fj-why" maxlength="140" placeholder="Begründung (optional)"><button class="btn btn-small btn-primary" id="fj-raise" ${open ? '' : 'disabled'}>Gehaltserhöhung beantragen</button></div>
        <div class="btn-row">${next ? `<button class="btn btn-small" id="fj-promo" ${open ? '' : 'disabled'}>Beförderung zu ${esc(next.name)} beantragen</button>` : ''}<button class="btn btn-small btn-ghost" id="fj-quit" ${open ? '' : 'disabled'}>Kündigen</button></div></div>
        ${ladderHTML(V, me, BC, BF, people)}`;
    }
    if (!CO.can(c)) {
      if (put(body, mineJob || '<div class="lx-panel"><span class="lb-k">Firma</span><p>Du hast noch keine Firma. Gründen geht über den Fokus „Eigenes Projekt“ (ab etwas Erfahrung) oder über Ereignisse. Danach kannst du hier Leute einstellen, Aufträge annehmen und im Markt Büros mieten. Oder du arbeitest für eine andere Figur: Die kann dir unter „Leute“ einen Job anbieten.</p></div>')) bindFirm(body, c);
      return;
    }
    const C = JSON.parse(JSON.stringify(c)), F = CO.firm(C), fs = CO.skills(C, V, me), now = idx(V.date);
    const pl = CO.players(V, me), teamN = F.staff.length + pl.length;
    const apps = CO.applicants(V, C, now).filter((p) => !(V.market.taken || {})[`${me}:${p.id}`]), offers = CO.offers(V, C, now).filter((j) => !F.jobs.some((x) => x.id === j.id));
    const cap = CO.capacity(C), salary = F.staff.reduce((s2, p) => s2 + Math.round(p.gross * 1.21), 0);
    const reqHTML = (req) => Object.entries(req).map(([k, v]) => { const have = fs[k] || 0; return `<span class="${have >= v ? 'ok' : have >= v * 0.6 ? 'mid' : 'bad'}">${esc(k)} ${v} <small>(ihr ${have})</small></span>`; }).join('');
    const people = pl.concat(F.staff.map((p) => Object.assign({ level: 2 }, p)));
    const staffRow = (p) => {
      const lv = p.level != null ? p.level : 2, nx = CO.LADDER[lv + 1], miss = nx ? CO.missingFor(p, lv + 1, now - p.since, teamN) : ['Höher geht es nicht.'];
      return `<div class="lx-staff"><div><b>${esc(p.name)}</b> <span class="lx-lv">${esc(CO.LADDER[lv].name)}</span><small>${esc(p.role)} · ${esc(p.trait[0])} · ${eur(p.gross)} brutto · Laune ${p.mood}${nx ? ` · ${miss.length ? `für ${esc(nx.name)} fehlt: ${esc(miss.join(', '))}` : `<b class="up">bereit für ${esc(nx.name)}</b>`}` : ''}</small><div class="lx-req">${Object.entries(p.skills).map(([k, v]) => `<span>${esc(k)} ${Math.round(v)}</span>`).join('')}</div></div>
        <div class="btn-row">${nx ? `<button class="btn btn-small ${miss.length ? 'btn-ghost' : 'btn-primary'}" data-promo="${esc(p.id)}" ${open && !miss.length ? '' : 'disabled'}>Befördern</button>` : ''}<button class="btn btn-small btn-ghost" data-raise="${esc(p.id)}" ${open ? '' : 'disabled'}>+10 % Gehalt</button><button class="btn btn-small btn-ghost" data-fire="${esc(p.id)}" ${open ? '' : 'disabled'}>Entlassen</button></div></div>`;
    };
    const playerRow = (p) => {
      const lv = p.level, nx = CO.LADDER[lv + 1], miss = nx ? CO.missingFor(p, lv + 1, now - p.since, teamN) : [];
      return `<div class="lx-staff is-player" style="--pc:${esc(V.chars[p.pid].color)}"><div><b>${esc(p.name)}</b> <span class="lx-lv">${esc(CO.LADDER[lv].name)}</span> <span class="lx-lv pl">Spieler:in</span><small>${eur(p.gross)} brutto${nx ? ` · ${miss.length ? `für ${esc(nx.name)} fehlt: ${esc(miss.join(', '))}` : `bereit für ${esc(nx.name)}`}` : ''}</small><div class="lx-req">${Object.entries(p.skills).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `<span>${esc(k)} ${Math.round(v)}</span>`).join('')}</div></div>
        <div class="btn-row">${nx ? `<button class="btn btn-small" data-ppromo="${esc(p.pid)}" ${open ? '' : 'disabled'}>Befördern</button>` : ''}<button class="btn btn-small btn-ghost" data-praise="${esc(p.pid)}" ${open ? '' : 'disabled'}>+10 % Gehalt</button><button class="btn btn-small btn-ghost" data-pfire="${esc(p.pid)}" ${open ? '' : 'disabled'}>Entlassen</button></div></div>`;
    };
    const html = `${mineJob}<div class="lx-panel lx-firm"><span class="lb-k">${esc(F.name)}</span>
      <div class="lx-firm-kpi"><div><b>${F.rep}</b><small>Ruf</small></div><div><b>${teamN}/${cap}</b><small>Leute (Büro + 2 Homeoffice)</small></div><div><b>${eur(salary)}</b><small>Gehälter/Monat</small></div><div><b class="${F.lastRev >= 0 ? 'up' : 'down'}">${eur(F.lastRev || 0)}</b><small>Ergebnis letzter Monat</small></div><div><b>${F.done}</b><small>Aufträge fertig</small></div></div>
      <h4>Firmen-Skills <small>du + Team kombiniert: der oder die Beste zählt voll, alle anderen helfen mit</small></h4>
      <ul class="lx-sk">${Object.entries(fs).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `<li><span><b>${esc(k)}</b><small>${lvlName(Math.min(100, v))}</small></span>${sbar(Math.min(100, v), 'firm')}<em>${v}</em></li>`).join('')}</ul></div>
      ${autoHTML(V, me, C, F, open)}
      ${ladderHTML(V, me, C, F, people)}
      ${F.jobs.length ? `<div class="lx-panel"><span class="lb-k">Laufende Aufträge</span>${F.jobs.map((j) => `<div class="lx-job"><b>${esc(j.title)}</b><small>${eur(j.pay)} · Deadline ${esc(L.MONTHS[j.deadline % 12])} ${Math.floor(j.deadline / 12)} · etwa ${CO.pace(C, j, V, me)} % pro Monat</small><div class="lx-prog"><i style="--v:${j.progress}%"></i><span>${j.progress} %</span></div></div>`).join('')}</div>` : ''}
      <div class="lx-panel"><span class="lb-k">Aufträge diesen Monat</span><p class="p-sub">Grün: euer Firmen-Skill reicht. Gleichzeitig schafft ihr ${1 + Math.floor(F.staff.length / 2)} Auftrag${F.staff.length >= 2 ? 'e' : ''}. Teamleitungen machen das ganze Team schneller.</p>${offers.map((j) => `<div class="lx-job"><b>${esc(j.title)}</b><small>${eur(j.pay)} · ${j.months} Monate geplant${j.minRep ? ` · braucht Ruf ${j.minRep}` : ''} · bei euch etwa ${CO.pace(C, j, V, me)} % pro Monat</small><div class="lx-req">${reqHTML(j.req)}</div><div class="btn-row"><button class="btn btn-small btn-primary" data-take="${esc(j.id)}" ${open ? '' : 'disabled'}>Annehmen</button></div></div>`).join('')}</div>
      <div class="lx-panel"><span class="lb-k">Team</span>${pl.map(playerRow).join('')}${F.staff.map((p) => staffRow(Object.assign({ level: 2 }, p))).join('') || (pl.length ? '' : '<p class="p-sub">Noch niemand. Unten warten Bewerbungen. Andere Spieler-Figuren stellst du unter „Leute“ ein (Angebot „Job anbieten“).</p>')}</div>
      <div class="lx-panel"><span class="lb-k">Bewerbungen</span><p class="p-sub">Arbeitgeberkosten sind etwa 21 % mehr als das Bruttogehalt. Mehr Plätze gibt es mit einem größeren Büro (Markt → Büros).</p>${apps.map((p) => `<div class="lx-staff"><div><b>${esc(p.name)}</b> <span class="lx-lv">${esc(CO.LADDER[CO.startLevel(p)].name)}</span><small>${esc(p.role)} · ${esc(p.trait[0])} · will ${eur(p.gross)} brutto</small><div class="lx-req">${Object.entries(p.skills).map(([k, v]) => `<span>${esc(k)} ${v}</span>`).join('')}</div></div><div class="btn-row"><button class="btn btn-small btn-primary" data-hire="${esc(p.id)}" ${open && teamN < cap ? '' : 'disabled'}>Einstellen</button></div></div>`).join('')}</div>`;
    if (put(body, html)) bindFirm(body, c);
  }
  function autoHTML(V, me, C, F, open) {
    const U = CO.autoUnlocks(C, V, me), A = F.auto || {};
    const row = (key, name, what) => `<div class="lx-auto ${U[key].ok ? '' : 'locked'}"><div><b>${name}</b><small>${what}${U[key].ok ? '' : ` · Freischalten: ${esc(U[key].need)}`}</small></div><label class="lx-switch"><input type="checkbox" data-auto="${key}" ${A[key] ? 'checked' : ''} ${open && (U[key].ok || A[key]) ? '' : 'disabled'}><i></i></label></div>`;
    return `<div class="lx-panel"><span class="lb-k">Automatisierung</span><p class="p-sub">Wenn die Firma wächst, machen deine Leute das selbst, jeden Monat. Du bekommst einen Bericht, was entschieden wurde.</p>
      ${row('jobs', 'Vertrieb', 'nimmt passende Aufträge an, die das Team rechtzeitig schafft, die lukrativsten zuerst')}
      ${row('hire', 'Personal', 'stellt Leute ein, die euch bei den gefragten Skills weiterbringen, bis alle Plätze voll sind')}
      ${row('promo', 'Beförderungen', 'befördert alle, die die Anforderungen erfüllen (bis Abteilungsleitung; Spieler-Figuren entscheidest immer du)')}
      ${A.hire ? `<div class="lb-inline"><span class="p-sub">Höchstes Gehalt für neue Leute</span><input id="au-max" type="number" min="1500" step="250" value="${A.maxGross || 4500}" style="max-width:120px"><button class="btn btn-small" id="au-set" ${open ? '' : 'disabled'}>Übernehmen</button></div>` : ''}</div>`;
  }
  function bindFirm(body, c) {
    const on = (sel, fn) => body.querySelectorAll(sel).forEach((b) => { b.onclick = () => fn(b); });
    body.querySelectorAll('[data-auto]').forEach((b) => { b.onchange = () => act({ type: 'kAuto', key: b.dataset.auto, on: b.checked }); });
    if ($('#au-set')) $('#au-set').onclick = () => act({ type: 'kAuto', key: 'hire', on: true, maxGross: Number($('#au-max').value) });
    on('[data-take]', (b) => act({ type: 'kTake', id: b.dataset.take }));
    on('[data-hire]', (b) => act({ type: 'kHire', id: b.dataset.hire }));
    on('[data-raise]', (b) => act({ type: 'kRaise', staff: b.dataset.raise }));
    on('[data-promo]', (b) => act({ type: 'kPromote', staff: b.dataset.promo }));
    on('[data-fire]', (b) => { if (confirm('Wirklich entlassen?')) act({ type: 'kFire', staff: b.dataset.fire }); });
    on('[data-praise]', (b) => act({ type: 'kRaiseP', pid: b.dataset.praise, pct: 10 }));
    on('[data-ppromo]', (b) => act({ type: 'kPromoteP', pid: b.dataset.ppromo, force: true }));
    on('[data-pfire]', (b) => { if (confirm('Wirklich entlassen? Die Person bekommt sofort Bescheid.')) act({ type: 'kFireP', pid: b.dataset.pfire }); });
    if ($('#fj-raise')) $('#fj-raise').onclick = () => act({ type: 'oOffer', to: c.job2.boss, kind: 'raise', terms: { pct: Number($('#fj-pct').value), reason: $('#fj-why').value } });
    if ($('#fj-promo')) $('#fj-promo').onclick = () => act({ type: 'oOffer', to: c.job2.boss, kind: 'promo', terms: { reason: $('#fj-why') ? $('#fj-why').value : '' } });
    if ($('#fj-quit')) $('#fj-quit').onclick = () => { if (confirm('Wirklich kündigen?')) act({ type: 'kQuit' }); };
  }

  // ----- Handy: SMS und Anfragen -----
  const phone = { open: false, app: 'home', thread: null, seen: null, draft: {} };
  const smsName = (V, id) => (/^npc:/.test(id) ? id.slice(4) : (V.chars[id] && V.chars[id].name) || '?');
  const smsColor = (V, id) => (/^npc:/.test(id) ? '#6b6480' : (V.chars[id] && V.chars[id].color) || '#888');
  function threadsOf(V, me) {
    const by = {};
    (V.sms || []).forEach((m) => { const k = m.from === me ? m.to : m.from; (by[k] = by[k] || []).push(m); });
    return Object.entries(by).map(([k, list]) => ({ k, list, last: list[list.length - 1], unread: list.filter((m) => m.to === me && !phone.seen.has(m.id)).length })).sort((a, b) => (b.last.round - a.last.round) || 0);
  }
  function renderPhone(V, me) {
    const c = V.chars[me];
    let btn = document.getElementById('lx-phone-btn');
    if (!c) { if (btn) btn.remove(); const o = document.getElementById('lx-phone'); if (o) o.remove(); return; }
    if (!phone.seen) phone.seen = new Set((V.sms || []).map((m) => m.id));
    // neue SMS melden
    (V.sms || []).filter((m) => m.to === me && !phone.seen.has(m.id) && !(phone.notified || (phone.notified = new Set())).has(m.id)).forEach((m) => {
      phone.notified.add(m.id);
      if (!(phone.open && phone.app === 'sms' && phone.thread === m.from)) { toast(`SMS von ${smsName(V, m.from)}: ${m.t.slice(0, 60)}`); FX && FX.play('pop'); }
    });
    const reqs = (V.offers || []).filter((o) => o.to === me && o.status === 'open');
    const unread = threadsOf(V, me).reduce((s2, t) => s2 + t.unread, 0);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'lx-phone-btn'; btn.className = 'lx-phone-btn'; btn.setAttribute('aria-label', 'Handy');
      btn.onclick = () => { phone.open = !phone.open; renderPhone(last.V, last.me); };
      document.body.appendChild(btn);
    }
    put(btn, `<svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>${unread + reqs.length ? `<i>${unread + reqs.length}</i>` : ''}`);
    let ov = document.getElementById('lx-phone');
    if (!phone.open) { if (ov) ov.remove(); return; }
    if (!ov) { ov = document.createElement('div'); ov.id = 'lx-phone'; ov.className = 'lx-phone'; document.body.appendChild(ov); }
    const top = `<div class="ph-top"><span>${esc(L.dateText(V))}</span><b>${esc(c.name)}</b><button class="ph-x" data-ph="close" aria-label="Schließen">×</button></div>`;
    let inner = '';
    if (phone.app === 'home') {
      inner = `<div class="ph-home"><button class="ph-app" data-ph="sms"><span class="ic sms">SMS</span><small>Nachrichten</small>${unread ? `<i>${unread}</i>` : ''}</button><button class="ph-app" data-ph="req"><span class="ic req">!</span><small>Anfragen</small>${reqs.length ? `<i>${reqs.length}</i>` : ''}</button><button class="ph-app" data-ph="bank"><span class="ic bank">€</span><small>Banking</small></button></div><p class="ph-note">April liest mit. Was ihr schreibt, ist Teil der Geschichte.</p>`;
    } else if (phone.app === 'sms' && !phone.thread) {
      const th = threadsOf(V, me), others = V.players.filter((p) => p.id !== me && V.chars[p.id] && !V.chars[p.id].dead && !th.some((t) => t.k === p.id));
      inner = `<div class="ph-head"><button data-ph="home">‹</button><b>Nachrichten</b></div><ul class="ph-list">${th.map((t) => `<li data-th="${esc(t.k)}"><span class="av" style="--pc:${esc(smsColor(V, t.k))}">${esc(smsName(V, t.k)[0])}</span><div><b>${esc(smsName(V, t.k))}</b><small>${t.last.from === me ? 'Du: ' : ''}${esc(t.last.t.slice(0, 50))}</small></div>${t.unread ? `<i>${t.unread}</i>` : ''}</li>`).join('')}
        ${others.map((p) => `<li data-th="${esc(p.id)}" class="new"><span class="av" style="--pc:${esc(V.chars[p.id].color)}">${esc(V.chars[p.id].name[0])}</span><div><b>${esc(V.chars[p.id].name)}</b><small>Neue Nachricht schreiben</small></div></li>`).join('')}</ul>`;
    } else if (phone.app === 'sms') {
      const k = phone.thread, list = (V.sms || []).filter((m) => (m.from === me && m.to === k) || (m.from === k && m.to === me));
      list.forEach((m) => phone.seen.add(m.id));
      inner = `<div class="ph-head"><button data-ph="sms">‹</button><span class="av" style="--pc:${esc(smsColor(V, k))}">${esc(smsName(V, k)[0])}</span><b>${esc(smsName(V, k))}</b></div>
        <div class="ph-chat" id="ph-chat">${list.map((m) => `<p class="${m.from === me ? 'me' : ''}">${esc(m.t)}<small>${esc(m.d)}</small></p>`).join('') || '<p class="ph-empty">Noch nichts geschrieben.</p>'}</div>
        <div class="ph-in"><input id="ph-text" maxlength="400" placeholder="Nachricht …" value="${esc(phone.draft[k] || '')}"><button id="ph-send">Senden</button></div>`;
    } else if (phone.app === 'req') {
      inner = `<div class="ph-head"><button data-ph="home">‹</button><b>Anfragen</b></div>${reqs.length ? reqs.map((o) => `<div class="ph-req"><b>${esc(o.fromName)} · ${esc(SOC.KINDS[o.kind].name)}</b><p>${esc(SOC.KINDS[o.kind].text(o))}</p><div class="btn-row"><button class="btn btn-small btn-primary" data-pans="${o.id}" data-yes="1">${SOC.KINDS[o.kind].ask ? 'Ja' : 'Annehmen'}</button><button class="btn btn-small" data-pans="${o.id}">${SOC.KINDS[o.kind].ask ? 'Nein' : 'Ablehnen'}</button></div></div>`).join('') : '<p class="ph-empty">Keine offenen Anfragen.</p>'}`;
    } else if (phone.app === 'bank') {
      const loans = c.bank.loans.reduce((s2, l) => s2 + l.rest, 0);
      inner = `<div class="ph-head"><button data-ph="home">‹</button><b>Banking</b></div><div class="ph-bank"><small>Kontostand</small><b class="${c.stats.money < 0 ? 'down' : 'up'}">${eur(c.stats.money)}</b><p>Dispo ${eur(c.bank.dispo)} · SCHUFA ${c.bank.schufa}${loans ? ` · Kredite offen ${eur(loans)}` : ''}</p>${(c.effects || []).filter((e) => e.pm).slice(0, 10).map((e) => `<p class="ph-tx"><span>${esc(e.name)}</span><b class="${e.pm > 0 ? 'up' : 'down'}">${e.pm > 0 ? '+' : ''}${eur(e.pm)}</b></p>`).join('')}</div>`;
    }
    if (put(ov, `<div class="ph-frame">${top}<div class="ph-screen">${inner}</div></div>`)) {
      ov.querySelectorAll('[data-ph]').forEach((b) => { b.onclick = () => { const t = b.dataset.ph; if (t === 'close') phone.open = false; else { phone.app = t === 'home' || t === 'sms' || t === 'req' || t === 'bank' ? t : 'home'; phone.thread = null; } renderPhone(last.V, last.me); }; });
      ov.querySelectorAll('[data-th]').forEach((b) => { b.onclick = () => { phone.thread = b.dataset.th; renderPhone(last.V, last.me); }; });
      ov.querySelectorAll('[data-pans]').forEach((b) => { b.onclick = () => act({ type: 'oAnswer', id: b.dataset.pans, yes: !!b.dataset.yes }); });
      const inp = ov.querySelector('#ph-text');
      if (inp) {
        const k = phone.thread;
        inp.oninput = () => { phone.draft[k] = inp.value; };
        const send = () => { const t = inp.value.trim(); if (!t) return; phone.draft[k] = ''; inp.value = ''; act({ type: 'sms', to: k, text: t }); };
        ov.querySelector('#ph-send').onclick = send;
        inp.onkeydown = (e) => { if (e.key === 'Enter') send(); };
        const ch = ov.querySelector('#ph-chat'); if (ch) ch.scrollTop = ch.scrollHeight;
        if (document.activeElement !== inp && window.innerWidth > 700) inp.focus();
      }
    }
  }

  // ----- Tab: Markt -----
  const CATS = [['flat', 'Wohnung mieten'], ['wg', 'WG-Zimmer'], ['buyflat', 'Wohnung kaufen'], ['house', 'Haus kaufen'], ['office', 'Büros'], ['car', 'Autos'], ['uni', 'Studium'], ['abroad', 'Studium weltweit'], ['training', 'Ausbildung'], ['job', 'Jobs'], ['travel', 'Reisen'], ['ad', 'Kleinanzeigen']];
  function renderMarket(body, V, me, api) {
    const c = V.chars[me];
    if (!c) { put(body, '<p class="p-sub">Du schaust zu.</p>'); return; }
    if (!mkt.city) mkt.city = c.home.city || 'Duisburg';
    if (!body.querySelector('#mk-top')) {
      const W = window.DULI_LARP_WORLD;
      const names = MK.cities().slice(0, 1500).map((x) => x.name).concat(W ? W.cities().map((x) => x.name) : []);
      body.innerHTML = `<div class="lx-mk"><div id="mk-top"></div><div class="lx-mk-bar"><div class="lb-inline"><input id="mk-city" list="mk-cities" value="${esc(mkt.city)}" placeholder="Stadt"><button class="btn btn-small" id="mk-go">Suchen</button><button class="btn btn-small btn-ghost" id="mk-home">Mein Ort</button></div><datalist id="mk-cities">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div><div id="mk-list"></div></div>`;
      $('#mk-go').onclick = () => { mkt.city = $('#mk-city').value.trim() || mkt.city; $('#mk-list')._html = null; redraw(); };
      $('#mk-city').onkeydown = (e) => { if (e.key === 'Enter') $('#mk-go').click(); };
      $('#mk-home').onclick = () => { mkt.city = c.home.city || 'Duisburg'; $('#mk-city').value = mkt.city; redraw(); };
    }
    if (put($('#mk-top'), `<div class="lx-cats">${CATS.map(([k, n]) => `<button class="${mkt.cat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>`)) {
      $('#mk-top').querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => { mkt.cat = b.dataset.cat; redraw(); }; });
    }
    const open = V.phase === 'act' && !c.dead;
    const items = MK.list(V, mkt.cat, mkt.cat === 'abroad' ? (mkt.world || '') : mkt.city);
    const mc = MK.city(mkt.city), pr = MK.priceOf(mc), Wd = window.DULI_LARP_WORLD;
    const where = mc.world && Wd ? `${esc(mkt.city)} (${esc(Wd.country(mc.cc).name)})` : esc(mkt.city);
    let html = mkt.cat === 'abroad' ? `<div class="lb-inline lx-mk-world"><input id="mk-world" value="${esc(mkt.world || '')}" placeholder="Land, Stadt oder Uni (z. B. USA, Tokio, Oxford)"><button class="btn btn-small" id="mk-wgo">Suchen</button></div><p class="p-sub lx-mk-info">Die bekanntesten Hochschulen der Welt. Außerhalb von Deutschland, Österreich und der Schweiz brauchst du IELTS (Akademie), außerhalb der EU ein Visum. Gebühren sind Richtwerte für Studierende aus Deutschland.${open ? '' : ' · Der Markt hat nur offen, während ihr plant.'}</p>`
      : mkt.cat === 'travel' ? `<p class="p-sub lx-mk-info">Reiseangebote im ${esc(L.dateText(V))}. Eine Reise pro Monat.${open ? '' : ' · Der Markt hat nur offen, während ihr plant.'}</p>`
      : `<p class="p-sub lx-mk-info">${where} · ${esc(L.dateText(V))} · Ø Kaltmiete ${String(pr.rent.toFixed(1)).replace('.', ',')} €/m², Kauf ${eur(pr.buy)}/m²${mc.world ? ' · Ausland: Wer hier mietet, wandert aus.' : ''}${open ? '' : ' · Der Markt hat nur offen, während ihr plant.'}</p>`;
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
          act({ type: t, id, finance: !!b.dataset.fin, haggle: !!b.dataset.haggle, buy: !!b.dataset.buy });
        };
      });
      if ($('#mk-wgo')) { $('#mk-wgo').onclick = () => { mkt.world = $('#mk-world').value.trim(); redraw(); }; $('#mk-world').onkeydown = (e) => { if (e.key === 'Enter') $('#mk-wgo').click(); }; }
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
      const grest = Math.round(x.price * MK.grestOf(x) / 100), extra = grest + Math.round(x.price * 0.02) + Math.round(x.price * x.courtage / 100);
      return `<div class="lx-ls">${tk}<b>${esc(x.title)}</b><small>${esc(x.street)}${x.quarter ? ` · ${esc(x.quarter)}` : ''}, ${esc(x.city)} · Baujahr ${x.year} · Energie ${esc(x.energy)}</small>
        <div class="lx-price"><b>${eur(x.price)}</b> <span>+ ${eur(extra)} Nebenkosten (Grunderwerbsteuer ${String(MK.grestOf(x)).replace('.', ',')} %, Notar, Grundbuch${x.courtage ? ', Makler 3,57 %' : ''})</span></div>
        <p>${x.extras.map(esc).join(' · ')}${x.flaw ? ` <em>· ${esc(x.flaw)}</em>` : ''}</p><small>${x.hausgeld ? `Hausgeld ${eur(x.hausgeld)}/M · ` : ''}vermietbar für etwa ${eur(x.rentEst)} kalt · Kreditzins für dich ${String(MK.loanRate(V, c)).replace('.', ',')} %</small>
        <div class="btn-row"><button class="btn btn-small" data-mk="mBuyHome" data-id="${esc(x.id)}" ${dis}>Bar kaufen</button><button class="btn btn-small btn-primary" data-mk="mBuyHome" data-fin="1" data-min="${extra}" data-id="${esc(x.id)}" ${dis}>Finanzieren</button></div></div>`;
    }
    if (x.cat === 'car') {
      const k = MK.carCosts(V, c, x);
      return `<div class="lx-ls">${tk}<b>${esc(x.brand)} ${esc(x.model)}</b><small>${esc(x.cls)} · ${x.isNew ? 'Neuwagen' : `${x.year}, ${x.km.toLocaleString('de-DE')} km`} · ${x.ps} PS · ${({ B: 'Benzin', D: 'Diesel', E: 'Elektro', H: 'Hybrid' })[x.fuel]} · ${String(x.cons).replace('.', ',')} ${x.fuel === 'E' ? 'kWh' : 'l'}/100 km</small>
        <div class="lx-price"><b>${eur(x.price)}</b> <span>Unterhalt für dich etwa ${eur(k.total)}/Monat</span></div><p>${esc(x.seller)}${x.note ? ` · ${esc(x.note)}` : ''}${x.isNew ? '' : ` · TÜV noch ${x.tuv} Monate`}</p>
        <div class="btn-row"><button class="btn btn-small" data-mk="mCar" data-id="${esc(x.id)}" ${dis}>Kaufen</button><button class="btn btn-small btn-primary" data-mk="mCar" data-haggle="1" data-id="${esc(x.id)}" ${dis}>Handeln und kaufen</button><button class="btn btn-small btn-ghost" data-mk="mCar" data-fin="1" data-id="${esc(x.id)}" ${dis}>Finanzieren</button></div></div>`;
    }
    if (x.cat === 'uni' && x.abroad) {
      const hasL = (c.certs || []).includes('ielts');
      return `<div class="lx-ls"><b>${esc(x.name)}</b><small>${esc(x.uni)} · ${esc(x.city)}, ${esc(x.country)} · ${x.sem} Semester · Weltrang etwa ${x.rank}</small>
        <div class="lx-price"><b>Schnitt ${String(x.nc.toFixed(1)).replace('.', ',')} oder besser</b> <span>${x.tuition ? `Studiengebühr ${eur(x.tuition)}/Jahr` : 'keine Studiengebühr'}${x.visa ? ` · Visum ${eur(x.visaFee)}` : ' · kein Visum nötig'}</span></div>
        <small>${x.needLang ? (hasL ? 'IELTS hast du.' : 'Braucht IELTS (Akademie).') : 'Unterricht auf Deutsch.'}${x.rank <= 30 ? ' Spitzenuni: Interview entscheidet mit.' : ''} Bewerbung bis 15. Juli, Start 1. Oktober, Wohnheim vor Ort. Danach etwa ${eur(x.salary)} im Jahr.</small>
        <div class="btn-row"><button class="btn btn-small btn-primary" data-mk="mApply" data-id="${esc(x.id)}" ${!open ? 'disabled' : ''}>Bewerben</button></div></div>`;
    }
    if (x.cat === 'office') {
      const OF = window.DULI_LARP_OFFICE, can = OF && OF.canHave(c), b = OF ? OF.boost(c, x) : 0;
      return `<div class="lx-ls">${tk}<b>${esc(x.title)}</b><small>${esc(x.street)}, ${esc(x.city)} · ${x.desks} Arbeitsplatz${x.desks > 1 ? 'e' : ''} · ${esc(x.landlord)}</small>
        <div class="lx-price">${x.sale ? `<b>${eur(x.price)}</b> <span>Kauf, plus Grunderwerbsteuer und Notar</span>` : `<b>${eur(x.cold + x.nk)}</b> <span>im Monat (${eur(x.cold)} kalt + ${eur(x.nk)} NK)</span>`}</div>
        <p>${x.extras.map(esc).join(' · ')}</p><small>${can ? `Bringt deiner Firma etwa ${eur(b)} im Monat an Aufträgen (schwankt).` : 'Erst brauchst du eine Firma (Fokus „Eigenes Projekt“).'}</small>
        <div class="btn-row">${x.sale ? `<button class="btn btn-small" data-mk="mOffice" data-buy="1" data-id="${esc(x.id)}" ${dis || !can ? 'disabled' : ''}>Bar kaufen</button><button class="btn btn-small btn-primary" data-mk="mOffice" data-buy="1" data-fin="1" data-id="${esc(x.id)}" ${dis || !can ? 'disabled' : ''}>Mit Kredit kaufen</button>` : `<button class="btn btn-small btn-primary" data-mk="mOffice" data-id="${esc(x.id)}" ${dis || !can ? 'disabled' : ''}>Mieten</button>`}</div></div>`;
    }
    if (x.cat === 'travel') {
      const Wd = window.DULI_LARP_WORLD, T = Wd ? Wd.tripStatus(V, JSON.parse(JSON.stringify(c)), x.days) : null;
      return `<div class="lx-ls lx-trip">${x.last ? '<span class="lx-taken lx-last">Last Minute</span>' : ''}<b>${esc(x.title)}</b><small>${x.days} Tage${x.visa ? ` · Visum ${eur(x.visa)}` : ''}${x.peak ? ' · Hauptsaison (+30 %)' : ''}</small>${T ? `<p class="lx-tripst ${T.ok ? 'ok' : 'bad'}">${esc(T.text)}</p>` : ''}
        <div class="lx-price"><b>${eur(x.price)}</b> <span>Happiness +${x.happy}</span></div>
        <div class="btn-row"><button class="btn btn-small btn-primary" data-mk="mTravel" data-id="${esc(x.id)}" ${!open ? 'disabled' : ''}>Buchen</button></div></div>`;
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
    renderOffers($('#pe-offers'), V, me);
    const ch = $('#pe-chat');
    if (put(ch, V.chat.slice(-60).map((m) => `<p class="${m.ooc ? 'ooc' : ''}" style="--pc:${esc(m.color)}"><b>${esc(m.name)}</b>${m.ooc ? ' <small>(OOC)</small>' : ''}: ${esc(m.t)}${m.doc && AC && AC.byId(m.doc) ? ` <button class="lx-docbtn" data-doc="${esc(m.doc)}">Lernzettel öffnen</button>` : ''} <small>${esc(m.d)}</small></p>`).join('') || '<p class="p-sub">Noch still hier.</p>')) { ch.scrollTop = ch.scrollHeight; ch.querySelectorAll('[data-doc]').forEach((b) => { b.onclick = () => openDoc(b.dataset.doc, V.chars[me]); }); }
    put($('#pe-list'), `<div class="lx-others-full">${V.players.filter((p) => V.chars[p.id]).map((p) => sheet(V, p.id, p.id === me && false)).join('')}</div>`);
  }

  // ----- Angebote zwischen Spielern -----
  const SOC = window.DULI_LARP_SOCIAL;
  const offerDraft = { to: '', kind: '' };
  let seenOffers = null;
  function notifyOffers(V, me) {
    const inc = (V.offers || []).filter((o) => o.to === me && o.status === 'open');
    if (seenOffers === null) { seenOffers = new Set(inc.map((o) => o.id)); return; }
    inc.forEach((o) => { if (!seenOffers.has(o.id)) { seenOffers.add(o.id); toast(`Neues Angebot von ${o.fromName}: ${SOC.KINDS[o.kind].name}`); FX && FX.play('card'); } });
  }
  function offerFields(V, c, t, kind) {
    const f = (id, label, input) => `<label class="field"><span>${label}</span>${input}</label>`;
    const num = (id, v, min = 0) => `<input id="of-${id}" type="number" min="${min}" value="${v}">`;
    switch (kind) {
      case 'perk-fahrschule': return f('discount', 'Rabatt', '<select id="of-discount"><option value="0.25">25 %</option><option value="0.5" selected>50 % (halber Preis)</option><option value="1">gratis</option></select>');
      case 'perk-werkstatt': return f('discount', 'Rabatt', '<select id="of-discount"><option value="0.25">25 %</option><option value="0.5" selected>50 %</option></select>');
      case 'job': return f('jobKind', 'Art', '<select id="of-jobKind"><option value="mini">Minijob (603 €)</option><option value="werk">Werkstudent:in</option><option value="voll">Vollzeit</option></select>') + f('title', 'Titel', '<input id="of-title" maxlength="60" placeholder="z. B. Junior Game Designer">') + f('gross', 'Brutto pro Monat (Vollzeit/Werkstudent)', num('gross', 2800, 1000));
      case 'money': return f('amount', 'Betrag €', num('amount', 100, 1));
      case 'loan': return f('amount', 'Betrag €', num('amount', 1000, 50)) + f('months', 'Monate', num('months', 12, 1)) + f('pm', 'Rate pro Monat € (leer = gleichmäßig)', '<input id="of-pm" type="number" min="1">');
      case 'nachhilfe': case 'lerngruppe': {
        const subs = t && t.abi && t.abi.exams ? Object.keys(t.abi.exams) : [];
        return (subs.length ? f('subj', 'Fach', `<select id="of-subj">${subs.map((k) => `<option value="${k}">${esc(DB.SUBJECTS[k].name)}</option>`).join('')}</select>`) : '') + (kind === 'nachhilfe' ? f('price', 'Preis € (0 = gratis)', num('price', 0)) : '');
      }
      case 'lift': case 'flat': return f('pm', 'Pro Monat € (0 = gratis)', num('pm', 0));
      case 'duel': return f('stat', 'Disziplin', `<select id="of-stat">${Object.entries(SOC.STATS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>`) + f('stake', 'Einsatz €', num('stake', 50));
      case 'sell': return f('what', 'Was', `<select id="of-what">${c.car ? `<option value="car">Auto: ${esc(c.car.brand)} ${esc(c.car.model)}</option>` : ''}${(c.items || []).map((i) => `<option value="item:${esc(i)}">${esc(i)}</option>`).join('')}</select>`) + f('price', 'Preis €', num('price', 100));
      default: return '';
    }
  }
  function renderOffers(el, V, me) {
    const c = V.chars[me];
    if (!el || !c || c.dead) { put(el, ''); return; }
    const others = L.alive(V).filter((p) => p.id !== me);
    const inc = V.offers.filter((o) => o.to === me && o.status === 'open');
    const out = V.offers.filter((o) => o.from === me && o.status === 'open');
    const recent = V.offers.filter((o) => (o.from === me || o.to === me) && o.status !== 'open' && o.round >= V.round - 2).slice(-6).reverse();
    const kinds = Object.entries(SOC.KINDS).filter(([, k]) => !k.ask && (!k.need || k.need(c)));
    if (!offerDraft.to || !others.some((p) => p.id === offerDraft.to)) offerDraft.to = others[0] ? others[0].id : '';
    if (!kinds.some(([k]) => k === offerDraft.kind)) offerDraft.kind = kinds[0][0];
    const t = V.chars[offerDraft.to];
    const contracts = (V.contracts || []).filter((v) => !v.ended && (v.payer === me || v.payee === me));
    const html = `${inc.length ? `<div class="lx-appts"><span class="lb-k">Angebote für dich</span>${inc.map((o) => `<div class="lx-ap"><div class="lx-ap-h"><b>${esc(o.fromName)}</b><span>${esc(SOC.KINDS[o.kind].name)}</span></div><p>${esc(SOC.KINDS[o.kind].text(o))}</p><div class="btn-row"><button class="btn btn-small btn-primary" data-ans="${o.id}" data-yes="1">${SOC.KINDS[o.kind].ask ? 'Ja' : 'Annehmen'}</button><button class="btn btn-small" data-ans="${o.id}">${SOC.KINDS[o.kind].ask ? 'Nein' : 'Ablehnen'}</button></div></div>`).join('')}</div>` : ''}
      ${others.length ? `<div class="lx-panel"><span class="lb-k">Jemandem etwas anbieten <small>max. ${SOC.MAX_OUT} offen</small></span>
        <div class="lx-of-grid"><label class="field"><span>An</span><select id="of-to">${others.map((p) => `<option value="${p.id}" ${p.id === offerDraft.to ? 'selected' : ''}>${esc(V.chars[p.id].name)} (${esc(p.name)})</option>`).join('')}</select></label>
        <label class="field"><span>Was</span><select id="of-kind">${kinds.map(([k, x]) => `<option value="${k}" ${k === offerDraft.kind ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        ${offerFields(V, c, t, offerDraft.kind)}</div>
        <div class="btn-row"><button class="btn btn-primary" id="of-send" ${V.phase === 'act' ? '' : 'disabled'}>Angebot schicken</button></div>
        ${out.length ? `<p class="lx-lbl">Offen</p>${out.map((o) => `<p class="lx-out">${esc(SOC.KINDS[o.kind].name)} an ${esc(o.toName)} <button class="btn btn-small btn-ghost" data-cancel="${o.id}">Zurückziehen</button></p>`).join('')}` : ''}</div>
      <div class="lx-panel"><span class="lb-k">Gemeinheiten</span><div class="lb-inline"><select id="ru-to">${others.map((p) => `<option value="${p.id}">${esc(V.chars[p.id].name)}</option>`).join('')}</select><input id="ru-text" maxlength="120" placeholder="Gerücht, z. B. hat beim Abi gespickt"><button class="btn btn-small" id="ru-go" ${V.phase === 'act' ? '' : 'disabled'}>Gerücht streuen</button></div>
        <small class="p-sub">Charme gegen Charme. Gewinnst du, verliert die Person Macht. Verlierst du, fliegst du auf.</small>
        ${c.flags.partner ? `<div class="btn-row"><button class="btn btn-small btn-ghost" id="bu-go">Schluss machen mit ${esc(c.flags.partner)}</button></div>` : ''}</div>` : '<p class="p-sub">Alleine im Spiel. Angebote gehen nur mit anderen Spielern.</p>'}
      ${contracts.length ? `<div class="lx-panel"><span class="lb-k">Verträge</span>${contracts.map((v) => `<p class="lx-out">${esc(v.title)}: ${v.payer === me ? '−' : '+'}${eur(v.pm)}/Monat${v.left != null ? ` · noch ${v.left} Raten` : ''}${v.missed ? ` · ${v.missed}× nicht gezahlt` : ''}</p>`).join('')}</div>` : ''}
      ${recent.length ? `<div class="lx-panel"><span class="lb-k">Zuletzt</span>${recent.map((o) => `<p class="lx-out">${esc(o.fromName)} → ${esc(o.toName)}: ${esc(SOC.KINDS[o.kind].name)} · <b class="${o.status === 'accepted' ? 'up' : 'down'}">${({ accepted: 'angenommen', declined: 'abgelehnt', expired: 'verfallen', cancelled: 'zurückgezogen' })[o.status]}</b></p>`).join('')}</div>` : ''}`;
    if (!put(el, html)) return;
    el.querySelectorAll('[data-ans]').forEach((b) => { b.onclick = () => act({ type: 'oAnswer', id: b.dataset.ans, yes: !!b.dataset.yes }); });
    el.querySelectorAll('[data-cancel]').forEach((b) => { b.onclick = () => act({ type: 'oCancel', id: b.dataset.cancel }); });
    const to = $('#of-to', el), kind = $('#of-kind', el);
    if (to) to.onchange = () => { offerDraft.to = to.value; el._html = null; redraw(); };
    if (kind) kind.onchange = () => { offerDraft.kind = kind.value; el._html = null; redraw(); };
    const v = (id) => { const x = $(`#of-${id}`, el); return x ? x.value : undefined; };
    if ($('#of-send', el)) $('#of-send', el).onclick = () => {
      const terms = { discount: v('discount'), jobKind: v('jobKind'), title: v('title'), gross: Number(v('gross')), amount: Number(v('amount')), months: Number(v('months')), pm: v('pm') ? Number(v('pm')) : undefined, subj: v('subj'), price: Number(v('price')), stat: v('stat'), stake: Number(v('stake')) };
      const w = v('what'); if (w) { if (w === 'car') terms.what = 'car'; else { terms.what = 'item'; terms.item = w.slice(5); } }
      act({ type: 'oOffer', to: offerDraft.to, kind: offerDraft.kind, terms });
    };
    if ($('#ru-go', el)) $('#ru-go', el).onclick = () => act({ type: 'oRumor', to: $('#ru-to', el).value, text: $('#ru-text', el).value });
    if ($('#bu-go', el)) $('#bu-go', el).onclick = () => { if (confirm('Wirklich Schluss machen?')) act({ type: 'oBreakup' }); };
  }
  function sceneHTML(V, me) {
    const sc = V.scene;
    if (!sc || sc.done || !sc.players.includes(me) || V.phase !== 'act') return '';
    const other = V.chars[sc.players.find((x) => x !== me)];
    const mine = sc.choices[me];
    return `<div class="lb-card kind-absurd lx-scene"><span class="lb-k">Gemeinsame Szene mit ${esc(other ? other.name : '?')} · geheime Wahl</span><p class="lb-card-t">${esc(sc.text)}</p>
      <div class="lb-opts">${sc.opts.map((o, i) => `<button type="button" class="lb-opt ${mine === i ? 'is-picked' : ''}" data-scene="${i}" style="--odds:0%"><b>${esc(o)}</b><span class="lb-odds">${mine === i ? 'gewählt' : ''}</span></button>`).join('')}</div>
      <small class="p-sub">${esc(other ? other.name : '')} entscheidet auch. Was rauskommt, hängt von euch beiden ab.</small></div>`;
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
    const Lf = window.L, layer = skel.layer, Wd = window.DULI_LARP_WORLD;
    const awayOf = (c) => (c.away && V.round < c.away.until && Number.isFinite(c.away.lat) ? c.away : null);
    const key = JSON.stringify([V.round, V.phase, V.players.map((p) => { const c = V.chars[p.id]; return c ? [c.home, awayOf(c), c.props.length, (c.offices || []).length, (c.places || []).length, c.edu.school && c.edu.school.name, c.dead] : 0; })]);
    if (skel.mapKey === key) return;
    skel.mapKey = key;
    layer.clearLayers();
    skel.anim = skel.anim || {};
    const pts = [];
    const canGo = V.phase === 'act' && V.chars[me] && !V.chars[me].dead;
    V.players.forEach((p) => {
      const c = V.chars[p.id];
      if (!c || c.dead || !c.home) return;
      const away = awayOf(c), at = away || c.home;
      pts.push([at.lat, at.lng]);
      // Zuhause bleibt als kleiner Punkt sichtbar, die Figur steht da, wo sie gerade ist
      if (away) {
        Lf.circleMarker([c.home.lat, c.home.lng], { radius: 4, color: c.color, weight: 2, fillOpacity: 0.2 }).bindTooltip(`${esc(c.name)} wohnt hier`).addTo(layer);
        Lf.polyline([[c.home.lat, c.home.lng], [away.lat, away.lng]], { color: c.color, weight: 2, dashArray: '6 8', opacity: 0.8 }).addTo(layer);
      }
      const mk = Lf.marker([at.lat, at.lng], { icon: Lf.divIcon({ className: 'lx-me', html: `<span class="${p.id === me ? 'mine' : ''}" style="--pc:${esc(c.color)}">${esc(c.name[0])}</span>${away ? `<i class="lx-away" style="--pc:${esc(c.color)}">${esc(away.kind === 'trip' ? 'auf Reise' : 'unterwegs')}</i>` : ''}`, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: p.id === me ? 1000 : 500 })
        .bindTooltip(`${esc(c.name)} · ${esc(away ? away.label : c.home.label)}`, { direction: 'top' }).addTo(layer);
      if (canGo && p.id !== me) mk.bindPopup(`<b>${esc(c.name)}</b><br>${esc(away ? away.label : c.home.label)}<br><button class="btn btn-small btn-primary lx-gobtn" data-lat="${at.lat}" data-lng="${at.lng}" data-label="${esc(away ? away.city : c.home.city || '')}">Besuchen</button>`);
      // Reise-Animation: einmal von zu Hause zum Ziel gleiten
      const ak = `${p.id}:${away ? away.until + away.label : ''}`;
      if (away && !skel.anim[ak]) {
        skel.anim[ak] = 1;
        const t0 = performance.now(), dur = 1800, a0 = [c.home.lat, c.home.lng], a1 = [away.lat, away.lng];
        mk.setLatLng(a0);
        const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; mk.setLatLng([a0[0] + (a1[0] - a0[0]) * e, a0[1] + (a1[1] - a0[1]) * e]); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
        if (p.id === me) skel.map.flyToBounds([a0, a1], { padding: [40, 40], maxZoom: 9, duration: 1.2 });
      }
      if (c.edu.school && c.edu.school.lat) Lf.marker([c.edu.school.lat, c.edu.school.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">S</span>`, iconSize: [22, 22] }) }).bindTooltip(`${esc(c.name)}: ${esc(c.edu.school.name)}`).addTo(layer);
      c.props.forEach((q) => { Lf.marker([q.lat, q.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">${q.kind === 'house' ? '⌂' : '▤'}</span>`, iconSize: [22, 22] }) }).bindTooltip(`${esc(c.name)}: ${esc(q.title || q.label)}`).addTo(layer); });
      (c.places || []).forEach((o) => { Lf.marker([o.lat, o.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">P</span>`, iconSize: [22, 22] }) }).bindTooltip(`${esc(c.name)}: ${esc(o.name)}`).addTo(layer); });
      (c.offices || []).forEach((o) => { Lf.marker([o.lat, o.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">B</span>`, iconSize: [22, 22] }) }).bindTooltip(`${esc(c.name)}: Büro ${esc(o.title)}, ${esc(o.label)}`).addTo(layer); });
    });
    if (!skel.fitted && pts.length > 1) { skel.map.fitBounds(pts, { padding: [30, 30], maxZoom: 10 }); skel.fitted = true; }
    // Klick auf die Karte: Ausflug dorthin
    if (!skel.clickBound) {
      skel.clickBound = true;
      skel.map.on('click', (e) => {
        const V2 = last && last.V, c = V2 && V2.chars[last.me];
        if (!V2 || V2.phase !== 'act' || !c || c.dead) return;
        const d = Wd ? Math.round(Wd.km(c.home, { lat: e.latlng.lat, lng: e.latlng.lng })) : 0;
        const trip = c.away && c.away.kind === 'trip' && V2.round < c.away.until;
        const done = c.flags.goAt === V2.round || trip;
        Lf.popup().setLatLng(e.latlng).setContent(`<b>Ausflug hierhin?</b><br>${d} km von zu Hause · ${d > 900 ? 'Flug' : c.car && c.license.has ? 'mit dem Auto' : d < 25 ? 'Bus und Bahn' : 'Zug'}<br>${done ? `<small>${trip ? `Du bist gerade in ${esc(c.away.city)}.` : 'Diese Runde warst du schon unterwegs.'}</small>` : `<button class="btn btn-small btn-primary lx-gobtn" data-lat="${e.latlng.lat}" data-lng="${e.latlng.lng}" data-label="">Hinfahren</button>`}`).openOn(skel.map);
      });
      skel.map.on('popupopen', (ev) => {
        const b = ev.popup.getElement() && ev.popup.getElement().querySelector('.lx-gobtn');
        if (b) b.onclick = () => { act({ type: 'wGo', lat: Number(b.dataset.lat), lng: Number(b.dataset.lng), label: b.dataset.label || '' }); skel.map.closePopup(); };
      });
    }
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
    // Awards: wer war in was die oder der Beste?
    const pcs = V.players.filter((p) => V.chars[p.id]).map((p) => V.chars[p.id]);
    const award = (title, fn, fmt) => { const best = pcs.map((c) => [c, fn(c)]).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1])[0]; return best ? `<li style="--pc:${esc(best[0].color)}"><span>${esc(title)}</span><b>${esc(best[0].name)}</b><small>${esc(fmt(best[1], best[0]))}</small></li>` : ''; };
    const topSkill = (c) => Object.entries(c.skills || {}).filter(([k]) => k !== 'Bekanntheit').sort((x, y) => y[1] - x[1])[0];
    const awards = [
      award('Reichste Person', (c) => c.stats.money, (v) => eur(v)),
      award('Größte Firma', (c) => (c.firm ? c.firm.staff.length + 1 : 0), (v, c) => `${c.firm.name}, ${v} Leute`),
      award('Bekannteste Person', (c) => (c.skills || {}).Bekanntheit || 0, (v) => `Bekanntheit ${Math.round(v)}`),
      award('Größtes Talent', (c) => (topSkill(c) || [0, 0])[1], (v, c) => `${topSkill(c)[0]} ${Math.round(v)}`),
      award('Meiste Skills', (c) => Object.keys(c.skills || {}).length, (v) => `${v} Skills`),
      award('Meiste Lizenzen', (c) => (c.certs || []).length, (v) => `${v} Lizenzen`),
      award('Weltenbummler:in', (c) => c.flags.trips || 0, (v) => `${v} Reisen`),
      award('Glücklichste Person', (c) => c.stats.happy, (v) => `Happiness ${v}`),
      award('Längstes Vorstrafenregister', (c) => c.flags.crime || 0, (v) => `${v} Verurteilung${v > 1 ? 'en' : ''}`),
    ].join('');
    root.innerHTML = `<div class="lb-over"><div class="p-hero"><p class="sec-label"><span class="n">ENDE</span>${esc(L.dateText(V))}</p><h1 class="p-title">Lebens<span class="outline">bilanz</span></h1>
      ${ranked.length > 1 && V.chars[ranked[0].id] ? `<p class="p-lead">Bestes Leben: <b>${esc(V.chars[ranked[0].id].name)}</b> (${esc(ranked[0].name)})</p>` : ''}</div>${awards ? `<ul class="lx-awards">${awards}</ul>` : ''}<div class="lb-finals">${cards}</div>
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
    min: 1, max: 6, soloBots: 0, noBots: false, botNames: ['Bot Deniz', 'Bot Lea', 'Bot Jonas', 'Bot Aylin', 'Bot Kevin'], soloLabel: 'Alleine spielen', soloChip: 'Alleine',
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
      <li>In der <b>Akademie</b> gibt es Prüfungen für fast alles: Pilot, Polizei, Bundeswehr, Rettungsdienst, Motorrad, Tauchen … April schickt dir einen Lernzettel.</li>
      <li><b>Weltweit</b>: im Ausland studieren (IELTS, Visum), auswandern, reisen.</li>
      <li>Jede Runde gibt es ein <b>Ereignis</b> mit Würfelprobe. Am Ende zählt das beste Leben. In der Lobby kann der Host <b>Bots</b> dazuholen.</li></ul></div>`,
    engine: L, render,
    onCustom: (d) => { if (d && d.kind === 'voice' && d.audio) AI.play(d.audio); },
  });
})();
