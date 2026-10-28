// Dulidan – Musik-Engine: komplett im Browser synthetisiert (Web Audio), keine Dateien.
// Präziser Sequencer mit Vorausplanung, Master-Kompressor, Hall, Delay und Sidechain-Ducking (die Kick drückt die Synths weg).
// Tracks:
//   anthem  – „DULIDAN ANTHEM“: Dark-Trap/Phonk-Synthwave, 140 BPM, f-Moll. Intro → Build-up → Drop → Breakdown → Build-up → Drop mit Cowbell.
//   classic – „Synthwave Classic“: der alte Loop (Am · F · C · G), unverändert gespeichert.
(function (root) {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let ctx = null, master = null, duck = null, drums = null, rev = null, dly = null, dlyFb = null, noiseBuf = null, shape = null, duckBuf = null;
  let vol = 0.7, trackId = 'anthem', playing = false, muted = false, timer = null, step = 0, nextT = 0;
  try { const v = Number(localStorage.getItem('duli-music-vol')); if (v >= 0 && v <= 1 && localStorage.getItem('duli-music-vol') !== null) vol = v; trackId = localStorage.getItem('duli-music-track') || 'anthem'; } catch (e) { /* privat */ }

  // ---------- Audio-Graph ----------
  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function graph() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    return wire(new C());
  }
  // Baut Bus, Hall, Delay usw. auf einem (Live- oder Offline-)Kontext auf
  function wire(c) {
    ctx = c;
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.06;
    const trim = ctx.createGain(); trim.gain.value = 0.85;
    master.connect(comp).connect(trim).connect(lim).connect(ctx.destination);
    duck = ctx.createGain(); duck.connect(master);
    drums = ctx.createGain(); drums.connect(master);
    rev = ctx.createConvolver(); rev.buffer = impulse(2.8, 2.6);
    const rg = ctx.createGain(); rg.gain.value = 0.32; rev.connect(rg).connect(duck);
    dly = ctx.createDelay(2); dlyFb = ctx.createGain(); dlyFb.gain.value = 0.36;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    const dg = ctx.createGain(); dg.gain.value = 0.28;
    dly.connect(dlp).connect(dlyFb).connect(dly); dlp.connect(dg).connect(duck);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Sidechain-Hüllkurve: wird pro Kick auf die Lautstärke des Synth-Busses addiert (−0,72 → 0)
    duckBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.26), ctx.sampleRate);
    const db = duckBuf.getChannelData(0); for (let i = 0; i < db.length; i++) db[i] = -0.72 * Math.pow(1 - i / db.length, 1.6);
    shape = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; shape[i] = Math.tanh(x * 3.2); }
    return ctx;
  }
  // Hüllkurve: 0 → peak in a, dann exponentiell auf 0 bis t+d
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, d)); }
  function osc(type, f, t, d, dest, det) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; o.connect(dest); o.start(t); o.stop(t + d + 0.05); return o; }
  function noise(t, d, dest) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05); return s; }
  function filt(type, f, q) { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
  // Rauschen durch einen Filter in ein Ziel
  function nf(t, d, type, f, dest, q) { const x = filt(type, f, q); x.connect(dest); return noise(t, d, x); }
  function gain(v, ...to) { const g = ctx.createGain(); g.gain.value = v; to.forEach((n) => g.connect(n)); return g; }

  // ---------- Instrumente ----------
  const I = {
    kick(t, v = 1) {
      const g = gain(0, drums); env(g, t, 0.002, 1.1 * v, 0.42);
      const o = osc('sine', 165, t, 0.45, g); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
      const cg = gain(0, drums); env(cg, t, 0.001, 0.35 * v, 0.018); nf(t, 0.02, 'highpass', 3000, cg);
      // Sidechain: Synths kurz wegdrücken
      const ds = ctx.createBufferSource(); ds.buffer = duckBuf; ds.connect(duck.gain); ds.start(t);
    },
    bass(t, n, d, glideTo, glideAt) { // 808 mit Sättigung und Glide
      const ws = ctx.createWaveShaper(); ws.curve = shape;
      const lp = filt('lowpass', 1100); const g = gain(0, drums); ws.connect(lp).connect(g);
      env(g, t, 0.004, 0.62, d);
      const pre = gain(1, ws), o = osc('sine', midi(n), t, d, pre), sub = osc('sine', midi(n - 12), t, d, gain(0.55, g));
      if (glideTo != null) [o, sub].forEach((x, i) => { x.frequency.setValueAtTime(midi(n - 12 * i), t + glideAt); x.frequency.exponentialRampToValueAtTime(midi(glideTo - 12 * i), t + glideAt + 0.09); });
    },
    clap(t, v = 1) {
      const bp = filt('bandpass', 1500, 0.8), g = gain(0, drums, rev); bp.connect(g);
      [0, 0.011, 0.022].forEach((o) => { g.gain.setValueAtTime(0.75 * v, t + o); g.gain.exponentialRampToValueAtTime(0.08, t + o + 0.009); });
      g.gain.setValueAtTime(0.6 * v, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      noise(t, 0.26, bp);
    },
    snare(t, v = 1) {
      const g = gain(0, drums); env(g, t, 0.001, 0.5 * v, 0.14); nf(t, 0.16, 'highpass', 1800, g);
      const tg = gain(0, drums); env(tg, t, 0.001, 0.32 * v, 0.08); const o = osc('triangle', 210, t, 0.1, tg); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    },
    hat(t, v = 1, open = false) {
      const g = gain(0, drums); env(g, t, 0.001, (open ? 0.26 : 0.24) * v, open ? 0.28 : 0.04);
      nf(t, open ? 0.3 : 0.05, 'highpass', open ? 7000 : 8500, g);
    },
    crash(t) { const g = gain(0, drums, rev); env(g, t, 0.002, 0.28, 2.2); nf(t, 2.3, 'highpass', 4500, g); },
    riser(t, d) {
      const bp = filt('bandpass', 300, 1.6), g = gain(0, duck, rev); bp.connect(g);
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + d); g.gain.setValueAtTime(0.0001, t + d + 0.01);
      noise(t, d, bp);
    },
    impact(t) { // Sub-Drop beim Einsatz
      const g = gain(0, drums, rev); env(g, t, 0.003, 0.7, 1.6); const o = osc('sine', 90, t, 1.7, g); o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    },
    saw(t, notes, d, cut, v = 0.06, wet = 0.4) { // Supersaw-Stab oder -Akkord
      const lp = filt('lowpass', cut, 2), g = gain(0, duck), s = gain(wet, rev); lp.connect(g); g.connect(s);
      env(g, t, 0.006, v, d);
      lp.frequency.setValueAtTime(cut, t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.35), t + d);
      notes.forEach((n, k) => (k ? [-11, 11] : [-15, 0, 15]).forEach((det) => osc('sawtooth', midi(n), t, d, lp, det + (Math.random() - 0.5) * 3)));
    },
    pad(t, notes, d, cut) {
      const lp = filt('lowpass', cut, 0.7), g = gain(0, duck, rev); lp.connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + d * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.3);
      notes.forEach((n, k) => { osc('sawtooth', midi(n), t, d + 0.3, lp, k % 2 ? -9 : 9); if (!k) osc('triangle', midi(n - 12), t, d + 0.3, lp); });
    },
    lead(t, n, d, v = 0.075) {
      const lp = filt('lowpass', 4200, 4), g = gain(0, duck, dly, rev); lp.connect(g); v *= 1.25;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v * 0.8, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.12);
      lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1400, t + d);
      const a = osc('sawtooth', midi(n), t, d + 0.15, lp, -6), b = osc('square', midi(n), t, d + 0.15, lp, 7);
      if (d > 0.25) [a, b].forEach((o) => { const l = ctx.createOscillator(), lg = gain(0); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(22, t + d); l.connect(lg).connect(o.detune); l.start(t); l.stop(t + d + 0.2); });
    },
    pluck(t, n, v = 0.06) {
      const lp = filt('lowpass', 3200, 3), g = gain(0, duck, dly, rev); lp.connect(g); env(g, t, 0.002, v, 0.32);
      lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
      osc('triangle', midi(n), t, 0.35, lp); osc('square', midi(n + 12), t, 0.35, gain(0.25, lp));
    },
    cowbell(t, n, v = 0.11) { // Phonk-Cowbell: zwei Rechtecke im Quinten-Abstand, Bandpass, Sättigung
      const ws = ctx.createWaveShaper(); ws.curve = shape;
      const bp = filt('bandpass', midi(n) * 1.55, 2.2), g = gain(0, duck, rev); bp.connect(ws).connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc('square', midi(n), t, 0.45, bp); osc('square', midi(n) * 1.4836, t, 0.45, bp);
    },
    vinyl(t, d) { const g = gain(0.012, duck); nf(t, d, 'bandpass', 1800, g, 0.4); },
    tone(t, f, d, type, v, dest) { const g = gain(0, dest || duck); env(g, t, 0.01, v, d); osc(type, f, t, d, g); },
  };

  // ---------- Track 1: DULIDAN ANTHEM ----------
  const CH = [[53, 56, 60, 65], [49, 53, 56, 61], [56, 60, 63, 68], [51, 55, 58, 63]]; // Fm · Db · Ab · Eb
  const ROOT = [41, 37, 44, 39];
  // Hook über vier Takte: [Schritt, Note, Länge in Schritten]
  const HOOK = [
    [[0, 72, 3], [3, 75, 3], [6, 77, 2], [8, 75, 2], [10, 72, 2], [12, 70, 2], [14, 68, 2]],
    [[0, 72, 3], [3, 68, 3], [6, 65, 5], [12, 67, 2], [14, 68, 2]],
    [[0, 75, 3], [3, 77, 3], [6, 80, 2], [8, 79, 2], [10, 75, 2], [12, 72, 2], [14, 70, 2]],
    [[0, 70, 3], [3, 72, 3], [6, 67, 5], [12, 70, 2], [14, 72, 2]],
  ];
  const COW = [[0, 77], [2, 77], [4, 80], [6, 77], [8, 75], [10, 77], [11, 80], [12, 82], [14, 80]];
  const SECTIONS = [['intro', 8], ['build', 8], ['drop', 16], ['break', 8], ['build', 4], ['drop2', 16]];
  const TOTAL = SECTIONS.reduce((s, x) => s + x[1], 0) * 16;
  function where(i) {
    let bar = Math.floor(i / 16) % (TOTAL / 16);
    for (const [name, len] of SECTIONS) { if (bar < len) return { name, bar, len }; bar -= len; }
    return { name: 'intro', bar: 0, len: 8 };
  }
  const anthem = {
    name: 'DULIDAN ANTHEM', sub: 'Dark Trap · Phonk · 140 BPM', bpm: 140,
    step(i, t, S) {
      const s = i % 16, w = where(i), c = (w.bar) % 4, last = w.bar === w.len - 1, chord = CH[c], root = ROOT[c];
      const bar1 = w.bar % 2 === 1;
      if (w.name === 'intro') {
        if (s === 0) I.pad(t, chord, S * 16, 350 + w.bar * 320);
        if (s === 0 && w.bar === 0) I.vinyl(t, S * 16 * 8);
        if (w.bar >= 4) HOOK[c].forEach(([st, n]) => { if (st === s) I.pluck(t, n, 0.045); });
        if (w.bar >= 2 && s === 0) I.kick(t, 0.5);
        if (last && s === 0) I.riser(t, S * 16);
      }
      if (w.name === 'build') {
        const prog = w.bar / w.len;
        if (s % 4 === 0) I.kick(t, 0.85);
        if (s === 4 || s === 12) I.clap(t, 0.8);
        if (prog >= 0.5 ? true : s % 2 === 0) I.hat(t, 0.5 + prog * 0.5);
        if (w.bar >= w.len - 2) { const every = w.bar === w.len - 1 ? 1 : 2; if (s % every === 0 && !(last && s >= 14)) I.snare(t, 0.35 + (s / 16) * 0.6); }
        if (s % 2 === 0) I.pluck(t, chord[(s / 2) % 4] + 12, 0.03 + prog * 0.04);
        if (s === 0) I.pad(t, chord, S * 16, 900 + prog * 2600);
        if (w.bar === w.len - 2 && s === 0) I.riser(t, S * 30);
      }
      if (w.name === 'drop' || w.name === 'drop2') {
        const two = w.name === 'drop2';
        if (w.bar === 0 && s === 0) { I.crash(t); I.impact(t); }
        // Trap-Drums (Halftime)
        if (s === 0 || s === 10 || (bar1 && s === 7) || (!bar1 && w.bar % 4 === 2 && s === 14)) I.kick(t);
        if (s === 8) { I.clap(t); I.snare(t, 0.5); }
        if (bar1 && s >= 12) { for (let k = 0; k < 3; k++) I.hat(t + k * S / 3, 0.55 + k * 0.12); } // Hi-Hat-Roll (Triolen)
        else if (s % 2 === 0) I.hat(t, s % 4 === 0 ? 0.9 : 0.6);
        else if (two) I.hat(t, 0.35);
        if (s === 14 && w.bar % 4 === 3) I.hat(t, 0.8, true);
        // 808 mit Glides
        if (s === 0) I.bass(t, root, S * 6.5);
        if (s === 7) I.bass(t, root, S * 3);
        if (s === 10) I.bass(t, root, S * 4, bar1 ? root + 12 : null, S * 2);
        if (s === 14) I.bass(t, bar1 ? root + 12 : root + 7, S * 2, bar1 ? root : null, S);
        // Supersaw-Stabs
        if ([0, 3, 6, 10].includes(s)) I.saw(t, chord.map((n) => n + 12), S * (s === 6 ? 3 : 2), two ? 5200 : 4200, 0.045);
        if (s === 0 && two) I.pad(t, chord, S * 16, 1600);
        // Hook-Lead (im zweiten Drop eine Oktave höher in der zweiten Hälfte)
        const hookOn = !two || w.bar >= 8;
        if (hookOn) HOOK[c].forEach(([st, n, len]) => { if (st === s) I.lead(t, n + (two ? 12 : 0), S * len, two ? 0.06 : 0.075); });
        if (two) COW.forEach(([st, n]) => { if (st === s) I.cowbell(t, n - (w.bar >= 8 ? 12 : 0), w.bar >= 8 ? 0.08 : 0.11); });
        if (last && s === 0 && w.name === 'drop') I.riser(t, S * 16);
      }
      if (w.name === 'break') {
        if (s === 0) I.pad(t, chord, S * 16, 1300);
        if (s === 0) I.bass(t, root, S * 12);
        const h = HOOK[c].find(([st]) => st === s);
        if (h) I.pluck(t, h[1] + 12, 0.05);
        if (s % 4 === 2) I.hat(t, 0.3);
        if (w.bar >= 4 && s === 8) I.clap(t, 0.5);
        if (last && s === 0) I.riser(t, S * 16);
      }
    },
  };

  // ---------- Track 2: Synthwave Classic (der alte Loop, unverändert) ----------
  const BARS = [[45, 0, 3, 7], [41, 0, 4, 7], [48, 0, 4, 7], [43, 0, 4, 7]]; // Am · F · C · G
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const classic = {
    name: 'Synthwave Classic', sub: 'der alte Loop · Am F C G', stepDur: 0.2,
    step(beat, t) {
      const bar = BARS[Math.floor(beat / 8) % BARS.length], r = bar[0], out = gain(2.6, master);
      if (beat % 8 === 0) { I.tone(t, midi(r - 12), 1.4, 'triangle', 0.06, out); I.tone(t, midi(r + 12), 1.4, 'sawtooth', 0.012, out); }
      if (beat % 4 === 0) { const g = gain(0, out); env(g, t, 0.01, 0.09, 0.18); const o = osc('sine', 60, t, 0.18, g); o.frequency.exponentialRampToValueAtTime(40, t + 0.18); }
      if (beat % 2 === 1) { const g = gain(0, out); g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025); nf(t, 0.03, 'bandpass', 2400, g); }
      I.tone(t, midi(r + 24 + bar[1 + (ARP[beat % 8] % 3)] + (ARP[beat % 8] === 3 ? 12 : 0)), 0.14, 'square', 0.016, out);
    },
  };

  const TRACKS = { anthem, classic };
  const stepDur = (tr) => tr.stepDur || 60 / tr.bpm / 4;

  // ---------- Sequencer ----------
  function tick() {
    if (!playing || !ctx) return;
    const tr = TRACKS[trackId] || anthem, S = stepDur(tr), ahead = document.hidden ? 1.5 : 0.18;
    while (nextT < ctx.currentTime + ahead) {
      try { tr.step(step, nextT, S); } catch (e) { /* ein Ton fällt aus, weiter */ }
      step++; nextT += S;
    }
  }
  function start(id) {
    if (id && TRACKS[id]) { trackId = id; try { localStorage.setItem('duli-music-track', id); } catch (e) { /* privat */ } }
    if (!graph()) return false;
    const tr = TRACKS[trackId] || anthem;
    dly.delayTime.value = stepDur(tr) * 3;
    step = 0; nextT = ctx.currentTime + 0.08; playing = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime); master.gain.linearRampToValueAtTime(muted ? 0 : vol, ctx.currentTime + 0.4);
    clearInterval(timer); timer = setInterval(tick, 25); tick();
    return true;
  }
  function stop() {
    playing = false; clearInterval(timer); timer = null;
    if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35); }
  }
  function setVol(v) {
    vol = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('duli-music-vol', String(vol)); } catch (e) { /* privat */ }
    if (ctx && playing && !muted) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(vol, ctx.currentTime, 0.05); }
  }
  function setMuted(m) {
    muted = !!m;
    if (ctx && playing) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.05); }
  }
  // Abschnitt, der gerade läuft (für Anzeige)
  const section = () => (trackId === 'anthem' && playing ? ({ intro: 'Intro', build: 'Build-up', drop: 'Drop', break: 'Breakdown', drop2: 'Drop 2' })[where(step).name] : '');

  // Ganzen Track offline rendern (für Download als WAV und für Tests)
  async function render(id, secs) {
    const tr = TRACKS[id] || anthem, S = stepDur(tr);
    const len = secs || (tr === anthem ? TOTAL * S + 2.5 : 32 * S * 4), end = len - (tr === anthem && !secs ? 2.4 : 0);
    const OC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    const live = () => [ctx, master, duck, drums, rev, dly, dlyFb, noiseBuf, shape, duckBuf];
    const use = (st) => { [ctx, master, duck, drums, rev, dly, dlyFb, noiseBuf, shape, duckBuf] = st; };
    const saved = live(), off = new OC(2, Math.ceil(44100 * len), 44100);
    let offState, i = 0, t = 0.05;
    try { wire(off); master.gain.value = 0.85; dly.delayTime.value = S * 3; offState = live(); } finally { use(saved); }
    // Sekundenweise planen (wie live): sonst hängen alle Töne gleichzeitig im Graphen und das Rendern wird quälend langsam
    const plan = (until) => { const keep = live(); use(offState); try { while (t < Math.min(until, end)) { tr.step(i, t, S); i++; t += S; } } finally { use(keep); } };
    plan(1.5);
    const hop = (k) => off.suspend(k).then(() => { plan(k + 1.5); if (k + 1 < len) hop(k + 1); off.resume(); });
    if (len > 1) hop(1);
    return off.startRendering();
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, data = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, str) => { for (let i = 0; i < str.length; i++) data.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
    data.setUint32(24, buf.sampleRate, true); data.setUint32(28, buf.sampleRate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * ch * 2, true);
    const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
    for (let i = 0, o = 44; i < n; i++) for (let k = 0; k < ch; k++, o += 2) data.setInt16(o, Math.max(-1, Math.min(1, chans[k][i])) * 32767, true);
    return new Blob([data], { type: 'audio/wav' });
  }
  async function download(id) {
    const tr = TRACKS[id] || anthem, b = wav(await render(id));
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${tr.name.replace(/\W+/g, '-')}.wav`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  root.DULI_MUSIC = {
    render, wav, download,
    start, stop, setVol, setMuted, section,
    get playing() { return playing; }, get track() { return trackId; }, get vol() { return vol; },
    tracks: Object.entries(TRACKS).map(([id, t]) => ({ id, name: t.name, sub: t.sub })),
  };
})(window);
