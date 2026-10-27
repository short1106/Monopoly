// DULIDAN GeoGuessr – Oberfläche: Satellitenbild (Esri) zum Umschauen, OpenStreetMap-Karte zum Tippen, Auflösung mit allen Tipps
(function () {
  const G = window.DULI_GEO, D = window.DULI_GEO_DATA, FX = window.DULI_FX, VO = window.DULI_VOICE, esc = window.DULI_PARTY.esc;
  const Lf = window.L;
  const $ = (s, r = document) => r.querySelector(s);
  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const SAT_ATTR = 'Satellit: Esri, Maxar, Earthstar Geographics';
  const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const put = (el, html) => { if (el && el._html !== html) { el.innerHTML = html; el._html = html; return true; } return false; };
  const dist = (k) => (k < 1 ? `${Math.round(k * 1000)} m` : k < 100 ? `${k.toFixed(1).replace('.', ',')} km` : `${Math.round(k).toLocaleString('de-DE')} km`);
  const pts = (n) => n.toLocaleString('de-DE');

  let maps = [], key = null, pick = null, tick = null, lastRes = null, lastOver = false, revT = null;
  function clearMaps() { maps.forEach((m) => { try { m.off(); m.stop(); m.remove(); } catch (e) { /* weg */ } }); maps = []; }
  // Verzögerte Kartenaufrufe nur, solange die Karte noch auf der Seite ist
  const later = (m, fn, ms) => setTimeout(() => { if (maps.includes(m) && document.body.contains(m.getContainer())) { try { fn(); } catch (e) { /* Karte weg */ } } }, ms);

  function render(root, V, me, api) {
    if (!V) return;
    clearInterval(tick);
    if (V.phase === 'guess') return renderGuess(root, V, me, api);
    if (V.phase === 'result') return renderResult(root, V, me, api);
    return renderOver(root, V, me, api);
  }
  const scoreLine = (V, me) => `<ul class="geo-board">${V.players.slice().sort((a, b) => V.scores[b.id] - V.scores[a.id]).map((p) => `<li style="--pc:${p.color}"><strong>${esc(p.name)}${p.id === me ? ' (du)' : ''}</strong><b>${pts(V.scores[p.id])}</b></li>`).join('')}</ul>`;
  const head = (V, extra) => `<div class="geo-head"><span class="geo-round">Runde ${V.round}/${V.rounds}</span><span class="chip">${esc(V.setName)}</span><span class="chip">${V.mode === 'country' ? 'Nur das Land' : 'So nah wie möglich'}</span>${extra || ''}</div>`;

  // ----- Raten -----
  function renderGuess(root, V, me, api) {
    const inGame = V.players.some((p) => p.id === me);
    const k = `g${V.round}|${V.locs === null ? V.loc.lat : ''}`;
    if (key !== k || !root.querySelector('.geo-guess')) {
      key = k; pick = null; clearMaps();
      root.innerHTML = `<div class="geo geo-guess">
        <div id="geo-top"></div>
        <div class="geo-stage"><div id="geo-sat" class="geo-sat"></div>
          <button class="btn btn-small geo-home" id="geo-home" type="button" title="Zurück zum Startpunkt">Zurück zum Start</button>
          ${inGame ? `<div class="geo-mini" id="geo-mini"><div id="geo-pick" class="geo-pickmap"></div>
            <div class="geo-mini-bar">${V.mode === 'country' ? `<input id="geo-country" list="geo-cl" placeholder="Land tippen oder auf die Karte klicken"><datalist id="geo-cl">${Object.values(D.COUNTRIES).sort((a, b) => a.localeCompare(b, 'de')).map((n) => `<option value="${esc(n)}">`).join('')}</datalist>` : ''}
            <button class="btn btn-primary" id="geo-send" disabled>${V.mode === 'country' ? 'Land wählen' : 'Auf die Karte tippen'}</button></div></div>
            <button class="btn btn-primary geo-mini-open" id="geo-open" type="button">Karte</button>` : ''}
        </div><div id="geo-who"></div></div>`;
      // Satellit
      const z = 17;
      const pad = V.move ? 0.03 : 0.004;
      const sat = Lf.map($('#geo-sat'), { zoomControl: V.move, attributionControl: true, dragging: V.move, scrollWheelZoom: V.move, doubleClickZoom: V.move, touchZoom: V.move, boxZoom: false, keyboard: V.move,
        minZoom: V.move ? 14 : z, maxZoom: V.move ? 19 : z, maxBounds: [[V.loc.lat - pad, V.loc.lng - pad * 1.6], [V.loc.lat + pad, V.loc.lng + pad * 1.6]], maxBoundsViscosity: 1 }).setView([V.loc.lat, V.loc.lng], z);
      Lf.tileLayer(SAT, { maxZoom: 19, maxNativeZoom: 18, attribution: SAT_ATTR }).addTo(sat);
      maps.push(sat);
      $('#geo-home').onclick = () => sat.setView([V.loc.lat, V.loc.lng], z);
      if (!V.move) $('#geo-home').hidden = true;
      if (inGame) {
        const set = D.SETS[V.set];
        const pm = Lf.map($('#geo-pick'), { worldCopyJump: true, attributionControl: true, minZoom: 1 }).setView(set.center, set.zoom);
        Lf.tileLayer(OSM, { maxZoom: 18, attribution: OSM_ATTR }).addTo(pm);
        maps.push(pm);
        const me_ = V.players.find((p) => p.id === me);
        let marker = null;
        const send = $('#geo-send');
        const setPick = (lat, lng, cc, cname) => {
          pick = { lat, lng, cc, cname };
          if (!marker) marker = Lf.circleMarker([lat, lng], { radius: 8, color: '#0e0b13', weight: 2, fillColor: me_.color, fillOpacity: 1 }).addTo(pm);
          else marker.setLatLng([lat, lng]);
          if (V.mode === 'country') { send.disabled = !cc; send.textContent = cc ? `Tippen: ${cname}` : 'Land wird gesucht …'; }
          else { send.disabled = false; send.textContent = 'Tippen'; }
        };
        pm.on('click', (e) => {
          const { lat, lng } = e.latlng;
          if (V.mode !== 'country') return setPick(lat, lng);
          setPick(lat, lng, null, null);
          clearTimeout(revT);
          revT = setTimeout(async () => {
            try {
              const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${((lng + 540) % 360) - 180}&zoom=3&accept-language=de`);
              const j = await r.json();
              const cc = j.address && j.address.country_code;
              if (!pick || pick.lat !== lat) return;
              if (cc) { setPick(lat, lng, cc, D.COUNTRIES[cc] || j.address.country); if ($('#geo-country')) $('#geo-country').value = D.COUNTRIES[cc] || j.address.country; }
              else { send.textContent = 'Da ist kein Land (Meer?)'; }
            } catch (err) { send.textContent = 'Land unten eintippen'; }
          }, 350);
        });
        if ($('#geo-country')) {
          $('#geo-country').oninput = (e) => {
            const name = e.target.value.trim().toLowerCase();
            const cc = Object.keys(D.COUNTRIES).find((c) => D.COUNTRIES[c].toLowerCase() === name);
            if (cc) setPick(pick ? pick.lat : 0, pick ? pick.lng : 0, cc, D.COUNTRIES[cc]);
          };
        }
        send.onclick = () => { if (pick) { FX && FX.play('pop'); api.act({ type: 'guess', lat: pick.lat, lng: pick.lng, cc: pick.cc, cname: pick.cname }); } };
        const mini = $('#geo-mini');
        $('#geo-open').onclick = () => { mini.classList.toggle('is-open'); $('#geo-open').textContent = mini.classList.contains('is-open') ? 'Bild' : 'Karte'; later(pm, () => pm.invalidateSize(), 220); };
        mini.addEventListener('mouseenter', () => later(pm, () => pm.invalidateSize(), 220));
        mini.addEventListener('mouseleave', () => later(pm, () => pm.invalidateSize(), 220));
      }
      maps.forEach((m) => later(m, () => m.invalidateSize(), 60));
    }
    const mine = V.guesses[me];
    put($('#geo-top'), head(V, `<span class="geo-timer" id="geo-timer"></span>${api.isHost ? '<button class="btn btn-small btn-ghost" id="geo-force">Auflösen</button>' : ''}`));
    if ($('#geo-force')) $('#geo-force').onclick = () => { if (confirm('Runde jetzt auflösen?')) api.act({ type: 'next' }); };
    if (mine && $('#geo-mini')) { $('#geo-mini').classList.add('is-done'); const s = $('#geo-send'); s.disabled = true; s.textContent = 'Getippt – warte auf die anderen'; }
    put($('#geo-who'), `<ul class="geo-who">${V.players.map((p) => `<li class="${V.done[p.id] ? 'done' : ''}" style="--pc:${p.color}">${esc(p.name)} <small>${V.done[p.id] ? 'hat getippt' : 'sucht …'}</small></li>`).join('')}</ul>${scoreLine(V, me)}`);
    if (V.deadline) {
      const t = () => { const el = $('#geo-timer'); if (!el) return; const s = Math.max(0, Math.ceil((V.deadline - Date.now()) / 1000)); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; el.classList.toggle('low', s <= 10); };
      t(); tick = setInterval(t, 500);
    }
  }

  // ----- Auflösung -----
  function renderResult(root, V, me, api) {
    const k = `r${V.round}`;
    const L = V.loc;
    if (key !== k || !root.querySelector('.geo-result')) {
      key = k; clearMaps();
      root.innerHTML = `<div class="geo geo-result"><div id="geo-top"></div><div class="geo-res">
        <div id="geo-rmap" class="geo-rmap"></div><div class="geo-side"><div class="p-card geo-answer"><span class="geo-k">Das war</span><h2>${esc(L.name)}</h2><p>${esc(D.COUNTRIES[L.cc] || '')}</p></div>
        <div id="geo-list"></div><div id="geo-btns" class="btn-row"></div><div id="geo-sc"></div></div></div></div>`;
      const m = Lf.map($('#geo-rmap'), { worldCopyJump: false });
      Lf.tileLayer(OSM, { maxZoom: 18, attribution: OSM_ATTR }).addTo(m);
      maps.push(m);
      const pts_ = [[L.lat, L.lng]];
      Lf.marker([L.lat, L.lng], { icon: Lf.divIcon({ className: 'geo-target', html: '<span></span>', iconSize: [26, 26] }) }).bindTooltip(esc(L.name), { permanent: true, direction: 'top', offset: [0, -12] }).addTo(m);
      V.players.forEach((p) => {
        const g = V.guesses[p.id];
        if (!g || g.none || (!g.lat && !g.lng)) return;
        pts_.push([g.lat, g.lng]);
        Lf.polyline([[L.lat, L.lng], [g.lat, g.lng]], { color: p.color, weight: 2, dashArray: '6 6' }).addTo(m);
        Lf.circleMarker([g.lat, g.lng], { radius: 8, color: '#0e0b13', weight: 2, fillColor: p.color, fillOpacity: 1 }).bindTooltip(`${esc(p.name)}: ${dist(g.km)}`, { direction: 'top' }).addTo(m);
      });
      later(m, () => { m.invalidateSize(); if (pts_.length > 1) m.fitBounds(pts_, { padding: [40, 40], maxZoom: 15 }); else m.setView(pts_[0], 12); }, 60);
      // Ton und Spruch für mich
      const g = V.guesses[me];
      if (g && lastRes !== k) {
        lastRes = k;
        if (V.mode === 'country') { FX && FX.play(g.ok ? 'coinUp' : 'coinDown'); VO && VO.say(g.ok ? 'country-right' : 'country-wrong', { chance: 0.8 }); }
        else { FX && FX.play(g.pts >= 3000 ? 'coinUp' : 'coinDown'); VO && VO.say(g.pts >= 4800 ? 'geo-perfect' : g.pts >= 3000 ? 'geo-good' : g.pts < 600 ? 'geo-bad' : 'none', { chance: 0.8 }); }
      }
    }
    put($('#geo-top'), head(V));
    const rows = V.players.slice().sort((a, b) => V.guesses[b.id].pts - V.guesses[a.id].pts).map((p) => {
      const g = V.guesses[p.id];
      const what = g.none ? 'kein Tipp' : V.mode === 'country' ? `${esc(g.cname)} · ${g.ok ? 'richtig' : 'falsch'}` : dist(g.km);
      return `<li style="--pc:${p.color}" class="${V.ready[p.id] ? 'ready' : ''}"><strong>${esc(p.name)}</strong><span>${what}</span><b>+${pts(g.pts)}</b></li>`;
    }).join('');
    put($('#geo-list'), `<ul class="geo-list">${rows}</ul>`);
    const inGame = V.players.some((p) => p.id === me);
    const last = V.round >= V.rounds;
    if (put($('#geo-btns'), `${inGame ? `<button class="btn ${V.ready[me] ? '' : 'btn-primary'}" id="geo-ready">${V.ready[me] ? 'Doch noch warten' : last ? 'Zum Ergebnis' : 'Nächster Ort'}</button>` : ''}${api.isHost ? '<button class="btn btn-ghost" id="geo-next">Weiter (Host)</button>' : ''}`)) {
      if ($('#geo-ready')) $('#geo-ready').onclick = () => api.act({ type: 'ready' });
      if ($('#geo-next')) $('#geo-next').onclick = () => api.act({ type: 'next' });
    }
    put($('#geo-sc'), `<p class="p-sub">${V.players.filter((p) => V.ready[p.id]).length}/${V.players.length} bereit</p>${scoreLine(V, me)}`);
  }

  // ----- Ende -----
  function renderOver(root, V, me, api) {
    key = null; clearMaps();
    const ranked = V.players.slice().sort((a, b) => V.scores[b.id] - V.scores[a.id]);
    const w = ranked[0];
    if (!lastOver) { lastOver = true; if (V.winners.includes(me)) { FX && FX.play('win'); FX && FX.confetti(); } else VO && VO.say('loss', { force: true }); }
    const maxPts = V.rounds * G.MAX;
    root.innerHTML = `<div class="geo geo-over"><div class="p-card geo-final"><p class="sec-label"><span class="n">ENDE</span>GeoGuessr · ${esc(V.setName)}</p>
      <h2>${V.winners.length > 1 ? 'Unentschieden!' : w.id === me ? 'Du gewinnst!' : `${esc(w.name)} gewinnt!`}</h2>
      <ol class="kno-rank">${ranked.map((p) => `<li style="--pc:${p.color}"><strong>${esc(p.name)}</strong><b>${pts(V.scores[p.id])} / ${pts(maxPts)}</b></li>`).join('')}</ol>
      ${Object.keys(V.wins).length ? `<p class="p-sub">Siege: ${V.players.map((p) => `${esc(p.name)} ${V.wins[p.id] || 0}`).join(' · ')}</p>` : ''}
      <div class="btn-row">${api.isHost ? '<button class="btn btn-primary" id="geo-again">Nochmal</button><button class="btn btn-ghost" id="geo-lobby">Zur Lobby</button>' : '<p class="p-wait">Der Host entscheidet, wie es weitergeht.</p>'}</div></div>
      <div class="p-card geo-hist"><table><thead><tr><th>Ort</th>${V.players.map((p) => `<th style="color:${p.color}">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
      ${V.history.map((h) => `<tr><td>${esc(h.loc.name)}<small>${esc(D.COUNTRIES[h.loc.cc] || '')}</small></td>${V.players.map((p) => { const g = h.guesses[p.id] || { none: true, pts: 0 }; return `<td>${pts(g.pts)}<small>${g.none ? 'kein Tipp' : V.mode === 'country' ? esc(g.cname || '') : dist(g.km)}</small></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div></div>`;
    if ($('#geo-again')) { $('#geo-again').onclick = () => { lastOver = false; api.again(); }; $('#geo-lobby').onclick = () => { lastOver = false; api.lobby(); }; }
  }

  const sel = (k, st, host, opts, num) => `<select data-set="${k}" ${num ? 'data-num="1"' : ''} ${host ? '' : 'disabled'}>${opts.map(([v, n]) => `<option value="${v}" ${String(st[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  window.DULI_PARTY.start({
    id: 'geo', title: 'GeoGuessr', kicker: 'WO BIN ICH?', titleHTML: 'Geo<span class="outline">Guessr</span>',
    min: 1, max: 10, soloBots: 0, noBots: true, soloLabel: 'Alleine spielen', soloChip: 'Alleine',
    tagline: 'Ein Satellitenbild von irgendwo. Schau dich um und tipp auf der Karte, wo das ist – oder errate nur das Land.',
    defaults: { mode: 'dist', set: 'world', rounds: 5, time: 0, move: true },
    settingsHTML: (st, host) => `
      <label class="row"><span>Modus<small>${st.mode === 'country' ? 'Nur das richtige Land zählt: 5.000 oder 0 Punkte. Geht mit Welt und Europa.' : 'Je näher dein Tipp, desto mehr Punkte (bis 5.000).'}</small></span>${sel('mode', st, host, [['dist', 'So nah wie möglich'], ['country', 'Nur das Land']])}</label>
      <label class="row"><span>Orte</span>${sel('set', st, host, [['world', 'Welt (192 Orte)'], ['europe', 'Europa'], ['de', 'Deutschland'], ['ruhr', 'Duisburg & Ruhrpott'], ['hohe', 'Hohenlohe']])}</label>
      <label class="row"><span>Runden</span>${sel('rounds', st, host, [[3, '3'], [5, '5'], [10, '10'], [15, '15']], true)}</label>
      <label class="row"><span>Zeit pro Runde</span>${sel('time', st, host, [[0, 'ohne Limit'], [30, '30 Sekunden'], [60, '1 Minute'], [120, '2 Minuten']], true)}</label>
      <label class="row"><span>Umschauen erlaubt<small>Zoomen und ein Stück herumfahren. Aus = festes Bild, viel schwerer.</small></span><input type="checkbox" class="switch" data-set="move" ${st.move !== false ? 'checked' : ''} ${host ? '' : 'disabled'}></label>`,
    rulesHTML: `<div class="p-card"><h3>So geht's</h3><ul>
      <li>Alle sehen dasselbe <b>Satellitenbild</b>. Zoom rein, schau dir Straßen, Dächer, Küsten und Felder an.</li>
      <li><b>So nah wie möglich:</b> Tipp auf der Karte unten rechts, wo das ist. Je näher, desto mehr Punkte (bis 5.000).</li>
      <li><b>Nur das Land:</b> Klick ein Land auf der Karte oder tipp den Namen ein. Richtig gibt 5.000, falsch 0.</li>
      <li>Orte: Welt, Europa, Deutschland, <b>Duisburg & Ruhrpott</b> oder <b>Hohenlohe</b>.</li>
      <li>Wenn alle getippt haben, siehst du alle Tipps auf der Karte und wer am nächsten dran war.</li></ul></div>`,
    engine: G, render,
  });
})();
