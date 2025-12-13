<?php

namespace Db\Models;

class GameResult {
    public $id;
    public $userId;
    public $gameId;
    public $score;
    public $duration;
    public $date;
    public $details;

    public function toArray() {
        return [
            'id' => $this->id,
            'userId' => $this->userId,
            'gameId' => $this->gameId,
            'score' => $this->score,
            'duration' => $this->duration,
            'date' => $this->date,
            'details' => $this->details,
        ];
    }
}

class GameResultResponse {
    public $id;
    public $gameId;
    public $game;
    public $score;
    public $time;
    public $date;
    public $details;

    public function toArray() {
        return [
            'id' => $this->id,
            'gameId' => $this->gameId,
            'game' => $this->game,
            'score' => $this->score,
            'time' => $this->time,
            'date' => $this->date,
            'details' => $this->details,
        ];
    }
}

class GameSummary {
    public $totalGames;
    public $averageScore;
    public $totalPlayTime;
    public $averageAccuracy;

    public function toArray() {
        return [
            'totalGames' => $this->totalGames,
            'averageScore' => $this->averageScore,
            'totalPlayTime' => $this->totalPlayTime,
            'averageAccuracy' => $this->averageAccuracy,
        ];
    }
}

class GameUtils {
    public static function getGameNameByID($gameID) {
        $games = [
            1 => "Select the colored balls",
            2 => "Select the alphabet",
            3 => "Select the correct object for the alphabets",
            4 => "Identify the symbol",
            5 => "Identify the color of the object",
            6 => "Follow the ball in clockwise direction",
            7 => "Follow the ball in anti-clockwise direction",
            8 => "Eyeball movement",
            9 => "Direction of the target",
            10 => "Find the characters",
            11 => "Count and choose",
            12 => "Match the following",
        ];

        return $games[$gameID] ?? "Unknown Game";
    }
}
