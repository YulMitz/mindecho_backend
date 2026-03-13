-- Migration: Refactor chat schema
-- - Add title to ChatSession (copied from ChatTopic)
-- - Migrate DEFAULT chatbotType rows to INITIAL
-- - Remove DEFAULT from ChatbotType enum
-- - Drop topicId FK from ChatSession
-- - Drop ChatTopic table

-- Step 1: Add title to chat_sessions, copying from chat_topics (if table still exists)
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "title" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_topics') THEN
    UPDATE "chat_sessions" cs
    SET "title" = ct."title"
    FROM "chat_topics" ct
    WHERE cs."topicId" = ct."id";
  END IF;
END $$;

-- Step 2: Migrate DEFAULT rows to INITIAL (INITIAL was added in previous migration)
UPDATE "chat_sessions" SET "chatbotType" = 'INITIAL' WHERE "chatbotType" = 'DEFAULT';
UPDATE "messages"      SET "chatbotType" = 'INITIAL' WHERE "chatbotType" = 'DEFAULT';

-- Step 3: Drop topicId FK and column, and drop chat_topics BEFORE touching the enum
-- (chat_topics.chatbotType depends on the old ChatbotType type)
ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "chat_sessions_topicId_fkey";
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "topicId";
DROP TABLE IF EXISTS "chat_topics";

-- Step 4: Drop column defaults before rebuilding enum (defaults reference old type)
ALTER TABLE "chat_sessions" ALTER COLUMN "chatbotType" DROP DEFAULT;
ALTER TABLE "messages"      ALTER COLUMN "chatbotType" DROP DEFAULT;

-- Step 5: Rebuild ChatbotType enum without DEFAULT
CREATE TYPE "ChatbotType_new" AS ENUM ('MBT', 'CBT', 'MBCT', 'INITIAL');

ALTER TABLE "chat_sessions"
    ALTER COLUMN "chatbotType" TYPE "ChatbotType_new"
    USING "chatbotType"::text::"ChatbotType_new";

ALTER TABLE "messages"
    ALTER COLUMN "chatbotType" TYPE "ChatbotType_new"
    USING "chatbotType"::text::"ChatbotType_new";

DROP TYPE "ChatbotType";
ALTER TYPE "ChatbotType_new" RENAME TO "ChatbotType";

-- Step 6: Restore column defaults using new enum type
ALTER TABLE "chat_sessions" ALTER COLUMN "chatbotType" SET DEFAULT 'INITIAL'::"ChatbotType";
ALTER TABLE "messages"      ALTER COLUMN "chatbotType" SET DEFAULT 'INITIAL'::"ChatbotType";
