# Genderize API

A lightweight REST API built with Node.js and Express that classifies names by gender using the [Genderize.io](https://genderize.io) API.

## Requirements

- Node.js v18+
- npm

## Setup

```bash
npm install
node server.js
```

The server starts on port `8080` by default. Override with the `PORT` environment variable:

```bash
PORT=3000 node server.js
```

---

## Endpoint

### `GET /api/classify`

Classifies a name by gender.

**Query Parameters**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `name`    | string | Yes      | The name to classify |

**Example Request**

```
GET /api/classify?name=john
```

**Success Response — 200 OK**

```json
{
  "status": "success",
  "data": {
    "name": "john",
    "gender": "male",
    "probability": 0.99,
    "sample_size": 234567,
    "is_confident": true,
    "processed_at": "2026-04-16T10:22:00Z"
  }
}
```

| Field          | Type    | Description                                              |
|----------------|---------|----------------------------------------------------------|
| `name`         | string  | The name as returned by Genderize.io                     |
| `gender`       | string  | `"male"` or `"female"`                                   |
| `probability`  | number  | Confidence score from Genderize.io (0–1)                 |
| `sample_size`  | number  | Number of data points used (renamed from `count`)        |
| `is_confident` | boolean | `true` only if `probability >= 0.7` AND `sample_size >= 100` |
| `processed_at` | string  | UTC timestamp in ISO 8601 format, generated per request  |

---

## Error Responses

All errors follow this structure:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

| Status | Cause |
|--------|-------|
| `400 Bad Request` | `name` parameter is missing or empty |
| `422 Unprocessable Entity` | `name` is not a string, or contains no alphabetic characters, or Genderize has no prediction for it |
| `502 Bad Gateway` | Genderize.io is unreachable or timed out |
| `500 Internal Server Error` | Unexpected server error |

**Examples**

```bash
# Missing name
curl "http://localhost:8080/api/classify"
# {"status":"error","message":"Missing required query parameter: name"}

# Empty name
curl "http://localhost:8080/api/classify?name="
# {"status":"error","message":"Query parameter 'name' must not be empty"}

# Non-alphabetic name
curl "http://localhost:8080/api/classify?name=1234"
# {"status":"error","message":"Query parameter 'name' must contain alphabetic characters"}

# Unknown name (no Genderize prediction)
curl "http://localhost:8080/api/classify?name=xzqq"
# {"status":"error","message":"No prediction available for the provided name"}
```

---

## Design Notes

- **CORS** — `Access-Control-Allow-Origin: *` is set on every response.
- **Timeout** — Upstream requests to Genderize.io are capped at 4500ms.
- **`is_confident` logic** — Both conditions must be true: `probability >= 0.7` AND `sample_size >= 100`. If either fails, it returns `false`.
- **`processed_at`** — Generated fresh on every request using `new Date().toISOString()`. Never hardcoded.
- **`sample_size`** — Directly mapped from Genderize.io's `count` field.
