# Adaptive Learning System

Hệ thống học tiếng Anh thích ứng, tập trung vào Grammar và có thể mở rộng Listening. Thiết kế đầy đủ nằm trong `adaptive_learning_pipeline_spec.md`; file này ghi lại tiến độ triển khai và mô tả hệ thống hiện có.

## Phần 1 - Tiến độ triển khai

### 19/09/2026 - Giai đoạn 1: Database và cấu trúc thư mục

- Đã tạo skeleton backend theo kiến trúc feature-based; mỗi entity chính có package riêng.
- Đã tạo skeleton frontend React/Vite theo các page và component trong đặc tả.
- Đã tạo cấu hình SQLAlchemy dùng chung tại `app/core/database.py`, gồm `Base`, `engine`, `SessionLocal` và dependency `get_db()`.
- Tạo model cấu trúc feature-based: mỗi entity có package riêng; entity có API độc lập có thêm `schema.py`, `router.py`, `service.py`, `repository.py`.

### Các ngày/tuần tiếp theo

- Giai đoạn 1 - Điền `.env`, kiểm tra kết nối PostgreSQL, tạo migration đầu tiên và chạy `alembic upgrade head`: hoàn thành, revision `7014dd03d37b`

- Giai đoạn 2 - API và business logic:
- Giai đoạn 3 - Frontend:

### Schema database và quan hệ các bảng

### Cây thư mục backend hiện tại

```text
backend/
├── alembic/
│   ├── versions/                  # migration được Alembic sinh tự động
│   ├── env.py                     # import app.model_registry và Base.metadata
│   └── script.py.mako
├── app/
│   ├── core/
│   │   └── database.py            # Base, engine, SessionLocal, get_db
│   ├── users/                     # User, UserRole
│   ├── skills/                    # Skill, prerequisite graph
│   ├── lessons/                   # Lesson
│   ├── stimuli/                   # Stimulus
│   ├── questions/                 # Question
│   ├── attempts/                  # Attempt
│   ├── learning_events/           # LearningEvent
│   ├── mastery/                   # StudentSkillMastery, BKT service
│   ├── skill_test_results/        # SkillTestResult
│   ├── recommendations/           # Recommendation audit log
│   ├── model_registry.py          # import toàn bộ model vào một metadata chung
│   ├── config.py                  # đọc biến môi trường
│   └── main.py                    # FastAPI entry point
├── scripts/
├── tests/
├── .env                          # local, không commit
├── .env.example                  # template được commit
└── requirements.txt
```

Các package entity có nghiệp vụ/API độc lập được tổ chức theo lớp:

```text
skills/
├── model.py
├── schema.py
├── router.py
├── service.py
└── repository.py
```

Các bảng nội bộ của pipeline chỉ giữ lớp cần thiết, tránh tạo router hình thức.

Các module orchestration sẽ được triển khai ở Giai đoạn 2 gồm `auth`, `content`, `admin`, `learning`, `tutor` và `remedial`. Chúng điều phối nghiệp vụ và expose API, không thay thế các package model ở trên.

| Bảng | Vai trò | Quan hệ chính |
|---|---|---|
| `users` | Tài khoản Student/Admin | Một user có nhiều `attempts`, `learning_events`, `student_skill_mastery`, `skill_test_results`, `recommendations`. |
| `skills` | Kỹ năng tiếng Anh và tham số BKT | Có nhiều lesson, stimulus, question, attempt và trạng thái mastery; liên kết với chính nó qua `skill_prerequisites`. |
| `skill_prerequisites` | Quan hệ nhiều-nhiều prerequisite | `skill_id` là skill cần học; `prerequisite_skill_id` là skill phải hoàn thành trước. Hai cột tạo khóa chính kép. |
| `lessons` | Bài giảng trước khi luyện tập | Nhiều lesson thuộc một skill; `content_type` là image/video/text. |
| `stimuli` | Ngữ liệu dùng chung cho câu hỏi | Nhiều stimulus thuộc một skill; một stimulus có thể được nhiều question dùng lại. |
| `questions` | Câu hỏi practice/test | Thuộc một skill, có thể trỏ tới stimulus; phân biệt bằng `purpose`, định dạng bằng `question_format`. Practice có difficulty; test để `NULL`. |
| `attempts` | Mỗi lần Student trả lời | Liên kết user, question và skill; là nguồn để cập nhật BKT và tạo learning event. |
| `learning_events` | Nhật ký sự kiện học tập | Liên kết user, attempt và skill; ghi answer, AI explanation hoặc remedial trigger. |
| `student_skill_mastery` | Trạng thái mastery hiện tại | Liên kết user-skill; unique `(user_id, skill_id)` để mỗi user chỉ có một trạng thái cho mỗi skill. |
| `skill_test_results` | Kết quả bài test cố định | Liên kết user-skill; unique `(user_id, skill_id)`, dùng để xác định test đã passed. |
| `recommendations` | Log quyết định gợi ý | Lưu user, skill/question được chọn, difficulty và reason để audit adaptive loop. |

Các quan hệ nghiệp vụ quan trọng:

1. `User -> Attempt -> Question/Skill`: mỗi câu trả lời được lưu lại và dùng làm dữ liệu cập nhật mastery.
2. `Skill -> Question`: Recommendation Engine chỉ chọn question có `purpose = 'practice'`; test không đi qua engine.
3. `User + Skill -> StudentSkillMastery`: BKT cập nhật bản ghi duy nhất theo cặp user-skill.
4. `User + Skill -> SkillTestResult`: skill chỉ hoàn thành khi mastery đạt ngưỡng và test đã passed.
5. `Skill -> SkillPrerequisites -> Skill`: graph prerequisite quyết định skill nào được mở khóa; kiểm tra chu trình sẽ thực hiện ở tầng service.
6. `Question -> Stimulus`: các dạng listening/reading/image cần stimulus tương ứng; validate loại stimulus sẽ thực hiện ở tầng ứng dụng.
7. `Question -> Attempt`: `source_attempt_id` cho phép truy vết câu remedial AI được sinh từ lần trả lời sai gần nhất.

### Cấu hình cần bạn điền trước khi kết nối database

Mở [backend/.env](backend/.env) và điền:

```env
DATABASE_URL=postgresql+psycopg2://<user>:<password>@localhost:5432/adaptive_learning
JWT_SECRET_KEY=<chuoi-bi-mat>
ANTHROPIC_API_KEY=<co-the-de-trong-o-giai-doan-1>
```

Sau khi điền `.env`, chạy từ thư mục `backend/`:

```powershell
alembic revision --autogenerate -m "init schema"
alembic upgrade head
```

## Phần 2 - Mô tả hệ thống đã có sẵn

### Mục tiêu

Hệ thống tạo vòng lặp học thích ứng:

`Student -> Learning Event -> Student Model (BKT) -> Recommendation Engine -> Next Activity`

CRUD nội dung là nền tảng. Business core là BKT và Recommendation Engine rule-based, giúp chọn skill và độ khó minh bạch. LLM chỉ hỗ trợ giải thích khi sai, sinh câu remedial khi sai lặp lại và gợi ý nội dung cho Admin; LLM không quyết định câu hỏi chính.

### Vai trò

- **Guest:** xem landing page và banner skill/course, không làm bài thử.
- **Student:** đăng ký/đăng nhập, tự động enroll, học adaptive, làm test, xem mastery và lịch sử.
- **Admin:** quản lý skill, lesson, stimulus, practice/test question và xem báo cáo.

### Luồng chính dự kiến

1. Student đăng nhập và xem skill tree theo prerequisite.
2. Skill mới hiển thị lesson trước khi vào practice.
3. `submit-answer` lưu attempt, cập nhật BKT, trả kết quả và giải thích khi sai.
4. Recommendation Engine chọn skill, difficulty và practice question tiếp theo.
5. Khi mastery đạt ngưỡng, Student làm test cố định; passed mới mở skill kế tiếp.
6. Admin quản lý nội dung qua form React và theo dõi báo cáo tổng hợp.

### Trạng thái hiện tại

Đã hoàn thành phần database và migration của Giai đoạn 1. PostgreSQL local đã kết nối thành công, 11 bảng đã được tạo và schema đã được kiểm tra trực tiếp. Route API thực thi, seed data, giao diện React và logic BKT/Recommendation Engine chưa được triển khai.

