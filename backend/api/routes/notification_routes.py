from typing import List, Optional
from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel
from models.notification import Notification
from models.apartment import Apartment

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    content: str
    scope_type: str = "all" # 'all', 'block', 'floor', 'apartment'
    target_value: Optional[str] = None
    created_by: PydanticObjectId

@router.post("/notifications", response_model=Notification, status_code=201)
async def create_notification(payload: NotificationCreate):
    """US-14: Admin thông báo diện rộng."""
    if payload.scope_type != "all" and not payload.target_value:
        raise HTTPException(status_code=400, detail="Phải cung cấp target_value nếu scope_type không phải 'all'")
        
    new_notif = Notification(
        title=payload.title,
        content=payload.content,
        scope_type=payload.scope_type,
        target_value=payload.target_value,
        created_by=payload.created_by
    )
    await new_notif.insert()
    return new_notif

@router.get("/notifications", response_model=List[Notification])
async def get_all_notifications():
    """Lấy danh sách tất cả thông báo (Dành cho Admin xem lịch sử)."""
    return await Notification.find().sort("-created_at").to_list()

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
