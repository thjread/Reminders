CREATE INDEX deadline_idx on todos (deadline);
ALTER TABLE todos
  ADD COLUMN done_time TIMESTAMP,
  ADD COLUMN create_time TIMESTAMP DEFAULT '2019-01-01 00:00:00' NOT NULL;
ALTER TABLE todos
  ALTER COLUMN create_time DROP DEFAULT;