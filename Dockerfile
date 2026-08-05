FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencias ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build (genera el cliente de Prisma) ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# --- Imagen final ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
