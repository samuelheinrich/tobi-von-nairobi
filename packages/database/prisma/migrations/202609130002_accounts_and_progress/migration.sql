-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "save_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "level_id" TEXT NOT NULL,
    "content_version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "result_digest" VARCHAR(64),
    "score" INTEGER,
    "elapsed_ms" INTEGER,

    CONSTRAINT "game_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_progress" (
    "save_id" UUID NOT NULL,
    "level_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "best_score" INTEGER NOT NULL,
    "best_time_ms" INTEGER NOT NULL,
    "completions" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "level_progress_pkey" PRIMARY KEY ("save_id","level_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "game_runs_user_id_started_at_idx" ON "game_runs"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "game_runs_user_id_request_id_key" ON "game_runs"("user_id", "request_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_runs" ADD CONSTRAINT "game_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_runs" ADD CONSTRAINT "game_runs_save_id_fkey" FOREIGN KEY ("save_id") REFERENCES "save_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_progress" ADD CONSTRAINT "level_progress_save_id_fkey" FOREIGN KEY ("save_id") REFERENCES "save_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One active attempt per slot; repeated completions remain an immutable receipt.
CREATE UNIQUE INDEX game_runs_one_active_per_save ON game_runs (save_id) WHERE status = 'active';
ALTER TABLE game_runs ADD CONSTRAINT game_runs_valid_status CHECK (status IN ('active', 'completed', 'abandoned'));
ALTER TABLE game_runs ADD CONSTRAINT game_runs_valid_result CHECK (
  (status = 'completed' AND score >= 0 AND elapsed_ms > 0 AND result_digest IS NOT NULL AND finished_at IS NOT NULL)
  OR (status != 'completed' AND score IS NULL AND elapsed_ms IS NULL AND result_digest IS NULL)
);
ALTER TABLE level_progress ADD CONSTRAINT level_progress_nonnegative CHECK (best_score >= 0 AND best_time_ms > 0 AND completions > 0);
ALTER TABLE sessions ADD CONSTRAINT sessions_valid_expiry CHECK (expires_at > created_at);
