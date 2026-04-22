from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: str
    phone: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class QuestionResult(BaseModel):
    question_index: int
    question_text: str
    correct_answer: str
    user_answer: str | None
    is_correct: bool | None
    explanation: str
    options: dict | None  


class SaveTestResultRequest(BaseModel):
    test_id: str
    doc_id: str
    difficulty: str
    num_questions: int
    score: int
    questions: list[QuestionResult] = []


class UpdateTestResultRequest(BaseModel):
    test_id: str
    score: int
    questions: list[QuestionResult]  

class AppleLoginRequest(BaseModel):
    appleToken: str
    firstName: str | None = None
    lastName: str | None = None
    appleEmail: str | None = None