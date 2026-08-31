import os
import json
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from openai import OpenAI
from pathlib import Path
from w7.config import settings
from w7.src.schemas import (
    ClassifySupportMessageRequest,
    ClassifySupportMessageResponse,
)

VERSION = "1.0.0"
PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "support_classifier_v1.md"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting up, version = {VERSION}")
    yield
    print("Shutting down")

app = FastAPI(lifespan=lifespan, version=VERSION)
client = OpenAI(base_url=settings.LLM_BASE_URL, api_key=settings.LLM_API_KEY)


@app.get("/health")
def health_check():
    return {"status": "ok", "version": VERSION}


@app.get("/model-health")
def model_health_check():
    try:
        client.models.list()
        return {"status": "ok", "version": VERSION}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

@app.post("/v1/classify-support-message", response_model=ClassifySupportMessageResponse)
def classify_support_message(request: ClassifySupportMessageRequest):
    if os.getenv("LLM_STUB") == "1":
        return ClassifySupportMessageResponse(
            category="billing",
            urgency="low",
            confidence=0.8,
            reason="Stub response"
        )
    else:
        try:
            # 1. System Prompt
            with open(PROMPT_PATH, "r", encoding="utf-8") as f:
                system_prompt = f.read()

            # 2. Construct messages for OpenAI
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.text}
            ]

            # 3. Call OpenAI
            response = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            
            # 4. Parse JSON and map to response model
            try:
                raw_content = response.choices[0].message.content.strip()
                if raw_content.startswith("```"):
                    lines = raw_content.splitlines()
                    if lines and lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    raw_content = "\n".join(lines).strip()
                
                match = re.search(r"\{.*\}", raw_content, re.DOTALL)
                if match:
                    raw_content = match.group(0)

                response_json = json.loads(raw_content)
                return ClassifySupportMessageResponse.model_validate(response_json)
            except (json.JSONDecodeError, Exception) as parse_err:
                # Fallback for malformed JSON
                return ClassifySupportMessageResponse(
                    category="other",
                    urgency="low",
                    confidence=0.0,
                    reason=f"Failed to parse LLM response as JSON: {parse_err}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("w7.src.main:app", host="0.0.0.0", port=8000, reload=True)