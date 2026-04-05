import sys
import json
import urllib.request
import urllib.error

BASE = "http://localhost:8089"
KEY = "dev-key-beaver-bridge"
HEADERS = {"X-API-Key": KEY, "Content-Type": "application/json"}


def get(path: str) -> dict | list:
    req = urllib.request.Request(f"{BASE}{path}", headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=HEADERS, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def print_section(title: str):
    print(f"\n{'='*50}")
    print(f"  {title}")
    print('='*50)


# ── Health ────────────────────────────────────────────────────────────────────
def test_health():
    print_section("Health")
    r = get("/health")
    print(f"  status: {r['status']}")


# ── List all MCPs ─────────────────────────────────────────────────────────────
def test_list_mcps():
    print_section("All MCPs")
    servers = get("/api/v1/mcps")
    for s in servers:
        icon = "✓" if s["status"] == "reachable" else "✗"
        print(f"  {icon} {s['name']:<25} [{s['transport']}]  {s['status']}")
    print(f"\n  Total: {len(servers)} servers")
    return servers


# ── List tools for one MCP ────────────────────────────────────────────────────
def test_tools(mcp_name: str):
    print_section(f"Tools: {mcp_name}")
    tools = get(f"/api/v1/mcps/{mcp_name}/tools")
    for t in tools:
        print(f"  [{t['name']}]")
        if t.get("description"):
            print(f"      {t['description'][:80]}")
    print(f"\n  Total: {len(tools)} tools")
    return tools


# ── Call a tool ───────────────────────────────────────────────────────────────
def test_call_tool(mcp_name: str, tool_name: str, arguments: dict):
    print_section(f"Call: {mcp_name}/{tool_name}")
    print(f"  args: {json.dumps(arguments)}")
    r = post(f"/api/v1/mcps/{mcp_name}/tools/{tool_name}/call", {"arguments": arguments})
    print(f"  is_error: {r.get('is_error', False)}")
    for c in r.get("content", []):
        text = c.get("text", "")
        print(f"  {text[:500]}")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    args = sys.argv[1:]

    try:
        if not args:
            # Run all basic checks
            test_health()
            servers = test_list_mcps()
            test_tools("bigquery")
            test_call_tool("bigquery", "list_dataset_ids", {"project_id": "ai-production-487311"})

        elif len(args) == 1:
            # python test_api.py <mcp_name>
            test_tools(args[0])

        elif args[1] == "tools":
            # python test_api.py <mcp_name> tools
            test_tools(args[0])

        elif args[1] == "call":
            # python test_api.py <mcp_name> call <tool_name> [json_args]
            tool_name = args[2] if len(args) > 2 else ""
            arguments = json.loads(args[3]) if len(args) > 3 else {}
            test_call_tool(args[0], tool_name, arguments)

    except urllib.error.HTTPError as e:
        print(f"\nHTTP {e.code}: {e.read().decode()}")
    except ConnectionRefusedError:
        print(f"\nCannot connect to {BASE} — is the server running?")
        print("  .venv/bin/uvicorn app.main:app --reload --port 8787")
