// Aprils Sprüche auf allen Seiten: Untertitel unten links und – wenn aufgenommen – ihre Stimme als MP3
// (assets/voice/, einmal per tools/april-voice.mjs erzeugt, danach kein Token-Verbrauch mehr).
// Hängt sich an DULI_FX.play, damit Monopoly, UNO, Schiffe, Kniffel usw. automatisch Sprüche bekommen.
// Dazu der Periodenmodus: Strg + Alt + P (oder 5× auf April tippen).
(function () {
  const LINES = window.DULI_APRIL_LINES || [];
  const FX = window.DULI_FX;
  const BASE = 'assets/voice/';
  const KEY = 'duli-april-lines';
  let have = {}, lastLine = null, lastAt = 0, audio = null, hideT = null, period = false;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* privat */ }

  fetch(BASE + 'manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).then((m) => { have = m || {}; }).catch(() => {});

  // ---------- Untertitel ----------
  const box = document.createElement('div');
  box.className = 'av-bubble';
  box.hidden = true;
  box.innerHTML = '<button type="button" class="av-face" aria-label="April"><svg viewBox="0 0 100 100"><use href="#april"/></svg></button><p class="av-text"></p><button type="button" class="av-mute" title="Aprils Sprüche aus">aus</button>';
  const mount = () => document.body.appendChild(box);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  box.querySelector('.av-mute').onclick = () => { setOn(false); hide(); };
  let taps = [];
  box.querySelector('.av-face').onclick = () => {
    const now = Date.now();
    taps = taps.filter((t) => now - t < 2500).concat(now);
    if (taps.length >= 5) { taps = []; togglePeriod(); }
  };

  function hide() { box.hidden = true; }
  function show(text, ms) {
    box.querySelector('.av-text').textContent = text;
    box.hidden = false;
    clearTimeout(hideT);
    hideT = setTimeout(hide, ms);
  }
  function setOn(v) {
    on = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* privat */ }
    if (!v && audio) audio.pause();
  }

  // ---------- Sprechen ----------
  function pick(event) {
    const pool = LINES.filter((l) => l.on === event);
    if (!pool.length) return null;
    const rest = pool.length > 1 ? pool.filter((l) => l !== lastLine) : pool;
    return rest[Math.floor(Math.random() * rest.length)];
  }
  // event: z. B. 'start', 'win'; opts.force ignoriert die Pause zwischen Sprüchen, opts.chance würfelt
  function say(event, opts = {}) {
    if (!on && !opts.force) return false;
    if (opts.chance != null && Math.random() > opts.chance) return false;
    const now = Date.now();
    if (!opts.force && now - lastAt < 7000) return false;
    const line = pick(event);
    if (!line) return false;
    lastLine = line; lastAt = now;
    const ms = Math.max(3200, line.text.length * 75);
    show(line.text, ms);
    if (have[line.id] && !(FX && FX.muted)) {
      try {
        if (audio) audio.pause();
        audio = new Audio(BASE + line.id + '.mp3');
        audio.onloadedmetadata = () => { if (audio.duration && isFinite(audio.duration)) show(line.text, Math.max(ms, audio.duration * 1000 + 600)); };
        audio.play().catch(() => {});
      } catch (e) { /* nur Text */ }
    }
    return true;
  }

  // ---------- An die Soundeffekte hängen ----------
  const MAP = { win: ['win', 1], bigLoss: ['loss', 0.7], bigGain: ['gain', 0.6], jail: ['jail', 0.8], roll: ['roll', 0.07], card: ['card', 0.15], build: ['build', 0.25] };
  if (FX && FX.play) {
    const orig = FX.play.bind(FX);
    FX.play = (name) => { orig(name); const m = MAP[name]; if (m) say(m[0], { chance: m[1] }); };
  }

  // ---------- Periodenmodus ----------
  const fx = document.createElement('div');
  fx.className = 'av-period';
  fx.setAttribute('aria-hidden', 'true');
  function togglePeriod() {
    period = !period;
    document.body.classList.toggle('is-period', period);
    if (period) {
      fx.innerHTML = Array.from({ length: 16 }, (_, i) => `<i style="--x:${(i * 61) % 100}vw;--d:${5 + (i % 5) * 1.3}s;--w:${-((i * 0.9) % 6)}s;--r:${(i * 47) % 360}deg"></i>`).join('');
      document.body.appendChild(fx);
      say('period-on', { force: true });
    } else {
      fx.remove();
      say('period-off', { force: true });
    }
  }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.code === 'KeyP') { e.preventDefault(); togglePeriod(); }
  });
  // April verrät die Tastenkombi unten – einmal pro Sitzung nach einer Weile, und klein im Fußbereich
  setTimeout(() => {
    let told = false;
    try { told = sessionStorage.getItem('duli-period-hint') === '1'; sessionStorage.setItem('duli-period-hint', '1'); } catch (e) { /* privat */ }
    if (!told) say('period-hint', { force: true });
  }, 150000);
  document.addEventListener('DOMContentLoaded', () => {
    const foot = document.querySelector('.home-foot');
    if (foot) foot.insertAdjacentHTML('beforeend', '<br><small class="av-foot">April sagt: Strg + Alt + P. Frag nicht.</small>');
  });

  // Eine Seite kann Sounds anders deuten (z. B. Schiffe: „jail“-Ton = Treffer)
  function remap(o) { Object.assign(MAP, o); }
  window.DULI_VOICE = { say, remap, setOn, get on() { return on; }, togglePeriod, get period() { return period; }, LINES };
})();
