-- MySQL Database Schema for Ambieye Backend

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ambieye;
USE ambieye;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `fullName` VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('doctor', 'patient') NOT NULL,
    uuid VARCHAR(50),
    doctor_id INT,
    phone VARCHAR(20),
    age VARCHAR(3),
    `gender` VARCHAR(20),
    `fatherName` VARCHAR(255),
    `motherName` VARCHAR(255),
    `address` TEXT,
    `dateOfBirth` VARCHAR(50),
    `medicalInfo` JSON,
    `visitRecords` JSON,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (`role`)
);

-- Queries table
CREATE TABLE IF NOT EXISTS queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `patientId` INT NOT NULL,
    `doctorId` INT,
    question TEXT NOT NULL,
    `response` TEXT,
    `status` ENUM('pending', 'answered', 'closed') DEFAULT 'pending',
    urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `answeredAt` TIMESTAMP NULL,
    FOREIGN KEY (`patientId`) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (`doctorId`) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patientId (`patientId`),
    INDEX idx_doctorId (`doctorId`),
    INDEX idx_status (`status`),
    INDEX idx_urgency (urgency)
);

-- Game Results table
CREATE TABLE IF NOT EXISTS `gameResults` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `userId` INT NOT NULL,
    `gameId` INT NOT NULL,
    score INT,
    duration FLOAT,
    `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSON,
    FOREIGN KEY (`userId`) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (`userId`),
    INDEX idx_gameId (`gameId`),
    INDEX idx_date (`date`)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `userId` INT NOT NULL,
    title VARCHAR(255),
    body TEXT,
    `type` VARCHAR(50),
    `read` BOOLEAN DEFAULT FALSE,
    `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`userId`) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (`userId`),
    INDEX idx_read (`read`)
);
