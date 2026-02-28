# =============================================================================
# Intel Desk - ML Cluster Python Flask Service Dockerfile
# =============================================================================

FROM python:3.11-slim

# Install system dependencies required by numpy, scipy, and other scientific libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gfortran \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer caching)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

EXPOSE 5001

# Run with gunicorn if gunicorn_config.py exists, otherwise fall back to python run.py
CMD ["sh", "-c", "if [ -f gunicorn_config.py ] && command -v gunicorn >/dev/null 2>&1; then gunicorn -c gunicorn_config.py app:app; else python run.py; fi"]
