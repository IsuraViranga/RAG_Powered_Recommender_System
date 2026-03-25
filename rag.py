import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer
from transformers import pipeline

class BookRAG:
    def __init__(self):
        print("Loading models...")
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')

        self.index = faiss.read_index("books.index")
        with open("books_metadata.pkl", "rb") as f:
            self.books = pickle.load(f)

        self.generator = pipeline(
            "text-generation",
            model="gpt2",
            max_new_tokens=150,
            truncation=True
        )
        print("Ready!")

    def retrieve(self, query: str, top_k: int = 3):
        query_vec = self.encoder.encode([query], convert_to_numpy=True).astype('float32')
        faiss.normalize_L2(query_vec)
        scores, indices = self.index.search(query_vec, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            book = self.books[idx]
            results.append({**book, "score": float(score)})
        return results

    def generate(self, query: str, retrieved_books: list) -> str:
        context = "\n".join([
            f"- {b['title']}: {b['desc']}"
            for b in retrieved_books
        ])

        prompt = f"""Book recommendations similar to the user's request.

Similar books:
{context}

User: {query}
Recommendation:"""

        result = self.generator(
            prompt,
            max_new_tokens=150,
            do_sample=True,
            temperature=0.7,
            pad_token_id=50256,
            truncation=True
        )[0]['generated_text']

        return result[len(prompt):].strip()

    def ask(self, query: str, top_k: int = 3) -> dict:
        retrieved = self.retrieve(query, top_k=top_k)
        answer = self.generate(query, retrieved)
        return {
            "query": query,
            "retrieved_books": retrieved,
            "answer": answer
        }