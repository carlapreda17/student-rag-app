import os
import uuid
import time
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models
from src.services.ingestion import validate_file, extract_text, text_splitter, embeddings_model, qdrant, COLLECTION_NAME, get_file_extension
from openai import OpenAI
from pydantic import BaseModel
from src.services.retrieval import embed_intrebare,construieste_filtru,cauta_chunks,construieste_context,genereaza_raspuns, rerankeaza_chunks
from src.routers.auth_routes import get_current_user
from database.database import get_db
from database.models.question import ChatInteraction
from sqlalchemy.orm import Session
from src.services.utils import  cleanup_old_messages
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_

CANDIDATE_K = 10
FINAL_K = 4
HISTORY_RETENTION_DAYS = 10


load_dotenv()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
router = APIRouter(tags=["RAG Sistem"])

class ChatRequest(BaseModel):
    intrebare: str
    doc_ids: list[str] | None = None  # None = caută în toate documentele userului
    top_k: int = 4

class SuggestiiRequest(BaseModel):
    doc_ids: list[str] | None = None
    numar_sugestii: int = 3

class FeedbackRequest(BaseModel):
    message_id: str
    feedback: bool | None  # True = like, False = dislike, None = retras

@router.post("/chat")
async def chat(req: ChatRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user["id"]

    if not req.intrebare.strip():
        raise HTTPException(status_code=400, detail="Întrebarea nu poate fi goală.")
    # 1. Embed întrebarea
    try:
        vector_intrebare = embed_intrebare(req.intrebare)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare embeddings: {str(e)}")

    try:
        filtru = construieste_filtru(user_id, req.doc_ids)
        puncte = cauta_chunks(vector_intrebare, filtru, req.top_k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare căutare: {str(e)}")
    if not puncte:
        return {
            "raspuns": "Nu am găsit informații relevante în documentele selectate. Încearcă să reformulezi întrebarea.",
            "surse": [],
        }

    # 4. Reranking
    puncte = rerankeaza_chunks(req.intrebare, puncte, top_n=FINAL_K)

    # 5. Construiește contextul
    context, surse, chunks = construieste_context(puncte)

    # 6. Generează răspunsul GPT
    start = time.time()
    try:
        raspuns, tokens = genereaza_raspuns(req.intrebare, context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare GPT: {str(e)}")
    latency_ms = int((time.time() - start) * 1000)

    new_interaction_id = str(uuid.uuid4())

    # 7. Salvează interacțiunea în DB (chunks cu text pentru evaluare RAG)
    db.add(ChatInteraction(
            interaction_id=new_interaction_id,
            user_id=user_id,
            question=req.intrebare,
            answer=raspuns,
            contexts=chunks,
            model_used="gpt-4o-mini",
            latency_ms=latency_ms,
        ))
    db.commit()

    cleanup_old_messages(db, user_id)

    return {
        "raspuns": raspuns,
        "surse":   surse,
        "tokens": tokens,
        "message_id": new_interaction_id,
    }

@router.get("/chat/history")
async def get_chat_history(user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user["id"]
 
    # Curăță automat mesajele expirate înainte de a returna
    cleanup_old_messages(db, user_id)
 
    cutoff = datetime.now(timezone.utc) - timedelta(days=HISTORY_RETENTION_DAYS)
 
    interactions = (
        db.query(ChatInteraction)
        .filter(
            and_(
                ChatInteraction.user_id == user_id,
                ChatInteraction.created_at >= cutoff,
            )
        )
        .order_by(ChatInteraction.created_at.asc())
        .all()
    )
 
    history = []
    for row in interactions:
        # Adaugă mesajul user-ului
        history.append({
            "id": f"user-{row.interaction_id}",
            "role": "user",
            "text": row.question,
            "timestamp": row.created_at.isoformat(),
        })
        # Adaugă răspunsul asistentului
        history.append({
            "id": row.interaction_id,
            "role": "assistant",
            "text": row.answer,
            "tokens": None,  # nu mai avem tokens salvat, opțional de adăugat
            "feedback": row.feedback,
            "timestamp": row.created_at.isoformat(),
        })
 
    return {"messages": history}

@router.delete("/chat/history")
async def delete_chat_history(user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user["id"]
    deleted = db.query(ChatInteraction).filter(
        ChatInteraction.user_id == user_id
    ).delete(synchronize_session="fetch")
    db.commit()
    return {"status": "success", "deleted_count": deleted}
 


@router.post("/sugestii-intrebari")
async def genereaza_sugestii(req: SuggestiiRequest, user=Depends(get_current_user)):
    user_id = user["id"]

    # Ia câteva chunk-uri reprezentative (primele din fiecare doc)
    filtru_conditii = [
        models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))
    ]
    if req.doc_ids:
        filtru_conditii.append(
            models.FieldCondition(key="doc_id", match=models.MatchAny(any=req.doc_ids))
        )

    results = qdrant.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=models.Filter(must=filtru_conditii),
        limit=6,  # primele 6 chunk-uri
        with_payload=True,
        with_vectors=False,
    )

    if not results[0]:
        return {"sugestii": []}

    # Construiește un rezumat din chunk-uri
    texte = [p.payload.get("text", "")[:300] for p in results[0]]
    context_preview = "\n---\n".join(texte)

    raspuns = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Generează exact {n} întrebări scurte și utile pe care un student "
                    "le-ar pune despre conținutul de mai jos. "
                    "Returnează DOAR un JSON array de stringuri, fără alte explicații."
                   "Regula: Intrebarile trebuie sa fie in limba romana"
                ).format(n=req.numar_sugestii),
            },
            {"role": "user", "content": context_preview},
        ],
        temperature=0.7,
        max_tokens=300,
    )

    # după ce primești răspunsul GPT
    raw_content = raspuns.choices[0].message.content
    print(f"[SUGESTII RAW]: {raw_content}")


    if raw_content.startswith("```"):
        raw_content = raw_content.split("\n", 1)[-1]  # elimină prima linie ```json
        raw_content = raw_content.rsplit("```", 1)[0]  # elimină ultimul ```
        raw_content = raw_content.strip()

    try:
        import json
        sugestii = json.loads(raw_content)
    except (json.JSONDecodeError, IndexError):
        print(f"[SUGESTII] JSON parse failed for: {raw_content}")
        sugestii = []

    return {"sugestii": sugestii}


@router.post("/chat/feedback")
async def save_feedback(req: FeedbackRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    # Căutăm interacțiunea în baza de date după acel UUID
    interaction = db.query(ChatInteraction).filter(ChatInteraction.interaction_id == req.message_id).first()
    print(req.message_id, interaction.interaction_id)
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Mesajul nu a fost găsit.")
    
    # Actualizăm coloana feedback
    interaction.feedback = req.feedback
    db.commit()
    
    return {"status": "success", "message": "Feedback actualizat."}