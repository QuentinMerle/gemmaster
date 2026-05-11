#!/bin/bash

# --- GEMMASTER INDUSTRIAL INSTALLER ---

set -e

echo "💎 GEMMASTER - Reality Initialization Sequence"
echo "--------------------------------------------"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not found."
    exit 1
fi

# 2. Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "⚠️ Warning: Ollama not found in PATH."
    echo "Please install Ollama from https://ollama.com/"
    exit 1
fi

# 3. Start Ollama if not running
if ! pgrep -x "ollama" > /dev/null; then
    echo "🧠 Starting Ollama in background..."
    ollama serve > /dev/null 2>&1 &
    sleep 5
fi

# 4. Pull Gemma 4 Model
echo "📥 Pulling Gemma 4 E4B Reality Model..."
ollama pull gemma4:e4b

# 5. Virtual Environment
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# 6. Dependencies
echo "🛠️ Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# 7. Start Game
echo "--------------------------------------------"
echo "✅ Reality Anchor Synchronized!"
echo "🚀 Starting GemMaster on http://localhost:8000"
echo "--------------------------------------------"

python main.py
