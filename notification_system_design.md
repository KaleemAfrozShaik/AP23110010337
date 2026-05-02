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

## Stage 4

### Performance Optimization for Notification Fetching

**The Problem:**
Fetching notifications synchronously on every page load for every student causes an extremely high volume of read operations. This essentially creates an accidental DDoS effect, overwhelming the database and causing severe latency and a poor user experience.

**Suggested Solutions & Strategies:**

To resolve this issue, I recommend a multi-layered approach combining **Client-Side State Management**, **Real-Time Push (WebSockets)**, and **In-Memory Caching**.

#### 1. Client-Side Caching (LocalStorage / Context API / Redux)
**How it improves performance:**
When the Single Page Application (SPA) first loads, it fetches the notifications and stores them in memory (like Redux or Context API) or persistently in the browser (LocalStorage). As the student navigates between pages, the UI renders the cached local data instantly without making any backend API requests.
**Tradeoffs:**
- *Pros*: Zero latency during client-side navigation. Absolutely zero backend load for subsequent page views. Easy to implement in modern frontend frameworks.
- *Cons*: Data is isolated to a single browser. If a student marks a notification as read on their mobile app, their desktop browser cache will be stale until the next hard refresh or a WebSocket event synchronizes it.

#### 2. Real-Time Push Mechanism (WebSockets / SSE)
**How it improves performance:**
Instead of the client requesting data on every navigation (Pull model), the server maintains a persistent connection and actively pushes new notifications to the client only when they occur (Push model).
**Tradeoffs:**
- *Pros*: Completely eliminates repetitive DB polling. Provides instantaneous real-time updates for a superior UX. Greatly reduces HTTP request overhead.
- *Cons*: Requires stateful servers to manage persistent connections. Scaling WebSockets requires sticky sessions or a pub/sub backplane (like Redis Pub/Sub). More complex to implement connection retries and fallbacks.

#### 3. Distributed In-Memory Caching (Redis / Memcached)
**How it improves performance:**
If a user must pull their notifications (e.g., initial login or a hard refresh), the API should fetch them from a fast in-memory cache (Redis) rather than querying the primary database. The database is only queried on a cache miss, after which the cache is populated.
**Tradeoffs:**
- *Pros*: Sub-millisecond read latency. Protects the primary database from sudden read spikes. Highly scalable.
- *Cons*: Cache invalidation can be tricky (e.g., ensuring the cache is updated synchronously when a notification is marked as read). Adds additional infrastructure cost and complexity to the backend architecture.

### Recommended Implementation Flow
1. **Initial Load**: Client hits the REST API. The API serves the recent notifications from **Redis** (falling back to the DB only if missing).
2. **Persistence**: Client stores these notifications in its **local state** (Context/Redux).
3. **Navigation**: Page transitions within the app use the local state, resulting in **zero** API calls.
4. **Updates**: A **WebSocket** connection pushes new notifications silently to the client's local state, updating the UI badge instantly without a database poll.

## Stage 5

### Shortcomings of the Current Implementation

**Original Pseudocode:**
```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message) # calls Email API
        save_to_db(student_id, message) # DB insert
        push_to_app(student_id, message) # WebSocket push
```

**Observed Shortcomings:**
1. **Synchronous Blocking Execution**: Processing 50,000 students sequentially in a single thread is highly inefficient. If `send_email` takes even 100ms per student, the total operation will take over 80 minutes. The HTTP request initiated by the HR will inevitably timeout, resulting in an uncertain state.
2. **Tight Coupling and Shared Failure Domains**: The Database Insert, Email API, and App Push are tightly coupled. If the external Email API goes down or rate-limits the application, the loop might crash. This means the notification won't even be saved to the database or pushed to the app for the remaining students.
3. **Lack of Fault Tolerance and Retries**: As observed with the 200 failed students, there is no mechanism to automatically retry the failed `send_email` calls without affecting the rest of the batch. Recovering from a mid-loop crash requires manual log parsing and custom scripts.

### Should DB Save and Email Sending Happen Together?

**No, they should NOT happen together synchronously.**
- **Why**: Saving to a database is an internal, fast, and highly reliable operation (microseconds/milliseconds). Sending an email relies on an external third-party API over the network, which is slow, unreliable, and subject to rate limits. Tying them together means the fast system (DB) is bottlenecked by the slow system (Email API). They must be decoupled to ensure that an email failure doesn't prevent the notification from appearing in the user's application dashboard.

### Redesigning for Reliability and Speed

To redesign this, we need to transition to an **Event-Driven Architecture** utilizing an asynchronous **Message Queue** (e.g., RabbitMQ, Kafka, AWS SQS) and background worker processes.

**The Strategy:**
1. **Fast API Response**: The `notify_all` function should perform a bulk insert into the database (very fast) and push the 50,000 tasks into a message queue. It then immediately returns a success response to the HR frontend.
2. **Independent Workers**: Separate background worker processes will consume messages from the queues to handle the slow tasks (`send_email` and `push_to_app`) concurrently and independently.
3. **Automatic Retries**: If an email fails for a specific student, the worker simply negatively acknowledges (NACKs) the message. The queue will automatically retry it with exponential backoff without affecting the rest of the system or dropping the message.

### Revised Pseudocode

```python
# API Handler (Executed when HR clicks "Notify All")
function notify_all(student_ids: array, message: string):
    # 1. Decoupled, fast bulk insert to the database
    bulk_save_to_db(student_ids, message)
    
    # 2. Publish individual tasks to Message Queues
    for student_id in student_ids:
        enqueue_message("email_queue", student_id, message)
        enqueue_message("push_queue", student_id, message)
        
    # 3. Immediate response to HR
    return { status: 200, message: "Notifications queued successfully for processing." }

# ---------------------------------------------------------
# Background Worker: Email Delivery (Scales horizontally)
# ---------------------------------------------------------
function process_email_queue():
    while msg = consume("email_queue"):
        try:
            send_email(msg.student_id, msg.message)
            ack(msg) # Acknowledge success to remove from queue
        except RateLimitError, NetworkError:
            # Requeue with exponential backoff for the 200 failed students
            nack(msg, requeue=True) 

# ---------------------------------------------------------
# Background Worker: Real-Time App Push (Scales horizontally)
# ---------------------------------------------------------
function process_push_queue():
    while msg = consume("push_queue"):
        try:
            push_to_app(msg.student_id, msg.message)
            ack(msg)
        except PushConnectionError:
            nack(msg, requeue=True)
```

## Stage 6

### Priority Inbox Implementation Approach

The product manager requested a "Priority Inbox" that always displays the top `n` most important unread notifications first, ordered by priority weight (`Placement` > `Result` > `Event`) and then by recency (timestamp).

**Implementation Details:**
1. A Node.js script (`stage6.js`) was created within the `notification_app_be/src` directory.
2. The script fetches the live data from the protected `evaluation-service/notifications` API using the provided JWT token.
3. It maps each notification type to a numeric weight (`Placement: 3, Result: 2, Event: 1`).
4. It sorts the array of notifications based on this weight (descending). If two notifications have the same weight, it falls back to sorting by the `Timestamp` (descending, meaning most recent first).
5. It then slices the array to extract the top 10 notifications and displays them in a formatted console table.

### Maintaining Top 10 Efficiently with Continuous Live Data

As new notifications stream into the system continuously (e.g., via WebSockets), re-sorting the entire list of a student's unread notifications every time a new one arrives is computationally expensive ($O(N \log N)$).

**Optimal Solution: Min-Heap (Priority Queue)**
To maintain the top 10 efficiently on the client-side or caching layer, we should use a **Min-Heap** of size $K$ (where $K = 10$).

**Algorithm:**
1. Maintain a Min-Heap of the top 10 notifications, where the "minimum" element is the *least* important notification currently in the top 10 (i.e., lowest weight, or oldest timestamp if weights are equal).
2. When a new notification arrives, compare it to the root of the Min-Heap (the 10th most important notification).
3. If the new notification is **more important** than the root, pop the root and insert the new notification.
4. If it is **less important**, simply ignore it for the top 10 view.

**Complexity:** 
Extracting the minimum and inserting a new element into a heap of size 10 takes $O(\log K)$ time. Since $K = 10$ is a constant, the operation essentially executes in **$O(1)$ constant time** per new notification. This guarantees high performance without needing to re-sort arrays or heavily hit the database.
