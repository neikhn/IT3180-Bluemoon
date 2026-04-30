# 🏢 BlueMoon - Hệ sinh thái Quản lý Chung cư Toàn diện

BlueMoon là một nền tảng quản lý khu dân cư hiện đại (Apartment Management System). Hệ thống cung cấp ba phân hệ độc lập được tối ưu hóa cho từng đối tượng người dùng:
- **Admin Portal** (PC): Dành cho Ban Quản Lý điều hành hành chính.
- **Accountant Portal** (PC): Dành cho bộ phận Kế toán quản lý tài chính và hóa đơn.
- **Resident App** (Mobile-first): Dành cho Cư dân theo dõi thông tin và yêu cầu hỗ trợ.

## 🌟 Tính năng Cốt lõi

### 1. Quản lý Hành chính & Cư dân
- **Căn hộ & Cư dân:** Quản lý sơ đồ tòa nhà, thông tin định danh (CCCD), và lịch sử biến động nhân khẩu.
- **Phương tiện:** Đăng ký và quản lý gửi xe (Ô tô/Xe máy) với quy trình kiểm soát hạn mức nghiêm ngặt.

### 2. Kế toán & Tài chính (Mới)
- **Định mức phí:** Cấu hình linh hoạt đơn giá điện, nước, phí quản lý và phí gửi xe theo từng thời kỳ.
- **Hóa đơn thông minh:** Tự động phát hành hóa đơn hàng loạt, tích hợp ghi số điện nước trực tiếp vào quy trình tạo hóa đơn.
- **Báo cáo tài chính:** Dashboard theo dõi doanh thu, tỷ lệ thu phí và nợ đọng theo thời gian thực.

### 3. Truyền thông & Hỗ trợ
- **Thông báo đa tầng:** Phát tin tức siêu tốc theo từng Block, Tầng hoặc toàn bộ cư dân.
- **Ticket hỗ trợ:** Quy trình tiếp nhận và xử lý sự cố qua luồng hội thoại Ticket trực quan.

### 4. Hệ thống & Bảo mật
- **RBAC:** Phân quyền người dùng chặt chẽ (Admin, Accountant, Resident).
- **Audit Logs:** Nhật ký hệ thống ghi lại mọi biến động dữ liệu để phục vụ đối soát.

---

## 🛠 Ngăn Xếp Công Nghệ (Tech Stack)

### **Backend**
- FastAPI (Python) + MongoDB (Atlas Cloud)
- **Beanie ODM:** Hỗ trợ Async Queries và Schema validation mạnh mẽ.
- **Security:** JWT Auth + Bcrypt hashing.

### **Frontend**
- React 19 + Vite + Tailwind CSS v4.
- **UI Components:** Shadcn UI + Lucide Icons + Recharts.
- **UX:** Glassmorphism design, theme toggle (Dark/Light mode).

---

## ⚙️ Hướng dẫn Khởi chạy Dự Án

### Bước 1: Khởi động Backend
1. Di chuyển vào thư mục `backend`.
2. Cài đặt thư viện: `pip install -r requirements.txt`.
3. Chạy Server: `uvicorn main:app --reload`.
Server API sẽ chạy tại: `http://localhost:8000`.

### Bước 2: Khởi động Frontend
1. Di chuyển vào thư mục `frontend`.
2. Cài đặt thư viện: `npm install`.
3. Chạy Dev: `npm run dev`.
Ứng dụng sẽ chạy tại: `http://localhost:5173`.

---

## 🔑 Đăng Nhập Hệ Thống

Hệ thống sử dụng tài khoản thực trong Database. Dưới đây là các tài khoản Seed mặc định (Mật khẩu chung: `admin123` hoặc `resident123` tùy vai trò):

*   **Quản trị viên (Admin):** `admin` / `admin123`
*   **Kế toán (Accountant):** `ketoan` / `ketoan123`
*   **Cư dân (Resident):** `resident1` / `resident123`

Truy cập trang đăng nhập tại: `http://localhost:5173/login`