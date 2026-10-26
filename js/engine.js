// Dulidanopoly – Spielregeln. Läuft nur beim Host; Clients bekommen den Zustand geschickt.
(function (root) {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.DULI_DATA;
  const { SPACES, GROUPS, RAILS, UTILS, TOKENS, APRIL_CARDS, STUDIO_CARDS, START_MONEY, GO_MONEY, PLAYER_COLORS } = D;
  const CARDS = { april: APRIL_CARDS, studio: STUDIO_CARDS };
  const DECK_NAME = { april: 'April-Karte', studio: 'Studio-Karte' };
  const MAX_HOUSES = 32, MAX_HOTELS = 12;
  const BUYABLE = ['prop', 'rail', 'util'];

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
      debt: null, trade: null, log: [], winner: null, ranking: null,
      berlingoArmed: false, pendingMove: null, cardMult: 0, utilCard: false, lastLand: null,
    };
  }

  // ---------- Helfer ----------
  const P = (S, id) => S.players.find(p => p.id === id);
  const curP = (S) => S.players[S.cur];
  const active = (S) => S.players.filter(p => !p.bankrupt);
  function log(S, m) {
    S.log.push(m);
    if (S.log.length > 80) S.log.splice(0, S.log.length - 80);
  }
  const money = (n) => 'Ð' + n;

  function groupIdx(g) { return SPACES.map((s, i) => (s.group === g ? i : -1)).filter(i => i >= 0); }
  function ownsGroup(S, pid, g) { return groupIdx(g).every(i => S.props[i].owner === pid); }
  function groupHasHouses(S, g) { return groupIdx(g).some(i => S.props[i].houses > 0); }
  function houseCost(p, g) { return GROUPS[g].house - (p.token === 'pen' ? 10 : 0); }
  function buyPrice(p, idx) {
    const base = SPACES[idx].price;
    return p.token === 'dulidan' ? Math.round(base * 0.9) : base;
  }
  function unmortgageCost(idx) { return Math.ceil(SPACES[idx].price * 0.55); }
  function bankSupply(S) {
    let houses = 0, hotels = 0;
    for (const k in S.props) {
      const h = S.props[k].houses;
      if (h === 5) hotels++; else houses += h;
    }
    return { houses: MAX_HOUSES - houses, hotels: MAX_HOTELS - hotels };
  }

  function calcRent(S, idx, payer) {
    const sp = SPACES[idx], st = S.props[idx], owner = st.owner;
    if (sp.type === 'prop') {
      if (st.houses > 0) return sp.rent[st.houses];
      return ownsGroup(S, owner, sp.group) ? sp.rent[0] * 2 : sp.rent[0];
    }
    if (sp.type === 'rail') {
      const n = RAILS.filter(i => S.props[i].owner === owner).length;
      let r = 25 * Math.pow(2, n - 1);
      if (S.cardMult) r *= S.cardMult;
      if (payer && payer.token === 'ship') r = Math.floor(r / 2);
      return r;
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
      bankrupt: false, skip: 0, used: { april: false, berlingo: false }, connected: true,
    });
    log(S, `${name} ist beigetreten.`);
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
    S.players.forEach((p, i) => {
      Object.assign(p, { money: START_MONEY, pos: 0, inJail: false, jailTries: 0, jailFree: [], bankrupt: false, skip: 0, used: { april: false, berlingo: false } });
      p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
    });
    S.props = {};
    SPACES.forEach((s, i) => { if (BUYABLE.includes(s.type)) S.props[i] = { owner: null, houses: 0, mort: false }; });
    S.decks = { april: shuffle(APRIL_CARDS.map((_, i) => i)), studio: shuffle(STUDIO_CARDS.map((_, i) => i)) };
    S.phase = 'play'; S.cur = 0; S.sub = 'roll'; S.turnNo = 1;
    S.log = [];
    log(S, `Dulidanopoly startet! ${S.players[0].name} beginnt.`);
    return null;
  }

  // ---------- Zugablauf ----------
  function passGo(S, p) {
    const amt = GO_MONEY + (p.token === 'zebra' ? 50 : 0);
    p.money += amt;
    log(S, `${p.name} zieht über LOS und kassiert ${money(amt)}.`);
  }
  function moveBy(S, p, n) {
    const old = p.pos;
    const np = ((old + n) % 40 + 40) % 40;
    if (n > 0 && np < old) passGo(S, p);
    p.pos = np;
  }
  function moveTo(S, p, target) {
    if (target < p.pos) passGo(S, p);
    p.pos = target;
  }
  function sendJail(S, p) {
    p.pos = 10; p.inJail = true; p.jailTries = 0;
    S.rolledDouble = false; S.doublesCount = 0;
    log(S, `${p.name} muss nach Düsseldorf. 😱`);
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

  function charge(S, p, items) {
    const total = items.reduce((a, b) => a + b.amt, 0);
    if (p.money >= total) {
      for (const it of items) {
        p.money -= it.amt;
        if (it.to) P(S, it.to).money += it.amt;
      }
      return true;
    }
    S.debt = { pid: p.id, items, afterMove: null };
    S.sub = 'debt';
    log(S, `${p.name} fehlen ${money(total - p.money)}. Hypotheken aufnehmen, Häuser verkaufen oder handeln!`);
    return false;
  }

  function land(S, p) {
    S.lastLand = p.pos;
    const sp = SPACES[p.pos];
    log(S, `${p.name} landet auf ${sp.name}.`);
    if (BUYABLE.includes(sp.type)) {
      const st = S.props[p.pos];
      if (st.owner == null) { S.sub = 'buy'; return; }
      if (st.owner === p.id) return proceed(S);
      if (st.mort) { log(S, `${sp.name} ist mit einer Hypothek belastet. Keine Miete.`); return proceed(S); }
      const owner = P(S, st.owner);
      const rent = calcRent(S, p.pos, p);
      log(S, `${p.name} zahlt ${money(rent)} Miete an ${owner.name}.`);
      if (charge(S, p, [{ to: owner.id, amt: rent }])) proceed(S);
      return;
    }
    switch (sp.type) {
      case 'tax':
        log(S, `${sp.name}! ${p.name} zahlt ${money(sp.amount)}.`);
        if (charge(S, p, [{ to: null, amt: sp.amount }])) proceed(S);
        return;
      case 'april':
      case 'studio':
        return drawCard(S, sp.type);
      case 'gotojail':
        sendJail(S, p);
        return proceed(S);
      default:
        return proceed(S);
    }
  }

  function doMove(S, p, n) {
    moveBy(S, p, n);
    land(S, p);
  }

  function roll(S) {
    const p = curP(S);
    const a = d6(), b = d6();
    S.dice = [a, b]; S.rollId++;
    const dbl = a === b, sum = a + b;
    log(S, `${p.name} würfelt ${a} + ${b} = ${sum}${dbl ? ' (Pasch)' : ''}.`);

    if (p.inJail) {
      if (dbl) {
        p.inJail = false; p.jailTries = 0; S.rolledDouble = false;
        log(S, `Pasch! ${p.name} entkommt aus Düsseldorf.`);
        return doMove(S, p, sum);
      }
      p.jailTries++;
      if (p.token === 'helmet' && p.jailTries >= 2) {
        p.inJail = false; p.jailTries = 0; S.rolledDouble = false;
        log(S, `Der Stahlhelm bricht aus Düsseldorf aus! ⛑️`);
        return doMove(S, p, sum);
      }
      if (p.jailTries >= 3) {
        p.inJail = false; p.jailTries = 0; S.rolledDouble = false;
        log(S, `${p.name} muss ${money(50)} zahlen, um Düsseldorf zu verlassen.`);
        if (charge(S, p, [{ to: null, amt: 50 }])) return doMove(S, p, sum);
        S.debt.afterMove = sum;
        return;
      }
      log(S, `${p.name} bleibt in Düsseldorf (Versuch ${p.jailTries}/${p.token === 'helmet' ? 2 : 3}).`);
      S.sub = 'end';
      return;
    }

    if (dbl) {
      S.doublesCount++;
      if (p.token === 'doener') { p.money += 20; log(S, `Döner-Pasch: ${p.name} bekommt ${money(20)}. Mit allem, scharf! 🥙`); }
      if (S.doublesCount >= 3) {
        log(S, `Drei Pasch hintereinander!`);
        sendJail(S, p);
        S.sub = 'end';
        return;
      }
      S.rolledDouble = true;
    } else {
      S.rolledDouble = false;
    }
    if (S.berlingoArmed) {
      S.pendingMove = sum;
      S.sub = 'berlingo';
      return;
    }
    doMove(S, p, sum);
  }

  function nextTurn(S) {
    S.rolledDouble = false; S.doublesCount = 0; S.berlingoArmed = false; S.pendingMove = null;
    const n = S.players.length;
    for (let guard = 0; guard < n * 3; guard++) {
      S.cur = (S.cur + 1) % n;
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
    log(S, `${curP(S).name} ist dran.`);
  }

  // ---------- Karten ----------
  function drawCard(S, deck) {
    const id = S.decks[deck].shift();
    S.card = { deck, id };
    S.sub = 'card';
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
    log(S, `April legt die Karte zurück und zieht neu. 🤖`);
  }

  function applyCard(S, p, c, deck) {
    const others = active(S).filter(o => o.id !== p.id);
    switch (c.t) {
      case 'move': moveTo(S, p, c.to); return land(S, p);
      case 'money':
        if (c.amt >= 0) { p.money += c.amt; return proceed(S); }
        if (charge(S, p, [{ to: null, amt: -c.amt }])) proceed(S);
        return;
      case 'payEach':
        if (charge(S, p, others.map(o => ({ to: o.id, amt: c.amt })))) proceed(S);
        return;
      case 'collectEach':
        for (const o of others) {
          const x = Math.min(o.money, c.amt);
          o.money -= x; p.money += x;
        }
        return proceed(S);
      case 'back': moveBy(S, p, -c.n); return land(S, p);
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

  // ---------- Kaufen & Versteigern ----------
  function buy(S) {
    const p = curP(S), idx = p.pos;
    const price = buyPrice(p, idx);
    if (p.money < price) return 'Nicht genug Dulis.';
    p.money -= price;
    S.props[idx].owner = p.id;
    log(S, `${p.name} kauft ${SPACES[idx].name} für ${money(price)}.`);
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
    if (st.houses > min) return 'Gleichmäßig bauen! Erst die anderen Felder der Gruppe.';
    const cost = houseCost(p, sp.group);
    if (p.money < cost) return 'Nicht genug Dulis.';
    const sup = bankSupply(S);
    if (st.houses === 4 ? sup.hotels < 1 : sup.houses < 1) return 'Die Bank hat keine Gebäude mehr.';
    p.money -= cost;
    st.houses++;
    log(S, `${p.name} baut ${st.houses === 5 ? 'ein Hotel' : 'ein Haus'} auf ${sp.name}.`);
    return null;
  }

  function sell(S, p, idx) {
    const sp = SPACES[idx], st = S.props[idx];
    if (!sp || sp.type !== 'prop' || st.owner !== p.id || st.houses === 0) return 'Hier gibt es nichts zu verkaufen.';
    const g = groupIdx(sp.group);
    const max = Math.max(...g.map(i => S.props[i].houses));
    if (st.houses < max) return 'Gleichmäßig verkaufen! Erst die anderen Felder der Gruppe.';
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
    p.money += sp.price / 2;
    log(S, `${p.name} nimmt eine Hypothek auf ${sp.name} auf (+${money(sp.price / 2)}).`);
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
    }
    S.debt = null;
    log(S, `${p.name} hat die Schulden bezahlt.`);
    if (d.afterMove != null) doMove(S, p, d.afterMove);
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

  // ---------- Aktionen ----------
  function act(S, pid, a) {
    const p = P(S, pid);
    if (!a || !a.type) return 'Ungültige Aktion.';
    if (S.phase === 'lobby') {
      if (a.type === 'pickToken') return p ? pickToken(S, pid, a.token) : 'Du bist nicht im Raum.';
      return 'Das Spiel hat noch nicht begonnen.';
    }
    if (S.phase !== 'play') return 'Das Spiel ist vorbei.';
    if (!p || p.bankrupt) return 'Du spielst nicht mit.';
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
        p.money -= 50; p.inJail = false; p.jailTries = 0;
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
      case 'endTurn':
        if (needCur() || S.sub !== 'end') return 'Du kannst deinen Zug noch nicht beenden.';
        if (S.trade) return 'Erst das offene Angebot klären.';
        nextTurn(S); return null;
      case 'build': return manageOk() || build(S, p, Number(a.idx));
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

  const ENGINE = {
    newGame, addPlayer, pickToken, startGame, act, endGame, bankrupt, calcRent, netWorth,
    buyPrice, houseCost, unmortgageCost, ownsGroup, groupIdx, groupHasHouses, bankSupply, CARDS,
    setRng: (f) => { rng = f; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
  else root.DULI_ENGINE = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
