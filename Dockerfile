# Stage 1: Build
FROM node:24.12.0-slim AS builder

# Install prisma Dependencies (needed for slim image)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client (essential before building Nest)
RUN npx prisma generate

RUN npm run build

# Stage 2: Production Image
FROM node:24.12.0-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3001

# Script para rodar migrations e depois iniciar a app
CMD ["sh", "-c", "export DATABASE_URL=$DATABASE_URL && npx prisma migrate deploy && npx prisma db seed && node dist/src/main"]