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
    # Regex Biển số VN — covers all current formats:
    # - Old car: 30A-123.45, 59T1-999.99 (3-4 digits, optional .xx)
    # - New motorbike: 2A-12345 (5 digits, no dot)
    # - Simple: 51H-123 (3 digits, no dot)
    license_plate: str = Field(..., pattern=r"^[0-9]{2}[A-Z][A-Z0-9]?(-|\.?)[0-9]{3,5}(\.[0-9]{2})?$")
    vehicle_type: str = "motorbike" # 'motorbike', 'car'
    vehicle_name: str = "" # Format: "Honda Wave RSX 2020"
    status: str = "active"
    
    change_history: List[ChangeHistory] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vehicles"
