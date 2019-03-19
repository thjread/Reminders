aws s3 cp s3://reminders-backup/$1 $1.sql
dropdb -h localhost -U reminders db
createdb -h localhost -U reminders db
psql -h localhost -U reminders db -f $1.sql
