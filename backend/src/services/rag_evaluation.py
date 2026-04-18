# src/services/evaluation.py
from deepeval.test_case import LLMTestCase
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    HallucinationMetric,
    GEval,
)
from openai import OpenAI
import os
from .generate_truth import generate_ground_truth


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
 
# ─── Modelul folosit de DeepEval ca evaluator ───────────────────────
EVAL_MODEL = "gpt-4.1"
 
# ─── Modelul folosit pentru generarea ground truth ──────────────────
# Trebuie să fie un model puternic – e "profesorul" care dă răspunsul corect
GROUND_TRUTH_MODEL = "gpt-4.1"

#Inițializăm metricile cu G-Eval


def correctness_metric() -> GEval:
    return GEval(
        name="Correctness",
        criteria="Determine whether the actual output is factually correct based on the expected output.",
        # NOTE: you can only provide either criteria or evaluation_steps, and not both
        evaluation_steps=[
            "Check whether the facts in 'actual output' contradicts any facts in 'expected output'",
            "You should also heavily penalize omission of detail",
            "Vague language, or contradicting OPINIONS, are OK"
        ],
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        model=EVAL_MODEL,
        threshold=0.7,
    )




def run_deepeval_evaluation(question: str, answer: str, contexts: list) -> dict:
    """
    Primește întrebarea, răspunsul și contextele.
    Rulează metricile DeepEval și returnează notele + explicațiile (reasoning).
    """
    limited_contexts = contexts[:3]
     # ── Pas 1: Generează ground truth ───────────────────────────────
    print("Generare ground truth...")
    try:
        ground_truth = generate_ground_truth(question, limited_contexts)
        print(f"Ground truth generat ({len(ground_truth)} caractere)")
        print(f"Ground truth:\n{ground_truth}")
    except Exception as e:
        print(f"⚠️ Eroare la generarea ground truth: {e}")
        ground_truth = None



    # 1. Creăm cazul de testare în formatul cerut de DeepEval
    test_case = LLMTestCase(
        input=question,
        actual_output=answer,
        retrieval_context=limited_contexts,
        context = limited_contexts,  # HallucinationMetric folosește "context" în loc de "retrieval_context:
        expected_output=ground_truth,  # None e ok, metricile care nu-l folosesc îl ignoră
    )
 

    # 2. Inițializăm metricile
    # include_reason=True este secretul aici: forțează LLM-ul să explice de ce a dat nota!

    faithfulness = FaithfulnessMetric(
        threshold=0.7, model=EVAL_MODEL, include_reason=True
    )
    answer_relevancy = AnswerRelevancyMetric(
        threshold=0.6, model=EVAL_MODEL, include_reason=True
    )
    hallucination = HallucinationMetric(
        threshold=0.5, model=EVAL_MODEL, include_reason=True
    )

    correctness = correctness_metric() if ground_truth else None

    
    results = {}
 
    metrics_to_run = [
        ("faithfulness", faithfulness),
        ("answer_relevancy", answer_relevancy),
        ("hallucination", hallucination),
    ]
 
    if correctness:
        metrics_to_run.append(("correctness", correctness))
 
    for metric_name, metric in metrics_to_run:
        try:
            metric.measure(test_case)
            results[metric_name] = {
                "score": metric.score,
                "reason": metric.reason,
                "passed": metric.score >= metric.threshold,
            }
            print(f"  ✅ {metric_name}: {metric.score:.2f}")
        except Exception as e:
            results[metric_name] = {
                "score": None,
                "reason": f"Eroare la evaluare: {str(e)}",
                "passed": False,
            }
            print(f"  ❌ {metric_name}: eroare - {e}")
 
    return results