"""add BKT evidence counters + question_stats table

Revision ID: b9e3a1c7d204
Revises: a7b8c9d0e1f2
Create Date: 2026-10-23 15:00:00.000000

Bối cảnh (audit 2026-10-23)
---------------------------
BKT trước đây cộng `p_transit` vô điều kiện nên mastery tăng bất kể đúng/sai,
và `status` chỉ phụ thuộc mastery nên 2 câu đúng là đủ để 'completed'.
Migration này bổ sung phần "bằng chứng quan sát được" để trạng thái có căn cứ:

topic_mastery — thêm cột:
- correct_count, wrong_count          : tổng đúng/sai
- consecutive_correct, consecutive_wrong : chuỗi hiện tại
- recent_accuracy                     : accuracy cửa sổ 5 lượt gần nhất
- review_triggered_at                 : lúc lần đầu vào review_required
- lesson_viewed_at                    : lần cuối xem bài giảng của topic
- review_resolved_at                  : lúc thoát review_required

question_stats (bảng mới) — thống kê sai theo từng câu, phục vụ chọn câu
weak-first: (user_id, question_id) unique, attempts, wrong, last_wrong_at.

Backfill
--------
Chạy bằng Python (không SQL thuần) vì cần replay lại chuỗi BKT theo đúng thứ
tự `created_at, id` cho từng (user_id, topic_id), rồi áp luật level/status mới.
Điều này cố ý sửa lại các giá trị mastery sai của dữ liệu cũ (ví dụ
uid=11 topic=23: 2 câu đúng → mastery 0.9095 → 'completed').
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b9e3a1c7d204'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ===== Tham số giữ nguyên với service (import trực tiếp để tránh lệch) =====
RECENT_WINDOW = 5
MIN_ATTEMPTS_FOR_COMPLETION = 8
MIN_RECENT_ACCURACY = 0.6
LEVEL_UP_MASTERY = 0.85
COMPLETION_MASTERY = 0.85
REVIEW_MASTERY = 0.35
STARTING_LEVEL = 1
CONSECUTIVE_WRONG_FOR_REVIEW = 3
CONSECUTIVE_CORRECT_TO_CLEAR = 3
MIN_ATTEMPTS_FOR_REVIEW = 4


def _bkt_update(p_mastery, is_correct, p_transit, p_slip, p_guess):
    """Bản sao của calculate_bkt_update MỚI (chỉ cộng transit khi đúng)."""
    if is_correct:
        p_g_l = 1 - p_slip
        p_g_nl = p_guess
        p_c = p_g_l * p_mastery + p_g_nl * (1 - p_mastery)
        p_after = (p_g_l * p_mastery) / p_c if p_c > 0 else p_mastery
    else:
        p_i_l = p_slip
        p_i_nl = 1 - p_guess
        p_i = p_i_l * p_mastery + p_i_nl * (1 - p_mastery)
        p_after = (p_i_l * p_mastery) / p_i if p_i > 0 else p_mastery

    if is_correct:
        p_new = p_after + (1 - p_after) * p_transit
    else:
        p_new = p_after

    return max(0.0, min(1.0, p_new))


def _has_completion_evidence(mastery, attempts, recent_acc):
    return (
        mastery >= COMPLETION_MASTERY
        and attempts >= MIN_ATTEMPTS_FOR_COMPLETION
        and recent_acc >= MIN_RECENT_ACCURACY
    )


def upgrade() -> None:
    # ---------- 1. topic_mastery: thêm cột evidence ----------
    op.add_column('topic_mastery', sa.Column('correct_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('topic_mastery', sa.Column('wrong_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('topic_mastery', sa.Column('consecutive_correct', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('topic_mastery', sa.Column('consecutive_wrong', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('topic_mastery', sa.Column('recent_accuracy', sa.Float(), nullable=False, server_default='0'))
    op.add_column('topic_mastery', sa.Column('review_triggered_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('topic_mastery', sa.Column('lesson_viewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('topic_mastery', sa.Column('review_resolved_at', sa.DateTime(timezone=True), nullable=True))

    # ---------- 2. Bảng question_stats ----------
    op.create_table(
        'question_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('wrong', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_wrong_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'question_id', name='uq_question_stats_user_question'),
    )
    op.create_index(
        'ix_question_stats_user_question', 'question_stats', ['user_id', 'question_id'],
    )
    op.create_index(
        'ix_question_stats_user_wrong', 'question_stats', ['user_id', 'wrong'],
    )

    # ---------- 3. Backfill (Python) ----------
    _backfill_all()


def _backfill_all() -> None:
    bind = op.get_bind()

    # 3a. question_stats — gom từ attempts
    bind.execute(sa.text("""
        INSERT INTO question_stats (user_id, question_id, attempts, wrong, last_wrong_at)
        SELECT
            a.user_id,
            a.question_id,
            COUNT(*)::int AS attempts,
            SUM(CASE WHEN a.is_correct THEN 0 ELSE 1 END)::int AS wrong,
            MAX(a.created_at) FILTER (WHERE NOT a.is_correct) AS last_wrong_at
        FROM attempts a
        GROUP BY a.user_id, a.question_id
        ON CONFLICT (user_id, question_id) DO UPDATE
        SET attempts = EXCLUDED.attempts,
            wrong = EXCLUDED.wrong,
            last_wrong_at = EXCLUDED.last_wrong_at
    """))
    print("[backfill] question_stats: done")

    # 3b. BKT params mặc định của từng topic
    topic_params = {
        row[0]: (row[1], row[2], row[3], row[4])
        for row in bind.execute(sa.text(
            "SELECT id, p_init, p_transit, p_slip, p_guess FROM topics"
        ))
    }

    # 3c. topic -> có lesson hay không (quyết định lesson_ok)
    topics_with_lessons = {
        row[0] for row in bind.execute(sa.text(
            "SELECT DISTINCT topic_id FROM lessons"
        ))
    }

    # 3d. Mastery hiện có (giữ mastery khởi tạo cho topic chưa có attempt)
    existing_mastery = {
        (row[0], row[1]): row[2]
        for row in bind.execute(sa.text(
            "SELECT user_id, topic_id, mastery FROM topic_mastery"
        ))
    }

    # 3e. Replay chuỗi attempt cho từng (user_id, topic_id)
    rows = bind.execute(sa.text("""
        SELECT a.user_id, a.topic_id, a.is_correct,
               COALESCE(t.p_init, 0.3), COALESCE(t.p_transit, 0.2),
               COALESCE(t.p_slip, 0.1), COALESCE(t.p_guess, 0.25)
        FROM attempts a
        LEFT JOIN topics t ON t.id = a.topic_id
        ORDER BY a.user_id, a.topic_id, a.created_at, a.id
    """))

    grouped: dict = {}
    for uid, tid, is_correct, p_init, p_transit, p_slip, p_guess in rows:
        grouped.setdefault((uid, tid), {
            "p_init": p_init, "p_transit": p_transit,
            "p_slip": p_slip, "p_guess": p_guess, "results": [],
        })
        grouped[(uid, tid)]["results"].append(bool(is_correct))

    updated = 0
    for (uid, tid), data in grouped.items():
        results = data["results"]

        mastery = data["p_init"]
        correct = wrong = cc = cw = 0
        level = STARTING_LEVEL
        status = "in_progress"
        processed: list[bool] = []
        lesson_ok = tid not in topics_with_lessons  # topic không có lesson → True

        for is_correct in results:
            mastery = _bkt_update(
                mastery, is_correct,
                data["p_transit"], data["p_slip"], data["p_guess"],
            )
            processed.append(is_correct)

            if is_correct:
                correct += 1
                cc += 1
                cw = 0
            else:
                wrong += 1
                cw += 1
                cc = 0

            recent = processed[-RECENT_WINDOW:]
            recent_acc = sum(1 for r in recent if r) / len(recent)

            if mastery >= LEVEL_UP_MASTERY and level < 3:
                level = min(3, level + 1)
            elif mastery < REVIEW_MASTERY and level > 1:
                level = max(1, level - 1)

            was_review = status == "review_required"

            if was_review:
                cleared = cc >= CONSECUTIVE_CORRECT_TO_CLEAR and lesson_ok
                if cleared:
                    status = "completed" if _has_completion_evidence(mastery, len(processed), recent_acc) else "in_progress"
                else:
                    status = "review_required"
            elif len(processed) >= MIN_ATTEMPTS_FOR_REVIEW and (
                cw >= CONSECUTIVE_WRONG_FOR_REVIEW or mastery < REVIEW_MASTERY
            ):
                status = "review_required"
            elif _has_completion_evidence(mastery, len(processed), recent_acc):
                status = "completed"
            else:
                status = "in_progress"

        attempts = len(results)
        bind.execute(
            sa.text("""
                UPDATE topic_mastery
                SET mastery = :m,
                    current_level = :lv,
                    practice_attempts = :att,
                    status = :st,
                    correct_count = :cc,
                    wrong_count = :wc,
                    consecutive_correct = :scc,
                    consecutive_wrong = :scw,
                    recent_accuracy = :ra,
                    updated_at = NOW()
                WHERE user_id = :uid AND topic_id = :tid
            """),
            {
                "m": mastery, "lv": level, "att": attempts, "st": status,
                "cc": correct, "wc": wrong, "scc": cc, "scw": cw, "ra": recent_acc,
                "uid": uid, "tid": tid,
            },
        )
        updated += 1

    print(f"[backfill] topic_mastery: recomputed {updated} rows")

    # 3f. Mastery rows có nhưng chưa có attempt nào → reset về p_init sạch
    for (uid, tid), old_mastery in existing_mastery.items():
        if (uid, tid) not in grouped:
            bind.execute(
                sa.text("""
                    UPDATE topic_mastery
                    SET mastery = :m, current_level = :lv, practice_attempts = 0,
                        status = 'in_progress', correct_count = 0, wrong_count = 0,
                        consecutive_correct = 0, consecutive_wrong = 0,
                        recent_accuracy = 0.0, updated_at = NOW()
                    WHERE user_id = :uid AND topic_id = :tid
                """),
                {
                    "m": topic_params.get(tid, (0.3,))[0],
                    "lv": STARTING_LEVEL, "uid": uid, "tid": tid,
                },
            )
    print("[backfill] orphan mastery rows reset")


def downgrade() -> None:
    op.drop_index('ix_question_stats_user_wrong', table_name='question_stats')
    op.drop_index('ix_question_stats_user_question', table_name='question_stats')
    op.drop_table('question_stats')

    op.drop_column('topic_mastery', 'review_resolved_at')
    op.drop_column('topic_mastery', 'lesson_viewed_at')
    op.drop_column('topic_mastery', 'review_triggered_at')
    op.drop_column('topic_mastery', 'recent_accuracy')
    op.drop_column('topic_mastery', 'consecutive_wrong')
    op.drop_column('topic_mastery', 'consecutive_correct')
    op.drop_column('topic_mastery', 'wrong_count')
    op.drop_column('topic_mastery', 'correct_count')