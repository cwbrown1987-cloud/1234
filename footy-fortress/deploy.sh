#!/usr/bin/env bash
# Upload the game to Cloudflare Pages (project "footy-fortress").
# Needs a Cloudflare API token with "Cloudflare Pages: Edit", sent as a Bearer token.
# In a Claude cloud session the token is injected by the network proxy; elsewhere set CF_TOKEN.
set -euo pipefail
ACCOUNT="${CF_ACCOUNT:-e2904274ec42f8aeb1d44b711709b4c6}"
PROJECT="${CF_PROJECT:-footy-fortress}"
cd "$(dirname "$0")"
auth=(); [ -n "${CF_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $CF_TOKEN")
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cp -r index.html style.css js logos "$tmp/"
cd "$tmp"
args=()
while IFS= read -r line; do args+=(-F "$line"); done < <(python3 - <<'PY'
import os, hashlib, json
man = {}
for root, _, files in os.walk('.'):
    for f in files:
        p = os.path.join(root, f)[1:]
        h = hashlib.sha256(open('.' + p, 'rb').read() + p.encode()).hexdigest()[:32]
        man[p] = h
        print(f'{h}=@.{p}')
json.dump(man, open('../manifest.json', 'w'))
PY
)
curl -sS "${auth[@]}" -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/pages/projects/$PROJECT/deployments" \
  -F "manifest=<../manifest.json" -F "branch=main" "${args[@]}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Deployed:' if d.get('success') else 'Failed:', (d.get('result') or {}).get('url') or d.get('errors'))"
