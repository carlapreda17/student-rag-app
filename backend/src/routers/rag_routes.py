import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models
from src.services.ingestion import validate_file, extract_text, text_splitter, embeddings_model, qdrant, COLLECTION_NAME, get_file_extension
from openai import OpenAI
from pydantic import BaseModel
from src.services.retrieval import embed_intrebare,construieste_filtru,cauta_chunks,construieste_context,genereaza_raspuns
from src.routers.auth_routes import get_current_user


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


@router.post("/chat")
async def chat(req: ChatRequest, user=Depends(get_current_user)):
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
    # 4. Construiește contextul
    context, surse = construieste_context(puncte)
    
    # 5. Generează răspunsul GPT
    try:
        raspuns, tokens = genereaza_raspuns(req.intrebare, context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare GPT: {str(e)}")
    return {
        "raspuns": raspuns,
        "surse":   surse,
        "tokens": tokens,
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