import os
import io
import jwt
import bcrypt
import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from bson import ObjectId

import logging

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

from contextlib import asynccontextmanager

# --- Lifespan Event Handler ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    mongodb_url = os.getenv("MONGODB_URL")
    if not mongodb_url:
        logger.warning("MONGODB_URL is not set in environment variables!")
    else:
        try:
            await client.admin.command('ping')
            logger.info("Successfully connected to MongoDB Atlas!")
        except Exception as e:
            logger.error(f"MONGODB CONNECTION ERROR: {str(e)}")
    
    yield
    # Shutdown logic (optional)
    client.close()

app = FastAPI(title="FinPlan AI MongoDB API", lifespan=lifespan)

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
client = AsyncIOMotorClient(MONGODB_URL)
db = client.finplan
SECRET_KEY = os.getenv("JWT_SECRET", "secret_key_default_123")

# --- Pydantic Models ---
class UserAuth(BaseModel):
    email: EmailStr
    password: str

class AccountItem(BaseModel):
    name: str
    type: str # 'Bank', 'Cash', 'Credit Card', 'Investment'
    balance: float = 0.0
    color: Optional[str] = "#6366f1"

class GoalItem(BaseModel):
    title: str
    target: float
    current: float = 0
    color: str
    target_date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    milestones: Optional[List[dict]] = []

class TransactionItem(BaseModel):
    type: str  # 'income' or 'expense'
    amount: float
    label: str
    date: str # ISO format string
    account_id: Optional[str] = None
    category: Optional[str] = None

class BudgetItem(BaseModel):
    category: str
    limit: float
    period: str = "monthly"

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
    target_date: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AIChatRequest(BaseModel):
    message: str
    history: List[dict] = []

class GoogleAuthRequest(BaseModel):
    token: str

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

def robust_parse_date(date_str: str) -> str:
    """Attempts to parse a date string using various common formats."""
    if not date_str or pd.isna(date_str):
        return datetime.now(timezone.utc).isoformat()
    
    date_str = str(date_str).strip()
    
    # Try pandas default (intelligent inference)
    try:
        # We try dayfirst=True first as it's common in statements with ₹
        parsed = pd.to_datetime(date_str, errors='coerce', dayfirst=True)
        if not pd.isna(parsed):
            # Ensure it's in ISO format with 'Z' suffix for consistency
            return parsed.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'
    except:
        pass

    # Common formats specifically for manual fallback
    formats = [
        "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
        "%d.%m.%Y", "%b %d, %Y", "%d %b %Y", "%Y/%m/%d",
        "%d-%b-%Y", "%d %B %Y"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%dT%H:%M:%S') + 'Z'
        except ValueError:
            continue
            
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S') + 'Z'

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

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

@app.post("/api/auth/login")
async def login(auth: UserAuth):
    """Authenticate user and return a JWT."""
    user = await db.users.find_one({"email": auth.email})
    if not user or not bcrypt.checkpw(auth.password.encode('utf-8'), user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    return {"token": create_token(user_id), "email": auth.email}

@app.post("/api/auth/google")
async def google_auth(request: GoogleAuthRequest):
    """Verify Google token and login/register the user."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google Login is not configured on the server")

    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(request.token, google_requests.Request(), client_id)
        email = idinfo['email']
        name = idinfo.get('name', 'FinPlan User')

        # Check if user exists
        user = await db.users.find_one({"email": email})

        if not user:
            # Create a new user account without a password
            result = await db.users.insert_one({
                "email": email,
                "name": name,
                "password": b"", # No password for OAuth users
                "created_at": datetime.now(timezone.utc),
                "auth_provider": "google",
                "settings": {
                    "emailAlerts": True,
                    "pushNotifs": False,
                    "twoFactor": False
                }
            })
            user_id = str(result.inserted_id)
        else:
            user_id = str(user["_id"])
            # Update name if empty
            if not user.get("name"):
                await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": name}})

        return {"token": create_token(user_id), "email": email}
        
    except ValueError as e:
        print("Google Auth Verification Error:", e)
        raise HTTPException(status_code=401, detail="Invalid Google token")

# --- Account Endpoints ---

@app.get("/api/user/accounts")
async def get_accounts(user_id: str = Depends(get_current_user)):
    """Fetch all accounts for the user."""
    cursor = db.accounts.find({"user_id": user_id})
    accounts = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        accounts.append(doc)
    return accounts

@app.post("/api/user/accounts")
async def add_account(account: AccountItem, user_id: str = Depends(get_current_user)):
    """Create a new account/pocket."""
    data = account.dict()
    data["user_id"] = user_id
    data["created_at"] = datetime.now(timezone.utc)
    result = await db.accounts.insert_one(data)
    return {"status": "success", "id": str(result.inserted_id)}

@app.delete("/api/user/accounts/{account_id}")
async def delete_account(account_id: str, user_id: str = Depends(get_current_user)):
    """Delete an account and its transactions? (Keeping transactions for now but unlinked)."""
    result = await db.accounts.delete_one({"_id": ObjectId(account_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    # Optional: Update transactions to remove this account_id
    await db.transactions.update_many({"account_id": account_id}, {"$set": {"account_id": None}})
    return {"status": "success"}

def matches_category(tx_cat: str, budget_cat: str) -> bool:
    """Helper to match transaction categories with budget categories (fuzzy)."""
    if not tx_cat or not budget_cat:
        return False
    
    tx_cat = tx_cat.strip().lower()
    budget_cat = budget_cat.strip().lower()
    
    # 1. Exact match
    if tx_cat == budget_cat:
        return True
    
    # 2. Match first part (e.g., "Food" matches "Food & Dining")
    tx_first = tx_cat.split(' - ')[0].split(' / ')[0]
    budget_first = budget_cat.split(' - ')[0].split(' / ')[0]
    if tx_first == budget_first:
        return True
        
    # 3. Inclusion match
    if tx_cat in budget_cat or budget_cat in tx_cat:
        return True
        
    return False

# --- Budget Endpoints ---

@app.get("/api/user/budgets")
async def get_budgets(user_id: str = Depends(get_current_user)):
    """Fetch all budgets for the user with robust current month spending."""
    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).strftime('%Y-%m-%d')
    
    # Fetch all budgets
    cursor = db.budgets.find({"user_id": user_id})
    budgets = []
    async for b in cursor:
        b["id"] = str(b["_id"])
        del b["_id"]
        budgets.append(b)
        
    # Fetch all expenses for this month for this user
    tx_cursor = db.transactions.find({
        "user_id": user_id,
        "type": "expense",
        "date": {"$gte": start_of_month}
    })
    expenses = []
    async for tx in tx_cursor:
        expenses.append(tx)
        
    # Calculate spent for each budget using fuzzy matching
    for b in budgets:
        category_spent = 0
        budget_cat = b["category"]
        for tx in expenses:
            tx_cat = tx.get("category", "General")
            if matches_category(tx_cat, budget_cat):
                category_spent += tx["amount"]
        b["spent"] = round(category_spent, 2)
        
    return budgets

@app.post("/api/user/budgets")
async def set_budget(budget: BudgetItem, user_id: str = Depends(get_current_user)):
    """Create or update a monthly budget for a category."""
    # Find existing budget for this category
    existing = await db.budgets.find_one({"user_id": user_id, "category": budget.category})
    if existing:
        await db.budgets.update_one(
            {"_id": existing["_id"]},
            {"$set": {"limit": budget.limit}}
        )
        return {"status": "success", "message": "Budget updated"}
    
    data = budget.dict()
    data["user_id"] = user_id
    result = await db.budgets.insert_one(data)
    return {"status": "success", "id": str(result.inserted_id)}

@app.delete("/api/user/budgets/{budget_id}")
async def delete_budget(budget_id: str, user_id: str = Depends(get_current_user)):
    """Delete a budget."""
    result = await db.budgets.delete_one({"_id": ObjectId(budget_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"status": "success"}

@app.get("/api/user/safe-to-spend")
async def get_safe_to_spend(user_id: str = Depends(get_current_user)):
    """Calculate how much the user can safely spend today."""
    now = datetime.now(timezone.utc)
    # Start of current month
    start_of_month_dt = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    start_of_month = start_of_month_dt.strftime('%Y-%m-%d')
    # End of month
    if now.month == 12:
        end_of_month = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_of_month = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    
    days_in_month = (end_of_month - start_of_month_dt).days
    days_left = (end_of_month - now).days
    if days_left <= 0: days_left = 1
    
    # 1. Get total budget
    budgets_cursor = db.budgets.find({"user_id": user_id})
    total_monthly_limit = 0
    async for b in budgets_cursor:
        total_monthly_limit += b["limit"]
        
    if total_monthly_limit == 0:
        return {"safe_to_spend_today": 0, "remaining_month_budget": 0, "message": "Set a budget to see safe-to-spend amount."}

    # 2. Get total expenses this month
    # We'll filter transactions by type='expense' and date within this month
    tx_cursor = db.transactions.find({
        "user_id": user_id, 
        "type": "expense",
        "date": {"$gte": start_of_month}
    })
    
    total_spent_this_month = 0
    async for tx in tx_cursor:
        total_spent_this_month += tx["amount"]
        
    remaining_budget = total_monthly_limit - total_spent_this_month
    safe_today = remaining_budget / days_left
    
    return {
        "safe_to_spend_today": max(0, round(safe_today, 2)),
        "remaining_month_budget": max(0, round(remaining_budget, 2)),
        "total_monthly_limit": total_monthly_limit,
        "spent_this_month": total_spent_this_month,
        "days_left": days_left
    }

# --- Goal Endpoints ---
@app.get("/api/user/goals")
async def get_goals(user_id: str = Depends(get_current_user)):
    """Fetch all goals for the user and calculate monthly needed amount."""
    cursor = db.goals.find({"user_id": user_id})
    goals = []
    now = datetime.now(timezone.utc)
    
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        
        # Calculate Monthly Needed
        monthly_needed = 0
        if doc.get("target_date") and doc.get("target") > doc.get("current"):
            try:
                # Parse as UTC aware
                target_date = datetime.fromisoformat(doc["target_date"].replace('Z', '+00:00'))
                if target_date.tzinfo is None:
                    target_date = target_date.replace(tzinfo=timezone.utc)
                # Calculate months remaining
                months_diff = (target_date.year - now.year) * 12 + target_date.month - now.month
                if months_diff <= 0: months_diff = 1
                
                remaining_amount = doc["target"] - doc["current"]
                monthly_needed = remaining_amount / months_diff
            except:
                pass # Fallback to 0 if date parsing fails
        
        doc["monthly_needed"] = round(monthly_needed, 2)
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
    if update.target_date is not None: update_fields["target_date"] = update.target_date
    if update.category is not None: update_fields["category"] = update.category
    if update.description is not None: update_fields["description"] = update.description

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
    """Delete all transactions and reset account balances for the user."""
    # 1. Delete all transactions
    await db.transactions.delete_many({"user_id": user_id})
    
    # 2. Reset all account balances to 0
    await db.accounts.update_many(
        {"user_id": user_id},
        {"$set": {"balance": 0.0}}
    )
    
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
    data["created_at"] = datetime.now(timezone.utc)
    if not data.get("category"):
        data["category"] = "General"
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

from google import genai

@app.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest, user_id: str = Depends(get_current_user)):
    """AI Financial Advisor using the modern Gemini SDK."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"response": "AI Advisor is not configured. Please add your GEMINI_API_KEY to the .env file."}
        
    try:
        # 1. Fetch Context
        transactions = await db.transactions.find({"user_id": user_id}).sort("date", -1).to_list(50)
        goals = await db.goals.find({"user_id": user_id}).to_list(10)
        
        # 2. Format Context
        tx_summary = "\n".join([f"- {t['date'][:10]}: {t['label']} ({t.get('category', 'General')}) [{t['type']}] ₹{t['amount']}" for t in transactions])
        gl_summary = "\n".join([f"- Goal: {g['title']}, Target: ₹{g['target']}, Current: ₹{g['current']}" for g in goals])
        
        system_prompt = f"""
        You are FinPlan AI, a helpful financial advisor tracking the user's finances. 
        Current Context:
        RECENT TRANSACTIONS:
        {tx_summary}
        
        FINANCIAL GOALS:
        {gl_summary}
        
        Use this data ONLY to answer questions about their spending, savings, and progress. 
        Be professional, encouraging, and clear. If they ask about something not in the data, tell them you don't have that information.
        Keep responses concise.
        """
        
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=f"{system_prompt}\n\nUser Question: {request.message}"
        )
        
        return {"response": response.text}
        
    except Exception as e:
        print(f"AI ERROR: {str(e)}")
        if "429" in str(e):
            return {"response": "The AI is currently busy (Quota Exceeded). Please wait a few seconds and try again. If this persists, ensure your Gemini API key has 'gemini-1.5-flash' enabled in Google AI Studio."}
        return {"response": "I'm having trouble analyzing your finance data. Please ensure your Gemini API key is valid and and try again in a moment."}

@app.post("/api/upload-statement")
async def upload(
    file: UploadFile = File(...), 
    account_id: Optional[str] = Header(None), # Can be passed as header or form
    user_id: str = Depends(get_current_user)
):
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
        
        # Enhanced column identification
        # Enhanced column identification - using prefix match for robustness (e.g. "Withdrawa")
        withdrawal_col = next((c for c in df.columns if any(k in c for k in ['withdraw', 'debit', 'dr'])), None)
        deposit_col = next((c for c in df.columns if any(k in c for k in ['deposit', 'credit', 'cr'])), None)
        amount_col = next((c for c in df.columns if any(k in c for k in ['amount', 'value'])), None)
        
        desc_col = next((c for c in df.columns if any(k in c for k in ['desc', 'narration', 'particulars', 'remark', 'memo', 'payee'])), None)
        date_col = next((c for c in df.columns if any(k in c for k in ['date', 'time', 'transaction date', 'txn date'])), None)
        type_col = next((c for c in df.columns if any(k in c for k in ['type', 'cr/dr', 'transaction type'])), None)
        # Priority on exact "category" match
        cat_col = next((c for c in df.columns if c == 'category'), None) or \
                  next((c for c in df.columns if 'category' in c or 'group' in c or 'tag' in c), None)
        
        # Identify balance column to sync Account totals
        balance_col = next((c for c in df.columns if 'balance' in c), None)
        
        if not desc_col:
            raise HTTPException(status_code=400, detail="Could not identify 'Description' column.")
            
        if not (amount_col or (withdrawal_col and deposit_col)):
            # If we don't have dual columns, make sure we at least have ONE amount-like column
            amount_col = amount_col or withdrawal_col or deposit_col
            if not amount_col:
                raise HTTPException(status_code=400, detail="Could not identify Amount columns. Found: " + ", ".join(df.columns))
            
        transactions_to_insert = []
        total_income = 0
        total_expense = 0
        latest_balance = None
        
        for index, row in df.iterrows():
            try:
                amt = 0
                t_type = 'expense'
                
                # Logic for Split Columns (Withdrawal/Deposit)
                if withdrawal_col and not pd.isna(row[withdrawal_col]) and str(row[withdrawal_col]).strip() not in ['', 'nan']:
                    raw_w = str(row[withdrawal_col]).replace(',', '').replace('$', '').replace('₹', '').strip()
                    amt = abs(float(raw_w))
                    t_type = 'expense'
                elif deposit_col and not pd.isna(row[deposit_col]) and str(row[deposit_col]).strip() not in ['', 'nan']:
                    raw_d = str(row[deposit_col]).replace(',', '').replace('$', '').replace('₹', '').strip()
                    amt = abs(float(raw_d))
                    t_type = 'income'
                # Logic for Single Column
                elif amount_col:
                    raw_amt = str(row[amount_col]).replace(',', '').replace('$', '').replace('₹', '').strip()
                    if not raw_amt or raw_amt == 'nan': continue
                    amt = float(raw_amt)
                    t_type = 'income' if amt > 0 else 'expense'
                    amt = abs(amt)
                else:
                    continue

                # Skip zero amounts
                if amt == 0: continue
                    
                # Determine type from Dr/Cr column if it exists (Overwrites sign logic)
                if type_col and not pd.isna(row[type_col]):
                    row_type = str(row[type_col]).lower()
                    if 'dr' in row_type or 'debit' in row_type or 'withdrawal' in row_type:
                        t_type = 'expense'
                    elif 'cr' in row_type or 'credit' in row_type or 'deposit' in row_type:
                        t_type = 'income'
                
                if t_type == 'income': total_income += amt
                else: total_expense += amt
                
                # Try to parse date using robust helper
                t_date = robust_parse_date(str(row[date_col])) if date_col and not pd.isna(row[date_col]) else datetime.now(timezone.utc).isoformat()
                
                # Extract category if it exists
                t_cat = "General"
                if cat_col and not pd.isna(row[cat_col]):
                    t_cat = str(row[cat_col]).strip()
                    # User's CSV has "Expense - Food & Dining" or "Income - ..."
                    # We want the actual category part
                    if " - " in t_cat:
                        # Split by " - " and take the last part, e.g. "Food & Dining"
                        t_cat = t_cat.split(" - ", 1)[-1].strip()
                    # Also handle Peer-to-Peer or splits
                    if " / " in t_cat:
                        t_cat = t_cat.split(" / ")[0].strip()

                # Track the most recent balance from the statement
                if balance_col and not pd.isna(row[balance_col]):
                    try:
                        latest_balance = float(str(row[balance_col]).replace(',', '').replace('₹', '').strip())
                    except: pass

                transactions_to_insert.append({
                    "user_id": user_id,
                    "account_id": account_id,
                    "type": t_type,
                    "amount": amt,
                    "label": str(row[desc_col])[:50], # Trim long desc
                    "category": t_cat,
                    "date": t_date,
                    "created_at": datetime.now(timezone.utc)
                })
            except Exception as e:
                # Skip unparseable rows (like headers or empty footers)
                continue
                
        if transactions_to_insert:
            await db.transactions.insert_many(transactions_to_insert)
            
            # Update Account Balance if found in statement
            if latest_balance is not None and account_id:
                try:
                    from bson import ObjectId
                    await db.accounts.update_one(
                        {"_id": ObjectId(account_id), "user_id": user_id},
                        {"$set": {"balance": latest_balance}}
                    )
                except Exception as e:
                    print(f"Failed to update account balance: {e}")
            
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
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)