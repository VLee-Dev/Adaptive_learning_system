# PLAN — Đơn giản hoá BKT + luật luyện tập tối giản

> Ngày lập: 2026-10-23 (cập nhật 21:30 sau khi chốt 3 điểm còn lại)
> Trạng thái: đang thực hiện
> Quyết định đã chốt với người dùng trước khi lập plan:
> 1. Giữ BKT nhưng **giới hạn bước nhảy mỗi lượt** (rate-limit), không thay thuật toán.
> 2. Luật level: vào luôn **2**; ≥0.70 → **3**; <0.35 → **1**; còn lại → **2**.
> 3. "Hãy học kỹ hơn" là **một thông báo hướng về bài giảng**, không phải trạng thái chặn.
> 4. Pass thỏa **một trong hai**: (5 đúng liên tiếp + BKT ≥0.85) **hoặc** (≥20 câu + ≥10 đúng).
> 5. Xóa **toàn bộ** dead code + cột DB không còn đọc (có migration).
> 6. **Cảnh báo (chốt 21:30):** `5 sai liên tiếp` → nhắc học lại (KHÔNG cần điều kiện
>    mastery) **HOẶC** `mastery < 0.30` **VÀ** `3 sai liên tiếp` → nhắc sớm hơn.
> 7. **Thứ tự (chốt 21:30):** viết hết code chức năng trước, xong mới clear dead code.
>    Không làm 2 việc song song.
> 8. **Sau khi pass (chốt 21:30):** bấm luyện lại → **không tính BKT**, không cộng
>    `practice_attempts`; chỉ ghi số câu đúng/sai và câu nào đúng câu nào sai.

---

## 0. Phát hiện quan trọng khi lập plan

### 0.1 BKT thuần KHÔNG thể làm chậm được

Mô phỏng với toàn bộ tổ hợp tham số hợp lý (chạy trước khi viết plan):

| Tham số (transit/slip/guess) | 5 sai | 5 đúng | 15 đúng |
|---|---|---|---|
| 0.20/0.10/0.25 (hiện tại) | 0.0000 | 0.9989 | 1.0000 |
| 0.06/0.06/0.12 ("cực khó") | 0.0000 | 0.9999 | 1.0000 |
| 0.04/0.04/0.08 (tuyệt đối) | 0.0000 | 1.0000 | 1.0000 |

Kết luận: hạ `p_transit` xuống 0.04 **không làm BKT chậm đi**, vì bước Bayes đã đẩy mastery lên ~0.99 trước khi `p_transit` kịp tác động. Muốn chậm phải can thiệp **sau** Bayes → rate-limit bước nhảy.

### 0.2 Tham số rate-limit đã kiểm chứng

Chọn `CAP_UP = 0.15`, `CAP_DOWN = 0.10`. Kết quả mô phỏng (14 kịch bản):

| Kịch bản | BKT cuối | Đạt yêu cầu |
|---|---|---|
| 5 sai từ 0.30 | 0.0003 | ✅ < 0.30 |
| 5 sai từ 0.50 | 0.0146 | ✅ |
| 5 sai từ 0.70 | 0.2000 | ✅ |
| 5 sai từ 0.90 | 0.4000 | ⚠️ **không đạt** |
| 5 đúng từ 0.30 | 0.9760 | ✅ ≥ 0.85 |
| 5 đúng từ 0.40 | 0.9915 | ✅ |
| 5 đúng từ 0.50 | 0.9973 | ✅ |
| 5 đúng từ 0.60 | 0.9988 | ✅ |

### 0.3 Điểm cần bạn quyết trong Task 3

Từ mastery 0.90, **5 câu sai liên tiếp chỉ đưa BKT xuống 0.40**, không dưới 0.30.
Lý do: `CAP_DOWN = 0.10` × 5 lượt = giảm tối đa 0.50.

→ Đây là hệ quả trực tiếp của yêu cầu "**giảm cũng chậm**".

**Hai lựa chọn khi tới Task 3:**

- **3a.** Giữ nguyên `CAP_DOWN = 0.10`, chấp nhận cảnh báo chỉ bắt đầu từ mastery ≤ ~0.79.
  Đổi lại: giảm thật chậm đúng như bạn yêu cầu.
- **3b.** Kiểm tra cảnh báo bằng **điều kiện kép**: `5 sai liên tiếp` **HOẶC** `BKT < 0.30`.
  Đổi lại: đúng ý "BKT nhỏ hơn 0.30", nhưng câu thứ 5 từ mastery cao vẫn ra cảnh báo
  dù BKT còn 0.40 → nghĩa là không còn "dưới ngưỡng 0.30" nữa.

Tôi sẽ dừng ở Task 3 để bạn chọn, không tự quyết.

---

## 1. Phạm vi

### 1.1 Giữ lại

| Hạng mục | Lý do |
|---|---|
| BKT 4 tham số (`p_transit`/`p_slip`/`p_guess`) | Thuật toán lõi, chỉ thêm rate-limit |
| `topic_mastery.mastery` | Giá trị BKT hiện tại |
| `topic_mastery.current_level` | Sửa thành luật 1/2/3 theo ngưỡng BKT |
| `topic_mastery.status` | `in_progress` / `completed` |
| `topic_mastery.consecutive_correct` / `consecutive_wrong` | Điều kiện 5 câu liên tiếp |
| `topic_mastery.practice_attempts` | Đếm 20 câu |
| `question_stats.weakness` | Chọn câu weak-first |
| `attempts` | Lịch sử làm bài, đếm đúng/sai |
| `lessons` | Bài giảng để link khi cảnh báo |

### 1.2 Xóa (dead code)

| Hạng mục | Lý do xóa |
|---|---|
| `mastery/service.py`: `MIN_ATTEMPTS_FOR_REVIEW` | Không còn luật "đủ số lượt mới xét review" |
| `mastery/service.py`: `CLEAR_MIN_ATTEMPTS`, `CLEAR_MIN_ACCURACY` | Đường phục hồi bị luật mới thay thế |
| `mastery/service.py`: `MIN_ATTEMPTS_FOR_COMPLETION`, `MIN_RECENT_ACCURACY`, `RECENT_WINDOW` | Luật completed mới không dùng |
| `mastery/service.py`: `REVIEW_MASTERY` | Không còn là điều kiện OR |
| `mastery/service.py`: `_recent_results_from_mastery` | Chỉ phục vụ `recent_accuracy` |
| `mastery/service.py`: `compute_recent_accuracy` | Không còn dùng |
| `mastery/service.py`: `_count_attempts_since` | Chỉ phục vụ đường phục hồi |
| `mastery/service.py`: `topic_has_lessons` | Chuyển thành truy vấn lesson trực tiếp |
| `mastery/model.py`: cột `recent_accuracy` | Không còn đọc |
| `mastery/model.py`: cột `wrong_count` | Không còn đọc |
| `mastery/model.py`: cột `correct_count` | Không còn đọc |
| `mastery/model.py`: cột `review_resolved_at` | Không còn đọc |
| `mastery/model.py`: cột `review_triggered_at` | Không còn đọc |
| `mastery/model.py`: cột `lesson_viewed_at` | Chỉ cần link bài giảng, không cần theo dõi thời điểm xem |
| `questions/stat_model.py`: `recent_wrong_streak` | Không dùng để chọn câu |
| `questions/stat_model.py`: `last_correct_at` | Không dùng |
| `questions/stat_model.py`: `wrong_rate` (property) | FE không dùng |
| `learning/service.py`: `MAX_LEVEL_OFFSET`, `REVIEW_MAX_LEVEL_OFFSET` | Gộp theo luật level mới |
| `learning/service.py`: `REPEAT_PENALTY_IN_SESSION` | Gộp |
| `learning/service.py`: `_build_review_progress` | Không còn trạng thái review |
| `learning/service.py`: `mark_review_lesson_viewed` | Không còn vòng lặp ôn |
| `learning/router.py`: `POST /review/lesson-viewed` | Endpoint chết |
| `learning/schemas.py`: `PracticeStartRequest/Response` | Không dùng |
| `learning/schemas.py`: `review_progress` trong 3 schema | Không còn trạng thái review |
| `learning_events`: `REMEDIAL_TRIGGERED` + `source_attempt_id` FK | Không còn vòng lặp ôn |
| `components/ReviewBanner.tsx` | Xóa hẳn — cảnh báo không còn là trạng thái |

### 1.3 Thay thế bằng

| Mới | Thay cho |
|---|---|
| `MASTERY_WARN = 0.30` + `consecutive_wrong >= 5` | `review_required` + `ReviewBanner` |
| `AnswerSubmitResponse.warning` | `status == 'review_required'` |
| `AnswerSubmitResponse.lesson_url` | `suggested_lesson_id` |
| `QuestionStat.wrong_rate` (property, đọc-only cho API) | giữ nếu FE cần hiển thị; xóa nếu không |

---

## 2. Task list

| # | Task | Phụ thuộc | Ước lượng |
|---|---|---|---|
| **1** | Ghi constants BKT mới + rate-limit vào `calculate_bkt_update` | — | S |
| **2** | Viết lại luật level (1/2/3 theo ngưỡng) + `STARTING_LEVEL = 2` | 1 | S |
| **3** | Luật cảnh báo 5 sai (⏸ chờ bạn chọn 3a/3b) | 1 | S |
| **4** | Luật pass: 5 đúng liên tiếp + BKT≥0.85 **hoặc** 20 câu/≥10 đúng | 1, 2 | M |
| **5** | Rút gọn `mastery/service.py` + `mastery/model.py` (xóa dead code) | 1-4 | M |
| **6** | Rút gọn `learning/service.py` (chọn câu + response) | 4, 5 | M |
| **7** | Rút gọn router + schemas + xóa endpoint chết | 6 | S |
| **8** | Migration: drop 7 cột DB | 5, 7 | M |
| **9** | Backfill `current_level` = 2 cho các bản ghi cũ | 8 | S |
| **10** | Frontend: `StudentPracticePage` — cảnh báo + link bài giảng + màn pass | 6, 7 | M |
| **11** | Frontend: `CourseLearnPage` — đồng bộ với (10) | 6, 7 | M |
| **12** | Xóa `ReviewBanner.tsx` + `question_format` không dùng | 10, 11 | S |
| **13** | Verify: script mô phỏng đầu-cuối trên DB thật | 1-12 | M |
| **14** | Cập nhật `PROJECT_KNOWLEDGE.md` | 13 | S |

---

## 3. Chi tiết từng task

### Task 1 — Rate-limit BKT

**File:** `backend/app/mastery/service.py`

Thêm constants:

```python
# ===== RATE LIMIT — làm BKT "chậm" (2026-10-23) =====
# BKT thuần phản ứng quá nhanh: mô phỏng cho thấy mọi bộ tham số hợp lý đều
# cho 5 câu đúng → ~0.999, hạ p_transit xuống 0.04 cũng không chậm đi (bước
# Bayes đã đẩy mastery lên ~0.99 trước khi p_transit kịp tác động).
# → Can thiệp SAU Bayes: giới hạn độ chênh mỗi lượt.
MASTERY_CAP_UP = 0.15      # tối đa +0.15 mỗi câu đúng
MASTERY_CAP_DOWN = 0.10    # tối đa -0.10 mỗi câu sai
```

Sửa `calculate_bkt_update`:

```python
def calculate_bkt_update(p_mastery, is_correct, p_transit, p_slip, p_guess) -> float:
    # ... phần Bayes giữ nguyên ...
    raw = max(0.0, min(1.0, p_mastery_new))

    # Rate-limit bước nhảy (xem MASTERY_CAP_UP/DOWN)
    if raw > p_mastery:
        return min(raw, p_mastery + MASTERY_CAP_UP)
    return max(raw, p_mastery - MASTERY_CAP_DOWN)
```

**Verify:** chạy `_tmp_sim4.py` — 14 kịch bản, kỳ vọng 13/14 (1 kịch bản giới hạn ghi ở Task 3).

---

### Task 2 — Luật level 1/2/3

**File:** `backend/app/mastery/service.py`

```python
STARTING_LEVEL = 2             # vào luôn level 2
LEVEL_UP_MASTERY = 0.70        # ≥0.70 → level 3
LEVEL_DOWN_MASTERY = 0.35      # <0.35 → level 1
MAX_LEVEL = 3
```

Thay khối luật level trong `apply_evidence`:

```python
def _decide_level(mastery: TopicMastery) -> int:
    """
    Level là hàm thuần của mastery, không phải biến tích lũy.

    ≥0.70 → 3 · <0.35 → 1 · còn lại → 2.

    Trước đây level tăng/giảm theo kiểu bước nhảy (+1/-1 mỗi lượt vượt ngưỡng),
    nên một lượt đúng có thể đưa mastery lên 0.97 → level nhảy thẳng 1→3 rồi
    đứng yên, và khi mastery chỉ tụt nhẹ (0.97 → 0.90) thì vẫn giữ level 3.
    Dạng hàm thuần này khiến level luôn khớp với mastery hiện tại.
    """
    if mastery.mastery >= LEVEL_UP_MASTERY:
        return MAX_LEVEL
    if mastery.mastery < LEVEL_DOWN_MASTERY:
        return 1
    return 2
```

Cập nhật `TopicMastery.current_level` default = 2.

---

### Task 3 — Luật cảnh báo (✅ ĐÃ CHỐT 21:30)

**Không còn dừng chờ.** Điều kiện cảnh báo (thông báo, KHÔNG phải status):

```python
WARN_MASTERY = 0.30                 # ngưỡng BKT
CONSECUTIVE_WRONG_FOR_WARN = 5      # sai 5 câu liên tiếp → nhắc học lại
CONSECUTIVE_WRONG_LOW_MASTERY = 3   # sai 3 câu liên tiếp + BKT < 0.30 → nhắc sớm
```

Điều kiện ra cảnh báo (OR):

```python
def _should_warn(mastery: TopicMastery) -> bool:
    if mastery.consecutive_wrong >= CONSECUTIVE_WRONG_FOR_WARN:
        return True
    return (
        mastery.mastery < WARN_MASTERY
        and mastery.consecutive_wrong >= CONSECUTIVE_WRONG_LOW_MASTERY
    )
```

Cảnh báo là **một trường trong response**, không phải status:

```python
AnswerSubmitResponse.warning = "Bạn nên học kỹ hơn chủ đề này" | None
AnswerSubmitResponse.lesson_url = "/student/lessons/{id}" | None
```

`status` chỉ còn 2 giá trị: `in_progress`, `completed`. Đây là điểm bạn đã chốt:
*"không phải là một trạng thái đó là một thông báo"*.

Khác biệt giữa 3a và 3b nằm ở điều kiện:

| | Điều kiện cảnh báo | Hệ quả |
|---|---|---|
| **3a** | `consecutive_wrong >= 5` VÀ `mastery < 0.30` | Từ mastery cao, 5 sai không cảnh báo (BKT còn 0.40) |
| **3b** | `consecutive_wrong >= 5` HOẶC `mastery < 0.30` | Cảnh báo đúng từ câu 5, nhưng không còn "dưới 0.30" |

**→ ĐÃ CHỐT (21:30): chọn 3b — điều kiện OR.** Cụ thể:
- sai **5 câu liên tiếp** → nhắc học lại (không cần điều kiện mastery)
- **HOẶC** sai **3 câu liên tiếp** khi BKT **< 0.30** → nhắc học lại sớm hơn

Theo đúng câu bạn nói: *"nếu đã dưới 0.3 mà còn sai liên tục 3 câu thì cũng bị nhắc
học lại"*.

Tôi nghiêng về **3b** vì giữ đúng tinh thần yêu cầu của bạn (sai 5 câu liên tục thì
được nhắc học kỹ, bất kể BKT đang ở mấy), và vì 3a tạo ra trạng thái lạ: người học
sai liên tục 20 câu mà không bao giờ thấy cảnh báo.

---

### Task 4 — Luật pass

**File:** `backend/app/mastery/service.py`

```python
PASS_MASTERY = 0.85
CONSECUTIVE_CORRECT_TO_PASS = 5
MAX_QUESTIONS_PER_TOPIC = 20
MIN_CORRECT_TO_PASS = 10      # đạt 10/20 câu thì pass
```

```python
def _has_passed(mastery: TopicMastery) -> bool:
    """
    Pass khi thỏa MỘT trong hai đường:

    1. Chuỗi: 5 câu đúng liên tiếp VÀ BKT ≥ 0.85.
       Điều kiện BKT là độc lập — không phải "5 câu phải đẩy BKT lên 0.85".
       Với rate-limit, 5 câu đúng từ p_init=0.30 cho BKT 0.976 (đã kiểm chứng),
       nên hai vế thường xảy ra cùng lúc; vế BKT chặn trường hợp chuỗi đúng
       kéo dài nhưng BKT vẫn thấp (ví dụ đang hồi từ 5 câu sai).

    2. Số lượng: làm đủ 20 câu VÀ đúng ≥ 10.
       Đường này cho người học tiến bộ đều đặn mà không cần chuỗi đúng hoàn hảo.
    """
    streak_ok = (
        mastery.consecutive_correct >= CONSECUTIVE_CORRECT_TO_PASS
        and mastery.mastery >= PASS_MASTERY
    )
    volume_ok = (
        mastery.practice_attempts >= MAX_QUESTIONS_PER_TOPIC
        and (mastery.practice_attempts - mastery.wrong_count) >= MIN_CORRECT_TO_PASS
    )
    return streak_ok or volume_ok
```

> Ghi chú kỹ thuật: `practice_attempts - wrong_count` = số câu đúng. Nhưng `wrong_count`
> đang trong danh sách xóa của Task 5. Quyết định: **giữ `wrong_count`**, vì luật 20 câu
> cần nó. Đây là ngoại lệ duy nhất so với danh sách xóa ban đầu — tôi sẽ bỏ nó khỏi
> danh sách nếu bạn muốn dùng truy vấn `COUNT` thay vì denormalize.

Về giới hạn 20 câu bạn đã nói: *"đề cương phải ≥20 câu hơn thì gen ngẫu nhiên ra, hiện
tại ít hơn 20 thì cứ cho lặp lại"*. Nghĩa là:

- Nếu topic có **≥20 câu**: sau 20 câu không chọn lại câu cũ.
- Nếu topic có **<20 câu**: cho phép lặp để đủ 20 lượt.
- Sau khi **đã pass**: cho làm lại tuỳ ý, chỉ ghi thống kê (số câu đúng, câu nào sai),
  không tính vào `practice_attempts` nữa.

→ Task 6 sẽ cần cờ `has_passed` để phân biệt lượt "thi" và lượt "củng cố".

---

### Task 5 — Rút gọn `mastery/`

Xóa các hằng số/hàm trong §1.2. Đổi tên `status` để rõ nghĩa:

```python
# status chỉ còn 2 giá trị sau khi bỏ vòng lặp ôn
STATUS_IN_PROGRESS = "in_progress"
STATUS_COMPLETED = "completed"
```

Sửa docstring đầu file — hiện mô tả 3 lỗi đã sửa, không còn khớp code sau khi rút gọn.

---

### Task 6 — Rút gọn `learning/service.py`

**Chọn câu** — bỏ phân nhánh theo `status` (không còn trạng thái review):

```
1. Chưa từng làm, level hiện tại
2. Chưa từng làm, level dễ hơn
3. Chưa từng làm, level khó hơn
4. Chưa làm gần đây, mọi level
5. Câu hay sai (weakness cao)
6. Bất kỳ câu nào còn lại
```

Giữ nguyên cơ chế `weakness` có suy giảm + phạt lặp trong phiên.

**Response** — thay `review_progress` + `suggested_lesson_id` bằng:

```python
class AnswerSubmitResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str | null
    mastery: float            # BKT hiện tại
    current_level: int
    status: str               # in_progress | completed
    next_question: QuestionResponse | null
    selection_note: str | null
    # Thông báo (KHÔNG phải trạng thái)
    warning: str | None
    lesson_url: str | None
    # Lượt thi đã dùng / đạt chưa
    attempts_used: int
    attempts_limit: int
    passed: bool
    # Sau khi đã pass: chỉ ghi thống kê củng cố
    is_extra_practice: bool
```

---

### Task 7 — Router + schemas

- Xóa `POST /topics/{id}/review/lesson-viewed`
- Xóa `review_progress` khỏi `TopicMasteryResponse`
- Xóa `PracticeStartRequest` / `PracticeStartResponse`
- Thêm `warning`, `lesson_url`, `attempts_used`, `attempts_limit`, `passed`, `is_extra_practice`

---

### Task 8 — Migration drop cột

**File:** `backend/alembic/versions/<rev>_drop_dead_mastery_columns.py`

```python
def upgrade() -> None:
    op.drop_column('topic_mastery', 'recent_accuracy')
    op.drop_column('topic_mastery', 'correct_count')
    op.drop_column('topic_mastery', 'review_triggered_at')
    op.drop_column('topic_mastery', 'lesson_viewed_at')
    op.drop_column('topic_mastery', 'review_resolved_at')
    op.drop_column('question_stats', 'recent_wrong_streak')
    op.drop_column('question_stats', 'last_correct_at')
```

**Cần kiểm trước khi drop `lesson_viewed_at`:** grep toàn repo xem có chỗ nào khác đọc cột này không.

---

### Task 9 — Backfill level

```sql
UPDATE topic_mastery SET current_level = 2;
```

Và tính lại `current_level` theo mastery hiện tại cho đúng luật mới:

```sql
UPDATE topic_mastery
SET current_level = CASE
    WHEN mastery >= 0.70 THEN 3
    WHEN mastery <  0.35 THEN 1
    ELSE 2 END;
```

---

### Task 10-12 — Frontend

| File | Việc |
|---|---|
| `StudentPracticePage.tsx` | Hiện `warning` + nút "Xem lại bài giảng" dùng `lesson_url`; màn pass hiện tổng kết; thanh tiến độ 20 câu |
| `CourseLearnPage.tsx` | Đồng bộ (10) |
| `ReviewBanner.tsx` | **Xóa hẳn** |

---

### Task 13 — Verify

Script kiểm chứng trên DB thật (rollback cuối):

1. 5 sai liên tiếp từ BKT 0.30/0.50/0.70 → có `warning` + `lesson_url`
2. 5 sai từ 0.90 → kiểm tra đúng kỳ vọng đã chốt ở Task 3
3. 5 đúng liên tiếp → `status = completed`, `passed = true`
4. 20 câu / 10 đúng → `status = completed`
5. Level: BKT 0.30/0.50/0.69/0.70/0.90 → 2/2/2/3/3
6. Topic <20 câu → vẫn cho lặp đủ 20 lượt
7. Sau khi pass → `is_extra_practice = true`, không cộng `practice_attempts`
8. `GET /practice/next` sau 20 lượt → `note` đúng (không trả 404)

---

### Task 14 — Tài liệu

Cập nhật `PROJECT_KNOWLEDGE.md`:
- Thay mô tả luật BKT cũ (2 câu đúng → pass) bằng luật mới
- Thêm rate-limit vào phần công thức
- Xóa mô tả `review_required` / vòng lặp ôn
- Ghi nhận giới hạn 20 câu / chính sách gen ngẫu nhiên

---

## 4. Điểm cần bạn quyết trước khi tôi bắt đầu

| # | Câu hỏi | Vì sao chặn |
|---|---|---|
| **1** | Task 3: chọn **3a** hay **3b**? | Ảnh hưởng trực tiếp tới khi nào hiện cảnh báo |
| **2** | Giữ cột `wrong_count` cho luật 20 câu, hay xóa và dùng truy vấn `COUNT`? | Ảnh hưởng danh sách xóa cột ở Task 8 |
| **3** | Sau khi pass, `practice_attempts` có nên dừng lại không? | Tôi hiểu là **có** (từ câu bạn "không cần tính làm gì"), xác nhận lại |

---

## 5. Ghi chú kỹ thuật

### 5.1 Vì sao rate-limit thay vì đổi tham số
Đã nêu ở §0.1: hạ `p_transit` không có tác dụng vì bước Bayes chi phối. Rate-limit
can thiệp sau Bayes nên kiểm soát được tốc độ.

### 5.2 Hệ quả lên dữ liệu cũ
Rate-limit làm mastery cũ (tính bằng BKT không giới hạn) không còn khớp với công thức
mới. Ví dụ `uid=12 topic=30` đang có mastery 0.5789 — nếu replay lại chuỗi cũ với rate-limit,
giá trị sẽ khác. Cần quyết định: **replay lại toàn bộ** (chính xác, tốn thời gian) hay
**giữ nguyên** (nhanh, nhưng mastery cũ không tái lập được).

Tôi nghiêng về **replay** vì migration `b9e3a1c7d204` đã làm đúng việc này và có sẵn
code mẫu để tham chiếu.

### 5.3 `question_stats.wrong_rate`
FE không dùng property này. Nhưng nó là API công khai trong `QuestionStat`. Tôi để
trong danh sách xóa; nếu bạn muốn giữ (phục vụ báo cáo sau này) thì bỏ khỏi danh sách.

### 5.4 Rủi ro khi xóa `question_format`
Enum `QuestionFormat` có 5 giá trị nhưng mọi câu đều là `standard`. Xóa enum + cột là
một migration lớn không liên quan luật BKT. Tôi **không xóa** trong plan này — để riêng.