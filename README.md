# Family Trip Site

Static family site on Vercel with one serverless endpoint.

## Pages

| URL        | File                  | Purpose                                            |
|------------|-----------------------|----------------------------------------------------|
| `/`        | `public/index.html`   | Bella Vista trip guide + shared grocery list       |
| `/owen`    | `public/owen.html`    | Owen's care schedule                               |
| `/ripley`  | `public/ripley.html`  | Ripley's house & care guide (archive)              |
| `/trip`    | `public/trip.html`    | OKC → Ouray trip, June 2026 (archive)              |

## Shared grocery list

`api/kv.js` is a Vercel serverless function (GET `?key=` / POST `{key, value}`)
backed by whichever store is connected to the project: Upstash/Vercel KV
(`KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_*`) or Vercel Blob
(`BLOB_READ_WRITE_TOKEN`). Without credentials it returns 503 and the page
falls back to per-device localStorage.

## Deploy

Push to `main` — Vercel auto-deploys. `vercel.json` enables clean URLs; no
build step.
