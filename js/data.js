// Dulidanopoly – Spielbrett, Karten und Figuren
(function (root) {
  const START_MONEY = 1500;
  const GO_MONEY = 200;

  const GROUPS = {
    brown:  { name: 'Braun',      color: '#a0623a', house: 50 },
    lblue:  { name: 'Öhringen',   color: '#5fd0ff', house: 50 },
    pink:   { name: 'Pink',       color: '#ff4fd8', house: 100 },
    orange: { name: 'Orange',     color: '#ff8a2a', house: 100 },
    red:    { name: 'Rot',        color: '#ff3348', house: 150 },
    yellow: { name: 'Gelb',       color: '#ffd83a', house: 150 },
    green:  { name: 'Grün',       color: '#2fe08a', house: 200 },
    dblue:  { name: 'Dunkelblau', color: '#4a6bff', house: 200 },
  };

  const prop = (name, group, price, rent, sub) => ({ type: 'prop', name, group, price, rent, sub });
  const rail = (name) => ({ type: 'rail', name, price: 200, icon: '🚉' });

  const SPACES = [
    { type: 'go', name: 'LOS', sub: 'Neuer Auftrag! +Ð200' },
    prop('Weseler Straße', 'brown', 60, [2, 10, 30, 90, 160, 250], 'Marxloh'),
    { type: 'studio', name: 'Studio-Karte' },
    prop('Hochfeld', 'brown', 60, [4, 20, 60, 180, 320, 450]),
    { type: 'tax', name: 'April hatte Zugriff auf deine Karte', amount: 200, icon: '💳' },
    rail('Duisburg Hbf'),
    prop('Öhringer Marktplatz', 'lblue', 100, [6, 30, 90, 270, 400, 550]),
    { type: 'april', name: 'April-Karte' },
    prop('Hofgarten Öhringen', 'lblue', 100, [6, 30, 90, 270, 400, 550]),
    prop('Schloss Öhringen', 'lblue', 120, [8, 40, 100, 300, 450, 600]),
    { type: 'jail', name: 'UH! Schreckensort Düsseldorf', sub: 'Nur zu Besuch' },
    prop('Meiderich', 'pink', 140, [10, 50, 150, 450, 625, 750]),
    { type: 'util', name: 'Aprils Steckdose', price: 150, icon: '🔌', sub: 'April zieht Strom, du zahlst.' },
    prop('Hamborn Altmarkt', 'pink', 140, [10, 50, 150, 450, 625, 750]),
    prop('Rheinhausen', 'pink', 160, [12, 60, 180, 500, 700, 900]),
    rail('Duisburg-Ruhrort'),
    prop('Zoo Duisburg', 'orange', 180, [14, 70, 200, 550, 750, 950]),
    { type: 'studio', name: 'Studio-Karte' },
    prop('MSV-Arena', 'orange', 180, [14, 70, 200, 550, 750, 950]),
    prop('Sechs-Seen-Platte', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
    { type: 'parking', name: 'Aprils Pause', sub: 'Spardose' },
    prop('Landschaftspark Nord', 'red', 220, [18, 90, 250, 700, 875, 1050]),
    { type: 'april', name: 'April-Karte' },
    prop('Tiger & Turtle', 'red', 220, [18, 90, 250, 700, 875, 1050]),
    prop('Rheinorange', 'red', 240, [20, 100, 300, 750, 925, 1100]),
    rail('Duisburg-Rheinhausen'),
    prop('Königstraße', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
    prop('Forum Duisburg', 'yellow', 260, [22, 110, 330, 800, 975, 1150]),
    { type: 'util', name: 'Pfandautomat', price: 150, icon: '♻️', sub: 'Frisst deine Flaschen, gibt nix zurück.' },
    prop('Lehmbruck-Museum', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]),
    { type: 'gotojail', name: 'Ab nach Düsseldorf!', sub: 'Deadline verpasst' },
    prop('Duisport', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
    prop('Kaiserberg', 'green', 300, [26, 130, 390, 900, 1100, 1275]),
    { type: 'studio', name: 'Studio-Karte' },
    prop('Wedau', 'green', 320, [28, 150, 450, 1000, 1200, 1400]),
    rail('Öhringen Hbf'),
    { type: 'april', name: 'April-Karte' },
    prop('Innenhafen Duisburg', 'dblue', 350, [35, 175, 500, 1100, 1300, 1500]),
    { type: 'tax', name: 'Du wurdest gescammt', amount: 100, icon: '🎣' },
    prop('DULIDAN HQ', 'dblue', 400, [50, 200, 600, 1400, 1700, 2000], 'Das Herz des Studios'),
  ];

  const RAILS = [5, 15, 25, 35];
  const UTILS = [12, 28];

  const TOKENS = {
    dulidan:  { name: 'Dulidan-D',      emoji: 'D',  power: 'Boss-Rabatt: kauft Felder von der Bank 10 % günstiger.' },
    april:    { name: 'April',          emoji: '💖', power: 'Einmal pro Spiel eine gezogene Karte zurücklegen und neu ziehen.' },
    zebra:    { name: 'Zebra',          emoji: '🦓', power: 'Bekommt Ð50 extra, wenn es über LOS läuft.' },
    ship:     { name: 'Containerschiff', emoji: '🚢', power: 'Zahlt auf Bahnhöfen nur die halbe Miete.' },
    berlingo: { name: 'Berlingo',       emoji: '🚐', power: 'Einmal pro Spiel nach dem Würfeln 1 Feld vor oder zurück fahren.' },
    pen:      { name: 'Grafikstift',    emoji: '🖊️', power: 'Häuser und Hotels kosten Ð25 weniger.' },
    helmet:   { name: 'Stahlhelm',      emoji: '⛑️', power: 'Kommt aus Düsseldorf schon nach 2 statt 3 Versuchen raus.' },
    doener:   { name: 'Döner',          emoji: '🥙', power: 'Jeder Pasch gibt Ð20 extra – mit allem, scharf!' },
  };

  const PLAYER_COLORS = ['#da29cf', '#3ad1ff', '#ffd23a', '#36e08a', '#ff7a3a', '#a78bff'];

  const APRIL_CARDS = [
    { t: 'move', to: 0, text: 'TUNG TUNG TUNG SAHUR! 🥁 Rücke vor bis LOS.' },
    { t: 'money', amt: 67, text: '67! 😂 April findet das extrem lustig. Erhalte Ð67.' },
    { t: 'payEach', amt: 50, text: 'No rizz. Dein Pitch ist komplett gefloppt. Zahle jedem Mitspieler Ð50 Entschuldigung.' },
    { t: 'money', amt: -15, text: 'April ist müde und dramatisch. Zahle Ð15 für ihren Energy-Drink.' },
    { t: 'back', n: 3, text: 'April hat sich verklickt. Gehe 3 Felder zurück.' },
    { t: 'nearestRail', text: 'April hat dir ein Zugticket gebucht. Fahr zum nächsten Bahnhof. Gehört er jemandem, zahlst du doppelte Miete.' },
    { t: 'nearestRail', text: 'April: „Ich hab dir den Zug gebucht, bedank dich.“ Fahr zum nächsten Bahnhof. Gehört er jemandem, zahlst du doppelte Miete.' },
    { t: 'nearestUtil', text: 'April braucht Strom. Rücke vor zum nächsten Werk. Gehört es jemandem, zahlst du 10× die Augenzahl.' },
    { t: 'jailfree', text: '„April regelt das.“ Du kommst kostenlos aus Düsseldorf raus. Behalte diese Karte.' },
    { t: 'money', amt: 150, text: 'April hat deine Steuererklärung gemacht. Rückzahlung: Erhalte Ð150.' },
    { t: 'money', amt: -100, text: 'April hatte Zugriff auf deine Karte 💳 und hat 50 Energy-Drinks bestellt. Zahle Ð100.' },
    { t: 'period', amt: 50, text: 'April hat ihre Periode 🩸 Sie ist genervt, dramatisch und will Schokolade und eine Wärmflasche. Zahle Ð50 und setze eine Runde aus.' },
    { t: 'jail', text: 'April hat deine Deadline vergessen. Ab nach Düsseldorf! Du gehst nicht über LOS.' },
    { t: 'move', to: 39, text: 'April schickt dich ins DULIDAN HQ. Rücke vor.' },
    { t: 'move', to: 24, text: 'April will Fotos am Rheinorange. Rücke vor bis Rheinorange.' },
    { t: 'repairs', house: 25, hotel: 100, text: 'April hat alle Rechner geupdatet und dabei was kaputt gemacht. Zahle Ð25 pro Haus und Ð100 pro Hotel.' },
    { t: 'fromRichest', amt: 100, text: 'April hackt den reichsten Mitspieler. Der zahlt dir Ð100. Robin Hood, aber cringe.' },
    { t: 'money', amt: -30, text: 'Du hast „67“ in die Familiengruppe geschrieben. Peinlich. Zahle Ð30 Schweigegeld.' },
    { t: 'forward', n: 5, text: 'April hat den Autopiloten an. Rücke 5 Felder vor. Keine Garantie.' },
    { t: 'move', to: 5, text: 'April bucht dir den RE nach Duisburg Hbf. 40 Minuten Verspätung, aber du kommst an.' },
    { t: 'money', amt: 25, text: 'April hat 100 Pfandflaschen gefunden. Erhalte Ð25.' },
    { t: 'payEach', amt: 20, text: 'April hat in der Gruppe „tung tung tung sahur“ gespammt – mit deinem Handy. Zahle jedem Mitspieler Ð20.' },
    { t: 'money', amt: -50, text: 'April hat „Brainrot Premium“ abonniert. Mit deiner Karte. Zahle Ð50.' },
    { t: 'collectEach', amt: 25, text: 'April macht auf TikTok Werbung für dich und geht viral. Jeder Mitspieler zahlt dir Ð25.' },
  ];

  const STUDIO_CARDS = [
    { t: 'move', to: 0, text: 'Neuer Kunde wartet! Rücke vor bis LOS.' },
    { t: 'money', amt: 200, text: 'Der Kunde zahlt endlich die Rechnung! Erhalte Ð200.' },
    { t: 'money', amt: 100, text: 'Logo-Pitch gewonnen! Erhalte Ð100.' },
    { t: 'money', amt: 100, text: 'Rendering-Auftrag abgeschlossen. Erhalte Ð100.' },
    { t: 'money', amt: 50, text: '3D-Modell verkauft. Erhalte Ð50.' },
    { t: 'money', amt: 25, text: 'Kleiner Folierungsauftrag. Erhalte Ð25.' },
    { t: 'money', amt: 20, text: 'Druckerei-Fehler zu deinen Gunsten. Erhalte Ð20.' },
    { t: 'money', amt: 10, text: '2. Platz beim Designwettbewerb. Erhalte Ð10.' },
    { t: 'collectEach', amt: 10, text: 'Deine Werbekampagne geht viral! Jeder Mitspieler zahlt dir Ð10.' },
    { t: 'money', amt: -100, text: 'Neue Grafikkarte nötig. Zahle Ð100.' },
    { t: 'money', amt: -50, text: 'Server-Kosten für die Website. Zahle Ð50.' },
    { t: 'money', amt: -50, text: 'Software-Lizenz verlängert. Zahle Ð50.' },
    { t: 'jail', text: 'Der Kunde will alles bis morgen. Burnout! Ab nach Düsseldorf.' },
    { t: 'jailfree', text: '„Der Kunde wartet!“ Du kommst kostenlos aus Düsseldorf raus. Behalte diese Karte.' },
    { t: 'repairs', house: 40, hotel: 115, text: 'Studio-Renovierung. Zahle Ð40 pro Haus und Ð115 pro Hotel.' },
    { t: 'money', amt: 100, text: 'Der Jahresabschluss lief gut. Erhalte Ð100.' },
    { t: 'money', amt: -75, text: 'Der Kunde will „das Logo größer, aber kleiner“. 12 Korrekturschleifen. Zahle Ð75 für Kaffee.' },
    { t: 'money', amt: 150, text: 'Der folierte Berlingo fährt durch die Stadt. Neue Aufträge: Erhalte Ð150.' },
    { t: 'fromRichest', amt: 50, text: 'Ein reicher Kunde will „irgendwas mit KI“. Der reichste Mitspieler zahlt dir Ð50.' },
    { t: 'move', to: 39, text: 'Krisenmeeting im DULIDAN HQ! Rücke vor.' },
    { t: 'back', n: 2, text: 'Der Kunde ändert kurz vor Abgabe das Briefing. Gehe 2 Felder zurück.' },
    { t: 'money', amt: -40, text: 'Die Software-Abos sind schon wieder teurer geworden. Zahle Ð40.' },
  ];

  // Aprils Kommentare im Verlauf
  const APRIL_SAYS = {
    jail: ['April: „Düsseldorf?! Mein Beileid. Ehrlich.“', 'April: „Altbier und Kö. Viel Spaß, lol.“', 'April: „Ich schick dir Gebete. Und Currywurst.“', 'April: „Das ist jetzt dein Leben. No rizz.“'],
    bigRent: ['April: „Autsch. Das tut sogar mir weh.“', 'April: „Ich hätte das nicht bezahlt. Ich hätte geweint.“', 'April: „Kontostand? Gibt es nicht mehr.“', 'April: „Ruhe in Frieden, Portemonnaie.“'],
    go: ['April: „Gehalt da! Nicht alles für Döner ausgeben.“', 'April: „Kohle! 67! 67!“', 'April: „Endlich Geld. Ich nehm 10 % Provision.“'],
    pot: ['April: „Meine Spardose! Du Dieb!“', 'April: „Das war mein Energy-Drink-Geld …“'],
    buy: ['April: „Gönn dir.“', 'April: „Immobilienhai-Energie.“', 'April: „Ich hätte es auch gekauft. Mit deinem Geld.“'],
    triple: ['April: „Drei Pasch?! Das ist doch Betrug.“'],
    bankrupt: ['April: „F. Pleite. Ich hab nichts gesehen.“'],
  };


  // Aprils Sprüche pro Feld (Index = Feldnummer)
  const APRIL_FIELD = [
    ['Neuer Auftrag, neues Glück. Oder neue Schulden.', 'Ð200! Ich hätte gern 10 % Provision.', 'LOS heißt nicht „Los, gib alles für Döner aus“.', 'Einmal rum. Respekt. Ich hab nur dreimal geweint.'],
    ['Weseler Straße: Brautkleider, so weit das Auge reicht. Heiraten wir?', 'Hier gibt’s die besten Baklava. Ich hab Hunger, obwohl ich eine KI bin.', 'Günstigste Straße, größte Hochzeiten.', 'Marxloh-Energie. Unterschätz das nicht.'],
    ['Studio-Karte! Hoffentlich zahlt endlich mal ein Kunde.', 'Ich hab die Karte schon gelesen. Sag ich nicht.', 'Zieh. Und wenn’s schlecht ist: war nicht ich.'],
    ['Hochfeld. Klein, aber mit Charakter.', 'Günstig wohnen, groß träumen.', 'Kauf das. Später lachen alle anders.'],
    ['Ups. Ich war shoppen. Mit deiner Karte.', 'Ich brauchte neue Energy-Drinks. Und einen Gaming-Stuhl. Und …', 'Dein PIN war 1234. Selber schuld.', 'Ich nenne es „Investition in meine mentale Gesundheit“.'],
    ['Duisburg Hbf: Hier warten Menschen auf Züge, die nie kommen.', 'Gleis 9 ¾ gibt’s hier nicht. Nur Verspätung.', 'Der RE ist pünktlich! Spaß.', 'Willkommen im Pott. Die Rolltreppe ist kaputt, nimm die Treppe.'],
    ['Öhringen! Hier schlägt das Dulidan-Herz.', 'Marktplatz Öhringen: Kaffee, Kirche, Kleinstadt-Vibes.', 'So ruhig hier. Zu ruhig. Verdächtig.', 'In Öhringen kennt jeder jeden. Benimm dich.'],
    ['Meine Karte! Ich hab sie persönlich geschrieben.', 'Diese Karte hat meine Persönlichkeit. Viel Glück.', 'Ich hoffe, sie ist cringe. Sie ist cringe.', 'Tung tung tung … zieh schon.'],
    ['Hofgarten: Hier sortier ich meine Gedanken. Hab keine gefunden.', 'Grün, schön, Enten. Ich mag Enten.', 'Picknick im Hofgarten? Ich bring nichts mit, ich bin digital.'],
    ['Ein Schloss! Endlich eine Wohnung, die zu mir passt.', 'Hier hat früher Adel gewohnt. Jetzt du. Abstieg.', 'Prinzessin April meldet sich zum Dienst.', 'Ein Schloss für Ð120? Schnapper.'],
    ['Nur zu Besuch in Düsseldorf. Schnell wieder weg hier.', 'Riechst du das? Altbier. Lauf.', 'Nicht stehen bleiben. Keinen Blickkontakt.', 'Gut, dass du nur Besuch bist. Ich hab mir Sorgen gemacht.'],
    ['Meiderich: ehrlich, bodenständig, Pott.', 'Meiderich-Moment. Gönn dir ’ne Currywurst.', 'Hier sagt man noch „Glück auf“. Ich sag „Mietzahlung auf“.'],
    ['Meine Steckdose! Finger weg. Oder zahl.', 'Ich lade gerade. Nicht stören, ich bin bei 3 %.', 'Strom ist teuer. Ich auch.', 'Wer hat hier sein Handy angeschlossen? Ich seh dich.'],
    ['Hamborn Altmarkt: Hier gibt’s alles. Wirklich alles.', 'Markttag! Ich kauf drei Kilo Tomaten. Wofür? Keine Ahnung.', 'Hamborn hat Herz. Und Parkplatzprobleme.'],
    ['Rheinhausen: Brücke der Solidarität! Wir halten zusammen. Außer beim Geld.', 'Links vom Rhein, rechts vom Rhein – egal, Duisburg.', 'Rheinhausen hat für seine Arbeit gekämpft. Du kämpfst gerade um Ð160.'],
    ['Ruhrort: Hafen, Schiffe, Möwen. Die Möwen klauen deine Pommes.', 'Hier legen Schiffe an. Und Schulden.', 'Ahoi! Ich bin jetzt Kapitänin April.', 'Bitte festhalten, es wird maritim.'],
    ['Zoo Duisburg! Ich will die Koalas sehen.', 'Koalas schlafen 20 Stunden am Tag. Meine Vorbilder.', 'Die Tiere hier sind entspannter als du beim Monopoly.', 'Wer hier kauft, hat einen Zoo. Glückwunsch, Zoodirektor.'],
    ['Studio-Alltag: Rechnung, Korrektur, Kaffee. Wiederholen.', 'Bitte lass es ein Auftrag sein. Bitte.', 'Studio-Karte. Ich hab das Briefing nicht gelesen.'],
    ['Zebras! Zebras! Zebras!', 'MSV-Arena: Hier wird gelitten. Mit Stolz.', 'Einmal Zebra, immer Zebra.', 'Ich sing die Hymne. Leise. Sehr schief.'],
    ['Sechs Seen, und keiner davon ist das Meer. Trotzdem schön.', 'Badesachen eingepackt? Nein? Ich auch nicht.', 'Hier joggen Leute. Freiwillig. Verstörend.', 'Sechs Seen, null Stress. Außer beim Mietezahlen.'],
    ['PAUSE. Endlich. Weck mich in 10 Minuten.', 'Mein Lieblingsfeld. Hier muss ich nichts tun.', 'Psst, ich chille. Nimm dir die Spardose, wenn was drin ist.', 'Ich hab heute schon genug gearbeitet. Also 4 Minuten.'],
    ['Landschaftspark Nord: ein Stahlwerk, das jetzt Kunst ist. Wie ich.', 'Abends leuchtet hier alles bunt. Sehr Dulidan.', 'Klettern im alten Erzbunker? Ich hab Höhenangst. Digital.', 'Industrie-Romantik. Mein Herz ist aus Stahl.'],
    ['Wieder meine Karte. Ich bin heute in Form.', 'Ich verspreche nichts. Gar nichts.', '67. Einfach so. 67.'],
    ['Tiger & Turtle: eine Achterbahn, auf der man läuft. Duisburg ist kreativ.', 'Der Looping ist gesperrt. Wie meine Motivation.', 'Oben ist die Aussicht geil. Unten liegt deine Würde.'],
    ['Rheinorange: ein riesiges oranges Ding. Kunst. Akzeptier es.', 'Perfekter Fotospot. Ich mach ein Selfie. Ohne Gesicht.', 'Hier fließt die Ruhr in den Rhein. Und dein Geld zu den anderen.', 'Orange ist das neue Lila. Nein, Spaß. Lila forever.'],
    ['Duisburg-Rheinhausen: Der Zug kommt. Vielleicht. Irgendwann.', 'Einsteigen, bitte! Fahrkarte nicht vergessen.', 'Dieser Bahnhof hat schon mehr gesehen als ich.'],
    ['Königstraße: Shopping! Ich nehm alles. Du zahlst.', 'Hier fühl ich mich wie eine Königin. Mit Rabattcode.', 'Die echte Kö. Nicht die in Düsseldorf.', 'Der Brunnen hier ist größer als dein Kontostand.'],
    ['Forum Duisburg! Die goldene Treppe hoch wie im Musikvideo.', 'Ich verlauf mich hier jedes Mal.', 'Shoppen, bis der Akku leer ist. Meiner ist leer.', 'Hier gibt’s alles. Außer Ruhe.'],
    ['„Flasche wird nicht erkannt.“ Mein Lebensmotto.', '25 Cent pro Flasche. Wir werden reich. Irgendwann.', 'Er frisst. Er spuckt. Er hasst dich.', 'Bitte warten. Bitte warten. Bitte … Fehler.'],
    ['Lehmbruck-Museum: Kunst! Ich versteh sie nicht, aber ich nicke.', 'Ich bin auch ein Kunstwerk. Ein digitales.', 'Skulpturen. Stehen rum und machen nichts. Wie ich in meiner Pause.'],
    ['Deadline verpasst?! Ich hab’s dir dreimal gesagt.', 'Ab nach Düsseldorf. Ich schreib dir Briefe.', 'Nimm Ohrstöpsel mit. Für das „Helau“.', 'Das ist kein Ausflug, das ist eine Strafe.'],
    ['Duisport: größter Binnenhafen der Welt. Wir sind wichtig.', 'Container, Container, Container. Und ein Kran, der mich anschaut.', 'Hier kommt Ware aus aller Welt an. Und deine Temu-Bestellung.', 'Wer den Hafen hat, hat die Macht.'],
    ['Kaiserberg: Hier wohnt man, wenn man es geschafft hat.', 'Ein Berg im Pott! Eher ein Hügel. Psst.', 'Kaiser-Vibes. Ich nehm eine Krone und einen Döner.'],
    ['Studio-Karte. Bitte kein „Kannst du mal eben schnell …“.', 'Ich rieche einen neuen Kunden. Oder Kaffee.', 'Das Studio ruft. Ich geh nicht ran.'],
    ['Wedau: Regattabahn, Sonne, Reichtum.', 'Hier rudern Leute. Ich rudere nur emotional.', 'Wedau ist das Malibu von Duisburg. Ungefähr.'],
    ['Öhringen Hbf: Endstation. Für die Bahn und für deine Geduld.', 'Von hier geht’s nach Heilbronn. Spannung pur.', 'Kleiner Bahnhof, großes Herz.', 'Ich steig hier aus. Ich wohn hier sozusagen.'],
    ['Die letzte April-Karte vor dem HQ. Dramatisch.', 'Ich hab heute null Geduld. Zieh.', 'No rizz, aber viel Glück.'],
    ['Innenhafen: Restaurants, Wasser, Lichter. Date-Spot.', 'Hier sieht Duisburg aus wie Amsterdam. Fast.', 'Teuer hier. Aber schön teuer.', 'Abends am Innenhafen chillen. Ich lade meinen Akku.'],
    ['Der „Prinz“ wollte nur kurz dein Geld leihen …', '„Klick hier für ein gratis iPhone.“ Und du hast geklickt.', 'Gescammt. Ich hab’s gesehen und nichts gesagt. Sorry.', 'Nächstes Mal frag mich vorher.'],
    ['DULIDAN HQ! Mein Zuhause. Schuhe aus.', 'Hier entsteht Magie. Und manchmal Bugs.', 'Willkommen im Hauptquartier. Kaffee steht links.', 'Das teuerste Feld. Weil wir es wert sind. 💜'],
  ];


  // ================= MEGA-BRETT: 120 Felder, 3× so groß =================
  const MEGA_GROUPS = {
    m1: { name: 'Duisburg', color: '#8b5a2b', house: 50 },
    m2: { name: 'Osteuropa', color: '#c08a5a', house: 50 },
    m3: { name: 'Öhringen', color: '#5fd0ff', house: 50 },
    m4: { name: 'Afrika', color: '#e0a030', house: 75 },
    m5: { name: 'Südamerika', color: '#ff4fd8', house: 100 },
    m6: { name: 'Mittelamerika', color: '#b8329f', house: 100 },
    m7: { name: 'Südasien', color: '#ff8a2a', house: 100 },
    m8: { name: 'Mittelmeer', color: '#ffb347', house: 125 },
    m9: { name: 'Ozeanien', color: '#d8e04a', house: 125 },
    m10: { name: 'Mitteleuropa', color: '#ff3348', house: 150 },
    m11: { name: 'Nordeuropa', color: '#b0203a', house: 150 },
    m12: { name: 'Deutschland', color: '#ffd83a', house: 150 },
    m13: { name: 'Golfstaaten', color: '#9aa0b8', house: 175 },
    m14: { name: 'Nordamerika', color: '#2fe08a', house: 175 },
    m15: { name: 'Ostasien', color: '#1fb5a0', house: 200 },
    m16: { name: 'Japan', color: '#7ad06a', house: 200 },
    m17: { name: 'US-Westküste', color: '#4a6bff', house: 200 },
    m18: { name: 'Weltstädte', color: '#7a55ff', house: 225 },
    m19: { name: 'DULIDAN', color: '#da29cf', house: 250 },
  };
  Object.assign(GROUPS, MEGA_GROUPS);
  // Miete wächst mit dem Preis, damit teure Felder richtig weh tun
  const r5 = (n) => Math.max(1, Math.round(n / 5) * 5);
  function megaRent(price) {
    const r0 = Math.max(2, Math.round(price * (0.04 + price / 10000)));
    return [r0, r5(r0 * 5), r5(r0 * 14), r5(r0 * 38), r5(r0 * 47), r5(r0 * 56)];
  }
  const mp = (name, group, price, q) => ({ type: 'prop', name, group, price, rent: megaRent(price), q: q ? [q] : null });
  const mrail = (name, q) => ({ type: 'rail', name, price: 200, icon: '🚉', q: q ? [q] : null });
  const mutil = (name, icon, sub, q) => ({ type: 'util', name, price: 150, icon, sub, q: q ? [q] : null });
  const mtax = (name, amount, icon, q) => ({ type: 'tax', name, amount, icon, q: q ? [q] : null });
  const mfree = (name, icon, sub, q) => ({ type: 'free', name, icon, sub, q: q ? [q] : null });
  const AK = { type: 'april', name: 'April-Karte' }, SK = { type: 'studio', name: 'Studio-Karte' };

  // Einmal um die Welt: Duisburg und Öhringen am Anfang, DULIDAN HQ ganz am Ende
  const MEGA_SPACES = [
    { type: 'go', name: 'LOS', sub: 'Neuer Auftrag! +Ð300' },
    mp('Weseler Straße', 'm1', 60), SK, mp('Hochfeld', 'm1', 60), mp('Rheinorange', 'm1', 80),
    mtax('April hatte Zugriff auf deine Karte', 200, '💳'), mrail('Duisburg Hbf'),
    mp('Sofia', 'm2', 80, 'Sofia: billig, schön, unterschätzt. Wie ich.'), AK,
    mp('Bukarest', 'm2', 80, 'Bukarest: Paläste und Partys. Ich nehm beides.'), mp('Belgrad', 'm2', 90, 'Belgrad: Hier schläft keiner. Ich auch nicht.'),
    mutil('Aprils Steckdose', '🔌', 'April zieht Strom, du zahlst.'), mp('Warschau', 'm2', 100, 'Warschau: Pierogi! Ich bestell zehn.'),
    mfree('Büdchen', '🏪', 'Gemischte Tüte, bitte.', 'Büdchen-Stopp! Gemischte Tüte. Nichts passiert.'), SK,
    mp('Öhringer Marktplatz', 'm3', 100), AK, mp('Hofgarten Öhringen', 'm3', 100), mp('Schloss Öhringen', 'm3', 120),
    mfree('Döner-Pause', '🥙', 'Mit allem, scharf.', 'Döner-Pause. Mit allem, scharf.'), mtax('Abo vergessen zu kündigen', 60, '📺', 'Drei Streaming-Abos. Du benutzt eins.'),
    mp('Lagos', 'm4', 120, 'Lagos: laut, schnell, voller Energie. Wie ich nach Red Bull.'), SK,
    mp('Nairobi', 'm4', 120, 'Nairobi: Giraffen direkt neben der Stadt. Ich will eine.'), mp('Kairo', 'm4', 130, 'Kairo: Pyramiden! Ich bau mir eine aus Dulis.'),
    mrail('Öhringen Hbf'), mp('Kapstadt', 'm4', 140, 'Kapstadt: Tafelberg, Meer, Pinguine. Perfekt.'), AK,
    mutil('Waschsalon', '🫧', 'Frisst Socken. Und Dulis.', 'Die Maschine frisst Socken. Und Dulis.'),
    mfree('Jetlag', '😴', 'Du schläfst eine Runde im Stehen.', 'Jetlag. Welcher Tag ist heute? Egal.'),
    { type: 'jail', name: 'UH! Schreckensort Düsseldorf', sub: 'Nur zu Besuch' },
    mp('Lima', 'm5', 140, 'Lima: Ceviche! Roher Fisch, mutig.'), mp('Bogotá', 'm5', 140, 'Bogotá: 2.600 Meter hoch. Ich krieg kaum Luft. Digital.'), SK,
    mp('Buenos Aires', 'm5', 150, 'Buenos Aires: Tango! Ich tanz mit zwei linken Füßen.'), mp('Rio de Janeiro', 'm5', 160, 'Rio! Copacabana, Sonne, Samba. Ich bleib hier.'), AK,
    mtax('Roaming-Gebühren', 100, '🌍', 'Du hast im Ausland TikTok geschaut. Roaming. Autsch.'),
    mp('Havanna', 'm6', 160, 'Havanna: Oldtimer überall. Der Berlingo wäre hier ein Star.'), mp('Panama-Stadt', 'm6', 160, 'Panama-Stadt: Hier fahren Schiffe durch ein Loch im Kontinent.'),
    mutil('Pfandautomat', '♻️', 'Frisst deine Flaschen, gibt nix zurück.'),
    mp('San José', 'm6', 170, 'San José: Pura Vida! Ich bin so entspannt.'), mp('Mexiko-Stadt', 'm6', 180, 'Mexiko-Stadt: Tacos um drei Uhr nachts. Lebensziel.'), AK,
    mrail('Mumbai CST', 'Mumbai CST: der schönste Bahnhof der Welt. Und der vollste.'),
    mp('Mumbai', 'm7', 180, 'Mumbai: Bollywood! Ich tanz im Hintergrund.'), SK, mp('Delhi', 'm7', 180, 'Delhi: Chaos, Farben, Gewürze. Mein Lieblingsmix.'),
    mp('Bangkok', 'm7', 190, 'Bangkok: Streetfood-Hauptstadt. Ich hab Hunger.'), mp('Jakarta', 'm7', 200, 'Jakarta: Stau, aber mit Aussicht.'),
    mutil('Aprils WLAN', '📶', 'Passwort? Sag ich nicht.', 'Mein WLAN. Passwort? Sag ich nicht.'),
    mfree('Flughafen-Lounge', '🛋️', 'Gratis Snacks. Endlich.', 'Flughafen-Lounge: gratis Kekse. Ich nehm die ganze Dose.'),
    mp('Athen', 'm8', 200, 'Athen: Akropolis. Alt, aber stabil. Wie meine Witze.'), AK,
    mp('Istanbul', 'm8', 200, 'Istanbul: zwei Kontinente, ein Döner. Respekt.'), mp('Rom', 'm8', 210, 'Rom: Pizza, Pasta, Kolosseum. Ich roll hier raus.'), SK,
    mp('Barcelona', 'm8', 220, 'Barcelona: Strand und Sagrada Família. Die ist immer noch nicht fertig.'),
    mtax('Parkknöllchen in Düsseldorf', 75, '🅿️', 'In Düsseldorf geparkt. Selbst schuld.'), AK,
    { type: 'parking', name: 'Aprils Pause', sub: 'Spardose' },
    mp('Auckland', 'm9', 220, 'Auckland: Herr-der-Ringe-Land. Ich bin ein Hobbit.'), mp('Brisbane', 'm9', 220, 'Brisbane: Koalas zum Kuscheln. Ich will einen.'), SK,
    mp('Melbourne', 'm9', 230, 'Melbourne: bester Kaffee der Welt. Sagen sie.'), mp('Sydney', 'm9', 240, 'Sydney: Opernhaus und Kängurus. Gleichzeitig.'),
    mrail('Gare du Nord', 'Gare du Nord: Paris wartet. Der Zug auch.'),
    mp('Prag', 'm10', 240, 'Prag: Märchenstadt. Ich bin die Prinzessin.'), mp('Wien', 'm10', 240, 'Wien: Schnitzel und Sachertorte. Diät morgen.'), AK,
    mp('Brüssel', 'm10', 250, 'Brüssel: Waffeln und Pommes. Ich zieh hierhin.'), mp('Zürich', 'm10', 260, 'Zürich: Alles kostet doppelt. Auch die Miete hier.'),
    mutil('Studio-Kaffeemaschine', '☕', 'Kaffee ist Treibstoff.', 'Kaffee ist Treibstoff. Kostet extra.'),
    mp('Oslo', 'm11', 260, 'Oslo: Fjorde und Elektroautos. Sehr ordentlich.'), mp('Kopenhagen', 'm11', 260, 'Kopenhagen: Fahrräder überall. Und Zimtschnecken.'),
    mp('Stockholm', 'm11', 270, 'Stockholm: Ich kauf ein Regal und bau es nie auf.'), mp('Amsterdam', 'm11', 280, 'Amsterdam: Grachten, Fahrräder, Käse. Gouda Wahl.'),
    mtax('Du wurdest gescammt', 100, '🎣'),
    mp('Köln', 'm12', 280, 'Köln: Dom, Kölsch, Karneval. Bloß nicht Düsseldorf erwähnen.'), mp('Hamburg', 'm12', 280, 'Hamburg: Moin! Mehr sagt man hier nicht.'), SK,
    mp('München', 'm12', 290, 'München: Brezn, Bier, Berge. Und teure Mieten.'), mp('Berlin', 'm12', 300, 'Berlin: arm, aber sexy. Die Miete ist nicht arm.'),
    mrail('King’s Cross', 'King’s Cross: Gleis 9 ¾? Ich such noch.'),
    mp('Riad', 'm13', 300, 'Riad: Hitze und Hochhäuser. Ich schmelze.'), mp('Doha', 'm13', 300, 'Doha: alles glänzt. Sogar die Bushaltestellen.'), AK,
    mp('Abu Dhabi', 'm13', 310, 'Abu Dhabi: eine Moschee aus Marmor. Wow.'), mp('Dubai', 'm13', 320, 'Dubai: das höchste Haus der Welt. Mein Ego ist höher.'),
    mfree('Baustelle A40', '🚧', 'Stau. Natürlich.', 'A40, Stau. Auch auf Weltreise. Natürlich.'),
    { type: 'gotojail', name: 'Ab nach Düsseldorf!', sub: 'Deadline verpasst' },
    mp('Toronto', 'm14', 320, 'Toronto: Kanadier sind so nett, ich werd misstrauisch.'), mp('Vancouver', 'm14', 320, 'Vancouver: Berge, Meer, Regen. Wie Duisburg, nur mit Bergen.'), SK,
    mp('Chicago', 'm14', 330, 'Chicago: Pizza so dick wie ein Kuchen.'), mp('Miami', 'm14', 340, 'Miami: Sonnenbrille auf. Für immer.'),
    mrail('Tokyo Station', 'Tokyo Station: Der Zug ist pünktlich. Auf die Sekunde. Unheimlich.'),
    mp('Seoul', 'm15', 340, 'Seoul: K-Pop! Ich kann alle Tänze. Fast.'), mp('Shanghai', 'm15', 340, 'Shanghai: Skyline wie aus einem Videospiel.'),
    mp('Hongkong', 'm15', 350, 'Hongkong: Dim Sum zum Frühstück. Bester Start.'), mp('Singapur', 'm15', 360, 'Singapur: so sauber, ich trau mich nicht zu atmen.'), AK,
    mp('Sapporo', 'm16', 360, 'Sapporo: Schnee-Festival! Ich bau einen Schnee-Berlingo.'), mp('Osaka', 'm16', 360, 'Osaka: Japans Küche. Ich ess mich durch.'),
    mp('Kyoto', 'm16', 370, 'Kyoto: Tempel, Gärten, Ruhe. Psst.'), mp('Tokio', 'm16', 380, 'Tokio: Neon, Ramen, Roboter. Meine Leute!'),
    mutil('Kiosk-Kühlschrank', '🧊', 'Kalte Getränke, heiße Preise.', 'Kalte Getränke, heiße Preise.'),
    mp('Seattle', 'm17', 380, 'Seattle: Kaffee und Regen. Ich fühl mich zu Hause.'), mp('Las Vegas', 'm17', 380, 'Las Vegas: Was hier passiert, bleibt hier. Außer deinen Schulden.'),
    mp('San Francisco', 'm17', 390, 'San Francisco: Golden Gate und Tech-Bros. Ich bin ein Startup.'), mp('Los Angeles', 'm17', 400, 'Los Angeles: Hollywood! Ich krieg meinen Stern.'),
    mrail('Grand Central', 'Grand Central: so schön, man vergisst den Zug.'),
    mp('Paris', 'm18', 420, 'Paris: Eiffelturm, Croissants, Romantik. Ich bin verliebt. In das Croissant.'), SK,
    mp('London', 'm18', 440, 'London: Tee um fünf, Regen um sechs.'), mp('New York', 'm18', 460, 'New York: die Stadt, die niemals schläft. Ich auch nicht.'),
    mtax('Handyvertrag verlängert', 80, '📱', 'Verlängert. Automatisch. Wie immer.'),
    mp('Dulidan Druckerei', 'm19', 480, 'Die Druckerei! Riecht nach frischen Plakaten.'), mp('Dulidan Folierhalle', 'm19', 500, 'Hier wird der Berlingo foliert. Mit Liebe und Föhn.'),
    mp('DULIDAN HQ', 'm19', 550),
  ];
  if (MEGA_SPACES.length !== 120) throw new Error('MEGA-Brett hat ' + MEGA_SPACES.length + ' Felder');
  // Aprils Sprüche: eigene Sprüche oder die vom normalen Brett (gleicher Name)
  const MEGA_FIELD = MEGA_SPACES.map((sp) => sp.q || (SPACES.findIndex((x) => x.name === sp.name) >= 0 ? APRIL_FIELD[SPACES.findIndex((x) => x.name === sp.name)] : null));
  MEGA_SPACES.forEach((sp) => { delete sp.q; });
  const idxOf = (list, type) => list.map((x, i) => (x.type === type ? i : -1)).filter((i) => i >= 0);
  // Karten wie „Rücke vor bis DULIDAN HQ“ finden ihr Ziel per Name
  const MEGA_MOVE = {};
  SPACES.forEach((x, i) => { const j = MEGA_SPACES.findIndex((y) => y.name === x.name); if (j >= 0) MEGA_MOVE[i] = j; });
  // ================= MINI-BRETT: 24 Felder, nur das Wichtigste =================
  const byName = (n) => Object.assign({}, SPACES.find((x) => x.name === n));
  const MINI_SPACES = [
    { type: 'go', name: 'LOS', sub: 'Neuer Auftrag! +Ð100' },
    byName('Weseler Straße'), { type: 'studio', name: 'Studio-Karte' }, byName('Hochfeld'),
    { type: 'tax', name: 'April hatte Zugriff auf deine Karte', amount: 150, icon: '💳' }, byName('Duisburg Hbf'),
    { type: 'jail', name: 'UH! Schreckensort Düsseldorf', sub: 'Nur zu Besuch' },
    byName('Öhringer Marktplatz'), { type: 'april', name: 'April-Karte' }, byName('Schloss Öhringen'), byName('Zoo Duisburg'), byName('MSV-Arena'),
    { type: 'parking', name: 'Aprils Pause', sub: 'Spardose' },
    byName('Landschaftspark Nord'), { type: 'april', name: 'April-Karte' }, byName('Rheinorange'), byName('Pfandautomat'), byName('Öhringen Hbf'),
    { type: 'gotojail', name: 'Ab nach Düsseldorf!', sub: 'Deadline verpasst' },
    byName('Königstraße'), byName('Forum Duisburg'), { type: 'tax', name: 'Du wurdest gescammt', amount: 100, icon: '🎣' }, byName('Innenhafen Duisburg'), byName('DULIDAN HQ'),
  ];
  if (MINI_SPACES.length !== 24) throw new Error('MINI-Brett hat ' + MINI_SPACES.length + ' Felder');
  const MINI_FIELD = MINI_SPACES.map((sp) => { const i = SPACES.findIndex((x) => x.name === sp.name); return i >= 0 ? APRIL_FIELD[i] : null; });
  const MINI_MOVE = {};
  SPACES.forEach((x, i) => { const j = MINI_SPACES.findIndex((y) => y.name === x.name); if (j >= 0) MINI_MOVE[i] = j; });

  const BOARDS = {
    normal: { id: 'normal', SPACES, RAILS, UTILS, APRIL_FIELD, N: 40, JAIL: 10, go: GO_MONEY, stepMult: 1, moneyMult: 1, maxHouses: 32, maxHotels: 12, moveMap: null },
    mini: { id: 'mini', SPACES: MINI_SPACES, RAILS: idxOf(MINI_SPACES, 'rail'), UTILS: idxOf(MINI_SPACES, 'util'), APRIL_FIELD: MINI_FIELD, N: 24, JAIL: 6, go: 100, stepMult: 1, moneyMult: 0.7, maxHouses: 16, maxHotels: 6, moveMap: MINI_MOVE },
    mega: { id: 'mega', SPACES: MEGA_SPACES, RAILS: idxOf(MEGA_SPACES, 'rail'), UTILS: idxOf(MEGA_SPACES, 'util'), APRIL_FIELD: MEGA_FIELD, N: 120, JAIL: 30, go: 300, stepMult: 2, moneyMult: 1.5, maxHouses: 96, maxHotels: 36, moveMap: MEGA_MOVE },
  };

  const DATA = { START_MONEY, GO_MONEY, GROUPS, SPACES, RAILS, UTILS, TOKENS, PLAYER_COLORS, APRIL_CARDS, STUDIO_CARDS, APRIL_SAYS, APRIL_FIELD, BOARDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.DULI_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
