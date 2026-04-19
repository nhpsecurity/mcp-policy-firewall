# Roadmap

This roadmap favors predictable behavior, practical operator ergonomics, and incremental hardening.

## Current release (v0.1.x)

Status: shipped

- Policy enforcement for `tools/call` with allow, deny, and confirmation rules.
- Scope restrictions for path, repository, and domain targets.
- Redaction of common secret patterns in audit logs.
- Structured audit events with policy-linked deny metadata.
- Presets for local-safe, read-only, and GitHub-oriented scenarios.

## Next release focus (v0.2.x)

Status: planned

- Dry-run policy simulation mode for safer rule iteration.
- Improved matcher ergonomics and policy explainability.
- More integration examples for common MCP server combinations.

## Future release focus (v0.3.x)

Status: planned

- Expanded transport coverage where protocol stability is proven.
- Operational diagnostics and troubleshooting guidance upgrades.
- Additional policy presets based on community usage patterns.

## Non-goals for early versions

- Hosted multi-tenant control plane.
- Enterprise IAM, RBAC, or SSO platform capabilities.
- Full agent orchestration framework behavior.
