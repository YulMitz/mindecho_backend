from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException

from .models import RAGRequest, RAGResponse
from .indexer import index_pdfs
from .graph import run_rag_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[main] Starting PDF indexing...")
    try:
        index_pdfs()
        print("[main] Indexing complete")
    except Exception as e:
        print(f"[main] Indexing failed (non-fatal): {e}")
    yield
    print("[main] Shutdown")


app = FastAPI(title="MindEcho RAG Service", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/rag/query", response_model=RAGResponse)
async def rag_query(request: RAGRequest):
    try:
        return await run_rag_pipeline(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag/reindex")
async def reindex():
    try:
        index_pdfs()
        return {"status": "reindexed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))