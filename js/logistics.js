// Dulidanopoly LOGISTICS – nur Bahnhöfe, Flughäfen und Häfen.
// Flughäfen und Häfen zählen wie Bahnhöfe im Klassiker (je mehr, desto teurer).
// Die 20 Bahnhöfe verbindest du selbst mit Schienen (teuer!). Miete wächst mit der Größe deines Netzes.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.DULI_DATA;

  const st = (name, price, sub) => ({ type: 'station', name, price, icon: '🚉', sub });
  const air = (name, code) => ({ type: 'rail', name, price: 200, icon: '✈️', sub: code });
  const port = (name) => ({ type: 'util', name, price: 180, icon: '⚓', sub: 'Hafen' });
  const SPACES = [
    { type: 'go', name: 'LOS', sub: 'Frachtgeld! +Ð200' },
    st('Öhringen', 60, 'Hohenlohe'),
    { type: 'studio', name: 'Fracht-Karte' },
    st('Heilbronn', 60, 'Neckar'),
    { type: 'tax', name: 'LKW-Maut', amount: 200, icon: '🚛' },
    air('Flughafen Düsseldorf', 'DUS'),
    st('Oberhausen', 100, 'Ruhr'),
    { type: 'april', name: 'April-Karte' },
    st('Mülheim an der Ruhr', 100, 'Ruhr'),
    port('Duisport'),
    { type: 'jail', name: 'Stellwerksstörung', sub: 'Nur zu Besuch' },
    st('Gelsenkirchen', 140, 'Ruhr'),
    st('Bochum', 140, 'Ruhr'),
    st('Duisburg Hbf', 160, 'Ruhr'),
    st('Essen', 160, 'Ruhr'),
    air('Flughafen Köln/Bonn', 'CGN'),
    st('Dortmund', 180, 'Ruhr'),
    { type: 'studio', name: 'Fracht-Karte' },
    st('Münster', 180, 'Westfalen'),
    port('Hafen Hamburg'),
    { type: 'parking', name: 'Aprils Pause', sub: 'Spardose' },
    st('Bremen', 220, 'Norden'),
    { type: 'april', name: 'April-Karte' },
    st('Hannover', 220, 'Norden'),
    st('Leipzig', 240, 'Osten'),
    air('Flughafen Frankfurt', 'FRA'),
    st('Nürnberg', 260, 'Süden'),
    st('Stuttgart', 260, 'Süden'),
    st('Frankfurt (Main)', 280, 'Mitte'),
    port('Bremerhaven'),
    { type: 'gotojail', name: 'Signalstörung!', sub: 'Ab ins Stellwerk' },
    st('Düsseldorf', 300, 'Rhein'),
    st('Köln', 300, 'Rhein'),
    { type: 'studio', name: 'Fracht-Karte' },
    st('München', 320, 'Süden'),
    air('Flughafen BER', 'BER'),
    { type: 'april', name: 'April-Karte' },
    st('Berlin Hbf', 350, 'Hauptstadt'),
    { type: 'tax', name: 'Trassengebühr', amount: 100, icon: '🛤️' },
    port('Rostock'),
  ];
  const at = (name) => SPACES.findIndex((s) => s.name === name);
  // Echte Bahnstrecken mit ungefähren Kilometern
  const LINES = [
    ['Öhringen', 'Heilbronn', 30], ['Heilbronn', 'Stuttgart', 50], ['Öhringen', 'Nürnberg', 150], ['Stuttgart', 'München', 220],
    ['Stuttgart', 'Frankfurt (Main)', 200], ['Nürnberg', 'München', 170], ['Nürnberg', 'Leipzig', 280], ['Nürnberg', 'Frankfurt (Main)', 220],
    ['Frankfurt (Main)', 'Köln', 180], ['Köln', 'Düsseldorf', 40], ['Düsseldorf', 'Duisburg Hbf', 25], ['Duisburg Hbf', 'Oberhausen', 10],
    ['Duisburg Hbf', 'Mülheim an der Ruhr', 10], ['Mülheim an der Ruhr', 'Essen', 12], ['Duisburg Hbf', 'Essen', 20], ['Oberhausen', 'Gelsenkirchen', 20],
    ['Essen', 'Gelsenkirchen', 12], ['Essen', 'Bochum', 17], ['Gelsenkirchen', 'Bochum', 15], ['Bochum', 'Dortmund', 20],
    ['Köln', 'Dortmund', 90], ['Dortmund', 'Münster', 60], ['Münster', 'Bremen', 160], ['Bremen', 'Hannover', 120],
    ['Dortmund', 'Hannover', 210], ['Hannover', 'Berlin Hbf', 280], ['Hannover', 'Leipzig', 260], ['Leipzig', 'Berlin Hbf', 190],
  ].map(([a, b, km]) => ({ a: at(a), b: at(b), km }));
  const STATIONS = SPACES.map((s, i) => (s.type === 'station' ? i : -1)).filter((i) => i >= 0);
  const idxOf = (t) => SPACES.map((s, i) => (s.type === t ? i : -1)).filter((i) => i >= 0);

  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const line = (a, b) => LINES.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  // Schienen sind teuer: Grundpreis + Kilometer
  const trackCost = (a, b) => { const l = line(a, b); return l ? 100 + l.km * 3 : 0; };
  const tri = (n) => (n * (n + 1)) / 2;

  // Aktive Schienen: beide Bahnhöfe gehören dem Erbauer und sind nicht verpfändet
  function activeTracks(S, pid) {
    return (S.tracks || []).filter((t) => t.owner === pid && [t.a, t.b].every((i) => S.props[i] && S.props[i].owner === pid && !S.props[i].mort));
  }
  // Netz (Zusammenhangskomponente) eines Bahnhofs
  function network(S, idx) {
    const st0 = S.props[idx];
    if (!st0 || !st0.owner) return [idx];
    const tr = activeTracks(S, st0.owner);
    const seen = new Set([idx]), todo = [idx];
    while (todo.length) {
      const i = todo.pop();
      tr.forEach((t) => {
        const j = t.a === i ? t.b : t.b === i ? t.a : null;
        if (j != null && !seen.has(j)) { seen.add(j); todo.push(j); }
      });
    }
    return [...seen];
  }
  // Miete: Grundmiete (Preis / 8) × Netzgröße², +10 % pro Flughafen/Hafen des Besitzers
  function stationRent(S, idx) {
    const st = S.props[idx], sp = SPACES[idx];
    const n = st.mort ? 1 : network(S, idx).length;
    const hubs = [...idxOf('rail'), ...idxOf('util')].filter((i) => S.props[i].owner === st.owner && !S.props[i].mort).length;
    return Math.round((sp.price / 8) * n * n * (1 + 0.1 * hubs));
  }
  const portRent = (n) => 30 * Math.pow(2, n - 1);
  // Strecken, die jemand gerade bauen könnte
  function buildable(S, pid) {
    return LINES.filter((l) => !(S.tracks || []).some((t) => key(t.a, t.b) === key(l.a, l.b))
      && [l.a, l.b].every((i) => S.props[i] && S.props[i].owner === pid && !S.props[i].mort));
  }
  const tracksOf = (S, idx) => (S.tracks || []).filter((t) => t.a === idx || t.b === idx);

  const BOARD = {
    id: 'logi', SPACES, RAILS: idxOf('rail'), UTILS: idxOf('util'), APRIL_FIELD: {}, N: 40, JAIL: 10, go: 200,
    stepMult: 1, moneyMult: 1, maxHouses: 0, maxHotels: 0, moveMap: null,
  };
  D.BOARDS.logi = BOARD;

  const LOGI = { SPACES, LINES, STATIONS, BOARD, key, line, trackCost, tri, network, stationRent, portRent, buildable, tracksOf, activeTracks };
  if (isNode) module.exports = LOGI;
  else root.DULI_LOGI = LOGI;
})(typeof window !== 'undefined' ? window : globalThis);
