-- ============================================================
-- DATABASE 1: nakhonphanom_app
-- ข้อมูลแอปพลิเคชัน (Users, Places, Checkins, Events, Reviews, Programs)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS nakhonphanom_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nakhonphanom_app;

-- 1. ตารางผู้ใช้งาน
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT 'ชื่อผู้ใช้',
  `email` varchar(100) NOT NULL UNIQUE COMMENT 'อีเมล',
  `password` varchar(255) NOT NULL COMMENT 'รหัสผ่าน',
  `role` enum('user', 'admin') DEFAULT 'user',
  `is_premium` tinyint(1) DEFAULT 0,
  `xp` int(11) DEFAULT 0,
  `level` int(11) DEFAULT 1,
  `points` int(11) DEFAULT 0,
  `avatar_url` varchar(255) DEFAULT NULL,
  `passport_id` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางสถานที่
DROP TABLE IF EXISTS `places`;
CREATE TABLE `places` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name_th` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `description` text,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `category` varchar(50) DEFAULT 'landmark',
  `xp_reward` int(11) DEFAULT 100,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางเช็คอิน
DROP TABLE IF EXISTS `checkins`;
CREATE TABLE `checkins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `place_id` int(11) NOT NULL,
  `xp_earned` int(11) DEFAULT 0,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_checkin_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_checkin_place` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตารางกิจกรรม/ข่าวสาร
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `image_url` varchar(255) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'general',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตารางรีวิว
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `place_id` int(11) NOT NULL,
  `rating` tinyint(1) NOT NULL DEFAULT 5,
  `comment` text,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_place` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ตารางโปรแกรม/แพ็กเกจ
DROP TABLE IF EXISTS `programs`;
CREATE TABLE `programs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(10,2) DEFAULT 0.00,
  `duration_days` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ตาราง AI Requests Log
DROP TABLE IF EXISTS `ai_requests`;
CREATE TABLE `ai_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `request_type` varchar(50) DEFAULT 'route',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ข้อมูลเริ่มต้น
-- ============================================================

INSERT INTO `users` (`username`, `email`, `password`, `role`, `is_premium`)
VALUES ('แอดมินระบบ', 'admin@nkp.go.th', 'admin123', 'admin', 1);

INSERT INTO `places` (`name_th`, `lat`, `lng`, `xp_reward`)
VALUES
  ('พญาศรีสัตตนาคราช', 17.4082, 104.7892, 150),
  ('พระธาตุพนม', 16.9405, 104.7334, 500),
  ('วัดโอกาส (ศรีบัวบาน)', 17.4065, 104.7865, 200),
  ('หอนาฬิกาเวียดนามอนุสรณ์', 17.4105, 104.7855, 100);

INSERT INTO `events` (`title`, `description`, `type`)
VALUES
  ('เทศกาลไหลเรือไฟ', 'งานประเพณีไหลเรือไฟนครพนม', 'festival'),
  ('วันออกพรรษา', 'กิจกรรมทางศาสนา', 'cultural');
