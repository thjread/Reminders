aws s3 cp s3://reminders-backup/$1 $1.sql
dropdb -h localhost -U postgres db
createdb -h localhost -U postgres db
psql -h localhost -U postgres db -f $1.sql
