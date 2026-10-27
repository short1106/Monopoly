// DULIDAN – Spiel des Lebens: Oberfläche (Figurenwahl, eigene Figuren, Werte, Karte, Aprils Erzählung)
// Der Host ruft hier auch April (Claude) und ihre Stimme auf und schickt die Stimme an alle.
(function () {
  const L = window.DULI_LEBEN, D = window.DULI_LEBEN_DECK, AI = window.DULI_LEBEN_AI, FX = window.DULI_FX, esc = window.DULI_PARTY.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const CHAR_STORE = 'duli-leben-chars';
  const eur = L.eur;
  const STAT_NAMES = { health: 'Gesundheit', money: 'Geld', power: 'Macht', happy: 'Happiness' };
  const ERRORS = {
    nokey: 'Kein Anthropic-Schlüssel eingetragen. Oben auf „KI & Stimme“ und Schlüssel eintragen.',
    badkey: 'Der Anthropic-Schlüssel stimmt nicht (401). Bitte unter „KI & Stimme“ prüfen.',
    ratelimit: 'Zu viele Anfragen oder kein Guthaben mehr beim Anthropic-Konto (429). Kurz warten oder Guthaben prüfen.',
    badrequest: 'Die Anfrage wurde abgelehnt (400). Vielleicht ist das Modell für deinen Schlüssel nicht freigeschaltet – anderes Modell wählen.',
    network: 'Keine Verbindung zu Claude. Internet prüfen und nochmal versuchen.',
    refusal: 'April wollte diese Runde nicht erzählen. Nochmal versuchen oder ohne April weiter.',
    toolong: 'Aprils Antwort war zu lang und wurde abgeschnitten. Nochmal versuchen.',
    badjson: 'Aprils Antwort war kaputt. Nochmal versuchen.',
  };

  let last = null; // { root, V, me, api } – zum Neuzeichnen ohne neuen Spielstand
  let skel = null; // Gerüst des Hauptbildschirms (Karte bleibt erhalten)
  let aiRun = null, aiErr = null, forcedFor = null, spoken = 0, lastPhaseKey = '';
  let draft = '', quiz = null, builder = {}, tick = null, app = null;

  // ---------- Eigene Figuren (auf diesem Gerät) ----------
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(CHAR_STORE)) || []; } catch (e) { return []; } },
    set(list) { try { localStorage.setItem(CHAR_STORE, JSON.stringify(list)); return true; } catch (e) { return false; } },
  };
  const encode = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const decode = (s) => JSON.parse(decodeURIComponent(escape(atob(String(s).trim()))));
  function shrinkImage(file) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'), n = 96, k = Math.min(img.width, img.height);
        c.width = c.height = n;
        c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n);
        res(c.toDataURL('image/jpeg', 0.7));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => res(null);
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- OpenStreetMap (Nominatim) ----------
  async function reverse(lat, lng) {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=de`);
    if (!r.ok) throw new Error('nominatim');
    const j = await r.json();
    const a = j.address || {};
    const city = a.city || a.town || a.village || a.municipality || a.county || '';
    const type = a.city ? 'city' : a.town ? 'town' : 'village';
    const street = [a.road || a.pedestrian || a.footway || '', a.house_number || ''].filter(Boolean).join(' ');
    const label = [street, city].filter(Boolean).join(', ') || String(j.display_name || 'Unbekannter Ort').split(',').slice(0, 2).join(',');
    return { label, place: { city, type, country: a.country_code || 'de' } };
  }
  async function search(q) {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=de&q=${encodeURIComponent(q)}`);
    const j = await r.json();
    if (!j[0]) return null;
    return { label: String(j[0].name || j[0].display_name.split(',')[0]), lat: Number(j[0].lat), lng: Number(j[0].lon) };
  }

  // ---------- Prüfungs-Quiz ----------
  const EXAM_Q = [
    { q: 'Was ist die Ableitung von x²?', a: ['2x', 'x', '2', 'x³/3'] },
    { q: 'Wann begann der Zweite Weltkrieg in Europa?', a: ['1939', '1914', '1945', '1933'] },
    { q: 'Wie viele Bundesländer hat Deutschland?', a: ['16', '14', '12', '18'] },
    { q: 'Wer wählt in Deutschland den Bundeskanzler?', a: ['Der Bundestag', 'Das Volk direkt', 'Der Bundesrat', 'Der Bundespräsident allein'] },
    { q: 'Was ist das chemische Symbol für Natrium?', a: ['Na', 'N', 'So', 'Nt'] },
    { q: 'Was ist 15 % von 240?', a: ['36', '24', '30', '40'] },
    { q: 'Welches Organell ist das „Kraftwerk“ der Zelle?', a: ['Mitochondrium', 'Ribosom', 'Zellkern', 'Golgi-Apparat'] },
    { q: 'Wer schrieb „Faust“?', a: ['Goethe', 'Schiller', 'Kafka', 'Brecht'] },
    { q: 'Was bedeutet „BIP“?', a: ['Bruttoinlandsprodukt', 'Bundesinvestitionsplan', 'Basis-Index-Preis', 'Brutto-Import-Posten'] },
    { q: 'Welche Einheit hat die elektrische Spannung?', a: ['Volt', 'Ampere', 'Ohm', 'Watt'] },
    { q: 'In welchem Jahr fiel die Berliner Mauer?', a: ['1989', '1990', '1961', '1991'] },
    { q: 'Wie lautet der Satz des Pythagoras?', a: ['a² + b² = c²', 'a + b = c', 'a² − b² = c', 'c² = a · b'] },
    { q: 'Was ist das Passiv von „Er schreibt den Brief“?', a: ['Der Brief wird von ihm geschrieben.', 'Er hat den Brief geschrieben.', 'Der Brief schreibt er.', 'Er wird den Brief schreiben.'] },
    { q: 'Welche Gewalt übt ein Gericht aus?', a: ['Judikative', 'Exekutive', 'Legislative', 'Föderative'] },
    { q: 'Wie viel ist log₁₀(1000)?', a: ['3', '10', '100', '30'] },
    { q: 'Was ist der Hauptbestandteil der Luft?', a: ['Stickstoff', 'Sauerstoff', 'Kohlendioxid', 'Argon'] },
    { q: 'Welche Stadt ist die Hauptstadt von NRW?', a: ['Düsseldorf', 'Köln', 'Duisburg', 'Dortmund'] },
    { q: 'Wie heißt das englische Simple Past von „go“?', a: ['went', 'gone', 'goed', 'going'] },
  ];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  async function loadQuiz() {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch('https://opentdb.com/api.php?amount=5&type=multiple&encode=url3986', { signal: ctl.signal });
      const j = await r.json();
      if (j.response_code === 0 && Array.isArray(j.results) && j.results.length === 5) {
        const dec = (x) => decodeURIComponent(x);
        return j.results.map((x) => ({ q: dec(x.question), a: [dec(x.correct_answer), ...x.incorrect_answers.map(dec)], src: 'opentdb' }));
      }
    } catch (e) { /* eigene Fragen */ } finally { clearTimeout(t); }
    return shuffle(EXAM_Q).slice(0, 5);
  }

  // ---------- Aprils Stimme ----------
  function voiceText(V, task) {
    const parts = [];
    if (V.world[0] && V.world[0].d === L.dateText(V)) parts.push(V.world[0].t);
    if (task === 'final') V.players.forEach((p) => { const f = V.finals[p.id]; if (f) parts.push(`${p.name}. ${f.title ? f.title + '. ' : ''}${f.story}`); });
    else L.alive(V).forEach((p) => { if (V.stories[p.id]) parts.push(`${p.name}. ${V.stories[p.id]}`); });
    return parts.join('\n\n');
  }
  async function voiceFor(seq) {
    const V = last && last.V;
    if (!V || spoken === seq) return;
    spoken = seq;
    const buf = await AI.speak(voiceText(V, V.phase === 'over' ? 'final' : 'resolve'));
    paintVoiceChip();
    if (!buf) return;
    AI.play(buf);
    last.api.broadcast({ kind: 'voice', seq, audio: buf });
  }
  function paintVoiceChip() {
    const c = $('#lb-voice');
    if (!c) return;
    const k = AI.keys();
    c.hidden = !(last && last.api.isHost && k.eleven && k.voice && AI.voice.paused);
  }

  // ---------- Host: April aufrufen ----------
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
  function redraw() { if (app && app.refresh) app.refresh(); }

  // ---------- Darstellung ----------
  function render(root, V, me, api) {
    if (!V) return;
    last = { root, V, me, api };
    const mine = V.chars[me];
    const canRejoin = V.phase === 'act' && V.settings.death === 'rejoin' && (!mine || mine.dead);
    clearInterval(tick);
    if (V.phase === 'pick' || canRejoin) { killSkel(); renderPick(root, V, me, api); }
    else if (V.phase === 'over') { killSkel(); renderOver(root, V, me, api); }
    else renderMain(root, V, me, api);
    // Ton, wenn eine neue Runde losgeht
    const pk = `${V.phase}|${V.aiSeq}`;
    if (pk !== lastPhaseKey && V.phase === 'act' && lastPhaseKey && FX) {
      const ck = V.checks[me];
      FX.play(ck && V.round > 0 ? (ck.success ? 'coinUp' : 'coinDown') : 'turn');
      // Neue Runde: nach oben, damit man Ergebnis und Ereignis sieht
      if (V.round > 0 && innerWidth < 1100) { const st = root.querySelector('.lb-stage'); if (st) st.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (window.DULI_VOICE && V.gm !== 'ai' && ck && (ck.roll === 20 || ck.roll === 1)) window.DULI_VOICE.say(ck.roll === 20 ? 'win' : 'loss');
    }
    if (pk !== lastPhaseKey && V.phase === 'act' && V.gm !== 'ai' && api.isHost && V.round > 0) voiceFor(V.aiSeq);
    lastPhaseKey = pk;
    controller(V, api);
  }
  function killSkel() { if (skel) { try { skel.map.remove(); } catch (e) { /* weg */ } skel = null; } }
  const put = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; return true; } return false; };
  const para = (t) => String(t || '').split(/\n+/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');

  // ----- Figurenwahl -----
  function charCard(c, extra) {
    return `<div class="lb-cc" style="--pc:${esc(c.color || '#ffd83a')}">${c.img ? `<img class="lb-av" src="${esc(c.img)}" alt="">` : `<span class="lb-av lb-av-x">${esc((c.name || '?')[0])}</span>`}
      <div class="lb-cc-b"><strong>${esc(c.name)}</strong><small>${esc(c.age)} · ${esc(c.home ? c.home.label : '')}</small>
      <p><b>Bonus:</b> ${esc(c.bonus || '–')}</p><p><b>Schwäche:</b> ${esc(c.weakness || '–')}</p>${extra || ''}</div></div>`;
  }
  function renderPick(root, V, me, api) {
    aiErr = null;
    const takenBy = {};
    Object.entries(V.chars).forEach(([pid, c]) => { if (!c.dead && c.key !== 'custom') takenBy[c.key] = pid; });
    const pName = (pid) => (V.players.find((p) => p.id === pid) || {}).name || '?';
    const mine = V.chars[me];
    const rejoin = V.phase === 'act';
    // Gerüst einmal bauen, damit das Formular beim Neuzeichnen nicht leer wird
    if (!root.querySelector('.lb-pick')) {
      builder = {};
      root.innerHTML = `<div class="lb-pick"><div class="p-card lb-pick-head" id="pk-head"></div>
        <h3 class="lb-h">Figuren</h3><div class="lb-grid" id="pk-pre"></div>
        <h3 class="lb-h">Deine eigenen Figuren <small>gespeichert auf diesem Gerät</small></h3><div class="lb-grid" id="pk-own"></div>
        <div class="p-card lb-build">
          <h3>Eigene Figur bauen</h3>
          <div class="lb-form">
            <label class="field"><span>Name</span><input id="bf-name" maxlength="24"></label>
            <label class="field"><span>Alter</span><input id="bf-age" type="number" min="14" max="60" value="18"></label>
            <label class="field lb-span"><span>Startort (Stadt oder Ort)</span><div class="lb-inline"><input id="bf-home" placeholder="z. B. Öhringen"><button class="btn btn-small" id="bf-find" type="button">Suchen</button></div><small id="bf-home-res" class="p-sub"></small></label>
            <label class="field"><span>Job / Schule</span><input id="bf-job" maxlength="80" placeholder="Schülerin (Abi)"></label>
            <label class="field"><span>Ausbildung</span><input id="bf-edu" maxlength="60" placeholder="Abitur läuft"></label>
            <label class="field lb-span"><span>Wohnsituation</span><input id="bf-living" maxlength="80" placeholder="wohnt bei den Eltern"></label>
            <label class="field lb-span"><span>Bonus (Stärke)</span><input id="bf-bonus" maxlength="200" placeholder="z. B. kann jeden überreden"></label>
            <label class="field lb-span"><span>Schwäche</span><input id="bf-weak" maxlength="200" placeholder="z. B. kann kein Geld halten"></label>
            <label class="field lb-span"><span>Über die Figur (für April)</span><textarea id="bf-about" maxlength="300" rows="3" placeholder="Was April über die Figur wissen soll"></textarea></label>
            <label class="field"><span>Bild (optional, bleibt auf dem Gerät)</span><input id="bf-img" type="file" accept="image/*"></label>
          </div>
          <div class="btn-row"><button class="btn btn-primary" id="bf-save">Figur speichern</button></div>
          <div class="lb-inline lb-import"><input id="bf-code" placeholder="Figuren-Code einfügen"><button class="btn btn-small" id="bf-imp">Importieren</button></div>
        </div></div>`;
      $('#bf-find').onclick = async () => {
        const q = $('#bf-home').value.trim();
        if (!q) return;
        $('#bf-home-res').textContent = 'Suche …';
        try { const r = await search(q); builder.home = r; $('#bf-home-res').textContent = r ? `Gefunden: ${r.label} (${r.lat.toFixed(3)}, ${r.lng.toFixed(3)})` : 'Nichts gefunden. Ohne Treffer startet die Figur in Duisburg.'; } catch (e) { $('#bf-home-res').textContent = 'Suche geht gerade nicht. Ohne Treffer startet die Figur in Duisburg.'; }
      };
      $('#bf-home').oninput = () => { builder.home = null; $('#bf-home-res').textContent = ''; };
      $('#bf-img').onchange = async (e) => { const f = e.target.files[0]; builder.img = f ? await shrinkImage(f) : null; };
      $('#bf-save').onclick = () => {
        const name = $('#bf-name').value.trim();
        if (!name) return api.toast('Gib der Figur einen Namen.');
        const home = builder.home || { label: $('#bf-home').value.trim() || 'Duisburg', lat: 51.4344, lng: 6.7623 };
        const c = { name, age: Number($('#bf-age').value) || 18, home, job: $('#bf-job').value.trim(), education: $('#bf-edu').value.trim(), living: $('#bf-living').value.trim(),
          bonus: $('#bf-bonus').value.trim(), weakness: $('#bf-weak').value.trim(), about: $('#bf-about').value.trim(), img: builder.img || null, active: true,
          color: ['#ffd83a', '#ff7a2a', '#3ce08a', '#3ad1ff', '#ff3d5e'][store.get().length % 5] };
        const l = store.get(); l.push(c);
        if (!store.set(l)) { delete c.img; store.set(l); }
        builder = {};
        root.querySelectorAll('.lb-build input, .lb-build textarea').forEach((x) => { x.value = x.id === 'bf-age' ? '18' : ''; });
        $('#bf-home-res').textContent = '';
        last.api.toast(`${name} gespeichert.`);
        redraw();
      };
      $('#bf-imp').onclick = () => {
        try {
          const c = decode($('#bf-code').value);
          if (!c || !c.name) throw new Error('leer');
          const l = store.get(); l.push(Object.assign({}, c, { active: true })); store.set(l);
          $('#bf-code').value = '';
          last.api.toast(`${c.name} importiert.`); redraw();
        } catch (e) { last.api.toast('Der Code ist kaputt.'); }
      };
    }
    const who = V.players.map((p) => { const c = V.chars[p.id]; return `<li style="--pc:${p.color}"><span class="p-dot"></span><strong>${esc(p.name)}</strong><small>${c ? (c.dead ? `${esc(c.name)} (tot)` : esc(c.name)) : 'wählt noch …'}</small></li>`; }).join('');
    const allPicked = V.players.every((p) => V.chars[p.id]);
    if (put($('#pk-head'), `<p class="sec-label"><span class="n">${rejoin ? 'NEUES LEBEN' : 'FIGUREN'}</span>Spiel des Lebens</p>
        <h2>${rejoin ? (mine ? `${esc(mine.name)} ist tot. Such dir ein neues Leben aus.` : 'Such dir eine Figur aus und steig ein.') : 'Wer bist du in diesem Leben?'}</h2>
        ${rejoin && mine ? `<p class="lb-dead">${esc(mine.deathReason || '')}</p>` : ''}
        <ul class="p-players">${who}</ul>
        ${!rejoin && api.isHost ? `<div class="btn-row"><button class="btn btn-primary" id="lb-begin" ${allPicked ? '' : 'disabled'}>Leben starten</button></div>` : !rejoin ? '<p class="p-wait">Wenn alle eine Figur haben, startet der Host.</p>' : ''}
        ${mine && !mine.dead && !rejoin ? `<p class="p-sub">Du spielst <b>${esc(mine.name)}</b>. Bis zum Start kannst du noch wechseln.</p>` : ''}`)) {
      if ($('#lb-begin')) $('#lb-begin').onclick = () => last.api.act({ type: 'begin', ai: !!AI.keys().anthropic });
    }
    const presets = Object.values(L.PRESETS).map((c) => {
      const t = takenBy[c.key];
      const btn = t ? `<span class="lb-taken">${t === me ? 'deine Figur' : `${esc(pName(t))} spielt sie`}</span>` : `<button class="btn btn-small btn-primary" data-pick="${c.key}">Spielen</button>`;
      return charCard(c, `<div class="btn-row">${btn}</div>`);
    }).join('');
    if (put($('#pk-pre'), presets)) root.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => last.api.act({ type: 'pick', char: { key: b.dataset.pick } }); });
    const list = store.get();
    const act = list.filter((c) => c.active !== false), off = list.filter((c) => c.active === false);
    const ownCard = (c) => { const i = list.indexOf(c); return charCard(c, `<div class="btn-row">${c.active !== false ? `<button class="btn btn-small btn-primary" data-own="${i}">Spielen</button>` : ''}
      <button class="btn btn-small btn-ghost" data-tog="${i}">${c.active !== false ? 'Deaktivieren' : 'Aktivieren'}</button>
      <button class="btn btn-small btn-ghost" data-exp="${i}">Code</button><button class="btn btn-small btn-ghost" data-del="${i}">Löschen</button></div>`); };
    const ownHTML = (act.map(ownCard).join('') || '<p class="p-sub">Noch keine aktive eigene Figur. Bau dir unten eine.</p>')
      + (off.length ? `<details class="lb-off"><summary>Deaktiviert (${off.length})</summary><div class="lb-grid">${off.map(ownCard).join('')}</div></details>` : '');
    if (put($('#pk-own'), ownHTML)) {
      const own = $('#pk-own');
      own.querySelectorAll('[data-own]').forEach((b) => { b.onclick = () => { const c = store.get()[b.dataset.own]; if (c) last.api.act({ type: 'pick', char: Object.assign({}, c, { key: 'custom' }) }); }; });
      own.querySelectorAll('[data-tog]').forEach((b) => { b.onclick = () => { const l = store.get(); const c = l[b.dataset.tog]; c.active = c.active === false; store.set(l); redraw(); }; });
      own.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { const l = store.get(); if (!confirm(`${l[b.dataset.del].name} löschen?`)) return; l.splice(b.dataset.del, 1); store.set(l); redraw(); }; });
      own.querySelectorAll('[data-exp]').forEach((b) => {
        b.onclick = () => {
          const c = Object.assign({}, store.get()[b.dataset.exp]); delete c.img; delete c.active;
          const code = encode(c);
          navigator.clipboard.writeText(code).then(() => last.api.toast('Figuren-Code kopiert. Andere können ihn importieren.'), () => prompt('Figuren-Code:', code));
        };
      });
    }
  }

  // ----- Hauptbildschirm -----
  // Mitte: Ergebnis der letzten Runde und das neue Ereignis. Links: deine Figur. Rechts: Karte und die anderen.
  function ensureSkel(root, V, me) {
    if (skel && root.contains(skel.el)) return;
    killSkel();
    root.innerHTML = `<div class="lb-main"><aside class="lb-left" id="lb-left"></aside>
      <section class="lb-stage"><div id="lb-head"></div><div id="lb-err"></div><div id="lb-story"></div><div id="lb-quiz"></div><div id="lb-input"></div><div id="lb-who"></div><div id="lb-more"></div></section>
      <aside class="lb-right"><div class="lb-mapbox"><div class="lb-map" id="lb-map"></div><p class="lb-maphint">Klick auf die Karte: dort mieten, kaufen oder hinziehen.</p></div><div id="lb-others"></div></aside></div>`;
    const el = root.querySelector('.lb-main');
    const map = window.L.map($('#lb-map', el), { worldCopyJump: true, zoomControl: true }).setView([50.6, 9], 6);
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende' }).addTo(map);
    const layer = window.L.layerGroup().addTo(map);
    skel = { el, map, layer, fitted: false };
    map.on('click', (e) => onMapClick(e.latlng));
    setTimeout(() => map.invalidateSize(), 50);
    const c = V.chars[me];
    if (c && c.home) map.setView([c.home.lat, c.home.lng], 11);
  }
  function bar(k, v) { return `<div class="lb-bar lb-${k}"><span>${STAT_NAMES[k]}</span><i style="--v:${Math.max(0, Math.min(100, v))}%"></i><b>${v}</b></div>`; }
  function fx(e) {
    const p = [];
    if (e.money) p.push(`<b class="${e.money > 0 ? 'up' : 'down'}">${e.money > 0 ? '+' : ''}${eur(e.money)}</b>`);
    const perYear = e.yr && last && L.months(last.V) !== 12 ? '/Jahr' : '';
    ['health', 'happy', 'power'].forEach((k) => { if (e[k]) p.push(`<b class="${e[k] > 0 ? 'up' : 'down'}">${STAT_NAMES[k]} ${e[k] > 0 ? '+' : ''}${e[k]}${perYear}</b>`); });
    return p.join(' ') || '<b>±0</b>';
  }
  function goalLine(c) {
    const G = D && D.GOALS[c.goal];
    if (!G) return '';
    const done = G.test(c, D.netWorth(c));
    return `<p class="lb-goal ${done ? 'done' : ''}"><span>Lebensziel</span><b>${esc(G.name)}</b>${done ? '<i>erreicht</i>' : ''}</p>`;
  }
  function sheet(V, pid, mine) {
    const c = V.chars[pid], p = V.players.find((x) => x.id === pid);
    if (!c) return '';
    const head = `<div class="lb-sh-head" style="--pc:${esc(c.color)}">${c.img ? `<img class="lb-av" src="${esc(c.img)}" alt="">` : `<span class="lb-av lb-av-x">${esc(c.name[0])}</span>`}
      <div><strong>${esc(c.name)}</strong>${c.title ? `<em>${esc(c.title)}</em>` : ''}<small>${esc(p ? p.name : '')} · ${c.age} Jahre${c.dead ? ' · tot' : ''}</small></div></div>`;
    const money = `<div class="lb-money ${c.stats.money < 0 ? 'neg' : ''}"><span>Geld</span><b>${eur(c.stats.money)}</b></div>`;
    const bars = bar('health', c.stats.health) + bar('happy', c.stats.happy) + bar('power', c.stats.power);
    if (!mine) {
      const r = V.recap && V.recap[pid];
      return `<div class="lb-sheet lb-other ${c.dead ? 'is-dead' : ''}" style="--pc:${esc(c.color)}">${head}${money}${bars}<p class="lb-line">${esc(c.job)} · ${esc(c.location || '')}</p>${r && Object.keys(r).length ? `<div class="lb-deltas sm">${fx(r)}</div>` : ''}${c.dead ? `<p class="lb-dead">${esc(c.deathReason || '')}</p>` : ''}</div>`;
    }
    const per = L.STEPS[V.settings.step].name;
    const eff = c.effects.length ? c.effects.map((e) => `<li><span>${esc(e.name)}${e.until ? ` <small>noch ${e.until - V.round} R.</small>` : ''}</span>${fx(e)}</li>`).join('') : '<li><span>keine</span></li>';
    const sum = c.effects.reduce((a, e) => a + e.money, 0);
    const props = c.props.map((q) => `<li><span><b>${esc(L.KINDS[q.kind].name)}</b> ${esc(q.label)}<small>Wert ${eur(q.value)}${q.leased ? ' · vermietet' : ''}</small></span>
      <span class="btn-row">${q.kind !== 'plot' ? `<button class="btn btn-small btn-ghost" data-move="${q.id}">Einziehen</button><button class="btn btn-small btn-ghost" data-lease="${q.id}">${q.leased ? 'Vermietung beenden' : 'Vermieten'}</button>` : ''}<button class="btn btn-small btn-ghost" data-sell="${q.id}">Verkaufen</button><button class="btn btn-small btn-ghost" data-fly="${q.lat},${q.lng}">Karte</button></span></li>`).join('');
    const rel = c.relations.map((r) => `<li><span>${esc(r.name)} <small>${esc(r.kind || '')}</small></span><i class="lb-rel" style="--v:${r.val}%"></i></li>`).join('');
    return `<div class="lb-sheet lb-mine ${c.dead ? 'is-dead' : ''}" style="--pc:${esc(c.color)}">${head}${money}${bars}${goalLine(c)}
      <dl class="lb-facts"><dt>Job</dt><dd>${esc(c.job)}</dd><dt>Ausbildung</dt><dd>${esc(c.education)}</dd><dt>Wohnen</dt><dd>${esc(c.living)}</dd><dt>Ort</dt><dd>${esc(c.location || '')}</dd></dl>
      <h4>Laufend <small>pro ${per} · Summe <b class="${sum >= 0 ? 'up' : 'down'}">${sum >= 0 ? '+' : ''}${eur(sum)}</b></small></h4><ul class="lb-list">${eff}</ul>
      ${props ? `<h4>Besitz</h4><ul class="lb-list lb-props">${props}</ul>` : ''}
      ${rel ? `<h4>Beziehungen</h4><ul class="lb-list">${rel}</ul>` : ''}</div>`;
  }
  // Ergebnis der letzten Runde: Wahl, W20-Wurf, Erzählung, Änderungen
  function resultHTML(V, me) {
    const c = V.chars[me], ck = V.checks[me], r = V.recap && V.recap[me], did = V.lastAction && V.lastAction[me];
    const story = para(V.stories[me]);
    if (!story) return '';
    const head = V.round === 0 ? 'Dein Start' : `Runde ${V.round} · Ergebnis`;
    const roll = ck ? `<div class="lb-roll ${ck.success ? 'ok' : 'bad'}"><span class="lb-d20" data-seq="${V.aiSeq}"><b>${ck.roll}</b></span>
      <div><small>W20 ${ck.mod ? `${ck.mod > 0 ? '+' : '−'} ${Math.abs(ck.mod)} ${esc(ck.stat || '')}` : esc(ck.stat || '')} = <b>${ck.roll + (ck.mod || 0)}</b> gegen ${ck.dc}</small>
      <strong>${ck.roll === 20 ? 'Glückswurf!' : ck.roll === 1 ? 'Totalausfall' : ck.success ? 'Geschafft' : 'Verkackt'}</strong></div></div>` : '';
    return `<div class="lb-result ${ck ? (ck.success ? 'ok' : 'bad') : ''}"><span class="lb-k">${head}</span>
      ${did && did !== '•' && V.round > 0 ? `<p class="lb-did">Du: „${esc(did)}“</p>` : ''}${roll}${story}
      ${r && Object.keys(r).length ? `<div class="lb-deltas"><small>Bilanz der Runde, mit laufenden Kosten:</small>${fx(r)}</div>` : ''}${c && c.dead ? `<p class="lb-dead">${esc(c.deathReason || '')}</p>` : ''}</div>`;
  }
  const KIND = { real: 'Alltag', odd: 'Ungewöhnlich', absurd: 'Absurd' };
  function renderMain(root, V, me, api) {
    ensureSkel(root, V, me);
    const mine = V.chars[me];
    // Links: deine Figur
    if (put($('#lb-left'), mine ? sheet(V, me, true) : '<p class="p-sub">Du schaust zu.</p>')) {
      const left = $('#lb-left');
      left.querySelectorAll('[data-move]').forEach((b) => { b.onclick = () => api.act({ type: 'move', prop: b.dataset.move }); });
      left.querySelectorAll('[data-lease]').forEach((b) => { b.onclick = () => api.act({ type: 'lease', prop: b.dataset.lease }); });
      left.querySelectorAll('[data-sell]').forEach((b) => { b.onclick = () => { if (confirm('Wirklich verkaufen? Makler und Restkredit gehen ab.')) api.act({ type: 'sell', prop: b.dataset.sell }); }; });
      left.querySelectorAll('[data-fly]').forEach((b) => { b.onclick = () => { const [a, c] = b.dataset.fly.split(',').map(Number); skel.map.flyTo([a, c], 15); }; });
    }
    // Rechts: die anderen
    const others = V.players.filter((p) => p.id !== me && V.chars[p.id]).map((p) => sheet(V, p.id, false)).join('');
    put($('#lb-others'), others ? `<h3 class="lb-h">Die anderen</h3>${others}` : '');
    drawMap(V);
    // Mitte oben: Datum, Lebenszeit, Weltgeschehen
    const k = AI.keys();
    const yearsDone = (V.round * L.months(V)) / 12;
    const pct = V.settings.years ? Math.min(100, Math.round((yearsDone / V.settings.years) * 100)) : 0;
    put($('#lb-head'), `<div class="lb-date"><div><span>${esc(L.dateText(V))}</span><small>Runde ${V.round + 1} · pro Runde vergeht 1 ${esc(L.STEPS[V.settings.step].name)}${mine ? ` · ${esc(mine.name)} ist ${mine.age}` : ''}</small></div>
      <span class="chip lb-gm">${V.gm === 'ai' ? 'April (KI) erzählt' : 'April (Karten)'}</span><span class="chip lb-voice" id="lb-voice" hidden>Stimme pausiert</span></div>
      ${V.settings.years ? `<div class="lb-life" title="Spielzeit"><i style="--v:${pct}%"></i><small>${Math.floor(yearsDone)} von ${V.settings.years} Jahren</small></div>` : ''}
      ${V.world[0] && V.world[0].d === L.dateText(V) ? `<div class="lb-world"><span class="lb-k">Weltgeschehen</span>${para(V.world[0].t)}</div>` : ''}`);
    paintVoiceChip();
    // Fehler beim Host
    if (api.isHost && aiErr && V.phase === 'think' && aiErr.seq === V.aiSeq) {
      if (put($('#lb-err'), `<div class="lb-error"><b>April (KI) antwortet nicht.</b><p>${esc(ERRORS[aiErr.code] || aiErr.code)}</p>${aiErr.detail ? `<small>${esc(aiErr.detail)}</small>` : ''}
        <div class="btn-row"><button class="btn btn-small btn-primary" id="lb-retry">Nochmal</button><button class="btn btn-small" id="lb-skip">Diese Runde mit Karten</button><button class="btn btn-small btn-ghost" id="lb-togm">Ganz auf Karten umstellen</button><button class="btn btn-small btn-ghost" data-open-keys>KI & Stimme</button></div></div>`)) {
        $('#lb-retry').onclick = () => { aiErr = null; $('#lb-err')._html = null; $('#lb-err').innerHTML = ''; redraw(); };
        $('#lb-skip').onclick = () => { const s = aiErr.seq; aiErr = null; api.act({ type: 'ai', seq: s, data: {}, failed: true }); };
        $('#lb-togm').onclick = () => { aiErr = null; api.act({ type: 'gm', gm: 'builtin' }); };
      }
    } else put($('#lb-err'), '');
    const story = V.phase === 'think' && api.isHost && aiErr && aiErr.seq === V.aiSeq ? ''
      : V.phase === 'think'
        ? `<div class="lb-think"><svg viewBox="0 0 100 100"><use href="#april"/></svg><div><b>April ${V.aiTask === 'final' ? 'schreibt eure Lebensbilanz' : V.aiTask === 'intro' ? 'baut eure Welt' : 'wertet die Runde aus'} …</b><small>${api.isHost ? (k.anthropic ? 'Das dauert meist 10–40 Sekunden.' : 'Kein Schlüssel eingetragen.') : 'Der Host fragt April gerade.'}</small></div></div>`
        : mine && mine.dead ? `<div class="lb-result bad"><span class="lb-k">Tot</span><p>${esc(mine.name)} ist gestorben. ${esc(mine.deathReason || '')}</p><p class="p-sub">Du schaust ab jetzt zu.</p></div>`
          : mine ? resultHTML(V, me) : '';
    put($('#lb-story'), story);
    renderQuiz(V, me);
    renderInput(V, me, api);
    // Wer ist fertig + Host-Knöpfe
    const living = L.alive(V);
    const who = V.phase === 'act' && (living.length > 1 || api.isHost) ? `<div class="lb-who">${living.length > 1 ? `<span class="lb-k">Wer ist fertig?</span><ul>${living.map((p) => `<li class="${V.actions[p.id] ? 'done' : ''}" style="--pc:${p.color}">${esc(p.name)} <small>${V.actions[p.id] ? 'fertig' : 'überlegt …'}</small></li>`).join('')}</ul>` : ''}
      <span id="lb-timer" class="lb-timer"></span>
      ${api.isHost ? `<div class="btn-row"><button class="btn btn-small" id="lb-force">Jetzt auswerten</button><button class="btn btn-small btn-ghost" id="lb-end">Spiel beenden</button></div>` : ''}</div>` : '';
    if (put($('#lb-who'), who)) {
      if ($('#lb-force')) $('#lb-force').onclick = () => { if (Object.keys(V.actions).length || confirm('Noch hat niemand entschieden. Trotzdem auswerten?')) api.act({ type: 'force' }); };
      if ($('#lb-end')) $('#lb-end').onclick = () => { if (confirm('Spiel jetzt beenden? April schreibt dann die Lebensbilanz.')) api.act({ type: 'endGame' }); };
    }
    if (V.phase === 'act' && V.deadline) {
      const t = () => { const el = $('#lb-timer'); if (!el) return; const s = Math.max(0, Math.round((V.deadline - Date.now()) / 1000)); el.textContent = `Noch ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; el.classList.toggle('low', s < 20); if (s <= 0 && api.isHost) controller(last.V, api); };
      t(); tick = setInterval(t, 1000);
    }
    // Unten: was bei den anderen los ist, Chronik, Protokoll
    const otherStories = V.players.filter((p) => p.id !== me && V.chars[p.id] && V.stories[p.id]).map((p) => `<div class="lb-os" style="--pc:${p.color}"><b>${esc(V.chars[p.id].name)}</b>${V.lastAction && V.lastAction[p.id] && V.lastAction[p.id] !== '•' && V.round > 0 ? `<small>„${esc(V.lastAction[p.id])}“</small>` : ''}${para(V.stories[p.id])}</div>`).join('');
    const chron = mine ? mine.chronicle.slice().reverse().map((x) => `<li><small>${esc(x.d)}</small> ${esc(x.t)}</li>`).join('') : '';
    put($('#lb-more'), `${otherStories ? `<details open><summary>Was bei den anderen los ist</summary>${otherStories}</details>` : ''}
      ${chron ? `<details><summary>Dein Lebenslauf</summary><ul class="lb-log">${chron}</ul></details>` : ''}
      ${V.world.length > 1 ? `<details><summary>Weltgeschehen</summary><ul class="lb-log">${V.world.map((w) => `<li><small>${esc(w.d)}</small> ${esc(w.t)}</li>`).join('')}</ul></details>` : ''}
      <details><summary>Protokoll</summary><ul class="lb-log">${V.log.slice().reverse().map((m) => `<li>${esc(m)}</li>`).join('')}</ul></details>`);
  }
  function renderQuiz(V, me) {
    const el = $('#lb-quiz');
    const need = V.phase === 'act' && V.settings.exam === 'quiz' && V.exam[me] && V.chars[me] && !V.chars[me].dead && !V.actions[me];
    if (!need) { put(el, ''); return; }
    const key = V.aiSeq;
    if (!quiz || quiz.key !== key) {
      quiz = { key, qs: null, idx: 0, ok: 0, done: false };
      loadQuiz().then((qs) => { if (quiz.key !== key) return; quiz.qs = qs.map((q) => ({ q: q.q, right: q.a[0], opts: shuffle(q.a), src: q.src })); redraw(); });
    }
    if (!quiz.qs) { put(el, '<div class="lb-quiz"><span class="lb-k">Prüfung</span><p>Fragen werden geladen …</p></div>'); return; }
    if (quiz.done) { put(el, `<div class="lb-quiz"><span class="lb-k">Prüfung</span><p><b>${quiz.ok} von ${quiz.qs.length} richtig.</b> Jetzt schreib, was du sonst noch machst – April bewertet die Prüfung mit.</p></div>`); return; }
    const q = quiz.qs[quiz.idx];
    if (put(el, `<div class="lb-quiz"><span class="lb-k">Prüfung · Frage ${quiz.idx + 1}/${quiz.qs.length}</span><p>${esc(q.q)}</p><div class="lb-qopts">${q.opts.map((o, i) => `<button class="btn btn-small" data-q="${i}">${esc(o)}</button>`).join('')}</div>${q.src ? '<small class="p-sub">Quelle: Open Trivia Database (opentdb.com), CC BY-SA 4.0</small>' : ''}</div>`)) {
      el.querySelectorAll('[data-q]').forEach((b) => {
        b.onclick = () => {
          const right = q.opts[b.dataset.q] === q.right;
          if (right) quiz.ok++;
          FX && FX.play(right ? 'coinUp' : 'coinDown');
          quiz.idx++;
          if (quiz.idx >= quiz.qs.length) quiz.done = true;
          redraw();
        };
      });
    }
  }
  function renderInput(V, me, api) {
    const el = $('#lb-input');
    const c = V.chars[me];
    if (V.phase !== 'act' || !c || c.dead) { put(el, ''); return; }
    const sent = V.actions[me];
    const card = V.cards && V.cards[me];
    const quizBlock = V.settings.exam === 'quiz' && V.exam[me] && !(quiz && quiz.key === V.aiSeq && quiz.done);
    if (sent) {
      if (put(el, `<div class="lb-sent"><span class="lb-k">Deine Entscheidung</span><p>„${esc(sent)}“</p><small class="p-sub">Warte auf die anderen. Danach würfelt April und erzählt, was passiert.</small><div class="btn-row"><button class="btn btn-small btn-ghost" id="lb-undo">Ändern</button></div></div>`)) {
        $('#lb-undo').onclick = () => { if (!V.picks || V.picks[me] == null) draft = sent; api.act({ type: 'undo' }); };
      }
      return;
    }
    const free = `<textarea id="lb-text" rows="3" maxlength="600" placeholder="Schreib einfach, was ${esc(c.name)} tut, sagt oder plant."></textarea>
      <div class="btn-row"><button class="btn ${card ? '' : 'btn-primary'}" id="lb-send" ${quizBlock ? 'disabled' : ''}>${quizBlock ? 'Erst die Prüfung' : 'Abschicken'}</button></div>`;
    let html;
    if (card) {
      const opts = card.opts.map((o, i) => {
        const p = D ? D.chance(c, o) : 50, poor = o.cost && c.stats.money < o.cost;
        const odds = o.dc ? `<span class="lb-odds"><i>${esc(D.SKILLS[o.stat] || o.stat)}</i> ${p} %</span>` : '<span class="lb-odds sure">sicher</span>';
        return `<button type="button" class="lb-opt ${poor ? 'is-poor' : ''}" data-choice="${i}" style="--odds:${o.dc ? p : 100}%" ${poor || quizBlock ? 'disabled' : ''}>
          <b>${esc(o.t)}</b>${odds}${o.cost ? `<small>${poor ? 'zu teuer: ' : 'kostet '}${eur(o.cost)}</small>` : ''}</button>`;
      }).join('');
      html = `<div class="lb-card kind-${esc(card.kind || 'real')}"><span class="lb-k">${card.exam ? 'Prüfung' : `Neues Ereignis · ${KIND[card.kind] || 'Alltag'}`}</span>
        <p class="lb-card-t">${esc(card.text)}</p><div class="lb-opts">${opts}</div>
        <details class="lb-free" ${draft ? 'open' : ''}><summary>Oder etwas ganz anderes machen</summary><div class="lb-form-do">${free}<small class="p-sub">April würfelt auch auf eigene Ideen: lernen, arbeiten, feiern, flirten, investieren, gründen, Politik …</small></div></details></div>`;
    } else {
      html = `${V.events[me] ? `<div class="lb-card"><span class="lb-k">${V.exam[me] ? 'Prüfung' : 'Neues Ereignis'}</span>${para(V.events[me])}</div>` : ''}
        <div class="lb-form-do"><label class="field"><span>Was machst du? (frei schreiben)</span></label>${free}<small class="p-sub">Strg + Enter schickt ab. Nebenbei kannst du auf der Karte wohnen, kaufen und verkaufen.</small></div>`;
    }
    if (put(el, html)) {
      el.querySelectorAll('[data-choice]').forEach((b) => { b.onclick = () => { FX && FX.play('pop'); api.act({ type: 'do', choice: Number(b.dataset.choice) }); }; });
      const ta = $('#lb-text');
      ta.value = draft;
      ta.oninput = () => { draft = ta.value; };
      ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#lb-send').click(); };
      $('#lb-send').onclick = () => {
        const t = ta.value.trim();
        if (t.length < 2) return api.toast('Schreib, was du tust.');
        const a = { type: 'do', text: t };
        if (quiz && quiz.key === V.aiSeq && quiz.done) a.quiz = { ok: quiz.ok, total: quiz.qs.length };
        draft = '';
        api.act(a);
      };
    }
  }

  // ----- Karte -----
  function drawMap(V) {
    const Lf = window.L, layer = skel.layer;
    layer.clearLayers();
    const pts = [];
    V.players.forEach((p) => {
      const c = V.chars[p.id];
      if (!c || c.dead || !c.home) return;
      pts.push([c.home.lat, c.home.lng]);
      Lf.circleMarker([c.home.lat, c.home.lng], { radius: 9, color: '#0e0b13', weight: 2, fillColor: c.color, fillOpacity: 1 })
        .bindTooltip(`${esc(c.name)} · ${esc(c.home.label)}`, { direction: 'top' }).addTo(layer);
      c.props.forEach((q) => {
        Lf.marker([q.lat, q.lng], { icon: Lf.divIcon({ className: 'lb-pin', html: `<span style="--pc:${esc(c.color)}">${q.kind === 'plot' ? '▢' : q.kind === 'house' ? '⌂' : '▤'}</span>`, iconSize: [22, 22] }) })
          .bindTooltip(`${esc(c.name)}: ${esc(L.KINDS[q.kind].name)} ${esc(q.label)} (${eur(q.value)})${q.leased ? ' · vermietet' : ''}`).addTo(layer);
      });
    });
    if (!skel.fitted && pts.length > 1) { skel.map.fitBounds(pts, { padding: [40, 40], maxZoom: 11 }); skel.fitted = true; }
  }
  async function onMapClick(ll) {
    if (!last) return;
    const { V, me, api } = last;
    const c = V.chars[me];
    if (V.phase !== 'act' || !c || c.dead) return api.toast('Kaufen und Umziehen geht, während ihr eure Züge schreibt.');
    const pop = window.L.popup({ maxWidth: 300, maxHeight: 360 }).setLatLng(ll).setContent('<p class="lb-pop">Suche Adresse …</p>').openOn(skel.map);
    let info;
    try { info = await reverse(ll.lat, ll.lng); } catch (e) { pop.setContent('<p class="lb-pop">Die Adresse konnte gerade nicht geladen werden. Nochmal klicken.</p>'); return; }
    const M = L.months(V);
    const rows = ['flat', 'house', 'plot'].map((kind) => {
      const q = L.quote(info.place, kind), K = L.KINDS[kind];
      return `<div class="lb-offer"><b>${K.name}</b> <small>~${K.m2} m² · ${eur(q.m2p)}/m²</small>
        <div>Kaufpreis ${eur(q.price)} · Unterhalt ${eur(q.upkeepMonth)}/Monat${kind !== 'plot' ? ` · Miete ${eur(q.rentMonth + Math.round(q.upkeepMonth * 0.6))}/Monat` : ''}</div>
        <div class="btn-row"><button class="btn btn-small" data-buy="${kind}" ${c.stats.money < q.price ? 'disabled' : ''}>Kaufen</button><button class="btn btn-small" data-fin="${kind}" ${c.stats.money < q.price * 0.2 ? 'disabled' : ''}>Finanzieren (20 %)</button>${kind !== 'plot' ? `<button class="btn btn-small btn-ghost" data-rent="${kind}">Mieten</button>` : ''}</div></div>`;
    }).join('');
    const box = document.createElement('div');
    box.className = 'lb-pop';
    box.innerHTML = `<strong>${esc(info.label)}</strong><small>Dein Geld: ${eur(c.stats.money)} · Kosten laufen pro Runde (${M} Monat${M > 1 ? 'e' : ''})</small>${rows}`;
    const send = (type, kind, finance) => { api.act({ type, kind, finance, label: info.label, lat: ll.lat, lng: ll.lng, place: info.place }); skel.map.closePopup(); };
    box.querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => send('buy', b.dataset.buy, false); });
    box.querySelectorAll('[data-fin]').forEach((b) => { b.onclick = () => send('buy', b.dataset.fin, true); });
    box.querySelectorAll('[data-rent]').forEach((b) => { b.onclick = () => send('rent', b.dataset.rent); });
    pop.setContent(box);
  }

  // ----- Spielende -----
  function renderOver(root, V, me, api) {
    const ranked = V.players.filter((p) => V.chars[p.id]).sort((a, b) => ((V.finals[b.id] || {}).score || 0) - ((V.finals[a.id] || {}).score || 0));
    const PART = { money: 'Vermögen', happy: 'Happiness', health: 'Gesundheit', power: 'Macht', people: 'Menschen', goal: 'Lebensziel', dead: 'Tod' };
    const cards = ranked.map((p, i) => {
      const c = V.chars[p.id], f = V.finals[p.id] || {};
      const G = D && D.GOALS[c.goal];
      const parts = f.parts ? Object.entries(f.parts).filter(([, v]) => v).map(([k, v]) => `<span class="${v < 0 ? 'down' : ''}">${PART[k] || k} ${v > 0 ? '+' : ''}${v}</span>`).join('') : '';
      return `<div class="p-card lb-final ${i === 0 && ranked.length > 1 ? 'is-best' : ''}" style="--pc:${esc(c.color)}"><div class="lb-rank"><b>${i + 1}.</b><span>${f.score || 0} Punkte</span></div>${G ? `<p class="lb-goal ${f.goalDone ? 'done' : ''}"><span>Lebensziel</span><b>${esc(G.name)}</b><i>${f.goalDone ? 'erreicht' : 'verfehlt'}</i></p>` : ''}${parts ? `<div class="lb-parts">${parts}</div>` : ''}<div class="lb-sh-head">${c.img ? `<img class="lb-av" src="${esc(c.img)}" alt="">` : `<span class="lb-av lb-av-x">${esc(c.name[0])}</span>`}<div><strong>${esc(c.name)}</strong>${f.title ? `<em>${esc(f.title)}</em>` : ''}<small>${esc(p.name)} · ${c.age} Jahre${c.dead ? ' · tot' : ''}</small></div></div>
        <div class="lb-money"><span>Geld</span><b>${eur(c.stats.money)}</b></div>${bar('health', c.stats.health)}${bar('happy', c.stats.happy)}${bar('power', c.stats.power)}
        ${para(f.story)}${c.chronicle.length ? `<details><summary>Lebenschronik</summary><ul class="lb-log">${c.chronicle.map((x) => `<li><small>${esc(x.d)}</small> ${esc(x.t)}</li>`).join('')}</ul></details>` : ''}</div>`;
    }).join('');
    root.innerHTML = `<div class="lb-over"><div class="p-hero"><p class="sec-label"><span class="n">ENDE</span>${esc(L.dateText(V))}</p><h1 class="p-title">Lebens<span class="outline">bilanz</span></h1>
      ${V.world[0] ? `<p class="p-lead">${esc(V.world[0].t)}</p>` : ''}${ranked.length > 1 && V.chars[ranked[0].id] ? `<p class="p-lead">Bestes Leben: <b>${esc(V.chars[ranked[0].id].name)}</b> (${esc(ranked[0].name)})</p>` : ''}</div><div class="lb-finals">${cards}</div>
      ${api.isHost ? '<div class="btn-row lb-over-btns"><button class="btn btn-primary" id="lb-again">Neues Leben</button><button class="btn" id="lb-lobby">Zur Lobby</button></div>' : '<p class="p-wait">Der Host entscheidet, wie es weitergeht.</p>'}</div>`;
    if (api.isHost) { $('#lb-again').onclick = api.again; $('#lb-lobby').onclick = api.lobby; }
  }

  // ---------- KI & Stimme (Schlüssel) ----------
  function openKeys() {
    const k = AI.keys();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal lb-keys" role="dialog" aria-label="KI und Stimme"><button class="modal-x" aria-label="Schließen">×</button><h2>KI & Stimme</h2>
      <p class="p-sub">Nur der Host braucht die Schlüssel. Sie bleiben in diesem Browser (localStorage), gehen direkt an Anthropic bzw. ElevenLabs und landen nirgends sonst – nicht im Spiel, nicht bei den anderen.</p>
      <label class="field"><span>Anthropic-API-Schlüssel (für April)</span><input id="k-ant" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(k.anthropic)}"></label>
      <label class="field"><span>Modell</span><select id="k-model">${AI.MODELS.map(([id, n]) => `<option value="${id}" ${k.model === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="field"><span>ElevenLabs-Schlüssel (Aprils Stimme, optional)</span><input id="k-el" type="password" autocomplete="off" placeholder="leer = ohne Stimme" value="${esc(k.eleven)}"></label>
      <label class="row lb-row"><span>Aprils Stimme abspielen<small>Gilt nur für dieses Gerät. Sind die Tokens leer, spielt das Spiel einfach still weiter.</small></span><input type="checkbox" class="switch" id="k-voice" ${k.voice ? 'checked' : ''}></label>
      <div class="btn-row"><button class="btn btn-primary" id="k-save">Speichern</button>${k.anthropic || k.eleven ? '<button class="btn btn-ghost" id="k-clear">Schlüssel löschen</button>' : ''}</div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    back.onclick = (e) => { if (e.target === back) close(); };
    $('.modal-x', back).onclick = close;
    $('#k-save', back).onclick = () => {
      AI.saveKeys({ anthropic: $('#k-ant', back).value.trim(), model: $('#k-model', back).value, eleven: $('#k-el', back).value.trim(), voice: $('#k-voice', back).checked });
      AI.voice.paused = false;
      if (!$('#k-voice', back).checked) AI.stopVoice();
      close();
      if (aiErr && aiErr.code !== 'refusal') aiErr = null;
      redraw();
    };
    if ($('#k-clear', back)) $('#k-clear', back).onclick = () => { AI.saveKeys({ anthropic: '', eleven: '', model: k.model, voice: k.voice }); close(); redraw(); };
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-keys]')) { e.preventDefault(); openKeys(); } });

  // ---------- Party ----------
  const sel = (key, st, host, opts) => `<select data-set="${key}" ${typeof opts[0][0] === 'number' ? 'data-num="1"' : ''} ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${String(st[key]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  app = window.DULI_PARTY.start({
    id: 'leben', title: 'Spiel des Lebens', kicker: 'KI-SPIEL', titleHTML: 'Spiel des <span class="outline">Lebens</span>',
    min: 1, max: 6, soloBots: 0, noBots: true, soloLabel: 'Alleine spielen', soloChip: 'Alleine',
    tagline: 'Ihr seid 18 und lebt euer Leben: Abi, Job, Liebe, Drama, Präsident werden. April stellt euch vor Entscheidungen, der W20 entscheidet. Echte Karte, echte Kosten. Läuft auch ohne KI-Schlüssel.',
    defaults: { step: 'y', years: 20, death: 'rejoin', exam: 'dice', timer: 0, gm: 'auto' },
    settingsHTML: (st, host) => `
      <label class="row"><span>Spielleitung<small>Karten laufen immer. Die KI erzählt frei, braucht aber einen Schlüssel beim Host.</small></span>${sel('gm', st, host, [['auto', 'automatisch'], ['builtin', 'April mit Ereigniskarten'], ['ai', 'April als KI (Claude)']])}</label>
      <label class="row"><span>Eine Runde ist<small>So viel Zeit vergeht pro Runde</small></span>${sel('step', st, host, [['m', 'ein Monat'], ['q', 'ein Quartal'], ['h', 'ein Halbjahr'], ['y', 'ein Jahr']])}</label>
      <label class="row"><span>Spieldauer<small>Danach schreibt April die Lebensbilanz</small></span>${sel('years', st, host, [[10, '10 Jahre'], [20, '20 Jahre'], [40, '40 Jahre'], [0, 'offen']])}</label>
      <label class="row"><span>Wenn jemand stirbt<small>Tod ist endgültig</small></span>${sel('death', st, host, [['rejoin', 'mit neuer Figur weiter'], ['win', 'wer übrig bleibt, gewinnt']])}</label>
      <label class="row"><span>Prüfungen<small>Abi, Führerschein, Ausbildung …</small></span>${sel('exam', st, host, [['dice', 'Würfel'], ['quiz', 'Quiz (5 Fragen)']])}</label>
      <label class="row"><span>Zeit pro Runde<small>Danach wertet April automatisch aus</small></span>${sel('timer', st, host, [[0, 'ohne Timer'], [60, '1 Minute'], [120, '2 Minuten'], [300, '5 Minuten']])}</label>`,
    lobbyNote: (host) => {
      if (!host) return '<p class="p-sub">April läuft über die Schlüssel des Hosts. Du brauchst nichts.</p>';
      const k = AI.keys();
      return k.anthropic ? `<p class="p-sub lb-ok">April als KI ist bereit (${esc((AI.MODELS.find(([id]) => id === k.model) || AI.MODELS[0])[1].split(' (')[0])}${k.eleven ? ', mit Stimme' : ', ohne Stimme'}). Bei „automatisch“ erzählt die KI, bei Problemen springen die Karten ein. <a href="#" data-open-keys>Ändern</a></p>`
        : '<div class="lb-warn"><b>Kein KI-Schlüssel? Kein Problem.</b> April leitet das Spiel dann mit über 50 Ereigniskarten, Lebensphasen, Würfelproben und Weltgeschehen. Mit einem Anthropic-Schlüssel erzählt sie stattdessen frei. <button class="btn btn-small" data-open-keys>KI & Stimme</button></div>';
    },
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Alle starten mit <b>18</b>, mitten im Abi oder in der Ausbildung. Links stehen deine Werte: <b>Gesundheit, Geld, Macht, Happiness</b>.</li>
      <li>Jede Runde bekommt jede Person ein <b>Ereignis</b>. Du wählst eine Möglichkeit oder schreibst eine eigene Idee. Mit KI-Schlüssel antwortest du komplett frei.</li>
      <li>Riskantes entscheidet ein <b>W20</b> plus deine Stärke (Köpfchen, Charme, Körper, Fleiß, Glück). Bei jeder Wahl siehst du die Chance in Prozent. 20 ist ein Glückswurf, 1 ein Totalausfall.</li>
      <li>Das Leben hat Phasen: <b>Abi</b>, danach Studium, Ausbildung, Job, Gründen oder Work and Travel. Jede Figur hat ein geheimes <b>Lebensziel</b>.</li>
      <li>Am Ende zählt das beste Leben: Vermögen, Happiness, Gesundheit, Macht, Menschen und das Lebensziel.</li>
      <li>Auf der <b>echten Karte</b> kannst du mieten, Wohnungen, Häuser und Grundstücke kaufen, finanzieren, vermieten und verkaufen. Miete, Unterhalt und Kredite laufen jede Runde.</li>
      <li>Präsident werden, Diktaturen übernehmen, Kriege anfangen – alles geht, alles hat Folgen. <b>Tod ist endgültig.</b></li>
      <li>Ab 18. April roastet gnadenlos. Ein Anthropic-Schlüssel ist optional (freies Erzählen), Aprils Stimme (ElevenLabs) auch.</li></ul></div>`,
    engine: L, render,
    onCustom: (d) => { if (d && d.kind === 'voice' && d.audio) AI.play(d.audio); },
  });
})();
