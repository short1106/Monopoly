"""Zentrale Konfiguration. Alles kommt aus Umgebungsvariablen bzw. der .env.

Nichts Geheimes steht hier im Code: Passwörter werden per Skript gesetzt,
der API-Key kommt ausschließlich aus ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import time
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Die genau zwei erlaubten Konten. Mehr gibt es in Phase 1 nicht.
USERS: dict[str, dict[str, str]] = {
    "shaqy": {"display_name": "Shaqy", "grade": "13. Klasse (Abitur)", "color": "#ff6b35"},
    "kimmi": {"display_name": "Kimmi", "grade": "12. Klasse", "color": "#4ecdc4"},
}


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "ja", "on"}


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} muss eine ganze Zahl sein, ist aber {raw!r}") from exc


def _path(name: str, default: str) -> Path:
    p = Path(os.getenv(name, default).strip() or default)
    return p if p.is_absolute() else BASE_DIR / p


def _time(name: str, default: str) -> time:
    raw = os.getenv(name, default).strip()
    try:
        hh, mm = raw.split(":")
        return time(int(hh), int(mm))
    except ValueError as exc:
        raise RuntimeError(f"{name} muss im Format HH:MM sein, ist aber {raw!r}") from exc


@dataclass(frozen=True)
class Settings:
    db_path: Path = field(default_factory=lambda: _path("APRIL_DB_PATH", "data/april.db"))
    timezone: ZoneInfo = field(default_factory=lambda: ZoneInfo(os.getenv("APRIL_TIMEZONE", "Europe/Berlin")))

    # Anthropic
    model: str = field(default_factory=lambda: os.getenv("APRIL_MODEL", "claude-opus-5-5"))
    effort: str = field(default_factory=lambda: os.getenv("APRIL_EFFORT", "medium"))
    max_tokens: int = field(default_factory=lambda: _int("APRIL_MAX_TOKENS", 16000))
    # Serverseitiger Fallback, falls das Modell eine Anfrage ablehnt.
    use_fallbacks: bool = field(default_factory=lambda: _bool("APRIL_USE_FALLBACKS", True))
    auto_generate: bool = field(default_factory=lambda: _bool("APRIL_AUTO_GENERATE", True))

    # Probeklausuren
    pass_threshold: int = field(default_factory=lambda: _int("APRIL_PASS_THRESHOLD", 50))

    # Treffen (jeden Montag und Dienstag)
    meeting_time: time = field(default_factory=lambda: _time("APRIL_MEETING_TIME", "16:00"))
    meeting_duration_min: int = field(default_factory=lambda: _int("APRIL_MEETING_DURATION_MIN", 90))
    checkin_early_min: int = field(default_factory=lambda: _int("APRIL_CHECKIN_EARLY_MIN", 15))
    checkin_grace_min: int = field(default_factory=lambda: _int("APRIL_CHECKIN_GRACE_MIN", 5))

    # Punkte
    points_exam_passed: int = 10
    points_best_of_week: int = 5
    points_on_time: int = 2
    points_absent: int = -10

    # Sessions
    session_days: int = field(default_factory=lambda: _int("APRIL_SESSION_DAYS", 14))
    cookie_secure: bool = field(default_factory=lambda: _bool("APRIL_COOKIE_SECURE", False))
    cookie_name: str = "april_session"

    @property
    def api_key_present(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY", "").strip())


# Wochentage der festen Treffen: 0 = Montag, 1 = Dienstag
MEETING_WEEKDAYS = (0, 1)

settings = Settings()


def reload_settings() -> Settings:
    """Für Tests: Settings neu aus der Umgebung lesen."""
    global settings
    settings = Settings()
    return settings
