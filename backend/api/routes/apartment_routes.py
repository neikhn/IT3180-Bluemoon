from fastapi import APIRouter, HTTPException
from models.apartment import Apartment
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class ApartmentCreate(BaseModel):
    apartment_number: str
    block: str
    floor: int
    area_sqm: float
    apartment_type: str = "standard"
    interior_notes: Optional[str] = None
    status: str = "available"

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
    await new_apartment.insert()
    return new_apartment
