const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;

// ── CORS on every response ────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const sendError = (res, status, message) =>
  res.status(status).json({ status: "error", message });

// ── Root route ────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Welcome to the Classify API. Try https://hng-backend-task0-production.up.railway.app/api/classify?name=john"
  });
});

// ── GET /api/classify ─────────────────────────────────────────────────────────
app.get("/api/classify", async (req, res) => {
  const { name } = req.query;

  // 400 – missing or empty
  if (name === undefined || name === null) {
    return sendError(res, 400, "Missing required query parameter: name");
  }

  // 422 – not a usable string (array, object, purely numeric, etc.)
  if (typeof name !== "string") {
    return sendError(res, 422, "Query parameter 'name' must be a string");
  }

  const trimmed = name.trim();

  if (trimmed === "") {
    return sendError(res, 400, "Query parameter 'name' must not be empty");
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return sendError(
      res,
      422,
      "Query parameter 'name' must contain alphabetic characters"
    );
  }

  // ── Call Genderize.io ───────────────────────────────────────────────────────
  let genderize;
  try {
    const upstream = await fetch(
      `https://api.genderize.io/?name=${encodeURIComponent(trimmed)}`,
      { signal: AbortSignal.timeout(450) } // stay well under 500 ms budget
    );

    if (!upstream.ok) {
      return sendError(res, 502, "Upstream API returned an error");
    }

    genderize = await upstream.json();
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return sendError(res, 502, "Upstream API request timed out");
    }
    return sendError(res, 502, "Failed to reach upstream API");
  }

  // ── Edge cases ──────────────────────────────────────────────────────────────
  if (!genderize.gender || !genderize.count || genderize.count === 0) {
    return sendError(
      res,
      500,
      "No prediction available for the provided name"
    );
  }

  // ── Process ─────────────────────────────────────────────────────────────────
  const probability = genderize.probability;
  const sample_size = genderize.count;           // rename count → sample_size
  const is_confident = probability >= 0.7 && sample_size >= 100;
  const processed_at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  return res.status(200).json({
    status: "success",
    data: {
      name: genderize.name,
      gender: genderize.gender,
      probability,
      sample_size,
      is_confident,
      processed_at,
    },
  });
});

// ── 404 for anything else ─────────────────────────────────────────────────────
app.use((req, res) => sendError(res, 404, "Not found"));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
