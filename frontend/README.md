# Frontend Structure Guide

## Mục tiêu
Frontend chỉ chịu trách nhiệm về:

- Hiển thị giao diện
- Xử lý tương tác người dùng
- Validate dữ liệu ở mức client
- Gọi RESTful API đến backend
- Nhận/sync dữ liệu realtime qua WebSocket
- Quản lý state hiển thị: loading, error, success
- Không chứa nghiệp vụ lõi, không thao tác DB, không tự quyết định rule nghiệp vụ quan trọng

## Techstack
- React (js)
- CSS
- Bootstrap
- RESTful API
- WebSocket

## Nguyên tắc tách nghiệp vụ
Frontend chỉ làm:
- UI/UX
- Render dữ liệu
- Form handling
- Client-side validation
- Gọi API
- Nhận realtime update

Frontend không làm:
- Không xử lý business rule chính
- Không kiểm tra quyền truy cập cuối cùng
- Không thao tác trực tiếp database
- Không quyết định logic lưu trữ
- Không xử lý xác thực bảo mật cốt lõi

## Cấu trúc thư mục

```bash
frontend/
├── public/              # Tài nguyên tĩnh dùng trực tiếp
├── src/
│   ├── components/      # UI component tái sử dụng
│   ├── hooks/           # Custom hook dùng chung
│   ├── pages/           # Các màn hình chính của ứng dụng
│   ├── services/        # Gọi API REST, websocket và các service phía frontend
│   ├── context/           # State dùng chung của frontend
│   ├── utils/           # Hàm tiện ích dùng chung
│   ├── App.css          # CSS tổng của ứng dụng
│   ├── App.jsx          # Root component và routing chính
│   └── index.jsx        # Entry point của React
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── READEME.md
└── vite.config.js