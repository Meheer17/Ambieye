<?php

namespace Api\Handlers;

use Db\Database;
use Db\Models\MedicalInfo;
use Db\Models\VisitRecord;

class PatientHandler {
    private $pdo;

    public function __construct() {
        $this->pdo = Database::getInstance();
    }

    /**
     * Get patient dashboard
     */
    public function getDashboard() {
        try {
            $patientId = $_SERVER['userID'] ?? null;
            if (!$patientId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Get pending queries count
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE patientId = ? AND status = ?');
            $stmt->execute([$patientId, 'pending']);
            $pendingCount = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            // Get answered queries count
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE patientId = ? AND status = ?');
            $stmt->execute([$patientId, 'answered']);
            $answeredCount = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            // Get recent queries (last 5)
            $stmt = $this->pdo->prepare('
                SELECT q.*, u.fullName as doctorName
                FROM queries q
                LEFT JOIN users u ON q.doctorId = u.id
                WHERE q.patientId = ?
                ORDER BY q.updatedAt DESC
                LIMIT 5
            ');
            $stmt->execute([$patientId]);
            $recentQueries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Get available doctors
            $stmt = $this->pdo->prepare('SELECT id, fullName, username, email, phone, role FROM users WHERE role = ?');
            $stmt->execute(['doctor']);
            $doctors = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Remove password from doctors array
            foreach ($doctors as &$doctor) {
                unset($doctor['password']);
            }

            return [
                'status' => 200,
                'response' => [
                    'stats' => [
                        'pendingQueries' => $pendingCount,
                        'answeredQueries' => $answeredCount,
                        'totalQueries' => $pendingCount + $answeredCount,
                    ],
                    'recentQueries' => $recentQueries,
                    'doctors' => $doctors,
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
     * Get patient profile
     */
    public function getProfile() {
        try {
            $patientId = $_SERVER['userID'] ?? null;
            if (!$patientId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$patientId, 'patient']);
            $patient = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$patient) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            // Remove password
            unset($patient['password']);

            // Parse JSON fields using model classes
            $medicalInfoData = json_decode($patient['medicalInfo'] ?? '{}', true);
            $patient['medicalInfo'] = MedicalInfo::fromArray($medicalInfoData)->toArray();
            
            $visitRecordsData = json_decode($patient['visitRecords'] ?? '[]', true);
            $patient['visitRecords'] = array_map(function($record) {
                return VisitRecord::fromArray($record)->toArray();
            }, $visitRecordsData);

            // Get query stats
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE patientId = ?');
            $stmt->execute([$patientId]);
            $totalQueries = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE patientId = ? AND status = ?');
            $stmt->execute([$patientId, 'answered']);
            $answeredQueries = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            return [
                'status' => 200,
                'response' => [
                    'profile' => $patient,
                    'stats' => [
                        'totalQueries' => $totalQueries,
                        'answeredQueries' => $answeredQueries,
                    ]
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
     * Get doctor by ID
     */
    public function getDoctorById($doctorId) {
        try {
            $stmt = $this->pdo->prepare('SELECT id, fullName, username, email, phone FROM users WHERE id = ? AND role = "doctor"');
            $stmt->execute([$doctorId]);
            $doctor = $stmt->fetch(\PDO::FETCH_ASSOC);

            error_log('getDoctorById - Doctor ID: ' . $doctorId . ', Result: ' . json_encode($doctor));

            if (!$doctor) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            return [
                'status' => 200,
                'response' => ['doctor' => $doctor]
            ];
        } catch (\Exception $e) {
            error_log('getDoctorById error: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Update patient profile
     */
    public function updateProfile($data) {
        try {
            $patientId = $_SERVER['userID'] ?? null;
            if (!$patientId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            $now = date('Y-m-d H:i:s');
            $updates = [];
            $params = [];
            $allowedFields = ['fullName', 'email', 'phone', 'age', 'gender', 'fatherName', 'motherName', 'address', 'dateOfBirth', 'doctor_id'];

            foreach ($allowedFields as $field) {
                if (isset($data[$field]) && $data[$field] !== null && $data[$field] !== '') {
                    $updates[] = "$field = ?";
                    $params[] = $data[$field];
                }
            }

            if (empty($updates)) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'No valid fields to update']
                ];
            }

            $updates[] = 'updatedAt = ?';
            $params[] = $now;
            $params[] = $patientId;
            $params[] = 'patient';

            $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ? AND role = ?';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            return [
                'status' => 200,
                'response' => ['message' => 'Profile updated successfully']
            ];
        } catch (\Exception $e) {
            error_log('Patient updateProfile error: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => 'Failed to update profile']
            ];
        }
    }

    /**
     * Get patient queries
     */
    public function getPatientQueries() {
        try {
            $patientId = $_SERVER['userID'] ?? null;
            if (!$patientId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Get pagination parameters
            $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
            $perPage = isset($_GET['perPage']) ? (int) $_GET['perPage'] : 10;
            $page = max(1, $page);
            $perPage = min(max(1, $perPage), 100);

            // Get status filter if provided
            $status = isset($_GET['status']) ? $_GET['status'] : null;
            
            // Build query
            $whereClause = 'q.patientId = ?';
            $params = [$patientId];
            
            if ($status) {
                $whereClause .= ' AND q.status = ?';
                $params[] = $status;
            }

            // Get total count
            $stmt = $this->pdo->prepare("SELECT COUNT(*) as count FROM queries q WHERE $whereClause");
            $stmt->execute($params);
            $totalCount = (int) $stmt->fetch(\PDO::FETCH_ASSOC)['count'];

            // Get queries with pagination
            $offset = ($page - 1) * $perPage;
            $stmt = $this->pdo->prepare("
                SELECT q.*, u.fullName as doctorName
                FROM queries q
                LEFT JOIN users u ON q.doctorId = u.id
                WHERE $whereClause
                ORDER BY q.createdAt DESC
                LIMIT $perPage OFFSET $offset
            ");
            $stmt->execute($params);
            $queries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $totalPages = ceil($totalCount / $perPage);

            return [
                'status' => 200,
                'response' => [
                    'queries' => $queries,
                    'pagination' => [
                        'page' => $page,
                        'perPage' => $perPage,
                        'totalItems' => $totalCount,
                        'totalPages' => $totalPages,
                    ]
                ]
            ];
        } catch (\Exception $e) {
            error_log('Patient updateProfile error: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Delete patient account
     */
    public function deletePatient() {
        try {
            $patientId = $_SERVER['userID'] ?? null;
            if (!$patientId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            // Delete all queries associated with this patient
            $stmt = $this->pdo->prepare('DELETE FROM queries WHERE patientId = ?');
            $stmt->execute([$patientId]);

            // Delete all game results
            $stmt = $this->pdo->prepare('DELETE FROM gameResults WHERE userId = ?');
            $stmt->execute([$patientId]);

            // Delete patient account
            $stmt = $this->pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$patientId]);

            return [
                'status' => 200,
                'response' => ['message' => 'Account deleted successfully']
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }
}
