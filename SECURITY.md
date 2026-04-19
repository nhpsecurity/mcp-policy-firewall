# Security Policy

## Supported versions

Security fixes are applied to the latest published release line.

| Version | Supported |
| --- | --- |
| 0.1.x | yes |
| < 0.1.0 | no |

## Reporting a vulnerability

Use GitHub Security Advisories for private disclosure.

- Preferred: create a private advisory in the repository Security tab.
- Fallback: email the maintainer listed in the repository profile and avoid sharing exploit details in public issues.

Please include:

- affected version
- deployment environment (OS, Node version, transport type)
- minimal reproduction steps
- expected behavior and observed behavior
- impact assessment (confidentiality, integrity, availability)

## Response targets

- Acknowledgement: within 72 hours
- Triage decision: within 7 days
- Patch or mitigation plan: as soon as practical, based on severity and reproducibility

## Disclosure process

1. Report is received privately.
2. Maintainers reproduce and assess impact.
3. Fix is prepared and validated.
4. Release notes document the patch.
5. Public disclosure follows coordinated release.

## Security scope and limitations

`mcp-firewall` provides policy gating, scope controls, and redaction for operational logs.

It is not a replacement for:

- host hardening and sandboxing
- identity and access management
- least-privilege credentials
- network segmentation

Layer security controls accordingly.
