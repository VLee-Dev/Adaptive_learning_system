# Adaptive Learning System

Hệ thống web học trực tuyến thích ứng cho chủ đề bất kỳ do Admin tạo.

## Phần 1 - Đã triển khai

### 19/09/2026 - Nền tảng database

- Dùng kiến trúc feature-based: mỗi nhóm nghiệp vụ/entity có package riêng.
- Dùng SQLAlchemy ORM với PostgreSQL và Alembic migration.
- Tạo cấu trúc backend/frontend ban đầu.
- Tạo model database và migration nền tảng.
- Kết nối PostgreSQL local.

### 22/09/2026 - Cập nhật schema theo business flow

- Chuyển schema sang `Course -> Chapter -> Topic`.
- Thêm enrollment, Topic mastery, practice config và Chapter Final Test.
- Thêm question pool/slot để random test theo cấu hình Admin.
- Xóa package legacy và cập nhật tài liệu dự án.
- Database đạt revision `676fd60e37f4`, gồm 20 bảng.

### 24/09/2026 - API nền tảng

- Thêm Auth: đăng ký, đăng nhập JWT và `/auth/me`.
- Thêm API Guest xem Course published.
- Thêm API Student enroll Course miễn phí.
- Bật CORS cho frontend Vite.

### 24/09/2026 - API học tập và BKT

- Triển khai đầy đủ Admin CRUD cho Course/Chapter/Topic/Lesson/Question.
- Triển khai Chapter Final Test với slot/pool system.
- Triển khai BKT (Bayesian Knowledge Tracing) service với 4 tham số.
- Triển khai Practice API: lấy câu hỏi adaptive, submit answer, cập nhật mastery.
- Triển khai Chapter Test API: start test (random generation), submit, completion tracking.
- Tạo seed data script với Course/Chapter/Topic mẫu đầy đủ.
- **Admin account tự động:** Migration tạo admin khi chạy `alembic upgrade head` - `admin@adaptive.com` / `Admin@123`

### 29/09/2026 - Schema mở rộng + Frontend skeleton

**Backend:**
- User model thêm `full_name` + `is_active`; Lesson model thêm `name` + `content` (markdown) — migration `xxxx_add_user_and_lesson_fields`.
- Thêm Admin CRUD cho PracticeConfiguration (4 endpoint) và 8 read-only endpoints cho frontend (Course/Chapter/Topic/Lesson chi tiết + `PATCH /auth/me`).
- Fix Chapter Final Test: random câu không trùng trong cùng pool trong 1 attempt.
- Tạo venv cho backend (`backend/venv/`) + cài đầy đủ `requirements.txt`.

**Frontend skeleton:**
- Vite 8 + React 19 + TypeScript + Tailwind CSS v3 + Zustand (state) + react-hook-form + zod.
- Routing 26 trang (auth + student + admin + shared) với `ProtectedRoute` theo role student/admin.
- `BackButton` dùng `history.back()` ưu tiên, fallback về route khác khi không có history.
- `Layout` chung: header + nav role-based + logout.
- Axios client với JWT interceptor + auto-redirect 401 về `/login`.
- 26 file page placeholder sẵn để bạn paste code từng trang.

**Tài liệu tham khảo kiến thức nền (xem `PROJECT_KNOWLEDGE.md` Section 10):**
- Vite/React/TypeScript/Tailwind: vai trò từng layer, build pipeline, alias `@/*`.
- Axios interceptor pattern: gắn JWT, xử lý 401 global.
- Zustand store: `create` + `persist` middleware (lưu vào localStorage).
- ProtectedRoute pattern với React Router v7.
- Tailwind `@layer components` + `@apply`: tạo utility classes tái sử dụng.

### Trạng thái hiện tại

**Hoàn thành:** Database (20 bảng), Auth/JWT, 49 API endpoints, BKT algorithm, adaptive practice, chapter test với slot/pool system, frontend skeleton với routing cho 26 trang. Backend + frontend sẵn sàng tích hợp UI từng trang.

**Tài liệu:**
- `PROJECT_KNOWLEDGE.md` - Kiến thức kỹ thuật tổng hợp (Git ignored)
- `IMPLEMENTATION_REPORT.md` - Chi tiết implementation
- `API_DOCUMENTATION.md` - API reference với curl examples
- `backend/scripts/README_SEED.md` - Hướng dẫn seed

**Chưa có:** UI cho từng trang cụ thể (placeholder - bạn thiết kế rồi paste code), Recommendation engine (cuối cùng).

## Phần 2 - Hướng dẫn sử dụng dự án

### Yêu cầu

- Python 3.12+
- PostgreSQL 14+
- Node.js 24+

### Backend

```powershell
Set-Location backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Tạo file `backend/.env` từ `backend/.env.example`, điền thông tin PostgreSQL và secret cần thiết. Không commit file `.env`.

Kiểm tra migration:

```powershell
alembic current
alembic upgrade head
```

Chạy backend khi API đã được triển khai:

```powershell
fastapi dev app/main.py
```

### Frontend

```powershell
Set-Location frontend
npm install            # (đã chạy, node_modules có sẵn)
npm run dev
```

Frontend có 26 trang với routing sẵn (Auth + Student + Admin + Shared), mỗi trang hiện là placeholder - bạn thiết kế UI rồi paste code vào đúng file `src/pages/...` tương ứng.

**Cấu trúc thư mục frontend:**

```
frontend/src/
  components/      # BackButton, Layout (header + nav)
  lib/api.ts       # Axios client + JWT interceptor
  routes/          # ProtectedRoute (theo role)
  stores/          # Zustand: authStore
  pages/
    auth/          # Landing, Login, Register, 404, 403
    student/       # Dashboard, Course list/detail, Chapter, Topic, Lesson, Practice, Test
    admin/         # Dashboard, Course CRUD, Chapter, Topic, Lesson/Question editor, Practice config, Final test builder
    ProfilePage.tsx
  App.tsx          # Định tuyến tất cả 26 routes
  main.tsx
  index.css        # Tailwind base + utility classes (.btn-primary, .card, .input, ...)
```

## Phần 3 - Mô tả dự án

### Luồng học tập

```text
Guest xem Course
  -> Student đăng ký miễn phí và chọn Course
  -> Chapter theo thứ tự
  -> Topic theo thứ tự
  -> Lesson
  -> Adaptive Practice bằng BKT
  -> Hoàn thành mọi Topic trong Chapter
  -> Chapter Final Test
  -> Chapter completion log
  -> Chapter tiếp theo
```

### Database và quan hệ chính

- `courses` lưu khóa học do Admin tạo. Một Course có nhiều `chapters`.
- `chapters` lưu chương và `order_index`. Một Chapter có nhiều `topics` và tối đa một `chapter_final_test`.
- `topics` là mục kiến thức chỉ thuộc Course/Chapter đó. Topic có Lesson, question bank, practice configuration và mastery riêng.
- `lessons` là nội dung học trước practice, thuộc một Topic và có thứ tự.
- `course_enrollments` nối Student với Course; unique theo `(user_id, course_id)`.
- `questions` là ngân hàng câu hỏi của Topic. Practice dùng `purpose=practice` và `level=1/2/3`.
- `practice_configurations` chứa số câu, level bắt đầu, ngưỡng BKT, retry/review limit cho từng Topic.
- `topic_mastery` là trạng thái BKT hiện tại của một Student tại một Topic; lịch sử câu trả lời nằm ở `attempts`.
- `chapter_final_tests` không dùng BKT, chỉ chấm điểm theo ngưỡng Admin đặt.
- `chapter_test_slots` biểu diễn từng vị trí câu; `chapter_test_pools` chứa các nhóm câu; hai bảng nối quy định mỗi slot lấy câu từ pool nào.
- `chapter_completions` ghi Student đã qua Chapter Final Test; log này là điều kiện mở Chapter tiếp theo.
- `course_completions` ghi Student đã hoàn thành toàn khóa.
- `learning_events` lưu lịch sử như trả lời và yêu cầu xem lại Lesson; `recommendations` lưu lý do chọn câu practice để audit.

### Logic thích ứng

- Practice là phần duy nhất cập nhật BKT.
- BKT tính riêng theo `(user_id, topic_id)`.
- Kết quả tốt có thể đưa Student lên level cao hơn; kết quả kém có thể hạ level.
- Ngưỡng mặc định đã thống nhất: `0.65` là khá vững, `0.85` là nắm vững; Admin có thể cấu hình theo Topic.
- Khi cần ôn lại, hệ thống ghi log `review_required`; Student có thể làm lại theo giới hạn Admin đặt.
- Chapter Final Test random câu theo từng slot/pool, không gom toàn bộ câu của Chapter thành một pool chung.

### Phạm vi chưa có

- Frontend integration với backend API.
- Admin UI panel.
- Recommendation engine (để sau cùng).
- Production infrastructure (Redis cho test sessions, logging, monitoring).
