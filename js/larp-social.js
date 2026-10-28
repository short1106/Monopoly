// DULIDAN LARP EXTREME – Zusammen spielen: Angebote zwischen Spielern, Verträge, Duelle, Gerüchte und
// gemeinsame Szenen mit geheimer Wahl. Läuft beim Host (Engine-Teil, ohne Oberfläche).
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const MAX_OUT = 3; // offene eigene Angebote pro Runde

  // ---------- Angebotsarten ----------
  // need: Bedingung für den Absender, accept: was beim Annehmen passiert
  const KINDS = {
    'perk-fahrschule': { name: 'Fahrschule bei Opa', need: (c) => (c.contacts || []).includes('opa-fahrschule'), text: (o) => `${o.fromName} bietet dir Opas Fahrschule an: ${o.terms.discount >= 1 ? 'komplett gratis' : `${Math.round(o.terms.discount * 100)} % Rabatt`} auf Grundbetrag, Fahrstunden und Sonderfahrten.` },
    job: { name: 'Job anbieten', need: (c) => (c.contacts || []).includes('dulidan-studios') || (c.flags.company || 0) >= 1, text: (o) => `${o.fromName} bietet dir einen Job: ${o.terms.title} (${o.terms.gross} € brutto im Monat).` },
    money: { name: 'Geld schenken', text: (o) => `${o.fromName} schenkt dir ${o.terms.amount} €.` },
    loan: { name: 'Geld leihen', text: (o) => `${o.fromName} leiht dir ${o.terms.amount} €. Zurück: ${o.terms.pm} € im Monat, ${o.terms.months} Monate.` },
    nachhilfe: { name: 'Nachhilfe geben', text: (o) => `${o.fromName} gibt dir Nachhilfe${o.terms.subjName ? ` in ${o.terms.subjName}` : ''}${o.terms.price ? ` für ${o.terms.price} €` : ', gratis'}.` },
    lerngruppe: { name: 'Lerngruppe', text: (o) => `${o.fromName} will mit dir zusammen lernen${o.terms.subjName ? ` (${o.terms.subjName})` : ''}.` },
    lift: { name: 'Mitfahren anbieten', need: (c) => !!c.car && c.license.has, text: (o) => `${o.fromName} nimmt dich im ${o.terms.car} mit. ${o.terms.pm ? `${o.terms.pm} € Spritgeld im Monat` : 'Gratis'}.` },
    flat: { name: 'Bei mir einziehen', need: (c) => c.housing && c.housing.kind !== 'family', text: (o) => `${o.fromName} bietet dir an, bei ${o.fromHim} einzuziehen. ${o.terms.pm ? `${o.terms.pm} € im Monat` : 'Gratis'}.` },
    date: { name: 'Date', text: (o) => `${o.fromName} fragt dich nach einem Date.` },
    together: { name: 'Beziehung', text: (o) => `${o.fromName} will mit dir zusammen sein.` },
    propose: { name: 'Heiratsantrag', text: (o) => `${o.fromName} macht dir einen Heiratsantrag.` },
    duel: { name: 'Herausfordern', text: (o) => `${o.fromName} fordert dich heraus: ${o.terms.statName}-Duell um ${o.terms.stake} €.` },
    sell: { name: 'Verkaufen', text: (o) => `${o.fromName} will dir ${o.terms.item} für ${o.terms.price} € verkaufen.` },
    party: { name: 'Party zusammen', text: (o) => `${o.fromName} will mit dir feiern gehen.` },
  };
  const STATS = { social: 'Charme', body: 'Körper', smart: 'Köpfchen' };

  function act(S, pid, a, X) {
    const c = S.chars[pid];
    if (!c || c.dead) return 'Deine Figur lebt nicht mehr.';
    if (a.type === 'oAnswer') return answer(S, pid, a, X);
    if (a.type === 'oCancel') { const o = S.offers.find((x) => x.id === a.id && x.from === pid && x.status === 'open'); if (o) o.status = 'cancelled'; return null; }
    if (a.type === 'oScene') return sceneChoice(S, pid, a);
    if (S.phase !== 'act') return 'Geht nur, während ihr plant.';
    if (a.type === 'oRumor') return rumor(S, pid, a, X);
    if (a.type === 'oBreakup') return breakup(S, pid, a, X);
    if (a.type !== 'oOffer') return 'Unbekannt.';
    const K = KINDS[a.kind];
    if (!K) return 'Gibt es nicht.';
    const t = S.chars[a.to];
    if (!t || t.dead || a.to === pid) return 'An wen?';
    if (K.need && !K.need(c)) return 'Das kannst du gerade nicht anbieten.';
    if (S.offers.filter((o) => o.from === pid && o.status === 'open').length >= MAX_OUT) return `Maximal ${MAX_OUT} offene Angebote gleichzeitig.`;
    if (S.offers.some((o) => o.from === pid && o.to === a.to && o.kind === a.kind && o.status === 'open')) return 'Das Angebot liegt schon bei der Person.';
    const terms = cleanTerms(S, c, t, a.kind, a.terms || {}, X);
    if (typeof terms === 'string') return terms;
    S.offers.push({ id: X.uid('o'), from: pid, to: a.to, kind: a.kind, terms, status: 'open', round: S.round, fromName: c.name, toName: t.name, fromHim: 'dir' });
    if (S.offers.length > 80) S.offers.splice(0, S.offers.length - 80);
    return null;
  }
  function cleanTerms(S, c, t, kind, x, X) {
    const n = (v, lo, hi) => X.num(v, lo, hi);
    switch (kind) {
      case 'perk-fahrschule': return { discount: [0.25, 0.5, 1].includes(Number(x.discount)) ? Number(x.discount) : 0.5 };
      case 'job': {
        const kinds = { mini: ['Minijob', 603], werk: ['Werkstudent:in', 1400], voll: ['Vollzeit', 3200] };
        const k = kinds[x.jobKind] ? x.jobKind : 'mini';
        return { jobKind: k, title: X.cleanText(x.title, 60) || `${kinds[k][0]} bei Dulidan Studios`, gross: k === 'mini' ? 603 : n(x.gross || kinds[k][1], 1000, 9000), firm: c.key === 'shaquille' ? 'Dulidan Studios' : `Firma von ${c.name}` };
      }
      case 'money': { const amount = n(x.amount, 1, 1e7); if (c.stats.money < amount) return 'So viel hast du nicht.'; return { amount }; }
      case 'loan': { const amount = n(x.amount, 50, 1e7), months = n(x.months || 12, 1, 120), pm = n(x.pm || Math.ceil(amount / months), 1, amount); if (c.stats.money < amount) return 'So viel hast du nicht.'; return { amount, months, pm }; }
      case 'nachhilfe': case 'lerngruppe': {
        const subj = t.abi && t.abi.exams && t.abi.exams[x.subj] ? x.subj : '';
        return { subj, subjName: subj ? X.DB.SUBJECTS[subj].name : '', price: kind === 'nachhilfe' ? n(x.price, 0, 2000) : 0 };
      }
      case 'lift': return { pm: n(x.pm, 0, 500), car: `${c.car.brand} ${c.car.model}` };
      case 'flat': return { pm: n(x.pm, 0, 3000), label: c.housing.label || c.location };
      case 'duel': { const stake = n(x.stake, 0, 1e6); if (c.stats.money < stake) return 'So viel hast du nicht.'; const stat = STATS[x.stat] ? x.stat : 'social'; return { stat, statName: STATS[stat], stake }; }
      case 'sell': {
        const price = n(x.price, 0, 1e7);
        if (x.what === 'car') { if (!c.car) return 'Du hast kein Auto.'; return { what: 'car', item: `deinen ${c.car.brand} ${c.car.model}`, price }; }
        const item = (c.items || []).find((i) => i === x.item);
        if (!item) return 'Das hast du nicht.';
        return { what: 'item', item, price };
      }
      case 'propose': if (c.flags.partner !== t.name) return 'Erst mal zusammen sein.'; return {};
      default: return {};
    }
  }
  function answer(S, pid, a, X) {
    const o = S.offers.find((x) => x.id === a.id && x.to === pid && x.status === 'open');
    if (!o) return 'Das Angebot gibt es nicht mehr.';
    const from = S.chars[o.from], to = S.chars[pid];
    if (!from || from.dead) { o.status = 'expired'; return 'Die Person lebt nicht mehr.'; }
    if (!a.yes) {
      o.status = 'declined';
      rel(from, to.name, -3); rel(to, from.name, -1);
      X.report(S, o.from, '✋', `${to.name} lehnt ab: ${KINDS[o.kind].name}.`, 'bad');
      if (o.kind === 'together' || o.kind === 'propose' || o.kind === 'date') { from.stats.happy = X.clampStat(from.stats.happy - (o.kind === 'propose' ? 20 : 8)); X.log(S, `${to.name} sagt Nein zu ${from.name} (${KINDS[o.kind].name}).`); }
      return null;
    }
    const err = accept(S, o, from, to, X);
    if (err) return err;
    o.status = 'accepted';
    X.log(S, `${to.name} nimmt an: ${KINDS[o.kind].name} von ${from.name}.`);
    return null;
  }
  function rel(c, name, d, kind) {
    let r = c.relations.find((x) => x.name === name);
    if (!r) { r = { name, kind: '', val: 50 }; c.relations.push(r); }
    r.val = Math.max(0, Math.min(100, r.val + d));
    if (kind) r.kind = kind;
  }
  function accept(S, o, from, to, X) {
    const T = o.terms, rep = (pid, t, tone) => X.report(S, pid, '•', t, tone || 'good');
    switch (o.kind) {
      case 'perk-fahrschule': {
        to.perks = (to.perks || []).filter((p) => p.kind !== 'fahrschule').concat({ kind: 'fahrschule', discount: T.discount, from: o.from });
        if (to.license.status !== 'none' && !to.license.has) to.license.school = { id: 'opa', name: 'Opas Fahrschule', mult: 1, free: T.discount >= 1, discount: T.discount };
        rel(to, from.name, 8); rel(from, to.name, 4); rel(to, 'Opa', 10, `${from.name}s Opa, Fahrlehrer`);
        rep(o.to, `Ab jetzt Opas Fahrschule: ${T.discount >= 1 ? 'gratis' : `${Math.round(T.discount * 100)} % Rabatt`}. Danke, ${from.name}.`);
        rep(o.from, `${to.name} fährt jetzt bei Opa.`);
        to.chronicle.push({ d: X.dateText(S), t: `Macht den Führerschein bei Opas Fahrschule (über ${from.name}).` });
        return null;
      }
      case 'job': {
        if (to.job2 && to.job2.kind !== 'mini' && T.jobKind !== 'mini') X.endJob(S, to, `neuer Job bei ${T.firm}`);
        to.job2 = { title: T.title, firm: T.firm, gross: T.gross, kind: T.jobKind === 'voll' ? 'voll' : T.jobKind, since: X.idx(S.date), warnings: 0, boss: o.from };
        if (T.jobKind === 'voll') to.job = `${T.title} bei ${T.firm}`;
        S.contracts.push({ id: X.uid('v'), kind: 'salary', payer: o.from, payee: o.to, pm: Math.round(T.gross * 1.21), title: `Gehalt ${to.name} (inkl. Arbeitgeberanteil)`, missed: 0, viaJob: true });
        rel(to, from.name, 6, 'Chef:in'); rel(from, to.name, 4, 'Angestellte:r');
        rep(o.to, `Neuer Job: ${T.title} bei ${T.firm}, ${T.gross} € brutto.`);
        rep(o.from, `${to.name} arbeitet jetzt für dich. Kostet dich ${Math.round(T.gross * 1.21)} € im Monat.`);
        to.chronicle.push({ d: X.dateText(S), t: `Arbeitet für ${from.name} (${T.firm}).` });
        return null;
      }
      case 'money': {
        if (from.stats.money < T.amount) return `${from.name} hat das Geld nicht mehr.`;
        from.stats.money -= T.amount; to.stats.money += T.amount;
        rel(to, from.name, 10); rep(o.to, `${from.name} hat dir ${X.eur(T.amount)} geschenkt.`); rep(o.from, `Geschenk an ${to.name} angekommen.`, '');
        return null;
      }
      case 'loan': {
        if (from.stats.money < T.amount) return `${from.name} hat das Geld nicht mehr.`;
        from.stats.money -= T.amount; to.stats.money += T.amount;
        S.contracts.push({ id: X.uid('v'), kind: 'loan', payer: o.to, payee: o.from, pm: T.pm, left: Math.ceil(T.amount / T.pm), title: `Privatkredit ${from.name} → ${to.name}`, missed: 0 });
        rel(to, from.name, 5, ''); rep(o.to, `${X.eur(T.amount)} von ${from.name} geliehen. Du zahlst ${X.eur(T.pm)} im Monat zurück.`); rep(o.from, `${to.name} hat ${X.eur(T.amount)} von dir. Zahlt ${X.eur(T.pm)} im Monat.`, '');
        return null;
      }
      case 'nachhilfe': case 'lerngruppe': {
        if (T.price) { if (to.stats.money < T.price) return 'Dafür reicht dein Geld nicht.'; to.stats.money -= T.price; from.stats.money += T.price; }
        const boost = o.kind === 'nachhilfe' ? (from.key === 'april' ? 30 : 20) : 12;
        if (T.subj && to.abi) to.abi.prep[T.subj] = Math.min(100, (to.abi.prep[T.subj] || 0) + boost);
        else to.flags.study = (to.flags.study || 0) + 1;
        if (o.kind === 'lerngruppe') {
          if (T.subj && from.abi && from.abi.exams[T.subj]) from.abi.prep[T.subj] = Math.min(100, (from.abi.prep[T.subj] || 0) + boost);
          else if (from.abi) Object.keys(from.abi.exams).slice(0, 1).forEach((k) => { from.abi.prep[k] = Math.min(100, (from.abi.prep[k] || 0) + 8); });
          from.stats.happy = X.clampStat(from.stats.happy + 2);
        }
        rel(to, from.name, 6); rel(from, to.name, 4);
        rep(o.to, `${o.kind === 'nachhilfe' ? 'Nachhilfe' : 'Lerngruppe'} mit ${from.name}${T.subjName ? `: ${T.subjName} +${boost} Vorbereitung` : ''}.`);
        rep(o.from, `${o.kind === 'nachhilfe' ? 'Nachhilfe' : 'Lerngruppe'} mit ${to.name}${T.price ? `, +${X.eur(T.price)}` : ''}.`, '');
        return null;
      }
      case 'lift': {
        if (T.pm) S.contracts.push({ id: X.uid('v'), kind: 'lift', payer: o.to, payee: o.from, pm: T.pm, title: `Spritgeld ${to.name} → ${from.name}`, missed: 0 });
        to.flags.lift = o.from; to.stats.happy = X.clampStat(to.stats.happy + 4);
        rel(to, from.name, 6); rel(from, to.name, 3);
        rep(o.to, `${from.name} nimmt dich ab jetzt mit.`); rep(o.from, `${to.name} fährt jetzt bei dir mit.`, '');
        return null;
      }
      case 'flat': {
        if (to.housing && to.housing.kind === 'rent') to.effects.forEach((e) => { if (e.rent && !e.until) e.until = S.round + 4; });
        to.effects = to.effects.filter((e) => !/keine Miete/.test(e.name));
        to.housing = { kind: 'shared', label: from.housing.label, city: from.housing.city || from.home.city, host: o.from };
        to.home = Object.assign({}, from.home); to.location = from.location;
        to.living = `wohnt bei ${from.name}`;
        if (T.pm) S.contracts.push({ id: X.uid('v'), kind: 'rent', payer: o.to, payee: o.from, pm: T.pm, title: `Miete ${to.name} an ${from.name}`, missed: 0 });
        if (!to.flags.living) { to.flags.living = 1; to.effects.push({ id: X.uid('e'), name: 'Lebenshaltung (Essen, Handy, Versicherung …)', pm: -800, health: 0, happy: 0, power: 0, until: 0, locked: true }); }
        rel(to, from.name, 10, from.flags.partner === to.name ? 'Partner:in, wohnt zusammen' : 'Mitbewohner:in'); rel(from, to.name, 8, from.flags.partner === to.name ? 'Partner:in, wohnt zusammen' : 'Mitbewohner:in');
        rep(o.to, `Eingezogen bei ${from.name}.`); rep(o.from, `${to.name} wohnt jetzt bei dir.`, '');
        to.chronicle.push({ d: X.dateText(S), t: `Zieht bei ${from.name} ein.` }); from.chronicle.push({ d: X.dateText(S), t: `${to.name} zieht bei ${from.name} ein.` });
        return null;
      }
      case 'date': case 'party': {
        const r = X.d20() + Math.round(((to.relations.find((x) => x.name === from.name) || { val: 50 }).val - 50) / 10);
        const good = r >= 9;
        [to, from].forEach((ch) => { ch.stats.happy = X.clampStat(ch.stats.happy + (good ? 8 : -2)); ch.stats.money -= o.kind === 'party' ? 70 : 45; });
        rel(to, from.name, good ? 10 : -4); rel(from, to.name, good ? 10 : -4);
        const t = o.kind === 'date' ? (good ? `Das Date mit ${from.name} war gut. Richtig gut.` : `Das Date mit ${from.name} war … ein Erlebnis. Kein gutes.`) : (good ? `Legendäre Nacht mit ${from.name}.` : `Die Party mit ${from.name} endet im Streit über den Heimweg.`);
        rep(o.to, t, good ? 'good' : 'bad'); rep(o.from, t.replace(from.name, to.name), good ? 'good' : 'bad');
        return null;
      }
      case 'together': {
        [[to, from], [from, to]].forEach(([a, b]) => { if (a.flags.partner && a.flags.partner !== b.name) { const ex = a.flags.partner; rel(a, ex, -40, 'Ex'); const exc = Object.values(S.chars).find((x) => x.name === ex); if (exc && exc.flags.partner === a.name) { exc.flags.partner = ''; rel(exc, a.name, -40, 'Ex'); exc.stats.happy = X.clampStat(exc.stats.happy - 20); } } a.flags.partner = b.name; rel(a, b.name, 20, 'Beziehung'); a.stats.happy = X.clampStat(a.stats.happy + 12); });
        rep(o.to, `Du und ${from.name} seid jetzt zusammen.`); rep(o.from, `Du und ${to.name} seid jetzt zusammen.`);
        X.log(S, `${from.name} und ${to.name} sind jetzt zusammen.`);
        to.chronicle.push({ d: X.dateText(S), t: `Kommt mit ${from.name} zusammen.` }); from.chronicle.push({ d: X.dateText(S), t: `Kommt mit ${to.name} zusammen.` });
        return null;
      }
      case 'propose': {
        [to, from].forEach((a) => { a.flags.married = 1; a.stats.happy = X.clampStat(a.stats.happy + 18); a.stats.money -= 4000; });
        rel(to, from.name, 15, 'verheiratet'); rel(from, to.name, 15, 'verheiratet');
        rep(o.to, `JA. Hochzeit mit ${from.name}. Standesamt, Party, 4.000 € pro Person.`); rep(o.from, `JA. Hochzeit mit ${to.name}.`);
        X.log(S, `${from.name} und ${to.name} heiraten.`);
        to.chronicle.push({ d: X.dateText(S), t: `Heiratet ${from.name}.` }); from.chronicle.push({ d: X.dateText(S), t: `Heiratet ${to.name}.` });
        return null;
      }
      case 'duel': {
        if (from.stats.money < T.stake || to.stats.money < T.stake) return 'Einer von euch hat den Einsatz nicht.';
        const D = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
        const ra = X.d20(), rb = X.d20(), ma = D ? D.mod(from, T.stat) : 0, mb = D ? D.mod(to, T.stat) : 0;
        const fa = ra + ma, fb = rb + mb;
        const [win, lose, wid, lid] = fa >= fb ? [from, to, o.from, o.to] : [to, from, o.to, o.from];
        win.stats.money += T.stake; lose.stats.money -= T.stake;
        win.stats.power = X.clampStat(win.stats.power + 3); lose.stats.happy = X.clampStat(lose.stats.happy - 5);
        rel(lose, win.name, -6);
        const line = `${T.statName}-Duell: ${from.name} ${ra}${ma ? `+${ma}` : ''} gegen ${to.name} ${rb}${mb ? `+${mb}` : ''}. ${win.name} gewinnt${T.stake ? ` ${X.eur(T.stake)}` : ''}.`;
        rep(wid, line, 'good'); rep(lid, line, 'bad');
        X.log(S, line);
        return null;
      }
      case 'sell': {
        if (to.stats.money < T.price) return 'Dafür reicht dein Geld nicht.';
        if (T.what === 'car') {
          if (!from.car) return 'Das Auto gibt es nicht mehr.';
          if (to.car) return 'Du hast schon ein Auto.';
          to.car = from.car; from.car = null;
          from.appts = from.appts.filter((t) => { if (t.kind === 'tuv' && t.status === 'open') { to.appts.push(t); return false; } return true; });
        } else {
          from.items = (from.items || []).filter((i) => i !== T.item);
          to.items = (to.items || []).concat(T.item);
        }
        to.stats.money -= T.price; from.stats.money += T.price;
        rep(o.to, `Gekauft von ${from.name}: ${T.item.replace(/^deinen /, '')} für ${X.eur(T.price)}.`); rep(o.from, `Verkauft an ${to.name} für ${X.eur(T.price)}.`);
        return null;
      }
    }
    return 'Unbekannt.';
  }
  // Gerücht streuen: geht schnell, kann nach hinten losgehen
  function rumor(S, pid, a, X) {
    const c = S.chars[pid], t = S.chars[a.to];
    if (!t || t.dead || a.to === pid) return 'Über wen?';
    if ((c.flags.rumorRound || -1) === S.round) return 'Ein Gerücht pro Runde reicht.';
    c.flags.rumorRound = S.round;
    const D = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
    const ra = X.d20() + (D ? D.mod(c, 'social') : 0), rb = X.d20() + (D ? D.mod(t, 'social') : 0);
    const what = X.cleanText(a.text, 120) || 'etwas Peinliches';
    if (ra > rb) {
      t.stats.power = X.clampStat(t.stats.power - 5); t.stats.happy = X.clampStat(t.stats.happy - 6);
      X.report(S, a.to, '•', `Über dich geht ein Gerücht rum: „${what}“. Keiner weiß, woher. Macht −5.`, 'bad');
      X.report(S, pid, '•', `Dein Gerücht über ${t.name} verbreitet sich. Niemand ahnt, dass es von dir kommt.`, 'good');
    } else {
      c.stats.power = X.clampStat(c.stats.power - 6);
      rel(t, c.name, -25, 'Feind:in');
      X.report(S, a.to, '•', `${c.name} hat ein Gerücht über dich gestreut („${what}“). Aufgeflogen.`, 'bad');
      X.report(S, pid, '•', `Aufgeflogen. Alle wissen, dass das Gerücht über ${t.name} von dir kam.`, 'bad');
      X.log(S, `${c.name} wurde beim Lästern über ${t.name} erwischt.`);
    }
    return null;
  }
  function breakup(S, pid, a, X) {
    const c = S.chars[pid];
    if (!c.flags.partner) return 'Du bist mit niemandem zusammen.';
    const ex = c.flags.partner, exc = Object.values(S.chars).find((x) => x.name === ex && !x.dead);
    c.flags.partner = ''; c.flags.married = 0;
    rel(c, ex, -35, 'Ex'); c.stats.happy = X.clampStat(c.stats.happy - 8);
    if (exc && exc.flags.partner === c.name) { exc.flags.partner = ''; exc.flags.married = 0; rel(exc, c.name, -45, 'Ex'); exc.stats.happy = X.clampStat(exc.stats.happy - 22); const id = Object.keys(S.chars).find((k) => S.chars[k] === exc); X.report(S, id, '•', `${c.name} hat Schluss gemacht.`, 'bad'); exc.chronicle.push({ d: X.dateText(S), t: `${c.name} macht Schluss.` }); }
    c.chronicle.push({ d: X.dateText(S), t: `Macht Schluss mit ${ex}.` });
    X.log(S, `${c.name} macht Schluss mit ${ex}.`);
    return null;
  }

  // ---------- Verträge: jeden Monat ----------
  function month(S, X) {
    S.contracts.forEach((v) => {
      if (v.ended) return;
      const a = S.chars[v.payer], b = S.chars[v.payee];
      if (!a || !b || a.dead || b.dead) { v.ended = true; return; }
      if (v.viaJob && (!b.job2 || b.job2.boss !== v.payer)) { v.ended = true; return; }
      if (a.stats.money + a.bank.dispo < v.pm) {
        v.missed++;
        X.report(S, v.payee, '•', `${a.name} zahlt nicht: ${v.title} (${v.missed}. Mal).`, 'bad');
        X.report(S, v.payer, '•', `Du konntest nicht zahlen: ${v.title}.`, 'bad');
        rel(b, a.name, -8);
        if (v.missed >= 3) {
          v.ended = true;
          rel(b, a.name, -25, 'schuldet Geld');
          if (v.viaJob) { X.endJob(S, b, 'Chef zahlt nicht'); X.report(S, v.payee, '•', `Du kündigst bei ${a.name}. Kein Gehalt, keine Arbeit.`, 'bad'); }
          else X.report(S, v.payee, '•', `Der Vertrag mit ${a.name} ist geplatzt. Du kannst es vor Gericht versuchen oder es lassen.`, 'bad');
        }
        return;
      }
      a.stats.money -= v.pm;
      if (!v.viaJob) b.stats.money += v.pm; // Gehälter zahlt die Engine über job2 aus, hier nur die Kosten des Chefs
      if (v.left != null) { v.left--; if (v.left <= 0) { v.ended = true; X.report(S, v.payee, '•', `${a.name} hat alles zurückgezahlt.`, 'good'); rel(b, a.name, 6); } }
    });
    S.contracts = S.contracts.filter((v) => !v.ended || v.round === S.round);
  }

  // ---------- Gemeinsame Szenen (geheime Wahl, Ergebnis hängt von beiden ab) ----------
  const SCENES = [
    { id: 'erwischt', text: (a, b) => `${a} und ${b} werden nachts beim Sprayen an der Schulwand erwischt. Getrennte Vernehmung. Die Polizei bietet jedem einen Deal an.`,
      opts: ['Schweigen', 'Den anderen verpfeifen'],
      res: (x, y) => x === 0 && y === 0 ? [[-300, 0, 'Ihr schweigt beide. Je 300 € Strafe, mehr können sie euch nicht nachweisen.'], [-300, 0, null]]
        : x === 1 && y === 1 ? [[-900, -8, 'Ihr verpfeift euch gegenseitig. Je 900 € und Sozialstunden. Und Stille zwischen euch.'], [-900, -8, null]]
          : x === 1 ? [[0, 0, '{a} verpfeift {b}. {a} geht frei. {b} zahlt 1.500 € und macht 40 Sozialstunden.', true], [-1500, -15, null]]
            : [[-1500, -15, '{b} verpfeift {a}. {b} geht frei. {a} zahlt 1.500 € und macht 40 Sozialstunden.', true], [0, 0, null]] },
    { id: 'los', text: (a, b) => `${a} und ${b} finden zusammen ein Rubbellos auf der Straße. 10.000 €. Jeder entscheidet für sich, was er beim Einlösen sagt.`,
      opts: ['Teilen', 'Alles nehmen'],
      res: (x, y) => x === 0 && y === 0 ? [[5000, 8, 'Ihr teilt. 5.000 € für jeden. Freundschaft bestanden.'], [5000, 8, null]]
        : x === 1 && y === 1 ? [[0, -10, 'Ihr wollt beide alles. Streit an der Lottoannahmestelle. Das Los wird einbehalten, bis das geklärt ist. Ist es nie.'], [0, -10, null]]
          : x === 1 ? [[10000, 0, '{a} nimmt alles. {b} wollte teilen. Das wird {b} nie vergessen.', true], [0, -15, null]]
            : [[0, -15, '{b} nimmt alles. {a} wollte teilen. Das wird {a} nie vergessen.', true], [10000, 0, null]] },
    { id: 'startup', text: (a, b) => `${a} und ${b} haben eine Idee für ein Start-up. Ein Monat Vollgas, dann Pitch vor Investoren.`,
      opts: ['Richtig ranklotzen', 'Den anderen machen lassen'],
      res: (x, y) => x === 0 && y === 0 ? [[6000, 6, 'Ihr klotzt beide ran. Der Pitch sitzt. 12.000 € Startkapital, halbe-halbe.'], [6000, 6, null]]
        : x === 1 && y === 1 ? [[-200, -3, 'Ihr beide macht nichts. Der Pitch besteht aus einer Folie mit dem Logo.'], [-200, -3, null]]
          : x === 1 ? [[3000, 0, '{b} macht alles, {a} kassiert mit. 6.000 € werden geteilt. {b} schreibt das auf.', true], [3000, -6, null]]
            : [[3000, -6, '{a} macht alles, {b} kassiert mit. {a} schreibt das auf.', true], [3000, 0, null]] },
    { id: 'roadtrip', text: (a, b) => `${a} und ${b}: spontaner Roadtrip nach Amsterdam. Ein Auto, zwei Meinungen.`,
      opts: ['Mitfahren und durchziehen', 'Kurz vorher absagen'],
      res: (x, y) => x === 0 && y === 0 ? [[-350, 12, 'Drei Tage, null Schlaf, eine Geschichte, die ihr nur noch zu zweit erzählt.'], [-350, 12, null]]
        : x === 1 && y === 1 ? [[0, -1, 'Ihr sagt beide ab. Ehrlich gesagt erleichtert.'], [0, -1, null]]
          : x === 1 ? [[0, -2, '{a} sagt am Abend vorher ab. {b} fährt allein und postet nur Bilder, auf denen {a} fehlt.', true], [-300, 3, null]]
            : [[-300, 3, '{b} sagt am Abend vorher ab. {a} fährt allein.', true], [0, -2, null]] },
    { id: 'streit', text: (a, b) => `Ein dummer Kommentar in der Gruppe. Jetzt sind ${a} und ${b} sauer aufeinander.`,
      opts: ['Sich entschuldigen', 'Nachtreten'],
      res: (x, y) => x === 0 && y === 0 ? [[0, 4, 'Ihr entschuldigt euch beide. Peinlich, aber gut.'], [0, 4, null]]
        : x === 1 && y === 1 ? [[0, -8, 'Eskalation. Screenshots, Story, Kontaktabbruch.'], [0, -8, null]]
          : x === 1 ? [[0, 2, '{b} entschuldigt sich, {a} tritt nach. Alle sehen, wer hier das Problem ist.', true], [0, -6, null]]
            : [[0, -6, '{a} entschuldigt sich, {b} tritt nach.', true], [0, 2, null]] },
    { id: 'abiparty', school: true, text: (a, b) => `Abifahrt. ${a} und ${b} teilen sich ein Zimmer. Letzte Nacht.`,
      opts: ['Feiern bis zum Morgen', 'Schlafen, morgen ist Rückfahrt'],
      res: (x, y) => x === 0 && y === 0 ? [[-80, 10, 'Ihr feiert bis die Sonne aufgeht. Rückfahrt im Bus: wortlos, glücklich.'], [-80, 10, null]]
        : x === 1 && y === 1 ? [[0, 2, 'Ihr schlaft. Alle anderen nicht. Ihr seid die einzigen, die sich an die Rückfahrt erinnern.'], [0, 2, null]]
          : x === 0 ? [[-80, 6, '{a} feiert, {b} will schlafen. Um vier Uhr fliegt ein Kissen.', true], [0, -4, null]]
            : [[0, -4, '{b} feiert, {a} will schlafen. Um vier Uhr fliegt ein Kissen.', true], [-80, 6, null]] },
  ];
  function maybeScene(S, X) {
    if (S.scene && !S.scene.done) return;
    const living = X.alive(S).map((p) => p.id);
    if (living.length < 2 || S.round < 1 || S.round - (S.lastSceneRound || -9) < 3 || X.rnd(100) > 45) return;
    // Bevorzugt Leute aus derselben Stadt oder die sich kennen
    const pairs = [];
    living.forEach((a, i) => living.slice(i + 1).forEach((b) => {
      const A = S.chars[a], B = S.chars[b];
      let w = 1 + (A.home.city && A.home.city === B.home.city ? 3 : 0) + (A.relations.some((r) => r.name === B.name) ? 2 : 0);
      pairs.push([a, b, w]);
    }));
    let sum = pairs.reduce((s, p) => s + p[2], 0), r = X.rnd(1000) / 1000 * sum, pair = pairs[0];
    for (const p of pairs) { r -= p[2]; if (r <= 0) { pair = p; break; } }
    const school = S.chars[pair[0]].edu.kind === 'school' && S.chars[pair[1]].edu.kind === 'school';
    const pool = SCENES.filter((s) => !s.school || school);
    const sc = pool[X.rnd(pool.length)];
    S.scene = { id: X.uid('s'), kind: sc.id, players: [pair[0], pair[1]], text: sc.text(S.chars[pair[0]].name, S.chars[pair[1]].name), opts: sc.opts, choices: {}, done: false, round: S.round };
    S.lastSceneRound = S.round;
  }
  function sceneChoice(S, pid, a) {
    const sc = S.scene;
    if (!sc || sc.done || !sc.players.includes(pid)) return 'Keine Szene für dich.';
    if (S.phase !== 'act') return 'Gerade nicht.';
    const i = Number(a.choice);
    if (!(i >= 0 && i < sc.opts.length)) return 'Gibt es nicht.';
    sc.choices[pid] = i;
    return null;
  }
  function resolveScene(S, X) {
    const sc = S.scene;
    if (!sc || sc.done) return;
    sc.done = true;
    const [a, b] = sc.players, A = S.chars[a], B = S.chars[b];
    if (!A || !B || A.dead || B.dead) return;
    // Wer nicht gewählt hat, nimmt die vorsichtige erste Möglichkeit
    const x = sc.choices[a] != null ? sc.choices[a] : 0, y = sc.choices[b] != null ? sc.choices[b] : 0;
    const def = SCENES.find((s) => s.id === sc.kind);
    const [ra, rb] = def.res(x, y);
    const text = ra[2].replace(/\{a\}/g, A.name).replace(/\{b\}/g, B.name);
    [[A, a, ra], [B, b, rb]].forEach(([C, id, r]) => {
      C.stats.money += r[0];
      C.stats.happy = X.clampStat(C.stats.happy + r[1]);
      X.report(S, id, '•', `Gemeinsame Szene: ${text}`, r[1] > 0 || r[0] > 0 ? 'good' : r[1] < 0 || r[0] < 0 ? 'bad' : '');
    });
    if (ra[3]) { const [traitor, victim] = x === 1 ? [A, B] : [B, A]; rel(victim, traitor.name, -30, 'hat dich verraten'); rel(traitor, victim.name, -5); }
    else { rel(A, B.name, ra[1] > 0 ? 8 : -6); rel(B, A.name, rb[1] > 0 ? 8 : -6); }
    sc.result = text; sc.picks = { [a]: sc.opts[x], [b]: sc.opts[y] };
    A.chronicle.push({ d: X.dateText(S), t: text }); B.chronicle.push({ d: X.dateText(S), t: text });
    X.log(S, text);
  }
  // Offene Angebote verfallen nach der Runde
  function expire(S) { S.offers.forEach((o) => { if (o.status === 'open' && o.round < S.round - 1) o.status = 'expired'; }); }

  const SOCIAL = { KINDS, STATS, MAX_OUT, SCENES, act, month, maybeScene, resolveScene, expire };
  if (isNode) module.exports = SOCIAL;
  else root.DULI_LARP_SOCIAL = SOCIAL;
})(typeof window !== 'undefined' ? window : globalThis);
