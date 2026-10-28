// DULIDAN LARP EXTREME – Karriere und Justiz: jährliches Gehaltsgespräch, Beförderung, Kündigung und Arbeitslosengeld,
// krumme Dinger (Fokus), Anzeige, Gerichtstermin mit Geldstrafe, Bewährung oder Haft, Vorstrafe.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const DB = root.DULI_LARP_DB || (isNode ? require('./larp-db') : null);
  const deck = () => root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
  const SHADY = [
    ['verkauft gefälschte Sneaker auf Kleinanzeigen', 'Betrug'], ['arbeitet schwarz auf dem Bau', 'Schwarzarbeit'], ['fährt Pakete ohne Gewerbeschein', 'Schwarzarbeit'],
    ['vertickt „Nahrungsergänzungsmittel“ auf TikTok', 'unerlaubter Handel'], ['vermietet die Wohnung heimlich auf Airbnb', 'Zweckentfremdung'], ['macht Fake-Bewertungen für Restaurants', 'Wettbewerbsverstoß'],
  ];
  const SENIOR = (t) => (/^Senior |Leitung|Teamleiter/.test(t) ? t : /:in$/.test(t) ? `Senior ${t}` : `${t} (Teamleitung)`);

  // Fokus „Krumme Dinger“: schnelles Geld, Risiko Anzeige
  function shady(S, pid, c, M, X) {
    const [what, charge] = SHADY[X.rnd(SHADY.length)];
    const g = Math.round((220 + X.rnd(260)) * M);
    c.stats.money += g;
    c.flags.shady = (c.flags.shady || 0) + 1;
    X.report(S, pid, '•', `${c.name} ${what}: +${X.eur(g)}. Hoffentlich merkt das keiner.`);
    const risk = 0.1 + Math.min(0.2, c.flags.shady * 0.02);
    if (X.rnd(1000) / 1000 < risk * Math.min(3, M)) {
      if (c.appts.some((a) => a.status === 'open' && a.kind === 'court')) return;
      const t = X.idx(S.date) + 2;
      const fine = Math.round(g * (2 + X.rnd(3)) / 10) * 10;
      X.addAppt(S, c, { kind: 'court', y: Math.floor(t / 12), m: t % 12, d: 6 + X.rnd(20), title: `Hauptverhandlung Amtsgericht: ${charge}`, where: 'Amtsgericht', data: { charge, gain: g, fine } });
      X.report(S, pid, '•', `ANZEIGE wegen ${charge}. Post vom Amtsgericht: Hauptverhandlung in zwei Monaten. Ein Anwalt wäre schlau.`, 'bad');
      c.chronicle.push({ d: X.dateText(S), t: `Anzeige wegen ${charge}.` });
    }
  }
  // Arbeitsleben pro Monat: Jahresgespräch planen, selten Kündigung
  function month(S, c, pid, X) {
    const cur = X.idx(S.date) + (S._mk || 0);
    if (c.prison && cur >= c.prison.until) {
      c.prison = null;
      c.effects = c.effects.filter((e) => !e.prison);
      X.report(S, pid, '•', 'Entlassen. Die Sonne ist sehr hell. Bewährungshelfer:in meldet sich nächste Woche.', 'good');
      c.chronicle.push({ d: X.dateText(S), t: 'Aus der Haft entlassen.' });
    }
    const J = c.job2;
    if (!J || J.kind === 'azubi' || J.kind === 'mini') return;
    const playerBoss = J.boss && S.chars[J.boss] && !S.chars[J.boss].dead;
    J.review = J.review || J.since + 12;
    if (cur >= J.review && !c.appts.some((a) => a.status === 'open' && a.kind === 'raise')) {
      J.review = cur + 12;
      const t = cur + 1;
      X.addAppt(S, c, { kind: 'raise', y: Math.floor(t / 12), m: t % 12, d: 10 + X.rnd(15), title: `Jahresgespräch bei ${J.firm}`, where: J.firm });
    }
    // Kündigung (betriebsbedingt), in schlechten Zeiten öfter
    const p = 0.0012 * (S.econ && S.econ.infl > 3.5 ? 2 : 1);
    if (!playerBoss && X.rnd(100000) / 100000 < p) {
      const years = Math.max(0, (cur - J.since) / 12), sev = Math.round(J.gross * 0.5 * Math.max(0.5, years));
      c.stats.money += sev;
      const alg = Math.round(DB.net(J.gross, J.kind) * 0.6);
      c.effects.push({ id: X.uid('e'), name: 'Arbeitslosengeld I', pm: alg, health: 0, happy: -2, power: 0, until: S.round + 12, alg: true });
      X.report(S, pid, '•', `KÜNDIGUNG: ${J.firm} baut Stellen ab. Abfindung ${X.eur(sev)}, Arbeitslosengeld ${X.eur(alg)} im Monat für ein Jahr.`, 'bad');
      X.endJob(S, c, 'betriebsbedingt gekündigt');
      c.job = 'arbeitssuchend';
    }
  }
  function appt(S, pid, ap, dec, late, X) {
    const c = S.chars[pid], skip = dec.d === 'skip' || late, D = deck();
    if (ap.kind === 'raise') {
      const J = c.job2;
      if (!J) return true;
      // Chef ist eine Spieler-Figur: die entscheidet, nicht der Würfel
      if (J.boss && S.chars[J.boss] && !S.chars[J.boss].dead) {
        if (skip || dec.d === 'sick') { X.report(S, pid, '•', 'Jahresgespräch abgesagt.'); return true; }
        S.offers = S.offers || [];
        S.offers.push({ id: X.uid('o'), from: pid, to: J.boss, kind: 'raise', terms: { pct: 6, reason: 'Jahresgespräch' }, status: 'open', round: S.round, fromName: c.name, toName: S.chars[J.boss].name, fromHim: 'dir' });
        X.report(S, pid, '•', `Jahresgespräch: Deine Bitte um 6 % mehr liegt bei ${S.chars[J.boss].name}. Die Entscheidung trifft sie oder er.`);
        X.report(S, J.boss, '•', `Jahresgespräch mit ${c.name}: Anfrage auf 6 % mehr Gehalt (Tab „Leute“ oder Handy).`);
        return true;
      }
      if (skip || dec.d === 'sick') { X.report(S, pid, '•', 'Jahresgespräch verpasst. Keine Gehaltserhöhung dieses Jahr.', 'bad'); return true; }
      const roll = X.d20(), score = roll + (D ? D.mod(c, 'work') : 0) + Math.floor(c.stats.power / 25) + (c.flags.study ? 1 : 0);
      if (roll === 20 || score >= 19) {
        const plus = Math.round(J.gross * (0.1 + X.rnd(8) / 100) / 10) * 10;
        J.gross += plus; J.title = SENIOR(J.title); c.job = `${J.title} bei ${J.firm}`;
        c.stats.power = X.clampStat(c.stats.power + 3);
        X.report(S, pid, '•', `BEFÖRDERT: ${J.title}. +${X.eur(plus)} brutto im Monat.`, 'good');
        c.chronicle.push({ d: X.dateText(S), t: `Befördert: ${J.title}.` });
      } else if (score >= 11) {
        const plus = Math.round(J.gross * (0.025 + X.rnd(5) / 100) / 10) * 10;
        J.gross += plus;
        X.report(S, pid, '•', `Gehaltserhöhung: +${X.eur(plus)} brutto (Wurf ${roll}).`, 'good');
      } else X.report(S, pid, '•', `Jahresgespräch: „Gerade ist kein Budget da.“ Keine Erhöhung (Wurf ${roll}).`, 'bad');
      return true;
    }
    if (ap.kind === 'court') {
      const d = ap.data, prior = c.flags.crime || 0;
      if (skip) {
        // Haftbefehl: Polizei holt dich ab, Urteil ohne dich
        X.report(S, pid, '•', 'Nicht vor Gericht erschienen. HAFTBEFEHL. Die Polizei holt dich morgens um sechs ab.', 'bad');
        return sentence(S, pid, c, d, prior + 1, X);
      }
      const lawyer = dec.d === 'sick' ? 0 : 1; // „Krankmelden“ heißt hier: ohne Anwalt hingehen
      if (lawyer) { const fee = 900 + X.rnd(6) * 150; c.stats.money -= fee; X.report(S, pid, '•', `Anwältin: ${X.eur(fee)}.`); }
      const roll = X.d20(), score = roll + (lawyer ? 4 : 0) + Math.floor(c.stats.power / 30) - prior * 3;
      if (roll === 20 || score >= 17) { X.report(S, pid, '•', `Freispruch (Wurf ${roll}). Mangels Beweisen. Du tust ganz unschuldig.`, 'good'); c.chronicle.push({ d: X.dateText(S), t: `Freigesprochen (${d.charge}).` }); return true; }
      if (score >= 11 && !prior) { const f = Math.round(d.fine / 2 / 10) * 10; c.stats.money -= f; X.report(S, pid, '•', `Verfahren eingestellt gegen Geldauflage: ${X.eur(f)} an einen gemeinnützigen Verein (Wurf ${roll}). Keine Vorstrafe.`, 'good'); return true; }
      return sentence(S, pid, c, d, prior + (score < 6 ? 2 : 1), X);
    }
    return false;
  }
  function sentence(S, pid, c, d, level, X) {
    c.flags.crime = (c.flags.crime || 0) + 1;
    c.bank.schufa = Math.max(0, c.bank.schufa - 5);
    if (level <= 1) {
      c.stats.money -= d.fine;
      X.report(S, pid, '•', `Urteil: Geldstrafe ${X.eur(d.fine)} wegen ${d.charge}. Eintrag im Führungszeugnis. Polizei und Bundeswehr kannst du vergessen.`, 'bad');
    } else if (level === 2) {
      c.stats.money -= Math.round(d.fine / 2);
      c.effects.push({ id: X.uid('e'), name: 'Bewährung (Auflagen, Sozialstunden)', pm: 0, health: 0, happy: -2, power: -1, until: S.round + 12 });
      X.report(S, pid, '•', `Urteil: Freiheitsstrafe auf Bewährung, ${X.eur(Math.round(d.fine / 2))} Geldauflage und 120 Sozialstunden. Nochmal und du sitzt.`, 'bad');
    } else {
      const months = 6 + X.rnd(13);
      c.prison = { until: X.idx(S.date) + months };
      if (c.job2) X.endJob(S, c, 'in Haft');
      c.job = 'in Haft';
      c.effects.push({ id: X.uid('e'), name: 'Justizvollzugsanstalt', pm: 0, health: -2, happy: -6, power: -2, until: 0, prison: true, locked: true });
      X.report(S, pid, '•', `Urteil: ${months} Monate Haft ohne Bewährung. Job weg. April schickt dir Briefe.`, 'bad');
    }
    c.chronicle.push({ d: X.dateText(S), t: `Verurteilt wegen ${d.charge}.` });
    X.log(S, `${c.name} wurde verurteilt (${d.charge}).`);
    return true;
  }
  const LIFE = { shady, month, appt };
  if (isNode) module.exports = LIFE;
  else root.DULI_LARP_LIFE = LIFE;
})(typeof window !== 'undefined' ? window : globalThis);
