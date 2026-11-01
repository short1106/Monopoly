// DULIDAN AURA CLICKER – Idle-Game: Klick die Aura, kauf Generatoren (Mewing bis Six-Seven-Dimension), Upgrades,
// goldene Enten mit Boni, Erfolge, Offline-Aura und Prestige („Nach Ohio aufsteigen“ = Sigma-Punkte, +5 % pro Punkt).
// Speicherstand im Browser (localStorage). April kommentiert. Keine Emojis (icons.js würde sie entfernen).
(function () {
  const FX = window.DULI_FX, VO = window.DULI_VOICE, GF = () => window.DULI_GOOFY;
  const KEY = 'duli-auraclicker-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- Zahlen ----------
  const UNITS = ['', ' Tsd', ' Mio', ' Mrd', ' Bio', ' Brd', ' Trio', ' Trd', ' Quadr', ' Quadrd', ' Quint', ' Quintd'];
  function fmt(n, dec) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return `-${fmt(-n, dec)}`;
    if (n < 1000) return n < 10 && dec ? n.toFixed(1).replace('.', ',') : Math.floor(n).toLocaleString('de-DE');
    const e = Math.min(UNITS.length - 1, Math.floor(Math.log10(n) / 3));
    if (e >= UNITS.length - 1 && n >= 1e36) return n.toExponential(2).replace('.', ',');
    return `${(n / 10 ** (e * 3)).toFixed(2).replace('.', ',')}${UNITS[e]}`;
  }
  const time = (s) => (s < 60 ? `${Math.ceil(s)} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${(s / 3600).toFixed(1).replace('.', ',')} h`);

  // ---------- Inhalte ----------
  // [id, Name, Grundpreis, Aura/s, Farbe, Kürzel, Beschreibung]
  const GENS = [
    ['mew', 'Mewing', 15, 0.1, '#ff7ae6', 'MW', 'Zunge an den Gaumen. Passiv Aura.'],
    ['farm', 'Aura-Farmer', 100, 1, '#3ce08a', 'AF', 'Steht cool rum. Den ganzen Tag.'],
    ['sigma', 'Sigma-Grindset', 1100, 8, '#ffd83a', 'SG', 'Kalt duschen um 4 Uhr. Für die Aura.'],
    ['rizz', 'Rizz-Akademie', 12000, 47, '#ff4fd8', 'RA', 'Unspoken Rizz, jetzt als Kurs.'],
    ['skibidi', 'Skibidi-Toilette', 130000, 260, '#3ad1ff', 'ST', 'Niemand weiß, warum. Aber es wirkt.'],
    ['ohio', 'Ohio-Portal', 1.4e6, 1400, '#8a4dff', 'OP', 'Holt Aura aus der verrücktesten Dimension.'],
    ['tung', 'Tung-Tung-Trommelkreis', 2e7, 7800, '#ff8a1f', 'TT', 'Tung tung tung tung Sahur. Rund um die Uhr.'],
    ['croco', 'Bombardiro-Flotte', 3.3e8, 44000, '#2bb673', 'BC', 'Krokodile mit Flügeln. Werfen Aura ab.'],
    ['server', 'April-Server', 5.1e9, 260000, '#c020b8', 'AS', 'April rechnet Aura aus. Strom zahlt ihr.'],
    ['sixseven', 'Six-Seven-Dimension', 7.5e10, 1.6e6, '#ff3d5e', '67', 'Six seven. Six seven. Six seven.'],
    ['goat', 'GOAT-Status', 1e12, 1e7, '#ffffff', 'GO', 'Du bist jetzt offiziell der Größte. Aller Zeiten.'],
  ];
  const genCost = (g, owned, n = 1) => { const b = GENS[g][2]; let s = 0; for (let i = 0; i < n; i++) s += b * 1.15 ** (owned + i); return Math.ceil(s); };
  // Upgrades: [id, Name, Preis, Text, Bedingung(S), Effekt-Typ]
  const UPS = [];
  const CLICK_UPS = [['Stärkerer Finger', 100], ['Gaming-Maus', 500], ['Klick-Mewing', 10000], ['Doppelklick-Rizz', 1e5], ['Finger aus Titan', 1e7], ['Klick der Götter', 1e9], ['Six-Seven-Finger', 1e11]];
  CLICK_UPS.forEach(([n, p], i) => UPS.push({ id: `c${i}`, name: n, cost: p, text: 'Klicks geben doppelt so viel Aura.', req: (S) => S.clicks >= [1, 50, 200, 600, 1500, 4000, 9000][i], fx: { click: 2 } }));
  UPS.push({ id: 'cps1', name: 'Aura-Leitung', cost: 5e4, text: 'Jeder Klick gibt zusätzlich 1 % deiner Aura pro Sekunde.', req: (S) => S.total >= 2e4, fx: { clickPct: 0.01 } });
  UPS.push({ id: 'cps2', name: 'Aura-Hochspannung', cost: 5e7, text: 'Noch mal +2 % der Aura pro Sekunde je Klick.', req: (S) => S.total >= 2e7, fx: { clickPct: 0.02 } });
  const TIER = [[10, 'Level 2'], [25, 'Level 3'], [50, 'Level 4'], [100, 'MAX']];
  const GEN_UP_NAMES = {
    mew: ['Kieferlinie definiert', 'Mewing im Schlaf', 'Kinn wie ein Ziegelstein', 'Mewing-Gott'],
    farm: ['Bessere Pose', 'Sonnenbrille drinnen', 'Hintergrund-Musik', 'Main Character'],
    sigma: ['Eisbad', 'Kein Zucker mehr', 'Lambo-Poster', 'Patrick Bateman'],
    rizz: ['Augenbrauen-Move', 'Gesprächseröffnung', 'Rizz-Diplom', 'Rizz-Professor'],
    skibidi: ['Mehr Toiletten', 'Dop dop yes yes', 'Kamera-Mann', 'G-Man'],
    ohio: ['Stabileres Portal', 'Ohio-Visum', 'Ohio-Bürgermeister', 'Ohio ist überall'],
    tung: ['Größere Trommel', 'Mitternachts-Schicht', 'Sahur-Chor', 'Sahur-König'],
    croco: ['Schärfere Zähne', 'Düsenantrieb', 'Krokodil-Admiral', 'Bombardiro Supremo'],
    server: ['Mehr RAM', 'Wasserkühlung', 'April-Update 6.7', 'April wird Gott'],
    sixseven: ['Six', 'Seven', 'Six Seven', 'SIX SEVEN'],
    goat: ['Goated', 'Mega-Goated', 'Ultra-Goated', 'Der eine GOAT'],
  };
  GENS.forEach(([id, name, base], g) => TIER.forEach(([n], t) => UPS.push({ id: `g${id}${t}`, name: `${name}: ${GEN_UP_NAMES[id][t]}`, cost: Math.ceil(base * 10 * 5 ** t * (t === 3 ? 4 : 1)), text: `${name} produziert doppelt so viel.`, req: (S) => S.owned[g] >= n, fx: { gen: g, mult: 2 }, gen: g })));
  UPS.push({ id: 'duck1', name: 'Entenfutter', cost: 7.7e5, text: 'Goldene Enten kommen öfter.', req: (S) => S.ducks >= 3, fx: { duckRate: 0.75 } });
  UPS.push({ id: 'duck2', name: 'Langsame Enten', cost: 7.7e7, text: 'Goldene Enten bleiben doppelt so lange.', req: (S) => S.ducks >= 10, fx: { duckStay: 2 } });
  UPS.push({ id: 'all1', name: 'Aura-Bewusstsein', cost: 1e6, text: 'Alles +10 %.', req: (S) => S.total >= 3e5, fx: { all: 1.1 } });
  UPS.push({ id: 'all2', name: 'Aura-Erleuchtung', cost: 1e9, text: 'Alles +25 %.', req: (S) => S.total >= 3e8, fx: { all: 1.25 } });
  UPS.push({ id: 'all3', name: 'Aura-Singularität', cost: 1e12, text: 'Alles +50 %.', req: (S) => S.total >= 3e11, fx: { all: 1.5 } });

  // Erfolge
  const ACH = [];
  [[1, 'Erste Aura'], [1e3, 'Aura-Anfänger'], [1e5, 'Aura-Influencer'], [1e7, 'Aura-Millionär im Kopf'], [1e9, 'Aura-Milliardär'], [1e12, 'Aura-Billionär'], [1e15, 'Aura jenseits von Ohio']].forEach(([n, t], i) => ACH.push({ id: `t${i}`, name: t, text: `${fmt(n)} Aura insgesamt`, ok: (S) => S.total >= n }));
  [[10, 'Fingerübung'], [500, 'Sehnenscheiden-Speedrun'], [5000, 'Klick-Maschine'], [25000, 'Hat kein Leben']].forEach(([n, t], i) => ACH.push({ id: `k${i}`, name: t, text: `${fmt(n)} Klicks`, ok: (S) => S.clicks >= n }));
  [[1, 'Ente gesichtet'], [10, 'Entenflüsterer'], [50, 'Enten-Mafia']].forEach(([n, t], i) => ACH.push({ id: `d${i}`, name: t, text: `${n} goldene Enten`, ok: (S) => S.ducks >= n }));
  [[1, 'Ohio-Tourist'], [5, 'Ohio-Bewohner'], [25, 'Ohio-Gottheit']].forEach(([n, t], i) => ACH.push({ id: `p${i}`, name: t, text: `${n} Sigma-Punkte`, ok: (S) => S.sigma >= n }));
  GENS.forEach(([id, name], g) => ACH.push({ id: `o${id}`, name: `${name} x50`, text: `50 ${name} besitzen`, ok: (S) => S.owned[g] >= 50 }));
  ACH.push({ id: 'six7', name: 'SIX SEVEN', text: 'Genau 67 Aura pro Sekunde (abgerundet)', ok: (S, A) => Math.floor(A.ps) === 67 });
  ACH.push({ id: 'broke', name: 'Pleite-Sigma', text: 'Alles ausgegeben (unter 1 Aura)', ok: (S) => S.total > 1000 && S.aura < 1 });

  const APRIL = {
    idle: ['Klick schneller. Ich seh dich.', 'Deine Aura wächst. Dein Leben nicht.', 'Fun Fact: Mewing macht nichts. Hier schon.', 'Ich zähl mit. Bei jedem Klick.', 'Hast du heute schon Wasser getrunken? Egal. Klick.', 'Das ist mein Lieblingsspiel. Weil ich gewinne.', 'Six seven.', 'Die Enten sind echt. Glaub mir.', 'Du bist so nah an der nächsten Stufe. Wahrscheinlich.', 'Jeder Klick ist ein Schritt Richtung Ohio.'],
    buy: ['Gute Investition. Glaub ich.', 'Noch einer! Noch einer!', 'Bro kauft sich Aura. Respekt.', 'Teuer. Aber Sigma.'],
    duck: ['ENTE! ENTE! Klick sie!', 'Die goldene Ente hat dich gewählt.', 'Quack heißt auf Ohio „Glückwunsch“.'],
    prestige: ['Willkommen in Ohio. Hier fängt alles von vorne an. Nur stärker.', 'Du hast alles aufgegeben. Für Sigma-Punkte. Wahre Größe.'],
    ach: ['Erfolg freigeschaltet. Ich bin fast stolz.', 'Noch ein Erfolg. Hörst du auch mal auf?'],
    offline: ['Während du weg warst, hab ich für dich gefarmt. Gern geschehen.'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- Zustand ----------
  const fresh = () => ({ aura: 0, total: 0, allTime: 0, clicks: 0, owned: GENS.map(() => 0), ups: {}, ach: {}, ducks: 0, sigma: 0, ascends: 0, last: Date.now(), buyN: 1 });
  let S = fresh();
  try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw) S = Object.assign(fresh(), raw, { owned: GENS.map((_, i) => (raw.owned || [])[i] || 0) }); } catch (e) { /* neu */ }
  const save = () => { S.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* privat */ } };

  // Boni (Enten) laufen nur in dieser Sitzung
  const buffs = []; // { name, prod, click, until }
  const A = { ps: 0, click: 1 };
  function recalc() {
    let all = (1 + S.sigma * 0.05), click = 1, clickPct = 0;
    const genMult = GENS.map(() => 1);
    UPS.forEach((u) => { if (!S.ups[u.id]) return; const f = u.fx; if (f.click) click *= f.click; if (f.clickPct) clickPct += f.clickPct; if (f.gen != null) genMult[f.gen] *= f.mult; if (f.all) all *= f.all; });
    const nowT = Date.now();
    let bp = 1, bc = 1;
    buffs.forEach((b) => { if (b.until > nowT) { bp *= b.prod || 1; bc *= b.click || 1; } });
    A.gen = GENS.map((g, i) => g[3] * genMult[i] * all * bp);
    A.ps = A.gen.reduce((s, v, i) => s + v * S.owned[i], 0);
    A.click = (click * all + A.ps * clickPct) * bc;
  }
  const duckRate = () => (S.ups.duck1 ? 0.75 : 1);
  const duckStay = () => (S.ups.duck2 ? 2 : 1);
  const sigmaGain = () => Math.floor(Math.cbrt(S.total / 1e9));

  // ---------- Oberfläche ----------
  const root = $('#ac');
  root.innerHTML = `<div class="ac">
    <section class="ac-left">
      <div class="ac-bank"><small>AURA</small><b id="ac-aura">0</b><span id="ac-ps">0 pro Sekunde</span></div>
      <button class="ac-orb" id="ac-orb" aria-label="Aura klicken"><i class="ac-ring"></i><i class="ac-ring r2"></i><svg viewBox="0 0 100 100"><use href="#april"/></svg></button>
      <p class="ac-click" id="ac-click">+1 pro Klick</p>
      <div class="ac-buffs" id="ac-buffs"></div>
      <div class="ac-april"><svg viewBox="0 0 100 100"><use href="#april"/></svg><p id="ac-say">Klick mich. Für die Aura.</p></div>
    </section>
    <section class="ac-mid">
      <div class="ac-tabs"><button data-tab="stats" class="on">Stats</button><button data-tab="ach">Erfolge</button><button data-tab="ohio">Ohio</button></div>
      <div id="ac-panel"></div>
    </section>
    <section class="ac-right">
      <div class="ac-shop-h"><b>UPGRADES</b></div><div class="ac-ups" id="ac-ups"></div>
      <div class="ac-shop-h"><b>GENERATOREN</b><span class="ac-n">${[1, 10, 100].map((n) => `<button data-n="${n}">x${n}</button>`).join('')}</span></div><div class="ac-gens" id="ac-gens"></div>
    </section></div><div class="ac-fx" id="ac-fx"></div>`;
  const orb = $('#ac-orb'), fxl = $('#ac-fx');
  let tab = 'stats';

  function say(t) { const p = $('#ac-say'); p.textContent = t; p.classList.remove('pop'); void p.offsetWidth; p.classList.add('pop'); }
  function floatTxt(t, x, y, cls = '') {
    const el = document.createElement('span'); el.className = `ac-float ${cls}`; el.textContent = t;
    el.style.left = `${x + (Math.random() - 0.5) * 40}px`; el.style.top = `${y}px`; fxl.appendChild(el); setTimeout(() => el.remove(), 1100);
  }
  function toast(title, sub) {
    const el = document.createElement('div'); el.className = 'ac-toast'; el.innerHTML = `<b>${esc(title)}</b><small>${esc(sub)}</small>`;
    fxl.appendChild(el); setTimeout(() => el.remove(), 3800);
  }
  function gain(n) { S.aura += n; S.total += n; S.allTime += n; }

  // Klicken
  orb.addEventListener('pointerdown', (e) => {
    e.preventDefault(); recalc();
    gain(A.click); S.clicks++;
    floatTxt(`+${fmt(A.click, 1)}`, e.clientX, e.clientY - 20);
    orb.classList.remove('hit'); void orb.offsetWidth; orb.classList.add('hit');
    if (S.clicks % 67 === 0) { floatTxt('SIX SEVEN', e.clientX, e.clientY - 60, 'big'); FX && FX.play('coinUp'); }
    else if (Math.random() < 0.08) FX && FX.play('step');
  });

  orb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const r = orb.getBoundingClientRect(); orb.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); } });
  function buyGen(g) {
    const n = S.buyN === 'max' ? maxBuy(g) : S.buyN, c = genCost(g, S.owned[g], Math.max(1, n));
    if (n < 1 || S.aura < c) return;
    S.aura -= c; S.owned[g] += n; FX && FX.play('build');
    if (Math.random() < 0.15) say(pick(APRIL.buy));
    if (S.owned[g] === 1 && g >= 4) say(`${GENS[g][1]}?! Jetzt wird es ernst.`);
    drawShop(true);
  }
  function maxBuy(g) { let n = 0; while (genCost(g, S.owned[g], n + 1) <= S.aura && n < 1000) n++; return n; }
  function buyUp(id) {
    const u = UPS.find((x) => x.id === id);
    if (!u || S.ups[id] || S.aura < u.cost) return;
    S.aura -= u.cost; S.ups[id] = 1; FX && FX.play('cash'); say(`${u.name}. ${pick(APRIL.buy)}`);
    drawShop(true);
  }

  let shopSig = '';
  function drawShop(force) {
    recalc();
    const avail = UPS.filter((u) => !S.ups[u.id] && u.req(S)).sort((a, b) => a.cost - b.cost).slice(0, 12);
    const sig = `${S.owned.join(',')}|${Object.keys(S.ups).length}|${avail.map((u) => u.id).join(',')}|${S.buyN}|${S.total > 0 ? GENS.findIndex((g, i) => S.owned[i] === 0 && S.total < g[2] * 0.6) : 0}`;
    if (force || sig !== shopSig) {
      shopSig = sig;
      $('#ac-ups').innerHTML = avail.length ? avail.map((u) => `<button class="ac-up" data-up="${u.id}" title="${esc(u.name)}: ${esc(u.text)} (${fmt(u.cost)})" style="--c:${u.gen != null ? GENS[u.gen][4] : u.id.startsWith('c') ? '#ffd83a' : '#8a4dff'}"><b>${u.gen != null ? GENS[u.gen][5] : u.id.startsWith('c') ? 'KL' : u.id.startsWith('duck') ? 'EN' : 'A+'}</b><span>${esc(u.name)}</span><small>${fmt(u.cost)}</small></button>`).join('') : '<p class="ac-none">Gerade keine Upgrades. Farm weiter.</p>';
      // Nur sichtbare Generatoren: alle gekauften + der nächste
      const firstLocked = GENS.findIndex((g, i) => S.owned[i] === 0 && S.total < g[2] * 0.6);
      const show = GENS.map((_, i) => i).filter((i) => firstLocked < 0 || i <= firstLocked);
      $('#ac-gens').innerHTML = show.map((g) => {
        const [id, name, , , col, abbr, desc] = GENS[g], hidden = g === firstLocked;
        return `<button class="ac-gen ${hidden ? 'locked' : ''}" data-gen="${g}" style="--c:${col}"><b class="ac-ic">${hidden ? '??' : abbr}</b><span class="ac-gn"><strong>${hidden ? '???' : esc(name)}</strong><small>${hidden ? 'Noch geheim. Mehr Aura farmen.' : esc(desc)}</small><em data-cost="${g}"></em></span><i class="ac-own">${S.owned[g]}</i></button>`;
      }).join('');
      document.querySelectorAll('.ac-n button').forEach((b) => b.classList.toggle('on', String(S.buyN) === b.dataset.n || (b.dataset.n === '100' && S.buyN === 100)));
    }
    // Preise und Kaufbarkeit live
    document.querySelectorAll('[data-up]').forEach((b) => { const u = UPS.find((x) => x.id === b.dataset.up); b.classList.toggle('can', S.aura >= u.cost); });
    document.querySelectorAll('[data-gen]').forEach((b) => {
      const g = Number(b.dataset.gen), n = S.buyN === 'max' ? Math.max(1, maxBuy(g)) : S.buyN, c = genCost(g, S.owned[g], n);
      b.classList.toggle('can', S.aura >= c && !b.classList.contains('locked'));
      const em = b.querySelector('[data-cost]'); if (em) em.textContent = `${fmt(c)} Aura${n > 1 ? ` (x${n})` : ''} · +${fmt(A.gen[g], 1)}/s je Stück`;
    });
  }
  $('#ac-ups').addEventListener('click', (e) => { const b = e.target.closest('[data-up]'); if (b) buyUp(b.dataset.up); });
  $('#ac-gens').addEventListener('click', (e) => { const b = e.target.closest('[data-gen]'); if (b && !b.classList.contains('locked')) buyGen(Number(b.dataset.gen)); });
  document.querySelectorAll('.ac-n button').forEach((b) => { b.onclick = () => { S.buyN = Number(b.dataset.n); drawShop(true); }; });

  // Mitte: Stats, Erfolge, Ohio (Prestige)
  document.querySelectorAll('.ac-tabs button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; document.querySelectorAll('.ac-tabs button').forEach((x) => x.classList.toggle('on', x === b)); drawPanel(true); }; });
  let panelT = 0;
  function drawPanel(force) {
    if (!force && Date.now() - panelT < 1000) return;
    panelT = Date.now();
    const P = $('#ac-panel');
    if (tab === 'stats') {
      const got = Object.keys(S.ach).length;
      P.innerHTML = `<dl class="ac-stats"><dt>Aura gerade</dt><dd>${fmt(S.aura)}</dd><dt>Aura in diesem Durchlauf</dt><dd>${fmt(S.total)}</dd><dt>Aura insgesamt</dt><dd>${fmt(S.allTime)}</dd><dt>Pro Sekunde</dt><dd>${fmt(A.ps, 1)}</dd><dt>Pro Klick</dt><dd>${fmt(A.click, 1)}</dd><dt>Klicks</dt><dd>${fmt(S.clicks)}</dd><dt>Goldene Enten</dt><dd>${S.ducks}</dd><dt>Sigma-Punkte</dt><dd>${S.sigma} (+${S.sigma * 5} %)</dd><dt>Erfolge</dt><dd>${got}/${ACH.length}</dd></dl>
        <div class="btn-row"><button class="btn btn-small btn-ghost" id="ac-reset">Alles löschen</button></div>`;
      $('#ac-reset').onclick = () => { if (confirm('Wirklich ALLES löschen? Auch Sigma-Punkte und Erfolge.')) { S = fresh(); save(); recalc(); drawShop(true); drawPanel(true); say('Neustart. Ganz ohne Aura. Mutig.'); } };
    } else if (tab === 'ach') {
      P.innerHTML = `<div class="ac-achs">${ACH.map((a) => `<div class="ac-ach ${S.ach[a.id] ? 'got' : ''}" title="${esc(a.text)}"><b>${S.ach[a.id] ? esc(a.name) : '???'}</b><small>${esc(a.text)}</small></div>`).join('')}</div>`;
    } else {
      const g = sigmaGain() - S.sigma;
      P.innerHTML = `<div class="ac-ohio"><h3>NACH OHIO AUFSTEIGEN</h3><p>Du verlierst Aura, Generatoren und Upgrades. Dafür bekommst du <b>Sigma-Punkte</b>: Jeder gibt dauerhaft <b>+5 %</b> auf alles. Erfolge bleiben.</p>
        <p class="ac-sg">Sigma-Punkte jetzt: <b>${S.sigma}</b><br>Beim Aufsteigen dazu: <b>${Math.max(0, g)}</b></p>
        <p class="p-sub">Nächster Punkt bei ${fmt((S.sigma + Math.max(0, g) + 1) ** 3 * 1e9)} Aura in diesem Durchlauf.</p>
        <button class="btn btn-primary" id="ac-asc" ${g > 0 ? '' : 'disabled'}>Nach Ohio aufsteigen</button></div>`;
      $('#ac-asc').onclick = () => {
        const add = sigmaGain() - S.sigma;
        if (add <= 0 || !confirm(`Wirklich aufsteigen? +${add} Sigma-Punkte, alles andere wird zurückgesetzt.`)) return;
        S = Object.assign(fresh(), { sigma: S.sigma + add, ascends: S.ascends + 1, ach: S.ach, allTime: S.allTime, ducks: S.ducks, clicks: S.clicks });
        save(); recalc(); drawShop(true); drawPanel(true); say(pick(APRIL.prestige));
        document.body.classList.add('ac-ohio-fx'); setTimeout(() => document.body.classList.remove('ac-ohio-fx'), 2600);
        GF() && GF().play('boom'); FX && FX.play('win');
      };
    }
  }

  // ---------- Goldene Enten ----------
  const DUCK = '<svg viewBox="0 0 64 56"><ellipse cx="30" cy="36" rx="22" ry="15" fill="#ffd83a"/><circle cx="46" cy="18" r="12" fill="#ffd83a"/><path d="M56 17 L66 21 L56 24 Z" fill="#ff8a1f"/><circle cx="49" cy="15" r="2.4" fill="#111"/></svg>';
  let nextDuck = Date.now() + (40 + Math.random() * 60) * 1000;
  function spawnDuck() {
    const d = document.createElement('button'); d.className = 'ac-duck'; d.innerHTML = DUCK; d.setAttribute('aria-label', 'Goldene Ente');
    d.style.left = `${8 + Math.random() * 80}vw`; d.style.top = `${15 + Math.random() * 65}vh`;
    d.onclick = (e) => {
      d.remove(); S.ducks++; recalc();
      const r = Math.random(), x = e.clientX, y = e.clientY;
      if (r < 0.4) { const g = Math.max(13, Math.min(S.aura * 0.15, A.ps * 900)); gain(g); floatTxt(`GLÜCK! +${fmt(g)}`, x, y, 'big'); toast('Glückspilz-Ente', `+${fmt(g)} Aura`); }
      else if (r < 0.75) { buffs.push({ name: 'Aura-Rausch', prod: 7, until: Date.now() + 30000 }); toast('AURA-RAUSCH', 'Produktion x7 für 30 Sekunden'); }
      else if (r < 0.93) { buffs.push({ name: 'Klick-Frenzy', click: 77, until: Date.now() + 13000 }); toast('KLICK-FRENZY', 'Klicks x77 für 13 Sekunden'); }
      else { buffs.push({ name: 'Ohio-Moment', prod: 2, click: 2, until: Date.now() + 15000 }); toast('OHIO-MOMENT', 'Alles x2 für 15 Sekunden. Und kopfüber.'); document.body.classList.add('ac-ohio-fx'); setTimeout(() => document.body.classList.remove('ac-ohio-fx'), 2600); }
      GF() && GF().play('quack'); FX && FX.play('bigGain');
    };
    document.body.appendChild(d); say(pick(APRIL.duck));
    setTimeout(() => d.remove(), 12000 * duckStay());
  }

  // ---------- Hauptschleife ----------
  let lastT = performance.now(), sayT = Date.now() + 15000, saveT = Date.now();
  function loop(t) {
    const dt = Math.min(1, (t - lastT) / 1000); lastT = t;
    recalc();
    if (A.ps) gain(A.ps * dt);
    for (let i = buffs.length - 1; i >= 0; i--) if (buffs[i].until < Date.now()) buffs.splice(i, 1);
    $('#ac-aura').textContent = fmt(S.aura);
    $('#ac-ps').textContent = `${fmt(A.ps, 1)} pro Sekunde`;
    $('#ac-click').textContent = `+${fmt(A.click, 1)} pro Klick`;
    $('#ac-buffs').innerHTML = buffs.map((b) => `<span>${esc(b.name)} ${Math.ceil((b.until - Date.now()) / 1000)} s</span>`).join('');
    document.title = `${fmt(S.aura)} Aura · Aura Clicker`;
    drawShop(false); drawPanel(false);
    const nowT = Date.now();
    if (nowT > nextDuck) { spawnDuck(); nextDuck = nowT + (45 + Math.random() * 90) * 1000 * duckRate(); }
    if (nowT > sayT) { sayT = nowT + 20000 + Math.random() * 25000; say(pick(APRIL.idle)); }
    if (nowT - saveT > 5000) { saveT = nowT; save(); checkAch(); }
    requestAnimationFrame(loop);
  }
  function checkAch() {
    ACH.forEach((a) => {
      if (S.ach[a.id] || !a.ok(S, A)) return;
      S.ach[a.id] = 1; toast(`ERFOLG: ${a.name}`, a.text); FX && FX.play('pot');
      if (Math.random() < 0.5) say(pick(APRIL.ach));
    });
  }

  // Offline-Aura: 50 % für höchstens 8 Stunden
  recalc();
  const away = Math.min(8 * 3600, (Date.now() - (S.last || Date.now())) / 1000);
  if (away > 60 && A.ps > 0) {
    const g = A.ps * away * 0.5; gain(g);
    setTimeout(() => { toast('Willkommen zurück', `${time(away)} weg: +${fmt(g)} Aura`); say(pick(APRIL.offline)); }, 600);
  }
  addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  drawShop(true); drawPanel(true);
  requestAnimationFrame(loop);
  if (VO && !S.total) setTimeout(() => VO.say('aura-start', { force: true }), 1200);
  window.DULI_AURA_CLICKER = { get state() { return S; }, A, fmt, spawnDuck, save };
})();
