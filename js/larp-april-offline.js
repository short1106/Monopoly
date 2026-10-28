// DULIDAN LARP EXTREME – „Frag April“ ohne KI-Schlüssel (oder wenn die KI nicht durchkommt).
// Aufbau: Nachricht normalisieren → in Teilwünsche zerlegen („… und dann …“) → jede Absicht bewerten und die beste nehmen
// → Ergebnis mit Würfel und Können berechnen → große Ausgaben erst bestätigen lassen („Sicher? Schreib ja“).
// Was April nicht kennt, wird ein freies Projekt mit Budget und Wurf – man kann also wirklich alles versuchen.
// Liefert dieselben Bausteine wie die KI (delta, skills, assets, add_effects, job, company, loan, appointments …).
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const CO = () => root.DULI_LARP_COMPANY || (isNode ? require('./larp-company') : null);
  const d20 = () => 1 + Math.floor(Math.random() * 20);
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const eur = (n) => `${Math.round(n).toLocaleString('de-DE')} €`;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const lvlOf = (c, sk) => Math.round((c.skills || {})[sk] || 0);

  // ---------- Text verstehen ----------
  const norm = (t) => t.toLowerCase().replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü').replace(/ss\b/g, 'ß');
  const NUM = /(\d+(?:[.,]\d+)*)\s*(k\b|tsd|tausend|mio|millionen?|mille)?\s*(?:€|euro|eur)?/i;
  function amount(t) {
    const m = String(t).replace(/\d+\s*monat\w*/gi, '').replace(/\b\d{1,2}\s*(?:jahre|stunden|tage|wochen|mal)\b/gi, '').match(NUM);
    if (!m) return 0;
    let n = Number(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    const u = (m[2] || '').toLowerCase();
    if (/^(k|tsd|tausend|mille)$/.test(u)) n *= 1000;
    if (/^mio|million/.test(u)) n *= 1e6;
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  const quoted = (t) => { const m = t.match(/[„"“'»]([^"“”'«]{2,40})[“"”'«]/); return m ? m[1].trim() : ''; };
  const after = (t, re) => { const m = t.match(re); return m ? m[1].replace(/[.!?,;].*$/, '').replace(/\s+(und|für|mit|um|in|bei|über)\s.*$/i, '').trim() : ''; };
  const YES = /^(ja+|jo+|jap|yes|ok(ay)?|klar|sicher|mach( (es|das|schon))?|los|go|na klar|auf jeden|safe|bestätigt?|deal)\b/i;
  const NO = /^(nein|nee|ne|no|lass( es)?|doch nicht|abbrechen|stopp?|vergiss es)\b/i;

  const SKILL_HINTS = [[/3d|blender/, '3D-Modellierung'], [/code|coden|program|app\b|software/, 'Programmieren'], [/sing|gesang/, 'Singen'], [/tanz/, 'Tanzen'], [/koch|back/, 'Kochen'],
    [/box|mma|kampf|karate|judo|kickbox/, 'Kampfsport'], [/gym|fit|pump|muskel|joggen|lauf/, 'Fitness'], [/foto/, 'Fotografie'], [/mal|zeichn|kunst/, 'Zeichnen'], [/beat|produz|musik|song|rap/, 'Musikproduktion'],
    [/web|homepage|website/, 'Webdesign'], [/video|schnitt|youtube|film/, 'Videoschnitt'], [/tiktok|insta|social|influenc|stream/, 'Social Media'], [/verkauf|sales/, 'Verkauf'], [/spiel|game/, 'Game Design'],
    [/buch|roman|schreib|blog|gedicht/, 'Schreiben'], [/auto|motor|schraub/, 'Autos schrauben'], [/garten|pflanz/, 'Gärtnern'], [/schauspiel|theater/, 'Schauspiel'], [/marketing|werbung/, 'Marketing'], [/näh|mode|kleid/, 'Nähen'], [/strom|elektr/, 'Elektrik'], [/holz|möbel|schrein/, 'Schreinern']];
  function skillName(word) {
    const Co = CO(), w = String(word || '').toLowerCase().trim();
    if (!w) return '';
    const all = Co ? Co.ALL : [];
    const hit = all.find((n) => n.toLowerCase() === w) || all.find((n) => n.toLowerCase().startsWith(w.slice(0, 5))) || all.find((n) => w.includes(n.toLowerCase().slice(0, 5)));
    if (hit) return hit;
    const m = SKILL_HINTS.find(([re]) => re.test(w));
    return m ? m[1] : cap(w.split(/\s+/).slice(0, 2).join(' '));
  }
  const guessSkill = (t) => { const l = String(t).toLowerCase(), m = SKILL_HINTS.find(([re]) => re.test(l)); return m ? m[1] : ''; };

  // Preise für Dinge, die man oft kaufen will: [Muster, Name, Preis, laufend pro Monat, Glück, Macht]
  const ITEMS = [
    [/pferd/, 'Pferd', 6500, -420, 6, 2], [/hund|welpe/, 'Hund', 1200, -110, 10, 0], [/katze/, 'Katze', 450, -60, 8, 0], [/papagei|vogel/, 'Papagei', 900, -30, 5, 0], [/schlange|reptil|echse/, 'Terrarium mit Schlange', 600, -25, 3, 1],
    [/boot|yacht|jacht/, 'Motorboot', 38000, -350, 6, 5], [/motorrad/, 'Motorrad', 9000, -120, 6, 2], [/e-?scooter|roller/, 'E-Scooter', 600, 0, 2, 0], [/fahrrad|e-?bike/, 'Fahrrad', 900, 0, 3, 0],
    [/laptop|macbook|notebook/, 'Laptop', 1400, 0, 3, 1], [/\bpc\b|rechner|gaming/, 'Gaming-PC', 2200, 0, 5, 0], [/handy|iphone|smartphone/, 'Smartphone', 1100, -20, 3, 1], [/tablet|ipad/, 'Tablet', 800, 0, 2, 0],
    [/rolex|uhr\b/, 'Uhr', 9000, 0, 3, 4], [/kette|schmuck|ring\b/, 'Schmuck', 2500, 0, 3, 2], [/sneaker|schuhe/, 'Sneaker', 220, 0, 3, 1], [/designer|gucci|louis|prada|klamotten|outfit/, 'Designer-Outfit', 1800, 0, 4, 3],
    [/gitarre/, 'Gitarre', 450, 0, 3, 0], [/klavier|piano|keyboard/, 'Klavier', 4500, 0, 4, 0], [/kamera/, 'Kamera', 1600, 0, 3, 0], [/drohne/, 'Drohne', 900, 0, 3, 0], [/mikro|studio-?equipment/, 'Home-Studio', 2400, 0, 4, 1],
    [/foodtruck|food-truck|imbiss/, 'Food-Truck', 45000, 600, 4, 4], [/kiosk|späti/, 'Kiosk', 30000, 700, 2, 3], [/\bbar\b|shisha/, 'Bar', 120000, 1800, 4, 8], [/automat/, 'Snackautomat', 3500, 90, 1, 1],
    [/kunst|gemälde/, 'Kunstwerk', 5000, 0, 3, 2], [/tattoo/, 'Tattoo', 350, 0, 5, 1], [/playstation|ps5|xbox|switch|konsole/, 'Spielkonsole', 550, 0, 5, 0], [/pool|whirlpool/, 'Whirlpool', 7000, -60, 6, 2],
    [/grundstück|acker|wald\b/, 'Grundstück', 25000, -20, 2, 4], [/insel/, 'Privatinsel', 2500000, -6000, 10, 30],
  ];

  // ---------- Absichten ----------
  // jede: { id, re: [Muster…], w: Gewicht, run(ctx) → Ergebnis }
  const I = [];
  const intent = (id, re, w, run) => I.push({ id, re, w, run });
  const ok = (o) => Object.assign({ delta: {} }, o);

  intent('info', [/\b(was (hab|habe|besitze) ich|mein (status|stand|konto)|wie viel geld|was kann ich|hilfe|help|wie geht das|was geht)\b/], 3, ({ c }) => {
    const sk = Object.entries(c.skills || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round(v)}`);
    return ok({ reply: `Kurzer Stand: ${eur(c.stats.money)} auf dem Konto, ${c.job || 'kein Job'}. ${(c.assets || []).length ? `Besitz: ${c.assets.map((a) => a.name).join(', ')}. ` : ''}${sk.length ? `Stärkste Skills: ${sk.join(', ')}. ` : ''}Du kannst mir alles schreiben – z. B. „kaufe ein Pferd“, „gründe „Name““, „lerne Singen und geh ins Gym“, „ich baue eine App für 2000 €“, „bewerbe mich als Barista“. Große Sachen bestätigst du mit „ja“.` });
  });
  intent('quit', [/\b(kündige|kündigen|schmeiß.*hin|hör.*auf zu arbeiten|job hinschmeiß)/], 4, ({ c }) => {
    if (!c.job2) return ok({ reply: 'Du hast gerade keinen festen Job, den du kündigen könntest.' });
    return ok({ confirm: `Wirklich bei ${c.job2.firm} kündigen? Dann fällt dein Gehalt von ${eur(c.job2.gross)} brutto weg.`, reply: `Du legst die Kündigung bei ${c.job2.firm} auf den Tisch. Kurzer Schockmoment, dann Freiheit. Überleg dir, wovon du ab jetzt lebst.`, job: { quit: true }, delta: { happy: 6, power: -2 }, chronicle: `Kündigt bei ${c.job2.firm}.` });
  });
  const FIRM = '(firma|startup|business|gewerbe|agentur|label|laden|gmbh|unternehmen|café|cafe|restaurant|shop|bäckerei|salon|imbissbude|werkstatt)';
  intent('found', [new RegExp(`\\b(gründe|gründen|eröffne|eröffnen|aufmachen|mach(e)? (eine?n?|meine?n?) )\\b.*\\b${FIRM}|\\b${FIRM}\\b.*\\b(gründen|eröffnen|aufmachen)`), new RegExp(`\\b${FIRM}\\b`)], 3, ({ t, c, money }) => {
    const name = quoted(t) || after(t, /(?:namens|heißt|heißen|name)\s+([\wäöüß&\- ]{2,40})/i);
    if (!name) return ok({ ask: 'found', reply: 'Ich liebe es. Wie soll die Firma heißen, und was macht sie? Schreib den Namen in Anführungszeichen, z. B. „Dulidan Burger“.' });
    const gmbh = /gmbh/i.test(t), cost = 450 + (gmbh ? 12500 : 0);
    if (money < cost) return ok({ reply: `Für ${gmbh ? 'eine GmbH (12.500 € Stammkapital plus Notar)' : 'Gewerbeanmeldung und Kram'} brauchst du ${eur(cost)}. Hast du nicht. Kredit? Schreib „Kredit ${cost} für die Firma“.` });
    return ok({ cost, confirm: gmbh ? `Eine GmbH kostet dich ${eur(cost)} Stammkapital plus Notar. Sicher?` : '', reply: `„${name}“ ist angemeldet. Gewerbeamt, Steuernummer, ein Logo, das du um 3 Uhr nachts gemacht hast. Im Tab „Firma“ nimmst du jetzt Aufträge an und stellst Leute ein.`, company: { found: true, name }, delta: { money: -cost, power: 4, happy: 4 }, skills: [{ name: 'Führung', change: 2 }], chronicle: `Gründet „${name}“.` });
  });
  intent('sell', [/\b(verkauf|verkaufe|verkaufen|vertick|loswerden)/], 4, ({ t, c }) => {
    const list = c.assets || [];
    const a = list.find((o) => norm(t).includes(norm(o.name).slice(0, 5)));
    if (!a) return ok({ reply: list.length ? `Was genau? Du besitzt: ${list.map((o) => o.name).join(', ')}. Wohnungen, Autos und Büros verkaufst du im Markt.` : 'Du hast nichts, was ich für dich verkaufen könnte. Wohnungen und Autos laufen über den Markt.' });
    const r = d20(), v = Math.round((a.value || 300) * (0.45 + r * 0.025));
    return ok({ reply: `Kleinanzeigen, drei Lowballer, ein Typ, der nicht auftaucht (Wurf ${r}) – dann klappt es: ${a.name} weg für ${eur(v)}.`, assets: [{ name: a.name, remove: true }], delta: { money: v }, chronicle: `Verkauft: ${a.name}.` });
  });
  intent('invest', [/\b(investier|aktie|etf|bitcoin|krypto|crypto|trade|trading|börse|anlegen)/], 4, ({ t, money }) => {
    const n = amount(t);
    if (!n) return ok({ ask: 'invest', reply: 'Wie viel willst du anlegen – und wo? Z. B. „5000 in ETFs“ oder „500 in Bitcoin“.' });
    if (n > money) return ok({ reply: `Du hast nur ${eur(money)}. Mit Geld, das du nicht hast, investiert man nicht. (Manche schon. Die enden in Dokus.)` });
    const crypto = /bitcoin|krypto|crypto|coin|nft|trade|trading/.test(t), r = d20();
    if (!crypto) return ok({ cost: n, title: `${eur(n)} in ETFs`, reply: `${eur(n)} in einen breiten ETF. Langweilig, aber klug. Das Depot arbeitet jetzt jeden Monat leise für dich.`, delta: { money: -n, power: 1 }, assets: [{ name: `ETF-Depot ${eur(n)}`, kind: 'Geldanlage', value: n, pm: Math.round(n * 0.005) }], skills: [{ name: 'Buchhaltung', change: 1 }] });
    const f = r >= 18 ? 1.8 + Math.random() * 1.5 : r <= 5 ? 0.15 + Math.random() * 0.3 : 0.7 + Math.random() * 0.6, res = Math.round(n * f - n);
    return ok({ cost: n, title: `${eur(n)} in Krypto`, risky: true, reply: `Du kaufst für ${eur(n)} und schaust 40 Mal am Tag aufs Handy (Wurf ${r}). ${res >= 0 ? `Läuft! +${eur(res)}. Rechtzeitig raus.` : `Rot: ${eur(res)}. Die Telegram-Gruppe sagt „HODL“.`}`, delta: { money: res, happy: res >= 0 ? 6 : -6, health: -1 } });
  });
  intent('gamble', [/\b(casino|wette|wetten|zock|roulette|poker|lotto|sportwette|blackjack|spielautomat)/], 4, ({ t, money }) => {
    const n = amount(t) || 50;
    if (n > Math.max(0, money)) return ok({ reply: 'Mit welchem Geld? Dein Konto sagt nein. Ich übrigens auch.' });
    const r = d20(), win = /lotto/.test(t) ? (r === 20 && Math.random() < 0.05 ? n * 2000 : r >= 18 ? n * 8 : -n) : r >= 17 ? n * (r === 20 ? 5 : 2) : r >= 12 ? Math.round(n * 0.4) : -n;
    return ok({ cost: n, title: `${eur(n)} verzocken`, risky: true, reply: `${/lotto/.test(t) ? 'Lottoschein' : /poker/.test(t) ? 'Pokerabend' : /wette/.test(t) ? 'Sportwette' : 'Casino'} mit ${eur(n)} (Wurf ${r}). ${win > 0 ? `GEWONNEN: +${eur(win)}. Jetzt aufhören. Bitte.` : 'Weg. Das Haus gewinnt immer.'}`, delta: { money: win, happy: win > 0 ? 8 : -5 } });
  });
  intent('loan', [/\b(kredit|darlehen|leih mir|geld leihen|bank)\b/], 4, ({ t }) => {
    const n = amount(t);
    if (!n) return ok({ ask: 'loan', reply: 'Wie viel brauchst du und wofür? Z. B. „Kredit 10000 für ein Auto über 48 Monate“.' });
    const m = (t.match(/(\d+)\s*monat/i) || [])[1], y = (t.match(/(\d+)\s*jahre/i) || [])[1];
    return ok({ confirm: `Kreditantrag über ${eur(n)}? Die Bank prüft SCHUFA und Einkommen, Zinsen kommen dazu.`, reply: `Antrag über ${eur(n)} ist raus. Das Ergebnis der Bank steht gleich im Bericht.`, loan: { amount: n, months: m ? Number(m) : y ? Number(y) * 12 : 60, why: cap(after(t, /für\s+(?:ein(?:e|en)?\s+|die\s+|das\s+|den\s+)?(.{2,40})/i) || 'Privatkredit') } });
  });
  intent('donate', [/\b(spende|spenden|charity|verschenk)/], 4, ({ t, money }) => {
    const n = amount(t) || 100;
    if (n > money) return ok({ reply: 'So viel hast du nicht. Spenden ist schön, Schulden für Spenden eher nicht.' });
    return ok({ cost: n, title: `${eur(n)} ${/verschenk/.test(t) ? 'verschenken' : 'spenden'}`, reply: `${eur(n)} ${/verschenk/.test(t) ? 'verschenkt. Die Freude ist echt.' : 'gespendet. Fühlt sich gut an, und ein bisschen absetzbar ist es auch.'}`, delta: { money: -n, happy: Math.min(10, 2 + Math.round(n / 500)), power: Math.min(6, Math.round(n / 2000)) }, skills: n >= 1000 ? [{ name: 'Ruf in der Szene', change: 2 }] : [] });
  });
  intent('apply', [/\b(bewerb|job als|arbeit(e|en)? als|werd(e|en) (ein|eine) |anfangen als)/], 4, ({ t, c }) => {
    const what = cap(after(t, /(?:als|werden?(?: ein| eine)?)\s+([\wäöüß\- ]{3,40})/i));
    if (!what) return ok({ ask: 'apply', reply: 'Als was willst du dich bewerben? Feste Stellen findest du auch im Markt unter „Jobs“.' });
    const sk = skillName(what), lvl = lvlOf(c, sk), r = d20(), score = r + Math.floor(lvl / 10) + Math.floor(c.stats.power / 25);
    if (r !== 20 && score < 12) return ok({ reply: `Bewerbung als ${what} raus (Wurf ${r}${lvl ? ` + ${sk} ${lvl}` : ''}). Absage: „Wir haben uns für jemanden mit mehr Erfahrung entschieden.“ ${CO() && CO().ALL.includes(sk) ? `Mehr ${sk} lernen` : 'Erfahrung sammeln'} oder im Markt nach Einstiegsjobs schauen.`, delta: { happy: -3 } });
    const gross = Math.round((2100 + lvl * 25 + r * 40) / 50) * 50;
    return ok({ confirm: c.job2 ? `Zusage als ${what} (${eur(gross)} brutto)! Dafür kündigst du bei ${c.job2.firm}. Annehmen?` : '', reply: `Vorstellungsgespräch lief (Wurf ${r})! Du fängst als ${what} an, ${eur(gross)} brutto im Monat.`, job: { set: true, title: what, firm: pick(['Müller & Partner', 'NordWerk GmbH', 'Kreativhaus', 'Stadtwerke', 'RuhrTech', 'Haus der Ideen', 'Café Central', 'Logistik West']), gross }, delta: { happy: 5, power: 2 }, chronicle: `Neuer Job als ${what}.` });
  });
  intent('learn', [/(\blern|(?:^|\s)üb|\btrainier|\bkurs\b|\bunterricht|\bstunden in|\bcoach|\bbeibringen)/], 3, ({ t, c }) => {
    const w = after(t, /(?:lerne?n?|übe?n?|trainiere?n?|kurs(?:\s+(?:in|für))?|unterricht in|stunden in|coaching in)\s+([\wäöüß\- ]{2,30})/i) || guessSkill(t);
    if (!w) return ok({ ask: 'learn', reply: 'Was willst du lernen? Singen, 3D, Programmieren, Boxen, Spanisch – alles. Lizenzen und Prüfungen gibt es in der Akademie.' });
    const sk = skillName(w), paid = /kurs|unterricht|stunden|coach/i.test(t), r = d20(), lvl = lvlOf(c, sk);
    const up = Math.max(1, (paid ? 5 : 3) + (r >= 15 ? 3 : r <= 3 ? -2 : 0) - Math.floor(lvl / 40));
    const fee = paid ? rnd(120, 400) : 0;
    return ok({ cost: fee, reply: `${paid ? `Kurs gebucht: ${sk} (${eur(fee)}). ` : `Du übst ${sk}, jeden Abend. `}${r >= 15 ? 'Es macht Klick – schneller als gedacht.' : r <= 3 ? 'Zäh. Aber es bleibt was hängen.' : 'Langsam, aber es wird.'} ${sk} +${up}${lvl ? ` (jetzt etwa ${Math.min(100, lvl + up)})` : ''}.`, skills: [{ name: sk, change: up }], delta: { money: -fee, happy: 1 } });
  });
  intent('sport', [/\b(gym|fitness|sport|joggen|laufen gehen|pumpen|schwimm|yoga|abnehmen|trainingsplan)/], 2, ({ c }) => {
    if ((c.effects || []).some((e) => e.name === 'Fitnessstudio')) return ok({ reply: 'Du hast schon einen Vertrag. Heute wirklich hingegangen – Respekt. Beine nicht vergessen.', skills: [{ name: 'Fitness', change: 2 }], delta: { health: 2, happy: 1 } });
    return ok({ reply: 'Fitnessstudio-Vertrag, 35 € im Monat. Die ersten zwei Wochen gehst du wirklich hin. Muskelkater inklusive.', add_effects: [{ name: 'Fitnessstudio', pm: -35, health: 2, happy: 1, power: 0, months: 0 }], skills: [{ name: 'Fitness', change: 4 }], delta: { health: 3 } });
  });
  intent('party', [/\b(party|feiern|saufen|rave|festival|in den club|clubben|ausgehen)/], 2, () => {
    const r = d20();
    return ok({ reply: `Nacht des Jahres (Wurf ${r}). ${r >= 15 ? 'Du lernst Leute kennen, die du nie vergisst. Oder doch, morgen früh.' : r <= 4 ? 'Handy weg, Jacke weg, Würde weg. Kater bis Mittwoch.' : 'Gute Musik, zu teure Drinks, Döner um 5.'}`, delta: { money: -rnd(60, 200), happy: r <= 4 ? -2 : 7, health: -3 }, skills: r >= 15 ? [{ name: 'Netzwerk', change: 3 }] : [] });
  });
  intent('date', [/\b(date|dating|flirt|tinder|beziehung|verlieb|heirat|ansprechen)/], 3, ({ t, c }) => {
    if (/heirat/.test(t)) return ok({ reply: 'Heiraten? Mit einer anderen Spieler:in geht das über „Leute“ (Angebot). Mit jemandem aus der Geschichte: Sag mir den Namen, dann planen wir das Standesamt.', ask: 'date' });
    const r = d20() + Math.floor(lvlOf(c, 'Charisma') / 15);
    return ok({ reply: r >= 14 ? 'Date läuft. Ihr redet drei Stunden, das Essen wird kalt. Da ist was.' : r >= 8 ? 'Nett. Aber kein Funke. Ihr „bleibt in Kontakt“.' : 'Die Person schaut die ganze Zeit aufs Handy und geht nach 20 Minuten. Autsch.', delta: { money: -45, happy: r >= 14 ? 9 : r >= 8 ? 1 : -5 }, add_effects: r >= 14 ? [{ name: 'Verliebt', pm: -60, health: 0, happy: 3, power: 0, months: 6 }] : [], skills: [{ name: 'Charisma', change: 1 }] });
  });
  intent('doctor', [/\b(arzt|ärztin|krank|therapie|psycholog|krankenhaus|zahnarzt|check-?up)/], 3, () => ok({ reply: 'Termin gemacht. Drei Wochen Wartezeit, sieben Minuten Gespräch – aber es hilft.', delta: { health: 6, happy: 2, money: -10 } }));
  intent('rest', [/\b(schlafen|ausruhen|chillen|pause|meditier|wellness|spa|auszeit|nichts tun|gar nichts|nichts machen|faulenzen)/], 2, () => ok({ reply: 'Handy aus, Decke drüber. Einen ganzen Tag lang passiert absolut nichts. Genau richtig.', delta: { health: 3, happy: 4 } }));
  intent('family', [/\b(besuch|anrufen|ruf .* an|familie|mama|papa|opa|oma|freunde treffen)/], 2, ({ t }) => ok({ reply: `${/opa|oma/.test(t) ? 'Kaffee, Kuchen und dreimal dieselbe Geschichte. Du gehst mit einem Lächeln und einem 20er in der Tasche.' : 'Ihr redet stundenlang. Manchmal ist das alles, was man braucht.'}`, delta: { happy: 5, money: /opa|oma/.test(t) ? 20 : 0 } }));
  intent('content', [/\b(poste|posten|post|video|youtube|tiktok|instagram|stream|streamen|podcast|veröffentlich|release|song raus|influencer)/], 3, ({ t, c }) => {
    const sk = /stream|video|youtube/.test(t) ? 'Videoschnitt' : /song|musik|release/.test(t) ? 'Musikproduktion' : 'Social Media';
    const r = d20() + Math.floor((lvlOf(c, sk) + lvlOf(c, 'Bekanntheit')) / 20), viral = r >= 20;
    return ok({ reply: viral ? `VIRAL. Über Nacht teilen es alle, dein Handy glüht (Wurf ${r}). Erste Marken schreiben dir.` : r >= 12 ? `Läuft ordentlich (Wurf ${r}): ein paar tausend Aufrufe, neue Follower, gute Kommentare.` : `Flop (Wurf ${r}). 47 Aufrufe, davon 30 von dir. Weitermachen.`, skills: [{ name: 'Bekanntheit', change: viral ? 12 : r >= 12 ? 3 : 0 }, { name: sk, change: 2 }], delta: { happy: viral ? 10 : r >= 12 ? 3 : -2, money: viral ? rnd(300, 1500) : 0, power: viral ? 4 : 0 } });
  });
  intent('sidejob', [/\b(nebenjob|jobben|kellner|babysit|nachhilfe geben|lieferando|paket|aushilfe|minijob|schicht|freelance|auftrag)/], 3, ({ t, c }) => {
    const sk = /nachhilfe/.test(t) ? 'Schreiben' : /freelance|auftrag/.test(t) ? guessSkill(t) || 'Verkauf' : 'Kundenservice', r = d20();
    const pay = Math.round((r >= 10 ? 260 : 150) + lvlOf(c, sk) * 4 + rnd(0, 120));
    return ok({ reply: `Ein paar Schichten ${/nachhilfe/.test(t) ? 'Nachhilfe' : /kellner/.test(t) ? 'im Restaurant' : /liefer|paket/.test(t) ? 'auf dem Fahrrad' : 'nebenbei'} (Wurf ${r}). ${r <= 4 ? 'Chef nervt, Trinkgeld mies.' : 'Läuft.'} +${eur(pay)}.`, delta: { money: pay, health: -2, happy: r <= 4 ? -2 : 1 }, skills: [{ name: sk, change: 1 }] });
  });
  intent('crime', [/\b(klau|stehl|einbrech|einbruch|deal|vertick drogen|betrug|abzocke|überfall|schwarzarbeit|hack)/], 5, ({ t, c }) => {
    const r = d20(), gain = rnd(150, 900) * (/überfall|einbruch|einbrech/.test(t) ? 3 : 1), caught = r <= 7;
    if (caught) return ok({ confirm: 'Das ist eine Straftat. Wenn es schiefgeht: Anzeige, Gericht, Vorstrafe. Wirklich?', risky: true, reply: `Erwischt (Wurf ${r}). Blaulicht, Personalien, Anzeige. Post vom Amtsgericht kommt.`, delta: { happy: -8, power: -3 }, appointments: [{ title: 'Vorladung: Polizei und Amtsgericht', where: 'Amtsgericht', months_from_now: 2 }], add_effects: [{ name: 'Ermittlungsverfahren', pm: 0, health: 0, happy: -2, power: -1, months: 6 }], chronicle: 'Bei einer Straftat erwischt.' });
    return ok({ confirm: 'Das ist eine Straftat. Wenn es schiefgeht: Anzeige, Gericht, Vorstrafe. Wirklich?', risky: true, reply: `Durchgezogen (Wurf ${r}). +${eur(gain)}. Niemand hat was gesehen. Hoffentlich.`, delta: { money: gain, happy: 2, health: -1 }, skills: [{ name: 'Ruf in der Szene', change: 3 }] });
  });
  intent('refer', [/\b(umzieh|umziehen|zieh(e)? nach|ziehe um|wohnung|haus kaufen|auto kaufen|reise|urlaub|flug|studium|studier|führerschein|abi\b|ausbildung)/], 2, ({ t }) => ok({
    reply: /wohnung|umzieh|zieh|haus/.test(t) ? 'Wohnen läuft über den Markt → Wohnen (echte Angebote, Kaution, Makler), ins Ausland über Markt → Ausland.' : /auto|führerschein/.test(t) ? 'Führerschein steht unter „Dieser Monat“, Autos mit Finanzierung im Markt → Autos.' : /reise|urlaub|flug/.test(t) ? 'Reisen buchst du im Markt → Reisen – oder klick einfach auf die Karte für einen Tagesausflug.' : /abi/.test(t) ? 'Abi-Prüfungen stehen im Kalender; lernen geht über den Fokus „Lernen“.' : 'Studium und Ausbildung findest du im Markt, Lizenzen in der Akademie.',
  }));
  intent('buy', [/\b(kauf|kaufe|kaufen|hol mir|bestell|gönn|leiste mir|anschaff)/], 3, ({ t, money }) => {
    const low = norm(t), it = ITEMS.find(([re]) => re.test(low));
    let n = amount(t), name = it ? it[1] : cap(after(t, /(?:kaufe?n?|hol mir|bestelle?n?|gönn(?:e)? mir|leiste mir|schaffe? mir)\s+(?:mir\s+)?(?:ein(?:e|en|n)?\s+|das\s+|den\s+|die\s+|neue?n?\s+)*([\wäöüß\- ]{2,30})/i));
    name = (name || '').replace(/\s+(?:für|um|zu)?\s*\d.*$/i, '').trim();
    if (!name) return ok({ ask: 'buy', reply: 'Was willst du kaufen? Und wie viel darf es kosten?' });
    if (n < 20) n = 0;
    if (!n && it) n = it[2];
    if (!n) return ok({ ask: 'buy', reply: `${name} – klingt gut. Was soll es ungefähr kosten? Schreib einfach den Betrag.` });
    if (n > money) return ok({ reply: `${name} für ${eur(n)}? Auf deinem Konto sind ${eur(money)}. Kredit? Schreib „Kredit ${n} für ${name}“.` });
    return ok({ cost: n, title: `${name} kaufen`, reply: `Gekauft: ${name} für ${eur(n)}.${it && it[3] < 0 ? ` Laufend etwa ${eur(-it[3])} im Monat.` : it && it[3] > 0 ? ' Gut geführt wirft es jeden Monat etwas ab.' : ''} ${pick(['Gönn dir.', 'Hoffentlich bereust du es nicht.', 'Sieht gut aus an dir.', 'April approved.'])}`,
      delta: { money: -n, happy: it ? it[4] : 3, power: it ? it[5] : 1 }, assets: [{ name, kind: 'Kauf', value: n, pm: it ? it[3] : 0 }], chronicle: `Kauft ${name}.` });
  });
  // Freies Projekt: alles, was man baut, startet, organisiert, erfindet … – mit Budget und Wurf
  intent('project', [/\b(baue?n?|bastel|mache?n?|starte?n?|organisier|plane?n?|erfinde?n?|entwickle?n?|programmier|schreibe?n?|drehe?n?|produzier|eröffne|veranstalte|gründe? (eine|einen) (band|verein|crew))/], 1, ({ t, c, money }) => {
    let what = cap(quoted(t) || after(t, /(?:baue?n?|bastel\w*|mache?n?|starte?n?|organisiere?n?|plane?n?|erfinde?n?|entwickle?n?|programmiere?n?|schreibe?n?|drehe?n?|produziere?n?|eröffne|veranstalte|gründe?)\s+(?:mir\s+)?(?:ein(?:e|en|n)?\s+|das\s+|den\s+|die\s+|meine?n?\s+)?([\wäöüß\- ]{3,40})/i));
    const what1 = (what || '').replace(/\s*(kostenlos|umsonst|gratis|ohne geld|für\s.*)$/i, '').trim();
    const what0 = what1;
    if (!what0) return ok({ ask: 'project', reply: 'Erzähl! Was genau willst du machen – und wie viel Geld und Zeit steckst du rein?' });
    what = what0;
    let n = amount(t);
    if (!n && !/kostenlos|umsonst|ohne geld|gratis/.test(t)) return ok({ ask: 'project', reply: `„${what}“ – ich bin dabei. Wie viel Geld steckst du rein? (Schreib einen Betrag oder „kostenlos“.)` });
    if (n > money) return ok({ reply: `Für ${what} willst du ${eur(n)} reinstecken, hast aber ${eur(money)}. Weniger Budget oder erst einen Kredit?` });
    const sk = guessSkill(norm(t)) || 'Projektmanagement', lvl = lvlOf(c, sk), r = d20(), score = r + Math.floor(lvl / 10) + Math.min(4, Math.floor(Math.log10(Math.max(1, n)) - 1));
    const base = { cost: n, title: `${what} mit ${eur(n)} Budget`, risky: n > 0, chronicle: '', delta: { money: -n }, skills: [{ name: sk, change: r >= 10 ? 4 : 2 }] };
    if (r === 20 || score >= 20) return ok(Object.assign(base, { reply: `${what}: ein voller Erfolg (Wurf ${r}${lvl ? ` + ${sk} ${lvl}` : ''})! Leute reden darüber, und es bringt jetzt jeden Monat etwas ein.`, delta: { money: -n, happy: 10, power: 5 }, assets: [{ name: what.slice(0, 50), kind: 'Projekt', value: Math.round(n * 1.8 + 500), pm: Math.round(80 + n * 0.04) }], skills: [{ name: sk, change: 6 }, { name: 'Bekanntheit', change: 5 }], chronicle: `Großer Erfolg: ${what}.` }));
    if (score >= 13) return ok(Object.assign(base, { reply: `${what} steht (Wurf ${r}${lvl ? ` + ${sk} ${lvl}` : ''}). Nicht perfekt, aber deins – und du hast eine Menge gelernt.`, delta: { money: -n, happy: 6, power: 2 }, assets: [{ name: what.slice(0, 50), kind: 'Projekt', value: Math.round(n * 0.9 + 100), pm: 0 }], chronicle: `Hat ${what} umgesetzt.` }));
    if (score >= 7) return ok(Object.assign(base, { reply: `${what} – halb geschafft (Wurf ${r}). ${n ? 'Zeit und Geld sind weg' : 'Die Zeit ist weg'}, das Ergebnis ist … ausbaufähig. Nochmal mit mehr Können?`, delta: { money: -n, happy: -1 } }));
    return ok(Object.assign(base, { reply: `${what} geht schief (Wurf ${r}). ${n ? `${eur(n)} weg, dazu` : 'Dazu'} ein bisschen Würde. Aus Fehlern lernt man.`, delta: { money: -n, happy: -5, health: -1 }, skills: [{ name: sk, change: 1 }] }));
  });

  // ---------- Ergebnisse zusammenführen ----------
  function merge(a, b) {
    if (!a) return b;
    const o = Object.assign({}, a);
    o.reply = [a.reply, b.reply].filter(Boolean).join(' ');
    o.delta = Object.assign({}, a.delta);
    Object.entries(b.delta || {}).forEach(([k, v]) => { o.delta[k] = (o.delta[k] || 0) + (v || 0); });
    ['skills', 'assets', 'add_effects', 'appointments'].forEach((k) => { if (b[k] && b[k].length) o[k] = (a[k] || []).concat(b[k]); });
    ['job', 'company', 'loan'].forEach((k) => { if (b[k] && !o[k]) o[k] = b[k]; });
    o.chronicle = [a.chronicle, b.chronicle].filter(Boolean).join(' ');
    return o;
  }
  // Nachricht in Teilwünsche zerlegen: „kaufe einen Hund und dann geh ich ins Gym, danach …“
  const split = (t) => t.split(/\s*(?:,?\s*und dann\s+|,?\s*danach\s+|,?\s*außerdem\s+|;\s*|\.\s+|,\s*(?=(?:ich |dann |und )))\s*/i).flatMap((p) => p.split(/\s+und\s+(?=(?:ich\s+)?(?:kauf|lern|üb|geh|gründ|verkauf|spend|bewerb|investier|mach|bau|start|poste|feier|trainier|zock|nehm))/i)).map((s) => s.trim()).filter((s) => s.length > 1).slice(0, 3);

  function detect(t) {
    const n = norm(t), l = t.toLowerCase();
    let best = null;
    I.forEach((it) => {
      const hits = it.re.filter((re) => re.test(l) || re.test(n)).length;
      if (!hits) return;
      const s = hits * 10 + it.w;
      if (!best || s > best.s) best = { it, s };
    });
    return best && best.it;
  }

  function answer(V, pid, text) {
    const c = V.chars[pid];
    const hist = (V.aprilChat || {})[pid] || [];
    let t = String(text || '').trim();
    const before = hist.slice(0, -1); // die aktuelle Nachricht steht schon im Verlauf
    const lastA = [...before].reverse().find((m) => m.who === 'april');
    // 1. Bestätigung einer großen Sache
    if (lastA && lastA.pend) {
      if (YES.test(t)) return Object.assign({}, lastA.pend, { reply: lastA.pend.reply });
      if (NO.test(t)) return { reply: pick(['Okay, gestrichen. Vernünftig.', 'Alles klar, lassen wir das.', 'Kluge Entscheidung. Glaub ich.']) };
    }
    if (YES.test(t) && t.length < 14 && !(lastA && lastA.ask)) return { reply: 'Ja wozu? Schreib mir einfach, was du machen willst.' };
    // 2. Antwort auf eine Rückfrage: zusammen mit dem ursprünglichen Wunsch lesen
    if (lastA && lastA.ask) {
      const prevMe = [...before].reverse().find((m) => m.who === 'me');
      const own = detect(t), plain = /^[\d„"“'»]/.test(t) || /^(kostenlos|umsonst|gratis)/i.test(t) || t.split(/\s+/).length <= 3 && !own;
      if (prevMe && (plain || !own)) t = `${prevMe.t} ${/^\d/.test(t) && !/€|euro/i.test(t) ? `für ${t} €` : t}`;
    }
    // 3. Teilwünsche abarbeiten
    let money = c.stats.money, out = null, confirm = [];
    for (const part of split(t)) {
      const it = detect(part);
      if (!it) continue;
      const r = it.run({ t: part, c, money, V });
      if (r.ask) return { ask: r.ask, reply: out ? `${out.reply} Und zum Rest: ${r.reply}` : r.reply, delta: out ? out.delta : {}, skills: out && out.skills };
      money -= r.cost || 0;
      if (r.confirm || (r.cost && r.cost >= Math.max(1500, c.stats.money * 0.4))) confirm.push(r.confirm || `${r.title || 'Das'}: ${eur(r.cost)} von deinen ${eur(c.stats.money)}.`);
      if (r.skills) r.skills = r.skills.filter((k) => k.change);
      delete r.cost; delete r.confirm; delete r.risky; delete r.title;
      out = merge(out, r);
    }
    if (out) {
      // Große oder unumkehrbare Sachen: April fragt erst nach
      if (confirm.length) return { reply: `${confirm.join(' ')} Sicher? Schreib „ja“ oder „nein“.`, pend: out };
      return out;
    }
    return { ask: 'free', reply: pick([
      'Erzähl mehr – was genau willst du machen, und wie viel Geld oder Zeit steckst du rein? Ich kann fast alles: kaufen, gründen, lernen, posten, bewerben, investieren, Projekte starten.',
      'Okay, ich höre zu. Was ist der Plan, Schritt für Schritt? Und was darf es kosten?',
    ]) };
  }
  const OFF = { answer, amount, skillName, split, detect: (t) => (detect(t) || {}).id };
  if (isNode) module.exports = OFF;
  else root.DULI_LARP_OFFLINE = OFF;
})(typeof window !== 'undefined' ? window : globalThis);
