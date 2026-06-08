# FreshHub storefront (Next.js 15)
#
# Build from the REPO ROOT so npm workspaces resolve. The publishable key is
# validated at build time (check-env-variables.js), so pass it as a build arg:
#   docker build -f apps/storefront/Dockerfile \
#     --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx \
#     -t freshhub-storefront .
#
# Run:
#   docker run --env-file apps/storefront/.env.local -p 8000:8000 freshhub-storefront

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/storefront/package.json apps/storefront/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --include-workspace-root --workspace=@dtc/storefront

COPY apps/storefront apps/storefront
WORKDIR /app/apps/storefront

# Required for the build (next.config.js validates it). Real runtime values are
# supplied via the env file at `docker run`.
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
RUN npm run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/storefront

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/storefront /app/apps/storefront

EXPOSE 8000
CMD ["npm", "run", "start"]
