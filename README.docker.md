# Docker Local Dev — Streambox

This doc explains how to run the full Streambox stack locally using Docker Desktop.

## Prerequisites

- Docker Desktop running
- All three repos cloned locally:
  - `streambox` (this repo — shell host)
  - `music` (remote micro-frontend)
  - `movies` (remote micro-frontend)
- Each remote repo has a `Dockerfile` following the same multi-stage pattern as `shell/Dockerfile`

---

## Step 1 — Build remote images

From the **music** repo:
```bash
docker build -t streambox/music:latest .
```

From the **movies** repo:
```bash
docker build -t streambox/movies:latest .
```

---

## Step 2 — Start the full stack

From the root of **this repo**:
```bash
docker compose up --build
```

- `--build` rebuilds the shell image on every run. Omit it to reuse the cached image.

---

## Step 3 — Verify

| Service | URL |
|---------|-----|
| Shell   | http://localhost:4200 |
| Music   | http://localhost:4201 |
| Movies  | http://localhost:4202 |

Open http://localhost:4200 — the shell should load and dynamically fetch the music and movies remotes.

---

## Useful commands

```bash
# Start in detached mode
docker compose up -d

# View logs
docker compose logs -f

# View logs for one service
docker compose logs -f shell

# Stop everything
docker compose down

# Rebuild a single service
docker compose build shell
docker compose up -d shell

# Check running containers
docker compose ps
```

---

## Notes

- Vite bakes remote URLs into the bundle **at build time**. If you change `VITE_REMOTE_MUSIC_URL` or `VITE_REMOTE_MOVIES_URL`, you must rebuild the shell image.
- Inside the Docker network, services communicate by container name (`music`, `movies`, `shell`) not `localhost`.
- `localhost` URLs are only valid for local dev outside Docker (`pnpm serve`).
