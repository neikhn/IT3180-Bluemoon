from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, Query
from beanie import PydanticObjectId
from pydantic import BaseModel, Field, EmailStr
from models.resident import Resident, ResidentHistory
from models.apartment import Apartment, MinimalResidentInfo
from core.audit import log_action, get_actor_from_request

router = APIRouter()

def title_case_name(name: str) -> str:
    """Chuẩn hóa tên: uppercase chữ đầu mỗi từ."""
    return " ".join(word.capitalize() for word in name.strip().split())

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB limit for base64 images

def validate_base64_size(data: str, field_name: str) -> None:
    if data and len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail=f"{field_name} vượt quá kích thước cho phép (tối đa 10MB).")

class ResidentCreate(BaseModel):
    full_name: str
    date_of_birth: datetime
    identity_card: str = Field(..., pattern="^[0-9]{12}$")
    phone_number: str = Field(..., pattern="^0[0-9]{9}$")
    email: Optional[EmailStr] = None
    temporary_residence_status: str = "registered"
    cccd_front_base64: Optional[str] = None
    cccd_back_base64: Optional[str] = None
    apartment_id: Optional[PydanticObjectId] = None  # optional: không bắt buộc khi tạo accountant
    relationship: str = "tenant"
    # Tạo tài khoản đi kèm
    role: str = Field("resident", pattern="^(resident|accountant)$")  # 'resident' hoặc 'accountant'
    username: Optional[str] = Field(None, min_length=3, max_length=50)  # None = không tạo tài khoản
    password: Optional[str] = Field(None, min_length=6, max_length=128)  # None = auto-generate

class ResidentUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    identity_card: Optional[str] = Field(None, pattern="^[0-9]{12}$")
    phone_number: Optional[str] = Field(None, pattern="^0[0-9]{9}$")
    email: Optional[EmailStr] = None
    temporary_residence_status: Optional[str] = None
    cccd_front_base64: Optional[str] = None
    cccd_back_base64: Optional[str] = None

@router.get("/residents", response_model=List[Resident])
async def search_residents(
    name: Optional[str] = None,
    phone: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    query = {"status": {"$ne": "inactive"}}
    if name:
        query["full_name"] = {"$regex": name, "$options": "i"}
    if phone:
        query["phone_number"] = {"$regex": phone, "$options": "i"}
    return await Resident.find(query).skip(skip).limit(limit).to_list()

@router.post("/residents", response_model=Resident, status_code=201)
async def create_resident(payload: ResidentCreate, request: Request):
    actor = await get_actor_from_request(request)

    # ─── Validate CCCD ──────────────────────────────────────────────────────────
    if payload.cccd_front_base64:
        validate_base64_size(payload.cccd_front_base64, "Ảnh CCCD mặt trước")
    if payload.cccd_back_base64:
        validate_base64_size(payload.cccd_back_base64, "Ảnh CCCD mặt sau")
    existing_cccd = await Resident.find_one(Resident.identity_card == payload.identity_card)
    if existing_cccd:
        raise HTTPException(status_code=400, detail="CCCD này đã tồn tại trong hệ thống!")

    # ─── Validate apartment & role consistency ─────────────────────────────────
    apartment = None
    if payload.role == "resident":
        # Resident bắt buộc phải có căn hộ
        if not payload.apartment_id:
            raise HTTPException(status_code=400, detail="Cư dân phải được gắn vào căn hộ.")
        apartment = await Apartment.get(payload.apartment_id)
        if not apartment:
            raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")
        # Kiểm tra owner uniqueness
        if payload.relationship == "owner":
            has_owner = any(
                r.relationship == "owner" and r.status == "living"
                for r in apartment.current_residents
            )
            if has_owner:
                raise HTTPException(
                    status_code=400,
                    detail="Căn hộ này đã có chủ hộ! Mỗi phòng chỉ được 1 owner."
                )
    elif payload.role == "accountant":
        # Accountant không cần căn hộ
        if payload.apartment_id:
            raise HTTPException(
                status_code=400,
                detail="Kế toán không thuộc căn hộ nào. Không truyền apartment_id cho kế toán."
            )

    # ─── Validate username uniqueness (nếu được cung cấp) ───────────────────────
    if payload.username:
        from models.account import Account
        existing_user = await Account.find_one(Account.username == payload.username)
        if existing_user:
            raise HTTPException(status_code=400, detail=f"Tài khoản '{payload.username}' đã tồn tại!")

    # ─── Create Resident ─────────────────────────────────────────────────────────
    new_resident = Resident(
        full_name=title_case_name(payload.full_name),
        date_of_birth=payload.date_of_birth,
        identity_card=payload.identity_card,
        phone_number=payload.phone_number,
        email=payload.email,
        temporary_residence_status=payload.temporary_residence_status,
        cccd_front_base64=payload.cccd_front_base64,
        cccd_back_base64=payload.cccd_back_base64,
    )
    new_resident.change_history.append(ResidentHistory(
        changes_summary="Tạo mới hồ sơ",
        changed_by=actor.get("actor_username", "system")
    ))
    await new_resident.insert()

    # ─── Add to apartment (resident only) ────────────────────────────────────
    if apartment:
        resident_embed_info = MinimalResidentInfo(
            resident_id=new_resident.id,
            full_name=new_resident.full_name,
            relationship=payload.relationship,
            status="living",
            move_in_date=datetime.utcnow()
        )
        apartment.current_residents.append(resident_embed_info)
        living_count = sum(1 for cr in apartment.current_residents if cr.status == "living")
        if living_count > 0 and apartment.status == "available":
            apartment.status = "occupied"
        await apartment.save()

    # ─── Auto-create Account (nếu username được cung cấp) ─────────────────────
    created_account = None
    if payload.username:
        from models.account import Account
        import bcrypt
        import secrets
        import string

        # Generate password if not provided
        raw_password = payload.password
        if not raw_password:
            # Auto-generate: 8 random characters
            alphabet = string.ascii_letters + string.digits
            raw_password = "".join(secrets.choice(alphabet) for _ in range(8))

        password_hash = bcrypt.hashpw(raw_password.encode(), bcrypt.gensalt()).decode()

        created_account = Account(
            username=payload.username,
            password_hash=password_hash,
            role=payload.role,
            full_name=new_resident.full_name,
            email=new_resident.email,
            resident_id=new_resident.id if payload.role == "resident" else None,
        )
        await created_account.insert()

        # Link resident → account
        new_resident.account_id = created_account.id
        await new_resident.save()

    # ─── Audit log ──────────────────────────────────────────────────────────────
    account_note = f", tài khoản '{payload.username}' ({payload.role})" if payload.username else ""
    await log_action(
        action="create",
        resource_type="resident",
        resource_id=str(new_resident.id),
        description=f"Tạo cư dân [{new_resident.full_name}]{account_note}",
        actor_id=actor["actor_id"],
        actor_username=actor["actor_username"],
        actor_role=actor["actor_role"]
    )

    # ─── Trả về kèm thông tin tài khoản (nếu có) ─────────────────────────────
    result = new_resident.model_dump()
    if created_account:
        result["_generated_account"] = {
            "username": created_account.username,
            "role": created_account.role,
            "password": raw_password if not payload.password else None,
            "auto_generated_password": payload.password is None,
        }
    return result

@router.patch("/residents/{resident_id}", response_model=Resident)
async def update_resident(resident_id: PydanticObjectId, payload: ResidentUpdate, request: Request):
    resident = await Resident.get(resident_id)
    if not resident:
        raise HTTPException(status_code=404, detail="Không tìm thấy Resident")

    update_data = payload.model_dump(exclude_unset=True) 
    
    if update_data:
        if "identity_card" in update_data and update_data["identity_card"] != resident.identity_card:
            existing = await Resident.find_one(Resident.identity_card == update_data["identity_card"])
            if existing:
                raise HTTPException(status_code=400, detail="CCCD này đã thuộc về người khác!")
        
        # Title-case tên nếu có cập nhật
        if "full_name" in update_data:
            update_data["full_name"] = title_case_name(update_data["full_name"])

        # Chỉ log những trường THỰC SỰ thay đổi giá trị
        actually_changed = []
        field_labels = {
            "full_name": "Họ tên", "phone_number": "SĐT", "email": "Email",
            "temporary_residence_status": "Trạng thái cư trú", "identity_card": "CCCD",
            "date_of_birth": "Ngày sinh", "cccd_front_base64": "Ảnh CCCD mặt trước",
            "cccd_back_base64": "Ảnh CCCD mặt sau"
        }
        for key, new_value in update_data.items():
            old_value = getattr(resident, key, None)
            if old_value != new_value:
                label = field_labels.get(key, key)
                # Không log giá trị base64 dài
                if "base64" in key:
                    actually_changed.append(label)
                else:
                    actually_changed.append(f"{label}: '{old_value}' → '{new_value}'")
                setattr(resident, key, new_value)
        
        if actually_changed:
            now = datetime.utcnow()
            summary = "; ".join(actually_changed)
            actor = await get_actor_from_request(request)
            resident.change_history.append(ResidentHistory(
                changed_at=now,
                changes_summary=summary,
                changed_by=actor.get("actor_username", "system")
            ))
            resident.updated_at = now

            # Đồng bộ tên mới vào embedded data trong Apartment (bulk update)
            if "full_name" in update_data:
                new_name = update_data["full_name"]
                await Apartment.get_motor_collection().update_many(
                    {"current_residents.resident_id": resident_id},
                    {"$set": {"current_residents.$[elem].full_name": new_name}},
                    array_filters=[{"elem.resident_id": resident_id}]
                )

            await resident.save()
            actor = await get_actor_from_request(request)
            await log_action(
                action="update", 
                resource_type="resident", 
                resource_id=str(resident_id), 
                description=f"Cập nhật cư dân [{resident.full_name}]: {summary}", 
                actor_id=actor["actor_id"], 
                actor_username=actor["actor_username"], 
                actor_role=actor["actor_role"]
            )

    return resident

@router.delete("/{resident_id}", status_code=200)
async def delete_resident(resident_id: PydanticObjectId, request: Request):
    """Xóa cư dân (soft-delete)."""
    resident = await Resident.get(resident_id)
    if not resident:
        raise HTTPException(status_code=404, detail="Không tìm thấy Resident")
    
    # Check if resident is currently living in any apartment
    from models.apartment import Apartment
    apt_with_resident = await Apartment.find_one({"current_residents": {"$elemMatch": {"resident_id": resident_id, "status": "living"}}})
    if apt_with_resident:
        raise HTTPException(status_code=400, detail=f"Không thể xóa! Cư dân đang sinh sống tại căn hộ {apt_with_resident.block}-{apt_with_resident.apartment_number}. Vui lòng chuyển đi trước.")

    resident.status = "inactive"
    resident.updated_at = datetime.utcnow()
    await resident.save()

    actor = await get_actor_from_request(request)
    await log_action(
        action="delete", 
        resource_type="resident", 
        resource_id=str(resident_id), 
        description=f"Xóa (soft-delete) cư dân [{resident.full_name}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )

    return {"message": f"Đã xóa cư dân {resident.full_name} thành công (soft-delete)."}
