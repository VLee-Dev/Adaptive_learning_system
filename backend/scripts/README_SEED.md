# Hướng dẫn chạy seed data

## Admin Account (Tự động)

**Admin account được tạo tự động bởi migration:**
- Khi chạy `alembic upgrade head`, admin account sẽ được tạo
- **Email:** admin@adaptive.com
- **Password:** Admin@123
- **Role:** ADMIN
- ⚠️ **QUAN TRỌNG:** Đổi password này trong production!

## Seed Script (Chỉ tạo sample course)

### Bước 1: Cài đặt dependencies (nếu chưa có)
```bash
cd backend
pip install -r requirements.txt
```

### Bước 2: Chạy migration (tạo admin tự động)
```bash
alembic upgrade head
```

### Bước 3: Chạy seed script (tạo sample course)
```bash
python scripts/seed.py
```

## Dữ liệu sample course:

- **1 Course:** "English Grammar Fundamentals"
- **1 Chapter:** "Basic Tenses"
- **2 Topics:** 
  - Present Simple (11 practice questions ở 3 levels)
  - Past Simple (8 practice questions ở 3 levels)
- **2 Lessons:** Giải thích lý thuyết cho mỗi topic
- **1 Chapter Final Test:** 5 câu hỏi được tổ chức theo slot/pool system
- **Practice Configuration:** Đã cấu hình sẵn cho cả 2 topics

## Test API sau khi seed:

### Admin Login (Tự động có sau migration)
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adaptive.com","password":"Admin@123"}'
```

### Student Flow
1. **Đăng ký/Đăng nhập user**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","username":"student","password":"pass123","full_name":"Test Student"}'
```

2. **Enroll vào course**
```bash
curl -X POST http://localhost:8000/courses/1/enroll \
  -H "Authorization: Bearer <token>"
```

3. **Thử practice API**
```bash
curl http://localhost:8000/learning/topics/1/practice/next \
  -H "Authorization: Bearer <token>"
```

4. **Submit answer**
```bash
curl -X POST http://localhost:8000/learning/topics/1/practice/answer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question_id":1,"selected_answer":"go"}'
```

5. **Xem mastery**
```bash
curl http://localhost:8000/learning/topics/1/mastery \
  -H "Authorization: Bearer <token>"
```

6. **Làm chapter test**
```bash
# Start test
curl -X POST http://localhost:8000/learning/chapters/1/test/start \
  -H "Authorization: Bearer <token>"

# Submit test (sau khi có test_session_id)
curl -X POST http://localhost:8000/learning/chapters/test/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test_session_id":"...","answers":{"1":"goes","2":"Did","3":"did","4":"moves","5":"gave"}}'
```

## Lưu ý:
- **Admin account được tạo tự động bởi migration**, không cần seed script
- Seed script CHỈ tạo sample course data để test
- Script có thể chạy lại nhiều lần (sẽ báo lỗi nếu course đã tồn tại)
- Xem chi tiết API documentation tại `API_DOCUMENTATION.md`
