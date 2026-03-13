/*
  Warnings:

  - The values [SAD,NEUTRAL,EXCITED,ANXIOUS,CALM] on the enum `MoodType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `tags` on the `diary_entries` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `diary_entries` table. All the data in the column will be lost.
  - Added the required column `entry_date` to the `diary_entries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MoodType_new" AS ENUM ('VERY_BAD', 'BAD', 'OKAY', 'GOOD', 'HAPPY');
ALTER TABLE "public"."diary_entries" ALTER COLUMN "mood" DROP DEFAULT;
ALTER TABLE "public"."diary_entries" ALTER COLUMN "mood" TYPE "public"."MoodType_new" USING ("mood"::text::"public"."MoodType_new");
ALTER TYPE "public"."MoodType" RENAME TO "MoodType_old";
ALTER TYPE "public"."MoodType_new" RENAME TO "MoodType";
DROP TYPE "public"."MoodType_old";
ALTER TABLE "public"."diary_entries" ALTER COLUMN "mood" SET DEFAULT 'OKAY';
COMMIT;

-- DropIndex
DROP INDEX "public"."diary_entries_tags_idx";

-- DropIndex
DROP INDEX "public"."diary_entries_userId_created_at_idx";

-- AlterTable
ALTER TABLE "public"."diary_entries" DROP COLUMN "tags",
DROP COLUMN "title",
ADD COLUMN     "entry_date" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "mood" SET DEFAULT 'OKAY';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "education_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "family_contact_info" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "family_contact_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "gender" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "support_contact_info" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "support_contact_name" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "public"."reasons" (
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
CREATE TABLE "public"."daily_questions" (
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
CREATE TABLE "public"."scales" (
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
CREATE TABLE "public"."scale_questions" (
    "id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_reverse" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scale_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scale_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scale_id" TEXT NOT NULL,
    "total_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scale_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scale_answers" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "scale_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reasons_user_id_date_idx" ON "public"."reasons"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_questions_userId_entry_date_key" ON "public"."daily_questions"("userId", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "scales_code_key" ON "public"."scales"("code");

-- CreateIndex
CREATE UNIQUE INDEX "scale_questions_scale_id_order_key" ON "public"."scale_questions"("scale_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "scale_answers_session_id_question_id_key" ON "public"."scale_answers"("session_id", "question_id");

-- CreateIndex
CREATE INDEX "diary_entries_userId_entry_date_idx" ON "public"."diary_entries"("userId", "entry_date" DESC);

-- AddForeignKey
ALTER TABLE "public"."reasons" ADD CONSTRAINT "reasons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_questions" ADD CONSTRAINT "daily_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scale_questions" ADD CONSTRAINT "scale_questions_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "public"."scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scale_sessions" ADD CONSTRAINT "scale_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scale_sessions" ADD CONSTRAINT "scale_sessions_scale_id_fkey" FOREIGN KEY ("scale_id") REFERENCES "public"."scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scale_answers" ADD CONSTRAINT "scale_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."scale_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scale_answers" ADD CONSTRAINT "scale_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."scale_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
