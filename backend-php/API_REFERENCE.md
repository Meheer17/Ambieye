# API Endpoints Quick Reference

## Authentication (No Auth Required)

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response: 200
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "int",
    "fullName": "string",
    "username": "string",
    "email": "string",
    "role": "doctor|patient"
  }
}
```

### Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "fullName": "string",
  "username": "string",
  "email": "string",
  "password": "string (min 6 chars)",
  "userType": "doctor|patient",
  "phone": "string",
  "age": "string",
  "gender": "string",
  "fatherName": "string",
  "motherName": "string",
  "address": "string",
  "dateOfBirth": "string"
}

Response: 201
(Same as login response)
```

### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>

Response: 200
{
  "id": "int",
  "fullName": "string",
  "username": "string",
  "email": "string",
  "role": "doctor|patient"
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response: 200
{
  "message": "Logged out successfully"
}
```

---

## Doctor Routes (Auth Required + Doctor Role)

### Get Dashboard
```http
GET /api/doctor/dashboard
Authorization: Bearer <token>

Response: 200
{
  "pendingQueries": "int",
  "answeredQueries": "int",
  "closedQueries": "int",
  "totalPatients": "int"
}
```

### Get All Patients
```http
GET /api/doctor/patients
Authorization: Bearer <token>

Response: 200
[
  {
    "id": "int",
    "fullName": "string",
    "username": "string",
    "email": "string",
    "phone": "string",
    "age": "string",
    "gender": "string",
    "medicalInfo": "object",
    "visitRecords": "array"
  }
]
```

### Get Patient by ID
```http
GET /api/doctor/patients/:id
Authorization: Bearer <token>

Response: 200
{
  "id": "int",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "medicalInfo": "object",
  "visitRecords": "array",
  ...
}
```

### Update Patient Medical Info
```http
POST /api/doctor/patients/medicalinfo/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "visionwithpg": "string",
  "chiefcomplaint": "string",
  "presentingillness": "string",
  "pastHistory": "string",
  "personalHistory": "string",
  "familyHistory": "string",
  "drugHistory": "string",
  "allergyHistory": "string",
  "bp": "string",
  "pr": "string",
  "temp": "string",
  "respirationrate": "string",
  "notes": "string"
}

Response: 200
{
  "message": "Medical info updated successfully"
}
```

### Add Patient Visit Record
```http
POST /api/doctor/patients/visitrecord/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "pmtvisiontpg": "string",
  "pgpower": "string",
  "pmt": "string",
  "pda": "string",
  "adar": "string",
  "dryretinoscopy": "string",
  "wetretinoscopy": "string",
  "bcvanear": "string",
  "bcvadistant": "string",
  "nct": "string",
  "colorvision": "string",
  "ar": "string",
  "visiondistant": "string",
  "visionnear": "string",
  "glassPrescription": "string",
  "notes": "string"
}

Response: 200
{
  "message": "Visit record added successfully"
}
```

### Get Doctor Profile
```http
GET /api/doctor/profile
Authorization: Bearer <token>

Response: 200
{
  "id": "int",
  "fullName": "string",
  "username": "string",
  "email": "string",
  "role": "doctor",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Get All Queries
```http
GET /api/doctor/queries
Authorization: Bearer <token>

Response: 200
[
  {
    "id": "int",
    "patientId": "int",
    "patientName": "string",
    "doctorId": "int",
    "doctorName": "string",
    "question": "string",
    "response": "string",
    "status": "pending|answered|closed",
    "urgency": "low|medium|high",
    "createdAt": "timestamp",
    "answeredAt": "timestamp"
  }
]
```

### Delete Doctor Account
```http
POST /api/doctor/delete
Authorization: Bearer <token>

Response: 200
{
  "message": "Account deleted successfully"
}
```

---

## Patient Routes (Auth Required + Patient Role)

### Get Dashboard
```http
GET /api/patient/dashboard
Authorization: Bearer <token>

Response: 200
{
  "pendingQueries": "int",
  "answeredQueries": "int",
  "closedQueries": "int",
  "gamesPlayed": "int"
}
```

### Get Profile
```http
GET /api/patient/profile
Authorization: Bearer <token>

Response: 200
{
  "id": "int",
  "fullName": "string",
  "username": "string",
  "email": "string",
  "phone": "string",
  "age": "string",
  "gender": "string",
  "medicalInfo": "object",
  "visitRecords": "array"
}
```

### Update Profile
```http
PUT /api/patient/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "age": "string",
  "gender": "string",
  "fatherName": "string",
  "motherName": "string",
  "address": "string",
  "dateOfBirth": "string"
}

Response: 200
{
  "message": "Profile updated successfully"
}
```

### Get Doctor by ID
```http
GET /api/patient/doctors/:id
Authorization: Bearer <token>

Response: 200
{
  "id": "int",
  "fullName": "string",
  "username": "string",
  "email": "string",
  "phone": "string"
}
```

### Get Patient Queries
```http
GET /api/patient/queries
Authorization: Bearer <token>

Response: 200
[
  {
    "id": "int",
    "patientId": "int",
    "doctorId": "int",
    "doctorName": "string",
    "question": "string",
    "response": "string",
    "status": "pending|answered|closed",
    "urgency": "low|medium|high",
    "createdAt": "timestamp"
  }
]
```

### Delete Patient Account
```http
POST /api/patient/delete
Authorization: Bearer <token>

Response: 200
{
  "message": "Account deleted successfully"
}
```

---

## Query Routes (Auth Required)

### Create Query
```http
POST /api/queries
Authorization: Bearer <token>
Content-Type: application/json
(Patient only)

{
  "question": "string",
  "urgency": "low|medium|high"
}

Response: 201
{
  "id": "int",
  "message": "Query created successfully"
}
```

### Get Query by ID
```http
GET /api/queries/:id
Authorization: Bearer <token>

Response: 200
{
  "id": "int",
  "patientId": "int",
  "patientName": "string",
  "doctorId": "int",
  "doctorName": "string",
  "question": "string",
  "response": "string",
  "status": "pending|answered|closed",
  "urgency": "low|medium|high",
  "createdAt": "timestamp",
  "answeredAt": "timestamp"
}
```

### Answer Query
```http
PUT /api/queries/:id/answer
Authorization: Bearer <token>
Content-Type: application/json
(Doctor only)

{
  "response": "string"
}

Response: 200
{
  "message": "Query answered successfully"
}
```

---

## Game Routes (Auth Required)

### Save Game Result
```http
POST /api/games/results
Authorization: Bearer <token>
Content-Type: application/json
(Patient only)

{
  "gameId": "int (1-12)",
  "score": "int",
  "duration": "float",
  "details": "object (optional)"
}

Response: 201
{
  "id": "int",
  "message": "Game result saved successfully"
}
```

### Get Today's Results
```http
GET /api/games/today
Authorization: Bearer <token>

Response: 200
[
  {
    "id": "int",
    "gameId": "int",
    "game": "string",
    "score": "int",
    "time": "float",
    "date": "timestamp",
    "details": "object"
  }
]
```

### Get Game History
```http
GET /api/games/history?page=1
Authorization: Bearer <token>

Response: 200
{
  "results": [
    {
      "id": "int",
      "gameId": "int",
      "game": "string",
      "score": "int",
      "time": "float",
      "date": "timestamp",
      "details": "object"
    }
  ],
  "summary": {
    "totalGames": "int",
    "averageScore": "float",
    "totalPlayTime": "float",
    "averageAccuracy": "float"
  },
  "pagination": {
    "page": "int",
    "pageSize": "int",
    "total": "int",
    "totalPages": "int"
  }
}
```

---

## Static Pages

### Privacy Policy
```http
GET /privacy-policy

Response: 200 (HTML)
```

### Delete Account Page
```http
GET /delete-account

Response: 200 (HTML)
```

---

## Game IDs Reference

```
1  = Select the colored balls
2  = Select the alphabet
3  = Select the correct object for the alphabets
4  = Identify the symbol
5  = Identify the color of the object
6  = Follow the ball in clockwise direction
7  = Follow the ball in anti-clockwise direction
8  = Eyeball movement
9  = Direction of the target
10 = Find the characters
11 = Count and choose
12 = Match the following
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request body"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Username/Email already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database error"
}
```

---

## Authentication Header Format

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

Example:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Total Endpoints: 27

- Authentication: 4
- Doctor: 8
- Patient: 6
- Query: 4
- Game: 3
- Static: 2

---

**Generated:** December 13, 2025
**Type:** API Reference
**Status:** Complete
