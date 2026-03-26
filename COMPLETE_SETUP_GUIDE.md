# 🗑️ คู่มือการติดตั้ง Smart Bin ระบบสมบูรณ์

## 📋 ภาพรวมระบบ

```
[กล้อง Rapoo] → [Jetson Nano + YOLOv11m-seg] → [ESP32] → [Backend Server] → [แผนที่ Real-time]
                        ↓                           ↓
                   ตรวจจับขยะ 4 ประเภท        GPS + Ultrasonic + Servo
```

---

## 🔧 ส่วนที่ 1: การต่อสายอุปกรณ์

### 1.1 Jetson Nano ↔ ESP32 (UART)

```
Jetson Nano                 ESP32
────────────────────────────────────
TX (GPIO 14)        →       RX (GPIO 25)
RX (GPIO 15)        →       TX (GPIO 26)
GND                 →       GND
```

### 1.2 ESP32 ↔ GPS Module

```
GPS Module ATGM336H-5N      ESP32
────────────────────────────────────
VCC                 →       3.3V
GND                 →       GND
TX                  →       GPIO 16 (RX2)
RX                  →       GPIO 17 (TX2)
```

### 1.3 ESP32 ↔ Ultrasonic Sensor

```
Ultrasonic HC-SR04          ESP32
────────────────────────────────────
VCC                 →       5V
GND                 →       GND
TRIG                →       GPIO 5
ECHO                →       GPIO 18
```

### 1.4 ESP32 ↔ Servo Motors (4 ตัว)

```
Servo                       ESP32
────────────────────────────────────
Servo Plastic (Signal)  →   GPIO 12
Servo Metal (Signal)    →   GPIO 13
Servo Glass (Signal)    →   GPIO 14
Servo Paper (Signal)    →   GPIO 27

ทุก Servo:
VCC (แดง)           →   5V (จาก Switching Power Supply)
GND (น้ำตาล/ดำ)     →   GND
```

### 1.5 Power Supply

```
Switching 5V 5A
├── Jetson Nano (5V 4A)
├── ESP32 (5V via USB)
├── Servo Motors (5V)
└── GPS Module (3.3V via ESP32)
```

---

## 💻 ส่วนที่ 2: ติดตั้ง Software บน Jetson Nano

### 2.1 ติดตั้ง Dependencies

```bash
# อัพเดทระบบ
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Python packages
pip3 install opencv-python
pip3 install pyserial
pip3 install requests
pip3 install pycuda
pip3 install tensorrt

# ติดตั้ง TensorRT (ถ้ายังไม่มี)
sudo apt install python3-libnvinfer-dev
```

### 2.2 แปลง Model เป็น TensorRT Engine

```bash
# สร้างโฟลเดอร์
mkdir -p ~/smartbin/models
cd ~/smartbin/models

# คัดลอกไฟล์ best.onnx มาที่นี่
# แล้วแปลงเป็น TensorRT Engine
trtexec --onnx=best.onnx \
        --saveEngine=best.engine \
        --fp16 \
        --workspace=2048

# ตรวจสอบไฟล์
ls -lh best.engine
```

### 2.3 คัดลอกโค้ด Python

```bash
# คัดลอกไฟล์ smartbin_yolo_detector.py
cp smartbin_yolo_detector.py ~/smartbin/

# แก้ไขสิทธิ์
chmod +x ~/smartbin/smartbin_yolo_detector.py
```

### 2.4 แก้ไขการตั้งค่า

แก้ไขไฟล์ `smartbin_yolo_detector.py`:

```python
# บรรทัดที่ 18-22
CAMERA_ID = 0  # ปรับตาม USB port ของกล้อง Rapoo
SERIAL_PORT = '/dev/ttyTHS1'  # UART port (ตรวจสอบด้วย ls /dev/tty*)
MODEL_PATH = '/home/your_username/smartbin/models/best.engine'
BIN_ID = 1
BIN_NAME = "ถังขยะอัจฉริยะ #001"
```

### 2.5 ทดสอบรันโค้ด

```bash
cd ~/smartbin
python3 smartbin_yolo_detector.py
```

---

## 🔌 ส่วนที่ 3: ติดตั้ง Software บน ESP32

### 3.1 ติดตั้ง Arduino IDE และ Libraries

1. เปิด Arduino IDE
2. ติดตั้ง ESP32 Board (ดูคู่มือ `arduino/GPS_SETUP_GUIDE.md`)
3. ติดตั้ง Libraries:
   - TinyGPS++
   - ESP32Servo
   - ArduinoJson

### 3.2 แก้ไขการตั้งค่า

แก้ไขไฟล์ `smartbin_esp32_complete.ino`:

```cpp
// บรรทัดที่ 20-21
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// บรรทัดที่ 24
const char* serverUrl = "http://192.168.1.100:3000/api/gps/update";
// เปลี่ยน 192.168.1.100 เป็น IP ของคอมพิวเตอร์

// บรรทัดที่ 27-29
const int BIN_ID = 1;
const String BIN_NAME = "ถังขยะอัจฉริยะ #001";
const String LOCATION_NAME = "ลานพญาศรีสัตตนาคราช";

// บรรทัดที่ 38 - ปรับความสูงถังขยะ
const int BIN_HEIGHT = 100; // ความสูงถังจริง (cm)
```

### 3.3 อัพโหลดโค้ด

1. เลือก Board: `ESP32 Dev Module`
2. เลือก Port ที่ ESP32 เสียบอยู่
3. คลิก Upload

---

## 🚀 ส่วนที่ 4: รันระบบทั้งหมด

### 4.1 เริ่มต้น Backend Server

```bash
cd /path/to/your/project
npm start
```

ควรเห็น:
```
🚀 SmartMap Server (GPS Edition) running!
🏠 Local:    http://localhost:3000
🛰️  GPS WS:  ws://localhost:3000/ws
🗑️  SmartBin API: http://localhost:3000/api/smartbin
```

### 4.2 เปิดหน้าเว็บ

```
http://localhost:3000/frontend/admin-dashboard.html?section=waste-bins
```

### 4.3 เปิด ESP32

1. เสียบ USB เข้า ESP32
2. เปิด Serial Monitor (115200 baud)
3. ควรเห็น:
```
🗑️  Smart Bin ESP32 - Complete System
🔌 เชื่อมต่อ WiFi: YourWiFi
✅ เชื่อมต่อ WiFi สำเร็จ!
📡 IP Address: 192.168.1.50
✅ ระบบพร้อมทำงาน
```

### 4.4 เปิด Jetson Nano

```bash
cd ~/smartbin
python3 smartbin_yolo_detector.py
```

ควรเห็น:
```
🚀 เริ่มต้นระบบ Smart Bin...
✅ เปิดกล้อง Rapoo สำเร็จ
✅ เชื่อมต่อ ESP32 สำเร็จ
📦 กำลังโหลด YOLOv11m-seg TensorRT Engine...
✅ โหลด Model สำเร็จ

==================================================
🗑️  Smart Bin Detection System เริ่มทำงาน
==================================================
```

---

## 🧪 ส่วนที่ 5: ทดสอบระบบ

### 5.1 ทดสอบการตรวจจับขยะ

1. นำขยะ Plastic ไปให้กล้องเห็น
2. ควรเห็นใน Jetson:
```
🎯 ตรวจพบ: PLASTIC (Confidence: 95.23%)
📤 ส่งคำสั่งไปยัง ESP32: OPEN:plastic
```

3. ควรเห็นใน ESP32:
```
📥 รับคำสั่งจาก Jetson: OPEN:plastic
🚪 เปิดฝา: Plastic
✅ ปิดฝา: Plastic
📤 ส่งข้อมูล: {...}
✅ ส่งสำเร็จ - Code: 200
```

4. Servo สำหรับ Plastic ควรเปิด-ปิด

### 5.2 ทดสอบ GPS

1. นำ GPS Module ไปกลางแจ้ง
2. รอ 1-2 นาที ให้ Lock สัญญาณดาวเทียม
3. ควรเห็นใน ESP32:
```
📍 ตำแหน่ง: 17.40380000, 104.78650000
🛰️  ดาวเทียม: 8
```

4. ตรวจสอบบนแผนที่ - ควรเห็นถังขยะเคลื่อนที่แบบ Real-time

### 5.3 ทดสอบ Ultrasonic

1. วางมือเหนือ Ultrasonic Sensor
2. ควรเห็นค่า fill_level เปลี่ยน
3. ตรวจสอบบนเว็บ - ควรเห็นเปอร์เซ็นต์เปลี่ยน

---

## 🐛 แก้ไขปัญหา

### ปัญหา 1: Jetson ไม่เจอกล้อง

```bash
# ตรวจสอบกล้อง
ls /dev/video*

# ทดสอบกล้อง
v4l2-ctl --list-devices

# ถ้าเป็น /dev/video1 แก้ไข CAMERA_ID = 1
```

### ปัญหา 2: Jetson ไม่เชื่อมต่อ ESP32

```bash
# ตรวจสอบ Serial port
ls /dev/ttyTHS*
ls /dev/ttyUSB*

# ให้สิทธิ์
sudo chmod 666 /dev/ttyTHS1

# ทดสอบ Serial
sudo minicom -D /dev/ttyTHS1 -b 115200
```

### ปัญหา 3: ESP32 ไม่รับสัญญาณ GPS

- ใช้งานกลางแจ้ง
- รอ 2-3 นาที
- ตรวจสอบการต่อสาย TX/RX (ต้องสลับกัน)

### ปัญหา 4: Servo ไม่ทำงาน

- ตรวจสอบ Power Supply (ต้องมีกระแสเพียงพอ)
- ตรวจสอบ GND ต่อร่วมกันทั้งหมด
- ทดสอบ Servo แยกก่อน

---

## 📊 การตรวจสอบข้อมูล

### ตรวจสอบ API

```bash
# ดูข้อมูล GPS ล่าสุด
curl http://localhost:3000/api/gps/latest

# ดูข้อมูลถังขยะทั้งหมด
curl http://localhost:3000/api/smartbin
```

### ตรวจสอบ Database

```sql
USE nakhonphanom_smartbin;

-- ดูข้อมูลถังขยะ
SELECT * FROM smart_bins;

-- ดูสถิติ
SELECT * FROM bins_summary;
```

---

## 🎯 Checklist ก่อนใช้งานจริง

- [ ] ต่อสายทุกอย่างถูกต้อง
- [ ] Backend Server รันอยู่
- [ ] ESP32 เชื่อมต่อ WiFi ได้
- [ ] GPS Lock สัญญาณได้ (>4 ดาวเทียม)
- [ ] Jetson ตรวจจับขยะได้
- [ ] Servo ทำงานปกติทุกตัว
- [ ] Ultrasonic อ่านค่าถูกต้อง
- [ ] ข้อมูลแสดงบนแผนที่แล้ว

---

## 📞 ติดต่อสอบถาม

หากมีปัญหา:
1. ตรวจสอบ Serial Monitor ของ ESP32
2. ตรวจสอบ Terminal ของ Jetson
3. ตรวจสอบ Console ของ Browser (F12)
4. ดู Log ของ Backend Server

**เวอร์ชัน:** 1.0.0  
**อัพเดทล่าสุด:** 2024
