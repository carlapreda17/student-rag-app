import json
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database.models.question import ChatInteraction
from datetime import datetime, timedelta, timezone

def parse_options(val):
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val) if val else {}
    except Exception:
        return {}

def cleanup_old_messages(db: Session, user_id: int, HISTORY_RETENTION_DAYS: int = 10):
    """Șterge interacțiunile utilizatorului mai vechi de HISTORY_RETENTION_DAYS zile."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=HISTORY_RETENTION_DAYS)
    deleted = db.query(ChatInteraction).filter(
        and_(
            ChatInteraction.user_id == user_id,
            ChatInteraction.created_at < cutoff,
        )
    ).delete(synchronize_session="fetch")
    if deleted > 0:
        db.commit()
    return deleted