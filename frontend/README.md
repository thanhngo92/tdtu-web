# Frontend

Frontend của project được xây bằng React + Vite, chịu trách nhiệm giao diện người dùng và các flow theo rubric như auth, dashboard notes, label management, sharing, profile và responsive UI.

## Mục tiêu

Phần frontend triển khai các nhóm chức năng chính:

- đăng ký, đăng nhập, kích hoạt tài khoản
- quên mật khẩu, đặt lại mật khẩu
- dashboard quản lý notes
- grid view và list view
- tạo, sửa, autosave, pin, search, filter note
- lock note, share note, nhận note được chia sẻ
- profile, avatar, preferences
- giao diện responsive cho mobile, tablet, desktop

## Cấu trúc thư mục

```text
frontend/
├─ public/         # static assets
├─ src/
│  ├─ components/  # UI components dùng lại
│  ├─ context/     # auth context
│  ├─ hooks/       # custom hooks
│  ├─ pages/       # page-level screens
│  ├─ services/    # gọi API backend
│  ├─ styles/      # CSS tách riêng
│  ├─ utils/       # helper utilities
│  ├─ App.jsx
│  ├─ App.css
│  └─ index.jsx
├─ .env            # cấu hình local
├─ .env.example    # mẫu env
├─ package.json
└─ vite.config.js
```

## Công nghệ sử dụng

- React 19
- Vite
- React Router DOM
- Bootstrap 5

## Cấu hình môi trường

Tạo file `frontend/.env` từ `frontend/.env.example`.

Ví dụ local:

```env
VITE_API_BASE_URL=/api
VITE_DEV_API_TARGET=http://localhost:8000
```

Ý nghĩa:

- `VITE_API_BASE_URL`: base URL mà frontend dùng để gọi API
- `VITE_DEV_API_TARGET`: backend target cho Vite proxy khi chạy local

## Cài dependencies

Trong thư mục `frontend`:

```powershell
npm install
```

## Chạy local

Trong thư mục `frontend`:

```powershell
npm run dev
```

Frontend sẽ chạy tại:

```text
http://localhost:5173
```

## Build production

```powershell
npm run build
```

Output build nằm trong:

```text
frontend/dist
```

## Các phần chính trong UI

### Pages

- `Login.jsx`
- `Register.jsx`
- `Activate.jsx`
- `ForgotPassword.jsx`
- `ResetPassword.jsx`
- `Dashboard.jsx`
- `Profile.jsx`

### Components

- `Layout.jsx`: layout chính sau khi đăng nhập
- `ProtectedRoute.jsx`: chặn route cần auth
- `NoteCard.jsx`: hiển thị note
- `NoteEditor.jsx`: editor dùng cho tạo và sửa note
- `LabelManager.jsx`: CRUD labels

### Services

- `authService.js`: gọi API auth và user
- `noteService.js`: gọi API notes, labels, sharing

## Luồng hoạt động chính

- frontend gọi backend qua `fetch`
- request mặc định dùng `credentials: include`
- auth state được giữ qua `AuthContext`
- dashboard lấy note, label, shared note qua hooks và services
- collaboration đang dùng polling bằng `setTimeout` cho shared note có quyền edit

## Cách frontend giao tiếp với backend

Frontend ưu tiên gọi API tương đối:

```text
/api
```

Điều này giúp dễ deploy hơn nếu:

- frontend và backend cùng domain
- hoặc có reverse proxy chuyển `/api` về backend PHP

## Responsive và UI

Frontend hiện đã được tổ chức để hỗ trợ:

- smartphone
- tablet
- desktop

Các khu vực cần chú ý khi test trước deploy:

- dashboard
- sidebar mobile
- note editor
- profile page
- auth pages

## Kiểm tra trước deploy

Nên test lại các flow này bằng trình duyệt:

- register -> activate -> login
- forgot password -> reset password
- create -> edit -> autosave -> delete note
- pin, search, label filter
- lock/unlock note
- share note read/edit
- polling collaboration trên shared editable note
- responsive ở mobile, tablet, desktop

## Chuẩn bị deploy

Nếu deploy frontend và backend cùng domain:

- giữ `VITE_API_BASE_URL=/api`

Nếu deploy khác domain:

- sửa `VITE_API_BASE_URL=https://your-backend-domain/api`

Khuyến nghị thực dụng cho project này:

- build frontend thành static files
- deploy backend PHP riêng
- ưu tiên reverse proxy cùng domain để giảm rủi ro CORS và session
