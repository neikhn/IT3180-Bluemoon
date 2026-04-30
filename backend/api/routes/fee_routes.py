from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request, Query
from core.audit import log_action, get_actor_from_request
from models.fee_rate import FeeRate, FeeRateHistory
from models.invoice import Invoice, InvoiceLineItem
from models.apartment import Apartment
from typing import List, Optional
from pydantic import BaseModel, Field
from beanie import PydanticObjectId
import uuid

router = APIRouter()

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class FeeRateCreate(BaseModel):
    fee_type: str
    unit: str
    rate_value: float
    unit_price: float
    effective_from: datetime
    effective_to: Optional[datetime] = None
    is_active: bool = True
    description: Optional[str] = None

class FeeRateUpdate(BaseModel):
    rate_value: Optional[float] = None
    unit_price: Optional[float] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None

class MeterReadingItem(BaseModel):
    apartment_id: PydanticObjectId
    electricity_consumption: float = 0
    water_consumption: float = 0

class InvoiceLineItemCreate(BaseModel):
    fee_type: str
    description: str
    quantity: float
    unit_price: float
    is_adjusted: bool = False
    adjustment_note: Optional[str] = None

class InvoiceCreate(BaseModel):
    apartment_id: PydanticObjectId
    billing_period_month: int = Field(ge=1, le=12)
    billing_period_year: int
    line_items: List[InvoiceLineItemCreate] = []
    previous_debt: float = 0
    discount_amount: float = 0
    discount_note: Optional[str] = None
    due_date: datetime

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    discount_amount: Optional[float] = None
    discount_note: Optional[str] = None
    paid_amount: Optional[float] = None
    payment_method: Optional[str] = None

# ─── FeeRate CRUD ─────────────────────────────────────────────────────────────

@router.get("/fee-rates", response_model=List[FeeRate])
async def get_all_fee_rates(
    active_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    """Lấy danh sách tất cả các loại phí — có phân trang"""
    if active_only:
        return await FeeRate.find(FeeRate.is_active == True).skip(skip).limit(limit).to_list()
    return await FeeRate.find_all().skip(skip).limit(limit).to_list()

@router.post("/fee-rates", response_model=FeeRate, status_code=201)
async def create_fee_rate(payload: FeeRateCreate, request: Request):
    """Tạo mới một loại phí."""
    existing = await FeeRate.find_one(
        FeeRate.fee_type == payload.fee_type,
        FeeRate.effective_from == payload.effective_from
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Loại phí '{payload.fee_type}' đã tồn tại với ngày hiệu lực này."
        )

    new_rate = FeeRate(**payload.model_dump())
    await new_rate.insert()
    actor = await get_actor_from_request(request)
    await log_action(
        action="create", 
        resource_type="fee_rate", 
        resource_id=str(new_rate.id), 
        description=f"Tạo định mức phí [{payload.fee_type}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return new_rate

@router.get("/fee-rates/{fee_rate_id}", response_model=FeeRate)
async def get_fee_rate(fee_rate_id: PydanticObjectId):
    rate = await FeeRate.get(fee_rate_id)
    if not rate:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phí này.")
    return rate

@router.patch("/fee-rates/{fee_rate_id}", response_model=FeeRate)
async def update_fee_rate(fee_rate_id: PydanticObjectId, payload: FeeRateUpdate, request: Request):
    """Cập nhật phí — ghi log thay đổi."""
    rate = await FeeRate.get(fee_rate_id)
    if not rate:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phí này.")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return rate

    actually_changed = []
    for key, new_value in update_data.items():
        old_value = getattr(rate, key, None)
        if old_value != new_value:
            actually_changed.append(f"{key}: '{old_value}' → '{new_value}'")
            setattr(rate, key, new_value)

    if actually_changed:
        rate.updated_at = datetime.utcnow()
        await rate.save()
        actor = await get_actor_from_request(request)
        await log_action(
            action="update", 
            resource_type="fee_rate", 
            resource_id=str(fee_rate_id), 
            description=f"Cập nhật phí [{rate.fee_type}]: {'; '.join(actually_changed)}", 
            actor_id=actor["actor_id"], 
            actor_username=actor["actor_username"], 
            actor_role=actor["actor_role"]
        )

    return rate

@router.delete("/fee-rates/{fee_rate_id}")
async def delete_fee_rate(fee_rate_id: PydanticObjectId, request: Request):
    rate = await FeeRate.get(fee_rate_id)
    if not rate:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại phí này.")
    actor = await get_actor_from_request(request)
    await log_action(
        action="delete", 
        resource_type="fee_rate", 
        resource_id=str(fee_rate_id), 
        description=f"Xóa định mức phí [{rate.fee_type}]", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    await rate.delete()
    return {"message": "Đã xóa loại phí."}

# ─── Invoice Auto-generation ─────────────────────────────────────────────────

def generate_invoice_code() -> str:
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

async def get_current_rate(fee_type: str) -> Optional[FeeRate]:
    """Lấy rate hiện hành cho loại phí."""
    now = datetime.utcnow()
    rate = await FeeRate.find_one(
        FeeRate.fee_type == fee_type,
        FeeRate.is_active == True,
        FeeRate.effective_from <= now,
    )
    if rate and (rate.effective_to is None or rate.effective_to >= now):
        return rate
    return None

async def _internal_auto_generate_invoice(
    apartment: Apartment,
    billing_period_month: int,
    billing_period_year: int,
    elec_consumption: float = 0,
    water_consumption: float = 0,
    applied_fees: List[str] = ["management", "electricity", "water", "parking"]
) -> Invoice:
    """Logic cốt lõi để tính toán và tạo hóa đơn (dùng chung cho đơn lẻ và hàng loạt)."""
    # Check existing invoice for this period
    existing = await Invoice.find_one(
        Invoice.apartment_id == apartment.id,
        Invoice.billing_period_month == billing_period_month,
        Invoice.billing_period_year == billing_period_year
    )
    if existing:
        return None # Đã tồn tại

    line_items: List[InvoiceLineItem] = []

    # 1. Management fee
    if "management" in applied_fees:
        mgmt_rate = await get_current_rate("management")
        if mgmt_rate:
            line_items.append(InvoiceLineItem(
                fee_type="management",
                description=f"Phí quản lý {apartment.area_sqm}m²",
                quantity=apartment.area_sqm,
                unit_price=mgmt_rate.unit_price,
                amount=round(apartment.area_sqm * mgmt_rate.unit_price, 2)
            ))

    # 2. Electricity
    if "electricity" in applied_fees and elec_consumption > 0:
        elec_rate = await get_current_rate("electricity")
        if elec_rate:
            line_items.append(InvoiceLineItem(
                fee_type="electricity",
                description=f"Tiền điện {elec_consumption} kWh",
                quantity=elec_consumption,
                unit_price=elec_rate.unit_price,
                amount=round(elec_consumption * elec_rate.unit_price, 2)
            ))

    # 3. Water
    if "water" in applied_fees and water_consumption > 0:
        water_rate = await get_current_rate("water")
        if water_rate:
            line_items.append(InvoiceLineItem(
                fee_type="water",
                description=f"Tiền nước {water_consumption} m³",
                quantity=water_consumption,
                unit_price=water_rate.unit_price,
                amount=round(water_consumption * water_rate.unit_price, 2)
            ))

    # 4. Parking fees (count vehicles)
    from models.vehicle import Vehicle
    vehicles = await Vehicle.find(Vehicle.apartment_id == apartment.id).to_list()
    
    # Tính phí ô tô nếu được chọn
    if "parking_car" in applied_fees or "parking" in applied_fees:
        car_count = len([v for v in vehicles if v.vehicle_type == "car"])
        if car_count > 0:
            car_rate = await get_current_rate("parking_car")
            if car_rate:
                line_items.append(InvoiceLineItem(
                    fee_type="parking_car",
                    description=f"Phí gửi ô tô ({car_count} xe)",
                    quantity=car_count,
                    unit_price=car_rate.unit_price,
                    amount=round(car_count * car_rate.unit_price, 2)
                ))
    
    # Tính phí xe máy nếu được chọn
    if "parking_motorbike" in applied_fees or "parking" in applied_fees:
        moto_count = len([v for v in vehicles if v.vehicle_type == "motorbike"])
        if moto_count > 0:
            moto_rate = await get_current_rate("parking_motorbike")
            if moto_rate:
                line_items.append(InvoiceLineItem(
                    fee_type="parking_motorbike",
                    description=f"Phí gửi xe máy ({moto_count} xe)",
                    quantity=moto_count,
                    unit_price=moto_rate.unit_price,
                    amount=round(moto_count * moto_rate.unit_price, 2)
                ))

    # 5. Previous debt
    prev_month = billing_period_month - 1 if billing_period_month > 1 else 12
    prev_year = billing_period_year if billing_period_month > 1 else billing_period_year - 1
    prev_invoice = await Invoice.find_one(
        Invoice.apartment_id == apartment.id,
        Invoice.billing_period_month == prev_month,
        Invoice.billing_period_year == prev_year
    )
    previous_debt = 0
    if prev_invoice and prev_invoice.status in ("pending", "partial"):
        previous_debt = prev_invoice.amount_due - prev_invoice.paid_amount

    due_date = datetime(billing_period_year, billing_period_month, 28) # Mặc định hạn cuối tháng

    invoice = Invoice(
        invoice_code=generate_invoice_code(),
        apartment_id=apartment.id,
        billing_period_month=billing_period_month,
        billing_period_year=billing_period_year,
        line_items=line_items,
        previous_debt=round(previous_debt, 2),
        due_date=due_date
    )
    invoice.calculate_totals()
    await invoice.insert()
    return invoice

@router.post("/invoices/auto-generate", response_model=Invoice)
async def auto_generate_invoice(
    apartment_id: PydanticObjectId,
    billing_period_month: int,
    billing_period_year: int,
    request: Request
):
    """Tự động tạo hóa đơn cho một căn hộ trong kỳ billing."""
    apartment = await Apartment.get(apartment_id)
    if not apartment:
        raise HTTPException(status_code=404, detail="Căn hộ không tồn tại.")

    invoice = await _internal_auto_generate_invoice(apartment, billing_period_month, billing_period_year)
    if not invoice:
        raise HTTPException(status_code=400, detail=f"Đã có hóa đơn cho căn hộ này trong kỳ {billing_period_month}/{billing_period_year}.")

    actor = await get_actor_from_request(request)
    await log_action(
        action="generate", 
        resource_type="invoice", 
        resource_id=str(invoice.id), 
        description=f"Tạo hóa đơn tự động cho {apartment.block}-{apartment.apartment_number} kỳ {billing_period_month}/{billing_period_year}", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return invoice

class BulkGeneratePayload(BaseModel):
    items: List[MeterReadingItem]
    billing_period_month: int
    billing_period_year: int
    applied_fees: List[str] = ["management", "electricity", "water", "parking"]

@router.post("/invoices/bulk-generate")
async def bulk_generate_invoices(payload: BulkGeneratePayload, request: Request):
    """Tạo hóa đơn hàng loạt kèm theo số điện nước."""
    count = 0
    for item in payload.items:
        apt = await Apartment.get(item.apartment_id)
        if not apt: continue
        
        inv = await _internal_auto_generate_invoice(
            apt, 
            payload.billing_period_month, 
            payload.billing_period_year,
            item.electricity_consumption,
            item.water_consumption,
            payload.applied_fees
        )
        if inv:
            count += 1

    actor = await get_actor_from_request(request)
    await log_action(
        action="bulk_generate", 
        resource_type="invoice", 
        description=f"Tạo hóa đơn hàng loạt cho {count} căn hộ kỳ {payload.billing_period_month}/{payload.billing_period_year}", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )

    return {"message": f"Đã tạo thành công {count} hóa đơn.", "count": count}

# ─── Invoice CRUD ─────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    apartment_id: Optional[PydanticObjectId] = None,
    billing_period_year: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
):
    """Lấy danh sách hóa đơn, có lọc và phân trang"""
    query_parts = []
    if apartment_id:
        query_parts.append(Invoice.apartment_id == apartment_id)
    if billing_period_year:
        query_parts.append(Invoice.billing_period_year == billing_period_year)
    if status:
        query_parts.append(Invoice.status == status)

    if query_parts:
        return await Invoice.find(*query_parts).sort("-billing_period_year", "-billing_period_month").skip(skip).limit(limit).to_list()
    return await Invoice.find_all().sort("-billing_period_year", "-billing_period_month").skip(skip).limit(limit).to_list()

@router.post("/invoices", response_model=Invoice, status_code=201)
async def create_invoice(payload: InvoiceCreate, request: Request):
    """Tạo hóa đơn thủ công."""
    actor = await get_actor_from_request(request)
    line_items = [
        InvoiceLineItem(
            fee_type=item.fee_type,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=round(item.quantity * item.unit_price, 2),
            is_adjusted=item.is_adjusted,
            adjustment_note=item.adjustment_note
        )
        for item in payload.line_items
    ]

    invoice = Invoice(
        invoice_code=generate_invoice_code(),
        apartment_id=payload.apartment_id,
        billing_period_month=payload.billing_period_month,
        billing_period_year=payload.billing_period_year,
        line_items=line_items,
        previous_debt=payload.previous_debt,
        discount_amount=payload.discount_amount or 0,
        discount_note=payload.discount_note,
        due_date=payload.due_date
    )
    invoice.calculate_totals()
    await invoice.insert()
    await log_action(
        action="create", 
        resource_type="invoice", 
        resource_id=str(invoice.id), 
        description=f"Tạo hóa đơn thủ công kỳ {payload.billing_period_month}/{payload.billing_period_year}", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return invoice

@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: PydanticObjectId):
    invoice = await Invoice.get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Không tìm thấy hóa đơn.")
    return invoice

@router.patch("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: PydanticObjectId, payload: InvoiceUpdate, request: Request):
    invoice = await Invoice.get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Không tìm thấy hóa đơn.")

    update_data = payload.model_dump(exclude_unset=True)

    # Handle status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "paid":
            invoice.paid_date = datetime.utcnow()
            invoice.paid_amount = invoice.amount_due
            invoice.status = "paid"
        elif new_status in ("pending", "partial"):
            invoice.status = new_status
        elif new_status == "cancelled":
            invoice.status = "cancelled"
        else:
            invoice.status = new_status

    # Handle partial payment
    if "paid_amount" in update_data and update_data["paid_amount"] > 0:
        invoice.paid_amount = update_data["paid_amount"]
        if invoice.paid_amount >= invoice.amount_due:
            invoice.status = "paid"
            invoice.paid_date = datetime.utcnow()
        elif invoice.paid_amount > 0:
            invoice.status = "partial"

    # Handle discount
    if "discount_amount" in update_data:
        invoice.discount_amount = update_data["discount_amount"]
        invoice.calculate_totals()

    if "discount_note" in update_data:
        invoice.discount_note = update_data["discount_note"]

    if "payment_method" in update_data:
        invoice.payment_method = update_data["payment_method"]

    invoice.updated_at = datetime.utcnow()
    await invoice.save()
    actor = await get_actor_from_request(request)
    await log_action(
        action="update", 
        resource_type="invoice", 
        resource_id=str(invoice_id), 
        description=f"Cập nhật hóa đơn [{invoice.invoice_code}] - status: {invoice.status}", 
        actor_id=actor["actor_id"], 
        actor_username=actor["actor_username"], 
        actor_role=actor["actor_role"]
    )
    return invoice

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: PydanticObjectId):
    invoice = await Invoice.get(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Không tìm thấy hóa đơn.")
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Không thể xóa hóa đơn đã thanh toán.")
    await invoice.delete()
    return {"message": "Đã xóa hóa đơn."}