from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Query
from models.vehicle import Vehicle, ChangeHistory
from core.audit import log_action, get_actor_from_request
from typing import List, Optional
from pydantic import BaseModel, Field
from beanie import PydanticObjectId

router = APIRouter()

class VehicleCreate(BaseModel):
    apartment_id: PydanticObjectId
    resident_id: PydanticObjectId
    license_plate: str = Field(..., pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?(-|.?)[0-9]{3,5}$")
    vehicle_type: str = "motorbike" # 'motorbike', 'car'
    vehicle_name: str = "" # "Honda Wave RSX 2020"

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = Field(None, pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?(-|\.?)[0-9]{3,5}(\.[0-9]{2})?$")
    vehicle_type: Optional[str] = None
    vehicle_name: Optional[str] = None
    status: Optional[str] = None

@router.get("/vehicles", response_model=List[Vehicle])
async def get_all_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    apartment_id: Optional[PydanticObjectId] = None,
    vehicle_type: Optional[str] = None,
):
    """Lấy danh sách phương tiện — có phân trang"""
    query_parts = [Vehicle.status != "inactive"]
    if apartment_id:
        query_parts.append(Vehicle.apartment_id == apartment_id)
    if vehicle_type:
        query_parts.append(Vehicle.vehicle_type == vehicle_type)
    if query_parts:
        return await Vehicle.find(*query_parts).skip(skip).limit(limit).to_list()
    return await Vehicle.find_all().skip(skip).limit(limit).to_list()

@router.post("/vehicles", response_model=Vehicle, status_code=201)
async def register_vehicle(payload: VehicleCreate, request: Request):
    """US-7: Đăng ký xe. Max 2 ô tô / căn hộ."""
    actor = await get_actor_from_request(request)
    sanitized_plate = payload.license_plate.upper().replace(" ", "")
    
    existing_vehicle = await Vehicle.find_one(Vehicle.license_plate == sanitized_plate, Vehicle.status != "inactive")
    if existing_vehicle:
        raise HTTPException(status_code=400, detail="Biển số xe này đã được đăng ký!")

    if payload.vehicle_type == "car":
        car_count = await Vehicle.find(
            Vehicle.apartment_id == payload.apartment_id,
            Vehicle.vehicle_type == "car",
            Vehicle.status != "inactive"
        ).count()
        if car_count >= 1:
            raise HTTPException(status_code=400, detail="Chỉ được phép đăng ký tối đa 1 ô tô cho mỗi căn hộ.")
    elif payload.vehicle_type == "motorbike":
        moto_count = await Vehicle.find(
            Vehicle.apartment_id == payload.apartment_id,
            Vehicle.vehicle_type == "motorbike",
            Vehicle.status != "inactive"
        ).count()
        if moto_count >= 2:
            raise HTTPException(status_code=400, detail="Chỉ được phép đăng ký tối đa 2 xe máy cho mỗi căn hộ.")
    new_vehicle = Vehicle(
        apartment_id=payload.apartment_id,
        resident_id=payload.resident_id,
        license_plate=sanitized_plate,
        vehicle_type=payload.vehicle_type,
        vehicle_name=payload.vehicle_name
    )
    new_vehicle.change_history.append(ChangeHistory(
        changes_summary="Đăng ký xe mới",
        changed_by=actor.get("actor_username", "system")
    ))
    await new_vehicle.insert()
    await log_action(
        action="register", 
        resource_type="vehicle", 
        resource_id=str(new_vehicle.id), 
        description=f"Đăng ký xe [{sanitized_plate}] {payload.vehicle_type}", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return new_vehicle

@router.patch("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: PydanticObjectId, payload: VehicleUpdate, request: Request):
    """Cập nhật thông tin xe."""
    vehicle = await Vehicle.get(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Xe không tồn tại")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        # Kiểm tra biển số trùng
        if "license_plate" in update_data:
            update_data["license_plate"] = update_data["license_plate"].upper().replace(" ", "")
            if update_data["license_plate"] != vehicle.license_plate:
                existing = await Vehicle.find_one(Vehicle.license_plate == update_data["license_plate"], Vehicle.status != "inactive")
                if existing:
                    raise HTTPException(status_code=400, detail="Biển số này đã thuộc về xe khác!")

        field_labels = {
            "license_plate": "Biển số", "vehicle_type": "Loại xe",
            "vehicle_name": "Tên xe", "status": "Trạng thái"
        }
        actually_changed = []
        for key, new_value in update_data.items():
            old_value = getattr(vehicle, key, None)
            if old_value != new_value:
                label = field_labels.get(key, key)
                actually_changed.append(f"{label}: '{old_value}' → '{new_value}'")
                setattr(vehicle, key, new_value)

        if actually_changed:
            now = datetime.utcnow()
            actor = await get_actor_from_request(request)
            vehicle.change_history.append(ChangeHistory(
                changed_at=now,
                changes_summary="; ".join(actually_changed),
                changed_by=actor.get("actor_username", "system")
            ))
            vehicle.updated_at = now
            await vehicle.save()
            actor = await get_actor_from_request(request)
            await log_action(
                action="update", 
                resource_type="vehicle", 
                resource_id=str(vehicle_id), 
                description=f"Cập nhật xe [{vehicle.license_plate}]", 
                actor_id=actor["actor_id"], 
                actor_username=actor["actor_username"], 
                actor_role=actor["actor_role"]
            )

    return vehicle

@router.delete("/vehicles/{vehicle_id}", status_code=200)
async def delete_vehicle(vehicle_id: PydanticObjectId, request: Request):
    """Xóa xe."""
    vehicle = await Vehicle.get(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Xe không tồn tại")
    actor = await get_actor_from_request(request)
    await log_action(
        action="delete", 
        resource_type="vehicle", 
        resource_id=str(vehicle_id), 
        description=f"Xóa xe [{vehicle.license_plate}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    await vehicle.delete()
    return {"message": f"Đã xóa xe {vehicle.license_plate} thành công."}
