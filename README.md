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

## ⚙️ The Engine: Under the Hood

### 🌡️ Dynamic Danger Logic (`DANGER_RULES`)
Unlike static RPGs, GemMaster uses a non-linear **Peril Gauge (0-100%)**. 
- It tracks the environmental and narrative tension.
- **Mechanical Impact**: At **75% Danger**, the engine automatically injects a `-2 penalty` to all player `CHECK` rolls, simulating stress and exhaustion.
- **Narrative Pacing**: The AI Director uses this gauge to trigger "Point of No Return" events without relying on binary "Game Over" screens.

### ⏱️ Time-Safety Pacing
The engine calculates a `turns_restants` variable at each step. 
- It prevents **Mechanical Overflow**: The AI won't trigger a 4-turn combat sequence if the session duration only has 2 turns left.
- It forces **Narrative Compression**: As the clock ticks down, the AI is instructed to move from *Escalation* to *Climax* logic.

### 🎲 Stat-Based Resolution (Example)
GemMaster bridges LLM text with deterministic game logic. When the AI generates a `[[CHECK: Stat, DC]]` tag, the frontend calculates the outcome using the hero's real statistics:

```javascript
// Example of the deterministic resolution logic in utils.js
const bonus = party.stats[statName] || 0;
const roll = Math.floor(Math.random() * 20) + 1;
const total = roll + bonus;
const success = total >= dc;

return {
    label: `${statName} Check (DC ${dc})`,
    result: `${roll} + ${bonus} = ${total}`,
    status: success ? 'SUCCESS' : 'FAILURE'
};
```

### 🎭 Organic Reasoning (The Voice of Fate)
The `<reasoning>` block acts as the **AI Director's internal monologue**. It is instructed to use an omniscient, fatalistic prose to:
1. Analyze the current narrative tension.
2. Verify mechanical constraints (Danger level, turn count).
3. Plan the next "Reality Challenge" before outputting a single word to the player.

---
*Created with ❤️ for the Gemma 4 Challenge.*


