from datetime import datetime
from typing import List, Optional, Any
from beanie import Document, Indexed
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field

class AuditLog(Document):
    action: Indexed(str)  # 'create', 'update', 'delete'
    resource_type: Indexed(str)  # 'apartment', 'resident', 'vehicle', 'ticket', 'notification', 'invoice', 'fee_rate', 'meter_reading'
    resource_id: Optional[str] = None

    # Who performed the action
    actor_id: Optional[str] = None  # account._id
    actor_username: Optional[str] = None
    actor_role: Optional[str] = None

    # What changed
    description: str  # human-readable summary
    changes: Optional[dict] = None  # {field: {old: ..., new: ...}}

    # Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_logs"
        indexes = [
            [("resource_type", 1), ("created_at", -1)],
            [("actor_id", 1), ("created_at", -1)],
            [("action", 1), ("created_at", -1)],
            [("created_at", -1)],
        ]

# Singleton-style helper to log actions
async def log_action(
    action: str,
    resource_type: str,
    description: str,
    actor_id: Optional[str] = None,
    actor_username: Optional[str] = None,
    actor_role: Optional[str] = None,
    resource_id: Optional[str] = None,
    changes: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Create an audit log entry."""
    log = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=actor_id,
        actor_username=actor_username,
        actor_role=actor_role,
        description=description,
        changes=changes,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await log.insert()
