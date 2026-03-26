-- ============================================================
-- DATABASE: nakhonphanom_smartbin
-- ระบบจัดการถังขยะอัจฉริยะ (Smart Bin Management System)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS nakhonphanom_smartbin
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nakhonphanom_smartbin;

-- ============================================================
-- 1. ตารางถังขยะอัจฉริยะ (Smart Bins)
-- ============================================================
DROP TABLE IF EXISTS `smart_bins`;
CREATE TABLE `smart_bins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'ชื่อถังขยะ เช่น ถังขยะ #001',
  `location_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อสถานที่ตั้ง',
  `lat` decimal(10,8) NOT NULL COMMENT 'ละติจูด (Latitude)',
  `lng` decimal(11,8) NOT NULL COMMENT 'ลองจิจูด (Longitude)',
  `bin_type` enum('general','recycle','organic','hazardous') DEFAULT 'general' COMMENT 'ประเภทถังขยะ',
  `capacity` int(11) DEFAULT 100 COMMENT 'ความจุเต็ม (ลิตร)',
  `fill_level` int(11) DEFAULT 0 COMMENT 'ระดับขยะปัจจุบัน (0-100%)',
  `status` enum('active','inactive','maintenance','full') DEFAULT 'active' COMMENT 'สถานะการใช้งาน',
  `temperature` decimal(5,2) DEFAULT NULL COMMENT 'อุณหภูมิภายในถัง (°C)',
  `last_emptied` timestamp NULL DEFAULT NULL COMMENT 'ครั้งล่าสุดที่เทขยะ',
  `device_id` varchar(50) DEFAULT NULL COMMENT 'รหัสอุปกรณ์ IoT',
  `battery_level` int(11) DEFAULT 100 COMMENT 'ระดับแบตเตอรี่ (%)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_location` (`lat`, `lng`),
  KEY `idx_fill_level` (`fill_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. ตารางประวัติการเทขยะ (Collection History)
-- ============================================================
DROP TABLE IF EXISTS `collection_history`;
CREATE TABLE `collection_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bin_id` int(11) NOT NULL COMMENT 'รหัสถังขยะ',
  `collected_by` varchar(100) DEFAULT NULL COMMENT 'ผู้เก็บขยะ',
  `fill_level_before` int(11) DEFAULT NULL COMMENT 'ระดับขยะก่อนเท (%)',
  `weight` decimal(10,2) DEFAULT NULL COMMENT 'น้ำหนักขยะ (กก.)',
  `collection_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาที่เก็บขยะ',
  `notes` text COMMENT 'หมายเหตุ',
  PRIMARY KEY (`id`),
  KEY `fk_collection_bin` (`bin_id`),
  CONSTRAINT `fk_collection_bin` FOREIGN KEY (`bin_id`) REFERENCES `smart_bins`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. ตารางการแจ้งเตือน (Alerts)
-- ============================================================
DROP TABLE IF EXISTS `bin_alerts`;
CREATE TABLE `bin_alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bin_id` int(11) NOT NULL COMMENT 'รหัสถังขยะ',
  `alert_type` enum('full','maintenance','malfunction','battery_low') DEFAULT 'full' COMMENT 'ประเภทการแจ้งเตือน',
  `message` text COMMENT 'ข้อความแจ้งเตือน',
  `severity` enum('low','medium','high','critical') DEFAULT 'medium' COMMENT 'ระดับความสำคัญ',
  `is_resolved` tinyint(1) DEFAULT 0 COMMENT 'แก้ไขแล้วหรือยัง',
  `resolved_at` timestamp NULL DEFAULT NULL COMMENT 'เวลาที่แก้ไข',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_alert_bin` (`bin_id`),
  KEY `idx_resolved` (`is_resolved`),
  CONSTRAINT `fk_alert_bin` FOREIGN KEY (`bin_id`) REFERENCES `smart_bins`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. ตารางสถิติรายวัน (Daily Statistics)
-- ============================================================
DROP TABLE IF EXISTS `daily_stats`;
CREATE TABLE `daily_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bin_id` int(11) NOT NULL COMMENT 'รหัสถังขยะ',
  `date` date NOT NULL COMMENT 'วันที่',
  `avg_fill_level` decimal(5,2) DEFAULT NULL COMMENT 'ระดับขยะเฉลี่ย (%)',
  `max_fill_level` int(11) DEFAULT NULL COMMENT 'ระดับขยะสูงสุด (%)',
  `collections_count` int(11) DEFAULT 0 COMMENT 'จำนวนครั้งที่เก็บขยะ',
  `total_weight` decimal(10,2) DEFAULT NULL COMMENT 'น้ำหนักรวม (กก.)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_bin_date` (`bin_id`, `date`),
  KEY `fk_stats_bin` (`bin_id`),
  CONSTRAINT `fk_stats_bin` FOREIGN KEY (`bin_id`) REFERENCES `smart_bins`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. ตารางเส้นทางเก็บขยะ (Collection Routes)
-- ============================================================
DROP TABLE IF EXISTS `collection_routes`;
CREATE TABLE `collection_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `route_name` varchar(100) NOT NULL COMMENT 'ชื่อเส้นทาง',
  `description` text COMMENT 'คำอธิบาย',
  `bin_ids` text COMMENT 'รหัสถังขยะในเส้นทาง (JSON array)',
  `estimated_time` int(11) DEFAULT NULL COMMENT 'เวลาโดยประมาณ (นาที)',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'ใช้งานอยู่หรือไม่',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ข้อมูลตัวอย่าง (Sample Data)
-- ============================================================

-- เพิ่มถังขยะตัวอย่าง 10 ถัง
INSERT INTO `smart_bins` (`name`, `location_name`, `lat`, `lng`, `bin_type`, `capacity`, `fill_level`, `status`, `temperature`, `battery_level`) VALUES
('ถังขยะ #001', 'ลานพญาศรีสัตตนาคราช', 17.40380000, 104.78650000, 'general', 120, 45, 'active', 32.5, 95),
('ถังขยะ #002', 'หอนาฬิกาเวียดนามอนุสรณ์', 17.40690000, 104.78430000, 'recycle', 100, 70, 'active', 31.2, 88),
('ถังขยะ #003', 'ตลาดอินโดจีน', 17.40650000, 104.78820000, 'general', 150, 92, 'full', 35.8, 75),
('ถังขยะ #004', 'ถนนคนเดินนครพนม', 17.40800000, 104.78100000, 'recycle', 100, 30, 'active', 30.5, 92),
('ถังขยะ #005', 'วัดมหาธาตุ', 17.39850000, 104.79150000, 'organic', 80, 55, 'active', 33.0, 85),
('ถังขยะ #006', 'โรงพยาบาลนครพนม', 17.39920000, 104.78060000, 'hazardous', 60, 40, 'active', 28.5, 90),
('ถังขยะ #007', 'ศาลากลางจังหวัด', 17.39950000, 104.78420000, 'general', 120, 65, 'active', 32.0, 82),
('ถังขยะ #008', 'สวนสาธารณะริมโขง', 17.41000000, 104.79000000, 'general', 100, 25, 'active', 31.8, 95),
('ถังขยะ #009', 'โรงเรียนนครพนม', 17.40200000, 104.79500000, 'recycle', 100, 60, 'active', 30.0, 88),
('ถังขยะ #010', 'ตลาดสดเทศบาล', 17.41500000, 104.78000000, 'organic', 120, 85, 'active', 34.5, 78);

-- เพิ่มประวัติการเก็บขยะตัวอย่าง
INSERT INTO `collection_history` (`bin_id`, `collected_by`, `fill_level_before`, `weight`, `collection_time`, `notes`) VALUES
(1, 'ทีมเก็บขยะ A', 95, 45.5, '2024-01-15 08:30:00', 'เก็บตามปกติ'),
(2, 'ทีมเก็บขยะ A', 88, 38.2, '2024-01-15 09:00:00', 'ขยะรีไซเคิล'),
(3, 'ทีมเก็บขยะ B', 100, 62.8, '2024-01-15 10:15:00', 'ถังเต็มมาก'),
(5, 'ทีมเก็บขยะ B', 92, 28.5, '2024-01-15 11:00:00', 'ขยะอินทรีย์');

-- เพิ่มการแจ้งเตือนตัวอย่าง
INSERT INTO `bin_alerts` (`bin_id`, `alert_type`, `message`, `severity`, `is_resolved`) VALUES
(3, 'full', 'ถังขยะ #003 เต็มแล้ว กรุณาเก็บขยะด่วน', 'high', 0),
(10, 'full', 'ถังขยะ #010 ใกล้เต็ม (85%)', 'medium', 0),
(6, 'battery_low', 'แบตเตอรี่ต่ำ กรุณาเปลี่ยนแบตเตอรี่', 'low', 0);

-- เพิ่มเส้นทางเก็บขยะตัวอย่าง
INSERT INTO `collection_routes` (`route_name`, `description`, `bin_ids`, `estimated_time`, `is_active`) VALUES
('เส้นทาง A - ใจกลางเมือง', 'เก็บขยะบริเวณใจกลางเมืองนครพนม', '[1,2,3,7]', 45, 1),
('เส้นทาง B - ริมโขง', 'เก็บขยะบริเวณริมแม่น้ำโขง', '[4,5,8]', 35, 1),
('เส้นทาง C - โรงพยาบาล-โรงเรียน', 'เก็บขยะพิเศษ (อันตราย/รีไซเคิล)', '[6,9]', 25, 1);

-- ============================================================
-- Views สำหรับรายงาน
-- ============================================================

-- View: ถังขยะที่ต้องเก็บด่วน (fill_level >= 80%)
CREATE OR REPLACE VIEW `bins_need_collection` AS
SELECT 
    id,
    name,
    location_name,
    lat,
    lng,
    bin_type,
    fill_level,
    status,
    CASE 
        WHEN fill_level >= 90 THEN 'ด่วนมาก'
        WHEN fill_level >= 80 THEN 'ด่วน'
        ELSE 'ปกติ'
    END AS priority
FROM smart_bins
WHERE status = 'active' AND fill_level >= 80
ORDER BY fill_level DESC;

-- View: สถิติรวมของถังขยะ
CREATE OR REPLACE VIEW `bins_summary` AS
SELECT 
    COUNT(*) AS total_bins,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_bins,
    SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) AS full_bins,
    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_bins,
    AVG(fill_level) AS avg_fill_level,
    SUM(CASE WHEN fill_level >= 80 THEN 1 ELSE 0 END) AS bins_need_collection
FROM smart_bins;

-- ============================================================
-- Stored Procedures
-- ============================================================

-- Procedure: อัพเดทระดับขยะและสร้างการแจ้งเตือนอัตโนมัติ
DELIMITER $$

DROP PROCEDURE IF EXISTS `update_bin_fill_level`$$
CREATE PROCEDURE `update_bin_fill_level`(
    IN p_bin_id INT,
    IN p_fill_level INT
)
BEGIN
    DECLARE v_old_status VARCHAR(20);
    DECLARE v_new_status VARCHAR(20);
    
    -- อัพเดทระดับขยะ
    UPDATE smart_bins 
    SET fill_level = p_fill_level,
        status = CASE 
            WHEN p_fill_level >= 90 THEN 'full'
            WHEN status = 'maintenance' THEN 'maintenance'
            ELSE 'active'
        END
    WHERE id = p_bin_id;
    
    -- สร้างการแจ้งเตือนถ้าเต็ม
    IF p_fill_level >= 90 THEN
        INSERT INTO bin_alerts (bin_id, alert_type, message, severity)
        VALUES (p_bin_id, 'full', CONCAT('ถังขยะเต็มแล้ว (', p_fill_level, '%)'), 'high')
        ON DUPLICATE KEY UPDATE created_at = NOW();
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- Triggers
-- ============================================================

-- Trigger: บันทึกประวัติเมื่อเทขยะ (fill_level ลดลงมาก)
DELIMITER $$

DROP TRIGGER IF EXISTS `after_bin_emptied`$$
CREATE TRIGGER `after_bin_emptied`
AFTER UPDATE ON `smart_bins`
FOR EACH ROW
BEGIN
    -- ถ้า fill_level ลดลงมากกว่า 50% = มีการเทขยะ
    IF OLD.fill_level - NEW.fill_level > 50 THEN
        INSERT INTO collection_history (bin_id, fill_level_before, collection_time)
        VALUES (NEW.id, OLD.fill_level, NOW());
        
        -- อัพเดท last_emptied
        UPDATE smart_bins SET last_emptied = NOW() WHERE id = NEW.id;
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- คำสั่งที่มีประโยชน์
-- ============================================================

/*
-- ดูถังขยะทั้งหมด
SELECT * FROM smart_bins ORDER BY fill_level DESC;

-- ดูถังขยะที่ต้องเก็บด่วน
SELECT * FROM bins_need_collection;

-- ดูสถิติรวม
SELECT * FROM bins_summary;

-- ดูการแจ้งเตือนที่ยังไม่แก้ไข
SELECT b.name, a.alert_type, a.message, a.severity, a.created_at
FROM bin_alerts a
JOIN smart_bins b ON a.bin_id = b.id
WHERE a.is_resolved = 0
ORDER BY a.severity DESC, a.created_at DESC;

-- ดูประวัติการเก็บขยะ
SELECT b.name, c.collected_by, c.fill_level_before, c.weight, c.collection_time
FROM collection_history c
JOIN smart_bins b ON c.bin_id = b.id
ORDER BY c.collection_time DESC
LIMIT 20;
*/
