-- =========================================================
-- 🌊 SURF-GAME-WEB - DATA ARCHITECTURE DIRECTORY (MYSQL 9.6)
-- Base de datos transaccional extraída del entorno local
-- Sincronizada con el ecosistema Node.js & Leaderboards
-- =========================================================

CREATE DATABASE IF NOT EXISTS surf_game_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE surf_game_db;

-- ---------------------------------------------------------
-- 1. TABLA: users (Autenticación, Recuperación y Victorias)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    total_wins INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255) DEFAULT NULL,
    token_expiry DATETIME DEFAULT NULL,
    INDEX idx_users_username (username)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 2. TABLA: players (Registro General de Competidores)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    INDEX idx_players_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 3. TABLA: player_points (Auditoría de Recursos en Tiempo Real)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(100) DEFAULT NULL,
    resource_name VARCHAR(50) DEFAULT NULL,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_points_player (player_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 4. TABLA: matches (Historial de Competencias y Clasificaciones)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    winner_name VARCHAR(50) NOT NULL,
    items_count INT DEFAULT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_matches_winner (winner_name)
) ENGINE=InnoDB;
