-- ============================================================
-- คำสั่งสำหรับเพิ่มถังขยะใหม่ใน HeidiSQL
-- คัดลอกคำสั่งด้านล่างแล้ววางใน HeidiSQL แล้วกด F9
-- ============================================================

USE nakhonphanom_smartbin;

-- ตัวอย่างที่ 1: เพิ่มถังขยะทั่วไป
INSERT INTO smart_bins (name, location_name, lat, lng, bin_type, fill_level, status, temperature, battery_level)
VALUES ('ถังขยะ #011', 'สวนสาธารณะนครพนม', 17.41000000, 104.79000000, 'general', 45, 'active', 32.0, 95);

-- ตัวอย่างที่ 2: เพิ่มถังรีไซเคิล
INSERT INTO smart_bins (name, location_name, lat, lng, bin_type, fill_level, status, temperature, battery_level)
VALUES ('ถังรีไซเคิล #012', 'โรงเรียนนครพนม', 17.40200000, 104.79500000, 'recycle', 70, 'active', 30.5, 88);

-- ตัวอย่างที่ 3: เพิ่มถังขยะอินทรีย์
INSERT INTO smart_bins (name, location_name, lat, lng, bin_type, fill_level, status, temperature, battery_level)
VALUES ('ถังอินทรีย์ #013', 'ตลาดสดเทศบาล', 17.41500000, 104.78000000, 'organic', 92, 'full', 35.0, 75);

-- ดูข้อมูลที่เพิ่มเข้าไป
SELECT * FROM smart_bins ORDER BY id DESC LIMIT 5;
