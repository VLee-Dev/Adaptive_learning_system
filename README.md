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

### 03/10/2026 - Landing + Login + Register (3 trang đầu tiên)

**Frontend:**
- Tải ảnh background Neko về `frontend/public/images/bg-neko.png` (từ URL Google, 215KB).
- Cài `react-hot-toast` cho thông báo nhẹ kiểu toast/snackbar (không che UI).
- Mở rộng Tailwind theme: thêm màu `paw` (cam đất), `cream` (kem), font `quicksand`, shadow `cozy`.
- Thêm Google Fonts Quicksand vào `index.html`.
- Tạo component `Toaster` (mount 1 lần ở `main.tsx`) + hook `useRequireAuth` (chạy callback nếu đã login, ngược lại toast nhắc + redirect /login sau 1.2s).
- Layout mới: 2 layout riêng - `bare` cho Landing/Login/Register (full-bleed background, không có header), layout thường cho các trang app.

**3 trang đã xong:**
- **LandingPage (A1)**: Hero + features + danh sách khóa học public (gọi `GET /courses`). Mỗi course card có nút "Xem chi tiết →" - nếu Guest click thì toast "Bạn cần đăng nhập để tiếp tục" + redirect `/login`. Smooth scroll tới `#courses` khi click "Xem khóa học".
- **LoginPage (A2)**: Theo mẫu Neko (background mèo + form bên phải). Gọi `useAuthStore.login()`. Có thêm: redirect về trang gốc nếu user bị ProtectedRoute đẩy qua, eye toggle cho password, remember me.
- **RegisterPage (A3)**: Theo mẫu Neko. Dùng `react-hook-form` + `zod` validation. Fields: họ tên, email, password, xác nhận password, đồng ý điều khoản. Sau khi đăng ký thành công → tự động login → navigate về dashboard.

**Kiến thức mới cần nhớ (xem `PROJECT_KNOWLEDGE.md` Section 10):**
- `react-hot-toast`: import `toast` từ thư viện, dùng `toast.success/error/loading`. Mount `<Toaster />` ở `main.tsx` để toast hiển thị toàn cục.
- React Hook Form + Zod: `useForm({ resolver: zodResolver(schema) })` → tự động validate, `register('fieldName')` để bind input, `formState.errors.fieldName` để hiển thị lỗi.
- Zod `.refine((v) => v === true, { message })` thay cho `z.literal(true, { errorMap })` ở phiên bản mới.
- 2 Layout pattern: `bare` cho full-bleed (không header) và layout thường cho app - tách ở `App.tsx` bằng 2 `<Layout>` block.

### [Commit cdd9067] Landing page redesign + Auth flow + ErrorBoundary

**Frontend:**
- Redesign toàn bộ Landing/Login/Register pages với theme Neko mới.
- Thêm `ErrorBoundary` component để catch errors globally.
- Thêm images mới: `icon.png`, `landscaping.png`.
- Cải thiện UX với toast notifications và smooth transitions.
- Refactor layout structure cho rõ ràng hơn.

### [Commit 4f5f330] Admin & Student Frontend - HOÀN CHỈNH

**Admin Pages (9 trang):**
- **AdminDashboardPage**: Tổng quan với stats (tổng khóa học, đã xuất bản, tổng chương).
- **AdminCourseListPage**: CRUD courses với table view + search.
- **AdminCourseDetailPage**: Chi tiết course + quản lý chapters inline.
- **AdminChapterDetailPage**: Chi tiết chapter + quản lý topics + link đến final test builder.
- **AdminTopicDetailPage**: Chi tiết topic + tabs cho lessons/questions/practice config.
- **AdminLessonEditorPage**: Tạo/sửa lessons với markdown editor.
- **AdminQuestionEditorPage**: Tạo/sửa questions với format selection.
- **AdminPracticeConfigPage**: Cấu hình BKT practice (starting level, mastery thresholds, questions per level, limits).
- **AdminChapterFinalTestBuilderPage**: Tạo final test với slot/pool system (drag-drop style UI).

**Student Pages (8 trang):**
- **StudentDashboardPage**: Welcome screen + quick navigation cards.
- **StudentCourseCatalogPage**: Danh sách khóa học published với card layout.
- **StudentCourseDetailPage**: Chi tiết course + chapters list + completion tracking per chapter.
- **StudentChapterDetailPage**: Chi tiết chapter + topics list + mastery display (progress bars) + final test button.
- **StudentTopicDetailPage**: Chi tiết topic + lessons list + practice button.
- **StudentLessonViewPage**: Xem nội dung lesson (markdown rendering).
- **StudentPracticePage**: BKT adaptive practice session - real-time feedback, mastery updates, level changes.
- **StudentChapterTestPage**: Chapter final test - multi-step form, scoring, detailed results.

**Shared Pages:**
- **ProfilePage**: Xem profile + đổi mật khẩu với validation.

**Components & Infrastructure:**
- **AdminLayout**: Layout riêng cho admin với sidebar navigation + breadcrumbs.
- **adminApi.ts** (~280 dòng): Typed API helpers cho TẤT CẢ admin endpoints (Course/Chapter/Topic/Lesson/Question/FinalTest/PracticeConfig CRUD).
- **Type definitions**: `topic.ts`, `lesson.ts`, `question.ts` với enums và interfaces.

**UI/UX:**
- Consistent design language: rounded-2xl cards, shadow-cozy, cream/paw colors.
- Loading states và error handling đầy đủ cho tất cả pages.
- Responsive design với mobile-friendly navigation.
- Toast notifications cho user feedback.


### Trạng thái hiện tại

**Hoàn thành:** 
- Database (20 bảng) với BKT support
- Auth/JWT với role-based access
- 49 API endpoints (Admin CRUD + Student learning + BKT adaptive)
- BKT algorithm implementation
- Chapter test với slot/pool system
- **Frontend hoàn chỉnh: 17+ trang (9 Admin + 8 Student + shared pages)**
- **AdminLayout + ErrorBoundary + Toaster components**
- **adminApi.ts với typed helpers cho tất cả endpoints**
- **Full integration: UI ↔ API ↔ Database**


**Chưa có:** 
- Một số trang placeholder còn lại (HistoryPage, LearnPage, TestPage - có thể không cần thiết cho MVP)
- Recommendation engine (planned for future)
- Production infrastructure (Redis, logging, monitoring)

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
