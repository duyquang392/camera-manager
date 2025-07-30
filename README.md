# Traffic AI ROI Configurator

Giao diện web để quản lý camera và vẽ zones (ROI) cho hệ thống Traffic AI.

## ✨ Tính năng chính

### 🎥 Quản lý Camera
- **Thêm camera mới** với nhiều loại stream:
  - RTSP (rtsp://...)
  - HTTP (http://...)  
  - HLS (http://.../playlist.m3u8)
  - MJPEG (http://.../mjpeg)
- **Xem danh sách camera** với thông tin stream status
- **Điều khiển stream** (Start/Stop) từ giao diện
- **Sửa/xóa camera**

### 🎯 Vẽ và quản lý Zones
- **Giao diện vẽ interactive** trên video stream
- **Hỗ trợ HLS streaming** real-time 
- **Vẽ zones polygon** với mouse
- **Chỉnh sửa zones** bằng cách drag & drop điểm
- **Cấu hình hướng đếm**: Vào, Ra, Cả hai
- **Xem zones** của cameras khác trong khi vẽ

### 💾 Quản lý cấu hình  
- **Export JSON** toàn bộ hệ thống hoặc camera riêng lẻ
- **Import JSON** để restore cấu hình
- **Download file config** qua API
- **Thống kê hệ thống** (số camera, zones, v.v.)

## 🚀 Cài đặt và chạy

### Backend (Node.js)

```bash
cd roi_configurator/web/backend

# Cài đặt dependencies
npm install

# Cấu hình environment
cp .env.example .env
# Chỉnh sửa .env theo môi trường của bạn

# Khởi động MongoDB (nếu chưa chạy)
sudo systemctl start mongod

# Chạy server
npm start
# hoặc với nodemon cho development
npx nodemon server.js
```

### Frontend (React)

```bash
cd roi_configurator/web/frontend

# Cài đặt dependencies  
npm install

# Chạy development server
npm start
```

## 📡 API Endpoints

### Camera Management
```
GET    /api/cameras           # Lấy danh sách cameras
POST   /api/cameras           # Tạo camera mới
GET    /api/cameras/:id       # Lấy thông tin camera
PATCH  /api/cameras/:id       # Cập nhật camera
DELETE /api/cameras/:id       # Xóa camera
```

### Zone Management  
```
GET    /api/zones/camera/:cameraId  # Lấy zones của camera
POST   /api/zones                   # Tạo zone mới
PATCH  /api/zones/:id               # Cập nhật zone
DELETE /api/zones/:id               # Xóa zone
```

### Stream Control
```
POST   /api/stream/:cameraId/start  # Bắt đầu stream
POST   /api/stream/:cameraId/stop   # Dừng stream  
GET    /api/stream/active           # Lấy danh sách streams đang chạy
GET    /api/stream/:cameraId        # Trạng thái stream của camera
```

### Configuration Export/Import
```
GET    /api/config/export                    # Export toàn bộ cấu hình
GET    /api/config/export/camera/:cameraId   # Export cấu hình camera
GET    /api/config/export?format=download    # Download file JSON
POST   /api/config/import                    # Import cấu hình
GET    /api/config/stats                     # Thống kê hệ thống
```

## 🎮 Cách sử dụng

### 1. Thêm Camera
1. Truy cập giao diện web (http://localhost:3000)
2. Click "Thêm Camera" 
3. Nhập thông tin:
   - Tên camera
   - Loại stream (RTSP/HTTP/HLS/MJPEG)
   - URL stream
   - Mô tả (tùy chọn)

### 2. Vẽ Zones
1. Click vào camera trong danh sách
2. Click "Thêm Zone" 
3. Nhập tên zone và chọn hướng đếm
4. Nhấn "d" để vào chế độ vẽ
5. Click chuột trái để thêm điểm
6. Nhấn "d" để hoàn thành zone
7. Click "Lưu Zone"

### 3. Export/Import cấu hình
1. Click "Quản lý cấu hình" trong danh sách camera
2. Chọn loại export (toàn bộ hoặc camera cụ thể)
3. Click "Xuất file" để download JSON
4. Để import: Click "Import" và chọn file JSON

## 🔧 Yêu cầu hệ thống

- **Node.js** >= 16.0
- **MongoDB** >= 4.4
- **FFmpeg** (cho streaming)
- **React** >= 18.0
- Trình duyệt hỗ trợ **HLS.js** (Chrome, Firefox, Safari)
* Nếu có lỗi khi chạy `npm start` hoặc `nodemon`, hãy kiểm tra lại phiên bản Node.js hoặc các package đang sử dụng.


