# Base image
FROM python:3.11-slim

# Prevent python from writing pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Prevent buffering
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies (if needed)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cache layer)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create non-root user (security best practice)
RUN useradd -m appuser
USER appuser

EXPOSE 8000

CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8001"]