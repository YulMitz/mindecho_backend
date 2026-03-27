import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# === Paths ===
ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"
MARKDOWN_DIR = DATA_DIR / "markdown"
PARENT_STORE_DIR = DATA_DIR / "parent_store"
QDRANT_DB_PATH = str(DATA_DIR / "qdrant_db")

# === LLM ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
RAG_LLM_PROVIDER = os.getenv("RAG_LLM_PROVIDER", "GEMINI")  # GEMINI | ANTHROPIC
RAG_LLM_MODEL_GEMINI = os.getenv("RAG_LLM_MODEL_GEMINI", "gemini-2.0-flash")
RAG_LLM_MODEL_ANTHROPIC = os.getenv("RAG_LLM_MODEL_ANTHROPIC", "claude-haiku-4-5-20251001")

# === Retrieval ===
COLLECTION_NAME = "mindecho_chunks"
CHILD_CHUNK_SIZE = 512
CHILD_CHUNK_OVERLAP = 64
PARENT_CHUNK_SIZE = 2048
MAX_RETRIEVAL_CALLS = 8
TOP_K_CHILD = 5

# === chatbotType → therapy_tag (for Qdrant metadata filter) ===
CHATBOT_TO_THERAPY_TAG: dict[str, str] = {
    "CBT": "cbt",
    "MBT": "mbt",
    "MBCT": "mbct",
    "DBT": "dbt",
}

# === PDF source → therapy tags ===
# key: PDF filename inside data/pdfs/
# value: list of therapy tags
PDF_SOURCE_TAGS: dict[str, list[str]] = {
    "2022 CBT in a Global Context.pdf": ["cbt"],
    "Handbook of mentalization-based treatment (1).pdf": ["mbt"],
}