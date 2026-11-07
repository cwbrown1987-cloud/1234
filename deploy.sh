#!/usr/bin/env bash
# Publish the game to Cloudflare Pages (project "footy-fortress" -> https://footy-fortress.pages.dev).
# All files plus the online API (server/api.js) are packed into one _worker.js, so only a Pages:Edit API token is needed.
# The API's database (D1, bound as DB) is attached in the Pages project settings.
# CF_BRANCH=some-name deploys a preview instead of the live site.
# In a Claude cloud session the token is injected by the network proxy; elsewhere set CF_TOKEN.
set -euo pipefail
ACCOUNT="${CF_ACCOUNT:-e2904274ec42f8aeb1d44b711709b4c6}"
PROJECT="${CF_PROJECT:-footy-fortress}"
BRANCH="${CF_BRANCH:-main}"
cd "$(dirname "$0")"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
python3 - "$tmp/_worker.js" <<'PY'
import os, sys, json, base64
files, binary = {}, {}
for root, _, names in os.walk('.'):
    for n in names:
        p = os.path.join(root, n)[1:]
        if p.startswith(('/mockups', '/.', '/server')) or n.endswith(('.md', '.sh')): continue
        data = open('.' + p, 'rb').read()
        if p.endswith(('.html', '.css', '.js')): files[p] = data.decode('utf-8')
        else: binary[p] = base64.b64encode(data).decode()
types = {'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'text/javascript; charset=utf-8','png':'image/png','jpg':'image/jpeg','svg':'image/svg+xml','webmanifest':'application/manifest+json'}
api = open('server/api.js').read().replace('export async function handleApi', 'async function handleApi')
open(sys.argv[1], 'w').write(api + f"""
const FILES={json.dumps(files)};
const BIN={json.dumps(binary)};
const TYPES={json.dumps(types)};
export default {{ async fetch(req, env) {{
  let path = new URL(req.url).pathname;
  if (path.startsWith('/api/')) return handleApi(req, env); if (path === '/' || path === '') path = '/index.html';
  const ext = path.split('.').pop(), headers = {{'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': (ext === 'html' || path === '/sw.js') ? 'no-cache' : 'public, max-age=300'}};
  if (path in FILES) return new Response(FILES[path], {{headers}});
  if (path in BIN) return new Response(Uint8Array.from(atob(BIN[path]), c => c.charCodeAt(0)), {{headers}});
  return new Response('Not found', {{status: 404}});
}} }};
""")
PY
auth=(); [ -n "${CF_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $CF_TOKEN")
curl -sS "${auth[@]}" -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/pages/projects/$PROJECT/deployments" \
  -F "manifest={}" -F "branch=$BRANCH" -F "_worker.js=@$tmp/_worker.js;type=application/javascript+module" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Deployed ($BRANCH): https://$PROJECT.pages.dev' if d.get('success') else 'Failed:', '' if d.get('success') else d.get('errors'))"
