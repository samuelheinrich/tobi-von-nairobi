-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(40) NOT NULL,
    "username_normalized" VARCHAR(40) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "save_games" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 1,
    "current_world" TEXT NOT NULL DEFAULT 'bali',
    "current_level" TEXT NOT NULL DEFAULT 'welcome_to_bali',
    "checkpoint" JSONB,
    "snapshot_schema_version" INTEGER NOT NULL DEFAULT 1,
    "money" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "save_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "values" JSONB NOT NULL DEFAULT '{}',
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_normalized_key" ON "users"("username_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "save_games_user_id_slot_key" ON "save_games"("user_id", "slot");

-- AddForeignKey
ALTER TABLE "save_games" ADD CONSTRAINT "save_games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain invariants are enforced in PostgreSQL, including writes outside Prisma.
ALTER TABLE "save_games" ADD CONSTRAINT "save_games_nonnegative_balances" CHECK ("money" >= 0 AND "score" >= 0 AND "revision" >= 0);
ALTER TABLE "save_games" ADD CONSTRAINT "save_games_valid_slot" CHECK ("slot" BETWEEN 1 AND 3);
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_valid_revision" CHECK ("revision" >= 0 AND "schema_version" >= 1);
