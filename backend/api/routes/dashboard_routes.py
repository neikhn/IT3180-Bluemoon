from datetime import datetime, timedelta
from fastapi import APIRouter, Query
from typing import List, Optional
from beanie import PydanticObjectId
from models.apartment import Apartment
from models.resident import Resident
from models.vehicle import Vehicle
from models.ticket import Ticket
from models.invoice import Invoice
from models.notification import Notification

router = APIRouter()

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """
    Aggregated dashboard data for admin overview.
    Returns: summary counts, occupancy rate, revenue trend (last 6 months),
    collection rate breakdown, debt aging summary.
    """
    now = datetime.utcnow()

    # ── Counts ────────────────────────────────────────────────────────────────
    apartments = await Apartment.find_all().to_list()
    residents = await Resident.find_all().to_list()
    vehicles = await Vehicle.find(Vehicle.status != "inactive").to_list()
    tickets = await Ticket.find_all().to_list()

    occupied_count = sum(1 for a in apartments if a.status == "occupied")
    occupied_rate = round(occupied_count / len(apartments) * 100, 1) if apartments else 0

    open_tickets = [t for t in tickets if t.status in ("open", "processing")]
    pending_close = [t for t in tickets if t.status == "pending_close"]

    # ── Auto-close expired pending_close tickets (runs on every dashboard load) ──
    for t in pending_close:
        if t.pending_close_at and (now - t.pending_close_at) > timedelta(hours=72):
            t.status = "closed"
            t.updated_at = now
            from models.ticket import TicketResponse
            t.responses.append(TicketResponse(
                sender_role="system",
                sender_id=t.resident_id,
                message="Hệ thống tự động đóng ticket do không nhận được phản hồi sau 72 giờ."
            ))
            await t.save()

    # ── Revenue Trend (last 6 months) ─────────────────────────────────────────
    revenue_trend = []
    for i in range(5, -1, -1):
        # go back i months
        month_date = datetime(now.year, now.month, 1) - timedelta(days=i * 30)
        m, y = month_date.month, month_date.year

        period_invoices = [
            inv for inv in await Invoice.find(
                Invoice.billing_period_year == y,
                Invoice.billing_period_month == m
            ).to_list()
        ]

        total_billed = sum(inv.total_amount for inv in period_invoices)
        total_collected = sum(inv.paid_amount for inv in period_invoices)
        month_name = f"T{m}"

        revenue_trend.append({
            "month": month_name,
            "billed": round(total_billed, 0),
            "collected": round(total_collected, 0),
        })

    # ── Collection Rate (all-time) ─────────────────────────────────────────────
    all_invoices = await Invoice.find_all().to_list()
    paid_sum = sum(inv.paid_amount for inv in all_invoices if inv.status == "paid")
    pending_sum = sum(inv.amount_due - inv.paid_amount for inv in all_invoices if inv.status in ("pending", "partial"))
    cancelled_sum = sum(inv.amount_due for inv in all_invoices if inv.status == "cancelled")

    collection_data = [
        {"name": "Đã thu", "value": paid_sum},
        {"name": "Chưa thu", "value": pending_sum},
        {"name": "Đã hủy", "value": cancelled_sum},
    ]

    # ── Debt Aging (unpaid invoices grouped by overdue months) ─────────────────
    overdue_0_30 = 0   # due within 30 days
    overdue_30_60 = 0  # 30-60 days overdue
    overdue_60_90 = 0   # 60-90 days overdue
    overdue_90_plus = 0 # >90 days overdue

    unpaid_invoices = [inv for inv in all_invoices if inv.status in ("pending", "partial")]
    for inv in unpaid_invoices:
        remaining = inv.amount_due - inv.paid_amount
        if remaining <= 0:
            continue
        days_overdue = (now - inv.due_date).days
        if days_overdue <= 30:
            overdue_0_30 += remaining
        elif days_overdue <= 60:
            overdue_30_60 += remaining
        elif days_overdue <= 90:
            overdue_60_90 += remaining
        else:
            overdue_90_plus += remaining

    debt_aging = [
        {"label": "0-30 ngày", "value": round(overdue_0_30, 0)},
        {"label": "31-60 ngày", "value": round(overdue_30_60, 0)},
        {"label": "61-90 ngày", "value": round(overdue_60_90, 0)},
        {"label": ">90 ngày", "value": round(overdue_90_plus, 0)},
    ]

    # ── Ticket breakdown by category ──────────────────────────────────────────
    ticket_categories = {}
    for t in tickets:
        cat = t.category or "other"
        ticket_categories[cat] = ticket_categories.get(cat, 0) + 1

    ticket_by_category = [
        {"name": cat.replace("_", " ").title(), "value": count}
        for cat, count in sorted(ticket_categories.items(), key=lambda x: -x[1])
    ]

    return {
        "counts": {
            "apartments": len(apartments),
            "residents": len(residents),
            "vehicles": len(vehicles),
            "activeTickets": len(open_tickets),
            "occupiedRate": occupied_rate,
        },
        "revenueTrend": revenue_trend,
        "collectionData": collection_data,
        "debtAging": debt_aging,
        "ticketByCategory": ticket_by_category,
    }


@router.get("/dashboard/charts")
async def get_dashboard_charts(year: int = Query(default=datetime.utcnow().year)):
    """
    Detailed chart data for admin/accountant dashboards.
    Returns: revenueByYear, occupancyByBlock, revenueByFeeType,
    collectionByMonth (last 12 months), paymentMethod breakdown.
    """
    now = datetime.utcnow()
    all_invoices = await Invoice.find_all().to_list()
    all_apartments = await Apartment.find_all().to_list()

    # ── Revenue by Year ───────────────────────────────────────────────────────
    year_map: dict[int, dict] = {}
    for inv in all_invoices:
        y = inv.billing_period_year
        if y not in year_map:
            year_map[y] = {"billed": 0, "collected": 0}
        year_map[y]["billed"] += inv.total_amount
        year_map[y]["collected"] += inv.paid_amount

    revenue_by_year = [
        {"year": str(y), "billed": round(vals["billed"]), "collected": round(vals["collected"])}
        for y, vals in sorted(year_map.items())
    ]

    # ── Occupancy by Block ────────────────────────────────────────────────────
    block_map: dict[str, dict] = {}
    for apt in all_apartments:
        b = apt.block or "Khác"
        if b not in block_map:
            block_map[b] = {"occupied": 0, "available": 0, "maintenance": 0}
        if apt.status == "occupied":
            block_map[b]["occupied"] += 1
        elif apt.status == "available":
            block_map[b]["available"] += 1
        elif apt.status == "maintenance":
            block_map[b]["maintenance"] += 1

    occupancy_by_block = [
        {"block": b, **counts} for b, counts in sorted(block_map.items())
    ]

    # ── Revenue by Fee Type ───────────────────────────────────────────────────
    FEE_LABELS = {
        "management": "Phí quản lý",
        "electricity": "Tiền điện",
        "water": "Tiền nước",
        "parking_car": "Phí ô tô",
        "parking_motorbike": "Phí xe máy",
        "charity": "Thiện nguyện",
        "other": "Khác",
    }
    fee_type_map: dict[str, float] = {}
    for inv in all_invoices:
        for item in inv.line_items:
            key = FEE_LABELS.get(item.fee_type, item.fee_type)
            fee_type_map[key] = fee_type_map.get(key, 0) + item.amount

    revenue_by_fee_type = [
        {"name": name, "value": round(value)}
        for name, value in sorted(fee_type_map.items(), key=lambda x: -x[1])
    ]

    # ── Collection by Month (last 12 months of the selected year) ─────────────
    collection_by_month = []
    for m in range(1, 13):
        period_invoices = [
            inv for inv in all_invoices
            if inv.billing_period_year == year and inv.billing_period_month == m
        ]
        if not period_invoices:
            continue
        paid = sum(inv.paid_amount for inv in period_invoices if inv.status == "paid")
        pending = sum(
            inv.amount_due - inv.paid_amount
            for inv in period_invoices
            if inv.status in ("pending", "partial")
        )
        cancelled = sum(
            inv.amount_due for inv in period_invoices if inv.status == "cancelled"
        )
        collection_by_month.append({
            "month": f"T{m}",
            "paid": round(paid),
            "pending": round(pending),
            "cancelled": round(cancelled),
        })

    # ── Payment Method ────────────────────────────────────────────────────────
    PM_LABELS = {
        "cash": "Tiền mặt",
        "bank_transfer": "Chuyển khoản",
        "other": "Khác",
    }
    pm_map: dict[str, int] = {}
    for inv in all_invoices:
        if inv.status == "paid" and inv.payment_method:
            label = PM_LABELS.get(inv.payment_method, inv.payment_method)
            pm_map[label] = pm_map.get(label, 0) + 1

    payment_method = [
        {"name": name, "value": count}
        for name, count in sorted(pm_map.items(), key=lambda x: -x[1])
    ]

    return {
        "revenueByYear": revenue_by_year,
        "occupancyByBlock": occupancy_by_block,
        "revenueByFeeType": revenue_by_fee_type,
        "collectionByMonth": collection_by_month,
        "paymentMethod": payment_method,
    }
