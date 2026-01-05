<?php

namespace Api\Handlers;

use Db\Database;
use Db\Models\GameUtils;

class QueryHandler {
    private $pdo;
    private $notificationHandler;

    public function __construct($notificationHandler = null) {
        $this->pdo = Database::getInstance();
        $this->notificationHandler = $notificationHandler;
    }

    /**
     * Create query
     */
    public function createQuery($data) {
        try {
            $patientId = $_SERVER['userID'] ?? null;
            if (!$patientId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            if (empty($data['question'])) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'Question is required']
                ];
            }

            $now = date('Y-m-d H:i:s');
            $urgency = $data['urgency'] ?? 'medium';
            $status = 'pending';

            $stmt = $this->pdo->prepare('
                INSERT INTO queries (patientId, question, status, urgency, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([$patientId, $data['question'], $status, $urgency, $now, $now]);
            $queryId = $this->pdo->lastInsertId();

            return [
                'status' => 201,
                'response' => ['id' => $queryId, 'message' => 'Query created successfully']
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Get query by ID
     */
    public function getQuery($queryId) {
        try {
            $stmt = $this->pdo->prepare('
                SELECT q.*, u1.fullName as patientName, u2.fullName as doctorName
                FROM queries q
                LEFT JOIN users u1 ON q.patientId = u1.id
                LEFT JOIN users u2 ON q.doctorId = u2.id
                WHERE q.id = ?
            ');
            $stmt->execute([$queryId]);
            $query = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$query) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Query not found']
                ];
            }

            return [
                'status' => 200,
                'response' => $query
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Answer query (doctor only)
     */
    public function answerQuery($queryId, $data) {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            if (empty($data['response'])) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'Response is required']
                ];
            }

            // Get query
            $stmt = $this->pdo->prepare('SELECT * FROM queries WHERE id = ?');
            $stmt->execute([$queryId]);
            $query = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$query) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Query not found']
                ];
            }

            // Update query
            $now = date('Y-m-d H:i:s');
            $stmt = $this->pdo->prepare('
                UPDATE queries
                SET doctorId = ?, response = ?, status = ?, answeredAt = ?, updatedAt = ?
                WHERE id = ?
            ');

            $stmt->execute([$doctorId, $data['response'], 'answered', $now, $now, $queryId]);

            return [
                'status' => 200,
                'response' => ['message' => 'Query answered successfully']
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Get all queries (for doctors)
     */
    public function getAllQueries() {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $stmt = $this->pdo->prepare('
                SELECT q.*, u1.fullName as patientName, u2.fullName as doctorName
                FROM queries q
                LEFT JOIN users u1 ON q.patientId = u1.id
                LEFT JOIN users u2 ON q.doctorId = u2.id
                WHERE q.doctorId = ? OR q.doctorId IS NULL
                ORDER BY 
                    CASE q.urgency
                        WHEN "high" THEN 1
                        WHEN "medium" THEN 2
                        WHEN "low" THEN 3
                    END,
                    q.createdAt DESC
            ');
            $stmt->execute([$doctorId]);
            $queries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'status' => 200,
                'response' => $queries
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }
}
