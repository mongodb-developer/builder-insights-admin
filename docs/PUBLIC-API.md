# Builder Insights Public API

The Builder Insights Public API allows third-party applications to record developer insights, query events, and integrate with the Builder Insights platform programmatically.

**Base URL:** `https://your-deployment.vercel.app/api/v1`

---

## Authentication

All API requests require an API key passed via the `X-API-Key` header.

```bash
curl -H "X-API-Key: bi_your_api_key_here" \
  https://your-deployment.vercel.app/api/v1/insights
```

### Obtaining an API Key

API keys are issued by Builder Insights administrators. Contact your org admin to request a key. They will provide:

1. A **plaintext API key** (starts with `bi_`) -- store this securely; it cannot be retrieved again.
2. The **scopes** your key is authorized for.
3. Your **rate limit** (requests per day).

### Key Format

Keys follow the pattern `bi_<64-char-hex-string>`. Example:

```
bi_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### Error Responses

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid API key |
| `403` | Key lacks the required scope |
| `429` | Rate limit exceeded |

```json
{
  "error": "Authentication failed",
  "message": "Invalid API key"
}
```

---

## Scopes

Each API key is granted specific scopes that control what it can access:

| Scope | Description |
|-------|-------------|
| `insights:read` | Read insights data |
| `insights:write` | Create and update insights |
| `events:read` | Read events data |
| `events:write` | Create and update events |
| `sessions:read` | Read session data |
| `advocates:read` | Read advocate profiles |

---

## Rate Limiting

Each API key has a daily request limit (default: 1,000 requests/day). When you exceed the limit, you'll receive a `429` response:

```json
{
  "error": "Authentication failed",
  "message": "Rate limit exceeded (1000 requests/day)"
}
```

Rate limits reset at midnight UTC.

---

## Pagination

All list endpoints support pagination via `skip` and `limit` query parameters:

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of items to return |
| `skip` | 0 | -- | Number of items to skip |

Responses include a `pagination` object:

```json
{
  "data": [...],
  "pagination": {
    "total": 342,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

---

## Endpoints

### Insights

#### List Insights

```
GET /api/v1/insights
```

**Scope:** `insights:read`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Items per page (max 100) |
| `skip` | number | Items to skip |
| `eventId` | string | Filter by event ID |
| `sessionId` | string | Filter by session ID |
| `type` | string | Filter by insight type |
| `sentiment` | string | Filter by sentiment |
| `priority` | string | Filter by priority |
| `productArea` | string | Filter by product area |
| `since` | string | ISO date -- insights captured on or after |
| `until` | string | ISO date -- insights captured on or before |

**Example:**

```bash
curl -H "X-API-Key: bi_your_key" \
  "https://your-app.vercel.app/api/v1/insights?type=Feature+Request&priority=High&limit=10"
```

**Response:**

```json
{
  "data": [
    {
      "_id": "6651a...",
      "text": "It would be great if Atlas Search supported fuzzy matching on array fields",
      "title": "Fuzzy matching for arrays in Atlas Search",
      "type": "Feature Request",
      "sentiment": "Positive",
      "priority": "High",
      "productAreas": ["Atlas Search"],
      "tags": ["search", "arrays"],
      "eventId": "665f1...",
      "eventName": "MongoDB.local NYC 2025",
      "advocateName": "Jane Doe",
      "capturedAt": "2025-06-01T14:30:00.000Z",
      "createdAt": "2025-06-01T14:30:00.000Z",
      "updatedAt": "2025-06-01T14:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "skip": 0,
    "hasMore": true
  }
}
```

---

#### Get a Single Insight

```
GET /api/v1/insights/:id
```

**Scope:** `insights:read`

```bash
curl -H "X-API-Key: bi_your_key" \
  https://your-app.vercel.app/api/v1/insights/6651a...
```

---

#### Create an Insight

```
POST /api/v1/insights
```

**Scope:** `insights:write`

**Request Body (JSON):**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | **Yes** | -- | The insight content |
| `title` | string | No | null | Short title/summary |
| `type` | string | No | `"General Feedback"` | Insight type (see values below) |
| `sentiment` | string | No | `"Neutral"` | Sentiment classification |
| `priority` | string | No | `"Medium"` | Priority level |
| `productAreas` | string[] | No | `[]` | Related product areas |
| `tags` | string[] | No | `[]` | Free-form tags |
| `eventId` | string | No | null | Link to an existing event |
| `eventName` | string | No | null | Event name (for display) |
| `sessionId` | string | No | null | Link to an existing session |
| `advocateId` | string | No | null | Advocate who captured it |
| `advocateName` | string | No | API key owner name | Display name of capturer |
| `developerInfo` | object | No | `{}` | Info about the developer who provided feedback |
| `followUpRequired` | boolean | No | `false` | Flag for follow-up |
| `capturedAt` | string | No | Current time | ISO timestamp of when insight was captured |

**Enum Values:**

**type:**
`Pain Point`, `Feature Request`, `Praise`, `Question`, `Use Case`, `Competition`, `Documentation`, `General Feedback`, `Other`

**sentiment:**
`Positive`, `Neutral`, `Negative`

**priority:**
`Low`, `Medium`, `High`, `Critical`

**productAreas:**
`Atlas`, `Atlas Search`, `Atlas Vector Search`, `Atlas Stream Processing`, `Atlas Charts`, `Atlas Data Federation`, `Atlas Device Sync`, `Realm`, `Compass`, `MongoDB Shell`, `Drivers`, `Community`, `Documentation`, `Other`

**Example:**

```bash
curl -X POST \
  -H "X-API-Key: bi_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Developer at our booth asked about vector search support for image embeddings. Very interested in multimodal search.",
    "title": "Multimodal vector search interest",
    "type": "Feature Request",
    "sentiment": "Positive",
    "priority": "High",
    "productAreas": ["Atlas Vector Search"],
    "tags": ["vector-search", "multimodal", "images"],
    "eventId": "665f1abc...",
    "eventName": "MongoDB.local NYC 2025",
    "developerInfo": {
      "role": "ML Engineer",
      "company": "Acme Corp",
      "experience": "intermediate"
    }
  }' \
  https://your-app.vercel.app/api/v1/insights
```

**Response (201):**

```json
{
  "data": {
    "_id": "6661b...",
    "text": "Developer at our booth asked about vector search support for image embeddings...",
    "title": "Multimodal vector search interest",
    "type": "Feature Request",
    "sentiment": "Positive",
    "priority": "High",
    "productAreas": ["Atlas Vector Search"],
    "tags": ["vector-search", "multimodal", "images"],
    "eventId": "665f1abc...",
    "eventName": "MongoDB.local NYC 2025",
    "advocateName": "Your Name",
    "capturedAt": "2025-06-06T18:00:00.000Z",
    "createdAt": "2025-06-06T18:00:00.000Z",
    "updatedAt": "2025-06-06T18:00:00.000Z",
    "source": "api",
    "synced": true
  }
}
```

---

#### Update an Insight

```
PUT /api/v1/insights/:id
```

**Scope:** `insights:write`

Only the following fields can be updated via the public API:

`text`, `title`, `type`, `sentiment`, `priority`, `productAreas`, `tags`, `followUpRequired`

```bash
curl -X PUT \
  -H "X-API-Key: bi_your_key" \
  -H "Content-Type: application/json" \
  -d '{"priority": "Critical", "tags": ["escalated"]}' \
  https://your-app.vercel.app/api/v1/insights/6661b...
```

---

### Events

#### List Events

```
GET /api/v1/events
```

**Scope:** `events:read`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Items per page (max 100) |
| `skip` | number | Items to skip |
| `since` | string | ISO date -- events starting on or after |
| `until` | string | ISO date -- events starting on or before |
| `search` | string | Search by event name or location |

**Example:**

```bash
curl -H "X-API-Key: bi_your_key" \
  "https://your-app.vercel.app/api/v1/events?search=MongoDB.local&limit=10"
```

---

#### Get a Single Event

```
GET /api/v1/events/:id
```

**Scope:** `events:read`

---

#### Create an Event

```
POST /api/v1/events
```

**Scope:** `events:write`

**Request Body:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | -- | Event name |
| `description` | string | No | `""` | Event description |
| `location` | string | No | `""` | Event location |
| `startDate` | string | No | Current time | ISO date |
| `endDate` | string | No | null | ISO date |
| `type` | string | No | `"conference"` | Event type |
| `status` | string | No | `"upcoming"` | Event status |

---

### Sessions

#### List Sessions

```
GET /api/v1/sessions
```

**Scope:** `sessions:read`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Items per page (max 100) |
| `skip` | number | Items to skip |
| `eventId` | string | Filter by event ID |

---

### Advocates

#### List Advocates

```
GET /api/v1/advocates
```

**Scope:** `advocates:read`

Returns active advocates with limited fields (name, role, ID) for privacy.

---

## Code Examples

### Python

```python
import requests

API_KEY = "bi_your_api_key_here"
BASE_URL = "https://your-app.vercel.app/api/v1"
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
}


def create_insight(text, insight_type="General Feedback", **kwargs):
    """Create a new insight."""
    payload = {"text": text, "type": insight_type, **kwargs}
    response = requests.post(f"{BASE_URL}/insights", json=payload, headers=HEADERS)
    response.raise_for_status()
    return response.json()["data"]


def list_insights(limit=50, **filters):
    """List insights with optional filters."""
    params = {"limit": limit, **filters}
    response = requests.get(f"{BASE_URL}/insights", params=params, headers=HEADERS)
    response.raise_for_status()
    return response.json()


# Create an insight
insight = create_insight(
    text="Developer needs better Python driver docs for aggregation pipelines",
    insight_type="Documentation",
    sentiment="Negative",
    priority="High",
    productAreas=["Drivers", "Documentation"],
    tags=["python", "aggregation"],
    eventName="PyCon 2025",
)
print(f"Created insight: {insight['_id']}")

# List all high-priority feature requests
results = list_insights(type="Feature Request", priority="High")
print(f"Found {results['pagination']['total']} high-priority feature requests")
```

### JavaScript / Node.js

```javascript
const API_KEY = "bi_your_api_key_here";
const BASE_URL = "https://your-app.vercel.app/api/v1";

async function createInsight(data) {
  const response = await fetch(`${BASE_URL}/insights`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error (${response.status}): ${error.message}`);
  }

  return response.json();
}

async function listInsights(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${BASE_URL}/insights?${query}`, {
    headers: { "X-API-Key": API_KEY },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API error (${response.status}): ${error.message}`);
  }

  return response.json();
}

// Usage
const { data: insight } = await createInsight({
  text: "Strong interest in Atlas Vector Search for RAG applications",
  type: "Use Case",
  sentiment: "Positive",
  priority: "High",
  productAreas: ["Atlas Vector Search"],
  tags: ["rag", "ai", "llm"],
  eventName: "AI Engineer Summit 2025",
});

console.log(`Created insight: ${insight._id}`);
```

### React Native / Expo

```javascript
// For use in the companion mobile app or any React Native app

const API_KEY = "bi_your_api_key_here";
const BASE_URL = "https://your-app.vercel.app/api/v1";

class BuilderInsightsClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || "API request failed");
    }
    return data;
  }

  // Insights
  listInsights(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/insights?${query}`);
  }

  createInsight(insight) {
    return this.request("/insights", {
      method: "POST",
      body: JSON.stringify(insight),
    });
  }

  getInsight(id) {
    return this.request(`/insights/${id}`);
  }

  updateInsight(id, updates) {
    return this.request(`/insights/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Events
  listEvents(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/events?${query}`);
  }

  getEvent(id) {
    return this.request(`/events/${id}`);
  }

  createEvent(event) {
    return this.request("/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  // Sessions
  listSessions(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sessions?${query}`);
  }

  // Advocates
  listAdvocates(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/advocates?${query}`);
  }
}

// Initialize
const client = new BuilderInsightsClient(API_KEY);

// Record an insight from a conference booth
await client.createInsight({
  text: "Enterprise customer needs multi-region Atlas deployment guidance",
  type: "Question",
  sentiment: "Neutral",
  priority: "High",
  productAreas: ["Atlas"],
  eventName: "KubeCon 2025",
  developerInfo: {
    role: "Platform Engineer",
    company: "Fortune 500",
  },
});
```

### cURL (Batch Upload)

```bash
#!/bin/bash
# Batch upload insights from a CSV or JSON file

API_KEY="bi_your_api_key_here"
BASE_URL="https://your-app.vercel.app/api/v1"

# Upload a single insight
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Many developers asking about MongoDB + LangChain integration",
    "type": "Use Case",
    "sentiment": "Positive",
    "priority": "Medium",
    "productAreas": ["Atlas Vector Search", "Drivers"],
    "tags": ["langchain", "ai", "python"],
    "eventName": "LangChain Meetup SF"
  }' \
  "$BASE_URL/insights" | jq .

# List recent insights
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/insights?limit=5&since=2025-01-01" | jq .
```

---

## Error Handling

All error responses follow a consistent format:

```json
{
  "error": "Short error description",
  "message": "Detailed explanation of what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (missing/invalid API key) |
| `403` | Forbidden (insufficient scope) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Admin: API Key Management

Administrators manage API keys via the admin API (requires JWT auth with admin role):

### Generate a Key

```bash
curl -X POST \
  -H "Cookie: di-session=your_jwt_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Partner Integration - Acme Corp",
    "ownerEmail": "dev@acme.com",
    "ownerName": "Acme Corp",
    "scopes": ["insights:read", "insights:write", "events:read"],
    "rateLimit": 5000,
    "description": "Used by Acme Corp internal tool to submit conference insights"
  }' \
  https://your-app.vercel.app/api/admin/api-keys
```

**Response:**
```json
{
  "message": "API key created. Store the key securely - it cannot be retrieved again.",
  "key": "bi_a1b2c3d4...",
  "apiKey": {
    "_id": "...",
    "prefix": "bi_a1b2c3d4",
    "name": "Partner Integration - Acme Corp",
    "scopes": ["insights:read", "insights:write", "events:read"],
    "rateLimit": 5000,
    "isActive": true,
    ...
  }
}
```

### List Keys

```
GET /api/admin/api-keys
```

### Update Key Settings

```
PUT /api/admin/api-keys/:id
```

Body: `{ "rateLimit": 10000, "scopes": [...] }`

### Revoke a Key

```
DELETE /api/admin/api-keys/:id
```

---

## Best Practices

1. **Store your API key securely.** Use environment variables, not hardcoded values.
2. **Use the narrowest scopes needed.** Only request scopes your integration actually uses.
3. **Handle rate limits gracefully.** Implement exponential backoff when you receive `429` responses.
4. **Include `capturedAt` timestamps.** If recording insights after the fact, pass the original capture time.
5. **Link insights to events.** Use `eventId` and `eventName` to associate insights with specific events for better reporting.
6. **Use meaningful tags.** Tags improve discoverability and reporting in the admin dashboard.
7. **Batch wisely.** If uploading many insights, space requests to stay within your rate limit.

---

## Changelog

### v1 (Initial Release)

- Insights: CRUD operations with filtering and pagination
- Events: List, get, and create with search support
- Sessions: Read-only access with event filtering
- Advocates: Read-only access (limited fields)
- API key authentication with SHA-256 hashing
- Scope-based authorization (6 scopes)
- Per-key daily rate limiting with usage tracking
