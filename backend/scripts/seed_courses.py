"""Tạo thêm vài course mẫu (kèm chapters + topics) để test gợi ý và flow.

Chạy: python -m scripts.seed_courses
"""
import sys
import io

# Force UTF-8 cho stdout trên Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

from sqlalchemy import select
from sqlalchemy.orm import Session

# Load TẤT CẢ model qua model_registry
from app import model_registry  # noqa: F401

from core.database import SessionLocal
from app.courses.model import Course
from app.chapters.model import Chapter
from app.topics.model import Topic
from datetime import datetime, timezone


# (course_name, [(chapter_title, [topic_title, ...]), ...])
SAMPLE_DATA: list[tuple[str, str, list[tuple[str, list[str]]]]] = [
    (
        "Toán THPT (Lớp 12)",
        "Ôn thi THPT Quốc gia: Giải tích, Hình học, Xác suất. 12 chương với hơn 1000 bài tập.",
        [
            ("Giải tích 12 - Chương 1: Ứng dụng đạo hàm", [
                "Tính đơn điệu của hàm số",
                "Cực trị hàm số",
                "Giá trị lớn nhất, nhỏ nhất",
                "Đường tiệm cận",
            ]),
            ("Hình học 12 - Chương 1: Khối đa diện", [
                "Khái niệm khối đa diện",
                "Thể tích khối chóp",
                "Thể tích khối lăng trụ",
            ]),
        ],
    ),
    (
        "Lập trình Python Cơ bản",
        "Từ cú pháp đến hàm, OOP, làm việc với file và thư viện chuẩn.",
        [
            ("Chương 1: Làm quen với Python", [
                "Cài đặt môi trường",
                "Biến và kiểu dữ liệu",
                "Toán tử và biểu thức",
            ]),
            ("Chương 2: Cấu trúc điều khiển", [
                "Câu lệnh if/else",
                "Vòng lặp for",
                "Vòng lặp while",
            ]),
        ],
    ),
    (
        "Vật Lý Đại Cương",
        "Cơ học, Nhiệt học, Điện từ, Quang học. Giải thích trực quan qua mô phỏng.",
        [
            ("Chương 1: Cơ học chất điểm", [
                "Động học thẳng đều",
                "Động học thẳng biến đổi đều",
                "Các định luật Newton",
            ]),
        ],
    ),
    (
        "Tiếng Anh Giao Tiếp (B1-B2)",
        "Luyện nói, nghe, phản xạ với các tình huống thực tế: công việc, du lịch, học thuật.",
        [
            ("Chương 1: Giao tiếp công việc", [
                "Phỏng vấn xin việc",
                "Thuyết trình nhóm",
                "Email công việc chuyên nghiệp",
            ]),
        ],
    ),
    (
        "Lịch Sử Việt Nam Hiện Đại",
        "Từ 1945 đến nay: Cách mạng tháng Tám, kháng chiến chống Pháp, Mỹ, Đổi mới và hội nhập quốc tế.",
        [
            ("Chương 1: Cách mạng tháng Tám 1945", [
                "Bối cảnh lịch sử",
                "Các sự kiện chính",
                "Ý nghĩa lịch sử",
            ]),
        ],
    ),
]


def _ensure_topic(db: Session, chapter: Chapter, title: str, order_index: int) -> Topic:
    """Tạo topic nếu chưa có trong chapter."""
    existing = db.execute(
        select(Topic).where(Topic.chapter_id == chapter.id, Topic.title == title)
    ).scalar_one_or_none()
    if existing:
        return existing
    topic = Topic(
        chapter_id=chapter.id,
        title=title,
        order_index=order_index,
    )
    db.add(topic)
    db.flush()
    return topic


def _ensure_chapter(db: Session, course: Course, title: str, order_index: int) -> Chapter:
    """Tạo chapter nếu chưa có trong course."""
    existing = db.execute(
        select(Chapter).where(Chapter.course_id == course.id, Chapter.title == title)
    ).scalar_one_or_none()
    if existing:
        return existing
    chapter = Chapter(
        course_id=course.id,
        title=title,
        order_index=order_index,
    )
    db.add(chapter)
    db.flush()
    return chapter


def main():
    db: Session = SessionLocal()
    try:
        existing_courses = {c.name for c in db.execute(select(Course)).scalars().all()}

        created_courses = 0
        created_chapters = 0
        created_topics = 0

        for name, description, chapters_data in SAMPLE_DATA:
            # 1) Tạo/lấy course
            course = db.execute(select(Course).where(Course.name == name)).scalar_one_or_none()
            if course is None:
                course = Course(
                    name=name,
                    description=description,
                    image_url=f"/static/uploads/{name.split()[0].lower()}.png",
                    is_published=True,
                    is_archived=False,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(course)
                db.flush()
                created_courses += 1
                print(f"CREATE course: {name}")

            # 2) Tạo chapters + topics
            for ch_idx, (ch_title, topics_data) in enumerate(chapters_data, start=1):
                chapters_before = len(db.new) + len(set(db.execute(select(Chapter)).scalars().all()))
                chapter = _ensure_chapter(db, course, ch_title, ch_idx)
                db.flush()
                chapters_after = len(set(db.execute(select(Chapter)).scalars().all()))
                # Track created (không chính xác nhưng đủ để in thông báo)
                for t_idx, t_title in enumerate(topics_data, start=1):
                    before = len(set(db.execute(select(Topic)).scalars().all()))
                    _ensure_topic(db, chapter, t_title, t_idx)
                    db.flush()
                    after = len(set(db.execute(select(Topic)).scalars().all()))
                    if after > before:
                        created_topics += 1

        db.commit()
        print(f"\nDONE: +{created_courses} course, +{created_topics} topic.")
        print(
            f"TOTAL: {len(db.execute(select(Course)).scalars().all())} courses, "
            f"{len(db.execute(select(Chapter)).scalars().all())} chapters, "
            f"{len(db.execute(select(Topic)).scalars().all())} topics."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
