# mcp-firewall

Policy firewall for MCP servers.

`mcp-firewall` sits between an AI client and downstream MCP servers, evaluates policy before side effects, and returns explainable decisions.

If you are exposing MCP tools to autonomous or semi-autonomous agents, this gives you a practical control layer with a short setup path.

## The hook in one minute

Most MCP integrations start with direct agent-to-tool connectivity. That is fast, but operationally risky:

- broad tool reach by default
- weak visibility when something is blocked or allowed
- logs that may contain sensitive values

`mcp-firewall` changes the default path:

- evaluate allow/deny/confirmation rules first
- enforce path/repo/domain scope constraints
- redact common secret patterns in audit logs
- return policy-linked deny responses with remediation hints

## Proven local result (reproducible)

```bash
npm install
npm run qa:local
```

`qa:local` runs CI gates, boots a deterministic mock MCP server, verifies one safe call is allowed, and verifies one risky call is denied.

Representative output from a successful run:

```text
[1/4] Run CI quality gates
... 19 tests passed ...
[2/4] Start mcp-firewall mock server
[3/4] Wait for health endpoint
[4/4] Run smoke test
Health status: ok
tools/list returned 3 tools
Safe call succeeded with tool: mockfs__read_file
Blocked call confirmed. policyId: policy.tools.deny
```

## Who this is for

- teams connecting internal agents to filesystem, git, or network-capable MCP tools
- maintainers who need clear policy behavior for demos, governance, and incident review
- developers who want a thin control plane, not a full agent framework

## Architecture

```mermaid
flowchart LR
  A[AI Client or Agent] --> B[mcp-firewall]
  B --> C[Policy Engine]
  C --> D{Allow?}
  D -- No --> E[Explainable Deny Response]
  D -- Yes --> F[Forwarder]
  F --> G[Downstream MCP Server(s)]
  B --> H[Redaction Layer]
  H --> I[Structured Audit Logs]
```

## Quickstart

1. Install and build.

```bash
npm install
npm run build
```

2. Copy a preset and edit it.

Windows PowerShell:

```powershell
Copy-Item presets\local-safe.json config.json
```

macOS/Linux:

```bash
cp presets/local-safe.json config.json
```

3. Start firewall.

```bash
npx mcp-firewall start --config ./config.json
```

4. Inspect merged MCP surface.

```bash
npx mcp-firewall list --config ./config.json
```

## Example deny response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32010,
    "message": "Tool 'mockfs__delete_file' is denied by policy.",
    "data": {
      "code": "tool_denied",
      "policyId": "policy.tools.deny",
      "matchedRule": "*delete*",
      "remediationHint": "Remove or narrow this deny rule if tool access is intended."
    }
  }
}
```

## Policy model

- `allow`: explicit allowlist patterns
- `deny`: explicit denylist patterns
- `requireConfirmation`: sensitive operations that require user confirmation upstream
- `scope`: path/repo/domain constraints
- `redaction`: log masking for common secret patterns

Example policy skeleton:

```json
{
  "policy": {
    "mode": "hybrid",
    "tools": {
      "allow": ["*read*", "*list*", "search*"],
      "deny": ["*delete*", "*push*", "*write*"],
      "requireConfirmation": ["*exec*", "*shell*"]
    },
    "scope": {
      "paths": {
        "allow": ["."],
        "deny": [".git", ".env", "**/secrets/**"]
      },
      "repos": {
        "allow": ["your-org/*"],
        "deny": []
      },
      "domains": {
        "allow": [],
        "deny": ["*"]
      }
    },
    "redaction": {
      "enabled": true,
      "extraPatterns": []
    }
  }
}
```

## Design rationale (decision -> reason -> source)

| Decision | Why this choice | Source |
| --- | --- | --- |
| Policy decision before forwarding | Prevent side effects when a request violates policy; fail early and explicitly. | [1], [2] |
| JSON-RPC strictness (`jsonrpc: "2.0"`) | Remove protocol ambiguity and keep client/server behavior deterministic. | [2] |
| Structured audit logging | Make incident review and policy tuning practical in production. | [3] |
| Secret redaction in logs | Lower accidental credential exposure during debugging and operations. | [4] |
| Environment variable interpolation in config | Keep secrets out of committed config and align with deployment practice. | [5] |

Expanded rationale and tradeoffs live in [docs/RATIONALE.md](docs/RATIONALE.md).

## Included presets

- `presets/local-safe.json`
- `presets/read-only.json`
- `presets/github-safe.json`

## Commands

```bash
# Lint
npm run lint

# Build distributables
npm run build

# Run strict CI gates (typecheck + tests + build)
npm run qa:ci

# End-to-end local verification
npm run qa:local

# Smoke test only
npm run smoke:test

# Formatting checks for code/config files
npm run format:check

# Optional PowerShell variants
npm run qa:local:ps1
npm run smoke:test:ps1
```

## Supported MCP methods

- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`
- `prompts/list`
- `prompts/get`

## Limits and non-goals

- not a replacement for host hardening, sandboxing, or IAM
- not an enterprise auth platform in v0.1.x
- not a guarantee of tool safety; it is a policy and observability control layer

## Documentation

- [docs/README.md](docs/README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)
- [RELEASE_NOTES_v0.1.0.md](RELEASE_NOTES_v0.1.0.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/RATIONALE.md](docs/RATIONALE.md)
- [docs/CITATIONS.md](docs/CITATIONS.md)
- [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)
- [CITATION.cff](CITATION.cff)
- [LOCAL_COMPLETION_CHECKLIST.md](LOCAL_COMPLETION_CHECKLIST.md)

## References

[1] Model Context Protocol documentation, https://modelcontextprotocol.io/

[2] JSON-RPC 2.0 Specification, https://www.jsonrpc.org/specification

[3] OWASP Logging Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

[4] OWASP Secrets Management Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

[5] The Twelve-Factor App, Config, https://12factor.net/config
