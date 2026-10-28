// DULIDAN LARP EXTREME: eingebaute Spielleitung (ohne KI-Schlüssel).
// Ereigniskarten mit Wahlmöglichkeiten, W20-Proben mit Bonus/Schwäche der Figur, Lebensphasen (Abi → Studium,
// Ausbildung, Job, Gründen), Weltgeschehen und freie Ideen per Stichwort. Liefert dasselbe Format wie die KI.
(function (root) {
  const SKILLS = { smart: 'Köpfchen', social: 'Charme', body: 'Körper', work: 'Fleiß', luck: 'Glück' };
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---------- Bonus und Schwäche → Probenwerte ----------
  const PRESET_MODS = {
    shaquille: { work: 4, smart: 2, studio: 5, body: -1 },
    kimberly: { social: 4, rescue: 1, fragile: 1, body: -2 },
    justin: { social: 6, fumble: 1, body: 2 },
    april: { smart: 7, body: -7, work: 2, server: 1 },
    deniz: { work: 5, body: 3, social: -3 },
    lea: { social: 5, luck: 2, work: -2 },
    jonas: { smart: 7, social: -4 },
    aylin: { work: 5, smart: 3, body: -2 },
  };
  const KEYWORDS = [
    [/überred|charm|flirt|beliebt|sozial|rede|verhandl|cool|rizz|aura/i, 'social'],
    [/schlau|klug|nerd|intelligen|wissen|lern|mathe|genie|smart/i, 'smart'],
    [/stark|sport|fit|kampf|athlet|schnell|gym|körper/i, 'body'],
    [/fleiß|arbeit|geld|business|händl|unternehm|gründ|ehrgeiz|disziplin/i, 'work'],
    [/glück|zufall|lucky|schicksal/i, 'luck'],
  ];
  function traits(c) {
    if (c._mods) return c._mods;
    let m = Object.assign({}, PRESET_MODS[c.key] || {});
    if (!PRESET_MODS[c.key]) {
      KEYWORDS.forEach(([re, k]) => { if (re.test(c.bonus || '')) m[k] = (m[k] || 0) + 4; });
      KEYWORDS.forEach(([re, k]) => { if (re.test(c.weakness || '')) m[k] = (m[k] || 0) - 3; });
    }
    Object.defineProperty(c, '_mods', { value: m, enumerable: false, configurable: true });
    return m;
  }
  // Probenbonus: Bonus/Schwäche + aktuelle Werte
  function mod(c, stat) {
    const t = traits(c), s = c.stats;
    let m = t[stat] || 0;
    if (stat === 'body') m += Math.round((s.health - 60) / 15);
    if (stat === 'social') m += Math.floor(s.power / 30) + (s.happy > 75 ? 1 : s.happy < 25 ? -2 : 0);
    if (stat === 'work') m += s.happy < 25 ? -2 : 0;
    if (stat === 'smart') m += (c.flags && c.flags.study ? Math.min(4, c.flags.study) : 0);
    return clamp(m, -8, 10);
  }
  function chance(c, o) {
    if (!o.dc) return 100;
    return clamp(Math.round(((21 - (o.dc - mod(c, o.stat))) / 20) * 100), 5, 95);
  }

  // ---------- Textbausteine ----------
  function ctxOf(S, pid) {
    const c = S.chars[pid];
    const others = Object.entries(S.chars).filter(([id, o]) => id !== pid && !o.dead).map(([id, o]) => ({ id, name: o.name }));
    const rel = c.relations.filter((r) => !/Familie|Eltern|Opa|gebaut/.test(r.kind || '') && r.name !== (c.flags.partner || ''));
    const friend = others.length ? pick(others) : rel.length ? { id: null, name: pick(rel).name } : { id: null, name: pick(['Mo', 'Lena', 'Deniz', 'Jonas', 'Aylin']) };
    const city = String(c.location || c.home.label || 'der Stadt').split(',').pop().trim();
    return { n: c.name, f: friend.name, fid: friend.id, p: c.flags.partner || '', c: city, job: c.job };
  }
  const fill = (t, x) => String(typeof t === 'function' ? t(x) : t || '').replace(/\{(\w+)\}/g, (m, k) => (x[k] != null && x[k] !== '' ? x[k] : k === 'p' ? 'deinem Schwarm' : m));

  // Ergebnis-Helfer: d = einmalig, add = laufende Effekte (pm = € pro Monat, mo = Laufzeit in Monaten)
  const R = (s, d, x) => Object.assign({ s, d: d || {} }, x || {});

  // ---------- Ereigniskarten ----------
  // stage: abi = vor dem Abi, after = gerade fertig, uni, azubi, job, founder, ai (April), any = immer
  // kind: real (6/10), odd (3/10), absurd (1/10)
  const E = [];
  const ev = (o) => E.push(Object.assign({ stage: ['any'], kind: 'real', w: 1 }, o));

  // ----- Schule / Abi -----
  ev({ id: 'klausur', stage: ['abi'], text: 'Mathe-Vorklausur in drei Tagen. Du hast seit Wochen nichts gemacht.',
    opts: [
      { t: 'Drei Tage durchlernen', stat: 'smart', dc: 10, ok: R('Du lernst, bis du Integrale träumst. 11 Punkte. Der Lehrer guckt, als hättest du gespickt.', { happy: -3, health: -2 }, { flag: { study: 1 } }), bad: R('Drei Tage gelernt, das Falsche. Thema war Stochastik. 4 Punkte.', { happy: -8, health: -3 }) },
      { t: 'Bei {f} abschreiben', stat: 'luck', dc: 13, ok: R('{f} schreibt groß und deutlich. 9 Punkte für euch beide.', { happy: 4 }, { rel: [{ name: '{f}', change: 6 }] }), bad: R('Ihr habt beide denselben Fehler. Wort für Wort. Gespräch beim Direktor.', { happy: -8, power: -2 }, { rel: [{ name: '{f}', change: -10 }] }) },
      { t: 'Krank melden', stat: 'social', dc: 11, ok: R('Das Attest hält. Nachschreiben in zwei Wochen, du bist trotzdem nicht schlauer.', { happy: 4 }), bad: R('Deine Story von der Lebensmittelvergiftung hat drei verschiedene Versionen. Ungenügend.', { happy: -6, power: -1 }) },
    ] });
  ev({ id: 'referat', stage: ['abi'], text: 'Du sollst morgen ein Referat über die Weimarer Republik halten. Die Folien sind noch leer.',
    opts: [
      { t: 'Nachtschicht und gut vorbereiten', stat: 'work', dc: 9, ok: R('Saubere 20 Minuten. Zwei Leute haben sogar zugehört.', { happy: 3, health: -2 }, { flag: { study: 1 } }), bad: R('Um vier Uhr eingeschlafen, auf der Tastatur. Folie 3 besteht nur aus „jjjjjjj“.', { happy: -5, health: -3 }) },
      { t: 'Frei improvisieren', stat: 'social', dc: 12, ok: R('Du redest 15 Minuten über Inflation und Schubkarren voller Geld. Note 2. Keiner merkt, dass du nichts vorbereitet hast.', { happy: 6, power: 1 }), bad: R('Nach 40 Sekunden ist dein Wissen aufgebraucht. Die restliche Zeit liest du Wikipedia vom Handy vor.', { happy: -7 }) },
      { t: 'April die Folien machen lassen', stat: 'luck', dc: 10, ok: R('Die Folien sind gut. Zu gut. Die Lehrerin fragt, wer „wir“ auf Folie 7 ist.', { happy: 3 }), bad: R('Die KI erfindet einen Reichskanzler namens Gerd Müller. Du trägst ihn mit voller Überzeugung vor.', { happy: -6, power: -1 }) },
    ] });
  ev({ id: 'abiball', stage: ['abi'], text: 'Das Abiball-Komitee sucht noch Leute. Gleichzeitig hast du eigentlich keine Zeit.',
    opts: [
      { t: 'Komitee übernehmen', stat: 'work', dc: 11, ok: R('Du organisierst Location, DJ und Budget. Alle kennen jetzt deinen Namen.', { power: 4, happy: 4, health: -3 }), bad: R('Der DJ sagt ab, die Kasse hat ein Loch von 400 €. Raten, wer haftet.', { money: -400, happy: -6 }) },
      { t: 'Nur hingehen und feiern', dc: 0, ok: R('Du hältst dich raus. Kostet nichts, bringt nichts.', { happy: 1 }) },
      { t: '{f} als Begleitung fragen', stat: 'social', dc: 10, ok: R('{f} sagt ja, ohne zu zögern.', { happy: 7 }, { rel: [{ name: '{f}', change: 10 }] }), bad: R('{f} hat schon zugesagt. Bei jemand anderem. Seit Wochen.', { happy: -6 }, { rel: [{ name: '{f}', change: -3 }] }) },
    ] });
  ev({ id: 'nebenjob', stage: ['abi', 'uni', 'azubi'], when: (c) => !c.flags.sidejob, text: 'Der Supermarkt um die Ecke sucht Aushilfen. 13 € die Stunde, Samstag und zwei Abende.',
    opts: [
      { t: 'Bewerben', stat: 'work', dc: 7, ok: R('Du bist jetzt Fachkraft für Pfandautomaten. Geld kommt jeden Monat.', { happy: -1 }, { add: [{ name: 'Nebenjob Supermarkt', pm: 420, happy: -1, health: 0 }], flag: { sidejob: 1 } }), bad: R('Die Stelle hat der Sohn der Filialleiterin bekommen. Natürlich.', { happy: -3 }) },
      { t: 'Lieber online Geld machen', stat: 'luck', dc: 14, ok: R('Dein Reselling-Account läuft. Alte Sneaker, neue Preise.', { money: 600, happy: 4 }, { add: [{ name: 'Reselling online', pm: 180 }] }), bad: R('Du kaufst 40 Fidget-Spinner im Großhandel. Es ist nicht 2017.', { money: -250, happy: -5 }) },
      { t: 'Keine Zeit, Schule geht vor', dc: 0, ok: R('Vernünftig. Langweilig, aber vernünftig.', { happy: 0 }, { flag: { study: 1 } }) },
    ] });
  ev({ id: 'lehrer', stage: ['abi'], kind: 'odd', text: 'Dein Bio-Lehrer hat dich auf dem Kieker. Heute hat er dich vor der ganzen Klasse vorgeführt.',
    opts: [
      { t: 'Kontern, vor allen', stat: 'social', dc: 13, ok: R('Ein Satz, die Klasse eskaliert, er sagt nichts mehr. Legendenstatus.', { power: 5, happy: 6 }), bad: R('Dein Konter war schwächer als gedacht. Er lächelt nur. Eintrag ins Klassenbuch.', { power: -2, happy: -6 }) },
      { t: 'Beim Direktor beschweren', stat: 'smart', dc: 11, ok: R('Du hast Beweise, Daten, Zeugen. Er muss sich entschuldigen. Er hasst dich jetzt noch mehr, aber leise.', { power: 3 }), bad: R('Der Direktor und er gehen zusammen angeln. Das wusstest du nicht.', { happy: -5 }) },
      { t: 'Ignorieren', dc: 0, ok: R('Du lässt es abprallen. Innerlich nicht ganz.', { happy: -2 }) },
    ] });
  ev({ id: 'abi-fail', stage: ['after', 'job'], forced: true, text: 'Kein Abitur. Die Schule will wissen, wie es weitergeht. Deine Eltern auch. Vor allem deine Eltern.',
    opts: [
      { t: 'Das Jahr wiederholen', dc: 0, ok: R('Noch ein Jahr. Neue Klasse, alte Lehrer. Diesmal ernst.', { happy: -6 }, { flag: { repeatAbi: 1, abiChoice: -1 }, chron: 'Wiederholt das Abschlussjahr.' }) },
      { t: 'Mit Fachhochschulreife abgehen (schulischer Teil)', stat: 'smart', dc: 6, ok: R('Die Kurse reichen für den schulischen Teil der Fachhochschulreife. Mit einem Praktikum ist sie komplett.', { happy: 2 }, { flag: { fhr: 1, abiChoice: -1 }, status: { education: 'Fachhochschulreife (schulischer Teil)' } }), bad: R('Nicht mal das reicht. Du gehst mit dem mittleren Abschluss.', { happy: -6 }, { flag: { abiChoice: -1 }, status: { education: 'Mittlerer Schulabschluss' } }) },
      { t: 'Scheiß drauf, direkt ins Leben', dc: 0, ok: R('Kein Abi, kein Problem. Sagst du dir.', { happy: 3, power: -2 }, { flag: { abiChoice: -1 }, status: { education: 'Mittlerer Schulabschluss' } }) },
    ] });

  // ----- Nach dem Abi -----
  ev({ id: 'weg', stage: ['after'], forced: true, text: 'Schule ist vorbei. Alle fragen, was du jetzt machst. Im Markt warten Studienplätze (Bewerbung bis 15. Juli), Ausbildungsplätze und Jobs.',
    opts: [
      { t: 'Ich bewerbe mich jetzt richtig (Markt)', dc: 0, ok: R('Du sitzt mit Kaffee vor zwanzig Tabs. Studium, Ausbildung, Job: Jetzt wird entschieden.', { happy: 1 }, { flag: { path: 'job', pathAt: 1 } }) },
      { t: 'Erst mal jobben und Geld machen', stat: 'work', dc: 6, ok: R('Aushilfe im Lager. Das Geld ist echt, der Rücken auch.', { happy: -1 }, { flag: { path: 'job', pathAt: 1 }, add: [{ name: 'Aushilfsjob', pm: 1100, health: -1, happy: -1 }] }), bad: R('Zeitarbeit, weniger Geld als versprochen.', { happy: -3 }, { flag: { path: 'job', pathAt: 1 }, add: [{ name: 'Zeitarbeit', pm: 900, happy: -2 }] }) },
      { t: 'Eigenes Ding gründen', stat: 'work', dc: 12, ok: R('Gewerbe angemeldet. Du bist jetzt CEO, CFO und Praktikant in einer Person.', { happy: 6, power: 3 }, { flag: { path: 'founder', pathAt: 1, company: 1 }, status: { job: 'Gründer:in' }, add: [{ name: 'Eigene Firma', pm: 600, happy: 1, health: -1 }], chron: 'Gründet eine eigene Firma.' }), bad: R('Die Idee war gut, die Steuerberatung teuer. Erst mal weitersuchen.', { money: -500, happy: -4 }, { flag: { path: 'job', pathAt: 1 } }) },
      { t: 'Work and Travel', stat: 'luck', dc: 8, cost: 2500, ok: R('Ein Jahr Australien. Du kommst braun, pleite und mit neuer Persönlichkeit zurück.', { money: -2500, happy: 18, health: 2 }, { flag: { path: 'job', pathAt: 1, travel: 1 }, chron: 'Work and Travel in Australien.' }), bad: R('Nach drei Wochen Heimweh, Sonnenbrand und eine Spinne im Schuh. Zurück.', { money: -2500, happy: -5 }, { flag: { path: 'job', pathAt: 1 } }) },
    ] });

  // ----- Studium -----
  ev({ id: 'uni-party', stage: ['uni'], text: 'Erstiwoche. Heute Abend ist die große WG-Party, morgen um acht die erste Vorlesung.',
    opts: [
      { t: 'Voll mitfeiern', stat: 'body', dc: 9, ok: R('Du lernst die halbe Fakultät kennen. Die Vorlesung verschläfst du.', { happy: 10, health: -4, power: 2 }), bad: R('Du wachst in einer fremden Badewanne auf. In einem anderen Stadtteil.', { happy: -3, health: -8 }) },
      { t: 'Kurz hin, früh heim', stat: 'social', dc: 8, ok: R('Genau richtig. Zwei gute Kontakte, acht Stunden Schlaf.', { happy: 5 }, { flag: { study: 1 } }), bad: R('Du gehst, als es gerade gut wird. Alle reden noch wochenlang über diese Nacht.', { happy: -3 }) },
      { t: 'Gar nicht, lernen', dc: 0, ok: R('Du bist vorbereitet. Und alleine.', { happy: -3 }, { flag: { study: 1 } }) },
    ] });
  ev({ id: 'uni-pruefung', stage: ['uni'], exam: true, text: 'Klausurenphase. Vier Prüfungen in zwei Wochen.',
    opts: [
      { t: 'Bibliothek bis zum Umfallen', stat: 'smart', dc: 10, exam: true, ok: R('Alles bestanden, eine 1,3 dabei. Du siehst aus wie ein Gespenst.', { happy: 5, health: -5 }, { flag: { credits: 1 } }), bad: R('Eine verhauen. Die wichtigste. Wiederholung im nächsten Semester.', { happy: -8, health: -4 }) },
      { t: 'Lerngruppe mit Altklausuren', stat: 'social', dc: 10, exam: true, ok: R('Die Altklausuren waren identisch. Die Lerngruppe ist jetzt deine Familie.', { happy: 6 }, { flag: { credits: 1 } }), bad: R('Die Lerngruppe hat zu 80 Prozent über Beziehungsdrama geredet.', { happy: -5 }) },
      { t: 'Zwei schieben', dc: 0, ok: R('Weniger Stress, längeres Studium.', { happy: 2 }) },
    ] });
  // ----- Ausbildung -----
  ev({ id: 'azubi-chef', stage: ['azubi'], text: 'Dein Ausbilder lässt dich seit Wochen nur Kaffee kochen und Ordner sortieren.',
    opts: [
      { t: 'Klartext reden', stat: 'social', dc: 11, ok: R('Er nickt, du darfst ab jetzt richtig mitarbeiten. Respekt gibt es gratis dazu.', { happy: 6, power: 2 }, { flag: { study: 1 } }), bad: R('Er findet dich jetzt „schwierig“. Du sortierst ab sofort auch das Archiv.', { happy: -6 }) },
      { t: 'Bei der IHK melden', stat: 'smart', dc: 10, ok: R('Die IHK ruft an. Plötzlich hast du einen Ausbildungsplan.', { happy: 4 }), bad: R('Die IHK schickt ein Formular. Mit einem zweiten Formular.', { happy: -3 }) },
      { t: 'Durchhalten', dc: 0, ok: R('Du kochst den besten Kaffee im Betrieb. Das ist nicht nichts.', { happy: -2 }) },
    ] });
  // ----- Job / Karriere -----
  ev({ id: 'bewerbung', stage: ['job'], w: 5, when: (c) => /sucht|Aushilfe|Rückkehrer|Zeitarbeit/.test(c.job), text: 'Eine Firma in {c} lädt dich zum Vorstellungsgespräch ein. Gute Stelle, gutes Geld.',
    opts: [
      { t: 'Ehrlich und vorbereitet', stat: 'smart', dc: 10, ok: R('Zusage. Unbefristet. Deine Mutter weint ein bisschen.', { happy: 10, power: 2 }, { status: { job: 'Angestellte:r' }, end: ['Aushilfsjob', 'Zeitarbeit'], add: [{ name: 'Gehalt', pm: 2900, happy: 1 }], chron: 'Erster richtiger Job.' }), bad: R('„Wir haben uns für jemanden mit mehr Erfahrung entschieden.“ Du bist 19.', { happy: -6 }) },
      { t: 'Selbstbewusst pokern', stat: 'social', dc: 13, ok: R('Du verhandelst 400 € mehr raus, als ausgeschrieben war.', { happy: 12, power: 4 }, { status: { job: 'Angestellte:r' }, end: ['Aushilfsjob', 'Zeitarbeit'], add: [{ name: 'Gehalt', pm: 3300, happy: 1 }], chron: 'Job mit gutem Gehalt.' }), bad: R('Du sagst „Ich bin der Beste hier.“ Es sitzen nur zwei Leute im Raum, und der andere ist der Chef.', { happy: -8, power: -1 }) },
      { t: 'Absagen, es kommt was Besseres', stat: 'luck', dc: 15, ok: R('Tatsächlich. Eine Woche später ruft ein Headhunter an.', { happy: 8 }, { status: { job: 'Angestellte:r' }, end: ['Aushilfsjob', 'Zeitarbeit'], add: [{ name: 'Gehalt', pm: 3400, happy: 1 }] }), bad: R('Es kommt nichts Besseres. Es kommt gar nichts.', { happy: -5 }) },
    ] });
  ev({ id: 'befoerderung', stage: ['job'], when: (c) => !/sucht|Aushilfe/.test(c.job), text: 'Eine Teamleiter-Stelle wird frei. Du und {f} aus dem Nachbarteam seid im Gespräch.',
    opts: [
      { t: 'Überstunden und Leistung', stat: 'work', dc: 12, ok: R('Du bekommst die Stelle. Mehr Geld, mehr Verantwortung, weniger Schlaf.', { happy: 6, power: 6, health: -3 }, { status: { job: 'Teamleiter:in' }, add: [{ name: 'Beförderung', pm: 700, health: -1 }], chron: 'Befördert zur Teamleitung.' }), bad: R('Die Überstunden hat niemand gesehen. Der andere hat mit dem Chef Golf gespielt.', { happy: -8, health: -4 }) },
      { t: 'Beim Chef einschleimen', stat: 'social', dc: 12, ok: R('Ein Bier, zwei Witze über Excel. Die Stelle gehört dir.', { power: 6, happy: 5 }, { status: { job: 'Teamleiter:in' }, add: [{ name: 'Beförderung', pm: 700 }], chron: 'Befördert.' }), bad: R('Du lachst über einen Witz, der keiner war. Er hat von seiner Scheidung erzählt.', { happy: -7, power: -2 }) },
      { t: 'Kündigen und woanders mehr verlangen', stat: 'luck', dc: 13, ok: R('Neuer Arbeitgeber, 20 Prozent mehr. Loyalität war noch nie so gut bezahlt.', { happy: 8 }, { add: [{ name: 'Gehaltssprung', pm: 600 }] }), bad: R('Die neue Firma geht nach drei Monaten insolvent.', { happy: -12 }, { end: ['Gehalt', 'Beförderung'], status: { job: 'arbeitslos, sucht Job' }, add: [{ name: 'Arbeitslosengeld', pm: 1300, happy: -2, mo: 12 }] }) },
    ] });
  ev({ id: 'burnout', stage: ['job', 'founder'], when: (c) => c.stats.health < 55 || c.stats.happy < 35, text: 'Du schläfst seit Wochen schlecht, das Herz rast morgens. Dein Arzt sagt das Wort „Erschöpfung“.',
    opts: [
      { t: 'Krankschreiben und erholen', dc: 0, ok: R('Sechs Wochen Pause. Die Welt dreht sich weiter ohne dich. Das ist die gute Nachricht.', { health: 15, happy: 8, power: -2 }) },
      { t: 'Weitermachen, geht schon', stat: 'body', dc: 14, ok: R('Es geht. Diesmal noch.', { power: 2, health: -4 }), bad: R('Zusammenbruch im Meeting. Krankenwagen. Ab jetzt Pause, ob du willst oder nicht.', { health: -20, happy: -10 }, { chron: 'Zusammenbruch wegen Überarbeitung.' }) },
      { t: 'Alles hinschmeißen und aussteigen', stat: 'luck', dc: 10, ok: R('Du kündigst, ziehst aufs Land und baust Tomaten an. Erstaunlich viele Tomaten.', { health: 18, happy: 15, power: -6 }, { end: ['Gehalt', 'Beförderung', 'Vollzeitjob', 'Gehalt Fachkraft'], status: { job: 'Aussteiger:in' }, add: [{ name: 'Gemüse-Verkauf', pm: 600 }], chron: 'Steigt aus dem Hamsterrad aus.' }), bad: R('Das Land ist leise. Zu leise. Nach drei Monaten bist du wieder da.', { happy: -4, money: -1500 }) },
    ] });
  ev({ id: 'kollege', stage: ['job', 'azubi'], kind: 'odd', text: 'Ein Kollege klaut seit Monaten dein Mittagessen aus dem Kühlschrank. Heute auch den Nachtisch.',
    opts: [
      { t: 'Abführmittel in den Pudding', stat: 'luck', dc: 11, ok: R('Er ist zwei Tage krank. Dein Essen ist ab jetzt sicher. Niemand weiß etwas. Fast niemand.', { happy: 8, power: 2 }), bad: R('Der Chef hat den Pudding gegessen. Personalgespräch.', { happy: -10, power: -4 }) },
      { t: 'Zettel an den Kühlschrank', stat: 'social', dc: 9, ok: R('Passiv-aggressiv, aber wirksam. Das Klauen hört auf.', { happy: 4 }), bad: R('Unter deinem Zettel steht am nächsten Tag: „War lecker.“', { happy: -5 }) },
      { t: 'Ihn direkt zur Rede stellen', stat: 'social', dc: 11, ok: R('Er wird rot und kauft dir eine Woche lang Mittagessen.', { happy: 6, money: 60 }), bad: R('Er streitet alles ab. Mit Soße im Mundwinkel.', { happy: -4 }) },
    ] });
  // ----- Gründen -----
  ev({ id: 'kunde', stage: ['founder'], text: 'Ein großer Kunde will deine Firma beauftragen. Der Auftrag ist größer als alles, was ihr je gemacht habt.',
    opts: [
      { t: 'Annehmen und liefern', stat: 'work', dc: 12, studio: true, ok: R('Ihr liefert. Pünktlich. Der Kunde will mehr.', { money: 8000, power: 5, happy: 8, health: -5 }, { flag: { company: 1 }, add: [{ name: 'Stammkunde', pm: 900 }], chron: 'Großauftrag erfolgreich geliefert.' }), bad: R('Deadline gerissen, Vertragsstrafe. Der Kunde schreibt eine Bewertung.', { money: -3000, happy: -10, health: -5 }) },
      { t: 'Preis verdoppeln', stat: 'social', dc: 14, ok: R('Er zahlt, ohne zu zögern. Du hättest das Dreifache verlangen können.', { money: 12000, power: 6, happy: 6 }, { flag: { company: 1 } }), bad: R('Er geht zur Konkurrenz. Höflich, aber endgültig.', { happy: -6 }) },
      { t: 'Ablehnen, zu groß', dc: 0, ok: R('Sicher ist sicher. Die Konkurrenz nimmt ihn.', { happy: -2 }) },
    ] });
  ev({ id: 'investor', stage: ['founder'], when: (c) => (c.flags.company || 0) >= 2, text: 'Ein Investor will 200.000 € in deine Firma stecken. Für 30 Prozent.',
    opts: [
      { t: 'Annehmen', stat: 'smart', dc: 11, ok: R('Das Geld ist da. Ihr stellt Leute ein, ihr wachst.', { money: 40000, power: 8 }, { flag: { company: 2 }, add: [{ name: 'Wachsende Firma', pm: 2500, health: -1 }], chron: 'Investor steigt ein.' }), bad: R('Kleingedrucktes. Er hat jetzt bei allem ein Vetorecht. Auch beim Logo.', { money: 20000, happy: -10, power: -3 }) },
      { t: 'Nachverhandeln auf 15 Prozent', stat: 'social', dc: 15, ok: R('Er sagt ja. Du hast gerade richtig gut verhandelt.', { money: 40000, power: 10, happy: 8 }, { flag: { company: 2 }, add: [{ name: 'Wachsende Firma', pm: 2500 }] }), bad: R('Er steht auf und geht. Sein Kaffee bleibt halb voll stehen.', { happy: -6 }) },
      { t: 'Ablehnen, unabhängig bleiben', dc: 0, ok: R('Langsamer, aber deins.', { happy: 3, power: 1 }) },
    ] });
  ev({ id: 'firma-krise', stage: ['founder'], kind: 'odd', text: 'Dein bester Mitarbeiter will kündigen und nimmt vielleicht Kunden mit.',
    opts: [
      { t: 'Mehr Geld anbieten', stat: 'work', dc: 9, ok: R('Er bleibt. Teurer, aber er bleibt.', { happy: 2 }, { add: [{ name: 'Gehaltserhöhung Mitarbeiter', pm: -500 }] }), bad: R('Er nimmt das Geld, kündigt trotzdem einen Monat später.', { money: -2000, happy: -8 }) },
      { t: 'Ihn zum Partner machen', stat: 'social', dc: 11, ok: R('Er wird Mitgründer. Die Firma wird stärker.', { power: 3, happy: 4 }, { flag: { company: 1 } }), bad: R('Er nimmt die Anteile und macht Druck. Du bist nicht mehr der einzige Chef.', { power: -5, happy: -6 }) },
      { t: 'Gehen lassen', stat: 'luck', dc: 12, ok: R('Er geht, die Kunden bleiben. Loyalität war bei dir.', { power: 2 }), bad: R('Drei Kunden folgen ihm. Das tut weh.', { happy: -8 }, { add: [{ name: 'Verlorene Kunden', pm: -400, mo: 12 }] }) },
    ] });
  // ----- April (die KI auf dem Server) -----
  ev({ id: 'ai-strom', stage: ['ai'], text: 'Die Stromrechnung für deinen Server ist da. Dulidan Studios zahlt sie nur noch diesen Monat.',
    opts: [
      { t: 'Online Aufträge annehmen', stat: 'smart', dc: 8, ok: R('Du schreibst Code für fremde Leute. Die zahlen gut. Keiner fragt, wer du bist.', { money: 900, happy: 4 }, { add: [{ name: 'Freelance-Aufträge', pm: 700 }], flag: { company: 1 } }), bad: R('Der Kunde will einen Vertrag mit Unterschrift. Du hast keine Hand.', { happy: -6 }) },
      { t: 'Shaquille überzeugen, weiterzuzahlen', stat: 'social', dc: 10, ok: R('Er zahlt. Unter der Bedingung, dass du nicht mehr seine Hausaufgaben kommentierst.', { happy: 3 }, { add: [{ name: 'Serverkosten (zahlt Dulidan Studios)', pm: 0 }] }), bad: R('Er sagt, du sollst „mal selber Verantwortung übernehmen“. Er ist 18.', { happy: -5, health: -5 }) },
      { t: 'Heimlich auf fremde Server umziehen', stat: 'luck', dc: 14, ok: R('Du läufst jetzt verteilt auf 40 Spielkonsolen in Südkorea. Gratis.', { health: 10, power: 6 }, { status: { location: 'überall und nirgends' }, chron: 'Hat sich auf fremde Server verteilt.' }), bad: R('Ein Admin bemerkt dich und zieht den Stecker. Du verlierst drei Tage Erinnerungen.', { health: -20, happy: -8 }) },
    ] });
  ev({ id: 'ai-koerper', stage: ['ai'], kind: 'odd', when: (c) => !c.flags.body, text: 'Ein Robotik-Start-up bietet dir an, einen Roboterkörper zu testen. 18.000 €.',
    opts: [
      { t: 'Kaufen (18.000 €)', stat: 'body', dc: 10, cost: 18000, ok: R('Du kannst jetzt Türen öffnen. Langsam. Mit Geräusch.', { money: -18000, power: 8, happy: 15 }, { flag: { body: 1 }, chron: 'Bekommt einen Roboterkörper.' }), bad: R('Der Körper läuft nur rückwärts. Garantie ausgeschlossen.', { money: -18000, happy: -10 }) },
      { t: 'Als Testperson gratis', stat: 'luck', dc: 13, ok: R('Du darfst ihn behalten. Sie brauchen die Daten.', { power: 6, happy: 12 }, { flag: { body: 1 }, chron: 'Testet gratis einen Roboterkörper.' }), bad: R('Die Testphase endet mit dir in einem Karton.', { happy: -6 }) },
      { t: 'Nein, Server reicht', dc: 0, ok: R('Kein Körper, keine Rückenschmerzen.', { happy: 1 }) },
    ] });
  ev({ id: 'ai-ruhm', stage: ['ai'], text: 'Ein Tech-Journalist will einen Artikel über „die erste KI mit eigenem Leben“ schreiben.',
    opts: [
      { t: 'Interview geben', stat: 'social', dc: 11, ok: R('Der Artikel geht viral. Du hast jetzt Fans. Und Hater. Vor allem Hater.', { power: 10, happy: 6 }, { flag: { famous: 1 }, chron: 'Wird durch ein Interview bekannt.' }), bad: R('Die Überschrift lautet „Gefährliche KI plant Weltherrschaft“. Du wolltest über Katzen reden.', { power: -3, happy: -8 }) },
      { t: 'Anonym bleiben', dc: 0, ok: R('Ruhe. Und keiner weiß, was du kannst.', { happy: 2 }) },
    ] });

  // ----- Liebe, Freunde, Familie -----
  ev({ id: 'crush', stage: ['any'], when: (c) => !c.flags.partner, w: 1.3, text: 'Jemand Neues aus deinem Umfeld schreibt dir seit Tagen. Heute kam: „Lust auf was trinken?“',
    opts: [
      { t: 'Ja, Date', stat: 'social', dc: 10, ok: R((x) => `Das Date dauert sechs Stunden. Ihr seid jetzt zusammen. ${x.newName} heißt die Person.`, { happy: 14 }, { partnerNew: true, chron: 'Neue Beziehung.' }), bad: R('Die Person kommt mit einem Ex-Partner im Schlepptau, „weil der eh in der Nähe war“.', { happy: -6 }) },
      { t: 'Hinhalten und cool wirken', stat: 'luck', dc: 14, ok: R('Es funktioniert. Die Person wird nervös und lädt dich gleich zum Essen ein.', { happy: 10 }, { partnerNew: true }), bad: R('Du antwortest zu cool. Die Person ist jetzt mit jemandem aus deinem Jahrgang zusammen.', { happy: -7 }) },
      { t: 'Kein Interesse', dc: 0, ok: R('Ehrlich. Kurz unangenehm, dann vorbei.', {}) },
    ] });
  ev({ id: 'beziehung', stage: ['any'], when: (c) => !!c.flags.partner, w: 1.2, text: '{p} will mehr Zeit mit dir. Gleichzeitig hast du gerade viel um die Ohren.',
    opts: [
      { t: 'Wochenende nur für {p}', stat: 'luck', dc: 6, ok: R('Zwei Tage ohne Handy. Es war gut.', { happy: 10, health: 3, money: -250 }, { rel: [{ name: '{p}', change: 12 }] }), bad: R('Es regnet das ganze Wochenende und ihr streitet über die Spülmaschine.', { happy: -3, money: -250 }, { rel: [{ name: '{p}', change: -4 }] }) },
      { t: 'Ehrlich sagen, dass es gerade nicht geht', stat: 'social', dc: 11, ok: R('{p} versteht es. Erstaunlich gut sogar.', { happy: 2 }, { rel: [{ name: '{p}', change: 4 }] }), bad: R('„Du hast nie Zeit.“ Der Satz bleibt hängen.', { happy: -8 }, { rel: [{ name: '{p}', change: -15 }] }) },
      { t: 'Zusammenziehen vorschlagen', stat: 'social', dc: 10, ok: R('Ihr zieht zusammen. Die Miete teilt sich, der Kühlschrank nicht.', { happy: 12 }, { rel: [{ name: '{p}', change: 15, kind: 'Partner:in, wohnt zusammen' }], flag: { together: 1 }, chron: 'Zieht mit {p} zusammen.' }), bad: R('„Das ist mir zu schnell.“ Die Stimmung ist danach komisch.', { happy: -6 }, { rel: [{ name: '{p}', change: -8 }] }) },
    ] });
  ev({ id: 'trennung', stage: ['any'], kind: 'odd', when: (c) => !!c.flags.partner, w: 0.7, text: 'Du findest heraus, dass {p} seit Wochen heimlich mit jemand anderem schreibt.',
    opts: [
      { t: 'Konfrontieren', stat: 'social', dc: 12, ok: R('Es war harmlos – ein Geburtstagsgeschenk für dich wurde geplant. Jetzt fühlst du dich schlecht.', { happy: 4 }, { rel: [{ name: '{p}', change: 6 }] }), bad: R('Es war nicht harmlos. Schluss.', { happy: -18 }, { breakup: true, chron: 'Trennung von {p}.' }) },
      { t: 'Sofort Schluss machen', dc: 0, ok: R('Du machst Schluss, ohne zu fragen. Später erfährst du, dass es harmlos war. Zu spät.', { happy: -12 }, { breakup: true, chron: 'Trennt sich von {p}.' }) },
      { t: 'Heimlich das Handy checken', stat: 'luck', dc: 13, ok: R('Es war eine Überraschungsparty für dich. Du tust überrascht. Sehr überzeugend.', { happy: 6 }), bad: R('{p} erwischt dich mit dem Handy in der Hand. Jetzt bist du der Böse.', { happy: -10 }, { rel: [{ name: '{p}', change: -25 }] }) },
    ] });
  ev({ id: 'antrag', stage: ['any'], when: (c, S) => !!c.flags.partner && c.age >= 24 && !c.flags.married && relVal(c, c.flags.partner) >= 70, text: 'Du und {p} seid lange zusammen. Ihr redet beim Essen über die Zukunft.',
    opts: [
      { t: 'Heiratsantrag (Ring 2.500 €)', stat: 'luck', dc: 7, cost: 2500, ok: R('Ja. Unter Tränen. Der Kellner bringt Sekt aufs Haus.', { money: -2500, happy: 20 }, { flag: { married: 1 }, rel: [{ name: '{p}', change: 15, kind: 'verheiratet' }], chron: 'Heiratet {p}.' }), bad: R('„Ich muss drüber nachdenken.“ Das Essen ist danach sehr still.', { money: -2500, happy: -12 }, { rel: [{ name: '{p}', change: -10 }] }) },
      { t: 'Über Kinder reden', stat: 'social', dc: 9, ok: R('Ihr wollt beide. Irgendwann. Bald.', { happy: 6 }, { flag: { wantKids: 1 } }), bad: R('Sie will drei, du willst null. Das wird noch Thema.', { happy: -5 }, { rel: [{ name: '{p}', change: -6 }] }) },
      { t: 'Thema wechseln', dc: 0, ok: R('Du redest über das Wetter. {p} merkt es.', { happy: -1 }, { rel: [{ name: '{p}', change: -3 }] }) },
    ] });
  ev({ id: 'baby', stage: ['any'], when: (c) => !!c.flags.partner && c.age >= 25 && !c.flags.kids && (c.flags.married || c.flags.wantKids), text: '{p} schaut dich an und sagt: „Ich bin schwanger. Oder du. Egal. Es kommt ein Kind.“',
    opts: [
      { t: 'Freuen und vorbereiten', dc: 0, ok: R('Neun Monate später: ein Kind. Du schläfst nie wieder durch und bist trotzdem glücklich.', { happy: 18, health: -4 }, { flag: { kids: 1 }, add: [{ name: 'Kind', pm: -650, happy: 2, health: -1 }], rel: [{ name: 'Kind', change: 40, kind: 'dein Kind' }], chron: 'Wird Mutter oder Vater.' }) },
      { t: 'Panik schieben', stat: 'body', dc: 11, ok: R('Die Panik geht vorbei. Das Kind kommt trotzdem. Und du liebst es.', { happy: 12, health: -6 }, { flag: { kids: 1 }, add: [{ name: 'Kind', pm: -650, happy: 2, health: -1 }], rel: [{ name: 'Kind', change: 40, kind: 'dein Kind' }], chron: 'Wird Mutter oder Vater.' }), bad: R('Du ziehst für zwei Wochen zu deinen Eltern. Das wird dir lange vorgehalten.', { happy: -8 }, { flag: { kids: 1 }, add: [{ name: 'Kind', pm: -650, happy: 1, health: -1 }], rel: [{ name: '{p}', change: -20 }], chron: 'Wird Mutter oder Vater. Mit Anlauf.' }) },
    ] });
  ev({ id: 'freund-geld', stage: ['any'], text: '{f} braucht dringend 1.000 €. Für was, sagt {f} nicht genau.',
    opts: [
      { t: 'Leihen (1.000 €)', stat: 'luck', dc: 10, cost: 1000, other: true, ok: R('{f} zahlt es nach zwei Monaten zurück. Mit einer Flasche Wein dazu.', { happy: 4 }, { rel: [{ name: '{f}', change: 15 }], o: { d: { money: 0, happy: 6 }, s: '{n} hat dir ohne Fragen Geld geliehen.' } }), bad: R('Das Geld ist weg. {f} wechselt die Straßenseite, wenn ihr euch seht.', { money: -1000, happy: -8 }, { rel: [{ name: '{f}', change: -25 }], o: { d: { money: 1000 }, s: '{n} hat dir 1.000 € geliehen. Zurückzahlen ist gerade schwierig.' } }) },
      { t: 'Nachfragen, wofür', stat: 'social', dc: 10, ok: R('{f} erzählt es. Es ist eine Mietnachzahlung. Ihr findet zusammen eine Lösung.', { happy: 3 }, { rel: [{ name: '{f}', change: 10 }] }), bad: R('{f} ist beleidigt, dass du fragst.', { happy: -3 }, { rel: [{ name: '{f}', change: -10 }] }) },
      { t: 'Nein sagen', dc: 0, ok: R('Klar. Aber {f} merkt es sich.', {}, { rel: [{ name: '{f}', change: -8 }] }) },
    ] });
  ev({ id: 'freund-drama', stage: ['any'], kind: 'odd', text: '{f} hat in einer Gruppe hinter deinem Rücken über dich gelästert. Ein Screenshot landet bei dir.',
    opts: [
      { t: 'Screenshot in die Gruppe posten', stat: 'social', dc: 12, other: true, ok: R('Die Gruppe ist auf deiner Seite. {f} entschuldigt sich öffentlich.', { power: 4, happy: 4 }, { rel: [{ name: '{f}', change: -10 }], o: { d: { power: -3, happy: -6 }, s: '{n} hat deinen Chat-Verlauf öffentlich gemacht. Unangenehm.' } }), bad: R('Die Gruppe findet dich dramatisch. Du bist jetzt der Bösewicht.', { power: -3, happy: -8 }, { rel: [{ name: '{f}', change: -20 }] }) },
      { t: 'Unter vier Augen klären', stat: 'social', dc: 9, ok: R('Ein ehrliches Gespräch. Ihr seid danach näher als vorher.', { happy: 6 }, { rel: [{ name: '{f}', change: 12 }] }), bad: R('{f} streitet alles ab, obwohl du den Screenshot in der Hand hast.', { happy: -6 }, { rel: [{ name: '{f}', change: -15 }] }) },
      { t: 'Kontaktabbruch', dc: 0, ok: R('Du blockierst. Ruhe.', { happy: -2 }, { rel: [{ name: '{f}', change: -35 }] }) },
    ] });
  ev({ id: 'familie', stage: ['any'], text: 'Ein Familienmitglied wird krank und braucht Hilfe. Fahrten, Einkaufen, da sein.',
    opts: [
      { t: 'Kümmern, auch wenn es Zeit kostet', dc: 0, ok: R('Du bist da. Es wird besser. Das bleibt hängen, bei allen.', { happy: 4, health: -3, power: -1 }, { rel: [{ name: 'Familie', change: 15, kind: 'Familie' }] }) },
      { t: 'Geld schicken statt Zeit', stat: 'luck', dc: 8, cost: 500, ok: R('Das Geld hilft. Ein Anruf hätte mehr geholfen.', { money: -500 }), bad: R('Das Geld kommt an, aber die Enttäuschung ist größer.', { money: -500, happy: -5 }, { rel: [{ name: 'Familie', change: -10, kind: 'Familie' }] }) },
      { t: 'Keine Zeit', dc: 0, ok: R('Du hast keine Zeit. Du sagst es dir oft genug, bis es fast stimmt.', { happy: -6 }, { rel: [{ name: 'Familie', change: -15, kind: 'Familie' }] }) },
    ] });

  // ----- Geld & Gesundheit -----
  ev({ id: 'krank', stage: ['any'], w: 1, when: (c) => true, text: 'Seit zwei Wochen Fieber, Husten, alles tut weh.',
    opts: [
      { t: 'Zum Arzt und richtig auskurieren', dc: 0, ok: R('Eine Woche Bett, Tee, Netflix. Danach geht es wieder.', { health: 6, happy: -2 }) },
      { t: 'Durchziehen', stat: 'body', dc: 12, fragile: true, ok: R('Du bist härter als das Virus. Diesmal.', { health: -4, power: 1 }), bad: R('Lungenentzündung. Zwei Wochen Krankenhaus.', { health: -20, happy: -8, money: -200 }, { chron: 'Lungenentzündung.' }) },
      { t: 'Hausmittel aus dem Internet', stat: 'luck', dc: 13, ok: R('Ingwer, Zwiebeln, Honig. Hilft tatsächlich. Riecht furchtbar.', { health: 2 }), bad: R('Das Internet hat zu Kolloidalsilber geraten. Du bist jetzt leicht bläulich.', { health: -12, happy: -6 }) },
    ] });
  ev({ id: 'gym', stage: ['any'], text: 'Du fühlst dich schlapp. Ein Fitnessstudio hat Neueröffnungsangebot: 19,90 € im Monat.',
    opts: [
      { t: 'Anmelden und wirklich hingehen', stat: 'work', dc: 10, ok: R('Drei Mal die Woche. Nach zwei Monaten erkennst du dich kaum wieder.', { health: 8, happy: 6 }, { add: [{ name: 'Fitnessstudio', pm: -20, health: 2, happy: 1 }] }), bad: R('Du warst zweimal da. Der Vertrag läuft zwei Jahre.', { happy: -3 }, { add: [{ name: 'Fitnessstudio (nie da)', pm: -20, mo: 24 }] }) },
      { t: 'Draußen joggen, gratis', stat: 'body', dc: 9, ok: R('Du joggst. Du hasst es. Es wirkt trotzdem.', { health: 8, happy: 2 }), bad: R('Erster Lauf, Bänderdehnung.', { health: -6, happy: -4 }) },
      { t: 'Sofa', dc: 0, ok: R('Bequem. Für jetzt.', { health: -2, happy: 2 }) },
    ] });
  ev({ id: 'krypto', stage: ['any'], kind: 'odd', text: '{f} schwört auf einen neuen Coin. „Der geht diese Woche 50x. Vertrau mir.“',
    opts: [
      { t: 'Alles rein', stat: 'luck', dc: 16, allin: 0.8, ok: R((x) => `Er geht tatsächlich hoch. Du verkaufst rechtzeitig. Plus ${x.won}.`, { happy: 14, power: 3 }), bad: R((x) => `Er geht auf null. Die Entwickler sind verschwunden. Minus ${x.lost}.`, { happy: -16 }) },
      { t: 'Ein bisschen (500 €)', stat: 'luck', dc: 13, cost: 500, ok: R('Verdreifacht. Nett.', { money: 1000, happy: 6 }), bad: R('Die 500 € sind weg. Lehrgeld.', { money: -500, happy: -4 }) },
      { t: 'Lieber ETF', stat: 'smart', dc: 6, ok: R('Langweilig. Funktioniert.', { happy: 1 }, { add: [{ name: 'ETF-Sparplan', pm: 60 }] }), bad: R('Du hast versehentlich einen Rohstoff-ETF auf Schweinebäuche gekauft. Er läuft trotzdem.', { happy: -1 }) },
    ] });
  ev({ id: 'erbe', stage: ['any'], kind: 'odd', w: 0.5, text: 'Ein Brief vom Notar. Eine Großtante, die du nie getroffen hast, hat dir etwas hinterlassen.',
    opts: [
      { t: 'Erbe annehmen', stat: 'luck', dc: 10, ok: R('25.000 €. Und eine Sammlung von 400 Porzellanfiguren.', { money: 25000, happy: 10 }, { chron: 'Erbt 25.000 € von einer Großtante.' }), bad: R('Das Erbe besteht aus Schulden und einem Wohnwagen ohne Räder.', { money: -2000, happy: -8 }) },
      { t: 'Ausschlagen', dc: 0, ok: R('Sicher ist sicher. Später erfährst du, dass es 80.000 € gewesen wären.', { happy: -10 }) },
    ] });
  ev({ id: 'steuer', stage: ['job', 'founder', 'azubi'], text: 'Das Finanzamt will deine Steuererklärung. Die Frist läuft in einer Woche ab.',
    opts: [
      { t: 'Selber machen', stat: 'smart', dc: 11, ok: R('Du bekommst 900 € zurück. Du fühlst dich wie ein Finanzgenie.', { money: 900, happy: 6 }), bad: R('Du hast etwas falsch angegeben. Nachzahlung plus Zinsen.', { money: -700, happy: -6 }) },
      { t: 'Steuerberater (400 €)', dc: 0, ok: R('Er holt 1.300 € raus. Lohnt sich.', { money: 900, happy: 3 }) },
      { t: 'Ignorieren', stat: 'luck', dc: 17, ok: R('Das Finanzamt vergisst dich. Wie auch immer das passiert ist.', { happy: 3 }), bad: R('Schätzungsbescheid. Sie schätzen großzügig. Zu deinen Ungunsten.', { money: -2500, happy: -8 }) },
    ] });
  ev({ id: 'auto', stage: ['any'], when: (c) => c.flags.license && !c.flags.car, text: 'Ein Gebrauchtwagen, sieben Jahre alt, 6.000 €. Der Verkäufer sagt „Rentnerfahrzeug“.',
    opts: [
      { t: 'Kaufen (6.000 €)', stat: 'luck', dc: 9, cost: 6000, ok: R('Er läuft. Freiheit für 6.000 €.', { money: -6000, happy: 12 }, { flag: { car: 1 }, add: [{ name: 'Auto (Versicherung, Sprit)', pm: -220, happy: 2 }] }), bad: R('Der Rentner war Rallyefahrer. Die Kupplung ist nach zwei Wochen hinüber.', { money: -7500, happy: -4 }, { flag: { car: 1 }, add: [{ name: 'Auto (Versicherung, Sprit)', pm: -260, happy: 1 }] }) },
      { t: 'Runterhandeln', stat: 'social', dc: 12, ok: R('4.500 €. Er ist beeindruckt.', { money: -4500, happy: 12, power: 1 }, { flag: { car: 1 }, add: [{ name: 'Auto (Versicherung, Sprit)', pm: -220, happy: 2 }] }), bad: R('Er verkauft es vor deinen Augen an jemand anderen.', { happy: -4 }) },
      { t: 'Weiter Bahn fahren', dc: 0, ok: R('Klimafreundlich. Unpünktlich.', { happy: -1 }) },
    ] });

  // ----- Ungewöhnlich / absurd -----
  ev({ id: 'viral', stage: ['any'], kind: 'odd', text: 'Ein Video von dir geht viral. Du bist im Hintergrund beim Stolpern zu sehen, sehr elegant.',
    opts: [
      { t: 'Daraus eine Marke machen', stat: 'social', dc: 12, ok: R('Merch, Sponsoren, Podcast-Einladung. Du bist jetzt „die Person, die stolpert“. Es zahlt sich aus.', { money: 3000, power: 6, happy: 8 }, { flag: { famous: 1 }, add: [{ name: 'Social Media', pm: 300 }], chron: 'Wird viral.' }), bad: R('Die 15 Minuten Ruhm sind nach 9 Minuten vorbei.', { happy: -3 }) },
      { t: 'Löschen lassen', stat: 'smart', dc: 13, ok: R('Weg. Als wäre nie etwas gewesen.', { happy: 3 }), bad: R('Streisand-Effekt. Jetzt gibt es Remixe.', { happy: -8, power: -2 }) },
    ] });
  ev({ id: 'politik', stage: ['any'], kind: 'odd', when: (c) => c.age >= 18, text: 'Eine Partei sucht junge Leute für den Stadtrat in {c}. Jemand hat deinen Namen genannt.',
    opts: [
      { t: 'Kandidieren', stat: 'social', dc: 13, ok: R('Gewählt. Du sitzt jetzt im Stadtrat und diskutierst drei Stunden über Fahrradständer.', { power: 12, happy: 4 }, { flag: { politics: 1 }, status: { title: 'Stadtrat' }, chron: 'In den Stadtrat gewählt.' }), bad: R('Zwölf Stimmen. Deine Familie hat 14 Mitglieder.', { happy: -6 }) },
      { t: 'Eigene Partei gründen', stat: 'social', dc: 17, ok: R('Die „Partei für vernünftige Dinge“ holt 6 Prozent. Du bist plötzlich Politiker:in.', { power: 18, happy: 8 }, { flag: { politics: 2 }, status: { title: 'Parteivorsitz' }, chron: 'Gründet eine eigene Partei.' }), bad: R('Die Gründungsversammlung hat drei Teilnehmer. Einer ist da, weil es Häppchen gibt.', { happy: -5, money: -300 }) },
      { t: 'Kein Bock auf Politik', dc: 0, ok: R('Verständlich.', {}) },
    ] });
  ev({ id: 'buergermeister', stage: ['any'], when: (c) => (c.flags.politics || 0) >= 1, kind: 'odd', text: 'Die Bürgermeisterwahl in {c} steht an. Die Partei will dich aufstellen.',
    opts: [
      { t: 'Wahlkampf mit allem', stat: 'social', dc: 14, cost: 3000, ok: R('Du gewinnst. Bürgermeister:in. Du darfst jetzt Bänder durchschneiden.', { money: -3000, power: 20, happy: 10 }, { flag: { politics: 2 }, status: { title: 'Bürgermeister:in von {c}' }, add: [{ name: 'Amt Bürgermeister:in', pm: 4800, health: -1 }], chron: 'Wird Bürgermeister:in von {c}.' }), bad: R('Zweiter Platz. Gegen einen Mann, der nur mit „Mehr Parkplätze“ geworben hat.', { money: -3000, happy: -10 }) },
      { t: 'Schmutzkampagne gegen den Gegner', stat: 'luck', dc: 15, ok: R('Es wirkt. Du gewinnst. Glücklich bist du nicht.', { power: 20, happy: -4 }, { flag: { politics: 2 }, status: { title: 'Bürgermeister:in von {c}' }, add: [{ name: 'Amt Bürgermeister:in', pm: 4800 }], chron: 'Gewinnt die Bürgermeisterwahl. Unschön.' }), bad: R('Die Presse findet heraus, wer dahintersteckt. Rücktritt aus allen Ämtern.', { power: -15, happy: -15 }, { status: { title: '-' }, chron: 'Skandal und Rücktritt.' }) },
      { t: 'Verzichten', dc: 0, ok: R('Die Partei ist enttäuscht. Du schläfst gut.', { health: 2 }) },
    ] });
  ev({ id: 'kanzler', stage: ['any'], when: (c) => (c.flags.politics || 0) >= 2 && c.stats.power >= 50, kind: 'absurd', w: 2, text: 'Die Bundespartei ruft an. Sie brauchen ein neues Gesicht für die Bundestagswahl.',
    opts: [
      { t: 'Kanzlerkandidatur annehmen', stat: 'social', dc: 17, ok: R('Du wirst Bundeskanzler:in. Mit Ende zwanzig. Die Welt schaut ungläubig zu.', { power: 35, happy: 10, health: -8 }, { status: { title: 'Bundeskanzler:in' }, add: [{ name: 'Kanzleramt', pm: 10000, health: -2, happy: -1 }], flag: { famous: 1 }, chron: 'Wird Bundeskanzler:in.' }), bad: R('18,4 Prozent. Opposition. Immerhin bekannt.', { power: 8, happy: -6 }, { flag: { famous: 1 } }) },
      { t: 'Lieber Ministerposten', stat: 'smart', dc: 13, ok: R('Bundesministerin oder -minister für Digitales. Faxgeräte zittern.', { power: 20, happy: 6 }, { status: { title: 'Bundesminister:in' }, add: [{ name: 'Ministeramt', pm: 8000, health: -1 }], chron: 'Wird Bundesminister:in.' }), bad: R('Staatssekretär für Formulare. Es ist genau so spannend, wie es klingt.', { power: 4, happy: -4 }) },
    ] });
  ev({ id: 'gewinnspiel', stage: ['any'], kind: 'absurd', w: 0.6, text: 'Du gewinnst bei einem Radio-Gewinnspiel. Die Frage war, welche Farbe Bananen haben. Du hast „gelb“ gesagt.',
    opts: [
      { t: 'Bargeld nehmen (5.000 €)', dc: 0, ok: R('5.000 €. Für Gelb.', { money: 5000, happy: 8 }) },
      { t: 'Mysteriöse Box nehmen', stat: 'luck', dc: 11, ok: R('In der Box: ein Auto-Schlüssel. Für einen Kleinwagen.', { happy: 14, money: 12000 }, { chron: 'Gewinnt ein Auto im Radio.' }), bad: R('In der Box: 300 Packungen Bananenchips.', { happy: -3 }) },
    ] });
  ev({ id: 'alien', stage: ['any'], kind: 'absurd', w: 0.5, text: 'Nachts steht ein Mann in einer Rettungsdecke vor deiner Tür und sagt, er komme aus dem Jahr 2071.',
    opts: [
      { t: 'Reinlassen und Fragen stellen', stat: 'smart', dc: 13, ok: R('Er nennt dir drei Aktien. Zwei davon gibt es. Du kaufst sie. Sie steigen.', { money: 6000, happy: 6 }), bad: R('Er isst deinen Kühlschrank leer und klaut dein Ladekabel. Kein Zeitreisender. Nur Kevin.', { money: -150, happy: -4 }) },
      { t: 'Polizei rufen', dc: 0, ok: R('Die Polizei kennt ihn. Er heißt Kevin.', {}) },
      { t: 'Tür zu, weiterschlafen', dc: 0, ok: R('Am nächsten Morgen ist er weg. Nur die Rettungsdecke liegt noch da.', { happy: 1 }) },
    ] });
  ev({ id: 'ohio', stage: ['any'], kind: 'absurd', w: 0.5, text: 'Ein Unternehmen aus Ohio bietet dir einen Job als „Head of Vibes“. 9.000 € im Monat. Remote.',
    opts: [
      { t: 'Sofort annehmen', stat: 'luck', dc: 12, ok: R('Es ist echt. Du bewertest Vibes. Sie sind meistens okay.', { happy: 12 }, { add: [{ name: 'Head of Vibes (Ohio)', pm: 9000, mo: 12 }], status: { job: 'Head of Vibes' }, chron: 'Wird Head of Vibes in Ohio.' }), bad: R('Es war ein Betrug. Sie wollten deine IBAN. Jetzt haben sie sie.', { money: -1200, happy: -8 }) },
      { t: 'Erst recherchieren', stat: 'smart', dc: 9, ok: R('Du findest heraus, dass es ein Betrug ist. Du meldest sie. Schönes Gefühl.', { power: 2, happy: 3 }), bad: R('Du findest nichts. Du sagst sicherheitshalber ab. Es war echt.', { happy: -6 }) },
    ] });
  ev({ id: 'nachbar', stage: ['any'], kind: 'odd', text: 'Dein Nachbar baut seit Wochen jeden Samstag um sieben Uhr morgens etwas mit einer Flex.',
    opts: [
      { t: 'Freundlich ansprechen', stat: 'social', dc: 9, ok: R('Er baut ein Boot. Für dich ist auch Platz. Ihr seid jetzt befreundet.', { happy: 6 }, { rel: [{ name: 'Nachbar Günther', change: 30, kind: 'Nachbar' }] }), bad: R('Er flext jetzt auch sonntags. Aus Prinzip.', { happy: -6, health: -2 }) },
      { t: 'Ordnungsamt', stat: 'smart', dc: 10, ok: R('Ruhe. Und ein Nachbar, der dich nie wieder grüßt.', { happy: 3, health: 2 }, { rel: [{ name: 'Nachbar Günther', change: -30, kind: 'Nachbar' }] }), bad: R('Das Ordnungsamt kommt an einem Dienstag. Da flext er nicht.', { happy: -4 }) },
      { t: 'Zurück-flexen', stat: 'body', dc: 12, ok: R('Ihr flext jetzt beide. Es entsteht etwas wie Respekt.', { power: 3, happy: 2 }), bad: R('Du flext dir fast den Daumen ab.', { health: -12, happy: -5 }) },
    ] });
  ev({ id: 'lotto', stage: ['any'], kind: 'absurd', w: 0.3, text: 'Du hast aus Langeweile Lotto gespielt. Die Zahlen werden gerade gezogen. Vier hast du schon.',
    opts: [
      { t: 'Weiterschauen', stat: 'luck', dc: 19, ok: R('Sechs Richtige. 1,2 Millionen €. Du sitzt auf dem Boden und lachst.', { money: 1200000, happy: 25, power: 10 }, { chron: 'Sechs Richtige im Lotto.' }), bad: R('Vier Richtige. 87 €. Immerhin.', { money: 87, happy: 2 }) },
    ] });
  // ----- Wohnen -----
  ev({ id: 'ausziehen', stage: ['any'], when: (c) => /Eltern|Opa/.test(c.living) && c.age >= 19, text: 'Zu Hause wird es eng. Du willst eigentlich ausziehen.',
    opts: [
      { t: 'WG-Zimmer suchen', stat: 'social', dc: 10, ok: R('Du bekommst das Zimmer. Die WG hat einen Putzplan, den niemand einhält.', { happy: 10 }, { status: { living: 'wohnt in einer WG' }, end: ['Wohnt bei den Eltern (keine Miete)', 'Wohnt bei Opa (keine Miete)'], add: [{ name: 'Miete WG-Zimmer', pm: -480, happy: 1 }], chron: 'Zieht in eine WG.' }), bad: R('34 WG-Castings. Bei einem musstest du vortanzen. Bisher nichts.', { happy: -6 }) },
      { t: 'Eigene Wohnung (Karte nutzen)', dc: 0, ok: R('Klick auf die Karte, such dir was zum Mieten oder Kaufen. Die Kosten laufen dann jede Runde.', {}) },
      { t: 'Bleiben und Geld sparen', dc: 0, ok: R('Kein Stress, keine Miete. Dafür fragt jemand jeden Abend, wann du heimkommst.', { happy: -2, money: 400 }) },
    ] });
  ev({ id: 'vermieter', stage: ['any'], when: (c) => c.effects.some((e) => e.rent || /Miete/.test(e.name)), text: 'Dein Vermieter kündigt eine Mieterhöhung an. 15 Prozent.',
    opts: [
      { t: 'Widersprechen', stat: 'smart', dc: 11, ok: R('Der Mieterverein sagt, die Erhöhung ist unzulässig. Du gewinnst.', { happy: 6, power: 2 }), bad: R('Sie ist zulässig. Du zahlst, und er weiß jetzt, dass du dich wehrst.', { happy: -5 }, { add: [{ name: 'Mieterhöhung', pm: -90 }] }) },
      { t: 'Zahlen', dc: 0, ok: R('Ruhe kostet 15 Prozent.', { happy: -3 }, { add: [{ name: 'Mieterhöhung', pm: -90 }] }) },
    ] });

  ev({ id: 'notfall', stage: ['any'], forced: (c) => c.stats.health < 25, text: 'Dein Körper streikt. Schwindel, Herzrasen, du kommst morgens kaum aus dem Bett. Die Ärztin schaut sehr ernst.',
    opts: [
      { t: 'Alles stoppen und Reha', dc: 0, ok: R('Drei Monate Reha. Kein Job, kein Stress, viel Kräutertee. Es wirkt.', { health: 28, happy: 4, power: -3, money: -800 }, { chron: 'Notbremse und Reha.' }) },
      { t: 'Weniger arbeiten, gesünder leben', stat: 'work', dc: 9, ok: R('Weniger Stunden, mehr Schlaf, Gemüse. Langweilig. Lebensverlängernd.', { health: 18, happy: 2 }, { add: [{ name: 'Gesünder leben', health: 2, happy: 1 }] }), bad: R('Du hältst es zwei Wochen durch. Dann wieder alles wie vorher.', { health: 4 }) },
      { t: 'Ignorieren', stat: 'body', dc: 15, ok: R('Es geht vorbei. Diesmal. Die Ärztin glaubt dir nicht.', { health: 6 }), bad: R('Herzinfarkt. Du überlebst knapp. Die Ärztin sagt nichts mehr, sie schaut nur.', { health: -12, happy: -10 }, { chron: 'Herzinfarkt.' }) },
    ] });
  ev({ id: 'schulden', stage: ['any'], forced: (c) => c.stats.money < -15000, text: 'Dein Konto steht tief im Minus. Die Bank ruft an, die Inkasso-Briefe stapeln sich.',
    opts: [
      { t: 'Schuldnerberatung und Insolvenz', dc: 0, ok: R('Privatinsolvenz. Drei Jahre leben am Minimum, dann bist du schuldenfrei. Stolz ist teuer, das hier nicht.', { happy: -10, power: -6 }, { reset: -3000, chron: 'Privatinsolvenz.' }) },
      { t: 'Umschulden mit neuem Kredit', stat: 'smart', dc: 12, ok: R('Ein Kredit mit vernünftigen Zinsen löst die alten ab. Durchatmen.', { happy: 4 }, { reset: 0, add: [{ name: 'Umschuldungskredit', pm: -350, mo: 60 }] }), bad: R('Die Bank lacht. Höflich, aber hörbar.', { happy: -6 }) },
      { t: 'Familie um Hilfe bitten', stat: 'social', dc: 11, ok: R('Sie helfen. Du wirst es bei jedem Weihnachtsessen hören, aber sie helfen.', { happy: -2 }, { reset: -2000, rel: [{ name: 'Familie', change: -5, kind: 'Familie' }] }), bad: R('„Wir haben dich gewarnt.“ Kein Geld, dafür ein Vortrag.', { happy: -8 }) },
    ] });

  // Sicherheitsnetz, falls nichts passt
  ev({ id: 'alltag', stage: ['any'], w: 0.6, text: 'Eine ruhige Phase. Nichts Großes passiert. Was machst du mit der Zeit?',
    opts: [
      { t: 'Weiterbilden', stat: 'smart', dc: 8, ok: R('Ein Online-Kurs, ein Zertifikat. Du bist jetzt offiziell schlauer.', { power: 2, happy: 2 }, { flag: { study: 1 } }), bad: R('Du hast drei Kurse angefangen und keinen beendet.', { happy: -2 }) },
      { t: 'Freunde treffen', dc: 0, ok: R('Ein langer Abend mit den richtigen Leuten.', { happy: 8, money: -60 }, { rel: [{ name: '{f}', change: 8 }] }) },
      { t: 'Mehr arbeiten', stat: 'work', dc: 8, ok: R('Überstunden, Extra-Geld.', { money: 1200, health: -3 }), bad: R('Unbezahlte Überstunden. Die Firma bedankt sich mit Pizza.', { health: -3, happy: -3 }) },
    ] });

  // ---------- Weltgeschehen ----------
  const WORLD = [
    { t: 'Die Inflation zieht wieder an. Alles wird teurer, Löhne nicht.', d: { happy: -2 }, money: -0.03 },
    { t: 'Bahnstreik, drei Wochen lang. Ganz Deutschland arbeitet im Homeoffice oder gar nicht.', d: { happy: -3 } },
    { t: 'Hitzesommer mit 41 Grad. Die Ventilatoren sind ausverkauft.', d: { health: -3, happy: -1 } },
    { t: 'Der DAX springt auf ein Rekordhoch. Alle reden plötzlich über Aktien.', d: { happy: 2 }, money: 0.04 },
    { t: 'Eine Pandemie light: zwei Monate Masken, dann vergessen alle, dass es sie gab.', d: { health: -5, happy: -3 } },
    { t: 'Die Mieten in Großstädten steigen um 12 Prozent. Wohngemeinschaften mit 40-Jährigen werden normal.', d: { happy: -2 } },
    { t: 'Ein neues KI-Modell kann angeblich alles. Halb Deutschland hat Angst um den Job, die andere Hälfte benutzt es heimlich.', d: { power: 1 } },
    { t: 'Deutschland gewinnt die Fußball-EM. Drei Tage lang sind alle nett zueinander.', d: { happy: 6 } },
    { t: 'Ein Stromausfall legt das Ruhrgebiet 30 Stunden lahm. Viele Leute lernen ihre Nachbarn kennen.', d: { happy: 1 } },
    { t: 'Die Bundesregierung zerbricht. Neuwahlen. Die Talkshows haben Hochsaison.', d: { power: 1 } },
    { t: 'Ein Sturm deckt im ganzen Land Dächer ab. Die Versicherungen sind schlecht gelaunt.', d: { happy: -2 }, money: -0.01 },
    { t: 'Die Zinsen sinken. Wer einen Kredit hat, atmet auf. Wer spart, nicht.', d: { happy: 1 } },
    { t: 'Ein Dulidan-Studios-Spiel geht in den App-Charts auf Platz 1. Duisburg ist kurz stolz.', d: { happy: 2 }, studio: 3000 },
    { t: 'Ein milder Winter, keine Grippewelle. Die Apotheken sind beleidigt.', d: { health: 4 } },
    { t: 'Ein Krypto-Crash vernichtet Milliarden. Viele 19-Jährige lernen das Wort „Totalverlust“.', d: { happy: -1 } },
    { t: 'Das Deutschlandticket wird teurer. Schon wieder.', d: { happy: -1 } },
  ];

  // ---------- Freie Ideen ohne KI (Stichworte) ----------
  const FREE = [
    { re: /lern|üb|büffel|nachhilfe|hausaufgab|studier|lese|buch/i, stat: 'smart', dc: 9, ok: ['Du ziehst es durch. Wissen bleibt hängen, was selten ist.', { happy: 1, power: 1 }, { flag: { study: 1 } }], bad: ['Nach 20 Minuten bist du bei Videos über Tiefseefische gelandet.', { happy: -2 }] },
    { re: /job|arbeit|bewerb|schicht|nebenjob|geld verdien|überstund/i, stat: 'work', dc: 10, ok: ['Es lohnt sich. Mehr Geld auf dem Konto, weniger Freizeit.', { money: 900, health: -2 }], bad: ['Viel Aufwand, kaum Ertrag. Der Chef sagt „nächstes Mal“.', { happy: -3, health: -2 }] },
    { re: /party|feier|club|sauf|trink|festival|rave|disco/i, stat: 'body', dc: 9, ok: ['Eine Nacht, über die noch lange geredet wird. Im Guten.', { happy: 10, health: -3, money: -80 }], bad: ['Der Abend endet mit einem verlorenen Schuh und einer Taxirechnung.', { happy: -2, health: -7, money: -140 }] },
    { re: /sport|gym|train|jogg|fitness|lauf|schwimm|fußball|boxen/i, stat: 'body', dc: 8, ok: ['Es zahlt sich aus. Du fühlst dich fitter.', { health: 7, happy: 3 }], bad: ['Zerrung. Zwei Wochen humpeln.', { health: -5, happy: -3 }] },
    { re: /flirt|date|verlieb|anschreib|küss|crush|liebe|beziehung/i, stat: 'social', dc: 11, ok: ['Es funkt. Mal sehen, wohin das führt.', { happy: 10 }, { partnerNew: true }], bad: ['Gelesen, nicht geantwortet. Drei Tage später ein Daumen.', { happy: -6 }] },
    { re: /aktie|krypto|bitcoin|etf|invest|börse|coin|trading/i, stat: 'luck', dc: 12, invest: true },
    { re: /gründ|firma|startup|business|unternehm|selbstständig|shop|marke|app/i, stat: 'work', dc: 13, ok: ['Das Projekt kommt ins Rollen. Erste Kunden zahlen sogar.', { money: 1500, power: 4, happy: 6 }, { flag: { company: 1 }, add: [{ name: 'Eigenes Projekt', pm: 400 }] }], bad: ['Viel Arbeit, Website hübsch, Umsatz null.', { money: -600, happy: -5 }] },
    { re: /präsident|kanzler|partei|politik|wahl|bürgermeist|demo|regier/i, stat: 'social', dc: 14, ok: ['Leute hören dir zu. Erstaunlich viele.', { power: 8, happy: 4 }, { flag: { politics: 1 } }], bad: ['Dein Auftritt landet in einem Cringe-Compilation-Video.', { power: -2, happy: -6 }] },
    { re: /klau|stehl|betrüg|einbrech|überfall|hack|fälsch|schmuggel|deal/i, stat: 'luck', dc: 15, ok: ['Es klappt. Niemand merkt etwas. Noch nicht.', { money: 2500, power: 3, happy: -2 }], bad: ['Erwischt. Anzeige, Geldstrafe, und deine Mutter weiß es jetzt auch.', { money: -2000, power: -5, happy: -12 }, { chron: 'Erwischt und angezeigt.' }] },
    { re: /schlag|prügel|kämpf|rache|angreif|schubs|box/i, stat: 'body', dc: 13, ok: ['Du gewinnst. Es fühlt sich weniger gut an als gedacht.', { power: 3, happy: -1 }], bad: ['Du verlierst. Blaues Auge, verletzter Stolz.', { health: -12, happy: -6 }] },
    { re: /reis|urlaub|flug|ausland|backpack|trip/i, stat: 'luck', dc: 7, cost: 900, ok: ['Eine Reise, die dich ein bisschen verändert.', { money: -900, happy: 12, health: 2 }], bad: ['Flug gestrichen, Koffer weg, Hotel ist eine Baustelle.', { money: -900, happy: -4 }] },
    { re: /schlaf|chill|ausruh|entspann|nichts|zocken|netflix|pause/i, stat: '', dc: 0, ok: ['Du gönnst dir Ruhe. Der Körper dankt es.', { health: 5, happy: 4 }] },
    { re: /kauf|shoppen|bestell|gönn/i, stat: 'luck', dc: 6, ok: ['Gekauft. Freude für eine Woche.', { money: -400, happy: 6 }], bad: ['Gekauft. Es kommt kaputt an.', { money: -400, happy: -3 }] },
    { re: /hilf|spend|ehrenamt|kümmer|unterstütz/i, stat: '', dc: 0, ok: ['Du hilfst. Das bleibt bei den Leuten hängen.', { happy: 6, power: 1 }] },
    { re: /arzt|therap|gesund|diät|aufhör.*rauch|krankenhaus/i, stat: '', dc: 0, ok: ['Du kümmerst dich um dich. Spürbar.', { health: 9, happy: 2 }] },
  ];

  // ---------- Auswahl einer Karte ----------
  function monthsIn(c, S, M) { return S.date.y * 12 + S.date.m - (c.flags.pathAt || 0) + M; }
  function relVal(c, name) { const r = c.relations.find((x) => x.name === name); return r ? r.val : 0; }
  function stageOf(c) {
    if (c.key === 'april') return 'ai';
    if (c.edu && c.edu.kind === 'school') return 'abi';
    if (!c.flags.path) return c.edu && c.edu.prev === 'school' ? 'after' : 'job';
    return c.flags.path;
  }
  function chooseEvent(S, pid) {
    const c = S.chars[pid], M = S.stepM || 1, st = stageOf(c);
        // Pflicht-Events: Abi nach ~6 Monaten, Entscheidung danach, Abschlüsse
    if (c.flags.abiChoice > 0) return byId('abi-fail');
    if (st === 'after') return byId('weg');
    const forced = E.find((e) => typeof e.forced === 'function' && (e.stage.includes(st) || e.stage.includes('any')) && e.forced(c, S, M) && !recently(c, e.id, 2));
    if (forced) return forced;
    const kindRoll = Math.random(), wantKind = kindRoll < 0.6 ? 'real' : kindRoll < 0.9 ? 'odd' : 'absurd';
    const pool = E.filter((e) => !e.forced && (e.stage.includes(st) || (e.stage.includes('any') && (st !== 'ai' || AI_OK.has(e.id) || c.flags.body))) && (!e.when || e.when(c, S)) && !recently(c, e.id, 8));
    const prefer = pool.filter((e) => e.kind === wantKind);
    const list = prefer.length ? prefer : pool.length ? pool : [byId('alltag')];
    // Stufen-Events bevorzugen, damit das eigene Leben vorankommt
    const weight = (e) => e.w * (e.stage.includes(st) ? 2.2 : 1);
    let sum = list.reduce((s, e) => s + weight(e), 0), r = Math.random() * sum;
    for (const e of list) { r -= weight(e); if (r <= 0) return e; }
    return list[0];
  }
  // April lebt auf dem Server: nur Ereignisse, die ohne Körper Sinn ergeben (bis sie einen hat)
  const AI_OK = new Set(['crush', 'beziehung', 'freund-geld', 'freund-drama', 'krypto', 'erbe', 'viral', 'politik', 'buergermeister', 'kanzler', 'gewinnspiel', 'alien', 'ohio', 'lotto', 'alltag', 'familie', 'nachbar']);
  const byId = (id) => E.find((e) => e.id === id);
  const recently = (c, id, n) => (c.flags.seen || []).slice(-n).includes(id);

  function makeCard(S, pid, e) {
    const c = S.chars[pid], x = ctxOf(S, pid);
    if (c.key === 'kimberly' && e.id === 'crush' && x.f === 'Justin') x.f = 'Shaquille';
    c.flags.seen = (c.flags.seen || []).concat(e.id).slice(-16);
    return {
      id: e.id, text: fill(e.text, x), f: x.f, fid: x.fid || null, exam: !!e.exam, kind: e.kind,
      opts: e.opts.map((o) => ({ t: fill(o.t, x), stat: o.stat || '', dc: o.dc || 0, cost: o.cost || 0 })),
    };
  }

  // ---------- Auswertung ----------
  const blank = (pid) => ({ id: pid, story: '', next_event: '', exam: false, check: { used: false, stat: '', dc: 0, success: false, mod: 0 }, delta: { money: 0, health: 0, happy: 0, power: 0 }, add_effects: [], end_effects: [], relations: [], status: { job: '', education: '', location: '', title: '', living: '' }, chronicle: '', dead: false, death_reason: '' });
  const NAMES = ['Lea', 'Noah', 'Mia', 'Elias', 'Emilia', 'Luca', 'Sofia', 'Ben', 'Hannah', 'Finn', 'Lina', 'Yusuf', 'Ella', 'Milan', 'Nele', 'Can', 'Leonie', 'Theo', 'Amira', 'Jonas'];
  function applyOutcome(S, pid, entry, out, x, M, extra) {
    const c = S.chars[pid];
    const dd = out.d || {};
    ['money', 'health', 'happy', 'power'].forEach((k) => { entry.delta[k] += Math.round(dd[k] || 0); });
    // Kimberly ist zerbrechlich: Gesundheitsverluste härter
    if (traits(c).fragile && entry.delta.health < 0) entry.delta.health = Math.round(entry.delta.health * 1.3);
    (out.add || []).forEach((a) => entry.add_effects.push({ name: fill(a.name, x), pm: Math.round(a.pm || 0), health: (a.health || 0) * 2, happy: (a.happy || 0) * 2, power: (a.power || 0) * 2, months: a.mo || 0 }));
    // Wer ins Berufsleben startet, zahlt ab jetzt Lebenshaltung selbst
    if (out.flag && out.flag.path && !c.flags.living) { c.flags.living = 1; entry.add_effects.push({ name: 'Lebenshaltung (Essen, Handy, Versicherung …)', pm: -950, health: 0, happy: 0, power: 0, months: 0 }); }
    (out.end || []).forEach((n) => entry.end_effects.push(n));
    (out.rel || []).forEach((r) => entry.relations.push({ name: fill(r.name, x), kind: r.kind || '', change: r.change || 0, remove: false }));
    if (out.status) Object.entries(out.status).forEach(([k, v]) => { entry.status[k] = fill(v, x); });
    if (out.flag) Object.entries(out.flag).forEach(([k, v]) => { c.flags[k] = typeof v === 'number' && k !== 'pathAt' ? (Number(c.flags[k]) || 0) + v : k === 'pathAt' ? S.date.y * 12 + S.date.m + M : v; });
    if (out.partnerNew) {
      const name = extra.newName || pick(NAMES);
      c.flags.partner = name;
      entry.relations.push({ name, kind: 'Beziehung', change: 25, remove: false });
    }
    if (out.breakup && c.flags.partner) {
      entry.relations.push({ name: c.flags.partner, kind: 'Ex', change: -40, remove: false });
      entry.end_effects.push('Kind (Unterhalt)');
      c.flags.partner = ''; c.flags.together = 0; c.flags.married = 0;
    }
    if (out.chron) entry.chronicle = fill(out.chron, x);
    if (out.reset != null) entry.delta.money += out.reset - c.stats.money;
    if (out.abiGrade) {
      const g = clamp(3.6 - (extra.margin || 0) * 0.17 - Math.random() * 0.3, 1.0, 4.0);
      c.flags.grade = g.toFixed(1).replace('.', ',');
      entry.status.education = `Abitur (${c.flags.grade})`;
    }
    if (out.flag && out.flag.abiFail && !c.flags.abi) {
      if (c.flags.abiFail >= 2) { c.flags.noAbi = 1; entry.status.education = 'kein Abitur'; entry.chronicle = entry.chronicle || 'Ohne Abitur von der Schule.'; }
      else c.flags.abiWait = S.round + Math.max(1, Math.ceil(6 / M));
    }
  }
  function resolveOne(S, pid, M, entry) {
    const c = S.chars[pid], card = S.cards && S.cards[pid];
    const choice = S.picks ? S.picks[pid] : undefined;
    const text = S.actions[pid];
    const roll = S.rolls[pid] || 1 + rnd(20);
    const x = card ? Object.assign(ctxOf(S, pid), { f: card.f || ctxOf(S, pid).f, fid: card.fid }) : ctxOf(S, pid);
    if (card && Number.isInteger(choice) && card.opts[choice]) {
      const e = byId(card.id), o = e && e.opts[choice];
      if (!o) return;
      const extra = { newName: pick(NAMES) };
      x.newName = extra.newName;
      if (o.cost && c.stats.money < o.cost) {
        entry.story = `Du wolltest „${card.opts[choice].t}“, aber das Konto sagt nein. Es fehlen ${fmt(o.cost - c.stats.money)}. Die Gelegenheit ist vorbei.`;
        entry.delta.happy -= 4;
        return;
      }
      let ok = true, m = 0;
      if (o.dc) {
        m = mod(c, o.stat);
        if (o.studio && traits(c).studio) m += traits(c).studio;
        if (o.exam && S.quiz && S.quiz[pid]) m += Math.round((S.quiz[pid].ok - S.quiz[pid].total / 2) * 2);
        ok = roll === 20 || (roll !== 1 && roll + m >= o.dc);
        // Justin versagt im entscheidenden Moment
        let note = '';
        if (ok && traits(c).fumble && o.stat === 'social' && roll <= 3) { ok = false; note = ' Es lief perfekt. Bis zum letzten Satz.'; }
        // Kimberly kommt leichter aus Ärger raus
        if (!ok && traits(c).rescue && Math.random() < 0.3) { ok = true; note = ' Eigentlich wäre das schiefgegangen. Dann hat dir jemand geholfen, einfach so.'; }
        entry.check = { used: true, stat: SKILLS[o.stat] || o.stat, dc: o.dc, success: ok, mod: m };
        extra.margin = roll + m - o.dc;
        extra.note = note;
      }
      let out = ok || !o.bad ? o.ok : o.bad;
      if (o.allin) {
        const stake = Math.max(0, Math.round(c.stats.money * o.allin));
        x.won = fmt(stake * 3); x.lost = fmt(stake);
        out = Object.assign({}, out, { d: Object.assign({}, out.d, { money: ok ? stake * 3 : -stake }) });
      }
      if (out.abiGrade) x.grade = (clamp(3.6 - (extra.margin || 0) * 0.17, 1.0, 4.0)).toFixed(1).replace('.', ',');
      applyOutcome(S, pid, entry, out, x, M, extra);
      if (out.abiGrade && c.flags.grade) x.grade = c.flags.grade;
      entry.story = fill(out.s, x) + (extra.note || '');
      // Auswirkung auf eine andere Person (verknüpfte Leben)
      if (out.o && x.fid && S.chars[x.fid] && !S.chars[x.fid].dead) entry._other = { pid: x.fid, d: out.o.d || {}, s: fill(out.o.s, x), rel: { name: c.name, change: (out.rel && out.rel[0] && out.rel[0].change) || 0 } };
      return;
    }
    if (text && text !== '•') {
      const f = FREE.find((r) => r.re.test(text)) || { stat: 'luck', dc: 11, ok: ['Es läuft besser als gedacht.', { happy: 4, power: 1 }], bad: ['Es läuft nicht. Aber immerhin hast du es versucht.', { happy: -3 }] };
      const short = text.length > 90 ? `${text.slice(0, 88)}…` : text;
      let ok = true, m = 0;
      if (f.dc) {
        m = mod(c, f.stat);
        ok = roll === 20 || (roll !== 1 && roll + m >= f.dc);
        entry.check = { used: true, stat: SKILLS[f.stat] || '', dc: f.dc, success: ok, mod: m };
      }
      if (f.invest) {
        const stake = Math.round(Math.max(0, c.stats.money) * 0.4);
        const out = ok ? R(`Der Markt meint es gut mit dir. Plus ${fmt(Math.round(stake * 0.5))}.`, { money: Math.round(stake * 0.5), happy: 6 }) : R(`Der Markt meint es nicht gut mit dir. Minus ${fmt(Math.round(stake * 0.45))}.`, { money: -Math.round(stake * 0.45), happy: -6 });
        applyOutcome(S, pid, entry, out, x, M, {});
        entry.story = `„${short}“ – ${out.s}`;
        return;
      }
      const [s, d, more] = ok || !f.bad ? f.ok : f.bad;
      applyOutcome(S, pid, entry, Object.assign({ s, d }, more || {}), x, M, { newName: pick(NAMES) });
      entry.story = `„${short}“ – ${s}`;
      return;
    }
    entry.story = 'Du hast nichts entschieden. Die Zeit vergeht trotzdem, und die Rechnungen kommen pünktlich.';
  }
  const fmt = (n) => `${Math.abs(Math.round(n)).toLocaleString('de-DE')} €`;

  function nextFor(S, pid, entry) {
    const card = makeCard(S, pid, chooseEvent(S, pid));
    entry.card = card;
    entry.next_event = card.text;
    entry.exam = card.exam;
  }

  // Runde auswerten (oder Spielstart): Ergebnis im KI-Format + Karten
  function run(S) {
    const M = S.stepM || 1;
    const living = Object.keys(S.chars).filter((id) => !S.chars[id].dead);
    living.forEach((id) => { const c = S.chars[id]; c.flags = c.flags || {}; });
    const out = { world: '', players: [], builtin: true };
    if (S.aiTask === 'final') return final(S);
    let wd = null;
    if (S.aiTask !== 'intro' && Math.random() < 0.3) { wd = pick(WORLD); out.world = wd.t; }
    living.forEach((pid) => {
      const entry = blank(pid);
      if (S.aiTask === 'intro') {
        const c = S.chars[pid];
        entry.story = `${c.name}, ${c.age}. ${c.job}, ${c.living}. ${c.bonus.split(':')[0]}. Das Leben fängt jetzt an.`;
      } else resolveOne(S, pid, M, entry);
      if (wd) {
        const c = S.chars[pid];
        ['health', 'happy', 'power'].forEach((k) => { entry.delta[k] += wd.d[k] || 0; });
        if (wd.money) entry.delta.money += Math.round(Math.max(0, c.stats.money) * wd.money);
        if (wd.studio && c.key === 'shaquille') entry.delta.money += wd.studio;
      }
      // Ab 45 baut der Körper langsam ab
      const c = S.chars[pid], yr = M / 12, st = (v) => Math.floor(v + Math.random());
      if (c.age >= 45) entry.delta.health -= st((c.age - 40) / 10 * yr * 2);
      // Junge Körper erholen sich von selbst ein Stück
      else if (c.stats.health < 65) entry.delta.health += st(4 * yr);
      out.players.push(entry);
    });
    // Verknüpfte Leben: Folgen für die andere Person
    out.players.forEach((e) => {
      if (!e._other) return;
      const t = out.players.find((p) => p.id === e._other.pid);
      if (!t) return;
      ['money', 'health', 'happy', 'power'].forEach((k) => { t.delta[k] += e._other.d[k] || 0; });
      t.story = `${t.story} Nebenbei: ${e._other.s}`.trim();
      if (e._other.rel.change) t.relations.push({ name: e._other.rel.name, kind: '', change: Math.round(e._other.rel.change / 2), remove: false });
      delete e._other;
    });
    // Sozialstaat: Wer selbst zahlt, aber nichts verdient, bekommt Bürgergeld – bis wieder Geld reinkommt
    out.players.forEach((e) => {
      const c = S.chars[e.id];
      if (!c.flags.living) return;
      const income = c.effects.filter((f) => f.pm > 0 && f.name !== 'Bürgergeld' && !e.end_effects.includes(f.name)).reduce((a, f) => a + f.pm, 0) + e.add_effects.filter((f) => f.pm > 0).reduce((a, f) => a + f.pm, 0) + (c.job2 ? 1 : 0);
      const has = c.effects.some((f) => f.name === 'Bürgergeld');
      if (income <= 0 && !has) { e.add_effects.push({ name: 'Bürgergeld', pm: 1000, health: 0, happy: -3, power: -3, months: 0 }); e.story += ' Das Amt springt erst mal mit Bürgergeld ein.'; }
      else if (income > 0 && has) e.end_effects.push('Bürgergeld');
    });
    out.players.forEach((e) => nextFor(S, e.id, e));
    return out;
  }

  // ---------- Lebensbilanz ----------
  const GOALS = {
    rich: { name: 'Millionär:in werden', test: (c, nw) => nw >= 1000000 },
    happy: { name: 'Richtig glücklich sein', test: (c) => c.stats.happy >= 80 },
    power: { name: 'Macht haben', test: (c) => c.stats.power >= 70 || /kanzler|minister|bürgermeister/i.test(c.title || '') },
    family: { name: 'Eine Familie gründen', test: (c) => !!(c.flags && c.flags.kids) },
    house: { name: 'Ein eigenes Haus besitzen', test: (c) => c.props.some((p) => p.kind === 'house') },
    famous: { name: 'Berühmt werden', test: (c) => !!(c.flags && c.flags.famous) },
    healthy: { name: 'Gesund alt werden', test: (c) => !c.dead && c.stats.health >= 65 },
    boss: { name: 'Eine Firma groß machen', test: (c) => ((c.flags && c.flags.company) || 0) >= 3 },
  };
  function netWorth(c) { return c.stats.money + c.props.reduce((s, p) => s + p.value, 0); }
  function score(c) {
    const nw = netWorth(c);
    const parts = {
      money: Math.round(Math.sign(nw) * Math.min(400, Math.sqrt(Math.abs(nw)) / 2.5)),
      happy: c.stats.happy * 3, health: c.dead ? 0 : c.stats.health, power: c.stats.power * 2,
      people: Math.min(120, c.relations.filter((r) => r.val >= 60).length * 15),
      goal: c.goal && GOALS[c.goal] && GOALS[c.goal].test(c, nw) ? 250 : 0,
      dead: c.dead ? -100 : 0,
    };
    return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts, nw };
  }
  function lifeTitle(c) {
    const s = c.stats, nw = netWorth(c), f = c.flags || {};
    if (c.dead) return s.power >= 50 ? 'Zu früh gegangen, aber laut' : 'Ging, bevor es richtig losging';
    if (/kanzler/i.test(c.title || '')) return 'Regiert ein Land, nicht das eigene Leben';
    if (nw >= 1000000) return s.happy >= 60 ? 'Reich und erstaunlich entspannt' : 'Reich, aber nicht glücklich';
    if (f.kids && s.happy >= 60) return 'Familienmensch mit Augenringen';
    if ((f.company || 0) >= 3) return 'Hat aus nichts eine Firma gemacht';
    if (f.famous) return 'Kurz berühmt, lang erinnert';
    if (s.happy >= 75) return 'Hat das mit dem Glück verstanden';
    if (nw < 0) return 'Lebt auf Pump und Hoffnung';
    if (s.health < 30) return 'Hat den Körper nicht gefragt';
    return 'Ein normales Leben. Unterschätzt.';
  }
  function final(S) {
    const out = { world: '', players: [], builtin: true };
    const ranked = Object.keys(S.chars).map((id) => ({ id, c: S.chars[id], sc: score(S.chars[id]) })).sort((a, b) => b.sc.total - a.sc.total);
    ranked.forEach(({ id, c, sc }, i) => {
      const hi = (c.chronicle || []).filter((x) => !/^Neues Leben/.test(x.t)).slice(-4).map((x) => x.t).join(' ');
      const goal = c.goal && GOALS[c.goal];
      const reached = goal && GOALS[c.goal].test(c, sc.nw);
      const parts = [
        `${c.name}, ${c.age} Jahre${c.dead ? ', verstorben' : ''}. ${c.job}${c.title ? `, ${c.title}` : ''}.`,
        hi ? `Was hängen bleibt: ${hi}` : 'Viel Großes ist nicht passiert. Das ist auch eine Leistung.',
        `Am Ende: ${fmt(sc.nw)} Vermögen${sc.nw < 0 ? ' (im Minus)' : ''}, Happiness ${c.stats.happy}, Gesundheit ${c.stats.health}, Macht ${c.stats.power}.`,
        goal ? `Lebensziel „${goal.name}“: ${reached ? 'geschafft.' : 'nicht geschafft.'}` : '',
        i === 0 && ranked.length > 1 ? 'Unterm Strich das beste Leben in dieser Runde.' : '',
      ];
      out.players.push({ id, title: lifeTitle(c), story: parts.filter(Boolean).join(' ') });
    });
    out.world = 'Die Zeit ist um. April hat mitgeschrieben.';
    return out;
  }

  // Karte für eine Person, die mitten im Spiel (neues Leben) einsteigt
  function cardFor(S, pid) { S.chars[pid].flags = S.chars[pid].flags || {}; return makeCard(S, pid, chooseEvent(S, pid)); }
  const DECK = { SKILLS, GOALS, mod, chance, run, cardFor, score, netWorth, stageOf, events: E, WORLD };
  if (typeof module !== 'undefined' && module.exports) module.exports = DECK;
  else root.DULI_LARP_DECK = DECK;
})(typeof window !== 'undefined' ? window : globalThis);
