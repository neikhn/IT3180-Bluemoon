from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, Query
from beanie import PydanticObjectId
from pydantic import BaseModel
from models.notification import Notification, ChangeHistory
from models.apartment import Apartment
from core.audit import log_action, get_actor_from_request

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    content: str
    scope_type: str = "all" # 'all', 'block', 'floor', 'apartment'
    target_value: Optional[str] = None

@router.post("/notifications", response_model=Notification, status_code=201)
async def create_notification(payload: NotificationCreate, request: Request):
    """US-14: Admin thông báo diện rộng."""
    if payload.scope_type != "all" and not payload.target_value:
        raise HTTPException(status_code=400, detail="Phải cung cấp target_value nếu scope_type không phải 'all'")

    # Validate target_value based on scope_type
    if payload.scope_type == "apartment":
        if not PydanticObjectId.is_valid(payload.target_value):
            raise HTTPException(status_code=400, detail="target_value phải là ID hợp lệ cho scope 'apartment'")

    actor = await get_actor_from_request(request)
    new_notif = Notification(
        title=payload.title,
        content=payload.content,
        scope_type=payload.scope_type,
        target_value=payload.target_value,
        created_by=PydanticObjectId(actor["actor_id"]) if actor.get("actor_id") else None
    )
    new_notif.change_history.append(ChangeHistory(changes_summary="Tạo thông báo mới"))
    await new_notif.insert()
    await log_action(
        action="create", 
        resource_type="notification", 
        resource_id=str(new_notif.id), 
        description=f"Tạo thông báo [{payload.scope_type}] {payload.title}", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return new_notif

@router.get("/notifications", response_model=List[Notification])
async def get_all_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    scope_type: Optional[str] = None,
):
    """Lấy danh sách tất cả thông báo (Dành cho Admin xem lịch sử) — có phân trang"""
    query = {}
    if scope_type:
        query["scope_type"] = scope_type
    if query:
        return await Notification.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    return await Notification.find_all().sort("-created_at").skip(skip).limit(limit).to_list()

@router.get("/notifications/my-feed", response_model=List[Notification])
async def get_my_notifications(apartment_id: PydanticObjectId):
    """
    US-14: Logic thông minh truy vấn thông báo dựa theo thông tin căn hộ
    """
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Không tìm thấy căn hộ")
        
    # Xây dựng Query Condition lọc Scope
    or_conditions = [
        {"scope_type": "all"},
        {"scope_type": "block", "target_value": apartment.block},
        {"scope_type": "floor", "target_value": str(apartment.floor)},
        {"scope_type": "apartment", "target_value": str(apartment.id)}
    ]
    
    # Tìm kiếm với or và sắp xếp mới nhất
    notifs = await Notification.find({"$or": or_conditions}).sort("-created_at").to_list()
    return notifs

@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: PydanticObjectId, resident_id: PydanticObjectId):
    """Đánh dấu Cư dân đã đọc thông báo (tính lượt read)."""
    notif = await Notification.get(notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại")
        
    if resident_id not in notif.read_by:
        notif.read_by.append(resident_id)
        await notif.save()
        
    return {"message": "Success", "read_count": len(notif.read_by)}

@router.delete("/notifications/{notif_id}", status_code=200)
async def delete_notification(notif_id: PydanticObjectId, request: Request):
    """Xóa thông báo."""
    notif = await Notification.get(notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Thông báo không tồn tại")
    actor = await get_actor_from_request(request)
    await log_action(
        action="delete", 
        resource_type="notification", 
        resource_id=str(notif_id), 
        description=f"Xóa thông báo [{notif.title}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    await notif.delete()
    return {"message": "Đã xóa thông báo thành công."}

