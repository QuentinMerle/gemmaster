import httpx
import json
import re
from typing import AsyncGenerator, Dict, List, Any

class NarrativeEngine:
    def __init__(self, model: str = "gemma4:e4b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def generate_response(self, system_prompt: str, history: List[Dict[str, str]], user_input: str, images: List[str] = None) -> AsyncGenerator[str, None]:
        """
        Generates a narrative response with streaming.
        Uses a <reasoning> block for internal game mechanics.
        """
        user_message = {"role": "user", "content": user_input}
        if images:
            user_message["images"] = images

        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            user_message
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True
        }

        print(f"🚀 Sending request to Ollama ({self.model})...")
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    print(f"📡 Ollama Status: {response.status_code}")
                    async for line in response.aiter_lines():
                        if line:
                            data = json.loads(line)
                            if "message" in data and "content" in data["message"]:
                                yield data["message"]["content"]
        except Exception as e:
            print(f"❌ httpx Error: {e}")
            yield f"Error connecting to Ollama: {str(e)}"

    def extract_reasoning(self, content: str) -> str:
        """Extracts the <reasoning> block from the response."""
        match = re.search(r"<reasoning>(.*?)</reasoning>", content, re.DOTALL)
        return match.group(1).strip() if match else ""

    def clean_narrative(self, content: str) -> str:
        """Removes the <reasoning> block for the final player view."""
        return re.sub(r"<reasoning>.*?</reasoning>", "", content, flags=re.DOTALL).strip()

    def extract_commands(self, reasoning: str) -> List[Dict[str, Any]]:
        """
        Parses commands like [[UPDATE_HP: 15]] or [[ADD_ITEM: Name, Item]] from reasoning.
        """
        commands = []
        matches = re.finditer(r"\[\[(.*?):\s*(.*?)\]\]", reasoning)
        for match in matches:
            commands.append({
                "cmd": match.group(1).strip(),
                "val": match.group(2).strip()
            })
        return commands
