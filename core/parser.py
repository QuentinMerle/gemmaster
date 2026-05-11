import re
import json
import os
from typing import Dict, Any, List

class MarkdownParser:
    @staticmethod
    def read_json_from_md(file_path: str, section_header: str) -> Dict[str, Any]:
        """
        Finds a JSON block under a specific Markdown header.
        """
        if not os.path.exists(file_path):
            return {}
            
        with open(file_path, "r") as f:
            content = f.read()

        # Find the section and the next code block
        pattern = rf"{section_header}.*?```json\n(.*?)\n```"
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                return {}
        return {}

    @staticmethod
    def update_json_in_md(file_path: str, section_header: str, new_data: Dict[str, Any]):
        """
        Updates a JSON block under a specific Markdown header.
        """
        if not os.path.exists(file_path):
            # Create file if missing
            with open(file_path, "w") as f: f.write(f"# {os.path.basename(file_path)}\n")
            
        with open(file_path, "r") as f:
            content = f.read()

        pattern = rf"({section_header}.*?```json\n)(.*?)(\n```)"
        if re.search(pattern, content, re.DOTALL):
            new_content = re.sub(pattern, lambda m: m.group(1) + json.dumps(new_data, indent=2) + m.group(3), content, flags=re.DOTALL)
        else:
            # If block doesn't exist, append it under the header
            if section_header in content:
                new_content = content.replace(section_header, f"{section_header}\n\n```json\n{json.dumps(new_data, indent=2)}\n```")
            else:
                new_content = content + f"\n\n{section_header}\n\n```json\n{json.dumps(new_data, indent=2)}\n```"
        
        with open(file_path, "w") as f:
            f.write(new_content)

    @staticmethod
    def append_to_journal(file_path: str, role: str, content: str):
        """Appends a structured entry to the narrative journal."""
        if not os.path.exists(file_path):
            with open(file_path, "w") as f: 
                f.write("---\nstatus: active\n---\n\n# 💎 THE GEMMASTER JOURNAL\n")

        with open(file_path, "a") as f:
            if role == "ai":
                f.write(f"\n\n> **GEMMASTER**: {content}\n")
            else:
                f.write(f"\n\n### 👤 PLAYER ACTION\n{content}\n")

    @staticmethod
    def get_last_entries(file_path: str, count: int = 5) -> str:
        """Reads the last few entries for context."""
        if not os.path.exists(file_path):
            return ""
        with open(file_path, "r") as f:
            content = f.read()
        
        # Split by blocks and return last N
        blocks = content.split("\n\n")
        return "\n\n".join(blocks[-count:])

    @staticmethod
    def save_agendas(file_path: str, agendas: List[Dict[str, str]]):
        """Saves secret NPC agendas to the cartridge."""
        MarkdownParser.update_json_in_md(file_path, "## 🕵️ SECRET AGENDAS", agendas)

    @staticmethod
    def read_agendas(file_path: str) -> List[Dict[str, str]]:
        """Reads secret NPC agendas from the cartridge."""
        agendas = MarkdownParser.read_json_from_md(file_path, "## 🕵️ SECRET AGENDAS")
        return agendas if isinstance(agendas, list) else []

    @staticmethod
    def parse_journal(file_path: str) -> List[Dict[str, str]]:
        """Parses the journal.md into a list of messages for the UI."""
        if not os.path.exists(file_path): return []
        with open(file_path, "r") as f: content = f.read()
        
        entries = []
        # Match user entries
        # ### 👤 PLAYER ACTION\nContent
        # Match AI entries
        # > **GEMMASTER**: Content
        
        # Simple splitting by patterns
        blocks = re.split(r"(### 👤 PLAYER ACTION|> \*\*GEMMASTER\*\*:)", content)
        
        for i in range(1, len(blocks), 2):
            role_marker = blocks[i]
            text = blocks[i+1].strip()
            role = "user" if "PLAYER" in role_marker else "ai"
            entries.append({"role": role, "content": text})
            
        return entries
