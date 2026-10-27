// DULIDAN GeoGuessr – Regeln (online über js/party.js). Läuft beim Host.
// Modus „dist“: so nah wie möglich tippen (bis 5000 Punkte). Modus „country“: nur das Land erraten (richtig = 5000).
(function (root) {
  const DATA = root.DULI_GEO_DATA || (typeof require !== 'undefined' ? require('./geo-data.js') : null);
  const MAX = 5000;

  function km(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function start(players, settings, prev) {
    const st = Object.assign({ mode: 'dist', set: 'world', rounds: 5, time: 0, move: true }, settings || {});
    let set = DATA.SETS[st.set] ? st.set : 'world';
    if (st.mode === 'country' && !['world', 'europe'].includes(set)) set = 'world';
    const rounds = Math.max(1, Math.min(15, Number(st.rounds) || 5));
    // Im Länder-Modus möglichst jedes Land nur einmal
    let pool = shuffle(DATA.SETS[set].list);
    if (st.mode === 'country') { const seen = new Set(); pool = pool.filter((x) => !seen.has(x[3]) && seen.add(x[3])); }
    const locs = pool.slice(0, rounds).map(([name, lat, lng, cc]) => ({ name, lat, lng, cc }));
    const S = {
      host: players[0].id, players: players.filter((p) => !p.bot).map((p) => ({ id: p.id, name: p.name, color: p.color })),
      mode: st.mode === 'country' ? 'country' : 'dist', set, rounds: locs.length, time: Number(st.time) || 0, move: st.move !== false,
      locs, round: 0, phase: 'guess', deadline: 0, guesses: {}, ready: {}, scores: {}, history: [], wins: prev && prev.wins ? prev.wins : {},
    };
    S.players.forEach((p) => { S.scores[p.id] = 0; });
    nextRound(S);
    return S;
  }
  function nextRound(S) {
    S.round++; S.phase = 'guess'; S.guesses = {}; S.ready = {};
    S.deadline = S.time ? Date.now() + S.time * 1000 : 0;
  }
  const loc = (S) => S.locs[S.round - 1];
  function toResult(S) {
    S.phase = 'result'; S.deadline = 0;
    S.players.forEach((p) => { if (!S.guesses[p.id]) S.guesses[p.id] = { none: true, pts: 0 }; S.scores[p.id] += S.guesses[p.id].pts; });
    S.history.push({ loc: loc(S), guesses: JSON.parse(JSON.stringify(S.guesses)) });
  }
  function advance(S) {
    if (S.round >= S.rounds) {
      S.phase = 'over';
      const top = Math.max(...S.players.map((p) => S.scores[p.id]));
      S.winners = S.players.filter((p) => S.scores[p.id] === top).map((p) => p.id);
      S.winners.forEach((id) => { S.wins[id] = (S.wins[id] || 0) + 1; });
      return;
    }
    nextRound(S);
  }

  function act(S, pid, a) {
    const inGame = S.players.some((p) => p.id === pid);
    switch (a.type) {
      case 'guess': {
        if (S.phase !== 'guess' || !inGame) return null;
        if (S.guesses[pid]) return 'Du hast schon getippt.';
        const lat = Number(a.lat), lng = Number(a.lng);
        if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 360)) return 'Tipp erst auf die Karte.';
        const L = loc(S), g = { lat, lng: ((lng + 540) % 360) - 180 };
        g.km = km(L, g);
        if (S.mode === 'country') {
          g.cc = String(a.cc || '').toLowerCase().slice(0, 3);
          if (!g.cc) return 'Wähl ein Land.';
          g.cname = DATA.COUNTRIES[g.cc] || String(a.cname || g.cc).slice(0, 40);
          g.ok = g.cc === L.cc;
          g.pts = g.ok ? MAX : 0;
        } else {
          const scale = DATA.SETS[S.set].scale;
          g.pts = g.km <= scale * 0.002 ? MAX : Math.round(MAX * Math.exp(-g.km / scale));
        }
        S.guesses[pid] = g;
        if (S.players.every((p) => S.guesses[p.id])) toResult(S);
        return null;
      }
      case 'timeup': {
        if (pid !== S.host || S.phase !== 'guess' || !S.deadline) return null;
        if (Date.now() < S.deadline - 400) return null;
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
        if (pid !== S.host) return 'Nur der Host.';
        if (S.phase === 'guess') toResult(S);
        else if (S.phase === 'result') advance(S);
        return null;
      }
    }
    return 'Unbekannte Aktion.';
  }

  // Beim Raten: Ort ohne Namen und Land, von den anderen nur „hat getippt“
  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    const L = loc(S);
    V.loc = S.phase === 'guess' ? { lat: L.lat, lng: L.lng } : L;
    V.scale = DATA.SETS[S.set].scale;
    V.setName = DATA.SETS[S.set].name;
    if (S.phase !== 'over') V.locs = null;
    if (S.phase === 'guess') {
      V.done = {};
      S.players.forEach((p) => { V.done[p.id] = !!S.guesses[p.id]; if (p.id !== pid) delete V.guesses[p.id]; });
    }
    return V;
  }
  function bot(S) {
    if (S.phase !== 'guess' || !S.deadline) return null;
    return { pid: S.host, action: { type: 'timeup' }, delay: Math.max(60, S.deadline - Date.now()) };
  }

  const GEO = { MAX, km, start, act, view, bot };
  if (typeof module !== 'undefined' && module.exports) module.exports = GEO;
  else root.DULI_GEO = GEO;
})(typeof window !== 'undefined' ? window : globalThis);
