// Dulidanopoly – Spielregeln. Läuft nur beim Host; Clients bekommen den Zustand geschickt.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./data.js') : root.DULI_DATA;
  const MOOD = isNode ? require('./mood.js') : root.DULI_MOOD;
  const CASINO = isNode ? require('./casino.js') : root.DULI_CASINO;
  const RL = isNode ? require('./rules.js') : root.DULI_RULES;
  const LG = isNode ? require('./logistics.js') : root.DULI_LOGI;
  const { GROUPS, TOKENS, APRIL_CARDS, STUDIO_CARDS, START_MONEY, PLAYER_COLORS, APRIL_SAYS, BOARDS } = D;
  // Normales Brett oder MEGA-Brett: wird vor jeder Aktion passend zum Spielstand gesetzt
  let BD, SPACES, RAILS, UTILS, APRIL_FIELD, N, JAIL, RS = null;
  // Brett-Editor: eigene Namen fürs normale Brett (Kopie wird zwischengespeichert)
  let customCache = { key: null, b: null };
  function boardFor(S) {
    const base = BOARDS[(S && S.size) || 'normal'] || BOARDS.normal;
    const names = S && S.settings && S.settings.names;
    if (base.id !== 'normal' || !names || !Object.keys(names).length) return base;
    const key = JSON.stringify(names);
    if (customCache.key !== key) {
      customCache = { key, b: Object.assign({}, base, { id: 'custom', SPACES: base.SPACES.map((sp, i) => (names[i] ? Object.assign({}, sp, { name: names[i] }) : sp)) }) };
    }
    return customCache.b;
  }
  function useBoard(S) {
    RS = S;
    BD = boardFor(S);
    ({ SPACES, RAILS, UTILS, APRIL_FIELD, N, JAIL } = BD);
  }
  useBoard(null);
  const CARDS = { april: APRIL_CARDS, studio: STUDIO_CARDS };
  const DECK_NAME = { april: 'April-Karte', studio: 'Studio-Karte' };
  const BUYABLE = ['prop', 'rail', 'util', 'station'];

  let rng = Math.random;
  const d6 = () => 1 + Math.floor(rng() * 6);

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newGame() {
    return {
      v: 0, phase: 'lobby', players: [], cur: 0, sub: 'roll', turnNo: 0,
      dice: [1, 1], rollId: 0, doublesCount: 0, rolledDouble: false,
      props: {}, decks: { april: [], studio: [] }, card: null, auction: null,
      debt: null, trade: null, log: [], logSeq: 0, pot: 0, winner: null, ranking: null,
      berlingoArmed: false, pendingMove: null, cardMult: 0, utilCard: false, lastLand: null,
      settings: { startMoney: START_MONEY, pot: true, goDouble: false },
    };
  }

  const VARIANTS = RL.VARIANTS.map(v => v.id);
  const GOAL_WORTH = 5000;
  // April-Chaos im klassischen Modus: ein Event pro Runde
  const CHAOS_EVENTS = [
    { t: 'Mietfrei! Diese Runde zahlt niemand Miete.', rentMult: 0 },
    { t: 'Häuser im Sale: Diese Runde kosten Häuser nur ein Viertel.', buildMult: 0.25 },
    { t: 'Lotto-Gewinn! Die ärmste Person bekommt Ð300.', poorGift: 300 },
    { t: 'Reichensteuer: Die reichste Person zahlt Ð200 in Aprils Spardose.', richTax: 200 },
    { t: 'Pasch-Fieber: Jeder Pasch bringt diese Runde Ð100.', doubleBonus: 100 },
    { t: 'Bankenpleite: Alle verlieren 15 % ihres Geldes an die Spardose.', taxPct: 0.15 },
    { t: 'Konfetti-Regen: Alle bekommen Ð75.', gift: 75 },
    { t: 'Mietparty XXL: Alle Mieten diese Runde ×3.', rentMult: 3 },
    { t: 'Spardosen-Explosion: Aprils Spardose wird an alle verteilt.', potSplit: true },
    { t: 'Mietparty! Alle Mieten diese Runde ×2.', rentMult: 2 },
    { t: 'Mietstreik: Diese Runde gibt es nur halbe Miete.', rentMult: 0.5 },
    { t: 'Baurausch: Häuser kosten diese Runde die Hälfte.', buildMult: 0.5 },
    { t: 'April hackt die Bank: Alle bekommen Ð150.', gift: 150 },
    { t: 'Steuer-Chaos: Alle zahlen 10 % ihres Geldes in Aprils Spardose.', taxPct: 0.1 },
    { t: 'Robin April: Der reichste Spieler verteilt Ð300 an alle anderen.', robin: 300 },
    { t: 'Teleport-Chaos! Alle Figuren tauschen zufällig die Plätze.', swap: true },
    { t: 'Düsseldorf-Razzia: Alle, die in Düsseldorf sitzen, kommen sofort frei.', freeJail: true },
    { t: 'Immobilien-Boom: Besitzer bekommen Ð25 pro Haus (Hotel = 5 Häuser).', houseBonus: 25 },
    { t: 'Ruhige Runde. April macht ein Nickerchen.' },
  ];

  const BOT_NAMES = ['April-Bot', 'KI-Kevin', 'Bot Bernd', 'Captain Cache', 'Lady Algorithmus', 'Robo-Rüdiger'];
  const newStats = () => ({ rentPaid: 0, rentGot: 0, maxRent: 0, jail: 0, doubles: 0, pot: 0, cards: 0, bought: 0, built: 0 });

  // ---------- Helfer ----------
  const P = (S, id) => S.players.find(p => p.id === id);
  const curP = (S) => S.players[S.cur];
  const active = (S) => S.players.filter(p => !p.bankrupt);
  function log(S, m) {
    S.logSeq = (S.logSeq || 0) + 1;
    S.log.push(m);
    if (S.log.length > 80) S.log.splice(0, S.log.length - 80);
  }
  const money = (n) => 'Ð' + n;
  function say(S, list, chance) {
    if (!list || rng() >= chance) return;
    if (S.lastQuipAt != null && S.logSeq - S.lastQuipAt < 4) return;
    let line = list[Math.floor(rng() * list.length)];
    if (line === S.lastQuip && list.length > 1) line = list[(list.indexOf(line) + 1) % list.length];
    S.lastQuip = line;
    log(S, line.startsWith('April:') ? line : line.startsWith('„') ? `April: ${line}` : `April: „${line}“`);
    S.lastQuipAt = S.logSeq;
  }
  function quip(S, kind, chance) { say(S, APRIL_SAYS[kind], chance); }

  function groupIdx(g) { return SPACES.map((s, i) => (s.group === g ? i : -1)).filter(i => i >= 0); }
  function ownsGroup(S, pid, g) { return groupIdx(g).every(i => S.props[i].owner === pid); }
  function groupHasHouses(S, g) { return groupIdx(g).some(i => S.props[i].houses > 0); }
  function houseCost(p, g, S) {
    const mult = ((S && S.event && S.event.buildMult) || 1) * (S && S.pol && S.pol.law === 'baufoerderung' ? 0.5 : 1);
    return Math.max(5, Math.round((GROUPS[g].house - (p.token === 'pen' ? 25 : 0)) * mult * RL.buildFactor(S) / 5) * 5);
  }
  function buyPrice(p, idx) {
    const base = SPACES[idx].price;
    return p.token === 'dulidan' ? Math.round(base * 0.9) : base;
  }
  function unmortgageCost(idx) { return Math.ceil(SPACES[idx].price * (RL.on(RS, 'mortgageFree') ? 0.5 : 0.55)); }
  function bankSupply(S) {
    let houses = 0, hotels = 0;
    for (const k in S.props) {
      const h = S.props[k].houses;
      if (h === 5) hotels++; else houses += h;
    }
    return { houses: BD.maxHouses - houses, hotels: BD.maxHotels - hotels };
  }

  function calcRent(S, idx, payer) {
    let r = baseRent(S, idx, payer);
    if (S.settings && S.settings.variant === 'hardcore') r *= 1.5;
    if (S.event && S.event.rentMult != null) r *= S.event.rentMult;
    r *= RL.rentFactor(S);
    if (S.pol && S.pol.law === 'mietbremse') r *= 0.7;
    if (S.pol && S.pol.law === 'deregulierung') r *= 1.3;
    return Math.round(r);
  }

  function baseRent(S, idx, payer) {
    const sp = SPACES[idx], st = S.props[idx], owner = st.owner;
    if (sp.type === 'prop') {
      if (st.houses > 0) return sp.rent[st.houses];
      return ownsGroup(S, owner, sp.group) ? sp.rent[0] * RL.monoMult(S) : sp.rent[0];
    }
    if (sp.type === 'rail') {
      const n = RAILS.filter(i => S.props[i].owner === owner).length;
      let r = 25 * Math.pow(2, n - 1);
      if (S.cardMult) r *= S.cardMult;
      if (payer && payer.token === 'ship') r = Math.floor(r / 2);
      return r;
    }
    if (sp.type === 'station') return LG.stationRent(S, idx);
    if (sp.type === 'util' && S.isLogi) {
      const n = UTILS.filter(i => S.props[i].owner === owner).length;
      return LG.portRent(n) * (S.utilCard ? 2 : 1);
    }
    if (sp.type === 'util') {
      const n = UTILS.filter(i => S.props[i].owner === owner).length;
      const sum = S.dice[0] + S.dice[1];
      return (S.utilCard ? 10 : (n === 2 ? 10 : 4)) * sum;
    }
    return 0;
  }

  function netWorth(S, p) {
    let w = p.money;
    for (const k in S.props) {
      const st = S.props[k];
      if (st.owner !== p.id) continue;
      const sp = SPACES[k];
      w += st.mort ? sp.price / 2 : sp.price;
      if (sp.type === 'prop') w += st.houses * GROUPS[sp.group].house;
    }
    (S.tracks || []).forEach(t => { if (t.owner === p.id) w += t.cost; });
    return w;
  }

  // ---------- Lobby ----------
  function addPlayer(S, id, name) {
    if (S.phase !== 'lobby') return 'Das Spiel läuft schon.';
    if (P(S, id)) return null;
    if (S.players.length >= 6) return 'Der Raum ist voll (max. 6 Spieler).';
    name = String(name || '').trim().slice(0, 16) || 'Spieler';
    S.players.push({
      id, name, token: null, color: PLAYER_COLORS[S.players.length % PLAYER_COLORS.length],
      money: START_MONEY, pos: 0, inJail: false, jailTries: 0, jailFree: [],
      bankrupt: false, skip: 0, used: { april: false, berlingo: false }, connected: true, bot: false,
    });
    log(S, `${name} ist beigetreten.`);
    return null;
  }

  function addBot(S) {
    if (S.phase !== 'lobby') return 'Das Spiel läuft schon.';
    if (S.players.length >= 6) return 'Der Raum ist voll (max. 6 Spieler).';
    const name = BOT_NAMES.find(n => !S.players.some(p => p.name === n)) || 'Bot';
    const id = 'bot-' + Math.floor(rng() * 1e9).toString(36);
    addPlayer(S, id, name);
    const p = P(S, id);
    p.bot = true;
    const free = Object.keys(TOKENS).filter(t => !S.players.some(q => q.token === t));
    p.token = free[Math.floor(rng() * free.length)];
    return null;
  }

  function removePlayer(S, id) {
    if (S.phase !== 'lobby') return 'Das Spiel läuft schon.';
    S.players = S.players.filter(p => p.id !== id);
    return null;
  }

  function setSettings(S, o) {
    if (S.phase !== 'lobby') return 'Das Spiel läuft schon.';
    const sm = Number(o.startMoney);
    if ([1000, 1500, 2000, 3000].includes(sm)) S.settings.startMoney = sm;
    if (typeof o.pot === 'boolean') S.settings.pot = o.pot;
    if (typeof o.goDouble === 'boolean') S.settings.goDouble = o.goDouble;
    if (['classic', 'casino', 'world', 'royale', 'metro', 'tower', 'islands', 'festival', 'race', 'throne', 'quiz', 'bomb', 'realistic', 'logistics', 'war', 'politics'].includes(o.mode)) S.settings.mode = o.mode;
    if ([3, 5, 10, 0].includes(Number(o.years)) && o.years !== '' && o.years != null) S.settings.years = Number(o.years);
    if (['mini', 'normal', 'mega'].includes(o.size)) S.settings.size = o.size;
    if (o.names && typeof o.names === 'object') {
      const clean = {};
      for (const k of Object.keys(o.names)) {
        const i = Number(k), v = String(o.names[k] || '').replace(/\s+/g, ' ').trim().slice(0, 26);
        if (BOARDS.normal.SPACES[i] && ['prop', 'rail', 'util', 'tax'].includes(BOARDS.normal.SPACES[i].type) && v) clean[i] = v;
      }
      S.settings.names = clean;
      S.settings.boardName = String(o.boardName || 'Eigenes Brett').trim().slice(0, 24);
    }
    if (typeof o.mood === 'boolean') S.settings.mood = o.mood;
    if (VARIANTS.includes(o.variant)) S.settings.variant = o.variant;
    if ([0, 15, 20, 30, 50].includes(Number(o.maxRounds))) S.settings.maxRounds = Number(o.maxRounds);
    if (o.rule && RL.RULES.some(r => r.id === o.rule)) S.settings.rules = Object.assign({}, S.settings.rules, { [o.rule]: !!o.on });
    return null;
  }

  function pickToken(S, pid, token) {
    if (S.phase !== 'lobby') return 'Das Spiel läuft schon.';
    if (!TOKENS[token]) return 'Unbekannte Figur.';
    const holder = S.players.find(p => p.token === token);
    if (holder && holder.id !== pid) return `${holder.name} hat die Figur schon.`;
    P(S, pid).token = token;
    return null;
  }

  function startGame(S) {
    if (S.players.length < 2) return 'Ihr braucht mindestens 2 Spieler.';
    if (S.players.some(p => !p.token)) return 'Jeder muss zuerst eine Figur wählen.';
    if (!S.settings) S.settings = { startMoney: START_MONEY, pot: true, goDouble: false };
    S.size = (S.settings.mode || 'classic') === 'classic' && ['mini', 'mega'].includes(S.settings.size) ? S.settings.size : 'normal';
    S.isLogi = S.settings.mode === 'logistics';
    if (S.isLogi) S.size = 'logi';
    S.tracks = [];
    S.isWar = S.settings.mode === 'war';
    S.isPol = S.settings.mode === 'politics';
    S.pol = S.isPol ? { law: null, kanzler: null, vize: null, every: 5, wins: {}, last: null, pending: null } : null;
    S.sos = null; S.sosShow = null; S.war = null; S.battle = null;
    useBoard(S);
    S.players.forEach((p, i) => {
      p.stats = newStats();
      Object.assign(p, { money: Math.round(S.settings.startMoney * BD.moneyMult), pos: 0, inJail: false, jailTries: 0, jailFree: [], bankrupt: false, skip: 0, used: { april: false, berlingo: false } });
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });
    S.props = {};
    SPACES.forEach((s, i) => { if (BUYABLE.includes(s.type)) S.props[i] = { owner: null, houses: 0, mort: false }; });
    S.decks = { april: shuffle(APRIL_CARDS.map((_, i) => i)), studio: shuffle(STUDIO_CARDS.map((_, i) => i)) };
    S.phase = 'play'; S.cur = 0; S.sub = 'roll'; S.turnNo = 1; S.pot = 0; S.round = 1; S.event = null;
    S.isCasino = S.settings.mode === 'casino';
    S.casino = null; S.casinoShow = null; S.casinoSeq = 0;
    MOOD.init(S);
    const variant = S.settings.variant || 'normal';
    S.maxRounds = variant === 'blitz' ? 20 : 0;
    S.goal = variant === 'million' ? GOAL_WORTH : 0;
    if (variant === 'hardcore') S.players.forEach(p => { p.money = Math.round(800 * BD.moneyMult); });
    if (variant === 'rich') S.players.forEach(p => { p.money = Math.round(5000 * BD.moneyMult); });
    if (variant === 'tycoon') S.players.forEach(p => { p.money = Math.max(500, p.money - 500); });
    S.players.forEach(p => { if (p.token === 'rocket') p.money += 150; p.troops = S.isWar ? 12 : 0; p.camp = 0; });
    if (variant === 'tycoon') giveRandomProps(S, 3);
    if (RL.on(S, 'startProps')) giveRandomProps(S, 2);
    if (variant === 'blitz') {
      const idx = shuffle(Object.keys(S.props).map(Number));
      idx.forEach((k, i) => { S.props[k].owner = S.players[i % S.players.length].id; });
    }
    S.hist = [];
    S.log = [];
    log(S, S.isLogi ? `🚆 DULIDANOPOLY LOGISTICS startet! Bahnhöfe kaufen, Schienen legen, Netze bauen. ${S.players[0].name} beginnt.` : S.isCasino ? `🎰 DULIDAN CASINO öffnet! ${S.players[0].name} beginnt.` : S.size === 'mega' ? `🚀 MEGA-Dulidanopoly startet! 120 Felder, doppelte Schritte. ${S.players[0].name} beginnt.` : S.size === 'mini' ? `⚡ MINI-Dulidanopoly startet! 24 Felder, nur das Wichtigste. ${S.players[0].name} beginnt.` : `Dulidanopoly startet! ${S.players[0].name} beginnt.`);
    recordHist(S);
    const intro = { blitz: '⚡ Blitz: Alle Felder sind verteilt. Nach 20 Runden gewinnt der Reichste!', million: `💸 Millionär: Wer zuerst ${money(GOAL_WORTH)} Vermögen hat, gewinnt!`, chaos: '💖 April-Chaos: Jede Runde passiert irgendwas. Ihr wurdet gewarnt.', hardcore: '💀 Hardcore: Ð800 Startgeld, alle Mieten ×1,5. Viel Glück.' }[variant];
    if (intro) log(S, intro);
    else if (variant !== 'normal') { const v = RL.VARIANTS.find(x => x.id === variant); if (v) log(S, `${v.icon} ${v.name}: ${v.text}`); }
    return null;
  }

  // Startpaket: jede Person bekommt n zufällige freie Straßen
  function giveRandomProps(S, n) {
    const free = shuffle(Object.keys(S.props).map(Number).filter(k => SPACES[k].type === 'prop' && !S.props[k].owner));
    for (let r = 0; r < n; r++) for (const p of S.players) { const k = free.pop(); if (k != null) S.props[k].owner = p.id; }
  }

  // ---------- Zugablauf ----------
  function passGo(S, p) {
    const amt = Math.max(0, BD.go + (p.token === 'zebra' ? 50 : 0) + MOOD.salaryBonus(S) - (S.pol && S.pol.law === 'maut' ? 100 : 0));
    p.money += amt;
    log(S, `${p.name} zieht über LOS und kassiert ${money(amt)}.`);
    if (S.isWar) {
      const t = 4 + Math.floor(Object.keys(S.props).filter(k => S.props[k].owner === p.id).length / 3);
      p.troops = (p.troops || 0) + t;
      log(S, `🪖 ${p.name} rekrutiert ${t} Truppen (jetzt ${p.troops}).`);
    }
    if (RL.on(S, 'interest')) {
      const z = Math.min(100, Math.floor(p.money * 0.05));
      if (z > 0) { p.money += z; log(S, `🏦 Zinsen: ${p.name} bekommt ${money(z)}.`); }
    }
    if (p.token === 'crown') {
      let t = 0;
      for (const o of active(S)) if (o.id !== p.id) { const x = Math.min(o.money, 10); o.money -= x; t += x; }
      p.money += t;
      if (t) log(S, `👑 Tribut an die Krone: ${p.name} bekommt ${money(t)}.`);
    }
    quip(S, 'go', 0.2);
  }
  function moveBy(S, p, n) {
    const old = p.pos;
    const np = ((old + n) % N + N) % N;
    if (n > 0 && np < old) passGo(S, p);
    p.pos = np;
  }
  function moveTo(S, p, target) {
    if (target < p.pos) passGo(S, p);
    p.pos = target;
  }
  function sendJail(S, p) {
    if (RL.on(S, 'noJail')) {
      const x = Math.min(p.money, 100);
      p.money -= x; toBank(S, x);
      S.rolledDouble = false; S.doublesCount = 0;
      log(S, `🚫 Düsseldorf light: ${p.name} zahlt ${money(x)} statt in den Knast zu gehen.`);
      return;
    }
    p.pos = JAIL; p.inJail = true; p.jailTries = 0;
    if (p.stats) p.stats.jail++;
    S.rolledDouble = false; S.doublesCount = 0;
    log(S, `${p.name} muss nach Düsseldorf. 😱`);
    quip(S, 'jail', 0.6);
  }

  function proceed(S) {
    S.cardMult = 0; S.utilCard = false;
    const p = curP(S);
    if (S.phase !== 'play') return;
    if (!p.bankrupt && S.rolledDouble && !p.inJail) {
      S.sub = 'roll';
      log(S, `Pasch! ${p.name} darf nochmal würfeln.`);
    } else {
      S.sub = 'end';
    }
  }

  function toBank(S, amt) {
    if (S.settings && S.settings.pot === false) return;
    S.pot = (S.pot || 0) + amt;
  }

  function charge(S, p, items) {
    const total = items.reduce((a, b) => a + b.amt, 0);
    if (p.money >= total) {
      for (const it of items) {
        p.money -= it.amt;
        if (it.to) P(S, it.to).money += it.amt;
        else toBank(S, it.amt);
      }
      return true;
    }
    S.debt = { pid: p.id, items, afterMove: null };
    S.sub = 'debt';
    log(S, `${p.name} fehlen ${money(total - p.money)}. Hypotheken aufnehmen, Häuser verkaufen oder handeln!`);
    MOOD.debt(S, p, total - p.money);
    return false;
  }

  function land(S, p) {
    S.lastLand = p.pos;
    const sp = SPACES[p.pos];
    log(S, `${p.name} landet auf ${sp.name}.`);
    say(S, APRIL_FIELD[p.pos], 0.6);
    if (BUYABLE.includes(sp.type)) {
      const st = S.props[p.pos];
      if (st.owner == null) { S.sub = 'buy'; return; }
      if (st.owner === p.id) return proceed(S);
      if (st.mort) { log(S, `${sp.name} ist mit einer Hypothek belastet. Keine Miete.`); return proceed(S); }
      const owner = P(S, st.owner);
      const rent = calcRent(S, p.pos, p);
      if (RL.on(S, 'jailRent') && owner.inJail) { log(S, `⛓️ ${owner.name} sitzt in Düsseldorf und kassiert keine Miete.`); return proceed(S); }
      if (rent <= 0) { log(S, `Mietfrei! ${p.name} zahlt nichts.`); return proceed(S); }
      if (p.token === 'ghost' && !p.used.ghost && rent >= 100) { p.used.ghost = true; log(S, `👻 ${p.name} geht als Geist durch die Wand und zahlt keine ${money(rent)}!`); return proceed(S); }
      if (S.isCasino && sp.type === 'prop') return enterCasino(S, p, p.pos, owner, Math.max(20, rent * 2));
      if (S.isWar && sp.type === 'prop') { S.war = { idx: p.pos, att: p.id, def: owner.id, rent }; S.sub = 'war'; log(S, `⚔️ ${p.name} steht in ${sp.name} von ${owner.name}: Tribut zahlen oder angreifen?`); return; }
      lobbyCut(S, p, rent);
      log(S, `${p.name} zahlt ${money(rent)} Miete an ${owner.name}.`);
      if (p.stats) { p.stats.rentPaid += rent; p.stats.maxRent = Math.max(p.stats.maxRent, rent); }
      if (owner.stats) owner.stats.rentGot += rent;
      if (rent >= 200) quip(S, 'bigRent', 0.8);
      MOOD.rentPaid(S, p, owner, rent);
      if (charge(S, p, [{ to: owner.id, amt: rent }])) proceed(S);
      return;
    }
    switch (sp.type) {
      case 'tax': {
        const amt = Math.round(sp.amount * MOOD.taxMult(S) * (p.token === 'pizza' ? 0.5 : 1) * (S.pol && S.pol.law === 'steuersenkung' ? 0.5 : 1));
        log(S, `${sp.name}! ${p.name} zahlt ${money(amt)}${amt > sp.amount ? ' (April ist sauer: doppelt!)' : ''}.`);
        if (charge(S, p, [{ to: null, amt }])) proceed(S);
        return;
      }
      case 'april':
        MOOD.aprilField(S, p);
        return drawCard(S, sp.type);
      case 'studio':
        return drawCard(S, sp.type);
      case 'gotojail':
        sendJail(S, p);
        return proceed(S);
      case 'parking':
        if (S.pot > 0 && RL.on(S, 'splitSteal') && active(S).length >= 2) {
          const others = active(S).filter(o => o.id !== p.id);
          const b = others[Math.floor(rng() * others.length)];
          S.sos = { a: p.id, b: b.id, pot: S.pot, claim: null, pick: {} };
          S.sub = 'sos';
          log(S, `🐷 Split or Steal! ${p.name} und ${b.name} spielen um Aprils Spardose (${money(S.pot)}).`);
          return;
        }
        if (S.pot > 0) {
          log(S, `${p.name} knackt Aprils Spardose: ${money(S.pot)}! 🐷`);
          if (p.stats) p.stats.pot += S.pot;
          p.money += S.pot; S.pot = 0;
          quip(S, 'pot', 0.7);
        }
        return proceed(S);
      case 'go':
        if (S.settings && S.settings.goDouble) {
          p.money += BD.go;
          log(S, `Genau auf LOS! ${p.name} bekommt nochmal ${money(BD.go)}. 💸`);
        }
        return proceed(S);
      default:
        return proceed(S);
    }
  }

  function doMove(S, p, n) {
    moveBy(S, p, n * BD.stepMult);
    land(S, p);
  }

  function roll(S) {
    const p = curP(S);
    const a = d6(), b = d6();
    S.dice = [a, b]; S.rollId++;
    const dbl = a === b, sum = a + b;
    const turbo = RL.variant(S) === 'speed' ? 1 + Math.floor(rng() * 3) : 0;
    const steps = sum + turbo;
    S.turbo = turbo || null;
    log(S, `${p.name} würfelt ${a} + ${b} = ${sum}${dbl ? ' (Pasch)' : ''}${turbo ? ` · 🏎️ Turbo +${turbo}` : ''}${BD.stepMult > 1 ? ` · Mega: ${steps * BD.stepMult} Felder` : ''}.`);
    if (sum === 7 && RL.on(S, 'lucky7')) { p.money += 77; log(S, `🍀 Glückszahl 7! ${p.name} bekommt ${money(77)}.`); }
    if (dbl && RL.on(S, 'doublesCash')) { p.money += 50; log(S, `🎲 Pasch-Prämie: ${p.name} bekommt ${money(50)}.`); }
    if (dbl && S.event && S.event.doubleBonus) { p.money += S.event.doubleBonus; log(S, `🎉 Pasch-Fieber: ${p.name} bekommt ${money(S.event.doubleBonus)}.`); }

    if (p.inJail) {
      if (dbl) {
        p.inJail = false; p.jailTries = 0; S.rolledDouble = false;
        log(S, `Pasch! ${p.name} entkommt aus Düsseldorf.`);
        return doMove(S, p, steps);
      }
      p.jailTries++;
      if (p.token === 'helmet' && p.jailTries >= 2) {
        p.inJail = false; p.jailTries = 0; S.rolledDouble = false;
        log(S, `Der Stahlhelm bricht aus Düsseldorf aus! ⛑️`);
        return doMove(S, p, steps);
      }
      if (p.jailTries >= 3) {
        p.inJail = false; p.jailTries = 0; S.rolledDouble = false;
        log(S, `${p.name} muss ${money(50)} zahlen, um Düsseldorf zu verlassen.`);
        if (charge(S, p, [{ to: null, amt: 50 }])) return doMove(S, p, steps);
        S.debt.afterMove = steps;
        return;
      }
      log(S, `${p.name} bleibt in Düsseldorf (Versuch ${p.jailTries}/${p.token === 'helmet' ? 2 : 3}).`);
      S.sub = 'end';
      return;
    }

    if (dbl) {
      S.doublesCount++;
      if (p.stats) p.stats.doubles++;
      if (S.doublesCount === 2) MOOD.doubles(S, p);
      if (p.token === 'doener') { p.money += 20; log(S, `Döner-Pasch: ${p.name} bekommt ${money(20)}. Mit allem, scharf! 🥙`); }
      if (S.doublesCount >= 3 && p.token === 'gamepad') {
        p.money += 100; S.rolledDouble = false; S.doublesCount = 0;
        log(S, `🎮 Drei Pasch! Highscore statt Düsseldorf: ${p.name} bekommt ${money(100)}.`);
        return doMove(S, p, steps);
      }
      if (S.doublesCount >= 3) {
        log(S, `Drei Pasch hintereinander!`);
        quip(S, 'triple', 1);
        sendJail(S, p);
        S.sub = 'end';
        return;
      }
      S.rolledDouble = true;
    } else {
      S.rolledDouble = false;
    }
    if (S.berlingoArmed) {
      S.pendingMove = steps;
      S.sub = 'berlingo';
      return;
    }
    doMove(S, p, steps);
  }

  function nextTurn(S) {
    S.rolledDouble = false; S.doublesCount = 0; S.berlingoArmed = false; S.pendingMove = null;
    const n = S.players.length;
    let wrapped = false;
    for (let guard = 0; guard < n * 3; guard++) {
      S.cur = (S.cur + 1) % n;
      if (S.cur === 0) wrapped = true;
      const p = S.players[S.cur];
      if (p.bankrupt) continue;
      if (p.skip > 0) {
        p.skip--;
        log(S, `${p.name} setzt diese Runde aus.`);
        continue;
      }
      break;
    }
    S.sub = 'roll';
    S.turnNo++;
    if (wrapped) {
      S.round = (S.round || 1) + 1;
      if (S.maxRounds && S.round > S.maxRounds) { log(S, `Runde ${S.maxRounds} ist vorbei!`); return endGame(S); }
      if (S.settings && S.settings.variant === 'chaos') chaosEvent(S);
      else S.event = null;
      MOOD.newRound(S, active(S), (q) => netWorth(S, q));
      roundRules(S);
      recordHist(S);
    }
    if (S.phase !== 'play') return;
    log(S, `${curP(S).name} ist dran.`);
    MOOD.turnStart(S, curP(S), moodApi(S));
    if (S.pol && S.pol.pending && S.sub === 'roll') S.sub = 'law';
    const tax = RL.suddenTax(S), cp = curP(S);
    if (tax && !cp.bankrupt) {
      log(S, `⏳ Sudden Death: ${cp.name} zahlt ${money(tax)} Überlebens-Steuer.`);
      if (!charge(S, cp, [{ to: null, amt: tax }])) S.debt.afterTax = true;
    }
  }

  // Regeln, die einmal pro Runde greifen
  function roundRules(S) {
    const act = active(S);
    if (act.length < 2) return;
    if (RL.on(S, 'robin')) {
      const byMoney = act.slice().sort((a, b) => b.money - a.money);
      const rich = byMoney[0], poor = byMoney[byMoney.length - 1];
      const x = Math.min(50, rich.money);
      rich.money -= x; poor.money += x;
      log(S, `🏹 Robin Hood: ${rich.name} gibt ${poor.name} ${money(x)}.`);
    }
    if (S.isPol) polRound(S);
    if (RL.variant(S) === 'swap' && S.round % 5 === 0) {
      const ms = shuffle(act.map(p => p.money));
      act.forEach((p, i) => { p.money = ms[i]; });
      log(S, `🔄 Konto-Roulette! Alle Kontostände wurden getauscht.`);
    }
  }

  // Was April bei Hass kaputt machen darf
  function moodApi(S) {
    return {
      tearDown(p) {
        if (S.isLogi) {
          const mine = (S.tracks || []).filter(t => t.owner === p.id);
          if (!mine.length) return null;
          const t = mine[Math.floor(rng() * mine.length)];
          S.tracks = S.tracks.filter(x => x !== t);
          return `die Schiene ${SPACES[t.a].name} – ${SPACES[t.b].name}`;
        }
        const k = Object.keys(S.props).filter(i => S.props[i].owner === p.id && S.props[i].houses > 0)
          .sort((a, b) => S.props[b].houses - S.props[a].houses)[0];
        if (k == null) return null;
        S.props[k].houses--;
        return SPACES[k].name;
      },
      mortgage(p) {
        const k = Object.keys(S.props).filter(i => S.props[i].owner === p.id && !S.props[i].mort && !(SPACES[i].type === 'prop' && groupHasHouses(S, SPACES[i].group)))
          .sort((a, b) => SPACES[b].price - SPACES[a].price)[0];
        if (k == null) return null;
        S.props[k].mort = true;
        toBank(S, SPACES[k].price / 2);
        return SPACES[k].name;
      },
      toBank: (amt) => toBank(S, amt),
    };
  }

  function chaosEvent(S) {
    const e = { ...CHAOS_EVENTS[Math.floor(rng() * CHAOS_EVENTS.length)] };
    S.event = e;
    log(S, `📰 April-News, Runde ${S.round}: ${e.t}`);
    const act = active(S);
    if (e.gift) act.forEach(p => { p.money += e.gift; });
    if (e.taxPct) act.forEach(p => { const x = Math.floor(p.money * e.taxPct); p.money -= x; toBank(S, x); });
    if (e.robin) {
      const rich = act.slice().sort((a, b) => b.money - a.money)[0];
      const others = act.filter(p => p !== rich);
      const each = Math.floor(Math.min(rich.money, e.robin) / Math.max(1, others.length));
      others.forEach(o => { rich.money -= each; o.money += each; });
    }
    if (e.swap) {
      const pos = shuffle(act.map(p => p.pos));
      act.forEach((p, i) => { if (!p.inJail) p.pos = pos[i]; else p.pos = JAIL; });
    }
    if (e.freeJail) act.forEach(p => { if (p.inJail) { p.inJail = false; p.jailTries = 0; } });
    const byMoney = act.slice().sort((a, b) => b.money - a.money);
    if (e.poorGift && byMoney.length) byMoney[byMoney.length - 1].money += e.poorGift;
    if (e.richTax && byMoney.length) { const x = Math.min(byMoney[0].money, e.richTax); byMoney[0].money -= x; toBank(S, x); }
    if (e.potSplit && S.pot > 0 && act.length) { const each = Math.floor(S.pot / act.length); act.forEach(p => { p.money += each; }); S.pot -= each * act.length; }
    if (e.houseBonus) {
      for (const k in S.props) {
        const st = S.props[k];
        if (st.owner && st.houses) P(S, st.owner).money += e.houseBonus * st.houses;
      }
    }
  }

  function checkGoal(S) {
    if (S.phase !== 'play' || !S.goal) return;
    const hit = active(S).find(p => netWorth(S, p) >= S.goal);
    if (hit) {
      S.ranking = rank(S);
      S.phase = 'over';
      S.winner = hit.id;
      log(S, `💸 ${hit.name} knackt die ${money(S.goal)} und gewinnt!`);
    }
  }

  // ---------- Karten ----------
  function drawCard(S, deck) {
    let id = S.decks[deck].shift();
    if (MOOD.wantsReroll(S, curP(S), CARDS[deck][id])) { S.decks[deck].push(id); id = S.decks[deck].shift(); }
    S.card = { deck, id };
    S.sub = 'card';
    if (curP(S).stats) curP(S).stats.cards++;
    log(S, `${curP(S).name} zieht eine ${DECK_NAME[deck]}.`);
  }

  function cardOk(S) {
    const { deck, id } = S.card;
    const c = CARDS[deck][id];
    if (c.t !== 'jailfree') S.decks[deck].push(id);
    S.card = null;
    applyCard(S, curP(S), c, deck);
  }

  function cardRedraw(S) {
    const p = curP(S);
    const { deck, id } = S.card;
    S.decks[deck].push(id);
    p.used.april = true;
    const id2 = S.decks[deck].shift();
    S.card = { deck, id: id2, redrawn: true };
    log(S, `April legt die Karte zurück und zieht neu. 💖`);
  }

  function applyCard(S, p, c, deck) {
    const others = active(S).filter(o => o.id !== p.id);
    if (p.token === 'cat' && !p.used.cat && MOOD.cardTone(c) < 0) {
      p.used.cat = true;
      log(S, `🐈 Glückskatze! Die fiese Karte prallt an ${p.name} ab.`);
      return proceed(S);
    }
    const cm = RL.cardMult(S), cam = p.token === 'camera' ? 1.5 : 1;
    switch (c.t) {
      case 'move': moveTo(S, p, BD.moveMap ? (BD.moveMap[c.to] ?? c.to) : c.to); return land(S, p);
      case 'money':
        if (c.amt >= 0) { p.money += Math.round(c.amt * cm * cam); return proceed(S); }
        if (charge(S, p, [{ to: null, amt: Math.round(-c.amt * MOOD.badMult(S) * cm) }])) proceed(S);
        return;
      case 'payEach':
        if (charge(S, p, others.map(o => ({ to: o.id, amt: Math.round(c.amt * MOOD.badMult(S) * cm) })))) proceed(S);
        return;
      case 'collectEach':
        for (const o of others) {
          const x = Math.min(o.money, Math.round(c.amt * cm * cam));
          o.money -= x; p.money += x;
        }
        return proceed(S);
      case 'back': moveBy(S, p, -c.n); return land(S, p);
      case 'forward': moveBy(S, p, c.n); return land(S, p);
      case 'fromRichest': {
        const rich = others.slice().sort((a, b) => b.money - a.money)[0];
        if (rich) {
          const x = Math.min(rich.money, Math.round(c.amt * cm * cam));
          rich.money -= x; p.money += x;
          log(S, `${rich.name} ist am reichsten und zahlt ${money(x)} an ${p.name}.`);
        }
        return proceed(S);
      }
      case 'nearestRail': {
        const t = RAILS.find(i => i > p.pos) ?? RAILS[0];
        moveTo(S, p, t); S.cardMult = 2;
        return land(S, p);
      }
      case 'nearestUtil': {
        const t = UTILS.find(i => i > p.pos) ?? UTILS[0];
        moveTo(S, p, t); S.utilCard = true;
        return land(S, p);
      }
      case 'jailfree': p.jailFree.push(deck); return proceed(S);
      case 'jail': sendJail(S, p); return proceed(S);
      case 'repairs': {
        let amt = 0;
        for (const k in S.props) {
          const st = S.props[k];
          if (st.owner !== p.id) continue;
          amt += st.houses === 5 ? c.hotel : st.houses * c.house;
        }
        log(S, `${p.name} zahlt ${money(amt)} für Reparaturen.`);
        if (amt === 0 || charge(S, p, [{ to: null, amt }])) proceed(S);
        return;
      }
      case 'period':
        p.skip = (p.skip || 0) + 1;
        if (charge(S, p, [{ to: null, amt: c.amt }])) proceed(S);
        return;
    }
    proceed(S);
  }

  // ---------- Casino ----------
  function enterCasino(S, p, idx, owner, stake) {
    const sp = SPACES[idx], game = CASINO.GAMES[sp.group], level = S.props[idx].houses;
    S.casino = Object.assign({ idx, pid: p.id, owner: owner.id, game, stake, level, chance: CASINO.chance(game, level, MOOD.luck(S, p)), rig: CASINO.rig(level, MOOD.luck(S, p)) }, CASINO.setup(game));
    S.sub = 'casino';
    log(S, `🎰 ${p.name} betritt ${sp.name} von ${owner.name}: ${CASINO.INFO[game].name} um ${money(stake)}.`);
  }

  function casinoResolve(S, r, choice) {
    const c = S.casino, p = P(S, c.pid), owner = P(S, c.owner), sp = SPACES[c.idx];
    S.casinoSeq = (S.casinoSeq || 0) + 1;
    S.casinoShow = { seq: S.casinoSeq, game: c.game, idx: c.idx, pid: p.id, owner: owner.id, stake: c.stake, choice, win: !!r.win, push: !!r.push, jackpot: !!r.jackpot, show: r.show || null, bj: c.bj || null, card: c.card };
    S.casino = null;
    if (r.push) { log(S, `🤝 Unentschieden bei ${sp.name}. ${p.name} behält den Einsatz.`); return proceed(S); }
    if (r.win) {
      const amt = Math.round(c.stake * (r.mult || 1));
      const pay = Math.min(owner.money, amt);
      owner.money -= pay; p.money += pay;
      S.casinoShow.paid = pay;
      log(S, `🎉 ${p.name} gewinnt ${r.jackpot ? 'den JACKPOT ' : ''}bei ${sp.name} und kassiert ${money(pay)} von ${owner.name}${pay < amt ? ' (mehr hatte das Casino nicht)' : ''}!`);
      MOOD.casino(S, p, owner, pay, true);
      return proceed(S);
    }
    log(S, `💸 ${p.name} verliert bei ${sp.name} und zahlt ${money(c.stake)} an ${owner.name}.`);
    if (p.stats) { p.stats.rentPaid += c.stake; p.stats.maxRent = Math.max(p.stats.maxRent, c.stake); }
    if (owner.stats) owner.stats.rentGot += c.stake;
    MOOD.casino(S, p, owner, c.stake, false);
    if (charge(S, p, [{ to: owner.id, amt: c.stake }])) proceed(S);
  }

  function casinoPlay(S, choice) {
    const c = S.casino;
    const info = CASINO.INFO[c.game];
    choice = String(choice);
    if (!info.choices.some(([k]) => k === choice)) return 'Ungültige Wahl.';
    if (c.game === 'blackjack') {
      if (c.bj) return 'Die Karten liegen schon.';
      c.bj = CASINO.bjDeal();
      if (CASINO.value(c.bj.player) === 21) casinoResolve(S, CASINO.bjDealer(c.bj, c.rig), choice);
      return null;
    }
    casinoResolve(S, CASINO.play(c.game, choice, c.chance, c), choice);
    return null;
  }

  // ---------- Kaufen & Versteigern ----------
  function buy(S) {
    const p = curP(S), idx = p.pos;
    const price = buyPrice(p, idx);
    if (p.money < price) return 'Nicht genug Dulis.';
    p.money -= price;
    S.props[idx].owner = p.id;
    if (p.stats) p.stats.bought++;
    log(S, `${p.name} kauft ${SPACES[idx].name} für ${money(price)}.`);
    quip(S, 'buy', 0.15);
    proceed(S);
    return null;
  }

  function startAuction(S) {
    const n = S.players.length, order = [];
    for (let i = 0; i < n; i++) {
      const p = S.players[(S.cur + i) % n];
      if (!p.bankrupt) order.push(p.id);
    }
    S.auction = { idx: curP(S).pos, high: 0, highId: null, active: order, turn: 0 };
    S.sub = 'auction';
    log(S, `${SPACES[S.auction.idx].name} wird versteigert!`);
  }

  function auctionAdvance(S) {
    const a = S.auction;
    if (a.active.length === 0) return endAuction(S);
    if (a.active.length === 1 && a.highId === a.active[0]) return endAuction(S);
    a.turn = (a.turn + 1) % a.active.length;
    if (a.active[a.turn] === a.highId && a.active.length > 1) a.turn = (a.turn + 1) % a.active.length;
  }

  function auctionBid(S, pid, amt) {
    const a = S.auction, p = P(S, pid);
    amt = Math.floor(Number(amt));
    if (!(amt > a.high)) return 'Das Gebot muss höher sein.';
    if (amt > p.money) return 'So viel Dulis hast du nicht.';
    a.high = amt; a.highId = pid;
    log(S, `${p.name} bietet ${money(amt)}.`);
    auctionAdvance(S);
    return null;
  }

  function auctionPass(S, pid) {
    const a = S.auction;
    log(S, `${P(S, pid).name} steigt aus.`);
    a.active.splice(a.turn, 1);
    if (a.active.length === 0) return endAuction(S);
    if (a.active.length === 1 && (a.highId === a.active[0] || a.highId != null)) return endAuction(S);
    a.turn = a.turn % a.active.length;
    if (a.active[a.turn] === a.highId && a.active.length > 1) a.turn = (a.turn + 1) % a.active.length;
  }

  function endAuction(S) {
    const a = S.auction;
    if (a.highId) {
      const w = P(S, a.highId);
      w.money -= a.high;
      S.props[a.idx].owner = w.id;
      log(S, `${w.name} ersteigert ${SPACES[a.idx].name} für ${money(a.high)}.`);
    } else {
      log(S, `Niemand will ${SPACES[a.idx].name}. Bleibt bei der Bank.`);
    }
    S.auction = null;
    proceed(S);
  }

  // ---------- Häuser & Hypotheken ----------
  function build(S, p, idx) {
    const sp = SPACES[idx], st = S.props[idx];
    if (!sp || sp.type !== 'prop' || st.owner !== p.id) return 'Das gehört dir nicht.';
    if (!ownsGroup(S, p.id, sp.group)) return 'Du brauchst zuerst die ganze Farbgruppe.';
    const g = groupIdx(sp.group);
    if (g.some(i => S.props[i].mort)) return 'In der Gruppe ist noch eine Hypothek.';
    if (st.houses >= 5) return 'Hier steht schon ein Hotel.';
    const min = Math.min(...g.map(i => S.props[i].houses));
    if (st.houses > min && !RL.on(S, 'freeBuild')) return 'Gleichmäßig bauen! Erst die anderen Felder der Gruppe.';
    const cost = houseCost(p, sp.group, S);
    if (p.money < cost) return 'Nicht genug Dulis.';
    const sup = bankSupply(S);
    if (st.houses === 4 ? sup.hotels < 1 : sup.houses < 1) return 'Die Bank hat keine Gebäude mehr.';
    p.money -= cost;
    st.houses++;
    if (p.stats) p.stats.built++;
    if (S.isCasino) log(S, `😈 ${p.name} macht ${sp.name} korrupter: ${CASINO.LEVELS[st.houses]}.`);
    else log(S, `${p.name} baut ${st.houses === 5 ? 'ein Hotel' : 'ein Haus'} auf ${sp.name}.`);
    if (st.houses === 5) MOOD.built(S, p, sp.name);
    return null;
  }

  function sell(S, p, idx) {
    const sp = SPACES[idx], st = S.props[idx];
    if (!sp || sp.type !== 'prop' || st.owner !== p.id || st.houses === 0) return 'Hier gibt es nichts zu verkaufen.';
    const g = groupIdx(sp.group);
    const max = Math.max(...g.map(i => S.props[i].houses));
    if (st.houses < max && !RL.on(S, 'freeBuild')) return 'Gleichmäßig verkaufen! Erst die anderen Felder der Gruppe.';
    const back = Math.floor(GROUPS[sp.group].house / 2);
    st.houses--;
    p.money += back;
    log(S, `${p.name} verkauft ein Gebäude auf ${sp.name} für ${money(back)}.`);
    return null;
  }

  function mortgage(S, p, idx) {
    const sp = SPACES[idx], st = S.props[idx];
    if (!st || st.owner !== p.id) return 'Das gehört dir nicht.';
    if (st.mort) return 'Schon hypothekiert.';
    if (sp.type === 'prop' && groupHasHouses(S, sp.group)) return 'Erst alle Häuser der Gruppe verkaufen.';
    st.mort = true;
    const val = Math.round(sp.price * (p.token === 'duck' ? 0.6 : 0.5));
    p.money += val;
    log(S, `${p.name} nimmt eine Hypothek auf ${sp.name} auf (+${money(val)}).`);
    return null;
  }

  function unmortgage(S, p, idx) {
    const sp = SPACES[idx], st = S.props[idx];
    if (!st || st.owner !== p.id || !st.mort) return 'Keine Hypothek vorhanden.';
    const cost = unmortgageCost(idx);
    if (p.money < cost) return 'Nicht genug Dulis.';
    p.money -= cost;
    st.mort = false;
    log(S, `${p.name} löst die Hypothek auf ${sp.name} ab (${money(cost)}).`);
    return null;
  }

  // ---------- Schulden & Bankrott ----------
  function payDebt(S) {
    const d = S.debt, p = P(S, d.pid);
    const total = d.items.reduce((a, b) => a + b.amt, 0);
    if (p.money < total) return `Dir fehlen noch ${money(total - p.money)}.`;
    for (const it of d.items) {
      p.money -= it.amt;
      if (it.to) P(S, it.to).money += it.amt;
      else toBank(S, it.amt);
    }
    S.debt = null;
    log(S, `${p.name} hat die Schulden bezahlt.`);
    if (d.afterMove != null) doMove(S, p, d.afterMove);
    else if (d.afterTax) S.sub = 'roll';
    else proceed(S);
    return null;
  }

  function bankrupt(S, pid) {
    const p = P(S, pid);
    const d = S.debt && S.debt.pid === pid ? S.debt : null;
    const creditors = d ? [...new Set(d.items.map(i => i.to).filter(Boolean))] : [];
    const heir = creditors.length === 1 ? P(S, creditors[0]) : null;
    for (const k in S.props) {
      const st = S.props[k];
      if (st.owner !== pid) continue;
      const sp = SPACES[k];
      if (heir) {
        if (st.houses) p.money += Math.floor(st.houses * GROUPS[sp.group].house / 2);
        st.houses = 0;
        st.owner = heir.id;
      } else {
        st.owner = null; st.houses = 0; st.mort = false;
      }
    }
    if (heir) {
      heir.money += p.money;
      heir.jailFree.push(...p.jailFree);
      log(S, `${p.name} ist pleite! Alles geht an ${heir.name}.`);
    } else {
      for (const deck of p.jailFree) S.decks[deck].push(CARDS[deck].findIndex(c => c.t === 'jailfree'));
      log(S, `${p.name} ist pleite! Alles geht zurück an die Bank.`);
    }
    if (MOOD.on(S)) MOOD.bankrupt(S, p); else quip(S, 'bankrupt', 1);
    if (S.casino && S.casino.pid === pid) S.casino = null;
    p.jailFree = [];
    p.money = 0; p.bankrupt = true; p.inJail = false;
    if (d) S.debt = null;
    if (S.trade && (S.trade.from === pid || S.trade.to === pid)) S.trade = null;
    if (S.auction) {
      const a = S.auction, i = a.active.indexOf(pid);
      if (i >= 0) { a.turn = i; auctionPass(S, pid); }
    }
    const left = active(S);
    if (left.length === 1) {
      S.phase = 'over';
      S.winner = left[0].id;
      S.ranking = rank(S);
      log(S, `🏆 ${left[0].name} gewinnt Dulidanopoly!`);
      return;
    }
    if (curP(S).id === pid) nextTurn(S);
  }

  // Vermögen pro Runde für das Diagramm am Spielende (bei langen Spielen ausgedünnt)
  function recordHist(S) {
    if (!S.hist) S.hist = [];
    S.hist.push(S.players.map(p => (p.bankrupt ? 0 : Math.round(netWorth(S, p)))));
    if (S.hist.length > 160) S.hist = S.hist.filter((_, i) => i % 2 === 0);
  }

  function rank(S) {
    return S.players
      .map(p => ({ id: p.id, worth: p.bankrupt ? 0 : netWorth(S, p) }))
      .sort((a, b) => b.worth - a.worth);
  }

  function endGame(S) {
    S.ranking = rank(S);
    S.phase = 'over';
    S.winner = S.ranking[0].id;
    log(S, `Spiel beendet. 🏆 ${P(S, S.winner).name} ist am reichsten!`);
  }

  // ---------- Handel ----------
  function validOffer(S, pid, side) {
    const p = P(S, pid);
    side.money = Math.max(0, Math.floor(Number(side.money) || 0));
    side.jf = Math.max(0, Math.floor(Number(side.jf) || 0));
    side.props = (side.props || []).map(Number);
    if (side.money > p.money) return `${p.name} hat nicht so viel Dulis.`;
    if (side.jf > p.jailFree.length) return `${p.name} hat nicht so viele Freikarten.`;
    for (const i of side.props) {
      const st = S.props[i];
      if (!st || st.owner !== pid) return `${SPACES[i] ? SPACES[i].name : 'Feld'} gehört nicht ${p.name}.`;
      if (SPACES[i].type === 'prop' && groupHasHouses(S, SPACES[i].group)) return `Auf der Gruppe von ${SPACES[i].name} stehen noch Häuser.`;
    }
    return null;
  }

  function proposeTrade(S, from, t) {
    const to = P(S, t.to);
    if (!to || to.bankrupt || to.id === from) return 'Ungültiger Handelspartner.';
    const give = { props: t.give.props, money: t.give.money, jf: t.give.jf };
    const get = { props: t.get.props, money: t.get.money, jf: t.get.jf };
    const e = validOffer(S, from, give) || validOffer(S, to.id, get);
    if (e) return e;
    if (!give.props.length && !get.props.length && !give.money && !get.money && !give.jf && !get.jf) return 'Das Angebot ist leer.';
    S.trade = { from, to: to.id, give, get };
    log(S, `${P(S, from).name} macht ${to.name} ein Angebot.`);
    return null;
  }

  function moveSide(S, fromP, toP, side) {
    for (const i of side.props) S.props[i].owner = toP.id;
    fromP.money -= side.money; toP.money += side.money;
    for (let k = 0; k < side.jf; k++) toP.jailFree.push(fromP.jailFree.pop());
  }

  function acceptTrade(S) {
    const t = S.trade;
    const e = validOffer(S, t.from, t.give) || validOffer(S, t.to, t.get);
    if (e) { S.trade = null; return e; }
    const a = P(S, t.from), b = P(S, t.to);
    moveSide(S, a, b, t.give);
    moveSide(S, b, a, t.get);
    S.trade = null;
    log(S, `Deal! ${a.name} und ${b.name} haben gehandelt. 🤝`);
    return null;
  }


  // ---------- SPLIT OR STEAL an Aprils Spardose ----------
  function sosClaim(S, pid, claim) {
    const x = S.sos;
    if (!x || S.sub !== 'sos' || x.a !== pid || x.claim) return 'Gerade nichts zu behaupten.';
    if (!['split', 'steal'].includes(claim)) return 'Ungültig.';
    x.claim = claim;
    log(S, `🗣️ ${P(S, pid).name} sagt: „${claim === 'split' ? 'Ich teile, versprochen!' : 'Ich klaue. Ehrlich.'}“ – Wahrheit oder Lüge?`);
    return null;
  }
  function sosPick(S, pid, pick) {
    const x = S.sos;
    if (!x || S.sub !== 'sos' || !x.claim || ![x.a, x.b].includes(pid) || x.pick[pid]) return 'Gerade nichts zu wählen.';
    if (!['split', 'steal'].includes(pick)) return 'Ungültig.';
    x.pick[pid] = pick;
    if (!x.pick[x.a] || !x.pick[x.b]) return null;
    const a = P(S, x.a), b = P(S, x.b), pa = x.pick[x.a], pb = x.pick[x.b];
    let msg;
    if (pa === 'split' && pb === 'split') {
      const h = Math.floor(x.pot / 2);
      a.money += h; b.money += x.pot - h; S.pot = 0;
      msg = `🤝 Beide teilen! ${a.name} und ${b.name} bekommen je ${money(h)}.`;
    } else if (pa === 'steal' && pb === 'steal') {
      msg = `💀 Beide klauen! Niemand bekommt was. April behält die Spardose (${money(x.pot)}).`;
    } else {
      const w = pa === 'steal' ? a : b, l = w === a ? b : a;
      w.money += x.pot; S.pot = 0;
      msg = `🗡️ ${w.name} klaut die ganze Spardose (${money(x.pot)})! ${l.name} hat ${w === a ? 'die Lüge geglaubt' : 'zu früh vertraut'}.`;
    }
    const lied = x.claim !== pa;
    log(S, `${msg} ${a.name} hat ${lied ? 'gelogen' : 'die Wahrheit gesagt'}.`);
    S.sosShow = { seq: (S.sosShow ? S.sosShow.seq : 0) + 1, turn: S.turnNo, a: x.a, b: x.b, pa, pb, claim: x.claim, pot: x.pot };
    S.sos = null;
    proceed(S);
    return null;
  }

  // ---------- WAR: Gebiete erobern ----------
  function defense(S, idx) {
    const st = S.props[idx], sp = SPACES[idx];
    return 1 + (st.gar || 0) + 2 * st.houses + (sp.type === 'prop' && st.owner && ownsGroup(S, st.owner, sp.group) ? 2 : 0);
  }
  function battleDice(att, def) {
    const rolls = [];
    while (att > 0 && def > 0) {
      const a = Array.from({ length: Math.min(3, att) }, d6).sort((x, y) => y - x);
      const d = Array.from({ length: Math.min(2, def) }, d6).sort((x, y) => y - x);
      for (let i = 0; i < Math.min(a.length, d.length); i++) { if (a[i] > d[i]) def--; else att--; }
      if (rolls.length < 8) rolls.push([a, d]);
    }
    return { att, def, rolls };
  }
  function warPay(S, p) {
    const w = S.war;
    if (!w || S.sub !== 'war' || w.att !== p.id) return 'Kein Krieg offen.';
    const o = P(S, w.def);
    S.war = null;
    log(S, `${p.name} zahlt ${money(w.rent)} Tribut an ${o.name}.`);
    if (p.stats) { p.stats.rentPaid += w.rent; p.stats.maxRent = Math.max(p.stats.maxRent, w.rent); }
    if (o.stats) o.stats.rentGot += w.rent;
    MOOD.rentPaid(S, p, o, w.rent);
    if (charge(S, p, [{ to: o.id, amt: w.rent }])) proceed(S);
    return null;
  }
  function warAttack(S, p, n) {
    const w = S.war;
    if (!w || S.sub !== 'war' || w.att !== p.id) return 'Kein Krieg offen.';
    n = Math.floor(Number(n));
    if (!(n >= 1) || n > (p.troops || 0)) return `Du hast nur ${p.troops || 0} Truppen.`;
    const st = S.props[w.idx], sp = SPACES[w.idx], o = P(S, w.def);
    const defN = defense(S, w.idx);
    const r = battleDice(n, defN);
    p.troops -= n;
    p.stats.attacks = (p.stats.attacks || 0) + 1;
    S.war = null;
    S.battle = { seq: (S.battle ? S.battle.seq : 0) + 1, turn: S.turnNo, idx: w.idx, att: p.id, def: o.id, n, defN, win: r.def === 0, left: r.def === 0 ? r.att : r.def, rolls: r.rolls };
    if (r.def === 0) {
      st.owner = p.id;
      st.houses = Math.max(0, st.houses - 1);
      st.gar = r.att;
      p.stats.takeovers = (p.stats.takeovers || 0) + 1;
      log(S, `⚔️ SIEG! ${p.name} erobert ${sp.name} von ${o.name} (${n} gegen ${defN}). ${r.att} Truppen bleiben als Besatzung.`);
      MOOD.built(S, p, sp.name);
      proceed(S);
      return null;
    }
    const base = 1 + 2 * st.houses + (ownsGroup(S, o.id, sp.group) ? 2 : 0);
    st.gar = Math.max(0, r.def - base);
    const half = Math.ceil(w.rent / 2);
    log(S, `🛡️ ${o.name} hält ${sp.name}! ${p.name} verliert ${n} Truppen und zahlt ${money(half)} Reparationen.`);
    if (charge(S, p, [{ to: o.id, amt: half }])) proceed(S);
    return null;
  }
  function deploy(S, p, idx, n) {
    const st = S.props[idx];
    n = Math.floor(Number(n));
    if (!S.isWar || !st || st.owner !== p.id || SPACES[idx].type !== 'prop') return 'Nur auf eigenen Gebieten.';
    if (!(n >= 1) || n > (p.troops || 0)) return 'So viele Truppen hast du nicht.';
    p.troops -= n;
    st.gar = (st.gar || 0) + n;
    log(S, `🪖 ${p.name} stationiert ${n} Truppen in ${SPACES[idx].name} (Verteidigung ${defense(S, idx)}).`);
    return null;
  }

  // ---------- POLITICS: Wahlen und Gesetze ----------
  const LAWS = {
    mietbremse: { icon: '🧾', name: 'Mietpreisbremse', text: 'Alle Mieten −30 %.' },
    deregulierung: { icon: '📈', name: 'Deregulierung', text: 'Alle Mieten +30 %.' },
    reichensteuer: { icon: '💰', name: 'Reichensteuer', text: 'Jede Runde zahlt die reichste Person 10 % ihres Bargelds (max. Ð300) in Aprils Spardose.' },
    grundeinkommen: { icon: '🤲', name: 'Grundeinkommen', text: 'Jede Runde bekommen alle Ð50 von der Bank.' },
    baufoerderung: { icon: '🏗️', name: 'Bauförderung', text: 'Häuser und Hotels kosten die Hälfte.' },
    maut: { icon: '🚧', name: 'PKW-Maut', text: 'Über LOS gibt es Ð100 weniger.' },
    lobby: { icon: '🤝', name: 'Lobbygesetz', text: 'Die Regierung kassiert 10 % jeder gezahlten Miete extra von der Bank.' },
    steuersenkung: { icon: '✂️', name: 'Steuersenkung', text: 'Steuerfelder kosten die Hälfte.' },
    abgabe: { icon: '⚖️', name: 'Vermögensabgabe', text: 'Sofort: Alle mit über Ð2.000 Bargeld zahlen 15 % an die ärmste Person.' },
  };
  function votes(S, p) {
    let v = 0;
    for (const k in S.props) {
      const st = S.props[k], sp = SPACES[k];
      if (st.owner !== p.id || st.mort) continue;
      v += sp.type === 'prop' ? (1 + st.houses) * (ownsGroup(S, p.id, sp.group) ? 1.5 : 1) : 1;
    }
    v += Math.floor(p.money / 400) + (p.camp || 0) + (MOOD.on(S) && p.like >= 70 ? 2 : 0);
    return Math.max(0.5, v);
  }
  function lobbyCut(S, payer, rent) {
    if (!S.pol || S.pol.law !== 'lobby' || !S.pol.kanzler || S.pol.kanzler === payer.id) return;
    const k = P(S, S.pol.kanzler);
    if (!k || k.bankrupt) return;
    const x = Math.round(rent * 0.1);
    if (x > 0) { k.money += x; log(S, `🤝 Lobbygesetz: ${k.name} kassiert ${money(x)} extra.`); }
  }
  function polRound(S) {
    const pol = S.pol, act = active(S);
    const k = pol.kanzler && P(S, pol.kanzler), v = pol.vize && P(S, pol.vize);
    if (k && !k.bankrupt) k.money += 100;
    if (v && !v.bankrupt) v.money += 50;
    if (pol.law === 'grundeinkommen') { act.forEach(p => { p.money += 50; }); log(S, '🤲 Grundeinkommen: Alle bekommen Ð50.'); }
    if (pol.law === 'reichensteuer') {
      const rich = act.slice().sort((a, b) => b.money - a.money)[0];
      const x = Math.min(300, Math.floor(rich.money * 0.1));
      if (x > 0) { rich.money -= x; S.pot = (S.pot || 0) + x; log(S, `💰 Reichensteuer: ${rich.name} zahlt ${money(x)} in Aprils Spardose.`); }
    }
    if (S.round % pol.every === 0) election(S);
  }
  function election(S) {
    const act = active(S), pol = S.pol;
    const v = act.map(p => votes(S, p)), total = v.reduce((a, b) => a + b, 0);
    const raw = v.map(x => (x / total) * 100), seats = raw.map(Math.floor);
    let left = 100 - seats.reduce((a, b) => a + b, 0);
    raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { seats[i]++; left--; } });
    const order = act.map((p, i) => ({ p, s: seats[i] })).sort((a, b) => b.s - a.s);
    const top = order[0], second = order[1];
    const majority = top.s > 50;
    pol.kanzler = top.p.id;
    pol.vize = majority ? null : second.p.id;
    pol.wins[top.p.id] = (pol.wins[top.p.id] || 0) + 1;
    pol.last = { round: S.round, seats: Object.fromEntries(order.map(o => [o.p.id, o.s])), kanzler: pol.kanzler, vize: pol.vize };
    act.forEach(p => { p.camp = 0; });
    log(S, `🗳️ BUNDESTAGSWAHL! ${order.map(o => `${o.p.name} ${o.s}`).join(' · ')} Sitze. ${top.p.name} wird Kanzler${majority ? ' mit absoluter Mehrheit' : `, Koalition mit ${second.p.name}`}.`);
    if (pol.wins[top.p.id] >= 3) {
      S.ranking = rank(S);
      S.phase = 'over';
      S.winner = top.p.id;
      log(S, `🏛️ ${top.p.name} gewinnt die dritte Wahl und regiert für immer. Spiel vorbei!`);
      return;
    }
    const ids = shuffle(Object.keys(LAWS).filter(id => id !== pol.law)).slice(0, 3);
    pol.pending = { opts: ids };
  }
  function enactLaw(S, pid, id) {
    const pol = S.pol;
    if (!pol || !pol.pending || pol.kanzler !== pid) return 'Nur die Regierung macht Gesetze.';
    if (!pol.pending.opts.includes(id)) return 'Dieses Gesetz steht nicht zur Wahl.';
    pol.law = id;
    pol.pending = null;
    const L = LAWS[id];
    log(S, `📜 Neues Gesetz von ${P(S, pid).name}: ${L.icon} ${L.name} – ${L.text}`);
    if (id === 'abgabe') {
      const act = active(S), poor = act.slice().sort((a, b) => a.money - b.money)[0];
      let sum = 0;
      act.forEach(p => { if (p.money > 2000 && p !== poor) { const x = Math.floor(p.money * 0.15); p.money -= x; sum += x; } });
      poor.money += sum;
      log(S, `⚖️ Vermögensabgabe: ${poor.name} bekommt ${money(sum)}.`);
      pol.law = null;
    }
    if (S.sub === 'law') S.sub = 'roll';
    return null;
  }
  function campaign(S, p, amt) {
    amt = Number(amt);
    if (!S.isPol || ![100, 250, 500].includes(amt)) return 'Ungültig.';
    if (p.money < amt) return 'Zu wenig Geld für den Wahlkampf.';
    p.money -= amt;
    p.camp = (p.camp || 0) + amt / 100;
    log(S, `📣 ${p.name} steckt ${money(amt)} in den Wahlkampf (+${amt / 100} Stimmen).`);
    return null;
  }
  function botLaw(S, p) {
    const opts = S.pol.pending.opts;
    const act = active(S), richest = act.slice().sort((a, b) => b.money - a.money)[0], poorest = act.slice().sort((a, b) => a.money - b.money)[0];
    const houses = Object.values(S.props).filter(st => st.owner === p.id).reduce((a, st) => a + st.houses, 0);
    const score = (id) => ({
      deregulierung: houses * 2, mietbremse: -houses, lobby: 4, baufoerderung: 3,
      reichensteuer: richest.id === p.id ? -5 : 3, abgabe: poorest.id === p.id ? 8 : p.money > 2000 ? -4 : 1,
      grundeinkommen: 2, steuersenkung: 1, maut: 0,
    }[id] || 0) + rng();
    return opts.slice().sort((a, b) => score(b) - score(a))[0];
  }

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    const err = actInner(S, pid, a);
    if (!err && S.isLogi) pruneTracks(S);
    if (!err) checkGoal(S);
    return err;
  }

  // ---------- LOGISTICS: Schienen ----------
  function buildTrack(S, p, a, b) {
    const l = LG.line(a, b);
    if (!l) return 'Zwischen diesen Bahnhöfen gibt es keine Strecke.';
    if ((S.tracks || []).some(t => LG.key(t.a, t.b) === LG.key(a, b))) return 'Die Schiene liegt schon.';
    if (![a, b].every(i => S.props[i] && S.props[i].owner === p.id && !S.props[i].mort)) return 'Dir müssen beide Bahnhöfe gehören (ohne Hypothek).';
    const cost = trackCost(S, a, b);
    if (p.money < cost) return `Die Schiene kostet ${money(cost)}.`;
    p.money -= cost;
    S.tracks.push({ a, b, owner: p.id, cost });
    if (p.stats) p.stats.built++;
    const n = LG.network(S, a).length;
    log(S, `🛤️ ${p.name} baut die Strecke ${SPACES[a].name} – ${SPACES[b].name} (${l.km} km) für ${money(cost)}. Netz: ${n} Bahnhöfe.`);
    if (n >= 5) MOOD.built(S, p, `ein Netz mit ${n} Bahnhöfen`);
    return null;
  }
  const trackCost = (S, a, b) => Math.max(10, Math.round(LG.trackCost(a, b) * RL.buildFactor(S) / 5) * 5);
  function sellTrack(S, p, a, b) {
    const t = (S.tracks || []).find(x => x.owner === p.id && LG.key(x.a, x.b) === LG.key(a, b));
    if (!t) return 'Diese Schiene gehört dir nicht.';
    S.tracks = S.tracks.filter(x => x !== t);
    const back = Math.floor(t.cost / 2);
    p.money += back;
    log(S, `${p.name} baut die Schiene ${SPACES[a].name} – ${SPACES[b].name} zurück (+${money(back)}).`);
    return null;
  }
  // Wechselt ein Bahnhof den Besitzer, werden fremde Schienen daran abgebaut
  function pruneTracks(S) {
    const gone = (S.tracks || []).filter(t => ![t.a, t.b].every(i => S.props[i] && S.props[i].owner === t.owner));
    if (!gone.length) return;
    S.tracks = S.tracks.filter(t => !gone.includes(t));
    gone.forEach(t => log(S, `🚧 Die Schiene ${SPACES[t.a].name} – ${SPACES[t.b].name} wird abgebaut (Bahnhof hat den Besitzer gewechselt).`));
  }

  function actInner(S, pid, a) {
    const p = P(S, pid);
    if (!a || !a.type) return 'Ungültige Aktion.';
    if (S.phase === 'lobby') {
      if (a.type === 'pickToken') return p ? pickToken(S, pid, a.token) : 'Du bist nicht im Raum.';
      return 'Das Spiel hat noch nicht begonnen.';
    }
    if (S.phase !== 'play') return 'Das Spiel ist vorbei.';
    if (!p || p.bankrupt) return 'Du spielst nicht mit.';
    if (a.type === 'sosClaim') return sosClaim(S, pid, a.claim);
    if (a.type === 'sosPick') return sosPick(S, pid, a.pick);
    if (a.type === 'law') return S.sub === 'law' ? enactLaw(S, pid, a.id) : 'Gerade wird kein Gesetz gemacht.';
    if (S.sub === 'sos' || S.sub === 'law') return S.sub === 'sos' ? 'Erst Split or Steal klären.' : 'Erst muss die Regierung ein Gesetz machen.';
    const isCur = curP(S).id === pid;
    const needCur = () => (isCur ? null : 'Du bist nicht dran.');
    const manageOk = () => (isCur && ['roll', 'end', 'debt', 'buy'].includes(S.sub) ? null : 'Das geht nur in deinem Zug.');

    switch (a.type) {
      case 'roll':
        if (needCur() || S.sub !== 'roll') return 'Gerade kannst du nicht würfeln.';
        if (S.trade) return 'Erst das offene Angebot klären.';
        roll(S); return null;
      case 'payJail':
        if (needCur() || S.sub !== 'roll' || !p.inJail) return 'Geht gerade nicht.';
        if (p.money < 50) return 'Nicht genug Dulis.';
        p.money -= 50; toBank(S, 50); p.inJail = false; p.jailTries = 0;
        log(S, `${p.name} zahlt ${money(50)} und verlässt Düsseldorf.`);
        return null;
      case 'useJailCard': {
        if (needCur() || S.sub !== 'roll' || !p.inJail || !p.jailFree.length) return 'Geht gerade nicht.';
        const deck = p.jailFree.pop();
        S.decks[deck].push(CARDS[deck].findIndex(c => c.t === 'jailfree'));
        p.inJail = false; p.jailTries = 0;
        log(S, `${p.name} nutzt die Freikarte und verlässt Düsseldorf.`);
        return null;
      }
      case 'armBerlingo':
        if (needCur() || S.sub !== 'roll' || p.token !== 'berlingo' || p.used.berlingo || p.inJail) return 'Geht gerade nicht.';
        S.berlingoArmed = !S.berlingoArmed;
        return null;
      case 'berlingoMove': {
        if (needCur() || S.sub !== 'berlingo') return 'Geht gerade nicht.';
        const dlt = Math.max(-1, Math.min(1, Math.round(Number(a.d) || 0)));
        S.berlingoArmed = false;
        const sum = S.pendingMove; S.pendingMove = null;
        if (dlt !== 0) { p.used.berlingo = true; log(S, `Berlingo-Manöver! ${p.name} fährt ${dlt > 0 ? '1 Feld weiter' : '1 Feld weniger'}. 🚐`); }
        doMove(S, p, sum + dlt);
        return null;
      }
      case 'buy':
        if (needCur() || S.sub !== 'buy') return 'Geht gerade nicht.';
        return buy(S);
      case 'auction':
        if (needCur() || S.sub !== 'buy') return 'Geht gerade nicht.';
        if (RL.on(S, 'noAuction')) { log(S, `${p.name} lässt ${SPACES[p.pos].name} liegen.`); proceed(S); return null; }
        startAuction(S); return null;
      case 'bid':
        if (S.sub !== 'auction' || S.auction.active[S.auction.turn] !== pid) return 'Du bist beim Bieten nicht dran.';
        return auctionBid(S, pid, a.amt);
      case 'pass':
        if (S.sub !== 'auction' || S.auction.active[S.auction.turn] !== pid) return 'Du bist beim Bieten nicht dran.';
        auctionPass(S, pid); return null;
      case 'cardOk':
        if (needCur() || S.sub !== 'card') return 'Geht gerade nicht.';
        cardOk(S); return null;
      case 'cardRedraw':
        if (needCur() || S.sub !== 'card' || p.token !== 'april' || p.used.april) return 'Geht gerade nicht.';
        cardRedraw(S); return null;
      case 'casinoPlay':
        if (needCur() || S.sub !== 'casino' || !S.casino) return 'Geht gerade nicht.';
        return casinoPlay(S, a.choice);
      case 'bjHit': {
        const c = S.casino;
        if (needCur() || S.sub !== 'casino' || !c || !c.bj || c.bj.over) return 'Geht gerade nicht.';
        const v = CASINO.bjHit(c.bj);
        if (v > 21) { c.bj.over = true; casinoResolve(S, { win: false }, 'go'); }
        else if (v === 21) casinoResolve(S, CASINO.bjDealer(c.bj, c.rig), 'go');
        return null;
      }
      case 'bjStand': {
        const c = S.casino;
        if (needCur() || S.sub !== 'casino' || !c || !c.bj || c.bj.over) return 'Geht gerade nicht.';
        casinoResolve(S, CASINO.bjDealer(c.bj, c.rig), 'go');
        return null;
      }
      case 'bribe': {
        if (needCur() || !['roll', 'end'].includes(S.sub)) return 'Bestechen geht vor dem Würfeln oder am Ende deines Zuges.';
        const r = MOOD.bribe(S, p, a.amt);
        if (r.err) return r.err;
        toBank(S, Number(a.amt));
        return null;
      }
      case 'endTurn':
        if (needCur() || S.sub !== 'end') return 'Du kannst deinen Zug noch nicht beenden.';
        if (S.trade) return 'Erst das offene Angebot klären.';
        nextTurn(S); return null;
      case 'build': return manageOk() || build(S, p, Number(a.idx));
      case 'warPay': return needCur() || warPay(S, p);
      case 'warAttack': return needCur() || warAttack(S, p, a.n);
      case 'deploy': return manageOk() || deploy(S, p, Number(a.idx), a.n);
      case 'campaign': return manageOk() || campaign(S, p, a.amt);
      case 'track': return manageOk() || (S.isLogi ? buildTrack(S, p, Number(a.a), Number(a.b)) : 'Nur in LOGISTICS.');
      case 'untrack': return manageOk() || (S.isLogi ? sellTrack(S, p, Number(a.a), Number(a.b)) : 'Nur in LOGISTICS.');
      case 'sell': return manageOk() || sell(S, p, Number(a.idx));
      case 'mortgage': return manageOk() || mortgage(S, p, Number(a.idx));
      case 'unmortgage': return manageOk() || unmortgage(S, p, Number(a.idx));
      case 'payDebt':
        if (S.sub !== 'debt' || S.debt.pid !== pid) return 'Du hast keine Schulden.';
        return payDebt(S);
      case 'bankrupt':
        if (S.sub !== 'debt' || S.debt.pid !== pid) return 'Bankrott geht nur, wenn du nicht zahlen kannst.';
        bankrupt(S, pid); return null;
      case 'tradePropose':
        if (needCur() || !['roll', 'end', 'debt'].includes(S.sub)) return 'Handeln geht nur in deinem Zug.';
        if (S.trade) return 'Es gibt schon ein offenes Angebot.';
        return proposeTrade(S, pid, a.trade || {});
      case 'tradeAccept':
        if (!S.trade || S.trade.to !== pid) return 'Kein Angebot für dich.';
        return acceptTrade(S);
      case 'tradeDecline':
        if (!S.trade || (S.trade.to !== pid && S.trade.from !== pid)) return 'Kein Angebot.';
        log(S, S.trade.to === pid ? `${p.name} lehnt das Angebot ab.` : `${p.name} zieht das Angebot zurück.`);
        S.trade = null; return null;
    }
    return 'Unbekannte Aktion.';
  }


  // ---------- Bots ----------
  const RESERVE = 150;
  function valueFor(S, pid, idx) {
    const sp = SPACES[idx];
    let v = sp.price;
    if (sp.type === 'prop') {
      const g = groupIdx(sp.group);
      const mine = g.filter(i => S.props[i].owner === pid || i === idx).length;
      const others = g.filter(i => S.props[i].owner && S.props[i].owner !== pid).length;
      if (!others) v *= 1 + 0.4 * mine / g.length;
    } else if (sp.type === 'rail') {
      v *= 1 + 0.15 * RAILS.filter(i => S.props[i].owner === pid).length;
    } else if (sp.type === 'station') {
      const nb = LG.LINES.filter(l => l.a === idx || l.b === idx).map(l => (l.a === idx ? l.b : l.a));
      v *= 1 + 0.35 * nb.filter(i => S.props[i].owner === pid).length;
    }
    return v;
  }

  function botManage(S, p) {
    const owned = Object.keys(S.props).map(Number).filter(k => S.props[k].owner === p.id);
    for (const k of owned) {
      if (S.props[k].mort && p.money - unmortgageCost(k) > 450) return { type: 'unmortgage', idx: k };
    }
    if (S.isWar && (p.troops || 0) >= 6) {
      const mine = owned.filter(k => SPACES[k].type === 'prop' && !S.props[k].mort).sort((a, b) => defense(S, a) - defense(S, b) || SPACES[b].price - SPACES[a].price);
      if (mine.length && defense(S, mine[0]) < 8) return { type: 'deploy', idx: mine[0], n: Math.min(3, p.troops - 3) };
    }
    if (S.isPol && S.round % S.pol.every === S.pol.every - 1 && !p.camp && p.money > 700) return { type: 'campaign', amt: p.money > 1500 ? 500 : 250 };
    if (S.isLogi) {
      // Strecke bauen, die das größte Netz ergibt
      const opts = LG.buildable(S, p.id).map(l => {
        const c = trackCost(S, l.a, l.b);
        const n = new Set([...LG.network(S, l.a), ...LG.network(S, l.b)]).size;
        return { l, c, gain: n / c };
      }).filter(o => p.money - o.c >= RESERVE + 100).sort((x, y) => y.gain - x.gain);
      if (opts.length) return { type: 'track', a: opts[0].l.a, b: opts[0].l.b };
      return null;
    }
    const sup = bankSupply(S);
    const cands = owned
      .filter(k => SPACES[k].type === 'prop' && ownsGroup(S, p.id, SPACES[k].group))
      .sort((a, b) => S.props[a].houses - S.props[b].houses || b - a);
    for (const k of cands) {
      const sp = SPACES[k], st = S.props[k], g = groupIdx(sp.group);
      if (st.houses >= 5 || g.some(i => S.props[i].mort)) continue;
      if (st.houses > Math.min(...g.map(i => S.props[i].houses))) continue;
      if (p.money - houseCost(p, sp.group, S) < RESERVE + 100) continue;
      if (st.houses === 4 ? sup.hotels < 1 : sup.houses < 1) continue;
      return { type: 'build', idx: k };
    }
    return null;
  }

  function botRaise(S, p) {
    const owned = Object.keys(S.props).map(Number).filter(k => S.props[k].owner === p.id);
    for (const k of owned) {
      const sp = SPACES[k], st = S.props[k];
      if (sp.type !== 'prop' || !st.houses) continue;
      if (st.houses === Math.max(...groupIdx(sp.group).map(i => S.props[i].houses))) return { type: 'sell', idx: k };
    }
    const mortgageable = owned
      .filter(k => !S.props[k].mort && !(SPACES[k].type === 'prop' && groupHasHouses(S, SPACES[k].group)))
      .sort((a, b) => valueFor(S, p.id, a) - valueFor(S, p.id, b));
    if (mortgageable.length) return { type: 'mortgage', idx: mortgageable[0] };
    return null;
  }

  // Bots handeln: Fehlt nur noch ein Feld zur ganzen Farbgruppe, wird es abgekauft oder getauscht
  function botTradeIdea(S, p) {
    if (S.trade || active(S).length < 2) return null;
    S.botTrades = S.botTrades || {};
    if (S.turnNo - (S.botTrades[p.id] ?? -99) < 4) return null;
    if (S.isLogi) {
      // Bahnhof abkaufen, der direkt an das eigene Netz grenzt
      for (const l of LG.LINES) {
        for (const [mine, want] of [[l.a, l.b], [l.b, l.a]]) {
          const so = S.props[want];
          if (S.props[mine].owner !== p.id || !so.owner || so.owner === p.id || so.mort) continue;
          const o = P(S, so.owner);
          if (!o || o.bankrupt || LG.tracksOf(S, want).length) continue;
          const money = Math.min(p.money - RESERVE, Math.round(SPACES[want].price * (1.7 + rng() * 0.6)));
          if (money < SPACES[want].price * 1.4) continue;
          S.botTrades[p.id] = S.turnNo;
          return { type: 'tradePropose', trade: { to: o.id, give: { props: [], money, jf: 0 }, get: { props: [want], money: 0, jf: 0 } } };
        }
      }
      return null;
    }
    const groups = [...new Set(SPACES.filter(x => x.type === 'prop').map(x => x.group))];
    for (const g of groups) {
      const idx = groupIdx(g);
      if (idx.some(i => !S.props[i].owner)) continue;
      const theirs = idx.filter(i => S.props[i].owner !== p.id);
      if (theirs.length !== 1 || idx.length < 2) continue;
      const k = theirs[0], o = P(S, S.props[k].owner);
      if (!o || o.bankrupt || S.props[k].mort || groupHasHouses(S, g)) continue;
      const completesFor = (j, pid) => groupIdx(SPACES[j].group).every(x => x === j || S.props[x].owner === pid);
      const swap = Object.keys(S.props).map(Number).find(j => S.props[j].owner === p.id && SPACES[j].type === 'prop' && SPACES[j].group !== g
        && !S.props[j].mort && !groupHasHouses(S, SPACES[j].group) && completesFor(j, o.id));
      const price = SPACES[k].price;
      const money = swap != null ? 0 : Math.min(p.money - RESERVE, Math.round(price * (1.6 + rng() * 0.6)));
      if (swap == null && money < price * 1.3) continue;
      S.botTrades[p.id] = S.turnNo;
      return { type: 'tradePropose', trade: { to: o.id, give: { props: swap != null ? [swap] : [], money, jf: 0 }, get: { props: [k], money: 0, jf: 0 } } };
    }
    return null;
  }

  function botStep(S) {
    if (S.phase !== 'play') return null;
    if (S.trade) {
      const to = P(S, S.trade.to);
      if (!to.bot) return null;
      const t = S.trade;
      const gain = t.give.props.reduce((a, i) => a + valueFor(S, to.id, i), 0) + t.give.money + t.give.jf * 50;
      const loss = t.get.props.reduce((a, i) => a + valueFor(S, to.id, i) * 1.2, 0) + t.get.money + t.get.jf * 50;
      // Bekommt der Bot selbst eine ganze Gruppe dazu, sagt er schneller ja
      const completes = t.give.props.some(i => SPACES[i].type === 'prop' && groupIdx(SPACES[i].group).every(x => x === i || S.props[x].owner === to.id));
      return { pid: to.id, action: { type: gain >= loss * (completes ? 0.9 : 1.25) && gain > 0 ? 'tradeAccept' : 'tradeDecline' } };
    }
    if (S.sub === 'auction') {
      const a = S.auction, b = P(S, a.active[a.turn]);
      if (!b.bot) return null;
      const max = Math.min(b.money - RESERVE, valueFor(S, b.id, a.idx) * 0.95);
      const next = a.high + 10;
      return { pid: b.id, action: next <= max ? { type: 'bid', amt: next } : { type: 'pass' } };
    }
    if (S.sub === 'sos' && S.sos) {
      const x = S.sos, A = P(S, x.a), B = P(S, x.b);
      if (!x.claim) return A.bot ? { pid: A.id, action: { type: 'sosClaim', claim: rng() < 0.85 ? 'split' : 'steal' } } : null;
      if (A.bot && !x.pick[A.id]) return { pid: A.id, action: { type: 'sosPick', pick: rng() < 0.6 ? 'split' : 'steal' } };
      if (B.bot && !x.pick[B.id]) return { pid: B.id, action: { type: 'sosPick', pick: rng() < (x.claim === 'split' ? 0.6 : 0.3) ? 'split' : 'steal' } };
      return null;
    }
    if (S.sub === 'law' && S.pol && S.pol.pending) {
      const k = P(S, S.pol.kanzler);
      return k && k.bot ? { pid: k.id, action: { type: 'law', id: botLaw(S, k) } } : null;
    }
    const p = curP(S);
    if (!p.bot) return null;
    const go = (action) => ({ pid: p.id, action });
    switch (S.sub) {
      case 'war': {
        const w = S.war, d = defense(S, w.idx);
        const need = Math.ceil(d * 1.6) + 1;
        if ((p.troops || 0) >= Math.max(3, need) && (w.rent >= 20 || rng() < 0.5)) return go({ type: 'warAttack', n: Math.min(p.troops, need + 2) });
        return go({ type: 'warPay' });
      }
      case 'roll': {
        const m = botManage(S, p);
        if (m) return go(m);
        const tr = botTradeIdea(S, p);
        if (tr) return go(tr);
        const br = MOOD.botBribe(S, p);
        if (br) return go({ type: 'bribe', amt: br });
        if (p.inJail && p.jailFree.length) return go({ type: 'useJailCard' });
        if (p.inJail && p.money > 500 && S.turnNo < 60) return go({ type: 'payJail' });
        return go({ type: 'roll' });
      }
      case 'berlingo': return go({ type: 'berlingoMove', d: 0 });
      case 'buy': {
        const price = buyPrice(p, p.pos);
        const want = p.money - price >= RESERVE || (p.money >= price && valueFor(S, p.id, p.pos) > price * 1.3);
        return go({ type: want ? 'buy' : 'auction' });
      }
      case 'card': return go({ type: 'cardOk' });
      case 'casino': {
        const c = S.casino;
        if (c.bj) return go({ type: CASINO.value(c.bj.player) < 17 ? 'bjHit' : 'bjStand' });
        const ch = CASINO.INFO[c.game].choices;
        let k = ch[Math.floor(rng() * ch.length)][0];
        if (c.game === 'hilo') k = c.card <= 8 ? 'hi' : 'lo';
        return go({ type: 'casinoPlay', choice: k });
      }
      case 'debt': {
        const total = S.debt.items.reduce((a, b) => a + b.amt, 0);
        if (p.money >= total) return go({ type: 'payDebt' });
        return go(botRaise(S, p) || { type: 'bankrupt' });
      }
      case 'end': return go(botManage(S, p) || { type: 'endTurn' });
    }
    return null;
  }

  // Alles, was einen Spielstand bekommt, stellt vorher das richtige Brett ein
  const withBoard = (f) => function (S, ...rest) { useBoard(S); return f(S, ...rest); };
  const ENGINE = {
    newGame, addPlayer, addBot, removePlayer, setSettings: withBoard(setSettings), botStep: withBoard(botStep), pickToken, startGame,
    act: withBoard(act), endGame: withBoard(endGame), bankrupt: withBoard(bankrupt), calcRent: withBoard(calcRent), netWorth: withBoard(netWorth), GOAL_WORTH,
    buyPrice, houseCost, unmortgageCost, ownsGroup: withBoard(ownsGroup), groupIdx, groupHasHouses: withBoard(groupHasHouses), bankSupply: withBoard(bankSupply), CARDS,
    useBoard, board: boardFor, LAWS, defense: withBoard(defense), votes: withBoard(votes), trackCost: (S, a, b) => trackCost(S, a, b),
    setRng: (f) => { rng = f; MOOD.setRng(f); CASINO.setRng(f); },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
  else root.DULI_ENGINE = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
