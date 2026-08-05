from fastapi import FastAPI


app = FastAPI(title="Flyrank AI", description="Flyrank AI Backend", version="0.0.1")

@app.get("/")
def read_root():
    return { "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] }

@app.get('/health')
def check_health():
    return { "status": "ok" }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)
