# Rationale and Tradeoffs

This document captures why `mcp-firewall` was designed the way it is, what problems it focuses on, and what it intentionally leaves out for v0.1.x.

## Problem statement

MCP gives agents a consistent protocol to use tools and resources, but many deployments start with direct agent-to-server wiring. In practice, that can make it hard to enforce policy before side effects and hard to explain why a call was denied or allowed.

`mcp-firewall` exists to add a thin, explicit control layer in front of downstream MCP servers.

## Core design decisions

## 1) Thin gateway, not a platform

Decision:
Use an HTTP JSON-RPC ingress with policy evaluation and forwarding, instead of building a full orchestration framework.

Reason:
Most teams only need a control point for policy, scope, and logging. A thin layer lowers adoption cost and avoids framework lock-in.

Tradeoff:
You get clear control boundaries, but not high-level agent lifecycle features.

## 2) Deterministic rules over heuristics

Decision:
Policy outcomes are explicit (allow, deny, requireConfirmation) with pattern matching.

Reason:
Security controls should be predictable and reviewable. Determinism improves trust and incident analysis.

Tradeoff:
Policy authoring can be more manual than adaptive scoring systems.

## 3) Explainable deny responses

Decision:
Deny payloads include policy metadata (`policyId`, `matchedRule`, `remediationHint`).

Reason:
Developers and operators need fast debugging signals to tune policy safely.

Tradeoff:
Response payloads expose policy structure; keep internal policy naming conventions clean.

## 4) Scope controls by path, repo, and domain

Decision:
Scope checks are first-class and separate from tool name matching.

Reason:
Tool-level decisions alone are often too coarse. Scope constraints enforce least privilege in realistic usage.

Tradeoff:
More config means more setup decisions for first-time users.

## 5) Built-in redaction for audit logs

Decision:
Redaction is part of request/response logging behavior.

Reason:
Operational logs are useful only if safe to retain and inspect.

Tradeoff:
Pattern-based masking can over-redact or miss novel secret formats; users should extend patterns for their environment.

## Non-goals for v0.1.x

- Not an endpoint protection tool.
- Not a replacement for IAM, network segmentation, or host hardening.
- Not a full policy language with external policy engines.
- Not a complete MCP compatibility matrix for every community server.

## Why the local demo matters

The deterministic mock-server demo is intentionally part of the release surface. It gives maintainers and evaluators a repeatable way to verify:

- health checks are live
- tools can be listed through the firewall
- safe behavior is allowed
- risky behavior is denied with explainable metadata

This keeps project claims verifiable by default.

## Source mapping

See [docs/CITATIONS.md](docs/CITATIONS.md) for source references used by this design.
