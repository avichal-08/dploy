FROM oven/bun:alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE

ARG NEXT_PUBLIC_WS_BASE
ENV NEXT_PUBLIC_WS_BASE=$NEXT_PUBLIC_WS_BASE

RUN bun run build

FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

CMD ["bun", "server.js"]
