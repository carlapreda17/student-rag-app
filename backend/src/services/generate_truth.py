import os
from openai import OpenAI
from deepeval.test_case import LLMTestCase, LLMTestCaseParams


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GROUND_TRUTH_MODEL = "gpt-4.1"

def generate_ground_truth(question: str, contexts: list[str]) -> str:
    """
    Generează un răspuns de referință (ground truth) direct din chunks,
    INDEPENDENT de pipeline-ul RAG.
 
    De ce e util:
    - RAG-ul tău poate greși la retrieval, reranking sau generare
    - Aici by-passăm tot pipeline-ul și dăm chunks + întrebare direct unui LLM puternic
    - Apoi comparăm răspunsul RAG-ului cu acest ground truth
 
    Args:
        question: Întrebarea originală a utilizatorului
        contexts: Chunk-urile recuperate din Qdrant (aceleași pe care le-a primit RAG-ul)
    
    Returns:
        Răspunsul de referință generat
    """
    context_text = "\n\n---\n\n".join(contexts)
 
    response = client.chat.completions.create(
        model=GROUND_TRUTH_MODEL,
        messages=[
            {
                "role": "system",
                "content": """Ești un profesor universitar expert. Răspunde la întrebarea studentului
                STRICT pe baza contextului furnizat mai jos.
                
                REGULI IMPORTANTE:
                1. Dacă întrebarea conține o PREMISĂ FALSĂ sau o confuzie de concepte, 
                CORECTEAZĂ premisa explicit. Nu accepta presupuneri greșite.
                Exemplu: dacă studentul întreabă "De ce e bun X pentru Y?" dar contextul 
                arată că X NU e bun pentru Y, spune-i clar.
                
                2. Dacă contextul NU conține informația necesară pentru a răspunde, 
                spune explicit: "Contextul furnizat nu conține informații suficiente."
                
                3. Fii precis, concis și didactic.
                
                4. Răspunde în aceeași limbă în care e pusă întrebarea.""",
            },
            {
                "role": "user",
                "content": f"CONTEXT:\n{context_text}\n\nÎNTREBARE:\n{question}",
            },
        ],
        temperature=0.1, 
        max_tokens=1000,
    )
 
    return response.choices[0].message.content
 