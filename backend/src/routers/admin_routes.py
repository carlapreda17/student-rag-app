import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.database import get_db
from database.models.user import User
from database.models.question import ChatInteraction
from src.routers.auth_routes import get_current_user
from src.routers.auth_routes import get_current_admin
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List
from datetime import datetime
from src.services.rag_evaluation import run_deepeval_evaluation


load_dotenv()
router = APIRouter(
    prefix="/admin",
    tags=["Admin"] #grupare rute in swagger
)

class FailedInteraction(BaseModel):
    id: str
    question: str
    answer: str
    latency_ms: int | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/stats")
async def get_admin_stats(admin_user = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Opțional: Verificăm dacă utilizatorul este admin (în funcție de cum e definit în token-ul tău)
   
    
    # Interogăm baza de date pentru numărul total de înregistrări

    total_users = db.query(User).count()
    total_interactions = db.query(ChatInteraction).count()

    total_likes = db.query(ChatInteraction).filter(ChatInteraction.feedback == True).count()
    total_dislikes = db.query(ChatInteraction).filter(ChatInteraction.feedback == False).count()
    
    return {
        "total_users": total_users,
        "total_interactions": total_interactions,
        "total_likes": total_likes,
        "total_dislikes": total_dislikes
    }

@router.get("/failed-interactions", response_model=List[FailedInteraction])
async def get_failed_interactions(
    admin_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Extragem ultimele 50 de interacțiuni care au primit Dislike (feedback == False)
    failed_logs = db.query(ChatInteraction)\
        .filter(ChatInteraction.feedback == False)\
        .order_by(ChatInteraction.created_at.desc())\
        .limit(100)\
        .all()
    
    # Mapăm `interaction_id` la `id` pentru interfața de React
    results = []
    for log in failed_logs:
        results.append({
            "id": log.interaction_id,
            "question": log.question,
            "answer": log.answer,
            "latency_ms": log.latency_ms,
            "created_at": log.created_at
        })
        
    return results

@router.post("/evaluate/{interaction_id}")
async def evaluate_rag_interaction(
    interaction_id: str, 
    admin_user = Depends(get_current_admin), 
    db: Session = Depends(get_db)
):
    print(f"Evaluare interacțiune {interaction_id} de către admin {admin_user['username']}")
    
    # 1. Extragem interacțiunea din BD
    interaction = db.query(ChatInteraction).filter(ChatInteraction.interaction_id == interaction_id).first()
    
    if not interaction:
        raise HTTPException(status_code=404, detail="Interacțiunea nu a fost găsită.")
        
    if not interaction.contexts:
        raise HTTPException(status_code=400, detail="Această interacțiune nu are context salvat.")

    # 2. Curățăm contextul (DeepEval are nevoie de o listă simplă de stringuri)
    curated_contexts = []
    if isinstance(interaction.contexts, list):
        for c in interaction.contexts:
            if isinstance(c, dict) and "text" in c:
                curated_contexts.append(c["text"])
            elif isinstance(c, str):
                curated_contexts.append(c)
    else:
        curated_contexts = [str(interaction.contexts)]

    if not curated_contexts:
        raise HTTPException(status_code=400, detail="Contextul nu a putut fi formatat pentru evaluare.")

    # 3. Apelăm funcția izolată de DeepEval!
    # run_in_executor previne blocarea event loop-ului FastAPI de către apelurile sincrone DeepEval
    try:
        loop = asyncio.get_event_loop()
        metrics = await loop.run_in_executor(
            None,
            lambda: run_deepeval_evaluation(
                question=interaction.question,
                answer=interaction.answer,
                contexts=curated_contexts
            )
        )

        return {
            "status": "success",
            "metrics": metrics,
        }
    except Exception as e:
        print(f"[EROARE SERVICIU DEEPEVAL]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-usage")
async def get_daily_usage(
    admin_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returnează nr. de interacțiuni pe zi (ultimele 14 zile), cu like/dislike."""
    from datetime import datetime, timedelta
    from sqlalchemy import func, case

    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)

    # Grupăm pe zi și numărăm total / likes / dislikes
    results = db.query(
        func.date(ChatInteraction.created_at).label("date"),
        func.count(ChatInteraction.id).label("total"),
        func.sum(
            case((ChatInteraction.feedback == True, 1), else_=0)
        ).label("likes"),
        func.sum(
            case((ChatInteraction.feedback == False, 1), else_=0)
        ).label("dislikes"),
    ).filter(
        ChatInteraction.created_at >= fourteen_days_ago
    ).group_by(
        func.date(ChatInteraction.created_at)
    ).order_by(
        func.date(ChatInteraction.created_at)
    ).all()

    return [
        {
            "date": str(row.date),
            "total": row.total,
            "likes": int(row.likes or 0),
            "dislikes": int(row.dislikes or 0),
        }
        for row in results
    ]


@router.get("/interactions")
async def get_all_interactions(
    admin_user = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returnează toate interacțiunile cu feedback-ul lor (pentru pagina Graphics)."""
    logs = db.query(ChatInteraction)\
        .order_by(ChatInteraction.created_at.desc())\
        .limit(200)\
        .all()

    results = []
    for log in logs:
        # Determinăm feedback-ul ca string
        if log.feedback is True:
            feedback = "like"
        elif log.feedback is False:
            feedback = "dislike"
        else:
            feedback = "none"

        results.append({
            "id": log.interaction_id,
            "question": log.question,
            "answer": log.answer,
            "feedback": feedback,
            "created_at": log.created_at,
        })

    return results