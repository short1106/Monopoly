// DULIDAN LARP EXTREME – Büros für die eigene Firma: Coworking, Büro, Büroetage, Loft, Halle. Mieten oder kaufen.
// Ein Büro bringt mehr Aufträge (je nach Firmengröße und Plätzen), kostet Miete oder Kredit und lässt die Firma wachsen.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const DB = root.DULI_LARP_DB || (isNode ? require('./larp-db') : null);
  const MK = () => root.DULI_LARP_MARKET || (isNode ? require('./larp-market') : null);
  // [Name, m² von, m² bis, Kauf möglich, m² pro Arbeitsplatz, Faktor Miete]
  const TYPES = [
    ['Coworking-Fixdesk', 0, 0, false, 1, 0], ['Kleines Büro', 18, 40, false, 9, 1.35], ['Büro', 40, 120, true, 11, 1.3],
    ['Büroetage', 150, 400, true, 13, 1.25], ['Loft / Atelier', 60, 180, true, 12, 1.4], ['Gewerbehalle mit Büro', 300, 900, true, 25, 0.75],
  ];
  const EXTRAS = ['Glasfaser', 'Besprechungsraum', 'Dachterrasse', 'Tiefgarage', 'Küche', 'Empfang', 'Klimaanlage', 'Barrierefrei', 'ÖPNV direkt vor der Tür', 'Lastenaufzug'];
  const canHave = (c) => (c.flags.company || 0) >= 0.3 || (c.contacts || []).includes('dulidan-studios') || c.key === 'shaquille';
  const firmName = (c) => ((c.contacts || []).includes('dulidan-studios') || c.key === 'shaquille' ? 'Dulidan Studios' : `${c.name}s Firma`);

  function list(S, cityName, mIdx) {
    const M = MK(), c = M.city(cityName), pr = M.priceOf(c), r = M.rngOf(S.market.seed, 'office', c.name, mIdx), out = [];
    const st = M.streetsOf ? M.streetsOf(c) : { s: [['Hauptstraße', c.lat || 51.4, c.lng || 6.8, 0]] };
    for (let i = 0; i < 7; i++) {
      const T = TYPES[i < 2 ? i : 2 + Math.floor(r() * 4)];
      const m2 = T[1] ? Math.round(T[1] + r() * (T[2] - T[1])) : 0;
      const s0 = st.s[Math.floor(r() * st.s.length)];
      const sale = T[3] && r() < 0.35;
      const desks = T[1] ? Math.max(2, Math.round(m2 / T[4])) : 1;
      const cold = T[1] ? Math.round(m2 * pr.rent * T[5] * (0.85 + r() * 0.35) / 10) * 10 : Math.round((250 + r() * 200) / 10) * 10;
      const nk = T[1] ? Math.round(m2 * (2.5 + r() * 2)) : 0;
      const price = sale ? Math.round(m2 * pr.buy * (0.75 + r() * 0.3) / 1000) * 1000 : 0;
      out.push({ id: `office:${c.name}:${mIdx}:${i}`, cat: 'office', title: `${T[0]}${m2 ? `, ${m2} m²` : ''}`, kind: T[0], m2, desks, cold, nk, price, sale, city: c.name, st: c.st, cc: c.cc || null,
        street: s0[0], lat: s0[1] + (r() - 0.5) * 0.004, lng: s0[2] + (r() - 0.5) * 0.004, extras: EXTRAS.filter(() => r() < 0.25).slice(0, 3), landlord: sale ? 'Gewerbemakler' : r() < 0.5 ? 'Immobilien-GmbH' : 'Privatvermieter' });
    }
    return out;
  }
  // Aufträge pro Monat, die ein Büro bringt (Erwartungswert)
  const boost = (c, o) => Math.round(o.desks * 210 * (0.55 + Math.min(4, c.flags.company || 0) * 0.25));

  function act(S, pid, a, X) {
    const c = S.chars[pid], M = MK();
    c.offices = c.offices || [];
    if (a.type === 'mOfficeEnd') {
      const o = c.offices.find((x) => x.id === a.office);
      if (!o) return 'Das Büro gibt es nicht.';
      c.effects = c.effects.filter((e) => e.office !== o.id);
      c.offices = c.offices.filter((x) => x !== o);
      if (o.own) {
        const loan = c.bank.loans.find((l) => l.id === o.loan), value = Math.round(o.value * (0.9 + X.rnd(15) / 100));
        const back = value - Math.round(value * 0.03) - (loan ? Math.round(loan.rest * 1.03) : 0);
        if (loan) c.bank.loans = c.bank.loans.filter((l) => l !== loan);
        c.stats.money += back;
        X.report(S, pid, '•', `Büro verkauft: ${o.title} für ${X.eur(value)}. Bleibt: ${X.eur(back)}.`, back >= 0 ? 'good' : 'bad');
      } else {
        c.effects.push({ id: X.uid('e'), name: `Kündigungsfrist ${o.title}`, pm: -o.rent, health: 0, happy: 0, power: 0, until: S.round + 3 });
        c.stats.money += o.deposit || 0;
        X.report(S, pid, '•', `Büro gekündigt: ${o.title}. Drei Monate läuft die Miete noch, die Kaution kommt zurück.`);
      }
      c.chronicle.push({ d: X.dateText(S), t: `Gibt das Büro ${o.title} in ${o.city} auf.` });
      return null;
    }
    if (!canHave(c)) return 'Erst brauchst du eine Firma: Fokus „Eigenes Projekt“ oder ein Gewerbe anmelden.';
    const x = M.find(S, a.id);
    if (!x || x.cat !== 'office') return 'Das Angebot gibt es nicht mehr.';
    if (x.taken) return 'Schon weg. Jemand war schneller.';
    if (c.offices.length >= 4) return 'Mehr als vier Standorte schafft deine Firma gerade nicht.';
    const label = `${x.street}, ${x.city}`;
    const base = { id: X.uid('of'), title: x.title, kind: x.kind, m2: x.m2, desks: x.desks, city: x.city, label, lat: x.lat, lng: x.lng, since: X.idx(S.date) };
    if (a.buy) {
      if (!x.sale) return 'Das wird nur vermietet.';
      const grest = Math.round(x.price * M.grestOf(x) / 100), extra = grest + Math.round(x.price * 0.02);
      const down = a.finance ? Math.max(extra + Math.round(x.price * 0.2), Math.round(Number(a.down) || 0)) : x.price + extra;
      if (c.stats.money + c.bank.dispo < down) return `Du brauchst ${X.eur(down)} (Gewerbekredite wollen mindestens 20 % Eigenkapital plus Nebenkosten).`;
      let loan = null;
      if (a.finance) {
        if (c.bank.schufa < 70) return 'Die Bank lehnt ab: Für Gewerbekredite brauchst du eine SCHUFA ab 70.';
        const amount = x.price + extra - down, rate = Math.round((M.loanRate(S, c) + 1) * 100) / 100;
        loan = { id: X.uid('k'), why: `Gewerbekredit ${x.title}`, orig: amount, rest: amount, rate, annuity: Math.round(amount * (rate + 2.5) / 100 / 12) };
        c.bank.loans.push(loan);
      }
      c.stats.money -= down;
      S.market.taken[x.id] = pid;
      c.offices.push(Object.assign(base, { own: true, value: x.price, loan: loan && loan.id }));
      c.effects.push({ id: X.uid('e'), name: `Nebenkosten Büro ${x.title}`, pm: -Math.max(80, x.nk), health: 0, happy: 1, power: 1, until: 0, locked: true, office: base.id });
      X.report(S, pid, '•', `GEKAUFT: ${x.title}, ${label}, für ${firmName(c)}. ${x.desks} Arbeitsplätze.${loan ? ` Gewerbekredit ${X.eur(loan.orig)}, Rate ${X.eur(loan.annuity)} im Monat.` : ''}`, 'good');
    } else {
      const rent = x.cold + x.nk, deposit = x.m2 ? x.cold * 3 : 0;
      if (c.stats.money + c.bank.dispo < deposit + rent) return `Für Kaution und erste Miete brauchst du ${X.eur(deposit + rent)}.`;
      if (x.m2 >= 150 && c.bank.schufa < 75) return `${x.landlord} will eine bessere SCHUFA (ab 75) oder eine Bürgschaft.`;
      c.stats.money -= deposit;
      S.market.taken[x.id] = pid;
      c.offices.push(Object.assign(base, { own: false, rent, deposit }));
      c.effects.push({ id: X.uid('e'), name: `Büromiete ${x.title}, ${x.city}`, pm: -rent, health: 0, happy: 1, power: 1, until: 0, locked: true, office: base.id });
      X.report(S, pid, '•', `Mietvertrag Büro: ${x.title}, ${label}, für ${firmName(c)}. ${X.eur(rent)} im Monat${deposit ? `, Kaution ${X.eur(deposit)}` : ''}. ${x.desks} Arbeitsplätze.`, 'good');
    }
    c.flags.company = Math.max(c.flags.company || 0, 0.5);
    c.stats.power = X.clampStat(c.stats.power + (x.m2 >= 150 ? 6 : 3));
    c.chronicle.push({ d: X.dateText(S), t: `${firmName(c)} hat ein ${a.buy ? 'eigenes ' : ''}Büro: ${x.title} in ${x.city}.` });
    X.log(S, `${c.name}: neues Büro in ${x.city}.`);
    return null;
  }
  // Monatlich: Aufträge durch das Büro, die Firma wächst
  function month(S, c, pid, X) {
    if (!c.offices || !c.offices.length || c.prison) return { inc: 0, out: 0 };
    let inc = 0;
    c.offices.forEach((o) => {
      const g = Math.round(boost(c, o) * (0.6 + X.rnd(80) / 100) * (S.econ && S.econ.infl > 4 ? 0.85 : 1));
      inc += g;
    });
    c.stats.money += inc;
    c.tx = c.tx || { y: S.date.y, gross: 0, rent: 0, biz: 0 };
    c.tx.biz += inc;
    c.flags.company = Math.min(6, (c.flags.company || 0) + 0.03 * c.offices.length);
    return { inc, out: 0 };
  }
  const OFFICE = { list, act, month, boost, canHave, firmName, TYPES };
  if (isNode) module.exports = OFFICE;
  else root.DULI_LARP_OFFICE = OFFICE;
})(typeof window !== 'undefined' ? window : globalThis);
