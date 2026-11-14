FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency requirements
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Ensure export files directory exists
RUN mkdir -p exports/files

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV SERP_PROVIDER=free

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
