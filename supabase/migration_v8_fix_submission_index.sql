-- RecycleConnect V2 — fix the submission idempotency index.
-- Run in Supabase SQL Editor (new project). Safe to run multiple times.
--
-- THE BUG: uq_recycle_logs_client_sub was UNIQUE(client_submission_id)
-- ALONE, but the app inserts ONE ROW PER MATERIAL LINE sharing a single
-- submission id. Every multi-material submit therefore 409'd on its 2nd
-- line: single-material submits worked, multi-material ones orphaned
-- (log row without ledger/profile credit) and replayed stale numbers.
-- THE FIX: uniqueness is per (submission, material) — retries with the same
-- payload still conflict correctly, while multi-line submits proceed.
-- NULL submission ids (pre-key history) stay mutually distinct in Postgres.

DROP INDEX IF EXISTS uq_recycle_logs_client_sub;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recycle_logs_client_sub_material
  ON recycle_logs (client_submission_id, material);
