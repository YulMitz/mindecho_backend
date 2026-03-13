-- CreateEnum
CREATE TYPE "MoodType" AS ENUM ('VERY_BAD', 'BAD', 'OKAY', 'GOOD', 'HAPPY');

-- CreateEnum
CREATE TYPE "ChatbotType" AS ENUM ('DEFAULT', 'CBT', 'MBT');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('USER', 'MODEL');

-- CreateTable
CREATE TABLE "diaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diary_entries" (
    "id" TEXT NOT NULL,
    "diaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mood" "MoodType" NOT NULL DEFAULT 'OKAY',
    "entry_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatbotType" "ChatbotType" NOT NULL DEFAULT 'DEFAULT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatbotType" "ChatbotType" NOT NULL DEFAULT 'DEFAULT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "chatbotType" "ChatbotType" NOT NULL DEFAULT 'DEFAULT',
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digestedAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mental_health_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "physical" JSONB NOT NULL,
    "mood" JSONB NOT NULL,
    "sleep" JSONB NOT NULL,
    "energy" JSONB NOT NULL,
    "appetite" JSONB NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mental_health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reasons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nickname" TEXT,
    "avatar" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'unknown',
    "education_level" INTEGER NOT NULL DEFAULT 0,
    "support_contact_name" TEXT NOT NULL DEFAULT '',
    "support_contact_info" TEXT NOT NULL DEFAULT '',
    "family_contact_name" TEXT NOT NULL DEFAULT '',
    "family_contact_info" TEXT NOT NULL DEFAULT '',
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notification_daily" BOOLEAN NOT NULL DEFAULT false,
    "notification_weekly" BOOLEAN NOT NULL DEFAULT false,
    "privacy_data_sharing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_questions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "physical" INTEGER NOT NULL,
    "mental" INTEGER NOT NULL,
    "emotion" INTEGER NOT NULL,
    "sleep" INTEGER NOT NULL,
    "diet" INTEGER NOT NULL,

    CONSTRAINT "daily_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scales" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_questions" (
    "id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_reverse" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scale_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "total_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scale_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_answers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "scale_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diaries_userId_idx" ON "diaries"("userId");

-- CreateIndex
CREATE INDEX "diary_entries_userId_entry_date_idx" ON "diary_entries"("userId", "entry_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_sessionId_key" ON "chat_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "mental_health_metrics_userId_entry_date_idx" ON "mental_health_metrics"("userId", "entry_date" DESC);

-- CreateIndex
CREATE INDEX "reasons_user_id_date_idx" ON "reasons"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_questions_userId_entry_date_key" ON "daily_questions"("userId", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "scales_code_key" ON "scales"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scale_questions_scale_id_order_key" ON "scale_questions"("scale_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "scale_answers_session_id_question_id_key" ON "scale_answers"("session_id", "question_id");

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "chat_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reasons" ADD CONSTRAINT "reasons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_questions" ADD CONSTRAINT "daily_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_questions" ADD CONSTRAINT "scale_questions_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_sessions" ADD CONSTRAINT "scale_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_sessions" ADD CONSTRAINT "scale_sessions_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_answers" ADD CONSTRAINT "scale_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "scale_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_answers" ADD CONSTRAINT "scale_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "scale_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
