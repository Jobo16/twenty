#!/usr/bin/env bash
#
# First-time setup for local SCRM development: install dependencies, prepare the
# server .env, start the infrastructure containers and initialize the database.
#
# Run it through the repository entry point so that no global Yarn is needed:
#   ./scripts/scrm/yarn scrm:setup

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

yarn_cli="$repo_root/scripts/scrm/yarn"
compose_cli="$repo_root/scripts/scrm/compose"

command -v docker >/dev/null 2>&1 || {
  echo "Docker is required." >&2
  exit 1
}

command -v node >/dev/null 2>&1 || {
  echo "Node.js is required; see .nvmrc for the required version." >&2
  exit 1
}

# .nvmrc is the repository's single Node version entry, so the expected major is
# read from it rather than repeated here.
required_node_major="$(node -p 'require("node:fs").readFileSync(".nvmrc", "utf8").trim().replace(/^v/, "").split(".")[0]')"
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" != "$required_node_major" ]]; then
  echo "Node.js $required_node_major is required; found $(node --version). See .nvmrc." >&2
  exit 1
fi

"$yarn_cli" install --immutable

if [[ ! -f packages/twenty-server/.env ]]; then
  "$yarn_cli" nx run twenty-server:reset:env
fi

"$compose_cli" up -d --wait
"$yarn_cli" nx run twenty-server:database:init

echo "Local SCRM dependencies and database are ready."
echo "Run: ./scripts/scrm/yarn scrm:dev"
