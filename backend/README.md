
---

# README.md cho BE

```md
# Backend Structure Guide

## Mục tiêu
Backend chịu trách nhiệm về:

- Xử lý nghiệp vụ chính
- Xác thực / phân quyền
- Làm việc với database MySQL
- Cung cấp RESTful API cho frontend
- Phát sự kiện realtime qua WebSocket
- Kiểm tra tính hợp lệ dữ liệu ở mức hệ thống
- Quản lý bảo mật, quyền truy cập, ownership, sharing, note password

## Techstack
- PHP
- MySQL
- RESTful API
- WebSocket

## Nguyên tắc tách nghiệp vụ
Backend là nơi xử lý:
- Business logic
- Permission logic
- Validation cuối cùng
- Data persistence
- Security rules
- Share/edit/view rules
- Password hashing
- Query và transaction

Backend không làm:
- Không render UI
- Không xử lý layout
- Không giữ logic hiển thị thuần túy

## Kiến trúc xử lý chuẩn

```text
Route -> Controller -> Service -> Repository/Model -> MySQL

## Cấu trúc thư mục

```bash
backend/
├── config/       # Chứa cấu hình hệ thống: database, app config, mail config, websocket config...
├── controllers/  # Chứa controller nhận request, gọi service và trả response
├── core/         # Chứa phần lõi của hệ thống: bootstrap app, base classes, database connection, router, request/response handler...
├── middleware/   # Chứa middleware: auth, permission, request validation, session/token check...
├── models/       # Chứa model hoặc cấu trúc dữ liệu làm việc với database
├── routes/       # Chứa khai báo các API routes và ánh xạ route -> controller
├── services/     # Chứa business logic / nghiệp vụ chính của hệ thống
├── index.php     # Entry point của backend, nơi khởi động ứng dụng
└── README.md     # Tài liệu mô tả cấu trúc, cách chạy và quy ước phân tách trách nhiệm