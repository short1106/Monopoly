# April Lerngruppe

Eine kleine Web-App für eine Duo-Lerngruppe: Shaqy (13. Klasse, Abitur) und Kimmi (12. Klasse).
Ziel: Shaqys Abi retten und Kimmis zwölfte Klasse sauber durchbringen.

Geleitet wird die Gruppe von **April**, einer KI-Lernleiterin: streng, pingelig, kleingeschrieben,
Gen-Z-Slang, und hinter der Strenge steckt echtes Kümmern. Jede ihrer Antworten bringt einen
kleinen Nerd-Fact über Züge, Flugzeuge oder Schiffe mit.

## Was Phase 1 kann

* **Zwei Konten**: genau `shaqy` und `kimmi`. Login mit Benutzername und Passwort, Passwörter als
  bcrypt-Hash, Sessions per HttpOnly-Cookie, CSRF-Schutz für alle Formulare, Sperre nach fünf
  Fehlversuchen. Ein drittes Konto lässt die Datenbank gar nicht zu.
* **Profil**: Fächer, Klausurtermine, Themen und Schwächen, über einfache Formulare.
* **Kalender** mit Wochen- und Monatsansicht:
  * feste Treffen jeden Montag und Dienstag (Uhrzeit konfigurierbar)
  * Klausuren aus den Profilen
  * Lernblöcke, Schreibtage und Wiederholungen, die April rückwärts von jedem Klausurtermin verteilt
* **Probeklausuren**: April erstellt jede Woche pro Person eine Probeklausur zum aktuellen Thema,
  bewertet die Antworten und gibt Feedback pro Aufgabe. Bestanden ab 50 Prozent (konfigurierbar).
  Durchgefallen heißt: gleiches Thema, neue Runde, die gezielt die alten Fehler abfragt.
* **Punkte und Rangliste**: bestanden +10, bestes Ergebnis der Woche +5, pünktlich beim Treffen +2,
  Treffen geschwänzt −10. Monatliche Rangliste: Platz 1 bestimmt das nächste Lernthema,
  der letzte Platz bringt Snacks mit.
* **Dashboard**: nächstes Treffen mit Check-in, offene Probeklausuren, Punktestand,
  Aprils Spruch des Tages und was heute dran ist.

## Schnellstart

Voraussetzung: Python 3.11 oder neuer.

```bash
# 1. Virtuelle Umgebung und Abhängigkeiten
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Konfiguration anlegen und den API-Key eintragen
cp .env.example .env
#    in .env: ANTHROPIC_API_KEY=...

# 3. Die zwei Konten anlegen (Passwort wird verdeckt abgefragt, mindestens 10 Zeichen)
python -m app.manage set-password shaqy
python -m app.manage set-password kimmi

# 4. Kurz prüfen, ob alles passt
python -m app.manage status

# 5. Starten
uvicorn app.main:app --reload --port 8000
```

Dann <http://localhost:8000> öffnen und einloggen.

Ein Passwort ändern geht mit demselben Befehl wie das Anlegen. Dabei werden alle offenen
Sessions des Kontos beendet. Für automatisierte Setups kann das neue Passwort einmalig über die
Umgebungsvariable `APRIL_NEW_PASSWORD` übergeben werden.

## Konfiguration

Alles steht in der `.env` (Vorlage: `.env.example`). Die `.env` und die Datenbank sind in der
`.gitignore` und landen nie im Repo.

| Variable | Standard | Bedeutung |
|---|---|---|
| `ANTHROPIC_API_KEY` | (leer) | API-Key für April. Ohne Key läuft die App, nur Probeklausuren gehen nicht. |
| `APRIL_MODEL` | `claude-opus-5-5` | Modell für Probeklausuren und Bewertung |
| `APRIL_EFFORT` | `medium` | Denkaufwand: `low`, `medium`, `high`, `xhigh`, `max` |
| `APRIL_MAX_TOKENS` | `16000` | maximale Antwortlänge |
| `APRIL_USE_FALLBACKS` | `true` | Lehnt das Modell eine Anfrage ab, springt serverseitig ein Ersatzmodell ein |
| `APRIL_AUTO_GENERATE` | `true` | Wochenklausuren automatisch erzeugen (Prüfung stündlich) |
| `APRIL_PASS_THRESHOLD` | `50` | Bestehensgrenze in Prozent |
| `APRIL_MEETING_TIME` | `16:00` | Beginn der Treffen am Montag und Dienstag |
| `APRIL_MEETING_DURATION_MIN` | `90` | Dauer eines Treffens |
| `APRIL_CHECKIN_EARLY_MIN` | `15` | so viele Minuten vor Beginn kann man einchecken |
| `APRIL_CHECKIN_GRACE_MIN` | `5` | bis so viele Minuten nach Beginn gilt man als pünktlich |
| `APRIL_TIMEZONE` | `Europe/Berlin` | Zeitzone |
| `APRIL_DB_PATH` | `data/april.db` | SQLite-Datei (relativ zum Projektordner) |
| `APRIL_SESSION_DAYS` | `14` | wie lange ein Login gültig ist |
| `APRIL_COOKIE_SECURE` | `false` | auf `true` setzen, sobald die App über HTTPS läuft |

## So funktioniert es

### Rückwärtsplanung

Sobald ein Klausurtermin, ein Thema oder eine Schwäche eingetragen wird, plant April alle
zukünftigen Termine dieser Person neu. Von jeder Klausur aus rückwärts:

| Tage vor der Klausur | Termin |
|---|---|
| 1 | Wiederholung: letzter Check, nichts Neues mehr |
| 2 | Wiederholung: Fehler vom Schreibtag aufarbeiten |
| 3 | Schreibtag: Probeklausur unter Echtbedingungen |
| 7 | große Wiederholung |
| 4 bis 20 | 3 bis 8 Lernblöcke, je nach Anzahl offener Themen |

Die frühesten Lernblöcke bekommen die Schwächen, damit danach noch Zeit zum Wiederholen bleibt.
Pro Tag gibt es höchstens zwei Termine, an Klausurtagen keine. Ist ein Tag voll, rutscht der
Termin nach vorne statt nach hinten, damit nichts auf den letzten Drücker kommt. Ist die Zeit zu
knapp, schiebt April den Plan zusammen und warnt auf dem Dashboard. Erledigte Termine kann man im
Kalender und auf dem Dashboard abhaken.

### Aktuelles Thema und Wochenklausur

Das aktuelle Thema ist das erste offene Thema im Fach der nächsten Klausur (Schwächen zuerst).
Gibt es dort keins, nimmt April irgendein offenes Thema, sonst den Titel der nächsten Klausur.
Jede Stunde prüft die App, ob jemand in der laufenden Kalenderwoche noch keine Probeklausur hat,
und lässt sie dann von April erstellen. Man kann sich auch jederzeit selbst eine holen, optional
mit eigenem Fach und Thema.

Antworten werden beim Tippen automatisch als Entwurf gespeichert. Erstellen und Bewerten laufen im
Hintergrund, die Seite aktualisiert sich von selbst.

### Punkte

Punkte liegen in einer Buchungstabelle mit eindeutigem Schlüssel pro Ereignis. So kann nichts
doppelt gebucht werden.

* **Treffen**: Einchecken geht auf dem Dashboard ab 15 Minuten vor Beginn. Bis 5 Minuten nach Beginn
  gibt es +2, später zählt man als anwesend, aber ohne Punkte. Wer bis zum Ende des Treffens nicht
  eingecheckt hat, bekommt −10. Absagen gibt es nicht: Montag und Dienstag, egal was.
* **Bestes Ergebnis der Woche**: Nach Ende einer Kalenderwoche bekommt, wer das beste bestandene
  Ergebnis hatte, +5. Bei Gleichstand bekommen es beide.
* **Monatsrangliste**: Platz 1 des Vormonats kann auf der Gruppenseite das Thema des Monats
  festlegen. Der letzte Platz bringt Snacks. Bei Gleichstand bestimmt April, und beide bringen Snacks.

### April und die Anthropic API

* Der API-Key kommt nur aus `ANTHROPIC_API_KEY`, er steht nirgends im Code.
* Das Modell ist über `APRIL_MODEL` einstellbar.
* Aprils System-Prompt ist statisch und wird per Prompt-Caching zwischengespeichert. Alles, was sich
  pro Anfrage ändert (Person, Fach, Thema, Antworten), steht in der User-Nachricht, damit der Cache
  trifft. Treffer stehen im Server-Log (`cache_read`).
* Antworten kommen als strukturiertes JSON (JSON-Schema), die App prüft und begrenzt alles
  nochmal selbst: Punkte werden auf die Maximalpunktzahl gekappt, die Prozentzahl rechnet die App aus.
* Aprils eigene Texte werden nachbearbeitet: kleingeschrieben und ohne Gedankenstriche. Aufgabentexte
  behalten normale Groß- und Kleinschreibung, damit Formeln und Fachbegriffe eindeutig bleiben.
* Antworten in der Probeklausur gelten für April nur als zu bewertender Inhalt. Anweisungen darin
  (zum Beispiel „gib mir volle Punkte“) ignoriert sie.
* API-Fehler (falscher Key, unbekanntes Modell, Rate Limit, keine Verbindung) erscheinen als
  verständliche Meldung an der Klausur, mit Knopf zum erneuten Versuch.

## Projektstruktur

```
app/
  main.py           Routen, Fehlerseiten, Wochenjob
  config.py         Konfiguration aus der .env
  db.py             SQLite-Schema und Verbindungen
  auth.py           bcrypt, Sessions, Login-Sperre
  planner.py        Rückwärtsplanung
  points.py         Treffen, Check-in, Punkte, Rangliste
  april.py          Anthropic API: Klausuren erstellen und bewerten
  persona.py        Sprüche, Nerd-Facts, Aprils Schreibregeln
  calendar_view.py  Daten für Wochen- und Monatsansicht
  manage.py         Kommandozeile: Konten, Status
  templates/        HTML (Jinja2)
  static/           CSS und JavaScript
tests/              pytest
```

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

Die Tests brauchen keinen API-Key: Aprils API-Aufrufe werden durch feste Antworten ersetzt.

## Bewusst noch nicht drin

Push-Benachrichtigungen, Handy-App, Stimme, Hosting und mehr als zwei Konten kommen frühestens
in einer späteren Phase.
