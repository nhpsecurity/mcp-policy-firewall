# Launch Post Drafts

## X Post

mcp-firewall is live: a firewall for MCP servers.

It adds a policy layer between AI agents and tools so you can:
- block risky tool calls
- restrict paths/repos/domains
- redact secrets in logs
- audit every allow/deny decision

Quickstart and local smoke test are in the repo.

## Reddit Post

Title:
I built mcp-firewall: policy controls for MCP tool access

Body:
I wanted a simple control layer between AI agents and MCP servers, so I built mcp-firewall.

Core behavior:
- allow/deny tool calls by policy
- scope restrictions (paths/repos/domains)
- practical secret redaction in logs
- explainable deny responses with policy id and remediation hint

There is a local mock-server demo config and a smoke-test script so you can run it quickly.

Feedback on policy shape and default presets is very welcome.

## Hacker News Post

Title:
Show HN: mcp-firewall (a firewall for MCP servers)

Body:
mcp-firewall is a lightweight gateway that enforces policy before MCP tool calls are forwarded.

It focuses on practical controls:
- allow/deny rules
- scope guardrails
- redaction
- structured audit logs

It includes a local mock MCP demo so behavior can be tested without external dependencies.
