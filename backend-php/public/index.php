<?php

// Include composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

use Config\Config;
use Db\Database;
use Api\Router;

try {
    // Load configuration
    $config = Config::load();

    // Connect to database
    $db = new Database($config);
    $db->connect();

    // Setup and run router
    $router = new Router($config);
    $router->route();
} catch (\Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Internal Server Error: ' . $e->getMessage()]);
    exit;
}
