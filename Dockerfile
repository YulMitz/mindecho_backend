# =========================
# 1️⃣ Base Stage
# =========================
FROM node:20-slim AS base

# 安裝 Prisma 所需的 OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 安裝 pm2（全域），方便 dev / prod 使用
RUN npm install -g pm2

# 複製 package.json 並安裝依賴（利用 cache）
COPY package*.json ./
RUN npm install

# 複製 Prisma schema 並生成 Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# 複製程式碼與設定
COPY src ./src
COPY .env .env

# 預設工作埠（dev 用）
EXPOSE 8442


# =========================
# 2️⃣ Dev Stage
# =========================
FROM base AS dev

# 開發模式：以 pm2-runtime 作為前景行程，讓容器保持存活並將 log 導出到 stdout/stderr
CMD ["npm", "run", "dev"]


# =========================
# 3️⃣ Prod Stage
# =========================
FROM node:20-slim AS prod

# 重新安裝必要的 runtime 套件，確保最小化 image
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 安裝 pm2（全域）
RUN npm install -g pm2

# 複製 package.json 並安裝正式依賴（不含 devDependencies）
COPY package*.json ./
RUN npm ci --omit=dev

# 從 base 拷貝 Prisma Client 與程式碼
COPY --from=base /app/prisma /app/prisma
COPY --from=base /app/prisma-client /app/prisma-client
COPY --from=base /app/src /app/src
COPY --from=base /app/.env /app/.env

# 正式埠號
EXPOSE 8443

ENV NODE_ENV=production
# 正式模式：同樣用 pm2-runtime，避免 pm2 以 daemon 方式啟動而讓容器退出
CMD ["pm2-runtime", "./src/ecosystem.config.cjs", "--only", "mind-echo-prod"]
