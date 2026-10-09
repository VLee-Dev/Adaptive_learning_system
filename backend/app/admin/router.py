from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.admin.dependencies import require_admin
from app.admin.schemas import ChapterAdminResponse, ChapterCreate, ChapterUpdate, CourseAdminResponse, CourseCreate, CourseUpdate, FinalTestCreate, FinalTestResponse, LessonAdminResponse, LessonCreate, LessonUpdate, QuestionAdminResponse, QuestionCreate, QuestionUpdate, TestPoolCreate, TestPoolResponse, TestSlotCreate, TestSlotResponse, TopicAdminResponse, TopicCreate, TopicUpdate
from app.admin.service import assign_pool_to_slot, assign_question_to_pool, create_chapter, create_course, create_final_test, create_lesson, create_question, create_test_pool, create_test_slot, create_topic, get_admin_final_test, list_admin_chapters, list_admin_courses, list_admin_lessons, list_admin_questions, list_admin_topics, remove_chapter, remove_course, remove_lesson, remove_question, remove_topic, update_chapter, update_course, update_lesson, update_question, update_topic
from core.database import get_db
from app.users.model import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/courses", response_model=list[CourseAdminResponse])
def list_courses(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return list_admin_courses(db)


@router.post("/courses", response_model=CourseAdminResponse, status_code=status.HTTP_201_CREATED)
def add_course(payload: CourseCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    return create_course(db, payload)


@router.patch("/courses/{course_id}", response_model=CourseAdminResponse)
def edit_course(course_id: int, payload: CourseUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return update_course(db, course_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        remove_course(db, course_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/courses/{course_id}/chapters", response_model=list[ChapterAdminResponse])
def list_chapters(course_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return list_admin_chapters(db, course_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/courses/{course_id}/chapters", response_model=ChapterAdminResponse, status_code=status.HTTP_201_CREATED)
def add_chapter(course_id: int, payload: ChapterCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_chapter(db, course_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/chapters/{chapter_id}", response_model=ChapterAdminResponse)
def edit_chapter(chapter_id: int, payload: ChapterUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return update_chapter(db, chapter_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(chapter_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        remove_chapter(db, chapter_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/chapters/{chapter_id}/topics", response_model=list[TopicAdminResponse])
def list_topics(chapter_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return list_admin_topics(db, chapter_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/chapters/{chapter_id}/topics", response_model=TopicAdminResponse, status_code=status.HTTP_201_CREATED)
def add_topic(chapter_id: int, payload: TopicCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_topic(db, chapter_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/topics/{topic_id}", response_model=TopicAdminResponse)
def edit_topic(topic_id: int, payload: TopicUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return update_topic(db, topic_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        remove_topic(db, topic_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/topics/{topic_id}/lessons", response_model=list[LessonAdminResponse])
def list_lessons(topic_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return list_admin_lessons(db, topic_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/topics/{topic_id}/lessons", response_model=LessonAdminResponse, status_code=status.HTTP_201_CREATED)
def add_lesson(topic_id: int, payload: LessonCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_lesson(db, topic_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/lessons/{lesson_id}", response_model=LessonAdminResponse)
def edit_lesson(lesson_id: int, payload: LessonUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return update_lesson(db, lesson_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        remove_lesson(db, lesson_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/topics/{topic_id}/questions", response_model=list[QuestionAdminResponse])
def list_questions(topic_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return list_admin_questions(db, topic_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/topics/{topic_id}/questions", response_model=QuestionAdminResponse, status_code=status.HTTP_201_CREATED)
def add_question(topic_id: int, payload: QuestionCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_question(db, topic_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/questions/{question_id}", response_model=QuestionAdminResponse)
def edit_question(question_id: int, payload: QuestionUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return update_question(db, question_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        remove_question(db, question_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/chapters/{chapter_id}/final-test", response_model=FinalTestResponse)
def get_final_test(chapter_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return get_admin_final_test(db, chapter_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/chapters/{chapter_id}/final-test", response_model=FinalTestResponse, status_code=status.HTTP_201_CREATED)
def add_final_test(chapter_id: int, payload: FinalTestCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_final_test(db, chapter_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/final-tests/{test_id}/pools", response_model=TestPoolResponse, status_code=status.HTTP_201_CREATED)
def add_test_pool(test_id: int, payload: TestPoolCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_test_pool(db, test_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/final-tests/{test_id}/slots", response_model=TestSlotResponse, status_code=status.HTTP_201_CREATED)
def add_test_slot(test_id: int, payload: TestSlotCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_test_slot(db, test_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/test-pools/{pool_id}/questions/{question_id}", response_model=TestPoolResponse)
def add_question_to_test_pool(pool_id: int, question_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return assign_question_to_pool(db, pool_id, question_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/test-slots/{slot_id}/pools/{pool_id}", response_model=TestSlotResponse)
def add_pool_to_test_slot(slot_id: int, pool_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return assign_pool_to_slot(db, slot_id, pool_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
