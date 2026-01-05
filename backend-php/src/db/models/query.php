<?php

namespace Db\Models;

class Query {
    public $id;
    public $patientId;
    public $doctorId;
    public $question;
    public $response;
    public $status; // "pending", "answered", "closed"
    public $createdAt;
    public $updatedAt;
    public $answeredAt;
    public $urgency; // "low", "medium", "high"

    public function toArray() {
        return [
            'id' => $this->id,
            'patientId' => $this->patientId,
            'doctorId' => $this->doctorId,
            'question' => $this->question,
            'response' => $this->response,
            'status' => $this->status,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
            'answeredAt' => $this->answeredAt,
            'urgency' => $this->urgency,
        ];
    }
}

class QueryWithUserInfo {
    public $id;
    public $patientId;
    public $patientName;
    public $doctorId;
    public $doctorName;
    public $question;
    public $response;
    public $status;
    public $urgency;
    public $createdAt;
    public $updatedAt;
    public $answeredAt;

    public function toArray() {
        return [
            'id' => $this->id,
            'patientId' => $this->patientId,
            'patientName' => $this->patientName,
            'doctorId' => $this->doctorId,
            'doctorName' => $this->doctorName,
            'question' => $this->question,
            'response' => $this->response,
            'status' => $this->status,
            'urgency' => $this->urgency,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
            'answeredAt' => $this->answeredAt,
        ];
    }
}
