# Meal Maker API — small production image.
# Build:  docker build -t meal-maker-api ./backend
# Run:    docker run -p 3001:3001 -v meal_cache:/data meal-maker-api
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install deps first so this layer is cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Only the runtime files — no cache dir, no lockfile churn.
COPY server.js optimizer.js scraper.js recipes.json ingredients.json ./

# Writable cache volume, owned by the unprivileged node user.
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]

ENV PORT=3001 \
    HOST=0.0.0.0 \
    CACHE_DIR=/data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
