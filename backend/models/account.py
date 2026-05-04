from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field

class Account(Document):
    username: str
    password_hash: str
    role: str = "resident" 
    status: str = "active" 
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "accounts"
