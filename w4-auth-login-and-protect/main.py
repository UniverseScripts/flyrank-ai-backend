import sys
from pathlib import Path

from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status, Header
from supabase import acreate_client, AsyncClient

from db_engine import create_tables, engine, get_db
from schemas.auth import UserLogin, UserSignUp
from config import settings
from helpers.get_user import get_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up... ⌛")
    print("Creating tables...")
    await create_tables()
    print("Application booted successfully! 🚀")
    yield
    print("Shutting down... ⏳")
    await engine.dispose()


app = FastAPI(
    title="Flyrank AI - Week 4 Task API",
    description="Authentication and Middleware with Supabase",
    version="1.0.0",
    lifespan=lifespan,
)

async def get_supabase_client() -> AsyncClient:
    return await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

@app.get("/health", summary="Health check")
async def health_check():
    return {"status": "ok"}


@app.post("/auth/signup", status_code=status.HTTP_201_CREATED)
async def signup(user: UserSignUp, supabase: AsyncClient = Depends(get_supabase_client)):
    try:
        credentials = {
            "email": user.email,
            "password": user.password
        }
        if user.username:
            credentials["options"] = {"data": {"username": user.username}}
        new_user = await supabase.auth.sign_up(credentials)
        if not new_user.user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signup failed")
        return new_user.user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    

@app.post("/auth/login", status_code=status.HTTP_200_OK)
async def login(user: UserLogin, supabase: AsyncClient = Depends(get_supabase_client)):
    try:
        user_session = await supabase.auth.sign_in_with_password({"email": str(user.email), "password": user.password})
        if not user_session.session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Login Credentials")
        return {
            "access_token": user_session.session.access_token,
            "refresh_token": user_session.session.refresh_token,
            "token_type": "bearer",
            "user": user_session.user,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    
@app.get("/public/info", status_code=status.HTTP_200_OK)
async def public_info():
    return {
        "message": "Welcome stranger! This info is public.",
    }

@app.get("/protected/profile", status_code=status.HTTP_200_OK)
async def profile(user = Depends(get_user)):
    return user

@app.get("/protected/dashboard", status_code=status.HTTP_200_OK)
async def dashboard(user = Depends(get_user)):
    return {
        "message": f"Welcome to dashboard. {user.email}!",
        "user_id": user.id
    }

@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user = Depends(get_user), supabase: AsyncClient = Depends(get_supabase_client)):
    await supabase.auth.sign_out()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)