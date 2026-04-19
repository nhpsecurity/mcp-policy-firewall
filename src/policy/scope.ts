import path from 'node:path';
import type { ScopePolicyConfig, ScopeTargets } from '../types';
import { findMatchingPattern } from './matchers';

export interface ScopeEvaluationResult {
  allowed: boolean;
  message?: string;
  policyId?: string;
  matchedRule?: string;
  remediationHint?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function normalizePathValue(value: string): string {
  return path.resolve(value).replace(/\\/g, '/');
}

function normalizePathRule(rule: string): string {
  return path.resolve(rule).replace(/\\/g, '/');
}

function pathMatchesRule(targetPath: string, rule: string): boolean {
  const normalizedTarget = normalizePathValue(targetPath);
  const normalizedRule = normalizePathRule(rule);

  if (normalizedRule.includes('*')) {
    return findMatchingPattern(normalizedTarget, [normalizedRule]) !== undefined;
  }

  return normalizedTarget === normalizedRule || normalizedTarget.startsWith(`${normalizedRule}/`);
}

function evaluatePathScope(
  targetPath: string | undefined,
  scope: ScopePolicyConfig,
): ScopeEvaluationResult {
  if (!targetPath) {
    return { allowed: true };
  }

  for (const deniedRule of scope.paths.deny) {
    if (pathMatchesRule(targetPath, deniedRule)) {
      return {
        allowed: false,
        policyId: 'policy.scope.paths.deny',
        matchedRule: deniedRule,
        message: `Path access is blocked by policy: ${targetPath}`,
        remediationHint:
          'Add a narrower allow rule or remove the deny rule if this access is expected.',
      };
    }
  }

  if (scope.paths.allow.length > 0) {
    const allowed = scope.paths.allow.some((allowedRule) =>
      pathMatchesRule(targetPath, allowedRule),
    );
    if (!allowed) {
      return {
        allowed: false,
        policyId: 'policy.scope.paths.allow',
        message: `Path is outside allowed scope: ${targetPath}`,
        remediationHint: 'Add this path to scope.paths.allow if access is required.',
      };
    }
  }

  return { allowed: true };
}

function evaluateSimpleScope(
  kind: 'repos' | 'domains',
  target: string | undefined,
  scope: ScopePolicyConfig,
): ScopeEvaluationResult {
  if (!target) {
    return { allowed: true };
  }

  const denyMatch = findMatchingPattern(target, scope[kind].deny);
  if (denyMatch) {
    return {
      allowed: false,
      policyId: `policy.scope.${kind}.deny`,
      matchedRule: denyMatch,
      message: `${kind.slice(0, -1)} is blocked by policy: ${target}`,
      remediationHint: `Remove or narrow scope.${kind}.deny rule '${denyMatch}' if this should be allowed.`,
    };
  }

  if (scope[kind].allow.length > 0) {
    const allowMatch = findMatchingPattern(target, scope[kind].allow);
    if (!allowMatch) {
      return {
        allowed: false,
        policyId: `policy.scope.${kind}.allow`,
        message: `${kind.slice(0, -1)} is outside allowed scope: ${target}`,
        remediationHint: `Add this ${kind.slice(0, -1)} to scope.${kind}.allow if access is required.`,
      };
    }
  }

  return { allowed: true };
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function extractDomain(rawValue: string | undefined): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  if (/^[a-z0-9.-]+$/i.test(rawValue)) {
    return rawValue.toLowerCase();
  }

  try {
    const parsed = new URL(rawValue);
    return parsed.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function extractPath(rawValue: string | undefined): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  if (rawValue.startsWith('file://')) {
    try {
      return normalizePathValue(decodeURIComponent(new URL(rawValue).pathname));
    } catch {
      return undefined;
    }
  }

  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
    return undefined;
  }

  return normalizePathValue(rawValue);
}

export function extractScopeTargets(input: unknown): ScopeTargets {
  const record = asRecord(input);
  if (!record) {
    return {};
  }

  const pathCandidate = pickString(record, [
    'path',
    'filePath',
    'directory',
    'cwd',
    'root',
    'targetPath',
    'uri',
  ]);
  const repoDirect = pickString(record, ['repo', 'repository', 'fullName']);
  const owner = pickString(record, ['owner', 'org']);
  const repoName = pickString(record, ['name', 'repoName']);
  const repoCandidate = repoDirect ?? (owner && repoName ? `${owner}/${repoName}` : undefined);

  const domainCandidate = pickString(record, ['domain', 'host', 'url', 'uri', 'endpoint']);

  return {
    path: extractPath(pathCandidate),
    repo: repoCandidate,
    domain: extractDomain(domainCandidate),
  };
}

export function evaluateScope(
  targets: ScopeTargets,
  scope: ScopePolicyConfig,
): ScopeEvaluationResult {
  const pathResult = evaluatePathScope(targets.path, scope);
  if (!pathResult.allowed) {
    return pathResult;
  }

  const repoResult = evaluateSimpleScope('repos', targets.repo, scope);
  if (!repoResult.allowed) {
    return repoResult;
  }

  return evaluateSimpleScope('domains', targets.domain, scope);
}
