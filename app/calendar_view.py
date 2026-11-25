"""Daten für Wochen- und Monatsansicht des Kalenders."""

from __future__ import annotations

import calendar as pycal
import sqlite3
from dataclasses import dataclass, field
from datetime import date, timedelta

from app import config
from app.auth import User
from app.points import attendance_for, is_meeting_day, meeting_end, meeting_start
from app.timeutil import now, week_start

KIND_LABELS = {
    "treffen": "treffen",
    "klausur": "klausur",
    "lernblock": "lernblock",
    "schreibtag": "schreibtag",
    "wiederholung": "wiederholung",
}


@dataclass
class Event:
    kind: str
    title: str
    owner: User | None = None  # None = ganze Gruppe
    time: str = ""
    item_id: int | None = None
    done: bool = False
    note: str = ""


@dataclass
class Day:
    date: date
    in_month: bool = True
    is_today: bool = False
    events: list[Event] = field(default_factory=list)


def _status_label(status: str | None) -> str:
    return {"on_time": "pünktlich", "late": "zu spät", "absent": "geschwänzt"}.get(status or "", "")


def collect_events(conn: sqlite3.Connection, users: list[User], start: date, end: date) -> dict[date, list[Event]]:
    events: dict[date, list[Event]] = {}
    user_ids = [u.id for u in users]
    by_id = {u.id: u for u in users}
    current = now()

    d = start
    while d <= end:
        if is_meeting_day(d):
            notes = []
            for u in users:
                st = attendance_for(conn, u.id, d)
                if st:
                    notes.append(f"{u.display_name}: {_status_label(st)}")
                elif meeting_end(d) < current:
                    notes.append(f"{u.display_name}: offen")
            t = config.settings.meeting_time.strftime("%H:%M")
            events.setdefault(d, []).append(
                Event(kind="treffen", title="festes treffen", time=t, note=", ".join(notes),
                      done=meeting_start(d) < current)
            )
        d += timedelta(days=1)

    if not user_ids:
        return events
    marks = ",".join("?" for _ in user_ids)

    for r in conn.execute(
        f"""SELECT e.id, e.user_id, e.exam_date, e.title, s.name AS subject FROM exams e
            JOIN subjects s ON s.id = e.subject_id
            WHERE e.user_id IN ({marks}) AND e.exam_date BETWEEN ? AND ?""",
        (*user_ids, start.isoformat(), end.isoformat()),
    ):
        title = f"klausur {r['subject']}" + (f": {r['title']}" if r["title"] else "")
        events.setdefault(date.fromisoformat(r["exam_date"]), []).append(
            Event(kind="klausur", title=title, owner=by_id[r["user_id"]])
        )

    for r in conn.execute(
        f"""SELECT id, user_id, item_date, kind, title, done FROM plan_items
            WHERE user_id IN ({marks}) AND item_date BETWEEN ? AND ? ORDER BY kind, id""",
        (*user_ids, start.isoformat(), end.isoformat()),
    ):
        events.setdefault(date.fromisoformat(r["item_date"]), []).append(
            Event(kind=r["kind"], title=r["title"], owner=by_id[r["user_id"]], item_id=r["id"], done=bool(r["done"]))
        )

    order = {"treffen": 0, "klausur": 1, "schreibtag": 2, "wiederholung": 3, "lernblock": 4}
    for lst in events.values():
        lst.sort(key=lambda e: (order.get(e.kind, 9), e.owner.id if e.owner else 0))
    return events


def week_days(conn: sqlite3.Connection, users: list[User], anchor: date, today: date) -> list[Day]:
    start = week_start(anchor)
    end = start + timedelta(days=6)
    ev = collect_events(conn, users, start, end)
    return [
        Day(date=start + timedelta(days=i), is_today=(start + timedelta(days=i)) == today,
            events=ev.get(start + timedelta(days=i), []))
        for i in range(7)
    ]


def month_weeks(conn: sqlite3.Connection, users: list[User], anchor: date, today: date) -> list[list[Day]]:
    first = anchor.replace(day=1)
    last = first.replace(day=pycal.monthrange(first.year, first.month)[1])
    start = week_start(first)
    end = week_start(last) + timedelta(days=6)
    ev = collect_events(conn, users, start, end)
    weeks: list[list[Day]] = []
    d = start
    while d <= end:
        week = []
        for _ in range(7):
            week.append(Day(date=d, in_month=d.month == first.month, is_today=d == today, events=ev.get(d, [])))
            d += timedelta(days=1)
        weeks.append(week)
    return weeks


def shift_month(d: date, delta: int) -> date:
    m = d.month - 1 + delta
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, 1)
