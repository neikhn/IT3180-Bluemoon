from fastapi import APIRouter, HTTPException
from models.vehicle import Vehicle
from typing import List
from pydantic import BaseModel, Field
from beanie import PydanticObjectId

router = APIRouter()

class VehicleCreate(BaseModel):
    apartment_id: PydanticObjectId
    resident_id: PydanticObjectId
    license_plate: str = Field(..., pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$")
    vehicle_type: str = "motorbike" # 'motorbike', 'car'

@router.get("/vehicles", response_model=List[Vehicle])
async def get_all_vehicles():
    return await Vehicle.find_all().to_list()

@router.post("/vehicles", response_model=Vehicle, status_code=201)
async def register_vehicle(payload: VehicleCreate):
    """US-7: Đăng ký xe. Max 2 ô tô / căn hộ."""
    # Sanitize biển số
    sanitized_plate = payload.license_plate.upper().replace(" ", "")
    
    existing_vehicle = await Vehicle.find_one({"license_plate": sanitized_plate})
    if existing_vehicle:
        raise HTTPException(status_code=400, detail="Biển số xe này đã được đăng ký!")

    if payload.vehicle_type == "car":
        car_count = await Vehicle.find(
            Vehicle.apartment_id == payload.apartment_id,
            Vehicle.vehicle_type == "car"
        ).count()
        if car_count >= 2:
            raise HTTPException(status_code=400, detail="Chỉ được phép đăng ký tối đa 2 ô tô cho mỗi căn hộ.")
            
    new_vehicle = Vehicle(
        apartment_id=payload.apartment_id,
        resident_id=payload.resident_id,
        license_plate=sanitized_plate,
        vehicle_type=payload.vehicle_type
    )
    await new_vehicle.insert()
    return new_vehicle
