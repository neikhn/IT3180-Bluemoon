from fastapi import APIRouter, HTTPException, Request, Query
from beanie import PydanticObjectId
from pydantic import BaseModel
from models.ticket import Ticket, TicketResponse
from core.audit import log_action, get_actor_from_request
from typing import List, Optional
import string, random
from datetime import datetime

router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB limit

def validate_base64_size(data: str, label: str) -> None:
    if data and len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail=f"{label} vượt quá kích thước cho phép (tối đa 10MB).")

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
    for i, img in enumerate(payload.images_base64):
        validate_base64_size(img, f"Hình ảnh {i+1}")

    if payload.category == "vehicle_registration":
        import json
        from models.vehicle import Vehicle
        try:
            v_data = json.loads(payload.description)
        except (json.JSONDecodeError, ValueError):
            raise HTTPException(status_code=400, detail="Dữ liệu đăng ký xe không hợp lệ.")

        v_type = v_data.get("vehicle_type", "motorbike")
        sanitized_plate = v_data.get("license_plate", "").upper().replace(" ", "")

        if not sanitized_plate:
            raise HTTPException(status_code=400, detail="Biển số không được trống.")

        existing_vehicle = await Vehicle.find_one(Vehicle.license_plate == sanitized_plate, Vehicle.status != "inactive")
        if existing_vehicle:
            raise HTTPException(status_code=400, detail="Biển số này đã được đăng ký trong hệ thống.")

        # Check existing vehicles
        active_vehicles = await Vehicle.find(
            Vehicle.apartment_id == payload.apartment_id,
            Vehicle.vehicle_type == v_type,
            Vehicle.status != "inactive"
        ).count()
        
        # Check pending tickets
        pending_tickets = await Ticket.find(
            Ticket.apartment_id == payload.apartment_id,
            Ticket.category == "vehicle_registration",
            {"status": {"$in": ["open", "processing"]}}
        ).to_list()
        
        pending_count = 0
        for pt in pending_tickets:
            try:
                pt_data = json.loads(pt.description)
                if pt_data.get("vehicle_type", "motorbike") == v_type:
                    pending_count += 1
            except (json.JSONDecodeError, ValueError):
                continue
        
        total_count = active_vehicles + pending_count
        if v_type == "car" and total_count >= 1:
            raise HTTPException(status_code=400, detail="Căn hộ đã đạt giới hạn 1 ô tô (hoặc có yêu cầu đang chờ duyệt).")
        if v_type == "motorbike" and total_count >= 2:
            raise HTTPException(status_code=400, detail="Căn hộ đã đạt giới hạn 2 xe máy (hoặc có yêu cầu đang chờ duyệt).")

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
    await log_action(
        action="create", 
        resource_type="ticket", 
        resource_id=str(new_ticket.id), 
        description=f"Tạo ticket [{payload.category}] {payload.title}", 
        actor_id=str(payload.resident_id), 
        actor_username="resident", 
        actor_role="resident"
    )
    return new_ticket

@router.get("/tickets", response_model=List[Ticket])
async def get_tickets(
    resident_id: Optional[PydanticObjectId] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    status: Optional[str] = None,
):
    """Lấy danh sách Ticket — có phân trang và lọc theo cư dân/status"""
    from datetime import timedelta
    now = datetime.utcnow()
    pending_tickets = await Ticket.find({"status": "pending_close"}).to_list()
    for t in pending_tickets:
        if t.pending_close_at and (now - t.pending_close_at) > timedelta(hours=72):
            t.status = "closed"
            t.updated_at = now
            t.responses.append(TicketResponse(
                sender_role="system",
                sender_id=t.resident_id,
                message="✅ Hệ thống tự động đóng ticket do không nhận được phản hồi sau 72 giờ từ bên còn lại."
            ))
            await t.save()

    query = {}
    if resident_id:
        query["resident_id"] = resident_id
    if status:
        query["status"] = status
    return await Ticket.find(query).sort("-created_at").skip(skip).limit(limit).to_list()

@router.post("/tickets/{ticket_id}/reply", response_model=Ticket)
async def reply_ticket(ticket_id: PydanticObjectId, payload: TicketReplyCreate, request: Request):
    """Thêm bình luận/phản hồi vào quá trình xử lý Ticket."""
    if payload.image_base64:
        validate_base64_size(payload.image_base64, "Hình ảnh đính kèm")
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
    actor = await get_actor_from_request(request)
    await log_action(
        action="reply", 
        resource_type="ticket", 
        resource_id=str(ticket_id), 
        description=f"Phản hồi ticket [{ticket.ticket_code}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
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
async def approve_ticket(ticket_id: PydanticObjectId, request: Request):
    """Admin duyệt ticket đăng ký xe → Tự động tạo Vehicle."""
    from models.vehicle import Vehicle, ChangeHistory as VehicleHistory
    
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
    
    if ticket.category != "vehicle_registration":
        raise HTTPException(status_code=400, detail="Chỉ có thể approve ticket loại đăng ký phương tiện.")
    
    if ticket.status == "closed":
        raise HTTPException(status_code=400, detail="Ticket này đã được đóng.")

    # Parse vehicle info từ description (format JSON-like trong description)
    # Ticket description chứa JSON: {"license_plate": "...", "vehicle_type": "...", "vehicle_name": "..."}
    import json
    try:
        vehicle_data = json.loads(ticket.description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Không thể đọc dữ liệu phương tiện từ ticket. Format không hợp lệ.")

    sanitized_plate = vehicle_data.get("license_plate", "").upper().replace(" ", "")
    existing = await Vehicle.find_one(Vehicle.license_plate == sanitized_plate, Vehicle.status != "inactive")
    if existing:
        raise HTTPException(status_code=400, detail=f"Biển số {sanitized_plate} đã được đăng ký!")

    v_type = vehicle_data.get("vehicle_type", "motorbike")
    if v_type == "car":
        car_count = await Vehicle.find(
            Vehicle.apartment_id == ticket.apartment_id,
            Vehicle.vehicle_type == "car",
            Vehicle.status != "inactive"
        ).count()
        if car_count >= 1:
            raise HTTPException(status_code=400, detail="Chỉ được phép đăng ký tối đa 1 ô tô cho mỗi phòng.")
    else:
        moto_count = await Vehicle.find(
            Vehicle.apartment_id == ticket.apartment_id,
            Vehicle.vehicle_type == "motorbike",
            Vehicle.status != "inactive"
        ).count()
        if moto_count >= 2:
            raise HTTPException(status_code=400, detail="Chỉ được phép đăng ký tối đa 2 xe máy cho mỗi phòng.")

    new_vehicle = Vehicle(
        apartment_id=ticket.apartment_id,
        resident_id=ticket.resident_id,
        license_plate=sanitized_plate,
        vehicle_type=v_type,
        vehicle_name=vehicle_data.get("vehicle_name", "")
    )
    new_vehicle.change_history.append(VehicleHistory(changes_summary=f"Tự động tạo từ Ticket {ticket.ticket_code}"))
    await new_vehicle.insert()

    actor = await get_actor_from_request(request)
    admin_id = actor.get("actor_id") or ticket.resident_id

    ticket.status = "closed"
    ticket.updated_at = datetime.utcnow()
    ticket.responses.append(TicketResponse(
        sender_role="admin",
        sender_id=admin_id,
        message=f"✅ Đã duyệt đăng ký phương tiện {sanitized_plate} ({vehicle_data.get('vehicle_name', '')}). Phương tiện đã được thêm vào hệ thống."
    ))
    await ticket.save()
    await log_action(
        action="approve", 
        resource_type="ticket", 
        resource_id=str(ticket_id), 
        description=f"Duyệt ticket đăng ký xe [{sanitized_plate}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return ticket

class RejectPayload(BaseModel):
    reason: str

@router.post("/tickets/{ticket_id}/reject", response_model=Ticket)
async def reject_ticket(ticket_id: PydanticObjectId, payload: RejectPayload, request: Request):
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")

    ticket.status = "rejected"
    ticket.updated_at = datetime.utcnow()
    actor = await get_actor_from_request(request)
    admin_id = actor.get("actor_id") or ticket.resident_id
    ticket.responses.append(TicketResponse(
        sender_role="admin",
        sender_id=admin_id,
        message=f"❌ Yêu cầu đã bị từ chối. Lý do: {payload.reason}"
    ))
    await ticket.save()
    await log_action(
        action="reject", 
        resource_type="ticket", 
        resource_id=str(ticket_id), 
        description=f"Từ chối ticket [{ticket.ticket_code}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return ticket

class RequestClosePayload(BaseModel):
    requested_by: str # 'admin' | 'resident'

@router.post("/tickets/{ticket_id}/request-close", response_model=Ticket)
async def request_close_ticket(ticket_id: PydanticObjectId, payload: RequestClosePayload):
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
    
    if ticket.status in ["closed", "rejected"]:
        raise HTTPException(status_code=400, detail="Ticket đã đóng hoặc bị từ chối")
        
    ticket.status = "pending_close"
    ticket.pending_close_by = payload.requested_by
    ticket.pending_close_at = datetime.utcnow()
    ticket.updated_at = datetime.utcnow()
    
    sender_role = payload.requested_by
    role_str = "Ban quản lý" if sender_role == "admin" else "Cư dân"
    
    ticket.responses.append(TicketResponse(
        sender_role="system",
        sender_id=ticket.resident_id,
        message=f"⏳ {role_str} đã yêu cầu đóng ticket. Nếu bên phản đối không phản hồi trong 72h, ticket sẽ tự động được đóng."
    ))
    await ticket.save()
    return ticket

@router.post("/tickets/{ticket_id}/accept-close", response_model=Ticket)
async def accept_close_ticket(ticket_id: PydanticObjectId):
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
        
    ticket.status = "closed"
    ticket.updated_at = datetime.utcnow()
    ticket.responses.append(TicketResponse(
        sender_role="system",
        sender_id=ticket.resident_id,
        message="✅ Yêu cầu đóng ticket đã được đồng ý. Ticket đã được đóng."
    ))
    await ticket.save()
    return ticket

class DisputeClosePayload(BaseModel):
    disputed_by: str
    reason: str

@router.post("/tickets/{ticket_id}/dispute-close", response_model=Ticket)
async def dispute_close_ticket(ticket_id: PydanticObjectId, payload: DisputeClosePayload):
    ticket = await Ticket.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket không tồn tại")
        
    ticket.status = "processing"
    ticket.pending_close_by = None
    ticket.pending_close_at = None
    ticket.updated_at = datetime.utcnow()
    
    ticket.responses.append(TicketResponse(
        sender_role="system",
        sender_id=ticket.resident_id,
        message=f"❌ Yêu cầu đóng ticket bị phản đối. Lý do: {payload.reason}"
    ))
    await ticket.save()
    return ticket
