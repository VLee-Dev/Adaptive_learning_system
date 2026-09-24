"""Repository for mastery and practice configuration queries."""
from sqlalchemy.orm import Session

from app.mastery.model import TopicMastery, PracticeConfiguration


def get_mastery(db: Session, user_id: int, topic_id: int) -> TopicMastery | None:
    """Get mastery record for a specific user and topic."""
    return db.query(TopicMastery).filter(
        TopicMastery.user_id == user_id,
        TopicMastery.topic_id == topic_id
    ).first()


def get_practice_config(db: Session, topic_id: int) -> PracticeConfiguration | None:
    """Get practice configuration for a topic."""
    return db.query(PracticeConfiguration).filter(
        PracticeConfiguration.topic_id == topic_id
    ).first()


def create_practice_config(db: Session, config: PracticeConfiguration) -> PracticeConfiguration:
    """Create a new practice configuration."""
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def update_practice_config(db: Session, config: PracticeConfiguration) -> PracticeConfiguration:
    """Update an existing practice configuration."""
    db.commit()
    db.refresh(config)
    return config
