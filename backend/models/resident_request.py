from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field

class ResidentChangeRequest(Document):
    apartment_id: PydanticObjectId
    requester_resident_id: PydanticObjectId # ID của cư dân gửi yêu cầu
    
    request_type: str # 'add' (thêm), 'update' (sửa), 'delete' (xóa/rời đi)
    target_resident_id: Optional[PydanticObjectId] = None # Dùng cho 'update' và 'delete'
    
    # Chứa dữ liệu thay đổi (ví dụ: full_name, phone_number, identity_card...)
    proposed_data: Optional[Dict[str, Any]] = None
    
    status: str = "pending" # 'pending', 'approved', 'rejected'
    admin_note: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # resolved fields (not stored in DB, populated on retrieval)
    apartment_number: Optional[str] = None
    target_resident_name: Optional[str] = None
    target_resident_phone: Optional[str] = None

    class Settings:
        name = "resident_change_requests"
