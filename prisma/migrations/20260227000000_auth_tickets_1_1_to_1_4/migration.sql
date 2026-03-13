-- Ticket 1-1: Make firstName, lastName, dateOfBirth optional (nullable)
ALTER TABLE "public"."users"
    ALTER COLUMN "first_name" DROP NOT NULL,
    ALTER COLUMN "last_name" DROP NOT NULL,
    ALTER COLUMN "date_of_birth" DROP NOT NULL;

-- Ticket 1-3: Add data_analysis_consent field
ALTER TABLE "public"."users"
    ADD COLUMN "data_analysis_consent" BOOLEAN NOT NULL DEFAULT false;

-- Ticket 1-4: Create refresh_tokens table
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

ALTER TABLE "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
