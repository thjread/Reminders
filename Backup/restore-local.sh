#!/bin/sh
if [ -z "$1" ]; then
  echo "Please specify a backup to restore (e.g. ./restore-local.sh hourly)"
  exit
fi
aws s3 cp s3://reminders-backup/$1 $1.sql && dropdb -h localhost -U postgres db && createdb -h localhost -U postgres db && psql -h localhost -U postgres db -f $1.sql
