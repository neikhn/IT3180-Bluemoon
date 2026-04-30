from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Security
from beanie import PydanticObjectId
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from models.account import Account
from models.resident import Resident
from core.auth import create_access_token, get_current_user, require_role
import bcrypt

router = APIRouter()

# ─── Schemas ─────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    username: str
    password: str
    role: str = "resident"
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    resident_id: Optional[PydanticObjectId] = None

class AccountUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: Optional[str]
    resident_id: Optional[str]

# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """Đăng nhập — trả về JWT token."""
    account = await Account.find_one(Account.username == payload.username)
    if not account:
        raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không đúng.")

    if account.status != "active":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa.")

    if account.is_locked():
        raise HTTPException(status_code=429, detail="Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Thử lại sau 15 phút.")

    # Verify password with bcrypt
    try:
        if not bcrypt.checkpw(payload.password.encode(), account.password_hash.encode()):
            account.increment_login_attempts()
            await account.save()
            raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không đúng.")
    except ValueError:
        raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không đúng.")

    account.reset_login_attempts()
    await account.save()

    # Generate JWT
    token_data = {
        "sub": str(account.id),
        "username": account.username,
        "role": account.role,
        "resident_id": str(account.resident_id) if account.resident_id else None,
    }
    access_token = create_access_token(token_data)

    return LoginResponse(
        access_token=access_token,
        role=account.role,
        username=account.username,
        full_name=account.full_name,
        resident_id=str(account.resident_id) if account.resident_id else None,
    )

@router.post("/auth/register", response_model=Account, status_code=201)
async def register(payload: AccountCreate):
    """Tạo tài khoản mới (Admin only trong thực tế, để public cho demo)."""
    existing = await Account.find_one(Account.username == payload.username)
    if existing:
        raise HTTPException(status_code=400, detail="Tài khoản đã tồn tại.")

    if payload.role == "resident" and not payload.resident_id:
        raise HTTPException(status_code=400, detail="Tài khoản resident cần liên kết resident_id.")

    if payload.resident_id:
        resident = await Resident.get(payload.resident_id)
        if not resident:
            raise HTTPException(status_code=404, detail="Resident không tồn tại.")

    password_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()

    account = Account(
        username=payload.username,
        password_hash=password_hash,
        role=payload.role,
        full_name=payload.full_name,
        email=payload.email,
        resident_id=payload.resident_id,
    )
    await account.insert()
    return account

@router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Security(get_current_user)):
    """Lấy thông tin tài khoản hiện tại từ token."""
    account = await Account.get(PydanticObjectId(current_user["sub"]))
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    return {
        "id": str(account.id),
        "username": account.username,
        "role": account.role,
        "full_name": account.full_name,
        "email": account.email,
        "resident_id": str(account.resident_id) if account.resident_id else None,
    }

# ─── Account CRUD (Admin only) ───────────────────────────────────────────────

@router.get("/accounts", response_model=List[dict])
async def get_all_accounts(
    current_user: dict = Security(require_role("admin"))
):
    """Lấy danh sách tất cả tài khoản (Admin only)."""
    accounts = await Account.find_all().to_list()
    return [
        {
            "id": str(a.id),
            "username": a.username,
            "role": a.role,
            "full_name": a.full_name,
            "email": a.email,
            "resident_id": str(a.resident_id) if a.resident_id else None,
            "status": a.status,
            "last_login": a.last_login,
            "created_at": a.created_at,
        }
        for a in accounts
    ]

@router.patch("/accounts/{account_id}", response_model=dict)
async def update_account(
    account_id: PydanticObjectId,
    payload: AccountUpdate,
    current_user: dict = Security(require_role("admin"))
):
    """Cập nhật tài khoản (Admin only)."""
    account = await Account.get(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return {"id": str(account.id), "message": "Không có thay đổi."}

    for key, value in update_data.items():
        setattr(account, key, value)
    account.updated_at = datetime.utcnow()
    await account.save()
    return {"id": str(account.id), "message": "Cập nhật thành công."}

class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str

@router.patch("/accounts/{account_id}/password", response_model=dict)
async def change_password(
    account_id: PydanticObjectId,
    payload: ChangePasswordPayload,
    current_user: dict = Security(require_role("admin", "accountant", "resident"))
):
    """Đổi mật khẩu."""
    if current_user["role"] != "admin" and current_user["sub"] != str(account_id):
        raise HTTPException(status_code=403, detail="Bạn chỉ có thể đổi mật khẩu của mình.")

    account = await Account.get(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")

    try:
        if not bcrypt.checkpw(payload.current_password.encode(), account.password_hash.encode()):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng.")

    account.password_hash = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
    account.updated_at = datetime.utcnow()
    await account.save()
    return {"message": "Đổi mật khẩu thành công."}

@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: PydanticObjectId,
    current_user: dict = Security(require_role("admin"))
):
    """Xóa tài khoản (Admin only)."""
    account = await Account.get(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    if account.username == "admin":
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản admin.")
    await account.delete()
    return {"message": "Đã xóa tài khoản."}
