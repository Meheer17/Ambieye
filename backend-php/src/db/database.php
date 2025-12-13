<?php

namespace Db;

class Database {
    private static $connection = null;
    private $config;

    public function __construct($config) {
        $this->config = $config;
    }

    public function connect() {
        try {
            $dsn = sprintf(
                "mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4",
                $this->config->database['host'],
                $this->config->database['port'],
                $this->config->database['database']
            );

            $connection = new \PDO(
                $dsn,
                $this->config->database['user'],
                $this->config->database['password'],
                [
                    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                ]
            );

            self::$connection = $connection;
            return $connection;
        } catch (\PDOException $e) {
            die('Database connection failed: ' . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$connection === null) {
            throw new \Exception('Database connection not initialized');
        }
        return self::$connection;
    }

    public static function closeConnection() {
        self::$connection = null;
    }

    /**
     * Get database name
     */
    public function getDatabase() {
        return $this->config->database['database'];
    }
}
