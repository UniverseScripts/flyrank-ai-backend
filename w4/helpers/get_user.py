from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import acreate_client

from config import settings

async def get_user(token: str):
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        user_client = await acreate_client(supabase_url=settings.SUPABASE_URL, supabase_key=settings.SUPABASE_KEY)
        user = await user_client.auth.get_user(jwt=token)
        if not user or not user.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        return user.user
    except:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")