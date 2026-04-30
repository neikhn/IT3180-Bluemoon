from datetime import datetime, timedelta
from typing import Optional
from models.audit_log import AuditLog

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


async def get_actor_from_request(request) -> dict:
    """Extract actor info from request (from JWT or request context)."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            from jose import jwt
            from core.auth import get_settings
            settings = get_settings()
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return {
                "actor_id": payload.get("sub"),
                "actor_username": payload.get("username"),
                "actor_role": payload.get("role"),
            }
        except Exception:
            pass
    return {
        "actor_id": None,
        "actor_username": "anonymous",
        "actor_role": None,
    }