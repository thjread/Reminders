#!/bin/sh
psql --host localhost db reminders -a -f seed.sql
