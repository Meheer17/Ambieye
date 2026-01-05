<?php

namespace Api\Handlers;

use Db\Database;

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
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            // Get query counts
            $stmt = $this->pdo->prepare('SELECT status, COUNT(*) as count FROM queries WHERE patientId = ? GROUP BY status');
            $stmt->execute([$patientId]);
            $queryCounts = $stmt->fetchAll(\PDO::FETCH_KEY_PAIR);

            // Get game results count
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM gameResults WHERE userId = ?');
            $stmt->execute([$patientId]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            $gamesPlayedCount = $result['count'] ?? 0;

            return [
                'status' => 200,
                'response' => [
                    'pendingQueries' => (int) ($queryCounts['pending'] ?? 0),
                    'answeredQueries' => (int) ($queryCounts['answered'] ?? 0),
                    'closedQueries' => (int) ($queryCounts['closed'] ?? 0),
                    'gamesPlayed' => $gamesPlayedCount,
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
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = "patient"');
            $stmt->execute([$patientId]);
            $patient = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$patient) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            $patient['medicalInfo'] = json_decode($patient['medicalInfo'] ?? '{}', true);
            $patient['visitRecords'] = json_decode($patient['visitRecords'] ?? '[]', true);

            return [
                'status' => 200,
                'response' => $patient
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

            if (!$doctor) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            return [
                'status' => 200,
                'response' => $doctor
            ];
        } catch (\Exception $e) {
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
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $now = date('Y-m-d H:i:s');
            $stmt = $this->pdo->prepare('
                UPDATE users 
                SET fullName = ?, email = ?, phone = ?, age = ?, gender = ?, 
                    fatherName = ?, motherName = ?, address = ?, dateOfBirth = ?, updatedAt = ?
                WHERE id = ? AND role = "patient"
            ');

            $stmt->execute([
                $data['fullName'] ?? null,
                $data['email'] ?? null,
                $data['phone'] ?? null,
                $data['age'] ?? null,
                $data['gender'] ?? null,
                $data['fatherName'] ?? null,
                $data['motherName'] ?? null,
                $data['address'] ?? null,
                $data['dateOfBirth'] ?? null,
                $now,
                $patientId,
            ]);

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
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
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
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $stmt = $this->pdo->prepare('
                SELECT q.*, u.fullName as doctorName
                FROM queries q
                LEFT JOIN users u ON q.doctorId = u.id
                WHERE q.patientId = ?
                ORDER BY q.createdAt DESC
            ');
            $stmt->execute([$patientId]);
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
