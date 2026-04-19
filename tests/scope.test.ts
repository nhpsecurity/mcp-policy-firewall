import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateScope, extractScopeTargets } from '../src/policy/scope';
import type { ScopePolicyConfig } from '../src/types';

const baseScope: ScopePolicyConfig = {
  paths: {
    allow: [path.resolve('.')],
    deny: [path.resolve('.git')],
  },
  repos: {
    allow: ['my-org/*'],
    deny: ['my-org/private-*'],
  },
  domains: {
    allow: ['api.github.com'],
    deny: ['internal.example.com'],
  },
};

describe('scope extraction and evaluation', () => {
  it('extracts path, repo, and domain from mixed arguments', () => {
    const targets = extractScopeTargets({
      path: './README.md',
      owner: 'my-org',
      name: 'demo',
      url: 'https://api.github.com/repos/my-org/demo',
    });

    expect(targets.path).toBe(path.resolve('README.md').replace(/\\/g, '/'));
    expect(targets.repo).toBe('my-org/demo');
    expect(targets.domain).toBe('api.github.com');
  });

  it('denies domain access outside allowlist', () => {
    const result = evaluateScope(
      {
        domain: 'example.com',
      },
      baseScope,
    );

    expect(result.allowed).toBe(false);
    expect(result.policyId).toBe('policy.scope.domains.allow');
  });

  it('denies repo access when denied pattern matches', () => {
    const result = evaluateScope(
      {
        repo: 'my-org/private-infra',
      },
      baseScope,
    );

    expect(result.allowed).toBe(false);
    expect(result.policyId).toBe('policy.scope.repos.deny');
  });
});
