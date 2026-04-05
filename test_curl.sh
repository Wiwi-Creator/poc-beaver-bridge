#!/bin/bash
# Beaver Bridge - Quick curl tests
# Usage: bash test_curl.sh
# Or copy individual commands to terminal

BASE="http://localhost:8787"
KEY="dev-key-beaver-bridge"
H="X-API-Key: $KEY"

echo "===== Health ====="
/usr/bin/curl -s "$BASE/health" | python3 -m json.tool

echo ""
echo "===== List all MCPs ====="
/usr/bin/curl -s -H "$H" "$BASE/api/v1/mcps" | python3 -c "
import sys, json
servers = json.load(sys.stdin)
for s in servers:
    icon = '✓' if s['status'] == 'reachable' else '✗'
    print(f'  {icon} {s[\"name\"]:<25} {s[\"status\"]}')
print(f'\nTotal: {len(servers)} servers')
"

echo ""
echo "===== BigQuery Tools ====="
/usr/bin/curl -s -H "$H" "$BASE/api/v1/mcps/bigquery/tools" | python3 -c "
import sys, json
tools = json.load(sys.stdin)
for t in tools:
    print(f'  [{t[\"name\"]}]')
"

echo ""
echo "===== Call: bigquery list_dataset_ids ====="
/usr/bin/curl -s -H "$H" -H "Content-Type: application/json" \
  -X POST "$BASE/api/v1/mcps/bigquery/tools/list_dataset_ids/call" \
  -d '{"arguments":{"project_id":"ai-production-487311"}}' | python3 -m json.tool

echo ""
echo "===== Compute Engine Tools ====="
/usr/bin/curl -s -H "$H" "$BASE/api/v1/mcps/compute/tools" | python3 -c "
import sys, json
tools = json.load(sys.stdin)
for t in tools:
    print(f'  [{t[\"name\"]}] {t.get(\"description\",\"\")[:60]}')
print(f'\nTotal: {len(tools)} tools')
"

# ── Single-line snippets (copy & paste) ──────────────────────────────────────
#
# List MCPs:
#   curl -s -H "X-API-Key: dev-key-beaver-bridge" http://localhost:8787/api/v1/mcps
#
# List tools for any MCP (replace bigquery):
#   curl -s -H "X-API-Key: dev-key-beaver-bridge" http://localhost:8787/api/v1/mcps/bigquery/tools
#   curl -s -H "X-API-Key: dev-key-beaver-bridge" http://localhost:8787/api/v1/mcps/logging/tools
#   curl -s -H "X-API-Key: dev-key-beaver-bridge" http://localhost:8787/api/v1/mcps/monitoring/tools
#   curl -s -H "X-API-Key: dev-key-beaver-bridge" http://localhost:8787/api/v1/mcps/compute/tools
#   curl -s -H "X-API-Key: dev-key-beaver-bridge" http://localhost:8787/api/v1/mcps/firestore/tools
#
# Call a tool:
#   curl -s -X POST -H "X-API-Key: dev-key-beaver-bridge" -H "Content-Type: application/json" \
#     http://localhost:8787/api/v1/mcps/bigquery/tools/execute_sql_readonly/call \
#     -d '{"arguments":{"project_id":"ai-production-487311","query":"SELECT 1"}}'
#
# Swagger UI:
#   open http://localhost:8787/docs
