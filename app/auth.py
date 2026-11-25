"""Login, Passwort-Hashing (bcrypt) und Cookie-Sessions."""

from __future__ import annotations

import hashlib
import secrets
import sqlite3
import threading
import time
from dataclasses import dataclass
from datetime import timedelta

import bcrypt

from app import config
from app.timeutil import now

MIN_PASSWORD_LENGTH = 10
MAX_PASSWORD_BYTES = 72  # Grenze von bcrypt

# Damit unbekannte Benutzernamen nicht schneller abgelehnt werden als falsche Passwörter.
_DUMMY_HASH = bcrypt.hashpw(b"april-dummy-password", bcrypt.gensalt())


class PasswordPolicyError(ValueError):
    pass


@dataclass(frozen=True)
class User:
    id: int
    username: str
    display_name: str
    created_at: str

    @property
    def meta(self) -> dict[str, str]:
        return config.USERS[self.username]

    @property
    def color(self) -> str:
        return self.meta["color"]

    @property
    def grade(self) -> str:
        return self.meta["grade"]


@dataclass(frozen=True)
class SessionInfo:
    user: User
    csrf_token: str


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise PasswordPolicyError(f"Passwort muss mindestens {MIN_PASSWORD_LENGTH} Zeichen haben.")
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise PasswordPolicyError(f"Passwort darf höchstens {MAX_PASSWORD_BYTES} Bytes lang sein (bcrypt-Grenze).")


def hash_password(password: str) -> str:
    validate_password(password)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:MAX_PASSWORD_BYTES], password_hash.encode("ascii"))
    except ValueError:
        return False


def set_password(conn: sqlite3.Connection, username: str, password: str) -> None:
    """Legt eines der zwei Konten an oder setzt sein Passwort neu."""
    username = username.strip().lower()
    if username not in config.USERS:
        raise ValueError(f"Unbekanntes Konto {username!r}. Erlaubt sind nur: {', '.join(config.USERS)}")
    pw_hash = hash_password(password)
    display = config.USERS[username]["display_name"]
    conn.execute(
        """
        INSERT INTO users (username, display_name, password_hash, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
        """,
        (username, display, pw_hash, now().isoformat()),
    )
    # Bei Passwortwechsel alle Sessions des Kontos beenden.
    conn.execute(
        "DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE username = ?)", (username,)
    )


def _row_to_user(row: sqlite3.Row) -> User:
    return User(id=row["id"], username=row["username"], display_name=row["display_name"], created_at=row["created_at"])


def authenticate(conn: sqlite3.Connection, username: str, password: str) -> User | None:
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username.strip().lower(),)).fetchone()
    if row is None:
        verify_password(password, _DUMMY_HASH.decode("ascii"))
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return _row_to_user(row)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def create_session(conn: sqlite3.Connection, user: User) -> str:
    token = secrets.token_urlsafe(32)
    created = now()
    expires = created + timedelta(days=config.settings.session_days)
    conn.execute(
        "INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
        (_hash_token(token), user.id, secrets.token_urlsafe(24), created.isoformat(), expires.isoformat()),
    )
    conn.execute("DELETE FROM sessions WHERE expires_at < ?", (created.isoformat(),))
    return token


def load_session(conn: sqlite3.Connection, token: str | None) -> SessionInfo | None:
    if not token:
        return None
    row = conn.execute(
        """
        SELECT s.csrf_token, s.expires_at, u.* FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
        """,
        (_hash_token(token),),
    ).fetchone()
    if row is None:
        return None
    if row["expires_at"] < now().isoformat():
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))
        return None
    return SessionInfo(user=_row_to_user(row), csrf_token=row["csrf_token"])


def delete_session(conn: sqlite3.Connection, token: str | None) -> None:
    if token:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))


def get_user_by_name(conn: sqlite3.Connection, username: str) -> User | None:
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    return _row_to_user(row) if row else None


def all_users(conn: sqlite3.Connection) -> list[User]:
    return [_row_to_user(r) for r in conn.execute("SELECT * FROM users ORDER BY id")]


class LoginThrottle:
    """Einfache Sperre nach zu vielen Fehlversuchen (im Speicher, pro Benutzername)."""

    def __init__(self, max_failures: int = 5, window_seconds: int = 600) -> None:
        self.max_failures = max_failures
        self.window = window_seconds
        self._failures: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str) -> list[float]:
        cutoff = time.monotonic() - self.window
        items = [t for t in self._failures.get(key, []) if t > cutoff]
        self._failures[key] = items
        return items

    def is_locked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key)) >= self.max_failures

    def fail(self, key: str) -> None:
        with self._lock:
            self._recent(key).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)


login_throttle = LoginThrottle()
