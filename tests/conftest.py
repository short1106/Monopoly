import os
import re

import pytest

# Muss vor dem Import der App passieren.
os.environ["APRIL_AUTO_GENERATE"] = "false"
os.environ["ANTHROPIC_API_KEY"] = "test-dummy-key"
os.environ["APRIL_BCRYPT_ROUNDS"] = "4"

from app import config  # noqa: E402

TEST_PASSWORDS = {"shaqy": "testpasswort-shaqy", "kimmi": "testpasswort-kimmi"}


@pytest.fixture(autouse=True)
def fresh_db(tmp_path, monkeypatch):
    monkeypatch.setenv("APRIL_DB_PATH", str(tmp_path / "test.db"))
    config.reload_settings()
    from app.auth import set_password
    from app.db import init_db, session_scope

    init_db()
    with session_scope() as conn:
        for name, pw in TEST_PASSWORDS.items():
            set_password(conn, name, pw)
    yield
    config.reload_settings()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


def login(client, username):
    r = client.post("/login", data={"username": username, "password": TEST_PASSWORDS[username]}, follow_redirects=False)
    assert r.status_code == 303, r.text
    return r


def csrf(client, path="/"):
    html = client.get(path).text
    m = re.search(r'name="csrf_token" value="([^"]+)"', html)
    assert m, "kein csrf token gefunden"
    return m.group(1)


@pytest.fixture
def shaqy(client):
    login(client, "shaqy")
    return client
