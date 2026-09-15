# =========================================================
# Stage 1: Build React Frontend
# =========================================================
FROM oven/bun:1 AS frontend-builder
WORKDIR /frontend

# Install frontend dependencies
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy source and build with relative API path
COPY frontend/ ./
ENV REACT_APP_API_URL=/api
RUN bun run build

# =========================================================
# Stage 2: Production Python Container
# =========================================================
FROM python:3.12-slim

# Install system dependencies (ffmpeg, libsndfile, audio tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires running as a non-root user with UID 1000
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    OMP_NUM_THREADS=1

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code
COPY backend /app/backend
WORKDIR /app/backend

# Copy compiled frontend assets into static directory
COPY --from=frontend-builder /frontend/build /app/backend/static

# Ensure directory permissions for Hugging Face UID 1000
RUN mkdir -p /app/backend/data /app/backend/logs && \
    chown -R user:user /app

USER user

# Hugging Face Spaces default port
EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]