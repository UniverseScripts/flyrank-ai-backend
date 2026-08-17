from pydantic import BaseModel, EmailStr
from typing import Optional

class UserSignUp(BaseModel):
    username: Optional[str] = None
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserLoginResponse(BaseModel):
    id: int
    username: str
    token: str