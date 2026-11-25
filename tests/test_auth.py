import sqlite3

import pytest

from app.auth import PasswordPolicyError, hash_password, set_password, verify_password
from app.db import session_scope
from tests.conftest import csrf, login


def test_hash_is_bcrypt_and_verifies():
    h = hash_password("ein-langes-passwort")
    assert h.startswith("$2")
    assert verify_password("ein-langes-passwort", h)
    assert not verify_password("falsch-falsch", h)


def test_password_policy():
    with pytest.raises(PasswordPolicyError):
        hash_password("kurz")


def test_only_two_accounts_allowed():
    with session_scope() as conn:
        with pytest.raises(ValueError):
            set_password(conn, "dritter", "irgendwas-langes")
    with pytest.raises(sqlite3.IntegrityError):
        with session_scope() as conn:
            conn.execute("INSERT INTO users (username, display_name, password_hash, created_at) VALUES ('x','x','x','x')")


def test_redirect_when_not_logged_in(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/login"


def test_wrong_password(client):
    r = client.post("/login", data={"username": "shaqy", "password": "falsch-falsch"})
    assert r.status_code == 401


def test_login_sets_httponly_cookie(client):
    r = login(client, "kimmi")
    cookie = r.headers["set-cookie"]
    assert "april_session=" in cookie and "HttpOnly" in cookie
    assert client.get("/").status_code == 200


def test_csrf_required(shaqy):
    r = shaqy.post("/profil/fach", data={"name": "mathe"})
    assert r.status_code == 403
    token = csrf(shaqy, "/profil")
    r = shaqy.post("/profil/fach", data={"name": "mathe", "csrf_token": token}, follow_redirects=False)
    assert r.status_code == 303


def test_logout(shaqy):
    token = csrf(shaqy)
    shaqy.post("/logout", data={"csrf_token": token})
    assert shaqy.get("/", follow_redirects=False).status_code == 303


def test_lockout_after_failures(client):
    for _ in range(5):
        client.post("/login", data={"username": "kimmi", "password": "falsch-falsch"})
    r = client.post("/login", data={"username": "kimmi", "password": "testpasswort-kimmi"})
    assert r.status_code == 429
    from app.auth import login_throttle

    login_throttle.reset("kimmi")
