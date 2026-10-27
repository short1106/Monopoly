// Dulidanopoly – Aprils Laune. April mag jede Person anders (0–100), hat eine Tageslaune,
// lässt sich bestechen, rächt sich bei Hass und kommentiert große Momente live.
// Wird von der klassischen Engine und der Brett-Engine benutzt. Läuft nur beim Host.
(function (root) {
  let rng = Math.random;
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const M = (n) => 'Ð' + n;

  const LEVELS = [
    { min: 0, id: 'hate', icon: '💔', name: 'hasst dich' },
    { min: 15, id: 'meh', icon: '🩶', name: 'mag dich nicht' },
    { min: 40, id: 'ok', icon: '💗', name: 'findet dich okay' },
    { min: 70, id: 'love', icon: '💖', name: 'liebt dich' },
  ];
  const DAYS = {
    happy: { icon: '😊', name: 'Gute Laune', text: 'Ð25 extra Gehalt für alle.' },
    ok: { icon: '😐', name: 'Geht so', text: 'Nichts Besonderes heute.' },
    angry: { icon: '😡', name: 'Sauer', text: 'Steuern ×2, fiese Karten ×1,5.' },
  };
  const BRIBES = { 50: [4, 9], 100: [9, 18], 200: [18, 32] };

  // Live-Kommentar wie im Fußball
  const CAST = {
    bigRent: ['OHHHH! {name} zahlt {amt} an {owner}! Das tut weh, meine Damen und Herren!', 'Was für ein Treffer! {amt} wechseln den Besitzer. {owner} lacht, {name} weint.', 'UNFASSBAR! {name} läuft voll rein. {amt}! Ich kann nicht hinsehen!', '{owner} kassiert {amt}. Das ist kein Monopoly mehr, das ist Raub!'],
    debt: ['{name} steht am Abgrund! Reicht das Geld noch?', 'Kritische Lage bei {name}! Hypotheken, jetzt oder nie!', 'Das Konto von {name} ist leerer als mein Kühlschrank.', 'Alarmstufe Rot bei {name}! Es fehlen {amt}!'],
    build: ['{name} baut auf {field} voll aus! Ab jetzt wird’s teuer!', 'Kräne, Beton, Größenwahn: {name} macht {field} zur Goldgrube!', 'Volle Ausbaustufe auf {field}! Ich würde da nicht mehr hinlaufen.'],
    doubles: ['Zweiter Pasch für {name}! Noch einer und es geht nach Düsseldorf!', 'Pasch, Pasch! {name} ist heiß. Zu heiß?', '{name} würfelt wie gezinkt. Ich prüf das.'],
    fav: ['{name} ist jetzt mein Liebling! 💖 Sorry, alle anderen.', 'Neue Lieblingsperson: {name}. Keine Diskussion.', '{name}, du bist so toll. Ab jetzt gibt’s gute Karten.'],
    hate: ['{name}, ich kann dich nicht mehr sehen. 💔 Pass auf deine Häuser auf.', 'Ab jetzt ist Krieg, {name}.', '{name} steht auf meiner Liste. Der schwarzen.'],
    bribe: ['{name} steckt mir {amt} zu. Ich bin käuflich und stolz drauf.', 'Danke für die {amt}, {name}! Ich hab nichts gesehen.', '{amt}? Okay, {name}, wir sind Freunde. Vorerst.'],
    cheap: ['Pff, {amt}? So billig bin ich nicht, {name}.', '{name}, mit {amt} kaufst du dir nicht mal meinen Blick.', 'Nett gemeint, {name}. Aber {amt} sind ein Witz.'],
    sabHouse: ['Ups. Ich hab auf {field} was abgerissen. War ein Versehen, {name}. Nicht.', 'Abrissbirne April! {name} verliert eine Ausbaustufe auf {field}.', '{name}, dein Gebäude auf {field}? Weg. Tschüss.'],
    sabMort: ['Ich hab {field} mit einer Hypothek belastet, {name}. Das Geld behalte ich.', '{field} von {name} ist jetzt hypothekiert. Gern geschehen.', 'Papierkram-Rache: {field} gehört jetzt halb der Bank, {name}.'],
    sabMoney: ['Ich hab {amt} aus deinem Portemonnaie genommen, {name}. Für meine Nerven.', '{name}, {amt} weg. Frag nicht.'],
    gift: ['Für dich, {name}: {amt}! Weil du mich verstehst. 💖', '{name} bekommt {amt} von mir. Die anderen? Nix.', 'Geschenk für meinen Liebling {name}: {amt}!'],
    bankrupt: ['UND {name} IST RAUS! Was für ein Absturz!', 'Game over für {name}. Ich hab nichts gesehen. Doch, hab ich.', '{name} ist pleite! Ruhe in Frieden, Portemonnaie.'],
    happy: ['Ich hab heute gute Laune! 😊 Ð25 extra Gehalt für alle.', 'Sonne, Döner, gute Laune. 😊 Heute gibt’s Ð25 extra.'],
    angry: ['Ich bin heute SAUER. 😡 Steuern doppelt, Karten fies.', 'Sprecht mich heute nicht an. 😡 Alles wird teurer.'],
    casinoWin: ['{name} sprengt die Bank von {owner}! {amt} raus!', 'JACKPOT-Energie! {name} nimmt {owner} {amt} ab!', 'Das Casino von {owner} blutet. {name} geht mit {amt} raus!'],
    casinoLose: ['Das Haus gewinnt immer. {name} lässt {amt} bei {owner}.', '{name} verzockt {amt}. {owner} reibt sich die Hände.', 'Rien ne va plus für {name}! {amt} an {owner}.'],
  };

  const on = (S) => !!(S && S.mood && S.mood.on);
  function levelOf(like) {
    let l = LEVELS[0];
    for (const x of LEVELS) if (like >= x.min) l = x;
    return l;
  }

  function log(S, m) {
    S.logSeq = (S.logSeq || 0) + 1;
    S.log.push(m);
    if (S.log.length > 80) S.log.splice(0, S.log.length - 80);
  }
  function cast(S, kind, v = {}, chance = 1) {
    if (!on(S) || rng() >= chance) return;
    const text = pick(CAST[kind]).replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ''));
    S.mood.castSeq = (S.mood.castSeq || 0) + 1;
    S.mood.cast = { seq: S.mood.castSeq, text, kind };
    log(S, `🎙️ ${text}`);
  }

  function init(S) {
    const want = !S.settings || S.settings.mood !== false;
    S.mood = { on: want, day: 'ok', cast: null, castSeq: 0 };
    for (const p of S.players) { p.like = 35 + Math.floor(rng() * 31); p.bribeTurn = -1; }
  }

  function bump(S, p, d) {
    if (!on(S) || !p || p.bankrupt) return;
    const before = levelOf(p.like).id;
    p.like = Math.max(0, Math.min(100, Math.round(p.like + d)));
    const after = levelOf(p.like).id;
    if (after === before) return;
    if (after === 'love') cast(S, 'fav', { name: p.name });
    if (after === 'hate') cast(S, 'hate', { name: p.name });
  }

  // Ist eine Karte gut (+1) oder schlecht (−1) für die Person, die sie zieht?
  function cardTone(c) {
    if (c.text) { // klassische Karte
      if (c.t === 'money') return c.amt > 0 ? 1 : -1;
      if (['collectEach', 'fromRichest', 'jailfree'].includes(c.t) || (c.t === 'move' && c.to === 0)) return 1;
      if (['payEach', 'jail', 'repairs', 'period'].includes(c.t)) return -1;
      return 0;
    }
    if (c.good || c.money > 0 || c.collect || c.fromRichest || c.item) return 1;
    if (c.money < 0 || c.payEach || c.repairs) return -1;
    return 0;
  }
  // Beliebte bekommen öfter gute Karten, Unbeliebte öfter fiese
  function wantsReroll(S, p, c) {
    if (!on(S)) return false;
    const tone = cardTone(c);
    if (p.like >= 70 && tone < 0) return rng() < 0.5;
    if (p.like < 15 && tone > 0) return rng() < 0.6;
    if (p.like < 40 && tone > 0) return rng() < 0.35;
    return false;
  }
  const badMult = (S) => (on(S) && S.mood.day === 'angry' ? 1.5 : 1);
  const taxMult = (S) => (on(S) && S.mood.day === 'angry' ? 2 : 1);
  const salaryBonus = (S) => (on(S) && S.mood.day === 'happy' ? 25 : 0);
  // Im Casino hat Aprils Liebling etwas mehr Glück
  const luck = (S, p) => (!on(S) ? 0 : p.like >= 70 ? 0.05 : p.like < 15 ? -0.05 : 0);

  function bribe(S, p, amt) {
    if (!on(S)) return { err: 'April ist heute nicht im Spiel.' };
    amt = Number(amt);
    if (!BRIBES[amt]) return { err: 'So viel nimmt April nicht.' };
    if (p.bribeTurn === S.turnNo) return { err: 'Nur einmal pro Zug bestechen.' };
    if (p.money < amt) return { err: 'Nicht genug Dulis.' };
    p.money -= amt;
    p.bribeTurn = S.turnNo;
    const [lo, hi] = BRIBES[amt];
    const cheap = amt < 200 && rng() < 0.2;
    const gain = cheap ? 1 + Math.floor(rng() * 3) : lo + Math.floor(rng() * (hi - lo + 1));
    log(S, `💸 ${p.name} besticht April mit ${M(amt)}.`);
    cast(S, cheap ? 'cheap' : 'bribe', { name: p.name, amt: M(amt) });
    bump(S, p, gain);
    return { gain };
  }

  // Neue Runde: Tageslaune würfeln, Reiche nerven April, Arme tun ihr leid
  function newRound(S, players, worth) {
    if (!on(S) || !players.length) return;
    const avg = players.reduce((a, p) => a + p.like, 0) / players.length;
    const happy = 0.25 + (avg - 50) / 200, angry = 0.25 - (avg - 50) / 200;
    const r = rng();
    const day = r < happy ? 'happy' : r < happy + angry ? 'angry' : 'ok';
    if (day !== S.mood.day && day !== 'ok') cast(S, day);
    S.mood.day = day;
    if (players.length > 1) {
      const sorted = players.slice().sort((a, b) => worth(b) - worth(a));
      bump(S, sorted[0], -2);
      bump(S, sorted[sorted.length - 1], 2);
    }
  }

  // Zugbeginn: Hass = Rache, Liebe = Geschenk. api kennt das Brett.
  function turnStart(S, p, api) {
    if (!on(S) || p.bankrupt) return;
    if (p.like < 15 && rng() < 0.3) {
      const house = api.tearDown(p);
      if (house) cast(S, 'sabHouse', { name: p.name, field: house });
      else {
        const mort = api.mortgage(p);
        if (mort) cast(S, 'sabMort', { name: p.name, field: mort });
        else {
          const amt = Math.min(p.money, 50);
          p.money -= amt;
          if (api.toBank) api.toBank(amt);
          cast(S, 'sabMoney', { name: p.name, amt: M(amt) });
        }
      }
      bump(S, p, 12);
    } else if (p.like >= 70 && (S.round || 1) - (p.giftRound ?? -99) >= 8 && rng() < 0.25) {
      p.giftRound = S.round || 1;
      const amt = 50 + 10 * Math.floor(rng() * 6);
      p.money += amt;
      cast(S, 'gift', { name: p.name, amt: M(amt) });
      bump(S, p, -12);
    }
  }

  // Ereignisse aus den Engines
  function rentPaid(S, payer, owner, amt) {
    if (!on(S)) return;
    if (amt >= 300) cast(S, 'bigRent', { name: payer.name, owner: owner.name, amt: M(amt) }, amt >= 500 ? 1 : 0.6);
    if (amt >= 200) bump(S, owner, -2);
    bump(S, payer, 1);
  }
  const aprilField = (S, p) => bump(S, p, 3);
  function built(S, p, field) { cast(S, 'build', { name: p.name, field }, 0.8); bump(S, p, -1); }
  const debt = (S, p, amt) => cast(S, 'debt', { name: p.name, amt: M(amt) }, 0.7);
  const doubles = (S, p) => cast(S, 'doubles', { name: p.name }, 0.7);
  const bankrupt = (S, p) => cast(S, 'bankrupt', { name: p.name });
  function casino(S, p, owner, amt, win) {
    cast(S, win ? 'casinoWin' : 'casinoLose', { name: p.name, owner: owner.name, amt: M(amt) }, amt >= 150 ? 1 : 0.5);
  }

  // Bots: bestechen, wenn April sie nicht mag und Geld da ist
  function botBribe(S, p) {
    if (!on(S) || p.bribeTurn === S.turnNo) return null;
    if (p.like < 15 && p.money > 500) return 100;
    if (p.like < 40 && p.money > 900 && rng() < 0.5) return 50;
    return null;
  }

  const MOOD = {
    LEVELS, DAYS, BRIBES, levelOf, on, init, bump, cardTone, wantsReroll, badMult, taxMult, salaryBonus, luck,
    bribe, newRound, turnStart, rentPaid, aprilField, built, debt, doubles, bankrupt, casino, botBribe,
    setRng: (f) => { rng = f; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = MOOD;
  else root.DULI_MOOD = MOOD;
})(typeof window !== 'undefined' ? window : globalThis);
