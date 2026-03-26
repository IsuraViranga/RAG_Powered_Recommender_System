from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import BookRAG
from hallucination_guard import HallucinationGuard, GuardedRAG

app = Flask(__name__)
CORS(app)

print("Loading RAG + Hallucination Guard...")
rag = BookRAG()
guard = HallucinationGuard()
guarded = GuardedRAG(rag, guard, max_attempts=3)
print("All systems ready!")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    query = data.get("query", "").strip()
    use_guard = data.get("use_guard", True)  # frontend can toggle this

    if not query:
        return jsonify({"error": "Empty query"}), 400

    try:
        if use_guard:
            result = guarded.ask(query)
        else:
            raw = rag.ask(query)
            result = {**raw, "guard": None}

        return jsonify({
            "answer": result["answer"],
            "retrieved_books": result["retrieved_books"],
            "guard": result.get("guard")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "guard": "enabled"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
