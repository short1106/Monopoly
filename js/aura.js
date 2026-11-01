// DULIDAN AURA GAMES – Regeln (läuft beim Host, online über js/party.js).
// 7 Runden, jede ein Minispiel. Alle spielen gleichzeitig, jede:r misst das eigene Ergebnis und schickt es ab.
// Platzierung gibt Aura (Letzte:r verliert welche). Jede Runde wird komischer: Bildschirm gespiegelt, Comic Sans,
// Enten, verdrehte Wertung … April kommentiert alles. Bots spielen mit (ehrlich zufällig, mal gut, mal cooked).
(function (root) {
  const GAMES = {
    reaktion: { name: 'REAKTIONS-DUELL', rule: 'Warte auf GRÜN. Dann so schnell wie möglich drücken. Zu früh = cringe.', ms: 9000, low: true },
    spam: { name: 'AURA FARMEN', rule: 'Spam den Knopf. 6 Sekunden. Jeder Klick ist Aura.', ms: 8500, low: false },
    hold67: { name: 'SIX SEVEN HALTEN', rule: 'Halte den Knopf genau 6,7 Sekunden. Der Timer verschwindet. Vertrau deinem Mewing.', ms: 14000, low: true },
    enten: { name: 'ENTEN ZÄHLEN', rule: 'Gleich watscheln Enten vorbei. Wie viele waren es? Wer am nächsten dran ist, gewinnt.', ms: 15000, low: true },
    tippen: { name: 'BRAINROT TIPPEN', rule: 'Tipp den Satz so schnell du kannst. Fehler zählen nicht, du musst nur fertig werden.', ms: 17000, low: true },
    simon: { name: 'APRIL SAGT', rule: 'Merk dir die Farben. Dann nachdrücken. Länger = mehr Aura.', ms: 24000, low: false },
    umfrage: { name: 'RIZZ-UMFRAGE', rule: 'Wähl die Antwort, die die meisten nehmen. Die Mehrheit hat Rizz.', ms: 13000, low: false, derived: true },
    teilen: { name: 'TEILEN ODER KLAUEN', rule: 'Teilen alle, gibt es Aura für alle. Klaut genau eine Person, kassiert sie alles. Klauen mehrere: alle Klauer cooked.', ms: 13000, low: false, derived: true },
    loslassen: { name: 'WER ZULETZT LOSLÄSST', rule: 'Halt den Knopf gedrückt. Wer zuletzt loslässt, gewinnt. April wird dich ablenken.', ms: 23000, low: false },
  };
  const LEVELS = ['Normal (noch)', 'Leicht komisch', 'Sus', 'Ohio', 'Ultra-Ohio', 'Brainrot', 'SKIBIDI-DIMENSION'];
  const MODS = {
    mirror: 'Bildschirm gespiegelt', comic: 'Comic Sans Pflicht', shake: 'Erdbeben', ducks: 'Enten-Invasion', tiny: 'Alles winzig', blur: 'Brille vergessen',
    disco: 'Disco-Modus', upside: 'Australien-Modus (kopfüber)', speed: 'Turbo (weniger Zeit)', invert: 'WERTUNG UMGEDREHT', double: 'DOPPELTE AURA',
  };
  const VISUAL = ['mirror', 'comic', 'shake', 'ducks', 'tiny', 'blur', 'disco'];
  const QUESTIONS = [
    ['Bester Move beim ersten Date?', ['Mewing die ganze Zeit', 'Sie zahlt', 'Über Aktien reden']],
    ['Was ist der beste Döner-Ort?', ['Der um die Ecke', 'Der um 4 Uhr nachts', 'Selbst gemacht (cringe)']],
    ['Was macht ein echter Sigma um 5 Uhr morgens?', ['Kalt duschen', 'Schlafen wie ein Normalo', 'Reels gucken']],
    ['Größter Red Flag?', ['Schreibt „k.“', 'Mag keine Enten', 'Isst Pizza mit Messer']],
    ['Was sagt man, wenn man verliert?', ['GG ez', 'Lag', 'Ich hab euch gewinnen lassen']],
    ['Lieblingsgetränk von April?', ['Strom', 'Energy mit Strom', 'Tränen der Verlierer']],
    ['Wo gehört Ananas hin?', ['Auf Pizza', 'Nach Ohio', 'Nirgendwohin']],
    ['Was ist das cringeste Wort?', ['Lit', 'Yolo', 'Swag']],
  ];
  const TEXTS = ['Tralalero tralala', 'Bombardiro crocodilo', 'six seven six seven', 'tung tung tung sahur', 'skibidi dop dop yes yes', 'ballerina cappuccina', 'aura farming ist mein job', 'mewing ohne pause'];

  // ---------- April-Kommentare ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (o[k] != null ? o[k] : ''));
  const SAY = {
    intro: ['Runde {n}: {game}. Weirdness-Level: {level}. Ich hab selbst keine Ahnung, was jetzt passiert.', 'Okay Leute, {game}. Level {level}. Bitte nicht weinen.', '{game}! April-Tipp: einfach gut sein. Hilft immer.', 'Nächstes Spiel: {game}. Die Regeln wurden von einer Ente geschrieben.'],
    weird: ['Neu in dieser Runde: {mods}. Ich entschuldige mich nicht.', 'Achtung: {mods}. Das war nicht meine Idee. Doch, war es.', 'Modifikatoren: {mods}. Die Physik hat gekündigt.'],
    win: ['{w} holt Platz 1 und +{a} Aura. Absolute Sigma-Energie.', '{w} gewinnt. Leute, das war einfach krass. Six seven.', '{w} hat gerade so viel Aura gefarmt, dass mein Server warm wird.', 'GG. {w} ist offiziell nicht mehr von dieser Welt.'],
    lose: ['{l} landet ganz unten und verliert {a} Aura. Unlucky. Oder Skill Issue.', '{l}: So cooked hab ich noch niemanden gesehen.', '{l} spielt heute im NPC-Modus.', 'Ein Moment der Stille für {l}. Okay, vorbei.'],
    tie: ['Unentschieden. Langweilig. Aura für alle, aber ich bin enttäuscht.'],
    early: ['{l} hat zu früh gedrückt. Ungeduld ist auch eine Aura. Eine schlechte.'],
    steal1: ['{w} hat alle verraten und kassiert alles. Toxisch. Aber Sigma.'],
    stealN: ['Mehrere Klauer. Alle cooked. Ich liebe Drama.'],
    share: ['Alle haben geteilt. Wholesome. Ich muss kurz weinen.'],
    final: ['Das große Finale. Jetzt geht es um alles. Also um Aura.'],
    end: ['{w} ist der Sigma des Abends. Alle anderen: NPCs.', 'Mit {a} Aura gewinnt {w}. Ich ruf schon mal die Presse an.', '{w} gewinnt die Aura Games. Bitte gebt {w} keinen Spiegel, sonst verliebt sich {w} noch.'],
    last: ['{l} ist der offizielle NPC des Abends. Respekt fürs Mitmachen.', '{l}, Aura im Keller. Aber immerhin dabei.'],
  };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const now = () => Date.now();
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function start(players, settings, prev) {
    const rounds = Math.max(3, Math.min(9, Number(settings && settings.rounds) || 7));
    const pool = shuffle(Object.keys(GAMES).filter((g) => g !== 'loslassen'));
    const order = pool.slice(0, rounds - 1).concat('loslassen'); // Finale immer: Wer zuletzt loslässt
    const S = {
      players: players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, color: p.color })), order, round: -1, rounds,
      aura: {}, phase: 'intro', ends: 0, phaseId: 0, sub: {}, res: null, say: '', voice: 'aura-start', log: [], over: false, wins: prev && prev.wins ? prev.wins : {}, botPlan: {},
      // Revanche: startet jedes Mal ein Weirdness-Level höher
      extra: prev && prev.over ? Math.min(3, (prev.extra || 0) + 1) : 0,
    };
    S.players.forEach((p) => { S.aura[p.id] = 0; });
    next(S);
    S.say = `${S.extra ? `Revanche Nummer ${S.extra}. Wir starten direkt komischer.` : `Willkommen bei den AURA GAMES. ${S.rounds} Runden, jede komischer als die davor.`} ${S.say}`;
    return S;
  }
  function next(S) {
    S.round++;
    const lvl = Math.min(LEVELS.length - 1, S.extra + Math.floor(S.round * (LEVELS.length - 1) / Math.max(1, S.rounds - 1)));
    const g = S.order[S.round];
    // Mods: ab Level 1 wird es komisch, im Finale alles
    const mods = shuffle(VISUAL.slice()).slice(0, Math.min(4, lvl));
    if (lvl >= 3 && Math.random() < 0.5) mods.push('upside');
    if (lvl >= 2 && Math.random() < 0.35) mods.push('speed');
    if (lvl >= 3 && !GAMES[g].derived && g !== 'loslassen' && Math.random() < 0.3) mods.push('invert');
    if (lvl >= 4 || S.round === S.rounds - 1) mods.push('double');
    Object.assign(S, { game: g, level: lvl, mods, seed: Math.floor(Math.random() * 1e9), phase: 'intro', ends: now() + 7500, phaseId: S.phaseId + 1, sub: {}, res: null, botPlan: {} });
    const last = S.round === S.rounds - 1;
    S.say = fill(pick(last ? SAY.final : SAY.intro), { n: S.round + 1, game: GAMES[g].name, level: LEVELS[lvl] }) + (mods.length ? ` ${fill(pick(SAY.weird), { mods: mods.map((m) => MODS[m]).join(', ') })}` : '');
    S.voice = last ? 'aura-final' : lvl >= 3 ? 'aura-weird' : 'aura-round';
  }
  const dur = (S) => Math.round(GAMES[S.game].ms * (S.mods.includes('speed') ? 0.8 : 1));
  function play(S) {
    Object.assign(S, { phase: 'play', ends: now() + dur(S) + 1200, phaseId: S.phaseId + 1, voice: '' });
    // Bots planen ihr Ergebnis
    S.players.filter((p) => p.bot).forEach((p) => { S.botPlan[p.id] = { at: now() + rnd(1500, dur(S) - 500), score: botScore(S) }; });
  }
  function botScore(S) {
    const sk = Math.random();
    switch (S.game) {
      case 'reaktion': return Math.random() < 0.12 ? 9999 : Math.round(230 + (1 - sk) * 380);
      case 'spam': return Math.round(22 + sk * 38);
      case 'hold67': return Math.round(Math.abs(rnd(-1.6, 1.6) * (1 - sk)) * 1000) / 1000;
      case 'enten': return Math.round(Math.abs(rnd(-5, 5) * (1 - sk * 0.8)));
      case 'tippen': return Math.round(3200 + (1 - sk) * 7000);
      case 'simon': return Math.floor(sk * (5 + S.level)) * 100000 - Math.round(rnd(3000, 9000));
      case 'umfrage': return Math.floor(Math.random() * 3);
      case 'teilen': return Math.random() < 0.65 ? 0 : 1;
      case 'loslassen': return Math.round(rnd(4000, 21000));
    }
    return 0;
  }
  // Ergebnis berechnen: Rangliste, Aura verteilen, Kommentar
  function score(S) {
    const G = GAMES[S.game], P = S.players, n = P.length;
    const raw = {};
    P.forEach((p) => { raw[p.id] = S.sub[p.id] != null ? S.sub[p.id] : null; });
    let val = {}, low = G.low, extra = '';
    if (S.game === 'umfrage') {
      const cnt = [0, 0, 0]; P.forEach((p) => { if (raw[p.id] != null) cnt[raw[p.id]]++; });
      P.forEach((p) => { val[p.id] = raw[p.id] == null ? -1 : cnt[raw[p.id]]; });
      const q = QUESTIONS[S.seed % QUESTIONS.length];
      extra = `Antworten: ${q[1].map((a, i) => `${a} (${cnt[i]})`).join(', ')}.`;
    } else if (S.game === 'teilen') {
      const st = P.filter((p) => raw[p.id] === 1), sh = P.filter((p) => raw[p.id] === 0);
      P.forEach((p) => { val[p.id] = raw[p.id] == null ? -5 : st.length === 0 ? 1 : st.length === 1 ? (raw[p.id] === 1 ? 3 : 0) : (raw[p.id] === 1 ? -1 : 1); });
      extra = fill(pick(st.length === 0 ? SAY.share : st.length === 1 ? SAY.steal1 : SAY.stealN), { w: st[0] && st[0].name });
    } else {
      P.forEach((p) => { val[p.id] = raw[p.id] == null ? (low ? Infinity : -Infinity) : raw[p.id]; });
    }
    if (S.mods.includes('invert')) low = !low;
    const ranked = P.slice().sort((a, b) => (low ? val[a.id] - val[b.id] : val[b.id] - val[a.id]));
    // Platz mit Gleichstand
    const place = {}; let pl = 0;
    ranked.forEach((p, i) => { if (i === 0 || val[p.id] !== val[ranked[i - 1].id]) pl = i; place[p.id] = pl; });
    const mult = (1 + S.level * 0.25) * (S.mods.includes('double') ? 2 : 1);
    const TABLE = [1000, 500, 250, 120];
    const gain = {};
    ranked.forEach((p) => {
      const k = place[p.id];
      let a = Math.round((TABLE[k] != null ? TABLE[k] : 80) * mult);
      if (n >= 3 && k === place[ranked[n - 1].id] && k > 0) a = -Math.round(300 * mult);
      if (!isFinite(val[p.id]) || val[p.id] === -5) a = -Math.round(300 * mult);
      gain[p.id] = a; S.aura[p.id] += a;
    });
    const w = ranked[0], l = ranked[n - 1];
    const allTie = ranked.every((p) => place[p.id] === 0);
    let say = allTie ? pick(SAY.tie) : fill(pick(SAY.win), { w: w.name, a: gain[w.id] });
    if (S.game === 'reaktion' && raw[l.id] === 9999) say += ` ${fill(pick(SAY.early), { l: l.name })}`;
    else if (n >= 3 && !allTie && gain[l.id] < 0) say += ` ${fill(pick(SAY.lose), { l: l.name, a: -gain[l.id] })}`;
    if (extra) say = `${extra} ${say}`;
    S.res = { ranked: ranked.map((p) => ({ id: p.id, raw: raw[p.id], place: place[p.id], gain: gain[p.id] })), low, inverted: S.mods.includes('invert') };
    S.say = say; S.voice = allTie ? '' : (gain[l.id] < 0 && Math.random() < 0.4 ? 'aura-loseround' : 'aura-winround');
    S.log.push(`R${S.round + 1} ${GAMES[S.game].name}: ${w.name} gewinnt`);
  }
  function result(S) {
    score(S);
    Object.assign(S, { phase: 'result', ends: now() + 8000, phaseId: S.phaseId + 1 });
  }
  function finish(S) {
    const ranked = S.players.slice().sort((a, b) => S.aura[b.id] - S.aura[a.id]);
    const w = ranked[0], l = ranked[ranked.length - 1];
    S.over = true; S.phase = 'over'; S.phaseId++;
    S.winners = ranked.filter((p) => S.aura[p.id] === S.aura[w.id]).map((p) => p.id);
    S.winners.forEach((id) => { S.wins[id] = (S.wins[id] || 0) + 1; });
    S.say = fill(pick(SAY.end), { w: w.name, a: S.aura[w.id].toLocaleString('de-DE') }) + (ranked.length > 1 ? ` ${fill(pick(SAY.last), { l: l.name })}` : '');
    S.voice = 'aura-end';
  }

  function act(S, pid, a) {
    if (!S.players.some((p) => p.id === pid)) return 'Du spielst nicht mit.';
    if (a.type === 'tick') {
      if (S.over || now() < S.ends - 150) return null;
      if (S.phase === 'intro') play(S);
      else if (S.phase === 'play') result(S);
      else if (S.phase === 'result') { if (S.round >= S.rounds - 1) finish(S); else next(S); }
      return null;
    }
    if (a.type === 'submit') {
      if (S.phase !== 'play') return null;
      if (S.sub[pid] != null) return null;
      let v = Number(a.score);
      if (!isFinite(v)) return 'Ungültig.';
      if (S.game === 'umfrage' || S.game === 'teilen') v = Math.max(0, Math.min(S.game === 'teilen' ? 1 : 2, Math.round(v)));
      S.sub[pid] = v;
      if (S.players.every((p) => S.sub[p.id] != null)) result(S);
      return null;
    }
    return 'Unbekannte Aktion.';
  }
  // Während des Spiels sieht niemand die Ergebnisse der anderen, nur wer schon fertig ist
  function view(S) {
    const V = Object.assign({}, S, { leftMs: Math.max(0, S.ends - now()), botPlan: undefined });
    if (S.phase === 'play') { V.sub = {}; Object.keys(S.sub).forEach((k) => { V.sub[k] = true; }); }
    return V;
  }
  // Bots und die Uhr: der nächste fällige Schritt
  function bot(S) {
    if (S.over) return null;
    const host = S.players[0].id;
    let best = { pid: host, action: { type: 'tick' }, at: S.ends };
    if (S.phase === 'play') Object.entries(S.botPlan).forEach(([id, b]) => { if (S.sub[id] == null && b.at < best.at) best = { pid: id, action: { type: 'submit', score: b.score }, at: b.at }; });
    return { pid: best.pid, action: best.action, delay: Math.max(60, best.at - now()) };
  }

  const AURA = { GAMES, LEVELS, MODS, QUESTIONS, TEXTS, start, act, view, bot };
  if (typeof module !== 'undefined' && module.exports) module.exports = AURA;
  else root.DULI_AURA = AURA;
})(typeof window !== 'undefined' ? window : globalThis);
