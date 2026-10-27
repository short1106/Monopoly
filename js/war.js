// Dulidanopoly WAR – Brett, Einheiten und Verteidigung.
// Jede Farbgruppe bildet eine eigene Truppe aus. Luftstützpunkte (statt Bahnhöfe) und Häfen (statt Werke)
// schalten Flieger und Schiffe frei. Gekämpft wird wie bei Axis & Allies: jede Einheit trifft,
// wenn der Würfel höchstens ihren Angriffs- bzw. Verteidigungswert zeigt.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.DULI_DATA;

  const RENAME = {
    0: { name: 'NACHSCHUB', sub: 'Neue Truppen-Gelder +Ð200' },
    4: { name: 'Kriegssteuer', icon: '💰' },
    5: { name: 'Luftstützpunkt Laarbruch', icon: '🛫', sub: 'Luftstützpunkt' },
    15: { name: 'Luftstützpunkt Nörvenich', icon: '🛫', sub: 'Luftstützpunkt' },
    25: { name: 'Luftstützpunkt Ramstein', icon: '🛫', sub: 'Luftstützpunkt' },
    35: { name: 'Luftstützpunkt Hohn', icon: '🛫', sub: 'Luftstützpunkt' },
    12: { name: 'Hafen Duisport', icon: '⚓', sub: 'Hafen', price: 150 },
    28: { name: 'Marinehafen Kiel', icon: '⚓', sub: 'Hafen', price: 150 },
    38: { type: 'util', name: 'Hafen Wilhelmshaven', icon: '⚓', sub: 'Hafen', price: 150 },
    10: { name: 'Gefangenenlager Düsseldorf', sub: 'Nur zu Besuch' },
    30: { name: 'Gefangen genommen!', sub: 'Ab ins Lager' },
    20: { name: 'Waffenstillstand', sub: 'Spardose' },
  };
  const SPACES = D.SPACES.map((sp, i) => Object.assign({}, sp, RENAME[i] || {}));
  const idxOf = (t) => SPACES.map((s, i) => (s.type === t ? i : -1)).filter((i) => i >= 0);
  const BOARD = Object.assign({}, D.BOARDS.normal, { id: 'war', SPACES, RAILS: idxOf('rail'), UTILS: idxOf('util') });
  D.BOARDS.war = BOARD;

  // a = Angriff, d = Verteidigung (trifft bei Würfel ≤ Wert), r = Reichweite, k = Art
  const UNITS = {
    para: { group: 'brown', icon: '🪂', name: 'Fallschirmjäger', a: 2, d: 1, cost: 50, k: 'land', r: 99, text: 'Springt überall auf dem Brett ab.' },
    tank: { group: 'lblue', icon: '🚜', name: 'Panzer', a: 3, d: 3, cost: 80, k: 'land', r: 2, text: 'Greift Felder bis 2 neben deinen Gebieten an.' },
    heli: { group: 'pink', icon: '🚁', name: 'Helikopter', a: 3, d: 2, cost: 90, k: 'air', r: 4, text: 'Fliegt 4 Felder ab deinem Luftstützpunkt. Flak trifft ihn.' },
    frigate: { group: 'orange', icon: '🚢', name: 'Fregatte', a: 2, d: 3, cost: 90, k: 'sea', r: 5, text: 'Fährt 5 Felder ab deinem Hafen. Jagt U-Boote.' },
    sub: { group: 'red', icon: '🐋', name: 'U-Boot', a: 3, d: 1, cost: 100, k: 'sea', r: 6, text: 'Erstschlag aus der Tiefe, außer Radar oder Fregatte sind da.' },
    fighter: { group: 'yellow', icon: '🛩️', name: 'Fighter', a: 3, d: 4, cost: 120, k: 'air', r: 5, text: 'Stationiert: schießt angreifende Bomber und Helis ab.' },
    bomber: { group: 'green', icon: '✈️', name: 'Bomber', a: 4, d: 1, cost: 140, k: 'air', r: 8, text: 'Weitester Angriff. Flak und Fighter holen ihn runter.' },
    carrier: { group: 'dblue', icon: '🛳️', name: 'Flugzeugträger', a: 1, d: 4, cost: 200, k: 'sea', r: 5, text: 'Schwimmender Flugplatz: +3 Reichweite für alle deine Flieger.' },
  };
  const MILITIA = { icon: '🪖', name: 'Miliz', d: 2 };
  const DEFS = {
    flak: { icon: '🎯', name: 'Flak', cost: 100, max: 1, text: 'Schießt vor dem Kampf auf Bomber und Helis (trifft bei 1–3, mit Radar 1–4).' },
    radar: { icon: '📡', name: 'Radar', cost: 80, max: 1, text: 'Flak trifft besser, U-Boote verlieren den Erstschlag, Fighter in 2 Feldern Umkreis helfen mit.' },
    bunker: { icon: '🧱', name: 'Bunker', cost: 120, max: 2, text: 'Jede Stufe: Verteidigung +1 gegen Land- und See-Angriffe.' },
  };
  const unitOfGroup = (g) => Object.keys(UNITS).find((u) => UNITS[u].group === g);
  const dist = (a, b) => { const x = Math.abs(a - b) % 40; return Math.min(x, 40 - x); };

  const WAR = { SPACES, BOARD, UNITS, MILITIA, DEFS, unitOfGroup, dist };
  if (isNode) module.exports = WAR;
  else root.DULI_WAR = WAR;
})(typeof window !== 'undefined' ? window : globalThis);
