from datetime import datetime
from typing import List, Optional
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field

class ChangeHistory(BaseModel):
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    changed_by: str = "system"
    changes_summary: str

class Vehicle(Document):
    apartment_id: PydanticObjectId
    resident_id: PydanticObjectId 
    # Regex Biển số VN (VD: 30A-123.45) 
    license_plate: str = Field(..., pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?-[0-9]{3,4}\.?[0-9]{2}$")
    vehicle_type: str = "motorbike" # 'motorbike', 'car'
    vehicle_name: str = "" # Format: "Honda Wave RSX 2020"
    status: str = "active"
    
    change_history: List[ChangeHistory] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vehicles"
