"""SQLite-Zugriff mit dem Standardmodul sqlite3."""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager

from app import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE CHECK (username IN ('shaqy', 'kimmi')),
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    id      INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS exams (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_date  TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '',
    notes      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS topics (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_weakness INTEGER NOT NULL DEFAULT 0,
    done        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_items (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id    INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    item_date  TEXT NOT NULL,
    kind       TEXT NOT NULL CHECK (kind IN ('lernblock', 'schreibtag', 'wiederholung')),
    title      TEXT NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meeting_date TEXT NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'absent')),
    checked_in_at TEXT,
    PRIMARY KEY (user_id, meeting_date)
);

CREATE TABLE IF NOT EXISTS mock_exams (
    id            INTEGER PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject       TEXT NOT NULL,
    topic         TEXT NOT NULL,
    round         INTEGER NOT NULL DEFAULT 1,
    week_key      TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('generating', 'open', 'grading', 'graded', 'error')),
    content_json  TEXT,
    answers_json  TEXT,
    result_json   TEXT,
    score_percent REAL,
    passed        INTEGER,
    error_message TEXT,
    created_at    TEXT NOT NULL,
    graded_at     TEXT
);

CREATE TABLE IF NOT EXISTS points (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount     INTEGER NOT NULL,
    reason     TEXT NOT NULL,
    ref        TEXT NOT NULL UNIQUE,
    event_date TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_topics (
    month      TEXT PRIMARY KEY,
    chosen_by  INTEGER REFERENCES users(id),
    topic      TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_user_date ON plan_items(user_id, item_date);
CREATE INDEX IF NOT EXISTS idx_points_user_date ON points(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_mock_user ON mock_exams(user_id, week_key);
"""


def connect() -> sqlite3.Connection:
    path = config.settings.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    # check_same_thread=False: sync-Dependencies laufen im Threadpool, async-Routen im Eventloop.
    # Eine Verbindung wird trotzdem immer nur von einem Request nacheinander benutzt.
    conn = sqlite3.connect(path, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def session_scope() -> Iterator[sqlite3.Connection]:
    """Verbindung für Hintergrundjobs: commit bei Erfolg, rollback bei Fehler."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI-Dependency: eine Verbindung pro Request."""
    conn = connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
