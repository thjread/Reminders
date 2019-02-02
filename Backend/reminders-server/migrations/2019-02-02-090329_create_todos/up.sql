CREATE TABLE todos (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  deadline TIMESTAMP,
  done BOOLEAN NOT NULL DEFAULT 'f'
)