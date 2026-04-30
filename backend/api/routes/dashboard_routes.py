from datetime import datetime, timedelta
from fastapi import APIRouter
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
