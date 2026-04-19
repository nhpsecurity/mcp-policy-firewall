# Operations Runbook

This runbook covers common operational actions for `mcp-firewall`.

## Start with local config

```bash
npx mcp-firewall start --config ./config.json
```

## Health check

```bash
curl http://127.0.0.1:8787/health
```

Expected fields:

- `status`
- `connectedServers`
- `connectedCount`
- `totalConfiguredServers`

## Validate merged MCP surface

```bash
npx mcp-firewall list --config ./config.json
```

Use this to verify connectivity and namespaced tool/resource/prompt output.

## Run deterministic smoke proof

```bash
npm run smoke:test
```

This verifies:

- health endpoint availability
- successful safe call behavior
- expected deny behavior for risky calls

## Incident triage: unexpected deny

1. Inspect deny payload fields: `policyId`, `matchedRule`, `remediationHint`.
2. Confirm the incoming `name`, `path`, `repo`, or `domain` values.
3. Review matching rules in `policy.tools` and `policy.scope`.
4. Re-run smoke test after policy changes.

## Incident triage: unexpected allow

1. Check whether `policy.mode` is `hybrid` or `allowlist`.
2. Review `policy.defaults.onUnknownTool`.
3. Confirm deny patterns are broad enough for the target operation.
4. Add regression tests before releasing policy changes.

## Log handling guidance

- Enable file logging with `logging.filePath` for persistent audit trails.
- Keep logs out of source control.
- Treat logs as sensitive operational data even after redaction.

## Safe rollout checklist

- Run `npm run qa:ci` before deployment.
- Validate representative allow and deny cases in staging.
- Keep `strictStartup` enabled in environments where partial connectivity is unacceptable.
- Use least-privilege credentials for downstream servers.
