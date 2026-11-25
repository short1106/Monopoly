"""Verwaltung über die Kommandozeile.

    python -m app.manage init                 Datenbank anlegen
    python -m app.manage set-password shaqy   Konto anlegen oder Passwort setzen
    python -m app.manage set-password kimmi
    python -m app.manage status               Konten und Konfiguration anzeigen

Passwörter werden interaktiv abgefragt (ohne Echo) und nur als bcrypt-Hash gespeichert.
Für automatisierte Setups kann das Passwort über die Umgebungsvariable
APRIL_NEW_PASSWORD übergeben werden; es landet nie im Code oder im Repo.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys

from app import config
from app.auth import PasswordPolicyError, all_users, set_password, validate_password
from app.db import init_db, session_scope


def _ask_password(username: str) -> str:
    env_pw = os.getenv("APRIL_NEW_PASSWORD")
    if env_pw:
        return env_pw
    if not sys.stdin.isatty():
        raise SystemExit("Kein Terminal gefunden. Passwort interaktiv eingeben oder APRIL_NEW_PASSWORD setzen.")
    while True:
        pw1 = getpass.getpass(f"Neues Passwort für {username}: ")
        try:
            validate_password(pw1)
        except PasswordPolicyError as exc:
            print(exc)
            continue
        pw2 = getpass.getpass("Passwort wiederholen: ")
        if pw1 != pw2:
            print("Die Passwörter stimmen nicht überein, nochmal.")
            continue
        return pw1


def cmd_init(_: argparse.Namespace) -> int:
    init_db()
    print(f"Datenbank bereit: {config.settings.db_path}")
    return 0


def cmd_set_password(args: argparse.Namespace) -> int:
    username = args.username.strip().lower()
    if username not in config.USERS:
        print(f"Nur diese zwei Konten gibt es: {', '.join(config.USERS)}", file=sys.stderr)
        return 2
    init_db()
    password = _ask_password(username)
    try:
        with session_scope() as conn:
            set_password(conn, username, password)
    except PasswordPolicyError as exc:
        print(exc, file=sys.stderr)
        return 2
    print(f"Passwort für {username} gesetzt. Alle alten Sessions dieses Kontos sind beendet.")
    return 0


def cmd_status(_: argparse.Namespace) -> int:
    init_db()
    s = config.settings
    with session_scope() as conn:
        existing = {u.username for u in all_users(conn)}
    for name in config.USERS:
        print(f"Konto {name:6s}: {'angelegt' if name in existing else 'FEHLT (python -m app.manage set-password ' + name + ')'}")
    print(f"Datenbank       : {s.db_path}")
    print(f"Modell          : {s.model} (effort {s.effort})")
    print(f"API-Key         : {'gefunden' if s.api_key_present else 'FEHLT (ANTHROPIC_API_KEY in .env)'}")
    print(f"Bestehensgrenze : {s.pass_threshold} %")
    print(f"Treffen         : Montag und Dienstag um {s.meeting_time.strftime('%H:%M')}, {s.meeting_duration_min} min")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.manage", description="April Lerngruppe verwalten")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init", help="Datenbank anlegen").set_defaults(func=cmd_init)
    sp = sub.add_parser("set-password", help="Konto anlegen oder Passwort setzen")
    sp.add_argument("username", choices=sorted(config.USERS))
    sp.set_defaults(func=cmd_set_password)
    sub.add_parser("status", help="Status anzeigen").set_defaults(func=cmd_status)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
