from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.types import JSON
from sqlalchemy.sql import func
import uuid
from database.database import Base


class ChatInteraction(Base):
    __tablename__ = "chat_interactions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    interaction_id = Column(String(36), unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    contexts = Column(JSON, nullable=True)
    model_used = Column(String(50), nullable=False)
    latency_ms = Column(Integer, nullable=True)
    feedback = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
