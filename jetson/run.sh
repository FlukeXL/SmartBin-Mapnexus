#!/bin/bash

echo "============================================================"
echo "🗑️  Smart Bin - Auto Setup & Run"
echo "============================================================"
echo ""

# ตรวจสอบว่าอยู่ที่ไหน
echo "📂 Current Directory: $(pwd)"
echo ""

# ค้นหาไฟล์ best.engine
echo "🔍 กำลังค้นหา best.engine..."
if [ -f "best.engine" ]; then
    echo "✅ พบไฟล์: best.engine"
elif [ -f "models/best.engine" ]; then
    echo "✅ พบไฟล์: models/best.engine"
else
    echo "❌ ไม่พบไฟล์ best.engine"
    echo ""
    echo "💡 วางไฟล์ best.engine ในตำแหน่งใดตำแหน่งหนึ่ง:"
    echo "   - $(pwd)/best.engine"
    echo "   - $(pwd)/models/best.engine"
    echo ""
    exit 1
fi

echo ""

# ติดตั้ง pyserial
echo "📦 ติดตั้ง pyserial..."
pip3 install -q pyserial
echo "✅ ติดตั้งเรียบร้อย"
echo ""

# รันโปรแกรม
echo "🚀 เริ่มรันโปรแกรม..."
echo "============================================================"
echo ""

python3 run_smartbin.py
