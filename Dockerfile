# syntax=docker/dockerfile:1
FROM node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.24.0

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
# Build credentials are disposable placeholders, never production secrets.
# Authenticated pages are dynamic; the build must not contact a database.
RUN PAYLOAD_SECRET=build-only-placeholder-never-use-in-production \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    APP_URL=http://localhost:3000 pnpm build

FROM node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install --yes --no-install-recommends perl-base=5.36.0-7+deb12u4 \
    && rm -rf /var/lib/apt/lists/* /usr/local/lib/node_modules/npm /opt/yarn* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
RUN groupadd --gid 1001 orpheus && useradd --uid 1001 --gid orpheus --no-create-home orpheus
COPY --from=build --chown=orpheus:orpheus /app/.next/standalone ./
COPY --from=build --chown=orpheus:orpheus /app/.next/static ./.next/static
USER orpheus
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
