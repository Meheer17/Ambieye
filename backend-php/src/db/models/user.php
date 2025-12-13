<?php

namespace Db\Models;

class User {
    public $id;
    public $fullName;
    public $username;
    public $email;
    public $password;
    public $role; // "doctor" or "patient"
    public $uuid;
    public $doctor_id;
    public $phone;
    public $age;
    public $gender;
    public $fatherName;
    public $motherName;
    public $address;
    public $dateOfBirth;
    public $medicalInfo;
    public $visitRecords;
    public $createdAt;
    public $updatedAt;

    public function toArray() {
        return [
            'id' => $this->id,
            'fullName' => $this->fullName,
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role,
            'uuid' => $this->uuid,
            'doctor_id' => $this->doctor_id,
            'phone' => $this->phone,
            'age' => $this->age,
            'gender' => $this->gender,
            'fatherName' => $this->fatherName,
            'motherName' => $this->motherName,
            'address' => $this->address,
            'dateOfBirth' => $this->dateOfBirth,
            'medicalInfo' => $this->medicalInfo,
            'visitRecords' => $this->visitRecords,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }

    public function toSafeUser() {
        return [
            'id' => $this->id,
            'fullName' => $this->fullName,
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role,
        ];
    }
}

class MedicalInfo {
    public $visionwithpg;
    public $chiefcomplaint;
    public $presentingillness;
    public $pastHistory;
    public $personalHistory;
    public $familyHistory;
    public $drugHistory;
    public $allergyHistory;
    public $bp;
    public $pr;
    public $temp;
    public $respirationrate;
    public $notes;
}

class VisitRecord {
    public $date;
    public $pmtvisiontpg;
    public $pgpower;
    public $pmt;
    public $pda;
    public $adar;
    public $dryretinoscopy;
    public $wetretinoscopy;
    public $bcvanear;
    public $bcvadistant;
    public $nct;
    public $colorvision;
    public $ar;
    public $visiondistant;
    public $visionnear;
    public $glassPrescription;
    public $notes;
}
