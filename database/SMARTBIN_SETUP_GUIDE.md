# คู่มือการติดตั้งระบบถังขยะอัจฉริยะ (Smart Bin System)

## 📋 ภาพรวม

ระบบถังขยะอัจฉริยะเป็นฐานข้อมูลแยกต่างหากจากระบบหลัก เพื่อจัดการข้อมูลถังขยะ IoT แบบ Real-time

**ฐานข้อมูล:** `nakhonphanom_smartbin`

---

## 🚀 การติดตั้ง

### ขั้นตอนที่ 1: สร้างฐานข้อมูล

เปิด HeidiSQL และรันไฟล์:
```
database/nakhonphanom_smartbin.sql
```

ระบบจะสร้าง:
- ✅ ฐานข้อมูล `nakhonphanom_smartbin`
- ✅ ตาราง 5 ตาราง (smart_bins, collection_history, bin_alerts, daily_stats, collection_routes)
- ✅ Views 2 views (bins_need_collection, bins_summary)
- ✅ Stored Procedures และ Triggers
- ✅ ข้อมูลตัวอย่าง 10 ถัง

แก้ไขไฟล์ `.env` (ถ้ายังไม่มีให้สร้างใหม่):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_APP_NAME=nakhonphanom_app
DB_CITY_NAME=nakhonphanom_city
DB_SMARTBIN_NAME=nakhonphanom_smartbin
```

### ขั้นตอนที่ 3: รีสตาร์ท Backend Server

```bash
npm start
# หรือ
node backend/server.js
```

---

## 🗺️ การใช้งานบนแผนที่

### เปิดหน้าแผนที่
```
http://localhost:3000/frontend/map.html
```

### ฟีเจอร์
- 🗑️ แสดงไอคอนถังขยะตามพิกัด Lat/Lng
- 🎨 สีเปลี่ยนตามระดับความเต็ม:
  - 🟢 เขียว (0-49%) - ว่าง
  - 🟡 เหลือง (50-69%) - ครึ่งหนึ่ง
  - 🟠 ส้ม (70-89%) - ใกล้เต็ม
  - 🔴 แดง (90-100%) - เต็ม
- 📊 แสดงเปอร์เซ็นต์บนไอคอน
- 💬 Popup รายละเอียดเมื่อคลิก
- ⚡ Real-time update ผ่าน WebSocket

---

## 📝 การเพิ่มข้อมูลใน HeidiSQL

### วิธีที่ 1: ใช้ SQL Command

```sql
USE nakhonphanom_smartbin;

-- เพิ่มถังขยะใหม่
INSERT INTO smart_bins (name, location_name, lat, lng, bin_type, fill_level, status, temperature, battery_level)
VALUES ('ถังขยะ #011', 'สวนสาธารณะ', 17.41000000, 104.79000000, 'general', 25, 'active', 31.5, 95);
```

**ผลลัพธ์:** ถังขยะจะปรากฏบนแผนที่ทันที (ไม่ต้องรีเฟรช)

### วิธีที่ 2: เพิ่มผ่าน GUI ของ HeidiSQL

1. เลือกตาราง `smart_bins`
2. คลิก "Data" tab
3. คลิกปุ่ม "Insert row"
4. กรอกข้อมูล:
   - **name**: ชื่อถังขยะ (เช่น "ถังขยะ #012")
   - **location_name**: ชื่อสถานที่ (เช่น "ตลาดสด")
   - **lat**: ละติจูด (เช่น 17.41500000)
   - **lng**: ลองจิจูด (เช่น 104.78000000)
   - **bin_type**: ประเภท (general/recycle/organic/hazardous)
   - **fill_level**: ระดับขยะ 0-100 (เช่น 45)
   - **status**: สถานะ (active/full/maintenance/inactive)
   - **temperature**: อุณหภูมิ (เช่น 32.5)
   - **battery_level**: แบตเตอรี่ 0-100 (เช่น 85)
5. กด F9 หรือคลิก "Post" เพื่อบันทึก

---

## 🔄 การแก้ไขข้อมูล

### แก้ไขระดับความเต็ม
```sql
UPDATE smart_bins SET fill_level = 95 WHERE id = 1;
```

### แก้ไขตำแหน่ง
```sql
UPDATE smart_bins SET lat = 17.42000000, lng = 104.78500000 WHERE id = 1;
```

### แก้ไขสถานะ
```sql
UPDATE smart_bins SET status = 'full' WHERE fill_level >= 90;
```

**ผลลัพธ์:** การเปลี่ยนแปลงจะแสดงบนแผนที่ทันที

---

## 🗑️ การลบข้อมูล

```sql
DELETE FROM smart_bins WHERE id = 11;
```

**ผลลัพธ์:** ถังขยะจะหายจากแผนที่ทันที

---

## 📊 คำสั่ง SQL ที่มีประโยชน์

### ดูถังขยะทั้งหมด
```sql
SELECT * FROM smart_bins ORDER BY fill_level DESC;
```

### ดูถังขยะที่ต้องเก็บด่วน (>= 80%)
```sql
SELECT * FROM bins_need_collection;
```

### ดูสถิติรวม
```sql
SELECT * FROM bins_summary;
```

### ดูการแจ้งเตือนที่ยังไม่แก้ไข
```sql
SELECT b.name, a.alert_type, a.message, a.severity, a.created_at
FROM bin_alerts a
JOIN smart_bins b ON a.bin_id = b.id
WHERE a.is_resolved = 0
ORDER BY a.severity DESC;
```

### ดูประวัติการเก็บขยะ
```sql
SELECT b.name, c.collected_by, c.fill_level_before, c.weight, c.collection_time
FROM collection_history c
JOIN smart_bins b ON c.bin_id = b.id
ORDER BY c.collection_time DESC
LIMIT 10;
```

---

## 📍 พิกัดสถานที่สำคัญในนครพนม

| สถานที่ | Latitude | Longitude |
|---------|----------|-----------|
| พญาศรีสัตตนาคราช | 17.40380000 | 104.78650000 |
| หอนาฬิกาเวียดนาม | 17.40690000 | 104.78430000 |
| ตลาดอินโดจีน | 17.40650000 | 104.78820000 |
| ถนนคนเดิน | 17.40800000 | 104.78100000 |
| วัดมหาธาตุ | 17.39850000 | 104.79150000 |
| โรงพยาบาลนครพนม | 17.39920000 | 104.78060000 |
| ศาลากลาง | 17.39950000 | 104.78420000 |
| สวนสาธารณะริมโขง | 17.41000000 | 104.79000000 |
| โรงเรียนนครพนม | 17.40200000 | 104.79500000 |
| ตลาดสดเทศบาล | 17.41500000 | 104.78000000 |

---

## 🎨 ประเภทถังขยะ (bin_type)

| ประเภท | ไอคอน | คำอธิบาย |
|--------|-------|----------|
| general | 🗑️ fa-trash-can | ขยะทั่วไป |
| recycle | ♻️ fa-recycle | ขยะรีไซเคิล |
| organic | 🍃 fa-leaf | ขยะอินทรีย์ |
| hazardous | ☣️ fa-biohazard | ขยะอันตราย |

---

## 🔧 Troubleshooting

### ถังขยะไม่แสดงบนแผนที่

1. ตรวจสอบว่ารัน SQL ไฟล์แล้ว
2. ตรวจสอบ `.env` ว่าตั้งค่า `DB_SMARTBIN_NAME` แล้ว
3. รีสตาร์ท backend server
4. เปิด Console ใน Browser (F12) ดู error

### WebSocket ไม่ทำงาน

1. ตรวจสอบว่า backend server รันอยู่
2. ตรวจสอบ Console ว่ามีข้อความ `[SmartBin-WS] Connected`
3. ตรวจสอบ port ว่าไม่ถูกบล็อก

### ข้อมูลไม่อัพเดท Real-time

1. ลอง refresh หน้าเว็บ (F5)
2. ตรวจสอบว่า WebSocket เชื่อมต่ออยู่
3. ระบบมี backup refresh ทุก 30 วินาที

---

## 📚 โครงสร้างฐานข้อมูล

### ตาราง smart_bins
- เก็บข้อมูลถังขยะทั้งหมด
- ฟิลด์สำคัญ: lat, lng, fill_level, status

### ตาราง collection_history
- บันทึกประวัติการเก็บขยะ
- เชื่อมโยงกับ smart_bins

### ตาราง bin_alerts
- การแจ้งเตือนต่างๆ
- สร้างอัตโนมัติเมื่อถังเต็ม

### ตาราง daily_stats
- สถิติรายวัน
- ใช้สำหรับวิเคราะห์

### ตาราง collection_routes
- เส้นทางเก็บขยะ
- วางแผนการเก็บขยะ

---

## 🎯 ตัวอย่างการใช้งาน

### Scenario 1: เพิ่มถังขยะใหม่ที่ตลาด

```sql
INSERT INTO smart_bins (name, location_name, lat, lng, bin_type, fill_level, status)
VALUES ('ถังขยะตลาดสด', 'ตลาดสดเช้า', 17.41500000, 104.78000000, 'organic', 0, 'active');
```

### Scenario 2: อัพเดทระดับขยะจาก IoT Sensor

```sql
UPDATE smart_bins SET fill_level = 85, temperature = 34.5 WHERE device_id = 'BIN001';
```

### Scenario 3: บันทึกการเก็บขยะ

```sql
-- ระบบจะบันทึกอัตโนมัติผ่าน Trigger
UPDATE smart_bins SET fill_level = 5 WHERE id = 3;
```

---

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อทีมพัฒนา

---

**เวอร์ชัน:** 1.0.0  
**อัพเดทล่าสุด:** 2024
