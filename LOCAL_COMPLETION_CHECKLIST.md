# Local Completion Checklist

Use this checklist before pushing to GitHub.

## Product Readiness
- [ ] README is accurate and includes quickstart + demo runbook.
- [ ] docs/README.md reflects the current documentation set.
- [ ] Presets exist and reflect the current policy model.
- [ ] Example config works locally.
- [ ] Security, roadmap, and contributing docs exist.
- [ ] Code of conduct and changelog exist.
- [ ] Release notes file exists for current version.

## Technical Readiness
- [ ] npm run lint passes.
- [ ] npm run typecheck passes.
- [ ] npm test passes.
- [ ] npm run build passes.
- [ ] npm run format:check passes.
- [ ] npm run qa:local passes (starts mock server + smoke test).

## Repository Readiness
- [ ] LICENSE is present.
- [ ] .gitignore excludes node_modules, dist, logs, and env files.
- [ ] Issue and PR templates exist.
- [ ] CI workflow exists and runs typecheck, test, build.
- [ ] Release workflow exists and publishes npm package on version tags.

## Pre-Push Actions
- [ ] Replace any personal placeholders in config examples.
- [ ] Update SECURITY contact link to your final repository advisory URL.
- [ ] Initialize git and create the first commit.
- [ ] Create remote repo and push main branch.

## First Release
- [ ] Tag v0.1.0 locally.
- [ ] Publish release notes with demo narrative.
- [ ] Post launch messages from docs/LAUNCH_POSTS.md.
- [ ] Start tracking evidence in docs/ECOSYSTEM_IMPACT_EVIDENCE.md.
