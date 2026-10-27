// Dulidanopoly – Hausregeln zum Anklicken und die Spielvarianten. Gilt für alle Modi,
// außer eine Regel ist mit only: 'classic' nur fürs klassische Brett (und Casino) gedacht.
(function (root) {
  const RULES = [
    { id: 'splitSteal', icon: '🤝', name: 'Split or Steal', hot: true, text: 'Wer auf Aprils Pause landet, spielt mit einer zufälligen Person um die Spardose. Erst behaupten (Lüge erlaubt), dann geheim: Teilen oder Klauen?', only: 'classic' },
    { id: 'doublesCash', icon: '🎲', name: 'Pasch-Prämie', text: 'Jeder Pasch bringt Ð50.' },
    { id: 'lucky7', icon: '🍀', name: 'Glückszahl 7', text: 'Wer genau 7 würfelt, bekommt Ð77.' },
    { id: 'monopoly3', icon: '👑', name: 'Monopol-Power', text: 'Eine ganze Farbgruppe kassiert 3× statt 2× Miete.' },
    { id: 'halfHouses', icon: '🏗️', name: 'Bau-Boom', text: 'Häuser und Gebäude kosten die Hälfte.' },
    { id: 'freeBuild', icon: '🧱', name: 'Freies Bauen', text: 'Kein gleichmäßiges Bauen nötig.' },
    { id: 'rentCut', icon: '✂️', name: 'Mietbremse', text: 'Alle Mieten −25 %.' },
    { id: 'rentHigh', icon: '🔥', name: 'Mietwahnsinn', text: 'Alle Mieten +50 %.' },
    { id: 'inflation', icon: '📈', name: 'Inflation', text: 'Ab Runde 10 steigen alle Mieten jede Runde um 10 %.' },
    { id: 'cardsX2', icon: '🃏', name: 'Doppelte Karten', text: 'Geld auf Karten zählt doppelt. Im Guten wie im Schlechten.' },
    { id: 'interest', icon: '🏦', name: 'Zinsen', text: 'Zum Gehalt gibt’s Zinsen aufs Bargeld (max. Ð100).' },
    { id: 'robin', icon: '🏹', name: 'Robin Hood', text: 'Jede Runde zahlt die reichste Person Ð50 an die ärmste.' },
    { id: 'startProps', icon: '🎁', name: 'Startpaket', text: 'Alle starten mit 2 zufälligen Feldern.' },
    { id: 'mortgageFree', icon: '🏠', name: 'Faire Hypothek', text: 'Hypotheken einlösen ohne 10 % Aufschlag.' },
    { id: 'secret', icon: '🕵️', name: 'Geheimes Konto', text: 'Das Geld der anderen ist versteckt. Pokerface!' },
    { id: 'noAuction', icon: '🔨', name: 'Keine Auktionen', text: 'Nicht gekaufte Felder bleiben einfach frei.', only: 'classic' },
    { id: 'jailRent', icon: '⛓️', name: 'Knast ohne Miete', text: 'Wer in Düsseldorf sitzt, kassiert keine Miete.', only: 'classic' },
    { id: 'noJail', icon: '🚫', name: 'Düsseldorf light', text: 'Statt Knast zahlt man Ð100 in die Spardose.', only: 'classic' },
  ];
  const VARIANTS = [
    { id: 'normal', icon: '🎲', name: 'Klassisch', text: 'Die normalen Regeln.' },
    { id: 'blitz', icon: '⚡', name: 'Blitz', text: 'Alles wird am Start verteilt. Nach 20 Runden gewinnt der Reichste.', boardText: 'Alles wird am Start verteilt. Die Krise kommt schon in Runde 3 – bis alle pleite sind.' },
    { id: 'million', icon: '💸', name: 'Millionär', text: 'Wer zuerst Ð5.000 Vermögen hat, gewinnt.' },
    { id: 'chaos', icon: 'april', name: 'April-Chaos', text: 'April wirft ständig Chaos-Events rein. Nichts ist sicher.' },
    { id: 'hardcore', icon: '💀', name: 'Hardcore', text: 'Nur Ð800 Startgeld, alle Mieten ×1,5.' },
    { id: 'speed', icon: '🏎️', name: 'Turbo', text: 'Ein dritter Turbo-Würfel (1–3) schiebt dich jeden Zug weiter.' },
    { id: 'tycoon', icon: '🏢', name: 'Baulöwe', text: 'Alle starten mit 3 Feldern, aber Ð500 weniger. Häuser −25 %.' },
    { id: 'rich', icon: '💎', name: 'Neureich', text: 'Ð5.000 Startgeld, aber alle Mieten ×2,5.' },
    { id: 'sudden', icon: '⏳', name: 'Sudden Death', text: 'Ab Runde 6 zahlt jede Person zu Zugbeginn eine wachsende Überlebens-Steuer.' },
    { id: 'swap', icon: '🔄', name: 'Konto-Roulette', text: 'Alle 5 Runden werden die Kontostände zufällig getauscht.' },
  ];
  const on = (S, id) => !!(S && S.settings && S.settings.rules && S.settings.rules[id]);
  const variant = (S) => (S && S.settings && S.settings.variant) || 'normal';

  // Gemeinsame Mietfaktoren für beide Engines
  function rentFactor(S) {
    let f = 1;
    if (on(S, 'rentCut')) f *= 0.75;
    if (on(S, 'rentHigh')) f *= 1.5;
    if (on(S, 'inflation') && (S.round || 1) > 10) f *= 1 + 0.1 * (S.round - 10);
    if (variant(S) === 'rich') f *= 2.5;
    return f;
  }
  function buildFactor(S) {
    let f = 1;
    if (on(S, 'halfHouses')) f *= 0.5;
    if (variant(S) === 'tycoon') f *= 0.75;
    return f;
  }
  const monoMult = (S) => (on(S, 'monopoly3') ? 3 : 2);
  const cardMult = (S) => (on(S, 'cardsX2') ? 2 : 1);
  const suddenTax = (S) => (variant(S) === 'sudden' && (S.round || 1) >= 6 ? (S.round - 5) * 25 : 0);

  const RULESET = { RULES, VARIANTS, on, variant, rentFactor, buildFactor, monoMult, cardMult, suddenTax };
  if (typeof module !== 'undefined' && module.exports) module.exports = RULESET;
  else root.DULI_RULES = RULESET;
})(typeof window !== 'undefined' ? window : globalThis);
