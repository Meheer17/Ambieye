<?php

namespace Api;

use Config\Config;
use Api\Handlers\AuthHandler;
use Api\Handlers\DoctorHandler;
use Api\Handlers\PatientHandler;
use Api\Handlers\QueryHandler;
use Api\Handlers\GameHandler;
use Api\Handlers\NotificationHandler;
use Api\Middleware\AuthMiddleware;
use Api\Middleware\RoleMiddleware;

class Router {
    private $config;
    private $method;
    private $path;
    private $handlers;

    public function __construct(Config $config) {
        $this->config = $config;
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Initialize handlers
        $this->handlers = [
            'auth' => new AuthHandler($config),
            'doctor' => new DoctorHandler(),
            'patient' => new PatientHandler(),
            'query' => new QueryHandler(),
            'game' => new GameHandler(),
            'notification' => new NotificationHandler(),
        ];
    }

    public function route() {
        // Extract the path from REQUEST_URI
        $this->path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Remove base paths - handle various server configurations
        $this->path = preg_replace('#^/Ambieye/backend-php/public#', '', $this->path);
        $this->path = preg_replace('#^/public#', '', $this->path);
        
        // Ensure path starts with /
        $this->path = '/' . ltrim($this->path, '/');
        // Remove trailing slash but keep root as /
        $this->path = rtrim($this->path, '/') ?: '/';

        // Set CORS headers
        $this->setCorsHeaders();

        // Handle preflight requests
        if ($this->method === 'OPTIONS') {
            http_response_code(200);
            exit;
        }

        // Set JSON header
        header('Content-Type: application/json');

        // Parse JSON body
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        // Route requests
        switch (true) {
            // Health check
            case $this->path === '/health' && $this->method === 'GET':
                $this->response([
                    'status' => 200,
                    'response' => ['message' => 'API is healthy', 'timestamp' => date('Y-m-d H:i:s')]
                ]);
                break;

            // Static pages
            case $this->path === '/privacy-policy' && $this->method === 'GET':
                $this->serveFile(__DIR__ . '/../../public/privacy.html');
                break;
            case $this->path === '/delete-account' && $this->method === 'GET':
                $this->serveFile(__DIR__ . '/../../public/delete.html');
                break;

            // Auth routes
            case preg_match('#^/api/auth/login$#', $this->path) && $this->method === 'POST':
                $this->response($this->handlers['auth']->login($body));
                break;
            case preg_match('#^/api/auth/signup$#', $this->path) && $this->method === 'POST':
                $this->response($this->handlers['auth']->signup($body));
                break;
            case preg_match('#^/api/auth/logout$#', $this->path) && $this->method === 'POST':
                $this->response($this->handlers['auth']->logout());
                break;
            case preg_match('#^/api/auth/verify$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                $this->response($this->handlers['auth']->verify());
                break;

            // Doctor routes
            case preg_match('#^/api/doctor/dashboard$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->getDashboard());
                break;
            case preg_match('#^/api/doctor/patients$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->getPatients());
                break;
            case preg_match('#^/api/doctor/patients/(\d+)$#', $this->path, $matches) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->getPatientById($matches[1]));
                break;
            case preg_match('#^/api/doctor/patients/medicalinfo/(\d+)$#', $this->path, $matches) && $this->method === 'POST':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->updatePatientMedicalInfo($matches[1], $body));
                break;
            case preg_match('#^/api/doctor/patients/visitrecord/(\d+)$#', $this->path, $matches) && $this->method === 'POST':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->addPatientVisitRecord($matches[1], $body));
                break;
            case preg_match('#^/api/doctor/profile$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->getProfile());
                break;
            case preg_match('#^/api/doctor/delete$#', $this->path) && $this->method === 'POST':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['doctor']->deleteDoctor());
                break;

            // Patient routes
            case preg_match('#^/api/patient/dashboard$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['patient']->getDashboard());
                break;
            case preg_match('#^/api/patient/profile$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['patient']->getProfile());
                break;
            case preg_match('#^/api/patient/profile$#', $this->path) && $this->method === 'PUT':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['patient']->updateProfile($body));
                break;
            case preg_match('#^/api/patient/doctors/(\d+)$#', $this->path, $matches) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['patient']->getDoctorById($matches[1]));
                break;
            case preg_match('#^/api/patient/queries$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['patient']->getPatientQueries());
                break;
            case preg_match('#^/api/patient/delete$#', $this->path) && $this->method === 'POST':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['patient']->deletePatient());
                break;

            // Query routes
            case preg_match('#^/api/queries$#', $this->path) && $this->method === 'POST':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['query']->createQuery($body));
                break;
            case preg_match('#^/api/queries/(\d+)$#', $this->path, $matches) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                $this->response($this->handlers['query']->getQuery($matches[1]));
                break;
            case preg_match('#^/api/queries/(\d+)/answer$#', $this->path, $matches) && $this->method === 'PUT':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['query']->answerQuery($matches[1], $body));
                break;
            case preg_match('#^/api/doctor/queries$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('doctor');
                $this->response($this->handlers['query']->getAllQueries());
                break;

            // Game routes
            case preg_match('#^/api/games/results$#', $this->path) && $this->method === 'POST':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                RoleMiddleware::checkRole('patient');
                $this->response($this->handlers['game']->saveGameResult($body));
                break;
            case preg_match('#^/api/games/today$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                $this->response($this->handlers['game']->getTodayGameResults());
                break;
            case preg_match('#^/api/games/history$#', $this->path) && $this->method === 'GET':
                $authMiddleware = new AuthMiddleware($this->config->jwt['secret']);
                $authMiddleware->verify();
                $this->response($this->handlers['game']->getGameHistory());
                break;

            default:
                http_response_code(404);
                echo json_encode(['error' => 'Not Found']);
                break;
        }
    }

    private function setCorsHeaders() {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization');
    }

    private function serveFile($filePath) {
        if (file_exists($filePath)) {
            readfile($filePath);
            exit;
        }
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
    }

    private function response($result) {
        http_response_code($result['status']);
        echo json_encode($result['response']);
        exit;
    }
}
