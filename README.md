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
Open your browser at `http://0.0.0.0:8000`.

## 🛠️ Technical Deep Dive

### 🧠 Multimodal Orchestration
GemMaster leverages the **Gemma 4 (e4b)** model to process both high-density narrative text and visual inputs. The engine uses a custom **Organic Master** prompt architecture that forces the model to reason internally about pacing and "Reality Challenges" before generating the player-facing response.

### 🎨 Liquid Logic UI System
The interface is built on a custom design system called **Liquid Logic**:
- **GPU Accelerated Rendering**: CSS filters and backdrops are optimized to run at 60fps even during complex narrative shifts.
- **Ambilight System**: A dedicated UI controller that monitors AI tags to shift the entire DOM's color palette and luminosity in real-time.
- **Glassmorphism**: High-premium frosted glass effects using `backdrop-filter` and layered translucency.

### ⚙️ Tactical Parser & Rendering
Every AI response passes through a high-performance **Tactical Parser**:
- **Tag-to-Component Mapping**: Uses sophisticated RegEx to identify canonical tags (`[[CHECK]]`, `[[SKILL]]`, `[[NPC]]`) and injects them as reactive Alpine.js components.
- **Seeded Determinism**: Dice rolls and QTE sequences are seeded by the AI's tag content to ensure visual stability during the streaming process.

### ⚡ Zero-Overhead Reactivity
- **Alpine.js**: Chosen for its minimal footprint, managing the entire game state (Danger Level, Inventory, Turn Count) without the weight of a traditional framework.
- **Streaming Architecture**: Real-time narrative delivery using FastAPI's streaming response for an instant, "living" text experience.

---
*Created with ❤️ for the Gemma 4 Challenge.*

