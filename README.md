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

### Trạng thái hiện tại

Đã hoàn thành hạ tầng database và migration. Chưa triển khai seed data, API, Auth, BKT service thực thi, adaptive practice service hoặc giao diện hoạt động.

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
npm install
npm run dev
```

Frontend hiện mới là skeleton; các màn hình sẽ được nối API ở Giai đoạn 3.

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

- Seed data.
- API route và Auth/JWT.
- BKT/recommendation implementation.
- Admin CRUD.
- Frontend learning flow.
