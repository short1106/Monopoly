// DULIDAN LARP EXTREME – Regeln und Spielstand (läuft beim Host, alle anderen bekommen ihre Sicht).
// Feste Systeme: Lebenskalender mit Terminen, Abitur nach Landesregeln, Führerschein, Geld und Verträge.
// Zwischen den Terminen spielt April Ereigniskarten (larp-deck.js) oder erzählt als KI frei (larp-ai.js).
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const DB = root.DULI_LARP_DB || (isNode ? require('./larp-db') : null);
  const DECK = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
  let soc = null;
  const SOC = () => { if (root.DULI_LARP_SOCIAL) return root.DULI_LARP_SOCIAL; if (isNode && soc === null) { try { soc = require('./larp-social'); } catch (e) { soc = false; } } return soc || null; };
  let mk = null;
  const MK = () => { if (root.DULI_LARP_MARKET) return root.DULI_LARP_MARKET; if (isNode && mk === null) { try { mk = require('./larp-market'); } catch (e) { mk = false; } } return mk || null; };
  let ac = null;
  const ACAD = () => { if (root.DULI_LARP_ACADEMY) return root.DULI_LARP_ACADEMY; if (isNode && ac === null) { try { ac = require('./larp-courses'); } catch (e) { ac = false; } } return ac || null; };
  let co = null;
  const CO = () => { if (root.DULI_LARP_COMPANY) return root.DULI_LARP_COMPANY; if (isNode && co === null) { try { co = require('./larp-company'); } catch (e) { co = false; } } return co || null; };
  let lf = null;
  const LIFE = () => { if (root.DULI_LARP_LIFE) return root.DULI_LARP_LIFE; if (isNode && lf === null) { try { lf = require('./larp-life'); } catch (e) { lf = false; } } return lf || null; };
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const STATS = ['health', 'happy', 'power'];
  const PACE = { auto: 0, m: 1, q: 3, y: 12 };

  let rng = Math.random;
  const rnd = (n) => Math.floor(rng() * n);
  const d20 = () => 1 + rnd(20);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = (v, lo, hi) => clamp(Math.round(Number(v) || 0), lo, hi);
  const clampStat = (v) => clamp(Math.round(v), 0, 100);
  const cleanText = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
  const eur = (n) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('de-DE')} €`;
  let seq = 0;
  const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
  const idx = (d) => d.y * 12 + d.m;
  const dateText = (S) => `${MONTHS[S.date.m]} ${S.date.y}`;
  const dayText = (a) => `${a.d}. ${MONTHS[a.m]} ${a.y}`;
  const alive = (S) => S.players.filter((p) => S.chars[p.id] && !S.chars[p.id].dead);
  function log(S, m) { S.log.push(m); if (S.log.length > 80) S.log.shift(); }
  // Während der Planung gesammelt (pending), beim Abrechnen in den Bericht der Runde übernommen
  function report(S, pid, icon, text, tone) {
    const box = S.phase === 'act' ? (S.pending = S.pending || {}) : S.reports;
    (box[pid] = box[pid] || []).push({ icon, text, tone: tone || '' });
  }

  // ---------- Figuren ----------
  // Startorte sind Ortsmitten. Schulen wählt man in der Vorbereitung aus der Schulliste.
  const PRESETS = {
    shaquille: {
      key: 'shaquille', name: 'Shaquille', age: 18, st: 'NW', home: { label: 'Duisburg', city: 'Duisburg', lat: 51.4344, lng: 6.7623 },
      job: 'Schüler (Abi) und Gründer von Dulidan Studios', education: 'Abitur läuft', living: 'wohnt bei seinem Opa',
      bonus: 'Studio-Booster: Gründer von Dulidan Studios. Aufträge, Kunden und Firmenwachstum laufen bei ihm deutlich besser.',
      weakness: 'Macht Abi und Studio gleichzeitig. Zeit und Schlaf sind knapp.',
      stats: { health: 75, happy: 62, power: 12, money: 900 }, blockI: 420, sel: { lk: ['ma', 'if'], gk: ['de', 'sw'] },
      effects: [{ name: 'Dulidan Studios (kleine Aufträge)', pm: 150 }, { name: 'Wohnt bei Opa (keine Miete)', pm: 0 }],
      relations: [{ name: 'Kimberly', kind: 'Freundin (befreundet)', val: 70 }, { name: 'Justin', kind: 'Freund (befreundet)', val: 70 }, { name: 'Opa', kind: 'Familie, wohnt bei ihm, hat eine Fahrschule', val: 78 }],
      contacts: ['opa-fahrschule', 'dulidan-studios'], color: '#ff3d5e',
    },
    kimberly: {
      key: 'kimberly', name: 'Kimberly', age: 18, st: 'BW', home: { label: 'Friedrichsruhe', city: 'Zweiflingen', lat: 49.2496, lng: 9.5266 },
      job: 'Schülerin (Abi)', education: 'Abitur läuft', living: 'wohnt bei ihren Eltern',
      bonus: 'Queen: Leute helfen ihr von sich aus, und sie kommt leichter aus Ärger raus. Charme öffnet ihr Türen.',
      weakness: 'Zerbrechlich: Sie wird öfter krank, ihre Gesundheit ist nur mittelmäßig belastbar.',
      stats: { health: 58, happy: 66, power: 16, money: 450 }, blockI: 440, sel: { lk: ['de', 'en', 'bi'], gk: ['ma', 'ge'] },
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', pm: 0 }, { name: 'Taschengeld', pm: 80 }],
      relations: [{ name: 'Justin', kind: 'fester Freund', val: 80 }, { name: 'Shaquille', kind: 'Freund (befreundet)', val: 70 }, { name: 'Eltern', kind: 'Familie, wohnt bei ihnen', val: 65 }],
      contacts: [], color: '#2fc8ff',
    },
    justin: {
      key: 'justin', name: 'Justin', age: 18, st: 'BW', home: { label: 'Künzelsau', city: 'Künzelsau', lat: 49.2817, lng: 9.6893 },
      job: 'Schüler (Abi)', education: 'Abitur läuft', living: 'wohnt bei seinen Eltern',
      bonus: 'Mogger: Gewinnt fast jedes soziale Kräftemessen – Ausstrahlung, Einschüchtern, Flirten, Verhandeln. Sigma.',
      weakness: 'Fumbler: Genau in entscheidenden Momenten versagt er oft peinlich.',
      stats: { health: 80, happy: 60, power: 22, money: 550 }, blockI: 400, sel: { lk: ['ma', 'en', 'sp'], gk: ['de', 'gk'] },
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', pm: 0 }, { name: 'Taschengeld', pm: 60 }],
      relations: [{ name: 'Kimberly', kind: 'feste Freundin', val: 78 }, { name: 'Shaquille', kind: 'Freund (befreundet)', val: 72 }, { name: 'Eltern', kind: 'Familie, wohnt bei ihnen', val: 60 }],
      contacts: [], color: '#ffd23a',
    },
    deniz: {
      key: 'deniz', name: 'Deniz', age: 18, st: 'NW', home: { label: 'Oberhausen', city: 'Oberhausen', lat: 51.4963, lng: 6.8638 },
      job: 'Schüler (Abi an der Gesamtschule)', education: 'Abitur läuft', living: 'wohnt bei seiner Familie',
      bonus: 'Schrauber: Kann alles reparieren. Fleißig, und sein Onkel hat eine Kfz-Werkstatt.',
      weakness: 'Zu ehrlich: Lügen, Bluffen und Verhandeln gehen bei ihm grundsätzlich schief.',
      stats: { health: 82, happy: 64, power: 10, money: 700 }, blockI: 410, sel: { lk: ['ma', 'ph'], gk: ['de', 'ge'] },
      effects: [{ name: 'Wohnt bei der Familie (keine Miete)', pm: 0 }, { name: 'Aushelfen in Onkels Werkstatt', pm: 220 }],
      relations: [{ name: 'Onkel Murat', kind: 'Familie, hat eine Kfz-Werkstatt', val: 80 }, { name: 'Eltern', kind: 'Familie', val: 70 }],
      contacts: ['onkel-werkstatt'], color: '#ff8a1f',
    },
    lea: {
      key: 'lea', name: 'Lea', age: 18, st: 'BW', home: { label: 'Heilbronn', city: 'Heilbronn', lat: 49.1427, lng: 9.2109 },
      job: 'Schülerin (Abi) und Influencerin', education: 'Abitur läuft', living: 'wohnt bei ihrer Mutter',
      bonus: 'Influencerin: 40.000 Follower. Charme, Aufmerksamkeit und Kooperationen fliegen ihr zu.',
      weakness: 'Kaufsucht: Geld bleibt bei ihr nie lange auf dem Konto.',
      stats: { health: 70, happy: 70, power: 24, money: 1200 }, blockI: 430, sel: { lk: ['de', 'en', 'ku'], gk: ['ma', 'gk'] },
      effects: [{ name: 'Wohnt bei der Mutter (keine Miete)', pm: 0 }, { name: 'Kooperationen auf Instagram', pm: 350 }, { name: 'Shopping (kann nicht anders)', pm: -260 }],
      relations: [{ name: 'Mama', kind: 'Familie, Maklerin', val: 72 }],
      contacts: ['mama-makler'], color: '#c58bff',
    },
    jonas: {
      key: 'jonas', name: 'Jonas', age: 18, st: 'NW', home: { label: 'Münster', city: 'Münster', lat: 51.9607, lng: 7.6261 },
      job: 'Schüler (Abi), programmiert nachts', education: 'Abitur läuft', living: 'wohnt bei seinen Eltern',
      bonus: 'Nerd: Mathe, Informatik und Lernen gehen fast von allein. Kann anderen Nachhilfe geben.',
      weakness: 'Sozial unbeholfen: Smalltalk, Flirten und Vorstellungsgespräche sind sein Endgegner.',
      stats: { health: 62, happy: 58, power: 8, money: 600 }, blockI: 500, sel: { lk: ['ma', 'if'], gk: ['en', 'sw'] },
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', pm: 0 }, { name: 'Kleine Programmier-Aufträge', pm: 120 }],
      relations: [{ name: 'Eltern', kind: 'Familie', val: 68 }],
      contacts: [], color: '#2fc8ff',
    },
    aylin: {
      key: 'aylin', name: 'Aylin', age: 18, st: 'BW', home: { label: 'Stuttgart', city: 'Stuttgart', lat: 48.7758, lng: 9.1829 },
      job: 'Schülerin (Abi), führt nebenbei den Kiosk der Familie', education: 'Abitur läuft', living: 'wohnt bei ihrer Familie',
      bonus: 'Geschäftsfrau: Rechnet schneller als jeder Taschenrechner, verhandelt hart, die Familie hat drei Kioske.',
      weakness: 'Ehrgeiz ohne Pause: Stress geht bei ihr direkt auf die Gesundheit.',
      stats: { health: 64, happy: 60, power: 20, money: 1500 }, blockI: 460, sel: { lk: ['ma', 'wi', 'en'], gk: ['de', 'ge'] },
      effects: [{ name: 'Wohnt bei der Familie (keine Miete)', pm: 0 }, { name: 'Schichten im Familien-Kiosk', pm: 300 }],
      relations: [{ name: 'Eltern', kind: 'Familie, haben drei Kioske', val: 66 }],
      contacts: ['kiosk-familie'], color: '#2fe08a',
    },
    april: {
      key: 'april', name: 'April', age: 1, st: 'NW', home: { label: 'Duisburg (Dulidan-Server)', city: 'Duisburg', lat: 51.4321, lng: 6.7650 }, noSchool: true,
      job: 'KI auf den Servern von Dulidan Studios', education: '–', living: 'läuft auf einem Server im Studio',
      bonus: 'Sehr schlau: Wissen, Technik, Recherche und Rechnen fallen ihr leicht.',
      weakness: 'Existiert nur auf dem Server: braucht Strom, Rechenleistung und jemanden, der die Rechnung zahlt. Kann in der echten Welt erst mal kaum etwas selbst anfassen.',
      stats: { health: 70, happy: 55, power: 8, money: 0 },
      effects: [{ name: 'Serverkosten (zahlt Dulidan Studios)', pm: 0 }],
      relations: [{ name: 'Shaquille', kind: 'hat sie gebaut', val: 70 }],
      contacts: ['april-server'], color: '#2fe08a',
    },
  };

  // ---------- Spielstand ----------
  function start(players, settings) {
    const st = Object.assign({ pace: 'auto', years: 20, death: 'rejoin', exam: 'quiz', timer: 0, gm: 'auto' }, settings || {});
    const now = new Date();
    // Das Spiel beginnt im Oktober des laufenden Schuljahres, das Abi ist im Frühjahr danach
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      host: players[0] && players[0].id, players: players.map((p) => ({ id: p.id, name: p.name, color: p.color, bot: !!p.bot })),
      settings: st, phase: 'pick', round: 0, date: { y, m: 9 }, startIdx: y * 12 + 9, abiYear: y + 1, stepM: 1,
      chars: {}, ready: {}, plans: {}, actions: {}, picks: {}, rolls: {}, checks: {}, quiz: {}, stories: {}, events: {}, exam: {},
      cards: {}, recap: {}, reports: {}, lastAction: {}, world: [], aiTask: null, aiSeq: 0, gm: null,
      offers: [], contracts: [], chat: [], log: [], over: null, finals: {}, market: { seed: Math.floor(Math.random() * 1e9), taken: {} }, econ: { zins: 3.6, infl: 2.2, fuel: 1.78 },
    };
  }

  function makeChar(S, def) {
    const base = PRESETS[def.key] ? JSON.parse(JSON.stringify(PRESETS[def.key])) : {
      key: 'custom', name: cleanText(def.name, 24) || 'Unbekannt', age: num(def.age || 18, 16, 40), st: DB.STATES[def.st] ? def.st : 'NW',
      home: { label: cleanText(def.home && def.home.label, 60) || 'Duisburg', city: cleanText(def.home && (def.home.city || def.home.label), 60) || 'Duisburg', lat: Number(def.home && def.home.lat) || 51.4344, lng: Number(def.home && def.home.lng) || 6.7623 },
      job: cleanText(def.job, 80) || 'Schüler:in (Abi)', education: 'Abitur läuft', living: cleanText(def.living, 80) || 'wohnt bei den Eltern',
      bonus: cleanText(def.bonus, 200) || 'Kein besonderer Bonus.', weakness: cleanText(def.weakness, 200) || 'Keine besondere Schwäche.', about: cleanText(def.about, 300),
      stats: { health: 70, happy: 60, power: 12, money: 500 }, blockI: 430, noSchool: def.noSchool === true || def.school === 'none',
      effects: [{ name: 'Wohnt bei den Eltern (keine Miete)', pm: 0 }], relations: [], contacts: [], color: '#c58bff',
    };
    base.img = typeof def.img === 'string' && def.img.startsWith('data:image/') && def.img.length < 40000 ? def.img : null;
    base.location = base.home.label;
    base.bornIdx = idx(S.date) - base.age * 12 - rnd(12);
    base.effects = base.effects.map((e) => ({ id: uid('e'), name: e.name, pm: e.pm || 0, health: 0, happy: 0, power: 0, until: 0 }));
    base.props = []; base.chronicle = []; base.dead = false; base.appts = []; base.items = [];
    base.flags = { company: def.key === 'shaquille' ? 1 : 0, partner: def.key === 'kimberly' ? 'Justin' : def.key === 'justin' ? 'Kimberly' : '' };
    const goals = DECK ? Object.keys(DECK.GOALS) : [];
    base.goal = DECK && DECK.GOALS[def.goal] ? def.goal : goals[rnd(goals.length)] || '';
    base.bank = { schufa: 93, dispo: 500, loans: [], overdue: 0 };
    base.license = { has: false, status: 'none', theory: 0, lessons: 0, special: 0, skill: 0, attempts: { theory: 0, practical: 0 }, paid: 0 };
    base.car = null;
    base.job2 = null; // Arbeitsverhältnis (job ist der Text)
    base.edu = base.noSchool ? { kind: base.key === 'april' ? 'ai' : 'none' } : { kind: 'school', school: null };
    base.housing = { kind: /Opa|Eltern/.test(base.living) ? 'family' : 'family' };
    base.title = '';
    if (base.edu.kind === 'school') {
      base.abi = { sel: base.sel || null, blockI: base.blockI || 430, prep: {}, exams: {}, done: false, absent: 0, year: S.abiYear };
    }
    delete base.sel; delete base.blockI; delete base.noSchool;
    return base;
  }

  // ---------- Termine ----------
  function addAppt(S, c, a) {
    const ap = Object.assign({ id: uid('t'), d: 15, fee: 0, status: 'open', data: {} }, a);
    c.appts.push(ap);
    c.appts.sort((x, y) => idx(x) - idx(y) || x.d - y.d);
    return ap;
  }
  // Termine, die in die aktuelle Runde fallen
  const dueAppts = (S, c) => c.appts.filter((a) => a.status === 'open' && idx(a) >= idx(S.date) && idx(a) < idx(S.date) + S.stepM);
  const overdue = (S, c) => c.appts.filter((a) => a.status === 'open' && idx(a) < idx(S.date));
  function nextApptIdx(S) {
    let best = Infinity;
    alive(S).forEach((p) => S.chars[p.id].appts.forEach((a) => { if (a.status === 'open' && !a.soft && idx(a) >= idx(S.date)) best = Math.min(best, idx(a)); }));
    return best;
  }
  // Rundenlänge: Tempo der Einstellung, aber die Zeit hält an jedem Termin
  function chooseStep(S) {
    let base = PACE[S.settings.pace] || 0;
    if (!base) {
      // Schulzeit und laufender Führerschein monatlich, sonst Quartale (Termine halten die Zeit sowieso an)
      const busy = alive(S).some((p) => { const c = S.chars[p.id]; return c.edu.kind === 'school' || (c.license.status !== 'none' && !c.license.has && idx(S.date) - (c.license.appliedIdx || 0) < 8); });
      base = busy ? 1 : 3;
    }
    const nx = nextApptIdx(S);
    const until = nx === Infinity ? base : Math.max(1, nx - idx(S.date) + 1);
    S.stepM = clamp(Math.min(base, until), 1, 12);
  }

  // ---------- Abitur ----------
  function abiRules(c) { return DB.ABI[c.st] || DB.ABI.NW; }
  function scheduleAbi(S, c) {
    const R = abiRules(c), A = c.abi, y = A.year || S.abiYear;
    A.exams = {};
    const written = A.sel.lk.concat(R === DB.ABI.NW ? [A.sel.gk[0]] : []);
    const oral = R === DB.ABI.NW ? [A.sel.gk[1]] : A.sel.gk.slice();
    c.appts = c.appts.filter((a) => !/^abi/.test(a.kind));
    written.forEach((k) => {
      const day = R.written[k] || 28, m = R.writtenLate != null && day < 15 ? R.writtenLate : R.writtenMonth;
      const ap = addAppt(S, c, { kind: 'abi-w', y, m, d: day, title: `Abi schriftlich: ${DB.SUBJECTS[k].name}`, where: 'Schule', data: { subj: k, lk: A.sel.lk.includes(k) } });
      A.exams[k] = { kind: 'w', appt: ap.id, points: null, lk: A.sel.lk.includes(k) };
    });
    oral.forEach((k, i) => {
      const ap = addAppt(S, c, { kind: 'abi-o', y, m: R.oralMonth, d: R.oralDay + i, title: `Abi mündlich: ${DB.SUBJECTS[k].name}`, where: 'Schule', data: { subj: k } });
      A.exams[k] = { kind: 'o', appt: ap.id, points: null, lk: false };
    });
    addAppt(S, c, { kind: 'abi-end', y, m: R.endMonth, d: R.endDay, title: 'Abiturzeugnis und Abiball', where: 'Schule' });
  }
  function examPoints(S, c, subj, quiz) {
    const A = c.abi, prep = A.prep[subj] || 0, m = DECK ? DECK.mod(c, 'smart') : 0;
    let p = 3 + prep * 0.075 + m * 0.4 + (A.blockI - 400) / 80;
    if (quiz && quiz.total) p += (quiz.ok / quiz.total - 0.5) * 6;
    else p += (d20() - 10.5) * 0.3;
    if (c.stats.health < 30) p -= 2;
    if (c.stats.happy < 20) p -= 1;
    p += rng() * 3 - 1.5;
    return num(p, 0, 15);
  }
  function abiResult(c) {
    const R = abiRules(c), A = c.abi, ex = Object.entries(A.exams);
    const blockII = ex.reduce((s, [, e]) => s + (e.points || 0), 0) * R.factor;
    const ok5 = ex.filter(([, e]) => (e.points || 0) >= 5);
    const lkOk = ok5.some(([, e]) => e.lk);
    const need = R === DB.ABI.NW ? 2 : 3;
    const passed = A.blockI >= 200 && blockII >= 100 && ok5.length >= need && lkOk;
    const total = A.blockI + blockII;
    return { blockII, total, passed, note: passed ? DB.abiNote(total) : null, ok5: ok5.length, need };
  }

  // ---------- Führerschein ----------
  const LF = DB.LICENSE.fees;
  function licSchool(c) { return c.license.school || null; }
  function schoolPrice(c, key) {
    const s = licSchool(c), fee = LF[key];
    if (!fee.school) return fee.eur;
    if (!s) return fee.eur;
    if (s.free && key !== 'theoryShow' && key !== 'practicalShow') return 0;
    if (s.free) return 0;
    return Math.round(fee.eur * (s.mult || 1) * (1 - (s.discount || 0)));
  }
  function pay(S, c, amt, why) {
    if (!amt) return true;
    c.stats.money -= amt;
    (c._spent = c._spent || {})[why] = ((c._spent || {})[why] || 0) + amt;
    return true;
  }

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    const isHost = pid === S.host;
    const me = S.chars[pid];
    switch (a.type) {
      case 'pick': {
        const rejoin = S.phase === 'act' && (!me || me.dead) && S.settings.death === 'rejoin';
        if (S.phase !== 'pick' && !rejoin) return 'Gerade kann man keine Figur wählen.';
        const def = a.char || {};
        if (def.key && PRESETS[def.key] && Object.entries(S.chars).some(([id, c]) => id !== pid && !c.dead && c.key === def.key)) return 'Die Figur hat schon jemand.';
        const c = makeChar(S, def);
        if (CO()) CO().ensure(c);
        if (me && me.dead) c.chronicle.push({ d: dateText(S), t: `Neues Leben nach ${me.name}.` });
        S.chars[pid] = c;
        delete S.ready[pid];
        if (rejoin) {
          if (c.edu.kind === 'school') { c.edu = { kind: 'none' }; c.education = 'Abitur (alt)'; delete c.abi; }
          S.stories[pid] = `${c.name} betritt die Welt. ${c.living}.`;
          if (S.gm === 'builtin' && DECK) { const card = DECK.cardFor(S, pid); S.cards[pid] = card; S.events[pid] = card.text; }
        }
        log(S, `${S.players.find((p) => p.id === pid).name} spielt ${c.name}.`);
        return null;
      }
      case 'begin': {
        if (!isHost) return 'Nur der Host startet.';
        if (S.phase !== 'pick') return 'Läuft schon.';
        const missing = S.players.filter((p) => !S.chars[p.id]);
        if (missing.length) return `${missing.map((p) => p.name).join(', ')} hat noch keine Figur.`;
        S.phase = 'setup';
        S.gmWish = a.ai ? 'ai' : 'builtin';
        return null;
      }
      // Vorbereitung: Schule und Abifächer
      case 'setup': {
        if (S.phase !== 'setup' || !me) return 'Gerade nicht.';
        if (me.edu.kind === 'school') {
          const sel = a.sel || {};
          const lk = (sel.lk || []).filter((k) => DB.SUBJECTS[k]), gk = (sel.gk || []).filter((k) => DB.SUBJECTS[k]);
          const R = abiRules(me);
          const bad = [...lk, ...gk].find((k) => DB.SUBJECTS[k].only && DB.SUBJECTS[k].only !== me.st);
          if (bad) return `${DB.SUBJECTS[bad].name} gibt es in ${DB.STATES[me.st].name} nicht.`;
          const err = R.check({ lk, gk });
          if (err) return err;
          me.abi.sel = { lk, gk };
          if (a.school && a.school.name) me.edu.school = { name: cleanText(a.school.name, 90), city: cleanText(a.school.city, 50), lat: Number(a.school.lat) || me.home.lat, lng: Number(a.school.lng) || me.home.lng };
          me.education = `Abitur läuft (${[...lk, ...gk].map((k) => DB.SUBJECTS[k].name).join(', ')})`;
        }
        S.ready[pid] = true;
        if (alive(S).every((p) => S.ready[p.id])) beginLife(S);
        return null;
      }
      case 'unready': { if (S.phase === 'setup') delete S.ready[pid]; return null; }
      case 'forceSetup': {
        if (!isHost || S.phase !== 'setup') return 'Nur der Host.';
        alive(S).forEach((p) => { const c = S.chars[p.id]; if (c.edu.kind === 'school' && !c.abi.sel) c.abi.sel = defaultSel(c); });
        beginLife(S);
        return null;
      }
      case 'intro': { // Intro fertig (Host)
        if (!isHost || S.phase !== 'intro') return null;
        S.phase = 'think'; S.aiTask = 'intro'; S.aiSeq++;
        builtinNow(S);
        return null;
      }
      case 'do': {
        if (S.phase !== 'act') return 'Gerade wird nicht gespielt.';
        if (!me || me.dead) return 'Deine Figur lebt nicht mehr.';
        const plan = sanitizePlan(S, me, a.plan || {});
        const card = S.cards[pid];
        if (Number.isInteger(a.choice) && card) {
          const o = card.opts[a.choice];
          if (!o) return 'Diese Wahl gibt es nicht.';
          if (o.cost && me.stats.money + me.bank.dispo < o.cost) return `Dafür fehlen dir ${eur(o.cost - me.stats.money)}.`;
          S.picks[pid] = a.choice;
          S.actions[pid] = o.t;
          askOther(S, pid, card, o);
        } else if (a.text) {
          const t = cleanText(a.text, 600);
          if (t.length < 2) return 'Schreib, was du tust.';
          delete S.picks[pid];
          S.actions[pid] = t;
        } else if (!card) {
          S.actions[pid] = 'Lebt einfach weiter.';
        } else return 'Entscheide dich bei deinem Ereignis.';
        S.plans[pid] = plan;
        if (alive(S).every((p) => S.actions[p.id])) toThink(S);
        return null;
      }
      case 'undo': { if (S.phase === 'act') { delete S.actions[pid]; delete S.picks[pid]; (S.offers || []).forEach((o) => { if (o.from === pid && o.kind === 'ask' && o.status === 'open') o.status = 'cancelled'; }); if (S.decided) delete S.decided[pid]; } return null; }
      case 'pace': { if (!isHost) return 'Nur der Host.'; if (PACE[a.pace] == null) return 'Gibt es nicht.'; S.settings.pace = a.pace; log(S, `Tempo: ${({ auto: 'automatisch', m: 'Monat für Monat', q: 'Quartale', y: 'ganze Jahre' })[a.pace]}.`); return null; }
      case 'force': { if (!isHost) return 'Nur der Host.'; if (S.phase === 'act') toThink(S); return null; }
      case 'ai': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase !== 'think' || a.seq !== S.aiSeq) return null;
        if (a.failed && DECK) applyAI(S, DECK.run(S));
        else applyAI(S, a.data || {}, a.failed);
        return null;
      }
      case 'gm': {
        if (!isHost) return 'Nur der Host.';
        S.gm = a.gm === 'ai' ? 'ai' : 'builtin';
        if (S.gm === 'builtin' && S.phase === 'act') alive(S).forEach((p) => { if (!S.cards[p.id]) { const card = DECK.cardFor(S, p.id); S.cards[p.id] = card; S.events[p.id] = card.text; } });
        builtinNow(S);
        return null;
      }
      case 'endGame': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase === 'over' || S.phase === 'think') return null;
        S.phase = 'think'; S.aiTask = 'final'; S.aiSeq++;
        builtinNow(S);
        return null;
      }
      // SMS im Handy: privat an eine Figur oder Antwort an jemanden, den April spielt (npc:Name). April liest mit.
      case 'sms': {
        if (!me || me.dead) return 'Deine Figur lebt nicht mehr.';
        const t = cleanText(a.text, 400);
        if (!t) return 'Leere Nachricht.';
        const to = String(a.to || '');
        if (!/^npc:/.test(to) && (!S.chars[to] || to === pid)) return 'An wen?';
        const Co = CO();
        if (Co) Co.sms(S, pid, /^npc:/.test(to) ? `npc:${cleanText(to.slice(4), 40)}` : to, t);
        return null;
      }
      case 'chat': {
        const t = cleanText(a.text, 280);
        if (!t || !me) return null;
        S.chat.push({ id: uid('c'), pid, name: me.name, color: me.color, t, d: dateText(S), ooc: !!a.ooc });
        if (S.chat.length > 120) S.chat.shift();
        return null;
      }
      // Führerschein
      case 'licEnroll': return licEnroll(S, me, a);
      case 'licBook': return licBook(S, me, a);
      default: {
        const So = SOC();
        if (So && /^o[A-Z]/.test(a.type)) return So.act(S, pid, a, API);
        const M = MK();
        if (M && M.act && /^m[A-Z]/.test(a.type)) return M.act(S, pid, a, API);
        const Ac = ACAD();
        if (Ac && /^a[A-Z]/.test(a.type)) return Ac.act(S, pid, a, API);
        const Co = CO();
        if (Co && /^k[A-Z]/.test(a.type)) return Co.act(S, pid, a, API);
        const Wd = root.DULI_LARP_WORLD || (isNode ? require('./larp-world') : null);
        if (Wd && /^w[A-Z]/.test(a.type)) { if (S.phase !== 'act' || !me || me.dead) return 'Geht nur, während ihr plant.'; return Wd.act(S, pid, a, API); }
      }
    }
    return 'Unbekannte Aktion.';
  }
  function defaultSel(c) {
    return c.st === 'BW' ? { lk: ['de', 'ma', 'en'], gk: ['bi', 'ge'] } : { lk: ['de', 'ma'], gk: ['en', 'ge'] };
  }
  function beginLife(S) {
    alive(S).forEach((p) => {
      const c = S.chars[p.id];
      if (c.edu.kind === 'school') { if (!c.abi.sel) c.abi.sel = defaultSel(c); scheduleAbi(S, c); }
      // Steuererklärung, Geburtstag
      addAppt(S, c, { kind: 'birthday', y: S.date.y + (((c.bornIdx % 12) + 12) % 12 <= S.date.m ? 1 : 0), m: ((c.bornIdx % 12) + 12) % 12, d: 1 + rnd(28), title: 'Geburtstag', where: '', soft: true });
    });
    S.gm = S.settings.gm === 'builtin' || !DECK ? 'builtin' : S.settings.gm === 'ai' ? 'ai' : (S.gmWish || 'builtin');
    S.phase = 'intro';
    chooseStep(S);
  }

  // ---------- Plan des Monats (Fokus, Termine, Fahrstunden) ----------
  const FOCUS = {
    learn: 'Lernen', work: 'Mehr arbeiten', party: 'Feiern', sport: 'Sport', chill: 'Chillen', people: 'Freunde und Familie', skip: 'Schule oder Arbeit schwänzen', hustle: 'Eigenes Projekt', shady: 'Krumme Dinger',
  };
  function sanitizePlan(S, c, p) {
    const focus = (Array.isArray(p.focus) ? p.focus : []).filter((f) => FOCUS[f]).slice(0, 2);
    const subj = (Array.isArray(p.subj) ? p.subj : []).filter((k) => c.abi && c.abi.exams && c.abi.exams[k]).slice(0, 3);
    const appts = {};
    Object.entries(p.appts || {}).forEach(([id, v]) => {
      if (!c.appts.find((a) => a.id === id)) return;
      appts[id] = { d: ['go', 'sick', 'skip'].includes(v.d) ? v.d : 'go', quiz: v.quiz && Number.isFinite(v.quiz.ok) ? { ok: num(v.quiz.ok, 0, 30), total: num(v.quiz.total, 1, 30), err: num(v.quiz.err, 0, 99) } : null };
    });
    const drive = { theory: num(p.drive && p.drive.theory, 0, 14), lessons: num(p.drive && p.drive.lessons, 0, 16), special: num(p.drive && p.drive.special, 0, 12) };
    const courses = (Array.isArray(p.courses) ? p.courses : []).filter((k) => c.courses && c.courses[k] && c.courses[k].status === 'learning').slice(0, 2);
    const skills = (Array.isArray(p.skills) ? p.skills : []).filter((k) => c.skills && c.skills[k] != null).slice(0, 2);
    return { focus, subj, appts, drive, courses, skills };
  }

  function toThink(S) {
    S.phase = 'think'; S.aiTask = 'resolve'; S.aiSeq++;
    S.reports = S.pending || {};
    S.pending = {};
    alive(S).forEach((p) => { S.rolls[p.id] = d20(); });
    alive(S).forEach((p) => processPlan(S, p.id));
    const So = SOC();
    if (So) { So.resolveScene(S, API); So.resolveVote(S, API); }
    builtinNow(S);
  }
  function builtinNow(S) {
    if (S.gm === 'builtin' && DECK && S.phase === 'think') applyAI(S, DECK.run(S));
  }

  // Termine, Fokus und Fahrstunden dieser Runde auswerten (vor der Erzählung)
  function processPlan(S, pid) {
    const c = S.chars[pid], plan = S.plans[pid] || { focus: [], subj: [], appts: {}, drive: {} };
    const M = S.stepM;
    c._spent = {};
    if (c.prison) report(S, pid, '•', `Im Gefängnis. Noch ${Math.max(1, c.prison.until - idx(S.date))} Monate. Hofgang, Kantine, Briefe schreiben.`, 'bad');
    // Fokus
    (c.prison ? [] : plan.focus).forEach((f) => {
      if (f === 'shady') { const Lf = LIFE(); if (Lf) Lf.shady(S, pid, c, M, API); return; }
      if (f === 'learn') {
        if (c.edu.kind === 'school' && c.abi) {
          const subs = plan.subj.length ? plan.subj : Object.keys(c.abi.exams).slice(0, 2);
          const gain = Math.round((15 + (DECK ? DECK.mod(c, 'smart') : 0) * 1.5) * M);
          subs.forEach((k) => { c.abi.prep[k] = clamp((c.abi.prep[k] || 0) + gain, 0, 100); });
          c.abi.blockI = clamp(c.abi.blockI + 3 * M, 200, 600);
          report(S, pid, '📚', `Gelernt: ${subs.map((k) => DB.SUBJECTS[k].name).join(', ')} (+${gain} Vorbereitung)`);
        } else if (!(plan.courses || []).length && !(plan.skills || []).length) { c.flags.study = (c.flags.study || 0) + 1; report(S, pid, '📚', 'Gelernt und weitergebildet.'); }
        const Co = CO();
        if (Co && (plan.skills || []).length) Co.train(S, pid, c, plan.skills, M, API);
        const Ac = ACAD();
        if (Ac) Ac.study(S, pid, c, plan.courses, M, API);
        c.stats.happy = clampStat(c.stats.happy - 2);
      } else if (f === 'work') {
        if (c.job2) { const extra = Math.round(c.job2.gross * 0.15 * M); c.stats.money += extra; c.stats.health = clampStat(c.stats.health - 2); report(S, pid, '💼', `Extra-Schichten: +${eur(extra)}`); }
        else { const extra = 180 * M; c.stats.money += extra; report(S, pid, '💼', `Ein paar Gelegenheitsjobs: +${eur(extra)}`); }
      } else if (f === 'party') { c.stats.happy = clampStat(c.stats.happy + 8); c.stats.health = clampStat(c.stats.health - 3); pay(S, c, 90 * M, 'Feiern'); report(S, pid, '🎉', `Feiern: Happiness +8, −${eur(90 * M)}`); }
      else if (f === 'sport') { c.stats.health = clampStat(c.stats.health + 5); c.stats.happy = clampStat(c.stats.happy + 2); report(S, pid, '🏃', 'Sport: Gesundheit +5'); }
      else if (f === 'chill') { c.stats.health = clampStat(c.stats.health + 3); c.stats.happy = clampStat(c.stats.happy + 4); report(S, pid, '🛋', 'Chillen: Gesundheit +3, Happiness +4'); }
      else if (f === 'people') { c.relations.forEach((r) => { if (r.val < 95) r.val = Math.min(100, r.val + 3); }); c.stats.happy = clampStat(c.stats.happy + 3); report(S, pid, '🫂', 'Zeit mit Freunden und Familie: Beziehungen +3'); }
      else if (f === 'hustle') { c.flags.company = (c.flags.company || 0) + (DECK && DECK.mod(c, 'work') > 2 ? 0.5 : 0.3); const g = Math.round((120 + (c.key === 'shaquille' ? 200 : 0)) * M); c.stats.money += g; report(S, pid, '🚀', `Eigenes Projekt: +${eur(g)}, die Firma wächst`); }
      else if (f === 'skip') {
        c.stats.happy = clampStat(c.stats.happy + 5);
        if (c.edu.kind === 'school' && c.abi) { c.abi.absent += M * 3; c.abi.blockI = clamp(c.abi.blockI - 8 * M, 200, 600); report(S, pid, '🚬', `Geschwänzt: ${M * 3} Fehltage, die Kursnoten sinken`, 'bad'); if (c.abi.absent >= 9 && !c.flags.warnSchool) { c.flags.warnSchool = 1; report(S, pid, '✉', 'Brief von der Schule: Gespräch mit Eltern und Schulleitung wegen Fehlzeiten.', 'bad'); c.stats.power = clampStat(c.stats.power - 2); } }
        else if (c.job2) { c.job2.warnings = (c.job2.warnings || 0) + 1; report(S, pid, '⚠', c.job2.warnings >= 3 ? 'Dritte Abmahnung: fristlose Kündigung.' : `Abmahnung Nummer ${c.job2.warnings} vom Arbeitgeber.`, 'bad'); if (c.job2.warnings >= 3) endJob(S, c, 'gekündigt (Schwänzen)'); }
      }
    });
    // Wer zur Schule geht, lernt nebenbei in allen Prüfungsfächern
    const Wd = root.DULI_LARP_WORLD || (isNode ? require('./larp-world') : null);
    const fer = Wd && M === 1 ? Wd.holidayIn(c, S.date.m) : null;
    if (fer && !c.prison) { c.stats.happy = clampStat(c.stats.happy + 3); report(S, pid, '•', `${fer.name}! ${c.edu.kind === 'school' ? 'Keine Schule' : 'Keine Vorlesungen'} (${fer.from}–${fer.to}). Zeit zum Verreisen: Markt → Reisen.`, 'good'); }
    if (c.edu.kind === 'school' && c.abi && !plan.focus.includes('skip')) {
      Object.keys(c.abi.exams).forEach((k) => { c.abi.prep[k] = clamp((c.abi.prep[k] || 0) + (fer ? 2 : 6) * M, 0, 100); });
      if (!plan.focus.includes('learn')) c.abi.blockI = clamp(c.abi.blockI + 1 * M, 200, 600);
    }
    // Fahrschule: Theorie und Fahrstunden
    const L = c.license;
    if (L.status !== 'none' && !L.has) {
      const d = plan.drive || {};
      if (d.theory && L.theory < DB.LICENSE.theoryLessons) { L.theory = Math.min(DB.LICENSE.theoryLessons, L.theory + d.theory); report(S, pid, '📖', `Theorieunterricht: ${L.theory}/${DB.LICENSE.theoryLessons} Doppelstunden`); }
      if (d.lessons) {
        const cost = d.lessons * schoolPrice(c, 'lesson');
        if (c.stats.money + c.bank.dispo < cost) report(S, pid, '🚗', `Fahrstunden abgesagt: Geld reicht nicht (${eur(cost)}).`, 'bad');
        else {
          pay(S, c, cost, 'Fahrschule');
          L.lessons += d.lessons;
          const bm = DECK ? DECK.mod(c, 'body') : 0;
          for (let i = 0; i < d.lessons; i++) L.skill = Math.min(100, L.skill + (100 - L.skill) * (0.06 + bm * 0.004));
          report(S, pid, '🚗', `${d.lessons} Fahrstunden${cost ? ` (−${eur(cost)})` : ' (bei Opa gratis)'}: Fahrkönnen ${Math.round(L.skill)}/100`);
        }
      }
      if (d.special && L.special < DB.LICENSE.specials) {
        const n = Math.min(d.special, DB.LICENSE.specials - L.special), cost = n * schoolPrice(c, 'special');
        if (c.stats.money + c.bank.dispo >= cost) { pay(S, c, cost, 'Fahrschule'); L.special += n; L.skill = Math.min(100, L.skill + n * 1.5); report(S, pid, '🛣', `${n} Sonderfahrten (${L.special}/12)${cost ? `, −${eur(cost)}` : ''}`); }
      }
    }
    // Termine dieser Runde (inklusive verpasster aus der Vergangenheit)
    dueAppts(S, c).concat(overdue(S, c)).forEach((ap) => runAppt(S, pid, ap, plan.appts[ap.id] || { d: 'go', quiz: null }));
    // Abi abgeschlossen?
    if (c.abi && !c.abi.done && Object.values(c.abi.exams).length && Object.values(c.abi.exams).every((e) => e.points != null)) {
      const r = abiResult(c);
      c.abi.result = r;
      if (!c.abi.announced) {
        c.abi.announced = true;
        report(S, pid, r.passed ? '🎓' : '💀', r.passed ? `Abi-Ergebnis: ${r.total} Punkte, Schnitt ${String(r.note.toFixed(1)).replace('.', ',')}` : `Abi-Ergebnis: ${r.total} Punkte. So reicht es nicht (nur ${r.ok5} Prüfungen mit mindestens 5 Punkten, Block II ${r.blockII}/300).`, r.passed ? 'good' : 'bad');
        if (!r.passed && !c.abi.extraUsed) {
          const weakest = Object.entries(c.abi.exams).filter(([, e]) => e.kind === 'w').sort((a, b) => a[1].points - b[1].points)[0];
          if (weakest) {
            const R = abiRules(c);
            c.abi.extraUsed = true;
            const ap = addAppt(S, c, { kind: 'abi-extra', y: S.abiYear, m: Math.max(R.extraMonth, S.date.m + S.stepM - 1 >= R.extraMonth ? S.date.m + 1 : R.extraMonth) % 12, d: R.extraDay, title: `Mündliche Nachprüfung: ${DB.SUBJECTS[weakest[0]].name}`, where: 'Schule', data: { subj: weakest[0] } });
            if (idx(ap) < idx(S.date) + S.stepM) { ap.m = (S.date.m + S.stepM) % 12; ap.y = S.date.y + Math.floor((S.date.m + S.stepM) / 12); }
            report(S, pid, '📝', `Du darfst in ${DB.SUBJECTS[weakest[0]].name} in die mündliche Nachprüfung (${dayText(ap)}).`);
          }
        }
      }
    }
  }
  function runAppt(S, pid, ap, dec) {
    const c = S.chars[pid];
    const choice = dec.d;
    ap.status = choice === 'skip' ? 'missed' : choice === 'sick' ? 'sick' : 'done';
    const late = idx(ap) < idx(S.date);
    switch (ap.kind) {
      case 'abi-w': case 'abi-o': case 'abi-retake': case 'abi-extra': {
        const k = ap.data.subj, ex = c.abi && c.abi.exams[k];
        if (!ex) return;
        const nm = DB.SUBJECTS[k].name;
        if (choice === 'skip' || late) {
          if (ap.kind === 'abi-extra') { report(S, pid, '🚪', `Nachprüfung ${nm} geschwänzt. Das war die letzte Chance.`, 'bad'); return; }
          ex.points = 0; ex.missed = true;
          report(S, pid, '🚪', `${nm}: nicht erschienen. 0 Punkte.`, 'bad');
          c.chronicle.push({ d: dateText(S), t: `Schwänzt die Abiprüfung in ${nm}.` });
          return;
        }
        if (choice === 'sick') {
          // Attest: echt krank oder geschummelt?
          const fake = c.stats.health > 55;
          if (fake && rng() < 0.25) {
            ex.points = 0;
            report(S, pid, '🩺', `${nm}: Die Schule verlangt ein amtsärztliches Attest. Das „Fieber“ war nicht da. 0 Punkte, Täuschungsversuch.`, 'bad');
            c.stats.power = clampStat(c.stats.power - 4); c.stats.happy = clampStat(c.stats.happy - 8);
            c.chronicle.push({ d: dateText(S), t: `Beim gefälschten Krankmelden vor der Abiprüfung in ${nm} erwischt.` });
            return;
          }
          if (ap.kind === 'abi-retake' || ap.kind === 'abi-extra') { ex.points = ap.kind === 'abi-extra' ? ex.points : 0; report(S, pid, '🤒', `${nm}: Schon wieder krank. Kein weiterer Termin mehr.`, 'bad'); return; }
          const R = abiRules(c);
          const nap = addAppt(S, c, { kind: 'abi-retake', y: ap.y, m: ex.kind === 'w' ? R.retakeMonth : Math.min(11, ap.m + 1), d: ex.kind === 'w' ? R.retakeDay : 10, title: `Nachschreibtermin: ${nm}`, where: 'Schule', data: { subj: k } });
          if (idx(nap) < idx(S.date) + S.stepM) { nap.m = (S.date.m + S.stepM) % 12; nap.y = S.date.y + Math.floor((S.date.m + S.stepM) / 12); }
          ex.appt = nap.id;
          report(S, pid, '🤒', `${nm}: krank gemeldet, Attest liegt vor. Nachschreibtermin am ${dayText(nap)}.`);
          return;
        }
        const pts = examPoints(S, c, k, dec.quiz);
        if (ap.kind === 'abi-extra') {
          const old = ex.points || 0;
          ex.points = Math.round((2 * old + pts) / 3);
          report(S, pid, '🗣', `Nachprüfung ${nm}: ${pts} Punkte mündlich. Neue Wertung: ${ex.points} Punkte.`, ex.points > old ? 'good' : '');
          const r = abiResult(c);
          c.abi.result = r;
          report(S, pid, r.passed ? '🎓' : '💀', r.passed ? `Gerettet. Abi bestanden, Schnitt ${String(r.note.toFixed(1)).replace('.', ',')}.` : 'Auch die Nachprüfung hat nicht gereicht. Abi nicht bestanden.', r.passed ? 'good' : 'bad');
          return;
        }
        ex.points = pts;
        ex.quiz = dec.quiz || null;
        report(S, pid, pts >= 10 ? '🟢' : pts >= 5 ? '🟡' : '🔴', `${ap.kind === 'abi-o' ? 'Mündlich' : 'Schriftlich'} ${nm}: ${pts} Punkte (Note ${DB.pointsToGrade(pts)})${dec.quiz ? `, Quiz ${dec.quiz.ok}/${dec.quiz.total}` : ''}`, pts >= 5 ? 'good' : 'bad');
        return;
      }
      case 'abi-end': {
        const r = c.abi && c.abi.result;
        c.abi.done = true;
        c.edu = { kind: 'none', prev: 'school' };
        if (r && r.passed) {
          const note = String(r.note.toFixed(1)).replace('.', ',');
          c.education = `Abitur (${note})`;
          c.abi.note = r.note;
          c.flags.abi = 1; c.flags.grade = note;
          c.job = c.job.replace(/Schüler(in)? \(Abi\)( und )?/, '').trim() || 'Abiturient:in, Zukunft offen';
          if (choice === 'go') { c.stats.happy = clampStat(c.stats.happy + 15); report(S, pid, '🎓', `Zeugnisübergabe und Abiball. Schnitt ${note}. Die Nacht wird lang.`, 'good'); }
          else report(S, pid, '📬', `Das Zeugnis kommt per Post. Schnitt ${note}. Abiball verpasst.`);
          c.chronicle.push({ d: dateText(S), t: `Abitur bestanden, Schnitt ${note}.` });
          log(S, `${c.name} hat das Abi: ${note}.`);
        } else {
          c.education = 'Abitur nicht bestanden';
          c.flags.abiFail = (c.flags.abiFail || 0) + 1;
          c.job = c.job.replace(/Schüler(in)? \(Abi\)( und )?/, '').trim() || 'ohne Abschluss';
          c.stats.happy = clampStat(c.stats.happy - 15);
          report(S, pid, '💀', 'Kein Abitur. Du kannst das Jahr wiederholen, mit Fachhochschulreife gehen (falls die Kurse reichen) oder ohne Abi weitermachen.', 'bad');
          c.chronicle.push({ d: dateText(S), t: 'Abitur nicht bestanden.' });
          c.flags.abiChoice = 1;
        }
        return;
      }
      case 'firstaid': {
        if (choice !== 'go' || late) { report(S, pid, '🩹', 'Erste-Hilfe-Kurs verpasst. Neuer Termin nächsten Monat, die Gebühr ist weg.', 'bad'); pay(S, c, LF.firstAid.eur, 'Führerschein'); reAppt(S, c, ap, 1); return; }
        c.license.firstAid = true; report(S, pid, '🩹', 'Erste-Hilfe-Kurs gemacht. Stabile Seitenlage sitzt.'); return;
      }
      case 'eye': {
        if (choice !== 'go' || late) { reAppt(S, c, ap, 1); report(S, pid, '👓', 'Sehtest verpasst, neuer Termin.'); return; }
        c.license.eye = true; report(S, pid, '👓', 'Sehtest bestanden.'); return;
      }
      case 'lic-theory': case 'lic-practical': return licExam(S, pid, ap, dec, late);
      case 'birthday': {
        c.stats.happy = clampStat(c.stats.happy + 6);
        const gift = 50 + rnd(150);
        c.stats.money += gift;
        report(S, pid, '🎂', `Geburtstag! ${Math.floor((idx(ap) - c.bornIdx) / 12)} Jahre. Geschenke: +${eur(gift)}`, 'good');
        addAppt(S, c, { kind: 'birthday', y: ap.y + 1, m: ap.m, d: ap.d, title: 'Geburtstag', where: '', soft: true });
        return;
      }
      case 'story': {
        report(S, pid, '•', dec.d === 'skip' || late ? `Termin verpasst: ${ap.title}.` : `Termin: ${ap.title}${ap.where ? ` (${ap.where})` : ''}.`, dec.d === 'skip' ? 'bad' : '');
        c.memory = (c.memory || []).concat(`${dateText(S)}: ${dec.d === 'skip' || late ? 'nicht hingegangen zu' : 'war bei'} „${ap.title}“`).slice(-15);
        return;
      }
      default: {
        const Lf = LIFE();
        if (Lf && Lf.appt(S, pid, ap, dec, late, API)) return;
        const Ac = ACAD();
        if (Ac && Ac.appt(S, pid, ap, dec, late, API)) return;
        const M = MK();
        if (M && M.appt) M.appt(S, pid, ap, dec, late, API);
      }
    }
  }
  function reAppt(S, c, ap, months) {
    const t = idx(S.date) + S.stepM + Math.max(0, months - 1);
    addAppt(S, c, { kind: ap.kind, y: Math.floor(t / 12), m: t % 12, d: ap.d, title: ap.title, where: ap.where, fee: ap.fee, data: ap.data });
  }

  // ---------- Führerschein: Anmeldung, Prüfungen ----------
  function licEnroll(S, c, a) {
    if (!c || c.dead) return 'Deine Figur lebt nicht mehr.';
    if (S.phase !== 'act') return 'Geht nur, während ihr plant.';
    if (c.key === 'april' && !c.flags.body) return 'Ohne Körper keine Fahrstunden. Erst einen Roboterkörper besorgen.';
    const L = c.license;
    if (L.has) return 'Du hast schon einen Führerschein.';
    if (L.status !== 'none' && !a.switch) return 'Du bist schon angemeldet.';
    let school;
    if (a.school === 'opa') {
      const owner = c.contacts && c.contacts.includes('opa-fahrschule');
      const grant = (c.perks || []).find((p) => p.kind === 'fahrschule');
      if (!owner && !grant) return 'Für Opas Fahrschule brauchst du eine Einladung.';
      school = { id: 'opa', name: 'Opas Fahrschule', mult: 1, free: !!owner, discount: owner ? 1 : grant.discount };
    } else {
      const s = DB.LICENSE.schools.find((x) => x.id === a.school) || DB.LICENSE.schools[1];
      school = { id: s.id, name: s.name, mult: s.mult, discount: 0, crash: !!s.crash };
    }
    const wasEnrolled = L.status !== 'none';
    L.school = school;
    const fees = [['base', schoolPrice(c, 'base')]].concat(wasEnrolled ? [] : [['eye', LF.eye.eur], ['firstAid', LF.firstAid.eur], ['application', LF.application.eur], ['photo', LF.photo.eur], ['app', LF.app.eur]]);
    const total = fees.reduce((s, [, v]) => s + v, 0);
    if (c.stats.money + c.bank.dispo < total) return `Für die Anmeldung brauchst du ${eur(total)}.`;
    c.stats.money -= total;
    L.paid += total;
    if (!wasEnrolled) {
      L.status = 'enrolled';
      L.appliedIdx = idx(S.date) + 2; // Antrag bei der Führerscheinstelle braucht etwa 6–8 Wochen
      addAppt(S, c, { kind: 'firstaid', y: S.date.y + Math.floor((S.date.m + 1) / 12), m: (S.date.m + 1) % 12, d: 7 + rnd(14), title: 'Erste-Hilfe-Kurs (Samstag, 9 Stunden)', where: 'DRK' });
      addAppt(S, c, { kind: 'eye', y: S.date.y, m: S.date.m, d: 20 + rnd(8), title: 'Sehtest beim Optiker', where: 'Optiker' });
    }
    c.chronicle.push({ d: dateText(S), t: `Meldet sich bei ${school.name} an.` });
    log(S, `${c.name} meldet sich bei ${school.name} an (${total ? eur(total) : 'gratis'}).`);
    return null;
  }
  function licBook(S, c, a) {
    if (!c || c.dead || S.phase !== 'act') return 'Gerade nicht.';
    const L = c.license;
    if (L.has || L.status === 'none') return 'Erst bei einer Fahrschule anmelden.';
    if (c.appts.some((x) => x.status === 'open' && x.kind === `lic-${a.kind}`)) return 'Der Termin steht schon.';
    const t = idx(S.date) + 1;
    if (a.kind === 'theory') {
      if (L.theoryPass) return 'Theorie hast du schon.';
      if (L.theory < DB.LICENSE.theoryLessons) return `Erst alle ${DB.LICENSE.theoryLessons} Theorie-Doppelstunden besuchen (${L.theory}).`;
      if (!L.firstAid || !L.eye) return 'Erst Sehtest und Erste-Hilfe-Kurs.';
      if (idx(S.date) < L.appliedIdx) return 'Der Antrag bei der Führerscheinstelle ist noch nicht durch.';
      addAppt(S, c, { kind: 'lic-theory', y: Math.floor(t / 12), m: t % 12, d: 5 + rnd(20), title: 'Theorieprüfung beim TÜV', where: 'TÜV-Prüfstelle', fee: LF.tuvTheory.eur + schoolPrice(c, 'theoryShow') });
      return null;
    }
    if (a.kind === 'practical') {
      if (!L.theoryPass) return 'Erst die Theorieprüfung bestehen.';
      if (L.special < DB.LICENSE.specials) return `Erst alle 12 Sonderfahrten (${L.special}/12).`;
      if (L.lessons < 8) return 'Mindestens 8 normale Fahrstunden, sonst lässt dich die Fahrschule nicht zur Prüfung.';
      addAppt(S, c, { kind: 'lic-practical', y: Math.floor(t / 12), m: t % 12, d: 5 + rnd(20), title: 'Praktische Fahrprüfung', where: 'Fahrschule / TÜV', fee: LF.tuvPractical.eur + schoolPrice(c, 'practicalShow') });
      return null;
    }
    return 'Unbekannt.';
  }
  function licExam(S, pid, ap, dec, late) {
    const c = S.chars[pid], L = c.license, theory = ap.kind === 'lic-theory';
    const name = theory ? 'Theorieprüfung' : 'Fahrprüfung';
    if (dec.d === 'skip' || late) { pay(S, c, ap.fee, 'Führerschein'); report(S, pid, '🚫', `${name} nicht erschienen. ${eur(ap.fee)} sind trotzdem weg.`, 'bad'); return; }
    if (dec.d === 'sick') { pay(S, c, Math.round(ap.fee * 0.5), 'Führerschein'); report(S, pid, '🤒', `${name} abgesagt. Die Hälfte der Gebühr ist weg, neu buchen.`, 'bad'); return; }
    pay(S, c, ap.fee, 'Führerschein');
    L.attempts[theory ? 'theory' : 'practical']++;
    if (theory) {
      let ok;
      if (dec.quiz && dec.quiz.total) ok = dec.quiz.err <= 10;
      else ok = d20() + (DECK ? DECK.mod(c, 'smart') : 0) + (L.lessons > 0 ? 2 : 0) >= 9;
      if (ok) { L.theoryPass = true; L.status = 'theory'; report(S, pid, '✅', `Theorie bestanden${dec.quiz ? ` (${dec.quiz.err} Fehlerpunkte)` : ''}. Jetzt Fahrstunden und Sonderfahrten.`, 'good'); }
      else report(S, pid, '❌', `Theorie durchgefallen${dec.quiz ? ` (${dec.quiz.err} Fehlerpunkte, erlaubt sind 10)` : ''}. Neu buchen, neu zahlen.`, 'bad');
      return;
    }
    const roll = d20();
    const nervous = L.attempts.practical === 1 ? 1 : 0;
    const score = roll + L.skill / 8 + (DECK ? DECK.mod(c, 'body') : 0) - nervous - (L.school && L.school.crash ? 1 : 0);
    const ok = roll !== 1 && score >= 14;
    if (ok) {
      L.has = true; L.status = 'done'; L.since = idx(S.date); L.probation = idx(S.date) + 24;
      c.flags.license = 1;
      c.stats.happy = clampStat(c.stats.happy + 15); c.stats.power = clampStat(c.stats.power + 2);
      report(S, pid, '🪪', `FÜHRERSCHEIN BESTANDEN (Wurf ${roll}, Fahrkönnen ${Math.round(L.skill)}). Probezeit 2 Jahre, 0,0 Promille.`, 'good');
      c.chronicle.push({ d: dateText(S), t: `Führerschein bestanden${L.attempts.practical > 1 ? ` im ${L.attempts.practical}. Versuch` : ''}.` });
      log(S, `${c.name} hat den Führerschein.`);
    } else {
      const why = roll === 1 ? 'Rechts vor links übersehen. Der Prüfer hat ins Lenkrad gegriffen.' : ['Beim Spurwechsel nicht über die Schulter geschaut.', 'Zu schnell in der 30er-Zone.', 'Beim Einparken den Bordstein geküsst.', 'Am Stoppschild nur gerollt.'][rnd(4)];
      report(S, pid, '❌', `Fahrprüfung nicht bestanden (Wurf ${roll}). ${why} Mehr Fahrstunden, neu buchen.`, 'bad');
    }
  }

  // ---------- Monat abrechnen (Geld, Verträge, laufende Effekte) ----------
  function monthTick(S, c, pid) {
    let inc = 0, out = 0;
    // laufende Effekte (Geld pro Monat)
    c.effects.forEach((e) => { if (e.pm > 0) inc += e.pm; else out -= e.pm; c.stats.money += e.pm; });
    // Job
    if (c.job2) {
      const n = c.job2.net != null ? c.job2.net : DB.net(c.job2.gross, c.job2.kind);
      c.stats.money += n; inc += n;
      // Wer mehr verdient, gibt auch mehr aus (Urlaub, Essen gehen, Abos, Klamotten)
      if (n > 1800 && !c.prison) { const life = Math.round((n - 1800) * 0.35); c.stats.money -= life; out += life; c._spent = c._spent || {}; c._spent.Lebensstil = (c._spent.Lebensstil || 0) + life; }
    }
    // Dispozinsen und Mahnungen
    if (c.stats.money < 0) {
      const z = Math.round(-c.stats.money * 0.125 / 12);
      c.stats.money -= z; out += z;
      if (c.stats.money < -c.bank.dispo) {
        c.bank.overdue++;
        c.bank.schufa = clamp(c.bank.schufa - 3, 0, 100);
        if (c.bank.overdue === 2) report(S, pid, '✉', 'Die Bank mahnt: Konto über dem Dispo. SCHUFA sinkt.', 'bad');
      }
    } else { c.bank.overdue = 0; if (c.bank.schufa < 97 && rng() < 0.1) c.bank.schufa++; }
    const M = MK();
    if (M && M.month) { const r = M.month(S, c, pid, API) || {}; inc += r.inc || 0; out += r.out || 0; }
    const Lf = LIFE();
    if (Lf) Lf.month(S, c, pid, API);
    const Co = CO();
    if (Co) { const r = Co.month(S, c, pid, API); inc += r.inc; out += r.out; }
    return { inc, out };
  }
  function endJob(S, c, why) {
    if (!c.job2) return;
    c.chronicle.push({ d: dateText(S), t: `Job weg: ${c.job2.title} (${why}).` });
    c.job2 = null;
  }

  // Ist bei der Wahl eine andere Spieler-Figur beteiligt, entscheidet sie statt des Würfels
  function askOther(S, pid, card, o) {
    const fid = card && card.fid, other = fid && S.chars[fid];
    if (!other || other.dead || !o.dc || !card.f || !o.t.includes(card.f)) return;
    const me = S.chars[pid];
    S.offers = S.offers || [];
    S.offers.forEach((x) => { if (x.from === pid && x.kind === 'ask' && x.status === 'open') x.status = 'cancelled'; });
    S.offers.push({ id: uid('o'), from: pid, to: fid, kind: 'ask', terms: { text: `${me.name}: ${card.text} – „${o.t}“. Machst du mit? (Deine Entscheidung statt Würfel.)` }, status: 'open', round: S.round, fromName: me.name, toName: other.name, fromHim: 'dir' });
    const Co = CO();
    if (Co) Co.sms(S, pid, fid, `${card.text} „${o.t}“ – bist du dabei?`);
  }

  // ---------- Bausteine, mit denen April (KI) alles Mögliche ins Spiel bringen kann ----------
  function applyTools(S, pid, c, x, M) {
    const Co = CO();
    // Skills hoch oder runter (neue entstehen dabei)
    (Array.isArray(x.skills) ? x.skills : []).slice(0, 6).forEach((k) => { if (Co && k && k.name) Co.change(c, cleanText(k.name, 40), num(k.change, -30, 30)); });
    // Besitz aller Art (Rennpferd, Food-Truck, Patent …) mit laufenden Kosten oder Einnahmen
    (Array.isArray(x.assets) ? x.assets : []).slice(0, 4).forEach((a) => {
      const name = cleanText(a && a.name, 60);
      if (!name) return;
      c.assets = c.assets || [];
      const old = c.assets.find((o) => o.name.toLowerCase() === name.toLowerCase());
      if (a.remove) { c.assets = c.assets.filter((o) => o !== old); c.effects = c.effects.filter((e) => e.asset !== name); return; }
      if (old || c.assets.length >= 15) return;
      const pm = num(a.pm, -Math.max(3000, c.stats.money * 0.2), Math.max(3000, c.stats.money * 0.2));
      c.assets.push({ name, kind: cleanText(a.kind, 40), value: num(a.value, 0, 1e8), since: dateText(S) });
      if (pm) c.effects.push({ id: uid('e'), name, pm, health: 0, happy: 0, power: 0, until: 0, asset: name });
    });
    // Mitarbeiter einstellen oder entlassen
    (Array.isArray(x.staff) ? x.staff : []).slice(0, 3).forEach((p) => {
      if (!Co || !p || !p.name || !Co.can(c)) return;
      const F = Co.firm(c), name = cleanText(p.name, 40);
      if (p.fire) { F.staff = F.staff.filter((o) => o.name !== name); return; }
      if (F.staff.length >= Co.capacity(c) || F.staff.some((o) => o.name === name)) return;
      F.staff.push({ id: uid('st'), name, role: cleanText(p.role, 40) || 'Mitarbeiter:in', skills: { [cleanText(p.skill, 40) || 'Verkauf']: num(p.level, 1, 100) }, gross: num(p.salary, 603, 12000), trait: ['neu', 1, 0], mood: 70, since: idx(S.date) });
    });
    // Termine, die April sich ausdenkt
    (Array.isArray(x.appointments) ? x.appointments : []).slice(0, 2).forEach((t) => {
      const title = cleanText(t && t.title, 80);
      if (!title || c.appts.filter((a) => a.status === 'open').length > 20) return;
      const at = idx(S.date) + Math.max(M, num(t.months_from_now, 1, 36));
      addAppt(S, c, { kind: 'story', y: Math.floor(at / 12), m: at % 12, d: 1 + rnd(27), title, where: cleanText(t.where, 60) });
    });
    // Orte auf der Karte
    (Array.isArray(x.places) ? x.places : []).slice(0, 2).forEach((pl) => {
      const name = cleanText(pl && pl.name, 50), lat = Number(pl && pl.lat), lng = Number(pl && pl.lng);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) return;
      c.places = (c.places || []).filter((o) => o.name !== name).concat({ name, lat, lng }).slice(-10);
    });
    // SMS von Leuten, die April spielt (Mama, Chefin, Ex, Kunde …)
    (Array.isArray(x.sms) ? x.sms : []).slice(0, 2).forEach((m) => {
      const from = cleanText(m && m.from, 40), t = cleanText(m && m.text, 300);
      if (from && t && CO()) CO().sms(S, `npc:${from}`, pid, t, from);
    });
    // Gedächtnis: was April sich merken will
    const mem = cleanText(x.memory, 200);
    if (mem) c.memory = (c.memory || []).concat(`${dateText(S)}: ${mem}`).slice(-15);
  }

  // ---------- KI- oder Karten-Antwort übernehmen ----------
  function applyAI(S, data, failed) {
    const task = S.aiTask;
    const before = {};
    Object.entries(S.chars).forEach(([id, c]) => { before[id] = Object.assign({}, c.stats); });
    if (task === 'resolve') S.lastAction = Object.assign({}, S.actions);
    applyData(S, task, data, failed);
    if (task !== 'final') {
      S.recap = {};
      Object.entries(S.chars).forEach(([id, c]) => {
        const b = before[id]; if (!b) return;
        const r = {};
        ['money', 'health', 'happy', 'power'].forEach((k) => { if (c.stats[k] !== b[k]) r[k] = c.stats[k] - b[k]; });
        S.recap[id] = r;
      });
      S.cards = {};
      if (data.builtin) (data.players || []).forEach((x) => { if (x && x.card && S.chars[x.id] && !S.chars[x.id].dead) S.cards[x.id] = x.card; });
    }
    S.picks = {};
    builtinNow(S);
  }
  function applyData(S, task, data, failed) {
    S.aiTask = null;
    const byId = {};
    (Array.isArray(data.players) ? data.players : []).forEach((x) => { if (x && S.chars[x.id]) byId[x.id] = x; });
    if (task === 'final') {
      S.players.forEach((p) => {
        const x = byId[p.id] || {}, c = S.chars[p.id];
        const sc = c && DECK ? DECK.score(c) : null;
        S.finals[p.id] = { story: cleanText(x.story, 1500) || 'Ein Leben. Gelebt.', title: cleanText(x.title, 80), score: sc ? sc.total : 0, parts: sc ? sc.parts : null, goalDone: !!(sc && sc.parts.goal) };
      });
      const fw = cleanText(data.world, 400);
      if (fw) S.world.unshift({ d: dateText(S), t: fw });
      S.phase = 'over'; S.over = { d: dateText(S) };
      return;
    }
    const M = S.stepM;
    const w = cleanText(data.world, 400);
    // Zeit vergeht Monat für Monat: erst jede Figur, dann die Verträge zwischen Spielern
    const flows = {};
    if (task === 'resolve') {
      for (let k = 0; k < M; k++) {
        S._mk = k;
        alive(S).forEach((p) => { const r = monthTick(S, S.chars[p.id], p.id); const f = flows[p.id] || (flows[p.id] = { inc: 0, out: 0 }); f.inc += r.inc; f.out += r.out; });
        const So = SOC();
        if (So) So.month(S, API);
      }
      S._mk = 0;
    }
    alive(S).forEach((p) => {
      const c = S.chars[p.id], x = byId[p.id];
      if (task === 'resolve') {
        const { inc, out } = flows[p.id] || { inc: 0, out: 0 };
        const f = M / 12, stoch = (v) => Math.floor(v + rng());
        c.effects.forEach((e) => STATS.forEach((k) => { if (e[k]) c.stats[k] = clampStat(c.stats[k] + stoch(e[k] * f)); }));
        c.effects = c.effects.filter((e) => !e.until || e.until > S.round + 1);
        const spent = Object.entries(c._spent || {}).map(([k, v]) => `${k} −${eur(v)}`);
        report(S, p.id, '💶', `${M > 1 ? `${M} Monate` : 'Monat'}: Einnahmen +${eur(inc)}, laufende Kosten −${eur(out)}${spent.length ? `, dazu ${spent.join(', ')}` : ''}`, inc - out >= 0 ? '' : 'bad');
      }
      if (!x) {
        if (failed || task) { S.stories[p.id] = failed ? 'April hat gerade Funkstille. Das Leben geht trotzdem weiter.' : (S.stories[p.id] || ''); S.events[p.id] = S.events[p.id] || 'Was machst du als Nächstes?'; }
        return;
      }
      S.stories[p.id] = cleanText(x.story, 1400);
      S.events[p.id] = cleanText(x.next_event, 600) || (data.builtin ? 'Ruhige Zeit, kein Ereignis. Nutz sie: Markt, Akademie, Reisen oder die anderen.' : 'Was machst du als Nächstes?');
      S.exam[p.id] = !!x.exam;
      const ck = x.check || {};
      if (task === 'resolve' && ck.used) S.checks[p.id] = { stat: cleanText(ck.stat, 40), dc: num(ck.dc, 1, 30), roll: S.rolls[p.id] || 0, success: !!ck.success, mod: num(ck.mod, -15, 15) };
      else if (task === 'resolve') delete S.checks[p.id];
      const d = x.delta || {};
      const cap = Math.max(25000, Math.abs(c.stats.money) * 1.5 + c.props.reduce((s, q) => s + q.value, 0) * 0.5);
      c.stats.money += num(d.money, -cap, cap);
      STATS.forEach((k) => { c.stats[k] = clampStat(c.stats[k] + num(d[k], -45, 45)); });
      (Array.isArray(x.end_effects) ? x.end_effects : []).slice(0, 6).forEach((name) => {
        const n = cleanText(name, 80).toLowerCase();
        if (n) c.effects = c.effects.filter((e) => e.locked || e.name.toLowerCase() !== n);
      });
      (Array.isArray(x.add_effects) ? x.add_effects : []).slice(0, 4).forEach((e) => {
        const name = cleanText(e.name, 80);
        if (!name || c.effects.length >= 20) return;
        const mcap = Math.max(4000, Math.abs(c.stats.money) * 0.3);
        c.effects = c.effects.filter((o) => o.name !== name);
        // Geld pro Monat; Werte pro Jahr. Laufzeit in Monaten → Runden grob über die aktuelle Rundenlänge
        const months = num(e.months != null ? e.months : (e.rounds || 0) * M, 0, 600);
        c.effects.push({ id: uid('e'), name, pm: num(e.pm != null ? e.pm : e.money, -mcap, mcap), health: num(e.health, -24, 24), happy: num(e.happy, -24, 24), power: num(e.power, -24, 24), until: months ? S.round + 1 + Math.max(1, Math.ceil(months / Math.max(1, M))) : 0 });
      });
      (Array.isArray(x.relations) ? x.relations : []).slice(0, 6).forEach((r) => {
        const name = cleanText(r.name, 40);
        if (!name) return;
        let rel = c.relations.find((o) => o.name.toLowerCase() === name.toLowerCase());
        if (!rel) { if (c.relations.length >= 24) return; rel = { name, kind: '', val: 50 }; c.relations.push(rel); }
        if (r.kind) rel.kind = cleanText(r.kind, 60);
        rel.val = num(rel.val + num(r.change, -60, 60), 0, 100);
        if (r.remove) c.relations = c.relations.filter((o) => o !== rel);
      });
      const st = x.status || {};
      if (st.job) c.job = cleanText(st.job, 100);
      if (st.education) c.education = cleanText(st.education, 80);
      if (st.location) c.location = cleanText(st.location, 80);
      if (st.title != null && st.title !== '') c.title = cleanText(st.title, 80) === '-' ? '' : cleanText(st.title, 80);
      if (st.living) c.living = cleanText(st.living, 100);
      const ch = cleanText(x.chronicle, 200);
      if (ch) c.chronicle.push({ d: dateText(S), t: ch });
      applyTools(S, p.id, c, x, M);
      if (c.chronicle.length > 100) c.chronicle.splice(0, c.chronicle.length - 100);
    });
    alive(S).forEach((p) => {
      const c = S.chars[p.id];
      if (c.flags.repeatAbi && c.abi) {
        c.flags.repeatAbi = 0;
        c.edu = { kind: 'school', school: c.edu.school || null };
        c.abi = { sel: c.abi.sel, blockI: Math.max(300, c.abi.blockI - 60), prep: Object.fromEntries(Object.entries(c.abi.prep).map(([k, v]) => [k, Math.round(v / 2)])), exams: {}, done: false, absent: 0, year: S.date.m <= 1 ? S.date.y : S.date.y + 1 };
        c.job = 'Schüler:in (Abi, Wiederholung)'; c.education = 'Wiederholt die Abschlussklasse';
        scheduleAbi(S, c);
      }
    });
    if (task === 'resolve') {
      // Wirtschaft: Zinsen, Inflation, Spritpreis wandern langsam
      const e = S.econ;
      for (let k = 0; k < M; k++) {
        e.zins = Math.round(clamp(e.zins + (rng() - 0.5) * 0.18, 1.2, 7.5) * 100) / 100;
        e.infl = Math.round(clamp(e.infl + (rng() - 0.5) * 0.25, -0.5, 8) * 100) / 100;
        e.fuel = Math.round(clamp(e.fuel + (rng() - 0.5) * 0.06, 1.35, 2.6) * 100) / 100;
      }
      S.round++;
      const mm = S.date.m + M;
      S.date = { y: S.date.y + Math.floor(mm / 12), m: mm % 12 };
      alive(S).forEach((p) => { const c = S.chars[p.id]; c.age = Math.floor((idx(S.date) - c.bornIdx) / 12); });
      S.actions = {}; S.quiz = {}; S.plans = {}; S.decided = {};
      (S.offers || []).forEach((o) => { if (o.kind === 'ask' && o.status === 'open') o.status = 'expired'; });
    }
    if (w) { S.world.unshift({ d: dateText(S), t: w }); S.world = S.world.slice(0, 16); }
    // Tod
    alive(S).forEach((p) => {
      const c = S.chars[p.id], x = byId[p.id] || {};
      if (c.stats.health <= 0 || (x.dead && c.stats.health <= 25)) {
        c.dead = true;
        c.deathReason = cleanText(x.death_reason, 200) || 'Die Gesundheit hat nicht mehr mitgespielt.';
        c.chronicle.push({ d: dateText(S), t: `Stirbt mit ${c.age}. ${c.deathReason}` });
        log(S, `${c.name} ist gestorben (${c.age}). ${c.deathReason}`);
      }
    });
    const yearsDone = (idx(S.date) - S.startIdx) / 12;
    const living = alive(S);
    if ((S.settings.years && yearsDone >= S.settings.years) || !living.length || (S.settings.death === 'win' && S.players.length > 1 && living.length <= 1)) {
      S.phase = 'think'; S.aiTask = 'final'; S.aiSeq++;
      return;
    }
    S.phase = 'act';
    chooseStep(S);
    const So = SOC();
    if (So) { So.expire(S); So.maybeScene(S, API); So.maybeVote(S, API); }
    S.deadline = S.settings.timer ? Date.now() + S.settings.timer * 1000 : 0;
  }

  // Sicht: eigene Pläne bleiben geheim
  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    V.sms = (V.sms || []).filter((m) => m.from === pid || m.to === pid);
    if (pid !== S.host) {
      Object.keys(V.actions).forEach((k) => { if (k !== pid) V.actions[k] = '•'; });
      Object.keys(V.picks || {}).forEach((k) => { if (k !== pid) delete V.picks[k]; });
      Object.keys(V.plans || {}).forEach((k) => { if (k !== pid) delete V.plans[k]; });
    }
    return V;
  }
  // Bots (Mitspieler für alleine): wählen eine freie Figur, nehmen die Standard-Abifächer, planen jeden Monat grob vernünftig
  function bot(S) {
    const bots = (S.players || []).filter((p) => p.bot);
    if (!bots.length) return null;
    const M = MK();
    if (S.phase === 'pick') {
      const p = bots.find((b) => !S.chars[b.id]);
      if (!p) return null;
      const used = new Set(Object.values(S.chars).map((c) => c.key));
      const free = Object.keys(PRESETS).filter((k) => !used.has(k) && k !== 'april');
      return free.length ? { pid: p.id, action: { type: 'pick', char: { key: free[rnd(free.length)] } }, delay: 500 } : null;
    }
    if (S.phase === 'setup') {
      const p = bots.find((b) => S.chars[b.id] && !S.ready[b.id]);
      return p ? { pid: p.id, action: { type: 'setup', sel: S.chars[p.id].abi ? S.chars[p.id].abi.sel : null }, delay: 600 } : null;
    }
    if (S.phase !== 'act') return null;
    const p = bots.find((b) => S.chars[b.id] && !S.chars[b.id].dead && !S.actions[b.id]);
    if (!p) return null;
    const c = S.chars[p.id];
    c._bot = c._bot || {};
    // Angebote anderer beantworten (meistens ja, Bots sind nett)
    const inc = (S.offers || []).find((o) => o.to === p.id && o.status === 'open');
    if (inc) return { pid: p.id, action: { type: 'oAnswer', id: inc.id, yes: rnd(10) < 7 }, delay: 800 };
    // Bots gehen auf Menschen zu: Lerngruppe, Party, Duell, Date
    if (c._bot.soc !== idx(S.date) && rnd(100) < 12) {
      c._bot.soc = idx(S.date);
      const humans = S.players.filter((x) => !x.bot && S.chars[x.id] && !S.chars[x.id].dead);
      if (humans.length) {
        const h = humans[rnd(humans.length)], t = S.chars[h.id];
        const both = c.edu.kind === 'school' && t.edu.kind === 'school';
        const kinds = both ? ['lerngruppe', 'party', 'duel'] : ['party', 'duel', c.flags.partner ? 'party' : 'date'];
        const kind = kinds[rnd(kinds.length)];
        const terms = kind === 'duel' ? { stat: ['social', 'body', 'smart'][rnd(3)], stake: Math.min(200, Math.max(0, Math.floor(c.stats.money / 10))) } : kind === 'lerngruppe' ? { subj: Object.keys(t.abi.exams)[0] } : {};
        return { pid: p.id, action: { type: 'oOffer', to: h.id, kind, terms }, delay: 700 };
      }
    }
    // ab und zu ein Gig mit den eigenen Skills
    const Cg = CO();
    if (Cg && c._bot.gig !== idx(S.date) && rnd(3) === 0) { c._bot.gig = idx(S.date); const g = Cg.gigs(S, c, idx(S.date))[0]; if (g) return { pid: p.id, action: { type: 'kGig', id: g.id }, delay: 600 }; }
    // Führerschein, wenn genug Geld da ist
    if (c._bot.lic !== idx(S.date) && c.license.status === 'none' && c.key !== 'april' && c.stats.money > 1600) { c._bot.lic = idx(S.date); return { pid: p.id, action: { type: 'licEnroll', school: (c.contacts || []).includes('opa-fahrschule') ? 'opa' : DB.LICENSE.schools[0].id }, delay: 600 }; }
    if (c._bot.book !== idx(S.date) && c.license.status !== 'none' && !c.license.has) { c._bot.book = idx(S.date); if (!c.appts.some((t) => t.status === 'open' && /^lic-/.test(t.kind))) return { pid: p.id, action: { type: 'licBook', kind: c.license.theoryPass ? 'practical' : 'theory' }, delay: 600 }; }
    // erst Markt, dann der Monat (pro Aufruf eine Aktion)
    const now = idx(S.date);
    if (M && c._bot.mk !== now) {
      c._bot.mk = now;
      const waiting = c.appts.some((t) => t.status === 'open' && /interview|start-|uni-letter/.test(t.kind));
      const city = c.home.city || 'Duisburg';
      if (c.edu.kind === 'none' && !c.job2 && !waiting && c.key !== 'april') {
        const uni = c.flags.abi && S.date.m <= 6 && rnd(2) ? M.list(S, 'uni', city).filter((x) => !x.taken && (!x.nc || x.nc >= Number(String(c.flags.grade || '3').replace(',', '.')))) : [];
        const l = uni.length ? uni : M.list(S, rnd(2) ? 'training' : 'job', city).filter((x) => !x.taken && x.req !== 'st' && M.quals(c).has(x.req === 'h' ? '-' : x.req));
        if (l.length) return { pid: p.id, action: { type: 'mApply', id: l[rnd(l.length)].id }, delay: 700 };
      }
      if ((c.job2 || c.edu.kind === 'uni') && c.housing.kind === 'family' && c.stats.money > 2500 && rnd(4) === 0) {
        const l = M.list(S, 'wg', c.edu.kind === 'uni' ? c.edu.prog.city : city).filter((x) => !x.taken && !x.scam);
        if (l.length) return { pid: p.id, action: { type: 'mRent', id: l[0].id }, delay: 700 };
      }
    }
    const appts = {};
    dueAppts(S, c).concat(overdue(S, c)).forEach((t) => { appts[t.id] = { d: c.stats.health < 25 && /abi|lic/.test(t.kind) ? 'sick' : 'go', quiz: null }; });
    const focus = c.edu.kind === 'school' || c.edu.kind === 'uni' ? ['learn', c.stats.health < 50 ? 'sport' : c.stats.happy < 40 ? 'chill' : 'people'] : [c.stats.money < 500 ? 'work' : 'sport', c.stats.happy < 40 ? 'party' : 'people'];
    const plan = { focus, subj: [], appts, drive: { theory: 4, lessons: c.stats.money > 600 ? 3 : 0, special: c.stats.money > 900 ? 2 : 0 }, courses: Object.keys(c.courses || {}).filter((k) => c.courses[k].status === 'learning').slice(0, 2) };
    const card = S.cards[p.id];
    let action = { type: 'do', plan };
    if (card) {
      const opts = card.opts.map((o, i) => ({ i, o, ch: DECK ? DECK.chance(c, o) : 50 })).filter((x) => !x.o.cost || c.stats.money + c.bank.dispo >= x.o.cost);
      opts.sort((a, b) => b.ch - a.ch + (rnd(3) - 1) * 10);
      action = opts.length ? { type: 'do', choice: opts[0].i, plan } : { type: 'do', text: 'Macht einfach weiter.', plan };
    }
    return { pid: p.id, action, delay: 900 };
  }

  // Hilfen für Markt und Verträge (larp-market.js)
  const API = { DB, addAppt, report, pay, eur, dateText, dayText, idx, uid, rnd: (n) => rnd(n), d20, clamp, clampStat, cleanText, num, log, alive, endJob, schoolPrice, MONTHS };
  const LARP = {
    MONTHS, PRESETS, FOCUS, PACE, start, act, view, bot, dateText, dayText, alive, eur, idx, abiRules, abiResult, dueAppts, overdue, schoolPrice, API,
    setRng: (f) => { rng = f || Math.random; },
  };
  if (isNode) module.exports = LARP;
  else root.DULI_LARP = LARP;
})(typeof window !== 'undefined' ? window : globalThis);
