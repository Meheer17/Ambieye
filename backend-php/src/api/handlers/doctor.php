<?php

namespace Api\Handlers;

use Db\Database;

class DoctorHandler {
    private $pdo;

    public function __construct() {
        $this->pdo = Database::getInstance();
    }

    /**
     * Get doctor dashboard
     */
    public function getDashboard() {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            // Get pending, answered, and closed query counts
            $stmt = $this->pdo->prepare('SELECT status, COUNT(*) as count FROM queries WHERE doctorId = ? GROUP BY status');
            $stmt->execute([$doctorId]);
            $queryCounts = $stmt->fetchAll(\PDO::FETCH_KEY_PAIR);

            // Get unique patients count
            $stmt = $this->pdo->prepare('SELECT COUNT(DISTINCT patientId) as count FROM queries WHERE doctorId = ?');
            $stmt->execute([$doctorId]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            $patientCount = $result['count'] ?? 0;

            return [
                'status' => 200,
                'response' => [
                    'pendingQueries' => (int) ($queryCounts['pending'] ?? 0),
                    'answeredQueries' => (int) ($queryCounts['answered'] ?? 0),
                    'closedQueries' => (int) ($queryCounts['closed'] ?? 0),
                    'totalPatients' => $patientCount,
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
     * Get all patients for a doctor
     */
    public function getPatients() {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $stmt = $this->pdo->prepare('
                SELECT DISTINCT u.* FROM users u
                INNER JOIN queries q ON u.id = q.patientId
                WHERE q.doctorId = ? AND u.role = "patient"
            ');
            $stmt->execute([$doctorId]);
            $patients = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($patients as &$patient) {
                $patient['medicalInfo'] = json_decode($patient['medicalInfo'] ?? '{}', true);
                $patient['visitRecords'] = json_decode($patient['visitRecords'] ?? '[]', true);
            }

            return [
                'status' => 200,
                'response' => $patients
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Get patient by ID
     */
    public function getPatientById($patientId) {
        try {
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
     * Update patient medical info
     */
    public function updatePatientMedicalInfo($patientId, $medicalInfo) {
        try {
            $medicalInfoJson = json_encode($medicalInfo);
            $now = date('Y-m-d H:i:s');

            $stmt = $this->pdo->prepare('
                UPDATE users 
                SET medicalInfo = ?, updatedAt = ?
                WHERE id = ? AND role = "patient"
            ');
            $stmt->execute([$medicalInfoJson, $now, $patientId]);

            if ($stmt->rowCount() === 0) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            return [
                'status' => 200,
                'response' => ['message' => 'Medical info updated successfully']
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Add patient visit record
     */
    public function addPatientVisitRecord($patientId, $visitRecord) {
        try {
            // Get current visitRecords
            $stmt = $this->pdo->prepare('SELECT visitRecords FROM users WHERE id = ? AND role = "patient"');
            $stmt->execute([$patientId]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$result) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            $visitRecords = json_decode($result['visitRecords'] ?? '[]', true);
            $visitRecord['date'] = date('Y-m-d H:i:s');
            $visitRecords[] = $visitRecord;

            $now = date('Y-m-d H:i:s');
            $stmt = $this->pdo->prepare('
                UPDATE users
                SET visitRecords = ?, updatedAt = ?
                WHERE id = ?
            ');
            $stmt->execute([json_encode($visitRecords), $now, $patientId]);

            return [
                'status' => 200,
                'response' => ['message' => 'Visit record added successfully']
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Get doctor profile
     */
    public function getProfile() {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = "doctor"');
            $stmt->execute([$doctorId]);
            $doctor = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$doctor) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            $doctor['medicalInfo'] = json_decode($doctor['medicalInfo'] ?? '{}', true);
            $doctor['visitRecords'] = json_decode($doctor['visitRecords'] ?? '[]', true);

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
     * Delete doctor account
     */
    public function deleteDoctor() {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            // Delete all queries associated with this doctor
            $stmt = $this->pdo->prepare('DELETE FROM queries WHERE doctorId = ?');
            $stmt->execute([$doctorId]);

            // Delete doctor account
            $stmt = $this->pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$doctorId]);

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
