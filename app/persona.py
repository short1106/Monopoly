"""Aprils Stimme: Sprüche, Nerd-Facts und Textregeln."""

from __future__ import annotations

import hashlib
import random
import re
from datetime import date

SPRUECHE = [
    "wer nichts lernt, wird arm. das ist kein drama, das ist mathe.",
    "no cap, eine stunde heute spart dir drei panikstunden vor der klausur.",
    "motivation ist optional, disziplin nicht. hinsetzen, anfangen, fertig.",
    "dein zukünftiges ich schaut dir gerade zu. gib ihm keinen grund zum cringe.",
    "ich bin streng, weil ich will, dass ihr das packt. also los.",
    "lernen ist wie gym für den kopf. kein skip day.",
    "die klausur wartet nicht, bis du bock hast. sie kommt trotzdem.",
    "kleine schritte jeden tag schlagen eine nacht vor der klausur. immer.",
    "handy weg, heft auf. das ist der ganze trick, bestie.",
    "fehler sind daten. aus daten wird wissen. aus wissen wird abi.",
    "ihr seid nicht dumm, ihr seid nur noch nicht fertig mit üben.",
    "erst lernen, dann flexen. andersrum geht das schief.",
    "wer jetzt schwänzt, zahlt später zinsen. hohe zinsen.",
    "ich glaub an euch. deshalb lass ich euch auch nicht durchrutschen.",
    "heute ein bisschen besser als gestern. mehr verlang ich gar nicht. okay, doch, aber fang damit an.",
    "es ist nicht zu spät, aber es wird langsam spät. also jetzt.",
    "stoff, den du heute wiederholst, musst du morgen nicht neu lernen. lowkey genial.",
    "ein plan ohne umsetzung ist nur ein hübscher kalender.",
]

NERD_FACTS = [
    "nerd-fact: der shinkansen fährt seit 1964 und hatte bis heute keinen einzigen unfall mit todesopfern durch entgleisung oder kollision.",
    "nerd-fact: ein ice 3 schafft im regelbetrieb 300 km/h, auf testfahrten waren es über 360.",
    "nerd-fact: der längste eisenbahntunnel der welt ist der gotthard-basistunnel mit gut 57 kilometern.",
    "nerd-fact: die transsibirische eisenbahn ist über 9.000 kilometer lang und durchquert sieben zeitzonen.",
    "nerd-fact: die spurweite von 1.435 mm heißt normalspur und ist auf rund 60 prozent aller strecken weltweit verbaut.",
    "nerd-fact: die mallard hält seit 1938 den geschwindigkeitsrekord für dampfloks mit 203 km/h.",
    "nerd-fact: der airbus a380 hat eine spannweite von knapp 80 metern, fast so breit wie ein fußballfeld lang ist.",
    "nerd-fact: eine boeing 747 besteht aus ungefähr sechs millionen einzelteilen.",
    "nerd-fact: die concorde flog mit mach 2 und schaffte london nach new york in unter dreieinhalb stunden.",
    "nerd-fact: flugzeuge fliegen nach osten oft schneller, weil der jetstream mit über 200 km/h mitschiebt.",
    "nerd-fact: die blackbox im flugzeug ist eigentlich knallorange, damit man sie nach einem unfall findet.",
    "nerd-fact: die an-225 mrija war das schwerste flugzeug der welt, mit über 600 tonnen startgewicht.",
    "nerd-fact: containerschiffe der größten klasse tragen über 24.000 standardcontainer.",
    "nerd-fact: ein knoten ist eine seemeile pro stunde, also 1,852 km/h.",
    "nerd-fact: die titanic hatte vier schornsteine, aber nur drei davon waren in betrieb, der vierte war für die optik.",
    "nerd-fact: große tanker brauchen bei voller fahrt mehrere kilometer, um zu stoppen.",
    "nerd-fact: der nord-ostsee-kanal ist die meistbefahrene künstliche wasserstraße der welt.",
    "nerd-fact: backbord ist links, steuerbord rechts, und nachts leuchtet backbord rot und steuerbord grün.",
    "nerd-fact: die wuppertaler schwebebahn fährt seit 1901 und ist damit eine der ältesten hängebahnen der welt.",
    "nerd-fact: der maglev in shanghai erreicht im regelbetrieb bis zu 431 km/h, ganz ohne räder auf der schiene.",
]


def _seeded_index(seed: str, n: int) -> int:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % n


def spruch_des_tages(d: date) -> str:
    return SPRUECHE[_seeded_index(f"spruch:{d.isoformat()}", len(SPRUECHE))]


def nerd_fact_des_tages(d: date) -> str:
    return NERD_FACTS[_seeded_index(f"fact:{d.isoformat()}", len(NERD_FACTS))]


def random_nerd_fact() -> str:
    return random.choice(NERD_FACTS)


_RANGE_DASH = re.compile(r"(\d)\s*[‒–—―]\s*(\d)")
_DASHES = re.compile(r"\s*[‒–—―]\s*")
_SPACED_HYPHEN = re.compile(r"\s+-\s+")


def _strip_dashes(text: str) -> str:
    text = _RANGE_DASH.sub(r"\1 bis \2", text)
    return _DASHES.sub(", ", text)


def april_voice(text: str) -> str:
    """Erzwingt Aprils Stil für ihre eigenen Texte: kleingeschrieben, keine Gedankenstriche."""
    if not text:
        return ""
    text = _strip_dashes(text)
    text = _SPACED_HYPHEN.sub(", ", text)
    text = re.sub(r",\s*,", ",", text)
    return text.strip().lower()


def no_dashes(text: str) -> str:
    """Entfernt nur Gedankenstriche (für Aufgabentexte, Groß- und Kleinschreibung bleibt).
    Gespaltene Bindestriche bleiben, weil sie in Aufgaben ein Minuszeichen sein können."""
    if not text:
        return ""
    return _strip_dashes(text).strip()
