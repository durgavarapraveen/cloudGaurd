# Build stage
FROM node:20-alpine AS builder

WORKDIR /apps

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build


# Production stage
FROM node:20-alpine

WORKDIR /apps

ENV NODE_ENV=production

COPY --from=builder /apps/.next ./.next
COPY --from=builder /apps/public ./public
COPY --from=builder /apps/package.json ./package.json
COPY --from=builder /apps/node_modules ./node_modules
COPY --from=builder /apps/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm","start"]