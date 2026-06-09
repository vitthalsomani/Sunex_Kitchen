#!/usr/bin/env bash
# Runs ON the VPS — invoked over SSH by the GitHub Actions workflow.
# Rebuilds and restarts the Compose stack from the freshly-synced source.
#
# This is the LIGHT deploy used for every push. The nginx snippet and
# .env bootstrap are handled once by deploy/deploy.sh during initial provisioning;
# they don't need to run on every push.
set -euo pipefail

DEPLOY_DIR=/opt/sunex_mess
COMPOSE_FILE=docker-compose.prod.yml
ENV_FILE=.env
HEALTH_URL='http://127.0.0.1:3131/health'

cd "$DEPLOY_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: $ENV_FILE missing on server — run deploy/deploy.sh manually first." >&2
    exit 1
fi

echo ">> docker compose up -d --build"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo ">> pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo ">> stack status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ">> waiting for backend health"
for i in {1..30}; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo 000)
    if [[ "$code" == "200" ]]; then
        echo "health -> $code"
        echo "Deploy OK"
        exit 0
    fi
    sleep 2
done

echo "ERROR: backend never responded with 200 on $HEALTH_URL" >&2
echo ">> backend logs (tail 40):"
docker logs --tail 40 sspl_mess_backend 2>&1 || true
exit 1
