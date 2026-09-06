import os
import json
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from openai import OpenAI, APITimeoutError
from config import settings
from src.schemas import (
    ClassifySupportMessageRequest,
    ClassifySupportMessageResponse,
)
from src.helpers import write_log, model_call

VERSION = "1.0.0"

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting up, version = {VERSION}")
    yield
    print("Shutting down")

app = FastAPI(lifespan=lifespan, version=VERSION)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": VERSION}


@app.get("/model-health")
async def model_health_check():
    try:
        client.models.list()
        return {"status": "ok", "version": VERSION}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

@app.post("/v1/classify-support-message", response_model=ClassifySupportMessageResponse)
async def classify_support_message(request: ClassifySupportMessageRequest):

    repair_needed = False

    if not settings.LLM_ENABLED:
        return ClassifySupportMessageResponse(
            category="billing",
            urgency="low",
            confidence=0.8,
            reason="Stub response"
        )
    else:
        try:
            messages = [
                {"role": "user", "content": request.text}
            ]

            response = await model_call(messages)
            response["repair_needed"] = repair_needed
            
            try:
                response_json = json.loads(response["response"])
                await write_log(text=request.text, file_name="telemetry", response=response)
                return ClassifySupportMessageResponse.model_validate(response_json)
            except Exception as parse_err:
                repair_needed = True
                raw_content = response["response"]
                malformed = ClassifySupportMessageResponse(
                    category="other",
                    urgency="low",
                    confidence=0.0,
                    reason=f"Failed to parse LLM response as JSON: {parse_err}"
                )

                retry_messages = [
                    {"role": "user", "content": request.text},
                    {"role": "assistant", "content": raw_content},
                    {"role": "user", "content": "Your previous answer was rejected for this reason. Return only corrected JSON matching the schema."}
                ]
                retry_response = await model_call(retry_messages)
                retry_response["repair_needed"] = repair_needed
                try:
                    retry_response_json = json.loads(retry_response["response"])
                    await write_log(text=request.text, file_name="telemetry", response=retry_response)
                    return ClassifySupportMessageResponse.model_validate(retry_response_json)
                except (json.JSONDecodeError, Exception) as parse_err:
                    await write_log(text=request.text, file_name="quarantine", response=malformed)
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(parse_err)
                    )
        except HTTPException as e:
            # timeouts, 429 , and 5xx errors
            if e.status_code in [status.HTTP_504_GATEWAY_TIMEOUT, status.HTTP_429_TOO_MANY_REQUESTS, status.HTTP_500_INTERNAL_SERVER_ERROR, status.HTTP_502_BAD_GATEWAY, status.HTTP_503_SERVICE_UNAVAILABLE]:
                repair_needed = True
                retry_messages = [
                    {"role": "user", "content": request.text},
                    {"role": "user", "content": "Your previous answer exceeded time limit or server error. Return only JSON matching the schema."}
                ]
                retry_response = await model_call(retry_messages)
                retry_response["repair_needed"] = repair_needed
                try:
                    retry_response_json = json.loads(retry_response["response"])
                    await write_log(text=request.text, file_name="telemetry", response=retry_response)
                    return ClassifySupportMessageResponse.model_validate(retry_response_json)
                except (json.JSONDecodeError, Exception) as parse_err:
                    await write_log(text=request.text, file_name="quarantine", response=malformed)
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(parse_err)
                    )
            else:
                raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("w7.src.main:app", host="0.0.0.0", port=8000, reload=True)