#!/bin/sh
set -eu

cd /app/packages/twenty-server

echo 'Preparing the database and applying instance commands...'
yarn database:init:prod

echo 'Applying version upgrades...'
yarn command:prod cache:flush
yarn command:prod upgrade
yarn command:prod cache:flush

echo 'Registering scheduled jobs...'
yarn command:prod cron:register:all

echo 'Migration completed successfully.'
