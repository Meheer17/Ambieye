<?php

namespace Api\Handlers;

use Db\Database;

class NotificationHandler {
    private $pdo;

    public function __construct() {
        $this->pdo = Database::getInstance();
    }

    /**
     * Register device for notifications
     */
    public function registerDevice($data) {
        // Placeholder for future implementation
        return [
            'status' => 200,
            'response' => ['message' => 'Device registered']
        ];
    }
}
