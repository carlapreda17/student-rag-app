import os
from openai import OpenAI
from qdrant_client.http import models
from src.services.ingestion import embeddings_model, qdrant, COLLECTION_NAME

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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


def construieste_context(puncte: list) -> tuple[str, list[dict]]:
    """
    Din lista de puncte Qdrant construiește:
    - context: textul concatenat trimis la GPT
    - surse: lista fișierelor sursă (fără duplicate)
    """
    context_parts = []
    surse = []

    for i, punct in enumerate(puncte):
        text = punct.payload.get("text", "")
        nume_fisier = punct.payload.get("nume_fisier", "necunoscut")
        folder = punct.payload.get("folder", "General")
        score = round(punct.score, 4)

        context_parts.append(f"[Fragment {i+1} din '{nume_fisier}']:\n{text}")

        if not any(s["nume_fisier"] == nume_fisier for s in surse):
            surse.append({
                "nume_fisier": nume_fisier,
                "folder": folder,
                "score": score,
            })

    return "\n\n---\n\n".join(context_parts), surse


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
