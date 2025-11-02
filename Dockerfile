# =========================
# 1️⃣ Build Stage
# =========================
FROM node:20-slim AS builder

# Prisma 需要 OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 先複製 package.json 並安裝依賴（利用 cache）
COPY package*.json ./
RUN npm install

# 只複製 Prisma schema，用來生成 Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# =========================
# 2️⃣ Runtime Stage
# =========================
FROM node:20-slim

# 安裝 Prisma binary 所需 OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 複製必要的檔案
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

# 複製 Prisma Client（output 位於 /app/prisma-client）
COPY --from=builder /app/prisma-client /app/prisma-client

# 複製程式碼與設定
COPY src ./src
COPY .env .env

EXPOSE 8442

CMD ["node", "src/server.js"]
