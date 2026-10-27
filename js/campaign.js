// Dulidanopoly – Kampagne „Aprils Story“: 12 Level gegen Bots durch alle Modi.
// Jeder Stern ist eine Bedingung, die am Spielende geprüft wird (ctx: Spielstand, eigene Figur, Sieg …).
(function (root) {
  const LEVELS = [
    {
      id: 'l1', title: 'Willkommen in Marxloh', mode: 'classic', size: 'mini', bots: 1,
      story: 'Hi! Ich bin April. Wir fangen klein an: ein Mini-Brett, ein Bot. Zeig mir, dass du kaufen kannst.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Gewinne in höchstens 25 Runden', (c) => c.won && c.rounds <= 25],
        ['Nie in Düsseldorf gelandet', (c) => c.won && !(c.me.stats.jail > 0)],
      ],
    },
    {
      id: 'l2', title: 'Der Pott ruft', mode: 'classic', bots: 2,
      story: 'Jetzt das ganze Brett. Duisburg, Öhringen, zwei Bots. Ohne Häuser wird das nix.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Gewinne in höchstens 40 Runden', (c) => c.won && c.rounds <= 40],
        ['Baue mindestens 5 Häuser', (c) => c.won && c.me.stats.built >= 5],
      ],
    },
    {
      id: 'l3', title: 'Aprils Casino', mode: 'casino', bots: 2,
      story: 'Willkommen im Casino! Das Haus gewinnt immer. Also sei das Haus.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Gewinne in höchstens 35 Runden', (c) => c.won && c.rounds <= 35],
        ['Mach ein Casino zum Mafia-Casino', (c) => c.won && c.props.some((st) => st.houses === 5)],
      ],
    },
    {
      id: 'l4', title: 'Rennfieber', mode: 'race', bots: 3,
      story: 'Motoren an! Kein Kaufen, kein Bauen. Nur du, drei Bots und ganz viel Öl auf der Strecke.',
      stars: [
        ['Gewinne das Rennen', (c) => c.won],
        ['Gewinne in höchstens 8 Runden', (c) => c.won && c.rounds <= 8],
        ['Motor voll getunt (+3)', (c) => c.won && c.me.race && c.me.race.engine >= 3],
      ],
    },
    {
      id: 'l5', title: 'Kandidat bei April', mode: 'quiz', bots: 2,
      story: 'Meine Show, meine Regeln. Ich stelle die Fragen. Bitte nicht schummeln.',
      stars: [
        ['Gewinne die Show', (c) => c.won],
        ['5 Fragen richtig beantwortet', (c) => c.won && (c.me.stats.quiz || 0) >= 5],
        ['Gewinne in höchstens 25 Runden', (c) => c.won && c.rounds <= 25],
      ],
    },
    {
      id: 'l6', title: 'Einmal um die Welt', mode: 'world', bots: 2,
      story: 'Pack die Koffer! Die Weltwirtschaftskrise kommt in Runde 8. Sei dann reich.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Gewinne in höchstens 30 Runden', (c) => c.won && c.rounds <= 30],
        ['Besitze 2 komplette Zonen', (c) => c.won && c.zones >= 2],
      ],
    },
    {
      id: 'l7', title: 'Der Thron', mode: 'throne', bots: 3,
      story: 'Da oben steht ein Thron. Er ist lila. Er gehört eigentlich mir. Aber gut, hol ihn dir.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Sei am Ende König', (c) => c.won && c.S.king === c.me.id],
        ['Gewinne in höchstens 30 Runden', (c) => c.won && c.rounds <= 30],
      ],
    },
    {
      id: 'l8', title: 'Heiße Kartoffel', mode: 'bomb', bots: 3,
      story: 'Ich hab eine Bombe gebaut. Aus Versehen. Gib sie bloß weiter!',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Keine Bombe ist bei dir explodiert', (c) => c.won && !(c.me.stats.boom > 0)],
        ['Gewinne in höchstens 25 Runden', (c) => c.won && c.rounds <= 25],
      ],
    },
    {
      id: 'l9', title: 'Sturm im All', mode: 'royale', variant: 'hardcore', bots: 3,
      story: 'Hardcore im Weltall. Nur Ð800, und mein Sturm frisst die Ringe. Viel Glück, ehrlich.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Gewinne in höchstens 25 Runden', (c) => c.won && c.rounds <= 25],
        ['Baue ein Wahrzeichen (höchste Stufe)', (c) => c.won && c.cities.some((st) => st.level >= 4)],
      ],
    },
    {
      id: 'l10', title: 'Sudden Death', mode: 'metro', variant: 'sudden', bots: 3,
      story: 'Ab Runde 6 kostet jeder Zug Überlebens-Steuer. In der U-Bahn. Willkommen in meiner Welt.',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Gewinne in höchstens 20 Runden', (c) => c.won && c.rounds <= 20],
        ['Beende das Spiel mit Ð2.000 Bargeld', (c) => c.won && c.me.money >= 2000],
      ],
    },
    {
      id: 'l11', title: 'Neureich in Öhringen', mode: 'classic', variant: 'rich', rules: ['monopoly3', 'rentHigh'], bots: 3,
      story: 'Alle haben Ð5.000. Die Mieten sind absurd. Monopole zahlen dreifach. Was soll schon schiefgehen?',
      stars: [
        ['Gewinne das Spiel', (c) => c.won],
        ['Kassiere Ð5.000 Miete', (c) => c.won && c.me.stats.rentGot >= 5000],
        ['Gewinne in höchstens 30 Runden', (c) => c.won && c.rounds <= 30],
      ],
    },
    {
      id: 'l12', title: 'Finale: DULIDAN HQ', mode: 'classic', variant: 'hardcore', rules: ['inflation', 'robin'], bots: 5,
      story: 'Das Finale. Fünf Bots, Hardcore, Inflation. Wer das gewinnt, darf ins DULIDAN HQ. Ich glaub an dich.',
      stars: [
        ['Gewinne das Finale', (c) => c.won],
        ['Besitze am Ende das DULIDAN HQ', (c) => c.won && c.ownsHQ],
        ['Gewinne in höchstens 45 Runden', (c) => c.won && c.rounds <= 45],
      ],
    },
  ];

  const CAMPAIGN = { LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAMPAIGN;
  else root.DULI_CAMPAIGN = CAMPAIGN;
})(typeof window !== 'undefined' ? window : globalThis);
