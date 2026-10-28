// DULIDAN LARP EXTREME – Skills und Firma.
// Skills: beliebige Fähigkeiten (3D, Webdesign, Singen …) mit Level 0–100. Lernen, Jobs, Akademie, Reisen und April ändern sie.
// Firma: Mitarbeiter einstellen (eigene Skills, Gehalt, Laune), Firmen-Skills = du + Team kombiniert,
// Aufträge verlangen Skills und werden je nach Firmen-Skill schneller oder langsamer fertig.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const MK = () => root.DULI_LARP_MARKET || (isNode ? require('./larp-market') : null);
  const OF = () => root.DULI_LARP_OFFICE || (isNode ? require('./larp-office') : null);

  // ---------- Skills ----------
  const CATALOG = {
    Digital: ['Programmieren', 'Webdesign', '3D-Modellierung', 'Grafikdesign', 'Videoschnitt', 'Social Media', 'Game Design', 'KI und Daten', 'IT-Sicherheit'],
    Kreativ: ['Singen', 'Gitarre', 'Klavier', 'Tanzen', 'Schauspiel', 'Fotografie', 'Schreiben', 'Musikproduktion', 'Zeichnen'],
    Business: ['Verkauf', 'Verhandeln', 'Marketing', 'Buchhaltung', 'Führung', 'Projektmanagement', 'Kundenservice'],
    Handwerk: ['Kochen', 'Elektrik', 'Schreinern', 'Autos schrauben', 'Nähen', 'Gärtnern'],
    Sprachen: ['Englisch', 'Spanisch', 'Französisch', 'Türkisch', 'Arabisch', 'Japanisch', 'Italienisch'],
    Körper: ['Fitness', 'Fußball', 'Kampfsport', 'Schwimmen', 'Erste Hilfe'],
    Ansehen: ['Bekanntheit', 'Netzwerk', 'Charisma', 'Ruf in der Szene'],
  };
  const ALL = Object.values(CATALOG).flat();
  const catOf = (name) => Object.keys(CATALOG).find((k) => CATALOG[k].includes(name)) || 'Eigenes';
  const START = {
    shaquille: { Programmieren: 45, 'Game Design': 42, Webdesign: 30, '3D-Modellierung': 22, Führung: 20, Englisch: 50 },
    kimberly: { 'Social Media': 38, Verhandeln: 30, Tanzen: 35, Englisch: 45, Kundenservice: 25 },
    justin: { Fitness: 55, Fußball: 45, Verkauf: 30, Kampfsport: 25, Englisch: 35 },
    april: { 'KI und Daten': 85, Programmieren: 70, Schreiben: 60, Englisch: 90, Japanisch: 40, Singen: 45 },
    deniz: { 'Autos schrauben': 50, Elektrik: 30, Verkauf: 25, Türkisch: 70, Englisch: 30 },
    lea: { 'Social Media': 60, Fotografie: 45, Marketing: 35, Videoschnitt: 30, Englisch: 50, Bekanntheit: 40 },
    jonas: { Programmieren: 55, 'KI und Daten': 40, 'IT-Sicherheit': 30, Englisch: 55, Klavier: 25 },
    aylin: { Buchhaltung: 40, Verkauf: 45, Verhandeln: 40, Türkisch: 75, Führung: 25, Englisch: 40 },
  };
  const LANG = { en: 'Englisch', es: 'Spanisch', fr: 'Französisch', tr: 'Türkisch', ja: 'Japanisch', it: 'Italienisch', pt: 'Spanisch' };
  const JOB_SKILL = { IT: 'Programmieren', Medien: 'Videoschnitt', Handwerk: 'Elektrik', Kfz: 'Autos schrauben', Gastro: 'Kochen', Verwaltung: 'Buchhaltung', Handel: 'Verkauf', Gesundheit: 'Erste Hilfe', Logistik: 'Projektmanagement', Raumfahrt: 'KI und Daten' };
  const CERT_SKILL = { ppl: ['Fliegen', 55], atpl: ['Fliegen', 80], drohne: ['Drohnenfliegen', 45], polizei: ['Kampfsport', 10], bundeswehr: ['Fitness', 10], rettsan: ['Erste Hilfe', 50], rettungsschwimmer: ['Schwimmen', 50], motorrad: ['Motorradfahren', 50], tauchen: ['Tauchen', 50], ielts: ['Englisch', 75], barkeeper: ['Cocktails mixen', 55], meister: ['Führung', 15], fallschirm: ['Fallschirmspringen', 50] };

  function ensure(c) {
    if (!c.skills) c.skills = Object.assign({}, START[c.key] || { Englisch: 35 });
    return c.skills;
  }
  const clampL = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
  // Skill ändern (neu anlegen, wenn es ihn noch nicht gibt); gibt die neue Stufe zurück
  function change(c, name, d) {
    ensure(c);
    const n = String(name || '').trim().slice(0, 40);
    if (!n) return 0;
    const key = Object.keys(c.skills).find((k) => k.toLowerCase() === n.toLowerCase()) || n;
    if (c.skills[key] == null && Object.keys(c.skills).length >= 30) return 0;
    c.skills[key] = clampL((c.skills[key] || 0) + d);
    if (c.skills[key] <= 0) delete c.skills[key];
    return c.skills[key] || 0;
  }
  const level = (c, name) => (ensure(c)[name] || 0);
  // Lernen im Fokus: schnell am Anfang, langsamer zum Meister
  function train(S, pid, c, names, M, X) {
    const D = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
    (names || []).slice(0, 2).forEach((n) => {
      const cur = level(c, n), g = (3.2 + (D ? D.mod(c, 'smart') : 0) * 0.4) * M * (1 - cur / 120);
      const nl = change(c, n, Math.max(0.5, g));
      X.report(S, pid, '•', `Trainiert ${n}: Level ${Math.round(cur)} → ${Math.round(nl)}.`);
    });
  }
  // Jeden Monat: Job trainiert passende Skills, Lizenzen geben Skills, ungenutzte Skills rosten ganz langsam
  function monthSkills(S, c) {
    ensure(c);
    if (c.job2 && c.job2.kind !== 'mini') {
      const area = (c.job2.training && c.job2.training.area) || c.job2.area || '';
      const s = JOB_SKILL[area] || (/Entwickl|Informatik|IT/.test(c.job2.title) ? 'Programmieren' : /Verkauf|Kauf/.test(c.job2.title) ? 'Verkauf' : null);
      if (s) change(c, s, 0.6 * (1 - level(c, s) / 140));
    }
    (c.certs || []).forEach((k) => { const cs = CERT_SKILL[k]; if (cs && level(c, cs[0]) < cs[1]) change(c, cs[0], cs[1] - level(c, cs[0])); });
    if (c.abroad && root.DULI_LARP_WORLD) { const L = LANG[root.DULI_LARP_WORLD.country(c.abroad).lang]; if (L) change(c, L, 1.2 * (1 - level(c, L) / 110)); }
  }

  // ---------- Firma ----------
  const FIRSTN = ['Lena', 'Mo', 'Kevin', 'Aylin', 'Jonas', 'Sophie', 'Emre', 'Lara', 'Finn', 'Mia', 'Can', 'Nele', 'Tim', 'Selin', 'Luca', 'Hannah', 'Yusuf', 'Paula', 'Ben', 'Zoe', 'Niklas', 'Elif', 'Jan', 'Leonie'];
  const SURN = ['Becker', 'Yılmaz', 'Schmidt', 'Nguyen', 'Kowalski', 'Wagner', 'Demir', 'Hoffmann', 'Popescu', 'Fischer', 'Kaya', 'Neumann', 'Weber', 'Haddad'];
  const ROLES = [['Entwickler:in', ['Programmieren', 'KI und Daten', 'IT-Sicherheit']], ['Webdesigner:in', ['Webdesign', 'Grafikdesign']], ['3D-Artist', ['3D-Modellierung', 'Game Design']], ['Grafiker:in', ['Grafikdesign', 'Zeichnen']],
    ['Video-Creator', ['Videoschnitt', 'Social Media', 'Fotografie']], ['Marketing', ['Marketing', 'Social Media']], ['Vertrieb', ['Verkauf', 'Verhandeln']], ['Projektmanager:in', ['Projektmanagement', 'Führung']],
    ['Buchhaltung', ['Buchhaltung']], ['Sounddesigner:in', ['Musikproduktion', 'Singen']], ['Texter:in', ['Schreiben', 'Marketing']], ['Kundenservice', ['Kundenservice', 'Englisch']]];
  const TRAITS = [['fleißig', 1.15, 0], ['Genie', 1.35, -5], ['chaotisch', 0.9, 5], ['Diva', 1.1, -15], ['treue Seele', 1, 15], ['faul', 0.75, 5], ['Teamplayer', 1.05, 10]];
  // Karriereleiter in jeder Firma: Gehaltsband, Mindest-Skill (Schnitt der zwei besten), Führung, Monate in der Firma, Teamgröße
  const LADDER = [
    { name: 'Praktikant:in', band: [600, 1200], avg: 0, lead: 0, months: 0, team: 0 },
    { name: 'Junior', band: [2000, 2800], avg: 20, lead: 0, months: 0, team: 0 },
    { name: 'Mitarbeiter:in', band: [2800, 3800], avg: 38, lead: 0, months: 6, team: 0 },
    { name: 'Senior', band: [3800, 5200], avg: 58, lead: 0, months: 18, team: 0 },
    { name: 'Teamleitung', band: [5000, 6800], avg: 60, lead: 40, months: 24, team: 4 },
    { name: 'Abteilungsleitung', band: [6800, 9500], avg: 68, lead: 60, months: 36, team: 10 },
    { name: 'Geschäftsführung', band: [9500, 16000], avg: 74, lead: 75, months: 48, team: 20 },
  ];
  const top2 = (sk) => { const v = Object.entries(sk || {}).filter(([k]) => k !== 'Führung' && k !== 'Bekanntheit').map(([, x]) => x).sort((a, b) => b - a); return v.length ? ((v[0] || 0) + (v[1] || v[0] || 0)) / 2 : 0; };
  // Was fehlt für die nächste Stufe? (leer = darf befördert werden)
  function missingFor(person, nextLv, months, teamSize) {
    const L = LADDER[nextLv];
    if (!L) return ['Höher geht es nicht.'];
    const out = [];
    if (top2(person.skills) < L.avg) out.push(`Skills im Schnitt ${L.avg} (hat ${Math.round(top2(person.skills))})`);
    if (L.lead && (person.skills.Führung || 0) < L.lead) out.push(`Führung ${L.lead} (hat ${Math.round(person.skills.Führung || 0)})`);
    if (months < L.months) out.push(`${L.months} Monate in der Firma (hat ${months})`);
    if (L.team && teamSize < L.team) out.push(`Firma mit ${L.team} Leuten (hat ${teamSize})`);
    return out;
  }
  const startLevel = (p) => (p.junior ? 1 : top2(p.skills) >= 58 ? 3 : 2);
  // Alle Leute einer Firma: angestellte Figuren (bei Personen) und Spieler-Figuren, die für diese Person arbeiten
  function players(S, bossPid) {
    if (!S || !S.chars) return [];
    return Object.entries(S.chars).filter(([id, o]) => !o.dead && o.job2 && o.job2.boss === bossPid).map(([id, o]) => ({ pid: id, name: o.name, role: o.job2.title, skills: o.skills || {}, gross: o.job2.gross, level: o.job2.level != null ? o.job2.level : 2, mood: 70, trait: ['Spieler:in', 1, 0], since: o.job2.since, player: true }));
  }
  function firm(c) {
    if (!c.firm) c.firm = { name: OF() ? OF().firmName(c) : `${c.name}s Firma`, staff: [], jobs: [], rep: 30, done: 0, lastRev: 0 };
    return c.firm;
  }
  const can = (c) => !!(OF() && OF().canHave(c));
  // Wie viele Leute passen rein? Büro-Plätze minus du, plus 2 im Homeoffice
  const capacity = (c) => Math.max(0, (c.offices || []).reduce((s, o) => s + o.desks, 0) - 1) + 2;
  // Firmen-Skills: der oder die Beste zählt voll, alle anderen mit abnehmendem Anteil, Laune und Eigenschaft wirken mit
  function skills(c, S, pid) {
    ensure(c);
    const F = firm(c), people = [{ skills: c.skills, f: 1 }].concat(F.staff.map((p) => ({ skills: p.skills, f: p.trait[1] * (0.6 + p.mood / 250) })), players(S, pid || c._pid).map((p) => ({ skills: p.skills, f: 1 })));
    const out = {};
    const names = new Set(people.flatMap((p) => Object.keys(p.skills)));
    names.forEach((n) => {
      const lv = people.map((p) => (p.skills[n] || 0) * p.f).filter((v) => v > 0).sort((a, b) => b - a);
      out[n] = Math.round(lv.reduce((s, v, i) => s + v * (i === 0 ? 1 : 0.35 / i), 0));
    });
    return out;
  }
  function applicants(S, c, mIdx) {
    const M = MK(), r = M.rngOf(S.market.seed, 'staff', c.home.city || '', mIdx), out = [];
    for (let i = 0; i < 6; i++) {
      const [role, sk] = ROLES[Math.floor(r() * ROLES.length)], tr = TRAITS[Math.floor(r() * TRAITS.length)];
      const lvl = Math.round(20 + r() * 65), s = {};
      sk.forEach((n, j) => { s[n] = Math.max(5, Math.round(lvl - j * 12 + (r() - 0.5) * 16)); });
      if (r() < 0.6) s.Englisch = Math.round(25 + r() * 60);
      const gross = Math.round((1900 + lvl * 42 + (tr[0] === 'Genie' ? 900 : 0)) * (0.9 + r() * 0.25) / 50) * 50;
      out.push({ id: `staff:${mIdx}:${i}`, name: `${FIRSTN[Math.floor(r() * FIRSTN.length)]} ${SURN[Math.floor(r() * SURN.length)]}`, role, skills: s, gross, trait: tr, junior: lvl < 35 });
    }
    return out;
  }
  // Aufträge für die Firma (je Monat neu): verlangen Skills, bringen Geld und Ruf
  const CLIENTS = ['Bäckerei Krämer', 'Autohaus Becker', 'Stadtwerke', 'ein Startup aus Berlin', 'eine Influencerin', 'ein Fußballverein', 'eine Zahnarztpraxis', 'ein Indie-Label', 'eine Spielefirma', 'die Stadtverwaltung', 'ein Modelabel', 'ein Konzern aus München'];
  const WORK = [['Website', ['Webdesign', 'Programmieren']], ['App', ['Programmieren', 'Grafikdesign']], ['Imagefilm', ['Videoschnitt', 'Fotografie']], ['3D-Produktvisualisierung', ['3D-Modellierung']], ['Social-Media-Kampagne', ['Social Media', 'Marketing']],
    ['Mini-Game', ['Game Design', 'Programmieren']], ['Werbesong', ['Musikproduktion', 'Singen']], ['Logo und Branding', ['Grafikdesign', 'Marketing']], ['KI-Chatbot', ['KI und Daten', 'Programmieren']], ['Sicherheits-Check', ['IT-Sicherheit']], ['Messestand', ['Projektmanagement', 'Verkauf']], ['Übersetzung', ['Englisch', 'Schreiben']]];
  function offers(S, c, mIdx) {
    const M = MK(), r = M.rngOf(S.market.seed, 'jobs', c.name, mIdx), out = [], F = firm(c);
    for (let i = 0; i < 5; i++) {
      const [what, sk] = WORK[Math.floor(r() * WORK.length)], size = r() < 0.15 ? 3 : r() < 0.45 ? 2 : 1;
      const req = {};
      sk.forEach((n, j) => { req[n] = Math.round((20 + size * 15 + r() * 20) - j * 10); });
      const months = size + Math.floor(r() * 2) + 1;
      const pay = Math.round(months * (2600 + size * 1900) * (0.9 + r() * 0.4) * (1 + F.rep / 250) / 100) * 100;
      out.push({ id: `fjob:${mIdx}:${i}`, title: `${what} für ${CLIENTS[Math.floor(r() * CLIENTS.length)]}`, req, months, pay, size, minRep: size === 3 ? 45 : 0 });
    }
    return out;
  }
  // Fortschritt pro Monat: Firmen-Skill gegen Anforderung, Teamgröße hilft
  function pace(c, job, S, pid) {
    const fs = skills(c, S, pid), ratios = Object.entries(job.req).map(([n, v]) => Math.min(1.6, (fs[n] || 0) / Math.max(1, v)));
    const ratio = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    const F = firm(c), leads = F.staff.filter((p) => (p.level || 0) >= 4).length;
    const team = 1 + Math.min(0.6, (F.staff.length + players(S, pid || c._pid).length) * 0.12) * (1 + Math.min(3, leads) * 0.15);
    return Math.round(100 / job.months * ratio * team);
  }

  function act(S, pid, a, X) {
    const c = S.chars[pid];
    if (!c || c.dead) return 'Deine Figur lebt nicht mehr.';
    if (S.phase !== 'act') return 'Geht nur, während ihr plant.';
    if (c.prison) return 'Du sitzt im Gefängnis.';
    ensure(c);
    if (a.type === 'kLearn') {
      const n = X.cleanText(a.name, 40);
      if (!n) return 'Welcher Skill?';
      if (Object.keys(c.skills).some((k) => k.toLowerCase() === n.toLowerCase())) return 'Den hast du schon. Trainier ihn im Fokus „Lernen“.';
      if (Object.keys(c.skills).length >= 30) return 'Mehr als 30 Skills schafft niemand.';
      change(c, n, 3);
      X.report(S, pid, '•', `Neuer Skill: ${n}. Du fängst bei null an. Im Fokus „Lernen“ trainieren.`);
      return null;
    }
    if (a.type === 'kQuit') {
      if (!c.job2 || !c.job2.boss) return 'Du arbeitest nicht für eine andere Figur.';
      const boss = c.job2.boss;
      endPlayerJob(S, pid, c, null, X);
      X.report(S, pid, '•', 'Gekündigt. Du bist frei.');
      if (S.chars[boss]) { X.report(S, boss, '•', `${c.name} hat bei dir gekündigt.`, 'bad'); sms(S, pid, boss, 'Ich kündige. War schön mit dir, aber ich mach jetzt was anderes.'); }
      return null;
    }
    if (!can(c)) return 'Erst brauchst du eine Firma (Fokus „Eigenes Projekt“).';
    const F = firm(c), now = X.idx(S.date);
    if (a.type === 'kHire') {
      const p = applicants(S, c, now).find((x) => x.id === a.id);
      if (!p) return 'Die Bewerbung gibt es nicht mehr.';
      if ((S.market.taken || {})[`${pid}:${p.id}`]) return 'Schon eingestellt.';
      if (F.staff.length >= capacity(c)) return `Kein Platz: ${capacity(c)} Plätze (Büro plus 2 im Homeoffice). Erst ein größeres Büro mieten.`;
      if (c.stats.money + c.bank.dispo < p.gross * 1.21) return `Das erste Gehalt (${X.eur(Math.round(p.gross * 1.21))} mit Sozialabgaben) musst du schon haben.`;
      S.market.taken[`${pid}:${p.id}`] = 1;
      F.staff.push({ id: X.uid('st'), name: p.name, role: p.role, skills: p.skills, gross: p.gross, trait: p.trait, mood: 70, since: now, level: startLevel(p), promoAt: now });
      X.report(S, pid, '•', `EINGESTELLT: ${p.name} als ${p.role} (${X.eur(p.gross)} brutto, mit Abgaben ${X.eur(Math.round(p.gross * 1.21))}). Eigenschaft: ${p.trait[0]}.`, 'good');
      c.chronicle.push({ d: X.dateText(S), t: `Stellt ${p.name} ein (${p.role}).` });
      return null;
    }
    const st = a.staff && F.staff.find((x) => x.id === a.staff);
    if (a.type === 'kFire') {
      if (!st) return 'Gibt es nicht.';
      const years = (now - st.since) / 12, sev = years >= 0.5 ? Math.round(st.gross * 0.5 * Math.max(1, years)) : 0;
      c.stats.money -= sev;
      F.staff = F.staff.filter((x) => x !== st);
      F.staff.forEach((x) => { x.mood = Math.max(0, x.mood - 8); });
      X.report(S, pid, '•', `${st.name} entlassen${sev ? `, Abfindung ${X.eur(sev)}` : ' (Probezeit)'}. Im Team ist die Stimmung gedrückt.`, 'bad');
      return null;
    }
    if (a.type === 'kRaise') {
      if (!st) return 'Gibt es nicht.';
      const plus = Math.round(st.gross * 0.1 / 50) * 50;
      st.gross += plus; st.mood = Math.min(100, st.mood + 20);
      X.report(S, pid, '•', `${st.name} bekommt ${X.eur(plus)} mehr. Laune steigt.`, 'good');
      return null;
    }
    if (a.type === 'kPromote') {
      if (!st) return 'Gibt es nicht.';
      const lv = st.level || 2, miss = missingFor(st, lv + 1, now - st.since, F.staff.length + players(S, pid).length);
      if (miss.length) return `${st.name} kann noch nicht ${LADDER[lv + 1] ? LADDER[lv + 1].name : 'höher'} werden: ${miss.join(', ')}.`;
      st.level = lv + 1; st.promoAt = now; st.gross = Math.max(st.gross, LADDER[lv + 1].band[0]); st.mood = Math.min(100, st.mood + 25);
      X.report(S, pid, '•', `${st.name} ist jetzt ${LADDER[st.level].name}. Neues Gehalt ${X.eur(st.gross)} brutto.`, 'good');
      return null;
    }
    // Spieler-Figuren in der eigenen Firma: der Chef entscheidet direkt, ohne Würfel
    const emp = a.pid && S.chars[a.pid] && S.chars[a.pid].job2 && S.chars[a.pid].job2.boss === pid ? S.chars[a.pid] : null;
    if (a.type === 'kRaiseP' || a.type === 'kPromoteP' || a.type === 'kFireP') {
      if (!emp) return 'Die Person arbeitet nicht für dich.';
      const J = emp.job2;
      if (a.type === 'kFireP') { endPlayerJob(S, a.pid, emp, `${c.name} hat dich entlassen.`, X); X.report(S, pid, '•', `${emp.name} entlassen.`); return null; }
      if (a.type === 'kRaiseP') { const pct = Math.max(3, Math.min(30, Number(a.pct) || 10)); setGross(S, a.pid, emp, Math.round(J.gross * (1 + pct / 100) / 50) * 50); X.report(S, a.pid, '•', `${c.name} gibt dir ${pct} % mehr Gehalt: jetzt ${X.eur(J.gross)} brutto.`, 'good'); X.report(S, pid, '•', `${emp.name} verdient jetzt ${X.eur(J.gross)}.`); sms(S, pid, a.pid, `Ich hab dir ${pct} % mehr Gehalt gegeben. Gönn dir.`); return null; }
      const lv = J.level != null ? J.level : 2, miss = missingFor({ skills: emp.skills || {} }, lv + 1, now - J.since, F.staff.length + players(S, pid).length);
      if (miss.length && !a.force) return `${emp.name} erfüllt noch nicht alles für ${LADDER[lv + 1] ? LADDER[lv + 1].name : 'mehr'}: ${miss.join(', ')}. (Trotzdem befördern geht, aber das Team merkt es.)`;
      J.level = lv + 1; J.title = `${LADDER[J.level].name} bei ${J.firm}`; emp.job = J.title;
      setGross(S, a.pid, emp, Math.max(J.gross, LADDER[J.level].band[0]));
      if (miss.length) F.staff.forEach((x) => { x.mood = Math.max(0, x.mood - 10); });
      X.report(S, a.pid, '•', `BEFÖRDERT von ${c.name}: Du bist jetzt ${LADDER[J.level].name}. ${X.eur(J.gross)} brutto.`, 'good');
      X.report(S, pid, '•', `${emp.name} ist jetzt ${LADDER[J.level].name}.`);
      emp.chronicle.push({ d: X.dateText(S), t: `Befördert zu ${LADDER[J.level].name} bei ${J.firm}.` });
      return null;
    }
    if (a.type === 'kTake') {
      const j = offers(S, c, now).find((x) => x.id === a.id);
      if (!j) return 'Den Auftrag gibt es nicht mehr.';
      if (F.jobs.some((x) => x.id === j.id)) return 'Habt ihr schon.';
      if (F.rep < j.minRep) return `Für so einen großen Auftrag braucht ihr mehr Ruf (${j.minRep}).`;
      const max = 1 + Math.floor(F.staff.length / 2);
      if (F.jobs.length >= max) return `Mehr als ${max} Aufträge gleichzeitig schafft ihr nicht. Mehr Leute einstellen.`;
      F.jobs.push(Object.assign({}, j, { progress: 0, start: now, deadline: now + Math.ceil(j.months * 1.5) }));
      X.report(S, pid, '•', `Auftrag angenommen: ${j.title}. ${X.eur(j.pay)}, geplant ${j.months} Monate.`);
      return null;
    }
    return 'Unbekannt.';
  }

  // Monatlich: Gehälter, Fortschritt, Aufträge fertig oder verpatzt, Leute kündigen, lernen, werden krank
  function month(S, c, pid, X) {
    monthSkills(S, c);
    if (!c.firm || c.prison) return { inc: 0, out: 0 };
    const F = c.firm, cur = X.idx(S.date) + (S._mk || 0);
    let inc = 0, out = 0;
    F.staff.forEach((p) => { const cost = Math.round(p.gross * 1.21); out += cost; });
    c.stats.money -= out;
    if (out) { c._spent = c._spent || {}; c._spent.Gehälter = (c._spent.Gehälter || 0) + out; }
    F.jobs.slice().forEach((j) => {
      j.progress = Math.min(100, j.progress + Math.round(pace(c, j, S, pid) * (0.75 + X.rnd(50) / 100)));
      if (j.progress >= 100) {
        const q = Math.min(1.3, pace(c, j, S, pid) * j.months / 100);
        const pay = Math.round(j.pay * (q >= 1 ? 1 : 0.85));
        inc += pay; c.stats.money += pay;
        F.rep = Math.min(100, F.rep + 3 + j.size * 2); F.done++;
        F.jobs = F.jobs.filter((x) => x !== j);
        c.flags.company = Math.min(6, (c.flags.company || 0) + 0.15 * j.size);
        X.report(S, pid, '•', `AUFTRAG FERTIG: ${j.title}. +${X.eur(pay)}${q < 1 ? ' (Kunde etwas unzufrieden, Abzug)' : ''}. Ruf ${F.rep}.`, 'good');
      } else if (cur >= j.deadline) {
        const pen = Math.round(j.pay * 0.2);
        c.stats.money -= pen; out += pen;
        F.rep = Math.max(0, F.rep - 10);
        F.jobs = F.jobs.filter((x) => x !== j);
        X.report(S, pid, '•', `Auftrag geplatzt: ${j.title} kam nicht rechtzeitig fertig (${j.progress} %). Vertragsstrafe ${X.eur(pen)}, Ruf ${F.rep}.`, 'bad');
      }
    });
    c.tx = c.tx || { y: S.date.y, gross: 0, rent: 0, biz: 0 };
    c.tx.biz += inc - out;
    F.lastRev = inc - out;
    // Leute: lernen im Job, Laune, Zufälle, wollen aufsteigen
    const leads = F.staff.filter((p) => (p.level || 0) >= 4).length, teamN = F.staff.length + players(S, pid).length;
    F.staff.slice().forEach((p) => {
      if (p.level == null) p.level = 2;
      if (teamN >= 6 && !leads) p.mood = Math.max(0, p.mood - 1);
      if (!missingFor(p, p.level + 1, cur - p.since, teamN).length && cur - (p.promoAt || p.since) >= 12) {
        p.mood = Math.max(0, p.mood - 3);
        if ((cur - (p.promoAt || p.since)) % 4 === 0) X.report(S, pid, '•', `${p.name} möchte ${LADDER[p.level + 1].name} werden und erfüllt alles. Laune sinkt, bis du entscheidest (Tab „Firma“).`);
      }
      Object.keys(p.skills).forEach((n) => { p.skills[n] = clampL(p.skills[n] + 0.4 * (1 - p.skills[n] / 120)); });
      p.mood = Math.max(0, Math.min(100, p.mood + (F.jobs.length ? 0 : -2) + (p.trait[2] > 0 ? 1 : 0) - (p.gross < 2200 ? 1 : 0)));
      const r = X.rnd(1000);
      if (p.mood < 25 && r < 120) { F.staff = F.staff.filter((x) => x !== p); X.report(S, pid, '•', `${p.name} kündigt: „Ich hab was Besseres gefunden.“`, 'bad'); }
      else if (r < 15) { X.report(S, pid, '•', `${p.name} ist zwei Wochen krank. Projekte stocken.`, 'bad'); F.jobs.forEach((j) => { j.progress = Math.max(0, j.progress - 5); }); }
      else if (r < 22 && p.trait[0] === 'Genie') { F.rep = Math.min(100, F.rep + 4); X.report(S, pid, '•', `${p.name} hat eine geniale Idee. Der Kunde ist begeistert, Ruf ${F.rep}.`, 'good'); }
      else if (r < 27 && p.trait[0] === 'Diva') { p.mood -= 15; X.report(S, pid, '•', `${p.name} will mehr Geld und einen Fensterplatz.`, 'bad'); }
    });
    return { inc, out };
  }
  function setGross(S, pid, emp, gross) {
    emp.job2.gross = gross;
    (S.contracts || []).forEach((k) => { if (k.kind === 'salary' && k.payee === pid && k.viaJob) k.pm = Math.round(gross * 1.21); });
  }
  function endPlayerJob(S, pid, emp, msg, X) {
    (S.contracts || []).forEach((k) => { if (k.kind === 'salary' && k.payee === pid && k.viaJob) k.ended = true; });
    S.contracts = (S.contracts || []).filter((k) => !k.ended);
    if (msg) X.report(S, pid, '•', msg, 'bad');
    X.endJob(S, emp, msg ? 'entlassen' : 'selbst gekündigt');
    emp.job = 'sucht einen Job';
  }
  // SMS ins Handy (auch von Leuten, die nur April spielt: from = 'npc:Name')
  function sms(S, from, to, text, npc) {
    S.sms = S.sms || [];
    const d = S.date ? `${S.date.m + 1}/${S.date.y}` : '';
    S.sms.push({ id: 's' + Math.random().toString(36).slice(2, 9), from, to, t: String(text).slice(0, 400), d, round: S.round, npc: npc || null });
    if (S.sms.length > 400) S.sms.splice(0, S.sms.length - 400);
  }
  const COMPANY = { LADDER, missingFor, players, setGross, endPlayerJob, sms, top2, startLevel, CATALOG, ALL, catOf, ensure, change, level, train, monthSkills, firm, can, capacity, skills, applicants, offers, pace, act, month };
  if (isNode) module.exports = COMPANY;
  else root.DULI_LARP_COMPANY = COMPANY;
})(typeof window !== 'undefined' ? window : globalThis);
