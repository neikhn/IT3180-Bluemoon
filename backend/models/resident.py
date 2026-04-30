from datetime import datetime
from typing import Optional, List
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field, EmailStr

from enum import Enum

class ResidentStatus(str, Enum):
    REGISTERED = "registered"
    TEMPORARY_ABSENT = "temporary_absent"
    EXPIRED = "expired"

class ResidentHistory(BaseModel):
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    changed_by: str = "system"
    changes_summary: str

class Resident(Document):
    account_id: Optional[PydanticObjectId] = None 
    
    full_name: str
    date_of_birth: datetime
    # Regex 12 số
    identity_card: str = Field(..., pattern="^[0-9]{12}$")
    # Regex 10 số, bắt đầu bằng 0
    phone_number: str = Field(..., pattern="^0[0-9]{9}$")
    email: Optional[EmailStr] = None
    temporary_residence_status: ResidentStatus = ResidentStatus.REGISTERED
    status: str = "active" # 'active', 'inactive'
    
    # GridFS là phướng án tối ưu cho file > 16MB. 
    # Voi ảnh nén < 5MB (Acceptance Criteria), lưu base64 là giải pháp dễ triển khai.
    cccd_front_base64: Optional[str] = None
    cccd_back_base64: Optional[str] = None
    
    change_history: List[ResidentHistory] = []

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "residents"
