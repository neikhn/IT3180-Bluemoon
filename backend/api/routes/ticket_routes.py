import string
import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel
from models.ticket import Ticket, TicketResponse

router = APIRouter()

def generate_random_ticket_code():
    # Ví dụ: BM-H38KJD
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"BM-{random_str}"

class TicketCreate(BaseModel):
    category: str
    title: str
    description: str
    images_base64: List[str] = []
    resident_id: PydanticObjectId
    apartment_id: PydanticObjectId

class TicketReplyCreate(BaseModel):
    sender_role: str
    sender_id: PydanticObjectId
    message: str
    image_base64: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: str # 'open', 'processing', 'closed'

@router.post("/tickets", response_model=Ticket, status_code=201)
async def create_ticket(payload: TicketCreate):
    """US-15: Cư dân gửi phản ánh."""
    if len(payload.images_base64) > 3:
        raise HTTPException(status_code=400, detail="Chỉ cho phép upload tối đa 3 hình ảnh.")
        
    new_ticket = Ticket(
        ticket_code=generate_random_ticket_code(),
        category=payload.category,
        title=payload.title,
        description=payload.description,
        images_base64=payload.images_base64,
        resident_id=payload.resident_id,
        apartment_id=payload.apartment_id
    )
    await new_ticket.insert()
    return new_ticket

@router.get("/tickets", response_model=List[Ticket])
async def get_tickets(resident_id: Optional[PydanticObjectId] = None):
    """Lấy danh sách Ticket (Có thể lọc theo cư dân gửi)"""
    query = {}
    if resident_id:
        query["resident_id"] = resident_id
    return await Ticket.find(query).to_list()

@router.post("/tickets/{ticket_id}/reply", response_model=Ticket)
async def reply_ticket(ticket_id: PydanticObjectId, payload: TicketReplyCreate):
    """Thêm bình luận/phản hồi vào quá trình xử lý Ticket."""
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
        
    reply = TicketResponse(
        sender_role=payload.sender_role,
        sender_id=payload.sender_id,
        message=payload.message,
        image_base64=payload.image_base64
    )
    
    # Nếu là Admin tự động chuyển status sang processing
    if payload.sender_role == "admin" and ticket.status == "open":
        ticket.status = "processing"
        
    ticket.responses.append(reply)
    ticket.updated_at = datetime.utcnow()
    await ticket.save()
    return ticket

@router.patch("/tickets/{ticket_id}/status", response_model=Ticket)
async def update_ticket_status(ticket_id: PydanticObjectId, payload: TicketStatusUpdate):
    """Đổi trạng thái Ticket."""
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
        
    valid_statuses = ['open', 'processing', 'closed']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Status không hợp lệ.")
        
    ticket.status = payload.status
    ticket.updated_at = datetime.utcnow()
    await ticket.save()
    return ticket

@router.post("/tickets/{ticket_id}/approve", response_model=Ticket)
async def approve_ticket(ticket_id: PydanticObjectId):
    """Admin duyệt ticket đăng ký xe → Tự động tạo Vehicle."""
    from models.vehicle import Vehicle, ChangeHistory as VehicleHistory
    
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
    
    if ticket.category != "vehicle_registration":
        raise HTTPException(status_code=400, detail="Chỉ có thể approve ticket loại đăng ký xe.")
    
    if ticket.status == "closed":
        raise HTTPException(status_code=400, detail="Ticket này đã được đóng.")

    # Parse vehicle info từ description (format JSON-like trong description)
    # Ticket description chứa JSON: {"license_plate": "...", "vehicle_type": "...", "vehicle_name": "..."}
    import json
    try:
        vehicle_data = json.loads(ticket.description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Không thể đọc dữ liệu xe từ ticket. Format không hợp lệ.")

    sanitized_plate = vehicle_data.get("license_plate", "").upper().replace(" ", "")
    existing = await Vehicle.find_one({"license_plate": sanitized_plate})
    if existing:
        raise HTTPException(status_code=400, detail=f"Biển số {sanitized_plate} đã được đăng ký!")

    new_vehicle = Vehicle(
        apartment_id=ticket.apartment_id,
        resident_id=ticket.resident_id,
        license_plate=sanitized_plate,
        vehicle_type=vehicle_data.get("vehicle_type", "motorbike"),
        vehicle_name=vehicle_data.get("vehicle_name", "")
    )
    new_vehicle.change_history.append(VehicleHistory(changes_summary=f"Tự động tạo từ Ticket {ticket.ticket_code}"))
    await new_vehicle.insert()

    ticket.status = "closed"
    ticket.updated_at = datetime.utcnow()
    ticket.responses.append(TicketResponse(
        sender_role="admin",
        sender_id=ticket.resident_id,  # placeholder
        message=f"✅ Đã duyệt đăng ký xe {sanitized_plate} ({vehicle_data.get('vehicle_name', '')}). Xe đã được thêm vào hệ thống."
    ))
    await ticket.save()
    return ticket
