from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # UUID-ul testului generat în backend (ex: str(uuid.uuid4()))
    test_id = Column(String(36), unique=True, index=True, nullable=False)

    # Legătura (1:N) cu tabela users. Observă că folosim id_user conform modelului tău.
    user_id = Column(Integer, ForeignKey("users.id_user"), nullable=False)

    # Referința către documentul din Qdrant
    doc_id = Column(String(36), index=True, nullable=False)

    difficulty = Column(Enum('easy', 'medium', 'hard', name='difficulty_levels'), nullable=False)
    num_questions = Column(Integer, nullable=False)
    score = Column(Integer, nullable=True)

    # Timestamps
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    test_id = Column(String(36), ForeignKey("tests.test_id"), nullable=False, index=True)
    question_index = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    correct_answer = Column(String(1), nullable=False)
    user_answer = Column(String(1), nullable=True)
    options = Column(JSON, nullable=True) 
    is_correct = Column(Boolean, nullable=True)
    explanation = Column(Text, nullable=False)

    test = relationship("Test", back_populates="questions")