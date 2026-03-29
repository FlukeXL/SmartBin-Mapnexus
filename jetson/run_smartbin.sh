#!/bin/bash

echo "🚀 Starting Smart Bin System..."

# ตรวจสอบ Device ที่มี
echo "🔍 Checking available devices..."

DEVICES=""

# ตรวจสอบกล้อง
if [ -e /dev/video0 ]; then
    echo "✅ Found camera: /dev/video0"
    DEVICES="$DEVICES --device /dev/video0"
else
    echo "⚠️ Camera not found: /dev/video0"
fi

# ตรวจสอบ Serial Ports
for port in /dev/ttyTHS0 /dev/ttyTHS1 /dev/ttyUSB0 /dev/ttyUSB1 /dev/ttyACM0; do
    if [ -e "$port" ]; then
        echo "✅ Found serial port: $port"
        DEVICES="$DEVICES --device $port"
        sudo chmod 666 "$port" 2>/dev/null
    fi
done

if [ -z "$DEVICES" ]; then
    echo "⚠️ No devices found, using --privileged mode"
fi

# รัน Docker Container
echo "🐳 Starting Docker Container..."
docker run -it --rm \
  --runtime nvidia \
  --network host \
  --privileged \
  -v ~/Desktop/yolo_project:/workspace \
  -v /dev:/dev \
  my_yolo_final:latest \
  bash -c "pip3 install -q pyserial requests && cd /workspace && python3 smart_bin.py"
