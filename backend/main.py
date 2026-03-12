import os
import io
import jwt
import bcrypt
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from bson import ObjectId

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="FinPlan AI MongoDB API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGODB_URL = os.getenv("MONGODB_URL")
if not MONGODB_URL:
    print("CRITICAL: MONGODB_URL not found in .env file")

client = AsyncIOMotorClient(MONGODB_URL)
db = client.finplan
SECRET_KEY = os.getenv("JWT_SECRET", "secret_key_default_123")

# --- Startup Connection Check ---
@app.on_event("startup")
async def verify_mongodb_connection():
    try:
        # The 'ping' command is cheap and checks if credentials/URL are valid
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print("\n❌ MONGODB CONNECTION ERROR:")
        print(f"Error Details: {str(e)}")
        print("\nTROUBLESHOOTING:")
        print("1. Check if your password in .env is correct.")
        print("2. Ensure your IP address is whitelisted in MongoDB Atlas (Network Access).")
        print("3. If your password has special characters like '@', use URL encoding.\n")

# --- Pydantic Models ---
class UserAuth(BaseModel):
    email: EmailStr
    password: str

class GoalItem(BaseModel):
    title: str
    target: float
    current: float = 0
    color: str

# --- Auth Helpers ---
def create_token(user_id: str):
    """Generates a JWT token valid for 7 days."""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to extract user_id from the Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Endpoints ---

@app.get("/")
def health_check():
    """Verify the backend is reachable from the browser."""
    return {"status": "success", "message": "Backend is running and connected!"}

@app.post("/api/auth/register")
async def register(auth: UserAuth):
    """Register a new user and return a JWT."""
    try:
        existing = await db.users.find_one({"email": auth.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password before storing
        hashed = bcrypt.hashpw(auth.password.encode('utf-8'), bcrypt.gensalt())
        
        result = await db.users.insert_one({
            "email": auth.email,
            "password": hashed,
            "created_at": datetime.utcnow()
        })
        
        user_id = str(result.inserted_id)
        return {"token": create_token(user_id), "email": auth.email}
    except Exception as e:
        # Check for authentication failures during runtime
        if "authentication failed" in str(e).lower():
            raise HTTPException(status_code=500, detail="Database Authentication Failed. Check your MongoDB password in .env")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login(auth: UserAuth):
    """Authenticate user and return a JWT."""
    user = await db.users.find_one({"email": auth.email})
    if not user or not bcrypt.checkpw(auth.password.encode('utf-8'), user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    return {"token": create_token(user_id), "email": auth.email}

@app.get("/api/user/goals")
async def get_goals(user_id: str = Depends(get_current_user)):
    """Fetch all goals for the logged-in user."""
    cursor = db.goals.find({"user_id": user_id})
    goals = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        goals.append(doc)
    return goals

@app.post("/api/user/goals")
async def add_goal(goal: GoalItem, user_id: str = Depends(get_current_user)):
    """Create a new financial goal."""
    data = goal.dict()
    data["user_id"] = user_id
    result = await db.goals.insert_one(data)
    return {"status": "success", "id": str(result.inserted_id)}

@app.post("/api/upload-statement")
async def upload(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    """Parse CSV bank statement (Placeholder implementation)."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    return {
        "status": "success", 
        "summary": {
            "net_savings": 45000, 
            "total_income": 120000,
            "period": "Analysis Complete"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)