# FreshHub backend (Medusa v2)
#
# Build from the REPO ROOT so npm workspaces resolve:
#   docker build -f apps/backend/Dockerfile -t freshhub-backend .
#
# Run (provide a real env file — REDIS_URL, DATABASE_URL, S3_*, strong secrets):
#   docker run --env-file apps/backend/.env -p 9000:9000 freshhub-backend
#
# Run migrations as a separate release step before starting:
#   docker run --env-file apps/backend/.env freshhub-backend npx medusa db:migrate

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps (dev deps are needed for `medusa build`). Copy only manifests
# first so this layer caches across source changes.
COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci --include-workspace-root --workspace=@dtc/backend

COPY apps/backend apps/backend
WORKDIR /app/apps/backend
RUN npm run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend

# Carry over the installed deps + the build output.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/backend /app/apps/backend

EXPOSE 9000
CMD ["npm", "run", "start"]
