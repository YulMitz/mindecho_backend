-- CreateEnum
CREATE TYPE "public"."MoodType" AS ENUM ('HAPPY', 'SAD', 'NEUTRAL', 'EXCITED', 'ANXIOUS', 'CALM');

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "digestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."diaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diary_entries" (
    "id" TEXT NOT NULL,
    "diaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "title" VARCHAR(200),
    "mood" "public"."MoodType" NOT NULL DEFAULT 'NEUTRAL',
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mental_health_metrics" (
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

-- CreateIndex
CREATE INDEX "diaries_userId_idx" ON "public"."diaries"("userId");

-- CreateIndex
CREATE INDEX "diary_entries_userId_created_at_idx" ON "public"."diary_entries"("userId", "created_at" DESC);

-- CreateIndex
CREATE INDEX "diary_entries_tags_idx" ON "public"."diary_entries"("tags");

-- CreateIndex
CREATE INDEX "mental_health_metrics_userId_entry_date_idx" ON "public"."mental_health_metrics"("userId", "entry_date" DESC);

-- AddForeignKey
ALTER TABLE "public"."diary_entries" ADD CONSTRAINT "diary_entries_diaryId_fkey" FOREIGN KEY ("diaryId") REFERENCES "public"."diaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
