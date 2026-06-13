# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build

ARG VITE_BASE_URL
ARG VITE_ENV_NAME=PRODUCTION
ARG VITE_ENV_EMOJI=
ARG VITE_ENV_COLOR=plum
ARG VITE_IS_DEMO=false
ARG VITE_LEMONSQUEEZY_STORE_URL=
ARG VITE_S3_BUCKET_PUBLIC_URL
ARG VITE_GOOGLE_SITE_VERIFICATION=

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV SKIP_ENV_VALIDATION=true
ENV VITE_BASE_URL=${VITE_BASE_URL}
ENV VITE_ENV_NAME=${VITE_ENV_NAME}
ENV VITE_ENV_EMOJI=${VITE_ENV_EMOJI}
ENV VITE_ENV_COLOR=${VITE_ENV_COLOR}
ENV VITE_IS_DEMO=${VITE_IS_DEMO}
ENV VITE_LEMONSQUEEZY_STORE_URL=${VITE_LEMONSQUEEZY_STORE_URL}
ENV VITE_S3_BUCKET_PUBLIC_URL=${VITE_S3_BUCKET_PUBLIC_URL}
ENV VITE_GOOGLE_SITE_VERIFICATION=${VITE_GOOGLE_SITE_VERIFICATION}

COPY . .

RUN pnpm gen:prisma && pnpm build

FROM deps AS migrator

ENV NODE_ENV=production

COPY prisma ./prisma

CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.output ./.output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/robots.txt" >/dev/null || exit 1

CMD ["node", ".output/server/index.mjs"]
