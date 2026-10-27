// DULIDAN Risiko – Karten. Gebiete mit Koordinaten (für die echte Karte), Kontinente mit Bonus,
// Verbindungen (Land oder über eine Seezone) und Seezonen für den Realistic-Modus (Schiffe).
(function (root) {
  // Kurzschreibweise: Verbindung [a, b] = Land, [a, b, 'zone'] = über Wasser (diese Seezone)
  const WORLD = {
    name: 'Welt', desc: 'Die klassische Karte: 42 Gebiete, 6 Kontinente', center: [25, 15], zoom: 2,
    conts: {
      na: { name: 'Nordamerika', bonus: 5, color: '#ffd83a' }, sa: { name: 'Südamerika', bonus: 2, color: '#ff7a2a' },
      eu: { name: 'Europa', bonus: 5, color: '#3ad1ff' }, af: { name: 'Afrika', bonus: 3, color: '#b06bff' },
      as: { name: 'Asien', bonus: 7, color: '#3ce08a' }, au: { name: 'Ozeanien', bonus: 2, color: '#ff3d5e' },
    },
    terr: {
      alaska: ['Alaska', 64, -152, 'na'], nwt: ['Nordwest-Territorium', 64, -118, 'na'], groen: ['Grönland', 72, -40, 'na'], alberta: ['Alberta', 54, -115, 'na'],
      ontario: ['Ontario', 50, -87, 'na'], quebec: ['Québec', 52, -71, 'na'], wusa: ['West-USA', 39, -112, 'na'], ousa: ['Ost-USA', 37, -84, 'na'], mamerika: ['Mittelamerika', 19, -98, 'na'],
      venezuela: ['Venezuela', 7, -66, 'sa'], peru: ['Peru', -10, -75, 'sa'], brasilien: ['Brasilien', -10, -50, 'sa'], argentinien: ['Argentinien', -35, -64, 'sa'],
      island: ['Island', 65, -18, 'eu'], gb: ['Großbritannien', 54, -2, 'eu'], skandinavien: ['Skandinavien', 63, 15, 'eu'], meuropa: ['Mitteleuropa', 51, 12, 'eu'],
      weuropa: ['Westeuropa', 45, 1, 'eu'], seuropa: ['Südeuropa', 42, 16, 'eu'], oeuropa: ['Osteuropa', 52, 33, 'eu'],
      nafrika: ['Nordafrika', 24, 1, 'af'], aegypten: ['Ägypten', 26, 30, 'af'], oafrika: ['Ostafrika', 3, 38, 'af'], kongo: ['Kongo', -2, 22, 'af'], safrika: ['Südafrika', -29, 24, 'af'], madagaskar: ['Madagaskar', -19, 47, 'af'],
      ural: ['Ural', 58, 60, 'as'], sibirien: ['Sibirien', 63, 90, 'as'], jakutien: ['Jakutien', 66, 125, 'as'], kamtschatka: ['Kamtschatka', 58, 160, 'as'], irkutsk: ['Irkutsk', 54, 105, 'as'],
      mongolei: ['Mongolei', 46, 104, 'as'], japan: ['Japan', 36, 138, 'as'], afghanistan: ['Afghanistan', 34, 66, 'as'], china: ['China', 32, 110, 'as'], nahost: ['Naher Osten', 29, 45, 'as'],
      indien: ['Indien', 22, 79, 'as'], siam: ['Siam', 15, 101, 'as'],
      indonesien: ['Indonesien', -2, 113, 'au'], neuguinea: ['Neuguinea', -6, 143, 'au'], waustralien: ['West-Australien', -26, 121, 'au'], oaustralien: ['Ost-Australien', -27, 147, 'au'],
    },
    adj: [
      ['alaska', 'nwt'], ['alaska', 'alberta'], ['alaska', 'kamtschatka', 'npac'], ['nwt', 'alberta'], ['nwt', 'ontario'], ['nwt', 'groen', 'arct'], ['groen', 'ontario', 'arct'], ['groen', 'quebec', 'natl'], ['groen', 'island', 'natl'],
      ['alberta', 'ontario'], ['alberta', 'wusa'], ['ontario', 'wusa'], ['ontario', 'ousa'], ['ontario', 'quebec'], ['quebec', 'ousa'], ['wusa', 'ousa'], ['wusa', 'mamerika'], ['ousa', 'mamerika'],
      ['mamerika', 'venezuela'], ['venezuela', 'peru'], ['venezuela', 'brasilien'], ['peru', 'brasilien'], ['peru', 'argentinien'], ['brasilien', 'argentinien'], ['brasilien', 'nafrika', 'matl'],
      ['island', 'gb', 'natl'], ['island', 'skandinavien', 'nsea'], ['gb', 'skandinavien', 'nsea'], ['gb', 'meuropa', 'nsea'], ['gb', 'weuropa', 'natl'], ['skandinavien', 'meuropa'], ['skandinavien', 'oeuropa'],
      ['meuropa', 'oeuropa'], ['meuropa', 'seuropa'], ['meuropa', 'weuropa'], ['weuropa', 'seuropa'], ['weuropa', 'nafrika', 'med'], ['seuropa', 'oeuropa'], ['seuropa', 'nahost'], ['seuropa', 'aegypten', 'med'], ['seuropa', 'nafrika', 'med'],
      ['oeuropa', 'nahost'], ['oeuropa', 'afghanistan'], ['oeuropa', 'ural'],
      ['nafrika', 'aegypten'], ['nafrika', 'oafrika'], ['nafrika', 'kongo'], ['aegypten', 'nahost'], ['aegypten', 'oafrika'], ['oafrika', 'nahost', 'ind'], ['oafrika', 'kongo'], ['oafrika', 'safrika'], ['oafrika', 'madagaskar', 'ind'],
      ['kongo', 'safrika'], ['safrika', 'madagaskar', 'ind'],
      ['ural', 'sibirien'], ['ural', 'china'], ['ural', 'afghanistan'], ['sibirien', 'jakutien'], ['sibirien', 'irkutsk'], ['sibirien', 'mongolei'], ['sibirien', 'china'], ['jakutien', 'irkutsk'], ['jakutien', 'kamtschatka'],
      ['kamtschatka', 'irkutsk'], ['kamtschatka', 'mongolei'], ['kamtschatka', 'japan', 'wpac'], ['irkutsk', 'mongolei'], ['mongolei', 'china'], ['mongolei', 'japan', 'wpac'], ['afghanistan', 'china'], ['afghanistan', 'indien'], ['afghanistan', 'nahost'],
      ['china', 'siam'], ['china', 'indien'], ['nahost', 'indien'], ['indien', 'siam'], ['siam', 'indonesien', 'scs'],
      ['indonesien', 'neuguinea', 'scs'], ['indonesien', 'waustralien', 'ind'], ['neuguinea', 'waustralien', 'coral'], ['neuguinea', 'oaustralien', 'coral'], ['waustralien', 'oaustralien'],
    ],
    seas: {
      npac: ['Nordpazifik', 48, -168, ['alaska', 'kamtschatka', 'alberta', 'wusa', 'japan'], ['epac', 'wpac', 'arct']],
      epac: ['Ostpazifik', 12, -118, ['wusa', 'mamerika', 'peru'], ['npac', 'spac']],
      spac: ['Südpazifik', -38, -100, ['peru', 'argentinien'], ['epac', 'coral', 'satl']],
      arct: ['Nordpolarmeer', 76, -75, ['nwt', 'groen', 'ontario', 'alaska'], ['natl', 'npac']],
      natl: ['Nordatlantik', 46, -38, ['groen', 'quebec', 'ousa', 'island', 'gb', 'weuropa'], ['arct', 'matl', 'nsea']],
      matl: ['Mittelatlantik', 12, -32, ['ousa', 'mamerika', 'venezuela', 'brasilien', 'nafrika', 'weuropa'], ['natl', 'satl', 'med']],
      satl: ['Südatlantik', -32, -18, ['brasilien', 'argentinien', 'kongo', 'safrika'], ['matl', 'ind', 'spac']],
      nsea: ['Nordsee', 58, 4, ['gb', 'skandinavien', 'meuropa', 'island'], ['natl']],
      med: ['Mittelmeer', 36, 17, ['weuropa', 'seuropa', 'nafrika', 'aegypten', 'nahost'], ['matl']],
      ind: ['Indischer Ozean', -14, 72, ['oafrika', 'madagaskar', 'safrika', 'nahost', 'indien', 'indonesien', 'waustralien'], ['satl', 'scs']],
      scs: ['Südchinesisches Meer', 12, 114, ['siam', 'china', 'indonesien', 'neuguinea'], ['ind', 'wpac']],
      wpac: ['Westpazifik', 30, 152, ['japan', 'kamtschatka', 'mongolei', 'china', 'neuguinea'], ['npac', 'scs', 'coral']],
      coral: ['Korallenmeer', -16, 160, ['neuguinea', 'oaustralien', 'waustralien'], ['wpac', 'spac']],
    },
  };

  // Der Pott: Städte und Stadtteile, Rhein und Kanäle als Wasserwege
  const RUHR = {
    name: 'Ruhrpott', desc: 'Duisburg, der Pott und der Niederrhein – 29 Gebiete, Rhein und Kanäle als Wasser', center: [51.46, 6.95], zoom: 10,
    conts: {
      duis: { name: 'Duisburg', bonus: 3, color: '#c020b8' }, nrh: { name: 'Niederrhein', bonus: 3, color: '#3ce08a' },
      west: { name: 'Westliches Revier', bonus: 3, color: '#ffd83a' }, emscher: { name: 'Emscher', bonus: 2, color: '#ff7a2a' },
      ost: { name: 'Östliches Revier', bonus: 4, color: '#3ad1ff' }, rhein: { name: 'Düsseldorf & Bergisches', bonus: 3, color: '#b06bff' },
    },
    terr: {
      dnord: ['Duisburg-Nord', 51.495, 6.765, 'duis'], dmitte: ['Duisburg-Mitte', 51.432, 6.775, 'duis'], dsued: ['Duisburg-Süd', 51.365, 6.755, 'duis'],
      homberg: ['Homberg', 51.457, 6.69, 'duis'], rheinhausen: ['Rheinhausen', 51.398, 6.705, 'duis'], walsum: ['Walsum', 51.53, 6.725, 'duis'],
      moers: ['Moers', 51.451, 6.62, 'nrh'], kamplintfort: ['Kamp-Lintfort', 51.505, 6.54, 'nrh'], dinslaken: ['Dinslaken', 51.567, 6.76, 'nrh'],
      wesel: ['Wesel', 51.66, 6.62, 'nrh'], voerde: ['Voerde', 51.6, 6.68, 'nrh'],
      oberhausen: ['Oberhausen', 51.47, 6.86, 'west'], muelheim: ['Mülheim', 51.418, 6.885, 'west'], bottrop: ['Bottrop', 51.525, 6.93, 'west'], essen: ['Essen', 51.455, 7.01, 'west'],
      gelsenkirchen: ['Gelsenkirchen', 51.51, 7.1, 'emscher'], gladbeck: ['Gladbeck', 51.572, 6.99, 'emscher'], herten: ['Herten', 51.598, 7.13, 'emscher'], recklinghausen: ['Recklinghausen', 51.614, 7.2, 'emscher'],
      bochum: ['Bochum', 51.48, 7.22, 'ost'], herne: ['Herne', 51.538, 7.225, 'ost'], dortmund: ['Dortmund', 51.514, 7.465, 'ost'], witten: ['Witten', 51.437, 7.335, 'ost'], hagen: ['Hagen', 51.36, 7.47, 'ost'],
      duesseldorf: ['Düsseldorf', 51.227, 6.775, 'rhein'], ratingen: ['Ratingen', 51.297, 6.85, 'rhein'], wuppertal: ['Wuppertal', 51.256, 7.15, 'rhein'], velbert: ['Velbert', 51.34, 7.04, 'rhein'], krefeld: ['Krefeld', 51.334, 6.58, 'rhein'],
    },
    adj: [
      ['dnord', 'walsum'], ['dnord', 'dmitte'], ['dnord', 'oberhausen'], ['dnord', 'homberg', 'rheinn'], ['walsum', 'dinslaken'], ['walsum', 'oberhausen'],
      ['dmitte', 'dsued'], ['dmitte', 'muelheim'], ['dmitte', 'oberhausen'], ['dmitte', 'homberg', 'rheinn'], ['dmitte', 'rheinhausen', 'rheins'],
      ['dsued', 'rheinhausen', 'rheins'], ['dsued', 'muelheim'], ['dsued', 'ratingen'], ['dsued', 'duesseldorf'], ['dsued', 'krefeld', 'rheins'],
      ['homberg', 'rheinhausen'], ['homberg', 'moers'], ['rheinhausen', 'moers'], ['rheinhausen', 'krefeld'],
      ['moers', 'kamplintfort'], ['moers', 'krefeld'], ['kamplintfort', 'krefeld'], ['kamplintfort', 'wesel', 'rheinn'],
      ['wesel', 'voerde'], ['wesel', 'dinslaken'], ['voerde', 'dinslaken'], ['dinslaken', 'bottrop'], ['dinslaken', 'oberhausen'],
      ['oberhausen', 'bottrop'], ['oberhausen', 'essen'], ['oberhausen', 'muelheim'], ['muelheim', 'essen'], ['muelheim', 'ratingen'],
      ['bottrop', 'gladbeck'], ['bottrop', 'essen'], ['bottrop', 'gelsenkirchen'], ['essen', 'gelsenkirchen'], ['essen', 'bochum'], ['essen', 'velbert'], ['essen', 'ratingen'],
      ['gelsenkirchen', 'gladbeck'], ['gelsenkirchen', 'herten'], ['gelsenkirchen', 'herne'], ['gelsenkirchen', 'bochum'], ['gladbeck', 'herten'],
      ['herten', 'recklinghausen'], ['herten', 'herne'], ['recklinghausen', 'herne'], ['recklinghausen', 'dortmund'],
      ['herne', 'bochum'], ['herne', 'dortmund'], ['bochum', 'dortmund'], ['bochum', 'witten'], ['dortmund', 'witten'], ['dortmund', 'hagen'],
      ['witten', 'hagen'], ['witten', 'wuppertal'], ['hagen', 'wuppertal'], ['wuppertal', 'velbert'], ['wuppertal', 'duesseldorf'],
      ['velbert', 'ratingen'], ['ratingen', 'duesseldorf'], ['duesseldorf', 'krefeld', 'rheins'],
    ],
    seas: {
      rheinn: ['Rhein (Nord)', 51.5, 6.71, ['homberg', 'dnord', 'walsum', 'dmitte', 'wesel', 'kamplintfort', 'voerde', 'dinslaken', 'moers'], ['rheins', 'rhk', 'wdk', 'ruhr']],
      rheins: ['Rhein (Süd)', 51.3, 6.705, ['rheinhausen', 'dmitte', 'dsued', 'krefeld', 'duesseldorf'], ['rheinn']],
      rhk: ['Rhein-Herne-Kanal', 51.5, 7.03, ['dnord', 'oberhausen', 'bottrop', 'essen', 'gelsenkirchen', 'herne'], ['rheinn', 'wdk']],
      wdk: ['Wesel-Datteln-Kanal', 51.63, 6.93, ['wesel', 'voerde', 'dinslaken', 'gladbeck', 'herten', 'recklinghausen'], ['rheinn', 'rhk']],
      ruhr: ['Ruhr', 51.41, 7.1, ['dmitte', 'muelheim', 'essen', 'bochum', 'witten', 'hagen'], ['rheinn']],
    },
  };

  // Aufbereiten: Nachbarlisten, Wasserwege, Küsten
  function build(m) {
    const T = {};
    Object.entries(m.terr).forEach(([id, [name, lat, lng, c]]) => { T[id] = { id, name, lat, lng, c, adj: [], sea: {} }; });
    m.adj.forEach(([a, b, z]) => {
      if (!T[a] || !T[b]) throw new Error(`Risiko-Karte ${m.name}: ${a}/${b} unbekannt`);
      T[a].adj.push(b); T[b].adj.push(a);
      if (z) { T[a].sea[b] = z; T[b].sea[a] = z; }
    });
    const Z = {};
    Object.entries(m.seas || {}).forEach(([id, [name, lat, lng, coast, adj]]) => { Z[id] = { id, name, lat, lng, coast, adj }; });
    Object.values(Z).forEach((z) => z.adj.forEach((o) => { if (Z[o] && !Z[o].adj.includes(z.id)) Z[o].adj.push(z.id); }));
    const conts = {};
    Object.entries(m.conts).forEach(([id, c]) => { conts[id] = Object.assign({ id, terr: Object.values(T).filter((t) => t.c === id).map((t) => t.id) }, c); });
    return { name: m.name, desc: m.desc, center: m.center, zoom: m.zoom, T, Z, conts, ids: Object.keys(T) };
  }
  const MAPS = { world: build(WORLD), ruhr: build(RUHR) };

  const R = { MAPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  else root.DULI_RISIKO_DATA = R;
})(typeof window !== 'undefined' ? window : globalThis);
