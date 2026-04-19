# Publish Checklist

## Before creating remote repo
- Ensure local checks pass: `npm run qa:ci` and `npm run qa:local`.
- Confirm working tree is clean.
- Confirm README and docs reflect current behavior.
- Confirm `SECURITY.md`, `CONTRIBUTING.md`, and `.github/CODEOWNERS` are up to date.

## GitHub repository setup
- Create repository named `mcp-firewall`.
- Set repository description: `A firewall for MCP servers`.
- Add topics: `mcp`, `security`, `ai-tools`, `policy`, `firewall`.
- Enable Issues and Discussions.

## Security setup
- Configure repository Security Advisories.
- Update `.github/ISSUE_TEMPLATE/config.yml` advisory URL to your real repo.
- Add `NPM_TOKEN` secret for release workflow.

## Push and release
- Push `main` branch.
- Create and push tag `v0.1.0`.
- Confirm GitHub Actions `CI` and `Release` workflows pass.
- Publish release notes using `RELEASE_NOTES_v0.1.0.md`.
- Verify npm package metadata (`repository`, `bugs`, `homepage`) resolves correctly.

## First week growth actions
- Post launch copy from `docs/LAUNCH_POSTS.md`.
- Open seed issues from `docs/SEED_ISSUES.md`.
- Track adoption metrics in `docs/ECOSYSTEM_IMPACT_EVIDENCE.md`.
