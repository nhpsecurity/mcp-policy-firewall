# Demo Sequence

Goal: show immediate behavior change with mcp-firewall.

1. Start firewall with local-safe config.
2. Attempt a safe list/read request and verify allow.
3. Attempt a destructive tool call (delete/write) and verify deny reason.
4. Attempt access outside allowed path and verify scope deny.
5. Pass a token-like argument and verify redaction in audit logs.

Expected output qualities:
- deny response includes policy id and remediation hint.
- logs include allow and deny events.
- redaction count is present in audit event.
