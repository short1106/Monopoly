// LARP EXTREME – feste Spielwelt: Regeln und Richtwerte (Stand 2026, gerundet, ohne Gewähr).
// Abi-Regeln vereinfacht nach NRW und Baden-Württemberg, Termine 2027 angelehnt an die üblichen Zeiträume.
(function (root) {
  // ---------- Bundesländer ----------
  const STATES = {
    NW: { name: 'Nordrhein-Westfalen', grest: 6.5 }, BW: { name: 'Baden-Württemberg', grest: 5.0 }, BY: { name: 'Bayern', grest: 3.5 },
    BE: { name: 'Berlin', grest: 6.0 }, BB: { name: 'Brandenburg', grest: 6.5 }, HB: { name: 'Bremen', grest: 5.5 }, HH: { name: 'Hamburg', grest: 5.5 },
    HE: { name: 'Hessen', grest: 6.0 }, MV: { name: 'Mecklenburg-Vorpommern', grest: 6.0 }, NI: { name: 'Niedersachsen', grest: 5.0 },
    RP: { name: 'Rheinland-Pfalz', grest: 5.0 }, SL: { name: 'Saarland', grest: 6.5 }, SN: { name: 'Sachsen', grest: 5.5 },
    ST: { name: 'Sachsen-Anhalt', grest: 5.0 }, SH: { name: 'Schleswig-Holstein', grest: 6.5 }, TH: { name: 'Thüringen', grest: 5.0 },
  };

  // ---------- Abitur ----------
  // f = Aufgabenfeld: 1 sprachlich-künstlerisch, 2 gesellschaftswissenschaftlich, 3 Mathe/Naturwissenschaft, 0 Sport
  const SUBJECTS = {
    de: { name: 'Deutsch', f: 1, core: 'de' }, en: { name: 'Englisch', f: 1, core: 'fs' }, fr: { name: 'Französisch', f: 1, core: 'fs' },
    es: { name: 'Spanisch', f: 1, core: 'fs' }, la: { name: 'Latein', f: 1, core: 'fs' }, ku: { name: 'Kunst', f: 1 }, mu: { name: 'Musik', f: 1 },
    ge: { name: 'Geschichte', f: 2 }, ek: { name: 'Erdkunde', f: 2 }, sw: { name: 'Sozialwissenschaften', f: 2, only: 'NW' }, gk: { name: 'Gemeinschaftskunde', f: 2, only: 'BW' },
    wi: { name: 'Wirtschaft', f: 2, only: 'BW' }, pl: { name: 'Philosophie', f: 2, only: 'NW' }, pa: { name: 'Pädagogik', f: 2, only: 'NW' }, re: { name: 'Religion', f: 2, rel: true }, et: { name: 'Ethik', f: 2, only: 'BW', rel: true },
    ma: { name: 'Mathematik', f: 3, core: 'ma' }, bi: { name: 'Biologie', f: 3, nw: true }, ch: { name: 'Chemie', f: 3, nw: true }, ph: { name: 'Physik', f: 3, nw: true }, if: { name: 'Informatik', f: 3 },
    sp: { name: 'Sport', f: 0 },
  };
  const ABI = {
    NW: {
      label: 'NRW: 2 Leistungskurse und 2 Grundkurse. Fach 1–3 schriftlich, Fach 4 mündlich.',
      lk: 2, written: 3, oral: 1, factor: 5, blockI: 600,
      // Prüfungsdaten 2027 (angelehnt an den üblichen Zeitraum nach den Osterferien)
      written: { de: 14, en: 16, ma: 20, bi: 22, sp: 22, ge: 23, la: 23, sw: 26, pa: 26, ch: 27, ph: 27, ek: 28, mu: 28, fr: 29, es: 29, ku: 30, if: 30, pl: 30, re: 30 },
      writtenMonth: 3, retakeMonth: 4, retakeDay: 18, oralMonth: 4, oralDay: 26, extraMonth: 5, extraDay: 8, endMonth: 5, endDay: 26,
      check(sel) {
        const all = [...sel.lk, ...sel.gk];
        if (sel.lk.length !== 2 || sel.gk.length !== 2) return 'Wähle 2 Leistungskurse und 2 Grundkurse.';
        if (new Set(all).size !== 4) return 'Jedes Fach nur einmal.';
        if (!['de', 'ma', 'fs', 'nw'].some((k) => k === SUBJECTS[sel.lk[0]].core || (k === 'nw' && SUBJECTS[sel.lk[0]].nw))) return 'Der 1. Leistungskurs muss Deutsch, Mathe, eine Fremdsprache oder eine Naturwissenschaft sein.';
        if (all.filter((k) => ['de', 'ma', 'fs'].includes(SUBJECTS[k].core)).length < 2) return 'Unter den 4 Abifächern müssen zwei aus Deutsch, Mathe und Fremdsprache sein.';
        const f = new Set(all.map((k) => SUBJECTS[k].f));
        if (!f.has(1) || !f.has(3) || !(f.has(2) || all.some((k) => SUBJECTS[k].rel))) return 'Alle drei Aufgabenfelder (Sprachen/Kunst, Gesellschaft, Mathe/Naturwissenschaft) müssen abgedeckt sein.';
        if (all.filter((k) => k === 'sp').length && sel.gk.includes('sp')) return 'Sport geht nur als Leistungskurs.';
        return null;
      },
    },
    BW: {
      label: 'Baden-Württemberg: 3 Leistungsfächer schriftlich, 2 Basisfächer mündlich. Deutsch und Mathe müssen dabei sein, dazu eine Fremdsprache.',
      lk: 3, written: 3, oral: 2, factor: 4, blockI: 600,
      written: { de: 21, ma: 23, en: 27, fr: 28, es: 28, la: 28, bi: 29, ch: 30, ph: 30, ge: 4, gk: 4, ek: 5, wi: 5, if: 6, ku: 6, mu: 6, sp: 7, re: 7, et: 7 },
      writtenMonth: 3, writtenLate: 4, retakeMonth: 4, retakeDay: 18, oralMonth: 5, oralDay: 24, extraMonth: 5, extraDay: 30, endMonth: 6, endDay: 3,
      check(sel) {
        const all = [...sel.lk, ...sel.gk];
        if (sel.lk.length !== 3 || sel.gk.length !== 2) return 'Wähle 3 Leistungsfächer (schriftlich) und 2 mündliche Prüfungsfächer.';
        if (new Set(all).size !== 5) return 'Jedes Fach nur einmal.';
        if (!all.includes('de') || !all.includes('ma')) return 'Deutsch und Mathe müssen unter deinen 5 Prüfungsfächern sein.';
        if (!all.some((k) => SUBJECTS[k].core === 'fs')) return 'Eine Fremdsprache muss Prüfungsfach sein.';
        if (!sel.lk.some((k) => ['de', 'ma', 'fs'].includes(SUBJECTS[k].core) || SUBJECTS[k].nw)) return 'Mindestens ein Leistungsfach aus Deutsch, Mathe, Fremdsprache oder Naturwissenschaft.';
        return null;
      },
    },
  };
  // Punkte 300–900 → Abiturnote (KMK-Formel)
  const abiNote = (pts) => Math.max(1.0, Math.min(4.0, Math.floor((17 / 3 - pts / 180) * 10) / 10));
  const pointsToGrade = (p) => (p >= 13 ? 1 : p >= 10 ? 2 : p >= 7 ? 3 : p >= 4 ? 4 : p >= 1 ? 5 : 6);

  // ---------- Führerschein Klasse B (Richtwerte 2026) ----------
  const LICENSE = {
    fees: {
      base: { name: 'Grundbetrag Fahrschule (Theorieunterricht, Anmeldung)', eur: 420, school: true },
      lesson: { name: 'Fahrstunde (45 Minuten)', eur: 68, school: true },
      special: { name: 'Sonderfahrt (Überland, Autobahn, Nacht)', eur: 84, school: true },
      theoryShow: { name: 'Vorstellung zur Theorieprüfung', eur: 95, school: true },
      practicalShow: { name: 'Vorstellung zur Praxisprüfung', eur: 240, school: true },
      tuvTheory: { name: 'TÜV-Gebühr Theorieprüfung', eur: 26 },
      tuvPractical: { name: 'TÜV-Gebühr Praxisprüfung', eur: 131 },
      application: { name: 'Antrag Führerscheinstelle', eur: 44 },
      eye: { name: 'Sehtest', eur: 7 },
      firstAid: { name: 'Erste-Hilfe-Kurs', eur: 59 },
      photo: { name: 'Biometrisches Passfoto', eur: 15 },
      app: { name: 'Lern-App für die Theorie', eur: 20 },
    },
    theoryLessons: 14, specials: 12, recommendLessons: 26,
    schools: [
      { id: 'fs-ruhr', name: 'Fahrschule Ruhrpott Drive', city: 'Duisburg', mult: 0.95 },
      { id: 'fs-city', name: 'City-Fahrschule', city: '', mult: 1.0 },
      { id: 'fs-hohenlohe', name: 'Fahrschule Hohenlohe Mobil', city: 'Öhringen', mult: 1.04 },
      { id: 'fs-turbo', name: 'Turbo-Führerschein (Ferienkurs, 3 Wochen)', city: '', mult: 1.25, crash: true },
    ],
  };

  // ---------- Autos (Neupreis-Richtwerte 2026, Basisversion) ----------
  // [Marke, Modell, Klasse, Neupreis €, PS, Antrieb (B Benzin, D Diesel, E Elektro, H Hybrid), Verbrauch l/100 km oder kWh/100 km, Typklasse 1–5]
  const CARS = [
    ['Dacia', 'Sandero', 'Kleinwagen', 15800, 90, 'B', 5.4, 2], ['Dacia', 'Duster', 'SUV', 21000, 100, 'B', 6.0, 2], ['Dacia', 'Spring', 'Kleinstwagen', 17900, 65, 'E', 14.5, 1],
    ['Fiat', 'Panda', 'Kleinstwagen', 15900, 70, 'H', 5.1, 2], ['Fiat', '500', 'Kleinstwagen', 18900, 70, 'H', 5.0, 2], ['Kia', 'Picanto', 'Kleinstwagen', 15400, 63, 'B', 4.9, 1],
    ['Hyundai', 'i10', 'Kleinstwagen', 15700, 63, 'B', 5.0, 1], ['Hyundai', 'i20', 'Kleinwagen', 20900, 79, 'B', 5.3, 2], ['Hyundai', 'Tucson', 'SUV', 36500, 160, 'H', 6.2, 3],
    ['Hyundai', 'Ioniq 5', 'Elektro-SUV', 44900, 170, 'E', 17.0, 3], ['Kia', 'Ceed', 'Kompakt', 26500, 100, 'B', 5.9, 2], ['Kia', 'Sportage', 'SUV', 34900, 150, 'H', 6.4, 3], ['Kia', 'EV3', 'Elektro-SUV', 36000, 204, 'E', 15.0, 3],
    ['VW', 'Polo', 'Kleinwagen', 21000, 80, 'B', 5.2, 2], ['VW', 'Golf', 'Kompakt', 29500, 116, 'B', 5.6, 3], ['VW', 'Golf GTI', 'Sportlich', 43500, 265, 'B', 7.2, 5],
    ['VW', 'T-Roc', 'SUV', 30000, 116, 'B', 6.1, 3], ['VW', 'Tiguan', 'SUV', 40000, 150, 'B', 6.8, 3], ['VW', 'Passat Variant', 'Mittelklasse', 42000, 150, 'D', 5.0, 3],
    ['VW', 'ID.3', 'Elektro', 36900, 170, 'E', 15.5, 3], ['VW', 'ID.4', 'Elektro-SUV', 42000, 204, 'E', 17.0, 3], ['VW', 'ID. Buzz', 'Elektro-Van', 59000, 286, 'E', 21.0, 4],
    ['VW', 'Up!', 'Kleinstwagen', 15500, 65, 'B', 4.9, 1], ['Skoda', 'Fabia', 'Kleinwagen', 19800, 80, 'B', 5.1, 2], ['Skoda', 'Octavia Combi', 'Kompakt', 33000, 116, 'B', 5.6, 2],
    ['Skoda', 'Kodiaq', 'SUV', 45000, 150, 'B', 7.0, 3], ['Skoda', 'Enyaq', 'Elektro-SUV', 45000, 204, 'E', 16.5, 3], ['Seat', 'Ibiza', 'Kleinwagen', 19500, 80, 'B', 5.3, 2],
    ['Seat', 'Leon', 'Kompakt', 27500, 115, 'B', 5.7, 3], ['Cupra', 'Formentor', 'Sportlich', 38000, 150, 'B', 6.7, 4], ['Cupra', 'Born', 'Elektro', 37000, 204, 'E', 15.6, 3],
    ['Opel', 'Corsa', 'Kleinwagen', 20500, 75, 'B', 5.4, 2], ['Opel', 'Astra', 'Kompakt', 28500, 110, 'B', 5.6, 2], ['Opel', 'Mokka', 'SUV', 27500, 100, 'B', 5.9, 2],
    ['Ford', 'Puma', 'SUV', 28000, 125, 'H', 5.6, 3], ['Ford', 'Kuga', 'SUV', 37000, 186, 'H', 5.8, 3], ['Ford', 'Mustang', 'Sportwagen', 58000, 446, 'B', 12.0, 5],
    ['Ford', 'Mustang Mach-E', 'Elektro-SUV', 52000, 269, 'E', 17.5, 4], ['Renault', 'Clio', 'Kleinwagen', 19500, 90, 'B', 5.2, 2], ['Renault', 'Megane E-Tech', 'Elektro', 39000, 220, 'E', 16.0, 3],
    ['Renault', 'Captur', 'SUV', 25000, 90, 'B', 5.8, 2], ['Renault', '5 E-Tech', 'Elektro', 32900, 150, 'E', 14.9, 2], ['Peugeot', '208', 'Kleinwagen', 21500, 75, 'B', 5.3, 2],
    ['Peugeot', '2008', 'SUV', 27000, 100, 'B', 5.9, 2], ['Peugeot', '3008', 'SUV', 39000, 136, 'H', 5.6, 3], ['Citroën', 'C3', 'Kleinwagen', 17990, 100, 'B', 5.4, 2],
    ['Citroën', 'ë-C3', 'Elektro', 23300, 113, 'E', 17.0, 2], ['Toyota', 'Aygo X', 'Kleinstwagen', 18500, 72, 'B', 4.9, 1], ['Toyota', 'Yaris', 'Kleinwagen', 23500, 116, 'H', 3.9, 2],
    ['Toyota', 'Corolla', 'Kompakt', 31500, 140, 'H', 4.4, 3], ['Toyota', 'C-HR', 'SUV', 36500, 140, 'H', 4.8, 3], ['Toyota', 'RAV4', 'SUV', 42000, 218, 'H', 5.7, 3],
    ['Toyota', 'GR86', 'Sportwagen', 38000, 234, 'B', 8.9, 5], ['Toyota', 'Supra', 'Sportwagen', 64000, 340, 'B', 8.5, 5], ['Mazda', 'MX-5', 'Roadster', 33500, 132, 'B', 6.3, 4],
    ['Mazda', 'CX-30', 'SUV', 30500, 140, 'B', 6.0, 3], ['Honda', 'Jazz', 'Kleinwagen', 24500, 122, 'H', 4.5, 2], ['Honda', 'Civic Type R', 'Sportlich', 55000, 329, 'B', 9.0, 5],
    ['Nissan', 'Qashqai', 'SUV', 33000, 140, 'B', 6.2, 3], ['Nissan', 'Micra', 'Kleinwagen', 18900, 92, 'B', 5.2, 2], ['Suzuki', 'Swift', 'Kleinwagen', 18700, 82, 'H', 4.4, 2],
    ['Suzuki', 'Jimny', 'Geländewagen', 30000, 102, 'B', 7.9, 3], ['MG', 'MG4', 'Elektro', 32000, 170, 'E', 16.0, 3], ['MG', 'ZS', 'SUV', 22000, 106, 'B', 6.4, 2],
    ['BYD', 'Dolphin', 'Elektro', 33000, 204, 'E', 15.9, 3], ['BYD', 'Seal', 'Elektro', 45000, 313, 'E', 16.6, 4], ['Tesla', 'Model 3', 'Elektro', 41000, 283, 'E', 13.2, 4],
    ['Tesla', 'Model Y', 'Elektro-SUV', 45000, 299, 'E', 15.0, 4], ['Tesla', 'Model S', 'Elektro-Luxus', 95000, 670, 'E', 18.0, 5], ['Polestar', '2', 'Elektro', 50000, 272, 'E', 16.5, 4],
    ['Mini', 'Cooper', 'Kleinwagen', 28500, 156, 'B', 5.9, 3], ['Mini', 'Cooper E', 'Elektro', 32900, 184, 'E', 14.5, 3], ['BMW', '1er', 'Kompakt', 38000, 156, 'B', 5.9, 3],
    ['BMW', '3er', 'Mittelklasse', 50000, 184, 'B', 6.4, 4], ['BMW', 'M3', 'Sportlich', 95000, 510, 'B', 10.2, 5], ['BMW', '5er', 'Oberklasse', 64000, 208, 'D', 5.2, 4],
    ['BMW', 'X1', 'SUV', 45000, 170, 'B', 6.8, 4], ['BMW', 'X5', 'SUV', 85000, 381, 'B', 9.0, 5], ['BMW', 'i4', 'Elektro', 58000, 340, 'E', 16.0, 4], ['BMW', 'M4 Competition', 'Sportwagen', 101000, 530, 'B', 10.0, 5],
    ['Mercedes', 'A-Klasse', 'Kompakt', 38000, 163, 'B', 6.2, 3], ['Mercedes', 'C-Klasse', 'Mittelklasse', 52000, 204, 'B', 6.8, 4], ['Mercedes', 'E-Klasse', 'Oberklasse', 65000, 204, 'D', 5.4, 4],
    ['Mercedes', 'S-Klasse', 'Luxus', 120000, 367, 'H', 8.0, 5], ['Mercedes', 'G-Klasse', 'Geländewagen', 140000, 449, 'B', 12.5, 5], ['Mercedes', 'AMG GT', 'Sportwagen', 155000, 585, 'B', 13.0, 5],
    ['Mercedes', 'EQA', 'Elektro-SUV', 50000, 190, 'E', 17.0, 4], ['Audi', 'A1', 'Kleinwagen', 27000, 110, 'B', 5.6, 3], ['Audi', 'A3', 'Kompakt', 36000, 116, 'B', 5.8, 3],
    ['Audi', 'A4 Avant', 'Mittelklasse', 50000, 204, 'D', 5.2, 4], ['Audi', 'RS6 Avant', 'Sportlich', 135000, 630, 'B', 12.2, 5], ['Audi', 'Q3', 'SUV', 42000, 150, 'B', 7.0, 4],
    ['Audi', 'Q4 e-tron', 'Elektro-SUV', 52000, 286, 'E', 16.8, 4], ['Audi', 'R8', 'Supersportwagen', 200000, 620, 'B', 13.5, 5], ['Porsche', 'Macan Electric', 'Elektro-SUV', 85000, 360, 'E', 18.0, 5],
    ['Porsche', '911 Carrera', 'Sportwagen', 125000, 394, 'B', 10.5, 5], ['Porsche', 'Taycan', 'Elektro-Sportwagen', 101000, 408, 'E', 19.5, 5], ['Lamborghini', 'Urus', 'Supersportwagen', 245000, 666, 'B', 14.5, 5],
    ['Ferrari', 'Roma', 'Supersportwagen', 240000, 620, 'B', 11.5, 5], ['Rolls-Royce', 'Cullinan', 'Luxus', 380000, 571, 'B', 15.0, 5], ['Volvo', 'XC40', 'SUV', 42000, 163, 'H', 7.0, 3],
    ['Volvo', 'EX30', 'Elektro-SUV', 37000, 272, 'E', 16.0, 3], ['Land Rover', 'Defender', 'Geländewagen', 75000, 300, 'D', 9.5, 4], ['Jeep', 'Wrangler', 'Geländewagen', 66000, 272, 'B', 11.0, 4],
    ['Smart', '#1', 'Elektro-SUV', 38000, 272, 'E', 16.8, 3], ['Lada', 'Niva', 'Geländewagen', 21000, 83, 'B', 10.0, 3], ['Alfa Romeo', 'Giulia', 'Mittelklasse', 50000, 280, 'B', 7.3, 4],
    ['VW', 'Multivan', 'Van', 60000, 218, 'H', 6.8, 3], ['VW', 'Crafter (Transporter)', 'Transporter', 45000, 140, 'D', 9.5, 3], ['Ford', 'Transit Custom', 'Transporter', 42000, 136, 'D', 8.0, 3],
  ];

  // ---------- Studium ----------
  // [Studiengang, Fach-Gruppe, NC-Richtwert (0 = zulassungsfrei), Regelstudienzeit Semester, Hochschularten, Einstiegsgehalt brutto/Jahr]
  const STUDIES = [
    ['Medizin', 'Medizin', 1.0, 12, 'uni', 68000], ['Zahnmedizin', 'Medizin', 1.1, 10, 'uni', 55000], ['Pharmazie', 'Medizin', 1.6, 8, 'uni', 50000], ['Tiermedizin', 'Medizin', 1.2, 11, 'uni', 42000],
    ['Psychologie', 'Gesellschaft', 1.3, 6, 'uni', 46000], ['Rechtswissenschaft (Staatsexamen)', 'Recht', 2.0, 10, 'uni', 60000], ['Wirtschaftsrecht', 'Recht', 2.4, 7, 'fh', 48000],
    ['Betriebswirtschaftslehre', 'Wirtschaft', 2.4, 6, 'uni fh privat', 48000], ['Volkswirtschaftslehre', 'Wirtschaft', 2.3, 6, 'uni', 50000], ['International Management', 'Wirtschaft', 2.6, 7, 'fh privat', 47000],
    ['Wirtschaftsinformatik', 'Informatik', 2.6, 6, 'uni fh', 54000], ['Informatik', 'Informatik', 0, 6, 'uni fh', 56000], ['Data Science', 'Informatik', 2.2, 6, 'uni fh', 58000],
    ['Künstliche Intelligenz', 'Informatik', 2.0, 6, 'uni fh', 60000], ['Medieninformatik', 'Informatik', 2.5, 7, 'fh', 50000], ['Game Design', 'Medien', 2.4, 7, 'fh privat kunst', 42000],
    ['Cybersecurity', 'Informatik', 2.3, 7, 'fh', 57000], ['Maschinenbau', 'Ingenieur', 0, 7, 'uni fh', 55000], ['Elektrotechnik', 'Ingenieur', 0, 7, 'uni fh', 56000],
    ['Bauingenieurwesen', 'Ingenieur', 0, 7, 'uni fh', 52000], ['Wirtschaftsingenieurwesen', 'Ingenieur', 2.5, 7, 'uni fh', 57000], ['Fahrzeugtechnik', 'Ingenieur', 2.6, 7, 'fh', 55000],
    ['Luft- und Raumfahrttechnik', 'Ingenieur', 2.2, 7, 'uni', 58000], ['Architektur', 'Gestaltung', 2.3, 8, 'uni fh', 43000], ['Mechatronik', 'Ingenieur', 0, 7, 'fh', 54000],
    ['Mathematik', 'Naturwissenschaft', 0, 6, 'uni', 54000], ['Physik', 'Naturwissenschaft', 0, 6, 'uni', 53000], ['Chemie', 'Naturwissenschaft', 0, 6, 'uni', 52000],
    ['Biologie', 'Naturwissenschaft', 2.1, 6, 'uni', 42000], ['Biochemie', 'Naturwissenschaft', 1.6, 6, 'uni', 46000], ['Geographie', 'Naturwissenschaft', 2.5, 6, 'uni', 40000],
    ['Lehramt Gymnasium (Mathe/Physik)', 'Lehramt', 0, 10, 'uni', 52000], ['Lehramt Grundschule', 'Lehramt', 2.2, 10, 'uni', 48000], ['Lehramt Sport/Deutsch', 'Lehramt', 2.0, 10, 'uni', 50000],
    ['Soziale Arbeit', 'Gesellschaft', 2.4, 7, 'fh', 41000], ['Politikwissenschaft', 'Gesellschaft', 2.3, 6, 'uni', 44000], ['Soziologie', 'Gesellschaft', 2.6, 6, 'uni', 40000],
    ['Germanistik', 'Sprache', 0, 6, 'uni', 38000], ['Anglistik', 'Sprache', 0, 6, 'uni', 38000], ['Geschichte', 'Gesellschaft', 0, 6, 'uni', 38000], ['Philosophie', 'Gesellschaft', 0, 6, 'uni', 37000],
    ['Medienwissenschaft', 'Medien', 2.2, 6, 'uni', 39000], ['Journalismus', 'Medien', 2.0, 7, 'fh privat', 38000], ['Kommunikationsdesign', 'Gestaltung', 2.5, 7, 'fh kunst', 38000],
    ['Freie Kunst', 'Kunst', 0, 10, 'kunst', 28000], ['Schauspiel', 'Kunst', 0, 8, 'kunst', 30000], ['Musik (Instrumental)', 'Kunst', 0, 8, 'kunst', 32000], ['Film und Regie', 'Kunst', 0, 8, 'kunst', 34000],
    ['Sportwissenschaft', 'Gesundheit', 2.0, 6, 'uni', 38000], ['Pflege (dual)', 'Gesundheit', 0, 7, 'fh', 46000], ['Physiotherapie', 'Gesundheit', 2.4, 7, 'fh', 38000],
    ['Hebammenwissenschaft', 'Gesundheit', 1.8, 7, 'fh', 46000], ['Ernährungswissenschaft', 'Gesundheit', 2.4, 6, 'uni fh', 41000], ['Agrarwissenschaft', 'Naturwissenschaft', 2.6, 6, 'uni fh', 41000],
    ['Tourismusmanagement', 'Wirtschaft', 2.7, 7, 'fh privat', 38000], ['Sportmanagement', 'Wirtschaft', 2.6, 7, 'fh privat', 41000], ['Immobilienwirtschaft', 'Wirtschaft', 2.6, 7, 'fh', 50000],
    ['Polizeivollzugsdienst (Kommissarsanwärter)', 'Verwaltung', 2.8, 6, 'spezial', 46000], ['Öffentliche Verwaltung', 'Verwaltung', 2.6, 6, 'spezial fh', 45000], ['Steuerverwaltung (Finanzwirt)', 'Verwaltung', 2.7, 6, 'spezial', 46000],
    ['Duales Studium BWL', 'Wirtschaft', 2.3, 6, 'fh', 50000], ['Duales Studium Informatik', 'Informatik', 2.2, 6, 'fh', 55000], ['Duales Studium Maschinenbau', 'Ingenieur', 2.4, 6, 'fh', 54000],
  ];
  const SEMESTER_FEE = { NW: 330, BW: 190, BY: 150, BE: 330, HH: 340, HE: 310, NI: 410, SN: 290, def: 300 };
  const PRIVATE_FEE = 720; // Studiengebühr pro Monat an Privathochschulen

  // ---------- Ausbildung (tarifliche Vergütung pro Monat in den Lehrjahren, Richtwerte 2025/26) ----------
  // [Beruf, Bereich, Jahre, Vergütung Jahr 1/2/3, nötiger Abschluss (h Hauptschule, r Realschule, a Abi), Gehalt danach brutto/Monat]
  const TRAINING = [
    ['Kfz-Mechatroniker:in', 'Handwerk', 3.5, [1000, 1070, 1160], 'h', 3000], ['Elektroniker:in', 'Handwerk', 3.5, [1050, 1120, 1200], 'r', 3200], ['Anlagenmechaniker:in SHK', 'Handwerk', 3.5, [1000, 1070, 1150], 'h', 3100],
    ['Tischler:in', 'Handwerk', 3, [900, 990, 1090], 'h', 2800], ['Maurer:in', 'Bau', 3, [1080, 1330, 1580], 'h', 3200], ['Dachdecker:in', 'Bau', 3, [1000, 1150, 1400], 'h', 3100],
    ['Friseur:in', 'Handwerk', 3, [780, 880, 980], 'h', 2300], ['Bäcker:in', 'Lebensmittel', 3, [960, 1060, 1180], 'h', 2500], ['Koch/Köchin', 'Gastro', 3, [1000, 1090, 1180], 'h', 2600],
    ['Hotelfachmann/-frau', 'Gastro', 3, [1000, 1090, 1180], 'r', 2500], ['Fachkraft für Lagerlogistik', 'Logistik', 3, [1060, 1140, 1230], 'h', 2800], ['Berufskraftfahrer:in', 'Logistik', 3, [1050, 1130, 1220], 'h', 3000],
    ['Industriekaufmann/-frau', 'Büro', 3, [1150, 1230, 1320], 'r', 3300], ['Kaufmann/-frau für Büromanagement', 'Büro', 3, [1100, 1170, 1260], 'r', 2900], ['Bankkaufmann/-frau', 'Finanzen', 2.5, [1280, 1340, 1400], 'a', 3500],
    ['Kaufmann/-frau für Versicherungen und Finanzanlagen', 'Finanzen', 3, [1300, 1400, 1510], 'a', 3500], ['Steuerfachangestellte:r', 'Finanzen', 3, [1000, 1100, 1200], 'r', 3000], ['Immobilienkaufmann/-frau', 'Büro', 3, [1150, 1250, 1350], 'a', 3300],
    ['Kaufmann/-frau im Einzelhandel', 'Handel', 3, [1100, 1180, 1340], 'h', 2700], ['Verkäufer:in', 'Handel', 2, [1100, 1180], 'h', 2400], ['Kaufmann/-frau im E-Commerce', 'Handel', 3, [1100, 1190, 1310], 'r', 3000],
    ['Fachinformatiker:in Anwendungsentwicklung', 'IT', 3, [1100, 1190, 1280], 'r', 3600], ['Fachinformatiker:in Systemintegration', 'IT', 3, [1100, 1190, 1280], 'r', 3400], ['Mediengestalter:in Digital und Print', 'Medien', 3, [1050, 1120, 1200], 'r', 2800],
    ['Industriemechaniker:in', 'Industrie', 3.5, [1200, 1250, 1330], 'r', 3500], ['Mechatroniker:in', 'Industrie', 3.5, [1200, 1260, 1340], 'r', 3600], ['Chemikant:in', 'Industrie', 3.5, [1150, 1230, 1310], 'r', 3700],
    ['Pflegefachmann/-frau', 'Gesundheit', 3, [1340, 1400, 1500], 'r', 3500], ['Medizinische:r Fachangestellte:r', 'Gesundheit', 3, [1000, 1100, 1200], 'r', 2600], ['Zahnmedizinische:r Fachangestellte:r', 'Gesundheit', 3, [1000, 1080, 1170], 'r', 2500],
    ['Notfallsanitäter:in', 'Gesundheit', 3, [1340, 1400, 1500], 'r', 3500], ['Erzieher:in (praxisintegriert)', 'Soziales', 3, [1440, 1500, 1600], 'r', 3500], ['Verwaltungsfachangestellte:r', 'Verwaltung', 3, [1290, 1340, 1390], 'r', 3100],
    ['Polizei (mittlerer Dienst, Anwärter)', 'Verwaltung', 2.5, [1450, 1450, 1450], 'r', 3200], ['Zollbeamt:in (Anwärter)', 'Verwaltung', 2, [1450, 1450], 'r', 3100], ['Bundeswehr (Feldwebel-Laufbahn)', 'Verwaltung', 3, [2100, 2200, 2300], 'r', 3400],
    ['Fluggerätmechaniker:in', 'Industrie', 3.5, [1200, 1270, 1350], 'r', 3500], ['Fachkraft für Veranstaltungstechnik', 'Medien', 3, [1000, 1080, 1170], 'r', 2900], ['Gärtner:in', 'Natur', 3, [1000, 1100, 1200], 'h', 2500],
    ['Landwirt:in', 'Natur', 3, [960, 1020, 1100], 'h', 2500], ['Tierpfleger:in', 'Natur', 3, [950, 1050, 1150], 'r', 2300], ['Fotograf:in', 'Medien', 3, [700, 800, 900], 'r', 2200],
  ];

  // ---------- Jobs (Brutto pro Monat, Vollzeit; Mindestlohn 2026: 13,90 €/Stunde) ----------
  // [Job, nötig (- nichts, r Realschule, a Abi, z Ausbildung, b Bachelor, m Master/Staatsexamen), Brutto, Stunden/Woche, Bereich]
  const JOBS = [
    ['Minijob Kasse (Supermarkt)', '-', 603, 10, 'Handel'], ['Minijob Kellner:in', '-', 603, 10, 'Gastro'], ['Minijob Nachhilfe', 'a', 603, 8, 'Bildung'], ['Minijob Lieferdienst (Fahrrad)', '-', 603, 10, 'Logistik'],
    ['Werkstudent:in Marketing', 'st', 1350, 20, 'Büro'], ['Werkstudent:in IT', 'st', 1500, 20, 'IT'], ['Werkstudent:in Forschung (Hiwi)', 'st', 1100, 18, 'Bildung'],
    ['Lagerhelfer:in', '-', 2420, 40, 'Logistik'], ['Paketzusteller:in', '-', 2600, 40, 'Logistik'], ['Produktionshelfer:in', '-', 2500, 38, 'Industrie'], ['Servicekraft Gastronomie', '-', 2410, 40, 'Gastro'],
    ['Kassierer:in Vollzeit', '-', 2450, 38, 'Handel'], ['Callcenter-Agent:in', 'r', 2500, 40, 'Büro'], ['Sicherheitsdienst', '-', 2600, 40, 'Service'], ['Fahrer:in Lieferwagen (Führerschein B)', 'fs', 2650, 40, 'Logistik'],
    ['Kfz-Mechatroniker:in (Geselle)', 'z', 3000, 39, 'Handwerk'], ['Elektriker:in (Geselle)', 'z', 3300, 39, 'Handwerk'], ['Pflegefachkraft', 'z', 3600, 39, 'Gesundheit'], ['Industriemechaniker:in', 'z', 3600, 35, 'Industrie'],
    ['Sachbearbeiter:in Buchhaltung', 'z', 3200, 40, 'Büro'], ['Bankberater:in', 'z', 3600, 39, 'Finanzen'], ['IT-Support', 'z', 3300, 40, 'IT'], ['Softwareentwickler:in (Junior)', 'z', 4000, 40, 'IT'],
    ['Junior Consultant', 'b', 4400, 45, 'Wirtschaft'], ['Marketing Manager:in', 'b', 3900, 40, 'Wirtschaft'], ['Ingenieur:in (Einstieg)', 'b', 4600, 40, 'Ingenieur'], ['Data Scientist', 'b', 4800, 40, 'IT'],
    ['Sozialarbeiter:in', 'b', 3600, 39, 'Soziales'], ['Lehrer:in (Referendariat)', 'm', 1700, 30, 'Bildung'], ['Lehrer:in (verbeamtet, A13)', 'm', 4900, 41, 'Bildung'], ['Assistenzärzt:in', 'm', 5600, 48, 'Medizin'],
    ['Rechtsanwält:in (Kanzlei)', 'm', 5200, 50, 'Recht'], ['Psychotherapeut:in (in Ausbildung)', 'm', 2400, 40, 'Gesundheit'], ['Influencer:in (Teilzeit)', '-', 0, 20, 'Medien'],
  ];

  // ---------- Wohnen: Kaufpreis Wohnung €/m² und Kaltmiete €/m² (Bestand, Richtwerte 2025/26) ----------
  const CITY_PRICES = {
    'München': [9000, 22.0], 'Frankfurt am Main': [6000, 16.5], 'Hamburg': [6000, 14.5], 'Berlin': [5500, 15.0], 'Stuttgart': [5000, 15.0], 'Düsseldorf': [4600, 12.5], 'Köln': [4800, 13.5],
    'Duisburg': [1900, 7.6], 'Oberhausen': [1900, 7.5], 'Mülheim an der Ruhr': [2600, 8.2], 'Essen': [2400, 8.5], 'Bochum': [2300, 8.3], 'Dortmund': [2700, 9.0], 'Gelsenkirchen': [1500, 7.0],
    'Moers': [2400, 8.0], 'Dinslaken': [2300, 7.8], 'Krefeld': [2200, 8.0], 'Bonn': [4200, 12.0], 'Münster': [4300, 12.5], 'Aachen': [3200, 10.5], 'Wuppertal': [2200, 8.0],
    'Öhringen': [3000, 9.5], 'Künzelsau': [2900, 9.0], 'Zweiflingen': [2600, 8.0], 'Neuenstein': [2700, 8.2], 'Pfedelbach': [2800, 8.5], 'Bretzfeld': [2800, 8.5], 'Schwäbisch Hall': [3200, 9.8],
    'Heilbronn': [3600, 11.0], 'Neckarsulm': [3700, 11.5], 'Ludwigsburg': [4400, 13.0], 'Heidelberg': [5000, 14.0], 'Mannheim': [3600, 11.5], 'Karlsruhe': [4000, 12.0], 'Tübingen': [4800, 13.5],
    'Freiburg im Breisgau': [5500, 15.5], 'Ulm': [4000, 11.5], 'Würzburg': [3800, 11.0], 'Leipzig': [2900, 8.3], 'Dresden': [3000, 8.5], 'Hannover': [3300, 10.5], 'Bremen': [2800, 9.5],
    'Nürnberg': [4300, 11.5], 'Mainz': [4400, 12.5], 'Göttingen': [3000, 10.0], 'Kiel': [3100, 10.0], 'Regensburg': [4500, 12.0], 'Augsburg': [4300, 12.0], 'Darmstadt': [4500, 13.5],
    'Marburg': [3000, 10.5], 'Gießen': [2800, 10.0], 'Jena': [3200, 10.0], 'Konstanz': [5500, 14.5], 'Kassel': [2600, 9.0], 'Erlangen': [4500, 12.0], 'Bielefeld': [2700, 8.5],
    'Paderborn': [2700, 8.5], 'Siegen': [2400, 8.0], 'Trier': [3200, 10.0], 'Magdeburg': [2000, 7.0], 'Rostock': [3200, 9.0], 'Greifswald': [2800, 8.5], 'Lüneburg': [3600, 11.0],
    'Osnabrück': [2800, 9.0], 'Oldenburg': [3200, 9.5], 'Bamberg': [3800, 10.5], 'Passau': [3300, 10.0], 'Bayreuth': [3100, 9.5], 'Potsdam': [4800, 12.5], 'Saarbrücken': [2300, 8.5],
    'Koblenz': [2900, 9.0], 'Halle (Saale)': [2100, 7.0], 'Erfurt': [2700, 8.0], 'Chemnitz': [1500, 6.0], 'Braunschweig': [3100, 9.5], 'Flensburg': [2800, 9.0], 'Ingolstadt': [4600, 12.5],
    'Reutlingen': [4000, 11.5], 'Esslingen am Neckar': [4300, 12.5], 'Pforzheim': [3200, 10.0], 'Offenburg': [3500, 10.0], 'Kempten (Allgäu)': [3800, 10.5], 'Rosenheim': [5000, 13.5], 'Landshut': [4300, 11.5],
    'Furtwangen im Schwarzwald': [2600, 8.0],
  };
  const STATE_LEVEL = { BY: 1.25, BW: 1.15, HH: 1.3, BE: 1.25, HE: 1.15, NW: 0.9, NI: 0.85, RP: 0.9, SH: 0.95, HB: 0.95, SL: 0.75, SN: 0.7, TH: 0.7, ST: 0.65, MV: 0.8, BB: 0.9 };
  function cityPrice(name, st, pop) {
    if (CITY_PRICES[name]) return { buy: CITY_PRICES[name][0], rent: CITY_PRICES[name][1] };
    const lvl = STATE_LEVEL[st] || 0.9, size = pop ? Math.min(1.5, Math.max(0.75, 0.7 + Math.log10(pop) * 0.12)) : 1;
    return { buy: Math.round(2600 * lvl * size / 50) * 50, rent: Math.round(8.6 * lvl * size * 10) / 10 };
  }

  // ---------- Steuern und Abgaben (vereinfacht, 2026) ----------
  const TAX = { freibetrag: 12348, minijob: 603, mindestlohn: 13.9, kindergeld: 255, bafoegMax: 992, sv: 0.212 };
  // Einkommensteuer-Tarif (Grundtabelle, angelehnt an §32a EStG)
  function incomeTax(zvE) {
    const x = Math.floor(zvE);
    if (x <= TAX.freibetrag) return 0;
    if (x <= 17799) { const y = (x - TAX.freibetrag) / 10000; return Math.floor((932.3 * y + 1400) * y); }
    if (x <= 69878) { const z = (x - 17799) / 10000; return Math.floor((176.64 * z + 2397) * z + 1015.13); }
    if (x <= 277825) return Math.floor(0.42 * x - 10911.92);
    return Math.floor(0.45 * x - 19246.67);
  }
  // Netto pro Monat aus Brutto pro Monat (Steuerklasse 1, kinderlos, ohne Kirche)
  function net(gross, kind) {
    if (gross <= 0) return 0;
    if (kind === 'mini' || gross <= TAX.minijob) return gross;
    const sv = gross * TAX.sv, yearTax = incomeTax(gross * 12 - 1230 - gross * 12 * 0.12);
    return Math.round(gross - sv - yearTax / 12);
  }

  // ---------- Nebenfiguren und Kontakte ----------
  const CONTACTS = {
    'opa-fahrschule': { name: 'Opas Fahrschule', kind: 'fahrschule', text: 'Opa besitzt eine Fahrschule. Für dich: Grundbetrag und Fahrstunden gratis. Freunden kannst du Rabatt anbieten.' },
    'dulidan-studios': { name: 'Dulidan Studios', kind: 'firma', text: 'Deine eigene Firma. Du kannst anderen Jobs geben (Minijob, Werkstudent, Vollzeit) und Aufträge annehmen.' },
    'april-server': { name: 'Rechenleistung', kind: 'nachhilfe', text: 'April kann anderen Nachhilfe geben, Bewerbungen und Steuererklärungen schreiben.' },
    'onkel-werkstatt': { name: 'Onkels Kfz-Werkstatt', kind: 'werkstatt', text: 'Reparaturen und TÜV-Vorbereitung zum halben Preis. Kann man auch Freunden anbieten.' },
    'mama-makler': { name: 'Mama ist Maklerin', kind: 'makler', text: 'Beim Wohnungs- und Hauskauf keine Maklerprovision. Kann man auch Freunden anbieten.' },
    'kiosk-familie': { name: 'Kiosk-Imperium der Familie', kind: 'firma', text: 'Kann anderen Jobs geben: Minijob oder Vollzeit im Kiosk.' },
  };
  const NPCS = ['Opa', 'Mama', 'Papa', 'Frau Krämer (Mathe)', 'Herr Yilmaz (Deutsch)', 'Fahrlehrer Dieter', 'Sachbearbeiterin vom Amt', 'Bankberater Herr Wolff', 'Vermieterin Frau Becker', 'Chefin Frau Albers'];

  const DB = { STATES, SUBJECTS, ABI, abiNote, pointsToGrade, LICENSE, CARS, STUDIES, SEMESTER_FEE, PRIVATE_FEE, TRAINING, JOBS, CITY_PRICES, cityPrice, TAX, incomeTax, net, CONTACTS, NPCS };
  if (typeof module !== 'undefined' && module.exports) module.exports = DB;
  else root.DULI_LARP_DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);
