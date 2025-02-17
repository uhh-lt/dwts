#!/bin/bash

ENV_NAME=dats
source backend/_activate_current_env.sh

# Execute pyright with the provided arguments
pyright "$@"
