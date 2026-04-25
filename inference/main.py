import os
from dotenv import load_dotenv

load_dotenv()

import uvicorn
from fastapi import FastAPI
from src.router import router

app = FastAPI(title="inference", version="0.1.0")
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("INFERENCE_PORT", 8000))
    workers = int(os.environ.get("INFERENCE_WORKERS", 4))

    uvicorn.run("main:app", host="0.0.0.0", port=port, workers=workers, reload=False)
