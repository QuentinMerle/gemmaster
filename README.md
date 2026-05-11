# 💎 GemMaster: Studio-Grade Multimodal RPG
> **Powered by Gemma 4 (e4b) — Where your reality becomes the narrative.**

GemMaster is an immersive RPG narrative engine designed for the **Gemma 4 Challenge**. It transforms the classic text-adventure into a cinematic experience, bridging the digital and physical worlds through multimodal AI vision and dynamic visual storytelling with **Gemma 4**.

![GemMaster Interface](web/static/logo.svg) <!-- Replace with actual screenshot later -->

## 🌟 The "Studio-Grade" Experience

GemMaster isn't just a chatbot; it's an **AI Director**. Built with a focus on high-end aesthetics and tactical depth, it features:

*   **👁️ Multimodal Reality Challenges**: The AI can challenge you to "show" objects from your real world to solve in-game puzzles. Show your actual keys to open a chest or a drawing to cast a spell.
*   **🌈 Dynamic Ambilight Immersion**: The entire UI atmosphere shifts colors and moods (Rain, Action, Tension, Mystery) based on the AI's narrative intent.
*   **🎲 Tactical Narrative Mechanics**: Integrated stat-based dice rolls and physical Quick Time Events (QTE) that make every decision impactful.
*   **🎭 The "Omniscient Narrator"**: A refined MJ personality (style BG3) that reasons internally about tension and pacing before weaving its tale.

## 🚀 Quick Start

### Prerequisites
- **Ollama** installed and running.
- The **Gemma 4** model pulled: `ollama pull gemma4:e4b`.
- **Python 3.10+**.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/QuentinMerle/gemmaster.git
   cd gemmaster
   ```
2. Run the installation script:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

### Launch
Start the engine:
```bash
python main.py
```
Open your browser at `http://localhost:8000`.

## 🛠️ Architecture
- **AI Engine**: Custom Prompt v4 (Organic Master) optimized for Gemma 4's reasoning.
- **Frontend**: Alpine.js for a reactive, zero-latency "Liquid Logic" design.
- **Backend**: FastAPI with multimodal streaming support.

## 🏆 Gemma 4 Challenge
This project was built to showcase the power of the **Gemma 4** family in creating innovative, multimodal, and highly immersive gaming experiences.

---
*Created with ❤️ for the Gemma 4 Challenge.*
