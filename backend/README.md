# Backend

Backend của project là một REST API viết bằng PHP thuần, dùng MySQL để lưu trữ dữ liệu và session PHP để xác thực người dùng.

## Mục tiêu

Phần này xử lý các nhóm chức năng chính theo rubric:

- xác thực tài khoản: đăng ký, kích hoạt, đăng nhập, đăng xuất, quên mật khẩu, đặt lại mật khẩu
- thông tin người dùng: profile, avatar, đổi mật khẩu, preferences
- note management: CRUD note, pin, lock bằng password riêng, chia sẻ note, nhận note được chia sẻ
- label management: tạo, sửa, xóa label và gắn label cho note

## Cấu trúc thư mục

```text
backend/
├─ config/        # cấu hình app, DB, init schema
├─ controllers/   # nhận request và trả response JSON
├─ core/          # Database, Router, Request, Response, Controller base
├─ middleware/    # middleware xác thực
├─ models/        # truy vấn dữ liệu theo từng bảng
├─ routes/        # định nghĩa API routes
├─ services/      # business logic
├─ .env           # cấu hình local thật
├─ .env.example   # mẫu env
└─ index.php      # entry point
```

## Công nghệ sử dụng

- PHP
- MySQL
- PHP sessions
- JSON REST API

## Yêu cầu môi trường

- PHP 8 trở lên
- MySQL hoặc MariaDB
- DB local hiện tại của project đang chạy tốt với XAMPP MySQL ở port `3307`

## Cấu hình môi trường

Tạo file `backend/.env` từ `backend/.env.example`.

Ví dụ local:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
APP_DEBUG=true

DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=notes_app
DB_USER=root
DB_PASS=tdtuweb

MAIL_MODE=log
MAIL_FROM=noreply@localhost
MAIL_LOG_FILE=emails.log
```

Các biến chính:

- `APP_URL`: URL backend
- `FRONTEND_URL`: URL frontend, dùng để tạo link activate/reset password
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`: cấu hình database
- `MAIL_MODE`: hiện tại dùng `log`
- `MAIL_LOG_FILE`: nơi ghi email giả lập để lấy link activate/reset

## Khởi tạo database

Chạy:

```powershell
php backend\config\init.php
```

Lệnh này sẽ:

- tạo database nếu chưa có
- tạo các bảng cần thiết

## Chạy local

Từ thư mục gốc project:

```powershell
php -S localhost:8000 -t backend
```

Backend sẽ chạy tại:

```text
http://localhost:8000
```

## Các API chính

### Auth

- `POST /api/auth/register`
- `POST /api/auth/activate`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/reset-password-otp`

### User

- `GET /api/users/me`
- `PUT /api/users/me/profile`
- `PUT /api/users/me/password`
- `PUT /api/users/me/preferences`

### Notes

- `GET /api/notes`
- `GET /api/notes/{id}`
- `POST /api/notes`
- `PUT /api/notes/{id}`
- `DELETE /api/notes/{id}`
- `POST /api/notes/{id}/pin`
- `POST /api/notes/{id}/lock`
- `POST /api/notes/{id}/verify-password`

### Sharing

- `GET /api/shared-notes`
- `POST /api/notes/{id}/share`
- `POST /api/notes/{id}/revoke-share`

### Labels

- `GET /api/labels`
- `POST /api/labels`
- `PUT /api/labels/{id}`
- `DELETE /api/labels/{id}`

## Luồng xử lý chính

Kiến trúc đang theo hướng:

```text
Route -> Controller -> Service -> Model -> MySQL
```

- `routes/`: map URL vào controller
- `controllers/`: lấy dữ liệu request, gọi service, trả JSON
- `services/`: xử lý business logic
- `models/`: truy vấn DB

## Lưu ý khi phát triển

- backend đọc env trực tiếp từ `backend/.env`
- email hiện được ghi vào file log thay vì gửi mail thật
- source đang ưu tiên code đơn giản, dễ đọc, đủ dùng cho rubric
- frontend gọi backend qua `/api`, nên khi deploy nên ưu tiên reverse proxy cùng domain nếu có thể

## Chuẩn bị deploy

Khi deploy public URL:

- cập nhật `APP_URL`
- cập nhật `FRONTEND_URL`
- cập nhật toàn bộ biến DB production
- đặt `APP_DEBUG=false`

Nếu frontend và backend cùng domain:

- frontend có thể tiếp tục gọi `/api`
- sẽ đơn giản hơn cho cookie, session và CORS
