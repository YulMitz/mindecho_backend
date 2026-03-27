import json
import pymupdf4llm
from pathlib import Path
from langchain.text_splitter import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from fastembed import TextEmbedding

from .config import (
    DATA_DIR,
    MARKDOWN_DIR,
    PARENT_STORE_DIR,
    QDRANT_DB_PATH,
    COLLECTION_NAME,
    CHILD_CHUNK_SIZE,
    CHILD_CHUNK_OVERLAP,
    PARENT_CHUNK_SIZE,
    PDF_SOURCE_TAGS,
)

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
EMBED_DIM = 384


def get_embedder() -> TextEmbedding:
    return TextEmbedding(model_name=EMBED_MODEL)


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(path=QDRANT_DB_PATH)


def ensure_collection(client: QdrantClient):
    if not client.collection_exists(COLLECTION_NAME):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
        )


def index_pdfs():
    """Convert PDFs → Markdown → child/parent chunks → Qdrant."""
    pdf_dir = DATA_DIR / "pdfs"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    MARKDOWN_DIR.mkdir(parents=True, exist_ok=True)
    PARENT_STORE_DIR.mkdir(parents=True, exist_ok=True)

    client = get_qdrant_client()
    ensure_collection(client)
    embedder = get_embedder()

    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHILD_CHUNK_SIZE, chunk_overlap=CHILD_CHUNK_OVERLAP
    )
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=PARENT_CHUNK_SIZE, chunk_overlap=128
    )

    points: list[PointStruct] = []
    parent_store: dict[str, str] = {}
    point_id = 0

    for pdf_path in pdf_dir.glob("*.pdf"):
        tags = PDF_SOURCE_TAGS.get(pdf_path.name, [])
        if not tags:
            print(f"[indexer] Skipping {pdf_path.name} (no tags configured)")
            continue

        print(f"[indexer] Processing {pdf_path.name} → tags: {tags}")

        # PDF → Markdown
        md_text = pymupdf4llm.to_markdown(str(pdf_path))
        md_path = MARKDOWN_DIR / (pdf_path.stem + ".md")
        md_path.write_text(md_text, encoding="utf-8")

        # Parent chunks
        parent_chunks = parent_splitter.split_text(md_text)
        for p_idx, parent_text in enumerate(parent_chunks):
            parent_id = f"{pdf_path.stem}_p{p_idx}"
            parent_store[parent_id] = parent_text

            # Child chunks within each parent
            child_chunks = child_splitter.split_text(parent_text)
            embeddings = list(embedder.embed(child_chunks))

            for c_idx, (child_text, vector) in enumerate(zip(child_chunks, embeddings)):
                chunk_id = f"{parent_id}_c{c_idx}"
                points.append(
                    PointStruct(
                        id=point_id,
                        vector=vector.tolist(),
                        payload={
                            "chunk_id": chunk_id,
                            "parent_id": parent_id,
                            "source": pdf_path.name,
                            "therapy_tags": tags,
                            "text": child_text,
                        },
                    )
                )
                point_id += 1

    if points:
        client.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"[indexer] Indexed {len(points)} child chunks")
    else:
        print("[indexer] No chunks to index")

    # Persist parent store
    parent_store_path = PARENT_STORE_DIR / "parent_store.json"
    parent_store_path.write_text(json.dumps(parent_store, ensure_ascii=False, indent=2))
    print(f"[indexer] Saved {len(parent_store)} parent chunks")