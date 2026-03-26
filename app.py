from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import BookRAG

app = Flask(__name__)
CORS(app)

rag = BookRAG()

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"error": "Empty query"}), 400
    try:
        result = rag.ask(query)
        return jsonify({
            "answer": result["answer"],
            "retrieved_books": result["retrieved_books"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
