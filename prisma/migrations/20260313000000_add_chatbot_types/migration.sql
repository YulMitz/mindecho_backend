-- Migration: Add MBCT and INITIAL to ChatbotType enum
-- Must run before refactor migration because ALTER TYPE ADD VALUE
-- cannot be used in the same transaction as queries that reference
-- the new values (Postgres < 12) or requires a separate commit (Postgres 12+).

ALTER TYPE "ChatbotType" ADD VALUE IF NOT EXISTS 'MBCT';
ALTER TYPE "ChatbotType" ADD VALUE IF NOT EXISTS 'INITIAL';
