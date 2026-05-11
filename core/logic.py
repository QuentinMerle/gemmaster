import json
from typing import List, Dict, Any

class GameLogic:
    @staticmethod
    def process_commands(commands: List[Dict[str, Any]], current_party: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Applies mechanical commands (HP, items, skills) to the party."""
        for cmd in commands:
            # Handle Skill activation
            if cmd["cmd"] == "SKILL":
                # Skill logic could be expanded here (e.g., setting a flag in state)
                print(f"🛠️ SKILL TRIGGERED: {cmd['val']}")
                continue

            parts = [p.strip() for p in cmd["val"].split(',')]
            if len(parts) < 2: continue
            
            target_name, val = parts[0], parts[1]
            hero = next((h for h in current_party if h["name"] == target_name), None)
            
            if hero:
                if cmd["cmd"] == "UPDATE_HP":
                    try:
                        hero["hp"] = int(val)
                    except ValueError: pass
                elif cmd["cmd"] == "ADD_ITEM":
                    if "inventory" not in hero: hero["inventory"] = []
                    hero["inventory"].append(val)
                elif cmd["cmd"] == "REMOVE_ITEM":
                    if "inventory" in hero and val in hero["inventory"]:
                        hero["inventory"].remove(val)
                elif cmd["cmd"] == "UPDATE_STAT":
                    stat_name, stat_val = parts[0], parts[1] # Overriding for STAT
                    if "stats" in hero:
                        hero["stats"][stat_name.lower()] = int(stat_val)
        return current_party

    @staticmethod
    def update_agendas(commands: List[Dict[str, Any]], current_agendas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Updates secret NPC agendas."""
        new_agendas = [c for c in commands if c["cmd"] == "SECRET_AGENDA"]
        for na in new_agendas:
            parts = [p.strip() for p in na["val"].split(',')]
            if len(parts) >= 2:
                npc, agenda = parts[0], parts[1]
                existing = next((a for a in current_agendas if a["npc"] == npc), None)
                if existing: existing["agenda"] = agenda
                else: current_agendas.append({"npc": npc, "agenda": agenda})
        return current_agendas
