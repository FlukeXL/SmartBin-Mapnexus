-- เพิ่มถังขยะสำหรับทดสอบ GPS
-- ใช้ไฟล์นี้ถ้ายังไม่มีข้อมูลถังขยะ ID=1

USE nakhonphanom_smartbin;

-- ลบข้อมูลเก่า (ถ้ามี)
DELETE FROM smart_bins WHERE id = 1;

-- เพิ่มถังขยะ ID=1 สำหรับทดสอบ GPS
INSERT INTO `smart_bins` 
(`id`, `name`, `location_name`, `lat`, `lng`, `bin_type`, `capacity`, `fill_level`, `status`, `temperature`, `battery_level`) 
VALUES
(1, 'ถังขยะทดสอบ GPS', 'ตำแหน่งทดสอบ', 17.395753084084337, 104.72132436445033, 104.78650000, 'general', 120, 50, 'active', 32.5, 95);

-- ตรวจสอบข้อมูล
SELECT * FROM smart_bins WHERE id = 1;