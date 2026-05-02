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

## Stage 2

### Persistent Storage Recommendation: MongoDB (NoSQL)

**Explanation of Choice:**
For a campus notification system, **MongoDB** is an excellent choice for persistent storage for several reasons:
1. **High Write Throughput**: Notification systems are typically write-heavy (many notifications being generated by various backend systems). NoSQL databases like MongoDB handle high write loads efficiently without complex table locks.
2. **Schema Flexibility**: While the core structure is defined, different notification types (Event, Placement, Result) might require storing different metadata payloads in the future. MongoDB's flexible document structure accommodates this easily.
3. **Scalability**: MongoDB supports out-of-the-box horizontal scaling (sharding), which is crucial as the volume of notifications grows exponentially over time with increasing student batches.
4. **TTL Indexes**: MongoDB provides Time-To-Live (TTL) indexes, which can automatically delete old, expired notifications without needing a separate cleanup background worker.

---

### Database Schema (Mongoose / MongoDB)

```javascript
const notificationSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  type: { 
    type: String, 
    enum: ['Event', 'Result', 'Placement'], 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Compound index for optimizing the "Get Unread Notifications" query
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
```

---

### Data Volume Challenges & Solutions

**Problems as data volume increases:**
1. **Slower Read Queries**: As the `notifications` collection grows to millions of records, fetching a user's notifications (especially unread ones) will become slow if not properly indexed.
2. **Storage Costs**: Accumulating notifications indefinitely will lead to massive storage requirements and increased infrastructure costs.
3. **Index Size Growth**: Large collections mean large indexes. If the working set of indexes no longer fits entirely in RAM, it leads to disk I/O bottlenecks and severely degraded performance.

**Solutions to these problems:**
1. **Compound Indexing**: Create compound indexes on `(userId, isRead, createdAt)` to ensure that the most common queries (fetching a user's recent unread notifications) execute entirely in memory and filter out read notifications optimally.
2. **Data Retention Policy (TTL)**: Implement a TTL index on the `createdAt` field to automatically purge notifications older than a specific threshold (e.g., 30 days or 90 days), preventing infinite database growth.
3. **Database Sharding**: If a single database cluster reaches its vertical scaling limit, shard the MongoDB collection using `userId` as the hashed shard key. This distributes the read/write load and storage across multiple database nodes, ensuring that all queries for a specific user are routed to a specific shard efficiently.
4. **Cold Storage Archival**: For compliance or historical logging, stream old notifications from the primary hot database to a cheaper cold storage (like AWS S3 or Glacier) via a nightly batch job before they are hard-deleted.

---

### NoSQL Queries (MongoDB) mapping to Stage 1 APIs

**1. Create Notification**
```javascript
db.notifications.insertOne({
  userId: "123e4567-e89b-12d3-a456-426614174000",
  type: "Placement",
  title: "Interview Scheduled",
  message: "Your technical interview is scheduled for tomorrow at 10 AM.",
  isRead: false,
  priority: "high",
  createdAt: new Date()
});
```

**2. Get All Notifications for a User**
```javascript
db.notifications.find({ userId: "123e4567-e89b-12d3-a456-426614174000" })
  .sort({ createdAt: -1 })
  .skip(0)
  .limit(20);
```

**3. Get Unread Notifications**
```javascript
db.notifications.find({ 
  userId: "123e4567-e89b-12d3-a456-426614174000", 
  isRead: false 
}).sort({ createdAt: -1 });
```

**4. Mark Notification as Read**
```javascript
db.notifications.updateOne(
  { _id: ObjectId("550e8400-e29b-41d4-a716-446655440000"), userId: "123e4567-e89b-12d3-a456-426614174000" },
  { $set: { isRead: true } }
);
```

**5. Mark All Notifications as Read**
```javascript
db.notifications.updateMany(
  { userId: "123e4567-e89b-12d3-a456-426614174000", isRead: false },
  { $set: { isRead: true } }
);
```

**6. Delete Notification**
```javascript
db.notifications.deleteOne({
  _id: ObjectId("550e8400-e29b-41d4-a716-446655440000"),
  userId: "123e4567-e89b-12d3-a456-426614174000"
});
```

## Stage 3

### Relational Database Query Analysis

**Original Query:**
```sql
SELECT * FROM notifications 
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

**1. Is this query accurate?**
Logically, yes. It correctly filters for unread notifications belonging to a specific student and sorts them by the most recent. However, using `SELECT *` is considered an anti-pattern in production because it fetches all columns, wasting memory and network bandwidth. Furthermore, it lacks a `LIMIT` clause, meaning it could return thousands of rows for a single student, which is rarely needed for a user interface.

**2. Why is this slow?**
The database has grown to 5,000,000 notifications. If there is no specific index covering `(studentID, isRead, createdAt)`, the database will perform either a **full table scan** (O(N) complexity) to find matching rows, or a partial index scan followed by an expensive **filesort** operation to order the results by `createdAt`. Sorting millions of unindexed rows on disk/memory is highly intensive and slow.

**3. What would you change and what would be the likely computation cost?**
**Changes:**
- Replace `SELECT *` with explicit columns needed by the client (e.g., `SELECT id, title, message, createdAt`).
- Add pagination using `LIMIT` and `OFFSET`.
- Create a composite B-Tree index on `(studentID, isRead, createdAt DESC)`.

**Optimized Query:**
```sql
SELECT id, title, message, createdAt 
FROM notifications 
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 20;
```

**Likely Computation Cost:**
With the composite index, the database can directly jump to the exact location of the `studentID` and `isRead` matches. Since the index is already sorted by `createdAt DESC`, the database can just read the first 20 index entries sequentially. The cost drops significantly from $O(N)$ (or $O(N \log N)$ for sorting) to $O(\log N)$ for the index B-tree traversal plus an $O(1)$ constant time for reading the limit block. It becomes an extremely fast, sub-millisecond operation.

---

### Analysis of Adding Indexes to Every Column

**Is this advice effective?**
**No, it is highly ineffective and dangerous.**

**Why / Why not?**
1. **Write Performance Degradation**: Every time a row is inserted, updated, or deleted, the database must synchronously update *every single index*. In a write-heavy notification system, this will cause severe write bottlenecks and high CPU/Disk I/O usage.
2. **Storage and Memory Cost**: Indexes consume significant disk space. If every column is indexed, the index size could exceed the actual table data size. Furthermore, large indexes will evict useful operational data from the RAM (buffer pool), leading to cache misses and slower reads.
3. **Query Optimizer Confusion**: Having too many overlapping or single-column indexes can confuse the database query optimizer, causing it to choose suboptimal execution plans instead of using proper composite indexes.

---

### Placement Notification Query

**Write a query to find all students who got a placement notification in the last 7 days:**

```sql
SELECT DISTINCT studentID 
FROM notifications 
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```
*(Note: Syntax for `INTERVAL 7 DAY` is typical for MySQL. In PostgreSQL, it would be `CURRENT_DATE - INTERVAL '7 days'` or `NOW() - INTERVAL '7 days'`.)*
