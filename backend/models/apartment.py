from datetime import datetime
from typing import List, Optional
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field

class MinimalResidentInfo(BaseModel):
    resident_id: PydanticObjectId
    full_name: str
    relationship: str
    move_in_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "living" # 'living' hoặc 'moved_out'

class ChangeHistory(BaseModel):
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    changed_by: str = "system"
    changes_summary: str

class Apartment(Document):
    apartment_number: str
    block: str
    floor: int
    area_sqm: float
    apartment_type: str = "standard" # 'standard', 'studio', 'duplex', 'penthouse'
    interior_notes: Optional[str] = None
    status: str = "available" # 'available', 'occupied', 'maintenance', 'deleted'
    
    current_residents: List[MinimalResidentInfo] = []
    change_history: List[ChangeHistory] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "apartments"
