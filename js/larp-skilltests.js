// DULIDAN LARP EXTREME – Einstufungstests für Skills. Jeder Skill hat einen passenden Test:
// Quiz (Wissen, Sprachen), Rhythmus (Musik, Tanz), Reaktion (Sport), Farbe (Design, Kunst), Tippen (Schreiben), Gedächtnis (Schauspiel, eigene Skills).
// Ergebnis: 0–100 Punkte, daraus macht die Engine das Level.
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const FX = () => window.DULI_FX;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // [Frage, richtig, falsch, falsch, falsch] – von leicht nach schwer
  const QUIZ = {
    Programmieren: [['Was gibt `console.log(2 + "2")` in JavaScript aus?', '22', '4', 'NaN', 'Fehler'], ['Was ist eine Schleife?', 'Code, der sich wiederholt', 'Ein Fehler im Programm', 'Eine Variable', 'Ein Kommentar'], ['Was speichert man in einem Array?', 'Eine Liste von Werten', 'Nur eine Zahl', 'Ein Passwort', 'Eine Funktion zum Löschen'], ['Was bedeutet O(n²)?', 'Die Laufzeit wächst quadratisch mit der Eingabe', 'Das Programm braucht 2 Sekunden', 'Es gibt n Fehler', 'Der Speicher ist doppelt so groß'], ['Was macht `git commit`?', 'Speichert einen Stand der Änderungen im Repository', 'Lädt Code aus dem Internet', 'Löscht alle Dateien', 'Startet das Programm'], ['Welcher Datentyp ist `true`?', 'Boolean', 'String', 'Integer', 'Array'], ['Was ist Rekursion?', 'Eine Funktion ruft sich selbst auf', 'Ein Virus', 'Eine Datenbank', 'Ein Grafikfehler']],
    Webdesign: [['Wofür steht CSS?', 'Cascading Style Sheets', 'Computer Style System', 'Creative Site Setup', 'Coded Simple Styles'], ['Was ist responsives Design?', 'Die Seite passt sich an jede Bildschirmgröße an', 'Die Seite antwortet auf E-Mails', 'Die Seite lädt schneller', 'Die Seite ist nur für Handys'], ['Welches HTML-Element ist für die wichtigste Überschrift?', '<h1>', '<head>', '<title>', '<p>'], ['Was ist ein guter Farbkontrast für Text?', 'Dunkler Text auf hellem Grund (oder umgekehrt)', 'Hellgrau auf Weiß', 'Rot auf Grün', 'Gelb auf Weiß'], ['Wofür steht UX?', 'User Experience', 'Ultra Extended', 'Universal XML', 'User Export'], ['Was macht `display: flex`?', 'Ordnet Elemente flexibel in Reihe oder Spalte an', 'Macht Text fett', 'Versteckt ein Element', 'Lädt Schriftarten']],
    'KI und Daten': [['Was ist Machine Learning?', 'Computer lernen Muster aus Daten', 'Roboter bauen Maschinen', 'Ein Programmierkurs', 'Schnelleres Internet'], ['Was ist ein Datensatz?', 'Eine Sammlung von Daten', 'Ein Satz in einem Buch', 'Ein Passwort', 'Ein Server'], ['Was ist Überanpassung (Overfitting)?', 'Das Modell lernt die Trainingsdaten auswendig und verallgemeinert schlecht', 'Das Modell ist zu klein', 'Der Computer überhitzt', 'Zu wenig Speicher'], ['Wofür nutzt man einen Mittelwert?', 'Um den typischen Wert einer Zahlenreihe zu beschreiben', 'Um Daten zu löschen', 'Um Bilder zu malen', 'Um Passwörter zu speichern'], ['Was ist ein neuronales Netz?', 'Ein Modell aus vielen verbundenen Rechenknoten', 'Ein WLAN', 'Ein Teil des Gehirns', 'Eine Social-Media-App']],
    'IT-Sicherheit': [['Was ist Phishing?', 'Gefälschte Nachrichten, um Zugangsdaten zu stehlen', 'Angeln im Internet', 'Ein Virenscanner', 'Ein schnelles Netzwerk'], ['Welches Passwort ist am sichersten?', 'Lange zufällige Passphrase mit Sonderzeichen', '123456', 'Dein Geburtstag', 'passwort'], ['Was macht Zwei-Faktor-Authentifizierung?', 'Sie verlangt einen zweiten Nachweis zusätzlich zum Passwort', 'Sie verdoppelt die Internetgeschwindigkeit', 'Sie speichert zwei Passwörter', 'Sie löscht alte Konten'], ['Was ist Ransomware?', 'Schadsoftware, die Daten verschlüsselt und Lösegeld fordert', 'Ein Backup-Programm', 'Ein Grafiktreiber', 'Eine Firewall'], ['Was ist ein Backup?', 'Eine Sicherungskopie von Daten', 'Ein Fehler', 'Ein Virus', 'Ein Update']],
    'Game Design': [['Was ist ein „Game Loop“?', 'Der Kern-Ablauf, den Spieler immer wieder durchlaufen', 'Ein Bug', 'Ein Controller', 'Der Abspann'], ['Was beschreibt „Balancing“?', 'Spielelemente so abstimmen, dass nichts übermächtig ist', 'Auf einem Bein stehen', 'Grafik verbessern', 'Musik lauter machen'], ['Was ist ein Tutorial?', 'Ein Spielabschnitt, der die Regeln beibringt', 'Ein Bonuslevel', 'Ein Cheat', 'Ein Endgegner'], ['Wofür steht MVP in der Spieleentwicklung?', 'Minimum Viable Product', 'Most Valuable Player', 'Mega Video Production', 'Main Visual Plan'], ['Was ist „Juice“ in Games?', 'Kleine Effekte und Feedback, die Aktionen befriedigend machen', 'Ein Energydrink', 'Der Speicherstand', 'Die Story']],
    '3D-Modellierung': [['Was ist ein Polygon?', 'Eine Fläche aus Ecken und Kanten', 'Ein Lichtstrahl', 'Ein Farbton', 'Ein Dateiformat'], ['Was ist eine Textur?', 'Ein Bild, das auf ein 3D-Modell gelegt wird', 'Die Form des Modells', 'Ein Kameratyp', 'Eine Animation'], ['Was macht „UV-Unwrapping“?', 'Das Modell auffalten, damit Texturen richtig sitzen', 'Licht ausschalten', 'Das Modell löschen', 'Den Bildschirm drehen'], ['Was ist Rendering?', 'Aus der 3D-Szene ein fertiges Bild berechnen', 'Ein Modell kaufen', 'Ein Polygon zeichnen', 'Speichern'], ['Was ist ein Rig?', 'Ein Skelett zum Animieren', 'Eine Grafikkarte', 'Ein Hintergrundbild', 'Eine Lichtquelle']],
    Videoschnitt: [['Was ist ein Jump Cut?', 'Ein harter Schnitt innerhalb derselben Einstellung', 'Ein Sprung im Video', 'Ein Ton-Effekt', 'Ein Filter'], ['Wie viele Bilder pro Sekunde hat Kino klassisch?', '24', '60', '10', '100'], ['Was ist Color Grading?', 'Farben eines Videos gezielt gestalten', 'Videos komprimieren', 'Ton schneiden', 'Untertitel einfügen'], ['Was ist B-Roll?', 'Zusätzliches Bildmaterial zum Hauptinhalt', 'Ein Kameramodell', 'Der Abspann', 'Ein Mikrofon']],
    'Social Media': [['Was ist die Engagement-Rate?', 'Anteil der Leute, die mit einem Post interagieren', 'Anzahl der Follower', 'Länge eines Videos', 'Preis einer Anzeige'], ['Was hilft meist bei Reichweite?', 'Regelmäßig posten und auf Kommentare reagieren', 'Follower kaufen', 'Nur einmal im Jahr posten', 'Alle Kommentare löschen'], ['Was muss bei bezahlter Werbung im Post stehen?', 'Eine Kennzeichnung wie „Anzeige“ oder „Werbung“', 'Nichts', 'Der Preis', 'Die Handynummer'], ['Was ist ein Hook im Video?', 'Ein starker Einstieg in den ersten Sekunden', 'Ein Haken an der Wand', 'Der Abspann', 'Ein Filter']],
    Marketing: [['Was ist eine Zielgruppe?', 'Die Menschen, die man mit einem Produkt erreichen will', 'Eine Fußballmannschaft', 'Ein Werbebudget', 'Ein Logo'], ['Was sind die „4 P“ im Marketing?', 'Product, Price, Place, Promotion', 'Plan, Profit, Power, People', 'Post, Print, Podcast, Party', 'Preis, Produkt, Personal, Pause'], ['Was ist ein USP?', 'Ein Alleinstellungsmerkmal', 'Ein Stecker', 'Ein Paketdienst', 'Ein Rabatt'], ['Was misst eine Conversion-Rate?', 'Wie viele Besucher eine gewünschte Aktion ausführen', 'Wie schnell eine Seite lädt', 'Wie viele Mitarbeiter es gibt', 'Wie hoch die Miete ist']],
    Verkauf: [['Was ist im Verkaufsgespräch am wichtigsten?', 'Zuhören und den Bedarf verstehen', 'Möglichst viel reden', 'Sofort den Preis senken', 'Druck machen'], ['Wie reagiert man auf „Zu teuer“?', 'Den Nutzen erklären und nachfragen, was wichtig ist', 'Beleidigt sein', 'Gehen', 'Den Preis verdoppeln'], ['Was ist Cross-Selling?', 'Passende Zusatzprodukte anbieten', 'Über die Straße verkaufen', 'Ware zurücknehmen', 'Rabatt geben'], ['Was ist ein Abschluss?', 'Der Moment, in dem der Kunde kauft', 'Das Ende der Schicht', 'Die Rechnung', 'Ein Zeugnis']],
    Verhandeln: [['Was ist ein Anker in einer Verhandlung?', 'Ein erster Wert, an dem sich alle orientieren', 'Ein Schiff', 'Ein Vertrag', 'Ein Kompromiss'], ['Was ist die BATNA?', 'Deine beste Alternative, falls die Verhandlung scheitert', 'Ein Bankkonto', 'Eine Gehaltsstufe', 'Ein Gesetz'], ['Wann machst du ein Zugeständnis?', 'Nur im Tausch gegen eine Gegenleistung', 'Sofort am Anfang', 'Nie', 'Wenn der andere lacht'], ['Was hilft bei Gehaltsverhandlungen?', 'Marktwerte kennen und eigene Leistungen belegen', 'Drohen', 'Lügen', 'Gar nichts sagen']],
    Buchhaltung: [['Was ist eine Bilanz?', 'Gegenüberstellung von Vermögen und Kapital', 'Eine Einkaufsliste', 'Ein Kontoauszug', 'Ein Steuerbescheid'], ['Was ist Umsatzsteuer in Deutschland meist?', '19 Prozent', '5 Prozent', '50 Prozent', '0 Prozent'], ['Was bedeutet „Soll und Haben“?', 'Die zwei Seiten eines Kontos in der doppelten Buchführung', 'Wunsch und Wirklichkeit', 'Kredit und Zins', 'Einnahme und Steuer'], ['Was ist Abschreibung?', 'Der Wertverlust eines Wirtschaftsguts über die Jahre', 'Abschreiben in der Schule', 'Ein Rabatt', 'Eine Mahnung'], ['Wie lange muss man Geschäftsbelege meist aufbewahren?', '6 bis 10 Jahre', '1 Monat', '1 Jahr', 'Gar nicht']],
    Führung: [['Was macht gutes Feedback aus?', 'Konkret, zeitnah und auf Verhalten bezogen', 'Laut und vor allen', 'Nur einmal im Jahr', 'Allgemein und vage'], ['Was ist Delegieren?', 'Aufgaben samt Verantwortung an andere übergeben', 'Alles selbst machen', 'Leute entlassen', 'Ein Meeting absagen'], ['Wie gehst du mit Konflikten im Team um?', 'Früh ansprechen und gemeinsam lösen', 'Ignorieren', 'Partei ergreifen', 'Alle entlassen'], ['Was motiviert Menschen langfristig am meisten?', 'Sinn, Anerkennung und Entwicklung', 'Nur Geld', 'Kontrolle', 'Angst']],
    Projektmanagement: [['Was ist ein Meilenstein?', 'Ein wichtiger Zwischenstand im Projekt', 'Ein Stein am Straßenrand', 'Das Budget', 'Ein Teammitglied'], ['Was ist Scrum?', 'Ein agiles Vorgehen in kurzen Sprints', 'Ein Rugby-Spiel', 'Eine Software', 'Ein Diagramm'], ['Was zeigt ein Gantt-Diagramm?', 'Aufgaben auf einer Zeitachse', 'Gewinne', 'Den Börsenkurs', 'Das Wetter'], ['Was ist der kritische Pfad?', 'Die Kette von Aufgaben, die das Projektende bestimmt', 'Ein gefährlicher Weg', 'Das Budget', 'Ein Fehler']],
    Kundenservice: [['Ein Kunde ist wütend. Was zuerst?', 'Zuhören und Verständnis zeigen', 'Zurückschreien', 'Auflegen', 'Ignorieren'], ['Was ist ein Ticket im Support?', 'Eine erfasste Kundenanfrage', 'Eine Fahrkarte', 'Eine Rechnung', 'Ein Gutschein'], ['Was tun, wenn du die Antwort nicht weißt?', 'Ehrlich sein und schnell nachliefern', 'Etwas erfinden', 'Den Kunden beschuldigen', 'Nichts sagen']],
    Kochen: [['Bei welcher Temperatur kocht Wasser (Meereshöhe)?', '100 °C', '80 °C', '120 °C', '60 °C'], ['Was heißt „al dente“?', 'Bissfest gekocht', 'Verkocht', 'Roh', 'Mit Knoblauch'], ['Was ist eine Mehlschwitze?', 'In Fett angeschwitztes Mehl als Basis für Soßen', 'Ein Teig', 'Eine Krankheit', 'Ein Gewürz'], ['Warum lässt man Fleisch nach dem Braten ruhen?', 'Damit sich der Saft verteilt', 'Damit es kalt wird', 'Damit es schrumpft', 'Aus Tradition'], ['Was ist Blanchieren?', 'Kurz in kochendes Wasser, dann abschrecken', 'Lange schmoren', 'Frittieren', 'Einfrieren']],
    Elektrik: [['Was misst man in Volt?', 'Spannung', 'Strom', 'Widerstand', 'Leistung'], ['Welche Farbe hat der Schutzleiter in Deutschland?', 'Grün-gelb', 'Blau', 'Braun', 'Rot'], ['Formel für Leistung?', 'P = U × I', 'P = U / I', 'P = I − U', 'P = U + R'], ['Was macht ein FI-Schalter?', 'Schaltet bei Fehlerstrom ab und schützt Menschen', 'Macht Licht heller', 'Speichert Strom', 'Misst die Temperatur']],
    Schreinern: [['Welches Holz ist ein Hartholz?', 'Eiche', 'Fichte', 'Kiefer', 'Tanne'], ['Wofür ist ein Dübel?', 'Zum Verbinden oder Befestigen in Holz oder Wand', 'Zum Schleifen', 'Zum Lackieren', 'Zum Sägen'], ['Was ist eine Zinkung?', 'Eine Eckverbindung aus ineinandergreifenden Zapfen', 'Ein Metall', 'Ein Werkzeug zum Messen', 'Eine Holzkrankheit']],
    'Autos schrauben': [['Wie oft sollte man ungefähr Öl wechseln?', 'Etwa alle 15.000 bis 30.000 km oder laut Hersteller', 'Nie', 'Jede Woche', 'Alle 500 km'], ['Was zeigt die Motorkontrollleuchte?', 'Eine Störung in Motor oder Abgassystem', 'Volle Tankladung', 'Licht an', 'Radio aus'], ['Mindestprofiltiefe für Reifen in Deutschland?', '1,6 mm', '0,5 mm', '5 mm', '10 mm'], ['Was macht die Zündkerze?', 'Entzündet das Kraftstoff-Luft-Gemisch', 'Kühlt den Motor', 'Lädt die Batterie', 'Bremst das Auto']],
    Nähen: [['Was ist ein Saum?', 'Ein umgeschlagener, genähter Stoffrand', 'Ein Knopf', 'Eine Nadel', 'Ein Muster'], ['Wofür ist ein Zickzackstich gut?', 'Kanten versäubern und dehnbare Stoffe nähen', 'Knöpfe annähen', 'Stoff schneiden', 'Bügeln']],
    Gärtnern: [['Wann pflanzt man in Deutschland meist frostempfindliches Gemüse?', 'Nach den Eisheiligen Mitte Mai', 'Im Januar', 'Im Dezember', 'Im Februar'], ['Was brauchen Pflanzen für Photosynthese?', 'Licht, Wasser und CO₂', 'Nur Dünger', 'Musik', 'Dunkelheit'], ['Was ist Kompost?', 'Zersetzte Pflanzenreste als Dünger', 'Ein Unkraut', 'Ein Werkzeug', 'Ein Schädling']],
    'Erste Hilfe': [['Wie lautet der Notruf in Europa?', '112', '110', '911', '999'], ['Verhältnis bei der Herzdruckmassage (Laien, Erwachsene)?', '30 Mal drücken, 2 Mal beatmen', '5 zu 1', '10 zu 10', '2 zu 30'], ['Wie tief drückt man bei Erwachsenen?', 'Etwa 5 bis 6 cm', '1 cm', '15 cm', 'Gar nicht'], ['Was tun bei einer bewusstlosen Person mit normaler Atmung?', 'Stabile Seitenlage und Notruf', 'Aufsetzen', 'Wasser geben', 'Schütteln und gehen'], ['Wie kühlt man eine Verbrennung?', 'Mit handwarmem Wasser, nicht eiskalt', 'Mit Eis direkt', 'Mit Butter', 'Gar nicht']],
    Englisch: [['„I have been waiting for an hour.“ – Welche Zeit?', 'Present perfect continuous', 'Simple past', 'Future', 'Present simple'], ['Was heißt „nevertheless“?', 'Trotzdem', 'Niemals', 'Weniger', 'Nirgendwo'], ['„She ___ to school every day.“', 'goes', 'go', 'going', 'gone'], ['Was ist ein „false friend“ für „become“?', 'Es heißt „werden“, nicht „bekommen“', 'Es heißt „bekommen“', 'Es heißt „kommen“', 'Es heißt „beginnen“'], ['„If I ___ rich, I would travel.“', 'were', 'am', 'will be', 'be']],
    Spanisch: [['Was heißt „Gracias“?', 'Danke', 'Bitte', 'Hallo', 'Tschüss'], ['„Yo ___ estudiante.“', 'soy', 'eres', 'es', 'somos'], ['Was heißt „mañana“?', 'Morgen', 'Gestern', 'Heute', 'Nie'], ['Unterschied ser und estar?', 'ser für dauerhafte Eigenschaften, estar für Zustände und Orte', 'Kein Unterschied', 'ser nur in der Vergangenheit', 'estar nur für Namen']],
    Französisch: [['Was heißt „Je m’appelle …“?', 'Ich heiße …', 'Ich wohne …', 'Ich mag …', 'Ich bin müde'], ['„Nous ___ français.“', 'sommes', 'êtes', 'sont', 'suis'], ['Was heißt „bibliothèque“?', 'Bibliothek', 'Bäckerei', 'Bahnhof', 'Bank'], ['Was ist „le passé composé“ von „aller“ (ich)?', 'je suis allé', 'j’ai allé', 'je vais', 'j’allais']],
    Türkisch: [['Was heißt „Teşekkür ederim“?', 'Danke', 'Guten Morgen', 'Entschuldigung', 'Auf Wiedersehen'], ['Was heißt „Nasılsın?“', 'Wie geht es dir?', 'Wo bist du?', 'Wie heißt du?', 'Was machst du?'], ['Was heißt „ev“?', 'Haus', 'Auto', 'Hund', 'Brot'], ['Türkisch ist eine … Sprache.', 'agglutinierende (Endungen werden angehängt)', 'tonale', 'romanische', 'slawische']],
    Arabisch: [['Was heißt „Shukran“?', 'Danke', 'Hallo', 'Ja', 'Nein'], ['In welche Richtung schreibt man Arabisch?', 'Von rechts nach links', 'Von links nach rechts', 'Von oben nach unten', 'Im Kreis'], ['Was heißt „Marhaba“?', 'Hallo', 'Tschüss', 'Bitte', 'Danke']],
    Japanisch: [['Was heißt „Arigatō“?', 'Danke', 'Hallo', 'Entschuldigung', 'Gute Nacht'], ['Welche drei Schriften nutzt Japanisch?', 'Hiragana, Katakana, Kanji', 'Hangul, Kanji, Latein', 'Nur Kanji', 'Kyrillisch, Latein, Kanji'], ['Was heißt „Sumimasen“?', 'Entschuldigung', 'Prost', 'Wie viel?', 'Guten Appetit']],
    Italienisch: [['Was heißt „Buongiorno“?', 'Guten Tag', 'Gute Nacht', 'Danke', 'Prost'], ['„Io ___ italiano.“', 'sono', 'sei', 'è', 'siamo'], ['Was heißt „il conto, per favore“?', 'Die Rechnung, bitte', 'Das Konto ist leer', 'Ein Glas, bitte', 'Wo ist das Bad?']],
    Fotografie: [['Was steuert die Blende?', 'Wie viel Licht einfällt und die Schärfentiefe', 'Die Farbe', 'Den Akku', 'Den Zoom'], ['Was bewirkt eine kurze Belichtungszeit?', 'Bewegungen werden eingefroren', 'Das Bild wird unscharf', 'Mehr Rauschen', 'Schwarzweiß'], ['Was ist die Drittel-Regel?', 'Motive auf Linien eines 3×3-Rasters setzen', 'Nur jedes dritte Bild behalten', 'Drei Blitze nutzen', 'Belichtung um ein Drittel senken'], ['Was bedeutet ein hoher ISO-Wert?', 'Höhere Lichtempfindlichkeit, aber mehr Rauschen', 'Schärferes Bild', 'Mehr Zoom', 'Weniger Farben']],
    Grafikdesign: [['Was ist Kerning?', 'Der Abstand zwischen einzelnen Buchstaben', 'Eine Schriftart', 'Ein Farbmodell', 'Ein Dateiformat'], ['Welches Farbmodell für Druck?', 'CMYK', 'RGB', 'HEX', 'HSL'], ['Was ist ein Vektorgrafik-Vorteil?', 'Verlustfrei skalierbar', 'Kleiner als jedes Foto', 'Immer bunt', 'Nur für Druck'], ['Was sind Komplementärfarben?', 'Farben, die sich im Farbkreis gegenüberliegen', 'Ähnliche Farben', 'Nur Schwarz und Weiß', 'Pastellfarben']],
    Musikproduktion: [['Was ist BPM?', 'Beats per Minute, das Tempo', 'Bass pro Minute', 'Ein Mikrofon', 'Eine Tonart'], ['Was macht ein Kompressor?', 'Verringert die Dynamik und gleicht Lautstärke an', 'Macht Musik leiser', 'Speichert Dateien klein', 'Erzeugt Hall'], ['Was ist eine DAW?', 'Digital Audio Workstation, Software zum Produzieren', 'Ein Lautsprecher', 'Ein Kabel', 'Ein Musikstil']],
    Schauspiel: [['Was ist ein Monolog?', 'Eine längere Rede einer Figur', 'Ein Dialog', 'Ein Bühnenbild', 'Der Applaus'], ['Wer erfand das „epische Theater“?', 'Bertolt Brecht', 'Goethe', 'Shakespeare', 'Schiller']],
    Fliegen: [['Was bedeutet Squawk 7700?', 'Luftnotfall', 'Funkausfall', 'Entführung', 'Normaler Flug'], ['Wie heißt der Buchstabe „P“ im Funkalphabet?', 'Papa', 'Peter', 'Paris', 'Pluto'], ['Was erzeugt am Flügel den Auftrieb?', 'Druckunterschied zwischen Ober- und Unterseite', 'Das Triebwerk direkt', 'Die Räder', 'Der Wind von hinten']],
  };
  const KIND = {
    rhythm: ['Singen', 'Gitarre', 'Klavier', 'Tanzen', 'Musikproduktion', 'Schlagzeug', 'Rappen', 'DJ'],
    reaction: ['Fitness', 'Fußball', 'Kampfsport', 'Schwimmen', 'Basketball', 'Tennis', 'Boxen', 'Rennen fahren'],
    color: ['Zeichnen', 'Malen', 'Fotografie', 'Grafikdesign'],
    typing: ['Schreiben'],
    memory: ['Schauspiel', 'Schach'],
    none: ['Bekanntheit', 'Netzwerk', 'Charisma', 'Ruf in der Szene'],
  };
  function kindOf(name) {
    for (const k of Object.keys(KIND)) if (KIND[k].includes(name)) return k === 'color' && QUIZ[name] ? 'color+quiz' : k === 'rhythm' && QUIZ[name] ? 'rhythm+quiz' : k;
    if (QUIZ[name]) return 'quiz';
    return 'memory';
  }
  const LABEL = { quiz: 'Wissensquiz', rhythm: 'Rhythmus-Test', 'rhythm+quiz': 'Rhythmus-Test und Quiz', reaction: 'Reaktion und Tempo', color: 'Farbtest', 'color+quiz': 'Farbtest und Quiz', typing: 'Tipptest', memory: 'Gedächtnistest', none: 'kein Test' };

  // ---------- Rahmen ----------
  function shell(title, sub) {
    const back = document.createElement('div');
    back.className = 'modal-back lx-quiz-back lx-st';
    back.innerHTML = `<div class="modal lx-quiz lx-st-box"><span class="lb-k">Einstufungstest · ${esc(title)}</span><h3 class="lx-st-sub">${esc(sub)}</h3><div class="lx-st-body"></div></div>`;
    document.body.appendChild(back);
    return { back, body: back.querySelector('.lx-st-body'), sub: back.querySelector('.lx-st-sub'), close: () => back.remove() };
  }
  // ---------- Quiz ----------
  function quiz(ui, name, done) {
    const qs = shuffle(QUIZ[name]).slice(0, 5).map((q) => ({ q: q[0], right: q[1], opts: shuffle(q.slice(1)) }));
    let i = 0, ok = 0;
    const draw = () => {
      if (i >= qs.length) return done(Math.round((ok / qs.length) * 100));
      const q = qs[i];
      ui.sub.textContent = `Frage ${i + 1} von ${qs.length}`;
      ui.body.innerHTML = `<p class="lx-st-q">${esc(q.q)}</p><div class="lb-qopts">${q.opts.map((o, j) => `<button class="btn" data-o="${j}">${esc(o)}</button>`).join('')}</div>`;
      ui.body.querySelectorAll('[data-o]').forEach((b) => {
        b.onclick = () => {
          const right = q.opts[b.dataset.o] === q.right;
          if (right) ok++;
          b.classList.add(right ? 'ok' : 'bad');
          ui.body.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; if (q.opts[x.dataset.o] === q.right) x.classList.add('ok'); });
          FX() && FX().play(right ? 'pop' : 'coinDown');
          setTimeout(() => { i++; draw(); }, 700);
        };
      });
    };
    draw();
  }
  // ---------- Rhythmus: im Takt tippen ----------
  function rhythm(ui, name, done) {
    const bpm = 92 + Math.floor(Math.random() * 30), beat = 60000 / bpm, n = 12;
    ui.sub.textContent = `Tippe im Takt (${bpm} BPM). Erst 4 Schläge zuhören, dann ${n} Mal mittippen.`;
    ui.body.innerHTML = `<div class="lx-st-beat"><i></i></div><button class="btn btn-primary lx-st-tap" disabled>Tippen (Leertaste)</button><p class="p-sub lx-st-info">Gleich geht es los …</p>`;
    const dot = ui.body.querySelector('i'), tap = ui.body.querySelector('.lx-st-tap'), info = ui.body.querySelector('.lx-st-info');
    let t0 = 0, errs = [], k = 0, timer, over = false;
    const flash = () => { dot.classList.remove('on'); void dot.offsetWidth; dot.classList.add('on'); FX() && FX().play('roll'); };
    const hit = () => {
      if (!t0) return;
      const t = performance.now() - t0, nearest = Math.round(t / beat), off = Math.abs(t - nearest * beat);
      if (nearest < 4) return;
      errs.push(Math.min(off, beat / 2));
      k++;
      info.textContent = off < 60 ? 'Perfekt!' : off < 120 ? 'Gut' : 'Daneben';
      if (k >= n) finish();
    };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); hit(); } };
    const finish = () => { if (over) return; over = true; clearInterval(timer); document.removeEventListener('keydown', key); const avg = errs.reduce((s, v) => s + v, 0) / Math.max(1, errs.length); done(Math.max(0, Math.min(100, Math.round(100 - (avg / (beat / 2)) * 130)))); };
    setTimeout(() => {
      t0 = performance.now(); flash();
      let b = 1;
      timer = setInterval(() => { flash(); b++; if (b === 4) { tap.disabled = false; info.textContent = 'Jetzt mittippen!'; } if (b > n + 6) finish(); }, beat);
      tap.onclick = hit;
      document.addEventListener('keydown', key);
    }, 900);
  }
  // ---------- Reaktion und Tempo ----------
  function reaction(ui, name, done) {
    const times = [];
    let round = 0;
    const next = () => {
      if (round >= 3) return speed();
      ui.sub.textContent = `Reaktion ${round + 1} von 3: Klick, sobald es grün wird.`;
      ui.body.innerHTML = '<button class="lx-st-react wait">Warten …</button>';
      const b = ui.body.querySelector('button');
      let go = 0;
      const tm = setTimeout(() => { go = performance.now(); b.className = 'lx-st-react go'; b.textContent = 'JETZT!'; }, 1200 + Math.random() * 2200);
      b.onclick = () => {
        if (!go) { clearTimeout(tm); times.push(900); b.textContent = 'Zu früh!'; setTimeout(() => { round++; next(); }, 800); return; }
        const t = performance.now() - go; times.push(t); b.textContent = `${Math.round(t)} ms`; b.onclick = null;
        setTimeout(() => { round++; next(); }, 800);
      };
    };
    const speed = () => {
      ui.sub.textContent = 'Tempo: 5 Sekunden so oft klicken, wie du kannst.';
      ui.body.innerHTML = '<button class="lx-st-react go">Los!</button><p class="p-sub lx-st-info">0</p>';
      const b = ui.body.querySelector('button'), info = ui.body.querySelector('.lx-st-info');
      let n = 0, start = 0;
      b.onclick = () => {
        if (!start) { start = performance.now(); setTimeout(() => { b.disabled = true; const avg = times.reduce((s, v) => s + v, 0) / times.length; const r = Math.max(0, Math.min(100, (520 - avg) / 3)), sp = Math.max(0, Math.min(100, (n - 15) * 3)); done(Math.round(r * 0.6 + sp * 0.4)); }, 5000); }
        n++; info.textContent = String(n);
      };
    };
    next();
  }
  // ---------- Farbe treffen ----------
  function color(ui, name, done, then) {
    const scores = [];
    let round = 0;
    const next = () => {
      if (round >= 3) { const sc = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length); return then ? then(sc) : done(sc); }
      const h = Math.floor(Math.random() * 360), sat = 55 + Math.floor(Math.random() * 35), l = 40 + Math.floor(Math.random() * 20);
      ui.sub.textContent = `Farbe ${round + 1} von 3: Stell die rechte Fläche so ein, dass sie links gleicht.`;
      ui.body.innerHTML = `<div class="lx-st-colors"><div style="background:hsl(${h},${sat}%,${l}%)"></div><div id="st-mine"></div></div>
        <label class="field"><span>Farbton</span><input type="range" id="st-h" min="0" max="359" value="${(h + 120 + Math.floor(Math.random() * 120)) % 360}"></label>
        <label class="field"><span>Sättigung</span><input type="range" id="st-s" min="0" max="100" value="50"></label>
        <label class="field"><span>Helligkeit</span><input type="range" id="st-l" min="10" max="90" value="50"></label><button class="btn btn-primary" id="st-ok">Fertig</button>`;
      const g = (id) => Number(ui.body.querySelector(id).value), paint = () => { ui.body.querySelector('#st-mine').style.background = `hsl(${g('#st-h')},${g('#st-s')}%,${g('#st-l')}%)`; };
      ui.body.querySelectorAll('input').forEach((x) => { x.oninput = paint; });
      paint();
      ui.body.querySelector('#st-ok').onclick = () => {
        const dh = Math.min(Math.abs(g('#st-h') - h), 360 - Math.abs(g('#st-h') - h)), ds = Math.abs(g('#st-s') - sat), dl = Math.abs(g('#st-l') - l);
        scores.push(Math.max(0, Math.round(100 - dh * 1.1 - ds * 0.8 - dl * 1.2)));
        round++; next();
      };
    };
    next();
  }
  // ---------- Tippen ----------
  const SENTENCES = ['Das Leben ist zu kurz für schlechten Kaffee und langweilige Geschichten.', 'April hat gesagt, dass dieser Test ganz einfach ist. April lügt manchmal.', 'Am Ende des Tages zählt, wer zuletzt lacht und wer die Steuererklärung gemacht hat.', 'Im Ruhrpott sagt man nicht Brötchen, sondern Röggelchen. Oder doch nicht?'];
  function typing(ui, name, done) {
    const target = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
    ui.sub.textContent = 'Tipp den Satz so schnell und genau wie möglich ab.';
    ui.body.innerHTML = `<p class="lx-st-q">${esc(target)}</p><textarea id="st-type" rows="3"></textarea><button class="btn btn-primary" id="st-ok">Fertig</button>`;
    const ta = ui.body.querySelector('#st-type');
    let start = 0;
    ta.oninput = () => { if (!start) start = performance.now(); };
    ta.onpaste = (e) => e.preventDefault();
    ta.focus();
    ui.body.querySelector('#st-ok').onclick = () => {
      const typed = ta.value.trim(), secs = Math.max(1, (performance.now() - (start || performance.now())) / 1000);
      let same = 0; for (let i = 0; i < Math.min(typed.length, target.length); i++) if (typed[i] === target[i]) same++;
      const acc = same / target.length, wpm = (typed.length / 5) / (secs / 60);
      done(Math.max(0, Math.min(100, Math.round(acc * 70 + Math.min(30, wpm / 2)))));
    };
  }
  // ---------- Gedächtnis: Reihenfolge merken ----------
  const WORDS = ['Mond', 'Kaffee', 'Ruhrpott', 'Laptop', 'Tiger', 'Pizza', 'Regen', 'Gitarre', 'Kanzler', 'Bagger', 'Kiosk', 'Rakete', 'Opa', 'Schlüssel', 'Drohne', 'Bühne'];
  function memory(ui, name, done) {
    let len = 3, best = 0;
    const roundM = () => {
      const seq = shuffle(WORDS).slice(0, len);
      ui.sub.textContent = `Merk dir die Reihenfolge (${len} Wörter).`;
      ui.body.innerHTML = `<p class="lx-st-q lx-st-seq">${seq.map(esc).join(' · ')}</p>`;
      setTimeout(() => {
        const opts = shuffle(seq.concat(shuffle(WORDS.filter((w) => !seq.includes(w))).slice(0, 3)));
        const picked = [];
        ui.sub.textContent = 'Klick die Wörter in der richtigen Reihenfolge.';
        ui.body.innerHTML = `<div class="lx-chips">${opts.map((w) => `<button class="lx-chip" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div><p class="p-sub lx-st-info"></p>`;
        ui.body.querySelectorAll('[data-w]').forEach((b) => {
          b.onclick = () => {
            picked.push(b.dataset.w); b.disabled = true; b.classList.add('on');
            const i = picked.length - 1;
            if (picked[i] !== seq[i]) { FX() && FX().play('coinDown'); return done(Math.min(100, Math.round(best * 14))); }
            if (picked.length === seq.length) { best = len; FX() && FX().play('pop'); if (len >= 8) return done(100); len++; setTimeout(roundM, 500); }
          };
        });
      }, 1200 + len * 600);
    };
    roundM();
  }

  // ---------- Start ----------
  function run(name, cb) {
    const k = kindOf(name);
    if (k === 'none') return cb(null);
    const ui = shell(name, LABEL[k]);
    const finish = (score) => {
      ui.sub.textContent = 'Ergebnis';
      ui.body.innerHTML = `<p class="lx-qbig">${score} / 100</p><p class="p-sub">${score >= 80 ? 'Stark! Da steckt schon richtig was drin.' : score >= 50 ? 'Solide Basis.' : score >= 25 ? 'Anfänger:in mit Luft nach oben.' : 'Ganz am Anfang. Training lohnt sich.'}</p><button class="btn btn-primary" id="st-close">Übernehmen</button>`;
      FX() && FX().play(score >= 50 ? 'coinUp' : 'coinDown');
      ui.body.querySelector('#st-close').onclick = () => { ui.close(); cb(score); };
    };
    const intro = `<p>Dieser Test stuft dich in <b>${esc(name)}</b> ein (${esc(LABEL[k])}). Ehrlich spielen, April schaut zu.</p><div class="btn-row"><button class="btn btn-primary" id="st-go">Test starten</button><button class="btn btn-ghost" id="st-skip">Ohne Test (bei null anfangen)</button></div>`;
    ui.body.innerHTML = intro;
    ui.body.querySelector('#st-skip').onclick = () => { ui.close(); cb(null); };
    ui.body.querySelector('#st-go').onclick = () => {
      if (k === 'quiz') quiz(ui, name, finish);
      else if (k === 'rhythm') rhythm(ui, name, finish);
      else if (k === 'rhythm+quiz') rhythm(ui, name, (a) => quiz(ui, name, (b) => finish(Math.round(a * 0.6 + b * 0.4))));
      else if (k === 'reaction') reaction(ui, name, finish);
      else if (k === 'color') color(ui, name, finish);
      else if (k === 'color+quiz') color(ui, name, finish, (a) => quiz(ui, name, (b) => finish(Math.round(a * 0.5 + b * 0.5))));
      else if (k === 'typing') typing(ui, name, finish);
      else memory(ui, name, finish);
    };
  }
  window.DULI_LARP_SKILLTEST = { run, kindOf, LABEL, QUIZ };
})();
