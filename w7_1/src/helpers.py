import json
import os
import time
import re
from pathlib import Path
from openai import OpenAI, APITimeoutError, AuthenticationError, PermissionDeniedError
from fastapi import HTTPException, status
from w7.config import settings

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "support_classifier_v1.md"
PROMPT_VERSION="1.0.0"

async def write_log(text: str, file_name: str, response):
    log_path = Path(__file__).resolve().parent.parent / "logs" / f"{file_name}.jsonl"
    if os.getenv("LLM_STUB") == "1":
        return
    
    payload = response.model_dump() if hasattr(response, "model_dump") else response

    os.makedirs(log_path.parent, exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps({"text": text, "response": payload}) + "\n")

async def model_call(messages: list, model_name: str = settings.LLM_MODEL) -> dict:
    #Write one structured log line per call: prompt version, model, input tokens, output tokens, duration in milliseconds, and whether it needed a repair.
    client = OpenAI(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
    )

    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        system_prompt = f.read()

    messages = [{"role": "system", "content": system_prompt}] + messages
    
    try:
        start = time.time()
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
            timeout=30.0,
        )
        
        duration = (time.time() - start) * 1000
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
        response = response.choices[0].message.content.strip()
        
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if match:
            response = match.group(0)

        payload = {
            "response": response,
            "prompt_version": PROMPT_VERSION,
            "model": model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "duration_ms": duration,
        }

        return payload
        
    except APITimeoutError as e:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(e)
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        )
    except PermissionDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )