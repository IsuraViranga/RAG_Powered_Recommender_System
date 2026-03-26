from rag import BookRAG
from hallucination_guard import HallucinationGuard, GuardedRAG

print("Initialising RAG system...")
rag = BookRAG()

print("Initialising Hallucination Guard...")
guard = HallucinationGuard()

# Wrap RAG with the guard
guarded = GuardedRAG(rag, guard, max_attempts=3)

print("\n📚 BookMind RAG Chatbot  (with Hallucination Guard)")
print("=" * 55)

while True:
    query = input("\nYou: ").strip()
    if query.lower() in ("quit", "exit", "q"):
        break
    if not query:
        continue

    result = guarded.ask(query)

    # Retrieved books
    print("\n🔍 Retrieved books:")
    for b in result["retrieved_books"]:
        print(f"   • {b['title']} (score: {b['score']:.3f})")

    # Guard report
    g = result["guard"]
    status_icon = "✅" if g["status"] == "passed" else "⚠️"
    print(f"\n{status_icon} Guard: {g['status'].upper()}  |  "
          f"Faithfulness: {g['faithfulness']:.1%}  |  "
          f"Attempts: {g['attempts']}")

    # Final answer
    print(f"\n🤖 Answer:\n{result['answer']}")
    print("\n" + "-" * 55)
