#!/bin/bash

# Ensure that the script is run from the root directory of the project
if [ ! -d ".git" ]; then
    echo "This script must be run from the root directory of the project."
    exit 1
fi

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project_name) PROJECT_NAME="$2"; shift ;;
        --port_prefix) PORT_PREFIX="$2"; shift ;;
        --help)
            echo "Usage: $0 --project_name <name> --port_prefix <prefix>"
            echo "  --project_name  The name of the project."
            echo "  --port_prefix   The port prefix to use."
            echo "  --help          Display this help message."
            exit 0
            ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Ensure that the --project_name and --port_prefix parameters are provided
if [ -z "$PROJECT_NAME" ] || [ -z "$PORT_PREFIX" ]; then
    echo "--project_name and --port_prefix parameters are required."
    exit 1
fi

JWT_SECRET=$(pwgen 32 1)
REPO_ROOT="$(pwd)/docker/backend_repo"

cp docker/.env.example docker/.env
cp backend/.env.example backend/.env
cp frontend/.env.development.example frontend/.env.development
cp frontend/.env.production.example frontend/.env.production

# setup docker .env file
sed -i "s/COMPOSE_PROJECT_NAME=demo/COMPOSE_PROJECT_NAME=${PROJECT_NAME}/" docker/.env
sed -i "s/131/${PORT_PREFIX}/g" docker/.env
sed -i "s/JWT_SECRET=/JWT_SECRET=${JWT_SECRET}/" docker/.env
sed -i "s/UID=121/UID=$(id -u)/" docker/.env
sed -i "s/GID=126/GID=$(id -g)/" docker/.env

# setup backend .env file
sed -i "s/131/${PORT_PREFIX}/g" backend/.env
sed -i "s/JWT_SECRET=/JWT_SECRET=${JWT_SECRET}/" backend/.env
sed -i "s|REPO_ROOT=/insert_path_to_dats_repo/docker/backend_repo|REPO_ROOT=${REPO_ROOT}|" backend/.env

# setup frontend .env file
sed -i "s/131/${PORT_PREFIX}/g" frontend/.env.development
