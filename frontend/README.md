# Frontend

Ứng dụng frontend được xây dựng bằng React và Vite, đóng vai trò giao diện cho hệ thống ghi chú. Frontend giao tiếp với backend thông qua các API dưới prefix `/api`, đồng thời dùng Vite proxy để chuyển tiếp request sang server PHP ở `http://localhost:8000`.

## Công nghệ sử dụng

- React 19
- Vite 8
- React Router DOM
- Bootstrap 5

## Chức năng chính

- Đăng nhập, đăng ký, kích hoạt tài khoản
- Quên mật khẩu, đặt lại mật khẩu
- Xem danh sách ghi chú cá nhân và ghi chú được chia sẻ
- Tạo, sửa, xóa, ghim và khóa ghi chú bằng mật khẩu
- Tìm kiếm, lọc ghi chú theo nhãn
- Quản lý nhãn
- Cập nhật hồ sơ cá nhân

## Cấu trúc chính

- `src/pages`: các màn hình như `Login`, `Register`, `Dashboard`, `Profile`
- `src/components`: các thành phần UI như `Layout`, `NoteCard`, `NoteEditor`
- `src/hooks`: logic tái sử dụng như `useAuth`, `useNotes`
- `src/services`: lớp gọi API tới backend
- `vite.config.js`: cấu hình Vite và proxy `/api`

## Yêu cầu

- Node.js 18 trở lên
- Backend đang chạy tại `http://localhost:8000`

## Cài đặt

```bash
npm install
```

## Chạy môi trường phát triển

```bash
npm run dev
```

Sau khi chạy, frontend mặc định hoạt động tại:

```text
http://localhost:5173
```

## Build production

```bash
npm run build
```

## Xem thử bản build

```bash
npm run preview
```

## Kết nối với backend

- Frontend gọi API qua đường dẫn tương đối `/api`
- Vite proxy sẽ chuyển các request này sang `http://localhost:8000`
- Vì vậy khi phát triển local, cần khởi động backend trước hoặc song song với frontend

## Ghi chú

- Không thấy sử dụng file `.env` riêng cho frontend trong cấu trúc hiện tại
- Nếu đổi cổng backend, cần cập nhật lại `server.proxy` trong `vite.config.js`
