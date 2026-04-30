from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from beanie.odm.fields import PydanticObjectId
from pydantic import Field, EmailStr

class Account(Document):
    username: Indexed(str)
    password_hash: str
    role: str = "resident"  # 'admin', 'accountant', 'resident'
    status: str = "active"  # 'active', 'inactive'

    # Profile
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

    # Link to resident (for resident role)
    resident_id: Optional[PydanticObjectId] = None

    # Security
    last_login: Optional[datetime] = None
    login_attempts: int = 0
    locked_until: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "accounts"
        indexes = [
            [("role", 1)],
            [("resident_id", 1)],
        ]

    def is_locked(self) -> bool:
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def increment_login_attempts(self) -> None:
        self.login_attempts += 1
        if self.login_attempts >= 5:
            from datetime import timedelta
            self.locked_until = datetime.utcnow() + timedelta(minutes=15)
            self.login_attempts = 0

    def reset_login_attempts(self) -> None:
        self.login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.utcnow()