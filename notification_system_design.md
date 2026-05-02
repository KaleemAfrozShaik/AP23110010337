# Stage 1

### Overview
This document details the REST API design for the Campus Notification System, supporting real-time delivery and management of user notifications (e.g., placements, results, events).

---

### Notification Object Schema

```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "string", // "Event" | "Result" | "Placement"
  "title": "string",
  "message": "string",
  "isRead": "boolean",
  "priority": "string", // "low" | "medium" | "high"
  "createdAt": "iso8601-timestamp"
}
```

---

### REST API Endpoints

#### 1. Create Notification
**Description**: Creates a new notification for a specific user. This endpoint is typically called by internal microservices (like the Placement Service or Event Service).
- **HTTP Method**: `POST`
- **Endpoint URL**: `/api/v1/users/{userId}/notifications`
- **Request Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "type": "Placement",
  "title": "Interview Scheduled",
  "message": "Your technical interview is scheduled for tomorrow at 10 AM.",
  "priority": "high"
}
```
- **Response Body**: Returns the created notification object.
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "type": "Placement",
  "title": "Interview Scheduled",
  "message": "Your technical interview is scheduled for tomorrow at 10 AM.",
  "isRead": false,
  "priority": "high",
  "createdAt": "2026-05-02T10:00:00Z"
}
```
- **Status Codes**: 
  - `201 Created`: Successfully created.
  - `400 Bad Request`: Invalid payload.
  - `401 Unauthorized`: Missing or invalid token.

#### 2. Get All Notifications for a User
**Description**: Retrieves a paginated list of all notifications for the authenticated user.
- **HTTP Method**: `GET`
- **Endpoint URL**: `/api/v1/users/me/notifications`
- **Request Headers**:
  - `Authorization: Bearer <token>`
- **Response Body**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "type": "Placement",
      "title": "Interview Scheduled",
      "message": "Your technical interview is scheduled for tomorrow at 10 AM.",
      "isRead": true,
      "priority": "high",
      "createdAt": "2026-05-02T10:00:00Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20
  }
}
```
- **Status Codes**: 
  - `200 OK`: Successfully retrieved.
  - `401 Unauthorized`: Missing or invalid token.

#### 3. Get Unread Notifications
**Description**: Retrieves a list of unread notifications for the authenticated user. Useful for badge counters.
- **HTTP Method**: `GET`
- **Endpoint URL**: `/api/v1/users/me/notifications/unread`
- **Request Headers**:
  - `Authorization: Bearer <token>`
- **Response Body**:
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "type": "Event",
      "title": "Campus Fest",
      "message": "Annual campus fest starts next week!",
      "isRead": false,
      "priority": "medium",
      "createdAt": "2026-05-02T10:05:00Z"
    }
  ]
}
```
- **Status Codes**: 
  - `200 OK`: Successfully retrieved.
  - `401 Unauthorized`: Missing or invalid token.

#### 4. Mark Notification as Read
**Description**: Marks a specific notification as read.
- **HTTP Method**: `PATCH`
- **Endpoint URL**: `/api/v1/users/me/notifications/{notificationId}/read`
- **Request Headers**:
  - `Authorization: Bearer <token>`
- **Response Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "isRead": true,
  "updatedAt": "2026-05-02T10:15:00Z"
}
```
- **Status Codes**: 
  - `200 OK`: Successfully updated.
  - `404 Not Found`: Notification does not exist.
  - `401 Unauthorized`: Missing or invalid token.

#### 5. Mark All Notifications as Read
**Description**: Marks all unread notifications for the authenticated user as read.
- **HTTP Method**: `PATCH`
- **Endpoint URL**: `/api/v1/users/me/notifications/read`
- **Request Headers**:
  - `Authorization: Bearer <token>`
- **Response Body**:
```json
{
  "message": "All notifications marked as read.",
  "modifiedCount": 5
}
```
- **Status Codes**: 
  - `200 OK`: Successfully updated.
  - `401 Unauthorized`: Missing or invalid token.

#### 6. Delete Notification
**Description**: Deletes a specific notification from the user's inbox.
- **HTTP Method**: `DELETE`
- **Endpoint URL**: `/api/v1/users/me/notifications/{notificationId}`
- **Request Headers**:
  - `Authorization: Bearer <token>`
- **Response Body**: (Empty body)
- **Status Codes**: 
  - `204 No Content`: Successfully deleted.
  - `404 Not Found`: Notification does not exist.
  - `401 Unauthorized`: Missing or invalid token.

---

### Real-time Delivery Mechanism

#### Mechanism Chosen: WebSockets
WebSockets provide a persistent, full-duplex communication channel over a single TCP connection, which is ideal for real-time applications requiring low latency, such as a campus notification system where alerts (like placement results) need to be delivered instantly.

#### Flow Explanation
1. **Connection Establishment**: When the user logs into the campus application (web or mobile frontend), the client establishes a WebSocket connection to the server (e.g., `wss://api.campus.edu/ws`).
2. **Authentication**: The client sends its JWT token as the first message or within the connection headers. The server verifies the token and maps the active WebSocket connection session to the specific `userId`.
3. **Listening for Events**: The client sets up event listeners for incoming messages on the WebSocket connection.
4. **Pushing Notifications**: When an internal backend service calls the `POST /api/v1/users/{userId}/notifications` endpoint to trigger a new notification, the Notification Service persists the notification in the database and simultaneously checks if the target `userId` has an active WebSocket connection.
5. **Delivery**: If the connection is active, the server pushes the newly created JSON notification object over the WebSocket channel to the client.
6. **Client Handling**: The client receives the JSON payload in real-time, displays an in-app toast/banner, and increments the notification bell counter seamlessly without requiring a page refresh.
