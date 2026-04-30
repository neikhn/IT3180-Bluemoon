from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field

class InvoiceLineItem(BaseModel):
    fee_type: str  # 'management', 'electricity', 'water', 'parking_car', 'parking_motorbike', 'other'
    description: str
    quantity: float  # diện tích, kWh, m³, v.v.
    unit_price: float  # giá / đơn vị (VND)
    amount: float  # quantity * unit_price
    is_adjusted: bool = False  # có phải admin điều chỉnh không
    adjustment_note: Optional[str] = None

class Invoice(Document):
    invoice_code: Indexed(str)  # mã hóa đơn sinh ngẫu nhiên
    apartment_id: Indexed(PydanticObjectId)
    billing_period_month: int  # tháng tính phí (1-12)
    billing_period_year: int  # năm tính phí

    line_items: List[InvoiceLineItem] = []
    subtotal: float = 0
    total_amount: float = 0
    previous_debt: float = 0  # công nợ tháng trước
    amount_due: float = 0  # total_amount + previous_debt

    # Trạng thái thanh toán
    status: Indexed(str) = "pending"  # 'pending', 'paid', 'partial', 'cancelled'
    due_date: datetime
    paid_date: Optional[datetime] = None
    payment_method: Optional[str] = None  # 'cash', 'bank_transfer', 'other'
    paid_amount: float = 0

    # Discount/adjustment
    discount_amount: float = 0
    discount_note: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "invoices"
        indexes = [
            [("apartment_id", 1), ("billing_period_year", 1), ("billing_period_month", 1)],
            [("billing_period_year", 1), ("billing_period_month", 1)],
            [("status", 1)],
            [("due_date", 1)],
        ]

    def calculate_totals(self) -> None:
        """Recalculate subtotal and total from line items."""
        self.subtotal = sum(item.amount for item in self.line_items)
        self.total_amount = self.subtotal - self.discount_amount
        self.amount_due = self.total_amount + self.previous_debt