"""Zeit-Helfer. Alles läuft in der konfigurierten Zeitzone (Standard: Europe/Berlin)."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from app import config


def now() -> datetime:
    return datetime.now(config.settings.timezone)


def today() -> date:
    return now().date()


def iso_week_key(d: date) -> str:
    year, week, _ = d.isocalendar()
    return f"{year}-W{week:02d}"


def week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def month_key(d: date) -> str:
    return f"{d.year}-{d.month:02d}"


def previous_month_key(d: date) -> str:
    first = d.replace(day=1)
    return month_key(first - timedelta(days=1))


def parse_date(raw: str) -> date:
    return date.fromisoformat(raw)


GERMAN_WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
GERMAN_WEEKDAYS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
GERMAN_MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]


def format_date_de(d: date) -> str:
    return f"{GERMAN_WEEKDAYS[d.weekday()]}, {d.day}. {GERMAN_MONTHS[d.month - 1]}"


def format_month_de(year: int, month: int) -> str:
    return f"{GERMAN_MONTHS[month - 1]} {year}"
