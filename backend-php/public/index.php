<?php

// Include composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';
// Fallback: include class files directly (handles lowercase filenames on case-sensitive filesystems)
require_once __DIR__ . '/../src/config/config.php';
require_once __DIR__ . '/../src/db/database.php';
require_once __DIR__ . '/../src/auth/jwt.php';
require_once __DIR__ . '/../src/api/handlers/auth.php';
require_once __DIR__ . '/../src/api/handlers/doctor.php';
require_once __DIR__ . '/../src/api/handlers/patient.php';
require_once __DIR__ . '/../src/api/handlers/query.php';
require_once __DIR__ . '/../src/api/handlers/game.php';
require_once __DIR__ . '/../src/api/handlers/notification.php';
require_once __DIR__ . '/../src/api/middleware/auth.php';
require_once __DIR__ . '/../src/api/router.php';

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
