# Seed Issues

Use these issue ideas to bootstrap contributor onboarding with scoped, high-signal work.

## 1) Policy matcher edge-case regression tests

- Type: `enhancement`
- Labels: `good first issue`, `tests`
- Goal: add tests for overlapping wildcard patterns and precedence behavior.
- Acceptance criteria: all new cases are deterministic and pass under `npm test`.

## 2) Domain-scope example for HTTP-oriented MCP tools

- Type: `docs`
- Labels: `good first issue`
- Goal: add an example policy config demonstrating allowlist and denylist domain scope behavior.
- Acceptance criteria: example is runnable and linked from README or docs index.

## 3) Ambiguous namespaced-item error diagnostics

- Type: `enhancement`
- Labels: `developer experience`
- Goal: improve error messages when a tool/resource/prompt name is ambiguous across servers.
- Acceptance criteria: error includes a concrete fix example using required namespacing.

## 4) Dry-run policy simulation mode

- Type: `feature`
- Labels: `policy`
- Goal: add optional evaluation mode that reports decisions without forwarding side-effecting calls.
- Acceptance criteria: clear CLI/config toggle and tests for simulated allow and deny outcomes.

## 5) Redaction custom-pattern test expansion

- Type: `test`
- Labels: `good first issue`, `security`
- Goal: add boundary tests for custom regex redaction behavior.
- Acceptance criteria: includes at least one false-positive and one false-negative prevention case.

## 6) GitHub MCP integration example

- Type: `docs`
- Labels: `examples`
- Goal: publish a realistic GitHub server setup with safe defaults and caveats.
- Acceptance criteria: includes config, expected outcomes, and troubleshooting notes.
