# Dulidanopoly

Das Monopoly von **Dulidan Studios**: von Marxloh bis ins DULIDAN HQ. Spielbar im Browser, online mit Freunden oder zu mehreren an einem Gerät.

## Spielen
- **Online:** Einer klickt auf „Raum erstellen“ und schickt den Link oder den 4-stelligen Code. Die anderen geben den Code ein. Jeder spielt am eigenen Handy. Das Gerät des Raum-Erstellers ist der Host und muss die Seite offen lassen.
- **Ein Gerät:** „Auf einem Gerät spielen“. Alle Spieler wechseln sich ab.

## Technik
- Reine statische Webseite (HTML/CSS/JS), keine Build-Schritte.
- Online-Verbindung direkt zwischen den Geräten über [PeerJS](https://peerjs.com) (WebRTC, `vendor/peerjs.min.js`). Für den Verbindungsaufbau wird der kostenlose PeerJS-Cloud-Server genutzt.
- `js/data.js`: Spielbrett, Karten, Figuren · `js/engine.js`: Spielregeln (läuft beim Host) · `js/net.js`: Online-Verbindung · `js/ui.js`: Oberfläche.

## Live stellen (GitHub Pages)
Settings → Pages → „Deploy from a branch“ → Branch wählen, Ordner `/ (root)` → Save.
