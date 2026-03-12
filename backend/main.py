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

class TransactionItem(BaseModel):
    type: str  # 'income' or 'expense'
    amount: float
    label: str
    date: str # ISO format string

class UserSettings(BaseModel):
    name: Optional[str] = None
    emailAlerts: Optional[bool] = None
    pushNotifs: Optional[bool] = None
    twoFactor: Optional[bool] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target: Optional[float] = None
    add_amount: Optional[float] = None
    color: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
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

@app.put("/api/user/goals/{goal_id}")
async def update_goal(goal_id: str, update: GoalUpdate, user_id: str = Depends(get_current_user)):
    """Update an existing goal (title, target, color) or add to its current amount."""
    goal = await db.goals.find_one({"_id": ObjectId(goal_id), "user_id": user_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_fields = {}
    if update.title is not None: update_fields["title"] = update.title
    if update.target is not None: update_fields["target"] = update.target
    if update.color is not None: update_fields["color"] = update.color

    inc_fields = {}
    if update.add_amount is not None: inc_fields["current"] = update.add_amount

    update_query = {}
    if update_fields: update_query["$set"] = update_fields
    if inc_fields: update_query["$inc"] = inc_fields

    if not update_query:
        return {"status": "success", "message": "No changes requested"}

    await db.goals.update_one({"_id": ObjectId(goal_id)}, update_query)
    return {"status": "success"}

@app.delete("/api/user/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    """Delete a financial goal."""
    result = await db.goals.delete_one({"_id": ObjectId(goal_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"status": "success"}

@app.delete("/api/user/transactions")
async def delete_all_transactions(user_id: str = Depends(get_current_user)):
    """Delete all transactions for the user."""
    await db.transactions.delete_many({"user_id": user_id})
    return {"status": "success"}

@app.get("/api/user/transactions")
async def get_transactions(user_id: str = Depends(get_current_user)):
    """Fetch all income and expense transactions for the user."""
    cursor = db.transactions.find({"user_id": user_id}).sort("date", -1)
    transactions = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        transactions.append(doc)
    return transactions

@app.post("/api/user/transactions")
async def add_transaction(transaction: TransactionItem, user_id: str = Depends(get_current_user)):
    """Add a new income or expense transaction."""
    data = transaction.dict()
    data["user_id"] = user_id
    data["created_at"] = datetime.utcnow()
    result = await db.transactions.insert_one(data)
    return {"status": "success", "id": str(result.inserted_id)}

@app.get("/api/user/settings")
async def get_settings(user_id: str = Depends(get_current_user)):
    """Fetch user profile and settings preferences."""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "email": user.get("email"),
        "name": user.get("name", "FinPlan User"),
        "settings": user.get("settings", {
            "emailAlerts": True,
            "pushNotifs": False,
            "twoFactor": False
        })
    }

@app.post("/api/user/settings")
async def update_settings(settings: UserSettings, user_id: str = Depends(get_current_user)):
    """Update user profile and settings preferences."""
    update_data = {}
    if settings.name is not None:
        update_data["name"] = settings.name
        
    settings_dict = {}
    if settings.emailAlerts is not None: settings_dict["emailAlerts"] = settings.emailAlerts
    if settings.pushNotifs is not None: settings_dict["pushNotifs"] = settings.pushNotifs
    if settings.twoFactor is not None: settings_dict["twoFactor"] = settings.twoFactor
    
    if settings_dict:
        update_data["settings"] = settings_dict
        
    if not update_data:
        return {"status": "success", "message": "No changes provided"}

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    return {"status": "success"}

@app.post("/api/user/change-password")
async def change_password(pass_data: PasswordChange, user_id: str = Depends(get_current_user)):
    """Update user password securely."""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not bcrypt.checkpw(pass_data.current_password.encode('utf-8'), user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect current password")
        
    hashed = bcrypt.hashpw(pass_data.new_password.encode('utf-8'), bcrypt.gensalt())
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed}}
    )
    return {"status": "success"}

@app.post("/api/upload-statement")
async def upload(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    """Parse CSV bank statement and save transactions."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        content = await file.read()
        # Read the CSV. We expect columns loosely like: Date, Description, Amount, Type
        # We will do a generic parse looking for positive/negative amounts or distinct columns
        df = pd.read_csv(io.BytesIO(content))
        
        # Super generic CSV parser: 
        # Tries to find amount-like columns and description-like columns
        # For a real banking app, this would be highly specialized per-bank.
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        amount_col = next((c for c in df.columns if 'amount' in c or 'value' in c or 'credit' in c or 'debit' in c), None)
        desc_col = next((c for c in df.columns if 'desc' in c or 'narration' in c or 'particulars' in c), None)
        date_col = next((c for c in df.columns if 'date' in c or 'time' in c), None)
        
        if not amount_col or not desc_col:
            raise HTTPException(status_code=400, detail="Could not automatically identify 'Amount' and 'Description' columns in the CSV.")
            
        transactions_to_insert = []
        total_income = 0
        total_expense = 0
        
        for index, row in df.iterrows():
            try:
                # Handle potential string amounts like "$1,000.50"
                raw_amt = str(row[amount_col]).replace(',', '').replace('$', '').replace('₹', '').strip()
                amt = float(raw_amt)
                
                # Skip zero amounts or NaNs
                if pd.isna(amt) or amt == 0:
                    continue
                    
                t_type = 'income' if amt > 0 else 'expense'
                abs_amt = abs(amt)
                
                if t_type == 'income': total_income += abs_amt
                else: total_expense += abs_amt
                
                # Try to parse date, fallback to now
                t_date = datetime.utcnow().isoformat()
                if date_col and not pd.isna(row[date_col]):
                    t_date_raw = str(row[date_col])
                    # Ensure format is roughly standard (dayfirst helps handle DD-MM-YYYY)
                    parsed_date = pd.to_datetime(t_date_raw, errors='coerce', dayfirst=True)
                    if not pd.isna(parsed_date):
                        t_date = parsed_date.isoformat()

                transactions_to_insert.append({
                    "user_id": user_id,
                    "type": t_type,
                    "amount": abs_amt,
                    "label": str(row[desc_col])[:50], # Trim long desc
                    "date": t_date,
                    "created_at": datetime.utcnow()
                })
            except Exception as e:
                # Skip unparseable rows (like headers or empty footers)
                continue
                
        if transactions_to_insert:
            await db.transactions.insert_many(transactions_to_insert)
            
        return {
            "status": "success", 
            "inserted": len(transactions_to_insert),
            "summary": {
                "net_savings": total_income - total_expense, 
                "total_income": total_income,
                "period": "Automated Parsing Complete"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)