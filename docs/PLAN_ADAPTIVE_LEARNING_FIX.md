# Plan: A2 (aggregate columns) + B3 (review loop) + C2 (adaptive question selection)

> Ngày: 2026-10-23 · Trạng thái: **ĐÃ HOÀN THÀNH** (Phase 1-5 xong, đã chạy migration + verify)
> Baseline audit: xem `PROJECT_KNOWLEDGE.md` (mục BKT) và báo cáo audit trong chat.
> Chi tiết kỹ thuật đã ghi trong `PROJECT_KNOWLEDGE.md` mục 6.

## Quyết định đã chốt (user)

| Hạng mục | Quyết định |
|---|---|
| Route đã xoá (`/student/topics/:topicId/practice`) | **Redirect** link về `/student/courses/:courseId/learn` |
| B3 mức khoá | **Light** — `review_required` là cảnh báo, KHÔNG khoá lộ trình |
| Điều kiện thoát `review_required` | Xem bài giảng (nếu topic có lesson) **+** N câu đúng liên tiếp |
| Ưu tiên chọn câu hỏi | **Weak-first** — ưu tiên câu hay sai, nhưng khoá mềm level hiện tại |
| Backfill dữ liệu cũ | **Full backfill** — tính lại mastery + counters từ `attempts` |
| Migration | **Chạy luôn** trên DB dev + verify bằng query |
| Pool khi đang `review_required` | **Weak-only** — chỉ câu user hay sai + câu mới level thấp hơn |

---

## Bối cảnh ràng buộc (đã verify từ DB)

- 16 topic × **10 câu practice** (level 1: 4, level 2: 3, level 3: 3) → bank mỏng.
- `question_format`: chỉ 1 giá trị `standard` (160/160) → phân loại theo dạng câu **không khả dụng**.
  → C2 dùng **mức độ sai theo câu** (`question_stats`), không dùng `question_format`.
- `lessons` chỉ có cho topic 23-26 (2-3 lesson/topic); 12 topic còn lại = **0 lesson**.
  → B3 cần fallback: không có lesson → bỏ qua bước "xem bài giảng", chỉ cần N câu đúng.
- `learning_events` 0 rows; enum `REMEDIAL_TRIGGERED` đã có sẵn → dùng để ghi nhận remedial.
- Alembic head hiện tại: `a7b8c9d0e1f2` (base `c1cc3590dc34`).

## Vấn đề nền tảng đã phát hiện (ngoài phạm vi A2/B3/C2, đã chọn "redirect")

`/student/topics/:topicId/practice` bị xoá route ở commit `aab09e1` nhưng **4 link vẫn trỏ tới**:
- `StudentTopicDetailPage.tsx:153`
- `StudentCourseDetailPage.tsx:766`
- `StudentLessonViewPage.tsx:188`, `:240`

→ user bấm là rơi vào catch-all `path="*"` → `/404`.
`StudentPracticePage.tsx` + `StudentLessonViewPage.tsx` còn import trong `App.tsx` nhưng **không route nào render** → dead code.

**Quan trọng:** trang luyện tập thật sự chạy là `CourseLearnPage.tsx` (route `/student/courses/:courseId/learn`).
→ Mọi thay đổi B3/C2 phía FE **phải sửa `CourseLearnPage.tsx`**, không phải `StudentPracticePage.tsx`.

---

## Phase 1 — Migration (A2 + C2 schema)

### File: `backend/alembic/versions/<rev>_add_bkt_evidence_and_question_stats.py`

**1a. `topic_mastery` — thêm cột evidence**

| Cột | Kiểu | Default | Ý nghĩa |
|---|---|---|---|
| `correct_count` | Integer | 0 | Tổng số câu đúng |
| `wrong_count` | Integer | 0 | Tổng số câu sai |
| `consecutive_wrong` | Integer | 0 | Chuỗi sai hiện tại (reset khi đúng) |
| `consecutive_correct` | Integer | 0 | Chuỗi đúng hiện tại (reset khi sai) |
| `recent_accuracy` | Float | 0.0 | Accuracy cửa sổ N lượt gần nhất |
| `review_resolved_at` | DateTime(tz) | NULL | Lúc user thoát `review_required` |
| `lesson_viewed_at` | DateTime(tz) | NULL | Lần cuối user mở bài giảng của topic |

**1b. Bảng mới `question_stats`** (C2)

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| `id` | Integer PK | |
| `user_id` | Integer FK users.id CASCADE | |
| `question_id` | Integer FK questions.id CASCADE | |
| `attempts` | Integer | default 0 |
| `wrong` | Integer | default 0 |
| `last_wrong_at` | DateTime(tz) | NULL |

- `UniqueConstraint(user_id, question_id)`
- Index `(user_id, question_id)`
- Index `(user_id, wrong)` để truy vấn "hay sai" nhanh

**1c. Backfill (full)**
- Với mỗi `(user_id, topic_id)` trong `attempts`:
  - recompute `correct_count`, `wrong_count`, `consecutive_wrong`, `consecutive_correct`
  - recompute `recent_accuracy` từ N lượt gần nhất
  - recompute `mastery` bằng **công thức mới** (chạy lại chuỗi attempt theo thứ tự `created_at, id`)
  - recompute `current_level` + `status` theo **luật mới**
- Với mỗi `(user_id, question_id)`: `attempts`, `wrong`, `last_wrong_at`

**Backfill phải chạy bằng Python** (không SQL thuần) vì cần chạy lại BKT tuần tự.

---

## Phase 2 — Backend core (A2 + B3 + C2)

### 2a. `backend/app/mastery/service.py` — công thức & luật mới

**Công thức BKT sửa (chặn transit khi sai):**
```python
def calculate_bkt_update(p_mastery, is_correct, p_transit, p_slip, p_guess):
    # ... Bayesian update như cũ -> p_mastery_after_answer
    # QUAN TRỌNG: chỉ cộng transit khi trả lời ĐÚNG
    if is_correct:
        p_mastery_new = p_after + (1 - p_after) * p_transit
    else:
        p_mastery_new = p_after
    return clamp(p_mastery_new)
```

**Hằng số mới:**
```python
LEVEL_UP_MASTERY = 0.85
COMPLETION_MASTERY = 0.85
REVIEW_MASTERY = 0.35
MIN_ATTEMPTS_FOR_COMPLETION = 8
MIN_RECENT_ACCURACY = 0.6
RECENT_WINDOW = 5
CONSECUTIVE_WRONG_FOR_REVIEW = 3
CONSECUTIVE_CORRECT_TO_CLEAR_REVIEW = 3
```

**Luật `status` mới (thứ tự ưu tiên):**
```python
# 1. Đã vào review → chỉ thoát khi đủ điều kiện
if was_review_required:
    if consecutive_correct >= CONSECUTIVE_CORRECT_TO_CLEAR_REVIEW and lesson_ok:
        status = "in_progress"  (hoặc "completed" nếu đủ evidence)
    else:
        status = "review_required"   # giữ nguyên
# 2. Mới: chuỗi sai >= 3 → review_required
# 3. Mới: mastery >= 0.85 AND attempts >= 8 AND recent_accuracy >= 0.6 → completed
# 4. else in_progress
```

**`lesson_ok`**: nếu topic KHÔNG có lesson → coi như đạt (bỏ qua bước xem bài giảng).
Nếu topic CÓ lesson → cần `lesson_viewed_at` > `review_triggered_at`.

### 2b. `backend/app/mastery/model.py` — thêm cột (map với migration)

### 2c. `backend/app/questions/repository.py` — C2 selection

Hàm mới: `get_practice_questions_for_selection(db, user_id, topic_id, level, ...)`
- Lấy pool theo `level` hiện tại ± 1
- Loại câu đã làm trong **cửa sổ gần đây** (không loại vĩnh viễn)
- Gắn `wrong_rate` từ `question_stats`

### 2d. `backend/app/learning/service.py` — `get_next_practice_question` (C2)

**Thứ tự ưu tiên (weak-first, khoá mềm level):**
1. Nếu `status == review_required` → pool = **weak-only**: câu user hay sai (`wrong_rate` cao) ở level <= hiện tại, + câu chưa làm ở level thấp hơn
2. Ngược lại:
   - Ưu tiên câu **chưa làm** ở level hiện tại
   - Nếu hết → câu **hay sai** ở level hiện tại
   - Nếu hết → câu chưa làm ở level `current_level - 1` (dễ hơn)
   - Nếu hết → câu chưa làm ở level `current_level + 1` (khó hơn)
   - Nếu hết → câu chưa làm ở **bất kỳ level** nào
   - Nếu vẫn hết → fallback câu đã làm (nhưng **ưu tiên câu sai lâu nhất chưa ôn**)

**Fallback "không đủ câu phù hợp":** trả `next_question = None` + `selection_note` giải thích, thay vì chọn câu không phù hợp.

### 2e. `backend/app/questions/model.py` + file mới `question_stats.py`
Model `QuestionStat` (user_id, question_id, attempts, wrong, last_wrong_at).

### 2f. Ghi `LearningEvent(REMEDIAL_TRIGGERED)`
Khi lần đầu chuyển sang `review_required` → tạo 1 `LearningEvent` với `attempt_id` hiện tại.

---

## Phase 3 — API / Schema response

### `backend/app/learning/schemas.py`
- `TopicMasteryResponse` thêm: `correct_count`, `wrong_count`, `consecutive_wrong`, `consecutive_correct`, `recent_accuracy`, `review_required`, `suggested_lesson_id`
- `AnswerSubmitResponse` thêm: `review_required: bool`, `suggested_lesson_id: int | None`, `selection_note: str | None`, `review_progress: dict`
- `QuestionResponse` thêm: `is_retry: bool`, `selection_reason: str | None`

### Endpoint mới
- `POST /learning/topics/{topic_id}/review/lesson-viewed` → đánh dấu user đã xem bài giảng (set `lesson_viewed_at`)

---

## Phase 4 — Frontend

### 4a. `frontend/src/App.tsx` — thêm route
- `/student/lessons/:lessonId` → `StudentLessonViewPage` (đang import nhưng chưa route → dead code)
- `/student/topics/:topicId/practice` → redirect sang `/student/courses/:courseId/learn?tab=practice&topic=:topicId`
  (cần resolve topic → course_id)

### 4b. Sửa link 404
- `StudentTopicDetailPage.tsx:153` → `/student/courses/:courseId/learn?tab=practice&topic=:id`
- `StudentCourseDetailPage.tsx:766` → tương tự
- `StudentLessonViewPage.tsx:188,240` → tương tự

### 4c. `frontend/src/pages/student/CourseLearnPage.tsx` — PracticeView (B3)
- Hiện banner đỏ khi `status === 'review_required'`: "Cần ôn lại" + progress `consecutive_correct / 3`
- Nút "Xem lại bài giảng" (nếu `suggested_lesson_id`) → điều hướng tới lesson inline
- Nút "Ôn lại" → bắt đầu chế độ củng cố
- Hiện `selection_note` khi không đủ câu phù hợp

### 4d. `StudentTopicDetailPage.tsx` — hiện trạng thái review chi tiết hơn

---

## Phase 5 — Verify

1. `alembic upgrade head` — chạy trên DB dev
2. Query verify backfill: so sánh mastery cũ vs mới cho uid=11/12/14
3. Unit-ish test bằng script Python: 2 câu đúng → KHÔNG completed; sai 3 liên tiếp → review_required; đúng 3 liên tiếp sau review → thoát
4. `npm run build` (frontend) — phải sạch
5. Cập nhật `PROJECT_KNOWLEDGE.md`

---

## Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Backfill đổi mastery của user cũ → UI đổi hành vi | Đã chấp nhận ("full backfill"); ghi log trước/sau |
| 16/16 topic thiếu lesson → bước "xem bài giảng" không có đích | Fallback: không có lesson → bỏ qua bước đó |
| Bank chỉ 10 câu/topic → weak-only có thể hết câu | Fallback về "câu chưa làm level thấp hơn" rồi mới báo `selection_note` |
| `current_level` có thể nhảy vì đổi luật | `LEVEL_UP_MASTERY` 0.85 + `MIN_ATTEMPTS` chặn việc lên level quá sớm |

---

## Ket qua trien khai (2026-10-23)

### Da thay doi

**Backend:**
- mastery/service.py - sua cong thuc BKT (chi cong transit khi dung), them evidence counters,
  them _decide_status() / _has_completion_evidence() / mark_lesson_viewed(), them MIN_ATTEMPTS_FOR_REVIEW
- mastery/model.py - them 7 cot evidence (correct_count, wrong_count, consecutive_*, recent_accuracy,
  review_triggered_at, lesson_viewed_at, review_resolved_at)
- questions/stat_model.py (MOI) - bang question_stats
- questions/repository.py - them get_all_practice_questions(), get_question_wrong_rates(), upsert_question_stat()
- ttempts/repository.py - them get_recent_attempted_question_ids() (cua so 12 luot), get_recent_results()
- learning/service.py - viet lai select_next_question() (weak-first), them remedial event ghi,
  them _build_review_progress(), mark_review_lesson_viewed()
- learning/schemas.py - them field moi vao QuestionResponse / AnswerSubmitResponse / TopicMasteryResponse
- learning/router.py - them endpoint POST /learning/topics/{id}/review/lesson-viewed
- content/schemas.py + service.py + outer.py - them course_id vao TopicSummary
- lembic/versions/b9e3a1c7d204_...py (MOI) - migration + full backfill

**Frontend:**
- components/ReviewBanner.tsx (MOI) - banner B3 voi 2 buoc: xem bai giang + N cau dung
- CourseLearnPage.tsx - them review banner, selection reason, them chapterId cho practice
- StudentPracticePage.tsx - them review banner, selection reason
- StudentTopicDetailPage.tsx - them course_id, sua link 404
- StudentCourseDetailPage.tsx - sua link 404
- StudentLessonViewPage.tsx - them course_id, sua link 404
- App.tsx - khoi phuc route /student/lessons/:lessonId + /student/topics/:topicId/practice

### Ket qua verify

| Truoc | Sau |
|-------|-----|
| uid=11 topic=23 (2 cau dung): 0.9095, level 3, completed | 0.9095, level 2, in_progress |
| uid=12 topic=24 (19 cau, 4 dung): 0.8972, level 3, completed | 0.6030, level 1, eview_required |
| tat ca topic sai nhieu deu completed | 8 topic eview_required, 25 in_progress |

| Test case | Ket qua |
|-----------|---------|
| 2 cau dung lien tiep | in_progress (KHONG completed) |
| 8 cau dung lien tiep | completed |
| 3 cau sai (nguoi moi, <4 luot) | in_progress (KHONG phat) |
| 4 cau sai lien tiep | eview_required |
| 19 cau / 4 dung | eview_required (KHONG completed) |
| sai 4 -> dung 3 | in_progress (da thoat review) |
| Topic co lesson, chua xem bai giang + dung 3 | van eview_required (dung) |
| C2 chon cau khi dang review | chon cau hay sai (wrong=1/1) |
| C2 topic moi | chon cau moi level 1 |

### Con lai (khong lam trong dot nay)

- QUESTIONS_PER_SESSION = 8 van chua dung o dau (dead constant)
- 12/16 topic chua co lessons -> buoc "xem bai giang" bi bo qua
- question_format chi co 1 gia tri standard -> chua phan loai duoc theo dam cau hoi
- Chua co test tu dong (pytest) - verify bang script Python thu cong
