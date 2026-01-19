<?php

namespace Api\Handlers;

use Db\Database;
use Db\Models\MedicalInfo;
use Db\Models\VisitRecord;

// Explicitly require model files to ensure they're loaded
require_once __DIR__ . '/../../db/models/MedicalInfo.php';
require_once __DIR__ . '/../../db/models/VisitRecord.php';

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
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Get pending queries count
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE doctorId = ? AND status = ?');
            $stmt->execute([$doctorId, 'pending']);
            $pendingCount = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            // Get answered queries count
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE doctorId = ? AND status = ?');
            $stmt->execute([$doctorId, 'answered']);
            $answeredCount = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            // Get unique patients count
            $stmt = $this->pdo->prepare('SELECT COUNT(DISTINCT patientId) as count FROM queries WHERE doctorId = ?');
            $stmt->execute([$doctorId]);
            $patientCount = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            // Get doctor info
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$doctorId, 'doctor']);
            $doctor = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$doctor) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            // Remove password and parse JSON fields
            unset($doctor['password']);
            $medicalInfoData = json_decode($doctor['medicalInfo'] ?? '{}', true);
            $doctor['medicalInfo'] = MedicalInfo::fromArray($medicalInfoData)->toArray();
            
            $visitRecordsData = json_decode($doctor['visitRecords'] ?? '[]', true);
            $doctor['visitRecords'] = array_map(function($record) {
                return VisitRecord::fromArray($record)->toArray();
            }, $visitRecordsData);

            // Get recent queries (last 5)
            $stmt = $this->pdo->prepare('
                SELECT q.*, u.fullName as patientName
                FROM queries q
                LEFT JOIN users u ON q.patientId = u.id
                WHERE q.doctorId = ?
                ORDER BY q.createdAt DESC
                LIMIT 5
            ');
            $stmt->execute([$doctorId]);
            $recentQueries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'status' => 200,
                'response' => [
                    'profile' => $doctor,
                    'stats' => [
                        'pendingQueries' => $pendingCount,
                        'answeredQueries' => $answeredCount,
                        'totalQueries' => $pendingCount + $answeredCount,
                        'totalPatients' => $patientCount,
                    ],
                    'recentQueries' => $recentQueries,
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
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Verify doctor exists
            $stmt = $this->pdo->prepare('SELECT id FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$doctorId, 'doctor']);
            $doctorRow = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$doctorRow) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            // Get all patients assigned to this doctor (doctor_id is INT, not UUID)
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE doctor_id = ? AND role = ?');
            $stmt->execute([$doctorId, 'patient']);
            $patients = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            foreach ($patients as &$patient) {
                unset($patient['password']);
                $medicalInfoData = json_decode($patient['medicalInfo'] ?? '{}', true);
                $patient['medicalInfo'] = MedicalInfo::fromArray($medicalInfoData)->toArray();
                
                $visitRecordsData = json_decode($patient['visitRecords'] ?? '[]', true);
                $patient['visitRecords'] = array_map(function($record) {
                    return VisitRecord::fromArray($record)->toArray();
                }, $visitRecordsData);
            }

            return [
                'status' => 200,
                'response' => ['patients' => $patients]
            ];
        } catch (\Exception $e) {
            error_log('Error in getPatients: ' . $e->getMessage());
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
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Verify doctor exists and get UUID
            $stmt = $this->pdo->prepare('SELECT id FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$doctorId, 'doctor']);
            $doctorRow = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$doctorRow) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            $doctorUuid = $doctorRow['id'];

            // Get patient and verify they belong to this doctor
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ? AND doctor_id = ?');
            $stmt->execute([$patientId, 'patient', $doctorUuid]);
            $patient = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$patient) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found or not assigned to you']
                ];
            }

            unset($patient['password']);
            $medicalInfoData = json_decode($patient['medicalInfo'] ?? '{}', true);
            $patient['medicalInfo'] = MedicalInfo::fromArray($medicalInfoData)->toArray();
            
            $visitRecordsData = json_decode($patient['visitRecords'] ?? '[]', true);
            $patient['visitRecords'] = array_map(function($record) {
                return VisitRecord::fromArray($record)->toArray();
            }, $visitRecordsData);

            // Get game history for the patient
            $stmt = $this->pdo->prepare('
                SELECT * FROM gameResults
                WHERE userId = ?
                ORDER BY date DESC
            ');
            $stmt->execute([$patientId]);
            $gameHistory = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Parse JSON details in game results
            foreach ($gameHistory as &$game) {
                if ($game['details']) {
                    $game['details'] = json_decode($game['details'], true);
                }
            }

            return [
                'status' => 200,
                'response' => [
                    'patient' => $patient,
                    'gameHistory' => $gameHistory
                ]
            ];
        } catch (\Exception $e) {
            error_log('Error in getPatientById: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Update patient medical info
     */
    public function updatePatientMedicalInfo($patientId, $body) {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Extract medicalInfo from body (it comes wrapped in the request)
            $medicalInfoData = $body['medicalInfo'] ?? $body;
            if (empty($medicalInfoData)) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'Medical info is required']
                ];
            }

            // Verify patient exists
            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$patientId, 'patient']);
            if (!$stmt->fetch(\PDO::FETCH_ASSOC)) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            // Convert to MedicalInfo model
            $medicalInfo = MedicalInfo::fromArray($medicalInfoData);
            $medicalInfoJson = json_encode($medicalInfo->toArray());
            $now = date('Y-m-d H:i:s');

            $stmt = $this->pdo->prepare('
                UPDATE users 
                SET medicalInfo = ?, updatedAt = ?
                WHERE id = ? AND role = ?
            ');
            $stmt->execute([$medicalInfoJson, $now, $patientId, 'patient']);

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
    public function addPatientVisitRecord($patientId, $body) {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Extract visitRecord from body (it comes wrapped in the request)
            $visitRecordData = $body['visitRecord'] ?? $body;
            if (empty($visitRecordData)) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'Visit record is required']
                ];
            }

            // Get current visitRecords
            $stmt = $this->pdo->prepare('SELECT visitRecords FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$patientId, 'patient']);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$result) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Patient not found']
                ];
            }

            // Convert to VisitRecord model
            $visitRecord = VisitRecord::fromArray($visitRecordData);
            $visitRecordArray = $visitRecord->toArray();

            // Get existing visit records
            $visitRecords = json_decode($result['visitRecords'] ?? '[]', true);
            if (!is_array($visitRecords)) {
                $visitRecords = [];
            }
            
            // Add new visit record
            $visitRecords[] = $visitRecordArray;

            $now = date('Y-m-d H:i:s');
            $visitRecordsJson = json_encode($visitRecords);
            
            error_log('Updating visit record for patient ' . $patientId . ' with data: ' . $visitRecordsJson);

            $stmt = $this->pdo->prepare('
                UPDATE users
                SET visitRecords = ?, updatedAt = ?
                WHERE id = ? AND role = ?
            ');
            
            $updateResult = $stmt->execute([$visitRecordsJson, $now, $patientId, 'patient']);
            
            if (!$updateResult) {
                error_log('Update failed: ' . implode(' ', $stmt->errorInfo()));
                return [
                    'status' => 500,
                    'response' => ['error' => 'Failed to update visit record']
                ];
            }

            error_log('Visit record updated successfully. Rows affected: ' . $stmt->rowCount());

            return [
                'status' => 200,
                'response' => [
                    'message' => 'Visit record added successfully',
                    'visitRecord' => $visitRecordArray
                ]
            ];
        } catch (\Exception $e) {
            error_log('Exception in addPatientVisitRecord: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => 'Database error: ' . $e->getMessage()]
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
                    'response' => ['error' => 'User ID not found']
                ];
            }

            $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$doctorId, 'doctor']);
            $doctor = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$doctor) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

            // Remove password
            unset($doctor['password']);

            // Parse JSON fields
            $medicalInfoData = json_decode($doctor['medicalInfo'] ?? '{}', true);
            $doctor['medicalInfo'] = MedicalInfo::fromArray($medicalInfoData)->toArray();
            
            $visitRecordsData = json_decode($doctor['visitRecords'] ?? '[]', true);
            $doctor['visitRecords'] = array_map(function($record) {
                return VisitRecord::fromArray($record)->toArray();
            }, $visitRecordsData);

            // Get query stats
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE doctorId = ?');
            $stmt->execute([$doctorId]);
            $totalQueries = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM queries WHERE doctorId = ? AND status = ?');
            $stmt->execute([$doctorId, 'answered']);
            $answeredQueries = (int) ($stmt->fetch(\PDO::FETCH_ASSOC)['count'] ?? 0);

            $responseRate = 0;
            if ($totalQueries > 0) {
                $responseRate = ($answeredQueries / $totalQueries) * 100;
            }

            return [
                'status' => 200,
                'response' => [
                    'profile' => $doctor,
                    'stats' => [
                        'totalQueries' => $totalQueries,
                        'answeredQueries' => $answeredQueries,
                        'responseRate' => $responseRate,
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
     * Delete doctor account
     */
    public function deleteDoctor() {
        try {
            $doctorId = $_SERVER['userID'] ?? null;
            if (!$doctorId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'User ID not found']
                ];
            }

            // Delete all queries associated with this doctor (set doctorId to NULL for patient records)
            $stmt = $this->pdo->prepare('UPDATE queries SET doctorId = NULL WHERE doctorId = ?');
            $stmt->execute([$doctorId]);

            // Delete doctor account
            $stmt = $this->pdo->prepare('DELETE FROM users WHERE id = ? AND role = ?');
            $stmt->execute([$doctorId, 'doctor']);

            if ($stmt->rowCount() === 0) {
                return [
                    'status' => 404,
                    'response' => ['error' => 'Doctor not found']
                ];
            }

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
