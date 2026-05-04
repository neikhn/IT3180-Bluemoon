import asyncio
from datetime import datetime
from core.db_config import init_db
from models.account import Account
from models.apartment import Apartment, MinimalResidentInfo
from models.resident import Resident, ResidentHistory
from models.vehicle import Vehicle
from models.ticket import Ticket, TicketResponse
from models.notification import Notification

async def seed_data():
    print("Initializing Database connection...")
    await init_db()
    
    print("Clearing old dummy data (for clean slate)...")
    await Account.find_all().delete()
    await Apartment.find_all().delete()
    await Resident.find_all().delete()
    await Vehicle.find_all().delete()
    await Ticket.find_all().delete()
    await Notification.find_all().delete()
    
    print("Inserting Accounts...")
    admin = Account(username="admin_bluemoon", password_hash="hashed_admin_pass", role="admin")
    await admin.insert()
    
    user1 = Account(username="nguyendohoang", password_hash="hashed_user_pass", role="resident")
    await user1.insert()
    
    print("Inserting Apartments...")
    apt_1 = Apartment(
        apartment_number="A1201",
        block="A",
        floor=12,
        area_sqm=75.5,
        apartment_type="standard",
        interior_notes="Đã trang bị full nội thất cao cấp giường tầng, sofa",
        status="occupied"
    )
    await apt_1.insert()
    
    apt_2 = Apartment(
        apartment_number="B0502",
        block="B",
        floor=5,
        area_sqm=120.0,
        apartment_type="duplex",
        status="available"
    )
    await apt_2.insert()

    print("Inserting Residents...")
    res_1 = Resident(
        account_id=user1.id,
        full_name="Nguyễn Đỗ Hoàng",
        date_of_birth=datetime(1990, 5, 20),
        identity_card="079090123456",
        phone_number="0987654321",
        email="hoang.nguyen123@gmail.com",
        temporary_residence_status="registered"
    )
    res_1.change_history.append(ResidentHistory(changes_summary="Khởi tạo dữ liệu"))
    await res_1.insert()
    
    # Embed vào Căn hộ A1201
    embed_info = MinimalResidentInfo(
        resident_id=res_1.id,
        full_name=res_1.full_name,
        relationship="owner",
        status="living",
        move_in_date=datetime(2023, 1, 15)
    )
    apt_1.current_residents.append(embed_info)
    await apt_1.save()
    
    print("Inserting Vehicles...")
    veh_1 = Vehicle(
        apartment_id=apt_1.id,
        resident_id=res_1.id,
        license_plate="51H-123.45",
        vehicle_type="car"
    )
    await veh_1.insert()
    
    veh_2 = Vehicle(
        apartment_id=apt_1.id,
        resident_id=res_1.id,
        license_plate="59T1-999.99",
        vehicle_type="motorbike"
    )
    await veh_2.insert()
    
    print("Inserting Notifications...")
    notif = Notification(
        title="[Khẩn cấp] Thông báo cắt nước cục bộ Block A",
        content="<p>Kính gửi quý cư dân Block A,</p><p>Vào lúc 23:00 tối nay, ban quản lý sẽ tiến hành bảo trì máy bơm nước. Vui lòng tích trữ nước dùng tạm thời. Rất xin lỗi vì sự bất tiện này!</p>",
        scope_type="block",
        target_value="A",
        created_by=admin.id
    )
    await notif.insert()
    
    print("Inserting Tickets...")
    tick = Ticket(
        ticket_code="BM-X92KVL",
        category="technical",
        title="Bóng đèn hành lang tầng 12 Block A chớp liên tục",
        description="Bóng đèn trước cửa phòng A1201 bị hỏng, chớp tắt liên tục từ tối qua gây khó chịu.",
        status="processing",
        resident_id=res_1.id,
        apartment_id=apt_1.id
    )
    
    # Giả lập Admin trả lời Ticket
    tick.responses.append(TicketResponse(
        sender_role="admin",
        sender_id=admin.id,
        message="Ban quản lý đã tiếp nhận thông tin và cử bộ phận Kỹ thuật lên kiểm tra thay thế trong 30 phút nữa. Xin cảm ơn cư dân."
    ))
    await tick.insert()
    
    print("🎉 SEED DATA COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(seed_data())
