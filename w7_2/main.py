from fastapi import FastAPI
from contextlib import asynccontextmanager
from playwright.async_api import async_playwright

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server Starting...")
    
    yield
    
    print("Server Stopped...")

app = FastAPI(version="0.0.1", description="PDF Generator with Playwright", title="PDF Generator", lifespan=lifespan)


@app.get("/")
async def root():
    return {"message": "Welcome to the PDF Generator API"}

@app.get("/health", status_code=200)
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)