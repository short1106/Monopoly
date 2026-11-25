"""FastAPI-App der April Lerngruppe."""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import sqlite3
from contextlib import asynccontextmanager, suppress
from datetime import date, timedelta
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import quote, unquote

from fastapi import BackgroundTasks, Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import april, config, planner, points
from app.auth import (
    SessionInfo,
    all_users,
    authenticate,
    create_session,
    delete_session,
    load_session,
    login_throttle,
)
from app.calendar_view import month_weeks, shift_month, week_days
from app.db import get_db, init_db
from app.persona import nerd_fact_des_tages, random_nerd_fact, spruch_des_tages
from app.timeutil import (
    GERMAN_WEEKDAYS_SHORT,
    format_date_de,
    format_month_de,
    iso_week_key,
    month_key,
    now,
    today,
)

log = logging.getLogger("april.web")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

APP_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(APP_DIR / "templates"))
templates.env.globals.update(
    format_date_de=format_date_de,
    format_month_de=format_month_de,
    weekdays_short=GERMAN_WEEKDAYS_SHORT,
)

FLASH_COOKIE = "april_flash"
WEEKLY_INTERVAL_SECONDS = 3600


async def _weekly_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(april.weekly_job)
        except Exception:
            log.exception("Wochenjob fehlgeschlagen")
        await asyncio.sleep(WEEKLY_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    task = asyncio.create_task(_weekly_loop()) if config.settings.auto_generate else None
    yield
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="April Lerngruppe", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=str(APP_DIR / "static")), name="static")

Db = Annotated[sqlite3.Connection, Depends(get_db)]


# ---------------------------------------------------------------------------
# Auth-Helfer
# ---------------------------------------------------------------------------

class NotAuthenticated(Exception):
    pass


def current_session(request: Request, conn: Db) -> SessionInfo:
    sess = load_session(conn, request.cookies.get(config.settings.cookie_name))
    if sess is None:
        raise NotAuthenticated()
    return sess


Sess = Annotated[SessionInfo, Depends(current_session)]


def check_csrf(sess: SessionInfo, token: str) -> None:
    if not token or not secrets.compare_digest(token, sess.csrf_token):
        raise HTTPException(status_code=403, detail="ungültiges formular, lad die seite neu und probier es nochmal.")


CsrfField = Annotated[str, Form(alias="csrf_token")]


@app.exception_handler(NotAuthenticated)
async def _not_authenticated(request: Request, _: NotAuthenticated) -> Response:
    if request.url.path.startswith("/api/"):
        return JSONResponse({"error": "nicht eingeloggt"}, status_code=401)
    return RedirectResponse("/login", status_code=303)


# ---------------------------------------------------------------------------
# Rendering und Flash-Nachrichten
# ---------------------------------------------------------------------------

def redirect(url: str, message: str | None = None, kind: str = "ok") -> RedirectResponse:
    resp = RedirectResponse(url, status_code=303)
    if message:
        resp.set_cookie(FLASH_COOKIE, quote(json.dumps({"m": message, "k": kind})), max_age=60, httponly=True, samesite="lax")
    return resp


def _pop_flash(request: Request) -> dict[str, str] | None:
    raw = request.cookies.get(FLASH_COOKIE)
    if not raw:
        return None
    try:
        data = json.loads(unquote(raw))
        return {"message": str(data["m"]), "kind": "error" if data.get("k") == "error" else "ok"}
    except (ValueError, KeyError, TypeError):
        return None


def render(request: Request, name: str, sess: SessionInfo | None = None, status_code: int = 200, **ctx: Any) -> HTMLResponse:
    d = today()
    flash = _pop_flash(request)
    context = {
        "user": sess.user if sess else None,
        "csrf_token": sess.csrf_token if sess else "",
        "flash": flash,
        "today": d,
        "footer_fact": nerd_fact_des_tages(d),
        "active": name.split(".")[0],
        **ctx,
    }
    resp = templates.TemplateResponse(request, name, context, status_code=status_code)
    if flash:
        resp.delete_cookie(FLASH_COOKIE)
    return resp


# ---------------------------------------------------------------------------
# Fehlerseiten
# ---------------------------------------------------------------------------

@app.exception_handler(StarletteHTTPException)
async def _http_error(request: Request, exc: StarletteHTTPException) -> Response:
    if request.url.path.startswith("/api/"):
        return JSONResponse({"error": exc.detail}, status_code=exc.status_code)
    messages = {
        404: "die seite gibt es nicht. so wie deine ausreden, wenn du nicht lernst.",
        403: str(exc.detail),
        405: "so geht das nicht. benutz die knöpfe in der app.",
    }
    msg = messages.get(exc.status_code, str(exc.detail))
    return templates.TemplateResponse(
        request, "error.html",
        {"user": None, "flash": None, "status": exc.status_code, "message": msg,
         "footer_fact": random_nerd_fact(), "active": "error"},
        status_code=exc.status_code,
    )


@app.exception_handler(Exception)
async def _server_error(request: Request, exc: Exception) -> Response:
    log.exception("Unerwarteter Fehler bei %s", request.url.path, exc_info=exc)
    if request.url.path.startswith("/api/"):
        return JSONResponse({"error": "interner fehler"}, status_code=500)
    return templates.TemplateResponse(
        request, "error.html",
        {"user": None, "flash": None, "status": 500,
         "message": "da ist intern was schiefgelaufen. kein grund, nicht zu lernen. probier es gleich nochmal.",
         "footer_fact": random_nerd_fact(), "active": "error"},
        status_code=500,
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, conn: Db) -> Response:
    if load_session(conn, request.cookies.get(config.settings.cookie_name)):
        return RedirectResponse("/", status_code=303)
    no_users = not all_users(conn)
    return render(request, "login.html", no_users=no_users)


@app.post("/login")
def login(
    request: Request,
    conn: Db,
    username: Annotated[str, Form()] = "",
    password: Annotated[str, Form()] = "",
) -> Response:
    key = username.strip().lower()[:50]
    if login_throttle.is_locked(key):
        return render(request, "login.html", status_code=429,
                      error="zu viele fehlversuche. zehn minuten pause, dann nochmal.")
    user = authenticate(conn, username, password)
    if user is None:
        login_throttle.fail(key)
        return render(request, "login.html", status_code=401, error="benutzername oder passwort falsch.")
    login_throttle.reset(key)
    token = create_session(conn, user)
    resp = redirect("/", f"hey {user.display_name.lower()}, schön, dass du da bist. jetzt wird gelernt.")
    resp.set_cookie(
        config.settings.cookie_name, token,
        max_age=config.settings.session_days * 86400,
        httponly=True, samesite="lax", secure=config.settings.cookie_secure,
    )
    return resp


@app.post("/logout")
def logout(request: Request, conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    delete_session(conn, request.cookies.get(config.settings.cookie_name))
    resp = redirect("/login", "ausgeloggt. morgen wieder, keine diskussion.")
    resp.delete_cookie(config.settings.cookie_name)
    return resp


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

def _open_exams(conn: sqlite3.Connection, user_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        """SELECT * FROM mock_exams WHERE user_id = ? AND status IN ('generating', 'open', 'grading', 'error')
           ORDER BY id DESC""",
        (user_id,),
    ).fetchall()


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, conn: Db, sess: Sess) -> Response:
    points.settle(conn)
    user = sess.user
    d = today()
    current = now()
    nm = points.next_meeting(current)
    nm_date = nm.date()
    checkin_open = (
        nm_date == d
        and nm - timedelta(minutes=config.settings.checkin_early_min) <= current <= points.meeting_end(nm_date)
    )
    attendance = points.attendance_for(conn, user.id, nm_date) if nm_date == d else None

    ranking = points.month_totals(conn, month_key(d))
    my_rank = next((r for r in ranking if r.user.id == user.id), None)
    week_has_exam = conn.execute(
        "SELECT 1 FROM mock_exams WHERE user_id = ? AND week_key = ? LIMIT 1", (user.id, iso_week_key(d))
    ).fetchone() is not None

    today_items = conn.execute(
        "SELECT * FROM plan_items WHERE user_id = ? AND item_date = ? ORDER BY kind, id", (user.id, d.isoformat())
    ).fetchall()
    exams_in, topics_in = planner.load_inputs(conn, user.id)
    warnings = planner.build_plan(exams_in, topics_in, d).warnings

    return render(
        request, "dashboard.html", sess,
        next_meeting=nm,
        minutes_until=int((nm - current).total_seconds() // 60),
        checkin_open=checkin_open,
        attendance=attendance,
        open_exams=_open_exams(conn, user.id),
        week_has_exam=week_has_exam,
        topic=april.current_topic(conn, user.id),
        ranking=ranking,
        my_rank=my_rank,
        total_points=points.all_time_total(conn, user.id),
        spruch=spruch_des_tages(d),
        today_items=today_items,
        plan_warnings=warnings,
        group_topic=points.current_group_topic(conn, d),
        api_ready=config.settings.api_key_present,
    )


@app.post("/treffen/einchecken")
def checkin(conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    try:
        status = points.check_in(conn, sess.user)
    except points.CheckinError as exc:
        return redirect("/", str(exc), "error")
    if status == "on_time":
        return redirect("/", f"pünktlich, slay. plus {config.settings.points_on_time} punkte.")
    return redirect("/", "eingecheckt, aber zu spät. keine punkte. nächstes mal früher losgehen.")


# ---------------------------------------------------------------------------
# Profil
# ---------------------------------------------------------------------------

def _subjects(conn: sqlite3.Connection, user_id: int) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM subjects WHERE user_id = ? ORDER BY name", (user_id,)).fetchall()


def _owned_subject(conn: sqlite3.Connection, user_id: int, subject_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM subjects WHERE id = ? AND user_id = ?", (subject_id, user_id)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="fach nicht gefunden")
    return row


@app.get("/profil", response_class=HTMLResponse)
def profile(request: Request, conn: Db, sess: Sess) -> Response:
    uid = sess.user.id
    exams = conn.execute(
        """SELECT e.*, s.name AS subject FROM exams e JOIN subjects s ON s.id = e.subject_id
           WHERE e.user_id = ? ORDER BY e.exam_date""",
        (uid,),
    ).fetchall()
    topics = conn.execute(
        """SELECT t.*, s.name AS subject FROM topics t JOIN subjects s ON s.id = t.subject_id
           WHERE t.user_id = ? ORDER BY t.done, s.name, t.is_weakness DESC, t.id""",
        (uid,),
    ).fetchall()
    return render(request, "profile.html", sess, subjects=_subjects(conn, uid), exams=exams, topics=topics)


def _replan(conn: sqlite3.Connection, user_id: int) -> None:
    planner.regenerate_plan(conn, user_id)


@app.post("/profil/fach")
def add_subject(conn: Db, sess: Sess, csrf: CsrfField = "", name: Annotated[str, Form()] = "") -> Response:
    check_csrf(sess, csrf)
    name = name.strip()[:60]
    if not name:
        return redirect("/profil", "ein fach ohne namen? nope.", "error")
    try:
        conn.execute("INSERT INTO subjects (user_id, name) VALUES (?, ?)", (sess.user.id, name))
    except sqlite3.IntegrityError:
        return redirect("/profil", f"{name} hast du schon.", "error")
    return redirect("/profil", f"{name} ist drin.")


@app.post("/profil/fach/{subject_id}/loeschen")
def delete_subject(subject_id: int, conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    _owned_subject(conn, sess.user.id, subject_id)
    conn.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    _replan(conn, sess.user.id)
    return redirect("/profil", "fach gelöscht, inklusive klausuren und themen.")


@app.post("/profil/klausur")
def add_exam(
    conn: Db, sess: Sess, csrf: CsrfField = "",
    subject_id: Annotated[int, Form()] = 0,
    exam_date: Annotated[str, Form()] = "",
    title: Annotated[str, Form()] = "",
    notes: Annotated[str, Form()] = "",
) -> Response:
    check_csrf(sess, csrf)
    _owned_subject(conn, sess.user.id, subject_id)
    try:
        d = date.fromisoformat(exam_date)
    except ValueError:
        return redirect("/profil", "das datum passt nicht. format: jjjj-mm-tt.", "error")
    conn.execute(
        "INSERT INTO exams (user_id, subject_id, exam_date, title, notes) VALUES (?, ?, ?, ?, ?)",
        (sess.user.id, subject_id, d.isoformat(), title.strip()[:120], notes.strip()[:500]),
    )
    _replan(conn, sess.user.id)
    if d <= today():
        return redirect("/profil", "klausur gespeichert, aber die liegt nicht in der zukunft. plan gibt es dafür keinen.")
    return redirect("/profil", "klausur eingetragen. ich hab dir rückwärts einen plan gebaut, check den kalender.")


@app.post("/profil/klausur/{exam_id}/loeschen")
def delete_exam(exam_id: int, conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    cur = conn.execute("DELETE FROM exams WHERE id = ? AND user_id = ?", (exam_id, sess.user.id))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="klausur nicht gefunden")
    _replan(conn, sess.user.id)
    return redirect("/profil", "klausur gelöscht, plan ist angepasst.")


@app.post("/profil/thema")
def add_topic(
    conn: Db, sess: Sess, csrf: CsrfField = "",
    subject_id: Annotated[int, Form()] = 0,
    name: Annotated[str, Form()] = "",
    is_weakness: Annotated[str, Form()] = "",
) -> Response:
    check_csrf(sess, csrf)
    _owned_subject(conn, sess.user.id, subject_id)
    name = name.strip()[:150]
    if not name:
        return redirect("/profil", "thema fehlt.", "error")
    conn.execute(
        "INSERT INTO topics (user_id, subject_id, name, is_weakness, created_at) VALUES (?, ?, ?, ?, ?)",
        (sess.user.id, subject_id, name, 1 if is_weakness else 0, now().isoformat()),
    )
    _replan(conn, sess.user.id)
    msg = "schwäche notiert. da gehen wir ran." if is_weakness else "thema ist auf der liste."
    return redirect("/profil", msg)


@app.post("/profil/thema/{topic_id}/erledigt")
def toggle_topic(topic_id: int, conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    cur = conn.execute(
        "UPDATE topics SET done = 1 - done WHERE id = ? AND user_id = ?", (topic_id, sess.user.id)
    )
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="thema nicht gefunden")
    _replan(conn, sess.user.id)
    return redirect("/profil", "aktualisiert.")


@app.post("/profil/thema/{topic_id}/loeschen")
def delete_topic(topic_id: int, conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    cur = conn.execute("DELETE FROM topics WHERE id = ? AND user_id = ?", (topic_id, sess.user.id))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="thema nicht gefunden")
    _replan(conn, sess.user.id)
    return redirect("/profil", "thema gelöscht.")


# ---------------------------------------------------------------------------
# Kalender
# ---------------------------------------------------------------------------

@app.get("/kalender", response_class=HTMLResponse)
def calendar_page(
    request: Request, conn: Db, sess: Sess,
    ansicht: str = "woche", datum: str = "", wer: str = "alle",
) -> Response:
    d = today()
    try:
        anchor = date.fromisoformat(datum) if datum else d
    except ValueError:
        anchor = d
    users = all_users(conn) if wer != "ich" else [sess.user]
    ctx: dict[str, Any] = {"ansicht": "monat" if ansicht == "monat" else "woche", "anchor": anchor, "wer": wer,
                           "users": all_users(conn)}
    if ctx["ansicht"] == "monat":
        ctx["weeks"] = month_weeks(conn, users, anchor, d)
        ctx["prev"] = shift_month(anchor, -1)
        ctx["next"] = shift_month(anchor, 1)
    else:
        ctx["days"] = week_days(conn, users, anchor, d)
        ctx["prev"] = anchor - timedelta(days=7)
        ctx["next"] = anchor + timedelta(days=7)
    return render(request, "calendar.html", sess, **ctx)


@app.post("/kalender/eintrag/{item_id}/erledigt")
def toggle_plan_item(item_id: int, conn: Db, sess: Sess, csrf: CsrfField = "",
                     zurueck: Annotated[str, Form()] = "/kalender") -> Response:
    check_csrf(sess, csrf)
    cur = conn.execute("UPDATE plan_items SET done = 1 - done WHERE id = ? AND user_id = ?", (item_id, sess.user.id))
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="eintrag nicht gefunden")
    target = zurueck if zurueck.startswith("/") and not zurueck.startswith("//") else "/kalender"
    return redirect(target)


# ---------------------------------------------------------------------------
# Probeklausuren
# ---------------------------------------------------------------------------

def _owned_mock(conn: sqlite3.Connection, exam_id: int, user_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM mock_exams WHERE id = ? AND user_id = ?", (exam_id, user_id)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="probeklausur nicht gefunden")
    return row


@app.get("/klausuren", response_class=HTMLResponse)
def exams_page(request: Request, conn: Db, sess: Sess) -> Response:
    rows = conn.execute(
        "SELECT * FROM mock_exams WHERE user_id = ? ORDER BY id DESC LIMIT 50", (sess.user.id,)
    ).fetchall()
    return render(
        request, "exams.html", sess,
        exams=rows,
        topic=april.current_topic(conn, sess.user.id),
        subjects=_subjects(conn, sess.user.id),
        pass_threshold=config.settings.pass_threshold,
        api_ready=config.settings.api_key_present,
    )


@app.post("/klausuren/neu")
def new_exam(
    background: BackgroundTasks, conn: Db, sess: Sess, csrf: CsrfField = "",
    subject: Annotated[str, Form()] = "",
    topic: Annotated[str, Form()] = "",
) -> Response:
    check_csrf(sess, csrf)
    if not config.settings.api_key_present:
        return redirect("/klausuren", "kein ANTHROPIC_API_KEY in der .env. ohne key keine klausur.", "error")
    busy = conn.execute(
        "SELECT 1 FROM mock_exams WHERE user_id = ? AND status IN ('generating', 'grading')", (sess.user.id,)
    ).fetchone()
    if busy:
        return redirect("/klausuren", "ich arbeite schon an einer klausur für dich. eins nach dem anderen.", "error")
    subject, topic = subject.strip(), topic.strip()
    if not (subject and topic):
        choice = april.current_topic(conn, sess.user.id)
        if choice is None:
            return redirect("/profil", "trag erst fächer und themen oder klausuren ein, dann weiß ich, was dran ist.", "error")
        subject, topic = choice.subject, choice.topic
    exam_id = april.create_exam_record(conn, sess.user.id, subject, topic)
    conn.commit()
    background.add_task(april.run_generation, exam_id)
    return redirect(f"/klausuren/{exam_id}", "ich schreib dir jetzt eine probeklausur. dauert kurz.")


@app.get("/klausuren/{exam_id}", response_class=HTMLResponse)
def exam_detail(exam_id: int, request: Request, conn: Db, sess: Sess) -> Response:
    row = _owned_mock(conn, exam_id, sess.user.id)
    content = json.loads(row["content_json"]) if row["content_json"] else None
    answers = json.loads(row["answers_json"]) if row["answers_json"] else {}
    result = json.loads(row["result_json"]) if row["result_json"] else None
    retry = None
    if row["status"] == "graded" and not row["passed"]:
        retry = conn.execute(
            "SELECT id, status FROM mock_exams WHERE user_id = ? AND subject = ? AND topic = ? AND round = ?",
            (sess.user.id, row["subject"], row["topic"], row["round"] + 1),
        ).fetchone()
    return render(
        request, "exam_detail.html", sess,
        exam=row, content=content, answers=answers, result=result, retry=retry,
        pass_threshold=config.settings.pass_threshold,
        points_passed=config.settings.points_exam_passed,
    )


def _collect_answers(form: Any, content: dict[str, Any]) -> dict[str, str]:
    return {str(t["number"]): str(form.get(f"answer_{t['number']}", "")) for t in content["tasks"]}


@app.post("/klausuren/{exam_id}/abgeben")
async def submit_exam(exam_id: int, request: Request, background: BackgroundTasks, conn: Db, sess: Sess) -> Response:
    form = await request.form()
    check_csrf(sess, str(form.get("csrf_token", "")))
    row = _owned_mock(conn, exam_id, sess.user.id)
    if not row["content_json"]:
        return redirect(f"/klausuren/{exam_id}", "die klausur ist noch nicht fertig.", "error")
    answers = _collect_answers(form, json.loads(row["content_json"]))
    if not any(a.strip() for a in answers.values()):
        return redirect(f"/klausuren/{exam_id}", "du hast nichts geschrieben. leere blätter bewerte ich nicht.", "error")
    try:
        april.submit_answers(conn, exam_id, sess.user.id, answers)
    except april.AprilError as exc:
        return redirect(f"/klausuren/{exam_id}", str(exc), "error")
    conn.commit()
    background.add_task(april.run_grading, exam_id)
    return redirect(f"/klausuren/{exam_id}", "abgegeben. ich korrigiere jetzt, und zwar pingelig.")


@app.post("/api/klausuren/{exam_id}/entwurf")
async def save_draft(exam_id: int, request: Request, conn: Db, sess: Sess) -> JSONResponse:
    form = await request.form()
    check_csrf(sess, str(form.get("csrf_token", "")))
    row = _owned_mock(conn, exam_id, sess.user.id)
    if not row["content_json"]:
        return JSONResponse({"saved": False})
    ok = april.save_draft(conn, exam_id, sess.user.id, _collect_answers(form, json.loads(row["content_json"])))
    return JSONResponse({"saved": ok})


@app.post("/klausuren/{exam_id}/nochmal")
def retry_exam(exam_id: int, background: BackgroundTasks, conn: Db, sess: Sess, csrf: CsrfField = "") -> Response:
    check_csrf(sess, csrf)
    _owned_mock(conn, exam_id, sess.user.id)
    if not april.retry_generation(conn, exam_id, sess.user.id):
        return redirect(f"/klausuren/{exam_id}", "da gibt es nichts neu zu versuchen.", "error")
    conn.commit()
    background.add_task(april.run_generation, exam_id)
    return redirect(f"/klausuren/{exam_id}", "okay, zweiter versuch. ich schreib die klausur neu.")


@app.get("/api/klausuren/{exam_id}/status")
def exam_status(exam_id: int, conn: Db, sess: Sess) -> JSONResponse:
    row = _owned_mock(conn, exam_id, sess.user.id)
    return JSONResponse({"status": row["status"], "error": row["error_message"]})


# ---------------------------------------------------------------------------
# Gruppe und Rangliste
# ---------------------------------------------------------------------------

@app.get("/gruppe", response_class=HTMLResponse)
def group_page(request: Request, conn: Db, sess: Sess) -> Response:
    points.settle(conn)
    d = today()
    members = []
    for u in all_users(conn):
        upcoming = conn.execute(
            """SELECT e.exam_date, e.title, s.name AS subject FROM exams e JOIN subjects s ON s.id = e.subject_id
               WHERE e.user_id = ? AND e.exam_date >= ? ORDER BY e.exam_date LIMIT 4""",
            (u.id, d.isoformat()),
        ).fetchall()
        last = conn.execute(
            """SELECT subject, topic, score_percent, passed FROM mock_exams
               WHERE user_id = ? AND status = 'graded' ORDER BY graded_at DESC LIMIT 3""",
            (u.id,),
        ).fetchall()
        members.append({"user": u, "upcoming": upcoming, "last": last,
                        "total": points.all_time_total(conn, u.id)})
    verdict = points.last_month_verdict(conn, d)
    return render(
        request, "group.html", sess,
        members=members,
        ranking=points.month_totals(conn, month_key(d)),
        verdict=verdict,
        group_topic=points.current_group_topic(conn, d),
        can_choose=verdict.winner is not None and verdict.winner.id == sess.user.id,
        ledger=points.recent_ledger(conn, sess.user.id),
        next_meeting=points.next_meeting(),
        settings=config.settings,
    )


@app.post("/gruppe/thema")
def choose_group_topic(conn: Db, sess: Sess, csrf: CsrfField = "", topic: Annotated[str, Form()] = "") -> Response:
    check_csrf(sess, csrf)
    try:
        points.set_group_topic(conn, sess.user, topic, today())
    except PermissionError as exc:
        return redirect("/gruppe", str(exc), "error")
    except ValueError as exc:
        return redirect("/gruppe", str(exc), "error")
    return redirect("/gruppe", "thema des monats steht. ich nehm dich beim wort.")

