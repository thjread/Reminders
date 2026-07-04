-- Single-row table persisting the push loop's notification watermark, so
-- deadlines that pass while the server is down still get notified on restart
CREATE TABLE push_state (
  onerow BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (onerow),
  last_notify TIMESTAMP NOT NULL
);
INSERT INTO push_state (onerow, last_notify) VALUES (TRUE, NOW() AT TIME ZONE 'utc');
