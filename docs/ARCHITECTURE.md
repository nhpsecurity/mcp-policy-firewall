# Architecture

`mcp-firewall` is a policy gateway for MCP traffic. It is intentionally narrow: evaluate policy first, forward only when allowed, and keep the decision trail observable.

## Design goals

- deterministic policy outcomes
- explicit deny responses with actionable metadata
- minimal transport complexity in the hot path
- safe operational logging through redaction

## Request lifecycle

1. Client sends a JSON-RPC 2.0 request to `POST /mcp`.
2. Request payload is validated (`jsonrpc`, `id`, `method`, `params`).
3. Policy context is built from method, tool name, and inferred scope targets.
4. Policy engine evaluates deny, scope, confirmation, allow, and fallback rules.
5. If denied, the gateway returns a structured JSON-RPC error with policy metadata.
6. If allowed, request is forwarded to the selected downstream MCP server.
7. Audit event is emitted with decision outcome, policy id, and latency.

## Runtime components

- `src/config`: strict schema validation and environment interpolation
- `src/policy`: policy matching, scope extraction, and decision building
- `src/gateway`: downstream client management and MCP method dispatch
- `src/redaction`: recursive value masking for known secret patterns
- `src/audit`: structured runtime and audit logging
- `src/server.ts`: HTTP ingress, validation, policy enforcement, and response mapping

## Protocol and naming behavior

- Supported methods: `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, `prompts/get`, `ping`
- Tool and prompt names are namespaced as `<server>__<name>` when multiple downstream servers are connected.
- Resource URIs are namespaced as `mcpfw://<server>/<encoded-uri>`.

## Decision and error contract

Policy deny responses include:

- `code` (machine-readable reason code)
- `policyId` (policy branch that triggered)
- `matchedRule` (when a specific rule matched)
- `remediationHint` (operator guidance)

## Operational characteristics

- `strictStartup=true` fails startup when any downstream connection fails.
- per-request HTTP timeout is enforced at server level.
- downstream connection attempts use per-server `timeoutMs` values.
- logs are JSON-formatted and may be written to console and optional file sink.

## Tradeoffs

- JSON policy config keeps onboarding fast, but is less expressive than full policy DSLs.
- Deterministic matching favors predictability over adaptive scoring.
- The project intentionally avoids identity and tenancy features in early versions.
