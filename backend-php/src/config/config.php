<?php

namespace Config;

class Config {
    public $server = [];
    public $database = [];
    public $jwt = [];

    public function __construct() {
        // Load .env file
        $this->loadEnv();

        // Server configuration
        $this->server['port'] = getenv('PORT') ?: '5000';
        $this->server['read_timeout'] = getenv('READ_TIMEOUT') ?: '15';
        $this->server['write_timeout'] = getenv('WRITE_TIMEOUT') ?: '15';
        $this->server['idle_timeout'] = getenv('IDLE_TIMEOUT') ?: '60';

        // Database configuration
        $this->database['host'] = getenv('DB_HOST') ?: 'localhost';
        $this->database['port'] = getenv('DB_PORT') ?: '3306';
        $this->database['user'] = getenv('DB_USER') ?: 'ambieye';
        $this->database['password'] = getenv('DB_PASSWORD') ?: 'ambieye123';
        $this->database['database'] = getenv('DB_NAME') ?: 'ambieye';

        // JWT configuration
        $this->jwt['secret'] = getenv('JWT_SECRET') ?: 'your-secret-key-change-in-production';
        $this->jwt['access_expiry'] = (int) (getenv('JWT_ACCESS_EXPIRY') ?: 15) * 60; // in seconds
        $this->jwt['refresh_expiry'] = (int) (getenv('JWT_REFRESH_EXPIRY') ?: (7 * 24)) * 3600; // in seconds
        $this->jwt['refresh_token_name'] = getenv('REFRESH_TOKEN_NAME') ?: 'refresh_token';
    }

    private function loadEnv() {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                    [$key, $value] = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);
                    putenv("$key=$value");
                }
            }
        }
    }

    public static function load() {
        return new self();
    }
}
