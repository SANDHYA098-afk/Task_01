from fastapi import HTTPException, status
from models import UserSignup, UserLogin, UserResponse
from typing import Dict
import hashlib
import json
import os

# Path to persistent user database file
DB_FILE = os.path.join(os.path.dirname(__file__), "users_db.json")

def load_users() -> Dict[str, dict]:
    """Load users from JSON file"""
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r") as f:
            return json.load(f)
    return {}

def save_users(users: Dict[str, dict]):
    """Save users to JSON file"""
    with open(DB_FILE, "w") as f:
        json.dump(users, f, indent=2)

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def signup_user(user: UserSignup) -> UserResponse:
    """Register a new user"""
    users_db = load_users()

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
    save_users(users_db)
    
    return UserResponse(
        success=True,
        message="User registered successfully",
        user={"name": user.name, "email": user.email}
    )

def login_user(user: UserLogin) -> UserResponse:
    """Authenticate user"""
    users_db = load_users()

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
    users_db = load_users()
    return users_db.get(email)
