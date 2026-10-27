# Dulidanopoly

Das Monopoly von **Dulidan Studios**: von Marxloh bis ins DULIDAN HQ. Spielbar im Browser, online mit Freunden oder zu mehreren an einem Gerät.

## Spielen
- **Online:** Einer klickt auf „Raum erstellen“ und schickt den Link oder den 4-stelligen Code. Die anderen geben den Code ein. Jeder spielt am eigenen Handy. Das Gerät des Raum-Erstellers ist der Host und muss die Seite offen lassen.
- **Ein Gerät:** „Auf einem Gerät spielen“. Alle Spieler wechseln sich ab.

## Spielmodi
- 🎲 **Klassisch:** das Brett mit Duisburg und Öhringen
- 🎰 **DULIDAN CASINO:** das normale Brett, aber jede Straße ist ein Casino. Wer bei dir landet, spielt gegen deine Bank (Münzwurf, Würfelduell, Höher/Tiefer, Glücksrad, Roulette, Blackjack, Pferderennen, Slotmaschine). Ausbauen macht das Casino korrupter.
- 🌍 **DULIDAN WORLD:** Weltkarte, Dulidan-Würfel mit Spezialseiten, Jetset-Flüge
- 🌀 **DULIDAN ROYALE:** drei Ringe im All, Portale, Loot-Kisten, der April-Sturm zerstört Ring für Ring
- 🚇 **DULIDAN METRO:** U-Bahn-Netz, wem eine ganze Linie gehört, kassiert Fahrpreis von allen Durchfahrenden
- 🏙️ **DULIDAN TOWER:** fünf Etagen, Aufzüge rauf, Rutschen runter, Aufzug-Gebühr für Etagen-Besitzer

Dazu fünf Varianten für jedes Brett: Klassisch, Blitz, Millionär, April-Chaos, Hardcore.

**💖 Aprils Laune** (in der Lobby abschaltbar): April mag jede Person anders, lässt sich bestechen, macht ihrem Liebling Geschenke und rächt sich bei Hass (Haus abreißen, Straße in Hypothek). Dazu Tageslaune und Live-Kommentar über dem Brett.

## Technik
- Reine statische Webseite (HTML/CSS/JS), keine Build-Schritte.
- Online-Verbindung direkt zwischen den Geräten über [PeerJS](https://peerjs.com) (WebRTC, `vendor/peerjs.min.js`). Für den Verbindungsaufbau wird der kostenlose PeerJS-Cloud-Server genutzt.
- `js/data.js` + `js/engine.js`: klassisches Brett und Regeln · `js/world-data.js` + `js/boards-data.js`: die Bretter World, Royale, Metro, Tower · `js/world.js`: gemeinsame Brett-Engine · `js/mood.js`: Aprils Laune · `js/casino.js`: Casino-Spiele · `js/net.js`: Online-Verbindung · `js/ui.js` + `js/fx.js`: Oberfläche, Sounds, Würfel · `css/april.css`: Design wie dulidan-studios.com.

## Live stellen (GitHub Pages)
Settings → Pages → „Deploy from a branch“ → Branch wählen, Ordner `/ (root)` → Save.
