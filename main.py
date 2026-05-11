from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from core.engine import NarrativeEngine
from core.parser import MarkdownParser
from core.logic import GameLogic
from core.prompts import PromptTemplates
import os
import httpx
import json
import random
from typing import Dict, Any, List
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup check
    print("💎 GEMMASTER: Validating Engine...")
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{engine.base_url}/api/tags")
            if response.status_code == 200:
                models = [m["name"] for m in response.json().get("models", [])]
                if engine.model in models or any(engine.model in m for m in models):
                    print(f"✅ Engine Online: {engine.model} is ready.")
                else:
                    print(f"⚠️ Warning: {engine.model} not found in Ollama. Please run: ollama pull {engine.model}")
            else:
                print("❌ Engine Offline: Ollama is not responding correctly.")
    except Exception as e:
        print(f"❌ Engine Offline: Could not connect to Ollama ({e})")
    
    yield

app = FastAPI(title="GemMaster", lifespan=lifespan)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="web/static"), name="static")
templates = Jinja2Templates(directory="web/templates")

engine = NarrativeEngine()
parser = MarkdownParser()
logic = GameLogic()
prompts = PromptTemplates()

# Campaign Paths
CAMPAIGN_DIR = "campaign"
UNIVERSE_FILE = os.path.join(CAMPAIGN_DIR, "universe.md")
CHARACTERS_FILE = os.path.join(CAMPAIGN_DIR, "characters.md")
JOURNAL_FILE = os.path.join(CAMPAIGN_DIR, "journal.md")
CONFIG_FILE = os.path.join(CAMPAIGN_DIR, "config.json")
INVENTORY_PATH = os.path.join(CAMPAIGN_DIR, "inventory.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f: 
            config = json.load(f)
            # Default missing values
            if "model" not in config: config["model"] = "gemma4:e4b"
            if "language" not in config: config["language"] = "fr"
            return config
    return {"theme": "fantasy", "duration": "15min", "tone": "heroic", "partyMode": "solo", "model": "gemma4:e4b", "language": "fr"}

def save_config(config):
    # Ensure current model is reflected in engine
    if "model" in config:
        engine.model = config["model"]
    # Cleanup: remove infinite mode if it leaked in
    if config.get("duration") == "infinite":
        config["duration"] = "15min"
    with open(CONFIG_FILE, "w") as f: json.dump(config, f)

@app.get("/engine_status")
async def get_engine_status():
    """Checks if Ollama is running and Gemma 4 is available."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{engine.base_url}/api/tags")
            if response.status_code == 200:
                models = [m["name"] for m in response.json().get("models", [])]
                has_model = any(engine.model in m for m in models)
                return {"status": "online" if has_model else "missing_model", "model": engine.model}
    except:
        pass
    return {"status": "offline", "model": engine.model}

@app.get("/ollama_models")
async def get_ollama_models():
    """Lists installed models from local Ollama."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{engine.base_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                return [m["name"] for m in models if "gemma" in m["name"].lower()]
    except:
        pass
    return ["gemma4:e2b", "gemma4:e4b", "gemma4:26b", "gemma4:31b"]

@app.get("/init_game")
async def init_game():
    """Generates 3 character options using Gemma 4."""
    with open(UNIVERSE_FILE, "r") as f: universe = f.read()
    config = load_config()
    prompt = prompts.get_character_gen_prompt(universe, language=config.get("language", "fr"))
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(f"{engine.base_url}/api/generate", json={
                "model": engine.model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 1.2,
                    "seed": random.randint(1, 999999)
                }
            })
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                return data
            # If Ollama sends a nested response
            if "response" in data:
                try:
                    inner_data = json.loads(data["response"])
                    # If it's directly a list, perfect
                    if isinstance(inner_data, list): return inner_data
                    # If it's an object, look for the first list it contains
                    if isinstance(inner_data, dict):
                        for key in inner_data:
                            if isinstance(inner_data[key], list):
                                return inner_data[key]
                except Exception as je:
                    print(f"JSON Parse Error in response: {je}")
                    # Fallback: try manual extraction if JSON mode failed or returned noise
                    import re
                    match = re.search(r'\[\s*\{.*\}\s*\]', data.get("response", ""), re.DOTALL)
                    if match:
                        try:
                            return json.loads(match.group(0))
                        except: pass
    except Exception as e:
        print(f"Character Generation Error: {e}")
    
    config = load_config()
    theme = config.get('theme', 'fantasy')
    
    # Theme-specific fallbacks
    fallbacks = {
        "fantasy": [
            {"name": "Thalric", "class": "Oathbreaker", "background": "A fallen knight seeking redemption in the ruins."},
            {"name": "Elowen", "class": "Star-Caller", "background": "A nomad who speaks to the celestial bodies."},
            {"name": "Grog", "class": "Alchemist Cook", "background": "Can turn lead into gold, but prefers making soup."}
        ],
        "western": [
            {"name": "Silas Vane", "class": "Drifter", "background": "A man with no name and a very long memory."},
            {"name": "Clara 'Six' Cassidy", "class": "Outlaw", "background": "Wanted in three states for a crime she actually committed."},
            {"name": "Preacher Blue", "class": "Sin-Eater", "background": "Carries a Bible in one hand and a Colt in the other."}
        ],
        "cyberpunk": [
            {"name": "Neon-8", "class": "Net-Runner", "background": "Half human, half code, all trouble."},
            {"name": "Sledge", "class": "Street Samurai", "background": "More chrome than flesh, and twice as sharp."},
            {"name": "Vex", "class": "Data-Courier", "background": "Has a secret stored in a neural drive he can't access."}
        ],
        "moderne": [
            {"name": "Agent Sarah", "class": "Infiltrator", "background": "Ex-CIA, now working for whoever pays in untraceable crypto."},
            {"name": "Dr. Miller", "class": "Occult Researcher", "background": "Discovered that ghosts are just glitches in the simulation."},
            {"name": "Leo", "class": "Fixer", "background": "Knows a guy who knows a guy for everything."}
        ]
    }
    
    return fallbacks.get(theme, fallbacks["fantasy"])

@app.post("/setup_game")
async def setup_game(config: Dict[str, Any]):
    """Configures the world, duration, and tone."""
    save_config(config)
    
    lore = ""
    if config['theme'] == "random":
        prompt = "Invent a highly original and unique RPG setting. Avoid clichés. Give it a Name, a Tone, and 3 key details. Output as Markdown."
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(f"{engine.base_url}/api/generate", json={"model": engine.model, "prompt": prompt, "stream": False})
                lore = response.json().get("response", "A mysterious shifting world.")
        except: lore = "A world created from the fragments of chaos."
    else:
        world_path = f"worlds/{config['theme']}.md"
        if os.path.exists(world_path):
            with open(world_path, "r") as f: lore = f.read()
    
    with open(UNIVERSE_FILE, "w") as f: f.write(lore)
    with open(JOURNAL_FILE, "w") as f: f.write("---\nstatus: active\n---\n\n# 💎 THE GEMMASTER JOURNAL\n")
    parser.update_json_in_md(CHARACTERS_FILE, "## 🛡️ Adventurers", [])
    
    return {"status": "success"}

@app.post("/select_character")
async def select_character(character: Dict[str, Any]):
    """Saves the selected character with randomized base stats."""
    import random
    
    # Generate RPG stats with a pool of 36 points (min 8, max 16)
    if "stats" not in character:
        stats = {"logic": 10, "presence": 10, "tactics": 10}
        points_to_distribute = 6
        
        while points_to_distribute > 0:
            stat_choice = random.choice(["logic", "presence", "tactics"])
            if stats[stat_choice] < 16:
                stats[stat_choice] += 1
                points_to_distribute -= 1
        
        character["stats"] = stats
        
    character.update({"hp": 20, "max_hp": 20, "inventory": ["Starting Gear"], "status": "Active"})
    party = parser.read_json_from_md(CHARACTERS_FILE, "## 🛡️ Adventurers")
    if not isinstance(party, list): party = []
    party.append(character)
    parser.update_json_in_md(CHARACTERS_FILE, "## 🛡️ Adventurers", party)
    return {"status": "success"}

@app.get("/resume_summary")
async def resume_summary():
    """Generates a 'Previously on GemMaster' summary."""
    with open(UNIVERSE_FILE, "r") as f: universe = f.read()
    journal = parser.get_last_entries(JOURNAL_FILE, 20)
    config = load_config()
    prompt = prompts.get_resume_prompt(universe, journal, language=config.get("language", "fr"))
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{engine.base_url}/api/generate", json={"model": engine.model, "prompt": prompt, "stream": False})
            return response.json()
    except: return {"response": "The thread of reality is tangled, but your journey continues..."}

@app.get("/party")
async def get_party():
    party = parser.read_json_from_md(CHARACTERS_FILE, "## 🛡️ Adventurers")
    if isinstance(party, list):
        # Inject default stats if missing (for legacy characters)
        for hero in party:
            if "stats" not in hero:
                hero["stats"] = {"logic": 14, "presence": 12, "tactics": 10}
        return party
    return []

@app.get("/inventory")
async def get_inventory():
    if os.path.exists(INVENTORY_PATH):
        with open(INVENTORY_PATH, "r") as f:
            return json.load(f)
    return []

@app.post("/inventory")
async def save_inventory(request: Request):
    items = await request.json()
    with open(INVENTORY_PATH, "w") as f:
        json.dump(items, f)
    return {"status": "saved"}


async def compress_memory_task(journal_file_path: str):
    """Background task to summarize the journal to save tokens."""
    print("🧠 Background Task: Compressing memory...")
    entries = parser.parse_journal(journal_file_path)
    
    # Only compress if we have more than 12 entries
    if len(entries) <= 12:
        return
        
    # Summarize the oldest entries, keeping the last 4 for immediate context
    entries_to_summarize = entries[:-4]
    recent_entries = entries[-4:]
    
    text_to_summarize = "\n".join([f"{e['role']}: {e['content']}" for e in entries_to_summarize])
    prompt = f"[SYSTEM] Summarize the following events of our RPG campaign in 3 epic sentences. Keep the crucial facts, character states, and locations.\n\n{text_to_summarize}"
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{engine.base_url}/api/generate", 
                json={"model": engine.model, "prompt": prompt, "stream": False}
            )
            summary = response.json().get("response", "")
            
            if summary:
                # Rewrite journal replacing older entries with the summary
                with open(journal_file_path, "w") as f:
                    f.write("## 📜 Chronicle of Events\n\n")
                    f.write(f"**PREVIOUSLY ON GEMMASTER**:\n{summary.strip()}\n\n---\n\n")
                    for e in recent_entries:
                        # Convert role to the expected bold label
                        role_label = "**Player**" if e['role'] == "user" else "**Narrator**"
                        f.write(f"{role_label}:\n{e['content'].strip()}\n\n---\n\n")
                print("✅ Memory successfully compressed!")
    except Exception as e:
        print(f"⚠️ Failed to compress memory: {e}")

@app.get("/journal")
async def get_journal():
    return parser.parse_journal(JOURNAL_FILE)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    universe = ""
    if os.path.exists(UNIVERSE_FILE):
        with open(UNIVERSE_FILE, "r") as f: universe = f.read()
    party = await get_party()
    return templates.TemplateResponse("index.html", {"request": request, "universe": universe, "party": party})

@app.post("/chat")
async def chat(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    user_input = data.get("message")
    images = data.get("images", [])
    turn_count = data.get("turnCount", 0)
    
    with open(UNIVERSE_FILE, "r") as f: universe = f.read()
    journal_context = parser.get_last_entries(JOURNAL_FILE, 10)
    party = await get_party()
    agendas = parser.read_agendas(JOURNAL_FILE)
    config = load_config()

    # Determine max turns based on duration config (e.g. "10min" -> 10 turns)
    try:
        max_turns = int(''.join(filter(str.isdigit, config.get("duration", "15"))))
    except ValueError:
        max_turns = 15

    # Memory Compression Trigger
    # Trigger background task if the journal is getting too long (let's say every 5 turns)
    if turn_count > 0 and turn_count % 5 == 0:
        background_tasks.add_task(compress_memory_task, JOURNAL_FILE)

    # Prompt Injections (Invisible to UI, sent to LLM)
    language = config.get("language", "fr").lower()
    
    if language == "en":
        reminder = "\n\n[SYSTEM REMINDER: All narration and tags MUST be in ENGLISH. You MUST conclude your response with the [[OPTIONS]] tag containing exactly 3 choices. IMPORTANT: Never mention dice results or 'Success/Failure' in text. STOP narrating immediately after a [[CHECK]] or [[SKILL]] tag.]"
    else:
        reminder = "\n\n[RAPPEL SYSTÈME : Toute la narration et les tags doivent être en FRANÇAIS. Tu DOIS conclure par le tag [[OPTIONS]] avec exactement 3 choix. IMPORTANT : Ne mentionne jamais les résultats de dés ou 'Réussite/Échec' dans le texte. ARRÊTE de narrer immédiatement après un tag [[CHECK]] ou [[SKILL]].]"
    
    wrap_up = "\n\n[DIRECTIVE CRITIQUE : C'est le DERNIER TOUR. Tu DOIS conclure l'arc narratif MAINTENANT de façon épique et définitive EN FRANÇAIS.]" if language != "en" else "\n\n[CRITICAL DIRECTIVE: This is the FINAL TURN. You MUST conclude the narrative arc NOW in an epic and definitive manner IN ENGLISH. Provide final outcome options.]"

    if turn_count >= max_turns - 1:
        user_input += wrap_up
    else:
        user_input += reminder

    system_prompt = prompts.get_system_prompt(config, universe, party, journal_context, agendas, turn_count)

    async def stream_response():
        full_text = ""
        async for chunk in engine.generate_response(system_prompt, [], user_input, images):
            full_text += chunk
            yield chunk
        
        reasoning = engine.extract_reasoning(full_text)
        commands = engine.extract_commands(reasoning)
        
        # Apply Game Logic
        new_party = logic.process_commands(commands, await get_party())
        new_agendas = logic.update_agendas(commands, parser.read_agendas(JOURNAL_FILE))
        
        # Save State
        parser.update_json_in_md(CHARACTERS_FILE, "## 🛡️ Adventurers", new_party)
        parser.save_agendas(JOURNAL_FILE, new_agendas)
        parser.append_to_journal(JOURNAL_FILE, "user", user_input)
        parser.append_to_journal(JOURNAL_FILE, "ai", engine.clean_narrative(full_text))

    return StreamingResponse(stream_response(), media_type="text/event-stream")

@app.post("/reset")
async def reset_game():
    """Wipes the current campaign and restores default files."""
    # Reset Journal
    with open(JOURNAL_FILE, "w") as f:
        f.write("---\nstatus: active\n---\n\n# 💎 THE GEMMASTER JOURNAL\n")
    
    # Reset Characters
    parser.update_json_in_md(CHARACTERS_FILE, "## 🛡️ Adventurers", [])
    
    # Reset Inventory
    if os.path.exists(INVENTORY_PATH):
        with open(INVENTORY_PATH, "w") as f:
            json.dump([], f)
            
    # Reset Config
    default_config = {"theme": "fantasy", "duration": "15min", "tone": "heroic", "partyMode": "solo"}
    save_config(default_config)
    
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
