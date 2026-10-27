// DULIDAN Stadt Land Fluss – Regeln (online über js/party.js). Läuft beim Host.
// Ablauf pro Runde: Buchstabe → alle schreiben (Antworten der anderen bleiben verdeckt) → Stopp oder Zeit um →
// alle sehen alles und können Antworten ablehnen (Veto) → Punkte: allein in der Kategorie 20, einzigartig 10, doppelt 5.
(function (root) {
  const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');
  const DEFAULT_CATS = 'Stadt, Land, Fluss, Name, Tier, Beruf';
  const GRACE = 10000;

  const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
  const plain = (s) => clean(s, 60).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  function parseCats(v) {
    const list = String(v || DEFAULT_CATS).split(/[,;\n]/).map((c) => clean(c, 24)).filter(Boolean);
    return (list.length ? list : DEFAULT_CATS.split(', ')).slice(0, 12);
  }
  const startsOk = (a, letter) => plain(a).charAt(0).toUpperCase() === letter;

  function start(players, settings, prev) {
    const st = Object.assign({ cats: DEFAULT_CATS, rounds: 5, time: 120, stop: true }, settings || {});
    const S = {
      host: players[0].id, players: players.filter((p) => !p.bot).map((p) => ({ id: p.id, name: p.name, color: p.color })),
      cats: parseCats(st.cats), rounds: Number(st.rounds) || 5, time: Number(st.time) || 120, stopOn: st.stop !== false,
      round: 0, used: [], letter: '', phase: 'write', deadline: 0, stopBy: null, answers: {}, vetoes: {}, ready: {},
      scores: {}, history: [], log: [], wins: prev && prev.wins ? prev.wins : {},
    };
    S.players.forEach((p) => { S.scores[p.id] = 0; });
    newRound(S);
    return S;
  }
  function newRound(S) {
    S.round++;
    const free = LETTERS.filter((l) => !S.used.includes(l));
    S.letter = free[Math.floor(Math.random() * free.length)] || 'S';
    S.used.push(S.letter);
    S.phase = 'write'; S.deadline = Date.now() + S.time * 1000; S.stopBy = null;
    S.answers = {}; S.vetoes = {}; S.ready = {};
    S.players.forEach((p) => { S.answers[p.id] = S.cats.map(() => ''); });
  }
  const need = (S) => Math.max(1, Math.ceil((S.players.length - 1) / 2));
  function valid(S, pid, ci) {
    const a = S.answers[pid] && S.answers[pid][ci];
    if (!a || !startsOk(a, S.letter)) return false;
    return (S.vetoes[`${pid}|${ci}`] || []).length < need(S);
  }
  // Punkte der aktuellen Runde (für die Vorschau und die Wertung)
  function points(S) {
    const pts = {};
    S.players.forEach((p) => { pts[p.id] = S.cats.map(() => 0); });
    S.cats.forEach((_, ci) => {
      const ok = S.players.filter((p) => valid(S, p.id, ci));
      ok.forEach((p) => {
        const same = ok.filter((q) => q.id !== p.id && plain(S.answers[q.id][ci]) === plain(S.answers[p.id][ci])).length;
        pts[p.id][ci] = ok.length === 1 ? 20 : same ? 5 : 10;
      });
    });
    return pts;
  }
  function toReview(S) { S.phase = 'review'; S.deadline = 0; }
  function finishRound(S) {
    const pts = points(S);
    const row = { letter: S.letter, stopBy: S.stopBy, answers: JSON.parse(JSON.stringify(S.answers)), pts };
    S.history.push(row);
    S.players.forEach((p) => { S.scores[p.id] += pts[p.id].reduce((a, b) => a + b, 0); });
    const best = S.players.slice().sort((a, b) => pts[b.id].reduce((x, y) => x + y, 0) - pts[a.id].reduce((x, y) => x + y, 0))[0];
    S.log.push(`Runde ${S.round} (${S.letter}): ${best.name} holt am meisten.`);
    if (S.round >= S.rounds) {
      S.phase = 'over';
      const top = Math.max(...S.players.map((p) => S.scores[p.id]));
      S.winners = S.players.filter((p) => S.scores[p.id] === top).map((p) => p.id);
      S.winners.forEach((id) => { S.wins[id] = (S.wins[id] || 0) + 1; });
      return;
    }
    newRound(S);
  }

  function act(S, pid, a) {
    const isHost = pid === S.host;
    const inGame = S.players.some((p) => p.id === pid);
    switch (a.type) {
      case 'save': {
        if (S.phase !== 'write' || !inGame) return null;
        const list = Array.isArray(a.answers) ? a.answers : [];
        S.answers[pid] = S.cats.map((_, i) => clean(list[i], 40));
        return null;
      }
      case 'stop': {
        if (S.phase !== 'write' || !inGame) return null;
        if (!S.stopOn) return 'Stopp ist ausgeschaltet. Es läuft bis zum Ende der Zeit.';
        if (Array.isArray(a.answers)) S.answers[pid] = S.cats.map((_, i) => clean(a.answers[i], 40));
        if (S.answers[pid].some((x) => !x)) return 'Erst alle Kategorien ausfüllen.';
        if (S.stopBy) return null;
        S.stopBy = pid;
        S.deadline = Math.min(S.deadline, Date.now() + GRACE);
        S.log.push(`${S.players.find((p) => p.id === pid).name} ruft STOPP!`);
        return null;
      }
      case 'timeup': {
        if (!isHost || S.phase !== 'write') return null;
        if (Date.now() < S.deadline - 400) return null;
        toReview(S);
        return null;
      }
      case 'veto': {
        if (S.phase !== 'review' || !inGame) return null;
        if (a.pid === pid) return 'Deine eigene Antwort kannst du nicht ablehnen.';
        if (!S.answers[a.pid] || !S.answers[a.pid][a.ci]) return null;
        const k = `${a.pid}|${Number(a.ci)}`;
        const v = S.vetoes[k] || (S.vetoes[k] = []);
        if (v.includes(pid)) S.vetoes[k] = v.filter((x) => x !== pid); else v.push(pid);
        Object.keys(S.ready).forEach((x) => { delete S.ready[x]; });
        return null;
      }
      case 'ready': {
        if (S.phase !== 'review' || !inGame) return null;
        S.ready[pid] = !S.ready[pid];
        if (S.players.every((p) => S.ready[p.id])) finishRound(S);
        return null;
      }
      case 'next': {
        if (!isHost) return 'Nur der Host.';
        if (S.phase === 'write') { toReview(S); return null; }
        if (S.phase === 'review') finishRound(S);
        return null;
      }
    }
    return 'Unbekannte Aktion.';
  }

  // Beim Schreiben sieht man von den anderen nur, wie viele Felder sie schon haben
  function view(S, pid) {
    const V = JSON.parse(JSON.stringify(S));
    V.points = S.phase === 'review' ? points(S) : null;
    V.need = need(S);
    if (S.phase === 'write') {
      V.filled = {};
      S.players.forEach((p) => { V.filled[p.id] = S.answers[p.id].filter(Boolean).length; if (p.id !== pid) V.answers[p.id] = null; });
    } else if (S.phase === 'review') {
      V.auto = {};
      S.players.forEach((p) => { V.auto[p.id] = S.cats.map((_, ci) => !!S.answers[p.id][ci] && startsOk(S.answers[p.id][ci], S.letter)); });
    }
    return V;
  }
  // Der „Bot“ ist hier nur die Uhr des Hosts: Zeit um → auswerten
  function bot(S) {
    if (S.phase !== 'write') return null;
    return { pid: S.host, action: { type: 'timeup' }, delay: Math.max(60, S.deadline - Date.now()) };
  }

  const SLF = { DEFAULT_CATS, parseCats, start, act, view, bot, points, plain };
  if (typeof module !== 'undefined' && module.exports) module.exports = SLF;
  else root.DULI_SLF = SLF;
})(typeof window !== 'undefined' ? window : globalThis);
