import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PolicyEngine } from '../src/policy/engine';
import type { FirewallPolicyConfig } from '../src/types';

const basePolicy: FirewallPolicyConfig = {
  mode: 'hybrid',
  tools: {
    allow: ['*read*', '*list*'],
    deny: ['*delete*', '*write*'],
    requireConfirmation: ['*exec*'],
  },
  scope: {
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
  },
  redaction: {
    enabled: true,
    extraPatterns: [],
  },
  defaults: {
    onUnknownTool: 'allow',
  },
};

describe('policy engine', () => {
  it('denies tool by explicit deny rule', () => {
    const engine = new PolicyEngine(basePolicy);
    const decision = engine.evaluate({
      method: 'tools/call',
      toolName: 'filesystem__delete_file',
      arguments: {},
      targets: {},
    });

    expect(decision.outcome).toBe('deny');
    expect(decision.code).toBe('tool_denied');
  });

  it('denies scope violations', () => {
    const engine = new PolicyEngine(basePolicy);
    const decision = engine.evaluate({
      method: 'tools/call',
      toolName: 'filesystem__read_file',
      arguments: {
        path: path.resolve('.git', 'config'),
      },
      targets: {
        path: path.resolve('.git', 'config'),
      },
    });

    expect(decision.outcome).toBe('deny');
    expect(decision.code).toBe('scope_denied');
  });

  it('allows known safe read-like tools', () => {
    const engine = new PolicyEngine(basePolicy);
    const decision = engine.evaluate({
      method: 'tools/call',
      toolName: 'filesystem__read_file',
      arguments: {
        path: path.resolve('README.md'),
      },
      targets: {
        path: path.resolve('README.md'),
      },
    });

    expect(decision.outcome).toBe('allow');
  });

  it('denies unknown tools in allowlist mode', () => {
    const strictEngine = new PolicyEngine({
      ...basePolicy,
      mode: 'allowlist',
      defaults: {
        onUnknownTool: 'deny',
      },
      tools: {
        ...basePolicy.tools,
        allow: ['*read*'],
      },
    });

    const decision = strictEngine.evaluate({
      method: 'tools/call',
      toolName: 'filesystem__rename_file',
      arguments: {},
      targets: {},
    });

    expect(decision.outcome).toBe('deny');
    expect(decision.code).toBe('not_allowlisted');
  });
});
