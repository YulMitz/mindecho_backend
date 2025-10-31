# =========================
# 1️⃣ Build Stage
# =========================
FROM node:20-slim AS builder

# Prisma 需要 OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package*.json ./
RUN npm install

# 複製專案檔案
COPY . .

# 生成 Prisma Client（會在 /src/generate 生成 prisma 對應程式碼）
RUN npx prisma generate

# =========================
# 2️⃣ Runtime Stage
# =========================
FROM node:20-slim

# 安裝 Prisma binary 需要的 OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 僅複製必要的執行檔案與相依（保持 image 小）
COPY --from=builder /app/package*.json ./

RUN npm install --omit=dev

# 複製應用程式程式碼與設定
COPY --from=builder /app/src /app/src
COPY --from=builder /app/.env /app/.env

EXPOSE 8443

CMD ["node", "src/server.js"]
