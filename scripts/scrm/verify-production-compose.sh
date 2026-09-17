#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
deployment_dir="$repo_root/packages/twenty-docker/scrm"
compose_file="$deployment_dir/compose.yml"
environment_file="$deployment_dir/.env.example"
config_file="$(mktemp)"
trap 'rm -f "$config_file"' EXIT

SCRM_RUNTIME_ENV_FILE="$environment_file" docker compose \
  --env-file "$environment_file" \
  --project-directory "$deployment_dir" \
  --file "$compose_file" \
  --profile migration \
  config --format json > "$config_file"

python3 - "$config_file" <<'PY'
from __future__ import annotations

import json
import sys
from pathlib import Path

config = json.loads(Path(sys.argv[1]).read_text())
services = config["services"]
expected_services = {"migrate", "proxy", "server", "worker"}

if set(services) != expected_services:
    raise SystemExit(
        f"unexpected services: {sorted(services)}; expected {sorted(expected_services)}"
    )

for service_name in ("server", "worker", "migrate"):
    service = services[service_name]
    if service.get("image") != "registry.example.invalid/scrm/app:replace-with-release":
        raise SystemExit(f"{service_name} does not use SCRM_APP_IMAGE")

if services["migrate"].get("profiles") != ["migration"]:
    raise SystemExit("migrate must be an explicit migration-profile service")

if services["migrate"].get("command") != []:
    raise SystemExit("migrate must clear the application image default command")

for service_name in ("migrate", "server", "worker"):
    service = services[service_name]
    if service.get("ports"):
        raise SystemExit(f"{service_name} must not expose host ports")

for service_name in ("server", "worker"):
    service = services[service_name]
    environment = service.get("environment", {})
    if environment.get("DISABLE_DB_MIGRATIONS") != "true":
        raise SystemExit(f"{service_name} must disable automatic migrations")
    if environment.get("DISABLE_CRON_JOBS_REGISTRATION") != "true":
        raise SystemExit(f"{service_name} must leave scheduled-job registration to migrate")

if services["proxy"].get("ports") != [
    {"mode": "ingress", "target": 80, "published": "80", "protocol": "tcp"},
    {"mode": "ingress", "target": 443, "published": "443", "protocol": "tcp"},
    {"mode": "ingress", "target": 443, "published": "443", "protocol": "udp"},
]:
    raise SystemExit("proxy must be the only public ingress service")

if set(services["proxy"].get("environment", {})) != {
    "SCRM_PUBLIC_HOST",
    "SCRM_TLS_EMAIL",
}:
    raise SystemExit("proxy must not receive application or data-service secrets")

server_healthcheck = services["server"].get("healthcheck", {})
if not server_healthcheck.get("test"):
    raise SystemExit("server must define a health check")

print("SCRM production Compose topology is valid.")
PY
