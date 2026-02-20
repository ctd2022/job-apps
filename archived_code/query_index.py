# query_index.py
import faiss
import pickle
from sentence_transformers import SentenceTransformer

index = faiss.read_index("project_index.faiss")
with open("project_paths.pkl", "rb") as f:
    paths = pickle.load(f)

model = SentenceTransformer("all-MiniLM-L6-v2")

def search_project(query, top_k=3):
    q_vec = model.encode([query])
    D, I = index.search(q_vec, top_k)
    results = []
    for i in I[0]:
        with open(paths[i], 'r', encoding='utf-8') as f:
            results.append(f"File: {paths[i]}\n{f.read()}")
    return results

if __name__ == "__main__":
    query = input("Enter your search query: ")
    results = search_project(query)
    for r in results:
        print(r[:500], "\n---\n")
