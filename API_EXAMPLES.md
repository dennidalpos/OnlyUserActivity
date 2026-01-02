# API Examples - Activity Tracker

Collezione completa di esempi API per testing e integrazione.

## Base URL

```
Development: http://localhost:3000
Production: https://activity.company.local
```

## Autenticazione

### Login Utente LDAP

**Endpoint:** `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "mario.rossi",
  "password": "Password123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyS2V5IjoiYjNjNGQ1ZTYtZjdhOC05YjBjLTFkMmUtM2Y0YTViNmM3ZDhlIiwidXNlcm5hbWUiOiJtYXJpby5yb3NzaSIsImlhdCI6MTczNTgxOTIwMCwiZXhwIjoxNzM1ODQ4MDAwfQ.signature",
    "userKey": "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
    "username": "mario.rossi",
    "displayName": "Mario Rossi",
    "expiresAt": "2026-01-02T16:30:00.000Z"
  }
}
```

**Error Responses:**

401 Invalid Credentials:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Username o password non validi",
    "requestId": "req-abc123"
  }
}
```

403 Unauthorized Group:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_GROUP",
    "message": "L'utente non appartiene al gruppo Domain Users",
    "requestId": "req-abc123"
  }
}
```

429 Too Many Attempts:
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "Troppi tentativi di login. Riprova tra 15 minuti",
    "requestId": "req-abc123"
  }
}
```

---

## Attività

**Nota:** Tutti gli endpoint attività richiedono header:
```
Authorization: Bearer {token}
```

### 1. Ottieni Attività Giornaliere

**Endpoint:** `GET /api/activities/:date`

**Esempio:**
```bash
GET /api/activities/2026-01-02
```

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-01-02",
    "activities": [
      {
        "id": "act-uuid-1",
        "date": "2026-01-02",
        "startTime": "09:00",
        "endTime": "11:00",
        "activityType": "lavoro",
        "customType": null,
        "notes": "Sviluppo feature X",
        "durationMinutes": 120,
        "createdAt": "2026-01-02T09:30:00.000Z",
        "updatedAt": "2026-01-02T09:30:00.000Z"
      },
      {
        "id": "act-uuid-2",
        "date": "2026-01-02",
        "startTime": "11:00",
        "endTime": "13:00",
        "activityType": "meeting",
        "customType": null,
        "notes": "Riunione team",
        "durationMinutes": 120,
        "createdAt": "2026-01-02T11:30:00.000Z",
        "updatedAt": "2026-01-02T11:30:00.000Z"
      }
    ],
    "summary": {
      "totalMinutes": 240,
      "totalHours": 4.0,
      "requiredMinutes": 480,
      "completionPercentage": 50.0,
      "isComplete": false,
      "isOvertime": false,
      "overtimeMinutes": 0
    }
  }
}
```

### 2. Crea Attività

**Endpoint:** `POST /api/activities`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "date": "2026-01-02",
  "startTime": "13:00",
  "endTime": "14:30",
  "activityType": "formazione",
  "customType": null,
  "notes": "Studio nuova tecnologia"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "act-uuid-3",
    "date": "2026-01-02",
    "startTime": "13:00",
    "endTime": "14:30",
    "activityType": "formazione",
    "customType": null,
    "notes": "Studio nuova tecnologia",
    "durationMinutes": 90,
    "createdAt": "2026-01-02T13:45:00.000Z",
    "updatedAt": "2026-01-02T13:45:00.000Z"
  }
}
```

**Error: Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Errori di validazione",
    "details": [
      {
        "field": "startTime",
        "message": "L'orario deve essere un multiplo di 15 minuti",
        "value": "13:07"
      }
    ],
    "requestId": "req-abc123"
  }
}
```

**Error: Time Overlap (409):**
```json
{
  "success": false,
  "error": {
    "code": "TIME_OVERLAP",
    "message": "L'attività si sovrappone con un'altra esistente",
    "details": {
      "conflictingActivity": {
        "id": "act-uuid-2",
        "startTime": "11:00",
        "endTime": "13:30"
      }
    },
    "requestId": "req-abc123"
  }
}
```

**Error: Non Contiguous (409):**
```json
{
  "success": false,
  "error": {
    "code": "NON_CONTIGUOUS",
    "message": "L'attività deve iniziare alle 14:30 (termine dell'attività precedente)",
    "details": {
      "expectedStartTime": "14:30",
      "providedStartTime": "15:00"
    },
    "requestId": "req-abc123"
  }
}
```

### 3. Aggiorna Attività

**Endpoint:** `PUT /api/activities/:id?date=YYYY-MM-DD`

**Esempio:**
```bash
PUT /api/activities/act-uuid-3?date=2026-01-02
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (campi opzionali):**
```json
{
  "endTime": "15:00",
  "notes": "Studio nuova tecnologia - completato modulo 1"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "act-uuid-3",
    "date": "2026-01-02",
    "startTime": "13:00",
    "endTime": "15:00",
    "activityType": "formazione",
    "customType": null,
    "notes": "Studio nuova tecnologia - completato modulo 1",
    "durationMinutes": 120,
    "createdAt": "2026-01-02T13:45:00.000Z",
    "updatedAt": "2026-01-02T14:30:00.000Z"
  }
}
```

**Error: Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Attività non trovata",
    "requestId": "req-abc123"
  }
}
```

### 4. Elimina Attività

**Endpoint:** `DELETE /api/activities/:id?date=YYYY-MM-DD`

**Esempio:**
```bash
DELETE /api/activities/act-uuid-3?date=2026-01-02
```

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "act-uuid-3"
  }
}
```

### 5. Lista Attività in Range

**Endpoint:** `GET /api/activities?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Esempio:**
```bash
GET /api/activities?from=2026-01-01&to=2026-01-31
```

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "activities": [
      {
        "id": "act-1",
        "date": "2026-01-02",
        "startTime": "09:00",
        "endTime": "17:00",
        "activityType": "lavoro",
        "notes": "...",
        "durationMinutes": 480
      }
    ],
    "dailySummaries": {
      "2026-01-02": {
        "totalMinutes": 480,
        "totalHours": 8.0,
        "requiredMinutes": 480,
        "completionPercentage": 100,
        "isComplete": true,
        "isOvertime": false,
        "overtimeMinutes": 0
      },
      "2026-01-03": {
        "totalMinutes": 240,
        "totalHours": 4.0,
        "requiredMinutes": 480,
        "completionPercentage": 50,
        "isComplete": false,
        "isOvertime": false,
        "overtimeMinutes": 0
      }
    }
  }
}
```

---

## Activity Types

Valori consentiti per `activityType`:

```json
[
  "lavoro",      // Lavoro ordinario
  "meeting",     // Riunioni
  "formazione",  // Formazione/training
  "supporto",    // Supporto clienti/colleghi
  "ferie",       // Ferie
  "festività",   // Giorni festivi
  "malattia",    // Malattia
  "permesso",    // Permessi
  "trasferta",   // Trasferte
  "pausa",       // Pause
  "altro"        // Altro (richiede customType)
]
```

**Nota:** Se `activityType = "altro"`, il campo `customType` diventa obbligatorio:

```json
{
  "activityType": "altro",
  "customType": "Manutenzione straordinaria",
  "..."
}
```

---

## Errori Comuni

### 401 Unauthorized

Token mancante o non valido:
```json
{
  "success": false,
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Token di autenticazione mancante",
    "requestId": "req-abc123"
  }
}
```

### 401 Token Expired

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token scaduto",
    "requestId": "req-abc123"
  }
}
```

### 400 Missing Parameters

```json
{
  "success": false,
  "error": {
    "code": "MISSING_PARAMS",
    "message": "Query parameters \"from\" e \"to\" richiesti",
    "requestId": "req-abc123"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Errore interno del server",
    "requestId": "req-abc123"
  }
}
```

---

## Postman Collection

Importa questa collezione in Postman:

```json
{
  "info": {
    "name": "Activity Tracker API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"mario.rossi\",\n  \"password\": \"Password123!\"\n}"
            }
          }
        }
      ]
    },
    {
      "name": "Activities",
      "item": [
        {
          "name": "Get Day Activities",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/activities/2026-01-02",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ]
          }
        },
        {
          "name": "Create Activity",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/activities",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"date\": \"2026-01-02\",\n  \"startTime\": \"09:00\",\n  \"endTime\": \"11:00\",\n  \"activityType\": \"lavoro\",\n  \"notes\": \"Test\"\n}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## cURL Examples

### Login e salva token

```bash
# Login
response=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mario.rossi","password":"Password123!"}')

# Estrai token
token=$(echo $response | jq -r '.data.token')

echo "Token: $token"
```

### Workflow completo

```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

# 1. Login
echo "1. Login..."
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# 2. Crea attività
echo "2. Crea attività..."
curl -X POST $BASE_URL/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-02",
    "startTime": "09:00",
    "endTime": "17:00",
    "activityType": "lavoro",
    "notes": "Giornata completa"
  }' | jq .

# 3. Lista attività
echo "3. Lista attività..."
curl $BASE_URL/api/activities/2026-01-02 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Rate Limiting

**Limiti:**
- Globale: 100 richieste / 15 minuti per IP
- Login: 5 tentativi / 15 minuti per IP

**Headers risposta:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1735819500
```

**Response quando limite superato (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Troppe richieste. Riprova più tardi."
  }
}
```
