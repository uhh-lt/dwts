#!/bin/bash

RAY_HOST=${RAY_HOST:-elasticsearch}
RAY_PORT=${RAY_PORT:-9200}
RAY="${RAY_HOST}:${RAY_PORT}/-/routes"

echo "Trying to reach Ray Serve via: ${RAY}"

while [[ "$(curl -s -o /dev/null -I -w "%{http_code}" "${RAY}")" -ne 200 ]]; do
  echo "Ray Serve not reachable at ${RAY}!"
  curl -sSI "${RAY}"
  echo "Retrying in 1s!"
  sleep 1
done

echo "Successfully conntected to ray"
curl "${RAY}" | json_pp
