"""Aprils Rückwärtsplanung.

Aus jedem Klausurtermin werden rückwärts Lernblöcke, ein Schreibtag
(Probeklausur unter Echtbedingungen) und Wiederholungstermine verteilt.
Die Funktion ``build_plan`` ist rein (keine DB), damit sie gut testbar ist.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from datetime import date, timedelta

from app.timeutil import today as get_today

MAX_ITEMS_PER_DAY = 2

# (Tage vor der Klausur, Art, Priorität). Kleinere Priorität wird zuerst platziert.
FIXED_SLOTS = [
    (1, "wiederholung", 0, "letzter check, nur noch wiederholen, nix neues"),
    (3, "schreibtag", 1, "probeklausur unter echtbedingungen schreiben"),
    (2, "wiederholung", 2, "fehler vom schreibtag aufarbeiten"),
    (7, "wiederholung", 4, "große wiederholung, alles einmal durch"),
]
# Lernblöcke: so viele Tage vor der Klausur, spätester zuerst.
LERNBLOCK_OFFSETS = [4, 6, 9, 11, 13, 16, 18, 20]
MIN_BLOCKS = 3


@dataclass(frozen=True)
class ExamInput:
    id: int
    subject_id: int
    subject: str
    exam_date: date
    title: str = ""


@dataclass(frozen=True)
class PlanItem:
    item_date: date
    kind: str
    title: str
    exam_id: int
    subject_id: int


@dataclass
class PlanResult:
    items: list[PlanItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _block_count(n_topics: int) -> int:
    return max(MIN_BLOCKS, min(len(LERNBLOCK_OFFSETS), n_topics + 2))


def build_plan(
    exams: list[ExamInput],
    topics_by_subject: dict[int, list[str]],
    today: date,
    max_per_day: int = MAX_ITEMS_PER_DAY,
) -> PlanResult:
    """Verteilt Termine rückwärts von jeder Klausur aus.

    topics_by_subject: offene Themen pro Fach, Schwächen zuerst.
    Die nächste Klausur wird zuerst geplant und bekommt damit die besten Tage.
    """
    result = PlanResult()
    load: dict[date, int] = {}
    upcoming = sorted((e for e in exams if e.exam_date > today), key=lambda e: e.exam_date)
    exam_days = {e.exam_date for e in upcoming}

    for exam in upcoming:
        latest = exam.exam_date - timedelta(days=1)
        topics = topics_by_subject.get(exam.subject_id, [])
        n_blocks = _block_count(len(topics))

        wanted: list[tuple[int, int, str, str]] = []  # (prio, offset, kind, title)
        for offset, kind, prio, text in FIXED_SLOTS:
            wanted.append((prio, offset, kind, f"{kind} {exam.subject}: {text}"))

        block_offsets = LERNBLOCK_OFFSETS[:n_blocks]
        # Früheste Blöcke bekommen die ersten Themen (Schwächen), damit Zeit zum Wiederholen bleibt.
        for i, offset in enumerate(sorted(block_offsets, reverse=True)):
            topic = topics[i % len(topics)] if topics else (exam.title or "stoff durcharbeiten")
            # Lernblöcke nah an der Klausur sind wichtiger als ganz frühe.
            prio = 3 if offset <= 6 else 5
            wanted.append((prio, offset, "lernblock", f"lernblock {exam.subject}: {topic}"))

        dropped = 0
        compressed = False
        for prio, offset, kind, title in sorted(wanted, key=lambda w: (w[0], w[1])):
            desired = exam.exam_date - timedelta(days=offset)
            if desired < today:
                compressed = True
            slot = _find_slot(desired, today, latest, load, exam_days, max_per_day)
            if slot is None:
                dropped += 1
                continue
            load[slot] = load.get(slot, 0) + 1
            result.items.append(PlanItem(slot, kind, title, exam.id, exam.subject_id))

        if compressed or dropped:
            msg = f"{exam.subject} am {exam.exam_date.strftime('%d.%m.')} ist knapp, plan wurde zusammengeschoben"
            if dropped:
                msg += f", {dropped} termine passen nicht mehr rein"
            result.warnings.append(msg)

    result.items.sort(key=lambda i: (i.item_date, i.kind, i.title))
    return result


def _find_slot(
    desired: date,
    today: date,
    latest: date,
    load: dict[date, int],
    blocked: set[date],
    max_per_day: int,
) -> date | None:
    if latest < today:
        return None
    start = min(max(desired, today), latest)
    candidates: list[date] = []
    d = start
    while d >= today:  # zuerst rückwärts, damit nichts auf den letzten Drücker kommt
        candidates.append(d)
        d -= timedelta(days=1)
    d = start + timedelta(days=1)
    while d <= latest:
        candidates.append(d)
        d += timedelta(days=1)
    for cand in candidates:
        if cand in blocked:
            continue
        if load.get(cand, 0) < max_per_day:
            return cand
    return None


# ---------------------------------------------------------------------------
# Datenbank-Anbindung
# ---------------------------------------------------------------------------

def load_inputs(conn: sqlite3.Connection, user_id: int) -> tuple[list[ExamInput], dict[int, list[str]]]:
    exams = [
        ExamInput(
            id=r["id"],
            subject_id=r["subject_id"],
            subject=r["subject"],
            exam_date=date.fromisoformat(r["exam_date"]),
            title=r["title"],
        )
        for r in conn.execute(
            """SELECT e.id, e.subject_id, e.exam_date, e.title, s.name AS subject
               FROM exams e JOIN subjects s ON s.id = e.subject_id
               WHERE e.user_id = ? ORDER BY e.exam_date""",
            (user_id,),
        )
    ]
    topics: dict[int, list[str]] = {}
    for r in conn.execute(
        """SELECT subject_id, name FROM topics
           WHERE user_id = ? AND done = 0
           ORDER BY is_weakness DESC, created_at, id""",
        (user_id,),
    ):
        topics.setdefault(r["subject_id"], []).append(r["name"])
    return exams, topics


def regenerate_plan(conn: sqlite3.Connection, user_id: int, today: date | None = None) -> PlanResult:
    """Plant alle Termine ab heute neu. Vergangene Termine bleiben stehen,
    erledigte Haken werden übernommen, wenn der gleiche Termin wieder entsteht."""
    today = today or get_today()
    exams, topics = load_inputs(conn, user_id)
    plan = build_plan(exams, topics, today)

    done_keys = {
        (r["exam_id"], r["kind"], r["title"], r["item_date"])
        for r in conn.execute(
            "SELECT exam_id, kind, title, item_date FROM plan_items WHERE user_id = ? AND item_date >= ? AND done = 1",
            (user_id, today.isoformat()),
        )
    }
    conn.execute("DELETE FROM plan_items WHERE user_id = ? AND item_date >= ?", (user_id, today.isoformat()))
    conn.executemany(
        """INSERT INTO plan_items (user_id, exam_id, subject_id, item_date, kind, title, done)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                user_id,
                it.exam_id,
                it.subject_id,
                it.item_date.isoformat(),
                it.kind,
                it.title,
                1 if (it.exam_id, it.kind, it.title, it.item_date.isoformat()) in done_keys else 0,
            )
            for it in plan.items
        ],
    )
    return plan
