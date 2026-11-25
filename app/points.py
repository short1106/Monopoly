"""Treffen, Anwesenheit und Punktesystem.

Punkte liegen in einem Ledger mit eindeutiger ``ref``. Dadurch kann
``settle`` beliebig oft laufen, ohne doppelt zu buchen.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from app import config
from app.auth import User, all_users
from app.config import MEETING_WEEKDAYS
from app.timeutil import iso_week_key, month_key, now, previous_month_key


# ---------------------------------------------------------------------------
# Treffen
# ---------------------------------------------------------------------------

def is_meeting_day(d: date) -> bool:
    return d.weekday() in MEETING_WEEKDAYS


def meeting_start(d: date) -> datetime:
    return datetime.combine(d, config.settings.meeting_time, tzinfo=config.settings.timezone)


def meeting_end(d: date) -> datetime:
    return meeting_start(d) + timedelta(minutes=config.settings.meeting_duration_min)


def meeting_dates(start: date, end: date) -> list[date]:
    out = []
    d = start
    while d <= end:
        if is_meeting_day(d):
            out.append(d)
        d += timedelta(days=1)
    return out


def next_meeting(at: datetime | None = None) -> datetime:
    """Das nächste Treffen, das noch nicht vorbei ist (läuft es gerade, zählt es)."""
    at = at or now()
    d = at.date()
    while True:
        if is_meeting_day(d) and meeting_end(d) > at:
            return meeting_start(d)
        d += timedelta(days=1)


class CheckinError(Exception):
    pass


def check_in(conn: sqlite3.Connection, user: User, at: datetime | None = None) -> str:
    """Einchecken beim heutigen Treffen. Gibt den Status zurück (on_time oder late)."""
    at = at or now()
    d = at.date()
    if not is_meeting_day(d):
        raise CheckinError("heute ist kein treffen. montag und dienstag, merk dir das.")
    start, end = meeting_start(d), meeting_end(d)
    if at < start - timedelta(minutes=config.settings.checkin_early_min):
        raise CheckinError(f"einchecken geht erst ab {config.settings.checkin_early_min} minuten vor beginn.")
    if at > end:
        raise CheckinError("das treffen ist schon vorbei. zu spät ist zu spät.")
    existing = conn.execute(
        "SELECT status FROM attendance WHERE user_id = ? AND meeting_date = ?", (user.id, d.isoformat())
    ).fetchone()
    if existing:
        raise CheckinError("du bist schon eingecheckt, chill.")

    on_time = at <= start + timedelta(minutes=config.settings.checkin_grace_min)
    status = "on_time" if on_time else "late"
    conn.execute(
        "INSERT INTO attendance (user_id, meeting_date, status, checked_in_at) VALUES (?, ?, ?, ?)",
        (user.id, d.isoformat(), status, at.isoformat()),
    )
    if on_time:
        add_points(conn, user.id, config.settings.points_on_time, "pünktlich beim treffen", f"meet:{d.isoformat()}:{user.id}", d)
    return status


def attendance_for(conn: sqlite3.Connection, user_id: int, d: date) -> str | None:
    row = conn.execute(
        "SELECT status FROM attendance WHERE user_id = ? AND meeting_date = ?", (user_id, d.isoformat())
    ).fetchone()
    return row["status"] if row else None


# ---------------------------------------------------------------------------
# Punkte
# ---------------------------------------------------------------------------

def add_points(conn: sqlite3.Connection, user_id: int, amount: int, reason: str, ref: str, event_date: date) -> bool:
    """Bucht Punkte genau einmal pro ref. Gibt True zurück, wenn neu gebucht wurde."""
    cur = conn.execute(
        """INSERT OR IGNORE INTO points (user_id, amount, reason, ref, event_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, amount, reason, ref, event_date.isoformat(), now().isoformat()),
    )
    return cur.rowcount == 1


def award_exam_passed(conn: sqlite3.Connection, user_id: int, exam_id: int, d: date) -> None:
    add_points(conn, user_id, config.settings.points_exam_passed, "probeklausur bestanden", f"exam:{exam_id}:pass", d)


def settle(conn: sqlite3.Connection, at: datetime | None = None) -> None:
    """Bucht verpasste Treffen (minus 10) und das beste Wochenergebnis (plus 5)."""
    at = at or now()
    _settle_absences(conn, at)
    _settle_best_of_week(conn, at)


def _settle_absences(conn: sqlite3.Connection, at: datetime) -> None:
    for user in all_users(conn):
        created = datetime.fromisoformat(user.created_at)
        if created.tzinfo is None:
            created = created.replace(tzinfo=config.settings.timezone)
        for d in meeting_dates(created.date(), at.date()):
            # Nur Treffen, die nach Kontoerstellung begonnen haben und schon vorbei sind.
            if meeting_start(d) < created or meeting_end(d) > at:
                continue
            if attendance_for(conn, user.id, d) is not None:
                continue
            conn.execute(
                "INSERT OR IGNORE INTO attendance (user_id, meeting_date, status) VALUES (?, ?, 'absent')",
                (user.id, d.isoformat()),
            )
            add_points(conn, user.id, config.settings.points_absent, "treffen geschwänzt", f"meet:{d.isoformat()}:{user.id}", d)


def _settle_best_of_week(conn: sqlite3.Connection, at: datetime) -> None:
    """Nach Ende einer Woche: wer das beste bestandene Ergebnis hatte, bekommt plus 5.
    Bei Gleichstand bekommen es beide."""
    current_week = iso_week_key(at.date())
    rows = conn.execute(
        """SELECT user_id, graded_at, score_percent FROM mock_exams
           WHERE status = 'graded' AND passed = 1 AND graded_at IS NOT NULL"""
    ).fetchall()
    best: dict[str, tuple[float, set[int], date]] = {}
    for r in rows:
        graded = datetime.fromisoformat(r["graded_at"]).date()
        week = iso_week_key(graded)
        if week >= current_week:
            continue
        score = float(r["score_percent"])
        sunday = graded + timedelta(days=6 - graded.weekday())
        if week not in best or score > best[week][0]:
            best[week] = (score, {r["user_id"]}, sunday)
        elif score == best[week][0]:
            best[week][1].add(r["user_id"])
    for week, (_, users, sunday) in best.items():
        for uid in users:
            add_points(conn, uid, config.settings.points_best_of_week, f"bestes ergebnis der woche {week}", f"best:{week}:{uid}", sunday)


# ---------------------------------------------------------------------------
# Rangliste
# ---------------------------------------------------------------------------

@dataclass
class RankEntry:
    user: User
    points: int
    rank: int


def month_totals(conn: sqlite3.Connection, month: str) -> list[RankEntry]:
    users = all_users(conn)
    totals = {u.id: 0 for u in users}
    for r in conn.execute(
        "SELECT user_id, SUM(amount) AS total FROM points WHERE substr(event_date, 1, 7) = ? GROUP BY user_id",
        (month,),
    ):
        totals[r["user_id"]] = int(r["total"] or 0)
    ordered = sorted(users, key=lambda u: (-totals[u.id], u.id))
    out: list[RankEntry] = []
    for u in ordered:
        rank = 1 + sum(1 for other in users if totals[other.id] > totals[u.id])
        out.append(RankEntry(user=u, points=totals[u.id], rank=rank))
    return out


def all_time_total(conn: sqlite3.Connection, user_id: int) -> int:
    row = conn.execute("SELECT COALESCE(SUM(amount), 0) AS t FROM points WHERE user_id = ?", (user_id,)).fetchone()
    return int(row["t"])


@dataclass
class MonthVerdict:
    month: str
    winner: User | None  # None bei Gleichstand oder ohne Daten
    snack_bringers: list[User]
    tie: bool


def verdict_for_month(conn: sqlite3.Connection, month: str) -> MonthVerdict:
    ranking = month_totals(conn, month)
    if len(ranking) < 2:
        return MonthVerdict(month, None, [], False)
    if ranking[0].points == ranking[-1].points:
        # Gleichstand: April bestimmt das thema, beide bringen snacks.
        return MonthVerdict(month, None, [r.user for r in ranking], True)
    return MonthVerdict(month, ranking[0].user, [ranking[-1].user], False)


def last_month_verdict(conn: sqlite3.Connection, today: date) -> MonthVerdict:
    return verdict_for_month(conn, previous_month_key(today))


def current_group_topic(conn: sqlite3.Connection, today: date) -> sqlite3.Row | None:
    return conn.execute(
        """SELECT g.*, u.display_name FROM group_topics g LEFT JOIN users u ON u.id = g.chosen_by
           WHERE g.month = ?""",
        (month_key(today),),
    ).fetchone()


def set_group_topic(conn: sqlite3.Connection, user: User, topic: str, today: date) -> None:
    verdict = last_month_verdict(conn, today)
    if verdict.winner is None or verdict.winner.id != user.id:
        raise PermissionError("nur platz 1 vom letzten monat darf das thema bestimmen.")
    topic = topic.strip()
    if not topic:
        raise ValueError("ein leeres thema ist kein thema.")
    conn.execute(
        """INSERT INTO group_topics (month, chosen_by, topic, created_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(month) DO UPDATE SET topic = excluded.topic, chosen_by = excluded.chosen_by,
           created_at = excluded.created_at""",
        (month_key(today), user.id, topic[:200], now().isoformat()),
    )


def recent_ledger(conn: sqlite3.Connection, user_id: int, limit: int = 20) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM points WHERE user_id = ? ORDER BY event_date DESC, id DESC LIMIT ?", (user_id, limit)
    ).fetchall()
