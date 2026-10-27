// DULIDAN GeoGuessr – Orte. Jeder Eintrag: [Name, Breite, Länge, Ländercode].
// Die Koordinate ist zugleich die Lösung: genau dort zeigt das Satellitenbild hin.
(function (root) {
  const WORLD = [
    // Europa
    ['Paris, Eiffelturm', 48.8584, 2.2945, 'fr'], ['Paris, Arc de Triomphe', 48.8738, 2.2950, 'fr'], ['Marseille, Alter Hafen', 43.2951, 5.3740, 'fr'],
    ['Lyon', 45.7578, 4.8320, 'fr'], ['Nizza', 43.6960, 7.2700, 'fr'], ['Mont-Saint-Michel', 48.6361, -1.5115, 'fr'], ['Bordeaux', 44.8412, -0.5800, 'fr'],
    ['London, Tower Bridge', 51.5055, -0.0754, 'gb'], ['London, Big Ben', 51.5007, -0.1246, 'gb'], ['Edinburgh, Burg', 55.9486, -3.1999, 'gb'],
    ['Manchester', 53.4794, -2.2453, 'gb'], ['Stonehenge', 51.1789, -1.8262, 'gb'], ['Dublin', 53.3498, -6.2603, 'ie'],
    ['Amsterdam, Dam', 52.3731, 4.8926, 'nl'], ['Rotterdam, Erasmusbrücke', 51.9094, 4.4868, 'nl'], ['Brüssel, Atomium', 50.8949, 4.3415, 'be'],
    ['Luxemburg', 49.6116, 6.1319, 'lu'], ['Madrid, Plaza Mayor', 40.4155, -3.7074, 'es'], ['Barcelona, Sagrada Família', 41.4036, 2.1744, 'es'],
    ['Sevilla', 37.3826, -5.9963, 'es'], ['Valencia, Stadt der Künste', 39.4545, -0.3505, 'es'], ['Palma de Mallorca, Kathedrale', 39.5675, 2.6480, 'es'],
    ['Lissabon, Praça do Comércio', 38.7075, -9.1364, 'pt'], ['Porto', 41.1408, -8.6110, 'pt'], ['Rom, Kolosseum', 41.8902, 12.4922, 'it'],
    ['Vatikan, Petersplatz', 41.9022, 12.4569, 'va'], ['Venedig, Markusplatz', 45.4341, 12.3388, 'it'], ['Mailand, Dom', 45.4642, 9.1916, 'it'],
    ['Florenz, Dom', 43.7731, 11.2560, 'it'], ['Neapel', 40.8518, 14.2681, 'it'], ['Pisa, Schiefer Turm', 43.7230, 10.3966, 'it'],
    ['Wien, Stephansdom', 48.2085, 16.3731, 'at'], ['Salzburg', 47.7981, 13.0465, 'at'], ['Zürich', 47.3769, 8.5417, 'ch'], ['Zermatt', 46.0207, 7.7491, 'ch'],
    ['Prag, Karlsbrücke', 50.0865, 14.4114, 'cz'], ['Warschau', 52.2297, 21.0122, 'pl'], ['Krakau, Hauptmarkt', 50.0617, 19.9373, 'pl'],
    ['Budapest, Parlament', 47.5071, 19.0456, 'hu'], ['Bratislava', 48.1446, 17.1077, 'sk'], ['Ljubljana', 46.0511, 14.5051, 'si'], ['Zagreb', 45.8131, 15.9775, 'hr'],
    ['Dubrovnik, Altstadt', 42.6410, 18.1080, 'hr'], ['Belgrad', 44.8176, 20.4569, 'rs'], ['Sarajevo', 43.8590, 18.4310, 'ba'],
    ['Bukarest, Parlamentspalast', 44.4275, 26.0875, 'ro'], ['Sofia', 42.6977, 23.3219, 'bg'], ['Athen, Akropolis', 37.9715, 23.7257, 'gr'],
    ['Santorini, Oia', 36.4618, 25.3753, 'gr'], ['Istanbul, Hagia Sophia', 41.0086, 28.9802, 'tr'], ['Ankara', 39.9334, 32.8597, 'tr'], ['Antalya', 36.8848, 30.7040, 'tr'],
    ['Kopenhagen, Nyhavn', 55.6798, 12.5904, 'dk'], ['Oslo, Oper', 59.9075, 10.7531, 'no'], ['Bergen, Bryggen', 60.3975, 5.3245, 'no'],
    ['Stockholm, Gamla stan', 59.3251, 18.0711, 'se'], ['Helsinki', 60.1699, 24.9384, 'fi'], ['Reykjavík, Hallgrímskirkja', 64.1417, -21.9266, 'is'],
    ['Tallinn', 59.4370, 24.7536, 'ee'], ['Riga', 56.9496, 24.1052, 'lv'], ['Vilnius', 54.6872, 25.2797, 'lt'], ['Kiew', 50.4501, 30.5234, 'ua'],
    ['Moskau, Roter Platz', 55.7539, 37.6208, 'ru'], ['Sankt Petersburg', 59.9398, 30.3146, 'ru'], ['Minsk', 53.9006, 27.5590, 'by'],
    ['Valletta', 35.8989, 14.5146, 'mt'], ['Monaco', 43.7384, 7.4246, 'mc'], ['Tirana', 41.3275, 19.8187, 'al'], ['Skopje', 41.9981, 21.4254, 'mk'],
    ['Chișinău', 47.0105, 28.8638, 'md'], ['Podgorica', 42.4304, 19.2594, 'me'], ['Nikosia', 35.1725, 33.3650, 'cy'],
    ['Berlin, Brandenburger Tor', 52.5163, 13.3777, 'de'], ['Schloss Neuschwanstein', 47.5576, 10.7498, 'de'], ['Hamburg, Elbphilharmonie', 53.5413, 9.9841, 'de'],
    ['Köln, Dom', 50.9413, 6.9583, 'de'],
    // Amerika
    ['New York, Times Square', 40.7580, -73.9855, 'us'], ['New York, Freiheitsstatue', 40.6892, -74.0445, 'us'], ['Washington, Kapitol', 38.8899, -77.0091, 'us'],
    ['Chicago', 41.8826, -87.6233, 'us'], ['Las Vegas, Strip', 36.1147, -115.1728, 'us'], ['Los Angeles, Hollywood', 34.1016, -118.3267, 'us'],
    ['San Francisco, Golden Gate', 37.8199, -122.4783, 'us'], ['Grand Canyon', 36.0566, -112.1251, 'us'], ['Miami Beach', 25.7907, -80.1300, 'us'],
    ['New Orleans', 29.9584, -90.0644, 'us'], ['Houston', 29.7604, -95.3698, 'us'], ['Seattle, Space Needle', 47.6205, -122.3493, 'us'],
    ['Denver', 39.7392, -104.9903, 'us'], ['Honolulu, Waikiki', 21.2793, -157.8292, 'us'], ['Anchorage', 61.2181, -149.9003, 'us'],
    ['Toronto, CN Tower', 43.6426, -79.3871, 'ca'], ['Montréal', 45.5017, -73.5673, 'ca'], ['Vancouver', 49.2827, -123.1207, 'ca'],
    ['Québec, Château Frontenac', 46.8119, -71.2050, 'ca'], ['Mexiko-Stadt, Zócalo', 19.4326, -99.1332, 'mx'], ['Chichén Itzá', 20.6843, -88.5678, 'mx'],
    ['Cancún', 21.1619, -86.8515, 'mx'], ['Havanna', 23.1365, -82.3590, 'cu'], ['Panama-Stadt', 8.9824, -79.5199, 'pa'], ['Bogotá', 4.5981, -74.0758, 'co'],
    ['Lima', -12.0464, -77.0428, 'pe'], ['Machu Picchu', -13.1631, -72.5450, 'pe'], ['Quito', -0.2202, -78.5120, 'ec'],
    ['Santiago de Chile', -33.4378, -70.6505, 'cl'], ['Buenos Aires, Obelisco', -34.6037, -58.3816, 'ar'], ['Rio de Janeiro, Copacabana', -22.9711, -43.1822, 'br'],
    ['Rio de Janeiro, Christusstatue', -22.9519, -43.2105, 'br'], ['São Paulo', -23.5614, -46.6559, 'br'], ['Brasília', -15.7998, -47.8645, 'br'],
    ['Montevideo', -34.9060, -56.1913, 'uy'], ['La Paz', -16.4955, -68.1336, 'bo'], ['Caracas', 10.5061, -66.9146, 've'], ['Kingston', 17.9714, -76.7936, 'jm'],
    ['San José', 9.9281, -84.0907, 'cr'],
    // Afrika
    ['Gizeh, Pyramiden', 29.9792, 31.1342, 'eg'], ['Kairo', 30.0444, 31.2357, 'eg'], ['Marrakesch, Jemaa el-Fna', 31.6258, -7.9891, 'ma'],
    ['Casablanca, Hassan-II.-Moschee', 33.6086, -7.6328, 'ma'], ['Tunis', 36.8065, 10.1815, 'tn'], ['Algier', 36.7538, 3.0588, 'dz'], ['Lagos', 6.4541, 3.3947, 'ng'],
    ['Accra', 5.5560, -0.1969, 'gh'], ['Dakar', 14.6928, -17.4467, 'sn'], ['Nairobi', -1.2864, 36.8172, 'ke'], ['Addis Abeba', 9.0300, 38.7400, 'et'],
    ['Kapstadt', -33.9249, 18.4241, 'za'], ['Johannesburg', -26.2041, 28.0473, 'za'], ['Sansibar, Stone Town', -6.1630, 39.1890, 'tz'],
    ['Kigali', -1.9441, 30.0619, 'rw'], ['Windhuk', -22.5609, 17.0658, 'na'], ['Antananarivo', -18.8792, 47.5079, 'mg'], ['Luanda', -8.8390, 13.2894, 'ao'],
    ['Kinshasa', -4.3217, 15.3125, 'cd'], ['Kampala', 0.3476, 32.5825, 'ug'],
    // Asien und Naher Osten
    ['Dubai, Burj Khalifa', 25.1972, 55.2744, 'ae'], ['Dubai, Palm Jumeirah', 25.1124, 55.1390, 'ae'], ['Abu Dhabi, Scheich-Zayid-Moschee', 24.4128, 54.4750, 'ae'],
    ['Doha', 25.2854, 51.5310, 'qa'], ['Riad', 24.7136, 46.6753, 'sa'], ['Mekka', 21.4225, 39.8262, 'sa'], ['Jerusalem, Altstadt', 31.7767, 35.2345, 'il'],
    ['Tel Aviv', 32.0853, 34.7818, 'il'], ['Amman', 31.9539, 35.9106, 'jo'], ['Petra', 30.3285, 35.4444, 'jo'], ['Beirut', 33.8938, 35.5018, 'lb'],
    ['Teheran', 35.6892, 51.3890, 'ir'], ['Baku', 40.4093, 49.8671, 'az'], ['Tiflis', 41.7151, 44.8271, 'ge'], ['Jerewan', 40.1792, 44.4991, 'am'],
    ['Kabul', 34.5553, 69.2075, 'af'], ['Taschkent', 41.2995, 69.2401, 'uz'], ['Samarkand, Registan', 39.6547, 66.9758, 'uz'], ['Almaty', 43.2220, 76.8512, 'kz'],
    ['Neu-Delhi, India Gate', 28.6129, 77.2295, 'in'], ['Agra, Taj Mahal', 27.1751, 78.0421, 'in'], ['Mumbai, Gateway of India', 18.9220, 72.8347, 'in'],
    ['Bangalore', 12.9716, 77.5946, 'in'], ['Kathmandu', 27.7172, 85.3240, 'np'], ['Colombo', 6.9271, 79.8612, 'lk'], ['Dhaka', 23.8103, 90.4125, 'bd'],
    ['Karatschi', 24.8607, 67.0011, 'pk'], ['Bangkok, Königspalast', 13.7500, 100.4913, 'th'], ['Phuket', 7.8804, 98.3923, 'th'], ['Hanoi', 21.0285, 105.8542, 'vn'],
    ['Ho-Chi-Minh-Stadt', 10.7769, 106.7009, 'vn'], ['Angkor Wat', 13.4125, 103.8670, 'kh'], ['Kuala Lumpur, Petronas Towers', 3.1579, 101.7116, 'my'],
    ['Singapur, Marina Bay Sands', 1.2834, 103.8607, 'sg'], ['Jakarta', -6.1754, 106.8272, 'id'], ['Bali, Ubud', -8.5069, 115.2625, 'id'],
    ['Manila', 14.5995, 120.9842, 'ph'], ['Peking, Verbotene Stadt', 39.9163, 116.3972, 'cn'], ['Shanghai, Bund', 31.2400, 121.4900, 'cn'],
    ['Chinesische Mauer, Badaling', 40.3540, 116.0200, 'cn'], ['Taipeh 101', 25.0340, 121.5645, 'tw'], ['Seoul', 37.5665, 126.9780, 'kr'],
    ['Tokio, Shibuya', 35.6595, 139.7005, 'jp'], ['Kyoto, Fushimi Inari', 34.9671, 135.7727, 'jp'], ['Osaka', 34.6937, 135.5023, 'jp'],
    ['Fuji, Kawaguchiko', 35.5000, 138.7600, 'jp'], ['Ulaanbaatar', 47.8864, 106.9057, 'mn'], ['Pjöngjang', 39.0392, 125.7625, 'kp'], ['Malé', 4.1755, 73.5093, 'mv'],
    // Ozeanien
    ['Sydney, Opernhaus', -33.8568, 151.2153, 'au'], ['Melbourne', -37.8136, 144.9631, 'au'], ['Uluru', -25.3444, 131.0369, 'au'], ['Perth', -31.9505, 115.8605, 'au'],
    ['Auckland', -36.8485, 174.7633, 'nz'], ['Queenstown', -45.0312, 168.6626, 'nz'], ['Wellington', -41.2865, 174.7762, 'nz'], ['Suva', -18.1416, 178.4419, 'fj'],
  ];
  const EUROPE_CC = 'fr gb ie nl be lu es pt it va at ch cz pl hu sk si hr rs ba ro bg gr tr dk no se fi is ee lv lt ua ru by mt mc al mk md me cy de li ad sm xk'.split(' ');

  const DE = [
    ['Berlin, Brandenburger Tor', 52.5163, 13.3777], ['Berlin, Fernsehturm', 52.5208, 13.4094], ['Hamburg, Elbphilharmonie', 53.5413, 9.9841],
    ['Hamburg, Speicherstadt', 53.5440, 9.9910], ['München, Marienplatz', 48.1374, 11.5755], ['München, Allianz Arena', 48.2188, 11.6247],
    ['Köln, Dom', 50.9413, 6.9583], ['Frankfurt, Römer', 50.1106, 8.6821], ['Stuttgart, Schlossplatz', 48.7784, 9.1800], ['Düsseldorf, Rheinturm', 51.2179, 6.7615],
    ['Dortmund, Signal Iduna Park', 51.4926, 7.4519], ['Leipzig', 51.3397, 12.3731], ['Dresden, Frauenkirche', 51.0519, 13.7416], ['Nürnberg, Kaiserburg', 49.4577, 11.0758],
    ['Hannover', 52.3759, 9.7320], ['Bremen, Marktplatz', 53.0758, 8.8072], ['Schloss Neuschwanstein', 47.5576, 10.7498], ['Zugspitze', 47.4211, 10.9853],
    ['Heidelberg, Schloss', 49.4106, 8.7153], ['Rostock', 54.0887, 12.1405], ['Kiel', 54.3233, 10.1228], ['Sylt, Westerland', 54.9079, 8.3033],
    ['Rügen, Königsstuhl', 54.5734, 13.6644], ['Freiburg im Breisgau', 47.9990, 7.8421], ['Konstanz', 47.6603, 9.1758], ['Mainz', 49.9929, 8.2473],
    ['Trier, Porta Nigra', 49.7597, 6.6439], ['Aachen, Dom', 50.7746, 6.0839], ['Münster', 51.9625, 7.6256], ['Bonn', 50.7374, 7.0982],
    ['Wolfsburg, VW-Werk', 52.4310, 10.7865], ['Magdeburg', 52.1205, 11.6276], ['Erfurt', 50.9787, 11.0328], ['Weimar', 50.9795, 11.3235],
    ['Potsdam, Sanssouci', 52.4044, 13.0385], ['Schwerin, Schloss', 53.6245, 11.4185], ['Lübeck, Holstentor', 53.8662, 10.6797], ['Regensburg', 49.0195, 12.0975],
    ['Augsburg', 48.3705, 10.8978], ['Würzburg, Residenz', 49.7929, 9.9384], ['Bamberg', 49.8917, 10.8873], ['Passau', 48.5748, 13.4609],
    ['Ulm, Münster', 48.3985, 9.9925], ['Karlsruhe, Schloss', 49.0134, 8.4044], ['Mannheim', 49.4875, 8.4660], ['Saarbrücken', 49.2402, 6.9969],
    ['Kassel, Herkules', 51.3159, 9.3936], ['Göttingen', 51.5413, 9.9158], ['Chemnitz', 50.8278, 12.9214], ['Görlitz', 51.1528, 14.9873], ['Cottbus', 51.7563, 14.3329],
    ['Flughafen BER', 52.3667, 13.5033], ['Flughafen Frankfurt', 50.0379, 8.5622], ['Helgoland', 54.1823, 7.8853], ['Garmisch-Partenkirchen', 47.4917, 11.0955],
    ['Berchtesgaden', 47.6314, 13.0016], ['Wuppertal, Schwebebahn', 51.2562, 7.1508], ['Bielefeld (gibt es wirklich)', 52.0302, 8.5325],
  ].map((x) => x.concat('de'));

  const RUHR = [
    ['Duisburg, Landschaftspark Nord', 51.4807, 6.7834], ['Duisburg, Tiger & Turtle', 51.3918, 6.7738], ['Duisburg, Innenhafen', 51.4372, 6.7710],
    ['Duisburg Hauptbahnhof', 51.4297, 6.7757], ['Duisburg, Rathaus', 51.4359, 6.7621], ['Duisburg, MSV-Arena', 51.4092, 6.7795],
    ['Duisburg, Zoo', 51.4402, 6.7946], ['Duisburg, Regattabahn Wedau', 51.4040, 6.7810], ['Duisburg-Ruhrort, Hafen', 51.4545, 6.7330],
    ['Duisburg, Friedrich-Ebert-Brücke', 51.4475, 6.7246], ['Duisburg, Logport Rheinhausen', 51.3800, 6.7000], ['Duisburg, Stahlwerk Bruckhausen', 51.4920, 6.7380],
    ['Duisburg, Königstraße', 51.4339, 6.7650], ['Duisburg-Marxloh', 51.5040, 6.7740], ['Duisburg-Homberg', 51.4570, 6.6940], ['Duisburg-Walsum', 51.5300, 6.7270],
    ['Essen, Zeche Zollverein', 51.4865, 7.0453], ['Essen Hauptbahnhof', 51.4514, 7.0138], ['Essen, Villa Hügel', 51.4061, 7.0072],
    ['Gelsenkirchen, Veltins-Arena', 51.5546, 7.0676], ['Oberhausen, Centro', 51.4935, 6.8758], ['Oberhausen, Gasometer', 51.4942, 6.8706],
    ['Bochum, Bergbau-Museum', 51.4890, 7.2170], ['Bochum, Ruhrstadion', 51.4900, 7.2365], ['Dortmund, U-Turm', 51.5153, 7.4537],
    ['Dortmund, Signal Iduna Park', 51.4926, 7.4519], ['Mülheim an der Ruhr', 51.4271, 6.8828], ['Moers', 51.4515, 6.6264], ['Dinslaken', 51.5623, 6.7380],
    ['Bottrop, Tetraeder', 51.5225, 6.9585], ['Herten, Halde Hoheward', 51.5640, 7.1360], ['Hagen', 51.3600, 7.4750], ['Recklinghausen', 51.6140, 7.1970],
    ['Herne', 51.5380, 7.2250], ['Krefeld', 51.3388, 6.5853],
  ].map((x) => x.concat('de'));

  const HOHENLOHE = [
    ['Öhringen, Marktplatz', 49.2003, 9.5017], ['Künzelsau', 49.2817, 9.6893], ['Friedrichsruhe', 49.2496, 9.5266], ['Schwäbisch Hall', 49.1121, 9.7374],
    ['Langenburg, Schloss', 49.2533, 9.8566], ['Neuenstein, Schloss', 49.2049, 9.5795], ['Waldenburg', 49.1840, 9.6380], ['Kupferzell', 49.2270, 9.6900],
    ['Bretzfeld', 49.1800, 9.4380], ['Pfedelbach', 49.1760, 9.5000], ['Zweiflingen', 49.2560, 9.5170], ['Ingelfingen', 49.3000, 9.6530],
    ['Niedernhall', 49.2950, 9.6170], ['Forchtenberg', 49.2880, 9.5640], ['Krautheim', 49.3870, 9.6350], ['Dörzbach', 49.3830, 9.7090],
    ['Mulfingen', 49.3420, 9.8000], ['Kloster Schöntal', 49.3260, 9.5040], ['Weißbach', 49.2950, 9.5960], ['Kirchberg an der Jagst', 49.2000, 9.9830],
    ['Heilbronn', 49.1427, 9.2109], ['Neckarsulm, Audi-Werk', 49.1950, 9.2170], ['Weinsberg, Burg Weibertreu', 49.1530, 9.2850], ['Gaildorf', 49.0000, 9.7700],
  ].map((x) => x.concat('de'));

  const SETS = {
    world: { name: 'Welt', list: WORLD, scale: 1500, zoom: 2, center: [20, 10] },
    europe: { name: 'Europa', list: WORLD.filter((x) => EUROPE_CC.includes(x[3])), scale: 500, zoom: 4, center: [52, 12] },
    de: { name: 'Deutschland', list: DE, scale: 120, zoom: 6, center: [51.1, 10.4] },
    ruhr: { name: 'Duisburg & Ruhrpott', list: RUHR, scale: 6, zoom: 10, center: [51.47, 6.95] },
    hohe: { name: 'Hohenlohe', list: HOHENLOHE, scale: 8, zoom: 10, center: [49.24, 9.6] },
  };

  const COUNTRIES = {
    de: 'Deutschland', fr: 'Frankreich', gb: 'Vereinigtes Königreich', ie: 'Irland', nl: 'Niederlande', be: 'Belgien', lu: 'Luxemburg', es: 'Spanien',
    pt: 'Portugal', it: 'Italien', va: 'Vatikanstadt', at: 'Österreich', ch: 'Schweiz', cz: 'Tschechien', pl: 'Polen', hu: 'Ungarn', sk: 'Slowakei',
    si: 'Slowenien', hr: 'Kroatien', rs: 'Serbien', ba: 'Bosnien und Herzegowina', ro: 'Rumänien', bg: 'Bulgarien', gr: 'Griechenland', tr: 'Türkei',
    dk: 'Dänemark', no: 'Norwegen', se: 'Schweden', fi: 'Finnland', is: 'Island', ee: 'Estland', lv: 'Lettland', lt: 'Litauen', ua: 'Ukraine',
    ru: 'Russland', by: 'Belarus', mt: 'Malta', mc: 'Monaco', al: 'Albanien', mk: 'Nordmazedonien', md: 'Moldau', me: 'Montenegro', cy: 'Zypern',
    li: 'Liechtenstein', ad: 'Andorra', sm: 'San Marino', xk: 'Kosovo',
    us: 'USA', ca: 'Kanada', mx: 'Mexiko', cu: 'Kuba', pa: 'Panama', co: 'Kolumbien', pe: 'Peru', ec: 'Ecuador', cl: 'Chile', ar: 'Argentinien',
    br: 'Brasilien', uy: 'Uruguay', bo: 'Bolivien', ve: 'Venezuela', jm: 'Jamaika', cr: 'Costa Rica', py: 'Paraguay', gt: 'Guatemala', hn: 'Honduras',
    ni: 'Nicaragua', sv: 'El Salvador', do: 'Dominikanische Republik', ht: 'Haiti', bs: 'Bahamas', gy: 'Guyana', sr: 'Suriname', gl: 'Grönland',
    eg: 'Ägypten', ma: 'Marokko', tn: 'Tunesien', dz: 'Algerien', ly: 'Libyen', ng: 'Nigeria', gh: 'Ghana', sn: 'Senegal', ke: 'Kenia', et: 'Äthiopien',
    za: 'Südafrika', tz: 'Tansania', rw: 'Ruanda', na: 'Namibia', mg: 'Madagaskar', ao: 'Angola', cd: 'Demokratische Republik Kongo', ug: 'Uganda',
    sd: 'Sudan', ss: 'Südsudan', so: 'Somalia', cm: 'Kamerun', ci: 'Elfenbeinküste', ml: 'Mali', ne: 'Niger', td: 'Tschad', zm: 'Sambia', zw: 'Simbabwe',
    mz: 'Mosambik', bw: 'Botswana', mw: 'Malawi', er: 'Eritrea', dj: 'Dschibuti', mr: 'Mauretanien', bf: 'Burkina Faso', gn: 'Guinea', cg: 'Republik Kongo',
    ga: 'Gabun', cf: 'Zentralafrikanische Republik', lr: 'Liberia', sl: 'Sierra Leone', tg: 'Togo', bj: 'Benin', ls: 'Lesotho', sz: 'Eswatini',
    ae: 'Vereinigte Arabische Emirate', qa: 'Katar', sa: 'Saudi-Arabien', il: 'Israel', ps: 'Palästina', jo: 'Jordanien', lb: 'Libanon', sy: 'Syrien',
    iq: 'Irak', ir: 'Iran', kw: 'Kuwait', bh: 'Bahrain', om: 'Oman', ye: 'Jemen', az: 'Aserbaidschan', ge: 'Georgien', am: 'Armenien', af: 'Afghanistan',
    uz: 'Usbekistan', kz: 'Kasachstan', tm: 'Turkmenistan', kg: 'Kirgisistan', tj: 'Tadschikistan', in: 'Indien', np: 'Nepal', lk: 'Sri Lanka',
    bd: 'Bangladesch', pk: 'Pakistan', bt: 'Bhutan', mm: 'Myanmar', th: 'Thailand', vn: 'Vietnam', kh: 'Kambodscha', la: 'Laos', my: 'Malaysia',
    sg: 'Singapur', id: 'Indonesien', ph: 'Philippinen', cn: 'China', tw: 'Taiwan', kr: 'Südkorea', kp: 'Nordkorea', jp: 'Japan', mn: 'Mongolei',
    mv: 'Malediven', au: 'Australien', nz: 'Neuseeland', fj: 'Fidschi', pg: 'Papua-Neuguinea',
  };

  const GEO = { SETS, COUNTRIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = GEO;
  else root.DULI_GEO_DATA = GEO;
})(typeof window !== 'undefined' ? window : globalThis);
