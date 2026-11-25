import json
from datetime import timedelta

import pytest

from app import april
from app.timeutil import today
from tests.conftest import csrf, login

FAKE_EXAM = {
    "title": "Probeklausur Analysis",
    "intro": "Okay Bestie – jetzt wird's Ernst.",
    "duration_minutes": 60,
    "tasks": [
        {"number": 1, "operator": "Berechne", "question": "Berechne das Integral von 0 bis 2 über x^2.", "points": 10},
        {"number": 2, "operator": "Erläutere", "question": "Erläutere den Hauptsatz.", "points": 10},
    ],
    "nerd_fact": "Nerd-Fact: Der ICE fährt schnell.",
}


def fake_grading(points1, points2):
    return {
        "tasks": [
            {"number": 1, "achieved_points": points1, "feedback": "Gut."},
            {"number": 2, "achieved_points": points2, "feedback": "Zu Dünn — mehr Details."},
        ],
        "overall_feedback": "Solide.",
        "next_steps": ["Wiederhole den Hauptsatz."],
        "nerd_fact": "Nerd-Fact: Schiffe schwimmen.",
    }


@pytest.fixture
def fake_april(monkeypatch):
    calls = {"grading": []}

    def fake_call(prompt, schema):
        if schema is april.EXAM_SCHEMA:
            return FAKE_EXAM
        return calls["grading"].pop(0)

    monkeypatch.setattr(april, "call_april", fake_call)
    return calls


def _setup_profile(client):
    token = csrf(client, "/profil")
    client.post("/profil/fach", data={"name": "mathe", "csrf_token": token})
    from app.db import session_scope

    with session_scope() as conn:
        sid = conn.execute("SELECT id FROM subjects WHERE name = 'mathe'").fetchone()["id"]
    exam_date = (today() + timedelta(days=20)).isoformat()
    client.post("/profil/klausur", data={"subject_id": sid, "exam_date": exam_date, "title": "analysis", "csrf_token": token})
    client.post("/profil/thema", data={"subject_id": sid, "name": "integrale", "is_weakness": "1", "csrf_token": token})
    return token


def _latest_exam():
    from app.db import session_scope

    with session_scope() as conn:
        return dict(conn.execute("SELECT * FROM mock_exams ORDER BY id DESC LIMIT 1").fetchone())


def test_profile_creates_plan(shaqy):
    _setup_profile(shaqy)
    html = shaqy.get("/kalender?ansicht=monat").text
    assert "schreibtag" in html
    week = shaqy.get("/kalender?ansicht=woche").text
    assert "festes treffen" in week


def test_full_exam_pass_flow(shaqy, fake_april):
    token = _setup_profile(shaqy)
    r = shaqy.post("/klausuren/neu", data={"csrf_token": token}, follow_redirects=False)
    assert r.status_code == 303
    exam = _latest_exam()
    assert exam["status"] == "open"
    assert exam["topic"] == "integrale"
    content = json.loads(exam["content_json"])
    assert "–" not in content["intro"] and content["intro"] == content["intro"].lower()

    fake_april["grading"].append(fake_grading(10, 5))
    r = shaqy.post(f"/klausuren/{exam['id']}/abgeben",
                   data={"csrf_token": token, "answer_1": "8/3", "answer_2": "F' = f"}, follow_redirects=False)
    assert r.status_code == 303
    graded = _latest_exam()
    assert graded["status"] == "graded" and graded["passed"] == 1
    assert graded["score_percent"] == 75.0
    page = shaqy.get(f"/klausuren/{exam['id']}").text
    assert "bestanden" in page and "zu dünn, mehr details." in page

    from app.db import session_scope
    from app.points import all_time_total

    with session_scope() as conn:
        assert all_time_total(conn, graded["user_id"]) == 10


def test_fail_starts_new_round_same_topic(shaqy, fake_april):
    token = _setup_profile(shaqy)
    shaqy.post("/klausuren/neu", data={"csrf_token": token})
    first = _latest_exam()
    fake_april["grading"].append(fake_grading(3, 1))
    shaqy.post(f"/klausuren/{first['id']}/abgeben", data={"csrf_token": token, "answer_1": "keine ahnung"})
    retry = _latest_exam()
    assert retry["id"] != first["id"]
    assert retry["round"] == 2 and retry["topic"] == first["topic"] and retry["status"] == "open"


def test_grading_clamps_points(fake_april):
    content = april.clean_exam(FAKE_EXAM)
    result = april.clean_grading(fake_grading(99, -4), content)
    assert result["tasks"][0]["achieved_points"] == 10
    assert result["tasks"][1]["achieved_points"] == 0
    assert result["percent"] == 50.0


def test_api_error_is_shown(shaqy, monkeypatch):
    def boom(prompt, schema):
        raise april.AprilError("api kaputt")

    monkeypatch.setattr(april, "call_april", boom)
    token = _setup_profile(shaqy)
    shaqy.post("/klausuren/neu", data={"csrf_token": token})
    exam = _latest_exam()
    assert exam["status"] == "error"
    assert "api kaputt" in shaqy.get(f"/klausuren/{exam['id']}").text


def test_other_user_cannot_see_exam(client, fake_april):
    login(client, "shaqy")
    token = _setup_profile(client)
    client.post("/klausuren/neu", data={"csrf_token": token})
    exam = _latest_exam()
    client.cookies.clear()
    login(client, "kimmi")
    assert client.get(f"/klausuren/{exam['id']}").status_code == 404


def test_missing_api_key(shaqy, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    with pytest.raises(april.AprilError):
        april.call_april("x", april.EXAM_SCHEMA)


def test_weekly_job_creates_one_per_user(shaqy, fake_april):
    _setup_profile(shaqy)
    created = april.ensure_weekly_exams()
    assert len(created) == 1  # kimmi hat noch kein profil
    assert april.ensure_weekly_exams() == []


def test_all_pages_render(shaqy):
    for path in ["/", "/profil", "/kalender", "/kalender?ansicht=monat", "/klausuren", "/gruppe", "/healthz"]:
        assert shaqy.get(path).status_code == 200, path
    assert shaqy.get("/gibtsnicht").status_code == 404
