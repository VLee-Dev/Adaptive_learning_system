"""Seed data for testing the adaptive learning system."""
from sqlalchemy.orm import Session

from app.auth.service import hash_password
from app.courses.model import Course
from app.chapters.model import Chapter
from app.topics.model import Topic, TopicType
from app.lessons.model import Lesson
from app.questions.model import Question, QuestionPurpose, QuestionFormat
from app.mastery.model import PracticeConfiguration
from app.chapter_tests.model import ChapterFinalTest, ChapterTestPool, ChapterTestSlot
from app.users.model import User, UserRole
from core.database import SessionLocal


def seed_admin_account(db: Session):
    """
    DEPRECATED: Admin account is now auto-created by migration.
    This function kept for backward compatibility.
    """
    existing_admin = db.query(User).filter(User.email == "admin@adaptive.com").first()
    if existing_admin:
        print("ℹ️  Admin account already exists (created by migration)")
        return existing_admin

    # Fallback: create if somehow migration was skipped
    print("⚠️  Creating admin account (migration may have been skipped)")
    admin = User(
        email="admin@adaptive.com",
        hashed_password=hash_password("Admin@123"),
        role=UserRole.ADMIN,
        full_name="System Administrator"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def seed_sample_course(db: Session):
    """Create a sample course with chapters, topics, lessons, and questions."""

    # Create Course
    course = Course(
        name="English Grammar Fundamentals",
        description="Learn essential English grammar concepts with adaptive practice",
        is_published=True
    )
    db.add(course)
    db.flush()

    # Create Chapter 1: Basic Tenses
    chapter1 = Chapter(
        course_id=course.id,
        name="Basic Tenses",
        description="Master present, past, and future tenses",
        order_index=1
    )
    db.add(chapter1)
    db.flush()

    # Create Topic 1.1: Present Simple
    topic1_1 = Topic(
        chapter_id=chapter1.id,
        name="Present Simple",
        description="Learn to use present simple tense",
        type=TopicType.GRAMMAR,
        order_index=1,
        p_init=0.3,
        p_transit=0.2,
        p_slip=0.1,
        p_guess=0.25
    )
    db.add(topic1_1)
    db.flush()

    # Create Practice Configuration for Topic 1.1
    practice_config1_1 = PracticeConfiguration(
        topic_id=topic1_1.id,
        questions_per_session=5,
        starting_level=1,
        level_1_questions=3,
        level_2_questions=5,
        level_3_questions=3,
        level_up_mastery=0.65,
        completion_mastery=0.85,
        review_mastery=0.4
    )
    db.add(practice_config1_1)

    # Create Lesson for Topic 1.1
    lesson1_1_1 = Lesson(
        topic_id=topic1_1.id,
        name="Introduction to Present Simple",
        content="""
# Present Simple Tense

The present simple tense is used to:
1. Express habits and routines
2. State facts and general truths
3. Express permanent situations

## Structure:
- **Affirmative:** Subject + base verb (+ s/es for he/she/it)
- **Negative:** Subject + do/does not + base verb
- **Question:** Do/Does + subject + base verb?

## Examples:
- I **play** tennis every Sunday.
- She **works** at a bank.
- They **don't like** coffee.
- **Does** he **speak** English?
        """,
        order_index=1
    )
    db.add(lesson1_1_1)

    # Create Practice Questions for Topic 1.1
    questions_topic1_1 = [
        # Level 1 - Easy
        {
            "text": "I ___ to school every day.",
            "options": ["go", "goes", "going", "went"],
            "correct": "go",
            "explanation": "Use 'go' with 'I'. No 's' is added for first person.",
            "level": 1
        },
        {
            "text": "She ___ English very well.",
            "options": ["speak", "speaks", "speaking", "spoke"],
            "correct": "speaks",
            "explanation": "Add 's' to the verb for third person singular (she).",
            "level": 1
        },
        {
            "text": "They ___ in New York.",
            "options": ["live", "lives", "living", "lived"],
            "correct": "live",
            "explanation": "Use base form 'live' with plural subject 'they'.",
            "level": 1
        },
        # Level 2 - Medium
        {
            "text": "He ___ coffee in the morning.",
            "options": ["drink", "drinks", "drinking", "drank"],
            "correct": "drinks",
            "explanation": "Third person singular requires 's' ending.",
            "level": 2
        },
        {
            "text": "We ___ not like vegetables.",
            "options": ["do", "does", "are", "is"],
            "correct": "do",
            "explanation": "Use 'do not' with plural subjects (we, they) and I/you.",
            "level": 2
        },
        {
            "text": "___ she work on Saturdays?",
            "options": ["Do", "Does", "Is", "Are"],
            "correct": "Does",
            "explanation": "Use 'Does' for questions with third person singular subjects.",
            "level": 2
        },
        {
            "text": "My brother ___ his homework every evening.",
            "options": ["do", "does", "doing", "did"],
            "correct": "does",
            "explanation": "Third person singular subject requires 'does'.",
            "level": 2
        },
        {
            "text": "The sun ___ in the east.",
            "options": ["rise", "rises", "rising", "rose"],
            "correct": "rises",
            "explanation": "General truth with third person singular subject needs 's' ending.",
            "level": 2
        },
        # Level 3 - Hard
        {
            "text": "Water ___ at 100 degrees Celsius.",
            "options": ["boil", "boils", "boiling", "boiled"],
            "correct": "boils",
            "explanation": "Scientific fact stated in present simple with 's' for singular subject.",
            "level": 3
        },
        {
            "text": "The museum ___ at 9 AM and ___ at 6 PM.",
            "options": ["opens / closes", "open / close", "opening / closing", "opened / closed"],
            "correct": "opens / closes",
            "explanation": "Both verbs need 's' because the museum (it) is third person singular.",
            "level": 3
        },
        {
            "text": "My parents rarely ___ out during weekdays.",
            "options": ["goes", "go", "going", "went"],
            "correct": "go",
            "explanation": "Plural subject 'parents' takes base form without 's'.",
            "level": 3
        }
    ]

    for q_data in questions_topic1_1:
        question = Question(
            topic_id=topic1_1.id,
            purpose=QuestionPurpose.PRACTICE,
            question_format=QuestionFormat.STANDARD,
            question_text=q_data["text"],
            options=q_data["options"],
            correct_answer=q_data["correct"],
            explanation=q_data["explanation"],
            level=q_data["level"],
            is_ai_generated=False,
            is_reviewed=True
        )
        db.add(question)

    # Create Topic 1.2: Past Simple
    topic1_2 = Topic(
        chapter_id=chapter1.id,
        name="Past Simple",
        description="Learn to use past simple tense",
        type=TopicType.GRAMMAR,
        order_index=2,
        p_init=0.3,
        p_transit=0.2,
        p_slip=0.1,
        p_guess=0.25
    )
    db.add(topic1_2)
    db.flush()

    # Practice config for Topic 1.2
    practice_config1_2 = PracticeConfiguration(
        topic_id=topic1_2.id,
        questions_per_session=5,
        starting_level=1,
        level_1_questions=3,
        level_2_questions=5,
        level_3_questions=3,
        level_up_mastery=0.65,
        completion_mastery=0.85,
        review_mastery=0.4
    )
    db.add(practice_config1_2)

    # Lesson for Topic 1.2
    lesson1_2_1 = Lesson(
        topic_id=topic1_2.id,
        name="Introduction to Past Simple",
        content="""
# Past Simple Tense

The past simple tense is used to describe completed actions in the past.

## Structure:
- **Regular verbs:** Add -ed to base form
- **Irregular verbs:** Use special past form
- **Negative:** Subject + did not + base verb
- **Question:** Did + subject + base verb?

## Examples:
- I **walked** to the store yesterday.
- She **went** to Paris last year. (irregular)
- They **didn't see** the movie.
- **Did** you **finish** your homework?
        """,
        order_index=1
    )
    db.add(lesson1_2_1)

    # Practice questions for Topic 1.2
    questions_topic1_2 = [
        # Level 1
        {
            "text": "I ___ to the park yesterday.",
            "options": ["go", "goes", "went", "going"],
            "correct": "went",
            "explanation": "'Go' is irregular; past simple form is 'went'.",
            "level": 1
        },
        {
            "text": "She ___ her homework last night.",
            "options": ["finish", "finished", "finishing", "finishes"],
            "correct": "finished",
            "explanation": "Regular verb 'finish' + ed = finished in past simple.",
            "level": 1
        },
        {
            "text": "They ___ a movie yesterday.",
            "options": ["watch", "watched", "watching", "watches"],
            "correct": "watched",
            "explanation": "Regular verb 'watch' becomes 'watched' in past simple.",
            "level": 1
        },
        # Level 2
        {
            "text": "We ___ not go to school last Monday.",
            "options": ["do", "does", "did", "done"],
            "correct": "did",
            "explanation": "Use 'did not' (didn't) for negative past simple.",
            "level": 2
        },
        {
            "text": "___ you see John at the party?",
            "options": ["Do", "Does", "Did", "Done"],
            "correct": "Did",
            "explanation": "Use 'Did' to form questions in past simple.",
            "level": 2
        },
        {
            "text": "He ___ his keys this morning.",
            "options": ["lose", "lost", "losing", "loses"],
            "correct": "lost",
            "explanation": "'Lose' is irregular; past form is 'lost'.",
            "level": 2
        },
        # Level 3
        {
            "text": "The company ___ a new product last quarter.",
            "options": ["launch", "launched", "launching", "launches"],
            "correct": "launched",
            "explanation": "Past simple for completed action: launch + ed.",
            "level": 3
        },
        {
            "text": "She ___ three languages when she was young.",
            "options": ["speak", "spoke", "speaking", "speaks"],
            "correct": "spoke",
            "explanation": "Irregular verb 'speak' becomes 'spoke' in past simple.",
            "level": 3
        }
    ]

    for q_data in questions_topic1_2:
        question = Question(
            topic_id=topic1_2.id,
            purpose=QuestionPurpose.PRACTICE,
            question_format=QuestionFormat.STANDARD,
            question_text=q_data["text"],
            options=q_data["options"],
            correct_answer=q_data["correct"],
            explanation=q_data["explanation"],
            level=q_data["level"],
            is_ai_generated=False,
            is_reviewed=True
        )
        db.add(question)

    db.flush()

    # Create Chapter Final Test for Chapter 1
    final_test = ChapterFinalTest(
        chapter_id=chapter1.id,
        total_questions=5,
        pass_percent=70.0,
        max_attempts=3
    )
    db.add(final_test)
    db.flush()

    # Create test pools
    pool1 = ChapterTestPool(
        test_id=final_test.id,
        name="Present Simple Pool",
        description="Questions testing present simple tense"
    )
    pool2 = ChapterTestPool(
        test_id=final_test.id,
        name="Past Simple Pool",
        description="Questions testing past simple tense"
    )
    db.add_all([pool1, pool2])
    db.flush()

    # Create chapter final test questions and assign to pools
    test_questions = [
        {
            "text": "Sarah ___ to work by bus every day.",
            "options": ["go", "goes", "went", "going"],
            "correct": "goes",
            "explanation": "Present simple with third person singular.",
            "pool": pool1
        },
        {
            "text": "___ they visit their grandparents last weekend?",
            "options": ["Do", "Does", "Did", "Done"],
            "correct": "Did",
            "explanation": "Question in past simple uses 'Did'.",
            "pool": pool2
        },
        {
            "text": "We ___ not understand the lesson yesterday.",
            "options": ["do", "does", "did", "done"],
            "correct": "did",
            "explanation": "Negative past simple uses 'did not'.",
            "pool": pool2
        },
        {
            "text": "The Earth ___ around the Sun.",
            "options": ["move", "moves", "moved", "moving"],
            "correct": "moves",
            "explanation": "Scientific fact in present simple.",
            "pool": pool1
        },
        {
            "text": "My friend ___ me a book last month.",
            "options": ["give", "gives", "gave", "giving"],
            "correct": "gave",
            "explanation": "Irregular verb 'give' becomes 'gave' in past.",
            "pool": pool2
        },
    ]

    question_objects = []
    for q_data in test_questions:
        question = Question(
            topic_id=topic1_1.id if q_data["pool"] == pool1 else topic1_2.id,
            purpose=QuestionPurpose.CHAPTER_FINAL,
            question_format=QuestionFormat.STANDARD,
            question_text=q_data["text"],
            options=q_data["options"],
            correct_answer=q_data["correct"],
            explanation=q_data["explanation"],
            is_ai_generated=False,
            is_reviewed=True
        )
        db.add(question)
        db.flush()
        q_data["pool"].questions.append(question)
        question_objects.append(question)

    # Create test slots
    for i in range(1, 6):
        slot = ChapterTestSlot(
            test_id=final_test.id,
            slot_index=i,
            is_required=True
        )
        db.add(slot)
        db.flush()

        # Assign pools to slots (alternate between pools)
        if i in [1, 2, 4]:
            slot.pools.append(pool1)
        else:
            slot.pools.append(pool2)

    db.commit()
    print("✅ Sample course seeded successfully!")
    print(f"   Course: {course.name}")
    print(f"   Chapters: 1 (Basic Tenses)")
    print(f"   Topics: 2 (Present Simple, Past Simple)")
    print(f"   Practice Questions: {len(questions_topic1_1) + len(questions_topic1_2)}")
    print(f"   Test Questions: {len(test_questions)}")


def main():
    """Run the seed script."""
    db = SessionLocal()
    try:
        print("🌱 Starting database seeding...")
        print("\nℹ️  Note: Admin account is auto-created by migration")
        print("   This script only seeds sample course data for testing\n")

        print("="*50)
        print("Creating Sample Course Data")
        print("="*50)
        seed_sample_course(db)

        print("\n" + "="*50)
        print("🎉 Database seeding completed!")
        print("="*50)
        print("\n📝 Quick Start:")
        print("   1. Admin Login: admin@adaptive.com / Admin@123")
        print("   2. Student Register: Use /auth/register endpoint")
        print("   3. Test APIs: See API_DOCUMENTATION.md")
        print("\n⚠️  IMPORTANT: Change admin password in production!")
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
