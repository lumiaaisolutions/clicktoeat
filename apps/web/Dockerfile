# Dockerfile productivo del frontend (Next.js 14 standalone)
#
# Útil cuando se migre fuera de Hostinger (Fly.io / Railway / Cloud Run / k8s).
# Hoy NO se usa en producción (Hostinger Business Shared corre via Passenger).
#
# Build:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://clicktoeat-api.lumiaaisolutions.com/api/v1 \
#     --build-arg NEXT_PUBLIC_APP_URL=https://clicktoeat.lumiaaisolutions.com \
#     -t clicktoeat-web:prod \
#     apps/web
#
# Run:
#   docker run --rm -p 3000:3000 clicktoeat-web:prod

# ─── Stage 1: deps (cache layer de node_modules) ───────────────
FROM node:20-alpine AS deps

# libc6-compat: requerido por algunos paquetes nativos
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ─── Stage 2: builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3: runner (imagen final mínima) ────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# wget para healthcheck (Alpine lo trae por busybox)
RUN apk add --no-cache wget

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

# Copiar artefactos del build standalone
# .next/standalone contiene server.js + node_modules mínimo + package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
