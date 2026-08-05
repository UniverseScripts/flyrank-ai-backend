from fastapi import FastAPI

app = FastAPI(title="Flyrank AI", description="Flyrank AI Backend", version="0.0.1")

@app.get("/")
def read_root():
    return {"message": "Hello World"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)
