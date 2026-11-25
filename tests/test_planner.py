from datetime import date, timedelta

from app.planner import ExamInput, build_plan

TODAY = date(2026, 11, 25)


def test_backward_plan_far_exam():
    exam = ExamInput(id=1, subject_id=1, subject="mathe", exam_date=TODAY + timedelta(days=21))
    plan = build_plan([exam], {1: ["integrale", "kurvendiskussion"]}, TODAY)
    by_kind = {}
    for it in plan.items:
        by_kind.setdefault(it.kind, []).append(it.item_date)

    assert exam.exam_date - timedelta(days=3) in by_kind["schreibtag"]
    assert exam.exam_date - timedelta(days=1) in by_kind["wiederholung"]
    assert len(by_kind["lernblock"]) == 4  # 2 themen + 2
    assert all(TODAY <= it.item_date < exam.exam_date for it in plan.items)
    assert not plan.warnings
    # Schwächen/erste Themen kommen im frühesten Lernblock
    first_block = min((it for it in plan.items if it.kind == "lernblock"), key=lambda i: i.item_date)
    assert "integrale" in first_block.title


def test_tight_exam_is_compressed_and_warns():
    exam = ExamInput(id=1, subject_id=1, subject="bio", exam_date=TODAY + timedelta(days=2))
    plan = build_plan([exam], {}, TODAY)
    assert plan.warnings
    assert all(it.item_date in (TODAY, TODAY + timedelta(days=1)) for it in plan.items)
    assert len(plan.items) <= 4  # max 2 pro tag
    kinds = {it.kind for it in plan.items}
    assert "wiederholung" in kinds and "schreibtag" in kinds


def test_max_per_day_and_exam_days_blocked():
    exams = [
        ExamInput(id=1, subject_id=1, subject="mathe", exam_date=TODAY + timedelta(days=10)),
        ExamInput(id=2, subject_id=2, subject="deutsch", exam_date=TODAY + timedelta(days=11)),
        ExamInput(id=3, subject_id=3, subject="englisch", exam_date=TODAY + timedelta(days=12)),
    ]
    plan = build_plan(exams, {}, TODAY)
    counts = {}
    for it in plan.items:
        counts[it.item_date] = counts.get(it.item_date, 0) + 1
    assert max(counts.values()) <= 2
    exam_days = {e.exam_date for e in exams}
    assert not any(it.item_date in exam_days for it in plan.items)


def test_past_exams_ignored():
    exam = ExamInput(id=1, subject_id=1, subject="mathe", exam_date=TODAY - timedelta(days=1))
    assert build_plan([exam], {}, TODAY).items == []
