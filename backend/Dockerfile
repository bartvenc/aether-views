###############################################################################
# Stage 2: Final image with Python, Chrome, and Ollama copied in
###############################################################################
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies in a single layer
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    gnupg \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update && apt-get install -y \
    google-chrome-stable \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-freefont-ttf \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir --force-reinstall -r requirements.txt 
# Ensure playwright CLI is in PATH (important for Docker)

ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright
RUN python -m playwright install chromium
RUN python -m playwright install-deps
# RUN playwright install chromium --force # Remove --force here for this test, use --with-deps

# RUN playwright install-deps # No longer needed if --with-deps is used above - playwright install --with-deps already installs deps

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8080 \
    SERVER_TYPE=remote

# Increase timeout for gunicorn significantly
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]