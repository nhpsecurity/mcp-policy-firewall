# Citations

This file lists external references that informed protocol handling, logging posture, and secret-management guidance.

## Protocol and interface references

1. Model Context Protocol documentation
   - https://modelcontextprotocol.io/

2. JSON-RPC 2.0 Specification
   - https://www.jsonrpc.org/specification

## Security and operations references

3. OWASP Logging Cheat Sheet
   - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

4. OWASP Secrets Management Cheat Sheet
   - https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

5. The Twelve-Factor App - Config
   - https://12factor.net/config

## How citations are used in this project

- Protocol strictness (`jsonrpc: "2.0"`) maps to source #2.
- MCP method handling and integration model map to source #1.
- Structured audit event rationale maps to source #3.
- Redaction and secret handling rationale map to source #4.
- Environment variable interpolation in config maps to source #5.
