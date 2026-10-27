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


  // Hauptstädte (auch für den Flaggen-Modus)
  const CAPITALS = [
    ['Berlin', 52.5200, 13.4050, 'de'], ['Paris', 48.8566, 2.3522, 'fr'], ['London', 51.5074, -0.1278, 'gb'], ['Dublin', 53.3498, -6.2603, 'ie'], ['Amsterdam', 52.3676, 4.9041, 'nl'],
    ['Brüssel', 50.8503, 4.3517, 'be'], ['Luxemburg', 49.6116, 6.1319, 'lu'], ['Madrid', 40.4168, -3.7038, 'es'], ['Lissabon', 38.7223, -9.1393, 'pt'], ['Rom', 41.9028, 12.4964, 'it'],
    ['Wien', 48.2082, 16.3738, 'at'], ['Bern', 46.9480, 7.4474, 'ch'], ['Prag', 50.0755, 14.4378, 'cz'], ['Warschau', 52.2297, 21.0122, 'pl'], ['Budapest', 47.4979, 19.0402, 'hu'],
    ['Bratislava', 48.1486, 17.1077, 'sk'], ['Ljubljana', 46.0569, 14.5058, 'si'], ['Zagreb', 45.8150, 15.9819, 'hr'], ['Belgrad', 44.7866, 20.4489, 'rs'], ['Sarajevo', 43.8563, 18.4131, 'ba'],
    ['Podgorica', 42.4304, 19.2594, 'me'], ['Tirana', 41.3275, 19.8187, 'al'], ['Skopje', 41.9981, 21.4254, 'mk'], ['Sofia', 42.6977, 23.3219, 'bg'], ['Bukarest', 44.4268, 26.1025, 'ro'],
    ['Chișinău', 47.0105, 28.8638, 'md'], ['Kiew', 50.4501, 30.5234, 'ua'], ['Minsk', 53.9006, 27.5590, 'by'], ['Vilnius', 54.6872, 25.2797, 'lt'], ['Riga', 56.9496, 24.1052, 'lv'],
    ['Tallinn', 59.4370, 24.7536, 'ee'], ['Helsinki', 60.1699, 24.9384, 'fi'], ['Stockholm', 59.3293, 18.0686, 'se'], ['Oslo', 59.9139, 10.7522, 'no'], ['Kopenhagen', 55.6761, 12.5683, 'dk'],
    ['Reykjavík', 64.1466, -21.9426, 'is'], ['Athen', 37.9838, 23.7275, 'gr'], ['Ankara', 39.9334, 32.8597, 'tr'], ['Nikosia', 35.1856, 33.3823, 'cy'], ['Valletta', 35.8989, 14.5146, 'mt'],
    ['Moskau', 55.7558, 37.6173, 'ru'], ['Tiflis', 41.7151, 44.8271, 'ge'], ['Jerewan', 40.1792, 44.4991, 'am'], ['Baku', 40.4093, 49.8671, 'az'], ['Andorra la Vella', 42.5063, 1.5218, 'ad'],
    ['Vaduz', 47.1410, 9.5209, 'li'], ['San Marino', 43.9424, 12.4578, 'sm'], ['Monaco', 43.7384, 7.4246, 'mc'], ['Pristina', 42.6629, 21.1655, 'xk'],
    ['Washington', 38.9072, -77.0369, 'us'], ['Ottawa', 45.4215, -75.6972, 'ca'], ['Mexiko-Stadt', 19.4326, -99.1332, 'mx'], ['Havanna', 23.1136, -82.3666, 'cu'], ['Guatemala-Stadt', 14.6349, -90.5069, 'gt'],
    ['San José', 9.9281, -84.0907, 'cr'], ['Panama-Stadt', 8.9824, -79.5199, 'pa'], ['Bogotá', 4.7110, -74.0721, 'co'], ['Caracas', 10.4806, -66.9036, 've'], ['Quito', -0.1807, -78.4678, 'ec'],
    ['Lima', -12.0464, -77.0428, 'pe'], ['La Paz', -16.4897, -68.1193, 'bo'], ['Santiago', -33.4489, -70.6693, 'cl'], ['Buenos Aires', -34.6037, -58.3816, 'ar'], ['Montevideo', -34.9011, -56.1645, 'uy'],
    ['Asunción', -25.2637, -57.5759, 'py'], ['Brasília', -15.8267, -47.9218, 'br'], ['Kingston', 17.9712, -76.7936, 'jm'], ['Santo Domingo', 18.4861, -69.9312, 'do'], ['Port-au-Prince', 18.5944, -72.3074, 'ht'],
    ['Kairo', 30.0444, 31.2357, 'eg'], ['Rabat', 34.0209, -6.8416, 'ma'], ['Tunis', 36.8065, 10.1815, 'tn'], ['Algier', 36.7538, 3.0588, 'dz'], ['Tripolis', 32.8872, 13.1913, 'ly'],
    ['Abuja', 9.0765, 7.3986, 'ng'], ['Accra', 5.6037, -0.1870, 'gh'], ['Dakar', 14.7167, -17.4677, 'sn'], ['Nairobi', -1.2921, 36.8219, 'ke'], ['Addis Abeba', 9.0300, 38.7400, 'et'],
    ['Pretoria', -25.7479, 28.2293, 'za'], ['Dodoma', -6.1630, 35.7516, 'tz'], ['Kigali', -1.9441, 30.0619, 'rw'], ['Windhuk', -22.5609, 17.0658, 'na'], ['Antananarivo', -18.8792, 47.5079, 'mg'],
    ['Luanda', -8.8390, 13.2894, 'ao'], ['Kinshasa', -4.4419, 15.2663, 'cd'], ['Kampala', 0.3476, 32.5825, 'ug'], ['Khartum', 15.5007, 32.5599, 'sd'], ['Harare', -17.8252, 31.0335, 'zw'],
    ['Lusaka', -15.3875, 28.3228, 'zm'], ['Maputo', -25.9692, 32.5732, 'mz'], ['Gaborone', -24.6282, 25.9231, 'bw'], ['Bamako', 12.6392, -8.0029, 'ml'], ['Yaoundé', 3.8480, 11.5021, 'cm'],
    ['Abu Dhabi', 24.4539, 54.3773, 'ae'], ['Doha', 25.2854, 51.5310, 'qa'], ['Riad', 24.7136, 46.6753, 'sa'], ['Jerusalem', 31.7683, 35.2137, 'il'], ['Amman', 31.9539, 35.9106, 'jo'],
    ['Beirut', 33.8938, 35.5018, 'lb'], ['Damaskus', 33.5138, 36.2765, 'sy'], ['Bagdad', 33.3152, 44.3661, 'iq'], ['Teheran', 35.6892, 51.3890, 'ir'], ['Kuwait-Stadt', 29.3759, 47.9774, 'kw'],
    ['Maskat', 23.5880, 58.3829, 'om'], ['Kabul', 34.5553, 69.2075, 'af'], ['Islamabad', 33.6844, 73.0479, 'pk'], ['Neu-Delhi', 28.6139, 77.2090, 'in'], ['Kathmandu', 27.7172, 85.3240, 'np'],
    ['Dhaka', 23.8103, 90.4125, 'bd'], ['Colombo', 6.9271, 79.8612, 'lk'], ['Bangkok', 13.7563, 100.5018, 'th'], ['Hanoi', 21.0285, 105.8542, 'vn'], ['Phnom Penh', 11.5564, 104.9282, 'kh'],
    ['Vientiane', 17.9757, 102.6331, 'la'], ['Kuala Lumpur', 3.1390, 101.6869, 'my'], ['Singapur', 1.3521, 103.8198, 'sg'], ['Jakarta', -6.2088, 106.8456, 'id'], ['Manila', 14.5995, 120.9842, 'ph'],
    ['Peking', 39.9042, 116.4074, 'cn'], ['Taipeh', 25.0330, 121.5654, 'tw'], ['Seoul', 37.5665, 126.9780, 'kr'], ['Pjöngjang', 39.0392, 125.7625, 'kp'], ['Tokio', 35.6762, 139.6503, 'jp'],
    ['Ulaanbaatar', 47.8864, 106.9057, 'mn'], ['Astana', 51.1694, 71.4491, 'kz'], ['Taschkent', 41.2995, 69.2401, 'uz'], ['Bischkek', 42.8746, 74.5698, 'kg'], ['Duschanbe', 38.5598, 68.7870, 'tj'],
    ['Aschgabat', 37.9601, 58.3261, 'tm'], ['Naypyidaw', 19.7633, 96.0785, 'mm'], ['Thimphu', 27.4728, 89.6390, 'bt'], ['Malé', 4.1755, 73.5093, 'mv'],
    ['Canberra', -35.2809, 149.1300, 'au'], ['Wellington', -41.2865, 174.7762, 'nz'], ['Suva', -18.1416, 178.4419, 'fj'], ['Port Moresby', -9.4438, 147.1803, 'pg'],
  ];
  const STADIUMS = [
    ['Camp Nou, Barcelona', 41.3809, 2.1228, 'es'], ['Santiago Bernabéu, Madrid', 40.4531, -3.6883, 'es'], ['Allianz Arena, München', 48.2188, 11.6247, 'de'], ['Signal Iduna Park, Dortmund', 51.4926, 7.4519, 'de'],
    ['Veltins-Arena, Gelsenkirchen', 51.5546, 7.0676, 'de'], ['MSV-Arena, Duisburg', 51.4092, 6.7795, 'de'], ['Olympiastadion Berlin', 52.5147, 13.2395, 'de'], ['RheinEnergieStadion, Köln', 50.9334, 6.8752, 'de'],
    ['Merkur Spiel-Arena, Düsseldorf', 51.2617, 6.7331, 'de'], ['Volksparkstadion, Hamburg', 53.5872, 9.8986, 'de'], ['MHPArena, Stuttgart', 48.7922, 9.2320, 'de'], ['Old Trafford, Manchester', 53.4631, -2.2913, 'gb'],
    ['Anfield, Liverpool', 53.4308, -2.9608, 'gb'], ['Wembley, London', 51.5560, -0.2796, 'gb'], ['Emirates Stadium, London', 51.5549, -0.1084, 'gb'], ['Celtic Park, Glasgow', 55.8497, -4.2055, 'gb'],
    ['San Siro, Mailand', 45.4781, 9.1240, 'it'], ['Stadio Olimpico, Rom', 41.9339, 12.4547, 'it'], ['Parc des Princes, Paris', 48.8414, 2.2530, 'fr'], ['Stade de France', 48.9245, 2.3602, 'fr'],
    ['Johan Cruijff ArenA, Amsterdam', 52.3144, 4.9418, 'nl'], ['Estádio da Luz, Lissabon', 38.7527, -9.1847, 'pt'], ['Atatürk-Olympiastadion, Istanbul', 41.0742, 28.7656, 'tr'], ['Luschniki, Moskau', 55.7158, 37.5537, 'ru'],
    ['Maracanã, Rio de Janeiro', -22.9122, -43.2302, 'br'], ['La Bombonera, Buenos Aires', -34.6356, -58.3647, 'ar'], ['Estadio Azteca, Mexiko-Stadt', 19.3029, -99.1505, 'mx'], ['MetLife Stadium, New York', 40.8135, -74.0745, 'us'],
    ['AT&T Stadium, Dallas', 32.7473, -97.0945, 'us'], ['Rose Bowl, Pasadena', 34.1613, -118.1676, 'us'], ['Lusail-Stadion, Katar', 25.4207, 51.4904, 'qa'], ['FNB Stadium, Johannesburg', -26.2347, 27.9822, 'za'],
    ['Melbourne Cricket Ground', -37.8200, 144.9834, 'au'], ['Vogelnest, Peking', 39.9929, 116.3965, 'cn'], ['Nationalstadion, Tokio', 35.6779, 139.7147, 'jp'],
  ];
  const AIRPORTS = [
    ['Flughafen Frankfurt', 50.0379, 8.5622, 'de'], ['Flughafen München', 48.3538, 11.7861, 'de'], ['Flughafen Düsseldorf', 51.2895, 6.7668, 'de'], ['Flughafen BER', 52.3667, 13.5033, 'de'],
    ['Flughafen Dortmund', 51.5183, 7.6122, 'de'], ['London Heathrow', 51.4700, -0.4543, 'gb'], ['Paris Charles de Gaulle', 49.0097, 2.5479, 'fr'], ['Amsterdam Schiphol', 52.3105, 4.7683, 'nl'],
    ['Madrid Barajas', 40.4983, -3.5676, 'es'], ['Istanbul', 41.2753, 28.7519, 'tr'], ['Dubai International', 25.2532, 55.3657, 'ae'], ['Doha Hamad', 25.2731, 51.6081, 'qa'],
    ['New York JFK', 40.6413, -73.7781, 'us'], ['Los Angeles LAX', 33.9416, -118.4085, 'us'], ['Atlanta', 33.6407, -84.4277, 'us'], ['Tokio Haneda', 35.5494, 139.7798, 'jp'],
    ['Singapur Changi', 1.3644, 103.9915, 'sg'], ['Peking Daxing', 39.5098, 116.4105, 'cn'], ['Sydney', -33.9399, 151.1753, 'au'], ['Gibraltar', 36.1512, -5.3470, 'gi'],
    ['Courchevel (Altiport)', 45.3967, 6.6347, 'fr'], ['Lukla (Everest)', 27.6878, 86.7314, 'np'], ['Maho Beach, Sint Maarten', 18.0410, -63.1089, 'sx'], ['Barra (Strandpiste)', 57.0228, -7.4431, 'gb'],
    ['Weeze', 51.6024, 6.1422, 'de'],
  ];
  const NATURE = [
    ['Grand Canyon', 36.0566, -112.1251, 'us'], ['Uluru', -25.3444, 131.0369, 'au'], ['Niagarafälle', 43.0799, -79.0747, 'ca'], ['Victoriafälle', -17.9243, 25.8572, 'zw'],
    ['Iguazú-Wasserfälle', -25.6953, -54.4367, 'ar'], ['Matterhorn', 45.9763, 7.6586, 'ch'], ['Mount Everest', 27.9881, 86.9250, 'np'], ['Kilimandscharo', -3.0674, 37.3556, 'tz'],
    ['Halong-Bucht', 20.9101, 107.1839, 'vn'], ['Geirangerfjord', 62.1008, 7.2059, 'no'], ['Erg Chebbi (Sahara)', 31.1450, -3.9690, 'ma'], ['Death Valley', 36.5054, -117.0794, 'us'],
    ['Grand Prismatic Spring', 44.5251, -110.8382, 'us'], ['Salar de Uyuni', -20.1338, -67.4891, 'bo'], ['Atacama-Wüste', -23.8634, -69.1328, 'cl'], ['Fuji', 35.3606, 138.7274, 'jp'],
    ['Vesuv', 40.8214, 14.4260, 'it'], ['Ätna', 37.7510, 14.9934, 'it'], ['Eyjafjallajökull', 63.6314, -19.6083, 'is'], ['Bleder See', 46.3636, 14.0938, 'si'],
    ['Plitvicer Seen', 44.8654, 15.5820, 'hr'], ['Kappadokien', 38.6431, 34.8289, 'tr'], ['Pamukkale', 37.9137, 29.1187, 'tr'], ['Zhangjiajie', 29.3150, 110.4343, 'cn'],
    ['Tafelberg', -33.9628, 18.4098, 'za'], ['Sossusvlei', -24.7333, 15.2833, 'na'], ['Torres del Paine', -50.9423, -73.4068, 'cl'], ['Perito-Moreno-Gletscher', -50.4967, -73.1377, 'ar'],
    ['Moraine Lake', 51.3217, -116.1860, 'ca'], ['Monument Valley', 36.9980, -110.0985, 'us'], ['Zugspitze', 47.4211, 10.9853, 'de'], ['Bastei, Sächsische Schweiz', 50.9620, 14.0730, 'de'],
    ['Loreley', 50.1393, 7.7290, 'de'],
  ];

  const pickCC = (list) => WORLD.filter((x) => list.includes(x[3]));
  const AMERICAS = 'us ca mx cu pa co pe ec cl ar br uy bo ve jm cr'.split(' ');
  const ASIA = 'ae qa sa il jo lb ir az ge am af uz kz in np lk bd pk th vn kh my sg id ph cn tw kr jp mn kp mv tr'.split(' ');
  const AFRICA = 'eg ma tn dz ng gh sn ke et za tz rw na mg ao cd ug'.split(' ');
  // jitter: zufälliger Versatz um den Ausgangsort in km (echte GeoGuessr-Spots statt nur Wahrzeichen)
  // scale: wie schnell die Punkte mit der Entfernung fallen (km)
  const SETS = {
    world: { name: 'Welt', desc: 'Überall auf der Welt, zufällige Straßen rund um 192 Orte', list: WORLD, jitter: 30, scale: 1500, zoom: 2, center: [20, 10], countries: true },
    famous: { name: 'Berühmte Orte', desc: 'Genau an Wahrzeichen: Eiffelturm, Pyramiden, Times Square …', list: WORLD, jitter: 0, scale: 1500, zoom: 2, center: [20, 10], countries: true },
    europe: { name: 'Europa', desc: 'Kreuz und quer durch Europa', list: WORLD.filter((x) => EUROPE_CC.includes(x[3])), jitter: 25, scale: 500, zoom: 4, center: [52, 12], countries: true },
    americas: { name: 'Amerika', desc: 'Von Alaska bis Feuerland', list: pickCC(AMERICAS), jitter: 30, scale: 1200, zoom: 2, center: [10, -80], countries: true },
    asia: { name: 'Asien', desc: 'Naher Osten bis Japan', list: pickCC(ASIA), jitter: 30, scale: 1200, zoom: 3, center: [28, 80], countries: true },
    africa: { name: 'Afrika', desc: 'Von Kairo bis Kapstadt', list: pickCC(AFRICA), jitter: 30, scale: 1000, zoom: 3, center: [3, 20], countries: true },
    de: { name: 'Deutschland', desc: 'Von Sylt bis zur Zugspitze', list: DE, jitter: 12, scale: 120, zoom: 6, center: [51.1, 10.4] },
    ruhr: { name: 'Duisburg & Ruhrpott', desc: 'Zechen, Häfen, Stadien, Hinterhöfe', list: RUHR, jitter: 1.5, scale: 6, zoom: 10, center: [51.47, 6.95] },
    capitals: { name: 'Hauptstädte', desc: 'Jede Hauptstadt der Welt', list: CAPITALS, jitter: 4, scale: 1500, zoom: 2, center: [20, 10], countries: true },
    stadiums: { name: 'Fußballstadien', desc: 'Von oben erkennt man sie sofort – oder?', list: STADIUMS, jitter: 0, scale: 1500, zoom: 2, center: [35, 5], countries: true },
    airports: { name: 'Flughäfen', desc: 'Startbahnen, Terminals und ein paar sehr gefährliche Pisten', list: AIRPORTS, jitter: 0, scale: 1500, zoom: 2, center: [35, 5], countries: true },
    nature: { name: 'Naturwunder', desc: 'Wüsten, Gletscher, Vulkane, Wasserfälle', list: NATURE, jitter: 0, scale: 1500, zoom: 2, center: [20, 10], countries: true },
    hohe: { name: 'Hohenlohe', desc: 'Öhringen, Künzelsau und jedes Dorf dazwischen', list: HOHENLOHE, jitter: 2.5, scale: 8, zoom: 10, center: [49.24, 9.6] },
  };
  // Mini-Länder: nie verschieben, sonst landet man im Nachbarland
  const TINY = ['gi', 'sx', 'ad', 'li', 'sm', 'va', 'mc', 'lu', 'sg', 'mt', 'mv', 'qa', 'lb', 'il', 'jm', 'cr', 'pa', 'rw', 'sv'];

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
    mv: 'Malediven', gi: 'Gibraltar', sx: 'Sint Maarten', hk: 'Hongkong', au: 'Australien', nz: 'Neuseeland', fj: 'Fidschi', pg: 'Papua-Neuguinea',
  };

  const GEO = { SETS, COUNTRIES, TINY, CAPITALS };
  if (typeof module !== 'undefined' && module.exports) module.exports = GEO;
  else root.DULI_GEO_DATA = GEO;
})(typeof window !== 'undefined' ? window : globalThis);
