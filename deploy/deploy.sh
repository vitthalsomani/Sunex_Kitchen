#!/usr/bin/env bash
# Production deploy / update script for the Sunex Mess app.
# Idempotent — safe to re-run after `git pull`.
#
# Assumes:
#   * repo cloned at /opt/sunex_mess
#   * .env created from .env.prod.example
#   * docker + docker compose installed
#   * host nginx already serves sunexstones.com (sunexstones.conf)
#
# Usage:
#   cd /opt/sunex_mess && ./deploy/deploy.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SNIPPET_SRC="$REPO_DIR/deploy/mess.conf"
SNIPPET_DST="/etc/nginx/snippets/mess.conf"
INCLUDE_LINE="    include /etc/nginx/snippets/mess.conf;"
SUNEX_CONF="/etc/nginx/conf.d/sunexstones.conf"

cd "$REPO_DIR"

if [[ ! -f .env ]]; then
    echo "ERROR: .env not found. Run: cp .env.prod.example .env && edit it." >&2
    exit 1
fi

echo "==> Building and (re)starting containers"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Waiting for backend to be ready"
for i in {1..30}; do
    if curl -fsS http://127.0.0.1:3121/health >/dev/null 2>&1; then
        echo "    backend OK"
        break
    fi
    sleep 2
    if [[ $i -eq 30 ]]; then
        echo "ERROR: backend never came up — check logs: docker logs sspl_mess_backend" >&2
        exit 1
    fi
done

echo "==> Verifying frontend container"
if ! curl -fsS http://127.0.0.1:3120/healthz >/dev/null 2>&1; then
    echo "ERROR: frontend container not responding" >&2
    exit 1
fi

echo "==> Installing nginx snippet"
sudo install -m 0644 "$SNIPPET_SRC" "$SNIPPET_DST"

if ! grep -qF "snippets/mess.conf" "$SUNEX_CONF"; then
    echo "==> Adding include directive to $SUNEX_CONF"
    sudo cp "$SUNEX_CONF" "$SUNEX_CONF.bak.$(date +%Y%m%d-%H%M%S)"
    # Insert just before the last `}` of the file (closing the :443 server block include list)
    sudo awk -v line="$INCLUDE_LINE" '
        /include \/etc\/nginx\/snippets\/deploy.conf;/ { print; print line; next }
        { print }
    ' "$SUNEX_CONF" | sudo tee "$SUNEX_CONF.tmp" >/dev/null
    sudo mv "$SUNEX_CONF.tmp" "$SUNEX_CONF"
fi

echo "==> Testing + reloading nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. Live at https://sunexstones.com/mess/"
