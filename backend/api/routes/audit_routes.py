from datetime import datetime
from fastapi import APIRouter, Security, Query
from beanie import PydanticObjectId
from typing import List, Optional
from models.audit_log import AuditLog
from core.auth import get_current_user, require_role

router = APIRouter()

@router.get("/audit-logs", response_model=List[dict])
async def get_audit_logs(
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Security(require_role("admin")),
):
    """
    Lấy danh sách audit log — Admin only.
    Hỗ trợ lọc theo resource_type, action, actor, date range.
    """
    query_parts = []

    if resource_type:
        query_parts.append(AuditLog.resource_type == resource_type)
    if action:
        query_parts.append(AuditLog.action == action)
    if actor_id:
        query_parts.append(AuditLog.actor_id == actor_id)
    if from_date:
        query_parts.append(AuditLog.created_at >= from_date)
    if to_date:
        query_parts.append(AuditLog.created_at <= to_date)

    if query_parts:
        logs = await AuditLog.find(*query_parts).sort(-AuditLog.created_at).skip(skip).limit(limit).to_list()
    else:
        logs = await AuditLog.find_all().sort(-AuditLog.created_at).skip(skip).limit(limit).to_list()

    total = await AuditLog.find_all().count()
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "actor_id": log.actor_id,
            "actor_username": log.actor_username,
            "actor_role": log.actor_role,
            "description": log.description,
            "changes": log.changes,
            "created_at": log.created_at,
        }
        for log in logs
    ]

@router.get("/audit-logs/summary", response_model=dict)
async def get_audit_summary(
    current_user: dict = Security(require_role("admin")),
):
    """Thống kê tổng quan hoạt động hệ thống — Admin only."""
    now = datetime.utcnow()

    # Count by action type (last 30 days)
    from datetime import timedelta
    thirty_days_ago = now - timedelta(days=30)

    all_logs = await AuditLog.find(AuditLog.created_at >= thirty_days_ago).to_list()

    by_action = {}
    by_resource = {}
    for log in all_logs:
        by_action[log.action] = by_action.get(log.action, 0) + 1
        by_resource[log.resource_type] = by_resource.get(log.resource_type, 0) + 1

    return {
        "total_30d": len(all_logs),
        "by_action": by_action,
        "by_resource": by_resource,
        "period_days": 30,
    }
