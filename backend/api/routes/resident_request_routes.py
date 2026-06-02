from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, Query
from beanie import PydanticObjectId
from pydantic import BaseModel
from models.resident_request import ResidentChangeRequest
from models.resident import Resident, ResidentHistory
from models.apartment import Apartment, MinimalResidentInfo, ChangeHistory
from core.audit import log_action, get_actor_from_request

router = APIRouter()

class RequestCreate(BaseModel):
    apartment_id: PydanticObjectId
    request_type: str # 'add', 'update', 'delete'
    target_resident_id: Optional[PydanticObjectId] = None
    proposed_data: Optional[dict] = None

class RequestReview(BaseModel):
    status: str # 'approved', 'rejected'
    admin_note: Optional[str] = None

@router.post("/resident-requests", response_model=ResidentChangeRequest)
async def create_request(payload: RequestCreate, request: Request):
    """Cư dân gửi yêu cầu thay đổi nhân khẩu."""
    actor = await get_actor_from_request(request)
    
    from models.account import Account
    resident_id = None
    if actor["actor_id"]:
        account = await Account.get(PydanticObjectId(actor["actor_id"]))
        if account and account.resident_id:
            resident_id = account.resident_id
            
    if not resident_id:
        raise HTTPException(
            status_code=400,
            detail="Tài khoản của bạn không được liên kết với thông tin cư dân nào."
        )
        
    if payload.request_type == "add":
        if not payload.proposed_data:
            raise HTTPException(status_code=400, detail="Thiếu thông tin đề xuất nhân khẩu mới.")
        
        full_name = payload.proposed_data.get("full_name")
        identity_card = payload.proposed_data.get("identity_card")
        phone_number = payload.proposed_data.get("phone_number")
        date_of_birth = payload.proposed_data.get("date_of_birth")

        if not full_name or not identity_card or not phone_number or not date_of_birth:
            raise HTTPException(status_code=400, detail="Vui lòng điền đầy đủ các thông tin: Họ tên, Ngày sinh, CCCD, SĐT.")

        import re
        if not re.match(r"^[0-9]{12}$", str(identity_card)):
            raise HTTPException(status_code=400, detail="Số CCCD phải bao gồm đúng 12 chữ số.")
        if not re.match(r"^0[0-9]{9}$", str(phone_number)):
            raise HTTPException(status_code=400, detail="Số điện thoại phải bao gồm đúng 10 chữ số và bắt đầu bằng số 0.")

        existing_res = await Resident.find_one(Resident.identity_card == identity_card)
        if existing_res:
            raise HTTPException(status_code=400, detail="Số CCCD này đã tồn tại trong hệ thống.")

    new_request = ResidentChangeRequest(
        apartment_id=payload.apartment_id,
        requester_resident_id=resident_id,
        request_type=payload.request_type,
        target_resident_id=payload.target_resident_id,
        proposed_data=payload.proposed_data,
        status="pending"
    )
    await new_request.insert()
    
    await log_action(
        action="create_request",
        resource_type="resident_request",
        resource_id=str(new_request.id),
        description=f"Gửi yêu cầu {payload.request_type} nhân khẩu cho căn hộ {payload.apartment_id}",
        **actor
    )
    # Populate resolved fields
    apt = await Apartment.get(new_request.apartment_id)
    if apt:
        new_request.apartment_number = f"{apt.block}-{apt.apartment_number}"
    if new_request.target_resident_id:
        res = await Resident.get(new_request.target_resident_id)
        if res:
            new_request.target_resident_name = res.full_name
            new_request.target_resident_phone = res.phone_number

    return new_request

@router.get("/resident-requests", response_model=List[ResidentChangeRequest])
async def get_requests(status: Optional[str] = None):
    """Admin lấy danh sách yêu cầu."""
    if status:
        reqs = await ResidentChangeRequest.find(ResidentChangeRequest.status == status).to_list()
    else:
        reqs = await ResidentChangeRequest.find_all().to_list()

    for req in reqs:
        apt = await Apartment.get(req.apartment_id)
        if apt:
            req.apartment_number = f"{apt.block}-{apt.apartment_number}"
        if req.target_resident_id:
            res = await Resident.get(req.target_resident_id)
            if res:
                req.target_resident_name = res.full_name
                req.target_resident_phone = res.phone_number

    return reqs

@router.patch("/resident-requests/{request_id}/review", response_model=ResidentChangeRequest)
async def review_request(request_id: PydanticObjectId, payload: RequestReview, request: Request):
    """Admin duyệt hoặc từ chối yêu cầu."""
    req = await ResidentChangeRequest.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu.")
    
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Yêu cầu này đã được xử lý rồi.")

    actor = await get_actor_from_request(request)
    req.status = payload.status
    req.admin_note = payload.admin_note
    req.updated_at = datetime.utcnow()

    if payload.status == "approved":
        # THỰC THI THAY ĐỔI VÀO DATABASE GỐC
        apartment = await Apartment.get(req.apartment_id)
        if not apartment:
            raise HTTPException(status_code=404, detail="Không tìm thấy căn hộ liên quan.")

        if req.request_type == "add":
            # Tạo cư dân mới
            try:
                new_res = Resident(
                    full_name=req.proposed_data["full_name"],
                    date_of_birth=req.proposed_data["date_of_birth"],
                    identity_card=req.proposed_data["identity_card"],
                    phone_number=req.proposed_data["phone_number"],
                    email=req.proposed_data.get("email"),
                    status="active"
                )
                await new_res.insert()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Dữ liệu nhân khẩu không hợp lệ: {str(e)}")
            
            # Tự động tạo Account
            import bcrypt
            from models.account import Account
            raw_username = req.proposed_data.get("identity_card")
            default_password = req.proposed_data.get("phone_number")
            
            # Dự phòng nếu thiếu thông tin
            if not raw_username:
                raw_username = req.proposed_data.get("phone_number")
            if not default_password:
                default_password = raw_username or "Bluemoon@123"

            # Tránh trùng lặp username
            existing_account = await Account.find_one(Account.username == raw_username)
            username = raw_username if not existing_account else f"{raw_username}_{new_res.id}"
            password_hash = bcrypt.hashpw(default_password.encode(), bcrypt.gensalt()).decode()
            
            new_account = Account(
                username=username,
                password_hash=password_hash,
                role="resident",
                full_name=new_res.full_name,
                email=new_res.email,
                resident_id=new_res.id,
                needs_password_change=True
            )
            await new_account.insert()

            # Nối thông tin tài khoản vào admin_note để chủ hộ có thể thấy
            acc_note = f" (Đã cấp tài khoản. Tên ĐN (CCCD): {username} - Mật khẩu (SĐT): {default_password})"
            req.admin_note = (req.admin_note or "") + acc_note
            
            # Thêm vào căn hộ
            apartment.current_residents.append(MinimalResidentInfo(
                resident_id=new_res.id,
                full_name=new_res.full_name,
                relationship=req.proposed_data.get("relationship", "tenant"),
                status="living",
                move_in_date=datetime.utcnow()
            ))
            apartment.change_history.append(ChangeHistory(
                changes_summary=f"Thêm cư dân qua phê duyệt: {new_res.full_name}",
                changed_by=actor["actor_username"]
            ))
            if apartment.status == "available":
                apartment.status = "occupied"
            await apartment.save()

        elif req.request_type == "update":
            res = await Resident.get(req.target_resident_id)
            if res:
                for key, val in req.proposed_data.items():
                    if hasattr(res, key):
                        setattr(res, key, val)
                res.change_history.append(ResidentHistory(
                    changed_by=actor["actor_username"],
                    changes_summary="Cập nhật thông tin qua phê duyệt yêu cầu"
                ))
                await res.save()
                
                # Cập nhật cả trong MinimalResidentInfo của Apartment nếu cần
                for cr in apartment.current_residents:
                    if cr.resident_id == req.target_resident_id:
                        cr.full_name = res.full_name
                        if "relationship" in req.proposed_data:
                            cr.relationship = req.proposed_data["relationship"]
                await apartment.save()

        elif req.request_type == "delete":
            found = False
            for cr in apartment.current_residents:
                if cr.resident_id == req.target_resident_id and cr.status == "living":
                    cr.status = "moved_out"
                    found = True
                    break
            if found:
                apartment.change_history.append(ChangeHistory(
                    changes_summary=f"Cư dân dời đi (Phê duyệt yêu cầu)",
                    changed_by=actor["actor_username"]
                ))
                if all(r.status != "living" for r in apartment.current_residents):
                    apartment.status = "available"
                await apartment.save()

    await req.save()
    
    await log_action(
        action="review_request",
        resource_type="resident_request",
        resource_id=str(req.id),
        description=f"Phê duyệt trạng thái {payload.status} cho yêu cầu {req.request_type}",
        **actor
    )
    
    # Populate resolved fields before returning
    apt = await Apartment.get(req.apartment_id)
    if apt:
        req.apartment_number = f"{apt.block}-{apt.apartment_number}"
    if req.target_resident_id:
        res = await Resident.get(req.target_resident_id)
        if res:
            req.target_resident_name = res.full_name
            req.target_resident_phone = res.phone_number

    return req
