from pydantic import BaseModel


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

class SaveTestResultRequest(BaseModel):
    test_id: str
    doc_id: str
    difficulty: str
    num_questions: int
    score: int
    questions: list[QuestionResult] = []