from datetime import datetime
from typing import List, Optional
from beanie import Document
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field

class TicketResponse(BaseModel):
    sender_role: str # 'admin', 'resident'
    sender_id: PydanticObjectId
    message: str
    image_base64: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Ticket(Document):
    ticket_code: str # Mã sinh ngẫu nhiên
    category: str # 'technical', 'hygiene', 'security', 'noise', 'other'
    title: str
    description: str
    images_base64: List[str] = [] # max 3 hình (theo user story)
    
    status: str = "open" # 'open', 'processing', 'closed'
    
    resident_id: PydanticObjectId
    apartment_id: PydanticObjectId
    
    responses: List[TicketResponse] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tickets"
