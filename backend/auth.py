from fastapi import HTTPException, status
from models import UserSignup, UserLogin, UserResponse
from typing import Dict
import hashlib

# In-memory user storage (replace with database in production)
users_db: Dict[str, dict] = {}

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def signup_user(user: UserSignup) -> UserResponse:
    """Register a new user"""
    if user.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = hash_password(user.password)
    users_db[user.email] = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password
    }
    
    return UserResponse(
        success=True,
        message="User registered successfully",
        user={"name": user.name, "email": user.email}
    )

def login_user(user: UserLogin) -> UserResponse:
    """Authenticate user"""
    if user.email not in users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    stored_user = users_db[user.email]
    hashed_password = hash_password(user.password)
    
    if stored_user["password"] != hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    return UserResponse(
        success=True,
        message="Login successful",
        user={"name": stored_user["name"], "email": stored_user["email"]}
    )

def get_user_by_email(email: str) -> dict | None:
    """Get user by email"""
    return users_db.get(email)
