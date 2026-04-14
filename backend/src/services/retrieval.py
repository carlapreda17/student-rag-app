import os
from openai import OpenAI
from qdrant_client.http import models
from sentence_transformers import CrossEncoder
from src.services.ingestion import embeddings_model, qdrant, COLLECTION_NAME

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)

PROMPT_SISTEM = """Ești un asistent educațional inteligent care ajută studenții să învețe.
Răspunde DOAR pe baza fragmentelor din documente furnizate.
Dacă informația nu se găsește în documente, spune clar că nu ai această informație.
Fii concis, clar și structurat. Răspunde în română."""


def embed_intrebare(intrebare: str) -> list[float]:
    """Transformă întrebarea în vector."""
    return embeddings_model.embed_query(intrebare)


def construieste_filtru(user_id: int, doc_ids: list[str] | None) -> models.Filter:
    """Construiește filtrul Qdrant — pe user și opțional pe documente specifice."""
    conditii = [
        models.FieldCondition(
            key="user_id",
            match=models.MatchValue(value=user_id)
        )
    ]

    if doc_ids:
        conditii.append(
            models.FieldCondition(
                key="doc_id",
                match=models.MatchAny(any=doc_ids)
            )
        )

    return models.Filter(must=conditii)


def cauta_chunks(vector: list[float], filtru: models.Filter, top_k: int) -> list:
    """Caută cele mai relevante chunk-uri în Qdrant."""
    rezultate = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=top_k,
        query_filter=filtru,
        with_payload=True,
    )
    return rezultate.points

def rerankeaza_chunks(intrebare: str, puncte: list, top_n: int = 4) -> list:
    """
    Primește 15 chunk-uri de la Qdrant și le re-rankează cu Cross-Encoder.
    Returnează doar primele top_n, ordonate după scorul Cross-Encoder.
    """
    if not puncte:
        return []

    # Construim perechile (întrebare, text_chunk) pentru Cross-Encoder
    texte = [punct.payload.get("text", "") for punct in puncte]
    perechi = [(intrebare, text) for text in texte]

    # Cross-Encoder scorează fiecare pereche
    scoruri = reranker.predict(perechi)  # returnează array de float-uri

    # Asociem scorul Cross-Encoder fiecărui punct
    puncte_cu_scor = list(zip(puncte, scoruri))

    # Sortăm descrescător după scorul Cross-Encoder
    puncte_cu_scor.sort(key=lambda x: x[1], reverse=True)

    # Luăm primele top_n și injectăm scorul Cross-Encoder în payload pentru transparență
    rezultate_finale = []
    for punct, scor_ce in puncte_cu_scor[:top_n]:
        punct.payload["rerank_score"] = round(float(scor_ce), 4)
        rezultate_finale.append(punct)

    return rezultate_finale

    
def construieste_context(puncte: list) -> tuple[str, list[dict], list[dict]]:
    """
    Din lista de puncte Qdrant construiește:
    - context: textul concatenat trimis la GPT
    - surse: lista fișierelor sursă (fără duplicate, fără text — pentru frontend)
    - chunks: lista completă a chunk-urilor cu text — pentru evaluare RAG
    """
    context_parts = []
    surse = []
    chunks = []

    for i, punct in enumerate(puncte):
        text = punct.payload.get("text", "")
        nume_fisier = punct.payload.get("nume_fisier", "necunoscut")
        folder = punct.payload.get("folder", "General")
        score = round(punct.score, 4)

        context_parts.append(f"[Fragment {i+1} din '{nume_fisier}']:\n{text}")

        chunks.append({
            "text": text,
            "nume_fisier": nume_fisier,
            "folder": folder,
            "score": score,
        })

        if not any(s["nume_fisier"] == nume_fisier for s in surse):
            surse.append({
                "nume_fisier": nume_fisier,
                "folder": folder,
                "score": score,
            })

    return "\n\n---\n\n".join(context_parts), surse, chunks


def genereaza_raspuns(intrebare: str, context: str) -> tuple[str, int]:
    """Trimite contextul + întrebarea la GPT și returnează răspunsul și nr. tokens."""
    prompt_utilizator = f"""FRAGMENTE DIN DOCUMENTE:
    {context}

    ÎNTREBARE: {intrebare}

    RĂSPUNS:"""

    raspuns = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": PROMPT_SISTEM},
            {"role": "user",   "content": prompt_utilizator},
        ],
        temperature=0.3,
        max_tokens=800,
    )

    return raspuns.choices[0].message.content, raspuns.usage.total_tokens
