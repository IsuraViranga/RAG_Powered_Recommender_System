import re
from transformers import pipeline

class HallucinationGuard:
    """
    Detect-Reject-Regenerate loop using NLI.
    Validates every sentence in an LLM answer against retrieved evidence.
    """

    def __init__(self):
        print("Loading NLI model (downloads ~350MB first time)...")
        self.nli = pipeline(
            "zero-shot-classification",
            model="MoritzLaurer/deberta-v3-large-zeroshot-v2.0",
            device=-1  # CPU; change to 0 for GPU
        )
        print("Hallucination Guard ready!")

    def _split_sentences(self, text: str) -> list[str]:
        """Split text into sentences, filter out short fragments."""
        raw = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in raw if len(s.strip()) >= 20]

    def _build_evidence(self, books: list[dict]) -> str:
        """Combine retrieved books into a single evidence string."""
        parts = []
        for b in books:
            parts.append(f"{b['title']} ({b['genre']}): {b['desc']}")
        return " | ".join(parts)

    def _check_sentence(self, sentence: str, evidence: str) -> dict:
        # Combine evidence + sentence as the sequence to classify
        combined = f"Evidence: {evidence[:400]} | Claim: {sentence}"
        result = self.nli(
            sequences=combined,
            candidate_labels=["supported", "not supported"],
            hypothesis_template="This claim is {}."   # {} = label placeholder, nothing else
        )
        label = result["labels"][0]
        score = result["scores"][0]
        return {"sentence": sentence, "label": label, "score": score}

    def validate(self, justification: str, retrieved_books: list[dict]) -> dict:
        """
        Validate justification against retrieved evidence.

        Returns:
            {
                "passed": bool,
                "faithfulness": float,       # 0.0 - 1.0
                "failed_claims": list[str],
                "sentence_results": list[dict],
                "total": int,
                "passing": int
            }
        """
        evidence = self._build_evidence(retrieved_books)
        sentences = self._split_sentences(justification)

        if not sentences:
            return {
                "passed": True,
                "faithfulness": 1.0,
                "failed_claims": [],
                "sentence_results": [],
                "total": 0,
                "passing": 0
            }

        sentence_results = []
        failed_claims = []
        passing_count = 0

        for sentence in sentences:
            result = self._check_sentence(sentence, evidence)
            sentence_results.append(result)

            if result["label"] == "supported" and result["score"] >= 0.7:
                passing_count += 1
            else:
                failed_claims.append(sentence)

        faithfulness = passing_count / len(sentences)
        passed = faithfulness >= 0.7

        return {
            "passed": passed,
            "faithfulness": round(faithfulness, 3),
            "failed_claims": failed_claims,
            "sentence_results": sentence_results,
            "total": len(sentences),
            "passing": passing_count
        }


class GuardedRAG:
    """
    Wraps BookRAG with hallucination detection.
    Detect → Reject → Regenerate loop (up to 3 attempts).
    """

    def __init__(self, rag, guard: HallucinationGuard, max_attempts: int = 3):
        self.rag = rag
        self.guard = guard
        self.max_attempts = max_attempts

    def ask(self, query: str, top_k: int = 3) -> dict:
        retrieved = self.rag.retrieve(query, top_k=top_k)
        attempt = 0
        history = []

        current_query = query

        while attempt < self.max_attempts:
            attempt += 1
            print(f"\n[Guard] Attempt {attempt}/{self.max_attempts}")

            # Generate answer
            answer = self.rag.generate(current_query, retrieved)

            # Validate
            validation = self.guard.validate(answer, retrieved)

            print(f"[Guard] Faithfulness: {validation['faithfulness']:.1%} "
                  f"({validation['passing']}/{validation['total']} sentences pass)")

            history.append({
                "attempt": attempt,
                "answer": answer,
                "faithfulness": validation["faithfulness"],
                "passed": validation["passed"],
                "failed_claims": validation["failed_claims"]
            })

            if validation["passed"]:
                print(f"[Guard] PASSED on attempt {attempt}")
                return {
                    "query": query,
                    "answer": answer,
                    "retrieved_books": retrieved,
                    "guard": {
                        "status": "passed",
                        "attempts": attempt,
                        "faithfulness": validation["faithfulness"],
                        "history": history
                    }
                }

            # Rejected — rebuild prompt with failed claims listed
            print(f"[Guard] REJECTED — {len(validation['failed_claims'])} unsupported claims")
            failed_str = "\n".join(f"  - {c}" for c in validation["failed_claims"])
            current_query = (
                f"{query}\n\n"
                f"IMPORTANT: The following claims from your previous answer were NOT "
                f"supported by the evidence and must be removed:\n{failed_str}\n"
                f"Regenerate your answer using ONLY facts from the provided book list."
            )

        # All attempts exhausted — return best attempt
        best = max(history, key=lambda h: h["faithfulness"])
        print(f"[Guard] Max attempts reached. Best faithfulness: {best['faithfulness']:.1%}")

        return {
            "query": query,
            "answer": best["answer"],
            "retrieved_books": retrieved,
            "guard": {
                "status": "max_attempts_reached",
                "attempts": attempt,
                "faithfulness": best["faithfulness"],
                "history": history
            }
        }
