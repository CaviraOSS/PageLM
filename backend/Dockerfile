# base
FROM node:22.16.0-alpine AS base

WORKDIR /app

# builder
FROM base AS builder

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY backend/ ./backend/

RUN npm run build

# runtime
FROM base AS runtime

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000

CMD ["npm", "start"]
