from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel, Field, EmailStr
from models.resident import Resident, ResidentHistory
from models.apartment import Apartment, MinimalResidentInfo

router = APIRouter()

def title_case_name(name: str) -> str:
    """Chuẩn hóa tên: uppercase chữ đầu mỗi từ."""
    return " ".join(word.capitalize() for word in name.strip().split())

class ResidentCreate(BaseModel):
    full_name: str
    date_of_birth: datetime
    identity_card: str = Field(..., pattern="^[0-9]{12}$")
    phone_number: str = Field(..., pattern="^0[0-9]{9}$")
    email: Optional[EmailStr] = None
    temporary_residence_status: str = "registered"
    cccd_front_base64: Optional[str] = None
    cccd_back_base64: Optional[str] = None
    apartment_id: PydanticObjectId
    relationship: str = "tenant"

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
async def search_residents(name: Optional[str] = None, phone: Optional[str] = None):
    query = {}
    if name:
        query["full_name"] = {"$regex": name, "$options": "i"}
    if phone:
        query["phone_number"] = {"$regex": phone, "$options": "i"}
    return await Resident.find(query).to_list()

@router.post("/residents", response_model=Resident, status_code=201)
async def create_resident(payload: ResidentCreate):
    existing_cccd = await Resident.find_one(Resident.identity_card == payload.identity_card)
    if existing_cccd:
        raise HTTPException(status_code=400, detail="CCCD này đã tồn tại trong hệ thống!")

    apartment = await Apartment.get(payload.apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    # Kiểm tra nếu relationship = owner thì phòng đã có owner chưa
    if payload.relationship == "owner":
        has_owner = any(r.relationship == "owner" and r.status == "living" for r in apartment.current_residents)
        if has_owner:
            raise HTTPException(status_code=400, detail="Căn hộ này đã có chủ hộ! Mỗi phòng chỉ được 1 owner.")

    new_resident = Resident(
        full_name=title_case_name(payload.full_name),
        date_of_birth=payload.date_of_birth,
        identity_card=payload.identity_card,
        phone_number=payload.phone_number,
        email=payload.email,
        temporary_residence_status=payload.temporary_residence_status,
        cccd_front_base64=payload.cccd_front_base64,
        cccd_back_base64=payload.cccd_back_base64
    )
    new_resident.change_history.append(ResidentHistory(changes_summary="Tạo mới hồ sơ"))
    await new_resident.insert()

    resident_embed_info = MinimalResidentInfo(
        resident_id=new_resident.id,
        full_name=new_resident.full_name,
        relationship=payload.relationship,
        status="living",
        move_in_date=datetime.utcnow()
    )
    apartment.current_residents.append(resident_embed_info)
    await apartment.save()
    
    return new_resident

@router.patch("/residents/{resident_id}", response_model=Resident)
async def update_resident(resident_id: PydanticObjectId, payload: ResidentUpdate):
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
            resident.change_history.append(ResidentHistory(
                changed_at=now,
                changes_summary=summary
            ))
            resident.updated_at = now

            # Đồng bộ tên mới vào embedded data trong Apartment
            if "full_name" in update_data:
                all_apartments = await Apartment.find().to_list()
                for apt in all_apartments:
                    for cr in apt.current_residents:
                        if cr.resident_id == resident_id:
                            cr.full_name = update_data["full_name"]
                            await apt.save()
                            break

            await resident.save()

    return resident
