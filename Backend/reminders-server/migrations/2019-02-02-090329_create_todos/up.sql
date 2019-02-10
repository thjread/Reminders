CREATE TABLE todos (
  id UUID PRIMARY KEY,
  userid UUID NOT NULL,
  title VARCHAR NOT NULL,
  deadline TIMESTAMP,
  done BOOLEAN NOT NULL DEFAULT 'f'
);
CREATE INDEX userid_done_idx on todos (userid, done);
