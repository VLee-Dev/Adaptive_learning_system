"""add weakness + practice session boundary

Revision ID: c4f1a9d3e8b2
Revises: b9e3a1c7d204
Create Date: 2026-10-23 20:45:00.000000

Bối cảnh (audit 2026-10-23, lần 2)
-----------------------------------
Migration `b9e3a1c7d204` thêm bằng chứng cho BKT nhưng để lại ba lỗi khiến
người học kẹt trong `review_required`:

1. `question_stats.wrong_rate` là tỉ lệ sai LŨY KẾA, không bao giờ giảm. Câu
   user sai 3/5 lần giữ wrong_rate = 0.6 vĩnh viễn, kể cả khi đã ôn lại và
   làm đúng. Máy chọn câu bám theo wrong_rate nên cứ trả lại đúng câu đó →
   vòng lặp ôn không thoát được. (DB thực tế: 5/18 topic của uid=12 rơi vào
   `review_required` với mastery vẫn >= 0.58 và `consecutive_correct` kẹt ở
   1-2, không bao giờ chạm ngưỡng 3 để thoát.)

2. `review_required` là trạng thái một chiều. Điều kiện thoát duy nhất là 3 câu
   đúng liên tiếp, nhưng `consecutive_correct` bị xoá mỗi lần trả lời sai, còn
   máy chọn câu lại luôn bám vào chính những câu hay sai → hòa vòng lặp.

3. `recent_accuracy` được tính bằng cách DỰNG LẠI chuỗi 5 lượt từ counters
   (`_recent_results_from_mastery`), sai thứ tự thực tế, trong khi chính con số
   đó lại quyết định trạng thái `completed`.

Thay đổi
--------
question_stats — thêm cột:
- weakness             : điểm yếu hiện hành (0..1), tăng khi sai / suy giảm khi
                         đúng. DÙNG ĐỂ CHỌN CÂU, thay wrong_rate lũy kếa.
- recent_wrong_streak  : số câu sai liên tiếp kể từ lần đúng gần nhất.
- last_correct_at      : lần đúng gần nhất.

Backfill
--------
`weakness` được suy ra từ `wrong_rate` hiện có (đây là xấp xỉ hợp lý ở thời
điểm backfill: điểm yếu hiện hành xấp xỉ bằng tỉ lệ sai đã tích lũy). Từ đây
trở đi nó được duy trì bằng `upsert_question_stat` nên tự suy giảm theo thời
gian. `recent_wrong_streak` dựng lại từ chuỗi attempt cuối cùng.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c4f1a9d3e8b2'
down_revision: Union[str, Sequence[str], None] = 'b9e3a1c7d204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RECENT_WINDOW = 5


def upgrade() -> None:
    bind = op.get_bind()

    # --- Thêm cột mới ---
    op.add_column(
        'question_stats',
        sa.Column('weakness', sa.Float(), nullable=False, server_default='0'),
    )
    op.add_column(
        'question_stats',
        sa.Column(
            'recent_wrong_streak', sa.Integer(), nullable=False, server_default='0'
        ),
    )
    op.add_column(
        'question_stats',
        sa.Column('last_correct_at', sa.DateTime(timezone=True), nullable=True),
    )

    # --- Backfill weakness từ wrong_rate hiện có ---
    # Suy ra điểm yếu hiện hành từ tỉ lệ sai đã tích luỹ. Sau migration này
    # `upsert_question_stat` tự duy trì, nên đây chỉ là điểm khởi đầu hợp lý.
    bind.execute(sa.text("""
        UPDATE question_stats
        SET weakness = CASE WHEN attempts > 0 THEN wrong::float / attempts ELSE 0 END
    """))

    # --- Backfill recent_wrong_streak + last_correct_at từ attempts ---
    # Với mỗi (user_id, question_id), đếm số attempt sai liên tiếp tính từ
    # lần đúng gần nhất.
    bind.execute(sa.text("""
        WITH ordered AS (
            SELECT
                a.user_id,
                a.question_id,
                a.is_correct,
                a.created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY a.user_id, a.question_id
                    ORDER BY a.created_at DESC, a.id DESC
                ) AS rn
            FROM attempts a
        ),
        streak AS (
            SELECT
                user_id,
                question_id,
                MAX(rn) FILTER (WHERE is_correct) AS last_correct_rn,
                MAX(rn) AS total_rn,
                MAX(created_at) FILTER (WHERE is_correct) AS last_correct_at
            FROM ordered
            GROUP BY user_id, question_id
        )
        UPDATE question_stats qs
        SET recent_wrong_streak = GREATEST(
                COALESCE(s.total_rn, 0) - COALESCE(s.last_correct_rn, 0), 0
            ),
            last_correct_at = s.last_correct_at
        FROM streak s
        WHERE qs.user_id = s.user_id AND qs.question_id = s.question_id
    """))


def downgrade() -> None:
    op.drop_column('question_stats', 'last_correct_at')
    op.drop_column('question_stats', 'recent_wrong_streak')
    op.drop_column('question_stats', 'weakness')