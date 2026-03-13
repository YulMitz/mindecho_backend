/*
  Warnings:

  - You are about to drop the column `emergency_contact_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_phone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `family_contact_info` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `family_contact_name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `support_contact_info` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `support_contact_name` on the `users` table. All the data in the column will be lost.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('GEMINI', 'ANTHROPIC');

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "provider" "LLMProvider" NOT NULL DEFAULT 'GEMINI';

-- AlterTable
ALTER TABLE "diary_entries" ADD COLUMN     "edit_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "provider" "LLMProvider";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emergency_contact_name",
DROP COLUMN "emergency_contact_phone",
DROP COLUMN "family_contact_info",
DROP COLUMN "family_contact_name",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "support_contact_info",
DROP COLUMN "support_contact_name",
ADD COLUMN     "data_analysis_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_diary_analysis_at" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "diary_analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "risk_level" TEXT NOT NULL,
    "entries_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diary_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diary_analyses_user_id_created_at_idx" ON "diary_analyses"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "diary_analyses" ADD CONSTRAINT "diary_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
