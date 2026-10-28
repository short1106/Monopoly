// DULIDAN LARP EXTREME – „Frag April“ ohne KI-Schlüssel (oder wenn die KI nicht durchkommt).
// Versteht die häufigsten Wünsche (kaufen, verkaufen, Firma gründen, lernen, Sport, Party, spenden, investieren,
// zocken, Kredit, Job, kündigen, Date, Arzt, umziehen …), würfelt fair und liefert dieselben Bausteine wie die KI.
// Fehlt etwas Wichtiges (Preis, Name), fragt April nach – die nächste Nachricht wird dann mit der Frage zusammengelesen.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const CO = () => root.DULI_LARP_COMPANY || (isNode ? require('./larp-company') : null);
  const d20 = () => 1 + Math.floor(Math.random() * 20);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const eur = (n) => `${Math.round(n).toLocaleString('de-DE')} €`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Preise für Dinge, die man oft kaufen will: [Muster, Name, Preis, laufend pro Monat, Glück, Macht]
  const ITEMS = [
    [/pferd/, 'Pferd', 6500, -420, 6, 2], [/hund|welpe/, 'Hund', 1200, -110, 10, 0], [/katze/, 'Katze', 450, -60, 8, 0],
    [/boot|yacht|jacht/, 'Motorboot', 38000, -350, 6, 5], [/motorrad|bike\b/, 'Motorrad', 9000, -120, 6, 2],
    [/e-?scooter|roller/, 'E-Scooter', 600, 0, 2, 0], [/fahrrad|e-?bike/, 'Fahrrad', 900, 0, 3, 0],
    [/laptop|macbook|notebook/, 'Laptop', 1400, 0, 3, 1], [/pc|rechner|gaming/, 'Gaming-PC', 2200, 0, 5, 0], [/handy|iphone|smartphone/, 'Smartphone', 1100, -20, 3, 1],
    [/uhr|rolex/, 'Uhr', 9000, 0, 3, 4], [/kette|schmuck|ring/, 'Schmuck', 2500, 0, 3, 2], [/sneaker|schuhe/, 'Sneaker', 220, 0, 3, 1],
    [/gitarre/, 'Gitarre', 450, 0, 3, 0], [/klavier|piano/, 'Klavier', 4500, 0, 4, 0], [/kamera/, 'Kamera', 1600, 0, 3, 0], [/drohne/, 'Drohne', 900, 0, 3, 0],
    [/foodtruck|food-truck|imbiss/, 'Food-Truck', 45000, 600, 4, 4], [/kiosk|späti/, 'Kiosk', 30000, 700, 2, 3], [/bar\b|club|shisha/, 'Bar', 120000, 1800, 4, 8],
    [/aktie|etf|depot/, 'ETF-Depot', 0, 0, 0, 1], [/bitcoin|krypto|crypto|coin/, 'Krypto', 0, 0, 0, 0], [/nft/, 'NFT', 0, 0, -1, 0],
    [/kunst|gemälde|bild\b/, 'Kunstwerk', 5000, 0, 3, 2], [/tattoo/, 'Tattoo', 350, 0, 5, 1], [/playstation|ps5|xbox|switch|konsole/, 'Spielkonsole', 550, 0, 5, 0],
  ];
  const NUM = /(\d+(?:[.,]\d+)*)\s*(k|tsd|tausend|mio|millionen?|mille)?\s*(?:€|euro|eur)?/i;
  function amount(t) {
    const m = t.match(NUM);
    if (!m) return 0;
    let n = Number(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    const u = (m[2] || '').toLowerCase();
    if (/^(k|tsd|tausend|mille)$/.test(u)) n *= 1000;
    if (/^mio|million/.test(u)) n *= 1e6;
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  const quoted = (t) => { const m = t.match(/[„"“'»]([^"“”'«]{2,40})[“"”'«]/); return m ? m[1].trim() : ''; };
  const after = (t, re) => { const m = t.match(re); return m ? m[1].replace(/[.!?,].*$/, '').trim() : ''; };
  function skillName(word) {
    const Co = CO(), w = word.toLowerCase().trim();
    if (!w) return '';
    const all = Co ? Co.ALL : [];
    const hit = all.find((n) => n.toLowerCase() === w) || all.find((n) => n.toLowerCase().startsWith(w.slice(0, 5))) || all.find((n) => w.includes(n.toLowerCase().slice(0, 5)));
    if (hit) return hit;
    const map = [[/3d|blender/, '3D-Modellierung'], [/code|coden|program/, 'Programmieren'], [/sing/, 'Singen'], [/tanz/, 'Tanzen'], [/koch/, 'Kochen'], [/box|mma|kampf|karate|judo/, 'Kampfsport'], [/gym|fit|pump|muskel/, 'Fitness'], [/foto/, 'Fotografie'], [/mal|zeichn/, 'Zeichnen'], [/beat|produz/, 'Musikproduktion'], [/web/, 'Webdesign'], [/video|schnitt|youtube/, 'Videoschnitt'], [/tiktok|insta|social/, 'Social Media'], [/verkauf|sales/, 'Verkauf']];
    const m = map.find(([re]) => re.test(w));
    return m ? m[1] : cap(w.split(/\s+/).slice(0, 2).join(' '));
  }

  const R = []; // Regeln: [Muster, Funktion(text, c, ctx) → data]
  const rule = (re, fn) => R.push([re, fn]);

  rule(/\b(kündige|kündigen|schmeiß.*hin|hör.*auf zu arbeiten)\b/, (t, c) => {
    if (!c.job2) return { reply: 'Du hast gerade keinen festen Job, den du kündigen könntest. Willst du stattdessen etwas Neues anfangen?' };
    return { reply: `Okay. Du gehst zu ${c.job2.firm} und legst die Kündigung auf den Tisch. Kurzer Schockmoment, dann Freiheit. Ab nächsten Monat kein Gehalt mehr – überleg dir, wovon du lebst.`, job: { quit: true }, delta: { happy: 6, power: -2 }, chronicle: `Kündigt bei ${c.job2.firm}.` };
  });
  rule(/\b(gründe|gründen|eröffne|eröffnen|mach.*(firma|laden|startup|business|gewerbe|agentur))\b/, (t, c, x) => {
    const name = quoted(t) || after(t, /(?:namens|heißt|name)\s+([\wäöüß&\- ]{2,40})/i);
    if (!name) return { reply: 'Ich liebe es. Wie soll die Firma heißen, und was macht sie genau? Schreib mir den Namen in Anführungszeichen, z. B. „Dulidan Burger“.', ask: 'found' };
    const cost = 450 + (/(gmbh)/i.test(t) ? 12500 : 0);
    if (c.stats.money < cost) return { reply: `Für ${/(gmbh)/i.test(t) ? 'eine GmbH (12.500 € Stammkapital) ' : 'die Gewerbeanmeldung, Notar und Kram '}brauchst du ${eur(cost)}. Hast du gerade nicht. Kredit? Schreib „Kredit 15000 für die Firma“.` };
    return { reply: `„${name}“ ist angemeldet. Gewerbeamt, Steuernummer, ein Logo, das du um 3 Uhr nachts gemacht hast. Ab jetzt hast du den Tab „Firma“: Aufträge, Leute einstellen, Büro mieten.`, company: { found: true, name }, delta: { money: -cost, power: 4, happy: 4 }, skills: [{ name: 'Führung', change: 2 }], chronicle: `Gründet „${name}“.` };
  });
  rule(/\b(verkauf|verkaufe|verkaufen|vertick)/, (t, c) => {
    const list = c.assets || [];
    const a = list.find((o) => t.toLowerCase().includes(o.name.toLowerCase().slice(0, 5)));
    if (!a) return { reply: list.length ? `Was genau? Du besitzt: ${list.map((o) => o.name).join(', ')}. Wohnungen, Autos und Büros verkaufst du im Markt.` : 'Du hast nichts, was ich für dich verkaufen könnte. Wohnungen und Autos laufen über den Markt.' };
    const v = Math.round((a.value || 300) * (0.45 + Math.random() * 0.45));
    return { reply: `Kleinanzeigen, drei Lowballer, ein Typ, der nicht auftaucht – und dann klappt es: ${a.name} weg für ${eur(v)}.`, assets: [{ name: a.name, remove: true }], delta: { money: v }, chronicle: `Verkauft: ${a.name}.` };
  });
  rule(/\b(investier|aktie|etf|bitcoin|krypto|crypto|trade|trading)/, (t, c) => {
    const n = amount(t);
    if (!n) return { reply: 'Wie viel willst du investieren? Schreib z. B. „5000 in ETFs“ oder „500 in Bitcoin“.', ask: 'invest' };
    if (n > c.stats.money) return { reply: `Du hast nur ${eur(c.stats.money)} auf dem Konto. Mit Geld, das du nicht hast, investiert man nicht. (Okay, manche schon. Die enden in Dokus.)` };
    const crypto = /bitcoin|krypto|crypto|coin|nft|trade|trading/.test(t), r = d20();
    const f = crypto ? (r >= 18 ? 1.8 + Math.random() * 1.5 : r <= 5 ? 0.15 + Math.random() * 0.3 : 0.7 + Math.random() * 0.6) : (0.94 + Math.random() * 0.16);
    const res = Math.round(n * f - n);
    if (!crypto) return { reply: `${eur(n)} in einen breiten ETF. Langweilig, aber gut. Ich lege es als Depot an; es arbeitet jetzt jeden Monat leise für dich.`, delta: { money: -n }, assets: [{ name: `ETF-Depot ${eur(n)}`, kind: 'Geldanlage', value: n, pm: Math.round(n * 0.005) }], skills: [{ name: 'Buchhaltung', change: 1 }] };
    return { reply: `Du kaufst für ${eur(n)} … und schaust 40 Mal am Tag aufs Handy (Wurf ${r}). ${res >= 0 ? `Läuft! +${eur(res)}. Rechtzeitig raus.` : `Rot. ${eur(res)}. Die Telegram-Gruppe sagt „HODL“.`}`, delta: { money: res, happy: res >= 0 ? 6 : -6, health: -1 } };
  });
  rule(/\b(casino|wette|wetten|zock|roulette|poker|lotto|sportwette)/, (t, c) => {
    const n = amount(t) || 50;
    if (n > Math.max(0, c.stats.money)) return { reply: 'Mit welchem Geld? Dein Konto sagt nein. Ich übrigens auch.' };
    const r = d20(), win = r >= 17 ? n * (r === 20 ? 5 : 2) : r >= 12 ? Math.round(n * 0.4) : -n;
    return { reply: `${/lotto/.test(t) ? 'Lottoschein' : /poker/.test(t) ? 'Pokerabend' : /sportwette|wette/.test(t) ? 'Sportwette' : 'Casino'} mit ${eur(n)} (Wurf ${r}). ${win > 0 ? `GEWONNEN: +${eur(win)}. Jetzt aufhören. Bitte.` : 'Weg. Das Haus gewinnt immer.'}`, delta: { money: win, happy: win > 0 ? 8 : -5 } };
  });
  rule(/\b(kredit|darlehen|leih)/, (t) => {
    const n = amount(t);
    if (!n) return { reply: 'Wie viel brauchst du und wofür? Z. B. „Kredit 10000 für ein Auto über 48 Monate“.', ask: 'loan' };
    const m = (t.match(/(\d+)\s*monat/i) || [])[1];
    return { reply: `Ich schicke deinen Antrag über ${eur(n)} an die Bank. Die prüft SCHUFA und Einkommen – Ergebnis siehst du gleich im Bericht.`, loan: { amount: n, months: m ? Number(m) : 60, why: cap((after(t, /für\s+(.{2,40})/i) || 'Privatkredit').replace(/\s+(über|auf|in|mit)\s.*$/i, '')) } };
  });
  rule(/\b(spend|spende|spenden|charity)/, (t, c) => {
    const n = amount(t) || 100;
    if (n > c.stats.money) return { reply: 'So viel hast du nicht. Spenden ist schön, Schulden für Spenden eher nicht.' };
    return { reply: `${eur(n)} gespendet${/(tafel|tierheim|krebs|kinder|unicef)/i.test(t) ? '' : ' an einen gemeinnützigen Verein'}. Fühlt sich gut an, und ein bisschen absetzbar ist es auch.`, delta: { money: -n, happy: Math.min(10, 2 + Math.round(n / 500)), power: Math.min(6, Math.round(n / 2000)) }, skills: n >= 1000 ? [{ name: 'Ruf in der Szene', change: 2 }] : [] };
  });
  rule(/\b(bewerb|job als|arbeit(e|en)? als|werd(e|en) (ein|eine) )/, (t, c) => {
    const what = cap(after(t, /(?:als|werden?(?: ein| eine)?)\s+([\wäöüß\- ]{3,40})/i));
    if (!what) return { reply: 'Als was willst du dich bewerben? Feste Stellen mit Vertrag findest du auch im Markt unter „Jobs“.', ask: 'job' };
    const sk = skillName(what), lvl = (c.skills || {})[sk] || 0, r = d20(), score = r + Math.floor(lvl / 10) + Math.floor(c.stats.power / 25);
    if (score < 12) return { reply: `Bewerbung als ${what} raus (Wurf ${r}). Absage: „Wir haben uns für jemanden mit mehr Erfahrung entschieden.“ ${CO() && CO().ALL.includes(sk) ? `Mehr ${sk} lernen` : 'Erfahrung sammeln'} oder im Markt nach Einstiegsjobs suchen.`, delta: { happy: -3 } };
    const gross = Math.round((2100 + lvl * 25 + Math.random() * 900) / 50) * 50;
    return { reply: `Vorstellungsgespräch lief (Wurf ${r})! Du fängst als ${what} an, ${eur(gross)} brutto im Monat.`, job: { set: true, title: what, firm: pick(['Müller & Partner', 'NordWerk GmbH', 'Kreativhaus', 'Stadtwerke', 'RuhrTech', 'Haus der Ideen']), gross }, delta: { happy: 5, power: 2 }, chronicle: `Neuer Job als ${what}.` };
  });
  rule(/(\blern|(?:^|\s)üb|\btrainier|\bkurs\b|\bunterricht|\bnehme? stunden)/, (t, c) => {
    const w = after(t, /(?:lerne?n?|übe?n?|trainiere?n?|kurs(?:\s+in)?|unterricht in|stunden in)\s+([\wäöüß\- ]{2,30})/i);
    if (!w) return { reply: 'Was willst du lernen? Singen, 3D, Programmieren, Boxen, Spanisch – alles geht. Lizenzen und Prüfungen gibt es in der Akademie.', ask: 'learn' };
    const sk = skillName(w), paid = /kurs|unterricht|stunden|coach/i.test(t), r = d20();
    const up = (paid ? 5 : 3) + (r >= 15 ? 3 : 0);
    return { reply: `${paid ? `Kurs gebucht: ${sk}. ` : `Du übst ${sk}, jeden Abend. `}${r >= 15 ? 'Es macht Klick – schneller als gedacht.' : r <= 4 ? 'Zäh. Aber es bleibt was hängen.' : 'Langsam, aber es wird.'} (+${up})`, skills: [{ name: sk, change: up }], delta: { money: paid ? -(120 + Math.floor(Math.random() * 280)) : 0, happy: 2 } };
  });
  rule(/\b(gym|fitness|sport|joggen|laufen|training|pumpen|schwimm|yoga)/, () => ({ reply: 'Fitnessstudio-Vertrag. Die ersten zwei Wochen gehst du wirklich hin. Danach … mal sehen. Muskelkater inklusive.', add_effects: [{ name: 'Fitnessstudio', pm: -35, health: 2, happy: 1, power: 0, months: 0 }], skills: [{ name: 'Fitness', change: 4 }], delta: { health: 3 } }));
  rule(/\b(party|feiern|saufen|rave|festival|in den club)/, () => {
    const r = d20();
    return { reply: `Nacht des Jahres (Wurf ${r}). ${r >= 15 ? 'Du lernst Leute kennen, die du nie wieder vergisst. Oder doch, morgen früh.' : r <= 4 ? 'Handy weg, Jacke weg, Würde weg. Kater bis Mittwoch.' : 'Gute Musik, zu teure Drinks, Döner um 5.'}`, delta: { money: -(60 + Math.floor(Math.random() * 140)), happy: r <= 4 ? -2 : 7, health: -3 }, skills: r >= 15 ? [{ name: 'Netzwerk', change: 3 }] : [] };
  });
  rule(/\b(date|dating|flirt|tinder|beziehung|freundin|freund|heirat|verlieb)/, (t, c) => {
    const r = d20() + Math.floor(((c.skills || {}).Charisma || 0) / 15);
    if (/heirat/.test(t)) return { reply: 'Heiraten? Ernsthaft? Mit wem denn – sag mir den Namen. Mit einer anderen Spieler:in geht das über „Leute“ (Angebot).', ask: 'date' };
    return { reply: r >= 14 ? 'Date läuft. Ihr redet drei Stunden, das Essen wird kalt. Da ist was.' : r >= 8 ? 'Nett. Aber kein Funke. Ihr „bleibt in Kontakt“.' : 'Sie schaut die ganze Zeit aufs Handy und geht nach 20 Minuten. Autsch.', delta: { money: -45, happy: r >= 14 ? 9 : r >= 8 ? 1 : -5 }, add_effects: r >= 14 ? [{ name: 'Verliebt', pm: -60, health: 0, happy: 3, power: 0, months: 6 }] : [], skills: [{ name: 'Charisma', change: 1 }] };
  });
  rule(/\b(arzt|krank|therapie|psycholog|krankenhaus|zahnarzt)/, () => ({ reply: 'Termin gemacht. Drei Wochen Wartezeit, 40 Minuten im Wartezimmer, sieben Minuten Gespräch – aber es hilft.', delta: { health: 6, happy: 2, money: -10 } }));
  rule(/\b(umzieh|umziehen|zieh(e)? nach|ziehe um|wohnung|haus kaufen|auto kaufen|reise|urlaub|flug|studium|studier)/, (t) => ({
    reply: /wohnung|umzieh|zieh/.test(t) ? 'Umziehen läuft über den Markt → Wohnen (echte Angebote, Kaution, Makler). Fürs Ausland: Markt → Ausland. Sag Bescheid, wenn du Hilfe beim Aussuchen willst.' : /auto/.test(t) ? 'Autos gibt es im Markt → Autos, mit Finanzierung. Führerschein zuerst!' : /reise|urlaub|flug/.test(t) ? 'Reisen buchst du im Markt → Reisen, oder klick einfach irgendwo auf die Karte für einen Tagesausflug.' : 'Studienplätze weltweit findest du im Markt → Studium. Bewerbungsfristen beachten!',
  }));
  rule(/\b(kauf|kaufe|kaufen|hol mir|bestell|gönn)/, (t, c, x) => {
    const low = t.toLowerCase(), it = ITEMS.find(([re]) => re.test(low));
    let n = amount(t), name = it ? it[1] : cap(after(t, /(?:kaufe?n?|hol mir|bestelle?n?|gönn(?:e)? mir)\s+(?:ein(?:e|en)?\s+|das\s+|den\s+|die\s+)?([\wäöüß\- ]{2,30})/i));
    name = name.replace(/\s+(?:für|um|zu)?\s*\d.*$/i, '').trim();
    if (!name) return { reply: 'Was willst du kaufen? Und wie viel darf es kosten?', ask: 'buy' };
    if (n < 50) n = 0;
    if (!n && it) n = it[2];
    if (!n) return { reply: `${name} – klingt gut. Was soll es ungefähr kosten? Schreib einfach den Betrag.`, ask: 'buy', item: name };
    if (n > c.stats.money) return { reply: `${name} für ${eur(n)}? Auf deinem Konto sind ${eur(c.stats.money)}. Willst du einen Kredit? Schreib „Kredit ${n} für ${name}“.` };
    return { reply: `Gekauft: ${name} für ${eur(n)}.${it && it[3] < 0 ? ` Kostet dich laufend etwa ${eur(-it[3])} im Monat.` : it && it[3] > 0 ? ' Wenn du es gut machst, wirft es jeden Monat etwas ab.' : ''} ${pick(['Gönn dir.', 'Hoffentlich bereust du es nicht.', 'Sieht gut aus an dir.', 'April approved.'])}`,
      delta: { money: -n, happy: it ? it[4] : 3, power: it ? it[5] : 1 }, assets: [{ name, kind: 'Kauf', value: n, pm: it ? it[3] : 0 }], chronicle: `Kauft ${name}.` };
  });

  function answer(V, pid, text) {
    const c = V.chars[pid];
    const hist = ((V.aprilChat || {})[pid] || []);
    let t = String(text || '').trim();
    // Antwort auf eine Rückfrage: zusammen mit der letzten Frage lesen
    const lastA = [...hist].reverse().find((m) => m.who === 'april');
    const prevMe = hist.filter((m) => m.who === 'me').slice(-2)[0];
    if (lastA && lastA.ask && prevMe && prevMe.t !== t) t = `${prevMe.t} ${t}`;
    const low = t.toLowerCase();
    for (const [re, fn] of R) {
      if (!re.test(low)) continue;
      const out = fn(t, c, V) || {};
      return out;
    }
    const r = d20();
    return { reply: pick([
      `Okay, ich höre zu. Wie genau stellst du dir das vor – wo, mit wem und wie viel Geld soll es kosten? (Ohne KI verstehe ich am besten kurze Sätze wie „kaufe ein Pferd“, „gründe „Name““, „lerne Singen“, „5000 in ETFs“, „bewerbe mich als Barista“.)`,
      `Klingt nach einem Plan (Wurf ${r}). ${r >= 12 ? 'Du ziehst es durch, und es fühlt sich gut an.' : 'Es läuft nicht ganz, wie du denkst.'} Wenn ich es richtig umsetzen soll, sag mir konkret, was du tust und was es kostet.`,
    ]), delta: r >= 12 ? { happy: 2 } : { happy: -1 } };
  }
  const OFF = { answer, amount, skillName };
  if (isNode) module.exports = OFF;
  else root.DULI_LARP_OFFLINE = OFF;
})(typeof window !== 'undefined' ? window : globalThis);
