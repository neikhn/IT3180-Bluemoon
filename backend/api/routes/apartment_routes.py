from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Query
from models.apartment import Apartment, ChangeHistory
from models.vehicle import Vehicle
from typing import List, Optional
from pydantic import BaseModel
from beanie import PydanticObjectId
from core.audit import get_actor_from_request

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
async def get_all_apartments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    block: Optional[str] = None,
    status: Optional[str] = None,
):
    """Lấy danh sách tất cả các căn hộ — có phân trang"""
    query_parts = [Apartment.status != "deleted"]
    if block:
        query_parts.append(Apartment.block == block)
    if status:
        query_parts.append(Apartment.status == status)
    
    return await Apartment.find(*query_parts).skip(skip).limit(limit).to_list()

@router.post("/apartments", response_model=Apartment, status_code=201)
async def create_apartment(payload: ApartmentCreate, request: Request):
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

    actor = await get_actor_from_request(request)
    new_apartment = Apartment(**payload.model_dump())
    new_apartment.change_history.append(ChangeHistory(
        changes_summary="Tạo mới căn hộ",
        changed_by=actor.get("actor_username", "system")
    ))
    await new_apartment.insert()

    actor = await get_actor_from_request(request)
    from models.audit_log import log_action
    await log_action(
        action="create",
        resource_type="apartment",
        resource_id=str(new_apartment.id),
        description=f"Tạo căn hộ {payload.block}-{payload.apartment_number} (tầng {payload.floor}, {payload.area_sqm}m²)",
        **actor
    )

    return new_apartment

@router.patch("/apartments/{apartment_id}", response_model=Apartment)
async def update_apartment(apartment_id: PydanticObjectId, payload: ApartmentUpdate, request: Request):
    """Cập nhật thông tin căn hộ."""
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    update_data = payload.model_dump(exclude_unset=True)
    changes_dict = {}
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
                changes_dict[key] = {"old": old_value, "new": new_value}
                setattr(apartment, key, new_value)

        if actually_changed:
            now = datetime.utcnow()
            actor = await get_actor_from_request(request)
            apartment.change_history.append(ChangeHistory(
                changed_at=now,
                changes_summary="; ".join(actually_changed),
                changed_by=actor.get("actor_username", "system")
            ))
            apartment.updated_at = now
            await apartment.save()

            actor = await get_actor_from_request(request)
            from models.audit_log import log_action
            await log_action(
                action="update",
                resource_type="apartment",
                resource_id=str(apartment_id),
                description="; ".join(actually_changed),
                changes=changes_dict,
                **actor
            )

    return apartment

@router.delete("/apartments/{apartment_id}", status_code=200)
async def delete_apartment(apartment_id: PydanticObjectId, request: Request):
    """Xóa căn hộ - chỉ cho phép khi phòng rỗng."""
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    living_residents = [r for r in apartment.current_residents if r.status == "living"]
    if living_residents:
        raise HTTPException(
            status_code=409,
            detail=f"Không thể xóa! Phòng đang có {len(living_residents)} cư dân sinh sống. Vui lòng chuyển hết cư dân trước."
        )

    vehicle_count = await Vehicle.find(Vehicle.apartment_id == apartment_id).count()
    if vehicle_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Không thể xóa! Phòng còn {vehicle_count} xe đăng ký. Vui lòng hủy đăng ký xe trước."
        )

    apt_desc = f"{apartment.block}-{apartment.apartment_number}"
    apartment.status = "deleted"
    apartment.updated_at = datetime.utcnow()
    await apartment.save()

    actor = await get_actor_from_request(request)
    from models.audit_log import log_action
    await log_action(
        action="delete",
        resource_type="apartment",
        resource_id=str(apartment_id),
        description=f"Xóa (soft-delete) căn hộ {apt_desc}",
        **actor
    )

    return {"message": f"Đã xóa căn hộ {apt_desc} thành công (soft-delete)."}

class AddResidentPayload(BaseModel):
    resident_id: PydanticObjectId
    relationship: str = "tenant"

class RemoveResidentPayload(BaseModel):
    resident_id: PydanticObjectId

@router.patch("/apartments/{apartment_id}/add-resident", response_model=Apartment)
async def add_resident_to_apartment(apartment_id: PydanticObjectId, payload: AddResidentPayload, request: Request):
    """Thêm cư dân đã tồn tại vào danh sách của một căn hộ."""
    from models.resident import Resident
    from models.apartment import MinimalResidentInfo

    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    resident = await Resident.get(payload.resident_id)
    if not resident:
        raise HTTPException(status_code=404, detail="Cư dân không tồn tại")

    already_living = any(
        cr.resident_id == payload.resident_id and cr.status == "living"
        for cr in apartment.current_residents
    )
    if already_living:
        raise HTTPException(status_code=400, detail="Cư dân này đã đang sống trong căn hộ.")

    if payload.relationship == "owner":
        has_owner = any(
            cr.relationship == "owner" and cr.status == "living"
            for cr in apartment.current_residents
        )
        if has_owner:
            raise HTTPException(status_code=400, detail="Căn hộ này đã có chủ hộ! Mỗi phòng chỉ được 1 owner.")

    apartment.current_residents.append(MinimalResidentInfo(
        resident_id=payload.resident_id,
        full_name=resident.full_name,
        relationship=payload.relationship,
        status="living",
        move_in_date=datetime.utcnow()
    ))
    actor = await get_actor_from_request(request)
    apartment.change_history.append(ChangeHistory(
        changes_summary=f"Thêm cư dân: {resident.full_name} ({payload.relationship})",
        changed_by=actor.get("actor_username", "system")
    ))

    living_count = sum(1 for cr in apartment.current_residents if cr.status == "living")
    if living_count > 0 and apartment.status == "available":
        apartment.status = "occupied"

    apartment.updated_at = datetime.utcnow()
    await apartment.save()

    actor = await get_actor_from_request(request)
    from models.audit_log import log_action
    await log_action(
        action="update",
        resource_type="apartment",
        resource_id=str(apartment_id),
        description=f"Thêm cư dân {resident.full_name} ({payload.relationship}) vào {apartment.block}-{apartment.apartment_number}",
        changes={"added_resident": {"resident_id": str(payload.resident_id), "relationship": payload.relationship}},
        **actor
    )

    return apartment

@router.patch("/apartments/{apartment_id}/remove-resident", response_model=Apartment)
async def remove_resident_from_apartment(apartment_id: PydanticObjectId, payload: RemoveResidentPayload, request: Request):
    """Chuyển cư dân ra khỏi căn hộ (soft move_out, không xóa hồ sơ)."""
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại")

    moved_name = None
    for cr in apartment.current_residents:
        if cr.resident_id == payload.resident_id and cr.status == "living":
            cr.status = "moved_out"
            moved_name = cr.full_name
            break

    if not moved_name:
        raise HTTPException(status_code=404, detail="Cư dân không có trong danh sách của căn hộ.")

    actor = await get_actor_from_request(request)
    apartment.change_history.append(ChangeHistory(
        changes_summary=f"Cư dân chuyển đi: {moved_name}",
        changed_by=actor.get("actor_username", "system")
    ))

    living_count = sum(1 for cr in apartment.current_residents if cr.status == "living")
    if living_count == 0 and apartment.status == "occupied":
        apartment.status = "available"

    apartment.updated_at = datetime.utcnow()
    await apartment.save()

    actor = await get_actor_from_request(request)
    from models.audit_log import log_action
    await log_action(
        action="update",
        resource_type="apartment",
        resource_id=str(apartment_id),
        description=f"Chuyển cư dân {moved_name} ra khỏi {apartment.block}-{apartment.apartment_number}",
        changes={"removed_resident": {"resident_id": str(payload.resident_id), "name": moved_name}},
        **actor
    )

    return apartment
