FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy pyproject.toml and install dependencies (cached layer)
COPY inference/pyproject.toml inference/pyproject.toml
WORKDIR /app/inference
RUN uv sync

# Copy source code
COPY inference/main.py ./
COPY inference/src/ ./src/

# Copy knowledge files (knowledge.py resolves ../../docs/sums/ relative to src/)
COPY docs/sums/ /app/docs/sums/

EXPOSE 6001

CMD ["uv", "run", "python", "main.py"]
