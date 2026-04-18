# Backend

Backend được xây dựng bằng PHP thuần theo hướng MVC đơn giản, cung cấp REST API cho ứng dụng ghi chú. Hệ thống dùng MySQL để lưu trữ dữ liệu và khởi tạo schema bằng script `config/init.php`.

## Công nghệ sử dụng

- PHP
- MySQL
- REST API
- Session authentication

## Chức năng chính

- Đăng ký, kích hoạt tài khoản, đăng nhập, đăng xuất
- Quên mật khẩu và đặt lại mật khẩu bằng token hoặc OTP
- Lấy thông tin người dùng hiện tại và cập nhật hồ sơ
- Tạo, sửa, xóa, ghim và khóa ghi chú
- Chia sẻ ghi chú cho người dùng khác
- Quản lý nhãn

## Cấu trúc chính

- `index.php`: entry point của API
- `routes`: định nghĩa endpoint
- `controllers`: xử lý request và response
- `services`: business logic
- `models`: thao tác dữ liệu và khởi tạo bảng
- `core`: các thành phần nền như `Router`, `Request`, `Response`, `Database`
- `config/config.php`: cấu hình database và app
- `config/init.php`: script khởi tạo database và bảng

## Cấu hình hiện tại

Theo file `config/config.php`, backend đang dùng:

- Host: `localhost`
- Port MySQL: `3307`
- Database: `notes_app`
- Username: `root`
- Password: `tdtuweb`
- App URL: `http://localhost:8000`

Bạn có thể chỉnh lại các giá trị này trong `config/config.php` trước khi chạy.

## Yêu cầu

- PHP 8 trở lên
- MySQL đang chạy
- PHP có extension PDO MySQL

## Khởi tạo cơ sở dữ liệu

Chạy script sau trong thư mục `backend`:

```bash
php config/init.php
```

Script này sẽ:

- Tạo database nếu chưa tồn tại
- Kết nối tới MySQL
- Tạo các bảng cần thiết cho ứng dụng

## Chạy server local

Trong thư mục `backend`, chạy:

```bash
php -S localhost:8000 index.php
```

API sẽ sẵn sàng tại:

```text
http://localhost:8000
```

## Một số endpoint tiêu biểu

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/users/me`
- `GET /api/notes`
- `POST /api/notes`
- `POST /api/notes/{id}/share`
- `GET /api/labels`

## Ghi chú phát triển

- Frontend local đang proxy `/api` sang `http://localhost:8000`
- Email không được gửi thật trong môi trường hiện tại; nội dung email được ghi vào file `emails.log` ở thư mục gốc project
- Một số route người dùng yêu cầu đăng nhập qua session
