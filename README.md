# Adaptive Learning System

Nền tảng web học trực tuyến **thích ứng**: nội dung và độ khó câu hỏi được điều chỉnh theo trạng thái kiến thức thực tế của từng người học, thay vì áp dụng một lộ trình cố định cho tất cả mọi người.

Hệ thống gồm hai phần: **backend** (FastAPI + PostgreSQL) xử lý toàn bộ nghiệp vụ và thuật toán thích ứng, **frontend** (React + TypeScript) hiển thị trải nghiệm học tập cho cả Admin lẫn Student.

---

## 1. Tính năng chính

### Dành cho người học (Student)

- Xem khóa học công khai mà **không cần đăng nhập**, sau đó đăng ký miễn phí để học.
- Đi theo lộ trình **Khóa học → Chương → Chủ đề → Bài giảng → Luyện tập → Kiểm tra chương**.
- **Luyện tập thích ứng**: mỗi câu hỏi được chọn theo điểm yếu hiện tại, ưu tiên câu chưa từng làm và tránh lặp lại câu trong cùng một phiên.
- **Cảnh báo ôn lại**: khi trả lời sai nhiều liên tiếp, hệ thống gợi ý xem lại bài giảng — nhưng **không chặn** người học tiếp tục.
- **Kiểm tra chương** chỉ mở khi đã hoàn thành luyện tập của tất cả chủ đề trong chương đó.
- Điều hướng liền mạch: nút "Quay lại / Tiếp theo" xuyên suốt bài giảng → luyện tập → kiểm tra.
- Ghi nhận **thời gian học thực tế** và hiển thị lịch học theo tháng (streak).

### Dành cho quản trị viên (Admin)

- Quản lý đầy đủ **Khóa học → Chương → Chủ đề → Bài giảng → Câu hỏi** với giao diện riêng.
- Tải ảnh bìa khóa học lên server và xem ngay trong danh sách.
- Cấu hình **bài kiểm tra cuối chương** theo mô hình *slot / pool* (mỗi vị trí câu lấy ngẫu nhiên từ một nhóm câu riêng).
- Ánh xạ / ẩn nội dung (soft-delete) thay vì xoá cứng.
- Đặt riêng 4 tham số BKT cho từng chủ đề.

---

## 2. Công nghệ sử dụng

| Phần | Công nghệ | Vai trò |
|---|---|---|
| Backend | Python 3.12, FastAPI, Uvicorn | REST API + tài liệu tự sinh tại `/docs` |
| Backend | SQLAlchemy 2.x, Alembic, PostgreSQL 14+ | Truy cập dữ liệu & quản lý schema |
| Backend | `python-jose`, `bcrypt` | Xác thực bằng JWT, mã hoá mật khẩu |
| Frontend | React 19, Vite 8, TypeScript | Giao diện người dùng |
| Frontend | React Router 7, Zustand | Định tuyến & quản lý phiên đăng nhập |
| Frontend | Axios, Tailwind CSS 3 | Gọi API & thiết kế giao diện |
| Frontend | react-hook-form + zod, react-hot-toast | Validate form & thông báo |

> Không bật CORS: frontend dùng Vite proxy `/api/*` → `http://localhost:8000/*`, giữ cùng origin với trình duyệt.

---

## 3. Cấu trúc dự án

```text
Adaptive_learning_system/
├── backend/
│   ├── app/                     # Mã nguồn ứng dụng
│   │   ├── main.py              # Khởi tạo FastAPI, gắn router, phục vụ /static
│   │   ├── model_registry.py    # Gom toàn bộ model để SQLAlchemy dựng mapper
│   │   ├── config.py            # Đọc cấu hình từ .env
│   │   │
│   │   ├── auth/                # Đăng ký, đăng nhập, /auth/me
│   │   ├── content/             # API đọc nội dung công khai (course/chapter/topic/lesson)
│   │   ├── enrollments/         # Ghi danh vào khóa học
│   │   ├── learning/            # Luồng học: mastery, luyện tập, kiểm tra chương
│   │   ├── admin/               # CRUD quản trị + cấu hình bài kiểm tra
│   │   ├── uploads/             # Upload ảnh
│   │   │
│   │   ├── mastery/             # ★ Thuật toán thích ứng (BKT) + trạng thái mastery
│   │   ├── questions/           # Ngân hàng câu hỏi + thống kê điểm yếu từng câu
│   │   ├── attempts/            # Lịch sử câu trả lời
│   │   ├── study_sessions/      # Ghi thời gian học
│   │   ├── completions/         # Log hoàn thành chương / khóa học
│   │   ├── chapter_tests/       # Bài kiểm tra cuối chương + pool/slot
│   │   ├── learning_events/     # Nhật ký sự kiện học tập
│   │   ├── recommendations/     # Nhật ký lý do chọn câu (audit)
│   │   ├── courses/ chapters/ topics/ lessons/ stimuli/   # Model dữ liệu
│   │   └── users/               # Người dùng & vai trò
│   │
│   ├── core/database.py         # Engine, Session, Base, dependency get_db
│   ├── alembic/versions/        # 13 migration, head = e5a1b2c3d4f6
│   ├── scripts/                 # Script seed dữ liệu mẫu
│   ├── static/uploads/          # Ảnh do Admin tải lên
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.tsx              # Bảng định tuyến (24 route)
│       ├── main.tsx             # Mount React + Toaster
│       ├── components/          # Layout, AdminLayout, StudentHeader, ImageUploader, …
│       ├── pages/
│       │   ├── auth/            # Landing, Login, Register, 404, 403
│       │   ├── course/          # Chi tiết khóa học công khai
│       │   ├── student/         # Trang học của Student
│       │   └── admin/           # Trang quản trị
│       ├── hooks/               # useStudySession, useRequireAuth
│       ├── lib/                 # api.ts (Axios + JWT), adminApi.ts
│       ├── routes/              # ProtectedRoute theo vai trò
│       ├── stores/              # authStore (Zustand + persist)
│       └── types/               # Kiểu dữ liệu dùng chung
│
├── docs/BAO_CAO_DO_AN.md        # Báo cáo đồ án (kiến trúc chi tiết, đối chiếu DB thật)
├── AGENTS.md                    # Quy tắc làm việc cho agent
└── README.md
```

**Quy ước tổ chức backend:** mỗi nhóm nghiệp vụ nằm trong một package riêng, chia theo vai trò:

- `model.py` — định nghĩa bảng database
- `schemas.py` / `schema.py` — khuôn dữ liệu JSON trả về & nhận vào
- `repository.py` — truy vấn database
- `service.py` — logic nghiệp vụ
- `router.py` — định nghĩa endpoint HTTP

---

## 4. Luồng hoạt động

### 4.1 Luồng học tập

```text
Khách xem khóa học công khai
  → Đăng ký tài khoản → Ghi danh vào khóa học (miễn phí)
  → Mở khóa học: sidebar Chương → Chủ đề → Bài giảng
  → Luyện tập thích ứng (BKT cập nhật trạng thái kiến thức)
  → Đủ điều kiện → Mở khóa bài kiểm tra cuối chương
  → Pass → Ghi log hoàn thành chương → Mở chương tiếp theo
  → Hoàn thành toàn bộ → Ghi log hoàn thành khóa học
```

### 4.2 Logic thích ứng (tóm tắt)

- **Chỉ luyện tập mới cập nhật trạng thái kiến thức.** Kiểm tra chương chỉ chấm điểm, không ảnh hưởng BKT.
- Trạng thái kiến thức được tính **riêng cho từng cặp (người học, chủ đề)**, dùng thuật toán **BKT** (Bayesian Knowledge Tracing) với 4 tham số (`p_init`, `p_transit`, `p_slip`, `p_guess`) cấu hình được cho từng chủ đề.
- Trạng thái quyết định **mức độ khó** của câu hỏi tiếp theo (3 mức) và **cảnh báo ôn lại** khi người học sai nhiều liên tiếp.
- Bước nhảy trạng thái bị **giới hạn** mỗi câu để phản ứng không quá nhạy.
- Điều kiện **hoàn thành chủ đề** thỏa một trong hai: đúng đủ 5 câu liên tiếp *và* trạng thái ≥ 0.85, *hoặc* đủ 20 câu *và* đúng ≥ 10 câu.
- Luyện tập lại sau khi đã hoàn thành **không tính vào trạng thái kiến thức**, chỉ ghi thống kê số câu đúng/sai.
- Máy chọn câu theo nguyên tắc **ưu tiên điểm yếu** (có suy giảm sau mỗi lần trả lời đúng), ưu tiên câu chưa từng làm, và phạt câu bị lặp trong cùng phiên.

### 4.3 Mô hình dữ liệu rút gọn

```text
Course ─┬─ Chapter ─┬─ Topic ─┬─ Lesson
        │           │        ├─ Question (ngân hàng câu hỏi)
        │           │        ├─ TopicMastery (trạng thái BKT của từng người học)
        │           │        └─ QuestionStat (điểm yếu từng câu)
        │           ├─ ChapterFinalTest ─ ChapterTestPool ─ ChapterTestSlot
        │           └─ ChapterCompletion
        └─ CourseEnrollment ─ CourseCompletion
```

Các bảng theo dõi tiến trình: `attempts` (lịch sử trả lời), `study_sessions` (thời gian học), `learning_events` (nhật ký sự kiện), `recommendations` (lý do chọn câu).

Tổng cộng **22 bảng** (21 bảng ứng dụng + `alembic_version`).

---

## 5. Cài đặt & chạy dự án

### 5.1 Yêu cầu

- Python 3.12+
- PostgreSQL 14+
- Node.js 24+

### 5.2 Backend

```powershell
Set-Location backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Tạo file `backend/.env` từ `backend/.env.example` và điền thông tin kết nối PostgreSQL cùng khóa JWT:

```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/adaptive_learning
JWT_SECRET_KEY=replace-with-a-long-random-secret
```

> File `.env` không được commit lên git.

Áp dụng migration và khởi động API:

```powershell
alembic upgrade head
fastapi dev app/main.py
```

API chạy tại `http://localhost:8000`, tài liệu tự sinh tại `http://localhost:8000/docs`.

**Tài khoản Admin mặc định** (được tạo tự động khi chạy `alembic upgrade head`):
`admin@adaptive.com` / `Admin@123` — hãy đổi mật khẩu nếu dùng thật.

### 5.3 Frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173` và tự proxy `/api/*` sang backend.

### 5.4 Nạp dữ liệu mẫu (tuỳ chọn)

Chạy từ thư mục `backend`, sau khi backend đã hoạt động:

```powershell
python -m scripts.seed             # 1 khóa học mẫu cơ bản
python scripts/seed_course.py      # khóa "Tiếng Anh Cơ Bản" qua API admin
python -m scripts.seed_courses     # thêm các khóa học mẫu khác
python seed_lessons_questions.py   # bài giảng + câu hỏi cho các chủ đề có sẵn
```

Các script này **idempotent** — chạy lại không tạo trùng dữ liệu.

---

## 6. Tóm tắt trạng thái hiện tại

**Đã hoàn thiện**

- Database 22 bảng, migration head `e5a1b2c3d4f6`
- Xác thực JWT + phân quyền theo vai trò
- **52 API endpoint** (Auth 4 · Content 8 · Enrollment 2 · Learning 11 · Admin 26 · Uploads 1)
- Thuật toán BKT với cấu hình theo từng chủ đề
- Bài kiểm tra cuối chương theo mô hình slot/pool
- Frontend **24 màn hình** (6 công khai · 9 học viên · 9 quản trị) với theme Neko
- Tải ảnh bìa khóa học end-to-end
- Ghi nhận thời gian học và lịch học theo tháng

**Chưa có**

- Unit test & test tích hợp (`backend/tests/` hiện rỗng)
- Recommendation engine (mới chỉ có bảng audit)
- Hạ tầng production (Redis cho phiên thi, logging, monitoring, CI/CD)

---

## 7. Nhật ký phát triển

Ghi lại những gì đã làm theo từng mốc thời gian.

### 19/09/2026 — Nền tảng database

- Kiến trúc feature-based: mỗi nhóm nghiệp vụ/entity có package riêng.
- Dùng SQLAlchemy ORM với PostgreSQL và Alembic migration.
- Tạo cấu trúc backend/frontend ban đầu, model database và migration nền tảng.
- Kết nối PostgreSQL local.

### 22/09/2026 — Cập nhật schema theo business flow

- Chuyển schema sang `Course → Chapter → Topic`.
- Thêm enrollment, Topic mastery, practice config và Chapter Final Test.
- Thêm question pool/slot để random test theo cấu hình Admin.
- Xoá package legacy và cập nhật tài liệu dự án.
- Database đạt revision `676fd60e37f4`, gồm 20 bảng.

### 24/09/2026 — API nền tảng

- Thêm Auth: đăng ký, đăng nhập JWT và `/auth/me`.
- Thêm API Guest xem Course published.
- Thêm API Student enroll Course miễn phí.
- Bật CORS cho frontend Vite.

### 24/09/2026 — API học tập và BKT

- Triển khai đầy đủ Admin CRUD cho Course/Chapter/Topic/Lesson/Question.
- Triển khai Chapter Final Test với slot/pool system.
- Triển khai BKT (Bayesian Knowledge Tracing) service với 4 tham số.
- Triển khai Practice API: lấy câu hỏi adaptive, submit answer, cập nhật mastery.
- Triển khai Chapter Test API: start test (random generation), submit, completion tracking.
- Tạo seed data script với Course/Chapter/Topic mẫu đầy đủ.
- Admin account tự động tạo bởi migration: `admin@adaptive.com` / `Admin@123`.

### 29/09/2026 — Schema mở rộng + Frontend skeleton

**Backend:**
- User model thêm `full_name` + `is_active`; Lesson model thêm `name` + `content` (markdown).
- Thêm Admin CRUD cho PracticeConfiguration và 8 read-only endpoints cho frontend.
- Fix Chapter Final Test: random câu không trùng trong cùng pool trong 1 attempt.
- Tạo venv cho backend + cài đầy đủ `requirements.txt`.

**Frontend skeleton:**
- Vite 8 + React 19 + TypeScript + Tailwind CSS v3 + Zustand + react-hook-form + zod.
- Routing 26 trang (auth + student + admin + shared) với `ProtectedRoute` theo role.
- `Layout` chung: header + nav role-based + logout.
- Axios client với JWT interceptor + auto-redirect 401 về `/login`.
- 26 file page placeholder sẵn để paste code từng trang.

### 03/10/2026 — Landing + Login + Register

**Frontend:**
- Tải ảnh background Neko về `frontend/public/images/bg-neko.png`.
- Cài `react-hot-toast` cho thông báo kiểu toast.
- Mở rộng Tailwind theme: màu `paw` (cam đất), `cream` (kem), font `quicksand`, shadow `cozy`.
- Thêm Google Fonts Quicksand vào `index.html`.
- Tạo component `Toaster` + hook `useRequireAuth`.
- Layout mới: 2 chế độ — `bare` cho Landing/Login/Register, layout thường cho các trang app.

**3 trang đã xong:**
- **LandingPage**: Hero + features + danh sách khóa học public. Guest bấm "Xem chi tiết" → toast yêu cầu đăng nhập + redirect `/login`.
- **LoginPage**: Theo mẫu Neko (background mèo + form bên phải), có eye toggle và remember me.
- **RegisterPage**: Theo mẫu Neko, dùng `react-hook-form` + `zod` validation. Đăng ký xong → tự động login.

### 06/10/2026 — Landing redesign + Auth flow + ErrorBoundary

- Redesign toàn bộ Landing/Login/Register theo theme Neko mới.
- Thêm `ErrorBoundary` để catch lỗi toàn cục.
- Thêm ảnh mới: `icon.png`, `landscaping.png`.
- Cải thiện UX với toast notifications và smooth transitions.

### 07/10/2026 — Admin & Student Frontend hoàn chỉnh

**Admin (9 trang):** Dashboard, Course list/detail, Chapter detail, Topic detail, Lesson editor, Question editor, Practice config, Final test builder.

**Student (8 trang):** Dashboard, Course catalog, Course detail, Chapter detail, Topic detail, Lesson view, Practice (BKT adaptive), Chapter test.

**Shared:** ProfilePage xem hồ sơ + đổi mật khẩu.

**Hạ tầng:** `AdminLayout` với sidebar + breadcrumbs, `adminApi.ts` (~280 dòng) typed helpers, type definitions cho topic/lesson/question.

**UI/UX:** design language thống nhất (rounded-2xl cards, shadow-cozy, cream/paw), đầy đủ loading/error state, responsive, toast notifications.

### 13/10/2026 — Course cover image upload

**Backend:**
- Package `app/uploads/` với `POST /uploads` (admin-only, `multipart/form-data`, chỉ nhận jpeg/png/webp/gif, tối đa 5 MB).
- `app/main.py` mount `StaticFiles` tại `/static`.
- Migration `f1a2b3c4d5e6` thêm cột `image_url` cho bảng `courses`.

**Frontend:**
- Component dùng chung `ImageUploader.tsx`: file input + preview + nút xoá ảnh + progress + error inline.
- `lib/api.ts`: thêm `uploadApi.uploadImage(file)` và helper `resolveImageUrl()` để ảnh hiển thị đúng khi Vite (5173) và FastAPI (8000) khác origin.
- Form tạo/sửa khóa học đổi input URL thành `ImageUploader`; trang detail có panel "Sửa thông tin" inline.

**Test end-to-end:** upload ảnh → trả `/static/uploads/<token>.png`, truy cập trả HTTP 200 đúng content-type, PATCH course trả về URL mới.

### 14/10/2026 — Redesign Neko UI + BKT harden + Course image upload

**Student experience:**
- Header mới `StudentHeader` (sticky, blur, search + StudyTimer + UserDropdown).
- Tách `StudyTimerBadge` + `UserDropdown` ra `components/` để tái sử dụng.
- `HomepageStudent`: greeting + primary course card + weekly streak + featured courses grid.
- Xoá các file skeleton không dùng: `BackButton`, `MasteryBar`, `SkillTreeView`, `admin/LessonForm`, `admin/QuestionForm`, `pages/LearnPage`, `pages/TestPage`, `pages/HistoryPage`.

**BKT + schema:**
- Thêm cột `is_active`, `is_archived` vào courses + chapters (soft-delete/ẩn nội dung).
- Model `Mastery` tách package riêng (`app/mastery/`): BKT state + attempt history + recommendation log.

**Course image upload:** package `app/uploads/` + endpoint + `StaticFiles` mount + `ImageUploader` component.

**Cleanup:** xoá script tạm (`_check_*.py`, `_fix_*.py`, `_verify_admin.py`), route `/student/homepage` thay cho `/student/dashboard`.

### 17/10/2026 — Course detail public + study sessions + UI redesign

**Backend:**
- `GET /courses/{id}` cho phép guest xem chi tiết khóa học công khai.
- Bảng `study_sessions` (migration `a7b8c9d0e1f2`) ghi thời gian học thực tế: `POST /learning/study-sessions/start|heartbeat|stop`.
- `GET /learning/monthly-streak` trả phút học theo từng ngày local.

**Frontend:**
- `useStudySession.ts` — heartbeat mỗi 30s, pause khi ẩn tab >60s, stop khi idle >10 phút.
- `MonthlyStreakCalendar.tsx` — lịch học tháng dạng heatmap.
- `EnrolledCoursesSlider.tsx` — slider khóa học đã đăng ký trên trang chủ.

### 19/10/2026 — Inline chapter test + cross-item nav + lock-by-practice

**Mục tiêu:** biến `/learn` thành trải nghiệm học liền mạch — không rời trang khi làm kiểm tra chương; điều hướng "Quay lại / Tiếp theo" xuyên suốt mọi loại nội dung; chương bị khoá cho tới khi pass hết practice.

**Frontend:**
- `CourseLearnPage.tsx`: tạo mảng phẳng `courseItemsFlat` theo thứ tự sidebar (lesson → practice → chapter test), mỗi item là 1 bước nhảy được bằng nút Quay lại / Tiếp theo.
- `LessonView` đổi nhãn "Bài trước / Bài tiếp theo" → "Quay lại / Tiếp theo".
- `PracticeView`: bỏ nav dưới cùng trong phiên; khi topic đã `completed` hiện panel "Đã hoàn thành" + nút "Làm lại để luyện tập thêm"; thêm cờ `forceRestart` để fetch lại câu hỏi.
- `ChapterTestView` inline với 4 trạng thái: **Locked / Ready / In progress / Result**. Khi khoá, hiện danh sách chủ đề chưa đủ và chip-link nhảy thẳng về practice tương ứng.
- Xoá route `/student/chapters/:chapterId/test` và file `StudentChapterTestPage.tsx`.

**Quyết định kiến trúc:**
- Chapter Test không có route riêng — mọi flow quanh `/learn` để giữ ngữ cảnh học tập (timer, sidebar, mastery).
- Practice "đã pass" không bị ẩn, vẫn cho phép làm lại nhưng không reset mastery.
- Lock-by-practice dùng mastery status (đồng bộ với backend) thay vì tự check `completion_rate` ở client.

### 23/10/2026 — Đơn giản hoá BKT + sửa vòng lặp ôn lại + chọn câu thích ứng

**Vấn đề:** BKT thuần phản ứng quá nhanh (5 câu đúng liên tiếp → ~0.999) và máy chọn câu bám theo tỉ lệ sai lũy kếa nên vòng lặp ôn không bao giờ thoát được.

**Backend:**
- **Rate-limit bước nhảy** `MASTERY_CAP_UP = 0.15` / `MASTERY_CAP_DOWN = 0.10` — can thiệp *sau* bước Bayes.
- **Level là hàm thuần của mastery**: `>= 0.70` → 3, `< 0.35` → 1, còn lại → 2.
- **`p_transit` chỉ cộng khi trả lời ĐÚNG** — sai thì chưa có gì để "học".
- **Cảnh báo thay cho trạng thái**: bỏ `review_required`; sai 5 liên tiếp *hoặc* (3 liên tiếp + BKT < 0.30) → thông báo "Bạn hãy học kỹ hơn chủ đề này" kèm link bài giảng, **không chặn** lộ trình.
- **Pass 2 đường (OR)**: (5 đúng liên tiếp *và* BKT ≥ 0.85) *hoặc* (20 câu *và* ≥ 10 đúng).
- `question_stats.weakness` — điểm yếu **có suy giảm**: sai thì `+= (1-w) * 0.45`, đúng thì `*= 0.45`.
- `select_next_question()` — 8 nhánh weak-first, ưu tiên câu chưa từng làm, phạt câu lặp trong phiên.
- `GET /learning/topics/{id}/practice/next` trả **200** với `question: null` + `note` thay vì 404 khi hết câu phù hợp.
- Lượt luyện lại sau khi đã pass → `is_extra_practice = true`: không tính BKT, không cộng `practice_attempts`.
- Migration `c4f1a9d3e8b2` (thêm `weakness` + ranh giới phiên) và `e5a1b2c3d4f6` (drop cột mastery chết).

**Frontend:**
- `PracticeView` hiển thị tổng kết phiên (đúng/sai/độ chính xác) và badge lý do chọn câu.
- `WarningBanner` — banner vàng "Bạn hãy học kỹ hơn chủ đề này" + nút "Xem lại bài giảng", không chặn lộ trình.

**Dữ liệu:** `backend/seed_lessons_questions.py` — seed 21 bài giảng + 340 câu hỏi (300 practice + 40 chapter_final), idempotent.

### 24/10/2026 — Dọn route trùng + viết lại README

- Xoá khai báo route trùng `/student/chapters/:chapterId` trong `App.tsx` (vốn render `StudentChapterDetailPage` hai lần).
- Sửa script đếm route trong Phụ lục D của `docs/BAO_CAO_DO_AN.md` (bỏ qua `<Routes>` và các route layout-only).
- Viết lại `README.md` theo cấu trúc dự án thông thường: tính năng → công nghệ → cấu trúc → luồng → cài đặt → nhật ký phát triển.
