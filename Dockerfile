FROM node:24-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24-bookworm-slim AS backend
WORKDIR /build/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000 COOKIE_SECURE=true STATIC_ROOT=/app/public DATABASE_PATH=/data/zhixing.sqlite
COPY --from=backend /build/backend/dist ./dist
COPY --from=backend /build/backend/node_modules ./node_modules
COPY --from=backend /build/backend/package.json ./package.json
COPY --from=frontend /build/frontend/dist ./public
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8000
CMD ["node", "dist/server.js"]
