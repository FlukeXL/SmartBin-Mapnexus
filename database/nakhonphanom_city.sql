-- ============================================================
-- DATABASE 2: nakhonphanom_city
-- ข้อมูลเมืองอัจฉริยะ (Traffic, PM2.5, Waste, Weather, Water, Electricity, AI Logs)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS nakhonphanom_city
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nakhonphanom_city;

-- 1. ตารางสถานะจราจร
DROP TABLE IF EXISTS `traffic_status`;
CREATE TABLE `traffic_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `road_name` varchar(100) NOT NULL,
  `congestion_level` int(11) DEFAULT 0 COMMENT 'ระดับความหนาแน่น 0-100',
  `status_text` varchar(50) DEFAULT 'ปกติ',
  `trend` varchar(50) DEFAULT 'คงที่',
  `is_realtime` tinyint(1) DEFAULT 1,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางคุณภาพอากาศ PM2.5
DROP TABLE IF EXISTS `air_quality_history`;
CREATE TABLE `air_quality_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `aqi` int(11) NOT NULL,
  `pm25` float NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางถังขยะอัจฉริยะ
DROP TABLE IF EXISTS `waste_bins`;
CREATE TABLE `waste_bins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bin_name` varchar(100) NOT NULL,
  `bin_type` enum('plastic', 'glass', 'paper', 'can', 'general') DEFAULT 'general',
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL,
  `fill_level` int(11) DEFAULT 0 COMMENT 'ปริมาณขยะ %',
  `status` enum('empty', 'normal', 'almost_full', 'full') DEFAULT 'empty',
  `location_name` varchar(150) DEFAULT NULL COMMENT 'ชื่อตำแหน่ง',
  `gps_module` varchar(50) DEFAULT 'ATGM336H-5N',
  `image_url` varchar(500) DEFAULT NULL COMMENT 'URL รูปถังขยะจาก Supabase Storage',
  `last_update` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตารางประวัติสภาพอากาศ
DROP TABLE IF EXISTS `weather_history`;
CREATE TABLE `weather_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `area_id` varchar(20) NOT NULL,
  `area_name` varchar(100) NOT NULL,
  `temp` float DEFAULT NULL,
  `humidity` float DEFAULT NULL,
  `wind_speed` float DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `icon` varchar(20) DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตารางระดับน้ำ
DROP TABLE IF EXISTS `water_levels`;
CREATE TABLE `water_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station_name` varchar(100) DEFAULT 'สถานีวัดน้ำโขง',
  `value` float NOT NULL COMMENT 'ระดับน้ำ (เมตร)',
  `status` varchar(50) DEFAULT 'ปกติ',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ตารางไฟฟ้า
DROP TABLE IF EXISTS `electricity_usage`;
CREATE TABLE `electricity_usage` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `zone` varchar(50) NOT NULL,
  `usage_kwh` float NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ตาราง AI Logs (City Intelligence)
DROP TABLE IF EXISTS `ai_logs`;
CREATE TABLE `ai_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,  เทคโนโลยี
  `log_type` varchar(50) NOT NULL,
  `input_data` text,
  `prediction_result` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ข้อมูลเริ่มต้น
-- ============================================================

INSERT INTO `traffic_status` (`road_name`, `congestion_level`, `status_text`, `trend`)
VALUES
  ('ถนนสุนทรวิจิตร', 15, 'คล่องตัว', 'ลดลง'),
  ('ถนนนิตโย', 45, 'ปานกลาง', 'เพิ่มขึ้น'),
  ('ถนนอภิบาลบัญชา', 20, 'คล่องตัว', 'คงที่'),
  ('ถนนชยางกูร', 65, 'หนาแน่น', 'เพิ่มขึ้น');

INSERT INTO `water_levels` (`value`, `status`)
VALUES (4.25, 'ปกติ'), (4.10, 'ปกติ'), (4.50, 'ปกติ');

-- ===== เพิ่มเติม: ตาราง traffic_logs สำหรับ AI พยากรณ์จราจร =====
DROP TABLE IF EXISTS `traffic_logs`;
CREATE TABLE `traffic_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `road_id` varchar(50) NOT NULL COMMENT 'เช่น sunthon-wichit, nittayo',
  `congestion_level` int(11) NOT NULL DEFAULT 0 COMMENT '0-100%',
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_road_time` (`road_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== เพิ่มเติม: ตาราง crowd_logs สำหรับ AI พยากรณ์ความหนาแน่น =====
DROP TABLE IF EXISTS `crowd_logs`;
CREATE TABLE `crowd_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `location_id` varchar(20) NOT NULL COMMENT 'เช่น loc_01',
  `density_level` int(11) NOT NULL DEFAULT 0 COMMENT '0-100%',
  `is_manual` tinyint(1) DEFAULT 0,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_loc_time` (`location_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== Migration: เพิ่ม columns ใน waste_bins (ถ้า DB มีอยู่แล้ว) =====
-- รัน query นี้ถ้า import SQL ไปแล้วก่อนหน้า (ต้องอยู่ใน nakhonphanom_city):
-- USE nakhonphanom_city;
-- ALTER TABLE `waste_bins` ADD COLUMN IF NOT EXISTS `location_name` varchar(150) DEFAULT NULL;
-- ALTER TABLE `waste_bins` ADD COLUMN IF NOT EXISTS `gps_module` varchar(50) DEFAULT 'ATGM336H-5N';
