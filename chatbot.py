# chatbot.py
from rag import BookRAG

rag = BookRAG()

print("\n📚 Book Recommendation RAG Chatbot")
print("Ask for book recommendations! (type 'quit' to exit)\n")

while True:
    query = input("You: ").strip()
    if query.lower() in ("quit", "exit", "q"):
        break
    if not query:
        continue
    
    result = rag.ask(query)
    
    # Show retrieved books (the "R" in RAG)
    print("\n🔍 Retrieved books:")
    for book in result["retrieved_books"]:
        print(f"  • {book['title']} (score: {book['score']:.3f})")
    
    # Show generated answer (the "G" in RAG)
    print(f"\n🤖 Answer: {result['answer']}\n")
    print("-" * 50)