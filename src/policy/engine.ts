import type { DecisionContext, FirewallPolicyConfig, PolicyDecision } from '../types';
import { findMatchingPattern } from './matchers';
import { allowDecision, denyDecision, ReasonCodes } from './reasons';
import { evaluateScope, extractScopeTargets } from './scope';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getString(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function buildDecisionContext(
  method: string,
  params: Record<string, unknown> | undefined,
): DecisionContext {
  const safeParams = params ?? {};
  const argumentRecord = asRecord(safeParams.arguments);

  if (method === 'tools/call') {
    const toolName = getString(safeParams, 'name');
    return {
      method,
      toolName,
      arguments: argumentRecord,
      targets: extractScopeTargets(argumentRecord ?? safeParams),
    };
  }

  return {
    method,
    arguments: asRecord(safeParams),
    targets: extractScopeTargets(safeParams),
  };
}

export class PolicyEngine {
  constructor(private readonly policy: FirewallPolicyConfig) {}

  evaluate(context: DecisionContext): PolicyDecision {
    const toolName = context.toolName;

    if (toolName) {
      const deniedToolRule = findMatchingPattern(toolName, this.policy.tools.deny);
      if (deniedToolRule) {
        return denyDecision({
          code: ReasonCodes.TOOL_DENIED,
          message: `Tool '${toolName}' is denied by policy.`,
          policyId: 'policy.tools.deny',
          matchedRule: deniedToolRule,
          remediationHint: 'Remove or narrow this deny rule if tool access is intended.',
        });
      }
    }

    const scopeResult = evaluateScope(context.targets, this.policy.scope);
    if (!scopeResult.allowed) {
      return denyDecision({
        code: ReasonCodes.SCOPE_DENIED,
        message: scopeResult.message ?? 'Scope violation detected.',
        policyId: scopeResult.policyId ?? 'policy.scope',
        matchedRule: scopeResult.matchedRule,
        remediationHint: scopeResult.remediationHint,
      });
    }

    if (toolName) {
      const confirmationRule = findMatchingPattern(toolName, this.policy.tools.requireConfirmation);
      if (confirmationRule) {
        return denyDecision({
          code: ReasonCodes.CONFIRMATION_REQUIRED,
          message: `Tool '${toolName}' requires confirmation and was blocked in non-interactive mode.`,
          policyId: 'policy.tools.requireConfirmation',
          matchedRule: confirmationRule,
          remediationHint:
            'Remove this rule or run in a mode that supports interactive confirmation.',
        });
      }

      const allowRule = findMatchingPattern(toolName, this.policy.tools.allow);
      if (allowRule) {
        return allowDecision('policy.tools.allow');
      }

      if (this.policy.mode === 'allowlist' || this.policy.defaults.onUnknownTool === 'deny') {
        return denyDecision({
          code: ReasonCodes.NOT_ALLOWLISTED,
          message: `Tool '${toolName}' is not on the allowlist.`,
          policyId: 'policy.tools.defaultDeny',
          remediationHint: 'Add this tool to policy.tools.allow to permit access.',
        });
      }
    }

    return allowDecision();
  }
}
