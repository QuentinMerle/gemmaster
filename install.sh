#!/bin/bash

# --- GEMMASTER INDUSTRIAL INSTALLER ---
# Optimized for MacOS and Linux

set -e

# Colors for "Studio-Grade" terminal output
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}💎 GEMMASTER - Reality Initialization Sequence${NC}"
echo "--------------------------------------------"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: Python 3 is required but not found.${NC}"
    exit 1
fi

# 2. Check Ollama
if ! command -v ollama &> /dev/null; then
    echo -e "${ORANGE}⚠️ Warning: Ollama not found in PATH.${NC}"
    echo "Please install Ollama from https://ollama.com/"
    exit 1
fi

# 3. Virtual Environment
if [ ! -d ".venv" ]; then
    echo -e "${PURPLE}📦 Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

# Determine the activate script path
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
fi

# 4. Dependencies
echo -e "${PURPLE}🛠️ Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

# 5. Pull Gemma 4 Model (Background check)
echo -e "${PURPLE}📥 Pulling Gemma 4 E4B Reality Model...${NC}"
echo "This might take a moment depending on your connection."
ollama pull gemma4:e4b

# 6. Final Launch
echo "--------------------------------------------"
echo -e "${GREEN}✅ Reality Anchor Synchronized!${NC}"
echo -e "🚀 Starting GemMaster...${NC}"
echo "--------------------------------------------"

python3 main.py
