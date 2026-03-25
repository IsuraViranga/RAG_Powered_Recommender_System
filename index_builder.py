# index_builder.py
import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer
from data import books

# 1. Load embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')  # fast & good quality

# 2. Create text chunks to embed (combine title + genre + description)
def make_text(book):
    return f"{book['title']}. Genre: {book['genre']}. {book['desc']}"

texts = [make_text(b) for b in books]

# 3. Generate embeddings
print("Generating embeddings...")
embeddings = model.encode(texts, convert_to_numpy=True)
embeddings = embeddings.astype('float32')  # FAISS requires float32

# 4. Build FAISS index (L2 distance — cosine after normalization)
faiss.normalize_L2(embeddings)  # normalize for cosine similarity
dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)  # Inner Product = cosine similarity
index.add(embeddings)

# 5. Save to disk
faiss.write_index(index, "books.index")
with open("books_metadata.pkl", "wb") as f:
    pickle.dump(books, f)

print(f"Indexed {index.ntotal} books. Saved to books.index")