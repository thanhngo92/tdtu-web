# 🧩 Tech Stack

- **Frontend:** React (JavaScript), Bootstrap  
- **Backend:** PHP  
- **Database:** MySQL  
- **Protocol:** RESTful API, WebSocket  

---

# 🏗️ Architecture

- Client–Server Architecture  
- Three-layer Architecture (Frontend – Backend – Database)  
- MVC Pattern (Backend) 
- Single Page Application (SPA) 

---

# 🎯 Frontend Pattern

**Flow:**  
User → Page → (Hook) → Service → Backend  

**Notes:**

- **Page:** Entry point (UI)  
- **Hook:** Dùng cho logic tái sử dụng (optional)
- **Service:** API layer, giao tiếp backend  
- **Backend:** Xử lý dữ liệu  

---

# ⚙️ Backend Pattern

**Flow:**  
Client → Route → Controller → Service → Database  

**Notes:**

- **Route:** Định nghĩa endpoint (URL)  
- **Controller:** Xử lý request/response  
- **Service:** Business logic  
- **Database:** Lưu trữ dữ liệu  

---

# 🔄 Fullstack Flow

User → Page → (Hook) → Service (FE)  
→ Route → Controller → Service (BE) → Database  
→ Response → Page → UI  

---

# 🌐 Frontend Entry Point

**Flow:**  
Browser → index.html → main.jsx → App → UI  

**Notes:**

- **index.html:** File HTML gốc, được browser load đầu tiên  
- **#root:** Vị trí React render ứng dụng  
- **main.jsx:** Khởi tạo React và mount vào DOM  
- **App:** Root component của toàn bộ UI  