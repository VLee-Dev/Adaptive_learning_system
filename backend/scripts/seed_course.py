#!/usr/bin/env python3
"""
Seed a complete "Tiếng Anh Cơ Bản" course via the FastAPI admin endpoints.

Usage:
    python scripts/seed_course.py

What it does:
- Logs in as admin (admin@adaptive.com / Admin@123)
- Creates 1 course: "Tiếng Anh Cơ Bản (A1-A2)"
- Creates 4 chapters; each chapter has 4 topics; each topic gets 10 practice
  questions (4 L1 + 3 L2 + 3 L3) and a default practice config
- Creates a 10-question final test for each chapter (one pool, one slot)
- Skips resources whose name already exists (idempotent re-runs)
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "http://localhost:8000"
DATA_FILE = Path(__file__).with_name("english_basic_course.json")
ADMIN_EMAIL = "admin@adaptive.com"
ADMIN_PASSWORD = "Admin@123"


# ---- HTTP helpers -------------------------------------------------------
def _request(method: str, path: str, body: dict | None = None, token: str | None = None):
    url = f"{API}{path}"
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token is not None:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers, data=data, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        return exc.code, body_text


def login(email: str, password: str) -> str:
    status, body = _request("POST", "/auth/login", {"email": email, "password": password})
    if status != 200:
        raise RuntimeError(f"Login failed ({status}): {body}")
    return body["access_token"]


def get(path: str, token: str):
    status, body = _request("GET", path, token=token)
    if status != 200:
        raise RuntimeError(f"GET {path} failed: {status} {body}")
    return body


def post(path: str, payload: dict, token: str):
    status, body = _request("POST", path, payload, token=token)
    if status not in (200, 201):
        raise RuntimeError(f"POST {path} failed: {status} {body}")
    return body


def find_by_name(items: list[dict], name: str) -> dict | None:
    for item in items:
        if item.get("name") == name or item.get("title") == name:
            return item
    return None


# ---- Main --------------------------------------------------------------
def main():
    if not DATA_FILE.exists():
        print(f"ERROR: data file not found: {DATA_FILE}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    print("[login] signing in as admin ...")
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    print("       ok.\n")

    # ---- Course ----
    print(f"[course] {data['course']['name']}")
    courses = get("/admin/courses", token)
    course = find_by_name(courses, data["course"]["name"])
    if course:
        print(f"         exists (id={course['id']}) - skip")
    else:
        course = post("/admin/courses", {
            "name": data["course"]["name"],
            "description": data["course"]["description"],
            "is_published": bool(data["course"].get("is_published", False)),
        }, token)
        print(f"         created (id={course['id']})")

    total_practice = 0
    total_final = 0

    # ---- Chapters / topics / questions ----
    for c_idx, ch_def in enumerate(data["chapters"], start=1):
        print(f"\n[chapter {c_idx}/4] {ch_def['title']}")
        chapters = get(f"/admin/courses/{course['id']}/chapters", token)
        chapter = find_by_name(chapters, ch_def["title"])
        if chapter:
            print(f"             exists (id={chapter['id']}) - skip")
        else:
            chapter = post(f"/admin/courses/{course['id']}/chapters", {
                "title": ch_def["title"],
                "description": ch_def["description"],
                "order_index": c_idx,
            }, token)
            print(f"             created (id={chapter['id']})")

        topic_ids: list[int] = []
        for t_idx, topic_def in enumerate(ch_def["topics"], start=1):
            print(f"  [topic {t_idx}/4] {topic_def['name']}")
            topics = get(f"/admin/chapters/{chapter['id']}/topics", token)
            topic = find_by_name(topics, topic_def["name"])
            if topic:
                print(f"                exists (id={topic['id']}) - skip create")
            else:
                topic = post(f"/admin/chapters/{chapter['id']}/topics", {
                    "name": topic_def["name"],
                    "description": topic_def["description"],
                    "type": topic_def["type"],
                    "order_index": t_idx,
                    "p_init": 0.3,
                    "p_transit": 0.2,
                    "p_slip": 0.1,
                    "p_guess": 0.25,
                }, token)
                print(f"                created (id={topic['id']})")
            topic_ids.append(topic["id"])

            # Practice questions
            existing_qs = get(f"/admin/topics/{topic['id']}/questions", token)
            existing_texts = {q["question_text"] for q in existing_qs}
            added = 0
            for q_idx, q in enumerate(topic_def["questions"]):
                # q format: [text, correct_answer, distractor1, distractor2, distractor3]
                text = q[0]
                correct = q[1]
                options = [q[1], q[2], q[3], q[4]]
                if text in existing_texts:
                    continue
                level = 1 if q_idx < 4 else 2 if q_idx < 7 else 3
                post(f"/admin/topics/{topic['id']}/questions", {
                    "purpose": "practice",
                    "question_format": "standard",
                    "question_text": text,
                    "options": options,
                    "correct_answer": correct,
                    "explanation": f"Correct answer: {correct}",
                    "level": level,
                }, token)
                added += 1
            print(f"                added {added} practice question(s)")
            total_practice += added

            # Practice config
            try:
                get(f"/admin/practice-config/{topic['id']}", token)
                print(f"                practice config exists - skip")
            except RuntimeError:
                post(f"/admin/practice-config/{topic['id']}", {
                    "questions_per_session": 5,
                    "starting_level": 1,
                    "level_1_questions": 2,
                    "level_2_questions": 2,
                    "level_3_questions": 1,
                    "level_up_mastery": 0.65,
                    "completion_mastery": 0.85,
                    "review_mastery": 0.4,
                }, token)
                print(f"                created practice config")

        # ---- Final test for the chapter ----
        print(f"  [final-test] chapter id={chapter['id']}")
        try:
            final = get(f"/admin/chapters/{chapter['id']}/final-test", token)
            print(f"                exists (id={final['id']}) - skip")
        except RuntimeError:
            final = post(f"/admin/chapters/{chapter['id']}/final-test", {
                "total_questions": 10,
                "pass_percent": 70,
                "max_attempts": 3,
            }, token)
            print(f"                created (id={final['id']})")

            pool = post(f"/admin/final-tests/{final['id']}/pools", {
                "name": f"Pool chapter {chapter['id']}",
                "description": "Final-test question pool",
            }, token)

            # Create N slots (one per question) all pointing at the same pool.
            # generate_test_questions() picks 1 question per slot from the pool.
            for slot_index in range(1, 11):  # 10 slots
                slot = post(f"/admin/final-tests/{final['id']}/slots", {
                    "slot_index": slot_index,
                    "is_required": True,
                }, token)
                post(f"/admin/test-slots/{slot['id']}/pools/{pool['id']}", {}, token)

            primary_topic_id = topic_ids[0]
            added_final = 0
            for q in ch_def["final_test"]:
                # q format: [text, correct_answer, distractor1, distractor2, distractor3]
                text = q[0]
                correct = q[1]
                options = [q[1], q[2], q[3], q[4]]
                new_q = post(f"/admin/topics/{primary_topic_id}/questions", {
                    "purpose": "chapter_final",
                    "question_format": "standard",
                    "question_text": text,
                    "options": options,
                    "correct_answer": correct,
                    "explanation": f"Correct answer: {correct}",
                }, token)
                post(f"/admin/test-pools/{pool['id']}/questions/{new_q['id']}", {}, token)
                added_final += 1
            print(f"                added {added_final} final-test question(s) to pool id={pool['id']}")
            total_final += added_final

    print("\n=== DONE ===")
    print(f"  Course id         : {course['id']}  {course['name']}")
    print(f"  Practice questions: {total_practice}")
    print(f"  Final questions   : {total_final}")


if __name__ == "__main__":
    main()