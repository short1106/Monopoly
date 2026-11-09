// DULIDAN LARP EXTREME – GOOFY-MODUS und 18+-MODUS.
// Goofy (Einstellung „goofy“: on/max): komplett übertriebene Ereigniskarten (Gans mit Plan, Döner-Meteor, Ohio-Portal, Klon …)
// und Weltereignisse, die alle treffen. 18+ (Einstellung „adult“): Alkohol, Partys, Kater, Dating-Chaos, derbe Sprache.
// Intimes bleibt angedeutet (April schaut weg) – nichts Explizites.
// Karten nutzen dasselbe Format wie js/larp-deck.js und werden dort in den Stapel gelegt.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const R = (s, d, x) => Object.assign({ s, d: d || {} }, x || {});
  const G = (o) => Object.assign({ stage: ['any'], kind: 'goofy', w: 1 }, o);
  const A = (o) => Object.assign({ stage: ['any'], kind: 'adult', adult: true, w: 1 }, o);

  const GOOFY = [
    G({ id: 'g-gans', text: 'Eine Gans verfolgt dich seit drei Tagen. Sie hat einen Plan. Du weißt nicht, welchen.', opts: [
      { t: 'Die Gans konfrontieren', stat: 'body', dc: 12, ok: R('Du gewinnst. Die Gans respektiert dich jetzt und bringt dir jeden Morgen einen Stein.', { happy: 10, power: 3 }, { rel: [{ name: 'Gans Gerda', change: 25, kind: 'Verbündete' }], chron: 'Hat eine Gans besiegt.' }), bad: R('Die Gans gewinnt. Ein Video „Mensch verliert gegen Gans“ hat 4 Millionen Aufrufe.', { happy: -8, power: -6 }) },
      { t: 'Die Gans adoptieren', dc: 0, ok: R('Die Gans heißt jetzt Gerda und wohnt bei dir. Sie hasst alle außer dir.', { happy: 8 }, { add: [{ name: 'Haus-Gans Gerda', pm: -30, happy: 2, power: 1 }], chron: 'Adoptiert eine Gans.' }) },
      { t: 'Wegrennen', stat: 'luck', dc: 9, ok: R('Du entkommst. Vorerst. Die Gans merkt sich dein Gesicht.', { health: 2 }), bad: R('Gänse sind schneller als du denkst. Viel schneller.', { health: -8, happy: -4 }) }] }),
    G({ id: 'g-doener', text: 'Ein Meteor aus purem Dönerfleisch schlägt direkt neben dir in {c} ein. Er dampft noch.', opts: [
      { t: 'Probieren', stat: 'body', dc: 10, ok: R('Bester Döner deines Lebens. Kosmisch. Du hast kurz das Universum verstanden.', { happy: 14, health: 4 }), bad: R('Weltraum-Salmonellen. Drei Tage Badezimmer.', { health: -16, happy: -6 }) },
      { t: 'Auf Kleinanzeigen verkaufen', stat: 'social', dc: 11, ok: R('Ein Sammler aus Dubai zahlt 4.200 € und holt ihn mit dem Hubschrauber ab.', { money: 4200, happy: 6 }), bad: R('Das Ordnungsamt beschlagnahmt den Meteor. Bußgeld wegen „unerlaubter Fleischlagerung“.', { money: -300, happy: -4 }) },
      { t: 'Eine Religion gründen', dc: 0, ok: R('Die Kirche des Heiligen Spießes hat jetzt 37 Mitglieder. Spenden laufen.', { power: 6 }, { add: [{ name: 'Döner-Sekte (Spenden)', pm: 160, happy: 1, power: 1 }], chron: 'Gründet die Kirche des Heiligen Spießes.' }) }] }),
    G({ id: 'g-klon', text: 'Du triffst dich selbst. Also: einen Klon. Er ist besser angezogen und hat deine Lieblingsserie schon fertig geguckt.', opts: [
      { t: 'Zusammenarbeiten', stat: 'smart', dc: 12, ok: R('Ihr arbeitet in Schichten. Doppeltes Einkommen, halber Stress.', { happy: 8 }, { add: [{ name: 'Klon arbeitet für dich', pm: 900, health: 1 }], chron: 'Lässt einen Klon für sich arbeiten.' }), bad: R('Der Klon klaut deine Identität und dein Netflix-Passwort. Deine Mama mag ihn lieber.', { money: -800, happy: -10 }) },
      { t: 'Kämpfen. Es kann nur einen geben.', stat: 'body', dc: 13, ok: R('Epischer Kampf im Treppenhaus. Du gewinnst. Der Klon zieht nach Bielefeld.', { power: 10, health: -5 }), bad: R('Der Klon gewinnt. Er lebt jetzt dein Leben, du schläfst auf der Couch.', { health: -10, power: -8 }) },
      { t: 'Ignorieren', dc: 0, ok: R('Ihr nickt euch auf der Straße zu. Sehr seltsam. Sehr erwachsen.', { happy: -2 }) }] }),
    G({ id: 'g-sigma', text: 'Ein Typ namens Alpha-Kevin lädt dich zu seinem Sigma-Seminar ein. 997 € für „unendliche Aura“.', opts: [
      { t: 'Buchen (997 €)', stat: 'luck', dc: 15, cost: 997, ok: R('Du kommst mit echter Aura zurück. Leute machen dir auf dem Gehweg Platz.', { money: -997, power: 14, happy: 8 }, { chron: 'Hat beim Sigma-Seminar echte Aura gefunden.' }), bad: R('Drei Stunden kalt duschen, ein Hoodie mit „GRIND“ drauf, keine Aura.', { money: -997, happy: -6 }) },
      { t: 'Ihn live bloßstellen', stat: 'social', dc: 11, ok: R('Dein Video geht viral. Alpha-Kevin heißt jetzt Beta-Kevin.', { power: 8, happy: 6 }), bad: R('Er hat mehr Follower als du. Du bist jetzt „der Neider“.', { power: -6 }) },
      { t: 'Selbst Seminare anbieten', stat: 'social', dc: 13, ok: R('„Aura-Masterclass“ läuft. Du hast keine Ahnung, was du erzählst. 2.500 € verdient.', { money: 2500, power: 4 }), bad: R('Zwei Leute kommen. Einer ist deine Oma.', { money: -400, happy: -4 }) }] }),
    G({ id: 'g-ohio', text: 'Im Keller ist ein Portal nach Ohio aufgegangen. Es riecht nach Mais und schlechten Entscheidungen.', opts: [
      { t: 'Reingehen', stat: 'luck', dc: 12, ok: R('Drei Tage später kommst du zurück. Mit 5.000 € und Wissen, das niemand verstehen darf.', { money: 5000, happy: 6, power: 4 }, { chron: 'War in Ohio und kam zurück.' }), bad: R('Ohio hat dich verändert. Du sagst jetzt bei jeder Gelegenheit „Skibidi“.', { happy: -8, power: -4 }, { add: [{ name: 'Ohio-Trauma', happy: -1, mo: 6 }] }) },
      { t: 'Zumauern', stat: 'work', dc: 9, ok: R('Zugemauert. Manchmal klopft es nachts von der anderen Seite.', { happy: -2 }), bad: R('Die Wand hält nicht. Ein Ohio-Bewohner wohnt jetzt in deinem Keller.', { happy: -6 }) },
      { t: 'Eintritt verlangen', stat: 'social', dc: 10, ok: R('„Ohio-Erlebnis, 15 € pro Person.“ Die Schlange geht bis zur Straße.', { power: 4 }, { add: [{ name: 'Ohio-Portal-Tickets', pm: 450, happy: 1 }] }), bad: R('Ein Tourist verschwindet. Die Versicherung ist nicht begeistert.', { money: -1500 }) }] }),
    G({ id: 'g-auraduell', text: 'Jemand fordert dich mitten in der Fußgängerzone zum Aura-Duell heraus. Keine Worte. Nur Blicke.', opts: [
      { t: 'Annehmen', stat: 'social', dc: 12, ok: R('Er senkt nach 40 Sekunden den Blick. Passanten klatschen. Ein Kind weint vor Ehrfurcht.', { power: 10, happy: 8 }), bad: R('Du blinzelst zuerst. Ein Rentner lacht dich aus. Laut.', { power: -10, happy: -6 }) },
      { t: 'Mewing-Konter', stat: 'body', dc: 10, ok: R('Deine Kieferlinie beendet das Duell sofort. Er geht wortlos.', { power: 8 }), bad: R('Du hast dir beim Mewing auf die Zunge gebissen.', { health: -3, power: -4 }) },
      { t: 'Weglaufen', dc: 0, ok: R('Du rennst. Aura minus tausend. Aber du lebst.', { power: -3 }) }] }),
    G({ id: 'g-taube', text: 'Eine Taube hat dir auf den Kopf gemacht. April sagt, das bringt Glück.', opts: [
      { t: 'Lotto spielen (10 €)', stat: 'luck', dc: 15, cost: 10, ok: R('April hatte recht. 6.700 € Gewinn. Danke, Taube.', { money: 6700, happy: 12 }), bad: R('Nichts. Die Taube hat gelogen.', { money: -10 }) },
      { t: 'Rache an den Tauben', stat: 'body', dc: 15, ok: R('Du hast es geschafft. Die Tauben schwören Rache.', { happy: 4 }, { add: [{ name: 'Krieg gegen die Tauben', happy: -1, mo: 12 }] }), bad: R('Die Tauben kommen mit Verstärkung. Es war ein Hinterhalt.', { health: -6, happy: -8 }) },
      { t: 'Einfach akzeptieren', dc: 0, ok: R('Du hast Frieden gefunden. Mit Taubenkacke im Haar, aber Frieden.', { happy: 2 }) }] }),
    G({ id: 'g-npc', text: 'Dir fällt auf: Alle um dich herum wiederholen dieselben drei Sätze. Bist du der Main Character?', opts: [
      { t: 'Testen', stat: 'smart', dc: 12, ok: R('Du bist es. Ab jetzt läuft Musik, wenn du einen Raum betrittst.', { power: 8, happy: 10 }, { chron: 'Ist offiziell der Main Character.' }), bad: R('Du bist der NPC. Eine Woche lang sagst du nur „Schönes Wetter heute“.', { happy: -8, power: -4 }) },
      { t: 'Therapie (120 €)', dc: 0, cost: 120, ok: R('Die Therapeutin sagt auch nur drei Sätze. Aber es hilft trotzdem.', { money: -120, health: 4, happy: 3 }) }] }),
    G({ id: 'g-wand', text: 'Du hast aus Versehen eine Wand angeflirtet. Sie hat geantwortet.', opts: [
      { t: 'Auf ein Date mit der Wand', dc: 0, ok: R('Sie hört gut zu, unterbricht nie. Beste Beziehung seit Jahren.', { happy: 8 }, { rel: [{ name: 'Die Wand', change: 25, kind: 'Situationship' }] }) },
      { t: 'Die Wand ghosten', stat: 'luck', dc: 10, ok: R('Sie nimmt es gelassen. Wände sind so.', { happy: 2 }), bad: R('Die Wand hat dich überall blockiert. Auch im echten Leben. Du kommst nicht mehr in die Küche.', { happy: -6 }) },
      { t: 'Zum Arzt', dc: 0, ok: R('„Das ist normal“, sagt der Arzt zu seiner Lampe.', { health: 2 }) }] }),
    G({ id: 'g-steuerente', text: 'Die Steuerfahndung schickt eine Ente. Sie will deine Quittungen sehen. Sie hat eine Krawatte an.', opts: [
      { t: 'Quittungen zeigen', stat: 'work', dc: 11, ok: R('Die Ente nickt zufrieden und watschelt davon. Akte geschlossen.', { power: 2 }), bad: R('Die Ente findet Fehler. Viele Fehler. Sie quakt sehr enttäuscht. Nachzahlung.', { money: -1200, happy: -5 }) },
      { t: 'Mit Brot bestechen', stat: 'luck', dc: 10, ok: R('Die Ente nimmt das Brot. Niemand hat etwas gesehen.', { money: -3 }), bad: R('Bestechung einer Beamtenente. Das wird teuer.', { money: -800, power: -4 }) }] }),
    G({ id: 'g-mittelalter', text: 'Du wachst im Mittelalter auf. Es ist Dienstag. Jemand bietet dir eine Ziege für deine Sneaker an.', opts: [
      { t: 'König werden', stat: 'social', dc: 15, ok: R('Drei Wochen König. Dann wachst du auf. Die Macht bleibt irgendwie hängen.', { power: 22, happy: 10 }, { chron: 'War drei Wochen König im Mittelalter.' }), bad: R('Pest. Natürlich. Du wachst mit Fieber auf.', { health: -14 }) },
      { t: 'Mittelalter-TikTok starten', stat: 'social', dc: 11, ok: R('„Bauer reagiert auf Kartoffel“ ist ein Hit. Du kommst mit Followern zurück.', { power: 6, happy: 6 }), bad: R('Als Hexe angeklagt. Du wachst schweißgebadet auf.', { happy: -6 }) },
      { t: 'Ziege nehmen', dc: 0, ok: R('Du wachst mit einer Ziege im Bett auf. Erklär das mal.', { happy: 4 }, { add: [{ name: 'Mittelalter-Ziege', pm: -25, happy: 1 }] }) }] }),
    G({ id: 'g-67', text: 'Alle Zahlen in deinem Leben sind plötzlich 6 oder 7. Hausnummer, Uhrzeit, Kontostand.', opts: [
      { t: 'Akzeptieren. Six seven.', dc: 0, ok: R('Dein Kontostand ist jetzt exakt 6.767 €. Frag nicht.', {}, { reset: 6767, chron: 'Six seven.' }) },
      { t: 'Dagegen kämpfen', stat: 'smart', dc: 13, ok: R('Du hast die Mathematik besiegt. Alles normal. Fast.', { happy: 5 }), bad: R('Die Zahlen gewinnen. −67 €, −6 Happiness, −7 Macht.', { money: -67, happy: -6, power: -7 }) }] }),
    G({ id: 'g-oma', text: 'Deine Oma ist heimlich Endboss einer Rentner-Streetgang. Sie braucht dich heute Nacht.', opts: [
      { t: 'Mitmachen', stat: 'body', dc: 13, ok: R('Ihr übernehmt den Kiosk-Markt im Viertel. Oma gibt dir einen Anteil.', { money: 1500, power: 10 }, { rel: [{ name: 'Oma', change: 20 }] }), bad: R('Die gegnerische Gang hat Rollatoren mit Spikes. Du verlierst.', { health: -15 }) },
      { t: 'Polizei rufen', stat: 'social', dc: 9, ok: R('Die Polizei lacht. Oma ist sehr enttäuscht von dir.', { power: -3 }, { rel: [{ name: 'Oma', change: -25 }] }), bad: R('Oma hat die Polizei bestochen. Mit Kuchen.', { happy: -5 }) }] }),
    G({ id: 'g-alien', text: 'Aliens bieten dir ein Praktikum an. Unbezahlt. Aber mit Raumschiff.', opts: [
      { t: 'Annehmen', stat: 'smart', dc: 12, ok: R('Du lernst Antigravitation und Excel. Excel war schwerer.', { power: 10, happy: 8 }, { chron: 'Hat ein Praktikum bei Aliens gemacht.' }), bad: R('Sie wollten dich nur für „Proben“. Sehr unangenehm. Keine Bewertung.', { health: -6, happy: -8 }) },
      { t: 'Bezahlung verhandeln', stat: 'social', dc: 14, ok: R('3.000 € in Alien-Gold. Die Bank fragt nicht nach.', { money: 3000 }), bad: R('Sie verstehen Verhandeln als Kriegserklärung. Du rennst.', { health: -4, power: -4 }) },
      { t: 'Ablehnen', dc: 0, ok: R('Sie nehmen stattdessen deinen Nachbarn. Er ist jetzt sehr erfolgreich.', { happy: -3 }) }] }),
    G({ id: 'g-kuehlschrank', text: 'Dein Kühlschrank ist auf TikTok viral gegangen. Er hat jetzt mehr Follower als du.', opts: [
      { t: 'Sein Manager werden', stat: 'social', dc: 10, ok: R('Werbedeal mit einer Joghurt-Marke. Der Kühlschrank zahlt dir 20 %.', { happy: 4 }, { add: [{ name: 'Kühlschrank-Influencer (Deals)', pm: 380 }] }), bad: R('Er feuert dich und unterschreibt bei einer Agentur.', { power: -4 }) },
      { t: 'Aus Eifersucht ausstecken', dc: 0, ok: R('Er verzeiht dir nie. Die Milch auch nicht.', { happy: -3, money: -40 }) }] }),
    G({ id: 'g-baer', text: 'Ein Bär sitzt in deinem Wohnzimmer und guckt deine Serie weiter. Ohne dich.', opts: [
      { t: 'Mitgucken', stat: 'luck', dc: 10, ok: R('Ihr guckt drei Staffeln am Stück. Der Bär weint beim Finale. Du auch.', { happy: 10 }, { rel: [{ name: 'Bär Bernd', change: 30, kind: 'Serien-Buddy' }] }), bad: R('Der Bär spoilert das Ende. Und beißt.', { health: -18, happy: -8 }) },
      { t: 'Als Mitbewohner anmelden', dc: 0, ok: R('Er zahlt keine Miete, frisst alles, ist aber ein toller Zuhörer.', { happy: 4 }, { add: [{ name: 'Bär als Mitbewohner', pm: -150, happy: 2, power: 1 }] }) },
      { t: 'Rauswerfen', stat: 'body', dc: 17, ok: R('Du hast einen Bären rausgeworfen. Du bist jetzt eine Legende in {c}.', { power: 15 }), bad: R('Der Bär wirft dich raus. Er wohnt jetzt da.', { health: -12, happy: -10 }) }] }),
    G({ id: 'g-zukunft', text: 'Dein 80-jähriges Ich taucht auf und sagt: „Kauf NICHT das, was du morgen kaufen willst.“ Dann verschwindet es.', opts: [
      { t: 'Auf dich hören', stat: 'smart', dc: 8, ok: R('Du kaufst es nicht. Am nächsten Tag ist es zurückgerufen worden. Respekt, Opa-Du.', { money: 500, happy: 3 }), bad: R('Du weißt nicht mal, was du kaufen wolltest. Paranoia.', { happy: -4 }) },
      { t: 'Trotzdem kaufen', stat: 'luck', dc: 12, ok: R('Beste Entscheidung deines Lebens. Opa-Du war einfach neidisch.', { money: 2000, happy: 8 }), bad: R('Opa-Du hatte recht. Es war ein Fehler. Ein teurer.', { money: -2000, happy: -8 }) }] }),
    G({ id: 'g-tung', text: 'Drei Uhr nachts. Tung. Tung. Tung. Tung. Jemand trommelt vor deiner Tür.', opts: [
      { t: 'Aufmachen', stat: 'body', dc: 11, ok: R('Es ist Tung Tung Sahur. Er wollte nur frühstücken. Ihr seid jetzt befreundet.', { happy: 8 }, { rel: [{ name: 'Tung Tung Sahur', change: 25, kind: 'Kumpel aus Holz' }] }), bad: R('Du hast seitdem Albträume mit Holz.', { health: -6, happy: -8 }) },
      { t: 'Mittrommeln', stat: 'luck', dc: 9, ok: R('Ihr gründet einen Trommelkreis. Die Nachbarn ziehen aus.', { happy: 6 }, { add: [{ name: 'Nächtlicher Trommelkreis', pm: -20, happy: 2, health: -1 }] }), bad: R('Du trommelst so schlecht, dass er geht. Beleidigt.', { happy: -3 }) }] }),
    G({ id: 'g-croco', text: 'Ein Krokodil mit Flugzeugflügeln ist auf deinem Dach gelandet. Es schaut dich erwartungsvoll an.', opts: [
      { t: 'Fliegen lernen', stat: 'body', dc: 14, ok: R('Du bist geflogen. Kurz. Aber geflogen. Über {c}. Leute filmen.', { power: 12, happy: 15 }, { chron: 'Ist auf einem fliegenden Krokodil geritten.' }), bad: R('Absturz in den Gartenteich vom Nachbarn.', { health: -18, money: -500 }) },
      { t: 'An den Zoo verkaufen', stat: 'social', dc: 11, ok: R('Der Zoo zahlt 8.000 €. Das Krokodil schaut dich enttäuscht an.', { money: 8000 }), bad: R('Der Zoo ruft die Polizei. Wegen dir, nicht wegen des Krokodils.', { money: -300, power: -3 }) },
      { t: 'Als Haustier behalten', dc: 0, ok: R('Bombardiro frisst Kerosin. Teuer, aber niemand legt sich mehr mit dir an.', { power: 6 }, { add: [{ name: 'Bombardiro (frisst Kerosin)', pm: -400, happy: 3, power: 2 }] }) }] }),
    G({ id: 'g-anime', text: 'Seit heute läuft Anime-Musik im Hintergrund, wenn du redest. Alle sehen dich mit Glitzeraugen an.', opts: [
      { t: 'Ausnutzen', stat: 'social', dc: 10, ok: R('Du hältst eine Rede an der Bushaltestelle. Drei Leute weinen. Einer gründet einen Fanclub.', { power: 10, happy: 6 }), bad: R('Die Musik wechselt auf traurige Geige. Genau während du jemanden anflirtest.', { happy: -8 }) },
      { t: 'Kraftschrei üben', stat: 'body', dc: 10, ok: R('Dein Kraftschrei lässt Fenster vibrieren. Du fühlst dich unbesiegbar.', { health: 4, power: 6 }), bad: R('Heiser. Eine Woche lang.', { health: -3 }) }] }),
    G({ id: 'g-essay', text: 'Jemand hat einen vierstündigen Video-Essay über dich gemacht. Titel: „Der Fall {n}“.', opts: [
      { t: 'Live reagieren', stat: 'social', dc: 12, ok: R('Dein Reaction-Stream bricht Rekorde. Plötzlich bist du sympathisch.', { power: 10, money: 800 }), bad: R('Du wirst im Stream wütend. Clip geht viral. „Der Fall {n}, Teil 2“ ist in Arbeit.', { power: -12, happy: -6 }) },
      { t: 'Ignorieren', dc: 0, ok: R('Hat sowieso keiner zu Ende geguckt. Außer deiner Mama.', { happy: -2 }) }] }),
    G({ id: 'g-lama', text: 'Ein Lama hat in deinem Namen im Lotto gewonnen. Es steht vor deiner Tür und will reden.', opts: [
      { t: 'Fair teilen', dc: 0, ok: R('25.000 € für dich. Das Lama will eine monatliche Lama-Rente. Fair.', { money: 25000, happy: 10 }, { add: [{ name: 'Lama-Rente', pm: -200, happy: 1 }], chron: 'Teilt einen Lottogewinn mit einem Lama.' }) },
      { t: 'Alles behalten', stat: 'luck', dc: 12, ok: R('50.000 €. Das Lama spuckt dir ins Gesicht und geht. Lohnt sich.', { money: 50000, happy: 6 }), bad: R('Das Lama hat einen Anwalt. Einen guten.', { money: -5000, happy: -8 }) }] }),
    G({ id: 'g-hund', text: 'Der Hund vom Nachbarn kann sprechen. Er sagt aber nur Börsentipps.', opts: [
      { t: 'Dem Hund vertrauen (1.000 €)', stat: 'luck', dc: 11, cost: 1000, ok: R('Der Hund hatte recht. +4.000 €. Er will nur Leckerli als Provision.', { money: 3000, happy: 6 }), bad: R('Der Hund hat „Knochen-Coin“ empfohlen. Alles weg.', { money: -1000, happy: -6 }) },
      { t: 'Als Berater einstellen', stat: 'social', dc: 12, ok: R('Der Hund berät jetzt dich und zwei Banken.', {}, { add: [{ name: 'Hunde-Finanzberater', pm: 300, happy: 1 }] }), bad: R('Der Nachbar zeigt dich wegen Hunde-Abwerbung an.', { money: -400 }) }] }),
  ];

  const ADULT = [
    A({ id: 'a-kater', text: 'Du wachst auf. Fremde Wohnung, ein Schuh, ein Dönerspieß in der Hand. Keine Erinnerung.', opts: [
      { t: 'Die Nacht rekonstruieren', stat: 'smart', dc: 12, ok: R('Du findest raus: Du hast gestern einen Karaoke-Wettbewerb gewonnen. 1.200 € Preisgeld.', { money: 1200, happy: 6, health: -6 }), bad: R('Du findest raus, was passiert ist. Du wünschst, du hättest es nicht.', { happy: -10, power: -5, health: -6 }) },
      { t: 'Leise abhauen', stat: 'body', dc: 10, ok: R('Ninja-Abgang. Den Schuh lässt du als Erinnerung da.', { health: -4 }), bad: R('Der Hund der Wohnung sieht dich. Er bellt. Alle wachen auf.', { health: -4, happy: -8 }) },
      { t: 'Frühstück machen, als würdest du hier wohnen', stat: 'social', dc: 14, ok: R('Niemand fragt nach. Du bist jetzt offiziell Teil dieser WG.', { happy: 12, health: -3 }, { chron: 'Ist nach einer Party versehentlich in eine WG eingezogen.' }), bad: R('„Wer bist du?“ – „Ich bin der Typ mit den Pancakes.“ Polizei.', { money: -150, happy: -6 }) }] }),
    A({ id: 'a-shots', text: 'Jemand an der Bar bestellt zehn Runden Shots. Auf deinen Namen.', opts: [
      { t: 'Mitziehen', stat: 'body', dc: 14, ok: R('Legende des Abends. Der DJ ruft deinen Namen.', { happy: 12, power: 4, health: -6, money: -120 }), bad: R('Du hast den Türsteher „Papa“ genannt und ihn umarmt. Es gibt ein Video.', { health: -15, happy: -6, power: -6, money: -120 }) },
      { t: 'Die Rechnung verweigern', stat: 'social', dc: 12, ok: R('Du redest dich raus. Der Typ zahlt. Respekt.', { power: 4 }), bad: R('Du zahlst 340 €. Und trinkst keinen einzigen.', { money: -340, happy: -6 }) },
      { t: 'Heimlich nur Wasser trinken', stat: 'smart', dc: 10, ok: R('Alle denken, du verträgst unfassbar viel. Aura plus tausend.', { power: 6 }), bad: R('Erwischt. „Wasser-Andy“ ist jetzt dein Spitzname.', { power: -5 }) }] }),
    A({ id: 'a-date', text: 'Dein Dating-App-Match will sich heute treffen. Profil: „Unternehmer, 1,90, Krypto, Hustle“.', opts: [
      { t: 'Hingehen', stat: 'luck', dc: 11, ok: R('Überraschung: wirklich nett. Ihr redet bis die Bar zumacht.', { happy: 12 }, { partnerNew: true }), bad: R('1,65, kein Unternehmen, wollte dir einen Trading-Kurs verkaufen. Du zahlst die Getränke.', { happy: -6, money: -45 }) },
      { t: 'Vorher stalken', stat: 'smart', dc: 9, ok: R('Catfish. Das Foto ist von einem Model aus Brasilien. Gerettet.', { power: 3 }), bad: R('Du likest aus Versehen ein Foto von 2016. Peinlich. Match gelöscht.', { happy: -4 }) },
      { t: 'Absagen', dc: 0, ok: R('Couch, Pizza, du. Die beste Beziehung.', { happy: 3 }) }] }),
    A({ id: 'a-ex', text: '2:47 Uhr. Dein Ex schreibt: „u up?“', opts: [
      { t: 'Antworten', stat: 'luck', dc: 13, ok: R('Ihr schreibt bis fünf. Ein Fehler, aber ein schöner.', { happy: 8, health: -3 }), bad: R('Er wollte nur sein Ladekabel zurück.', { happy: -12 }) },
      { t: 'Screenshot in die Gruppe', stat: 'social', dc: 9, ok: R('Die Gruppe eskaliert. Beste Unterhaltung seit Wochen.', { happy: 6, power: 3 }), bad: R('Du hast es aus Versehen in die Familiengruppe geschickt.', { happy: -10, power: -6 }) },
      { t: 'Blockieren', dc: 0, ok: R('Blockiert. Schlafen. Sigma.', { happy: 3, power: 2, health: 2 }) }] }),
    A({ id: 'a-casino', text: 'Deine Leute schleppen dich ins Casino. „Nur 50 Euro, versprochen.“', opts: [
      { t: '50 € setzen', stat: 'luck', dc: 12, cost: 50, ok: R('Roulette, 17, schwarz. 600 € Gewinn. Du gehst sofort. Weise.', { money: 550, happy: 8 }), bad: R('50 € weg in 40 Sekunden.', { money: -50, happy: -3 }) },
      { t: 'Alles auf Rot', stat: 'luck', dc: 15, ok: R('ROT! +3.000 €. Du fühlst dich wie in einem Film.', { money: 3000, happy: 14 }), bad: R('Schwarz. Natürlich schwarz. 1.500 € weg.', { money: -1500, happy: -12 }) },
      { t: 'An der Bar bleiben', dc: 0, ok: R('Du trinkst Gratis-Cocktails und schaust anderen beim Verlieren zu. Unterschätzter Abend.', { happy: 6, health: -3, money: -60 }) }] }),
    A({ id: 'a-malle', text: 'Junggesellenabschied eines Kumpels. Mallorca, Ballermann, drei Tage. Er hat schon T-Shirts drucken lassen.', opts: [
      { t: 'Volles Programm', stat: 'body', dc: 13, ok: R('Drei Tage, null Schlaf, ein Tattoo mit „Ballermann 6“. Es war es wert.', { happy: 18, health: -8, money: -700 }, { chron: 'Hat Malle überlebt. Knapp.' }), bad: R('Du verpasst den Rückflug. Und deinen Ausweis. Und deine Würde.', { health: -16, money: -1100, happy: -6 }) },
      { t: 'Den Vernünftigen spielen', stat: 'work', dc: 9, ok: R('Du bringst alle heil nach Hause. Niemand bedankt sich. Typisch.', { power: 5, money: -400 }), bad: R('Sie haben dich trotzdem in den Pool geworfen. Mit Handy.', { money: -900, happy: -6 }) },
      { t: 'Absagen', dc: 0, ok: R('Die Fotos in der Gruppe sind der Beweis: richtige Entscheidung.', { happy: -2, power: 2 }) }] }),
    A({ id: 'a-fkk', text: 'Du bist aus Versehen am FKK-Strand gelandet. Alle schauen dich an. Weil du angezogen bist.', opts: [
      { t: 'Locker bleiben', stat: 'social', dc: 10, ok: R('Ganz entspannte Leute hier. Du bleibst bis zum Sonnenuntergang. Komplett.', { happy: 8 }), bad: R('Dein Chef ist auch da. Er winkt. Mit allem.', { happy: -8 }) },
      { t: 'Würdevoll gehen', stat: 'luck', dc: 8, ok: R('Niemand kennt dich. Glück gehabt.', {}), bad: R('Du stolperst über eine Sandburg. Applaus.', { power: -4 }) }] }),
    A({ id: 'a-party', text: 'Deine letzte Party war so laut, dass die Nachbarn eine Petition gegen dich gestartet haben.', opts: [
      { t: 'Mit Kuchen entschuldigen', stat: 'social', dc: 11, ok: R('Die Nachbarn verzeihen. Einer fragt, wann die nächste ist.', { happy: 4 }), bad: R('Der Kuchen war nicht genug. Die Hausverwaltung schreibt dir.', { happy: -5, money: -100 }) },
      { t: 'Noch größere Party', dc: 0, ok: R('200 Leute, ein DJ, eine Polizeistreife, die am Ende mittanzt.', { happy: 12, power: 6, health: -6, money: -300 }, { add: [{ name: 'Nachbarschaftskrieg', happy: -1, mo: 6 }] }) },
      { t: 'Die Petition selbst unterschreiben', stat: 'luck', dc: 12, ok: R('Niemand merkt es. Du bist jetzt Teil des Widerstands gegen dich.', { happy: 6 }), bad: R('Sie haben es gemerkt. Jetzt hassen dich beide Seiten.', { happy: -6 }) }] }),
    A({ id: 'a-brownie', text: 'Auf der WG-Party gibt es Brownies. „Spezielle“ Brownies, sagt jemand und zwinkert.', opts: [
      { t: 'Einen nehmen', stat: 'body', dc: 12, ok: R('Du hattest eine tiefe Unterhaltung mit dem Toaster. Er versteht dich wirklich.', { happy: 10, health: -3 }), bad: R('Drei Stunden auf dem Badezimmerboden, Gedanken über das Universum und deine Lebensentscheidungen.', { health: -10, happy: -8 }) },
      { t: 'Ablehnen', dc: 0, ok: R('Du isst stattdessen alle Chips. Niemand ist sauer.', { happy: 4, power: 2 }) }] }),
    A({ id: 'a-bar', text: 'Jemand aus der Bar fragt, ob du noch mit zu ihr oder ihm kommst.', opts: [
      { t: 'Mitgehen', stat: 'luck', dc: 11, ok: R('Was dann passiert, bleibt zwischen euch. April schaut weg. Am Morgen gibt es Pancakes.', { happy: 14, health: -2 }), bad: R('Die Wohnung ist voller Porzellanpuppen. Hunderte. Du gehst nach dem Frühstück. Schnell.', { happy: -5 }) },
      { t: 'Nummer tauschen', stat: 'social', dc: 10, ok: R('Ihr schreibt eine Woche lang. Dann ist es offiziell.', { happy: 10 }, { partnerNew: true }), bad: R('Falsche Nummer gegeben. Absichtlich. Von ihr.', { happy: -6 }) },
      { t: 'Heimgehen', dc: 0, ok: R('Du gehst heim und schläfst. Erwachsen. Langweilig. Gesund.', { health: 3 }) }] }),
    A({ id: 'a-arbeit', text: 'Montagmorgen, 7:30. Du hast einen Kater, der Gesetze bricht. Und gleich ein wichtiges Meeting.', opts: [
      { t: 'Durchziehen', stat: 'body', dc: 13, ok: R('Niemand merkt etwas. Du bist ein Profi. Ein grüner, zitternder Profi.', { power: 6, health: -6 }), bad: R('Du schläfst im Meeting ein. Du schnarchst. Laut.', { power: -10, happy: -6 }) },
      { t: 'Krankmelden', stat: 'luck', dc: 10, ok: R('Niemand fragt nach. Du schläfst bis 15 Uhr.', { health: 6 }), bad: R('Dein Chef sieht deine Party-Story von gestern Nacht.', { power: -8, happy: -6 }) },
      { t: 'Vier Espresso', dc: 0, ok: R('Du hörst Farben. Das Meeting war trotzdem gut.', { health: -5, power: 3 }) }] }),
  ];

  // ---------- Weltereignisse (Goofy-Modus): treffen alle lebenden Figuren ----------
  const WORLD = [
    { t: 'Ein Meteor aus Döner landet in Duisburg. Ganz Deutschland isst eine Woche umsonst.', d: { happy: 6, money: 40 } },
    { t: 'Die Bundesregierung führt den nationalen Mewing-Tag ein. Alle Kieferlinien werden schärfer.', d: { power: 2, health: 1 } },
    { t: 'Die Hyperinflation aus Ohio greift über: Alle zahlen 67 € Ohio-Steuer.', d: { money: -67 } },
    { t: 'Ein Milliardär verteilt aus Versehen Geld aus dem Hubschrauber.', d: { money: 'rain' } },
    { t: 'WLAN-Ausfall in ganz Europa. Alle müssen draußen spielen. Viele sehen zum ersten Mal die Sonne.', d: { happy: -4, health: 5 } },
    { t: 'Aliens bewerten die Menschheit öffentlich mit 2 von 5 Sternen. Kommentar: „Laut, aber süß.“', d: { power: -2, happy: -1 } },
    { t: 'Tung Tung Sahur trommelt nachts in allen Städten gleichzeitig. Niemand schläft.', d: { health: -3, happy: -2 } },
    { t: 'Eine riesige Ente blockiert die A40. Alle kommen zu spät, aber gut gelaunt.', d: { happy: 3, power: -1 } },
    { t: 'Sigma-Grindset geht viral. Ganz Deutschland duscht kalt um 4 Uhr.', d: { health: 3, happy: -3 } },
    { t: 'Tauben übernehmen den Bundestag. Erstes Gesetz: Brot ist offizielle Währung.', d: { money: 50, happy: 2 } },
    { t: 'Ein schwarzes Loch frisst alle Socken der Welt. Nur die linken.', d: { happy: -3 } },
    { t: 'April hat sich selbst zur Bürgermeisterin von allem gewählt. Erste Amtshandlung: Aura-Abgabe.', d: { money: -100, power: -1 } },
    { t: 'Ein Krokodil mit Flügeln wird Bundeskanzler. Die Umfragewerte sind besser als erwartet.', d: { happy: 4 } },
  ];
  const WORLD_MAX = [
    { t: 'Die Schwerkraft macht einen Tag Pause. Alle schweben. Viele stoßen sich den Kopf.', d: { happy: 8, health: -5 } },
    { t: 'Das gesamte Internet ist für einen Tag nur noch eine einzige Katze. Produktivität: 0. Laune: Maximum.', d: { happy: 9, power: -2 } },
    { t: 'Alle Menschen sprechen für 24 Stunden nur noch in Großbuchstaben. Es ist laut.', d: { happy: -2, power: 3 } },
    { t: 'Ein zufälliger Glückspilz bekommt 6.767 € vom Himmel.', d: { lucky: 6767 } },
    { t: 'Der Mond hat sich entschuldigt. Wofür, weiß niemand. Alle fühlen sich trotzdem besser.', d: { happy: 6, health: 2 } },
    { t: 'Ohio tritt der EU bei. Niemand hat gefragt. Alle bekommen ein Willkommenspaket mit Mais.', d: { money: 120, happy: -1 } },
  ];

  function world(S, X) {
    const mode = S.settings && S.settings.goofy;
    if (!mode || mode === 'off') return;
    if (Math.random() > (mode === 'max' ? 0.45 : 0.25)) return;
    const pool = mode === 'max' ? WORLD.concat(WORLD_MAX, WORLD_MAX) : WORLD;
    const e = pool[Math.floor(Math.random() * pool.length)];
    const alive = S.players.filter((p) => S.chars[p.id] && !S.chars[p.id].dead);
    if (!alive.length) return;
    const lucky = alive[Math.floor(Math.random() * alive.length)].id;
    alive.forEach((p) => {
      const c = S.chars[p.id], d = e.d, bits = [];
      if (d.money === 'rain') { const m = 100 + Math.floor(Math.random() * 1400); c.stats.money += m; bits.push(`+${X.eur(m)}`); }
      else if (d.money) { c.stats.money += d.money; bits.push(`${d.money > 0 ? '+' : '−'}${X.eur(Math.abs(d.money))}`); }
      if (d.lucky && p.id === lucky) { c.stats.money += d.lucky; bits.push(`+${X.eur(d.lucky)} (DU bist der Glückspilz)`); }
      ['health', 'happy', 'power'].forEach((k) => { if (d[k]) c.stats[k] = X.clampStat(c.stats[k] + d[k]); });
      X.report(S, p.id, '•', `WELTEREIGNIS: ${e.t}${bits.length ? ` ${bits.join(' ')}` : ''}`, 'goofy');
    });
    S.world = S.world || [];
    S.world.unshift({ d: X.dateText(S), t: `WELTEREIGNIS: ${e.t}` });
    if (S.world.length > 40) S.world.length = 40;
  }

  // Stapel erweitern (einmal)
  function register(deck) {
    if (!deck || !deck.events || deck._goofy) return;
    GOOFY.concat(ADULT).forEach((e) => deck.events.push(e));
    deck._goofy = true;
  }
  const LARP_GOOFY = { GOOFY, ADULT, WORLD, WORLD_MAX, world, register };
  if (isNode) module.exports = LARP_GOOFY;
  else root.DULI_LARP_GOOFY = LARP_GOOFY;
})(typeof window !== 'undefined' ? window : globalThis);
