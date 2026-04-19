# Release Notes v0.1.0

mcp-firewall v0.1.0 is the first public release.

## What it solves

MCP tools are powerful, but direct agent-to-tool wiring often has weak controls.
This release introduces a thin policy firewall layer for MCP usage.

## Highlights

- Policy enforcement: allow/deny/confirmation rules for tool calls.
- Scope controls: path, repo, and domain restrictions.
- Secret redaction: practical masking for common token and env patterns.
- Auditability: structured logs for allow/deny outcomes and matched policy rules.
- Explainability: blocked responses include policy id and remediation hint.

## Demo path

Use the local deterministic mock flow:

1. npm run start:mock
2. npm run smoke:test

Expected behavior:
- read-like call allowed
- delete-like call blocked with policy.tools.deny

## Compatibility

- Node.js >= 20
- MCP methods currently handled:
  - tools/list, tools/call
  - resources/list, resources/read
  - prompts/list, prompts/get

## Next focus

- Improve policy matcher coverage.
- Expand examples for real MCP server integrations.
- Tighten observability and denial diagnostics.
