from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors and return HTTP 400 Bad Request."""
    return JSONResponse(
        status_code=400,
        content={"detail": "Missing topic"},
    )
