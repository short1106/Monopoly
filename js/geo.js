// DULIDAN GeoGuessr – Regeln (online über js/party.js). Läuft beim Host.
// Spielarten:
//   classic – feste Rundenzahl, Punkte: so nah wie möglich (bis 5000) oder nur das Land (5000/0)
//   duel    – alle starten mit 6000 Lebenspunkten; wer schlechter tippt als der Beste, verliert die Differenz × Multiplikator
//   br      – Länder-Battle-Royale: falsches Land kostet ein Leben (1 Leben = Länder-Streak)
// Jede Runde: Host sucht ein Straßenbild (Mapillary) oder nimmt das Satellitenbild und bestimmt das echte Land → Raten → Auflösung.
(function (root) {
  const DATA = root.DULI_GEO_DATA || (typeof require !== 'undefined' ? require('./geo-data.js') : null);
  const MAX = 5000, HP = 6000, MAX_ROUNDS = 60;
  const EMOTES = ['GG', 'Zu leicht', 'Wie??', 'Glück gehabt', 'Six seven', 'Ich hasse dieses Land', 'Bro ist ein Satellit', 'NPC-Tipp'];

  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Seed-Zufall, damit Challenge-Links dieselben Orte ergeben
  function rnd(S) {
    let t = (S.rng = (S.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffled(S, n) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const mult = (round) => Math.min(5, round <= 3 ? 1 : 1 + 0.5 * (round - 3));

  function start(players, settings, prev) {
    const st = Object.assign({ game: 'classic', guess: 'dist', set: 'world', rounds: 5, time: 0, countdown: 0, move: 'move', imagery: 'street', lives: 3, seed: 0 }, settings || {});
    const humans = players.filter((p) => !p.bot).map((p) => ({ id: p.id, name: p.name, color: p.color }));
    let game = ['classic', 'duel', 'br'].includes(st.game) ? st.game : 'classic';
    if (game === 'duel' && humans.length < 2) game = 'classic';
    const guess = game === 'br' ? 'country' : game === 'duel' ? 'dist' : st.guess === 'country' ? 'country' : 'dist';
    let set = DATA.SETS[st.set] ? st.set : 'world';
    if (guess === 'country' && !DATA.SETS[set].countries) set = 'world';
    const seed = (!prev && Number(st.seed)) || Math.floor(Math.random() * 2 ** 31);
    const S = {
      host: players[0].id, players: humans, game, guess, set, seed, rng: seed,
      rounds: game === 'classic' ? Math.max(1, Math.min(20, Number(st.rounds) || 5)) : MAX_ROUNDS,
      time: Number(st.time) || 0, countdown: game === 'duel' ? (Number(st.countdown) || 15) : Number(st.countdown) || 0,
      move: ['move', 'nomove', 'nmpz'].includes(st.move) ? st.move : 'move', imagery: st.imagery === 'sat' ? 'sat' : 'street',
      lives: Math.max(1, Math.min(5, Number(st.lives) || 3)),
      pool: [], poolPos: 0, round: 0, phase: 'load', cand: null, loc: null, deadline: 0,
      guesses: {}, ready: {}, scores: {}, hp: {}, lifes: {}, correct: {}, out: {}, history: [], emote: null, mly: '',
      wins: prev && prev.wins ? prev.wins : {},
    };
    S.players.forEach((p) => { S.scores[p.id] = 0; S.hp[p.id] = HP; S.lifes[p.id] = S.lives; S.correct[p.id] = 0; });
    nextRound(S);
    return S;
  }
  const alive = (S) => S.players.filter((p) => !S.out[p.id]);
  function nextRound(S) {
    const set = DATA.SETS[S.set];
    if (S.poolPos >= S.pool.length) {
      let order = shuffled(S, set.list.length);
      if (S.guess === 'country') { const seen = new Set(); order = order.filter((i) => !seen.has(set.list[i][3]) && seen.add(set.list[i][3])); }
      S.pool = order; S.poolPos = 0;
    }
    const [name, lat, lng, cc] = set.list[S.pool[S.poolPos++]];
    let jitter = DATA.TINY.includes(cc) ? 0 : set.jitter;
    if (S.guess === 'country') jitter = Math.min(jitter, 8);
    if (S.imagery === 'sat') jitter = Math.min(jitter, 3);
    const ang = rnd(S) * Math.PI * 2, r = jitter * Math.sqrt(rnd(S));
    const dLat = (r / 111) * Math.cos(ang), dLng = (r / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(ang);
    S.round++;
    S.cand = { name, lat: lat + dLat, lng: lng + dLng, seedLat: lat, seedLng: lng, cc, jittered: r > 0.3 };
    S.phase = 'load'; S.loc = null; S.guesses = {}; S.ready = {}; S.deadline = 0;
    S.mult = S.game === 'duel' ? mult(S.round) : 1;
  }
  const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

  function toResult(S) {
    S.phase = 'result'; S.deadline = 0;
    const live = alive(S);
    live.forEach((p) => { if (!S.guesses[p.id]) S.guesses[p.id] = { none: true, pts: 0, km: null }; });
    const res = { round: S.round, loc: S.loc, guesses: JSON.parse(JSON.stringify(S.guesses)), dmg: {}, lost: {}, mult: S.mult };
    if (S.game === 'classic') live.forEach((p) => { S.scores[p.id] += S.guesses[p.id].pts; });
    if (S.game === 'duel') {
      const best = Math.max(...live.map((p) => S.guesses[p.id].pts));
      live.forEach((p) => {
        const d = Math.round((best - S.guesses[p.id].pts) * S.mult);
        S.hp[p.id] -= d; res.dmg[p.id] = d; S.scores[p.id] += S.guesses[p.id].pts;
        if (S.hp[p.id] <= 0) { S.out[p.id] = S.round; }
      });
    }
    if (S.game === 'br') {
      const wrong = live.filter((p) => !S.guesses[p.id].ok);
      live.forEach((p) => { if (S.guesses[p.id].ok) { S.correct[p.id]++; S.scores[p.id] += MAX; } });
      res.allWrong = live.length > 1 && wrong.length === live.length;
      if (!res.allWrong) wrong.forEach((p) => { S.lifes[p.id]--; res.lost[p.id] = 1; if (S.lifes[p.id] <= 0) S.out[p.id] = S.round; });
    }
    S.lastRes = res;
    S.history.push(res);
  }
  function finished(S) {
    if (S.round >= S.rounds) return true;
    const n = alive(S).length;
    if (S.game === 'duel') return n <= 1;
    if (S.game === 'br') return S.players.length > 1 ? n <= 1 : n === 0;
    return false;
  }
  function ranking(S) {
    const key = (p) => (S.game === 'duel' ? [S.out[p.id] ? 0 : 1, S.out[p.id] || 999, S.hp[p.id]]
      : S.game === 'br' ? [S.out[p.id] ? 0 : 1, S.out[p.id] || 999, S.lifes[p.id], S.correct[p.id]] : [S.scores[p.id]]);
    return S.players.slice().sort((a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; });
  }
  function advance(S) {
    if (finished(S)) {
      S.phase = 'over';
      const r = ranking(S);
      const k = (p) => JSON.stringify(S.game === 'duel' ? [S.out[p.id] || 999, S.hp[p.id]] : S.game === 'br' ? [S.out[p.id] || 999, S.lifes[p.id], S.correct[p.id]] : [S.scores[p.id]]);
      S.winners = r.filter((p) => k(p) === k(r[0])).map((p) => p.id);
      S.rank = r.map((p) => p.id);
      S.winners.forEach((id) => { S.wins[id] = (S.wins[id] || 0) + 1; });
      return;
    }
    nextRound(S);
  }

  function act(S, pid, a) {
    const isHost = pid === S.host;
    const inGame = S.players.some((p) => p.id === pid);
    switch (a.type) {
      case 'place': {
        if (!isHost || S.phase !== 'load' || a.round !== S.round) return null;
        const c = S.cand;
        const lat = Number(a.lat), lng = Number(a.lng);
        const ok = a.img && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        const cc = /^[a-z]{2}$/.test(String(a.cc || '')) ? a.cc : c.cc;
        S.loc = {
          lat: ok ? lat : c.lat, lng: ok ? lng : c.lng, img: ok ? clean(a.img, 40) : '', creator: clean(a.creator, 40),
          cc, name: clean(a.place, 80) || (c.jittered ? `bei ${c.name}` : c.name), near: c.name,
        };
        if (a.token) S.mly = clean(a.token, 200);
        S.phase = 'guess';
        S.deadline = S.time ? Date.now() + S.time * 1000 : 0;
        return null;
      }
      case 'guess': {
        if (S.phase !== 'guess' || !inGame || S.out[pid]) return null;
        if (S.guesses[pid]) return 'Du hast schon getippt.';
        const lat = Number(a.lat), lng = Number(a.lng);
        if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 1080)) return 'Tipp erst auf die Karte.';
        const L = S.loc, g = { lat, lng: ((((lng + 180) % 360) + 360) % 360) - 180, at: Date.now() };
        g.km = km(L, g);
        if (S.guess === 'country') {
          g.cc = String(a.cc || '').toLowerCase().slice(0, 3);
          if (!g.cc) return 'Wähl ein Land.';
          g.cname = DATA.COUNTRIES[g.cc] || clean(a.cname || g.cc, 40);
          g.ok = g.cc === L.cc;
          g.pts = g.ok ? MAX : 0;
          if (a.typed) g.km = null;
        } else {
          const scale = DATA.SETS[S.set].scale;
          g.pts = g.km <= Math.max(0.025, scale * 0.0015) ? MAX : Math.round(MAX * Math.exp(-g.km / scale));
        }
        S.guesses[pid] = g;
        const live = alive(S);
        if (live.every((p) => S.guesses[p.id])) { toResult(S); return null; }
        // Countdown nach dem ersten Tipp (wie in den Duellen)
        if (S.countdown) { const until = Date.now() + S.countdown * 1000; if (!S.deadline || until < S.deadline) S.deadline = until; }
        return null;
      }
      case 'timeup': {
        if (!isHost || S.phase !== 'guess' || !S.deadline || Date.now() < S.deadline - 400) return null;
        toResult(S);
        return null;
      }
      case 'ready': {
        if (S.phase !== 'result' || !inGame) return null;
        S.ready[pid] = !S.ready[pid];
        if (S.players.every((p) => S.ready[p.id])) advance(S);
        return null;
      }
      case 'next': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase === 'guess') toResult(S);
        else if (S.phase === 'result') advance(S);
        return null;
      }
      case 'emote': {
        if (!inGame || !EMOTES[a.i]) return null;
        S.emote = { pid, i: a.i, seq: (S.emote ? S.emote.seq : 0) + 1 };
        return null;
      }
    }
    return 'Unbekannte Aktion.';
  }

  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    delete V.cand; delete V.pool; delete V.rng;
    // Nur der Host braucht die Rohkoordinate, um ein Straßenbild zu suchen
    if (pid === S.host && S.phase === 'load') V.cand = { lat: S.cand.lat, lng: S.cand.lng };
    V.gid = (S.seed ^ 0x5bd1e995) >>> 0;
    V.scale = DATA.SETS[S.set].scale;
    V.setName = DATA.SETS[S.set].name;
    V.alive = alive(S).map((p) => p.id);
    if (S.phase === 'load') V.loc = null;
    if (S.phase === 'guess') {
      V.loc = { lat: S.loc.lat, lng: S.loc.lng, img: S.loc.img };
      V.done = {};
      S.players.forEach((p) => { V.done[p.id] = !!S.guesses[p.id]; if (p.id !== pid) delete V.guesses[p.id]; });
    }
    if (S.phase !== 'over') V.seed = null;
    return V;
  }
  function bot(S) {
    if (S.phase !== 'guess' || !S.deadline) return null;
    return { pid: S.host, action: { type: 'timeup' }, delay: Math.max(60, S.deadline - Date.now()) };
  }

  const GEO = { MAX, HP, EMOTES, km, mult, start, act, view, bot, ranking };
  if (typeof module !== 'undefined' && module.exports) module.exports = GEO;
  else root.DULI_GEO = GEO;
})(typeof window !== 'undefined' ? window : globalThis);
