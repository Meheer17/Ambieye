<?php

namespace Api\Handlers;

use Db\Database;
use Db\Models\GameUtils;

class GameHandler {
    private $pdo;

    public function __construct() {
        $this->pdo = Database::getInstance();
    }

    /**
     * Save game result
     */
    public function saveGameResult($data) {
        try {
            $userId = $_SERVER['userID'] ?? null;
            if (!$userId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            if (empty($data['gameId']) || $data['score'] === null || $data['duration'] === null) {
                return [
                    'status' => 400,
                    'response' => ['error' => 'Missing required fields']
                ];
            }

            $now = date('Y-m-d H:i:s');
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
                $now,
                $details,
            ]);

            $resultId = $this->pdo->lastInsertId();

            return [
                'status' => 201,
                'response' => ['id' => $resultId, 'message' => 'Game result saved successfully']
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error: ' . $e->getMessage()]
            ];
        }
    }

    /**
     * Get today's game results
     */
    public function getTodayGameResults() {
        try {
            $userId = $_SERVER['userID'] ?? null;
            if (!$userId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            $today = date('Y-m-d');
            $stmt = $this->pdo->prepare('
                SELECT * FROM gameResults
                WHERE userId = ? AND DATE(date) = ?
                ORDER BY date DESC
            ');
            $stmt->execute([$userId, $today]);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Format response
            foreach ($results as &$result) {
                $result['details'] = json_decode($result['details'] ?? '[]', true);
                $result['game'] = GameUtils::getGameNameByID($result['gameId']);
                $result['time'] = $result['duration'];
                unset($result['duration']);
            }

            return [
                'status' => 200,
                'response' => $results
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error']
            ];
        }
    }

    /**
     * Get game history
     */
    public function getGameHistory() {
        try {
            $userId = $_SERVER['userID'] ?? null;
            if (!$userId) {
                return [
                    'status' => 401,
                    'response' => ['error' => 'Unauthorized']
                ];
            }

            // Get paginated history
            $page = $_GET['page'] ?? 1;
            $pageSize = 10;
            $offset = ($page - 1) * $pageSize;

            $stmt = $this->pdo->prepare('
                SELECT * FROM gameResults
                WHERE userId = ?
                ORDER BY date DESC
                LIMIT ? OFFSET ?
            ');
            $stmt->bindParam(1, $userId, \PDO::PARAM_INT);
            $stmt->bindParam(2, $pageSize, \PDO::PARAM_INT);
            $stmt->bindParam(3, $offset, \PDO::PARAM_INT);
            $stmt->execute();
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Get total count
            $stmt = $this->pdo->prepare('SELECT COUNT(*) as count FROM gameResults WHERE userId = ?');
            $stmt->execute([$userId]);
            $countResult = $stmt->fetch(\PDO::FETCH_ASSOC);
            $totalCount = $countResult['count'] ?? 0;

            // Calculate summary stats
            $stmt = $this->pdo->prepare('
                SELECT 
                    COUNT(*) as totalGames,
                    AVG(score) as averageScore,
                    SUM(duration) as totalPlayTime,
                    AVG(CAST(score as FLOAT) / 100) * 100 as averageAccuracy
                FROM gameResults
                WHERE userId = ?
            ');
            $stmt->execute([$userId]);
            $summary = $stmt->fetch(\PDO::FETCH_ASSOC);

            // Format response
            foreach ($results as &$result) {
                $result['details'] = json_decode($result['details'] ?? '[]', true);
                $result['game'] = GameUtils::getGameNameByID($result['gameId']);
                $result['time'] = $result['duration'];
                unset($result['duration']);
            }

            return [
                'status' => 200,
                'response' => [
                    'results' => $results,
                    'summary' => [
                        'totalGames' => (int) ($summary['totalGames'] ?? 0),
                        'averageScore' => (float) ($summary['averageScore'] ?? 0),
                        'totalPlayTime' => (float) ($summary['totalPlayTime'] ?? 0),
                        'averageAccuracy' => (float) ($summary['averageAccuracy'] ?? 0),
                    ],
                    'pagination' => [
                        'page' => $page,
                        'pageSize' => $pageSize,
                        'total' => $totalCount,
                        'totalPages' => ceil($totalCount / $pageSize),
                    ]
                ]
            ];
        } catch (\Exception $e) {
            return [
                'status' => 500,
                'response' => ['error' => 'Database error: ' . $e->getMessage()]
            ];
        }
    }
}
