// Dulidanopoly – DULIDAN CASINO: Jede Straße ist ein Casino. Wer bei jemand anderem landet,
// spielt dort gegen die Bank. Verloren = Miete zahlen, gewonnen = der Besitzer zahlt dich aus.
// Ausbaustufen machen das Casino korrupter (schlechtere Chancen für Gäste).
(function (root) {
  let rng = Math.random;
  const ri = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  // Welches Spiel in welcher Farbgruppe (billig → teuer)
  const GAMES = { brown: 'coin', lblue: 'dice', pink: 'hilo', orange: 'wheel', red: 'roulette', yellow: 'blackjack', green: 'horses', dblue: 'slots' };
  const INFO = {
    coin: { icon: '🪙', name: 'Münzwurf', text: 'Kopf oder Zahl? Triffst du, zahlt das Casino.', choices: [['kopf', '👑 Kopf'], ['zahl', '🔢 Zahl']] },
    dice: { icon: '🎲', name: 'Würfelduell', text: 'Du und die Bank würfeln. Höher gewinnt, Gleichstand gewinnt die Bank.', choices: [['go', '🎲 Würfeln']] },
    hilo: { icon: '🃏', name: 'Höher oder Tiefer', text: 'Ist die nächste Karte höher oder tiefer? Gleich gewinnt die Bank.', choices: [['hi', '⬆ Höher'], ['lo', '⬇ Tiefer']] },
    wheel: { icon: '🎡', name: 'Glücksrad', text: 'Dreh das Rad. Grüne Felder gewinnen.', choices: [['go', '🎡 Drehen']] },
    roulette: { icon: '🔴', name: 'Roulette', text: 'Rot oder Schwarz? Die Null gewinnt immer die Bank.', choices: [['rot', '🔴 Rot'], ['schwarz', '⚫ Schwarz']] },
    blackjack: { icon: '🂡', name: 'Blackjack', text: 'Komm näher an 21 als die Bank, ohne drüber. Blackjack zahlt 1,5×.', choices: [['go', '🂡 Karten geben']] },
    horses: { icon: '🐎', name: 'Pferderennen', text: 'Setz auf ein Pferd. Gewinnt es, zahlt das Casino.', choices: [['1', '🐎 Blitz'], ['2', '🦄 Glitzer'], ['3', '🐴 Kevin'], ['4', '🫏 Esel Ernst']] },
    slots: { icon: '🎰', name: 'Slotmaschine', text: 'Drei Gleiche gewinnen. Drei 💎 sind der Jackpot (doppelt).', choices: [['go', '🎰 Hebel ziehen']] },
  };
  const LEVELS = ['Ehrliches Casino', 'Neue Teppiche', 'Gezinkte Karten', 'Bestochener Croupier', 'Magnet unterm Tisch', 'Mafia-Casino'];
  const BASE = [0.45, 0.38, 0.31, 0.25, 0.18, 0.1];
  const RIG = [0, 0.15, 0.3, 0.45, 0.6, 0.75];
  const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const WHEEL = ['win', 'lose', 'win', 'lose', 'lose', 'win', 'lose', 'lose'];
  const SLOT = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '💎'];
  const HORSES = ['1', '2', '3', '4'];

  const clamp = (x) => Math.max(0.03, Math.min(0.9, x));
  function chance(game, level, luck) {
    const b = BASE[Math.max(0, Math.min(5, level))] + (luck || 0);
    return clamp(game === 'slots' ? b * 0.8 : b);
  }
  const rig = (level, luck) => Math.max(0, Math.min(0.9, RIG[Math.max(0, Math.min(5, level))] - (luck || 0) * 2));

  // Startzustand beim Betreten (Höher/Tiefer braucht eine offene Karte)
  function setup(game) {
    return game === 'hilo' ? { card: ri(4, 12) } : {};
  }

  // Ein Spiel mit festem Ausgang: erst entscheiden, dann ein passendes Bild erzeugen
  function play(game, choice, p, extra) {
    const win = rng() < p;
    const pickOther = (arr, not) => { const o = arr.filter((x) => x !== not); return o[Math.floor(rng() * o.length)]; };
    switch (game) {
      case 'coin': return { win, show: { side: win ? choice : (choice === 'kopf' ? 'zahl' : 'kopf') } };
      case 'dice': {
        let a, b;
        if (win) { b = ri(1, 5); a = ri(b + 1, 6); } else { a = ri(1, 6); b = ri(a, 6); }
        return { win, show: { a, b } };
      }
      case 'hilo': {
        const c = extra.card;
        const next = win ? (choice === 'hi' ? ri(c + 1, 14) : ri(2, c - 1)) : (choice === 'hi' ? ri(2, c) : ri(c, 14));
        return { win, show: { card: c, next } };
      }
      case 'wheel': {
        const idx = WHEEL.map((x, i) => (x === (win ? 'win' : 'lose') ? i : -1)).filter((i) => i >= 0);
        return { win, show: { seg: idx[Math.floor(rng() * idx.length)], spin: ri(3, 5) } };
      }
      case 'roulette': {
        let n;
        if (win) { const pool = choice === 'rot' ? RED : Array.from({ length: 36 }, (_, i) => i + 1).filter((x) => !RED.includes(x)); n = pool[Math.floor(rng() * pool.length)]; }
        else if (rng() < 0.12) n = 0;
        else { const pool = choice === 'rot' ? Array.from({ length: 36 }, (_, i) => i + 1).filter((x) => !RED.includes(x)) : RED; n = pool[Math.floor(rng() * pool.length)]; }
        return { win, show: { n, color: n === 0 ? 'gruen' : RED.includes(n) ? 'rot' : 'schwarz' } };
      }
      case 'horses': {
        const winner = win ? choice : pickOther(HORSES, choice);
        const rest = HORSES.filter((h) => h !== winner).sort(() => rng() - 0.5);
        return { win, show: { order: [winner, ...rest] } };
      }
      case 'slots': {
        let reels;
        const jackpot = win && rng() < 0.15;
        if (jackpot) reels = ['💎', '💎', '💎'];
        else if (win) { const s = SLOT[ri(0, SLOT.length - 2)]; reels = [s, s, s]; }
        else {
          reels = [SLOT[ri(0, 5)], SLOT[ri(0, 5)], SLOT[ri(0, 5)]];
          if (reels[0] === reels[1] && reels[1] === reels[2]) reels[2] = pickOther(SLOT, reels[0]);
        }
        return { win, mult: jackpot ? 2 : 1, jackpot, show: { reels } };
      }
    }
    return { win, show: {} };
  }

  // ---------- Blackjack gegen die Bank ----------
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function deck() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push(r + s);
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  }
  function value(cards) {
    let v = 0, aces = 0;
    for (const c of cards) {
      const r = c.slice(0, -1);
      if (r === 'A') { aces++; v += 11; } else v += ['J', 'Q', 'K'].includes(r) ? 10 : Number(r);
    }
    while (v > 21 && aces) { v -= 10; aces--; }
    return v;
  }
  function bjDeal() {
    const d = deck();
    return { deck: d, player: [d.pop(), d.pop()], dealer: [d.pop(), d.pop()], over: false };
  }
  function bjHit(bj) { bj.player.push(bj.deck.pop()); return value(bj.player); }
  // Die Bank zieht bis 17. Korrupte Casinos tauschen Karten, mit denen die Bank überkaufen würde.
  function bjDealer(bj, rigP) {
    while (value(bj.dealer) < 17) {
      let c = bj.deck.pop();
      for (let k = 0; k < 6 && value(bj.dealer.concat([c])) > 21 && rng() < rigP; k++) { bj.deck.unshift(c); c = bj.deck.pop(); }
      bj.dealer.push(c);
    }
    bj.over = true;
    const pv = value(bj.player), dv = value(bj.dealer);
    const natural = bj.player.length === 2 && pv === 21;
    if (pv > 21) return { win: false };
    if (dv > 21 || pv > dv) return { win: true, mult: natural ? 1.5 : 1 };
    if (pv === dv) return { push: true };
    return { win: false };
  }

  const CASINO = { GAMES, INFO, LEVELS, WHEEL, RED, chance, rig, setup, play, value, bjDeal, bjHit, bjDealer, setRng: (f) => { rng = f; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = CASINO;
  else root.DULI_CASINO = CASINO;
})(typeof window !== 'undefined' ? window : globalThis);
