from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.content.schemas import (
    ChapterSummary, CourseDetail, CourseSummary, LessonDetail, LessonSummary,
    TopicSummary,
)
from app.content.service import (
    get_chapter_detail, get_chapter_topics, get_course_chapters,
    get_course_detail, get_lesson_detail, get_public_courses,
    get_topic_detail, get_topic_lessons,
)
from core.database import get_db

router = APIRouter(tags=["content"])


@router.get("/courses", response_model=list[CourseSummary])
def list_courses(db: Session = Depends(get_db)):
    return get_public_courses(db)


@router.get("/courses/{course_id}", response_model=CourseDetail)
def get_course(course_id: int, db: Session = Depends(get_db)):
    try:
        return get_course_detail(db, course_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/courses/{course_id}/chapters", response_model=list[ChapterSummary])
def get_course_chapters_route(course_id: int, db: Session = Depends(get_db)):
    try:
        return get_course_chapters(db, course_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/chapters/{chapter_id}", response_model=ChapterSummary)
def get_chapter(chapter_id: int, db: Session = Depends(get_db)):
    try:
        return get_chapter_detail(db, chapter_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/chapters/{chapter_id}/topics", response_model=list[TopicSummary])
def get_chapter_topics_route(chapter_id: int, db: Session = Depends(get_db)):
    try:
        return get_chapter_topics(db, chapter_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/topics/{topic_id}", response_model=TopicSummary)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    try:
        return get_topic_detail(db, topic_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/topics/{topic_id}/lessons", response_model=list[LessonSummary])
def get_topic_lessons_route(topic_id: int, db: Session = Depends(get_db)):
    try:
        return get_topic_lessons(db, topic_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(lesson_id: int, db: Session = Depends(get_db)):
    try:
        return get_lesson_detail(db, lesson_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
