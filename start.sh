#!/bin/bash

# Script khởi động Traffic AI ROI Configurator
echo "🚀 Khởi động Traffic AI ROI Configurator..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB chưa chạy. Đang khởi động..."
    sudo systemctl start mongod
    sleep 3
fi

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg chưa được cài đặt. Vui lòng cài đặt FFmpeg:"
    echo "   Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   CentOS/RHEL: sudo yum install ffmpeg"
    exit 1
fi

# Start backend
echo "🔧 Khởi động Backend..."
cd backend
if [ ! -f ".env" ]; then
    echo "📝 Tạo file .env từ template..."
    cp .env.example .env
    echo "⚠️  Vui lòng kiểm tra và chỉnh sửa file .env theo môi trường của bạn!"
fi

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Cài đặt dependencies cho backend..."
    npm install
fi

# Start backend in background
npm start &
BACKEND_PID=$!
echo "✅ Backend đã khởi động (PID: $BACKEND_PID)"

# Start frontend
echo "🎨 Khởi động Frontend..."
cd ../frontend

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Cài đặt dependencies cho frontend..."
    npm install
fi

# Start frontend
echo "🌐 Mở trình duyệt tại http://localhost:3000"
npm start &
FRONTEND_PID=$!

echo "✅ Frontend đã khởi động (PID: $FRONTEND_PID)"

# Create cleanup function
cleanup() {
    echo "🛑 Đang dừng các service..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Đã dừng tất cả services"
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

echo "🎉 Hệ thống đã sẵn sàng!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5008"
echo "📄 API Docs: http://localhost:5008/api"
echo ""
echo "Nhấn Ctrl+C để dừng tất cả services..."

# Wait for user interrupt
wait
