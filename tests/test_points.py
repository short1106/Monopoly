from datetime import date, datetime, timedelta

import pytest

from app import config, points
from app.auth import get_user_by_name
from app.db import session_scope

TZ = config.settings.timezone
MONDAY = date(2026, 11, 23)


def _at(d, hh, mm):
    return datetime(d.year, d.month, d.day, hh, mm, tzinfo=config.settings.timezone)


def test_meetings_only_monday_tuesday():
    days = points.meeting_dates(MONDAY, MONDAY + timedelta(days=6))
    assert [d.weekday() for d in days] == [0, 1]


def test_checkin_on_time_gives_points():
    with session_scope() as conn:
        u = get_user_by_name(conn, "shaqy")
        assert points.check_in(conn, u, _at(MONDAY, 16, 3)) == "on_time"
        assert points.all_time_total(conn, u.id) == 2
        with pytest.raises(points.CheckinError):
            points.check_in(conn, u, _at(MONDAY, 16, 4))


def test_checkin_late_no_points_and_not_absent():
    with session_scope() as conn:
        u = get_user_by_name(conn, "kimmi")
        conn.execute("UPDATE users SET created_at = ?", (_at(MONDAY - timedelta(days=1), 9, 0).isoformat(),))
        assert points.check_in(conn, u, _at(MONDAY, 16, 30)) == "late"
        points.settle(conn, _at(MONDAY, 22, 0))
        assert points.all_time_total(conn, u.id) == 0


def test_checkin_rejected_on_other_days():
    with session_scope() as conn:
        u = get_user_by_name(conn, "kimmi")
        with pytest.raises(points.CheckinError):
            points.check_in(conn, u, _at(MONDAY + timedelta(days=2), 16, 0))


def test_absence_penalty_is_idempotent():
    with session_scope() as conn:
        conn.execute("UPDATE users SET created_at = ?", (_at(MONDAY - timedelta(days=1), 9, 0).isoformat(),))
        u = get_user_by_name(conn, "shaqy")
        at = _at(MONDAY + timedelta(days=2), 12, 0)  # mittwoch, montag und dienstag verpasst
        points.settle(conn, at)
        points.settle(conn, at)
        assert points.all_time_total(conn, u.id) == -20


def test_best_of_week_bonus_and_monthly_verdict():
    last_week = MONDAY - timedelta(days=5)  # mittwoch der vorwoche
    with session_scope() as conn:
        s = get_user_by_name(conn, "shaqy")
        k = get_user_by_name(conn, "kimmi")
        for uid, score in ((s.id, 80.0), (k.id, 65.0)):
            conn.execute(
                """INSERT INTO mock_exams (user_id, subject, topic, week_key, status, score_percent, passed,
                   created_at, graded_at) VALUES (?, 'mathe', 'x', '2026-W47', 'graded', ?, 1, ?, ?)""",
                (uid, score, _at(last_week, 10, 0).isoformat(), _at(last_week, 11, 0).isoformat()),
            )
        conn.execute("UPDATE users SET created_at = ?", (_at(MONDAY, 23, 0).isoformat(),))
        points.settle(conn, _at(MONDAY, 23, 30))
        points.settle(conn, _at(MONDAY, 23, 30))
        assert points.all_time_total(conn, s.id) == 5
        assert points.all_time_total(conn, k.id) == 0

        verdict = points.verdict_for_month(conn, "2026-11")
        assert verdict.winner.id == s.id
        assert verdict.snack_bringers[0].id == k.id


def test_tie_means_both_bring_snacks():
    with session_scope() as conn:
        v = points.verdict_for_month(conn, "2026-01")
        assert v.tie and v.winner is None and len(v.snack_bringers) == 2


def test_only_winner_sets_group_topic():
    with session_scope() as conn:
        s = get_user_by_name(conn, "shaqy")
        k = get_user_by_name(conn, "kimmi")
        points.add_points(conn, s.id, 10, "test", "t1", date(2026, 10, 5))
        today = date(2026, 11, 10)
        with pytest.raises(PermissionError):
            points.set_group_topic(conn, k, "vektoren", today)
        points.set_group_topic(conn, s, "vektoren", today)
        assert points.current_group_topic(conn, today)["topic"] == "vektoren"
