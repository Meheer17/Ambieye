<?php

namespace Api\Handlers;

use Db\Database;
use Db\Models\GameUtils;

require_once __DIR__ . '/../../../src/db/models/GameUtils.php';

class GameHandler {
    private $pdo;
    
    private const ERROR_USER_NOT_FOUND = 'User ID not found';
    private const ERROR_DATABASE = 'Database error';

    public function __construct() {
        $this->pdo = Database::getInstance();
    }

    /**
     * Validate user ID
     */
    private function validateUserId() {
        $userId = $_SERVER['userID'] ?? null;
        if (!$userId) {
            return null;
        }
        return $userId;
    }

    /**
     * Validate game result data
     */
    private function validateGameResultData($data) {
        if (empty($data['gameId']) || $data['score'] === null || $data['duration'] === null) {
            return ['error' => 'Missing required fields', 'status' => 400];
        }
        return null;
    }

    /**
     * Parse and format date to MySQL datetime
     */
    private function parseDate($dateString) {
        $date = $dateString ?? date('Y-m-d H:i:s');
        $timestamp = strtotime($date);
        
        if ($timestamp === false) {
            return ['error' => 'Invalid date format, use ISO 8601', 'status' => 400];
        }
        
        // Convert to MySQL datetime format
        return date('Y-m-d H:i:s', $timestamp);
    }

    /**
     * Save game result
     */
    public function saveGameResult($data) {
        $userId = $this->validateUserId();
        if (!$userId) {
            return [
                'status' => 401,
                'response' => ['error' => self::ERROR_USER_NOT_FOUND]
            ];
        }

        $validation = $this->validateGameResultData($data);
        if ($validation !== null) {
            return [
                'status' => $validation['status'],
                'response' => ['error' => $validation['error']]
            ];
        }

        $date = $this->parseDate($data['date'] ?? null);
        if (is_array($date)) {
            return [
                'status' => $date['status'],
                'response' => ['error' => $date['error']]
            ];
        }

        try {
            $details = json_encode($data['details'] ?? []);

            $stmt = $this->pdo->prepare('
                INSERT INTO gameResults (userId, gameId, score, duration, date, details)
                VALUES (?, ?, ?, ?, ?, ?)
            ');

            $stmt->execute([
                $userId,
                $data['gameId'],
                $data['score'],
                $data['duration'],
                $date,
                $details,
            ]);

            $resultId = $this->pdo->lastInsertId();

            return [
                'status' => 201,
                'response' => [
                    'success' => true,
                    'message' => 'Game result saved successfully',
                    'result' => [
                        'id' => $resultId,
                        'userId' => $userId,
                        'gameId' => $data['gameId'],
                        'score' => $data['score'],
                        'duration' => $data['duration'],
                        'date' => $date,
                        'details' => $data['details'] ?? [],
                    ]
                ]
            ];
        } catch (\Exception $e) {
            error_log('Error saving game result: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => self::ERROR_DATABASE]
            ];
        }
    }

    /**
     * Get today's game results
     */
    public function getTodayGameResults() {
        $userId = $this->validateUserId();
        if (!$userId) {
            return [
                'status' => 401,
                'response' => ['error' => self::ERROR_USER_NOT_FOUND]
            ];
        }

        try {

            $today = date('Y-m-d');
            $stmt = $this->pdo->prepare('
                SELECT * FROM gameResults
                WHERE userId = ? AND DATE(date) = ?
                ORDER BY date DESC
            ');
            $stmt->execute([$userId, $today]);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Format response
            $gamesPlayed = [];
            foreach ($results as $result) {
                $details = json_decode($result['details'] ?? '{}', true);
                
                // Calculate accuracy
                $accuracy = $result['score'];
                if (isset($details['accuracy'])) {
                    $accuracy = $details['accuracy'];
                } elseif (isset($details['correctSelections']) && isset($details['wrongSelections'])) {
                    $totalSelections = $details['correctSelections'] + $details['wrongSelections'];
                    if ($totalSelections > 0) {
                        $accuracy = ($details['correctSelections'] / $totalSelections) * 100;
                    }
                }

                $gamesPlayed[] = [
                    'id' => $result['id'],
                    'name' => GameUtils::getGameNameByID($result['gameId']),
                    'score' => $result['score'],
                    'accuracy' => round($accuracy) . '%',
                    'date' => $result['date'],
                    'timeSpent' => $result['duration'],
                    'details' => $details,
                ];
            }

            // Calculate summary
            $totalScore = array_sum(array_column($results, 'score'));
            $totalTime = array_sum(array_column($results, 'duration'));
            $avgScore = count($results) > 0 ? $totalScore / count($results) : 0;

            $todayStats = [
                'minutes' => $totalTime,
                'gamesCompleted' => count($results),
                'accuracy' => $avgScore,
                'dailyGoal' => 5,
            ];

            return [
                'status' => 200,
                'response' => [
                    'success' => true,
                    'todayStats' => $todayStats,
                    'gamesPlayed' => $gamesPlayed,
                    'date' => $today,
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => self::ERROR_DATABASE]
            ];
        }
    }

    /**
     * Get game history
     */
    public function getGameHistory() {
        // Get userID from query parameter (for doctor viewing patient history) or from auth
        $userId = $_GET['userId'] ?? $this->validateUserId();
        
        if (!$userId) {
            return [
                'status' => 401,
                'response' => ['error' => self::ERROR_USER_NOT_FOUND]
            ];
        }

        try {
            // Get results from last 20 days
            $startDate = date('Y-m-d H:i:s', strtotime('-20 days'));
            $stmt = $this->pdo->prepare('
                SELECT * FROM gameResults
                WHERE userId = ? AND date >= ?
                ORDER BY date DESC
            ');
            $stmt->execute([$userId, $startDate]);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Group by date
            $resultsByDate = [];
            foreach ($results as $result) {
                $dateStr = date('Y-m-d', strtotime($result['date']));
                if (!isset($resultsByDate[$dateStr])) {
                    $resultsByDate[$dateStr] = [];
                }
                
                $details = json_decode($result['details'] ?? '{}', true);
                
                $resultsByDate[$dateStr][] = [
                    'id' => $result['id'],
                    'gameId' => $result['gameId'],
                    'game' => GameUtils::getGameNameByID($result['gameId']),
                    'score' => $result['score'],
                    'time' => $result['duration'],
                    'date' => $result['date'],
                    'details' => $details,
                ];
            }

            // Build history with summaries
            $history = [];
            foreach ($resultsByDate as $date => $games) {
                // Calculate daily summary
                $totalScore = array_sum(array_column($games, 'score'));
                $totalTime = array_sum(array_column($games, 'time'));
                $avgScore = count($games) > 0 ? $totalScore / count($games) : 0;
                
                $summary = [
                    'totalGames' => count($games),
                    'averageScore' => round($avgScore, 2),
                    'totalPlayTime' => $totalTime,
                    'averageAccuracy' => round($avgScore, 2),
                ];

                $history[] = [
                    'date' => $date,
                    'games' => $games,
                    'summary' => $summary,
                ];
            }

            return [
                'status' => 200,
                'response' => [
                    'success' => true,
                    'history' => $history,
                ]
            ];
        } catch (\Exception $e) {
            error_log('Error in getGameHistory: ' . $e->getMessage());
            return [
                'status' => 500,
                'response' => ['error' => self::ERROR_DATABASE]
            ];
        }
    }
}
