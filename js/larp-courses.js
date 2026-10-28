// DULIDAN LARP EXTREME – Akademie: Prüfungen und Lizenzen für fast alles (Fliegen, Polizei, Bundeswehr, Wasser, Fahren …).
// Jede Prüfung: Anmeldung (Kosten, Voraussetzungen) → April schickt einen Lernzettel in den Chat → lernen →
// Theorieprüfung als Quiz (Fragen kommen aus dem Lernzettel) → ggf. Praxis per W20 → Zertifikat schaltet Berufe frei.
// Inhalte sind vereinfacht und ohne Gewähr; Kosten sind gerundete Richtwerte.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const NATO = 'Alfa, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliett, Kilo, Lima, Mike, November, Oscar, Papa, Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu';
  // practical: { name, stat, dc } · unlock: { title, job: {...}, training: {...}, perk, flag, happy, power }
  const COURSES = [
    {
      id: 'ppl', name: 'Privatpilotenlizenz PPL(A)', cat: 'Fliegen', cost: 12500, examFee: 180, months: 6,
      req: { age: 17, health: 55 }, text: 'Kleine Flugzeuge selbst fliegen. Mit Funk, Navigation, Wetter und Alleinflug.',
      doc: { title: 'Lernzettel: Privatpilot', intro: 'Hi, ich bin April und ab heute deine Fluglehrerin. Lern das hier, dann fliegst du. Wahrscheinlich.',
        sections: [
          { h: 'Das Buchstabieralphabet (Funk)', items: [NATO, 'Zahlen werden einzeln gesprochen: 1-2-3 heißt „eins-zwo-drei“ (zwo statt zwei).'] },
          { h: 'Notfall-Codes am Transponder (Squawk)', items: ['7700: Luftnotfall', '7600: Funkausfall', '7500: Entführung', '7000: normaler Sichtflug (VFR) in Europa'] },
          { h: 'Notrufe im Funk', items: ['MAYDAY, MAYDAY, MAYDAY: Notfall, Gefahr für Leib und Leben', 'PAN-PAN (dreimal): Dringlichkeit, aber keine unmittelbare Gefahr', '121,5 MHz ist die internationale Notfrequenz'] },
          { h: 'Zahlen, die du kennen musst', items: ['Mindestens 45 Flugstunden, davon mindestens 10 allein (solo)', 'Höhe in Fuß, Geschwindigkeit in Knoten (Seemeilen pro Stunde)', 'QNH: Luftdruck auf Meereshöhe umgerechnet, damit der Höhenmesser stimmt', 'METAR: Wetterbericht eines Flugplatzes'] },
          { h: 'Prüfung', items: ['Theorieprüfung beim Luftfahrt-Bundesamt bzw. Land (Luftrecht, Navigation, Meteorologie, Technik …)', 'Medical Klasse 2 beim Fliegerarzt', 'Praktische Prüfung: Checkflug mit Prüfer:in'] },
        ], outro: 'Und denk dran: Fliegen ist einfach. Landen ist die Kunst.' },
      quiz: [
        ['Wie heißt „P“ im Buchstabieralphabet?', 'Papa', 'Peter', 'Paris', 'Point'],
        ['Wie heißt „J“ im Buchstabieralphabet?', 'Juliett', 'Julius', 'Jack', 'Jupiter'],
        ['Welcher Transpondercode bedeutet Luftnotfall?', '7700', '7600', '7500', '7000'],
        ['Was bedeutet Squawk 7600?', 'Funkausfall', 'Entführung', 'Notlandung', 'Sichtflug'],
        ['Was ruft man bei Gefahr für Leib und Leben?', 'MAYDAY', 'PAN-PAN', 'SECURITÉ', 'ROGER'],
        ['Wie wird die Zahl 2 im Funk gesprochen?', 'zwo', 'zwei', 'two', 'tu'],
        ['Was ist QNH?', 'Luftdruck auf Meereshöhe für den Höhenmesser', 'Eine Funkfrequenz', 'Die Startbahnlänge', 'Ein Wolkentyp'],
        ['Was ist ein METAR?', 'Wetterbericht eines Flugplatzes', 'Ein Flugzeugteil', 'Ein Pilotenausweis', 'Ein Luftraum'],
        ['Mindestens wie viele Flugstunden braucht man für die PPL?', '45', '10', '100', '250'],
        ['Was ist 121,5 MHz?', 'Die internationale Notfrequenz', 'Die Frequenz des Towers in Köln', 'Ein Radiosender', 'Die Bordspannung'],
        ['Wie heißt „X“ im Buchstabieralphabet?', 'X-ray', 'Xylophon', 'Xenon', 'Xaver'],
      ],
      practical: { name: 'Checkflug mit Prüferin', stat: 'body', dc: 12 },
      unlock: { title: '', perk: 'pilot', flag: 'pilot', happy: 15, power: 3, note: 'Du darfst fliegen (nicht gewerblich). Freunde zu Rundflügen einladen geht jetzt.' },
    },
    {
      id: 'atpl', name: 'Verkehrspilot:in ATPL (Flugschule)', cat: 'Fliegen', cost: 95000, examFee: 600, months: 18, loan: true,
      req: { age: 18, abi: true, health: 70, certs: ['ielts'] }, text: 'Airline-Pilot:in werden. Teuer, hart, aber danach im Cockpit eines Jets.',
      doc: { title: 'Lernzettel: Verkehrspilot', intro: 'Du willst also Leute durch die Gegend fliegen. Respekt. Hier die Basics, die jede Airline von dir erwartet.',
        sections: [
          { h: 'Ausbildung', items: ['ATPL-Theorie: 13 Fächer, Prüfungen beim Luftfahrt-Bundesamt', 'Medical Klasse 1 (strenger als Klasse 2)', 'Englisch ist die Sprache der Luftfahrt (Language Proficiency mindestens Level 4)', 'Danach: Type Rating für ein bestimmtes Flugzeugmuster'] },
          { h: 'Im Cockpit', items: ['Captain sitzt links, First Officer rechts', 'V1: Entscheidungsgeschwindigkeit beim Start, danach wird nicht mehr abgebrochen', 'Flugfläche FL350 heißt 35.000 Fuß', 'Checklisten werden immer laut abgearbeitet'] },
          { h: 'Codes und Funk', items: [NATO, '7700 Notfall, 7600 Funkausfall, 7500 Entführung'] },
        ], outro: 'Wenn du das schaffst, sagst du demnächst „Meine Damen und Herren, hier spricht Ihr Kapitän“. Ich krieg Gänsehaut. Hätte ich Haut.' },
      quiz: [
        ['Wo sitzt der Captain im Cockpit?', 'Links', 'Rechts', 'Hinten', 'In der Mitte'],
        ['Was ist V1?', 'Entscheidungsgeschwindigkeit beim Start', 'Höchstgeschwindigkeit', 'Landegeschwindigkeit', 'Name eines Triebwerks'],
        ['Was bedeutet FL350?', '35.000 Fuß', '350 Meter', '3.500 Fuß', '350 Knoten'],
        ['Welches Medical brauchen Verkehrspilot:innen?', 'Klasse 1', 'Klasse 2', 'Klasse 3', 'keins'],
        ['Was ist ein Type Rating?', 'Berechtigung für ein bestimmtes Flugzeugmuster', 'Eine Bewertung der Airline', 'Ein Sitzplan', 'Ein Wetterbericht'],
        ['Was bedeutet Squawk 7500?', 'Entführung', 'Notfall', 'Funkausfall', 'Landung'],
        ['Wie viele Theoriefächer hat die ATPL ungefähr?', '13', '3', '30', '1'],
        ['Wie heißt „Q“ im Buchstabieralphabet?', 'Quebec', 'Queen', 'Quatro', 'Quark'],
      ],
      practical: { name: 'Skill Test im Simulator und im Flugzeug', stat: 'smart', dc: 13 },
      unlock: { title: 'Verkehrspilot:in', job: { name: 'First Officer (Airline)', gross: 5600, hours: 40, area: 'Luftfahrt' }, happy: 20, power: 8 },
    },
    {
      id: 'drohne', name: 'Drohnenführerschein A1/A3 (EU)', cat: 'Fliegen', cost: 25, examFee: 0, months: 1,
      req: { age: 16 }, text: 'Online-Kompetenznachweis fürs Drohnenfliegen. Klein, billig, schnell.',
      doc: { title: 'Lernzettel: Drohne A1/A3', intro: 'Bevor du deine Drohne in Omas Nachbargarten crasht, lies das.',
        sections: [{ h: 'Regeln', items: ['Maximal 120 Meter über Grund', 'Immer in Sichtweite fliegen', 'Nie über Menschenansammlungen', 'Drohnen mit Kamera oder über 250 g: Betreiber muss sich beim Luftfahrt-Bundesamt registrieren und eine e-ID ans Gerät kleben', 'Prüfung: online, 40 Multiple-Choice-Fragen'] }], outro: 'Und keine Videos von Leuten ohne deren Erlaubnis. Ich mein ja nur.' },
      quiz: [['Wie hoch darfst du in der offenen Kategorie maximal fliegen?', '120 Meter', '500 Meter', '50 Meter', 'unbegrenzt'], ['Wann musst du dich als Betreiber registrieren?', 'Ab 250 g oder mit Kamera', 'Nie', 'Nur ab 25 kg', 'Nur bei Nachtflügen'], ['Wo darfst du nicht fliegen?', 'Über Menschenansammlungen', 'Auf einem leeren Feld', 'Im eigenen Garten', 'Tagsüber'], ['Wie viele Fragen hat der Online-Test?', '40', '10', '100', '5']],
      practical: null, unlock: { perk: 'drohne', happy: 4, note: 'Drohnenvideos gehen jetzt legal. Influencer-Bonus.' },
    },
    {
      id: 'polizei', name: 'Einstellungstest Polizei', cat: 'Behörden', cost: 0, examFee: 0, months: 2,
      req: { age: 16, health: 60, noCrime: true }, text: 'Test, Sport, Arzt. Danach Ausbildung (mittlerer Dienst) oder Studium (gehobener Dienst, mit Abi).',
      doc: { title: 'Lernzettel: Polizei', intro: 'Du willst zur Polizei? Gut. Dann solltest du das hier wissen, bevor du in den Test gehst.',
        sections: [
          { h: 'Grundlagen', items: ['Notruf der Polizei: 110 (Feuerwehr und Rettung: 112)', 'Artikel 1 Grundgesetz: Die Würde des Menschen ist unantastbar', 'Polizei ist in Deutschland Ländersache (Landespolizei), dazu kommen Bundespolizei und BKA', 'Das Gewaltmonopol liegt beim Staat'] },
          { h: 'Paragrafen, die jeder Polizist kennt', items: ['§ 32 StGB: Notwehr', '§ 34 StGB: Rechtfertigender Notstand', '§ 127 StPO: Festnahmerecht (auch für jeden Bürger, wenn jemand auf frischer Tat ertappt wird)', '§ 263 StGB: Betrug'] },
          { h: 'Der Test', items: ['Deutsch (Diktat oder Rechtschreibung), Logik, Allgemeinwissen', 'Sporttest (Ausdauer, Kraft, Schwimmen)', 'Polizeiärztliche Untersuchung', 'Mittlerer Dienst: mit mittlerem Abschluss, 2,5 Jahre Ausbildung', 'Gehobener Dienst: mit Abitur, 3 Jahre Studium, danach Polizeikommissar:in'] },
          { h: 'Funk', items: [NATO] },
        ], outro: 'Und kein Gerücht über Mitspieler streuen. Ich weiß, wer das war.' },
      quiz: [
        ['Welche Notrufnummer hat die Polizei?', '110', '112', '115', '911'],
        ['Was regelt § 32 StGB?', 'Notwehr', 'Betrug', 'Diebstahl', 'Beleidigung'],
        ['Was steht in Artikel 1 des Grundgesetzes?', 'Die Würde des Menschen ist unantastbar', 'Alle Macht geht vom Volke aus', 'Die Polizei ist Bundessache', 'Wahlrecht ab 18'],
        ['Wer darf nach § 127 StPO jemanden auf frischer Tat vorläufig festnehmen?', 'Jeder', 'Nur Polizei', 'Nur Richter', 'Niemand'],
        ['Wer ist in Deutschland hauptsächlich für die Polizei zuständig?', 'Die Bundesländer', 'Die EU', 'Die Städte', 'Die Bundeswehr'],
        ['Was brauchst du für den gehobenen Dienst?', 'Abitur', 'Hauptschulabschluss', 'Führerschein Klasse C', 'Nichts'],
        ['Was regelt § 263 StGB?', 'Betrug', 'Notwehr', 'Mord', 'Verkehr'],
        ['Wie heißt „S“ im Buchstabieralphabet?', 'Sierra', 'Samuel', 'Santa', 'Sigma'],
        ['Wer hat in Deutschland das Gewaltmonopol?', 'Der Staat', 'Die Bürger', 'Private Sicherheitsfirmen', 'Vereine'],
      ],
      practical: { name: 'Sporttest und Polizeiarzt', stat: 'body', dc: 11 },
      unlock: { career: 'polizei', note: 'Bestanden! Die Polizei bietet dir einen Platz an.' },
    },
    {
      id: 'bundeswehr', name: 'Eignungstest Bundeswehr (Karrierecenter)', cat: 'Behörden', cost: 0, examFee: 0, months: 1,
      req: { age: 17, health: 60 }, text: 'Assessment im Karrierecenter. Danach Soldat:in auf Zeit, mit Sold, Uniform und Grundausbildung.',
      doc: { title: 'Lernzettel: Bundeswehr', intro: 'Stillgestanden. Kleiner Scherz. Aber lern das trotzdem.',
        sections: [
          { h: 'Aufbau', items: ['Teilstreitkräfte: Heer, Luftwaffe, Marine (dazu u. a. Sanitätsdienst und Cyber- und Informationsraum)', 'Im Frieden führt der oder die Bundesminister:in der Verteidigung, im Verteidigungsfall der oder die Bundeskanzler:in', 'Die Bundeswehr ist eine Parlamentsarmee: Auslandseinsätze braucht die Zustimmung des Bundestags', 'Leitbild: Staatsbürger in Uniform (Innere Führung)'] },
          { h: 'Dienstgrade (vereinfacht, aufsteigend)', items: ['Mannschaften: Soldat, Gefreiter', 'Unteroffiziere: Unteroffizier, Feldwebel', 'Offiziere: Leutnant, Hauptmann, Major, Oberst, General'] },
          { h: 'Basis-Fitness-Test', items: ['11 × 10 Meter Sprinttest', 'Klimmhang (an der Stange hängen)', '1000-Meter-Lauf'] },
          { h: 'Funk', items: [NATO] },
        ], outro: 'Und denk dran: Wer pünktlich ist, ist zu spät. Wer zu spät ist, macht Liegestütze.' },
      quiz: [
        ['Wer hat im Frieden die Befehlsgewalt über die Bundeswehr?', 'Bundesminister:in der Verteidigung', 'Bundespräsident:in', 'Bundestagspräsident:in', 'NATO-Generalsekretär'],
        ['Was braucht ein Auslandseinsatz der Bundeswehr?', 'Zustimmung des Bundestags', 'Zustimmung der UN-Vollversammlung', 'Nur einen Befehl', 'Eine Volksabstimmung'],
        ['Welcher Dienstgrad ist höher?', 'Hauptmann', 'Leutnant', 'Feldwebel', 'Gefreiter'],
        ['Was gehört zum Basis-Fitness-Test?', 'Klimmhang', 'Marathon', 'Bankdrücken', 'Schwimmen über 1 km'],
        ['Wie heißt das Leitbild der Bundeswehr?', 'Staatsbürger in Uniform', 'Kämpfer ohne Fragen', 'Soldat zuerst', 'Einer für alle'],
        ['Welche Teilstreitkraft gibt es?', 'Marine', 'Weltraumflotte', 'Polizei', 'Feuerwehr'],
        ['Wie heißt „B“ im Buchstabieralphabet?', 'Bravo', 'Berta', 'Boston', 'Baker'],
        ['Was kommt nach dem Unteroffizier (aufsteigend)?', 'Feldwebel', 'Gefreiter', 'Soldat', 'Rekrut'],
      ],
      practical: { name: 'Basis-Fitness-Test und Musterung', stat: 'body', dc: 10 },
      unlock: { career: 'bundeswehr', note: 'Geeignet. Die Bundeswehr bietet dir eine Verpflichtung als Soldat:in auf Zeit an.' },
    },
    {
      id: 'feuerwehr', name: 'Einstellungstest Berufsfeuerwehr', cat: 'Behörden', cost: 0, examFee: 0, months: 2,
      req: { age: 17, health: 65, certs: [] }, text: 'Sporttest, Höhentauglichkeit, Atemschutz-Untersuchung. Danach Ausbildung zur Brandmeisterin oder zum Brandmeister.',
      doc: { title: 'Lernzettel: Feuerwehr', intro: 'Feuer ist heiß. Das war der leichte Teil.',
        sections: [
          { h: 'Brandklassen', items: ['A: feste Stoffe (Holz, Papier)', 'B: Flüssigkeiten (Benzin)', 'C: Gase', 'D: Metalle', 'F: Speisefette und -öle – NIE mit Wasser löschen (Fettexplosion)'] },
          { h: 'Grundlagen', items: ['Notruf 112', 'Verbrennungsdreieck: Brennstoff, Sauerstoff, Zündtemperatur', 'Aufgaben: Retten, Löschen, Bergen, Schützen', 'Atemschutzgeräteträger brauchen eine ärztliche Untersuchung (G 26)'] },
        ], outro: 'Nimm keine Feuerwehrschläuche mit nach Hause. Die zählen nach.' },
      quiz: [['Welche Brandklasse sind Speisefette?', 'F', 'A', 'B', 'D'], ['Womit darfst du einen Fettbrand nie löschen?', 'Mit Wasser', 'Mit einer Löschdecke', 'Mit einem Deckel', 'Mit einem Fettbrandlöscher'], ['Was gehört zum Verbrennungsdreieck?', 'Brennstoff, Sauerstoff, Zündtemperatur', 'Wasser, Luft, Erde', 'Holz, Papier, Kohle', 'Licht, Wärme, Rauch'], ['Brandklasse B sind …', 'Flüssigkeiten', 'Metalle', 'Gase', 'Feste Stoffe'], ['Welche Nummer hat die Feuerwehr?', '112', '110', '116', '100'], ['Was sind die vier Aufgaben?', 'Retten, Löschen, Bergen, Schützen', 'Fahren, Warten, Löschen, Gehen', 'Kochen, Putzen, Löschen, Schlafen', 'Messen, Melden, Machen, Merken']],
      practical: { name: 'Sporttest und Höhentauglichkeit (Drehleiter)', stat: 'body', dc: 12 },
      unlock: { career: 'feuerwehr', note: 'Bestanden. Die Berufsfeuerwehr nimmt dich.' },
    },
    {
      id: 'rettsan', name: 'Rettungssanitäter:in (520 Stunden)', cat: 'Gesundheit', cost: 2400, examFee: 150, months: 4,
      req: { age: 18, health: 55 }, text: 'Kurzausbildung im Rettungsdienst. Danach Jobs im Krankentransport und auf dem Rettungswagen.',
      doc: { title: 'Lernzettel: Rettungssanitäter', intro: 'Leben retten in 520 Stunden. Kein Druck.',
        sections: [{ h: 'Basics', items: ['Ausbildung: 520 Stunden (Theorie, Klinik, Rettungswache, Prüfung)', 'Notruf 112', 'Herz-Lungen-Wiederbelebung: 30 Mal drücken, 2 Mal beatmen', 'ABCDE-Schema: Atemweg, Atmung (Breathing), Kreislauf (Circulation), Neurologie (Disability), Umgebung/Untersuchung (Exposure)', 'Rettungskette: Absichern, Notruf, Erste Hilfe, Rettungsdienst, Krankenhaus'] }], outro: 'Und nicht ohnmächtig werden, wenn Blut kommt. Es kommt immer Blut.' },
      quiz: [['Wie ist das Verhältnis bei der Wiederbelebung?', '30:2', '15:1', '5:5', '100:0'], ['Wofür steht das A im ABCDE-Schema?', 'Atemweg', 'Arzt', 'Adrenalin', 'Abtransport'], ['Wie lang ist die Ausbildung?', '520 Stunden', '20 Stunden', '3 Jahre', '1 Tag'], ['Welche Nummer rufst du für den Rettungsdienst?', '112', '110', '0800', '118'], ['Was steht am Anfang der Rettungskette?', 'Absichern', 'Krankenhaus', 'Rechnung', 'Pause']],
      practical: { name: 'Praktische Prüfung (Fallbeispiel am Phantom)', stat: 'smart', dc: 10 },
      unlock: { title: '', job: { name: 'Rettungssanitäter:in', gross: 2850, hours: 40, area: 'Gesundheit' }, power: 2, note: 'Jobs im Rettungsdienst stehen jetzt offen.' },
    },
    {
      id: 'rettungsschwimmer', name: 'Rettungsschwimmer Silber (DLRG)', cat: 'Wasser', cost: 80, examFee: 20, months: 1,
      req: { age: 15, health: 50 }, text: 'Pflicht für Jobs im Freibad. Schwimmen, Tauchen, Schleppen, Wiederbelebung.',
      doc: { title: 'Lernzettel: Rettungsschwimmer', intro: 'Wasser ist nass, Menschen ertrinken leise. Merk dir das.',
        sections: [{ h: 'Prüfung (vereinfacht)', items: ['Längere Strecke schwimmen unter Zeitlimit', 'Strecken- und Tieftauchen', 'Befreiungsgriffe aus Umklammerung', 'Einen Menschen schleppen', 'Herz-Lungen-Wiederbelebung 30:2', 'Ertrinken ist meistens leise: kein Winken, kein Rufen'] }], outro: 'Und im Sommer: Sonnencreme. Du bist Vorbild.' },
      quiz: [['Wie verhalten sich Ertrinkende meistens?', 'Leise, ohne zu winken', 'Laut rufend', 'Sie winken mit beiden Armen', 'Sie schwimmen ruhig'], ['Wiederbelebung: Verhältnis?', '30:2', '10:10', '2:30', '50:5'], ['Was übt man für Umklammerungen?', 'Befreiungsgriffe', 'Kraulbeinschlag', 'Rückwärtssalto', 'Startsprung']],
      practical: { name: 'Schwimmprüfung', stat: 'body', dc: 9 },
      unlock: { job: { name: 'Rettungsschwimmer:in im Freibad (Minijob)', gross: 603, hours: 10, area: 'Freizeit', kind: 'mini' }, note: 'Freibad-Jobs gehen jetzt.' },
    },
    {
      id: 'motorrad', name: 'Motorradführerschein A2', cat: 'Fahren', cost: 2600, examFee: 140, months: 3,
      req: { age: 18, health: 50 }, text: 'Motorräder bis 35 kW. Fahrschule, Theorie und Praxis.',
      doc: { title: 'Lernzettel: Motorrad A2', intro: 'Zwei Räder, null Knautschzone. Hör gut zu.',
        sections: [{ h: 'Wissen', items: ['A2: maximal 35 kW Leistung', 'Ab 18 Jahren, Klasse A direkt erst ab 24', 'Blickführung: Du fährst dahin, wo du hinschaust', 'Schutzkleidung: Helm ist Pflicht, Protektoren retten Leben', 'Gefahrbremsung: beide Bremsen, vorne kräftig dosiert'] }], outro: 'Und wenn du mich hinten mitnimmst: Ich halt mich nicht fest. Ich hab keine Arme.' },
      quiz: [['Wie viel Leistung darf ein A2-Motorrad maximal haben?', '35 kW', '11 kW', '100 kW', 'unbegrenzt'], ['Ab wann gibt es Klasse A direkt?', 'Ab 24', 'Ab 16', 'Ab 18', 'Ab 30'], ['Was ist bei der Blickführung wichtig?', 'Man fährt dahin, wo man hinschaut', 'Immer auf das Vorderrad schauen', 'Augen kurz schließen', 'In den Spiegel schauen'], ['Was ist beim Motorradfahren Pflicht?', 'Helm', 'Lederhose', 'Handschuhe mit Logo', 'Musik']],
      practical: { name: 'Praktische Prüfung mit Slalom und Gefahrbremsung', stat: 'body', dc: 11 },
      unlock: { flag: 'moto', happy: 8, note: 'Motorrad fahren erlaubt. Sommer wird anders.' },
    },
    {
      id: 'lkw', name: 'Führerschein C/CE + Berufskraftfahrer', cat: 'Fahren', cost: 7500, examFee: 300, months: 4, loan: true,
      req: { age: 18, license: true }, text: 'Lkw über 3,5 t mit Anhänger, plus Berufskraftfahrer-Qualifikation. Fahrer werden überall gesucht.',
      doc: { title: 'Lernzettel: Lkw', intro: 'Vierzig Tonnen und du. Was soll schon schiefgehen.',
        sections: [{ h: 'Regeln', items: ['Klasse C: über 3,5 t; CE: mit schwerem Anhänger', 'Lenkzeit: höchstens 9 Stunden am Tag (zweimal pro Woche 10)', 'Nach 4,5 Stunden Fahrt mindestens 45 Minuten Pause', 'Der Fahrtenschreiber (Tachograph) zeichnet alles auf', 'Ladungssicherung ist Pflicht des Fahrers'] }], outro: 'Und Autobahn-Elefantenrennen sind peinlich. Für alle.' },
      quiz: [['Wie lange darfst du normal pro Tag höchstens lenken?', '9 Stunden', '12 Stunden', '6 Stunden', '15 Stunden'], ['Nach wie vielen Stunden Fahrt brauchst du 45 Minuten Pause?', '4,5', '2', '8', '10'], ['Was zeichnet die Lenkzeiten auf?', 'Der Fahrtenschreiber', 'Das Navi', 'Die Polizei', 'Der Chef per Handy'], ['Ab welchem Gewicht braucht man Klasse C?', 'Über 3,5 t', 'Über 1 t', 'Über 10 t', 'Über 40 t']],
      practical: { name: 'Praktische Prüfung mit Rangieren', stat: 'body', dc: 11 },
      unlock: { job: { name: 'Berufskraftfahrer:in (Lkw)', gross: 3300, hours: 45, area: 'Logistik' }, note: 'Lkw-Jobs freigeschaltet.' },
    },
    {
      id: 'stapler', name: 'Staplerschein', cat: 'Fahren', cost: 290, examFee: 0, months: 1,
      req: { age: 18 }, text: 'Gabelstapler fahren. Macht dich im Lager wertvoller.',
      doc: { title: 'Lernzettel: Stapler', intro: 'Ein Stapler ist kein Autoscooter. Leider.',
        sections: [{ h: 'Basics', items: ['Grundlage: DGUV Grundsatz 308-001', 'Tragfähigkeitsdiagramm beachten: Je weiter der Lastschwerpunkt weg, desto weniger Last', 'Mit gesenkter Last fahren', 'Niemals Personen auf der Gabel mitnehmen'] }], outro: 'Wenn jemand fragt, ob er auf die Palette darf: Nein.' },
      quiz: [['Wie fährt man mit Last?', 'Gesenkt', 'Ganz oben', 'Schräg', 'Egal'], ['Darf jemand auf der Gabel mitfahren?', 'Nein, nie', 'Ja, kurz', 'Nur Chefs', 'Nur mit Helm'], ['Was zeigt das Tragfähigkeitsdiagramm?', 'Wie viel Last bei welchem Schwerpunkt geht', 'Den Tankinhalt', 'Die Arbeitszeit', 'Den Weg zum Lager']],
      practical: { name: 'Fahrprüfung im Lager', stat: 'body', dc: 8 },
      unlock: { job: { name: 'Staplerfahrer:in', gross: 2700, hours: 40, area: 'Logistik' }, note: 'Lager-Jobs zahlen jetzt besser.' },
    },
    {
      id: 'sportboot', name: 'Sportbootführerschein See', cat: 'Wasser', cost: 650, examFee: 120, months: 2,
      req: { age: 16 }, text: 'Motorboote auf dem Meer. Ab 15 PS Pflicht.',
      doc: { title: 'Lernzettel: Sportboot See', intro: 'Ahoi. Ich wollte das schon immer sagen.',
        sections: [{ h: 'Lichter und Seiten', items: ['Backbord = links = rotes Licht', 'Steuerbord = rechts = grünes Licht', 'Hecklicht: weiß'] }, { h: 'Regeln', items: ['Motorboot weicht Segelboot aus', 'Ein kurzer Ton: Ich ändere meinen Kurs nach Steuerbord', 'Zwei kurze Töne: nach Backbord', 'Drei kurze Töne: Maschine läuft rückwärts', 'UKW-Kanal 16: Notruf und Anruf', 'Führerscheinpflicht ab 15 PS Motorleistung'] }], outro: 'Und nicht vergessen: Rot ist links. Rotwein ist auch links, wenn du Rechtshänder bist.' },
      quiz: [['Welche Farbe hat das Licht an Backbord?', 'Rot', 'Grün', 'Weiß', 'Blau'], ['Was ist Steuerbord?', 'Rechts', 'Links', 'Hinten', 'Vorne'], ['Wer weicht aus?', 'Das Motorboot dem Segelboot', 'Das Segelboot dem Motorboot', 'Das Größere', 'Niemand'], ['Was bedeuten zwei kurze Töne?', 'Kursänderung nach Backbord', 'Kursänderung nach Steuerbord', 'Maschine rückwärts', 'Hallo'], ['Welcher UKW-Kanal ist für Notrufe?', '16', '1', '72', '99'], ['Ab wie viel PS braucht man den Schein?', '15', '5', '50', '150']],
      practical: { name: 'Praktische Prüfung auf dem Wasser (Mensch-über-Bord-Manöver)', stat: 'body', dc: 10 },
      unlock: { flag: 'boot', happy: 6, note: 'Boote mieten geht jetzt. Hamburg wartet.' },
    },
    {
      id: 'tauchen', name: 'Tauchschein Open Water', cat: 'Wasser', cost: 450, examFee: 0, months: 1,
      req: { age: 15, health: 55 }, text: 'Sporttauchen bis 18 Meter. Weltweit anerkannt.',
      doc: { title: 'Lernzettel: Tauchen', intro: 'Unter Wasser hört dich keiner schreien. Also gar nicht erst panisch werden.',
        sections: [{ h: 'Goldene Regeln', items: ['Nie den Atem anhalten (Gefahr der Lungenüberdehnung)', 'Immer mit Buddy tauchen', 'Maximale Tiefe für Open Water: 18 Meter', 'Langsam aufsteigen, Sicherheitsstopp 3 Minuten auf 5 Metern', 'Druckausgleich früh und oft', 'Handzeichen: Daumen hoch heißt AUFTAUCHEN, nicht „alles super“. OK ist ein Kreis aus Daumen und Zeigefinger'] }], outro: 'Und keine Haie streicheln. Auch nicht die kleinen.' },
      quiz: [['Was darfst du beim Tauchen nie?', 'Den Atem anhalten', 'Langsam aufsteigen', 'Mit Buddy tauchen', 'Druckausgleich machen'], ['Bis wie tief geht Open Water?', '18 Meter', '40 Meter', '5 Meter', '100 Meter'], ['Was heißt Daumen hoch unter Wasser?', 'Auftauchen', 'Alles super', 'Abtauchen', 'Hunger'], ['Wo macht man den Sicherheitsstopp?', 'Auf 5 Metern', 'An der Oberfläche', 'Auf 18 Metern', 'Am Grund']],
      practical: { name: 'Freiwassertauchgänge', stat: 'body', dc: 9 },
      unlock: { flag: 'diver', happy: 8, note: 'Tauchen weltweit. Reisen werden besser.' },
    },
    {
      id: 'jagd', name: 'Jagdschein („grünes Abitur“)', cat: 'Natur', cost: 2600, examFee: 250, months: 4,
      req: { age: 18, noCrime: true }, text: 'Schwere Prüfung: Wildbiologie, Recht, Waffen, Naturschutz, Schießen.',
      doc: { title: 'Lernzettel: Jagdschein', intro: 'Grünes Abitur. Ja, das heißt wirklich so. Und ja, es ist schwer.',
        sections: [{ h: 'Prüfungsfächer', items: ['Wildbiologie, Jagdbetrieb, Wildbrethygiene, Waffenrecht und Waffentechnik, Naturschutz, Hundewesen', 'Schriftlich, mündlich-praktisch und eine Schießprüfung'] }, { h: 'Begriffe', items: ['Schalenwild: Rehwild, Rotwild, Schwarzwild (Wildschweine)', 'Schonzeit: In dieser Zeit darf eine Wildart nicht bejagt werden', 'Hege: Pflege und Schutz des Wildbestands', 'Mindestalter: 18 (Jugendjagdschein ab 16)'] }], outro: 'Ich esse übrigens kein Wild. Ich esse gar nichts. Ich bin ein Server.' },
      quiz: [['Was ist Schwarzwild?', 'Wildschweine', 'Rehe', 'Hasen', 'Füchse'], ['Was bedeutet Schonzeit?', 'Die Wildart darf nicht bejagt werden', 'Die Jäger haben Urlaub', 'Man darf nur nachts jagen', 'Waffen werden gereinigt'], ['Wie nennt man den Jagdschein auch?', 'Grünes Abitur', 'Waldführerschein', 'Försterdiplom', 'Wildpass'], ['Was ist Hege?', 'Pflege und Schutz des Wildbestands', 'Eine Waffe', 'Ein Hund', 'Ein Hochsitz']],
      practical: { name: 'Schießprüfung und mündliche Prüfung', stat: 'body', dc: 12 },
      unlock: { flag: 'hunter', power: 2, note: 'Jagdschein in der Tasche. Die Dorfgemeinschaft respektiert dich.' },
    },
    {
      id: 'bewacher', name: 'Sachkundeprüfung § 34a GewO (Sicherheitsdienst)', cat: 'Behörden', cost: 400, examFee: 190, months: 2,
      req: { age: 18, noCrime: true }, text: 'IHK-Prüfung für Security in Clubs, Läden und auf Veranstaltungen.',
      doc: { title: 'Lernzettel: Sicherheitsdienst', intro: 'Security sein heißt nicht, Leute zu schubsen. Meistens.',
        sections: [{ h: 'Recht', items: ['§ 32 StGB: Notwehr', '§ 34 StGB: Notstand', '§ 127 StPO: Festnahmerecht für jeden bei frischer Tat', 'Hausrecht: Der Hausrechtsinhaber bestimmt, wer rein darf', 'Sicherheitsleute haben keine Polizeibefugnisse'] }, { h: 'Prüfung', items: ['Bei der IHK: schriftlich und mündlich', 'Themen: Recht, Umgang mit Menschen, Datenschutz, Unfallverhütung, Sicherheitstechnik'] }], outro: '„Du kommst hier nicht rein“ sagt man übrigens höflicher.' },
      quiz: [['Wo legt man die Sachkundeprüfung ab?', 'Bei der IHK', 'Bei der Polizei', 'Beim TÜV', 'Beim Bürgeramt'], ['Haben Sicherheitsleute Polizeibefugnisse?', 'Nein', 'Ja', 'Nur nachts', 'Nur in Clubs'], ['Welcher Paragraf erlaubt die Festnahme auf frischer Tat?', '§ 127 StPO', '§ 1 BGB', '§ 263 StGB', '§ 34a GewO'], ['Was ist § 34 StGB?', 'Notstand', 'Notwehr', 'Betrug', 'Hausfriedensbruch']],
      practical: { name: 'Mündliche Prüfung', stat: 'social', dc: 10 },
      unlock: { job: { name: 'Sicherheitsmitarbeiter:in (§ 34a)', gross: 2750, hours: 40, area: 'Sicherheit' }, note: 'Security-Jobs freigeschaltet.' },
    },
    {
      id: 'ielts', name: 'IELTS Academic (Englisch)', cat: 'Sprache', cost: 0, examFee: 249, months: 1,
      req: { age: 16 }, text: 'Sprachtest für Unis im Ausland und viele Berufe. Ergebnis in Bands von 0 bis 9.',
      doc: { title: 'Lernzettel: IELTS', intro: 'Hello. I am April. Your English is probably fine. Probably.',
        sections: [{ h: 'Aufbau', items: ['Vier Teile: Listening, Reading, Writing, Speaking', 'Ergebnis in Bands von 0 bis 9', 'Viele Unis verlangen Band 6,5 oder mehr', 'Academic für Studium, General Training für Arbeit und Migration'] }, { h: 'Fallen', items: ['„since“ mit Zeitpunkt (since 2020), „for“ mit Zeitraum (for two years)', '„affect“ ist meist ein Verb, „effect“ meist ein Nomen', 'Third conditional: If I had known, I would have come'] }], outro: 'Good luck. You will need it. Six seven.' },
      quiz: [['Wie viele Teile hat IELTS?', '4', '2', '6', '10'], ['Bis wie viele Bands geht IELTS?', '9', '100', '10', '120'], ['Was ist richtig?', 'I have lived here for two years', 'I have lived here since two years', 'I live here since two years', 'I am living here for since two years'], ['Was ist meistens das Verb?', 'affect', 'effect', 'beide', 'keins'], ['Welche Variante braucht man fürs Studium?', 'Academic', 'General Training', 'Kids', 'Business Only'], ['Third conditional:', 'If I had known, I would have come', 'If I know, I came', 'If I knew, I come', 'If I will know, I would come']],
      practical: null, unlock: { cert: 'ielts', note: 'Englisch zertifiziert. Unis im Ausland gehen jetzt.' },
    },
    {
      id: 'tms', name: 'Medizinertest TMS', cat: 'Studium', cost: 0, examFee: 100, months: 2,
      req: { age: 16 }, text: 'Test für Medizin, Zahnmedizin und Pharmazie. Ein gutes Ergebnis verbessert deine Chance auf einen Studienplatz.',
      doc: { title: 'Lernzettel: TMS', intro: 'Du willst Ärztin oder Arzt werden. Dann zeig, dass dein Hirn schnell ist.',
        sections: [{ h: 'Untertests', items: ['Muster zuordnen', 'Medizinisch-naturwissenschaftliches Grundverständnis', 'Schlauchfiguren (räumliches Denken)', 'Quantitative und formale Probleme', 'Textverständnis', 'Figuren lernen und Fakten lernen (Gedächtnis)', 'Diagramme und Tabellen'] }, { h: 'Tipps', items: ['Zeitdruck ist der Hauptgegner', 'Schlauchfiguren kann man trainieren', 'Wer das Ergebnis hat, wird bei der Studienplatzvergabe besser gerankt'] }], outro: 'Schlauchfiguren. Das klingt harmloser, als es ist.' },
      quiz: [['Wofür ist der TMS?', 'Medizinische Studiengänge', 'Jura', 'Führerschein', 'Polizei'], ['Was testen Schlauchfiguren?', 'Räumliches Denken', 'Rechtschreibung', 'Sport', 'Englisch'], ['Was ist der Hauptgegner im TMS?', 'Zeitdruck', 'Lautstärke', 'Hunger', 'Der Stift']],
      practical: null, unlock: { cert: 'tms', note: 'TMS geschafft. Medizin-NC zählt für dich jetzt etwas weniger streng.' },
    },
    {
      id: 'lid', name: 'Einbürgerungstest „Leben in Deutschland“', cat: 'Behörden', cost: 0, examFee: 25, months: 1,
      req: { age: 16 }, text: 'Pflicht für die Einbürgerung. Wer will, kann auch einfach testen, ob er mehr weiß als die Deutschen.',
      doc: { title: 'Lernzettel: Leben in Deutschland', intro: 'Wie gut kennst du das Land, in dem wir spielen? Lass mal sehen.',
        sections: [{ h: 'Test', items: ['33 Fragen, mindestens 17 richtig zum Bestehen'] }, { h: 'Fakten', items: ['Grundgesetz seit 1949', 'Mauerfall 1989, Wiedervereinigung am 3. Oktober 1990', '16 Bundesländer', 'Wählen bei der Bundestagswahl ab 18', 'Der Bundestag wählt den Bundeskanzler', 'Staatsoberhaupt ist der Bundespräsident', 'Deutschland ist ein demokratischer und sozialer Bundesstaat'] }], outro: 'Wenn du das nicht schaffst, schick ich dich in die Integrationskurs-Schleife. Liebevoll.' },
      quiz: [['Wie viele Fragen muss man mindestens richtig haben?', '17 von 33', '33 von 33', '10 von 33', '25 von 33'], ['Seit wann gibt es das Grundgesetz?', '1949', '1990', '1871', '1919'], ['Wann ist der Tag der Deutschen Einheit?', '3. Oktober', '9. November', '1. Mai', '17. Juni'], ['Wer ist Staatsoberhaupt?', 'Der Bundespräsident', 'Der Bundeskanzler', 'Der Papst', 'Der Bundesrat'], ['Ab wann darf man den Bundestag wählen?', '18', '16', '21', '14']],
      practical: null, unlock: { flag: 'lid', note: 'Bestanden. Du weißt jetzt mehr über Deutschland als die meisten Deutschen.' },
    },
    {
      id: 'meister', name: 'Meisterprüfung (Handwerk)', cat: 'Beruf', cost: 9500, examFee: 1200, months: 12, loan: true,
      req: { age: 20, trained: true }, text: 'Vier Teile, viel Arbeit. Danach darfst du einen eigenen Betrieb führen und Azubis ausbilden.',
      doc: { title: 'Lernzettel: Meister', intro: 'Meister:in werden. Das ist wie Bachelor, nur mit Händen.',
        sections: [{ h: 'Aufbau', items: ['Teil I: Fachpraxis (Meisterstück)', 'Teil II: Fachtheorie', 'Teil III: Betriebswirtschaft und Recht', 'Teil IV: Berufs- und Arbeitspädagogik (Ausbilderschein)', 'Förderung: Aufstiegs-BAföG („Meister-BAföG“)', 'Der Meister steht im Deutschen Qualifikationsrahmen auf Stufe 6, wie ein Bachelor', 'In zulassungspflichtigen Handwerken braucht man ihn für einen eigenen Betrieb'] }], outro: 'Danach darfst du andere Leute anschreien. Pädagogisch wertvoll.' },
      quiz: [['Wie viele Teile hat die Meisterprüfung?', '4', '2', '6', '1'], ['Was ist Teil IV?', 'Berufs- und Arbeitspädagogik', 'Fachpraxis', 'Sport', 'Englisch'], ['Wie heißt die Förderung?', 'Aufstiegs-BAföG', 'Kindergeld', 'Wohngeld', 'Bürgergeld'], ['Welcher Stufe im DQR entspricht der Meister?', '6 (wie Bachelor)', '1', '8', '3']],
      practical: { name: 'Meisterstück', stat: 'work', dc: 12 },
      unlock: { title: 'Meister:in', job: { name: 'Meister:in im Handwerk', gross: 4300, hours: 40, area: 'Handwerk' }, flag: 'meister', power: 5, note: 'Meisterbrief! Eigener Betrieb und Ausbilden gehen jetzt.' },
    },
    {
      id: 'barkeeper', name: 'Barkeeper-Kurs', cat: 'Beruf', cost: 390, examFee: 0, months: 1,
      req: { age: 18 }, text: 'Cocktails, Jugendschutz, Speed. Danach Jobs hinter der Bar.',
      doc: { title: 'Lernzettel: Barkeeper', intro: 'Shaken, nicht rühren. Außer bei Negroni. Den rührt man.',
        sections: [{ h: 'Rezepte', items: ['Caipirinha: Cachaça, Limette, Rohrzucker, Eis', 'Mojito: weißer Rum, Minze, Limette, Zucker, Soda', 'Negroni: Gin, Wermut, Campari, gerührt', 'Ein einfacher Shot sind 2 cl'] }, { h: 'Jugendschutz', items: ['Bier und Wein ab 16', 'Hochprozentiges (Schnaps, Cocktails mit Spirituosen) ab 18'] }], outro: 'Und dem Typen, der „was Starkes, Überraschung“ bestellt, gibst du Wasser.' },
      quiz: [['Was kommt in eine Caipirinha?', 'Cachaça', 'Wodka', 'Tequila', 'Gin'], ['Ab wann darf man Hochprozentiges trinken?', '18', '16', '14', '21'], ['Wie viel ist ein einfacher Shot?', '2 cl', '10 cl', '0,5 l', '1 cl'], ['Welcher Cocktail wird gerührt?', 'Negroni', 'Mojito', 'Caipirinha', 'Pina Colada']],
      practical: { name: 'Speedtest hinter der Bar', stat: 'social', dc: 9 },
      unlock: { job: { name: 'Barkeeper:in', gross: 2500, hours: 40, area: 'Gastro' }, note: 'Bar-Jobs gehen jetzt.' },
    },
    {
      id: 'fallschirm', name: 'Fallschirmspringer-Lizenz (AFF)', cat: 'Abenteuer', cost: 3200, examFee: 80, months: 2,
      req: { age: 18, health: 60 }, text: 'Accelerated Freefall: aus 4.000 Metern, erst mit Lehrern, dann allein.',
      doc: { title: 'Lernzettel: Fallschirm', intro: 'Aus einem funktionierenden Flugzeug springen. Freiwillig. Okay.',
        sections: [{ h: 'Basics', items: ['AFF heißt Accelerated Freefall', 'Absprung meist aus etwa 4.000 Metern', 'Jeder trägt einen Hauptschirm und einen Reserveschirm', 'Der Höhenmesser ist dein wichtigstes Instrument', 'Schüler öffnen den Schirm deutlich höher als erfahrene Springer'] }], outro: 'Wenn der Schirm nicht aufgeht: Reserve. Wenn die nicht aufgeht: Ich schreibe eine schöne Lebensbilanz.' },
      quiz: [['Wofür steht AFF?', 'Accelerated Freefall', 'Air Force Flight', 'Auto Fall Fast', 'Alpha Foxtrot Foxtrot'], ['Wie viele Schirme trägt man?', 'Zwei: Haupt- und Reserveschirm', 'Einen', 'Drei', 'Keinen'], ['Was ist das wichtigste Instrument?', 'Der Höhenmesser', 'Das Handy', 'Die Uhr', 'Der Kompass']],
      practical: { name: 'Solosprung', stat: 'body', dc: 10 },
      unlock: { flag: 'skydiver', happy: 14, power: 2, note: 'Lizenz! Du springst jetzt allein. April schaut weg.' },
    },
    {
      id: 'astronaut', name: 'ESA-Astronautenauswahl', cat: 'Abenteuer', cost: 0, examFee: 0, months: 6,
      req: { age: 27, health: 80, master: true, certs: ['ppl'] }, text: 'Die härteste Auswahl der Welt. Zehntausende bewerben sich, eine Handvoll kommt durch.',
      doc: { title: 'Lernzettel: Astronaut:in', intro: 'Okay, wow. Du meinst das ernst. Ich bin stolz und ein bisschen neidisch.',
        sections: [{ h: 'Voraussetzungen', items: ['Master in Naturwissenschaft, Ingenieurwesen, Medizin, Mathe oder Informatik, oder Testpilot:in', 'Sehr gute Gesundheit und Belastbarkeit', 'Mehrere Sprachen, Englisch ist Pflicht'] }, { h: 'Die ISS', items: ['Die Internationale Raumstation fliegt in etwa 400 Kilometern Höhe', 'Sie umrundet die Erde ungefähr alle 90 Minuten', 'Bei der letzten ESA-Auswahl gab es über 22.000 Bewerbungen'] }], outro: 'Bring mir was mit. Einen Stein vom Mond. Oder einfach ein Foto.' },
      quiz: [['In welcher Höhe fliegt die ISS ungefähr?', '400 km', '40 km', '4.000 km', '36.000 km'], ['Wie lange braucht die ISS für eine Erdumrundung?', 'Etwa 90 Minuten', 'Einen Tag', 'Eine Woche', '10 Minuten'], ['Wie viele Bewerbungen gab es bei der letzten ESA-Auswahl ungefähr?', 'Über 22.000', '200', '2 Millionen', '50']],
      practical: { name: 'Zentrifuge, Isolationstest, Interviews', stat: 'body', dc: 17 },
      unlock: { title: 'Astronaut:in', job: { name: 'Astronaut:in (ESA)', gross: 7800, hours: 50, area: 'Raumfahrt' }, flag: 'famous', power: 20, happy: 20, note: 'DU FLIEGST INS ALL. April weint Bits.' },
    },
  ];
  // Karrieren nach bestandenem Test: Ausbildung oder Verpflichtung
  const CAREERS = {
    polizei: (c) => (c.flags.abi
      ? { name: 'Polizeikommissaranwärter:in (Studium gehobener Dienst)', area: 'Verwaltung', years: 3, pay: [1550, 1550, 1550], after: 3700, firm: 'Landespolizei', startM: 8, title: 'Polizeikommissar:in' }
      : { name: 'Polizeimeisteranwärter:in (mittlerer Dienst)', area: 'Verwaltung', years: 2.5, pay: [1450, 1450, 1450], after: 3200, firm: 'Landespolizei', startM: 8, title: 'Polizeimeister:in' }),
    bundeswehr: () => ({ name: 'Soldat:in auf Zeit (4 Jahre)', area: 'Verwaltung', years: 4, pay: [2400, 2500, 2650, 2800], after: 3400, firm: 'Bundeswehr', startM: -1, title: 'Unteroffizier:in' }),
    feuerwehr: () => ({ name: 'Brandmeisteranwärter:in', area: 'Verwaltung', years: 1.5, pay: [1500, 1500], after: 3100, firm: 'Berufsfeuerwehr', startM: -1, title: 'Brandmeister:in' }),
  };

  // ---------- Engine ----------
  const byId = (id) => COURSES.find((x) => x.id === id);
  function reqError(S, c, K, X) {
    const r = K.req || {};
    if (r.age && c.age < r.age) return `Erst ab ${r.age}.`;
    if (r.health && c.stats.health < r.health) return `Gesundheit zu schlecht (mindestens ${r.health}).`;
    if (r.abi && !c.flags.abi) return 'Dafür brauchst du das Abitur.';
    if (r.license && !c.license.has) return 'Dafür brauchst du den Autoführerschein.';
    if (r.trained && !c.flags.trained && !c.flags.bachelor) return 'Dafür brauchst du eine abgeschlossene Ausbildung.';
    if (r.master && !c.flags.master) return 'Dafür brauchst du einen Master oder ein Staatsexamen.';
    if (r.noCrime && c.flags.crime) return 'Mit Vorstrafe wirst du nicht genommen.';
    const miss = (r.certs || []).filter((x) => !(c.certs || []).includes(x));
    if (miss.length) return `Erst: ${miss.map((x) => byId(x).name).join(', ')}.`;
    if (c.key === 'april' && !c.flags.body && /body/.test((K.practical || {}).stat || '')) return 'Ohne Körper keine Praxisprüfung. Erst einen Roboterkörper.';
    return null;
  }
  function act(S, pid, a, X) {
    const c = S.chars[pid];
    if (!c || c.dead) return 'Deine Figur lebt nicht mehr.';
    if (S.phase !== 'act') return 'Geht nur, während ihr plant.';
    const K = byId(a.id);
    if (!K) return 'Gibt es nicht.';
    c.courses = c.courses || {};
    const st = c.courses[K.id];
    if (a.type === 'aEnroll') {
      if ((c.certs || []).includes(K.id)) return 'Hast du schon.';
      if (st && st.status === 'learning') return 'Du bist schon angemeldet.';
      const err = reqError(S, c, K, X);
      if (err) return err;
      if (K.cost && c.stats.money + c.bank.dispo < K.cost) {
        if (!K.loan) return `Kostet ${X.eur(K.cost)}. Das hast du nicht.`;
        if (c.bank.schufa < 60) return 'Bildungskredit abgelehnt: SCHUFA zu schlecht.';
        const amount = K.cost - Math.max(0, c.stats.money);
        c.bank.loans.push({ id: X.uid('k'), why: `Bildungskredit ${K.name}`, orig: amount, rest: amount, rate: Math.round((S.econ.zins + 0.8) * 100) / 100, annuity: Math.round(amount / 96 + amount * 0.04 / 12) });
        c.stats.money += amount;
        X.report(S, pid, '•', `Bildungskredit über ${X.eur(amount)} für ${K.name}.`, '');
      }
      c.stats.money -= K.cost;
      c.courses[K.id] = { status: 'learning', prep: 0, since: X.idx(S.date), theory: false, tries: 0 };
      // April schickt den Lernzettel in den Chat
      S.chat.push({ id: X.uid('c'), pid: 'april', name: 'April', color: '#ff7ae6', t: `${c.name}, hier ist dein Lernzettel für ${K.name}.`, doc: K.id, to: pid, d: X.dateText(S) });
      if (S.chat.length > 120) S.chat.shift();
      c.chronicle.push({ d: X.dateText(S), t: `Meldet sich an: ${K.name}.` });
      X.log(S, `${c.name} meldet sich an: ${K.name}${K.cost ? ` (${X.eur(K.cost)})` : ''}.`);
      return null;
    }
    if (a.type === 'aBook') {
      if (!st || st.status !== 'learning') return 'Erst anmelden.';
      const kind = !st.theory ? 'ac-theory' : 'ac-practical';
      if (c.appts.some((t) => t.status === 'open' && t.data && t.data.course === K.id)) return 'Der Prüfungstermin steht schon.';
      const minIdx = st.since + Math.max(1, Math.ceil(K.months / 2));
      const t = Math.max(X.idx(S.date) + 1, kind === 'ac-theory' ? minIdx : X.idx(S.date) + 1);
      X.addAppt(S, c, { kind, y: Math.floor(t / 12), m: t % 12, d: 5 + X.rnd(20), title: `${kind === 'ac-theory' ? 'Prüfung' : (K.practical || {}).name || 'Praxis'}: ${K.name}`, where: K.cat, fee: K.examFee, data: { course: K.id } });
      return null;
    }
    return 'Unbekannt.';
  }
  function grant(S, pid, c, K, X) {
    c.courses[K.id].status = 'done';
    c.certs = (c.certs || []).concat(K.id);
    const U = K.unlock || {};
    if (U.title && !c.title) c.title = U.title;
    if (U.flag) c.flags[U.flag] = 1;
    if (U.happy) c.stats.happy = X.clampStat(c.stats.happy + U.happy);
    if (U.power) c.stats.power = X.clampStat(c.stats.power + U.power);
    if (U.perk) c.perks = (c.perks || []).concat({ kind: U.perk, discount: 0 });
    X.report(S, pid, '•', `ZERTIFIKAT: ${K.name}. ${U.note || ''}`, 'good');
    c.chronicle.push({ d: X.dateText(S), t: `Bestanden: ${K.name}.` });
    X.log(S, `${c.name} hat bestanden: ${K.name}.`);
    if (U.job) {
      const o = Object.assign({ cat: 'job', req: 'cert:' + K.id, firm: U.job.firm || jobFirm(K), city: c.home.city, kind: U.job.kind || 'voll' }, U.job);
      const t = X.idx(S.date) + 1;
      X.addAppt(S, c, { kind: 'interview', y: Math.floor(t / 12), m: t % 12, d: 10, title: `Vorstellungsgespräch: ${o.name} bei ${o.firm}`, where: o.firm, data: { listing: `cert:${K.id}`, offer: o } });
    }
    if (U.career) {
      const tr = Object.assign({ cat: 'training', req: '-' }, CAREERS[U.career](c));
      const start = tr.startM >= 0 ? (S.date.m <= tr.startM ? S.date.y * 12 + tr.startM : (S.date.y + 1) * 12 + tr.startM) : X.idx(S.date) + 1;
      X.addAppt(S, c, { kind: 'start-training', y: Math.floor(start / 12), m: start % 12, d: 1, title: `Dienstantritt: ${tr.name}`, where: tr.firm, data: { offer: tr } });
      X.report(S, pid, '•', `Zusage: ${tr.name}. Dienstantritt am 1. ${X.MONTHS[start % 12]} ${Math.floor(start / 12)}.`, 'good');
    }
  }
  const jobFirm = (K) => ({ atpl: 'Lufthansa-Konkurrenz „Dulidan Air“', rettsan: 'Rettungsdienst', rettungsschwimmer: 'Freibad', lkw: 'Spedition', stapler: 'Logistikzentrum', bewacher: 'Sicherheitsfirma', meister: 'Handwerksbetrieb', barkeeper: 'Cocktailbar', astronaut: 'ESA' })[K.id] || 'Arbeitgeber';
  function appt(S, pid, ap, dec, late, X) {
    const c = S.chars[pid], K = byId(ap.data && ap.data.course);
    if (!K || !c.courses || !c.courses[K.id]) return false;
    const st = c.courses[K.id];
    if (dec.d === 'skip' || late) { if (ap.fee) c.stats.money -= ap.fee; X.report(S, pid, '•', `${ap.title}: nicht erschienen.${ap.fee ? ` ${X.eur(ap.fee)} Gebühr sind weg.` : ''}`, 'bad'); return true; }
    if (dec.d === 'sick') { X.report(S, pid, '•', `${ap.title}: abgesagt. Neu buchen.`); return true; }
    if (ap.fee) c.stats.money -= ap.fee;
    st.tries++;
    if (ap.kind === 'ac-theory') {
      let ok;
      if (dec.quiz && dec.quiz.total) ok = dec.quiz.ok / dec.quiz.total >= 0.6;
      else ok = X.d20() + Math.floor(st.prep / 12) + (c.flags.study ? 2 : 0) >= 13;
      if (!ok) { X.report(S, pid, '•', `${K.name}: Theorie nicht bestanden${dec.quiz ? ` (${dec.quiz.ok}/${dec.quiz.total})` : ''}. Weiterlernen, neu buchen.`, 'bad'); return true; }
      st.theory = true;
      X.report(S, pid, '•', `${K.name}: Theorie bestanden${dec.quiz ? ` (${dec.quiz.ok}/${dec.quiz.total})` : ''}.${K.practical ? ` Jetzt die Praxis buchen: ${K.practical.name}.` : ''}`, 'good');
      if (!K.practical) grant(S, pid, c, K, X);
      return true;
    }
    const D = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
    const roll = X.d20(), m = D ? D.mod(c, K.practical.stat) : 0, score = roll + m + Math.floor(st.prep / 25);
    if (roll !== 1 && score >= K.practical.dc) grant(S, pid, c, K, X);
    else X.report(S, pid, '•', `${K.practical.name}: nicht bestanden (Wurf ${roll}${m ? `${m > 0 ? '+' : ''}${m}` : ''} gegen ${K.practical.dc}). Neu buchen.`, 'bad');
    return true;
  }
  // Lernen im Monatsfokus
  function study(S, pid, c, ids, M, X) {
    const D = root.DULI_LARP_DECK || (isNode ? require('./larp-deck') : null);
    (ids || []).forEach((id) => {
      const st = c.courses && c.courses[id];
      if (!st || st.status !== 'learning') return;
      st.prep = Math.min(100, st.prep + Math.round((18 + (D ? D.mod(c, 'smart') : 0) * 1.5) * M));
      X.report(S, pid, '•', `Gelernt für ${byId(id).name}: Vorbereitung ${st.prep}/100.`);
    });
  }

  const ACADEMY = { COURSES, CAREERS, byId, reqError, act, appt, study, NATO };
  if (isNode) module.exports = ACADEMY;
  else root.DULI_LARP_ACADEMY = ACADEMY;
})(typeof window !== 'undefined' ? window : globalThis);
