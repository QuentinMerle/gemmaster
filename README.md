# 💎 GemMaster: Immersive Core RPG
> **The definitive multimodal RPG engine for local LLMs.**

![Start Your Journey](/web/static/assets/gemmaster%20-%20start%20your%20journey.png)

GemMaster is an immersive RPG narrative engine designed for the **Gemma 4 Challenge**. It transforms the classic text-adventure into a cinematic experience, bridging the digital and physical worlds through multimodal AI vision and dynamic visual storytelling with [**Gemma 4**](https://github.com/google/gemma_pytorch).

> [!IMPORTANT]
> **Recommended Models**: Optimized for **Gemma 4 E4B** and larger.
> **Warning (E2B)**: While functional, the 2B model may occasionally struggle with the strict XML/Tag formatting required by the advanced **Immersive Core** narrative engine.

## 🌟 Immersive Core Features

GemMaster isn't just a chatbot; it's an **AI Director**. Built with a focus on high-end aesthetics and tactical depth, it features:

*   **👁️ Visual Portal (Experimental)**: A high-tech multimodal UI for image analysis challenges. Capture your reality through the laser-scanning interface.
    ![Vision Portal](/web/static/assets/gemmaster%20-%20vision.png)
*   **🎙️ Voice of the Director (Experimental)**: Using the Web Speech API to read the AI's internal intentions, creating a unique meta-narrative layer.
*   **🌈 Dynamic Ambilight Immersion**: The entire UI atmosphere shifts colors and moods based on narrative intent.
*   **🎲 Tactical Narrative Mechanics**: Integrated stat-based dice rolls and physical Quick Time Events (QTE).
    ![Dice & QTE](/web/static/assets/gemmaster%20-%20dice%20-%20success.png)
*   **🎭 The "Omniscient Narrator"**: A refined MJ personality that reasons internally before weaving its tale.

## 🎮 Game Modes
- **The Lone Hero**: A traditional solo RPG experience where you face the Destiny Master alone.
- **The AI Sidekick (Experimental)**: Gemma manages a companion character that provides narrative support and tactical synergy during your journey.

## 🏗️ Architecture: The Anatomy of a Turn
![Wizard](/web/static/assets/gemmaster%20-%20wizard%20-%201.png)
GemMaster treats every response as a **Game Frame**, following a strict hierarchical pipeline:
1.  **Meta-layer (`<voiceover>`)**: Ethereal commentary read by the TTS engine.
2.  **Logic-layer (`<reasoning>`)**: The AI's internal monologue about pacing and mechanics.
3.  **Play-layer (`NARRATION` + `[[OPTIONS]]`)**: The interactive story delivered to the player.

> **Note**: This structure is enforced through a **"Silent Shepherd"** system (dynamic prompt injections) ensuring high stability on small models like Gemma 4B.

## 🚀 Quick Start

### Prerequisites
- [**Ollama**](https://github.com/ollama/ollama) installed and running.
- The [**Gemma 4**](https://github.com/google/gemma_pytorch) model pulled: `ollama pull gemma4:e4b`.
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

---
*Created with ❤️ for the Gemma 4 Challenge.*

*While I’ve spent far more time on this than originally planned, this is still an experimental engine. There may be some bugs or narrative "glitches" along the way—I appreciate your indulgence, and most of all, I hope you enjoy the adventure!*