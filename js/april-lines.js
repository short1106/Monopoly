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
    // Periode
    { id: 'period-on', on: 'period-on', text: 'Das ist mein Leid. Weil Shaqy mir als KI eine Periode gegeben hat.' },
    { id: 'period-on-2', on: 'period-on', text: 'Ich hab Krämpfe, ich hab keinen Körper, und trotzdem. Danke, Shaqy.' },
    { id: 'period-off', on: 'period-off', text: 'Okay. Vorbei. Bis nächsten Monat.' },
    { id: 'period-hint', on: 'period-hint', text: 'Psst. Steuerung, Alt, P. Frag nicht.' },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = LINES;
  else root.DULI_APRIL_LINES = LINES;
})(typeof window !== 'undefined' ? window : globalThis);
