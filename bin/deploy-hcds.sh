#!/bin/bash

# IMPORTANT DIFFERENCES IN HCDS
# - it is still named dwts instead of dats -> elasticsearch_service is changed
# - ray entrypoint is changed to use more cpus (ray start --head --dashboard-host '0.0.0.0' --num-cpus 32)
# - compose.yml ray service uses device_ids: ["0"]
# - docker/.env file
#   - replace dats with dwts
#   - API_WORKERS=16
#   - CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY=16

# Exit immediately if a command exits with a non-zero status
set -e

# Stop frontend and backend, so that no changes can be made during backup
cd ~/demos/dats/docker || exit
docker compose -f compose.yml -f compose.production.yml stop dats-frontend dats-backend-api

# Create backups
cd ~/demos/dats || exit
./bin/backup-postgres.sh
./bin/backup-repo.sh
./bin/backup-elasticsearch.sh
./bin/backup-weaviate.sh

# Stop all containers
cd ~/demos/dats/docker || exit
docker compose -f compose.yml -f compose.production.yml down

# Pull latest changes, but keep the changes in the stash
git stash
git pull
git stash pop

# update .env file
cd ~/demos/dats || exit
./bin/setup-envs.sh --project_name hcds --port_prefix 190
sed -i "s/dats/dwts/g" docker/.env
sed -i "s/API_WORKERS=10/API_WORKERS=16/" docker/.env
sed -i "s/CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY=10/CELERY_BACKGROUND_JOBS_WORKER_CONCURRENCY=32/" docker/.env

# pull & start docker containers
cd ~/demos/dats/docker || exit
docker compose pull
docker compose -f compose.yml -f compose.production.yml up --wait
