from datetime import datetime
from typing import Optional
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import Field

class Vehicle(Document):
    apartment_id: PydanticObjectId
    resident_id: PydanticObjectId 
    # Regex Biển số VN (VD: 30A-123.45) 
    license_plate: str = Field(..., pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$")
    vehicle_type: str = "motorbike" # 'motorbike', 'car'
    status: str = "active"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vehicles"
