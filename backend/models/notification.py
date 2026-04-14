from datetime import datetime
from typing import List, Optional
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import Field

class Notification(Document):
    title: str
    content: str # Hỗ trợ Rich Text HTML/Markdown
    
    # Phạm vi điều hướng: 'all', 'block', 'floor', 'apartment'
    scope_type: str = "all"
    
    # Giá trị đi kèm với scope_type (VD scope_type = 'block' thì đây là C)
    target_value: Optional[str] = None 
    
    # Quản lý những người đã đọc (Thống kê)
    read_by: List[PydanticObjectId] = []
    
    created_by: PydanticObjectId # Admin ID tạo
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"
