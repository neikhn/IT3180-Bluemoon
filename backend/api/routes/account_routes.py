from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Security
from beanie import PydanticObjectId
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from models.account import Account
from models.resident import Resident
from core.auth import create_access_token, get_current_user, require_role
import bcrypt
import secrets
import string

router = APIRouter()

# ─── Helpers ─────────────────────────────────────────────────────────────────

def generate_password(length: int = 12) -> str:
    """Sinh mật khẩu ngẫu nhiên an toàn."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    # Đảm bảo có ít nhất 1 ký tự mỗi loại
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%"),
    ]
    pwd += [secrets.choice(alphabet) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)

# ─── Schemas ─────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    username: str
    password: Optional[str] = None  # Nếu None, server sẽ tự sinh
    role: str = "resident"
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    resident_id: Optional[PydanticObjectId] = None

class AccountCreateResponse(BaseModel):
    id: str
    username: str
    role: str
    full_name: Optional[str]
    email: Optional[str]
    resident_id: Optional[str]
    status: str
    generated_password: Optional[str]  # Trả về mật khẩu nếu được tự sinh

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
    role: Optional[str] = None,
    current_user: dict = Security(require_role("admin"))
):
    """Lấy danh sách tất cả tài khoản, lọc theo role (Admin only)."""
    query = {}
    if role:
        query["role"] = role
    accounts = await Account.find(query).to_list()
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

@router.post("/accounts", response_model=AccountCreateResponse, status_code=201)
async def create_account(
    payload: AccountCreate,
    current_user: dict = Security(require_role("admin"))
):
    """Tạo tài khoản mới (Admin only). Nếu không có password, tự sinh ngẫu nhiên."""
    existing = await Account.find_one(Account.username == payload.username)
    if existing:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại.")

    if payload.role not in ["admin", "accountant", "resident"]:
        raise HTTPException(status_code=400, detail="Role không hợp lệ. Chọn: admin, accountant, resident.")

    if payload.role == "resident" and not payload.resident_id:
        raise HTTPException(status_code=400, detail="Tài khoản resident cần liên kết resident_id.")

    if payload.resident_id:
        resident = await Resident.get(payload.resident_id)
        if not resident:
            raise HTTPException(status_code=404, detail="Cư dân không tồn tại.")
        # Kiểm tra resident đã có tài khoản chưa
        existing_res_acc = await Account.find_one(
            Account.resident_id == payload.resident_id,
            Account.status == "active"
        )
        if existing_res_acc:
            raise HTTPException(status_code=400, detail=f"Cư dân này đã có tài khoản '{existing_res_acc.username}'.")

    # Sinh mật khẩu nếu không được cung cấp
    generated_password = None
    raw_password = payload.password
    if not raw_password:
        raw_password = generate_password()
        generated_password = raw_password

    password_hash = bcrypt.hashpw(raw_password.encode(), bcrypt.gensalt()).decode()

    account = Account(
        username=payload.username,
        password_hash=password_hash,
        role=payload.role,
        full_name=payload.full_name or (resident.full_name if payload.resident_id else None),
        email=payload.email,
        resident_id=payload.resident_id,
    )
    await account.insert()

    return AccountCreateResponse(
        id=str(account.id),
        username=account.username,
        role=account.role,
        full_name=account.full_name,
        email=str(account.email) if account.email else None,
        resident_id=str(account.resident_id) if account.resident_id else None,
        status=account.status,
        generated_password=generated_password,
    )

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

class ResetPasswordResponse(BaseModel):
    message: str
    new_password: str

@router.post("/accounts/{account_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    account_id: PydanticObjectId,
    current_user: dict = Security(require_role("admin"))
):
    """Reset mật khẩu tài khoản — sinh mật khẩu mới ngẫu nhiên (Admin only)."""
    account = await Account.get(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")

    new_password = generate_password()
    account.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    account.login_attempts = 0
    account.locked_until = None
    account.updated_at = datetime.utcnow()
    await account.save()

    return ResetPasswordResponse(
        message=f"Đã reset mật khẩu cho tài khoản '{account.username}'.",
        new_password=new_password,
    )

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
    """Vô hiệu hóa tài khoản — soft-delete (Admin only)."""
    account = await Account.get(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    if account.username == "admin":
        raise HTTPException(status_code=400, detail="Không thể xóa tài khoản admin chính.")
    if current_user["sub"] == str(account_id):
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của mình.")

    account.status = "inactive"
    account.updated_at = datetime.utcnow()
    await account.save()
    return {"message": f"Đã vô hiệu hóa tài khoản '{account.username}'."}

@router.post("/accounts/{account_id}/restore")
async def restore_account(
    account_id: PydanticObjectId,
    current_user: dict = Security(require_role("admin"))
):
    """Khôi phục tài khoản bị vô hiệu hóa (Admin only)."""
    account = await Account.get(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Tài khoản không tồn tại.")
    if account.status == "active":
        raise HTTPException(status_code=400, detail="Tài khoản đã đang hoạt động.")

    account.status = "active"
    account.updated_at = datetime.utcnow()
    await account.save()
    return {"message": f"Đã khôi phục tài khoản '{account.username}'."}

@router.post("/accounts/generate-password", response_model=dict)
async def api_generate_password(
    current_user: dict = Security(require_role("admin"))
):
    """Sinh mật khẩu ngẫu nhiên (Admin only)."""
    return {"password": generate_password()}
