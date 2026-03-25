# 📊 Supabase Migration Guide - Nakhon Phanom Smart City

คู่มือการย้ายฐานข้อมูลจาก MySQL ไป Supabase (PostgreSQL)

---

## 🗄️ โครงสร้างฐานข้อมูล

โปรเจกต์นี้ใช้ **2 ฐานข้อมูล** แยกกัน:

### 1️⃣ **nakhonphanom_app** - ข้อมูลแอปพลิเคชัน
### 2️⃣ **nakhonphanom_city** - ข้อมูลเมืองอัจฉริยะ

---

## 📋 DATABASE 1: nakhonphanom_app

### **Table: users** - ตารางผู้ใช้งาน
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_premium BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  avatar_url VARCHAR(255),
  passport_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key (Auto Increment)
- `username` - ชื่อผู้ใช้
- `email` - อีเมล (Unique)
- `password` - รหัสผ่าน (Hashed)
- `role` - บทบาท (user/admin)
- `is_premium` - สถานะพรีเมียม
- `xp` - คะแนนประสบการณ์
- `level` - ระดับ
- `points` - คะแนน
- `avatar_url` - URL รูปโปรไฟล์
- `passport_id` - รหัสพาสปอร์ตพลเมือง
- `created_at` - วันที่สร้าง
- `last_login` - เข้าสู่ระบบล่าสุด

---

### **Table: places** - ตารางสถานที่
```sql
CREATE TABLE places (
  id SERIAL PRIMARY KEY,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  category VARCHAR(50) DEFAULT 'landmark',
  xp_reward INTEGER DEFAULT 100
);
```

**Columns:**
- `id` - Primary Key
- `name_th` - ชื่อภาษาไทย
- `name_en` - ชื่อภาษาอังกฤษ
- `description` - คำอธิบาย
- `lat` - Latitude
- `lng` - Longitude
- `category` - หมวดหมู่
- `xp_reward` - คะแนน XP ที่ได้รับ

---

### **Table: checkins** - ตารางเช็คอิน
```sql
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  xp_earned INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `user_id` - Foreign Key → users.id
- `place_id` - Foreign Key → places.id
- `xp_earned` - XP ที่ได้รับ
- `timestamp` - เวลาเช็คอิน

---

### **Table: events** - ตารางกิจกรรม/ข่าวสาร
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  type VARCHAR(50) DEFAULT 'general',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `title` - หัวข้อ
- `description` - รายละเอียด
- `image_url` - URL รูปภาพ
- `type` - ประเภท
- `timestamp` - วันที่สร้าง

---

### **Table: reviews** - ตารางรีวิว
```sql
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `user_id` - Foreign Key → users.id
- `place_id` - Foreign Key → places.id
- `rating` - คะแนน (1-5)
- `comment` - ความคิดเห็น
- `timestamp` - วันที่รีวิว

---

### **Table: programs** - ตารางโปรแกรม/แพ็กเกจ
```sql
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  duration_days INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `name` - ชื่อโปรแกรม
- `description` - รายละเอียด
- `price` - ราคา
- `duration_days` - ระยะเวลา (วัน)
- `created_at` - วันที่สร้าง

---

### **Table: ai_requests** - ตาราง AI Requests Log
```sql
CREATE TABLE ai_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  request_type VARCHAR(50) DEFAULT 'route',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `user_id` - Foreign Key → users.id (nullable)
- `request_type` - ประเภทคำขอ
- `timestamp` - เวลาที่ขอ

---

## 📋 DATABASE 2: nakhonphanom_city

### **Table: traffic_status** - ตารางสถานะจราจร
```sql
CREATE TABLE traffic_status (
  id SERIAL PRIMARY KEY,
  road_name VARCHAR(100) NOT NULL,
  congestion_level INTEGER DEFAULT 0,
  status_text VARCHAR(50) DEFAULT 'ปกติ',
  trend VARCHAR(50) DEFAULT 'คงที่',
  is_realtime BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `road_name` - ชื่อถนน
- `congestion_level` - ระดับความหนาแน่น (0-100)
- `status_text` - สถานะ (ข้อความ)
- `trend` - แนวโน้ม
- `is_realtime` - ข้อมูลเรียลไทม์หรือไม่
- `timestamp` - เวลาบันทึก

---

### **Table: air_quality_history** - ตารางคุณภาพอากาศ PM2.5
```sql
CREATE TABLE air_quality_history (
  id SERIAL PRIMARY KEY,
  aqi INTEGER NOT NULL,
  pm25 FLOAT NOT NULL,
  status VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `aqi` - Air Quality Index
- `pm25` - ค่า PM2.5
- `status` - สถานะคุณภาพอากาศ
- `timestamp` - เวลาบันทึก

---

### **Table: waste_bins** - ตารางถังขยะอัจฉริยะ ⭐ IMPORTANT
```sql
CREATE TABLE waste_bins (
  id SERIAL PRIMARY KEY,
  bin_name VARCHAR(100) NOT NULL,
  bin_type VARCHAR(20) DEFAULT 'general' CHECK (bin_type IN ('plastic', 'glass', 'paper', 'can', 'general')),
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  fill_level INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'empty' CHECK (status IN ('empty', 'normal', 'almost_full', 'full')),
  location_name VARCHAR(150),
  gps_module VARCHAR(50) DEFAULT 'ATGM336H-5N',
  image_url VARCHAR(500),
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `bin_name` - ชื่อถัง
- `bin_type` - ประเภท (plastic/glass/paper/can/general)
- `lat` - Latitude
- `lng` - Longitude
- `fill_level` - ปริมาณขยะ (0-100%)
- `status` - สถานะ (empty/normal/almost_full/full)
- `location_name` - ชื่อตำแหน่ง
- `gps_module` - โมดูล GPS (ATGM336H-5N)
- `image_url` - URL รูปถังขยะจาก Supabase Storage ⭐ NEW
- `last_update` - อัปเดตล่าสุด

**Supabase Storage Bucket:**
- Bucket Name: `waste-bin-images`
- Path Format: `bins/{bin_id}/{timestamp}.jpg`
- Public Access: Yes (เพื่อแสดงรูปบนแผนที่)

---

### **Table: weather_history** - ตารางประวัติสภาพอากาศ
```sql
CREATE TABLE weather_history (
  id SERIAL PRIMARY KEY,
  area_id VARCHAR(20) NOT NULL,
  area_name VARCHAR(100) NOT NULL,
  temp FLOAT,
  humidity FLOAT,
  wind_speed FLOAT,
  description VARCHAR(100),
  icon VARCHAR(20),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `area_id` - รหัสพื้นที่
- `area_name` - ชื่อพื้นที่
- `temp` - อุณหภูมิ
- `humidity` - ความชื้น
- `wind_speed` - ความเร็วลม
- `description` - คำอธิบาย
- `icon` - ไอคอนสภาพอากาศ
- `timestamp` - เวลาบันทึก

---

### **Table: water_levels** - ตารางระดับน้ำ
```sql
CREATE TABLE water_levels (
  id SERIAL PRIMARY KEY,
  station_name VARCHAR(100) DEFAULT 'สถานีวัดน้ำโขง',
  value FLOAT NOT NULL,
  status VARCHAR(50) DEFAULT 'ปกติ',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `station_name` - ชื่อสถานี
- `value` - ระดับน้ำ (เมตร)
- `status` - สถานะ
- `timestamp` - เวลาบันทึก

---

### **Table: electricity_usage** - ตารางไฟฟ้า
```sql
CREATE TABLE electricity_usage (
  id SERIAL PRIMARY KEY,
  zone VARCHAR(50) NOT NULL,
  usage_kwh FLOAT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `zone` - โซน
- `usage_kwh` - การใช้ไฟฟ้า (kWh)
- `timestamp` - เวลาบันทึก

---

### **Table: ai_logs** - ตาราง AI Logs (City Intelligence)
```sql
CREATE TABLE ai_logs (
  id SERIAL PRIMARY KEY,
  log_type VARCHAR(50) NOT NULL,
  input_data TEXT,
  prediction_result TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id` - Primary Key
- `log_type` - ประเภท log
- `input_data` - ข้อมูลนำเข้า
- `prediction_result` - ผลการพยากรณ์
- `timestamp` - เวลาบันทึก

---

### **Table: traffic_logs** - ตาราง AI พยากรณ์จราจร
```sql
CREATE TABLE traffic_logs (
  id SERIAL PRIMARY KEY,
  road_id VARCHAR(50) NOT NULL,
  congestion_level INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_traffic_road_time ON traffic_logs(road_id, recorded_at);
```

**Columns:**
- `id` - Primary Key
- `road_id` - รหัสถนน (เช่น sunthon-wichit)
- `congestion_level` - ระดับความหนาแน่น (0-100%)
- `recorded_at` - เวลาบันทึก

---

### **Table: crowd_logs** - ตาราง AI พยากรณ์ความหนาแน่นคน
```sql
CREATE TABLE crowd_logs (
  id SERIAL PRIMARY KEY,
  location_id VARCHAR(20) NOT NULL,
  density_level INTEGER NOT NULL DEFAULT 0,
  is_manual BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crowd_loc_time ON crowd_logs(location_id, recorded_at);
```

**Columns:**
- `id` - Primary Key
- `location_id` - รหัสสถานที่ (เช่น loc_01)
- `density_level` - ระดับความหนาแน่น (0-100%)
- `is_manual` - บันทึกด้วยตนเองหรือไม่
- `recorded_at` - เวลาบันทึก

---

## 🔄 ขั้นตอนการ Migrate ไป Supabase

### 1. สร้าง Project ใน Supabase
1. ไปที่ https://supabase.com
2. สร้าง Project ใหม่
3. เลือก Region ที่ใกล้ที่สุด (Singapore แนะนำ)

### 2. สร้าง Tables ใน Supabase
เนื่องจาก Supabase ใช้ PostgreSQL คุณต้อง:

**Option 1: ใช้ SQL Editor ใน Supabase Dashboard**
- คัดลอก SQL statements ข้างบนไปรันใน SQL Editor
- แก้ไข syntax ที่แตกต่างจาก MySQL:
  - `AUTO_INCREMENT` → `SERIAL`
  - `TINYINT(1)` → `BOOLEAN`
  - `ENUM` → `VARCHAR` + `CHECK` constraint
  - `DECIMAL` → `NUMERIC` หรือ `DECIMAL` (เหมือนกัน)

**Option 2: ใช้ Table Editor (GUI)**
- สร้าง tables ผ่าน UI
- เพิ่ม columns ตามโครงสร้างข้างบน

### 3. ตั้งค่า Row Level Security (RLS)
```sql
-- ตัวอย่าง: อนุญาตให้ทุกคนอ่านข้อมูล places
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON places
  FOR SELECT USING (true);

-- อนุญาตให้ user แก้ไขข้อมูลตัวเองเท่านั้น
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);
```

### 4. อัปเดต Backend Connection
แก้ไขไฟล์ `backend/config/db.js`:

```javascript
// เดิม: MySQL
const mysql = require('mysql2/promise');

// ใหม่: Supabase (PostgreSQL)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
```

### 5. แก้ไข SQL Queries
แก้ไข queries ใน routes ทั้งหมด:

**เดิม (MySQL):**
```javascript
const [rows] = await appPool.query('SELECT * FROM users WHERE id = ?', [userId]);
```

**ใหม่ (Supabase):**
```javascript
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

---

## 📦 ติดตั้ง Dependencies

```bash
npm install @supabase/supabase-js
```

---

## 🔑 Environment Variables

เพิ่มใน `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

---

## ⚠️ สิ่งที่ต้องระวัง

1. **Foreign Keys**: Supabase รองรับ แต่ต้องสร้างให้ถูกต้อง
2. **Timestamps**: ใช้ `TIMESTAMP` หรือ `TIMESTAMPTZ` (แนะนำ)
3. **Auto Increment**: ใช้ `SERIAL` แทน `AUTO_INCREMENT`
4. **ENUM**: PostgreSQL มี ENUM แต่แนะนำใช้ `VARCHAR` + `CHECK` constraint
5. **Boolean**: ใช้ `BOOLEAN` แทน `TINYINT(1)`

---

## 📊 สรุปจำนวน Tables

### Database 1: nakhonphanom_app
- ✅ users
- ✅ places
- ✅ checkins
- ✅ events
- ✅ reviews
- ✅ programs
- ✅ ai_requests

**รวม: 7 tables**

### Database 2: nakhonphanom_city
- ✅ traffic_status
- ✅ air_quality_history
- ✅ waste_bins ⭐ (Smart Bin GPS)
- ✅ weather_history
- ✅ water_levels
- ✅ electricity_usage
- ✅ ai_logs
- ✅ traffic_logs (AI Prediction)
- ✅ crowd_logs (AI Prediction)

**รวม: 9 tables**

---

## 🎯 ตารางสำคัญสำหรับ Smart Bin System

### waste_bins
ตารางนี้เป็นหัวใจของระบบถังขยะอัจฉริยะ:
- เก็บพิกัด GPS จาก ATGM336H-5N Module
- เก็บปริมาณขยะจาก Ultrasonic Sensor
- อัปเดตแบบ realtime ผ่าน WebSocket
- แสดงบนแผนที่ใน Admin Dashboard

---

## 📝 หมายเหตุ

- ข้อมูลทั้งหมดใช้ `utf8mb4` encoding (รองรับภาษาไทย + Emoji)
- Timestamps ใช้ `CURRENT_TIMESTAMP` เป็นค่าเริ่มต้น
- Foreign Keys มี `ON DELETE CASCADE` เพื่อลบข้อมูลที่เกี่ยวข้องอัตโนมัติ
- Index ถูกสร้างสำหรับ queries ที่ใช้บ่อย (traffic_logs, crowd_logs)

---

**สร้างโดย:** Kiro AI Assistant  
**วันที่:** 2026-03-24  
**เวอร์ชัน:** 1.0
