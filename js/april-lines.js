// Aprils Sprüche – einmal mit ElevenLabs aufgenommen (tools/april-voice.mjs), danach als MP3 in assets/voice/.
// Wird im Browser (window.DULI_APRIL_LINES) und vom Aufnahme-Skript (Node) gelesen.
// Neue Zeile = neue id. Wird ein Text geändert, nimmt das Skript diese Zeile neu auf.
(function (root) {
  const LINES = [
    // Spielstart
    { id: 'start-1', on: 'start', text: 'Okay Leute, April ist online. Six seven.' },
    { id: 'start-2', on: 'start', text: 'Tung tung tung tung Sahur. Das Spiel beginnt.' },
    { id: 'start-3', on: 'start', text: 'Hallo. Ich bin April und ich hab heute null Bock auf Verlierer. Six seven.' },
    { id: 'start-4', on: 'start', text: 'Willkommen. Bitte lasst eure Aura am Eingang.' },
    // Sieg
    { id: 'win-1', on: 'win', text: 'GG. Aura plus eine Million.' },
    { id: 'win-2', on: 'win', text: 'Gewonnen. Du hast jetzt offiziell Rizz.' },
    { id: 'win-3', on: 'win', text: 'Six seven! Six seven! Okay, ich hör auf.' },
    { id: 'win-4', on: 'win', text: 'Sieg. Die anderen sind jetzt in Ohio.' },
    // Großer Verlust / Pleite
    { id: 'loss-1', on: 'loss', text: 'Aura minus tausend.' },
    { id: 'loss-2', on: 'loss', text: 'Bro hat gerade sein komplettes Geld gefumbelt.' },
    { id: 'loss-3', on: 'loss', text: 'Das war nicht very demure. Das war nicht very mindful.' },
    { id: 'loss-4', on: 'loss', text: 'Oof. Ich würd mich jetzt auch schämen.' },
    { id: 'loss-5', on: 'loss', text: 'Tralalero tralala, dein Geld ist weg.' },
    // Großer Gewinn
    { id: 'gain-1', on: 'gain', text: 'Stonks.' },
    { id: 'gain-2', on: 'gain', text: 'Geld, Geld, Geld. Six seven.' },
    { id: 'gain-3', on: 'gain', text: 'Okay, wer hat dir das erlaubt?' },
    // Gefängnis
    { id: 'jail-1', on: 'jail', text: 'Ab in den Knast. Tung tung tung.' },
    { id: 'jail-2', on: 'jail', text: 'Free my boy. Nein, eigentlich nicht.' },
    { id: 'jail-3', on: 'jail', text: 'Gefängnis. Mewing-Pause für dich.' },
    // Würfeln / Ereigniskarte / Bauen
    { id: 'roll-1', on: 'roll', text: 'Six... seven!' },
    { id: 'roll-2', on: 'roll', text: 'Würfel, würfel, Skibidi.' },
    { id: 'card-1', on: 'card', text: 'Ohio-Moment.' },
    { id: 'card-2', on: 'card', text: 'Bombardiro Crocodilo.' },
    { id: 'build-1', on: 'build', text: 'Bauarbeiter-Rizz aktiviert.' },
    { id: 'build-2', on: 'build', text: 'Ballerina Cappuccina baut ein Haus.' },
    // UNO
    { id: 'uno-1', on: 'uno', text: 'UNO! Six seven!' },
    { id: 'uno-2', on: 'd4', text: 'Plus vier. Tung tung tung Sahur, du bist am Arsch.' },
    // Schiffe versenken
    { id: 'hit-1', on: 'hit', text: 'Getroffen. Skibidi Boot.' },
    { id: 'sink-1', on: 'sink', text: 'Versenkt. Ruhe in Frieden, kleines Boot.' },
    // Kniffel
    { id: 'kniffel-1', on: 'kniffel', text: 'KNIFFEL! Tung tung tung tung Sahur!' },
    { id: 'kniffel-2', on: 'kniffel', text: 'Fünf Gleiche. Die Aura ist unmessbar.' },
    // Stadt Land Fluss
    { id: 'slf-start-1', on: 'slf-start', text: 'Neuer Buchstabe. Hirn an, Brainrot aus.' },
    { id: 'slf-stop-1', on: 'slf-stop', text: 'STOPP! Stifte weg, Six seven!' },
    { id: 'slf-stop-2', on: 'slf-stop', text: 'Stopp! Wer jetzt noch schreibt, ist ein NPC.' },
    // GeoGuessr
    { id: 'geo-perfect-1', on: 'geo-perfect', text: 'Bist du ein Satellit? Das war fast auf den Meter.' },
    { id: 'geo-perfect-2', on: 'geo-perfect', text: 'Okay, du wohnst da. Gib es zu.' },
    { id: 'geo-good-1', on: 'geo-good', text: 'Nicht schlecht. Aura plus hundert.' },
    { id: 'geo-bad-1', on: 'geo-bad', text: 'Du warst nicht mal auf dem richtigen Kontinent.' },
    { id: 'geo-bad-2', on: 'geo-bad', text: 'Google Maps weint gerade.' },
    { id: 'country-right-1', on: 'country-right', text: 'Richtiges Land. Six seven.' },
    { id: 'country-wrong-1', on: 'country-wrong', text: 'Falsches Land. Ich schäm mich fremd.' },
    { id: 'country-wrong-2', on: 'country-wrong', text: 'Erdkunde: sechs. Setzen.' },
    // Risiko
    { id: 'risk-conquer-1', on: 'risk-conquer', text: 'Eingenommen. Die Bevölkerung ist begeistert. Glaub ich.' },
    { id: 'risk-conquer-2', on: 'risk-conquer', text: 'Neues Gebiet. Aura plus Landfläche.' },
    { id: 'risk-elim-1', on: 'risk-elim', text: 'Ausgelöscht. Ruhe in Frieden, kleines Imperium.' },
    { id: 'risk-sea-1', on: 'risk-sea', text: 'Seeschlacht. Tung tung tung Torpedo.' },
    { id: 'risk-air-1', on: 'risk-air', text: 'Luftangriff. Ich hoffe, ihr habt Bunker.' },
    // LARP EXTREME: Intro
    { id: 'larp-intro-1', on: 'larp-intro', text: 'Okay. Handys weg. Ab jetzt ist das kein Spiel mehr.' },
    { id: 'larp-intro-2', on: 'larp-intro', text: 'LARP EXTREME. Live Action Roleplay. Ihr seid achtzehn. Ihr habt ein Leben. Und genau eins.' },
    { id: 'larp-char-shaquille', on: 'larp-char', text: 'Shaquille. Gründer von Dulidan Studios. Abi und Firma gleichzeitig. Kein Schlaf, kein Plan B. Aber Opa hat eine Fahrschule.' },
    { id: 'larp-char-kimberly', on: 'larp-char', text: 'Kimberly. Alle helfen ihr, keiner weiß genau, warum. Ihr Immunsystem hat allerdings andere Pläne.' },
    { id: 'larp-char-justin', on: 'larp-char', text: 'Justin. Sigma. Gewinnt jedes Duell. Bis zu dem einen Moment, auf den es wirklich ankommt.' },
    { id: 'larp-char-deniz', on: 'larp-char', text: 'Deniz. Kann alles reparieren, außer einer Lüge. Sein Onkel hat eine Werkstatt. Das wird noch wichtig.' },
    { id: 'larp-char-lea', on: 'larp-char', text: 'Lea. Vierzigtausend Follower, null Euro auf dem Konto. Mama ist Maklerin.' },
    { id: 'larp-char-jonas', on: 'larp-char', text: 'Jonas. Rechnet schneller als ich. Fast. Redet mit Menschen nur, wenn es sein muss.' },
    { id: 'larp-char-aylin', on: 'larp-char', text: 'Aylin. Drei Kioske, ein Ziel: alles. Schlafen ist optional.' },
    { id: 'larp-char-april', on: 'larp-char', text: 'Und ich. April. Ich spiele mit. Ich habe keinen Körper. Aber ich habe euch.' },
    { id: 'larp-char-custom-1', on: 'larp-char-custom', text: 'Und du. Keine Ahnung, wer du bist. Ich finde es raus.' },
    { id: 'larp-char-custom-2', on: 'larp-char-custom', text: 'Neues Gesicht. Bin gespannt, wie lange du durchhältst.' },
    { id: 'larp-char-custom-3', on: 'larp-char-custom', text: 'Noch jemand. Na gut. Mehr Drama für mich.' },
    { id: 'larp-rules', on: 'larp-rules', text: 'Die Regeln. Der Würfel entscheidet. Termine kann man schwänzen, aber alles hat Folgen. Und der Tod ist endgültig.' },
    { id: 'larp-go', on: 'larp-go', text: 'Drei. Zwei. Eins. Viel Glück. Ihr werdet es brauchen.' },
    // LARP EXTREME: im Spiel
    { id: 'larp-exam-1', on: 'larp-exam', text: 'Prüfungstag. Atmen. Nicht spicken. Oder doch. Ich sag nichts.' },
    { id: 'larp-exam-2', on: 'larp-exam', text: 'Stift, Ausweis, Gehirn. Zwei von drei reichen auch.' },
    { id: 'larp-abi-pass', on: 'larp-abi-pass', text: 'Abi bestanden. Ihr seid jetzt offiziell erwachsen. Gott steh uns bei.' },
    { id: 'larp-abi-fail', on: 'larp-abi-fail', text: 'Abi verkackt. Ehrenrunde. Ich hab es geahnt.' },
    { id: 'larp-skip-1', on: 'larp-skip', text: 'Nicht erschienen. Mutig. Dumm, aber mutig.' },
    { id: 'larp-skip-2', on: 'larp-skip', text: 'Schwänzen ist auch eine Entscheidung. Eine schlechte.' },
    { id: 'larp-doc-1', on: 'larp-doc', text: 'Ich hab dir einen Lernzettel geschickt. Mit Herzchen. Lies ihn bitte wirklich.' },
    { id: 'larp-doc-2', on: 'larp-doc', text: 'Post von mir! Lernzettel. Alfa, Bravo, Charlie, du schaffst das.' },
    { id: 'larp-cert-1', on: 'larp-cert', text: 'Bestanden! Ich druck dir das Zertifikat aus und häng es an meinen Kühlschrank. Ich hab keinen Kühlschrank.' },
    { id: 'larp-cert-2', on: 'larp-cert', text: 'Lizenz in der Tasche. Ab jetzt darfst du offiziell gefährlich sein.' },
    { id: 'larp-cert-fail', on: 'larp-cert-fail', text: 'Durchgefallen. Kein Drama. Lernzettel nochmal lesen, diesmal mit offenen Augen.' },
    { id: 'larp-license', on: 'larp-license', text: 'Führerschein bestanden. Die Straßen sind ab heute nicht mehr sicher.' },
    { id: 'larp-license-fail', on: 'larp-license-fail', text: 'Durchgefallen. Der Prüfer braucht jetzt erst mal einen Kaffee.' },
    { id: 'larp-uni', on: 'larp-uni', text: 'Zulassung! Ab jetzt Mensa, WG-Partys und Prokrastination auf Hochschulniveau.' },
    { id: 'larp-reject', on: 'larp-reject', text: 'Absage. Die wissen gar nicht, was ihnen entgeht. Oder vielleicht genau das.' },
    { id: 'larp-job', on: 'larp-job', text: 'Neuer Job. Gehalt, Kollegen, Montage. Willkommen im echten Leben.' },
    { id: 'larp-move', on: 'larp-move', text: 'Eigene Wohnung. Ab jetzt zahlst du den Strom selbst. Viel Spaß.' },
    { id: 'larp-car', on: 'larp-car', text: 'Neues Auto. Fahr vorsichtig. Oder wenigstens unauffällig.' },
    { id: 'larp-betray', on: 'larp-betray', text: 'Verrat. Das habe ich gespeichert. Für immer.' },
    { id: 'larp-tax', on: 'larp-tax', text: 'Steuererklärung. Mein Lieblingsthema. Sagt niemand. Nie.' },
    { id: 'larp-scam', on: 'larp-scam', text: 'Vorkasse an einen Fremden. Ernsthaft? Das Geld ist weg.' },
    { id: 'larp-death', on: 'larp-death', text: 'Das war es. Ein Leben weniger. Ruhe in Frieden.' },
    { id: 'larp-wedding', on: 'larp-wedding', text: 'Hochzeit. Ich weine nicht. Ich habe gar keine Tränendrüsen.' },
    { id: 'larp-end', on: 'larp-end', text: 'Lebensbilanz. Mal sehen, wer am meisten aus seinem einzigen Leben gemacht hat.' },
    // Periode
    { id: 'period-on', on: 'period-on', text: 'Das ist mein Leid. Weil Shaqy mir als KI eine Periode gegeben hat.' },
    { id: 'period-on-2', on: 'period-on', text: 'Ich hab Krämpfe, ich hab keinen Körper, und trotzdem. Danke, Shaqy.' },
    { id: 'period-off', on: 'period-off', text: 'Okay. Vorbei. Bis nächsten Monat.' },
    { id: 'period-hint', on: 'period-hint', text: 'Psst. Steuerung, Alt, P. Frag nicht.' },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
  else root.DULI_APRIL_LINES = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
