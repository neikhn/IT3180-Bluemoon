from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.apartment import Apartment, ChangeHistory
from models.vehicle import Vehicle
from typing import List, Optional
from pydantic import BaseModel
from beanie import PydanticObjectId

router = APIRouter()

class ApartmentCreate(BaseModel):
    apartment_number: str
    block: str
    floor: int
    area_sqm: float
    apartment_type: str = "standard"
    interior_notes: Optional[str] = None
    status: str = "available"

class ApartmentUpdate(BaseModel):
    area_sqm: Optional[float] = None
    apartment_type: Optional[str] = None
    interior_notes: Optional[str] = None
    status: Optional[str] = None

@router.get("/apartments", response_model=List[Apartment])
async def get_all_apartments():
    """Lấy danh sách tất cả các căn hộ"""
    return await Apartment.find_all().to_list()

@router.post("/apartments", response_model=Apartment, status_code=201)
async def create_apartment(payload: ApartmentCreate):
    """US-1: Tạo mới căn hộ và không cho phép trùng số phòng trong cùng 1 tầng."""
    existing = await Apartment.find_one(
        Apartment.floor == payload.floor,
        Apartment.apartment_number == payload.apartment_number,
        Apartment.block == payload.block
    )
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Căn hộ {payload.apartment_number} tại tầng {payload.floor} block {payload.block} đã tồn tại!"
        )

    new_apartment = Apartment(**payload.model_dump())
    new_apartment.change_history.append(ChangeHistory(changes_summary="Tạo mới căn hộ"))
    await new_apartment.insert()
    return new_apartment

@router.patch("/apartments/{apartment_id}", response_model=Apartment)
async def update_apartment(apartment_id: PydanticObjectId, payload: ApartmentUpdate):
    """Cập nhật thông tin căn hộ."""
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        field_labels = {
            "area_sqm": "Diện tích", "apartment_type": "Loại căn hộ",
            "interior_notes": "Ghi chú nội thất", "status": "Trạng thái"
        }
        actually_changed = []
        for key, new_value in update_data.items():
            old_value = getattr(apartment, key, None)
            if old_value != new_value:
                label = field_labels.get(key, key)
                actually_changed.append(f"{label}: '{old_value}' → '{new_value}'")
                setattr(apartment, key, new_value)

        if actually_changed:
            now = datetime.utcnow()
            apartment.change_history.append(ChangeHistory(
                changed_at=now,
                changes_summary="; ".join(actually_changed)
            ))
            apartment.updated_at = now
            await apartment.save()

    return apartment

@router.delete("/apartments/{apartment_id}", status_code=200)
async def delete_apartment(apartment_id: PydanticObjectId):
    """Xóa căn hộ - chỉ cho phép khi phòng rỗng."""
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    # Kiểm tra còn cư dân living
    living_residents = [r for r in apartment.current_residents if r.status == "living"]
    if living_residents:
        raise HTTPException(
            status_code=409,
            detail=f"Không thể xóa! Phòng đang có {len(living_residents)} cư dân sinh sống. Vui lòng chuyển hết cư dân trước."
        )

    # Kiểm tra còn xe đăng ký
    vehicle_count = await Vehicle.find(Vehicle.apartment_id == apartment_id).count()
    if vehicle_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Không thể xóa! Phòng còn {vehicle_count} xe đăng ký. Vui lòng hủy đăng ký xe trước."
        )

    await apartment.delete()
    return {"message": f"Đã xóa căn hộ {apartment.apartment_number} thành công."}
