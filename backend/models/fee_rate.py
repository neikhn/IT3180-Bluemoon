from datetime import datetime
from typing import Optional, List
from beanie import Document, Indexed
from beanie.odm.fields import PydanticObjectId
from pydantic import BaseModel, Field
import re

class FeeRateHistory(BaseModel):
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    changed_by: str = "system"
    old_value: float
    new_value: float
    changes_summary: str

class FeeRate(Document):
    fee_type: Indexed(str)  # 'management', 'electricity', 'water', 'parking_car', 'parking_motorbike'
    unit: str  # 'per_sqm', 'per_kwh', 'per_cbm', 'fixed'
    rate_value: float  # giá / đơn vị
    unit_price: float  # giá tiền / đơn vị (VND)
    effective_from: datetime  # ngày bắt đầu áp dụng
    effective_to: Optional[datetime] = None  # ngày kết thúc (None = vô thời hạn)
    is_active: bool = True  # bật/tắt loại phí này
    description: Optional[str] = None
    change_history: List[FeeRateHistory] = []

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "fee_rates"
        indexes = [
            [("fee_type", 1), ("is_active", 1)],
            [("effective_from", 1)],
        ]

    def is_current(self) -> bool:
        """Check if this rate is currently active and within effective dates."""
        now = datetime.utcnow()
        if not self.is_active:
            return False
        if self.effective_from > now:
            return False
        if self.effective_to and self.effective_to < now:
            return False
        return True

    def apply_change(self, new_value: float, changed_by: str = "system") -> None:
        """Record a change to the fee rate."""
        history = FeeRateHistory(
            old_value=self.unit_price,
            new_value=new_value,
            changes_summary=f"Changed from {self.unit_price} to {new_value}",
            changed_by=changed_by
        )
        self.change_history.append(history)
        self.unit_price = new_value