import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from src.services.ingestion import validate_file, extract_text, text_splitter, embeddings_model, qdrant, COLLECTION_NAME, get_file_extension
from qdrant_client.http import models
from database.database import get_db
from openai import OpenAI
from pydantic import BaseModel
from src.routers.auth_routes import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from schemas import SaveTestResultRequest
from database.models.test import Test, TestQuestion


load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
router = APIRouter(tags=["Documents System"])

class EstimateRequest(BaseModel):
    doc_id: str

class GenerateTestRequest(BaseModel):
    doc_id: str
    num_questions: int = 10        # 10, 15 sau 20
    difficulty: str = "medium"     # easy, medium, hard

class SubmitTestRequest(BaseModel):
    test_id: str
    answers: dict[str, str]  # {"1": "B", "2": "A", ...}

class EstimateRequest(BaseModel):
    doc_id: str


DIFFICULTY_PROMPTS = {
    "easy": """Generează întrebări UȘOARE:
- Bazate pe fapte explicite menționate direct în text
- Testează recunoașterea și memorarea informațiilor
- Răspunsul corect trebuie să fie clar menționat în text
- Distractorii (răspunsurile greșite) trebuie să fie evident diferiți de răspunsul corect
- Evită formulări ambigue sau capcane""",

    "medium": """Generează întrebări de dificultate MEDIE:
- Testează înțelegerea și aplicarea conceptelor, nu doar memorarea
- Unele întrebări pot necesita combinarea a 2 informații din text
- Distractorii trebuie să fie plauzibili dar incorect formulați
- Include întrebări de tip "care dintre următoarele..." sau "conform textului..." """,

    "hard": """Generează întrebări DIFICILE:
- Testează gândirea critică, analiza și sinteza informațiilor
- Necesită inferențe din text sau comparații între concepte diferite
- Distractorii trebuie să fie FOARTE plauzibili și apropiați de răspunsul corect
- Include întrebări de tip "care NU este corect", scenarii aplicative, sau întrebări care cer evaluarea unor afirmații
- Unele întrebări pot necesita înțelegerea implicațiilor, nu doar a faptelor explicite""",
}

@router.post("/estimate-questions")
async def estimate_questions(req: EstimateRequest, user=Depends(get_current_user)):
    user_id = user["id"]

    results = qdrant.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                models.FieldCondition(key="doc_id", match=models.MatchValue(value=req.doc_id)),
            ]
        ),
        limit=500,
        with_payload=True,
        with_vectors=False,
    )

    chunks = results[0]
    if not chunks:
        raise HTTPException(status_code=404, detail="Documentul nu a fost găsit.")

    # Concatenează textul real și numără cuvintele efectiv
    full_text = " ".join(p.payload.get("text", "") for p in chunks)
    total_chars = len(full_text)
    total_words = len(full_text.split())

    # ~1 întrebare la 80 de cuvinte
    max_questions = max(5, total_words // 80)

    if max_questions >= 20:
        recommended_options = [10, 15, 20]
    elif max_questions >= 15:
        recommended_options = [5, 10, 15]
    elif max_questions >= 10:
        recommended_options = [5, 10]
    else:
        recommended_options = [5, max_questions] if max_questions > 5 else [max_questions]

    recommended_options = sorted(set(recommended_options))

    print(f"Estimare pentru doc_id={req.doc_id}: {total_chars} caractere, {total_words} cuvinte, recomandat {recommended_options} întrebări.")
    return {
        "total_characters": total_chars,
        "total_words": total_words,
        "max_questions": max_questions,
        "recommended_options": recommended_options,
        "num_chunks": len(chunks),
    }

@router.post("/generate-test")
async def generate_test(req: GenerateTestRequest, user=Depends(get_current_user)):
    user_id = user["id"]

    # Validări
    if req.num_questions not in [10, 15, 20]:
        raise HTTPException(status_code=400, detail="Numărul de întrebări trebuie să fie 10, 15 sau 20.")
    if req.difficulty not in DIFFICULTY_PROMPTS:
        raise HTTPException(status_code=400, detail="Dificultatea trebuie să fie: easy, medium sau hard.")

    # 1. Ia TOATE chunk-urile documentului din Qdrant (ordonate)
    results = qdrant.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                models.FieldCondition(key="doc_id", match=models.MatchValue(value=req.doc_id)),
            ]
        ),
        limit=500,  # suficient pentru orice document
        with_payload=True,
        with_vectors=False,
    )

    chunks = results[0]
    if not chunks:
        raise HTTPException(status_code=404, detail="Documentul nu a fost găsit.")

    # Sortează chunk-urile după ordinea din document
    chunks_sorted = sorted(chunks, key=lambda p: p.payload.get("chunk_index", 0))

    # Concatenează textul (cu limită pentru context window)
    full_text = "\n\n".join([p.payload.get("text", "") for p in chunks_sorted])
    MAX_CHARS = 25000  # ~6000 tokeni, lasă loc pentru prompt + răspuns
    if len(full_text) > MAX_CHARS:
        full_text = full_text[:MAX_CHARS] + "\n\n[...textul a fost trunchiat...]"

    total_words = len(full_text.split())
    max_questions = max(5, total_words // 80)

    if req.num_questions > max_questions:
        raise HTTPException(
            status_code=400,
            detail=f"Documentul este prea scurt pentru {req.num_questions} întrebări. "
                f"Maximum recomandat: {max_questions} întrebări."
        )

    # 2. Generează întrebările cu GPT
    system_prompt = f"""Ești un profesor universitar expert care creează teste grilă de înaltă calitate.

    REGULI STRICTE:
    - Generează EXACT {req.num_questions} întrebări grilă
    - Fiecare întrebare are exact 4 variante: A, B, C, D
    - Exact UN SINGUR răspuns corect per întrebare
    - Întrebările și răspunsurile trebuie să fie în limba ROMÂNĂ
    - Formulări clare, fără ambiguitate
    - Variază tipurile de întrebări (definiții, comparații, cauze-efect, aplicații, clasificări)
    - Bazează-te EXCLUSIV pe textul furnizat, nu inventa informații

    {DIFFICULTY_PROMPTS[req.difficulty]}

    FORMAT RĂSPUNS - returnează DOAR un JSON array valid, fără markdown, fără explicații:
    [
    {{
        "id": 1,
        "question": "Textul întrebării?",
        "options": {{
        "A": "Prima variantă",
        "B": "A doua variantă",
        "C": "A treia variantă",
        "D": "A patra variantă"
        }},
        "correct": "B",
        "explanation": "Explicație scurtă (1-2 propoziții) de ce acest răspuns este corect"
    }}
    ]"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generează {req.num_questions} întrebări grilă din următorul text:\n\n{full_text}"},
            ],
            temperature=0.6,  # puțină creativitate dar nu prea multă
            max_tokens=4096,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la generarea testului: {str(e)}")

    # 3. Parsează răspunsul
    raw = response.choices[0].message.content.strip()

    # Curăță markdown dacă GPT adaugă ```json ... ```
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        raw = raw.rsplit("```", 1)[0].strip()

    import json
    try:
        questions = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI-ul a returnat un format invalid. Încearcă din nou.")

    # Validare minimală
    if not isinstance(questions, list) or len(questions) != req.num_questions:
        raise HTTPException(
            status_code=500,
            detail=f"Număr incorect de întrebări generate ({len(questions)} în loc de {req.num_questions}). Încearcă din nou."
        )

    # 4. Generează test_id și returnează
    test_id = str(uuid.uuid4())

    # Opțional: salvează testul în Qdrant ca metadata (sau într-o DB separată)
    # Pentru moment, returnăm direct
    return {
        "test_id": test_id,
        "doc_id": req.doc_id,
        "difficulty": req.difficulty,
        "num_questions": req.num_questions,
        "questions": questions,
        "tokens_used": response.usage.total_tokens if response.usage else None,
    }



@router.post("/upload-curs")
async def upload_curs(
    file: UploadFile = File(...),
    folder: str = Form(default="General"),
    user = Depends(get_current_user) 
):
    user_id = user["id"]  # temporar până legi autentificarea

    print(f"----------------{user}")
    # 1. Validare
    validate_file(file.filename, file.content_type)

    # 2. Extragere text
    text_complet = await extract_text(file)

    if not text_complet.strip():
        raise HTTPException(
            status_code=400,
            detail="Documentul pare gol sau nu conține text selectabil. "
                   "PDF-urile scanate (imagini) nu sunt suportate momentan.",
        )

    # 3. Chunking
    chunks = text_splitter.split_text(text_complet)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Nu s-au putut extrage fragmente de text din document.",
        )

    # 4. Embeddings
    try:
        vectors = embeddings_model.embed_documents(chunks)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la generarea embeddings: {str(e)}",
        )

    # 5. Salvare în Qdrant
    doc_id = str(uuid.uuid4())  # ID comun pentru toate chunk-urile din același fișier

    puncte_qdrant = [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=vectors[i],
            payload={
                "user_id":     user_id,
                "doc_id":      doc_id,          # grupare chunk-uri per document
                "nume_fisier": file.filename,
                "folder":      folder,
                "tip_fisier":  get_file_extension(file.filename).lstrip(".").upper(),
                "chunk_index": i,               # ordinea în document
                "text":        chunk,
            },
        )
        for i, chunk in enumerate(chunks)
    ]

    try:
        qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=puncte_qdrant,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la salvarea în baza de date: {str(e)}",
        )

    return {
        "mesaj":              "Documentul a fost procesat și salvat cu succes!",
        "doc_id":             doc_id,
        "nume_fisier":        file.filename,
        "folder":             folder,
        "tip_fisier":         get_file_extension(file.filename).lstrip(".").upper(),
        "chunk-uri_salvate":  len(chunks),
        "caractere_total":    len(text_complet),
    }


@router.get("/documente")
async def get_documente(user=Depends(get_current_user)): 
    user_id = user["id"]
    print(user_id)
    results = qdrant.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=models.Filter(
            must=[models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=user_id)
            )]
        ),
        limit=100,
        with_payload=True,
        with_vectors=False,
    )
    
    # Grupează după doc_id ca să nu repeți același document
    documente = {}
    for point in results[0]:
        doc_id = point.payload["doc_id"]
        if doc_id not in documente:
            documente[doc_id] = {
                "doc_id": doc_id,
                "nume_fisier": point.payload["nume_fisier"],
                "folder": point.payload["folder"],
                "tip_fisier": point.payload["tip_fisier"],
            }
    
    return {"documente": list(documente.values())}

@router.post("/save-test-result")
async def save_test_result(req: SaveTestResultRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    
    nou_test = Test(
        test_id=req.test_id,
        user_id=user["id"],
        doc_id=req.doc_id,
        difficulty=req.difficulty,
        num_questions=req.num_questions,
        score=req.score,
        completed_at=func.now()
    )

    db.add(nou_test)
    db.flush()  # obținem test_id în sesiune înainte de commit

    for q in req.questions:
        db.add(TestQuestion(
            test_id=req.test_id,
            question_index=q.question_index,
            question_text=q.question_text,
            correct_answer=q.correct_answer,
            user_answer=q.user_answer,
            is_correct=q.is_correct,
            explanation=q.explanation,
        ))

    db.commit()

    return {"mesaj": "Rezultatele testului au fost salvate cu succes!"}


@router.get("/my-tests")
async def get_my_tests(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returnează toate testele completate ale utilizatorului,
    inclusiv întrebările cu răspunsurile, ordonate descrescător după dată.
    """
    tests = (
        db.query(Test)
        .filter(Test.user_id == user["id"], Test.score.isnot(None))
        .order_by(Test.completed_at.desc())
        .all()
    )

    result = []
    for t in tests:
        questions = (
            db.query(TestQuestion)
            .filter(TestQuestion.test_id == t.test_id)
            .order_by(TestQuestion.question_index)
            .all()
        )

        # Încearcă să obții numele fișierului din Qdrant sau din documents table
        # Dacă ai tabelul `documents` în SQL:
        # doc = db.query(Document).filter(Document.doc_id == t.doc_id).first()
        # nume_fisier = doc.nume_fisier if doc else t.doc_id

        # Fallback: caută în Qdrant (dacă nu ai tabelul documents în SQL)
        try:
            from src.services.ingestion import qdrant, COLLECTION_NAME
            from qdrant_client.http import models as qdrant_models

            scroll_result = qdrant.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="doc_id",
                            match=qdrant_models.MatchValue(value=t.doc_id)
                        )
                    ]
                ),
                limit=1,
                with_payload=True,
                with_vectors=False,
            )
            chunks = scroll_result[0]
            nume_fisier = chunks[0].payload.get("nume_fisier", t.doc_id) if chunks else t.doc_id
        except Exception:
            nume_fisier = t.doc_id

        result.append({
            "test_id": t.test_id,
            "doc_id": t.doc_id,
            "nume_fisier": nume_fisier,
            "difficulty": t.difficulty,
            "num_questions": t.num_questions,
            "score": t.score,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "questions": [
                {
                    "question_index": q.question_index,
                    "question_text": q.question_text,
                    "correct_answer": q.correct_answer,
                    "user_answer": q.user_answer,
                    "is_correct": q.is_correct,
                    "explanation": q.explanation,
                }
                for q in questions
            ],
        })

    return {"tests": result}


@router.get("/test-questions/{test_id}")
async def get_test_questions(test_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returnează întrebările unui test specific (pentru butonul 'Refă testul').
    Verifică că testul aparține utilizatorului curent.
    """
    test = (
        db.query(Test)
        .filter(Test.test_id == test_id, Test.user_id == user["id"])
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Testul nu a fost găsit.")

    questions = (
        db.query(TestQuestion)
        .filter(TestQuestion.test_id == test_id)
        .order_by(TestQuestion.question_index)
        .all()
    )

    return {
        "test_id": test_id,
        "questions": [
            {
                "id": q.question_index,
                "question": q.question_text,
                "options": q.options if isinstance(q.options, dict) else {},
                "correct": q.correct_answer,
                "explanation": q.explanation,
                # Reset răspunsul utilizatorului pentru reluare
                "user_answer": None,
                "is_correct": None,
            }
            for q in questions
        ],
    }
