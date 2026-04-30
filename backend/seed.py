import asyncio
from datetime import datetime, timedelta
from core.db_config import init_db
from models.account import Account
from models.apartment import Apartment, MinimalResidentInfo
from models.resident import Resident, ResidentHistory
from models.vehicle import Vehicle
from models.ticket import Ticket, TicketResponse
from models.notification import Notification
from models.fee_rate import FeeRate
from models.invoice import Invoice, InvoiceLineItem
from models.audit_log import AuditLog
import bcrypt

async def seed_data():
    print("Initializing Database connection...")
    await init_db()

    print("Clearing old dummy data (for clean slate)...")
    await AuditLog.find_all().delete()
    await Invoice.find_all().delete()
    await FeeRate.find_all().delete()
    await Ticket.find_all().delete()
    await Notification.find_all().delete()
    await Vehicle.find_all().delete()
    await Resident.find_all().delete()
    await Apartment.find_all().delete()
    await Account.find_all().delete()

    # ─── ACCOUNTS ────────────────────────────────────────────────────────────
    print("Inserting Accounts...")
    admin = Account(
        username="admin",
        password_hash=bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode(),
        role="admin",
        full_name="Trần Văn Quang",
        email="admin@bluemoon.vn",
    )
    await admin.insert()

    ketoan = Account(
        username="ketoan",
        password_hash=bcrypt.hashpw("ketoan123".encode(), bcrypt.gensalt()).decode(),
        role="accountant",
        full_name="Nguyễn Thị Mai Anh",
        email="ketoan@bluemoon.vn",
    )
    await ketoan.insert()

    # Resident accounts will be created after residents are created
    resident_accounts = []

    # ─── APARTMENTS ───────────────────────────────────────────────────────────
    print("Inserting Apartments...")
    apartments = [
        Apartment(
            apartment_number="A0801", block="A", floor=8, area_sqm=55.0,
            apartment_type="studio", status="occupied",
            interior_notes="Đầy đủ nội thất: giường tầng, bàn học, tủ quần áo",
        ),
        Apartment(
            apartment_number="A0802", block="A", floor=8, area_sqm=75.5,
            apartment_type="standard", status="occupied",
            interior_notes="Nội thất cao cấp, ban công rộng, view hồ thành phố",
        ),
        Apartment(
            apartment_number="A0803", block="A", floor=8, area_sqm=75.5,
            apartment_type="standard", status="occupied",
            interior_notes="Full nội thất, có máy lạnh 2 chiều",
        ),
        Apartment(
            apartment_number="A1201", block="A", floor=12, area_sqm=75.5,
            apartment_type="standard", status="occupied",
            interior_notes="Đã trang bị full nội thất cao cấp giường tầng, sofa",
        ),
        Apartment(
            apartment_number="A1202", block="A", floor=12, area_sqm=55.0,
            apartment_type="studio", status="available",
        ),
        Apartment(
            apartment_number="B0501", block="B", floor=5, area_sqm=120.0,
            apartment_type="duplex", status="occupied",
            interior_notes="Căn duplex 2 tầng, 3 phòng ngủ, có sân thượng",
        ),
        Apartment(
            apartment_number="B0502", block="B", floor=5, area_sqm=120.0,
            apartment_type="duplex", status="available",
        ),
        Apartment(
            apartment_number="B0601", block="B", floor=6, area_sqm=90.0,
            apartment_type="penthouse", status="occupied",
            interior_notes="Penthouse view toàn cảnh thành phố, 4 phòng ngủ",
        ),
        Apartment(
            apartment_number="C0101", block="C", floor=1, area_sqm=50.0,
            apartment_type="studio", status="occupied",
        ),
        Apartment(
            apartment_number="C0102", block="C", floor=1, area_sqm=50.0,
            apartment_type="studio", status="available",
        ),
    ]
    for a in apartments:
        await a.insert()

    # Shortcut references
    aA0801, aA0802, aA0803, aA1201, aA1202, aB0501, aB0502, aB0601, aC0101, aC0102 = apartments

    # ─── RESIDENTS ───────────────────────────────────────────────────────────
    print("Inserting Residents...")
    residents = [
        Resident(
            full_name="Nguyễn Đỗ Hoàng",
            date_of_birth=datetime(1990, 5, 20),
            identity_card="079090123456",
            phone_number="0987654321",
            email="hoang.nguyen@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Phạm Thu Hà",
            date_of_birth=datetime(1988, 8, 15),
            identity_card="079088001122",
            phone_number="0901234567",
            email="ha.pham@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Lê Minh Tuấn",
            date_of_birth=datetime(1995, 3, 10),
            identity_card="079095334455",
            phone_number="0912345678",
            email="tuan.le@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Trần Thị Lan",
            date_of_birth=datetime(1992, 11, 25),
            identity_card="079092667788",
            phone_number="0934123456",
            email="lan.tran@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Đặng Hùng Cường",
            date_of_birth=datetime(1985, 7, 3),
            identity_card="079085112233",
            phone_number="0941234567",
            email="cuong.dang@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Võ Ngọc Mai",
            date_of_birth=datetime(1998, 12, 18),
            identity_card="079098776655",
            phone_number="0951234567",
            email="mai.vo@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Hoàng Đình Phong",
            date_of_birth=datetime(1993, 4, 7),
            identity_card="079093445566",
            phone_number="0961234567",
            email="phong.hoang@gmail.com",
            temporary_residence_status="registered",
        ),
        Resident(
            full_name="Ngô Thị Hương Giang",
            date_of_birth=datetime(1991, 9, 30),
            identity_card="079091122334",
            phone_number="0971234567",
            email="giang.ngo@gmail.com",
            temporary_residence_status="registered",
        ),
    ]
    for r in residents:
        r.change_history.append(ResidentHistory(changes_summary="Khởi tạo dữ liệu"))
        await r.insert()

    rHoang, rHa, rTuan, rLan, rCuong, rMai, rPhong, rGiang = residents

    # Embed residents into apartments
    aA0801.current_residents.append(MinimalResidentInfo(
        resident_id=rHoang.id, full_name=rHoang.full_name,
        relationship="owner", status="living", move_in_date=datetime(2022, 3, 15)
    ))
    aA0802.current_residents.append(MinimalResidentInfo(
        resident_id=rHa.id, full_name=rHa.full_name,
        relationship="owner", status="living", move_in_date=datetime(2021, 6, 1)
    ))
    aA0802.current_residents.append(MinimalResidentInfo(
        resident_id=rTuan.id, full_name=rTuan.full_name,
        relationship="tenant", status="living", move_in_date=datetime(2023, 9, 10)
    ))
    aA0803.current_residents.append(MinimalResidentInfo(
        resident_id=rLan.id, full_name=rLan.full_name,
        relationship="owner", status="living", move_in_date=datetime(2020, 1, 20)
    ))
    aA1201.current_residents.append(MinimalResidentInfo(
        resident_id=rCuong.id, full_name=rCuong.full_name,
        relationship="owner", status="living", move_in_date=datetime(2023, 1, 15)
    ))
    aB0501.current_residents.append(MinimalResidentInfo(
        resident_id=rMai.id, full_name=rMai.full_name,
        relationship="owner", status="living", move_in_date=datetime(2021, 11, 5)
    ))
    aB0501.current_residents.append(MinimalResidentInfo(
        resident_id=rPhong.id, full_name=rPhong.full_name,
        relationship="tenant", status="living", move_in_date=datetime(2024, 2, 1)
    ))
    aB0601.current_residents.append(MinimalResidentInfo(
        resident_id=rGiang.id, full_name=rGiang.full_name,
        relationship="owner", status="living", move_in_date=datetime(2022, 8, 15)
    ))
    aC0101.current_residents.append(MinimalResidentInfo(
        resident_id=rTuan.id, full_name=rTuan.full_name,
        relationship="owner", status="living", move_in_date=datetime(2023, 7, 1)
    ))

    for a in [aA0801, aA0802, aA0803, aA1201, aB0501, aB0601, aC0101]:
        await a.save()

    # Create resident accounts
    print("Inserting Resident Accounts...")
    res_accs = []
    for i, r in enumerate(residents):
        acc = Account(
            username=f"resident{i+1}",
            password_hash=bcrypt.hashpw("resident123".encode(), bcrypt.gensalt()).decode(),
            role="resident",
            full_name=r.full_name,
            email=r.email,
            resident_id=r.id,
        )
        await acc.insert()
        res_accs.append(acc)

    # ─── VEHICLES ────────────────────────────────────────────────────────────
    print("Inserting Vehicles...")
    vehicles = [
        Vehicle(apartment_id=aA0801.id, resident_id=rHoang.id, license_plate="51H-123.45", vehicle_type="car", vehicle_name="Toyota Camry 2023"),
        Vehicle(apartment_id=aA0801.id, resident_id=rHoang.id, license_plate="51H1-456.78", vehicle_type="motorbike", vehicle_name="Honda Lead 2022"),
        Vehicle(apartment_id=aA0802.id, resident_id=rHa.id, license_plate="30A-123.45", vehicle_type="car", vehicle_name="Hyundai Tucson 2022"),
        Vehicle(apartment_id=aA0802.id, resident_id=rHa.id, license_plate="30A1-234.56", vehicle_type="motorbike", vehicle_name="Yamaha Noxa ZZ"),
        Vehicle(apartment_id=aA0802.id, resident_id=rTuan.id, license_plate="29A1-345.67", vehicle_type="motorbike", vehicle_name="Piaggio Liberty"),
        Vehicle(apartment_id=aB0501.id, resident_id=rMai.id, license_plate="60A-111.22", vehicle_type="car", vehicle_name="Kia Sorento 2023"),
        Vehicle(apartment_id=aB0501.id, resident_id=rMai.id, license_plate="60A1-333.44", vehicle_type="motorbike", vehicle_name="Honda Vision"),
        Vehicle(apartment_id=aB0501.id, resident_id=rPhong.id, license_plate="60B1-678.90", vehicle_type="motorbike", vehicle_name="Yamaha Grande"),
        Vehicle(apartment_id=aB0601.id, resident_id=rGiang.id, license_plate="47B-222.33", vehicle_type="car", vehicle_name="BMW 320i 2023"),
        Vehicle(apartment_id=aB0601.id, resident_id=rGiang.id, license_plate="47B1-555.66", vehicle_type="motorbike", vehicle_name="Honda SH Mode"),
        Vehicle(apartment_id=aC0101.id, resident_id=rTuan.id, license_plate="75K1-789.01", vehicle_type="motorbike", vehicle_name="Honda Wave Alpha"),
    ]
    for v in vehicles:
        await v.insert()

    # ─── FEE RATES ───────────────────────────────────────────────────────────
    print("Inserting Fee Rates...")
    fee_rates = [
        FeeRate(fee_type="management", unit="per_sqm", rate_value=1, unit_price=18000, effective_from=datetime(2024, 1, 1), description="Phí quản lý / m² tháng"),
        FeeRate(fee_type="electricity", unit="per_kwh", rate_value=1, unit_price=3800, effective_from=datetime(2024, 1, 1), description="Giá điện sinh hoạt / kWh"),
        FeeRate(fee_type="water", unit="per_cbm", rate_value=1, unit_price=12000, effective_from=datetime(2024, 1, 1), description="Giá nước sinh hoạt / m³"),
        FeeRate(fee_type="parking_car", unit="fixed", rate_value=1, unit_price=1500000, effective_from=datetime(2024, 1, 1), description="Phí gửi xe ô tô / tháng"),
        FeeRate(fee_type="parking_motorbike", unit="fixed", rate_value=1, unit_price=250000, effective_from=datetime(2024, 1, 1), description="Phí gửi xe máy / tháng"),
        # Old rates for historical data
        FeeRate(fee_type="management", unit="per_sqm", rate_value=1, unit_price=15000, effective_from=datetime(2023, 1, 1), effective_to=datetime(2023, 12, 31), description="Phí quản lý 2023"),
        FeeRate(fee_type="electricity", unit="per_kwh", rate_value=1, unit_price=3500, effective_from=datetime(2023, 1, 1), effective_to=datetime(2023, 12, 31), description="Giá điện 2023"),
        FeeRate(fee_type="water", unit="per_cbm", rate_value=1, unit_price=10000, effective_from=datetime(2023, 1, 1), effective_to=datetime(2023, 12, 31), description="Giá nước 2023"),
    ]
    for rate in fee_rates:
        await rate.insert()


    # ─── INVOICES (3 months history) ──────────────────────────────────────────
    print("Inserting Invoices...")
    # Get current fee rates
    mgmt_rate = 18000
    elec_rate = 3800
    water_rate = 12000
    car_rate = 1500000
    moto_rate = 250000

    invoice_data = [
        # (apt, month, year, status, paid_amount)
        (aA0801, 1, 2026, "paid", 2533500),
        (aA0801, 2, 2026, "paid", 2480000),
        (aA0801, 3, 2026, "pending", 0),
        (aA0802, 1, 2026, "paid", 3850500),
        (aA0802, 2, 2026, "paid", 3720000),
        (aA0802, 3, 2026, "partial", 1500000),
        (aA0803, 1, 2026, "paid", 2314000),
        (aA0803, 2, 2026, "paid", 2245000),
        (aA0803, 3, 2026, "pending", 0),
        (aA1201, 1, 2026, "paid", 2895500),
        (aA1201, 2, 2026, "pending", 0),
        (aB0501, 1, 2026, "paid", 5134000),
        (aB0501, 2, 2026, "paid", 4980000),
        (aB0501, 3, 2026, "pending", 0),
        (aB0601, 1, 2026, "paid", 4466000),
        (aB0601, 2, 2026, "paid", 4300000),
        (aB0601, 3, 2026, "partial", 2000000),
        (aC0101, 1, 2026, "paid", 1840000),
        (aC0101, 2, 2026, "paid", 1790000),
        (aC0101, 3, 2026, "pending", 0),
    ]

    invoices = []
    for apt, month, year, status, paid_amt in invoice_data:
        area = apt.area_sqm
        line_items = [
            InvoiceLineItem(fee_type="management", description=f"Phí quản lý {area}m²", quantity=area, unit_price=mgmt_rate, amount=area * mgmt_rate),
        ]
        # Random consumption for demo
        import random
        elec_consumption = random.randint(100, 400)
        water_consumption = random.randint(5, 20)

        line_items.append(InvoiceLineItem(
            fee_type="electricity", description=f"Tiền điện {elec_consumption} kWh",
            quantity=elec_consumption, unit_price=elec_rate, amount=round(elec_consumption * elec_rate, 2)
        ))
        line_items.append(InvoiceLineItem(
            fee_type="water", description=f"Tiền nước {water_consumption} m³",
            quantity=water_consumption, unit_price=water_rate, amount=round(water_consumption * water_rate, 2)
        ))

        subtotal = sum(li.amount for li in line_items)
        amount_due = subtotal

        inv = Invoice(
            invoice_code=f"INV-{year}{month:02d}-{apt.block}{apt.apartment_number}",
            apartment_id=apt.id,
            billing_period_month=month,
            billing_period_year=year,
            line_items=line_items,
            subtotal=subtotal,
            total_amount=subtotal,
            amount_due=amount_due,
            status=status,
            due_date=datetime(year, month, 15),
            paid_amount=paid_amt,
            paid_date=datetime(year, month, 10) if status == "paid" else None,
            payment_method="bank_transfer" if status == "paid" else None,
        )
        await inv.insert()
        invoices.append(inv)

    # ─── NOTIFICATIONS ───────────────────────────────────────────────────────
    print("Inserting Notifications...")
    notifications = [
        Notification(
            title="Thông báo lịch cắt nước định kỳ Block A",
            content="<p>Kính gửi quý cư dân Block A,</p><p>Do công tác bảo trì định kỳ, ban quản lý sẽ cắt nước vào <strong>Chủ nhật tuần sau (11/05/2026)</strong> từ <strong>8h00 - 12h00</strong>. Vui lòng tích trữ nước trước giờ cắt.</p><p>Xin cảm ơn sự hợp tác của quý cư dân.</p>",
            scope_type="block", target_value="A", created_by=admin.id
        ),
        Notification(
            title="Quy định giờ giấc yên tĩnh khu chung cư",
            content="<p>Để đảm bảo chất lượng cuộc sống cho mọi cư dân, Ban quản lý nhắc nhở về <strong>giờ giấc yên tĩnh</strong> trong khu chung cư:</p><ul><li>Giờ yên tĩnh: <strong>22h00 - 07h00</strong></li><li>Cấm gây tiếng ồn, mở nhạc lớn trong giờ nghỉ</li></ul><p>Tầng 8 Block B đã có khiếu nại về tiếng ồn. Chúng tôi hy vọng mọi cư dân tuân thủ để tránh bị phạt.</p>",
            scope_type="all", created_by=admin.id
        ),
        Notification(
            title="Cập nhật biểu phí gửi xe từ 01/01/2026",
            content="<p>Thông báo thay đổi giá dịch vụ gửi xe áp dụng từ <strong>01/01/2026</strong>:</p><table><tr><td>Ô tô</td><td>1,500,000 đ/tháng</td></tr><tr><td>Xe máy</td><td>250,000 đ/tháng</td></tr></table><p>Phí quản lý tăng từ 15,000 lên 18,000 đ/m². Điện sinh hoạt: 3,800 đ/kWh. Nước: 12,000 đ/m³.</p>",
            scope_type="all", created_by=admin.id
        ),
        Notification(
            title="Khai báo thông tin PCCC - Cần thiết",
            content="<p>Định kỳ hàng quý, Ban quản lý kiểm tra thiết bị PCCC. Vui lòng đảm bảo bình chữa cháy trong căn hộ còn hạn và không bị di dời khỏi vị trí quy định.</p><p>Kiểm tra sẽ diễn ra vào <strong>ngày 15/05/2026</strong>. Căn hộ nào không có bình hoặc bình hết hạn sẽ bị ghi nhận và nhắc nhở.</p>",
            scope_type="all", created_by=admin.id
        ),
        Notification(
            title="Sự cố thang máy Block B - Đã sửa xong",
            content="<p>Thang máy B2 Block B đã gặp sự cố kỹ thuật vào ngày 28/04. Sau 2 ngày sửa chữa, thang máy đã hoạt động trở lại bình thường từ chiều 30/04.</p><p>Ban quản lý xin lỗi về sự bất tiện này.</p>",
            scope_type="block", target_value="B", created_by=admin.id
        ),
        Notification(
            title="Thông báo thu phí quản lý tháng 4/2026",
            content="<p>Đợt thu phí quản lý tháng 4/2026 sẽ được thực hiện vào ngày <strong>05/05/2026</strong>. Vui lòng thanh toán đúng hạn để tránh phí chậm nộp.</p><p>Căn hộ có công nợ từ tháng trước sẽ được cộng vào hóa đơn này.</p>",
            scope_type="all", created_by=admin.id
        ),
    ]
    for n in notifications:
        await n.insert()

    # ─── TICKETS ────────────────────────────────────────────────────────────
    print("Inserting Tickets...")
    tickets = [
        Ticket(
            ticket_code="BM-X92KVL",
            category="technical",
            title="Bóng đèn hành lang tầng 12 Block A chớp liên tục",
            description="Bóng đèn trước cửa phòng A1201 bị hỏng, chớp tắt liên tục từ tối qua gây khó chịu. Có thể cần thay bóng mới hoặc kiểm tra mạch điện.",
            status="processing",
            resident_id=rCuong.id,
            apartment_id=aA1201.id,
        ),
        Ticket(
            ticket_code="BM-M81RPQ",
            category="cleaning",
            title="Khu vực thang máy Block B cửa bẩn",
            description="Sàn khu vực chờ thang máy Block B tầng 5-6 bẩn, có vết đổ nước lâu ngày không được lau chùi.",
            status="open",
            resident_id=rMai.id,
            apartment_id=aB0501.id,
        ),
        Ticket(
            ticket_code="BM-P47HNG",
            category="security",
            title="Camera hành lang tầng 8 Block A bị mờ",
            description="Camera phía cuối hành lang tầng 8 Block A hướng ra cầu thang bộ không rõ hình ảnh, cần kiểm tra ống kính.",
            status="open",
            resident_id=rLan.id,
            apartment_id=aA0803.id,
        ),
        Ticket(
            ticket_code="BM-R29WXN",
            category="vehicle_registration",
            title="Đăng ký xe máy mới Honda Vision",
            description='{"license_plate":"2E-55667","vehicle_type":"motorbike","vehicle_name":"Honda Vision 2025"}',
            status="pending_close",
            resident_id=rHa.id,
            apartment_id=aA0802.id,
        ),
        Ticket(
            ticket_code="BM-T14BQW",
            category="maintenance",
            title="Cửa sổ phòng ngủ bị kẹt, không đóng được",
            description="Cửa sổ nhôm ở phòng ngủ phía Đông căn A0801 bị cong khung, cửa không đóng kín được gây ồn ào và bụi bẩn. Cần bảo trì lại.",
            status="closed",
            resident_id=rHoang.id,
            apartment_id=aA0801.id,
        ),
        Ticket(
            ticket_code="BM-Y38KMP",
            category="vehicle_registration",
            title="Đăng ký ô tô mới Kia Seltos",
            description='{"license_plate":"60B-888.99","vehicle_type":"car","vehicle_name":"Kia Seltos 2024"}',
            status="closed",
            resident_id=rGiang.id,
            apartment_id=aB0601.id,
        ),
        Ticket(
            ticket_code="BM-C51VBN",
            category="utility",
            title="Nước yếu tầng 1 Block C",
            description="Từ sáng nay (03/05) nước ở các căn hộ tầng 1 Block C rất yếu, có lúc không có nước chảy. Kiểm tra bồn nước máy trên.",
            status="processing",
            resident_id=rTuan.id,
            apartment_id=aC0101.id,
        ),
    ]
    for t in tickets:
        await t.insert()

    # Add ticket responses
    resp_1 = TicketResponse(sender_role="admin", sender_id=admin.id, message="Ban quản lý đã tiếp nhận và cử bộ phận kỹ thuật kiểm tra trong 30 phút. Xin cảm ơn.")
    resp_2 = TicketResponse(sender_role="resident", sender_id=rCuong.id, message="Cảm ơn ban quản lý đã phản hồi nhanh chóng.")
    tickets[0].responses.extend([resp_1, resp_2])
    await tickets[0].save()

    resp_3 = TicketResponse(sender_role="admin", sender_id=admin.id, message="Đã báo nhân viên vệ sinh kiểm tra và dọn dẹp khu vực. Sẽ hoàn thành trong hôm nay.")
    tickets[1].responses.append(resp_3)
    await tickets[1].save()

    resp_4 = TicketResponse(sender_role="admin", sender_id=admin.id, message="Cảm ơn báo cáo. Camera đã được kiểm tra, ống kính bị hơi nước bám. Sẽ thay mới trong tuần này.")
    tickets[2].responses.append(resp_4)
    await tickets[2].save()

    resp_5 = TicketResponse(sender_role="admin", sender_id=admin.id, message="Đã duyệt đăng ký xe máy Honda Vision 2E-55667. Xe đã được thêm vào hệ thống.")
    tickets[3].responses.append(resp_5)
    await tickets[3].save()

    resp_6 = TicketResponse(sender_role="admin", sender_id=admin.id, message="Đã cử thợ sửa cửa sổ, hoàn thành trong 2 tiếng. Cửa đã hoạt động bình thường.")
    tickets[4].responses.append(resp_6)
    await tickets[4].save()

    resp_7 = TicketResponse(sender_role="system", sender_id=rGiang.id, message="✅ Yêu cầu đóng ticket đã được đồng ý. Ticket đã được đóng.")
    tickets[5].responses.append(resp_7)
    await tickets[5].save()

    resp_8 = TicketResponse(sender_role="admin", sender_id=admin.id, message="Đã kiểm tra bồn nước máy, cần xả cặn đường ống. Thợ sẽ làm trong ngày mai (04/05).")
    tickets[6].responses.append(resp_8)
    await tickets[6].save()

    # ─── AUDIT LOGS (sample) ──────────────────────────────────────────────────
    print("Inserting Audit Logs...")
    audit_entries = [
        AuditLog(action="create", resource_type="resident", resource_id=str(rHoang.id), actor_id=str(admin.id), actor_username="admin", actor_role="admin", description="Tạo cư dân Nguyễn Đỗ Hoàng"),
        AuditLog(action="create", resource_type="vehicle", resource_id=str(vehicles[0].id), actor_id=str(admin.id), actor_username="admin", actor_role="admin", description="Đăng ký xe 51H-123.45 Toyota Camry"),
        AuditLog(action="create", resource_type="invoice", resource_id=str(invoices[0].id), actor_id=str(ketoan.id), actor_username="ketoan", actor_role="accountant", description="Tạo hóa đơn tháng 1/2026 căn A0801"),
        AuditLog(action="update", resource_type="fee_rate", resource_id=str(fee_rates[0].id), actor_id=str(ketoan.id), actor_username="ketoan", actor_role="accountant", description="Cập nhật phí quản lý: 15000 -> 18000"),
        AuditLog(action="create", resource_type="notification", resource_id=str(notifications[0].id), actor_id=str(admin.id), actor_username="admin", actor_role="admin", description="Tạo thông báo cắt nước Block A"),
        AuditLog(action="reply", resource_type="ticket", resource_id=str(tickets[0].id), actor_id=str(admin.id), actor_username="admin", actor_role="admin", description="Phản hồi ticket BM-X92KVL"),
        AuditLog(action="approve", resource_type="ticket", resource_id=str(tickets[5].id), actor_id=str(admin.id), actor_username="admin", actor_role="admin", description="Duyệt đăng ký xe 60B-888.99"),
        AuditLog(action="generate", resource_type="invoice", resource_id=str(invoices[1].id), actor_id=str(ketoan.id), actor_username="ketoan", actor_role="accountant", description="Tạo hóa đơn tự động tháng 2/2026 căn A0801"),
    ]
    for a in audit_entries:
        await a.insert()

    print("SEED DATA COMPLETED SUCCESSFULLY!")
    print("Demo accounts:")
    print("  admin / admin123       -> Admin portal")
    print("  ketoan / ketoan123     -> Accountant portal")
    print("  resident1 / resident123 -> Hoang (A0801)")
    print("  resident2 / resident123 -> Ha (A0802)")
    print("  resident3 / resident123 -> Tuan (A0802/C0101)")


if __name__ == "__main__":
    asyncio.run(seed_data())