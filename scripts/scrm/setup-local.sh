#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

command -v docker >/dev/null 2>&1 || {
  echo "Docker is required."
  exit 1
}

command -v node >/dev/null 2>&1 || {
  echo "Node.js 24 is required."
  exit 1
}

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" != "24" ]]; then
  echo "Node.js 24 is required; found $(node --version)."
  exit 1
fi

yarn_cli=(node .yarn/releases/yarn-4.13.0.cjs)
"${yarn_cli[@]}" install --immutable

if [[ ! -f packages/twenty-server/.env ]]; then
  "${yarn_cli[@]}" nx run twenty-server:reset:env
fi

docker compose -f packages/twenty-docker/docker-compose.dev.yml up -d --wait
"${yarn_cli[@]}" nx run twenty-server:database:init

echo "Local SCRM dependencies and database are ready."
echo "Run: node .yarn/releases/yarn-4.13.0.cjs scrm:dev"
