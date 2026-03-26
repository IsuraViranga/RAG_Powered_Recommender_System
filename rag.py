# rag.py - using Groq (free, fast, reliable)
from dotenv import load_dotenv
import os
import faiss
import pickle
from groq import Groq
from sentence_transformers import SentenceTransformer

class BookRAG:
    def __init__(self):
        load_dotenv()
        print("Loading models...")
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')

        self.index = faiss.read_index("books.index")
        with open("books_metadata.pkl", "rb") as f:
            self.books = pickle.load(f)

            api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError("GROQ_API_KEY not found in .env file")

        self.client = Groq(api_key=api_key)
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
            f"- {b['title']} ({b['genre']}): {b['desc']}"
            for b in retrieved_books
        ])

        response = self.client.chat.completions.create(
            model="llama-3.1-8b-instant",   # free Llama 3 on Groq
            messages=[
                {
                    "role": "system",
                    "content": "You are a friendly book recommendation assistant. Only recommend books from the provided list. Never invent new titles."
                },
                {
                    "role": "user",
                    "content": f"""The user asked: "{query}"

Based ONLY on these retrieved books, give a warm recommendation explaining why each book suits the user:

{context}"""
                }
            ],
            max_tokens=300,
            temperature=0.7
        )

        return response.choices[0].message.content.strip()

    def ask(self, query: str, top_k: int = 3) -> dict:
        retrieved = self.retrieve(query, top_k=top_k)
        answer = self.generate(query, retrieved)
        return {
            "query": query,
            "retrieved_books": retrieved,
            "answer": answer
        }