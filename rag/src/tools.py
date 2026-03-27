import json
from langchain_core.tools import tool
from qdrant_client.models import Filter, FieldCondition, MatchAny
from fastembed import TextEmbedding

from .config import COLLECTION_NAME, PARENT_STORE_DIR, TOP_K_CHILD
from .indexer import EMBED_MODEL, get_qdrant_client

_embedder: TextEmbedding | None = None


def _get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding(model_name=EMBED_MODEL)
    return _embedder


@tool
def search_child_chunks(query: str, therapy_tag: str) -> str:
    """Semantic search in the clinical knowledge base filtered by therapy type.
    Returns a JSON list of {chunk_id, parent_id, text, source, score} objects."""
    embedder = _get_embedder()
    vector = list(embedder.embed([query]))[0].tolist()
    client = get_qdrant_client()

    results = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=vector,
        limit=TOP_K_CHILD,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="therapy_tags",
                    match=MatchAny(any=[therapy_tag]),
                )
            ]
        ),
        with_payload=True,
    )

    hits = [
        {
            "chunk_id": r.payload["chunk_id"],
            "parent_id": r.payload["parent_id"],
            "text": r.payload["text"],
            "source": r.payload["source"],
            "score": r.score,
        }
        for r in results
    ]
    return json.dumps(hits, ensure_ascii=False)


@tool
def retrieve_parent_chunks(parent_ids: list[str]) -> str:
    """Fetch full parent chunk texts for a list of parent_ids.
    Returns a JSON dict mapping parent_id → text."""
    parent_store_path = PARENT_STORE_DIR / "parent_store.json"
    if not parent_store_path.exists():
        return json.dumps({})
    parent_store: dict[str, str] = json.loads(parent_store_path.read_text())
    result = {pid: parent_store.get(pid, "") for pid in parent_ids}
    return json.dumps(result, ensure_ascii=False)