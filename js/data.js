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
    april:    { name: 'April',          emoji: '🤖', power: 'Einmal pro Spiel eine gezogene Karte zurücklegen und neu ziehen.' },
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

  const DATA = { START_MONEY, GO_MONEY, GROUPS, SPACES, RAILS, UTILS, TOKENS, PLAYER_COLORS, APRIL_CARDS, STUDIO_CARDS, APRIL_SAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.DULI_DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
