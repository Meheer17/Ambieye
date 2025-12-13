<?php

namespace Db\Models;

class Notification {
    public $id;
    public $userId;
    public $title;
    public $body;
    public $type;
    public $read;
    public $createdAt;
    public $updatedAt;

    public function toArray() {
        return [
            'id' => $this->id,
            'userId' => $this->userId,
            'title' => $this->title,
            'body' => $this->body,
            'type' => $this->type,
            'read' => $this->read,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
