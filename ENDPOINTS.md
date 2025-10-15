# PlantGenius API Documentation

## Overview

The PlantGenius API is a RESTful backend service that powers plant identification, user management, and subscription features for mobile applications. Built with Express.js and MongoDB, it provides secure, scalable endpoints for authentication, plant data management, and payment processing.

**Base URL**: `https://api.plantsgenius.site`
**Version**: 1.0.0
**Protocol**: HTTPS
**Data Format**: JSON
https://app.gitbook.com/o/bGzRSCDZPZPoZGYDqihw/s/tFVMGP9J0b3cLQVDCOtm/
---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Authentication](#authentication-endpoints)
  - [User Management](#user-management)
  - [Subscriptions](#subscriptions)
  - [Daily Scans](#daily-scans)
  - [Payment Verification](#payment-verification)
  - [Plant Identifications](#plant-identifications)
  - [Saved Plants](#saved-plants)
- [Data Models](#data-models)
- [Code Examples](#code-examples)

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Obtaining a Token

Tokens are obtained through the `/api/auth/signup` or `/api/auth/signin` endpoints and are valid for **30 days**.

### Token Format

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "exp": 1735689600
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP
- **Response**: `429 Too Many Requests` when limit exceeded

**Headers returned**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Missing or invalid authentication |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error occurred |

---

## Endpoints

### Health Check

#### Check API Status

```http
GET /health
```

**Description**: Verify the API is running and responsive.

**Authentication**: None required

**Use Cases**:
- Health monitoring
- Uptime checks
- Integration testing

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-15T12:34:56.789Z"
}
```

**cURL Example**:
```bash
curl https://api.plantsgenius.site/health
```

**JavaScript Example**:
```javascript
const checkHealth = async () => {
  const response = await fetch('https://api.plantsgenius.site/health');
  const data = await response.json();
  console.log(data);
};
```

---

### Authentication Endpoints

#### Sign Up

```http
POST /api/auth/signup
```

**Description**: Register a new user account with email and password.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Minimum 6 characters |
| `fullName` | string | No | User's full name |

**Success Response** (`200 OK`):
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": null,
    "authProvider": "email",
    "createdAt": "2025-10-15T12:34:56.789Z",
    "updatedAt": "2025-10-15T12:34:56.789Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

- `400 Bad Request` - Missing email or password
```json
{
  "error": "Email and password required"
}
```

- `400 Bad Request` - User already exists
```json
{
  "error": "User already exists"
}
```

**Use Cases**:
- New user registration
- Account creation during onboarding
- Email/password authentication setup

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe"
  }'
```

**JavaScript Example**:
```javascript
const signUp = async (email, password, fullName) => {
  const response = await fetch('https://api.plantsgenius.site/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, fullName })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  // Store token for future requests
  localStorage.setItem('authToken', data.token);

  return data;
};
```

---

#### Sign In

```http
POST /api/auth/signin
```

**Description**: Authenticate existing user with email and password.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Registered email address |
| `password` | string | Yes | User's password |

**Success Response** (`200 OK`):
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "authProvider": "email",
    "createdAt": "2025-10-15T12:34:56.789Z",
    "updatedAt": "2025-10-15T12:34:56.789Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:

- `400 Bad Request` - Missing credentials
```json
{
  "error": "Email and password required"
}
```

- `401 Unauthorized` - Invalid credentials
```json
{
  "error": "Invalid credentials"
}
```

**Use Cases**:
- User login
- Session restoration
- Authentication refresh

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**JavaScript Example**:
```javascript
const signIn = async (email, password) => {
  const response = await fetch('https://api.plantsgenius.site/api/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  // Store token securely
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};
```

---

### User Management

#### Get User Profile

```http
GET /api/users/:userId
```

**Description**: Retrieve user profile information.

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "fullName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "authProvider": "email",
  "createdAt": "2025-10-15T12:34:56.789Z",
  "updatedAt": "2025-10-15T12:34:56.789Z"
}
```

**Error Responses**:

- `401 Unauthorized` - Missing or invalid token
```json
{
  "error": "Authentication required"
}
```

- `404 Not Found` - User doesn't exist
```json
{
  "error": "User not found"
}
```

**Use Cases**:
- Display user profile
- Account settings page
- User data synchronization

**cURL Example**:
```bash
curl -X GET https://api.plantsgenius.site/api/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const getUserProfile = async (userId, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/users/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

#### Update User Profile

```http
PATCH /api/users/:userId
```

**Description**: Update user profile information.

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId

**Request Body**:
```json
{
  "fullName": "Jane Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fullName` | string | No | Updated full name |
| `avatarUrl` | string | No | Updated avatar URL |

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "fullName": "Jane Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "authProvider": "email",
  "createdAt": "2025-10-15T12:34:56.789Z",
  "updatedAt": "2025-10-15T14:22:33.456Z"
}
```

**Use Cases**:
- Profile editing
- Avatar upload
- Account customization

**cURL Example**:
```bash
curl -X PATCH https://api.plantsgenius.site/api/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "avatarUrl": "https://example.com/new-avatar.jpg"
  }'
```

**JavaScript Example**:
```javascript
const updateProfile = async (userId, token, updates) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

### Subscriptions

#### Get Active Subscription

```http
GET /api/subscriptions/active/:userId
```

**Description**: Retrieve user's active subscription if one exists.

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId

**Success Response** (`200 OK`):

With active subscription:
```json
{
  "subscription": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "planType": "premium",
    "status": "active",
    "startDate": "2025-10-01T00:00:00.000Z",
    "endDate": "2025-11-01T00:00:00.000Z",
    "paymentReference": "T123456789",
    "createdAt": "2025-10-01T12:34:56.789Z",
    "updatedAt": "2025-10-01T12:34:56.789Z"
  }
}
```

No active subscription:
```json
{
  "subscription": null
}
```

**Use Cases**:
- Check subscription status
- Feature access control
- Billing information display
- Upgrade/downgrade flows

**cURL Example**:
```bash
curl -X GET https://api.plantsgenius.site/api/subscriptions/active/507f191e810c19729de860ea \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const getActiveSubscription = async (userId, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/subscriptions/active/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data.subscription;
};
```

---

#### Create Subscription

```http
POST /api/subscriptions
```

**Description**: Create a new subscription for a user.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "userId": "507f191e810c19729de860ea",
  "planType": "premium",
  "status": "active",
  "startDate": "2025-10-15T00:00:00.000Z",
  "endDate": "2025-11-15T00:00:00.000Z",
  "paymentReference": "T123456789"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User's MongoDB ObjectId |
| `planType` | string | Yes | Subscription plan: `basic` or `premium` |
| `status` | string | Yes | Status: `active`, `cancelled`, or `expired` |
| `startDate` | Date | Yes | Subscription start date |
| `endDate` | Date | Yes | Subscription end date |
| `paymentReference` | string | No | Payment transaction reference |

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "planType": "premium",
  "status": "active",
  "startDate": "2025-10-15T00:00:00.000Z",
  "endDate": "2025-11-15T00:00:00.000Z",
  "paymentReference": "T123456789",
  "createdAt": "2025-10-15T12:34:56.789Z",
  "updatedAt": "2025-10-15T12:34:56.789Z"
}
```

**Use Cases**:
- After successful payment
- Subscription activation
- Plan upgrades
- Free trial creation

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f191e810c19729de860ea",
    "planType": "premium",
    "status": "active",
    "startDate": "2025-10-15T00:00:00.000Z",
    "endDate": "2025-11-15T00:00:00.000Z",
    "paymentReference": "T123456789"
  }'
```

**JavaScript Example**:
```javascript
const createSubscription = async (subscriptionData, token) => {
  const response = await fetch(
    'https://api.plantsgenius.site/api/subscriptions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionData)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

### Daily Scans

#### Get Daily Scan Count

```http
GET /api/scans/:userId/:date
```

**Description**: Retrieve scan count for a specific date.

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId
- `date` (string): Date in YYYY-MM-DD format (e.g., `2025-10-15`)

**Success Response** (`200 OK`):

Scan exists:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "scanDate": "2025-10-15",
  "scanCount": 5,
  "createdAt": "2025-10-15T08:23:45.123Z"
}
```

No scans for date:
```json
null
```

**Use Cases**:
- Track daily usage
- Enforce scan limits
- Display usage statistics
- Free vs premium tier enforcement

**cURL Example**:
```bash
curl -X GET https://api.plantsgenius.site/api/scans/507f191e810c19729de860ea/2025-10-15 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const getDailyScan = async (userId, date, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/scans/${userId}/${date}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

#### Increment Daily Scan Count

```http
POST /api/scans/:userId/:date/increment
```

**Description**: Increment scan count for a specific date (creates record if doesn't exist).

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId
- `date` (string): Date in YYYY-MM-DD format

**Request Body**: None required

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "scanDate": "2025-10-15",
  "scanCount": 6,
  "createdAt": "2025-10-15T08:23:45.123Z"
}
```

**Use Cases**:
- Record each plant scan
- Update daily usage
- Track free tier limits
- Analytics and reporting

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/scans/507f191e810c19729de860ea/2025-10-15/increment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const incrementScanCount = async (userId, date, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/scans/${userId}/${date}/increment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};

// Usage: Increment scan before identifying plant
const performScan = async (userId, token) => {
  const today = new Date().toISOString().split('T')[0];
  const scanData = await incrementScanCount(userId, today, token);

  // Check if user has reached limit
  const hasSubscription = await checkSubscription(userId, token);
  const dailyLimit = hasSubscription ? Infinity : 5;

  if (scanData.scanCount > dailyLimit) {
    throw new Error('Daily scan limit reached. Upgrade to premium for unlimited scans.');
  }

  // Proceed with plant identification...
};
```

---

### Payment Verification

#### Verify Payment

```http
POST /api/payments/verify
```

**Description**: Verify Paystack payment transaction.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "reference": "T123456789"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference` | string | Yes | Paystack transaction reference |

**Success Response** (`200 OK`):
```json
{
  "success": true,
  "reference": "T123456789",
  "amount": 500000,
  "paidAt": "2025-10-15T12:34:56.000Z",
  "channel": "card"
}
```

**Error Responses**:

- `400 Bad Request` - Missing reference
```json
{
  "error": "Payment reference required"
}
```

- `400 Bad Request` - Verification failed
```json
{
  "error": "Payment verification failed"
}
```

**Use Cases**:
- Confirm payment after Paystack redirect
- Activate subscription after payment
- Verify transaction before granting access

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/payments/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "T123456789"
  }'
```

**JavaScript Example**:
```javascript
const verifyPayment = async (reference, token) => {
  const response = await fetch(
    'https://api.plantsgenius.site/api/payments/verify',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reference })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  if (data.success) {
    // Payment verified - activate subscription
    await createSubscription({
      userId: getUserId(),
      planType: 'premium',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentReference: reference
    }, token);
  }

  return data;
};
```

---

### Plant Identifications

#### Save Plant Identification

```http
POST /api/plants/identifications
```

**Description**: Save a plant identification to cloud backup.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "plantData": {
    "scientificName": "Rosa rubiginosa",
    "commonNames": ["Sweet Briar", "Eglantine"],
    "family": "Rosaceae",
    "genus": "Rosa",
    "confidence": 0.95,
    "imageUrl": "https://example.com/plant-image.jpg",
    "identifiedAt": "2025-10-15T12:34:56.789Z"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plantData` | object | Yes | Complete plant identification data |

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "plantData": {
    "scientificName": "Rosa rubiginosa",
    "commonNames": ["Sweet Briar", "Eglantine"],
    "family": "Rosaceae",
    "genus": "Rosa",
    "confidence": 0.95,
    "imageUrl": "https://example.com/plant-image.jpg",
    "identifiedAt": "2025-10-15T12:34:56.789Z"
  },
  "createdAt": "2025-10-15T12:34:56.789Z"
}
```

**Use Cases**:
- Cloud backup of identifications
- Cross-device synchronization
- Identification history
- Data analytics

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/plants/identifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plantData": {
      "scientificName": "Rosa rubiginosa",
      "commonNames": ["Sweet Briar"],
      "confidence": 0.95
    }
  }'
```

**JavaScript Example**:
```javascript
const savePlantIdentification = async (plantData, token) => {
  const response = await fetch(
    'https://api.plantsgenius.site/api/plants/identifications',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plantData })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

#### Get Plant Identifications

```http
GET /api/plants/identifications/:userId?limit=50
```

**Description**: Retrieve user's plant identification history.

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId

**Query Parameters**:
- `limit` (number, optional): Maximum number of results (default: 50)

**Success Response** (`200 OK`):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "plantData": {
      "scientificName": "Rosa rubiginosa",
      "commonNames": ["Sweet Briar", "Eglantine"],
      "family": "Rosaceae",
      "confidence": 0.95,
      "imageUrl": "https://example.com/plant1.jpg"
    },
    "createdAt": "2025-10-15T12:34:56.789Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f191e810c19729de860ea",
    "plantData": {
      "scientificName": "Lavandula angustifolia",
      "commonNames": ["English Lavender"],
      "family": "Lamiaceae",
      "confidence": 0.88,
      "imageUrl": "https://example.com/plant2.jpg"
    },
    "createdAt": "2025-10-14T10:22:33.456Z"
  }
]
```

**Use Cases**:
- Display identification history
- Offline mode sync
- Search past identifications
- Data export

**cURL Example**:
```bash
curl -X GET "https://api.plantsgenius.site/api/plants/identifications/507f191e810c19729de860ea?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const getPlantIdentifications = async (userId, token, limit = 50) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/plants/identifications/${userId}?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

### Saved Plants

#### Get Saved Plants (Garden)

```http
GET /api/plants/saved/:userId
```

**Description**: Retrieve user's saved plants (garden collection).

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId` (string): User's MongoDB ObjectId

**Success Response** (`200 OK`):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "plantId": "plant-123",
    "plantData": {
      "scientificName": "Rosa rubiginosa",
      "commonNames": ["Sweet Briar"],
      "imageUrl": "https://example.com/plant.jpg"
    },
    "addedToGarden": "2025-10-15T12:34:56.789Z",
    "healthStatus": "healthy",
    "lastWatered": "2025-10-14T08:00:00.000Z",
    "nextWateringDue": "2025-10-16T08:00:00.000Z",
    "createdAt": "2025-10-15T12:34:56.789Z",
    "updatedAt": "2025-10-15T12:34:56.789Z"
  }
]
```

**Use Cases**:
- Display user's garden
- Plant care tracking
- Watering reminders
- Collection management

**cURL Example**:
```bash
curl -X GET https://api.plantsgenius.site/api/plants/saved/507f191e810c19729de860ea \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const getSavedPlants = async (userId, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/plants/saved/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

#### Save Plant to Garden

```http
POST /api/plants/saved
```

**Description**: Add a plant to user's garden collection.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "userId": "507f191e810c19729de860ea",
  "plantId": "plant-123",
  "plantData": {
    "scientificName": "Rosa rubiginosa",
    "commonNames": ["Sweet Briar"],
    "imageUrl": "https://example.com/plant.jpg"
  },
  "addedToGarden": "2025-10-15T12:34:56.789Z",
  "healthStatus": "healthy",
  "lastWatered": "2025-10-15T08:00:00.000Z",
  "nextWateringDue": "2025-10-17T08:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User's MongoDB ObjectId |
| `plantId` | string | Yes | Unique plant identifier |
| `plantData` | object | Yes | Plant information |
| `addedToGarden` | Date | Yes | Date added to garden |
| `healthStatus` | string | No | Plant health: `healthy`, `needs-attention`, `sick` |
| `lastWatered` | Date | No | Last watering date |
| `nextWateringDue` | Date | No | Next watering due date |

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "plantId": "plant-123",
  "plantData": {
    "scientificName": "Rosa rubiginosa",
    "commonNames": ["Sweet Briar"],
    "imageUrl": "https://example.com/plant.jpg"
  },
  "addedToGarden": "2025-10-15T12:34:56.789Z",
  "healthStatus": "healthy",
  "lastWatered": "2025-10-15T08:00:00.000Z",
  "nextWateringDue": "2025-10-17T08:00:00.000Z",
  "createdAt": "2025-10-15T12:34:56.789Z",
  "updatedAt": "2025-10-15T12:34:56.789Z"
}
```

**Use Cases**:
- Add plant to garden
- Save identified plant
- Create plant care schedule

**cURL Example**:
```bash
curl -X POST https://api.plantsgenius.site/api/plants/saved \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f191e810c19729de860ea",
    "plantId": "plant-123",
    "plantData": {
      "scientificName": "Rosa rubiginosa"
    },
    "healthStatus": "healthy"
  }'
```

**JavaScript Example**:
```javascript
const savePlantToGarden = async (plantData, token) => {
  const response = await fetch(
    'https://api.plantsgenius.site/api/plants/saved',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(plantData)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

#### Update Saved Plant

```http
PATCH /api/plants/saved/:plantId
```

**Description**: Update saved plant information (health status, watering schedule, etc.).

**Authentication**: Required (JWT)

**URL Parameters**:
- `plantId` (string): Plant's MongoDB ObjectId

**Request Body**:
```json
{
  "healthStatus": "needs-attention",
  "lastWatered": "2025-10-16T08:00:00.000Z",
  "nextWateringDue": "2025-10-18T08:00:00.000Z"
}
```

**Success Response** (`200 OK`):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "507f191e810c19729de860ea",
  "plantId": "plant-123",
  "plantData": {
    "scientificName": "Rosa rubiginosa",
    "commonNames": ["Sweet Briar"]
  },
  "healthStatus": "needs-attention",
  "lastWatered": "2025-10-16T08:00:00.000Z",
  "nextWateringDue": "2025-10-18T08:00:00.000Z",
  "createdAt": "2025-10-15T12:34:56.789Z",
  "updatedAt": "2025-10-16T14:22:33.456Z"
}
```

**Use Cases**:
- Update plant health status
- Record watering
- Modify care schedule
- Update plant notes

**cURL Example**:
```bash
curl -X PATCH https://api.plantsgenius.site/api/plants/saved/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "healthStatus": "needs-attention",
    "lastWatered": "2025-10-16T08:00:00.000Z"
  }'
```

**JavaScript Example**:
```javascript
const updateSavedPlant = async (plantId, updates, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/plants/saved/${plantId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};

// Usage: Record watering
const recordWatering = async (plantId, token) => {
  const now = new Date();
  const nextWatering = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later

  return await updateSavedPlant(
    plantId,
    {
      lastWatered: now.toISOString(),
      nextWateringDue: nextWatering.toISOString()
    },
    token
  );
};
```

---

#### Delete Saved Plant

```http
DELETE /api/plants/saved/:plantId
```

**Description**: Remove plant from user's garden collection.

**Authentication**: Required (JWT)

**URL Parameters**:
- `plantId` (string): Plant's MongoDB ObjectId

**Success Response** (`200 OK`):
```json
{
  "success": true
}
```

**Use Cases**:
- Remove plant from garden
- Delete unwanted entries
- Garden cleanup

**cURL Example**:
```bash
curl -X DELETE https://api.plantsgenius.site/api/plants/saved/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**JavaScript Example**:
```javascript
const deleteSavedPlant = async (plantId, token) => {
  const response = await fetch(
    `https://api.plantsgenius.site/api/plants/saved/${plantId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
};
```

---

## Data Models

### User Model

```typescript
interface User {
  _id: string;                    // MongoDB ObjectId
  email: string;                  // Unique email address
  password: string;               // Bcrypt hashed password (excluded from responses)
  fullName: string | null;        // User's full name
  avatarUrl: string | null;       // Profile picture URL
  authProvider: 'email' | 'google' | 'apple'; // Authentication method
  createdAt: Date;                // Account creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### Subscription Model

```typescript
interface Subscription {
  _id: string;                    // MongoDB ObjectId
  userId: string;                 // Reference to User
  planType: 'basic' | 'premium';  // Subscription tier
  status: 'active' | 'cancelled' | 'expired'; // Current status
  startDate: Date;                // Subscription start
  endDate: Date;                  // Subscription end
  paymentReference: string | null; // Paystack transaction reference
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### Daily Scan Model

```typescript
interface DailyScan {
  _id: string;                    // MongoDB ObjectId
  userId: string;                 // Reference to User
  scanDate: string;               // Date in YYYY-MM-DD format
  scanCount: number;              // Number of scans performed
  createdAt: Date;                // Creation timestamp
}
```

### Plant Identification Model

```typescript
interface PlantIdentification {
  _id: string;                    // MongoDB ObjectId
  userId: string;                 // Reference to User
  plantData: {                    // Complete plant data
    scientificName?: string;
    commonNames?: string[];
    family?: string;
    genus?: string;
    confidence?: number;
    imageUrl?: string;
    [key: string]: any;           // Additional plant data
  };
  createdAt: Date;                // Identification timestamp
}
```

### Saved Plant Model

```typescript
interface SavedPlant {
  _id: string;                    // MongoDB ObjectId
  userId: string;                 // Reference to User
  plantId: string;                // Unique plant identifier
  plantData: {                    // Plant information
    scientificName?: string;
    commonNames?: string[];
    imageUrl?: string;
    [key: string]: any;
  };
  addedToGarden: Date;            // Date added to garden
  healthStatus: 'healthy' | 'needs-attention' | 'sick'; // Plant health
  lastWatered?: Date;             // Last watering timestamp
  nextWateringDue?: Date;         // Next watering due date
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

---

## Code Examples

### Complete Authentication Flow

```javascript
class PlantGeniusAPI {
  constructor(baseURL = 'https://api.plantsgenius.site') {
    this.baseURL = baseURL;
    this.token = null;
  }

  // Sign up new user
  async signUp(email, password, fullName) {
    const response = await fetch(`${this.baseURL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, fullName })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  // Sign in existing user
  async signIn(email, password) {
    const response = await fetch(`${this.baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  // Get user profile
  async getUserProfile(userId) {
    const response = await fetch(`${this.baseURL}/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    return data;
  }

  // Update user profile
  async updateProfile(userId, updates) {
    const response = await fetch(`${this.baseURL}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    return data;
  }
}

// Usage
const api = new PlantGeniusAPI();

// Sign up
try {
  const result = await api.signUp('user@example.com', 'SecurePass123!', 'John Doe');
  console.log('Signed up:', result.user);
} catch (error) {
  console.error('Signup failed:', error.message);
}

// Sign in
try {
  const result = await api.signIn('user@example.com', 'SecurePass123!');
  console.log('Signed in:', result.user);
} catch (error) {
  console.error('Sign in failed:', error.message);
}
```

### Plant Identification Workflow

```javascript
class PlantService {
  constructor(api) {
    this.api = api;
  }

  async identifyPlant(userId, imageData) {
    // 1. Check subscription and daily limit
    const today = new Date().toISOString().split('T')[0];
    const scanData = await this.api.incrementScan(userId, today);
    const subscription = await this.api.getActiveSubscription(userId);

    const dailyLimit = subscription ? Infinity : 5;

    if (scanData.scanCount > dailyLimit) {
      throw new Error('Daily scan limit reached. Upgrade to premium for unlimited scans.');
    }

    // 2. Identify plant (using PlantNet API or similar)
    const plantData = await this.identifyPlantWithAI(imageData);

    // 3. Save identification to cloud
    const identification = await this.api.savePlantIdentification({
      plantData: {
        scientificName: plantData.scientificName,
        commonNames: plantData.commonNames,
        family: plantData.family,
        confidence: plantData.confidence,
        imageUrl: imageData.url,
        identifiedAt: new Date().toISOString()
      }
    });

    return identification;
  }

  async identifyPlantWithAI(imageData) {
    // Implement plant identification logic
    // This would call PlantNet API or similar service
    return {
      scientificName: 'Rosa rubiginosa',
      commonNames: ['Sweet Briar', 'Eglantine'],
      family: 'Rosaceae',
      confidence: 0.95
    };
  }

  async addToGarden(userId, plantData) {
    return await this.api.savePlantToGarden({
      userId,
      plantId: `plant-${Date.now()}`,
      plantData,
      addedToGarden: new Date().toISOString(),
      healthStatus: 'healthy',
      lastWatered: new Date().toISOString(),
      nextWateringDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
}

// Usage
const plantService = new PlantService(api);

// Identify plant
try {
  const identification = await plantService.identifyPlant(userId, {
    url: 'https://example.com/plant-photo.jpg'
  });
  console.log('Identified:', identification.plantData.scientificName);

  // Add to garden
  const savedPlant = await plantService.addToGarden(userId, identification.plantData);
  console.log('Added to garden:', savedPlant);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Payment and Subscription Flow

```javascript
class SubscriptionService {
  constructor(api) {
    this.api = api;
  }

  async initializePayment(email, amount, planType) {
    // Initialize Paystack payment
    const handler = PaystackPop.setup({
      key: 'YOUR_PAYSTACK_PUBLIC_KEY',
      email,
      amount: amount * 100, // Convert to kobo
      currency: 'NGN',
      ref: `sub_${Date.now()}`,
      callback: async (response) => {
        await this.verifyAndActivateSubscription(response.reference, planType);
      },
      onClose: () => {
        console.log('Payment cancelled');
      }
    });

    handler.openIframe();
  }

  async verifyAndActivateSubscription(reference, planType) {
    try {
      // 1. Verify payment
      const payment = await this.api.verifyPayment(reference);

      if (!payment.success) {
        throw new Error('Payment verification failed');
      }

      // 2. Create subscription
      const subscription = await this.api.createSubscription({
        userId: this.getUserId(),
        planType,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentReference: reference
      });

      console.log('Subscription activated:', subscription);
      return subscription;
    } catch (error) {
      console.error('Subscription activation failed:', error.message);
      throw error;
    }
  }

  getUserId() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user._id;
  }
}

// Usage
const subscriptionService = new SubscriptionService(api);

// Upgrade to premium
subscriptionService.initializePayment(
  'user@example.com',
  5000, // NGN 5,000
  'premium'
);
```

---

## Best Practices

### Security

1. **Always use HTTPS** in production
2. **Never expose JWT tokens** in URLs or logs
3. **Rotate tokens** periodically
4. **Validate all inputs** on the client before sending
5. **Store tokens securely** (use secure storage, not localStorage in production apps)

### Performance

1. **Implement caching** for frequently accessed data
2. **Batch requests** when possible
3. **Use pagination** for large datasets (implement limit/offset)
4. **Compress responses** with gzip
5. **Monitor rate limits** and implement retry logic

### Error Handling

```javascript
async function safeAPICall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.message.includes('Authentication required')) {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.message.includes('rate limit')) {
      // Implement exponential backoff
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await safeAPICall(apiFunction);
    } else {
      // Log error and show user-friendly message
      console.error('API Error:', error);
      alert('An error occurred. Please try again.');
    }
  }
}
```

---

## Support

For API support, bug reports, or feature requests:

- **Email**: support@plantsgenius.site
- **Documentation**: https://docs.plantsgenius.site
- **GitHub**: https://github.com/plantsgenius/api

---

## Changelog

### Version 1.0.0 (2025-10-15)

- Initial API release
- Authentication endpoints (sign up, sign in)
- User management (profile CRUD)
- Subscription management
- Daily scan tracking
- Payment verification (Paystack integration)
- Plant identification storage
- Saved plants (garden) management

---

**Last Updated**: October 15, 2025
**API Version**: 1.0.0
