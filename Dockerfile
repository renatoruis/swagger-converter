# Swagger/OpenAPI → YAML - imagem para produção
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY public ./public

EXPOSE 3000

USER node

CMD ["node", "server.js"]
