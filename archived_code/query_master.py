# query_master.py
import os
import pickle
import faiss
from sentence_transformers import SentenceTransformer
import requests
from dotenv import load_dotenv

# -------------------------------
# Load environment variables
# -------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")  # Uncomment when using Claude

# -------------------------------
# Project index paths
# -------------------------------
INDEX_PATH = "project_index.faiss"
PATHS_PKL = "project_paths.pkl"

# -------------------------------
# Load FAISS index and paths
# -------------------------------
print("Loading FAISS index and paths...")
index = faiss.read_index(INDEX_PATH)
with open(PATHS_PKL, "rb") as f:
    paths_chunks = pickle.load(f)

# -------------------------------
# Load local embedding model
# -------------------------------
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Embedding model loaded.")

# -------------------------------
# Gemini endpoint
# -------------------------------
GEMINI_MODEL = "gemini-2.5-flash"  # replace if you have a different model
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# -------------------------------
# Query project
# -------------------------------
def search_project(query, top_k=3):
    q_vec = model.encode([query])
    D, I = index.search(q_vec, top_k)
    results = []
    for i in I[0]:
        try:
            with open(paths_chunks[i], "r", encoding="utf-8") as f:
                results.append(f"File: {paths_chunks[i]}\n{f.read()}")
        except Exception as e:
            results.append(f"File: {paths_chunks[i]}\nError reading file: {e}")
    return results

# -------------------------------
# Call Gemini
# -------------------------------
def call_gemini(prompt):
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    }
    json_data = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    try:
        response = requests.post(GEMINI_API_URL, headers=headers, json=json_data)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text
    except Exception as e:
        return f"Gemini failed: {e}"

# -------------------------------
# Main loop
# -------------------------------
def main():
    while True:
        query = input("Enter your search query (type 'exit' or 'quit' to stop):\n> ")
        if query.lower() in ["exit", "quit"]:
            break

        print("\nSearching project index...")
        context = search_project(query)
        context_text = "\n---\n".join(context) if context else "No relevant project context found."

        print("\nCalling LLM...")
        print("Using Gemini...")

        # Add a marker in the prompt so we can prove it's Gemini
        gemini_prompt = f"[GEMINI_MARKER] Context:\n{context_text}\n\nQuery: {query}\nAnswer using context above."
        gemini_response = call_gemini(gemini_prompt)

        print("\n=== Response ===\n")
        print(gemini_response)

        # Optional: log first 200 chars for verification
        print("\nGemini raw response preview (first 200 chars):")
        print(gemini_response[:200])

        print("\n" + "="*50 + "\n")

# -------------------------------
# Entry point
# -------------------------------
if __name__ == "__main__":
    main()
