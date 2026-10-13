"""Repository for topic mastery queries."""
from sqlalchemy.orm import Session

from app.mastery.model import TopicMastery


def get_mastery(db: Session, user_id: int, topic_id: int) -> TopicMastery | None:
    """Get mastery record for a specific user and topic."""
    return db.query(TopicMastery).filter(
        TopicMastery.user_id == user_id,
        TopicMastery.topic_id == topic_id
    ).first()
