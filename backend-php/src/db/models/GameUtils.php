<?php

namespace Db\Models;

class GameUtils
{
    /**
     * Get game name by ID
     * Must match the Go implementation exactly
     */
    public static function getGameNameByID($gameID)
    {
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
