# 🏢 BlueMoon - Hệ sinh thái Quản lý Chung cư

BlueMoon là một nền tảng quản lý khu dân cư toàn diện (Apartment Management System). Hệ thống cung cấp hai phân hệ độc lập: Một **Admin Portal** mạnh mẽ trên màn hình PC dành cho Ban Quản Lý, và một **Resident App** (giao diện Mobile-first) dành cho Cư dân tiện theo dõi thông tin.

## 🌟 Tính năng Cốt lõi
*   **Hành chính Cư dân:** Quản lý Phân phòng, thông tin cá nhân, định danh CCCD và theo dõi xe cộ.
*   **Truyền Thông:** Ban BQL có thể phát "Loa thông báo" siêu tốc giới hạn theo từng Tầng, Block hoặc toàn khu.
*   **Support Tickets:** Cư dân nộp yêu cầu sự cố từ nhà, Admin tiếp nhận và phản hồi theo luồng hội thoại Ticket chuyên nghiệp.
*   **System Status:** Giao diện Quản lý tự động theo dõi Ping mạng Backend (Real-time).

---

## 🛠 Ngăn Xếp Công Nghệ (Tech Stack)

### **Backend (Micro-framework)**
*   **Core:** FastAPI (Python)
*   **Cơ sở Dữ liệu:** MongoDB (Atlas Cloud)
*   **ODM:** Beanie & Motor (Hỗ trợ Async Queries hoàn hảo).

### **Frontend (SPA)**
*   **Core:** React 19 + Vite.
*   **CSS & Stylings:** Tailwind CSS (v4).
*   **Component UI:** Shadcn UI + Lucide Icons.
*   **Routing & State:** React Router DOM + Axios + In-memory Relational Joins.

---

## ⚙️ Hướng dẫn Khởi tạo Dự Án (Start Guide)

Dự án có cấu trúc tách biệt 2 mảng Front-Back. Vui lòng mở 2 cửa sổ Terminal (hoặc split-terminal) để chạy song song.

### Bước 1: Khởi động Backend (FastAPI)
Điều kiện: Cài sẵn Python 3.9+ 

1. Mở Terminal, trỏ vào thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
3. Chạy Máy chủ API:
   ```bash
   uvicorn main:app --reload
   ```
   Backend sẽ ở chế độ chực chờ tại `http://localhost:8000`.

### Bước 2: Khởi động Frontend (React / Vite)
Điều kiện: Cài sẵn Node.js (v18+)

1. Mở Terminal số 2, trỏ vào thư mục React:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói thư viện Node (Bao gồm Shadcn và Tailwind):
   ```bash
   npm install
   ```
3. Chạy môi trường Dev:
   ```bash
   npm run dev
   ```
   Frontend sẽ có mặt ở `http://localhost:5173`.

---

## 🔑 Đăng Nhập Hệ Thống

Ứng dụng hiện đang được gắn cấu hình `Mock Auth` (Đăng nhập không nối CSDL) để tiện lợi cho việc Test UI UX ngay lập tức - và vì sprint 1 chưa yêu cầu Authentication. 

*   Mở trình duyệt truy cập: `http://localhost:5173/login`
*   **Vào luồng Quản Lý:** Điền `admin` vào ô Username (Bỏ trống Password). Bạn sẽ được Routing vào Admin Dashboard.
*   **Vào luồng Cư dân:** Điền `resident` vào ô Username. Bạn sẽ được Routing vào App Mobile.