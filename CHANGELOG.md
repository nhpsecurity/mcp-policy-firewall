# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Cross-platform smoke test script (`scripts/smoke-test.mjs`) for deterministic local proof on Windows, macOS, and Linux.
- Cross-platform local QA orchestrator (`scripts/local-qa.mjs`) with health wait and cleanup.
- Rationale and citation docs (`docs/RATIONALE.md`, `docs/CITATIONS.md`) and `CITATION.cff` metadata.
- Repository quality config: `.editorconfig`, `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`, `.npmrc`, and `.github/CODEOWNERS`.
- Curated documentation index and runbook (`docs/README.md`, `docs/OPERATIONS_RUNBOOK.md`).

### Changed
- README upgraded with stronger project hook, reproducible evidence snapshot, decision rationale table, and source-backed references.
- Package scripts now default to cross-platform Node-based smoke/local QA commands while preserving PowerShell alternatives.
- CI now tests against Node 20 and 22 and cancels superseded runs.
- Contributing, roadmap, security, architecture, and publish-checklist docs rewritten for production maintainer clarity.
- Removed internal AI/planning artifacts from `docs/` to keep the public repo surface focused and maintainable.

### Tests
- Added regression test that rejects unknown nested policy keys in config.

## [0.1.0] - 2026-04-19

### Added
- MCP firewall runtime with policy enforcement for tools, scope, and redaction.
- JSON-RPC gateway endpoint and health endpoint.
- Downstream MCP client manager for stdio and SSE servers.
- Namespaced forwarding across tools/resources/prompts.
- Audit logging with policy metadata and latency.
- Local mock MCP server for deterministic demos.
- Presets: local-safe, read-only, github-safe.
- Smoke test and local QA scripts.
- CI workflow and release workflow.
- Public maintainer docs: security, contributing, roadmap, code of conduct.
