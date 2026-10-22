# Music Repo — Docker & Monitoring Setup

## Architecture overview

This repo is a **Module Federation remote**. It exposes `MusicApp` via `remoteEntry.js`, which the shell (host) fetches at runtime from the browser.

```
Browser
  └── shell (host) :4200          ← orchestrates the page
        └── music (remote) :4201  ← loaded dynamically via remoteEntry.js
```

The goal is to run both the shell and music as Docker containers so that real browser traffic flows through both apps and is captured by **New Relic Browser** — giving visibility into page load, JS errors, and user interactions across the full micro-frontend stack.

**Image name expected by shell**: `streambox/music:latest`
**Port**: `4201`

### How the shell finds this remote

The shell's `vite.config.mts` was updated to read the music URL from `VITE_REMOTE_MUSIC_URL`. For Docker Desktop, the shell was built with:

```
VITE_REMOTE_MUSIC_URL=http://localhost:4201
```

This URL is **baked into the shell's JS bundle at build time**. The music container must be running and port `4201` must be mapped to the host — otherwise the browser cannot fetch `remoteEntry.js` and Module Federation silently fails.

### `VITE_*` vars are build-time, not runtime

Vite only exposes variables prefixed with `VITE_` to browser code, and they are inlined into the JS bundle during `vite build`. This means:
- All `VITE_*` vars (music API credentials, New Relic credentials) must be passed as Docker `ARG` → `ENV` so Vite can read them during the build stage.
- Setting them as Docker `environment:` runtime vars has **no effect** — the bundle has already been compiled.

### Docker health check dependency

The shell's `docker-compose.yml` starts the shell service with `depends_on: condition: service_healthy` on music. This means the music container's `/health` endpoint must return `200` before the shell container is considered ready. The `nginx.conf` in this repo must include the `/health` location block — it is not optional.

---

## Status

Verified against the current music repo (`streambox-music`):

| File | Status |
|------|--------|
| `nginx.conf` | ❌ Missing — must be created |
| `Dockerfile` | ❌ Stale copy from movies app — wrong project name (`movies`), wrong port (`80`), wrong vars (TMDB). Must be rewritten. |
| `.dockerignore` | ❌ Missing — must be created |
| `.env.example` | ❌ Missing — must be created |
| `.github/workflows/ci.yml` | ❌ Uses `npm ci` + `npx nx` — must be replaced with pnpm workflow |
| New Relic Browser agent | ❌ Missing — `@newrelic/browser-agent` not installed, no import in `main.tsx` |

**Music API**: The app uses the iTunes Search API via a single env var: `VITE_APP_BASE_URL=https://itunes.apple.com`. There is no API key — the iTunes API is public. Use this real var name everywhere; do not use the `VITE_MUSIC_API_KEY` / `VITE_MUSIC_API_BASE_URL` placeholders.

---

## 1. Create `nginx.conf`

Create this file at the **root** of the music repo.

Key points:
- Listens on port `4201`
- **CORS headers are required** — the shell fetches `remoteEntry.js` cross-origin from the browser. Without these headers the browser blocks the Module Federation handshake.
- `/health` endpoint for Docker health checks

```nginx
server {
    listen 4201;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Health check — used by Docker health checks and load balancers
    location = /health {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    # SPA fallback — CORS headers required here too (shell fetches / cross-origin)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
    }

    # Never cache index.html so the shell always gets the latest entry point
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
    }

    # Cache static assets aggressively.
    # CORS headers are REQUIRED on this block — remoteEntry.js is served from here.
    # nginx does not inherit add_header from the server block when a location block
    # defines its own add_header, so headers must be repeated explicitly.
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
    }
}
```

---

## 2. Create or update `Dockerfile`

Create this file at the **root** of the music repo (or update the existing one).

If a Dockerfile already exists, the required changes are:
- Wire in the custom `nginx.conf` (default nginx serves on port 80, not 4201)
- Change `EXPOSE` to `4201`
- Add any music API credentials as `ARG`/`ENV`
- Add New Relic build args

> **Check the music repo** for what `VITE_*` API credentials it uses (e.g. Spotify, Last.fm, or a custom music API) and add them to the `ARG`/`ENV` block alongside the New Relic vars. Replace `VITE_MUSIC_API_*` placeholders below with the real var names from the repo's existing `.env` or source code.

```dockerfile
# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable

WORKDIR /app

# iTunes Search API base URL — the only music API var this app uses.
# No key required; the iTunes API is public.
ARG VITE_APP_BASE_URL
ENV VITE_APP_BASE_URL=$VITE_APP_BASE_URL

# New Relic Browser Monitoring — baked into the JS bundle at build time
ARG VITE_NEW_RELIC_ACCOUNT_ID
ARG VITE_NEW_RELIC_TRUST_KEY
ARG VITE_NEW_RELIC_AGENT_ID
ARG VITE_NEW_RELIC_LICENSE_KEY
ARG VITE_NEW_RELIC_APP_ID

ENV VITE_NEW_RELIC_ACCOUNT_ID=$VITE_NEW_RELIC_ACCOUNT_ID
ENV VITE_NEW_RELIC_TRUST_KEY=$VITE_NEW_RELIC_TRUST_KEY
ENV VITE_NEW_RELIC_AGENT_ID=$VITE_NEW_RELIC_AGENT_ID
ENV VITE_NEW_RELIC_LICENSE_KEY=$VITE_NEW_RELIC_LICENSE_KEY
ENV VITE_NEW_RELIC_APP_ID=$VITE_NEW_RELIC_APP_ID

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

COPY . .

# vite.config.mts outputs to ../dist relative to music/ = /app/dist at repo root
RUN pnpm nx build music

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/music.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 4201

CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Create `.dockerignore`

Create this file at the **root** of the music repo.

```
node_modules
.nx
dist
tmp
out-tsc
.git
.gitignore
.env
.env.local
coverage
.vscode
.idea
.DS_Store
Thumbs.db
*.md
```

---

## 4. Create `.env.example`

The real credentials live in `.env` (gitignored). Create `.env.example` as a reference for all required vars:

```
# iTunes Search API — public, no key required
VITE_APP_BASE_URL=https://itunes.apple.com

# New Relic Browser Monitoring — required for Docker monitoring goal
# Values from New Relic UI: Browser > (your app) > Application settings
VITE_NEW_RELIC_ACCOUNT_ID=
VITE_NEW_RELIC_TRUST_KEY=
VITE_NEW_RELIC_AGENT_ID=
VITE_NEW_RELIC_LICENSE_KEY=
VITE_NEW_RELIC_APP_ID=
```

---

## 5. Add New Relic Browser agent

This is **required** — it's the whole point of running the stack in Docker. Without it, New Relic receives no data from the music remote.

```bash
pnpm add @newrelic/browser-agent
```

Copy `shell/src/newrelic.ts` and `shell/src/newrelic.d.ts` from the shell repo into `music/src/` (alongside `main.tsx`) and import `newrelic.ts` as the **first import** in `music/src/main.tsx`:

```ts
import './newrelic'  // must be first — before React, before anything else
import React from 'react'
// ...rest of imports
```

### New Relic App ID — use a separate Browser app

Create a **separate** Browser application in New Relic UI for music (New Relic UI → Add Data → Browser → Name it `streambox-music`). Do not reuse the shell's App ID.

**Why**: With a separate App ID, page views, JS errors, and Core Web Vitals are attributed per micro-frontend. You can see at a glance whether a problem originates in the shell or in the music remote. With a shared App ID, all events are mixed together.

The same 5 `VITE_NEW_RELIC_*` var names are used — just with the values from the music Browser app.

---

## 6. Update CI workflow

If the existing `.github/workflows/ci.yml` was scaffolded by NX it will use `npm ci` + `npx nx`. Replace it with a pnpm-based workflow that also validates the Docker build with all required build args.

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  actions: read
  contents: read

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm nx run-many -t lint test build

  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build music Docker image
        run: |
          docker build \
            --build-arg VITE_APP_BASE_URL=${{ secrets.VITE_APP_BASE_URL }} \
            --build-arg VITE_NEW_RELIC_ACCOUNT_ID=${{ secrets.VITE_NEW_RELIC_ACCOUNT_ID }} \
            --build-arg VITE_NEW_RELIC_TRUST_KEY=${{ secrets.VITE_NEW_RELIC_TRUST_KEY }} \
            --build-arg VITE_NEW_RELIC_AGENT_ID=${{ secrets.VITE_NEW_RELIC_AGENT_ID }} \
            --build-arg VITE_NEW_RELIC_LICENSE_KEY=${{ secrets.VITE_NEW_RELIC_LICENSE_KEY }} \
            --build-arg VITE_NEW_RELIC_APP_ID=${{ secrets.VITE_NEW_RELIC_APP_ID }} \
            --tag streambox/music:ci \
            .
```

Add `VITE_APP_BASE_URL` + 5 New Relic vars as GitHub Actions secrets (Settings > Secrets > Actions).

---

## 7. Build the image locally

Once all files are in place, from the **music repo root**:

```bash
docker build \
  --build-arg VITE_APP_BASE_URL=https://itunes.apple.com \
  --build-arg VITE_NEW_RELIC_ACCOUNT_ID=... \
  --build-arg VITE_NEW_RELIC_TRUST_KEY=... \
  --build-arg VITE_NEW_RELIC_AGENT_ID=... \
  --build-arg VITE_NEW_RELIC_LICENSE_KEY=... \
  --build-arg VITE_NEW_RELIC_APP_ID=... \
  -t streambox/music:latest .
```

Then return to the **shell repo** and bring up the full stack:

```bash
docker compose up --build
```

Open the shell at `http://localhost:4200`. The shell will load `remoteEntry.js` from the music container at `http://localhost:4201`. Both apps report to New Relic under their respective Browser app IDs.

---

## Checklist

- [ ] `nginx.conf` created at repo root (port 4201, CORS headers, `/health` endpoint)
- [ ] `Dockerfile` created or updated (nginx.conf wired in, `EXPOSE 4201`, music API args, New Relic build args)
- [ ] `.dockerignore` created at repo root
- [ ] `.env.example` created (music API + New Relic vars)
- [ ] New Relic Browser app created for music (separate from shell — named `streambox-music`)
- [ ] New Relic Browser agent installed and imported first in `music/src/main.tsx`
- [ ] `.github/workflows/ci.yml` updated to pnpm workflow + docker-build job
- [ ] GitHub Actions secrets added (music API vars + 5 New Relic vars)
- [ ] `docker build -t streambox/music:latest .` runs cleanly
- [ ] Full stack verified via `docker compose up` in shell repo
- [ ] Browser network tab shows no CORS errors — `remoteEntry.js` loads from `localhost:4201`
- [ ] New Relic Browser dashboard for `streambox-music` shows page views and JS errors

---

## Notes

- **pnpm is the package manager** — always use `pnpm`, never `npm`
- **`VITE_*` vars are baked at build time** — pass them as Docker `ARG`/`ENV`, never as runtime `environment:` vars
- **CORS headers on nginx are not optional** — the shell's JS (running in the browser) fetches `remoteEntry.js` cross-origin from port 4201. Without `Access-Control-Allow-Origin *` the browser blocks it and the remote silently fails to load
- **`/health` endpoint is not optional** — the shell's `docker-compose.yml` uses `condition: service_healthy`; music must pass health checks before shell starts
- **Module Federation URLs are browser-resolved** — the shell was built with `VITE_REMOTE_MUSIC_URL=http://localhost:4201`. Docker internal hostnames are irrelevant; the browser uses host-mapped ports
- **New Relic agent must be first import** — any JS executing before the agent initialises will not be instrumented
- **Music API var** — only `VITE_APP_BASE_URL` is used. The iTunes Search API is public; no key required.
