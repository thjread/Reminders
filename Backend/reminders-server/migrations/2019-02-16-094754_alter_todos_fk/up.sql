ALTER TABLE todos
  ADD CONSTRAINT todos_userid_fkey
  FOREIGN KEY (userid) REFERENCES users (userid)
  ON DELETE CASCADE;
