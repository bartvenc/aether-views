###############################################################################
# Stage 1: Grab the Ollama binary from the official image
###############################################################################
FROM ollama/ollama:latest AS ollama_stage
# We don't need to RUN anything here, we just take /bin/ollama as is.

###############################################################################
# Stage 2: Final image with Python, Chrome, and Ollama copied in
###############################################################################
FROM python:3.11-slim

# 1) Minimal system deps
RUN apt-get update && apt-get install -y wget gnupg ca-certificates

# 2) (Optional) If you need Google’s signing key & Chrome
RUN wget -q https://dl.google.com/linux/linux_signing_key.pub
RUN gpg --dearmor linux_signing_key.pub
RUN mv linux_signing_key.pub.gpg /usr/share/keyrings/google-linux-keyring.gpg

RUN echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-keyring.gpg] \
  http://dl.google.com/linux/chrome/deb/ stable main" \
  > /etc/apt/sources.list.d/google-chrome.list

RUN apt-get update && apt-get install -y \
    curl \
    google-chrome-stable \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-symbola \
    fonts-noto \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# 3) Copy Ollama from stage 1
COPY --from=ollama_stage /bin/ollama /bin/ollama

# 4) Install Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright
RUN python -m playwright install chromium
RUN python -m playwright install-deps

# 5) Copy application code
COPY . .

# 6) entrypoint.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 7) Non-root user
RUN useradd -m myuser && chown -R myuser:myuser /app
USER myuser

# 8) Expose port & set environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# 9) Final entrypoint runs Ollama + uvicorn
ENTRYPOINT ["/entrypoint.sh"]
