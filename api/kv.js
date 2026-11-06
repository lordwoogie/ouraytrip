// Shared KV endpoint for the family trip site, mirroring the McWilliams HQ
// /api/kv contract: GET /api/kv?key=K -> JSON value, POST {key, value} -> store.
//
// Works with either backend, whichever is configured on the Vercel project:
//  - Upstash Redis / Vercel KV  (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_* names)
//  - Vercel Blob                (BLOB_READ_WRITE_TOKEN)
// With neither configured it returns 503 and the site falls back to localStorage.

const ALLOWED_KEYS = ["trip-grocery-v1"];
const MAX_BYTES = 256 * 1024;

function redisBackend() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const auth = { Authorization: "Bearer " + token };
  return {
    async get(key) {
      const r = await fetch(url + "/get/" + encodeURIComponent(key), { headers: auth });
      if (!r.ok) throw new Error("redis get " + r.status);
      const d = await r.json();
      return d && d.result != null ? JSON.parse(d.result) : null;
    },
    async set(key, value) {
      const r = await fetch(url + "/set/" + encodeURIComponent(key), {
        method: "POST",
        headers: auth,
        body: JSON.stringify(value),
      });
      if (!r.ok) throw new Error("redis set " + r.status);
    },
  };
}

function blobBackend() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const blob = require("@vercel/blob");
  const prefix = (key) => "kv/" + key + "/";
  // Each save writes a NEW pathname and reads pick the newest, so CDN caching
  // of blob URLs never serves a stale list.
  return {
    async get(key) {
      const { blobs } = await blob.list({ prefix: prefix(key), limit: 1000 });
      if (!blobs.length) return null;
      blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
      const r = await fetch(blobs[0].url, { cache: "no-store" });
      if (!r.ok) throw new Error("blob fetch " + r.status);
      return await r.json();
    },
    async set(key, value) {
      const name =
        prefix(key) + String(Date.now()).padStart(14, "0") + "-" +
        Math.random().toString(36).slice(2, 8) + ".json";
      await blob.put(name, JSON.stringify(value), {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      try {
        const { blobs } = await blob.list({ prefix: prefix(key), limit: 1000 });
        blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
        const old = blobs.slice(4).map((b) => b.url);
        if (old.length) await blob.del(old);
      } catch (e) { /* pruning is best-effort */ }
    },
  };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  const backend = redisBackend() || blobBackend();
  if (!backend) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "kv-not-configured" }));
    return;
  }
  try {
    if (req.method === "GET") {
      const key = (req.query && req.query.key) || "";
      if (!ALLOWED_KEYS.includes(key)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "bad-key" }));
        return;
      }
      const v = await backend.get(key);
      res.end(JSON.stringify(v === null ? [] : v));
    } else if (req.method === "POST") {
      const body = req.body || {};
      const key = body.key || "";
      if (!ALLOWED_KEYS.includes(key)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "bad-key" }));
        return;
      }
      const payload = JSON.stringify(body.value == null ? [] : body.value);
      if (payload.length > MAX_BYTES) {
        res.statusCode = 413;
        res.end(JSON.stringify({ error: "too-large" }));
        return;
      }
      await backend.set(key, JSON.parse(payload));
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "method" }));
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "kv-failed" }));
  }
};
