<?php

namespace Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHandler {
    private $secret;
    private $algorithm = 'HS256';

    public function __construct($secret) {
        $this->secret = $secret;
    }

    /**
     * Create access and refresh tokens
     */
    public function createTokens($user, $accessExpiry, $refreshExpiry) {
        $now = time();

        // Access Token
        $accessPayload = [
            'iat' => $now,
            'exp' => $now + $accessExpiry,
            'userID' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'email' => $user['email'],
        ];

        // Refresh Token
        $refreshPayload = [
            'iat' => $now,
            'exp' => $now + $refreshExpiry,
            'userID' => $user['id'],
            'username' => $user['username'],
        ];

        $accessToken = JWT::encode($accessPayload, $this->secret, $this->algorithm);
        $refreshToken = JWT::encode($refreshPayload, $this->secret, $this->algorithm);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
        ];
    }

    /**
     * Verify and decode token
     */
    public function verifyToken($token) {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return $decoded;
        } catch (\Exception $e) {
            throw new \Exception('Invalid token: ' . $e->getMessage());
        }
    }

    /**
     * Extract token from Authorization header
     */
    public static function getTokenFromHeader() {
        // Try to get the Authorization header from different sources
        $authHeader = null;

        // Check $_SERVER['HTTP_AUTHORIZATION'] first (most reliable)
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        // Try getallheaders() as fallback
        elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? '';
        }

        if (empty($authHeader)) {
            throw new \Exception('Missing Authorization header');
        }

        if (!preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
            throw new \Exception('Invalid Authorization header format');
        }

        return $matches[1];
    }
}
