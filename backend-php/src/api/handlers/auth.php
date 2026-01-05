<?php

namespace Api\Handlers;

use Db\Database;
use Db\Models\User;
use Auth\JWTHandler;
use Config\Config;

class AuthHandler {
    private $pdo;
    private $config;
    private $jwtHandler;

    public function __construct(Config $config) {
        $this->pdo = Database::getInstance();
        $this->config = $config;
        $this->jwtHandler = new JWTHandler($config->jwt['secret']);
    }

    /**
     * Login handler
     */
    public function login($data) {
        if (empty($data['username']) || empty($data['password'])) {
            return [
                'status' => 400,
                'response' => ['error' => 'Username and password are required']
            ];
        }

        try {
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE username = ?');
            $stmt->execute([$data['username']]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$user) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Invalid credentials']
                ];
            }

            // Verify password
            if (!password_verify($data['password'], $user['password'])) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Invalid credentials']
                ];
            }

            // Create tokens
            $tokens = $this->jwtHandler->createTokens(
                $user,
                $this->config->jwt['access_expiry'],
                $this->config->jwt['refresh_expiry']
            );

            // Parse medicalInfo and visitRecords from JSON
            $user['medicalInfo'] = json_decode($user['medicalInfo'] ?? '{}', true);
            $user['visitRecords'] = json_decode($user['visitRecords'] ?? '[]', true);

            $safeUser = [
                'id' => $user['id'],
                'fullName' => $user['fullName'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'],
            ];

            return [
                'status' => 200,
                'response' => [
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token'],
                    'user' => $safeUser,
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Signup handler
     */
    public function signup($data) {
        // Validate input
        $required = ['fullName', 'username', 'email', 'password', 'userType', 'phone', 'age', 'gender', 'fatherName', 'motherName', 'address', 'dateOfBirth'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return [
                    'status' => 400,
                    'response' => ['error' => "Missing required field: $field"]
                ];
            }
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return [
                'status' => 400,
                'response' => ['error' => 'Invalid email format']
            ];
        }

        if (strlen($data['password']) < 6) {
            return [
                'status' => 400,
                'response' => ['error' => 'Password must be at least 6 characters']
            ];
        }

        if (!in_array($data['userType'], ['doctor', 'patient'])) {
            return [
                'status' => 400,
                'response' => ['error' => 'Invalid userType']
            ];
        }

        try {
            // Check if username exists
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM users WHERE username = ?');
            $stmt->execute([$data['username']]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($result['count'] > 0) {
                return [
                    'status' => 409,
                    'response' => ['error' => 'Username already exists']
                ];
            }

            // Check if email exists
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
            $stmt->execute([$data['email']]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($result['count'] > 0) {
                return [
                    'status' => 409,
                    'response' => ['error' => 'Email already exists']
                ];
            }

            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
            $uuid = bin2hex(random_bytes(6));
            $now = date('Y-m-d H:i:s');

            // Insert user
            $stmt = $this->pdo->prepare('
                INSERT INTO users (
                    fullName, username, email, password, role, uuid,
                    phone, age, gender, fatherName, motherName, address, dateOfBirth,
                    medicalInfo, visitRecords, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([
                $data['fullName'],
                $data['username'],
                $data['email'],
                $hashedPassword,
                $data['userType'],
                $uuid,
                $data['phone'],
                $data['age'],
                $data['gender'],
                $data['fatherName'],
                $data['motherName'],
                $data['address'],
                $data['dateOfBirth'],
                '{}', // empty medicalInfo
                '[]', // empty visitRecords
                $now,
                $now,
            ]);

            $userId = $this->pdo->lastInsertId();

            // Create tokens
            $user = [
                'id' => $userId,
                'username' => $data['username'],
                'role' => $data['userType'],
                'email' => $data['email'],
            ];

            $tokens = $this->jwtHandler->createTokens(
                $user,
                $this->config->jwt['access_expiry'],
                $this->config->jwt['refresh_expiry']
            );

            $safeUser = [
                'id' => $userId,
                'fullName' => $data['fullName'],
                'username' => $data['username'],
                'email' => $data['email'],
                'role' => $data['userType'],
            ];

            return [
                'status' => 201,
                'response' => [
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token'],
                    'user' => $safeUser,
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Failed to create account']
            ];
        }
    }

    /**
     * Verify token handler
     */
    public function verify() {
        try {
            $userId = $_SERVER['userID'] ?? null;
            if (!$userId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $stmt = $this->pdo->prepare('SELECT id, fullName, username, email, role FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$user) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User not found']
                ];
            }

            return [
                'status' => 200,
                'response' => $user
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Error verifying token']
            ];
        }
    }

    /**
     * Logout handler (client-side token removal)
     */
    public function logout() {
        return [
            'status' => 200,
            'response' => ['message' => 'Logged out successfully']
        ];
    }
}
