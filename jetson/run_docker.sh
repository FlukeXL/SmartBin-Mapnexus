#!/bin/bash

echo "============================================================"
echo "🐳 Smart Bin - Docker Mode"
echo "============================================================"
echo ""

# ตรวจสอบว่ามี Docker Image
if ! docker images | grep -q "my_yolo_final"; then
    echo "❌ ไม่พบ Docker Image: my_yolo_final"
    echo "💡 สร้าง Docker Image ก่อน"
    exit 1
fi

echo "✅ พบ Docker Image: my_yolo_final"
echo ""

# ตรวจสอบ Serial Ports
echo "🔍 ตรวจสอบ Serial Ports..."
ls -l /dev/ttyTHS* /dev/ttyUSB* 2>/dev/null || echo "⚠️ ไม่พบ Serial Port"
echo ""

# ตั้งค่าสิทธิ์ Serial
echo "🔧 ตั้งค่าสิทธิ์ Serial Ports..."
sudo chmod 666 /dev/ttyTHS0 2>/dev/null
sudo chmod 666 /dev/ttyTHS1 2>/dev/null
sudo chmod 666 /dev/ttyUSB0 2>/dev/null
echo ""

# รัน Docker Container
echo "🚀 เริ่มรัน Docker Container..."
echo "============================================================"
echo ""

docker run -it --rm \
  --runtime nvidia \
  --network host \
  --privileged \
  -v ~/Desktop/yolo_project:/workspace \
  -v /dev:/dev \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  my_yolo_final:latest \
  bash -c "pip3 install -q pyserial && cd /workspace && python3 run_smartbin.py"
