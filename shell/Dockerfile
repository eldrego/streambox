# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable corepack so pnpm is available
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Declare build-time args — Vite bakes these into the bundle at build time.
# They cannot be changed at runtime. Pass via docker-compose build.args or --build-arg.
ARG VITE_REMOTE_MUSIC_URL=http://localhost:4201/assets/remoteEntry.js
ARG VITE_REMOTE_MOVIES_URL=http://localhost:4202/assets/remoteEntry.js
ARG VITE_NEW_RELIC_ACCOUNT_ID=
ARG VITE_NEW_RELIC_TRUST_KEY=
ARG VITE_NEW_RELIC_AGENT_ID=
ARG VITE_NEW_RELIC_LICENSE_KEY=
ARG VITE_NEW_RELIC_APP_ID=

# Expose as ENV so the Node process (and Vite config) can read them during build
ENV VITE_REMOTE_MUSIC_URL=$VITE_REMOTE_MUSIC_URL
ENV VITE_REMOTE_MOVIES_URL=$VITE_REMOTE_MOVIES_URL
ENV VITE_NEW_RELIC_ACCOUNT_ID=$VITE_NEW_RELIC_ACCOUNT_ID
ENV VITE_NEW_RELIC_TRUST_KEY=$VITE_NEW_RELIC_TRUST_KEY
ENV VITE_NEW_RELIC_AGENT_ID=$VITE_NEW_RELIC_AGENT_ID
ENV VITE_NEW_RELIC_LICENSE_KEY=$VITE_NEW_RELIC_LICENSE_KEY
ENV VITE_NEW_RELIC_APP_ID=$VITE_NEW_RELIC_APP_ID

# Build the shell app (outputs to /app/dist)
RUN pnpm nx build shell --configuration=production

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA nginx config
COPY shell/nginx.conf /etc/nginx/conf.d/shell.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]
