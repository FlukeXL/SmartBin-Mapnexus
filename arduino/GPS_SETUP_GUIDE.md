# 📡 คู่มือการติดตั้ง GPS Tracker สำหรับถังขยะอัจฉริยะ

## 🎯 ภาพรวม
คู่มือนี้จะแนะนำวิธีการติดตั้ง GPS Module ATGM336H-5N กับ ESP32 เพื่อส่งตำแหน่งถังขยะแบบ Real-time

---

## 📦 อุปกรณ์ที่ต้องใช้

### 1. อุปกรณ์หลัก
- [ ] **ESP32 Development Board** (ราคา 150-250 บาท)
- [ ] **GPS Module ATGM336H-5N** (ราคา 150-300 บาท)
- [ ] **Ultrasonic Sensor HC-SR04** (ราคา 30-50 บาท) - สำหรับวัดระดับขยะ
- [ ] **สาย Jumper Wire** (ชาย-หญิง) อย่างน้อย 8 เส้น
- [ ] **USB Cable** (Micro USB หรือ Type-C ตาม ESP32)
- [ ] **Breadboard** (ถ้าต้องการทดสอบก่อน)

### 2. Software ที่ต้องติดตั้ง
- [ ] **Arduino IDE** (ดาวน์โหลดจาก https://www.arduino.cc/en/software)
- [ ] **ESP32 Board Package**
- [ ] **TinyGPS++ Library**

---

## 🔧 ขั้นตอนที่ 1: ติดตั้ง Software

### 1.1 ติดตั้ง Arduino IDE
1. ดาวน์โหลดจาก https://www.arduino.cc/en/software
2. ติดตั้งตามปกติ
3. เปิด Arduino IDE

### 1.2 เพิ่ม ESP32 Board
1. เปิด Arduino IDE
2. ไปที่ `File` → `Preferences`
3. ในช่อง "Additional Board Manager URLs" ใส่:
```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```
4. คลิก `OK`
5. ไปที่ `Tools` → `Board` → `Boards Manager`
6. ค้นหา "esp32"
7. คลิก `Install` บน "esp32 by Espressif Systems"

### 1.3 ติดตั้ง TinyGPS++ Library
1. ไปที่ `Sketch` → `Include Library` → `Manage Libraries`
2. ค้นหา "TinyGPSPlus"
3. คลิก `Install` บน "TinyGPSPlus by Mikal Hart"

---

## 🔌 ขั้นตอนที่ 2: การต่อสายอุปกรณ์

### 2.1 การเชื่อมต่อ GPS Module

```
GPS Module ATGM336H-5N          ESP32
─────────────────────────────────────────
VCC (แดง)              →        3.3V
GND (ดำ)               →        GND
TX  (เขียว)            →        GPIO 16 (RX2)
RX  (เหลือง)           →        GPIO 17 (TX2)
```

**⚠️ สำคัญ:** TX ของ GPS ต่อกับ RX ของ ESP32 (สลับกัน)

### 2.2 การเชื่อมต่อ Ultrasonic Sensor (HC-SR04)

```
Ultrasonic HC-SR04              ESP32
─────────────────────────────────────────
VCC                    →        5V
GND                    →        GND
TRIG                   →        GPIO 5
ECHO                   →        GPIO 18
```

### 2.3 ภาพรวมการต่อสาย

```
        ESP32
    ┌─────────────┐
    │             │
    │  3.3V  ─────┼──→ GPS VCC
    │  GND   ─────┼──→ GPS GND
    │  GPIO16─────┼──→ GPS TX
    │  GPIO17─────┼──→ GPS RX
    │             │
    │  5V    ─────┼──→ Ultrasonic VCC
    │  GND   ─────┼──→ Ultrasonic GND
    │  GPIO5 ─────┼──→ Ultrasonic TRIG
    │  GPIO18─────┼──→ Ultrasonic ECHO
    │             │
    └─────────────┘
```

---

## 💻 ขั้นตอนที่ 3: อัพโหลดโค้ด

### 3.1 เปิดไฟล์โค้ด
1. เปิดไฟล์ `smartbin_gps_tracker.ino` ใน Arduino IDE

### 3.2 แก้ไขการตั้งค่า

**ตั้งค่า WiFi:**
```cpp
const char* ssid = "YOUR_WIFI_NAME";        // ชื่อ WiFi ของคุณ
const char* password = "YOUR_WIFI_PASSWORD"; // รหัส WiFi ของคุณ
```

**ตั้งค่า Server URL:**
```cpp
// หา IP Address ของคอมพิวเตอร์ (เปิด CMD พิมพ์ ipconfig)
const char* serverUrl = "http://192.168.1.100:3000/api/gps/update";
```

**ตั้งค่าถังขยะ:**
```cpp
const int BIN_ID = 1;                       // เปลี่ยนเป็นรหัสถังขยะ
const String BIN_NAME = "ถังขยะ #001";     // เปลี่ยนชื่อถังขยะ
const String LOCATION_NAME = "ลานพญาศรีสัตตนาคราช"; // เปลี่ยนชื่อสถานที่
```

### 3.3 เลือก Board และ Port
1. ไปที่ `Tools` → `Board` → `ESP32 Arduino` → เลือก `ESP32 Dev Module`
2. ไปที่ `Tools` → `Port` → เลือก COM port ที่ ESP32 เสียบอยู่

### 3.4 อัพโหลดโค้ด
1. คลิกปุ่ม `Upload` (ลูกศรชี้ขวา)
2. รอจนกว่าจะขึ้น "Done uploading"

---

## 🧪 ขั้นตอนที่ 4: ทดสอบระบบ

### 4.1 เปิด Serial Monitor
1. คลิก `Tools` → `Serial Monitor`
2. ตั้งค่า Baud Rate เป็น `115200`

### 4.2 ตรวจสอบข้อความ

**ถ้าทำงานปกติจะเห็น:**
```
=================================
Smart Bin GPS Tracker
=================================
🔌 กำลังเชื่อมต่อ WiFi: YourWiFi
✅ เชื่อมต่อ WiFi สำเร็จ!
📡 IP Address: 192.168.1.50

─────────────────────────────────
📍 ตำแหน่ง: 17.40380000, 104.78650000
🗑️  ระดับขยะ: 45%
🛰️  ดาวเทียม: 8
🚗 ความเร็ว: 0.00 km/h
─────────────────────────────────
📤 ส่งข้อมูล: {"bin_id":1,"bin_name":"ถังขยะ #001",...}
✅ ส่งสำเร็จ - Response code: 200
```

### 4.3 ตรวจสอบบนเว็บ
1. เปิด `http://localhost:3000/frontend/admin-dashboard.html?section=waste-bins`
2. ควรเห็นถังขยะเคลื่อนที่บนแผนที่แบบ Real-time

---

## 🐛 แก้ไขปัญหา (Troubleshooting)

### ปัญหา 1: ไม่พบสัญญาณ GPS
```
⚠️ ไม่พบสัญญาณ GPS - ตรวจสอบการต่อสาย
```

**วิธีแก้:**
- ✅ ตรวจสอบการต่อสาย TX/RX (ต้องสลับกัน)
- ✅ ใช้งานกลางแจ้ง หรือใกล้หน้าต่าง
- ✅ รอ 1-2 นาที ให้ GPS Lock สัญญาณดาวเทียม
- ✅ ตรวจสอบว่า GPS Module ได้รับไฟ 3.3V

### ปัญหา 2: เชื่อมต่อ WiFi ไม่ได้
```
❌ เชื่อมต่อ WiFi ไม่สำเร็จ
```

**วิธีแก้:**
- ✅ ตรวจสอบชื่อ WiFi และรหัสผ่าน
- ✅ ใช้ WiFi 2.4GHz (ESP32 ไม่รองรับ 5GHz)
- ✅ ตรวจสอบว่า WiFi เปิดอยู่

### ปัญหา 3: ส่งข้อมูลไม่สำเร็จ
```
❌ ส่งไม่สำเร็จ - Error: -1
```

**วิธีแก้:**
- ✅ ตรวจสอบ Server URL ว่าถูกต้อง
- ✅ ตรวจสอบว่า Backend Server รันอยู่
- ✅ ตรวจสอบว่า ESP32 และคอมพิวเตอร์อยู่ WiFi เดียวกัน
- ✅ ปิด Firewall ชั่วคราว

### ปัญหา 4: Ultrasonic อ่านค่าผิดพลาด

**วิธีแก้:**
- ✅ ตรวจสอบการต่อสาย TRIG และ ECHO
- ✅ แก้ไขค่า `BIN_HEIGHT` ให้ตรงกับความสูงถังจริง
- ✅ ตรวจสอบว่า Sensor ได้รับไฟ 5V

---

## 📊 การติดตั้งจริงบนถังขยะ

### ขั้นตอนการติดตั้ง:

1. **เตรียมกล่องกันน้ำ**
   - ใส่ ESP32 และ GPS Module ในกล่องกันน้ำ
   - เจาะรูสำหรับสาย USB และเสาอากาศ GPS

2. **ติดตั้ง GPS Module**
   - ติดเสาอากาศ GPS ด้านบนของถังขยะ
   - ต้องมองเห็นท้องฟ้าได้ชัดเจน

3. **ติดตั้ง Ultrasonic Sensor**
   - ติดที่ฝาถังขยะ หันลงด้านล่าง
   - ระยะห่างจากพื้นถัง = ความสูงถัง

4. **จ่ายไฟ**
   - ใช้ Power Bank 5V
   - หรือ Solar Panel + Battery

---

## 🔋 การประหยัดพลังงาน (Optional)

ถ้าต้องการประหยัดแบตเตอรี่:

```cpp
// เพิ่มใน setup()
esp_sleep_enable_timer_wakeup(60 * 1000000); // ตื่นทุก 60 วินาที

// เพิ่มใน loop() หลังส่งข้อมูล
esp_deep_sleep_start(); // เข้าโหมด Deep Sleep
```

---

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย:
1. ตรวจสอบ Serial Monitor ก่อน
2. ดูข้อความ Error
3. ติดต่อทีมพัฒนา

---

## ✅ Checklist ก่อนใช้งานจริง

- [ ] ต่อสายถูกต้องทุกเส้น
- [ ] อัพโหลดโค้ดสำเร็จ
- [ ] เชื่อมต่อ WiFi ได้
- [ ] รับสัญญาณ GPS ได้ (มีดาวเทียม > 4 ดวง)
- [ ] ส่งข้อมูลไปยัง Server สำเร็จ
- [ ] เห็นตำแหน่งบนแผนที่แล้ว
- [ ] Ultrasonic อ่านค่าถูกต้อง

---

**เวอร์ชัน:** 1.0.0  
**อัพเดทล่าสุด:** 2024
