// Dulidanopoly – Sounds (selbst synthetisiert, keine Dateien) und Konfetti
(function (root) {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('duli-mute') === '1'; } catch (e) { /* privat */ }

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.15, slideTo) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(start, dur, vol = 0.2) {
    const c = ac();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = buf; g.gain.value = vol; f.type = 'bandpass'; f.frequency.value = 2400;
    s.connect(f).connect(g).connect(c.destination);
    s.start(c.currentTime + start);
  }

  const SFX = {
    roll() { for (let i = 0; i < 7; i++) noise(i * 0.055, 0.04, 0.3); },
    cash() { tone(880, 0, 0.12, 'square', 0.06); tone(1320, 0.08, 0.28, 'square', 0.06); },
    pay() { tone(440, 0, 0.16, 'triangle', 0.14, 330); tone(330, 0.13, 0.28, 'triangle', 0.14, 200); },
    jail() { tone(320, 0, 0.6, 'sawtooth', 0.07, 110); tone(240, 0.06, 0.6, 'sawtooth', 0.05, 80); },
    card() { tone(660, 0, 0.08, 'sine', 0.14); tone(990, 0.06, 0.14, 'sine', 0.14); },
    turn() { tone(784, 0, 0.12, 'sine', 0.16); tone(1175, 0.12, 0.22, 'sine', 0.16); },
    build() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.12, 'square', 0.05)); },
    pot() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.12)); },
    win() { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.24, 'square', 0.06)); },
    pop() { tone(1200, 0, 0.07, 'sine', 0.1, 600); },
    step() { tone(1500, 0, 0.03, 'square', 0.025); },
  };

  function confetti() {
    const cv = document.getElementById('confetti');
    if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cv.hidden = false;
    const W = cv.width = innerWidth, H = cv.height = innerHeight;
    const g = cv.getContext('2d');
    const colors = ['#da29cf', '#8122b5', '#f6f1fc', '#ffd83a', '#3ad1ff'];
    const parts = Array.from({ length: 180 }, () => ({
      x: Math.random() * W, y: -20 - Math.random() * H * 0.5,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
      r: 4 + Math.random() * 6, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const end = performance.now() + 4500;
    (function frame(t) {
      g.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.a += p.va; p.vy += 0.03;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c;
        g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore();
      }
      if (t < end) requestAnimationFrame(frame);
      else { g.clearRect(0, 0, W, H); cv.hidden = true; }
    })(performance.now());
  }

  root.DULI_FX = {
    play(name) { if (!muted && SFX[name]) { try { SFX[name](); } catch (e) { /* kein Audio */ } } },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('duli-mute', muted ? '1' : '0'); } catch (e) { /* privat */ }
      if (!muted) ac();
      return muted;
    },
    unlock() { if (!muted) ac(); },
    confetti,
  };
})(window);
