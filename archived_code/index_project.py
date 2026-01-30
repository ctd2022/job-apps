# index_project.py
import os
from sentence_transformers import SentenceTransformer
import faiss
import pickle

# ==========================
# CONFIG
# ==========================
PROJECT_ROOT = os.getcwd()  # root of your VS Code workspace
EXTENSIONS = ['.py', '.js', '.ts', '.java', '.md']  # files to index
CHUNK_SIZE = 50  # lines per chunk
SKIP_FOLDERS = ['venv', '__pycache__', '.git']  # folders to skip
USE_GPU = False  # True if you have CUDA

# ==========================
# Load embedding model
# ==========================
device = 'cuda' if USE_GPU else 'cpu'
print(f"Loading model on {device}...")
model = SentenceTransformer('all-MiniLM-L6-v2', device=device)

# ==========================
# Walk project and collect files
# ==========================
print("Collecting project files...")
docs = []
paths_chunks = []

for root, _, files in os.walk(PROJECT_ROOT):
    if any(skip in root.split(os.sep) for skip in SKIP_FOLDERS):
        continue
    for file in files:
        if not any(file.endswith(ext) for ext in EXTENSIONS):
            continue
        file_path = os.path.join(root, file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except (UnicodeDecodeError, OSError):
            print(f"Skipping {file_path} (cannot decode)")
            continue

        # Chunk large files
        lines = content.split('\n')
        for i in range(0, len(lines), CHUNK_SIZE):
            chunk = '\n'.join(lines[i:i+CHUNK_SIZE])
            docs.append(chunk)
            paths_chunks.append(file_path)

print(f"Total chunks to embed: {len(docs)}")

# ==========================
# Generate embeddings
# ==========================
print("Generating embeddings...")
embeddings = model.encode(docs, show_progress_bar=True)

# ==========================
# Build FAISS index
# ==========================
print("Building FAISS index...")
dim = embeddings.shape[1]
index = faiss.IndexFlatL2(dim)
index.add(embeddings)

# ==========================
# Save index and metadata
# ==========================
faiss.write_index(index, 'project_index.faiss')
with open('project_paths.pkl', 'wb') as f:
    pickle.dump(paths_chunks, f)

print("Project indexing completed successfully!")
