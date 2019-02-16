DROP INDEX deadline_idx;
ALTER TABLE todos
  DROP COLUMN done_time,
  DROP COLUMN create_time;
