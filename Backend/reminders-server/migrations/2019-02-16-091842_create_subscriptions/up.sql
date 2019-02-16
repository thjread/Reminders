CREATE TABLE subscriptions (
  endpoint VARCHAR PRIMARY KEY,
  p256dh VARCHAR NOT NULL,
  auth VARCHAR NOT NULL,
  userid UUID REFERENCES users (userid) ON DELETE CASCADE NOT NULL
);
CREATE INDEX userid_idx on subscriptions (userid);
