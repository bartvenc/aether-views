#!/bin/bash
set -e

# Start Ollama in the background with its default port (11434)
# Remove the '--port 11434' part
/bin/ollama serve &
OLLAMA_PID=$!

# Wait a bit so Ollama can initialize
sleep 5

echo "Pulling LLAMA3.1 model..."
if /bin/ollama pull llama3.1; then
  echo "Model pull complete!"
else
  echo "Failed to pull LLAMA3.1 model."
  kill $OLLAMA_PID
  exit 1
fi

# Start uvicorn in the foreground
echo "Starting uvicorn on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
