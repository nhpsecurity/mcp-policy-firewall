# Contributing

Thanks for helping improve `mcp-firewall`.

This project prioritizes predictable policy behavior, clear operator feedback, and conservative security defaults. Review [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## Development setup

1. Use Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Verify local quality gates:

```bash
npm run qa:ci
npm run qa:local
```

## Branch and commit guidance

- Keep each pull request focused on one outcome.
- Prefer short-lived branches (`fix/...`, `feat/...`, `docs/...`, `test/...`).
- Use clear commit messages that explain impact, not just file changes.

## Pull request requirements

- Add or update tests for behavior changes.
- Update user-facing documentation if CLI/runtime behavior changes.
- Preserve explainable deny outcomes (`policyId`, `matchedRule`, remediation guidance).
- Avoid unscoped feature expansion that conflicts with [ROADMAP.md](ROADMAP.md).

## Definition of done for PRs

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.
- `npm run smoke:test` confirms expected allow and deny behavior when relevant.

## Security-sensitive changes

For changes in policy evaluation, forwarding, redaction, or logging:

- include a short threat-model note in the PR description
- include one positive and one negative test case
- explicitly call out any backwards-incompatible policy behavior

## Good first contributions

- Expand preset examples for commonly used MCP server stacks.
- Add regression tests for scope and redaction edge cases.
- Improve denial diagnostics while keeping response payloads stable.
- Improve docs with real-world integration walkthroughs.
