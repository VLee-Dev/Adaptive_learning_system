"""drop dead mastery + question_stats columns

Revision ID: e5a1b2c3d4f6
Revises: c4f1a9d3e8b2
Create Date: 2026-10-23 21:55:00.000000

Bối cảnh (2026-10-23, luật luyện tập tối giản)
-----------------------------------------------
Sau khi rút gọn luật BKT + luật luyện tập, các cột sau không còn được đọc ở
bất kỳ đâu trong code:

topic_mastery
    - recent_accuracy      : chỉ phục vụ luật "completed" cũ (MIN_RECENT_ACCURACY)
                            và đường phục hồi (CLEAR_MIN_ACCURACY) — cả hai đã
                            bị luật mới thay thế.
    - review_triggered_at  : mốc "lần đầu vào review_required" — không còn
                            trạng thái review.
    - lesson_viewed_at     : mốc "đã xem bài giảng" — cảnh báo giờ chỉ là
                            *thông báo* kèm link, không cần theo dõi thời điểm
                            xem.
    - review_resolved_at   : mốc "thoát review" — không còn vòng lặp ôn.

question_stats
    - recent_wrong_streak  : không dùng để chọn câu (chỉ `weakness` được dùng).
    - last_correct_at      : không dùng.

Giữ lại (còn dùng thật)
-----------------------
    - correct_count, wrong_count : luật pass "20 câu / ≥10 đúng" cần đếm số câu
                            đúng = practice_attempts - wrong_count.
    - consecutive_correct / consecutive_wrong : điều kiện 5 câu đúng liên tiếp
                            (pass) và 3/5 câu sai liên tiếp (cảnh báo).

Backfill level
--------------
`current_level` trước đây tăng/giảm theo kiểu *bước nhảy* (+1/-1 mỗi lượt vượt
ngưỡng) nên không khớp với mastery hiện tại. Luật mới là *hàm thuần* của
mastery: ≥0.70 → 3 · <0.35 → 1 · còn lại → 2. Backfill lại cho khớp.

status
------
`review_required` không còn là trạng thái hợp lệ → chuyển về `in_progress`.
Các bản ghi đã `completed` thì giữ nguyên (đã đạt yêu cầu).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e5a1b2c3d4f6'
down_revision: Union[str, Sequence[str], None] = 'c4f1a9d3e8b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # --- Dọn dữ liệu cũ trước khi drop ---
    # `review_required` không còn là trạng thái hợp lệ.
    bind.execute(
        sa.text("UPDATE topic_mastery SET status = 'in_progress' WHERE status = 'review_required'")
    )

    # Backfill `current_level` theo luật hàm thuần của mastery.
    #
    # Ngoại lệ: topic CHƯA luyện câu nào (practice_attempts = 0) → level 2,
    # vì yêu cầu là "vào luôn là level 2". Không ngoại lệ thì mastery khởi đầu
    # p_init = 0.30 (< 0.35) sẽ đẩy người học xuống level 1 ngay từ đầu.
    bind.execute(
        sa.text(
            """
            UPDATE topic_mastery
            SET current_level = CASE
                WHEN practice_attempts = 0 THEN 2
                WHEN mastery >= 0.70 THEN 3
                WHEN mastery <  0.35 THEN 1
                ELSE 2
            END
            """
        )
    )

    # --- Drop cột không còn đọc ---
    op.drop_column('topic_mastery', 'recent_accuracy')
    op.drop_column('topic_mastery', 'review_triggered_at')
    op.drop_column('topic_mastery', 'lesson_viewed_at')
    op.drop_column('topic_mastery', 'review_resolved_at')

    op.drop_column('question_stats', 'recent_wrong_streak')
    op.drop_column('question_stats', 'last_correct_at')


def downgrade() -> None:
    op.add_column(
        'topic_mastery',
        sa.Column('recent_accuracy', sa.Float(), nullable=False, server_default='0'),
    )
    op.add_column(
        'topic_mastery',
        sa.Column('review_triggered_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'topic_mastery',
        sa.Column('lesson_viewed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'topic_mastery',
        sa.Column('review_resolved_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        'question_stats',
        sa.Column('recent_wrong_streak', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'question_stats',
        sa.Column('last_correct_at', sa.DateTime(timezone=True), nullable=True),
    )
