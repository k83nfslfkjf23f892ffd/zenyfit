# ZenyFit API Reference

Complete reference for all ZenyFit API endpoints.

**Base URL**: `/api`
**Authentication**: Most endpoints require a Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

## Table of Contents

- [Authentication](#authentication)
  - [POST /api/users (signup)](#post-apiusers-signup)
  - [POST /api/users (validate invite code)](#post-apiusers-validate-invite-code)
- [Configuration](#configuration)
  - [GET /api/config](#get-apiconfig)
- [User Management](#user-management)
  - [GET /api/users](#get-apiusers)
  - [GET /api/users (validate username)](#get-apiusers-validate-username)
  - [PUT /api/users](#put-apiusers)
- [Workouts](#workouts)
  - [GET /api/workouts](#get-apiworkouts)
  - [POST /api/workouts](#post-apiworkouts)
  - [DELETE /api/workouts](#delete-apiworkouts)
- [Achievements](#achievements)
  - [GET /api/achievements](#get-apiachievements)
- [Challenges](#challenges)
  - [GET /api/challenges](#get-apichallenges)
  - [POST /api/challenges (create)](#post-apichallenges-create)
  - [POST /api/challenges (join)](#post-apichallenges-join)
  - [POST /api/challenges (invite)](#post-apichallenges-invite)
  - [PATCH /api/challenges](#patch-apichallenges)
  - [DELETE /api/challenges](#delete-apichallenges)
- [Leaderboard](#leaderboard)
  - [GET /api/leaderboard](#get-apileaderboard)
  - [GET /api/leaderboard (trend)](#get-apileaderboard-trend)
- [Invites](#invites)
  - [GET /api/invites (invite codes)](#get-apiinvites-invite-codes)
  - [POST /api/invites (create code)](#post-apiinvites-create-code)
  - [DELETE /api/invites (delete code)](#delete-apiinvites-delete-code)
  - [GET /api/invites (challenge invites)](#get-apiinvites-challenge-invites)
  - [POST /api/invites (respond to invite)](#post-apiinvites-respond-to-invite)
- [Social](#social)
  - [GET /api/social (search)](#get-apisocial-search)
  - [GET /api/social (followers)](#get-apisocial-followers)
  - [GET /api/social (following)](#get-apisocial-following)
  - [GET /api/social (feed)](#get-apisocial-feed)
  - [POST /api/social (follow)](#post-apisocial-follow)
  - [POST /api/social (unfollow)](#post-apisocial-unfollow)
- [Admin](#admin)
  - [GET /api/admin](#get-apiadmin)
  - [POST /api/admin](#post-apiadmin)

---

## Authentication

### POST /api/users (signup)

Create a new user account with an invite code.

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "password123",
  "inviteCode": "ABC123XYZ"
}
```

**Response** (200):
```json
{
  "success": true,
  "customToken": "eyJhbGc...",
  "userId": "abc123..."
}
```

**Errors**:
- `400`: Missing required fields, invalid username/password, invalid/used invite code
- `500`: Signup failed

**Notes**:
- Username must be 3-20 characters, alphanumeric + underscores only
- Password must be at least 7 characters
- Invite code is case-insensitive
- User email will be `username@zenyfit.local`

---

### POST /api/users (validate invite code)

Validate an invite code before signup.

**Request Body**:
```json
{
  "validate": "inviteCode",
  "code": "ABC123XYZ"
}
```

**Response** (200):
```json
{
  "valid": true,
  "isMaster": false
}
```

**Errors**:
- `400`: No code provided
- `500`: Server error

---

## Configuration

### GET /api/config

Get Firebase client configuration (public endpoint, no auth required).

**Response** (200):
```json
{
  "firebase": {
    "apiKey": "AIza...",
    "authDomain": "project.firebaseapp.com",
    "projectId": "project-id",
    "storageBucket": "project.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123:web:abc"
  }
}
```

---

## User Management

### GET /api/users

Get all users (limited fields) for user selection/search.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "users": [
    {
      "id": "user123",
      "username": "johndoe",
      "avatar": "https://...",
      "level": 5
    }
  ]
}
```

**Errors**:
- `401`: Unauthorized
- `500`: Failed to get users

---

### GET /api/users (validate username)

Check if a username is available.

**Query Parameters**:
- `validate=username`
- `username=<username>`

**Response** (200):
```json
{
  "success": true,
  "available": true,
  "reason": null
}
```

Or if unavailable:
```json
{
  "success": true,
  "available": false,
  "reason": "Username is already taken"
}
```

**Notes**:
- Rate limited to prevent enumeration attacks
- Username validation rules same as signup

---

### PUT /api/users

Update user profile (avatar, username, or milestones).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "avatar": "data:image/png;base64,...",
  "username": "newusername",
  "milestones": [
    {
      "id": "milestone1",
      "name": "100 Pull-ups",
      "target": 100,
      "current": 50,
      "unlockedAt": 1234567890
    }
  ]
}
```

**Response** (200):
```json
{
  "success": true,
  "updated": {
    "avatar": "data:image/png...",
    "username": "newusername",
    "updatedAt": 1234567890
  }
}
```

**Errors**:
- `400`: Invalid data, username taken, avatar too large (>200KB)
- `401`: Invalid token
- `404`: User not found
- `500`: Update failed

**Notes**:
- Avatar must be a data URL (image/png, image/jpeg, etc.)
- Max 20 milestones allowed
- Username changes propagate to all challenges

---

## Workouts

### GET /api/workouts

Retrieve user's workout logs with pagination.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)

**Response** (200):
```json
{
  "success": true,
  "logs": [
    {
      "id": "log123",
      "userId": "user123",
      "exerciseType": "pull-up",
      "amount": 10,
      "unit": "reps",
      "isCustom": false,
      "xpGained": 150,
      "timestamp": 1234567890,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "hasMore": true,
  "offset": 50
}
```

**Errors**:
- `401`: Unauthorized
- `500`: Failed to get logs

---

### POST /api/workouts

Log a new workout.

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "exerciseType": "pull-up",
  "amount": 10,
  "unit": "reps",
  "isCustom": false
}
```

**Response** (200):
```json
{
  "success": true,
  "logId": "log123",
  "xpGained": 150,
  "newXP": 1500,
  "newLevel": 3,
  "leveledUp": false
}
```

**Errors**:
- `400`: Missing fields, invalid exercise type, amount too large
- `401`: Invalid token
- `404`: User not found
- `500`: Failed to log workout

**Notes**:
- Exercise type must be 1-50 characters, lowercase alphanumeric with spaces/hyphens
- Amount must be > 0 and < 100,000
- XP is calculated server-side
- Automatically updates challenge progress if applicable

---

### DELETE /api/workouts

Delete/revert a workout (removes XP and updates challenge progress).

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "logId": "log123"
}
```

**Response** (200):
```json
{
  "success": true,
  "xpLost": 150,
  "newXP": 1350,
  "newLevel": 2
}
```

**Errors**:
- `400`: Missing logId or token
- `401`: Invalid token
- `403`: Not authorized to delete this log
- `404`: Workout log not found
- `500`: Failed to delete workout

---

## Achievements

### GET /api/achievements

Get user's achievements with progress tracking.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "achievements": [
    {
      "id": "first_workout",
      "name": "Getting Started",
      "description": "Complete your first workout",
      "icon": "🏁",
      "category": "milestones",
      "unlocked": true,
      "unlockedAt": 1234567890,
      "progress": 1,
      "total": 1
    },
    {
      "id": "10_workouts",
      "name": "Consistent",
      "description": "Log 10 workouts",
      "icon": "🔥",
      "category": "milestones",
      "unlocked": false,
      "progress": 5,
      "total": 10
    }
  ],
  "newlyUnlocked": ["first_workout"],
  "totalUnlocked": 3,
  "totalAchievements": 25
}
```

**Errors**:
- `401`: Unauthorized
- `404`: User not found
- `500`: Failed to get achievements

**Categories**:
- `milestones`: Workout count milestones
- `xp`: XP milestones
- `levels`: Level milestones
- `streaks`: Daily streak achievements
- `exercises`: Exercise-specific achievements
- `social`: Follower/following achievements
- `challenges`: Challenge participation achievements

---

## Challenges

### GET /api/challenges

Get user's challenges (participating or created).

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "success": true,
  "challenges": [
    {
      "id": "challenge123",
      "title": "100 Pull-ups in 7 Days",
      "description": "Complete 100 pull-ups within a week",
      "type": "pull-up",
      "goal": 100,
      "startDate": 1234567890,
      "endDate": 1235172690,
      "isPublic": true,
      "createdBy": "user123",
      "participants": [
        {
          "userId": "user123",
          "username": "johndoe",
          "avatar": "https://...",
          "progress": 45
        }
      ],
      "participantIds": ["user123"],
      "colors": {
        "primary": "#6C5CE7",
        "secondary": "#00B894"
      }
    }
  ]
}
```

**Errors**:
- `401`: Unauthorized
- `500`: Failed to get challenges

---

### POST /api/challenges (create)

Create a new challenge.

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "title": "100 Pull-ups Challenge",
  "description": "Complete 100 pull-ups in 7 days",
  "type": "pull-up",
  "goal": 100,
  "startDate": 1234567890,
  "endDate": 1235172690,
  "isPublic": true,
  "invitedUserIds": ["user456", "user789"]
}
```

**Response** (200):
```json
{
  "success": true,
  "challengeId": "challenge123"
}
```

---

### POST /api/challenges (join)

Join a public challenge.

**Query Parameters**:
- `action=join`
- `id=<challengeId>`

**Request Body**:
```json
{
  "idToken": "eyJhbGc..."
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

### POST /api/challenges (invite)

Invite users to a challenge.

**Query Parameters**:
- `action=invite`
- `id=<challengeId>`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "userIds": ["user456", "user789"]
}
```

**Response** (200):
```json
{
  "success": true,
  "invitesSent": 2
}
```

---

### PATCH /api/challenges

Update a challenge (creator only).

**Query Parameters**:
- `id=<challengeId>`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "title": "New Title",
  "description": "New description"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

### DELETE /api/challenges

Delete a challenge (creator only).

**Query Parameters**:
- `id=<challengeId>`

**Request Body**:
```json
{
  "idToken": "eyJhbGc..."
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

## Leaderboard

### GET /api/leaderboard

Get global rankings by exercise type with pagination.

**Query Parameters**:
- `type` (optional, default: "all") - Values: "all", "pull-up", "push-up", "dip", "run"
- `limit` (optional, default: 20, max: 100)
- `offset` (optional, default: 0)

**Response** (200):
```json
{
  "success": true,
  "rankings": [
    {
      "rank": 1,
      "userId": "user123",
      "username": "johndoe",
      "avatar": "https://...",
      "level": 15,
      "xp": 12500,
      "totalPullups": 500,
      "totalPushups": 1200,
      "totalDips": 300,
      "totalRunningKm": 50
    }
  ],
  "hasMore": true
}
```

---

### GET /api/leaderboard (trend)

Get 7-day trend data for top users.

**Query Parameters**:
- `action=trend`
- `type` (optional, default: "all")

**Response** (200):
```json
{
  "success": true,
  "trends": [
    {
      "userId": "user123",
      "username": "johndoe",
      "avatar": "https://...",
      "data": [
        { "day": "Mon", "value": 10 },
        { "day": "Tue", "value": 15 },
        { "day": "Wed", "value": 12 }
      ]
    }
  ]
}
```

---

## Invites

### GET /api/invites (invite codes)

Get user's invite codes.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `type=codes`

**Response** (200):
```json
{
  "success": true,
  "codes": [
    {
      "code": "ABC123XYZ",
      "createdBy": "user123",
      "used": false,
      "createdAt": 1234567890
    }
  ]
}
```

---

### POST /api/invites (create code)

Create a new invite code.

**Query Parameters**:
- `type=codes`

**Request Body**:
```json
{
  "idToken": "eyJhbGc..."
}
```

**Response** (200):
```json
{
  "success": true,
  "code": "ABC123XYZ"
}
```

---

### DELETE /api/invites (delete code)

Delete an unused invite code.

**Query Parameters**:
- `type=codes`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "code": "ABC123XYZ"
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

### GET /api/invites (challenge invites)

Get user's challenge invitations.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**: (none, default type is "challenges")

**Response** (200):
```json
{
  "success": true,
  "invites": [
    {
      "id": "invite123",
      "challengeId": "challenge123",
      "invitedUserId": "user123",
      "invitedBy": "user456",
      "status": "pending",
      "timestamp": 1234567890,
      "challengeTitle": "100 Pull-ups Challenge"
    }
  ]
}
```

---

### POST /api/invites (respond to invite)

Accept or reject a challenge invitation.

**Query Parameters**:
- `action=respond`
- `id=<inviteId>`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "accept": true
}
```

**Response** (200):
```json
{
  "success": true
}
```

---

## Social

### GET /api/social (search)

Search for users by username.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `action=search`
- `query=<search-term>`

**Response** (200):
```json
{
  "success": true,
  "users": [
    {
      "userId": "user123",
      "username": "johndoe",
      "avatar": "https://...",
      "level": 5,
      "xp": 2500
    }
  ]
}
```

**Notes**:
- Search term must be at least 2 characters
- Returns up to 20 results
- Case-insensitive prefix match

---

### GET /api/social (followers)

Get user's followers.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `action=followers`
- `userId` (optional, defaults to authenticated user)

**Response** (200):
```json
{
  "success": true,
  "followers": [
    {
      "userId": "user123",
      "username": "johndoe",
      "avatar": "https://...",
      "level": 5,
      "xp": 2500
    }
  ]
}
```

---

### GET /api/social (following)

Get users the user is following.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `action=following`
- `userId` (optional, defaults to authenticated user)

**Response** (200):
```json
{
  "success": true,
  "following": [
    {
      "userId": "user456",
      "username": "janedoe",
      "avatar": "https://...",
      "level": 8,
      "xp": 5000
    }
  ]
}
```

---

### GET /api/social (feed)

Get activity feed from followed users.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `action=feed`

**Response** (200):
```json
{
  "success": true,
  "activities": [
    {
      "id": "log123",
      "type": "workout",
      "userId": "user456",
      "username": "janedoe",
      "avatar": "https://...",
      "exerciseType": "pull-up",
      "amount": 10,
      "unit": "reps",
      "timestamp": 1234567890,
      "xpGained": 150
    }
  ]
}
```

**Notes**:
- Returns up to 50 most recent activities
- Includes user's own activities

---

### POST /api/social (follow)

Follow a user.

**Query Parameters**:
- `action=follow`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "targetUserId": "user456"
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Errors**:
- `400`: Already following, cannot follow yourself
- `404`: User not found

---

### POST /api/social (unfollow)

Unfollow a user.

**Query Parameters**:
- `action=unfollow`

**Request Body**:
```json
{
  "idToken": "eyJhbGc...",
  "targetUserId": "user456"
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Errors**:
- `400`: Not following this user

---

## Admin

### GET /api/admin

Admin-only endpoints for platform management.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `action=stats` - Get platform statistics
- `action=users` - Get all users (admin view)
- `action=activity` - Get recent activity

**Requirements**:
- User must be in `ADMIN_USER_IDS` env var OR have `isAdmin: true` in Firestore

**Response** (200) for `action=stats`:
```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "totalWorkouts": 5000,
    "totalChallenges": 50,
    "activeUsers": 75
  }
}
```

**Errors**:
- `401`: Unauthorized
- `403`: Forbidden - Admin access required

---

### POST /api/admin

Admin actions (ban user, delete content, etc.).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `action=ban` - Ban a user

**Request Body** for `action=ban`:
```json
{
  "idToken": "eyJhbGc...",
  "userId": "user123",
  "reason": "Violation of terms"
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Errors**:
- `401`: Unauthorized
- `403`: Forbidden - Admin access required
- `500`: Action failed

---

## Error Responses

All endpoints may return these standard errors:

**401 Unauthorized**:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**403 Forbidden**:
```json
{
  "success": false,
  "error": "Forbidden - Admin access required"
}
```

**429 Too Many Requests**:
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Error message"
}
```

**503 Service Unavailable**:
```json
{
  "success": false,
  "error": "Server not fully configured"
}
```

## Rate Limiting

The API uses in-memory rate limiting with the following limits:

- **Authentication** (signup, login): 5 requests per 15 minutes per IP
- **Read operations**: 100 requests per minute per IP
- **Write operations**: 30 requests per minute per IP

Rate limit headers are not currently returned in responses.
