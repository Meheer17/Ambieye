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
            
            error_log('Auth verified - UserID: ' . $decoded->userID . ', Role: ' . $decoded->role);
            return true;
        } catch (\Exception $e) {
            error_log('Auth verification failed: ' . $e->getMessage());
            http_response_code(401);
            echo json_encode([
                'status' => 401,
                'response' => ['error' => 'Authentication failed: ' . $e->getMessage()]
            ]);
            exit;
        }
    }
}

class RoleMiddleware {
    public static function checkRole($requiredRole) {
        $userRole = $_SERVER['role'] ?? null;
        
        error_log('Role check - Required: ' . $requiredRole . ', User role: ' . ($userRole ?? 'null'));
        
        if ($userRole !== $requiredRole) {
            error_log('Role check failed - User role "' . $userRole . '" does not match required "' . $requiredRole . '"');
            http_response_code(403);
            echo json_encode(['error' => 'Access denied. Required role: ' . $requiredRole]);
            exit;
        }
        
        return true;
    }
}
