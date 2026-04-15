from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.vehicle import Vehicle, ChangeHistory
from typing import List, Optional
from pydantic import BaseModel, Field
from beanie import PydanticObjectId

router = APIRouter()

class VehicleCreate(BaseModel):
    apartment_id: PydanticObjectId
    resident_id: PydanticObjectId
    license_plate: str = Field(..., pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$")
    vehicle_type: str = "motorbike" # 'motorbike', 'car'
    vehicle_name: str = "" # "Honda Wave RSX 2020"

class VehicleUpdate(BaseModel):
    license_plate: Optional[str] = Field(None, pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$")
    vehicle_type: Optional[str] = None
    vehicle_name: Optional[str] = None
    status: Optional[str] = None

@router.get("/vehicles", response_model=List[Vehicle])
async def get_all_vehicles():
    return await Vehicle.find_all().to_list()

@router.post("/vehicles", response_model=Vehicle, status_code=201)
async def register_vehicle(payload: VehicleCreate):
    """US-7: Đăng ký xe. Max 2 ô tô / căn hộ."""
    sanitized_plate = payload.license_plate.upper().replace(" ", "")
    
    existing_vehicle = await Vehicle.find_one({"license_plate": sanitized_plate})
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
    new_vehicle.change_history.append(ChangeHistory(changes_summary="Đăng ký xe mới"))
    await new_vehicle.insert()
    return new_vehicle

@router.patch("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: PydanticObjectId, payload: VehicleUpdate):
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
                existing = await Vehicle.find_one({"license_plate": update_data["license_plate"]})
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
            vehicle.change_history.append(ChangeHistory(
                changed_at=now,
                changes_summary="; ".join(actually_changed)
            ))
            vehicle.updated_at = now
            await vehicle.save()

    return vehicle

@router.delete("/vehicles/{vehicle_id}", status_code=200)
async def delete_vehicle(vehicle_id: PydanticObjectId):
    """Xóa xe."""
    vehicle = await Vehicle.get(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Xe không tồn tại")
    await vehicle.delete()
    return {"message": f"Đã xóa xe {vehicle.license_plate} thành công."}
