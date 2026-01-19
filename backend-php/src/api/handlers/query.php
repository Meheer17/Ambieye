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
                    'response' => ['error' => 'User ID not found']
                ];
            }

            if (empty($data['question'])) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'Question is required']
                ];
            }

            // Verify patient exists
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$patientId, 'patient']);
            $patient = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$patient) {
                return [
                    'status' => 403,
                    'response' => ['error' => 'Only patients can create queries']
                ];
            }

            $now = date('Y-m-d H:i:s');
            $urgency = $data['urgency'] ?? 'medium';
            $status = 'pending';

            // If patient has a doctor assigned, set the doctorId
            $doctorId = null;
            if (!empty($patient['doctor_id'])) {
                // Look up doctor by UUID
                $stmt = $this->pdo->prepare('SELECT id FROM users WHERE id = ?');
                $stmt->execute([$patient['doctor_id']]);
                $doctorRow = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($doctorRow) {
                    $doctorId = $doctorRow['id'];
                } else {
                    return [
                        'status' => 400,
                        'response' => ['error' => 'U Need a Valid doctor ID']
                    ];
                }
            } else {
                return [
                    'status' => 400,
                    'response' => ['error' => 'U Need a doctor ID']
                ];
            }

            $stmt = $this->pdo->prepare('
                INSERT INTO queries (patientId, doctorId, question, status, urgency, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([$patientId, $doctorId, $data['question'], $status, $urgency, $now, $now]);
            $queryId = $this->pdo->lastInsertId();

            // Return created query
            $stmt = $this->pdo->prepare('SELECT * FROM queries WHERE id = ?');
            $stmt->execute([$queryId]);
            $query = $stmt->fetch(\PDO::FETCH_ASSOC);

            return [
                'status' => 201,
                'response' => ['query' => $query]
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
            $userId = $_SERVER['userID'] ?? null;
            if (!$userId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Get user role
            $stmt = $this->pdo->prepare('SELECT role FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $userRow = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$userRow) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User not found']
                ];
            }

            $userRole = $userRow['role'];

            // Get the query
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

            // Verify access: patient can only see their own queries, doctor can see assigned queries
            if ($userRole === 'patient' && $query['patientId'] != $userId) {
                return [
                    'status' => 403,
                    'response' => ['error' => 'Forbidden']
                ];
            } elseif ($userRole === 'doctor' && $query['doctorId'] != $userId) {
                return [
                    'status' => 403,
                    'response' => ['error' => 'Forbidden']
                ];
            }

            // Get full patient object
            $patient = null;
            if ($query['patientId']) {
                $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ?');
                $stmt->execute([$query['patientId']]);
                $patient = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($patient) {
                    unset($patient['password']);
                }
            }

            // Get full doctor object
            $doctor = null;
            if ($query['doctorId']) {
                $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ?');
                $stmt->execute([$query['doctorId']]);
                $doctor = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($doctor) {
                    unset($doctor['password']);
                }
            }

            return [
                'status' => 200,
                'response' => [
                    'query' => $query,
                    'patient' => $patient,
                    'doctor' => $doctor
                ]
            ];
        } catch (\Exception $e) {
            error_log('Error in getQuery: ' . $e->getMessage());
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
                    'response' => ['error' => 'User ID not found']
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

            // Verify doctor is assigned to this query or can assign themselves
            if ($query['doctorId'] && $query['doctorId'] != $doctorId) {
                return [
                    'status' => 403,
                    'response' => ['error' => 'This query is assigned to another doctor']
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
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Get query parameters
            $status = $_GET['status'] ?? null;
            $includeAll = $_GET['includeAll'] ?? 'false';
            $includeAll = strtolower($includeAll) === 'true';

            // Build WHERE clause
            $where = 'WHERE q.doctorId = ?';
            $params = [$doctorId];

            // Add status filter if provided
            if ($status && $status !== '') {
                $where .= ' AND q.status = ?';
                $params[] = $status;
            }

            $sql = '
                SELECT q.*, u1.fullName as patientName, u2.fullName as doctorName
                FROM queries q
                LEFT JOIN users u1 ON q.patientId = u1.id
                LEFT JOIN users u2 ON q.doctorId = u2.id
                ' . $where . '
                ORDER BY 
                    CASE q.urgency
                        WHEN "high" THEN 1
                        WHEN "medium" THEN 2
                        WHEN "low" THEN 3
                    END,
                    q.createdAt DESC
            ';

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $queries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'status' => 200,
                'response' => ['queries' => $queries]
            ];
        } catch (\Exception $e) {
            error_log('Error in getAllQueries: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }
}
