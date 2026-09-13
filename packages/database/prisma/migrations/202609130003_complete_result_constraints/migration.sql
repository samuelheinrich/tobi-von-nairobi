-- PostgreSQL CHECK accepts UNKNOWN; explicitly exclude null completed-result fields.
ALTER TABLE game_runs DROP CONSTRAINT game_runs_valid_result;
ALTER TABLE game_runs ADD CONSTRAINT game_runs_valid_result CHECK (
  (status = 'completed' AND score IS NOT NULL AND score >= 0 AND elapsed_ms IS NOT NULL AND elapsed_ms > 0 AND result_digest IS NOT NULL AND finished_at IS NOT NULL)
  OR (status != 'completed' AND score IS NULL AND elapsed_ms IS NULL AND result_digest IS NULL)
);
