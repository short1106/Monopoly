// Dulidan – Menü „Andere Spiele“ oben rechts, Logo und Ton-Knopf für alle Seiten
(function () {
  let logoUid = 100;
  function logoSVG() {
    const u = 'l' + (logoUid++);
    return `<svg viewBox="0 0 700 620" aria-hidden="true"><defs>
<linearGradient id="${u}m" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4a1288"/><stop offset=".55" stop-color="#8a24cc"/><stop offset="1" stop-color="#a52fe6"/></linearGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#b42cf0"/><stop offset="1" stop-color="#e03cff"/></linearGradient>
<linearGradient id="${u}b" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3d0f78"/><stop offset="1" stop-color="#7a22bd"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c1cae"/><stop offset="1" stop-color="#7d22c4"/></linearGradient>
<clipPath id="${u}c"><path d="M200 0H380C562 0 690 135 690 310C690 485 562 620 380 620H0V606L272 440H420C478 440 512 380 512 305C512 222 466 155 372 155H200Z"/></clipPath></defs>
<path d="M0 0H150V190L0 268Z" fill="url(#${u}s)"/><path d="M0 325L188 218V425L0 540Z" fill="url(#${u}s)"/>
<g clip-path="url(#${u}c)"><rect width="700" height="620" fill="url(#${u}m)"/>
<path d="M190 -10H710V190L512 296L498 250L480 207L448 177L408 167L372 166L190 166Z" fill="url(#${u}t)"/>
<path d="M-10 640V600L272 440H420L610 548V640Z" fill="url(#${u}b)"/>
<path d="M512 296L700 188M420 440L610 548" stroke="#2a0a4a" stroke-opacity=".45" stroke-width="7"/></g></svg>`;
  }

  document.querySelectorAll('[data-logo]').forEach((el) => { if (!el.innerHTML.trim()) el.innerHTML = logoSVG(); });
  const GAMES = [
    { href: './', name: 'Dulidanopoly', sub: 'Das Brettspiel · 16 Modi', ic: '🎲' },
    { href: 'uno.html', name: 'Dulidan UNO', sub: 'Kartenspiel · 2–6 online', ic: '🃏' },
    { href: 'schiffe.html', name: 'Schiffe versenken', sub: 'Seeschlacht · 2 online', ic: '🚢' },
    { href: 'kniffel.html', name: 'Kniffel', sub: 'Würfelspiel · 1–6 online', ic: '🎲' },
    { href: 'slf.html', name: 'Stadt Land Fluss', sub: 'Schreibspiel · 2–10 online', ic: '✍️' },
    { href: 'risiko.html', name: 'Risiko', sub: 'Welteroberung · 2–6 online', ic: '⚔️' },
    { href: 'geo.html', name: 'GeoGuessr', sub: 'Satellit · Wo ist das? · online', ic: '🌍' },
    { href: 'larp.html', name: 'LARP EXTREME', sub: 'Live Action Roleplay · Abi, Führerschein, Markt · online', ic: '🎬' },
    { href: './#arcade', name: 'Spielhalle', sub: '6 Spiele für zwischendurch', ic: '🕹️' },
  ];
  const here = location.pathname.split('/').pop() || './';
  document.querySelectorAll('.games-nav').forEach((nav) => {
    nav.innerHTML = `<button type="button" class="btn btn-small btn-ghost gn-btn" aria-expanded="false">🎮 Andere Spiele ▾</button>
      <div class="gn-menu" hidden>${GAMES.map((g) => `<a href="${g.href}" class="${(g.href === here || (here === 'index.html' && g.href === './')) ? 'is-here' : ''}"><span class="gn-ic">${g.ic}</span><span><strong>${g.name}</strong><small>${g.sub}</small></span></a>`).join('')}</div>`;
    const b = nav.querySelector('.gn-btn'), m = nav.querySelector('.gn-menu');
    b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); };
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) { m.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
  });
  const FX = window.DULI_FX, snd = document.getElementById('p-sound');
  if (FX) {
    document.addEventListener('pointerdown', () => FX.unlock(), { once: true });
    if (snd) { snd.textContent = FX.muted ? '🔇' : '🔊'; snd.onclick = () => { snd.textContent = FX.toggle() ? '🔇' : '🔊'; }; }
  }
})();
