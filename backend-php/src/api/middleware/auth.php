<?php

namespace Api\Middleware;

use Auth\JWTHandler;

class AuthMiddleware {
    private $jwtHandler;

    public function __construct($secret) {
        $this->jwtHandler = new JWTHandler($secret);
    }

    public function verify() {
        try {
            $token = JWTHandler::getTokenFromHeader();
            $decoded = $this->jwtHandler->verifyToken($token);
            
            // Store decoded data in $_SERVER for use in handlers
            $_SERVER['userID'] = $decoded->userID;
            $_SERVER['username'] = $decoded->username;
            $_SERVER['role'] = $decoded->role;
            $_SERVER['email'] = $decoded->email;
            
            return true;
        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['error' => $e->getMessage()]);
            exit;
        }
    }
}

class RoleMiddleware {
    public static function checkRole($requiredRole) {
        $userRole = $_SERVER['role'] ?? null;
        
        if ($userRole !== $requiredRole) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied. Required role: ' . $requiredRole]);
            exit;
        }
        
        return true;
    }
}
