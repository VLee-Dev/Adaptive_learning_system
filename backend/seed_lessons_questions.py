"""Seed bài giảng + câu hỏi cho các topic chưa có nội dung (2026-10-23).

Bối cảnh
---------
Audit luyện tập cho thấy 12/16 topic (id 27-38, thuộc chương 2-4 của khóa
"Tiếng Anh Cơ Bản") chưa có bài giảng nào. Hệ quả trực tiếp:
- Bước "xem lại bài giảng" của vòng lặp ôn bị bỏ qua hoàn toàn vì
  `topic_has_lessons()` trả False.
- Mỗi topic chỉ có 10 câu practice (L1: 4, L2: 3, L3: 3) trong khi phiên
  luyện tập dài 8 câu → người học phải làm lại câu cũ ngay trong cùng buổi.

Script này:
1. Thêm bài giảng (content_type=text) cho 12 topic thiếu.
2. Bổ sung câu hỏi practice cho các topic có bank mỏng (< 15 câu).

Chạy: python backend/seed_lessons_questions.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy.orm import Session  # noqa: E402

import app.model_registry  # noqa: F401,E402
from app.lessons.model import Lesson, LessonContentType  # noqa: E402
from app.questions.model import (  # noqa: E402
    Question,
    QuestionFormat,
    QuestionPurpose,
)
from app.topics.model import Topic  # noqa: E402
from core.database import SessionLocal, engine  # noqa: E402
from sqlalchemy import func, select  # noqa: E402


# ===== BÀI GIẢNG CHO 12 TOPIC THIẾU =====
# Nội dung viết dạng markdown đơn giản, đúng cấp độ A1-A2 và bám sát tên topic.
LESSONS: dict[int, dict] = {
    27: {
        "name": "Thì hiện tại đơn (Simple Present)",
        "content": """# Thì hiện tại đơn (Simple Present)

## 1. Cấu trúc
Cấu trúc đơn giản nhất của tiếng Anh: **không chia động từ**.

    S + động từ nguyên mẫu + V (phần tử bổ sung)

    I drink coffee every morning.
    She works at a hospital.

## 2. Chia động từ với he/she/it

Với chủ ngữ **he / she / it**, động từ phải thêm **-s / -es**. Đây là lỗi
phổ biến nhất của người Việt học tiếng Anh.

| Dạng gốc | Thêm -s | Cách phát âm |
|----------|---------|--------------|
| work      | works   | /wɜːks/     |
| play      | plays   | /pleɪz/     |
| study     | studies | /ˈstʌdi/    |
| go        | goes   | /ɡəʊz/      |
| watch     | watches | /ˈwɒtʃɪz/   |

Quy tắc: chữ **o, s, x, ch, sh** → thêm **-es**; còn lại chỉ thêm **-s**.

## 3. Khi nào dùng?
Thì hiện tại đơn dùng cho **thói quen** và **sự thật hiển nhiên**, không
dùng để nói về hành động đang xảy ra.

    I eat breakfast at 7 am.          ← thói quen
    The sun rises in the east.        ← sự thật hiển nhiên
    She is eating right now.          ← KHÔNG dùng hiện tại đơn

## 4. Dạng phủ định và nghi vấn

Phủ định với he/she/it dùng **does not (doesn't)** + động từ NGUYÊN MẪU.

    She doesn't work on Sunday.       ← đúng
    She doesn't works on Sunday.      ← sai (đã có does, không thêm s)

    Hỏi: Do / Does + chủ ngữ + động từ nguyên mẫu?

    Does he like coffee?              ← đúng
    Does he likes coffee?             ← sai

## 5. Bài tập nhanh
1. She ______ (go) to school by bus.
2. My brother ______ (watch) TV every evening.
3. ______ they ______ (play) football on Sunday?
4. He ______ not ______ (like) spicy food.

**Đáp án:** 1. goes · 2. watches · 3. Do / play · 4. does / like
""",
    },
    28: {
        "name": "Thì quá khứ đơn (Simple Past)",
        "content": """# Thì quá khứ đơn (Simple Past)

## 1. Cấu trúc
Dùng cho hành động **đã xảy ra và kết thúc** trong quá khứ.

    S + động từ quá khứ + V

    I visited my grandmother last week.
    They finished the project yesterday.

## 2. Động từ bất quy tắc (irregular verbs)

Các động từ dưới đây **không thêm -ed**, phải học thuộc:

| V1        | V2 (quá khứ) | Dịch nghĩa      |
|-----------|---------------|-----------------|
| be        | was / were   | là              |
| go        | went         | đi              |
| come      | came         | đến            |
| do        | did          | làm             |
| have      | had          | có              |
| see       | saw          | nhìn thấy       |
| eat       | ate          | ăn              |
| drink     | drank        | uống            |
| buy       | bought       | mua             |
| take      | took         | lấy/đi          |
| write     | wrote        | viết            |
| speak     | spoke        | nói             |

## 3. Động từ bất quy tắc dạng quá khứ kết thúc bằng -t / -d

    cost → cost      cut → cut       fit → fit
    get → got        put → put       set → set

## 4. Phủ định và nghi vấn
Dùng **did not (didn't)** + động từ NGUYÊN MẪU.

    She didn't go to work.            ← đúng
    She didn't went to work.          ← sai

    Did you finish your homework?     ← đúng
    Did you finished your homework?   ← sai

Sau **did** động từ luôn trở về nguyên mẫu — đây là điểm cốt lõi.

## 5. Dấu hiệu nhận biết
Nhớ các từ này là thì quá khứ: **yesterday, last night/week/year, ago,
in 2020, when I was young, this morning**.

## 6. Bài tập nhanh
1. We ______ (go) to the zoo last Sunday.
2. He ______ (buy) a new phone yesterday.
3. ______ you ______ (see) the film last night?
4. They ______ not ______ (come) to the party.

**Đáp án:** 1. went · 2. bought · 3. Did / see · 4. did / come
""",
    },
    29: {
        "name": "Thì tương lai (Future Simple - will/going to)",
        "content": """# Thì tương lai: will và going to

## 1. Hai cách nói tương lai

Tiếng Anh có **hai** cấu trúc tương lai, dùng cho hai ý khác nhau:

| Cấu trúc      | Dùng cho                                   | Ví dụ                       |
|---------------|--------------------------------------------|-----------------------------|
| **will**      | quyết định/đoán lúc nói, hoặc sự thật chung | I **will call** you later.  |
| **going to**  | kế hoạch đã có từ trước, có dấu hiệu        | I **am going to visit** my parents. |

Sau cả hai, **động từ luôn ở nguyên mẫu**, không chia.

## 2. will + động từ nguyên mẫu

    He will be 20 next year.
    I think it will rain this afternoon.

Dạng phủ định / nghi vấn:

    She will not come.  /  She won't come.
    Will you help me?   →  Yes, I will.

## 3. going to + động từ nguyên mẫu

    They are going to move to Da Nang.
    What are you going to do this weekend?

Phủ định / nghi vấn:

    I am not going to eat meat.
    Are they going to join us?

## 4. Dấu hiệu phân biệt

    I am going to buy a car.     → đã có ý định từ lâu
    I'll help you with that.      → quyết định ngay lúc nói

    Look at those clouds! It's going to rain.   → dự đoán có căn cứ nhìn thấy
    I think it will rain.                      → dự đoán chung

## 5. Bài tập nhanh
1. Look at that car! It ______ (come) towards us.
2. We ______ (have) dinner at 7 tonight. — (kế hoạch từ trước)
3. ______ you ______ (send) me the file later?
4. They ______ (not / go) to Da Nang last week.

**Đáp án:** 1. is coming · 2. are going to have · 3. Will / send · 4. did not go
""",
    },
    30: {
        "name": "Trợ động từ Be, Do, Have",
        "content": """# Ba trợ động từ: be, do, have

Đây là ba động từ được dùng **nhiều nhất** trong tiếng Anh. Chúng không đứng
một mình mà đóng vai trò trợ giúp cho động từ khác.

## 1. BE — động từ nối (linking verb)

Dùng sau: chủ ngữ + **be** + danh từ/tính từ/ngạnh từ.

    I am a student.          He is tired.         They are at home.

Quá khứ: **was / were**. Tương lai: **will be**.

| Chủ ngữ      | Hiện tại | Quá khứ  |
|--------------|----------|----------|
| I            | am       | was      |
| He/She/It    | is       | was      |
| You/We/They  | are      | were     |

Phủ định: **am not / isn't / aren't**. Nghi vấn: **Am / Is / Are ...?**

## 2. DO — trợ động từ tạo câu hỏi và phủ định

    **Do** you like music?       → câu hỏi
    I **do not** smoke.          → câu phủ định
    **Does** she work here?      → ngôi thứ 3 số ít
    She **doesn't** work here.

Điểm mấu chốt: sau do/does/did, động từ chính **trở về nguyên mẫu**.

    Does he **play** tennis?     ← đúng
    Does he **plays** tennis?    ← sai

## 3. HAVE — động từ "có"

    I have a car.      She has two sisters.      They have finished.

Quá khứ: **had** (mọi ngôi): I/you/he **had**.

Phủ định / nghi vận: **have not (haven't)**, **has not (hasn't)**.

    She hasn't finished yet.
    Have you ever been to Japan?

## 4. Bảng tổng hợp

| Trợ động từ | Hiện tại          | Quá khứ | Tương lai   |
|-------------|-------------------|---------|-------------|
| be          | am / is / are     | was/were| will be     |
| do          | do / does         | did     | (will do)   |
| have        | have / has        | had     | will have   |

## 5. Bài tập nhanh
1. She ______ (be) very busy today.
2. ______ he ______ (have) a car?
3. They ______ (not / do) like fish.
4. I ______ (have) finished my homework.

**Đáp án:** 1. is · 2. Does / have · 3. do not · 4. have
""",
    },
    31: {
        "name": "Giới thiệu bản thân và gia đình",
        "content": """# Giới thiệu bản thân và gia đình

## 1. Chào hỏi cơ bản

    Hello, I'm Linh.            Xin chào, tôi là Linh.
    Nice to meet you.           Rất vui được gặp bạn.
    How are you?                Bạn khoẻ không?
    I'm fine, thank you.        Tôi khoẻ, cảm ơn bạn.

Trả lời lời chào:

    Good morning!              Chào buổi sáng!
    Good afternoon!            Chào buổi chiều!
    Good evening!              Chào buổi tối!

## 2. Giới thiệu bản thân

Mẫu câu:

    My name is ...              Tôi tên là ...
    I'm from ...                Tôi đến từ ...
    I'm ... years old.          Tôi ... tuổi.
    I live in ...               Tôi sống ở ...
    I'm a student / teacher.    Tôi là học sinh / giáo viên.
    I study Vietnamese.         Tôi học tiếng Việt.

    Hello, my name is Minh. I'm from Hanoi. I'm 20 years old.

## 3. Giới thiệu gia đình

Danh từ số ít / số nhiều:

| Tiếng Anh              | Tiếng Việt          |
|------------------------|---------------------|
| father / dad           | bố                 |
| mother / mom           | mẹ                 |
| brother                | anh / em trai       |
| sister                 | chị / em gái        |
| son / daughter         | con trai / con gái |
| husband / wife         | chồng / vợ          |
| parents                | bố mẹ              |
| family                 | gia đình            |

Mẫu câu:

    I have two brothers and one sister.
    My father is a doctor. My mother is a teacher.
    We are a family of four.     Chúng tôi là gia đình bốn người.

## 4. Đặt câu hỏi cho người mới gặp

    What's your name?          Tên bạn là gì?
    Where are you from?         Bạn đến từ đâu?
    How old are you?            Bạn bao nhiêu tuổi?
    What do you do?             Bạn làm nghề gì?
    Do you have any siblings?   Bạn có anh chị em không?

## 5. Bài tập nhanh
1. My name ______ Phuong. I'm ______ Da Nang.
2. I ______ two ______ (brother).
3. ______ is your mother? — She is a nurse.
4. Nice to ______ you!

**Đáp án:** 1. is / from · 2. have / brothers · 3. What · 4. meet
""",
    },
    32: {
        "name": "Hỏi và chỉ đường",
        "content": """# Hỏi và chỉ đường

## 1. Hỏi đường

Cấu trúc câu hỏi đường bắt đầu bằng **Where is / Where are**:

    Where is the hospital?       Bệnh viện ở đâu?
    Where is the train station?  Nhà ga ở đâu?
    Where can I find a bank?     Tôi có thể tìm ngân hàng ở đâu?
    How do I get to the museum?  Làm sao để đi đến bảo tàng?
    Is there a pharmacy near here?  Có nhà thuốc gần đây không?

## 2. Chỉ đường (trả lời)

    Go straight.               Đi thẳng.
    Turn left.                 Rẽ trái.
    Turn right.                Rẽ phải.
    Turn around.               Quay lại.
    Go past the bank.          Đi qua ngân hàng.
    It's on the corner.        Nó ở góc đường.
    It's next to the park.     Nó cạnh công viên.
    It's opposite the school.  Nó đối diện trường học.
    It's about five minutes' walk.  Đi bộ khoảng 5 phút.
    It's on your left.         Nó ở bên trái bạn.

## 3. Đối thoại mẫu

    A: Excuse me, where is the museum?
    B: Go straight and turn left at the traffic lights.
    A: Is it far from here?
    B: No, it's about five minutes' walk.

## 4. Vị trí — cấu trúc quan trọng

    The cafe **is** on the second floor.     Quán cafe ở tầng hai.
    The hotel **is** behind the bank.        Khách sạn ở sau ngân hàng.
    The park **is** between the school and the market.

Có **is** trước danh từ chỉ vị trí.

## 5. Bài tập nhanh
1. Where ______ the post office?
2. Go ______ and turn right at the corner.
3. The library is ______ the bank and the café.
4. How ______ get to the airport?

**Đáp án:** 1. is · 2. straight · 3. between · 4. do I
""",
    },
    33: {
        "name": "Mua sắm và giá cả",
        "content": """# Mua sắm và giá cả

## 1. Từ vựng về giá cả

| Tiếng Anh          | Tiếng Việt      |
|--------------------|-----------------|
| price / cost       | giá             |
| cheap              | rẻ              |
| expensive          | đắt             |
| free               | miễn phí        |
| discount / sale    | giảm giá        |
| shop / store       | cửa hàng        |
| market             | chợ             |
| mall               | trung tâm thương mại |
| receipt            | hoá đơn         |
| pay                | trả tiền        |

## 2. Hỏi giá

    How much is this?              Cái này bao nhiêu tiền?
    How much are these shoes?      Đôi giày này bao nhiêu?
    What's the price?              Giá bao nhiêu?

## 3. Nói về số tiền

    It costs 200,000 VND.          Nó giá 200.000 đồng.
    It's too expensive.            Đắt quá.
    That's a bit cheap.            Hơi rẻ đấy.
    It's reasonable.               Giá hợp lý.
    Can you give me a discount?    Cho tôi giảm giá được không?

## 4. Mua bán

    I'd like to buy this shirt, please.
    Do you have this in a larger size?
    Can I pay by card?             Tôi thanh toán bằng thẻ được không?
    Here's your receipt.           Đây là hoá đơn của bạn.
    Here you are.                  Mời bạn.

## 5. So sánh giá

    This bag is **cheaper than** that one.
    This phone is **more expensive than** my old one.
    Prices **go up** every year.      Giá tăng mỗi năm.
    Prices **go down** in the sale.   Giá giảm khi khuyến mãi.

## 6. Bài tập nhanh
1. How much ______ this jacket?
2. It's too ______. Can you make it cheaper?
3. I'd like to ______ this, please.
4. Can I pay by ______?

**Đáp án:** 1. is / costs · 2. expensive · 3. buy · 4. card
""",
    },
    34: {
        "name": "Nói về thời tiết",
        "content": """# Nói về thời tiết

## 1. Từ vựng thời tiết

| Tiếng Anh        | Tiếng Việt        | Loại      |
|------------------|-------------------|-----------|
| sunny            | nắng             | tính từ   |
| cloudy           | nhiều mây         | tính từ   |
| rainy            | mưa              | tính từ   |
| windy            | có gió           | tính từ   |
| stormy           | có giông         | tính từ   |
| snowy            | có tuyết         | tính từ   |
| hot / warm / cool / cold | nóng / ấm / mát / lạnh | tính từ |
| rain / wind / snow | mưa / gió / tuyết | danh từ  |
| the sun          | mặt trời         | danh từ   |
| a storm          | cơn giông        | danh từ   |

## 2. Nói về thời tiết hôm nay

    What's the weather like today?
    How's the weather today?
    It's sunny today.              Hôm nay trời nắng.
    It's raining heavily.          Trời đang mưa nặng.
    The weather is lovely.         Thời tiết rất đẹp.
    It's really cold outside.      Ngoài trời thật lạnh.

## 3. Mô tả khí hậu / mùa

    Vietnam has a tropical climate.
    It rains a lot in the summer.  Mùa hè mưa nhiều.
    Spring is the best season here.

## 4. Cấu trúc "spend/seem + danh từ"

    It **seems** to rain.          Hình như trời sắp mưa.
    It **starts** to snow.         Bắt đầu tuyết rơi.

## 5. Bài tập nhanh
1. What's the ______ like today?
2. It ______ (be) sunny and warm this morning.
3. Look! It ______ (be) raining again.
4. In winter, my city ______ (get) very cold.

**Đáp án:** 1. weather · 2. is · 3. is · 4. gets
""",
    },
    35: {
        "name": "Đọc hiểu - Đoạn văn ngắn",
        "content": """# Kỹ năng đọc hiểu đoạn văn ngắn

## 1. Quy trình đọc 4 bước

1. **Đọc lần 1 — lướt (skim):** đọc nhanh tiêu đề, đoạn đầu, đoạn cuối để nắm
   ý chính. Không dịch từng từ.
2. **Đọc lần 2 — chi tiết:** quay lại đọc kỹ, chú thích từ khóa.
3. **Trả lời câu hỏi theo trình tự:** đọc câu hỏi → tìm từ khoá trong bài →
   đọc lại câu chứa từ khoá.
4. **Suy luận (infer), không đoán mò:** câu hỏi thường không nằm nguyên văn
   trong bài.

## 2. Phân biệt câu hỏi

| Loại câu hỏi      | Dấu hiệu trong câu hỏi          | Cách làm            |
|-------------------|--------------------------------|---------------------|
| **Chi tiết**      | What / When / Where / Who      | Tìm trong bài       |
| **Suy luận**      | Infer, probably, likely        | Suy từ chi tiết     |
| **Ý chính**       | Main idea, best title          | Cả đoạn, không câu |
| **Từ vựng**       | The word "..." means           | Đọc câu chứa từ     |
| **Sai**           | NOT / EXCEPT                    | Loại trừ            |

## 3. Gạch chân khi đọc

- **Từ chủ đề (topic words):** lặp lại nhiều lần, thường là ý chính.
- **Từ nối (connectors):** *but, however, because, therefore, so, although* —
  chúng báo hiệu mối quan hệ ngược lại / nhân quả.
- **Chi tiết hỗ trợ:** số liệu, tên riêng, ví dụ.

## 4. Câu từ vựng theo ngữ cảnh

Đừng dịch từng chữ. Dùng **câu chứa từ đó** để đoán:

    The children were **exhausted** after the long trip.
    → tired / needing rest

## 5. Bài tập
Đọc đoạn ngắn và trả lời:

*Tom is a student. He gets up at six every morning and studies English
for two hours before going to school. He loves reading books about science
in his free time.*

1. What time does Tom get up?
2. How long does he study English?
3. What kind of books does he like?
4. Is Tom a teacher?

**Đáp án:** 1. At six · 2. Two hours · 3. Science books · 4. No, he's a student
""",
    },
    36: {
        "name": "Nghe hiểu - Hội thoại đơn giản",
        "content": """# Kỹ năng nghe hiểu hội thoại đơn giản

## 1. Nghe trước khi đọc
Luôn đọc câu hỏi **trước khi nghe** để biết cần tập trung vào thông tin nào.
Không nghe lại từ đầu — hãy chuẩn bị điểm nghe.

## 2. Không nghe được mọi từ
Người bản ngữ nói nhanh, nối âm. Đừng cố nghe từng từ. Hãy:
- Nghe **từ khoá** (danh từ riêng, số, thời gian).
- Nghe **cấu trúc câu** (hỏi hay trả lời).
- Suy ra từ ngữ cảnh.

## 3. Nối âm (linking)

    pick it up       → pi-kit-up
    an hour          → a-now-ur
    next to          → nec-to
    want to          → wanna

Đây là lý do người học nghe không ra từ đã học.

## 4. Ghi chú khi nghe
- Viết từ khoá, không viết cả câu.
- Đánh dấu: `?` = chưa nghe rõ, `!` = chắc chắn.
- Nghe lần 2 để điền chỗ trống.

## 5. Dấu hiệu nhận biết trong hội thoại

| Câu nói          | Ý nghĩa                 |
|------------------|-------------------------|
| I'd like to...   | Tôi muốn...             |
| Could you...?    | Bạn có thể... (lịch sự) |
| I'm afraid...    | Tôi e rằng...           |
| Actually, ...    | Thực ra...              |
| The problem is...| Vấn đề là...            |

## 6. Bài tập
Nghe đoạn hội thoại và điền:

    A: Good morning. Can I help you?
    B: Hi, I'd like to book a room for Friday.
    A: Sure. How many nights?
    B: ______ nights. And do you have a room with ______ view?

1. Hai đêm · 2. view đẹp / sea view
""",
    },
    37: {
        "name": "Từ vựng theo chủ đề - Địa điểm và Phương tiện",
        "content": """# Từ vựng: Địa điểm và Phương tiện

## 1. Địa điểm (places)

| Tiếng Anh         | Tiếng Việt        |
|-------------------|-------------------|
| house / home      | nhà               |
| apartment         | căn hộ           |
| hotel             | khách sạn         |
| school / college  | trường học / đại học |
| hospital          | bệnh viện        |
| bank              | ngân hàng         |
| market / mall     | chợ / trung tâm thương mại |
| restaurant / café | nhà hàng / quán cà phê |
| park              | công viên         |
| station           | nhà ga / bến xe buýt |
| airport           | sân bay           |
| library           | thư viện          |
| museum            | bảo tàng          |
| post office       | bưu điện         |
| pharmacy          | nhà thuốc         |

## 2. Phương tiện (transport)

| Tiếng Anh      | Tiếng Việt      | Ghi chú                          |
|----------------|-----------------|----------------------------------|
| car            | ô tô            |                                  |
| bus            | xe buýt         |                                  |
| train          | tàu hoành       | by train                         |
| plane          | máy bay         | by plane                         |
| bicycle / bike | xe đạp          |                                  |
| motorbike      | xe máy          |                                  |
| taxi           | taxi            |                                  |
| boat           | tàu thuyền       |                                  |
| on foot        | đi bộ           | by foot, on foot                 |

## 3. Giới từ chỉ nơi chốn

    in + thành phố / quốc gia      in Hanoi, in Vietnam
    at + địa điểm cụ thể          at the airport, at 5 Nguyễn Huệ
    on + đường / tầng             on Nguyễn Huệ Street, on the second floor
    near / next to / between      gần / cạnh / giữa

## 4. Cấu trúc "How do you get to...?"

    How do you get to work?        — I go by bus.
    How do you come to school?     — I come on foot.
    How can I get there?           — Take line 1 and get off at station B.

## 5. Bài tập nhanh
1. I go to work ______ bus.
2. The museum is ______ the park.
3. How do you get to the airport? — ______ metro.
4. There's a pharmacy ______ the street.

**Đáp án:** 1. by · 2. near / next to · 3. By · 4. on
""",
    },
    23: {
        "name": "Bảng chữ cái và cách phát âm",
        "content": """# Bảng chữ cái và cách phát âm

## 1. 26 chữ cái tiếng Anh

| Chữ | Tên | Chữ | Tên | Chữ | Tên |
|-----|-----|-----|-----|-----|-----|
| A   | /eɪ/  | J   | /dʒeɪ/| S   | /es/  |
| B   | /biː/ | K   | /keɪ/ | T   | /tiː/ |
| C   | /siː/ | L   | /el/  | U   | /juː/ |
| D   | /diː/ | M   | /em/  | V   | /viː/ |
| E   | /iː/  | N   | /en/  | W   | /ˈdʌbljuː/ |
| F   | /ef/  | O   | /əʊ/  | X   | /eks/ |
| G   | /dʒiː/| P   | /piː/ | Y   | /waɪ/ |
| H   | /eɪtʃ/| Q   | /kjuː/ | Z   | /zed/ |
| I   | /aɪ/  | R   | /ɑː/  |     |      |

## 2. Nguyên âm cơ bản
- Ngắn: **ɪ** (ship), **e** (bed), **æ** (cat), **ʌ** (cup), **ɒ** (hot), **ʊ** (book), **ə** (about)
- Dài: **iː** (see), **ɑː** (car), **ɜː** (bird), **uː** (food), **ɜː+ə** (teacher)

## 3. Phụ âm
**p b t d k g** vô thanh; **v ð z** có thanh.
Nguyên tắc: **đầu từ** có thanh, **giữa/end từ** vô thanh.
    pen ✓ /pen/ · Peter ✗ /ˈpiːtə/
    cat ✓ /kæt/ · cabin ✗ /ˈkæbɪn/

## 4. Nguyên tắc đọc cuối từ
- Từ ngắn 1 âm tiết: dấu nhấn mặc định 1.
- Từ dài: dấu nhấn đi từ âm tiết cuối về 2 âm tiết
    **a-PEN** → **ap-PEN**
- Hậu tố **-tion, -sion, -ic, -ical, -ity, -ety**: nhấn vào hậu tố
    infor**MA**tion · eco**NOM**ics · den**SITY**

## 5. Bài tập
1. Chữ cái ngay sau B là gì? → **C**
2. Có bao nhiêu chữ cái? → **26**
3. Chữ cái đầu tiên? → **A**
""",
    },
    24: {
        "name": "Số đếm từ 1 đến 100",
        "content": """# Số đếm từ 1 đến 100

## 1. Số từ 1-20 (bất quy tắc)
    one, two, three, four, five, six, seven, eight, nine, ten,
    eleven, twelve, thirteen, fourteen, fifteen, sixteen,
    seventeen, eighteen, nineteen, twenty

## 2. Các hàng chục
    30 thirty · 40 forty · 50 fifty · 60 sixty · 70 seventy
    80 eighty · 90 ninety

Chú ý: **four / fourteen / forty** đều đầu âm /f/.

## 3. Cách đọc số 21-99
    35 = thirty-five    (có gạch nối)
    47 = forty-seven
    80 = eighty         (KHÔNG có 't')

## 4. Số tròn
    100 = one hundred
    250 = two hundred and fifty
    999 = nine hundred and ninety-nine
    1000 = one thousand

## 5. Số thứ tự (ordinal)
    1st first · 2nd second · 3rd third · 4th fourth · 5th fifth
    6th sixth · 7th seventh · 8th eighth · 9th ninth · 10th tenth
    20th twentieth · 21st twenty-first

## 6. Câu hỏi về số
    How many books do you have?   — I have twenty-three books.
    How much is it?                — It's two hundred thousand.
    What time is it?               — It's seven fifteen.

## 7. Bài tập
1. 45 → **forty-five**
2. 100 → **one hundred**
3. Ngày 3 tháng → **the third of March**
4. 15 phút giá trị (giá tiền) → **fifteen thousand**
""",
    },
    25: {
        "name": "Màu sắc cơ bản",
        "content": """# Màu sắc cơ bản

## 1. Mười màu cơ bản
    red (đỏ) · yellow (vàng) · blue (xanh dương)
    green (xanh lá) · orange (cam) · purple (tím)
    black (đen) · white (trắng) · brown (nâu) · grey (xám)

## 2. Màu sắc trước danh từ
    a **red** car   — màu đỏ
    the **white** house — nhà màu trắng

Sau 'a/an' dùng **màu + mạo từ**: a red bag ✓, a bag red ✗.

## 3. Thêm sắc độ: 'light' / 'dark'
    light blue = xanh nhạt
    dark green  = xanh đậm
    pale / bright / dull

## 4. Vị trí tính từ màu
    Màu đứng **trước** danh từ:
    a blue car ✓ (đúng) / a car blue ✗ (sai)

## 5. Cấu trúc 'wear' màu (mặc màu gì)
    She is wearing **a red** dress.     Cô ấy mặc váy đỏ.
    I like **blue** shirts.             Tôi thích áo xanh.

## 6. Câu hỏi
    What **colour** is your bag?       — It's black.
    What **colours** do you like?      — I like blue and green.

## 7. Bài tập
1. What colour is the sky on a clear day? → **blue**
2. Màu nào của lá cây vào mùa thu? → **yellow**
3. Chọn câu đúng: a) a white T-shirt b) a T-shirt white → **a**

**Lưu ý phát âm:** colour /ˈkʌlə/ (Anh-Anh) · color /ˈkʌlər/ (Anh-Mỹ)
""",
    },
    26: {
        "name": "Câu chào hỏi thông dụng",
        "content": """# Câu chào hỏi thông dụng

## 1. Chào theo thời gian
    Good morning   — Chào buổi sáng (trước 12h)
    Good afternoon — Chào buổi chiều (12h-18h)
    Good evening   — Chào buổi tối (sau 18h)
    Good night     — Chúc ngủ ngon (khi ngủ)

## 2. Hỏi thăm
    How are you?          Bạn khoẻ không?
    How's it going?       Dạo này thế nào? (thân mật)
    What's up?            Có gì không? (rất thân)

Trả lời:
    I'm fine, thank you.        Tôi khoẻ, cảm ơn.
    Not bad.                    Cũng được.
    Pretty good, thanks.        Khá tốt.

## 3. Hỏi giới thiệu
    What are you doing?        Bạn đang làm gì?
    How do you do?             Chào, hân hạnh gặp (lần đầu, trang trọng)
    Nice to meet you.          Rất vui được gặp bạn.

## 4. Chào tạm biệt
    Goodbye / Bye      Tạm biệt
    See you later      Hẹn gặp lại
    See you tomorrow   Hẹn gặp ngày mai
    Have a nice day!   Chúc một ngày tốt lành!
    Take care.         Giữ gìn.

## 5. Đáp lại lời chào
    A: Hi! How are you?
    B: Hi, Lan! I'm good, and you?
    A: Great, thanks. See you later!

## 6. Bài tập
1. 10 giờ sáng chào bằng gì? → **Good morning**
2. Chia tay người bạn → **See you later**
3. Hỏi khỏe không → **How are you?**

**Lưu ý:** 'How do you do?' là lời chào **trang trọng**, trả lời cũng bằng chính nó, không phải trả lời "I'm fine".
""",
    },
    38: {
        "name": "Kỹ năng viết câu đơn giản",
        "content": """# Kỹ năng viết câu đơn giản

## 1. Cấu trúc câu cơ bản

Mọi câu đều cần **chủ ngữ + động từ**. Thiếu động từ là lỗi phổ biến nhất.

    (SAI)  I very like music.
    (ĐÚNG) I like music very much.

## 2. Bắt đầu câu bằng chữ hoa + kết thúc bằng dấu chấm

    i go to school.     →  I go to school.

## 3. Ba bước xây câu

1. **Ai?** → chủ ngữ (I, She, My friend)
2. **Làm gì?** → động từ (go, eat, read)
3. **Khi nào / ở đâu / như thế nào?** → thành phần bổ sung

    I / read / books every night.
    She / works / at a hospital.
    They / went / to Da Nang last weekend.

## 4. Liên kết câu (linking words)

| Từ nối            | Nghĩa                  |
|-------------------|------------------------|
| and               | và                     |
| but               | nhưng                  |
| because           | vì                    |
| so                | nên                   |
| first / then / after that | trước tiên / sau đó / sau đó nữa |

    I was tired, **but** I finished my homework. **So** I went to bed late.

## 5. Kiểm tra trước khi nộp
- [ ] Có chủ ngữ và động từ?
- [ ] Chữ cái đầu câu viết hoa?
- [ ] Động từ đã chia đúng thì?
- [ ] Có dấu chấm cuối câu?

## 6. Bài tập
Viết lại câu cho đúng ngữ pháp:

1. every day i get up at six o'clock.
2. She very likes reading books.
3. My brother play football last Sunday.
4. I am study Vietnamese now.

**Đáp án:**
1. Every day I get up at six o'clock.
2. She likes reading books very much.
3. My brother played football last Sunday.
4. I am studying Vietnamese now.
""",
    },
}


# ===== CÂU HỎI BỔ SUNG =====
# Mỗi topic hiện có 10 câu (L1: 4, L2: 3, L3: 3). Bổ sung để mỗi topic đủ
# ~16 câu, đủ đa dạng để phiên luyện tập 8 câu không phải lặp câu cũ.
QUESTIONS: dict[int, list[dict]] = {
    23: [
        {"level": 1, "q": "Which letter comes after B?",
         "o": ["C", "A", "D", "E"], "a": "C",
         "e": "Bảng chữ cái: A, B, C, D... nên sau B là C."},
        {"level": 1, "q": "How many letters are there in the English alphabet?",
         "o": ["26", "24", "28", "30"], "a": "26",
         "e": "Tiếng Anh có 26 chữ cái, từ A đến Z."},
        {"level": 1, "q": "What is the last letter of the English alphabet?",
         "o": ["Z", "Y", "X", "A"], "a": "Z",
         "e": "Chữ cuối cùng là Z."},
        {"level": 1, "q": "Which word starts with the letter C?",
         "o": ["cat", "dog", "fish", "bird"], "a": "cat",
         "e": "Chữ C phát âm /k/ như trong 'cat'."},
        {"level": 2, "q": "What is the name of the letter H?",
         "o": ["aitch", "haitch", "etch", "eitch"], "a": "aitch",
         "e": "Chữ H đọc là /eɪtʃ/, gọi là 'aitch'."},
        {"level": 2, "q": "Which of these is a vowel?",
         "o": ["U", "T", "K", "P"], "a": "U",
         "e": "Nguyên âm: A, E, I, O, U. U là nguyên âm."},
        {"level": 2, "q": "How many vowels are there in English?",
         "o": ["five", "four", "six", "seven"], "a": "five",
         "e": "Có 5 nguyên âm: A E I O U."},
        {"level": 3, "q": "In 'cat', which letter is pronounced?",
         "o": ["c", "k", "both c and k", "neither"], "a": "c",
         "e": "Trước nguyên âm a, chữ 'c' đọc là /k/ (giống 'k' trong keep)."},
        {"level": 3, "q": "In 'kitten', the letter 'c' sounds like:",
         "o": ["/k/", "/s/", "/t/", "/g/"], "a": "/s/",
         "e": "Trước e/i/y, chữ 'c' đọc là /s/ (giống 's' trong sit)."},
        {"level": 3, "q": "Which word has the stressed syllable underlined by context: infor-MA-tion?",
         "o": ["the last syllable", "the middle syllable",
               "the first syllable", "no stress"], "a": "the last syllable",
         "e": "Hậu tố -tion luôn được nhấn trong tiếng Anh."},
    ],
    24: [
        {"level": 1, "q": "How many is thirty-five?",
         "o": ["thirty five", "thirty-five", "three five", "thirteen five"],
         "a": "thirty-five",
         "e": "Số 21-99 nối bằng dấu gạch nối: thirty-five."},
        {"level": 1, "q": "What is 100 in words?",
         "o": ["one hundred", "ten hundred", "a hundred", "one thousand"], "a": "one hundred",
         "e": "100 = one hundred (1 + hundred)."},
        {"level": 1, "q": "Which is the correct spelling of 40?",
         "o": ["fourty", "forty", "fourthy", "fourteen"], "a": "forty",
         "e": "40 = forty (KHÔNG có 'u'), cùng âm với four và fourteen."},
        {"level": 2, "q": "She is the ______ student in our class.",
         "o": ["three", "third", "threeth", "threedy"], "a": "third",
         "e": "Số thứ tự dùng hậu tố: first, second, third..."},
        {"level": 2, "q": "How many books do you have? — ______ books.",
         "o": ["twenty-three", "twenty three", "twentythree", "three-twenty"],
         "a": "twenty-three",
         "e": "Số 23 viết là twenty-three, có gạch nối."},
        {"level": 2, "q": "It costs ______ đồng.",
         "o": ["two hundred thousand", "two hundreds thousand",
               "two hundred thousands", "hundred twenty thousand"],
         "a": "two hundred thousand",
         "e": "Đơn vị lớn (hundred, thousand) không chia số nhiều."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["He came in the third time.", "He came in the three time.",
               "He came in third time.", "He came at the third time."],
         "a": "He came in the third time.",
         "e": "Số thứ tự đi kèm 'the' và danh từ đếm được."},
        {"level": 3, "q": "What is 250?",
         "o": ["two hundred and fifty", "two hundreds and fifty",
               "two hundred fifty", "twenty five hundred"], "a": "two hundred and fifty",
         "e": "250 = 2 trăm + 50; 'hundred' không chia số nhiều."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["I was born in the ninetieth.", "I was born in ninety.",
               "I was born ninety.", "I was born in the ninety."],
         "a": "I was born in the ninetieth.",
         "e": "Năm thứ chín mươi dùng số thứ tự 'ninetieth'."},
    ],
    25: [
        {"level": 1, "q": "What colour is the sky on a clear day?",
         "o": ["blue", "green", "black", "red"], "a": "blue",
         "e": "Trời quang mây có màu xanh (blue)."},
        {"level": 1, "q": "What colour are the leaves in autumn?",
         "o": ["yellow", "blue", "white", "black"], "a": "yellow",
         "e": "Lá cây mùa thu chuyển sang màu vàng."},
        {"level": 1, "q": "Snow is ______.",
         "o": ["white", "black", "brown", "green"], "a": "white",
         "e": "Tuyết có màu trắng."},
        {"level": 2, "q": "Which colour comes before 'white' in the rainbow?",
         "o": ["violet", "pink", "gold", "silver"], "a": "violet",
         "e": "Màu tím (violet) ở đầu dải cầu vồng."},
        {"level": 2, "q": "Choose the correct word order:",
         "o": ["a white T-shirt", "a T-shirt white", "a white shirt T",
               "an white T-shirt"], "a": "a white T-shirt",
         "e": "Màu đứng trước danh từ, và 'a' dùng trước nguyên âm."},
        {"level": 2, "q": "What ______ is your bag? — It's black.",
         "o": ["colour", "colours", "coloring", "coloured"], "a": "colour",
         "e": "Hỏi màu sắ (một màu) dùng 'What colour' dạng số ít."},
        {"level": 3, "q": "'Light blue' means the colour is:",
         "o": ["pale / nhạt", "dark / đậm", "bright / sáng mạnh", "no colour"],
         "a": "pale / nhạt",
         "e": "Từ 'light' đứng trước màu = nhạt; 'dark' mới là đậm."},
        {"level": 3, "q": "Which sentence is correct?",
         "o": ["She is wearing a red dress.", "She is wearing a dress red.",
               "She is wearing red a dress.", "She wear a red dress."],
         "a": "She is wearing a red dress.",
         "e": "Màu đứng trước danh từ, và động từ ở thì tiếp diễn."},
        {"level": 3, "q": "A banana is usually ______ in colour.",
         "o": ["yellow", "purple", "grey", "white"], "a": "yellow",
         "e": "Chuối có màu vàng."},
    ],
    26: [
        {"level": 1, "q": "What do you say at 10 a.m.?",
         "o": ["Good morning", "Good evening", "Good night", "Good afternoon"],
         "a": "Good morning",
         "e": "Trước 12 giờ chào 'Good morning'."},
        {"level": 1, "q": "Which greeting do you use after 6 p.m.?",
         "o": ["Good evening", "Good morning", "Good afternoon", "Good day"],
         "a": "Good evening",
         "e": "Sau 18 giờ chào 'Good evening'."},
        {"level": 1, "q": "How do you say goodbye before leaving?",
         "o": ["See you later", "Good morning", "How are you?", "Nice to meet you"],
         "a": "See you later",
         "e": "'See you later' là lời tạm biệt."},
        {"level": 2, "q": "A: 'How are you?' B: '______'",
         "o": ["I'm fine, thank you.", "Nice to meet you.", "See you later.",
               "Good morning."], "a": "I'm fine, thank you.",
         "e": "'How are you?' được trả lời bằng cách nói tình trạng sức khoẻ."},
        {"level": 2, "q": "You meet your friend for the first time. You say:",
         "o": ["Nice to meet you.", "See you later.", "Good night.",
               "How's it going?"], "a": "Nice to meet you.",
         "e": "Lần gặp đầu tiên dùng 'Nice to meet you'."},
        {"level": 2, "q": "What do you say before going to bed?",
         "o": ["Good night", "Good evening", "Good afternoon", "Goodbye"],
         "a": "Good night",
         "e": "'Good night' dùng khi chúc ngủ ngon."},
        {"level": 3, "q": "Which is a polite goodbye?",
         "o": ["Have a nice day!", "Go away.", "I hate you.",
               "What do you want?"], "a": "Have a nice day!",
         "e": "'Have a nice day!' là lời chúc tạm biệt lịch sự."},
        {"level": 3, "q": "'How do you do?' is used when:",
         "o": ["meeting someone formally for the first time",
               "asking how someone feels daily",
               "saying goodbye at night", "asking for directions"],
         "a": "meeting someone formally for the first time",
         "e": "Đây là lời chào trang trọng, trả lời bằng chính câu đó."},
        {"level": 3, "q": "Choose the correct exchange:",
         "o": ["A: How do you do? B: How do you do?",
               "A: How do you do? B: I'm 25.",
               "A: How do you do? B: Yes, I am.",
               "A: How do you do? B: Goodbye."],
         "a": "A: How do you do? B: How do you do?",
         "e": "'How do you do?' trả lời bằng chính câu hỏi, không phải thông tin cá nhân."},
    ],

    27: [
        # L1
        {"level": 1, "q": "My sister ______ to school every day.",
         "o": ["go", "goes", "going", "gone"], "a": "goes",
         "e": "Với chủ ngữ he/she/it, động từ ở thì hiện tại phải thêm -s/-es."},
        {"level": 1, "q": "______ your father work in a bank?",
         "o": ["Do", "Does", "Is", "Are"], "a": "Does",
         "e": "Câu hỏi với chủ ngữ he/she/it ở hiện tại dùng Does + động từ nguyên mẫu."},
        {"level": 1, "q": "The sun ______ in the east.",
         "o": ["rise", "rises", "rising", "to rise"], "a": "rises",
         "e": "Đây là sự thật hiển nhiên, dùng thì hiện tại đơn."},
        # L2
        {"level": 2, "q": "She ______ not ______ coffee in the evening.",
         "o": ["do / drink", "does / drink", "does / drinks", "do / drinks"], "a": "does / drink",
         "e": "Phủ định: does not (doesn't) + động từ nguyên mẫu."},
        {"level": 2, "q": "My brother ______ TV while he studies.",
         "o": ["don't watch", "doesn't watch", "isn't watching", "not watches"], "a": "doesn't watch",
         "e": "Chủ ngữ he → không dùng don't. Vì nói về thói quen nên dùng hiện tại đơn."},
        {"level": 2, "q": "They ______ football every Sunday afternoon.",
         "o": ["plays", "play", "playing", "is play"], "a": "play",
         "e": "Chủ ngữ they → động từ nguyên mẫu, không thêm -s."},
        # L3
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["She does not watches TV.", "She does not watch TV.",
               "She do not watch TV.", "She not watch TV."], "a": "She does not watch TV.",
         "e": "Không chia động từ sau does, và chủ ngữ she dùng does chứ không dùng do."},
        {"level": 3, "q": "Which sentence is correct?",
         "o": ["Does he likes tennis?", "Do he like tennis?",
               "Does he like tennis?", "He does like tennis?"], "a": "Does he like tennis?",
         "e": "Câu hỏi với he → Does + động từ nguyên mẫu."},
        {"level": 3, "q": "Water ______ at 100 degrees Celsius.",
         "o": ["boil", "boils", "boiling", "is boil"], "a": "boils",
         "e": "Chủ ngữ ngôi thứ ba số ít nên động từ thêm -s."},
    ],
    28: [
        {"level": 1, "q": "We ______ to the zoo last Sunday.",
         "o": ["go", "goes", "went", "gone"], "a": "went",
         "e": "'Last Sunday' là dấu hiệu quá khứ; go → went (bất quy tắc)."},
        {"level": 1, "q": "She ______ a new phone yesterday.",
         "o": ["buy", "buys", "bought", "buying"], "a": "bought",
         "e": "'Yesterday' là dấu hiệu quá khứ; buy → bought."},
        {"level": 1, "q": "He ______ TV last night.",
         "o": ["watch", "watched", "watches", "watching"], "a": "watched",
         "e": "Động từ bất quy tắc thì chia thường bằng -ed."},
        {"level": 2, "q": "Did you ______ the film last night?",
         "o": ["watched", "watch", "watches", "watching"], "a": "watch",
         "e": "Sau 'did', động từ luôn trở về nguyên mẫu."},
        {"level": 2, "q": "They ______ not come to the party.",
         "o": ["did", "does", "was", "were"], "a": "did",
         "e": "Phủ định quá khứ dùng did not (didn't)."},
        {"level": 2, "q": "Where ______ you go last weekend?",
         "o": ["do", "did", "does", "are"], "a": "did",
         "e": "Câu hỏi trong quá khứ luôn dùng did + động từ nguyên mẫu."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["She didn't went home.", "She didn't went to home.",
               "She didn't go home.", "She don't go home."], "a": "She didn't go home.",
         "e": "Sau didn't, động từ phải là nguyên mẫu 'go'."},
        {"level": 3, "q": "I ______ my childhood in Hanoi.",
         "o": ["live", "lived", "am living", "will live"], "a": "lived",
         "e": "'Childhood' là thời gian đã qua kết thúc nên dùng quá khứ."},
        {"level": 3, "q": "Which is the past form of 'take'?",
         "o": ["taked", "took", "taken", "taking"], "a": "took",
         "e": "take → took là động từ bất quy tắc cần học thuộc."},
    ],
    29: [
        {"level": 1, "q": "I ______ call you later tonight.",
         "o": ["am going to", "will", "would", "was"], "a": "will",
         "e": "Quyết định/đoán lúc nói nên dùng will + động từ nguyên mẫu."},
        {"level": 1, "q": "They ______ move to Da Nang next month.",
         "o": ["are going to", "goes to", "will to", "is going"], "a": "are going to",
         "e": "Kế hoạch đã có từ trước dùng going to."},
        {"level": 1, "q": "Look at those dark clouds! It ______ rain.",
         "o": ["will", "is going to", "goes to", "was"], "a": "is going to",
         "e": "Có dấu hiệu nhìn thấy trước (mây tối) nên dùng going to."},
        {"level": 2, "q": "What are you ______ to do this weekend?",
         "o": ["go", "will", "going to", "do"], "a": "going to",
         "e": "Câu hỏi với going to: What + are + chủ ngữ + going to + V?"},
        {"level": 2, "q": "She ______ not go to work tomorrow.",
         "o": ["will", "is", "does", "are"], "a": "will",
         "e": "Phủ định tương lai: will not (won't) + động từ nguyên mẫu."},
        {"level": 2, "q": "Look! The children ______ to the park right now.",
         "o": ["go", "are going", "goes", "is go"], "a": "are going",
         "e": "Có 'Look!' và 'right now' → đang diễn ra/near future, dùng going to."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["I will going to study.", "I am going to study.",
               "I going to study.", "I am go to study."], "a": "I am going to study.",
         "e": "going to phải đi kèm dạng be (am/is/are)."},
        {"level": 3, "q": "I think it ______ tomorrow.",
         "o": ["is going to rain", "will rain", "will rains", "rains"],
         "a": "will rain",
         "e": "'I think...' là dự đoán chung, không có dấu hiệu nhìn thấy → dùng will."},
        {"level": 3, "q": "We have already bought the tickets, so we ______ fly by plane.",
         "o": ["will", "are going to", "were", "was"], "a": "are going to",
         "e": "Kế hoạch đã chuẩn bị xong → going to."},
    ],
    30: [
        {"level": 1, "q": "She ______ very busy today.",
         "o": ["am", "is", "are", "be"], "a": "is",
         "e": "Chủ ngữ she → động từ nối 'is'."},
        {"level": 1, "q": "They ______ at school now.",
         "o": ["is", "am", "are", "be"], "a": "are",
         "e": "Chủ ngữ they → 'are'."},
        {"level": 1, "q": "I ______ a student.",
         "o": ["is", "am", "are", "be"], "a": "am",
         "e": "Chủ ngữ I → động từ nối 'am'."},
        {"level": 2, "q": "______ he ______ a car?",
         "o": ["Does / has", "Do / has", "Does / have", "Is / have"], "a": "Does / have",
         "e": "Câu hỏi với he: Does + động từ nguyên mẫu (have)."},
        {"level": 2, "q": "They ______ (not / like) fish.",
         "o": ["do not", "does not", "not", "is not"], "a": "do not",
         "e": "Phủ định với chủ ngữ they dùng do not."},
        {"level": 2, "q": "She ______ finished her homework.",
         "o": ["have", "has", "is", "do"], "a": "has",
         "e": "Chủ ngữ he/she/it dùng 'has' ở thì hiện tại."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["Does she has a sister?", "Does she have a sister?",
               "Do she has a sister?", "Is she have a sister?"], "a": "Does she have a sister?",
         "e": "Sau does, động từ 'have' không chia thêm -s."},
        {"level": 3, "q": "Yesterday I ______ to the gym.",
         "o": ["go", "have gone", "went", "am going"], "a": "went",
         "e": "'Yesterday' → quá khứ; have → had (go → went)."},
        {"level": 3, "q": "______ they ______ finished yet?",
         "o": ["Have / never", "Has / never", "Do / never", "Are / never"], "a": "Have / never",
         "e": "Câu hỏi với they dùng Have + trạng từ phủ định 'never'."},
    ],
    31: [
        {"level": 1, "q": "My name ______ Phuong.",
         "o": ["is", "are", "am", "be"], "a": "is",
         "e": "My name là chủ ngữ ngôi thứ ba số ít nên dùng 'is'."},
        {"level": 1, "q": "I ______ from Hanoi.",
         "o": ["am", "is", "are", "be"], "a": "am",
         "e": "Chủ ngữ I → 'am'. Cấu trúc: S + be + from + nơi chốn."},
        {"level": 1, "q": "______ is your mother? — She is a nurse.",
         "o": ["What", "Who", "Where", "How old"], "a": "Who",
         "e": "Hỏi về quan hệ → dùng 'Who'."},
        {"level": 2, "q": "I ______ two brothers.",
         "o": ["have", "has", "is", "am"], "a": "have",
         "e": "Chủ ngữ I + danh từ số nhiều → 'have'."},
        {"level": 2, "q": "Nice to ______ you.",
         "o": ["see", "meet", "know", "read"], "a": "meet",
         "e": "Cụm cố định khi gặp mặt lần đầu: 'Nice to meet you.'"},
        {"level": 2, "q": "We ______ a family of four.",
         "o": ["is", "am", "are", "be"], "a": "are",
         "e": "Chủ ngữ we → 'are'."},
        {"level": 3, "q": "How ______ are you? — I'm twenty.",
         "o": ["old", "much", "many", "long"], "a": "old",
         "e": "Hỏi tuổi: 'How old are you?'"},
        {"level": 3, "q": "______ do you do? — I'm a teacher.",
         "o": ["What", "Who", "Where", "How much"], "a": "What",
         "e": "Hỏi về nghề nghiệp: 'What do you do?'"},
        {"level": 3, "q": "My father is a doctor and my mother ______ a teacher.",
         "o": ["am", "is", "are", "be"], "a": "is",
         "e": "My mother là chủ ngữ ngôi thứ ba số ít → 'is'."},
    ],
    32: [
        {"level": 1, "q": "Where ______ the post office?",
         "o": ["is", "are", "am", "do"], "a": "is",
         "e": "Câu hỏi địa điểm: Where + is + danh từ?"},
        {"level": 1, "q": "Go ______ and turn right at the corner.",
         "o": ["straight", "left", "back", "round"], "a": "straight",
         "e": "'Go straight' = đi thẳng."},
        {"level": 1, "q": "The pharmacy is ______ the bank.",
         "o": ["next to", "next", "to next", "at"], "a": "next to",
         "e": "'Next to' = cạnh bên."},
        {"level": 2, "q": "How do I ______ to the airport?",
         "o": ["get", "go", "make", "take"], "a": "get",
         "e": "Cấu trúc hỏi đường: 'How do I get to + địa điểm?'"},
        {"level": 2, "q": "The library is ______ the school and the market.",
         "o": ["between", "among", "near", "behind"], "a": "between",
         "e": "'Between A and B' = ở giữa A và B."},
        {"level": 2, "q": "Is there a café ______ here?",
         "o": ["near", "at", "to", "in"], "a": "near",
         "e": "'Near here' = gần đây."},
        {"level": 3, "q": "The hotel is ______ the bank. (vị trí)",
         "o": ["behind", "between", "opposite", "in front"],
         "a": "behind",
         "e": "Chọn giới từ chỉ vị trí phù hợp với câu (bank nằm trước hotel)."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["Where is the hospital?", "Where the hospital is?",
               "Where is hospital?", "Where are the hospital?"], "a": "Where is the hospital?",
         "e": "Câu hỏi đúng cần trật tự: trạng ngữ + động từ be + chủ ngữ + vị trí."},
        {"level": 3, "q": "It's about five minutes' ______ from here.",
         "o": ["walk", "walks", "walking", "walked"], "a": "walk",
         "e": "Sở hữu cách 'minutes' walk' = khoảng 5 phút đi bộ."},
    ],
    33: [
        {"level": 1, "q": "How much ______ this jacket?",
         "o": ["is", "are", "do", "have"], "a": "is",
         "e": "Hỏi giá với vật số ít: 'How much is...?'"},
        {"level": 1, "q": "It's too ______. Can you make it cheaper?",
         "o": ["cheap", "expensive", "free", "small"], "a": "expensive",
         "e": "'Cheaper' trong câu hỏi gợi ý món đồ đang đắt."},
        {"level": 1, "q": "I'd like to ______ this, please.",
         "o": ["buy", "buys", "buying", "sold"], "a": "buy",
         "e": "Sau 'I'd like to' dùng động từ nguyên mẫu."},
        {"level": 2, "q": "Can I pay by ______?",
         "o": ["card", "money card", "cards", "credit"], "a": "card",
         "e": "Cụm cố định 'pay by card' = thanh toán bằng thẻ."},
        {"level": 2, "q": "This bag is ______ than that one.",
         "o": ["cheap", "cheaper", "cheapest", "more cheap"], "a": "cheaper",
         "e": "So sánh hơn với tính từ ngắn thêm -er."},
        {"level": 2, "q": "There's a big sale. All the shoes are 50% ______.",
         "o": ["off", "of", "in", "on"], "a": "off",
         "e": "Cụm 'X% off' = giảm X%."},
        {"level": 3, "q": "Do you have this shirt in a ______ size?",
         "o": ["big", "larger", "largest", "more big"], "a": "larger",
         "e": "So sánh hơn với 'large' → 'larger'."},
        {"level": 3, "q": "Prices ______ every year.",
         "o": ["go up", "goes up", "going up", "went up"], "a": "go up",
         "e": "Chủ ngữ 'Prices' số nhiều → 'go'. 'Go up' = tăng."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["How much are this?", "How much is this?",
               "How much this is?", "What much is this?"], "a": "How much is this?",
         "e": "Hỏi giá vật số ít dùng 'How much is'."},
    ],
    34: [
        {"level": 1, "q": "What's the weather ______ today?",
         "o": ["like", "is", "in", "at"], "a": "like",
         "e": "Cụm cố định: 'What's the weather like?' = thời tiết thế nào."},
        {"level": 1, "q": "It ______ sunny and warm this morning.",
         "o": ["is", "are", "am", "be"], "a": "is",
         "e": "'It' là chủ ngữ ngôi thứ ba số ít → 'is'."},
        {"level": 1, "q": "Look! It ______ raining again.",
         "o": ["is", "are", "am", "were"], "a": "is",
         "e": "Đang xảy ra ngay lúc nói dùng 'is + V-ing'."},
        {"level": 2, "q": "It ______ a lot in the summer.",
         "o": ["rains", "rain", "is rain", "rainy"], "a": "rains",
         "e": "Chủ ngữ 'It' → động từ thêm -s."},
        {"level": 2, "q": "The weather ______ lovely today.",
         "o": ["is", "are", "am", "be"], "a": "is",
         "e": "Tính từ đứng sau 'weather' cần động từ nối 'is'."},
        {"level": 2, "q": "I ______ umbrella in my bag. It's going to rain.",
         "o": ["have", "has", "am", "do"], "a": "have",
         "e": "Chủ ngữ I → 'have'."},
        {"level": 3, "q": "It ______ to snow. Take your coat!",
         "o": ["seems", "starts", "is begin", "is start"], "a": "seems",
         "e": "'It seems to + V' = hình như / có vẻ như."},
        {"level": 3, "q": "Which sentence is correct?",
         "o": ["The weather is rainy today.", "The weather are rainy today.",
               "The weather is rain today.", "The weather rainy today."],
         "a": "The weather is rainy today.",
         "e": "Sau 'is' cần tính từ 'rainy', không dùng danh từ 'rain'."},
        {"level": 3, "q": "In winter, my city ______ very cold.",
         "o": ["get", "gets", "getting", "is get"], "a": "gets",
         "e": "Chủ ngữ 'my city' ngôi thứ ba số ít → 'gets'."},
    ],
    35: [
        {"level": 1, "q": "Tom ______ up at six every morning.",
         "o": ["get", "gets", "getting", "got"], "a": "gets",
         "e": "Đọc hiểu: thói quen ở hiện tại, chủ ngữ he → 'gets'."},
        {"level": 1, "q": "He studies English for ______ hours.",
         "o": ["one", "two", "three", "four"], "a": "two",
         "e": "Đọc hiểu: trong bài có 'for two hours'."},
        {"level": 1, "q": "Is Tom a teacher?",
         "o": ["Yes, he is a student.", "Yes, he is a teacher.",
               "No, he is a student.", "No, he is not study."],
         "a": "No, he is a student.",
         "e": "Câu hỏi phủ định → trả lời phủ định, dựa vào 'Tom is a student'."},
        {"level": 2, "q": "What kind of books does Tom like?",
         "o": ["Science books", "History books", "Love stories", "Comics"],
         "a": "Science books",
         "e": "Đọc hiểu: bài viết 'books about science'."},
        {"level": 2, "q": "The word 'exhausted' most probably means:",
         "o": ["tired", "excited", "angry", "hungry"], "a": "tired",
         "e": "Suy luận từ ngữ cảnh: 'after the long trip' → mệt mỏi."},
        {"level": 2, "q": "Tom studies English ______ going to school.",
         "o": ["before", "after", "during", "while"], "a": "before",
         "e": "Đọc hiểu: thứ tự thời gian trong bài."},
        {"level": 3, "q": "Which is the main idea of the passage?",
         "o": ["Tom's daily routine", "English grammar rules",
               "Tom's trip abroad", "How to study science"],
         "a": "Tom's daily routine",
         "e": "Ý chính phải bao quát cả đoạn, không chỉ một câu."},
        {"level": 3, "q": "Choose the best title for the passage:",
         "o": ["A Day in Tom's Life", "English Study Tips",
               "Science Books", "Morning Exercises"],
         "a": "A Day in Tom's Life",
         "e": "Tiêu đề tốt phản ánh ý chính của toàn bài."},
        {"level": 3, "q": "According to the passage, Tom reads books about ______ in his free time.",
         "o": ["science", "history", "travel", "cooking"], "a": "science",
         "e": "Câu hỏi chi tiết: tìm thông tin trực tiếp trong bài."},
    ],
    36: [
        {"level": 1, "q": "A customer says: 'I'd like to book a room.' He wants to ______ a room.",
         "o": ["book", "booked", "booking", "books"], "a": "book",
         "e": "Nghe hiểu: sau 'I'd like to' dùng động từ nguyên mẫu."},
        {"level": 1, "q": "The hotel asks: 'How many nights?' The answer is ______.",
         "o": ["two", "twice", "second", "secondly"], "a": "two",
         "e": "Nghe hiểu: số đêm."},
        {"level": 1, "q": "'Could you help me?' is a ______ request.",
         "o": ["polite", "rude", "angry", "sad"], "a": "polite",
         "e": "Nghe hiểu: 'Could you...?' là cách xin lịch sự."},
        {"level": 2, "q": "In a hotel booking, 'a room with a sea view' means the room ______.",
         "o": ["has a view of the sea", "is near the sea only",
               "costs more for the sea", "is upstairs"], "a": "has a view of the sea",
         "e": "Suy luận: 'view' = tầm nhìn ra biển."},
        {"level": 2, "q": "'I'm afraid that's full.' The speaker is ______.",
         "o": ["turning down the request", "accepting the request",
               "asking for payment", "confirming the booking"],
         "a": "turning down the request",
         "e": "'I'm afraid...' báo hiệu điều không thuận lợi — lịch sự từ chối."},
        {"level": 2, "q": "Which question would you hear at a hotel reception?",
         "o": ["Do you have any siblings?", "How long would you like to stay?",
               "What's the weather like?", "How much is it?"],
         "a": "How long would you like to stay?",
         "e": "Nghe hiểu: nhận phòng khách sạn liên quan thời gian lưu trú."},
        {"level": 3, "q": "'Want to' is usually pronounced as:",
         "o": ["'wanna'", "'want to' with clear T", "'wan-tee'", "'wont-oo'"],
         "a": "'wanna'",
         "e": "Nghe hiểu: hiện tượng nối âm trong tiếng Anh nói tự nhiên."},
        {"level": 3, "q": "You miss one word. The best strategy is to:",
         "o": ["guess from context", "stop listening entirely",
               "translate every word", "ask the speaker to repeat only that word"],
         "a": "guess from context",
         "e": "Chiến lược nghe: suy ra từ ngữ cảnh thay vì dịch từng từ."},
        {"level": 3, "q": "Choose the correct phrase for a polite request:",
         "o": ["Could you send me the file?", "Send me the file now!",
               "You must send the file.", "Why don't you send nothing?"],
         "a": "Could you send me the file?",
         "e": "'Could you...?' là mẫu câu xin lịch sự nhất trong các lựa chọn."},
    ],
    37: [
        {"level": 1, "q": "I go to work ______ bus.",
         "o": ["by", "on", "with", "in"], "a": "by",
         "e": "Đi bằng phương tiện dùng giới từ 'by'."},
        {"level": 1, "q": "The museum is ______ the park.",
         "o": ["near", "between", "from", "by"], "a": "near",
         "e": "'Near' = gần. 'Between' cần hai danh từ."},
        {"level": 1, "q": "How do you get to the airport? — ______ metro.",
         "o": ["By", "On", "With", "In"], "a": "By",
         "e": "Câu trả lời ngắn bắt đầu bằng 'By' + phương tiện."},
        {"level": 2, "q": "How do you come to school? — I come ______ foot.",
         "o": ["by", "on", "in", "with"], "a": "on",
         "e": "Cụm cố định 'on foot' = đi bộ (không phải 'by foot')."},
        {"level": 2, "q": "There's a pharmacy ______ Nguyễn Huệ Street.",
         "o": ["on", "in", "at", "to"], "a": "on",
         "e": "Đường/phố dùng giới từ 'on'."},
        {"level": 2, "q": "Which is a place where you borrow books?",
         "o": ["library", "hospital", "station", "pharmacy"], "a": "library",
         "e": "Đọc hiểu từ vựng: thư viện là nơi mượn sách."},
        {"level": 3, "q": "The café is ______ the second floor.",
         "o": ["on", "in", "at", "by"], "a": "on",
         "e": "Tầng dùng giới từ 'on': on the second floor."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["I go to work by foot.", "I go to work on foot.",
               "I go to work with foot.", "I go to work at foot."],
         "a": "I go to work on foot.",
         "e": "'On foot' là cụm cố định duy nhất."},
        {"level": 3, "q": "Which building do you go to when you are ill?",
         "o": ["hospital", "bank", "library", "market"], "a": "hospital",
         "e": "Suy luận từ ngữ cảnh: khi bị ốm → bệnh viện."},
    ],
    38: [
        {"level": 1, "q": "Every day i get up at six. Which version is correct?",
         "o": ["Every day I get up at six.", "Every day i get up at six.",
               "Every day I get up at six o'clock!", "every Day I Get up at six."],
         "a": "Every day I get up at six.",
         "e": "Viết câu: chữ cái đầu câu phải viết hoa."},
        {"level": 1, "q": "She ______ reading books very much.",
         "o": ["like", "likes", "is like", "are like"], "a": "likes",
         "e": "Chủ ngữ she + động từ like → thêm -s. 'Very much' đặt cuối câu."},
        {"level": 1, "q": "My brother ______ football last Sunday.",
         "o": ["play", "plays", "played", "playing"], "a": "played",
         "e": "'Last Sunday' → thì quá khứ; chủ ngữ he → played."},
        {"level": 2, "q": "I ______ Vietnamese now.",
         "o": ["study", "studies", "am study", "am studying"], "a": "am studying",
         "e": "'Now' → đang làm ở hiện tại: am + V-ing."},
        {"level": 2, "q": "She was tired, ______ she finished her homework.",
         "o": ["so", "but", "because", "and"], "a": "but",
         "e": "'But' nối hai ý trái ngược (mệt nhưng vẫn làm xong)."},
        {"level": 2, "q": "Which sentence has a subject AND a verb?",
         "o": ["My sister is a doctor.", "My sister.", "is a doctor.", "Doctor."],
         "a": "My sister is a doctor.",
         "e": "Câu hoàn chỉnh cần cả chủ ngữ (My sister) và động từ (is)."},
        {"level": 3, "q": "Choose the correct sentence:",
         "o": ["I very like music.", "I like music very much.",
               "I am very like music.", "I like very much music."],
         "a": "I like music very much.",
         "e": "Trong tiếng Anh, 'very' đứng trước tính từ, không đứng trước động từ."},
        {"level": 3, "q": "Which sentence is correct?",
         "o": ["He is study now.", "He study now.", "He studies now.",
               "He is studying now."],
         "a": "He is studying now.",
         "e": "'Now' cần cấu trúc tiếp diễn: is + V-ing."},
        {"level": 3, "q": "Which checklist item is NOT needed before submitting writing?",
         "o": ["Start every sentence with a capital letter", "End the sentence with a full stop",
               "Translate every word into Vietnamese", "Check verb tense"],
         "a": "Translate every word into Vietnamese",
         "e": "Dịch từng từ làm sai cấu trúc; cần kiểm tra chữ hoa, dấu chấm, thì động từ."},
    ],
}


def seed(dry_run: bool = False) -> None:
    db: Session = SessionLocal()
    try:
        topics = db.query(Topic).all()
        topic_by_id = {t.id: t for t in topics}

        lessons_added = 0
        questions_added = 0
        skipped_lessons: list[int] = []
        skipped_questions: list[int] = []

        for tid, data in LESSONS.items():
            if tid not in topic_by_id:
                print(f"  [BO QUA] topic {tid} khong ton tai")
                continue
            existing = db.query(Lesson).filter(Lesson.topic_id == tid).count()
            if existing:
                skipped_lessons.append(tid)
                continue
            topic = topic_by_id[tid]
            lesson = Lesson(
                topic_id=tid,
                name=data["name"],
                content_type=LessonContentType.TEXT,
                content=data["content"],
                order_index=1,
            )
            db.add(lesson)
            lessons_added += 1
            print(f"  + lesson cho topic {tid}: {data['name'][:40]}")

        for tid, items in QUESTIONS.items():
            if tid not in topic_by_id:
                continue

            # Idempotent: bỏ câu đã có sẵn theo (topic_id, question_text) để
            # chạy lại script không tạo trùng. Lần chạy đầu tiên đã insert 9 câu
            # cho topic 23-38, lần thứ hai sẽ thấy chúng và bỏ qua.
            existing_texts = {
                t for (t,) in db.query(Question.question_text).filter(
                    Question.topic_id == tid,
                    Question.purpose == QuestionPurpose.PRACTICE,
                ).all()
            }

            added_here = 0
            for item in items:
                if item["q"] in existing_texts:
                    continue
                q = Question(
                    topic_id=tid,
                    purpose=QuestionPurpose.PRACTICE,
                    question_format=QuestionFormat.STANDARD,
                    question_text=item["q"],
                    options=item["o"],
                    correct_answer=item["a"],
                    explanation=item["e"],
                    level=item["level"],
                    is_ai_generated=False,
                    is_reviewed=True,
                )
                db.add(q)
                questions_added += 1
                added_here += 1

            count = db.query(func.count(Question.id)).filter(
                Question.topic_id == tid,
                Question.purpose == QuestionPurpose.PRACTICE,
            ).scalar()
            if added_here:
                print(f"  + {added_here} cau moi cho topic {tid} (tong practice: {count})")

        if dry_run:
            db.rollback()
            print(f"\n[DRY RUN] se them {lessons_added} bai giang, {questions_added} cau hoi.")
        else:
            db.commit()
            print(f"\n[DA SEED] {lessons_added} bai giang, {questions_added} cau hoi.")
            if skipped_lessons:
                print(f"  Bo qua (da co bai giang): topic {skipped_lessons}")
            if skipped_questions:
                print(f"  Bo qua (da du cau hoi): topic {skipped_questions}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed bai giang + cau hoi")
    parser.add_argument("--dry-run", action="store_true", help="Khong ghi vao DB")
    args = parser.parse_args()
    seed(dry_run=args.dry_run)