from datetime import date

from app.persona import april_voice, no_dashes, spruch_des_tages


def test_april_voice_lowercase_and_no_dashes():
    out = april_voice("Das war Stark – Aber nicht perfekt — Weiter so - los")
    assert out == out.lower()
    assert "–" not in out and "—" not in out and " - " not in out


def test_ranges_become_bis():
    assert no_dashes("Seite 3–5") == "Seite 3 bis 5"


def test_no_dashes_keeps_case_and_minus():
    assert no_dashes("Berechne 5 - 3 für f(x)") == "Berechne 5 - 3 für f(x)"


def test_spruch_is_stable_per_day():
    d = date(2026, 11, 25)
    assert spruch_des_tages(d) == spruch_des_tages(d)
