import json
import os
from pathlib import Path

LOG_PATH = Path(__file__).resolve().parent.parent / "logs" / "quarantine.jsonl"

async def write_log(text: str, response):
    if os.getenv("LLM_STUB") == "1":
        return
    
    os.makedirs(LOG_PATH.parent, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps({"text": text, "response": response.model_dump()}) + "\n")