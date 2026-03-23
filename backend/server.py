from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RinaWarp Terminal Pro API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class RestoreLicenseRequest(BaseModel):
    email: EmailStr

class CheckoutRequest(BaseModel):
    email: EmailStr
    plan: str

class User(BaseModel):
    id: str
    email: str
    name: str | None = None
    plan: str = "free"
    license_key: str | None = None

# Routes
@app.get("/")
async def root():
    return {
        "service": "RinaWarp Terminal Pro API",
        "version": "0.1.0",
        "status": "operational"
    }

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "rinawarp-api"}

@app.post("/api/account/restore")
async def restore_license(request: RestoreLicenseRequest):
    """
    Restore license by email.
    In production, this would:
    1. Look up user by email
    2. Send license key via email
    3. Return success
    """
    # Placeholder implementation
    print(f"License restoration requested for: {request.email}")
    
    # In production: Send email with license key
    # For now, just return success
    return {
        "success": True,
        "message": "If an account exists with this email, you will receive your license key shortly."
    }

@app.get("/api/account/me")
async def get_account(authorization: str = Header(None)):
    """
    Get current user account info.
    In production, this would validate the JWT token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Placeholder: Return mock user
    return User(
        id="user_123",
        email="demo@rinawarp.com",
        name="Demo User",
        plan="pro",
        license_key="RNWP-XXXX-XXXX-XXXX"
    )

@app.post("/api/billing/checkout")
async def create_checkout(request: CheckoutRequest):
    """
    Create Stripe checkout session.
    In production, this would:
    1. Create Stripe checkout session
    2. Return session URL
    """
    # Placeholder implementation
    return {
        "session_id": "cs_test_...",
        "url": "https://checkout.stripe.com/pay/cs_test_..."
    }

@app.get("/api/downloads/latest")
async def get_latest_version():
    """
    Get latest app version info.
    """
    return {
        "version": "0.1.0",
        "release_date": "2026-01-15",
        "notes": "Initial release - Proof-first agent workbench with receipt verification",
        "downloads": {
            "mac": "/api/downloads/mac/0.1.0",
            "windows": "/api/downloads/windows/0.1.0",
            "linux": "/api/downloads/linux/0.1.0"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
