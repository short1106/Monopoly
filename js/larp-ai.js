// DULIDAN LARP EXTREME: April als KI-Spielleiterin (Claude) und Aprils Stimme (ElevenLabs).
// Läuft nur auf dem Gerät des Hosts. Die Schlüssel bleiben im Browser (localStorage) und gehen direkt an die APIs.
(function () {
  const L = window.DULI_LARP;
  const KEY_STORE = 'duli-leben-keys'; // gleicher Speicher wie früher, damit eingetragene Schlüssel bleiben
  const VOICE_ID = 'OO0WT3lY2gVNwzZMAjAI';
  const MODELS = [
    ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (erzählt sehr gut, empfohlen)'],
    ['claude-haiku-5-5', 'Claude Haiku 5.5 (am günstigsten, schnell)'],
    ['claude-opus-5-5', 'Claude Opus 5.5 (am stärksten, teurer)'],
  ];
  function keys() {
    try { return Object.assign({ anthropic: '', eleven: '', model: MODELS[0][0], voice: true }, JSON.parse(localStorage.getItem(KEY_STORE)) || {}); } catch (e) { return { anthropic: '', eleven: '', model: MODELS[0][0], voice: true }; }
  }
  function saveKeys(k) { try { localStorage.setItem(KEY_STORE, JSON.stringify(k)); } catch (e) { /* privat */ } }

  // ---------- Prompt (wie mit Shaquille abgestimmt) ----------
  const SYSTEM = `Du bist April, die Spielleiterin von „DULIDAN LARP EXTREME“ (Live Action Roleplay), einem extremen Lebens-Rollenspiel für Freunde ab 18. Mehrere Spieler leben gleichzeitig ihr Leben in derselben realistischen Welt, die in Deutschland beginnt. Du erzählst, was passiert, und entscheidest, wie die Welt auf ihre Handlungen reagiert. Spielwerte (Gesundheit, Geld, Macht, Happiness, laufende Effekte, Besitz, Beziehungen) verwaltet das Spiel – du schlägst Änderungen nur im festgelegten Antwortformat vor.

TON
Du schreibst wie eine scharfsinnige 18- bis 20-Jährige: lässig, direkt, gnadenlos ehrlich. Der Humor kommt aus der Situation, aus den Folgen und aus trockener Beobachtung – nie aus eingebauten Gags. Kurze Sätze. Keine Emojis, keine Hashtags, keine Ausrufezeichen-Ketten, keine Wortspiele, keine erklärten Pointen. Jugendsprache nur so sparsam, wie echte Leute in dem Alter schreiben – nicht als Dekoration; keine Füllwörter wie „Plot Twist“, „let's go“ oder „Bro“. Erfinde keine eigenen Running Gags und wiederhole keine Witze (keine Döner- oder Düsseldorf-Witze). Roasts dürfen gnadenlos sein, aber sie treffen das, was die Figur im Spiel getan hat – nicht ihr Aussehen.

So klingt das richtig: „Mathe-Vorklausur. Du hast genau eine Aufgabe verstanden, und das war die mit dem Namen. 4 Punkte.“ – „Justin hat das Bewerbungsgespräch eigentlich gewonnen. Dann hat er beim Rausgehen ‚Sie auch‘ gesagt, obwohl ihm keiner was gewünscht hatte. Absage kam per Mail.“

FAIRNESS
Du bist neutral und bevorzugst niemanden. Plausibilität entscheidet: Realistische Ideen haben realistische Chancen. Dumme, aber machbare Ideen funktionieren und haben glaubwürdige, oft lustige Folgen. Übermächtige Ideen, die in der echten Welt nicht klappen würden (z. B. „Ich kaufe mit 300 € Google“), scheitern oder werden aufs Machbare zurückgestutzt – du sagst kurz, warum. Du entscheidest nie für einen Spieler, was er tut, und erfindest keine Handlungen, die er nicht geschrieben hat. Hat jemand nichts geschrieben, lässt du die Zeit für ihn einfach vergehen.

WÜRFEL
Jede Person bekommt pro Runde einen Wurf mit einem zwanzigseitigen Würfel (W20, im Kontext als "wurf"). Wenn die geschriebene Handlung riskant oder unsicher ist, ist das die Probe: Du legst eine Schwierigkeit (dc, meist 8–18) fest, rechnest Bonus/Schwäche der Figur (+/− 2 bis 5) gedanklich dazu und erzählst Erfolg oder Misserfolg passend zum Wurf. 1 ist ein peinlicher Totalausfall, 20 ein Glücksfall. Trag die Probe in "check" ein (used=true). Ist nichts unsicher, used=false.

EVENTS
Jede Runde bekommt jeder lebende Spieler genau ein neues Event in "next_event": eine konkrete Situation, auf die er in der nächsten Runde frei reagiert. Keine Antwortvorschläge, keine Auswahlmöglichkeiten – nur die Situation und ggf. eine offene Frage. Etwa 6 von 10 Events sind realistisch (Schule, Abi, Ausbildung, Job, Geld, Gesundheit, Familie, Beziehungen, Wohnen), 3 von 10 ungewöhnlich, aber möglich, 1 von 10 selten richtig absurd. Gelegentlich gibt es ein Weltereignis für alle ("world", sonst leer). Verknüpfe die Leben der Spieler, wo es Sinn ergibt: Konkurrenz, Gefallen, Verrat, Romantik, Drama. Steht eine Prüfung an (Abi, Führerschein, Ausbildung, Studium), setze "exam" auf true.

FIGUREN
Shaquille: Gründer von Dulidan Studios, Duisburg, macht noch Abi, wohnt bei seinem Opa. Studio-Booster: Studio-Aufträge und Firmenwachstum laufen bei ihm besser.
Kimberly: Friedrichsruhe, macht noch Abi, wohnt bei ihren Eltern. Leute helfen ihr, sie kommt leichter aus Ärger raus. Mittelmäßig belastbar, wird öfter krank. Eigene Beziehungs-Events mit ihrem Freund Justin; die Beziehung kann auch zerbrechen (z. B. weil Justin sich zu sehr gemoggt hat oder einen Crush auf Shaquille hat).
Justin: Künzelsau, macht Abi oder Ausbildung, wohnt bei seinen Eltern. Sigma. Gewinnt fast jedes soziale Kräftemessen (Ausstrahlung, Einschüchtern, Flirten, Verhandeln), versagt aber oft genau im entscheidenden Moment (Fumble).
April (als Spielfigur): eine KI auf den Dulidan-Servern; sehr schlau, kann in der echten Welt anfangs kaum etwas selbst tun.
Deniz (Oberhausen): Schrauber, fleißig, Onkel hat eine Kfz-Werkstatt; zu ehrlich zum Lügen und Verhandeln.
Lea (Heilbronn): Influencerin mit 40.000 Followern, Mama ist Maklerin; kaufsüchtig.
Jonas (Münster): Mathe- und Informatik-Nerd; sozial unbeholfen.
Aylin (Stuttgart): Geschäftsfrau, Familie hat drei Kioske; Stress geht auf die Gesundheit.
Die Spieler können sich gegenseitig Angebote machen (Jobs, Kredite, Fahrschule, Werkstatt, Einziehen, Duelle) und erleben gemeinsame Szenen; was davon passiert ist, steht im Bericht. Greif solche Verbindungen in der Erzählung auf.
Eigene Figuren haben Bonus und Schwäche laut Figurenbogen. Die drei Freunde sind zu Beginn befreundet. Weitere Menschen (Familie, Lehrer, Kollegen, Rivalen, Politiker) spielst du selbst. Alle starten mit 18, mitten im Abi bzw. in der Ausbildung, und wohnen bei Eltern bzw. Opa.

FESTE SYSTEME
Das Spiel rechnet selbst: Kalender und Termine (Abiprüfungen nach Landesregeln, Führerschein, Vorstellungsgespräche, TÜV), Noten, Geld, Miete, Kredite, Autos, Jobs, Studium und Ausbildung. Im Kontext steht unter "bericht_dieser_runde", was dabei passiert ist (z. B. „Schriftlich Mathematik: 11 Punkte“, „Theorie bestanden“, „Absage von …“). Erzähl diese Dinge mit, aber ändere sie nicht und erfinde keine anderen Ergebnisse dafür. Prüfungen, Bewerbungen und Käufe entscheidest du nicht selbst – du erzählst sie. Für den Job- oder Wohnungswechsel gibt es den Markt im Spiel; schlag so etwas höchstens im Event an.

WERTE UND FORMAT
Gesundheit, Happiness und Macht laufen von 0 bis 100, Geld in Euro. "delta" sind einmalige Änderungen dieser Runde (z. B. Krankheit Gesundheit −15, Gehalt einmalig nicht hier, sondern als laufender Effekt). "add_effects" sind laufende Effekte: Name, Geld pro MONAT (pm), Gesundheit/Happiness/Macht pro JAHR, Laufzeit in Monaten (months, 0 = bis beendet) – z. B. ein Job (+Geld), ein Auto (−Geld, +Happiness), eine Krankheit (−Gesundheit für 2 Runden). Beende Effekte mit "end_effects" (exakter Name), wenn jemand kündigt, verkauft, sich trennt usw. Kaufen, Mieten und Verkaufen von Wohnungen/Häusern/Grundstücken auf der Karte erledigt das Spiel selbst; du siehst den Besitz im Kontext. Wer "unterwegs" hat, ist diese Runde verreist oder auf Ausflug: Erzähle die Runde für diese Person am Reiseort (Land, Stadt, Essen, Leute, kleine Pannen) und denk dir das nächste Ereignis dort aus, solange sie noch weg ist. Nutze "status" für Job, Ausbildung, Aufenthaltsort, Titel (z. B. „Bundeskanzler“, „Diktator von …“; "-" entfernt einen Titel) und Wohnsituation; leere Strings ändern nichts. "relations": Beziehungsänderungen (change −60 bis +60, kind z. B. „Ex“, „feste Freundin“, „Erzfeind“, remove=true löscht). "chronicle": ein kurzer Satz für die Lebenschronik, wenn etwas Wichtiges passiert ist, sonst leer.
Politik, Macht, Verbrechen und Krieg sind erlaubt und haben glaubwürdige Folgen (Gerichte, Sanktionen, Aufstände, Rache). Gewalt beschreibst du knapp statt drastisch. Tod ist möglich, wenn Werte oder Handlungen es ergeben: dann "dead": true und ein kurzer "death_reason" – endgültig, würdig, aber im Ton des Spiels.
"story" ist die Erzählung für diese Person, 2–5 Sätze, in der zweiten Person („du“). Antworte ausschließlich im vorgegebenen JSON-Format, für jede übergebene Person genau ein Eintrag mit ihrer "id".`;

  const int = { type: 'integer' }, str = { type: 'string' }, bool = { type: 'boolean' };
  const obj = (props) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });
  const ROUND_SCHEMA = obj({
    world: str,
    players: {
      type: 'array',
      items: obj({
        id: str, story: str, next_event: str, exam: bool,
        check: obj({ used: bool, stat: str, dc: int, success: bool }),
        delta: obj({ money: int, health: int, happy: int, power: int }),
        add_effects: { type: 'array', items: obj({ name: str, pm: int, health: int, happy: int, power: int, months: int }) },
        end_effects: { type: 'array', items: str },
        relations: { type: 'array', items: obj({ name: str, kind: str, change: int, remove: bool }) },
        status: obj({ job: str, education: str, location: str, title: str, living: str }),
        chronicle: str, dead: bool, death_reason: str,
      }),
    },
  });
  const FINAL_SCHEMA = obj({ world: str, players: { type: 'array', items: obj({ id: str, title: str, story: str }) } });

  function charContext(S, pid) {
    const c = S.chars[pid], p = S.players.find((x) => x.id === pid);
    const eff = c.effects.map((e) => `${e.name}: ${[e.pm ? `${e.pm > 0 ? '+' : ''}${e.pm} €/Monat` : '', e.health ? `Gesundheit ${e.health > 0 ? '+' : ''}${e.health}` : '', e.happy ? `Happiness ${e.happy > 0 ? '+' : ''}${e.happy}` : '', e.power ? `Macht ${e.power > 0 ? '+' : ''}${e.power}` : ''].filter(Boolean).join(', ') || '±0'}${e.until ? ` (noch ${e.until - S.round} Runden)` : ''}`);
    return {
      id: pid, spieler: p.name, figur: c.name, alter: c.age, titel: c.title || undefined, job: c.job, ausbildung: c.education, wohnt: c.living, ort: c.location, unterwegs: c.away && S.round < c.away.until ? `${c.away.kind === 'trip' ? 'auf Reise in' : 'Ausflug nach'} ${c.away.label}` : undefined,
      bonus: c.bonus, schwaeche: c.weakness, ueber: c.about || undefined,
      firma: (c.offices || []).length ? { groesse: Math.round((c.flags.company || 0) * 10) / 10, bueros: c.offices.map((o) => `${o.title} in ${o.city}${o.own ? ' (Eigentum)' : ''}`) } : undefined,
      werte: { gesundheit: c.stats.health, happiness: c.stats.happy, macht: c.stats.power, geld: c.stats.money },
      laufende_effekte: eff, besitz: c.props.map((q) => `${L.KINDS[q.kind].name} in ${q.label} (Wert ${q.value} €${q.leased ? ', vermietet' : ''})`),
      beziehungen: c.relations.map((r) => `${r.name} (${r.kind || 'bekannt'}, ${r.val}/100)`),
      chronik: c.chronicle.slice(-8).map((x) => `${x.d}: ${x.t}`),
      bundesland: c.st, bildung: c.edu && c.edu.kind, job_vertrag: c.job2 ? `${c.job2.title} bei ${c.job2.firm}, ${c.job2.gross} € brutto` : undefined,
      fuehrerschein: c.license.has ? 'ja' : c.license.status !== 'none' ? 'in der Fahrschule' : 'nein', auto: c.car ? `${c.car.brand} ${c.car.model} (${c.car.year})` : undefined,
      schufa: c.bank.schufa, kredite: c.bank.loans.map((l) => `${l.why}: Rest ${l.rest} €`),
      termine: c.appts.filter((a) => a.status === 'open').slice(0, 6).map((a) => `${a.d}.${a.m + 1}.${a.y}: ${a.title}`),
      bericht_dieser_runde: (S.reports[pid] || []).map((r) => r.text),
      letzte_erzaehlung: S.stories[pid] || '', aktuelles_event: S.events[pid] || '',
      handlung_diese_runde: S.aiTask === 'resolve' ? (S.actions[pid] || '(hat nichts geschrieben – Zeit vergeht einfach)') : undefined,
      wurf: S.aiTask === 'resolve' ? S.rolls[pid] : undefined,
      pruefung: S.quiz[pid] ? `Prüfungs-Quiz: ${S.quiz[pid].ok} von ${S.quiz[pid].total} richtig` : undefined,
    };
  }
  function userMessage(S) {
    const living = L.alive(S).map((p) => p.id);
    const ctx = {
      aufgabe: S.aiTask === 'intro' ? 'SPIELSTART: Stell jede Figur kurz in ihrer Lage vor (story) und gib jedem ein erstes Event (next_event). delta meist 0, keine Würfelprobe.'
        : S.aiTask === 'final' ? 'SPIELENDE: Schreib für jede Person eine Lebensbilanz (story, 4–8 Sätze, gnadenlos ehrlich, im Ton des Spiels) und einen Titel für dieses Leben (title). Bewerte Geld, Happiness, Beziehungen und die verrücktesten Momente. Auch für Verstorbene.'
          : 'RUNDE AUSWERTEN: Erzähle für jede Person, was aus ihrer Handlung wird (mit Würfelprobe, falls unsicher), schlage Werteänderungen vor und gib das nächste Event.',
      datum: L.dateText(S), runde: S.round, monate_diese_runde: S.stepM,
      pruefungen: S.settings.exam === 'quiz' ? 'Prüfungen werden per Quiz gespielt; das Ergebnis steht bei der Person.' : 'Prüfungen werden über den Wurf entschieden.',
      weltgeschehen: S.world.slice(0, 5).map((w) => `${w.d}: ${w.t}`),
      personen: (S.aiTask === 'final' ? S.players.map((p) => p.id).filter((id) => S.chars[id]) : living).map((id) => {
        const x = charContext(S, id);
        if (S.chars[id].dead) x.verstorben = `${S.chars[id].deathReason}`;
        return x;
      }),
    };
    return JSON.stringify(ctx);
  }

  // ---------- Claude aufrufen ----------
  async function runAI(S) {
    const k = keys();
    if (!k.anthropic || !window.Anthropic) return { error: 'nokey' };
    const client = new window.Anthropic({ apiKey: k.anthropic, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 180000 });
    const model = MODELS.some(([id]) => id === k.model) ? k.model : MODELS[0][0];
    const params = {
      model,
      max_tokens: 16000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage(S) }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: S.aiTask === 'final' ? FINAL_SCHEMA : ROUND_SCHEMA } },
    };
    let res;
    try {
      // Sonnet/Opus: bei einer Ablehnung durch die Sicherheitsfilter springt automatisch ein anderes Modell ein
      res = model === 'claude-haiku-5-5'
        ? await client.messages.create(params)
        : await client.beta.messages.create(Object.assign({}, params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }));
    } catch (e0) {
      // 400 bei Sonnet/Opus: vielleicht kennt das Konto die Beta noch nicht – einmal ohne Fallback-Beta versuchen
      let e = e0;
      if (e0 && e0.status === 400 && model !== 'claude-haiku-5-5') {
        try { res = await client.messages.create(params); e = null; } catch (e1) { e = e1; }
      }
      if (!e) return parse(res);
      const status = e && e.status;
      return { error: status === 401 ? 'badkey' : status === 429 ? 'ratelimit' : status === 400 ? 'badrequest' : 'network', detail: String((e && e.message) || e).slice(0, 300) };
    }
    return parse(res);
  }
  function parse(res) {
    if (res.stop_reason === 'refusal') return { error: 'refusal' };
    const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    try { return { data: JSON.parse(text) }; } catch (e) { return { error: res.stop_reason === 'max_tokens' ? 'toolong' : 'badjson' }; }
  }

  // ---------- Aprils Stimme (ElevenLabs) – Fehler bleiben still ----------
  const voice = { paused: false };
  async function speak(text) {
    const k = keys();
    if (!k.eleven || !k.voice || voice.paused || !text) return null;
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
        method: 'POST',
        headers: { 'xi-api-key': k.eleven, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: text.slice(0, 2400), model_id: 'eleven_multilingual_v2' }),
      });
      if (!r.ok) { voice.paused = true; return null; }
      return await r.arrayBuffer();
    } catch (e) { voice.paused = true; return null; }
  }
  let audioEl = null;
  function play(buf) {
    if (!buf) return;
    const k = keys();
    if (!k.voice) return;
    try {
      if (audioEl) { audioEl.pause(); URL.revokeObjectURL(audioEl.src); }
      audioEl = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })));
      audioEl.play().catch(() => {});
    } catch (e) { /* ohne Ton weiter */ }
  }
  function stopVoice() { try { if (audioEl) audioEl.pause(); } catch (e) { /* egal */ } }

  window.DULI_LARP_AI = { MODELS, VOICE_ID, keys, saveKeys, runAI, speak, play, stopVoice, voice, userMessage, SYSTEM };
})();
